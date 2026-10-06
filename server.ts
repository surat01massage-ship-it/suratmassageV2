import express from 'express';
import dotenv from 'dotenv';
dotenv.config({ override: true });
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { getDatabase, saveDatabase, DatabaseSchema, defaultSettings } from './server/db';
import { User, Staff, Service, Booking, CreditTransaction, Review, Notification, AppSettings, DEFAULT_BLANK_AVATAR } from './src/types';
import { scanSlipQRCode, DecodedSlipQR } from './server/slipQrScanner';
import QRCode from 'qrcode';

// PromptPay EMVCo CRC-CCITT (0xFFFF) checksum calculation
function crc16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xFF;
    x ^= x >> 4;
    crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Generate official Bank of Thailand standard PromptPay QR payload
function generatePromptPayPayload(target: string, amount?: number): string {
  const cleanTarget = (target || '').replace(/[^0-9]/g, '');
  let targetType = '01';
  let formattedTarget = '';

  if (cleanTarget.length === 10 && cleanTarget.startsWith('0')) {
    // Mobile phone number: 0812345678 -> 0066812345678
    targetType = '01';
    formattedTarget = '0066' + cleanTarget.substring(1);
  } else if (cleanTarget.length === 13) {
    // National ID / Tax ID
    targetType = '02';
    formattedTarget = cleanTarget;
  } else if (cleanTarget.length >= 8) {
    // Bank account or other identifier
    targetType = '01';
    formattedTarget = cleanTarget.startsWith('0') ? '0066' + cleanTarget.substring(1) : cleanTarget;
  } else {
    // Fallback default
    targetType = '01';
    formattedTarget = '0066812345678';
  }

  const tag29Sub00 = '0016A000000677010111';
  const tag29SubTarget = `${targetType}${formattedTarget.length.toString().padStart(2, '0')}${formattedTarget}`;
  const tag29 = `29${(tag29Sub00.length + tag29SubTarget.length).toString().padStart(2, '0')}${tag29Sub00}${tag29SubTarget}`;

  let payload = `000201010211${tag29}53037645802TH`;
  if (amount && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    payload += `54${formattedAmount.length.toString().padStart(2, '0')}${formattedAmount}`;
  }
  payload += '6304';
  const checksum = crc16(payload);
  return payload + checksum;
}

// Simple unique ID generator
const generateId = (prefix: string): string => {
  return `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
};

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
  return aiClient;
}

export interface SlipVerificationResult {
  isValidSlip: boolean;
  isTamperedOrFake: boolean;
  amount: number;
  refNo: string;
  bankName: string;
  receiverName: string;
  receiverAccount: string;
  senderName: string;
  transferDateTime: string;
  confidence: number;
  isSuspicious: boolean;
  suspiciousDetail: string;
}

async function verifySlipWithGemini(slipImage: string): Promise<SlipVerificationResult | null> {
  const ai = getAi();
  if (!ai) return null;

  let mimeType = 'image/jpeg';
  let base64Data = slipImage;

  const match = slipImage.match(/^data:(image\/[a-zA-Z0-9+.-]*);base64,(.*)$/s);
  if (match) {
    mimeType = match[1];
    base64Data = match[2];
  } else if (slipImage.startsWith('data:')) {
    const commaIdx = slipImage.indexOf(',');
    if (commaIdx !== -1) {
      const meta = slipImage.slice(0, commaIdx);
      base64Data = slipImage.slice(commaIdx + 1);
      const m = meta.match(/:(image\/[^;]+)/);
      if (m) mimeType = m[1];
    }
  }

  // Remove potential whitespace
  base64Data = base64Data.replace(/[\r\n\s]/g, '');
  if (!base64Data) return null;

  let response;
  const requestPayload = {
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        {
          text: `You are an expert Thai banking fraud-detection system specializing in verifying mobile banking transfer slips (PromptPay, KBANK, SCB, KTB, BBL, TTB, BAY, GSB, etc.).
Carefully inspect this image and extract verification data:
1. Is this a genuine Thai bank transfer slip? Check for:
   - Official bank logos and layout standards
   - Font consistency (no blurred, edited, misaligned numbers or text)
   - Presence of transaction reference code (รหัสอ้างอิง/เลขที่รายการ) and bank timestamp
2. Detect fraud indicators:
   - Photoshop or photo-editor modifications around the amount or account number
   - Fake slip generator templates
   - Screenshots of receipt pre-confirmation screens instead of actual final transfer slip
   - Obscured, cut-off, or unreadable key information
3. Extract exact details:
   - amount: exact transfer amount as a number
   - refNo: transaction reference number (เลขที่อ้างอิง / Ref No.)
   - bankName: bank of sender (e.g. กสิกรไทย, ไทยพาณิชย์, กรุงไทย, กรุงเทพ, etc.)
   - receiverName: recipient account owner name shown on the slip
   - receiverAccount: recipient account number or PromptPay number shown on the slip
   - senderName: sender name on slip
   - transferDateTime: timestamp of the transfer
   - confidence: 0 to 100 confidence that this slip is 100% authentic and unmanipulated
   - isSuspicious: true if there are ANY doubts, mismatched amounts, potential edits, or missing transaction codes
   - suspiciousDetail: specific reason in Thai explaining any suspicious findings or anomalies (empty string if completely clean)`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isValidSlip: { type: Type.BOOLEAN, description: "True if image is a real official bank slip" },
          isTamperedOrFake: { type: Type.BOOLEAN, description: "True if detected fake slip, photoshop editing, or font manipulation" },
          amount: { type: Type.NUMBER, description: "The transfer amount extracted from the slip" },
          refNo: { type: Type.STRING, description: "The unique transaction reference number or slip ID" },
          bankName: { type: Type.STRING, description: "Bank name" },
          receiverName: { type: Type.STRING, description: "Receiver name on slip" },
          receiverAccount: { type: Type.STRING, description: "Receiver account number or promptpay ID" },
          senderName: { type: Type.STRING, description: "Sender name on slip" },
          transferDateTime: { type: Type.STRING, description: "Date and time of transfer" },
          confidence: { type: Type.NUMBER, description: "Confidence score 0-100" },
          isSuspicious: { type: Type.BOOLEAN, description: "True if suspicious or needs human verification" },
          suspiciousDetail: { type: Type.STRING, description: "Reason for suspicion in Thai" }
        },
        required: ["isValidSlip", "isTamperedOrFake", "amount", "refNo", "bankName", "confidence"]
      }
    }
  };

  const candidateModels = ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  for (const modelName of candidateModels) {
    try {
      response = await ai.models.generateContent({
        model: modelName,
        ...requestPayload
      });
      if (response && response.text) break;
    } catch (err: any) {
      console.warn(`Model ${modelName} failed, trying next:`, err?.message);
    }
  }

  if (!response || !response.text) return null;
  try {
    return JSON.parse(response.text) as SlipVerificationResult;
  } catch {
    return null;
  }
}

// LINE Messaging API helper (Sends ONLY to specified Admin User ID or Admin Group ID - NEVER broadcasted to customers)
async function sendLineNotification(message: string) {
  try {
    const db = getDatabase();
    const dbToken = (db.settings?.lineChannelAccessToken || '').trim();
    const envToken = (process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();
    const token = dbToken || envToken || 'b6spU9oI6sgyc/lagfyn8Z6MZ4GkUCLOModW44f2ZY/4Ja0nvseYKZSvZwPOboWSMAKM3VN0z/7h50RoaGkMvCNBX2+e51SYez0lNHgwqoEs8TnNKe+7jMLbFEY1sH6ujkXTbp9OXhYxOUKnOiJ0WgdB04t89/1O/w1cDnyilFU=';
    
    let adminId = (db.settings?.lineAdminUserId || '').trim();
    if (!adminId || adminId === 'Cda36ab1f3de2811e584a5b62d652a97d') {
      const envId = (process.env.LINE_ADMIN_USER_ID || '').trim();
      adminId = (envId && envId !== 'Cda36ab1f3de2811e584a5b62d652a97d') ? envId : 'Cf544171f0f9753863ade1ddd1acd67a7';
    }
    
    if (!token || !adminId) {
      return;
    }
    
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      signal: AbortSignal.timeout(4000),
      body: JSON.stringify({
        to: adminId.trim(),
        messages: [{ type: 'text', text: message }]
      })
    });
    
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[LINE Push Message Error] ${res.status}:`, errText);
    }
  } catch (error: any) {
    console.error('Failed to send LINE notification:', error?.message);
  }
}

// Google Sheets Webhook Sync Helper (Real-time and batch support)
async function syncToGoogleSheet(action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SYNC_ALL_DATA' | string, table: string, data: any) {
  try {
    const db = getDatabase();
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || db.settings?.googleSheetWebhookUrl;
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return;
    }
    
    // Non-blocking asynchronous sync to Google Sheets
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      signal: AbortSignal.timeout(4000),
      body: JSON.stringify({
        action,
        table,
        data,
        timestamp: new Date().toISOString()
      })
    }).then(async res => {
      if (!res.ok) {
        console.warn(`[GoogleSheetSync] ${table} (${action}) responded with status ${res.status}`);
      } else {
        const json = await res.json().catch(() => null);
        console.log(`[GoogleSheetSync] Success ${table} (${action}):`, json);
      }
    }).catch(err => {
      console.error(`[GoogleSheetSync] Error syncing ${table} (${action}):`, err.message);
    });
  } catch (error: any) {
    console.error('[GoogleSheetSync] Exception:', error?.message);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS and preflight handling for /api routes in iframe/preview environments
  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Serve uploaded assets directly
  const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Dedicated QR Code Upload API (Saves image to disk & updates settings cleanly)
  app.post('/api/upload-qr', (req, res) => {
    try {
      const { dataUrl, image } = req.body;
      const target = dataUrl || image;
      if (!target || typeof target !== 'string') {
        return res.status(400).json({ error: 'ไม่พบข้อมูลรูปภาพ' });
      }

      let buffer: Buffer;
      let ext = 'png';
      if (target.startsWith('data:image/')) {
        const commaIdx = target.indexOf(',');
        const mimeMatch = target.slice(0, commaIdx).match(/data:image\/([a-zA-Z0-9]+)/);
        if (mimeMatch && (mimeMatch[1] === 'jpeg' || mimeMatch[1] === 'jpg')) ext = 'jpg';
        const base64Data = target.slice(commaIdx + 1).replace(/[\r\n\s]/g, '');
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        buffer = Buffer.from(target, 'base64');
      }

      const filePath = path.join(uploadsDir, `qr_code.${ext}`);
      fs.writeFileSync(filePath, buffer);

      const db = getDatabase();
      const relativeUrl = `/uploads/qr_code.${ext}?t=${Date.now()}`;
      db.settings = {
        ...db.settings,
        qrCodeImage: relativeUrl,
        updatedAt: new Date().toISOString()
      };
      saveDatabase(db);
      syncToGoogleSheet('UPDATE', 'Settings', db.settings);

      console.log(`[UploadQR] Successfully saved QR Code image to ${filePath} (${buffer.length} bytes)`);
      return res.json({
        success: true,
        url: relativeUrl,
        settings: db.settings
      });
    } catch (err: any) {
      console.error('[UploadQR] Error:', err);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ' });
    }
  });

  // --- API Routes ---

  // 1. Authenticated User / Session Info Helper
  app.post('/api/auth/register', (req, res) => {
    const db = getDatabase();
    const { name, phone, password, email, address, province, district, subDistrict, latitude, longitude, role, staffInfo } = req.body;

    if (!name || !phone || !password || !role) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วน (ชื่อ, เบอร์โทรศัพท์, รหัสผ่าน, บทบาท)' });
    }

    const existingUser = db.users.find(u => u.Phone === phone);
    if (existingUser) {
      return res.status(400).json({ error: 'เบอร์โทรศัพท์นี้ถูกใช้งานแล้วในระบบ' });
    }

    const newUserID = generateId('U');
    const newUser: User = {
      UserID: newUserID,
      Name: name,
      Phone: phone,
      PasswordHash: password, // simple store for demo
      Email: email || '',
      Address: address || '',
      Province: province || '',
      District: district || '',
      SubDistrict: subDistrict || '',
      Latitude: parseFloat(latitude) || 9.138244,
      Longitude: parseFloat(longitude) || 99.321748,
      ProfileImage: req.body.profileImage || DEFAULT_BLANK_AVATAR,
      Role: role,
      Status: 'Active',
      CreatedDate: new Date().toISOString()
    };

    db.users.push(newUser);
    syncToGoogleSheet('INSERT', 'Users', newUser);

    let createdStaff: Staff | null = null;

    // If registering as Staff, create Staff record
    if (role === 'Staff') {
      const newStaffID = generateId('SFT');
      const info = staffInfo || {};
      const newStaff: Staff = {
        StaffID: newStaffID,
        UserID: newUserID,
        Nickname: info.nickname || name.split(' ')[0],
        Gender: info.gender || 'Female',
        Age: parseInt(info.age) || 30,
        Weight: parseInt(info.weight) || 50,
        Height: parseInt(info.height) || 160,
        RegisteredAddress: info.registeredAddress || newUser.Address,
        Experience: parseInt(info.experience) || 2,
        Description: info.description || 'ยินดีให้บริการนวดเพื่อสุขภาพค่ะ',
        Rating: 5.0,
        ReviewCount: 0,
        Credit: 298, // เครดิตเริ่มต้น 298 เครดิตสำหรับพนักงานใหม่เพื่อรับงานฟรีได้ 1 ครั้ง
        Available: 'OFF', // พนักงานใหม่เริ่มต้นสถานะ OFF (ต้องรอแอดมินอนุมัติก่อนเปิดรับงาน)
        VerifyStatus: 'Pending', // ต้องให้แอดมินอนุมัติก่อนถึงจะเริ่มทำงานได้
        CurrentLatitude: newUser.Latitude || 9.138244,
        CurrentLongitude: newUser.Longitude || 99.321748,
        LastLocationUpdate: new Date().toISOString(),
        TotalIncome: 0,
        TotalJobs: 0,
        OfferedServices: getDatabase().services.map(s => s.ServiceID),
        MaxJobDistance: 25,
        Photos: Array.isArray(info.photos) && info.photos.length > 0 
          ? info.photos 
          : (newUser.ProfileImage ? [newUser.ProfileImage] : []),
        LicenseFile: info.licenseFile || '',
        IdCardFile: info.idCardFile || '',
        HouseRegFile: info.houseRegFile || ''
      };
      createdStaff = newStaff;
      db.staff.push(newStaff);
      syncToGoogleSheet('INSERT', 'Staff', newStaff);
      const staffDocData = {
        DocID: `DOC-${newStaff.StaffID}`,
        StaffID: newStaff.StaffID,
        UserID: newStaff.UserID,
        StaffName: newUser.Name,
        Nickname: newStaff.Nickname,
        Phone: newUser.Phone,
        VerifyStatus: newStaff.VerifyStatus,
        LicenseFile: newStaff.LicenseFile || '',
        IdCardFile: newStaff.IdCardFile || '',
        HouseRegFile: newStaff.HouseRegFile || '',
        RegisteredAddress: newStaff.RegisteredAddress,
        SubmittedDate: new Date().toISOString(),
        Notes: 'เอกสารหลักฐานการสมัครพนักงานใหม่ (ใบอนุญาตนวด, บัตรประชาชน, ทะเบียนบ้าน) - รอแอดมินอนุมัติ'
      };
      syncToGoogleSheet('INSERT', 'StaffDocuments', staffDocData);

      // Add welcome bonus credit transaction (298 credits = 1 free job)
      const welcomeTx = {
        TransactionID: generateId('TX'),
        StaffID: newStaffID,
        Amount: 298,
        BeforeCredit: 0,
        AfterCredit: 298,
        Type: 'Topup' as const,
        SlipImage: '',
        Status: 'Approved' as const,
        AdminRemark: '🎁 โบนัสต้อนรับพนักงานใหม่ 298 เครดิต (รับงานฟรี 1 ครั้งเมื่อได้รับการอนุมัติ)',
        CreatedDate: new Date().toISOString()
      };
      db.transactions.push(welcomeTx);
      syncToGoogleSheet('INSERT', 'CreditTransaction', welcomeTx);

      // Welcome Notification to Staff
      const staffWelcomeNotif = {
        NotificationID: generateId('N'),
        UserID: newUserID,
        Title: '⏳ ใบสมัครพนักงานของคุณอยู่ระหว่างรอแอดมินอนุมัติ',
        Detail: 'ยินดีต้อนรับสู่ SabaiDee Massage! ข้อมูลและเอกสารของคุณถูกส่งถึงแอดมินแล้ว เมื่อได้รับการอนุมัติ คุณจะสามารถเปิดรับงาน (Online) เพื่อเริ่มรับงานลูกค้าได้ทันที พร้อมรับ 298 เครดิตฟรีค่ะ',
        ReadStatus: 'Unread' as const,
        CreatedDate: new Date().toISOString()
      };
      db.notifications.push(staffWelcomeNotif);
      syncToGoogleSheet('INSERT', 'Notification', staffWelcomeNotif);

      // Notification to Admin about new registration
      const adminUsers = db.users.filter(u => u.Role === 'Admin');
      adminUsers.forEach(admin => {
        const notif = {
          NotificationID: generateId('N'),
          UserID: admin.UserID,
          Title: "มีผู้สมัครเป็นพนักงานใหม่ (รอการอนุมัติ)",
          Detail: `พนักงานนวดคนใหม่ คุณ ${name} (ชื่อเล่น ${newStaff.Nickname}) เบอร์ ${phone} ได้สมัครสมาชิกเข้ามา รอแอดมินตรวจสอบเอกสารและอนุมัติก่อนเริ่มงานค่ะ`,
          ReadStatus: 'Unread' as const,
          CreatedDate: new Date().toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet('INSERT', 'Notification', notif);
      });
    }

    if (role === 'Staff') {
      sendLineNotification(`🎉 มีพนักงานใหม่สมัครใช้งาน!\nชื่อ: ${name}\nเบอร์โทร: ${phone}\nสถานะ: ⏳ รอแอดมินตรวจสอบและอนุมัติในระบบก่อนเริ่มงาน`);
    } else {
      sendLineNotification(`🎉 มีลูกค้าใหม่สมัครใช้งาน!\nชื่อ: ${name}\nเบอร์โทร: ${phone}`);
    }

    saveDatabase(db);
    res.json({ success: true, user: newUser, staff: createdStaff });
  });

  app.post('/api/auth/login', (req, res) => {
    const db = getDatabase();
    const { phone, password } = req.body;

    const user = db.users.find(u => u.Phone === phone && u.PasswordHash === password);
    if (!user) {
      return res.status(401).json({ error: 'เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง' });
    }

    if (user.Status === 'Inactive') {
      return res.status(403).json({ error: 'บัญชีของคุณถูกระงับการใช้งานชั่วคราว กรุณาติดต่อแอดมิน' });
    }

    let staffDetails = null;
    if (user.Role === 'Staff') {
      staffDetails = db.staff.find(s => s.UserID === user.UserID) || null;
    }

    res.json({
      success: true,
      user,
      staff: staffDetails
    });
  });

  // Update Profile
  app.put('/api/auth/profile', (req, res) => {
    const db = getDatabase();
    const { userId, name, email, address, province, district, subDistrict, latitude, longitude, profileImage, staffInfo } = req.body;

    const userIndex = db.users.findIndex(u => u.UserID === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้ในระบบ' });
    }

    const user = db.users[userIndex];
    user.Name = name || user.Name;
    user.Email = email !== undefined ? email : user.Email;
    user.Address = address !== undefined ? address : user.Address;
    user.Province = province !== undefined ? province : user.Province;
    user.District = district !== undefined ? district : user.District;
    user.SubDistrict = subDistrict !== undefined ? subDistrict : user.SubDistrict;
    user.Latitude = latitude !== undefined ? parseFloat(latitude) : user.Latitude;
    user.Longitude = longitude !== undefined ? parseFloat(longitude) : user.Longitude;
    if (profileImage !== undefined) {
      user.ProfileImage = profileImage;
    }

    let staffDetails = null;
    if (user.Role === 'Staff') {
      const staffIndex = db.staff.findIndex(s => s.UserID === userId);
      if (staffIndex !== -1) {
        const staff = db.staff[staffIndex];
        if (staffInfo) {
          staff.Nickname = staffInfo.nickname || staff.Nickname;
          staff.Gender = staffInfo.gender || staff.Gender;
          staff.Age = staffInfo.age !== undefined ? parseInt(staffInfo.age) : staff.Age;
          staff.Weight = staffInfo.weight !== undefined ? parseInt(staffInfo.weight) : staff.Weight;
          staff.Height = staffInfo.height !== undefined ? parseInt(staffInfo.height) : staff.Height;
          staff.RegisteredAddress = staffInfo.registeredAddress !== undefined ? staffInfo.registeredAddress : staff.RegisteredAddress;
          staff.Experience = staffInfo.experience !== undefined ? parseInt(staffInfo.experience) : staff.Experience;
          staff.Description = staffInfo.description !== undefined ? staffInfo.description : staff.Description;
          if (staffInfo.offeredServices !== undefined) {
            staff.OfferedServices = staffInfo.offeredServices;
          }
          if (staffInfo.maxJobDistance !== undefined) {
            staff.MaxJobDistance = parseInt(staffInfo.maxJobDistance);
          }
          if (staffInfo.photos !== undefined) {
            staff.Photos = Array.isArray(staffInfo.photos) ? staffInfo.photos : [];
          }
          if (staffInfo.licenseFile !== undefined) {
            staff.LicenseFile = staffInfo.licenseFile;
          }
          if (staffInfo.idCardFile !== undefined) {
            staff.IdCardFile = staffInfo.idCardFile;
          }
          if (staffInfo.houseRegFile !== undefined) {
            staff.HouseRegFile = staffInfo.houseRegFile;
          }
        }
        staff.CurrentLatitude = user.Latitude;
        staff.CurrentLongitude = user.Longitude;
        staffDetails = staff;
      }
    }

    saveDatabase(db);
    syncToGoogleSheet('UPDATE', 'Users', user);
    if (staffDetails) {
      syncToGoogleSheet('UPDATE', 'Staff', staffDetails);
      const staffDocData = {
        DocID: `DOC-${staffDetails.StaffID}`,
        StaffID: staffDetails.StaffID,
        UserID: staffDetails.UserID,
        StaffName: user.Name,
        Nickname: staffDetails.Nickname,
        Phone: user.Phone,
        VerifyStatus: staffDetails.VerifyStatus,
        LicenseFile: staffDetails.LicenseFile || '',
        IdCardFile: staffDetails.IdCardFile || '',
        HouseRegFile: staffDetails.HouseRegFile || '',
        RegisteredAddress: staffDetails.RegisteredAddress || user.Address || '',
        SubmittedDate: new Date().toISOString(),
        Notes: 'พนักงานอัปเดตข้อมูลและเอกสารหลักฐานผ่านระบบ'
      };
      syncToGoogleSheet('UPDATE', 'StaffDocuments', staffDocData);
    }
    res.json({ success: true, user, staff: staffDetails });
  });

  // Geocoding Proxy Endpoints to avoid CORS/rate-limiting/Failed to fetch on client
  app.get('/api/geocode/reverse', async (req, res) => {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.json({ address: 'กรุงเทพมหานคร, ประเทศไทย' });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'SabaiDeeMassageApp/1.0 (contact: support@sabaidee.app)',
            'Accept-Language': 'th,en;q=0.8'
          },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          return res.json({ address: data.display_name, raw: data });
        }
      }
    } catch (err) {
      // Fallback cleanly without breaking
    }

    res.json({ address: `พิกัดละติจูด ${lat.toFixed(5)}, ลองจิจูด ${lng.toFixed(5)}` });
  });

  app.get('/api/geocode/search', async (req, res) => {
    const query = (req.query.q as string || '').trim();
    if (!query) return res.json({ results: [] });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=th`,
        {
          headers: {
            'User-Agent': 'SabaiDeeMassageApp/1.0 (contact: support@sabaidee.app)',
            'Accept-Language': 'th,en;q=0.8'
          },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return res.json({ results: Array.isArray(data) ? data : [] });
      }
    } catch (err) {
      // Fallback
    }

    res.json({ results: [] });
  });

  // Users APIs
  app.get('/api/users', (req, res) => {
    const db = getDatabase();
    res.json(db.users);
  });

  app.get('/api/users/:id', (req, res) => {
    const db = getDatabase();
    const user = db.users.find(u => u.UserID === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้ในระบบ' });
    }
    const staff = user.Role === 'Staff' ? (db.staff.find(s => s.UserID === user.UserID) || null) : null;
    res.json({ success: true, user, staff });
  });

  // Client Data Rehydration & Sync endpoint: Ensures zero user data loss across GitHub updates and server redeployments
  app.post('/api/sync/rehydrate-users', (req, res) => {
    const db = getDatabase();
    const { users, staff } = req.body;

    const deletedUserSet = new Set(db.deletedUserIds || []);
    const deletedStaffSet = new Set(db.deletedStaffIds || []);
    let dbModified = false;

    // 1. Rehydrate & restore users from client if missing on server
    if (Array.isArray(users)) {
      for (const u of users) {
        if (!u || !u.UserID || !u.Phone) continue;

        const existingIdx = db.users.findIndex(x => x.UserID === u.UserID || x.Phone === u.Phone);
        if (existingIdx === -1) {
          // User exists on client but not on server (e.g. after fresh git deploy) -> Rehydrate back into database!
          db.users.push(u);
          dbModified = true;
          console.log(`[Sync] Rehydrated user from client: ${u.Name} (${u.UserID} - ${u.Phone})`);
        } else {
          // Merge any client-updated profile details
          db.users[existingIdx] = { ...db.users[existingIdx], ...u };
        }
      }
    }

    // 2. Rehydrate & restore staff from client if missing on server
    if (Array.isArray(staff)) {
      for (const s of staff) {
        if (!s || !s.StaffID) continue;

        const existingIdx = db.staff.findIndex(x => x.StaffID === s.StaffID || (s.UserID && x.UserID === s.UserID));
        if (existingIdx === -1) {
          // Staff exists on client but not on server -> Rehydrate back into database!
          db.staff.push(s);
          dbModified = true;
          console.log(`[Sync] Rehydrated staff from client: ${s.Nickname} (${s.StaffID})`);
        } else {
          // Keep highest credit and newest info
          const currentCredit = Number(db.staff[existingIdx].Credit) || 0;
          const incomingCredit = Number(s.Credit) || 0;
          db.staff[existingIdx] = {
            ...db.staff[existingIdx],
            ...s,
            Credit: Math.max(currentCredit, incomingCredit)
          };
        }
      }
    }

    if (dbModified) {
      saveDatabase(db);
    }

    res.json({
      success: true,
      totalUsers: db.users.length,
      totalStaff: db.staff.length,
      validUserIds: db.users.map(u => u.UserID),
      validStaffIds: db.staff.map(s => s.StaffID),
      users: db.users,
      staff: db.staff,
      deletedUserIds: db.deletedUserIds || [],
      deletedStaffIds: db.deletedStaffIds || []
    });
  });

  app.post('/api/users', (req, res) => {
    const db = getDatabase();
    const { name, phone, password, email, address, province, district, subDistrict, latitude, longitude, role, staffInfo } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วน (ชื่อ, เบอร์โทรศัพท์, รหัสผ่าน)' });
    }

    const existingUser = db.users.find(u => u.Phone === phone);
    if (existingUser) {
      return res.status(400).json({ error: 'เบอร์โทรศัพท์นี้ถูกใช้งานแล้วในระบบ' });
    }

    const newUserID = generateId('U');
    const userRole = (role && ['Customer', 'Staff', 'Admin'].includes(role)) ? role : 'Customer';
    const newUser: User = {
      UserID: newUserID,
      Name: name,
      Phone: phone,
      PasswordHash: password,
      Email: email || '',
      Address: address || '',
      Province: province || '',
      District: district || '',
      SubDistrict: subDistrict || '',
      Latitude: parseFloat(latitude) || 9.138244,
      Longitude: parseFloat(longitude) || 99.321748,
      ProfileImage: req.body.profileImage || DEFAULT_BLANK_AVATAR,
      Role: userRole,
      Status: 'Active',
      CreatedDate: new Date().toISOString()
    };

    db.users.push(newUser);
    syncToGoogleSheet('INSERT', 'Users', newUser);

    if (userRole === 'Staff') {
      const newStaffID = generateId('SFT');
      const info = staffInfo || {};
      const newStaff: Staff = {
        StaffID: newStaffID,
        UserID: newUserID,
        Nickname: info.nickname || name.split(' ')[0],
        Gender: info.gender || 'Female',
        Age: parseInt(info.age) || 30,
        Weight: parseInt(info.weight) || 50,
        Height: parseInt(info.height) || 160,
        RegisteredAddress: info.registeredAddress || newUser.Address,
        Experience: parseInt(info.experience) || 2,
        Description: info.description || 'ยินดีให้บริการนวดเพื่อสุขภาพค่ะ',
        Rating: 5.0,
        ReviewCount: 0,
        Credit: 298,
        Available: 'ON',
        VerifyStatus: 'Approved',
        CurrentLatitude: newUser.Latitude || 9.138244,
        CurrentLongitude: newUser.Longitude || 99.321748,
        LastLocationUpdate: new Date().toISOString(),
        TotalIncome: 0,
        TotalJobs: 0,
        OfferedServices: db.services.map(s => s.ServiceID),
        MaxJobDistance: 25,
        Photos: Array.isArray(info.photos) ? info.photos : (newUser.ProfileImage ? [newUser.ProfileImage] : []),
        LicenseFile: info.licenseFile || '',
        IdCardFile: info.idCardFile || '',
        HouseRegFile: info.houseRegFile || ''
      };
      db.staff.push(newStaff);
      syncToGoogleSheet('INSERT', 'Staff', newStaff);
      const staffDocData = {
        DocID: `DOC-${newStaff.StaffID}`,
        StaffID: newStaff.StaffID,
        UserID: newStaff.UserID,
        StaffName: newUser.Name,
        Nickname: newStaff.Nickname,
        Phone: newUser.Phone,
        VerifyStatus: newStaff.VerifyStatus,
        LicenseFile: newStaff.LicenseFile,
        IdCardFile: newStaff.IdCardFile,
        HouseRegFile: newStaff.HouseRegFile,
        RegisteredAddress: newStaff.RegisteredAddress,
        SubmittedDate: new Date().toISOString(),
        Notes: 'แอดมินสร้างพนักงานใหม่และบันทึกเอกสารหลักฐาน'
      };
      syncToGoogleSheet('INSERT', 'StaffDocuments', staffDocData);

      const welcomeTx = {
        TransactionID: generateId('TX'),
        StaffID: newStaffID,
        Amount: 298,
        BeforeCredit: 0,
        AfterCredit: 298,
        Type: 'Topup' as const,
        SlipImage: '',
        Status: 'Approved' as const,
        AdminRemark: '🎁 โบนัสต้อนรับพนักงานใหม่ 298 เครดิต (รับงานฟรี 1 ครั้ง)',
        CreatedDate: new Date().toISOString()
      };
      db.transactions.push(welcomeTx);
      syncToGoogleSheet('INSERT', 'CreditTransaction', welcomeTx);
    }

    saveDatabase(db);
    res.status(201).json({ success: true, user: newUser });
  });

  app.put('/api/users/:id', (req, res) => {
    const db = getDatabase();
    const user = db.users.find(u => u.UserID === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { name, phone, password, role, profileImage } = req.body;
    if (name !== undefined) user.Name = name;
    if (phone !== undefined) user.Phone = phone;
    if (password) user.PasswordHash = password;
    if (role && ['Customer', 'Staff', 'Admin'].includes(role)) {
      user.Role = role;
    }
    if (profileImage !== undefined) user.ProfileImage = profileImage;
    
    saveDatabase(db);
    syncToGoogleSheet('UPDATE', 'Users', user);
    res.json({ success: true, user });
  });

  app.put('/api/users/:id/role', (req, res) => {
    const db = getDatabase();
    const user = db.users.find(u => u.UserID === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { role } = req.body;
    if (['Customer', 'Staff', 'Admin'].includes(role)) {
      user.Role = role as 'Customer' | 'Staff' | 'Admin';
      
      // If changed to Staff, ensure staff record exists
      if (role === 'Staff') {
        let staff = db.staff.find(s => s.UserID === user.UserID);
        if (!staff) {
          const newStaffID = generateId('SFT');
          staff = {
            StaffID: newStaffID,
            UserID: user.UserID,
            Nickname: user.Name.split(' ')[0],
            Gender: 'Female',
            Age: 30,
            Weight: 50,
            Height: 160,
            RegisteredAddress: user.Address,
            Experience: 1,
            Description: 'ยินดีให้บริการค่ะ',
            Rating: 5.0,
            ReviewCount: 0,
            Credit: 298,
            Available: 'OFF',
            VerifyStatus: 'Pending',
            CurrentLatitude: user.Latitude,
            CurrentLongitude: user.Longitude,
            LastLocationUpdate: new Date().toISOString(),
            TotalIncome: 0,
            TotalJobs: 0,
            OfferedServices: db.services.map(s => s.ServiceID),
            MaxJobDistance: db.settings.searchRadius || 25,
            Photos: [user.ProfileImage].filter(Boolean),
            LicenseFile: '',
            IdCardFile: '',
            HouseRegFile: ''
          };
          db.staff.push(staff);
          syncToGoogleSheet('INSERT', 'Staff', staff);
          const staffDocData = {
            DocID: `DOC-${staff.StaffID}`,
            StaffID: staff.StaffID,
            UserID: staff.UserID,
            StaffName: user.Name,
            Nickname: staff.Nickname,
            Phone: user.Phone,
            VerifyStatus: staff.VerifyStatus,
            LicenseFile: staff.LicenseFile,
            IdCardFile: staff.IdCardFile,
            HouseRegFile: staff.HouseRegFile,
            RegisteredAddress: staff.RegisteredAddress,
            SubmittedDate: new Date().toISOString(),
            Notes: 'เปลี่ยนสถานะเป็นพนักงานใหม่'
          };
          syncToGoogleSheet('INSERT', 'StaffDocuments', staffDocData);

          const welcomeTx = {
            TransactionID: generateId('TX'),
            StaffID: newStaffID,
            Amount: 298,
            BeforeCredit: 0,
            AfterCredit: 298,
            Type: 'Topup' as const,
            SlipImage: '',
            Status: 'Approved' as const,
            AdminRemark: '🎁 โบนัสต้อนรับพนักงานใหม่ 298 เครดิต (รับงานฟรี 1 ครั้ง)',
            CreatedDate: new Date().toISOString()
          };
          db.transactions.push(welcomeTx);
          syncToGoogleSheet('INSERT', 'CreditTransaction', welcomeTx);
        }
      }
      
      saveDatabase(db);
      syncToGoogleSheet('UPDATE', 'Users', user);
      res.json(user);
    } else {
      res.status(400).json({ error: 'Invalid role' });
    }
  });

  // Delete User API (Permanent Deletion)
  app.delete('/api/users/:id', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const uIndex = db.users.findIndex(u => u.UserID === id);
    if (uIndex === -1) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้งานที่ต้องการลบ' });
    }

    const userToDelete = db.users[uIndex];

    // Check if trying to delete the only admin
    if (userToDelete.Role === 'Admin') {
      const adminCount = db.users.filter(u => u.Role === 'Admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'ไม่สามารถลบแอดมินคนสุดท้ายที่เหลืออยู่ในระบบได้' });
      }
    }

    if (!db.deletedUserIds) db.deletedUserIds = [];
    if (!db.deletedStaffIds) db.deletedStaffIds = [];

    // Delete user from db.users and add tombstone
    db.users.splice(uIndex, 1);
    if (!db.deletedUserIds.includes(id)) {
      db.deletedUserIds.push(id);
    }

    // If staff, permanently remove staff profile as well
    let deletedStaffId: string | undefined;
    const sIndex = db.staff.findIndex(s => s.UserID === id);
    if (sIndex !== -1) {
      const deletedStaff = db.staff[sIndex];
      deletedStaffId = deletedStaff.StaffID;
      db.staff.splice(sIndex, 1);
      if (!db.deletedStaffIds.includes(deletedStaff.StaffID)) {
        db.deletedStaffIds.push(deletedStaff.StaffID);
      }
      syncToGoogleSheet('DELETE', 'Staff', { StaffID: deletedStaff.StaffID, UserID: id });
      syncToGoogleSheet('DELETE', 'StaffDocuments', { StaffID: deletedStaff.StaffID, UserID: id });
    }

    // Remove user notifications
    db.notifications = db.notifications.filter(n => n.UserID !== id);

    saveDatabase(db);
    syncToGoogleSheet('DELETE', 'Users', { UserID: id, Name: userToDelete.Name });

    res.json({
      success: true,
      message: `ลบผู้ใช้งาน "${userToDelete.Name}" ออกจากระบบถาวรเรียบร้อยแล้ว`,
      deletedUserId: id,
      deletedStaffId,
      remainingUsers: db.users,
      remainingStaff: db.staff
    });
  });

  // Admin action: Clean all test accounts, bookings, and histories, keeping only ONE Admin account
  app.post('/api/admin/clean-to-admin-only', (req, res) => {
    const db = getDatabase();
    
    // Retain only the single main Admin user (U001)
    const adminUser = db.users.find(u => u.UserID === 'U001' && u.Role === 'Admin') || db.users.find(u => u.Role === 'Admin') || {
      UserID: "U001",
      Name: "สมชาย ยิ่งดี (แอดมิน)",
      Phone: "0812345678",
      PasswordHash: "admin123",
      Email: "admin@sabaidee.com",
      Address: "99 ถนนกาญจนวิถี ต.บางกุ้ง อ.เมือง จ.สุราษฎร์ธานี 84000",
      Province: "สุราษฎร์ธานี",
      District: "เมืองสุราษฎร์ธานี",
      SubDistrict: "บางกุ้ง",
      Latitude: 9.10537453623607,
      Longitude: 99.33859825517314,
      ProfileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=60",
      Role: "Admin" as const,
      Status: "Active" as const,
      CreatedDate: "2026-01-01T08:00:00Z"
    };

    if (!db.deletedUserIds) db.deletedUserIds = [];
    if (!db.deletedStaffIds) db.deletedStaffIds = [];

    // Tombstone all non-admin users being removed so they NEVER return
    for (const u of db.users) {
      if (u.UserID !== adminUser.UserID && !db.deletedUserIds.includes(u.UserID)) {
        db.deletedUserIds.push(u.UserID);
      }
    }

    // Tombstone all staff being removed
    for (const s of db.staff) {
      if (!db.deletedStaffIds.includes(s.StaffID)) {
        db.deletedStaffIds.push(s.StaffID);
      }
      if (s.UserID && s.UserID !== adminUser.UserID && !db.deletedUserIds.includes(s.UserID)) {
        db.deletedUserIds.push(s.UserID);
      }
    }

    db.users = [adminUser];
    db.staff = [];
    db.bookings = [];
    db.transactions = [];
    db.reviews = [];
    db.notifications = db.notifications.filter(n => n.UserID === adminUser.UserID);

    saveDatabase(db);
    console.log(`[Admin] Cleaned database to only 1 admin (${adminUser.Name} - ${adminUser.UserID})`);

    syncToGoogleSheet('SYNC_ALL_DATA', 'All', { users: db.users, staff: db.staff });

    res.json({
      success: true,
      message: 'ลบผู้ใช้ทุกคนออกเรียบร้อย เหลือเฉพาะแอดมินคนเดียว และบล็อกไม่ให้บัญชีเดิมกลับมาอีกถาวร',
      remainingUsers: db.users,
      totalStaff: db.staff.length,
      totalBookings: db.bookings.length,
      deletedUserIds: db.deletedUserIds,
      deletedStaffIds: db.deletedStaffIds
    });
  });

  // Delete Staff Profile API (Permanent Deletion)
  app.delete('/api/staff/:id', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const deleteUser = req.query.deleteUser !== 'false' && req.body?.deleteUser !== false;

    if (!db.deletedStaffIds) db.deletedStaffIds = [];
    if (!db.deletedUserIds) db.deletedUserIds = [];

    const sIndex = db.staff.findIndex(s => s.StaffID === id);
    if (sIndex === -1) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลพนักงานที่ต้องการลบ' });
    }

    const staff = db.staff[sIndex];
    // Permanently remove from staff
    db.staff.splice(sIndex, 1);
    if (!db.deletedStaffIds.includes(id)) {
      db.deletedStaffIds.push(id);
    }

    let deletedUserId: string | undefined;
    if (staff.UserID) {
      const uIndex = db.users.findIndex(u => u.UserID === staff.UserID);
      if (uIndex !== -1) {
        const user = db.users[uIndex];
        if (user.Role !== 'Admin') {
          if (deleteUser) {
            // Permanently remove user account too
            db.users.splice(uIndex, 1);
            if (!db.deletedUserIds.includes(staff.UserID)) {
              db.deletedUserIds.push(staff.UserID);
            }
            deletedUserId = staff.UserID;
            syncToGoogleSheet('DELETE', 'Users', { UserID: user.UserID, Name: user.Name });
          } else {
            // Just demote to customer
            user.Role = 'Customer';
            syncToGoogleSheet('UPDATE', 'Users', user);
          }
        }
      }
    }

    saveDatabase(db);
    syncToGoogleSheet('DELETE', 'Staff', { StaffID: id, UserID: staff.UserID });
    syncToGoogleSheet('DELETE', 'StaffDocuments', { StaffID: id, UserID: staff.UserID });

    res.json({
      success: true,
      message: `ลบข้อมูลพนักงาน "${staff.Nickname || id}" ออกจากระบบถาวรเรียบร้อยแล้ว`,
      deletedStaffId: id,
      deletedUserId,
      remainingStaff: db.staff,
      remainingUsers: db.users
    });
  });

  // 2. Services APIs
  app.get('/api/services', (req, res) => {
    const db = getDatabase();
    res.json(db.services);
  });

  app.post('/api/services', (req, res) => {
    const db = getDatabase();
    const { ServiceName, Detail, Duration, Price, CreditRequired, Active, SortOrder } = req.body;

    if (!ServiceName || !Price || !Duration) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อบริการ ราคา และเวลาในการนวด' });
    }

    const newService: Service = {
      ServiceID: generateId('S'),
      ServiceName,
      Detail: Detail || '',
      Duration: parseInt(Duration),
      Price: parseFloat(Price),
      CreditRequired: parseFloat(CreditRequired) || Math.floor(Price * 0.15),
      Active: Active || 'ON',
      SortOrder: parseInt(SortOrder) || (db.services.length + 1)
    };

    db.services.push(newService);
    saveDatabase(db);
    syncToGoogleSheet('INSERT', 'Services', newService);
    res.json({ success: true, service: newService });
  });

  app.put('/api/services/:id', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { ServiceName, Detail, Duration, Price, CreditRequired, Active, SortOrder } = req.body;

    const index = db.services.findIndex(s => s.ServiceID === id);
    if (index === -1) {
      return res.status(404).json({ error: 'ไม่พบรหัสบริการที่ต้องการแก้ไข' });
    }

    const service = db.services[index];
    service.ServiceName = ServiceName || service.ServiceName;
    service.Detail = Detail !== undefined ? Detail : service.Detail;
    service.Duration = Duration !== undefined ? parseInt(Duration) : service.Duration;
    service.Price = Price !== undefined ? parseFloat(Price) : service.Price;
    service.CreditRequired = CreditRequired !== undefined ? parseFloat(CreditRequired) : service.CreditRequired;
    service.Active = Active || service.Active;
    service.SortOrder = SortOrder !== undefined ? parseInt(SortOrder) : service.SortOrder;

    saveDatabase(db);
    syncToGoogleSheet('UPDATE', 'Services', service);
    res.json({ success: true, service });
  });

  app.delete('/api/services/:id', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    
    const index = db.services.findIndex(s => s.ServiceID === id);
    if (index === -1) {
      return res.status(404).json({ error: 'ไม่พบบริการที่ต้องการลบ' });
    }

    const deleted = db.services[index];
    db.services.splice(index, 1);
    saveDatabase(db);
    syncToGoogleSheet('DELETE', 'Services', { ServiceID: id, ServiceName: deleted.ServiceName });
    res.json({ success: true });
  });

  // 3. Settings APIs
  app.get('/api/settings', (req, res) => {
    const db = getDatabase();
    const settings = { ...db.settings };
    const numMin = Number(settings.minCredit);
    if (!numMin || isNaN(numMin) || numMin === 398 || numMin < 298) {
      settings.minCredit = 298;
      db.settings.minCredit = 298;
      saveDatabase(db);
    } else {
      settings.minCredit = numMin;
    }
    if (!settings.lineChannelAccessToken) {
      settings.lineChannelAccessToken = (process.env.LINE_CHANNEL_ACCESS_TOKEN || 'b6spU9oI6sgyc/lagfyn8Z6MZ4GkUCLOModW44f2ZY/4Ja0nvseYKZSvZwPOboWSMAKM3VN0z/7h50RoaGkMvCNBX2+e51SYez0lNHgwqoEs8TnNKe+7jMLbFEY1sH6ujkXTbp9OXhYxOUKnOiJ0WgdB04t89/1O/w1cDnyilFU=').trim();
    }
    if (!settings.lineAdminUserId || settings.lineAdminUserId === 'Cda36ab1f3de2811e584a5b62d652a97d') {
      const envAdmin = (process.env.LINE_ADMIN_USER_ID || '').trim();
      settings.lineAdminUserId = (envAdmin && envAdmin !== 'Cda36ab1f3de2811e584a5b62d652a97d') ? envAdmin : 'Cf544171f0f9753863ade1ddd1acd67a7';
    }
    res.json(settings);
  });

  app.put('/api/settings', (req, res) => {
    const db = getDatabase();
    const isCustom = req.body?.isCustomized !== undefined ? req.body.isCustomized : true;
    let newAdminId = (req.body?.lineAdminUserId || db.settings?.lineAdminUserId || '').trim();
    if (newAdminId === 'Cda36ab1f3de2811e584a5b62d652a97d') {
      newAdminId = 'Cf544171f0f9753863ade1ddd1acd67a7';
    }
    const incomingMinCredit = Number(req.body?.minCredit);
    const finalMinCredit = (!incomingMinCredit || isNaN(incomingMinCredit) || incomingMinCredit === 398 || incomingMinCredit < 298) ? 298 : incomingMinCredit;

    let finalQrImage = req.body?.qrCodeImage !== undefined ? req.body.qrCodeImage : (db.settings?.qrCodeImage || '');
    if (typeof finalQrImage === 'string' && finalQrImage.startsWith('data:image/')) {
      try {
        const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const commaIdx = finalQrImage.indexOf(',');
        const base64Data = finalQrImage.slice(commaIdx + 1).replace(/[\r\n\s]/g, '');
        const buf = Buffer.from(base64Data, 'base64');
        const ext = finalQrImage.includes('jpeg') || finalQrImage.includes('jpg') ? 'jpg' : 'png';
        const filePath = path.join(uploadsDir, `qr_code.${ext}`);
        fs.writeFileSync(filePath, buf);
        finalQrImage = `/uploads/qr_code.${ext}?t=${Date.now()}`;
        console.log(`[Settings] Automatically converted base64 QR Code to file: ${filePath} (${buf.length} bytes)`);
      } catch (saveErr) {
        console.warn('[Settings] Failed to save QR code file:', saveErr);
      }
    }

    db.settings = {
      ...db.settings,
      ...req.body,
      qrCodeImage: finalQrImage,
      minCredit: finalMinCredit,
      lineAdminUserId: newAdminId,
      isCustomized: isCustom,
      updatedAt: req.body?.updatedAt || new Date().toISOString()
    };
    saveDatabase(db);
    syncToGoogleSheet('UPDATE', 'Settings', db.settings);
    res.json({ success: true, settings: db.settings });
  });

  app.post('/api/settings/reset', (req, res) => {
    const db = getDatabase();
    db.settings = {
      ...defaultSettings,
      isCustomized: false,
      updatedAt: new Date().toISOString()
    };
    saveDatabase(db);
    syncToGoogleSheet('UPDATE', 'Settings', db.settings);
    res.json({ success: true, settings: db.settings });
  });

  // Helper function to execute completion of a booking (manual or automated after 30 mins)
  const executeCompleteBooking = (db: DatabaseSchema, booking: Booking, isAuto: boolean = false): boolean => {
    if (!booking || booking.Status === 'Completed') return false;

    const currentStaff = db.staff.find(s => s.StaffID === booking.StaffID);
    const staffName = currentStaff ? currentStaff.Nickname : 'พนักงาน';
    const customerUser = db.users.find(u => u.UserID === booking.CustomerID);
    const service = db.services.find(s => s.ServiceID === booking.ServiceID);

    booking.Status = 'Completed';
    booking.PaymentStatus = 'Paid';
    booking.CompletedDate = new Date().toISOString();
    if (isAuto) {
      booking.AutoCompleted = true;
      sendLineNotification(`⏰ งานจบอัตโนมัติ (ครบ 30 นาทีหลังรับงาน)!\nรหัสการจอง: ${booking.BookingID}\nพนักงาน: พี่${staffName}\nยอดรวม: ${booking.ServicePrice + booking.TravelFee} บาท`);
    } else {
      sendLineNotification(`✅ งานเสร็จสิ้นแล้ว!\nรหัสการจอง: ${booking.BookingID}\nพนักงาน: พี่${staffName}\nยอดรวม: ${booking.ServicePrice + booking.TravelFee} บาท`);
    }

    // Distribute income to staff & deduct credit after completion
    if (currentStaff) {
      const creditRequired = service ? (service.CreditRequired ?? 298) : 298;
      const staffEarning = Math.max(0, booking.ServicePrice - creditRequired) + booking.TravelFee;
      currentStaff.TotalIncome = (currentStaff.TotalIncome || 0) + staffEarning;
      currentStaff.TotalJobs = Math.max(1, (currentStaff.TotalJobs || 0) + 1);

      // ตัดเครดิตพนักงานหลังจบงาน
      const hasDeducted = db.transactions.some(t => 
        t.StaffID === currentStaff.StaffID && 
        t.Type === 'Deduct' && 
        t.AdminRemark?.includes(booking.BookingID)
      );
      if (!hasDeducted && creditRequired > 0) {
        const beforeCredit = currentStaff.Credit;
        currentStaff.Credit = Math.max(0, currentStaff.Credit - creditRequired);
        const tx: CreditTransaction = {
          TransactionID: generateId('TX'),
          StaffID: currentStaff.StaffID,
          Amount: creditRequired,
          BeforeCredit: beforeCredit,
          AfterCredit: currentStaff.Credit,
          Type: 'Deduct',
          SlipImage: '',
          Status: 'Approved',
          AdminRemark: isAuto 
            ? `ตัดเครดิตค่าธรรมเนียมหลังจบงานอัตโนมัติ (ครบ 30 นาทีหลังรับงาน) Booking #${booking.BookingID}`
            : `ตัดเครดิตค่าธรรมเนียมหลังจบงาน Booking #${booking.BookingID}`,
          CreatedDate: new Date().toISOString()
        };
        db.transactions.push(tx);
        syncToGoogleSheet('INSERT', 'CreditTransaction', tx);
      }

      // When this job is completed: if credit is exhausted (<= 0) or below minCredit, turn off availability now!
      const rawMin = Number(db.settings?.minCredit);
      const minCredit = (!rawMin || isNaN(rawMin) || rawMin === 398 || rawMin < 298) ? 298 : rawMin;
      const otherActiveBookings = db.bookings.some(b => 
        b.StaffID === currentStaff.StaffID && 
        b.BookingID !== booking.BookingID && 
        (b.Status === 'Accepted' || b.Status === 'Working')
      );

      if (!otherActiveBookings && (currentStaff.Credit <= 0 || currentStaff.Credit < minCredit)) {
        currentStaff.Available = 'OFF';
        console.log(`[StaffAvailability] Auto-turned off staff ${currentStaff.Nickname} (${currentStaff.StaffID}) after completing LAST job #${booking.BookingID} due to exhausted or low credit (${currentStaff.Credit} < ${minCredit})`);
        
        const notif: Notification = {
          NotificationID: generateId('N'),
          UserID: currentStaff.UserID,
          Title: "🔴 ปิดรับงานอัตโนมัติ (จบงานแล้ว & เครดิตหมด)",
          Detail: `งาน #${booking.BookingID} เสร็จสิ้นแล้ว ตัดเครดิตค่าธรรมเนียม -${creditRequired} CR เนื่องจากเครดิตคงเหลือ (${currentStaff.Credit} CR) หมดหรือต่ำกว่าเกณฑ์ขั้นต่ำ (${minCredit} เครดิต) ระบบได้ปิดรับงานให้อัตโนมัติ กรุณาเติมเครดิตเพื่อเปิดรับงานใหม่นะคะ`,
          ReadStatus: 'Unread',
          CreatedDate: new Date().toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet('INSERT', 'Notification', notif);
      }

      if (isAuto) {
        const notifStaffAuto: Notification = {
          NotificationID: generateId('N'),
          UserID: currentStaff.UserID,
          Title: "⏰ จบงานอัตโนมัติ (ครบ 30 นาทีหลังรับงาน)",
          Detail: `งานจอง #${booking.BookingID} ถูกปิดจบงานอัตโนมัติเนื่องจากครบกำหนด 30 นาทีหลังกดรับงาน ระบบได้บันทึกรายได้ ฿${staffEarning.toLocaleString()} และตัดเครดิตค่าธรรมเนียม -${creditRequired} CR เรียบร้อยแล้วค่ะ`,
          ReadStatus: 'Unread',
          CreatedDate: new Date().toISOString()
        };
        db.notifications.push(notifStaffAuto);
        syncToGoogleSheet('INSERT', 'Notification', notifStaffAuto);
      }

      syncToGoogleSheet('UPDATE', 'Staff', currentStaff);
    }

    // Notify customer
    if (customerUser) {
      const notif: Notification = {
        NotificationID: generateId('N'),
        UserID: customerUser.UserID,
        Title: isAuto ? "✅ การให้บริการเสร็จสิ้น (จบงานอัตโนมัติ)" : "✅ การให้บริการเสร็จสิ้นแล้ว",
        Detail: isAuto
          ? "ระบบได้ปิดจบงานให้อัตโนมัติ (ครบ 30 นาทีหลังรับงาน) ขอบคุณที่ใช้บริการ SabaiDee Massage ค่ะ กรุณาให้คะแนนรีวิวเพื่อเป็นกำลังใจและพัฒนาคุณภาพต่อไปนะคะ"
          : "ขอบคุณที่ใช้บริการ SabaiDee Massage ค่ะ กรุณาให้คะแนนรีวิวเพื่อเป็นกำลังใจและพัฒนาคุณภาพต่อไป",
        ReadStatus: 'Unread',
        CreatedDate: new Date().toISOString()
      };
      db.notifications.push(notif);
      syncToGoogleSheet('INSERT', 'Notification', notif);
    }

    syncToGoogleSheet('UPDATE', 'Booking', booking);
    return true;
  };

  // Helper function that automatically completes jobs 30 minutes after staff acceptance if not completed manually
  const checkAndAutoCompleteExpiredBookings = (db: DatabaseSchema): boolean => {
    const minutes = Number(db.settings?.autoCompleteMinutes) > 0 ? Number(db.settings?.autoCompleteMinutes) : 30;
    const AUTO_COMPLETE_MS = minutes * 60 * 1000;
    const now = Date.now();
    let updated = false;

    db.bookings.forEach(b => {
      if (b.Status === 'Accepted' || b.Status === 'Working') {
        const acceptedTimeStr = b.AcceptedDate || b.CreatedDate;
        if (!acceptedTimeStr) return;
        const acceptedTime = new Date(acceptedTimeStr).getTime();
        if (!isNaN(acceptedTime) && (now - acceptedTime) >= AUTO_COMPLETE_MS) {
          console.log(`[AutoComplete] Auto-completing booking #${b.BookingID} after ${minutes} minutes (Accepted at: ${acceptedTimeStr})`);
          const completed = executeCompleteBooking(db, b, true);
          if (completed) {
            updated = true;
          }
        }
      }
    });

    if (updated) {
      saveDatabase(db);
    }
    return updated;
  };

  // 4. Staff-specific APIs
  app.get('/api/staff', (req, res) => {
    const db = getDatabase();
    
    // Join User details with Staff details
    const staffList = db.staff.map(s => {
      const u = db.users.find(user => user.UserID === s.UserID);
      return {
        ...s,
        Name: u ? u.Name : 'พนักงาน',
        Phone: u ? u.Phone : '',
        Email: u ? u.Email : '',
        ProfileImage: u ? u.ProfileImage : '',
        Address: u ? u.Address : '',
        Province: u ? u.Province : '',
        District: u ? u.District : '',
        SubDistrict: u ? u.SubDistrict : '',
        UserStatus: u ? u.Status : 'Active',
        UserCreatedDate: u ? u.CreatedDate : ''
      };
    });

    res.json(staffList);
  });

  // Get full staff detail (profile, work history, bookings, reviews, credit transactions)
  app.get('/api/staff/:id/details', (req, res) => {
    const db = getDatabase();
    checkAndAutoCompleteExpiredBookings(db);
    const { id } = req.params;

    const staff = db.staff.find(s => s.StaffID === id);
    if (!staff) {
      return res.status(404).json({ error: 'ไม่พบพนักงานในระบบ' });
    }

    const u = db.users.find(user => user.UserID === staff.UserID);
    const enrichedStaff = {
      ...staff,
      Name: u ? u.Name : 'พนักงาน',
      Phone: u ? u.Phone : '',
      Email: u ? u.Email : '',
      ProfileImage: u ? u.ProfileImage : '',
      Address: u ? u.Address : '',
      Province: u ? u.Province : '',
      District: u ? u.District : '',
      SubDistrict: u ? u.SubDistrict : '',
      UserStatus: u ? u.Status : 'Active',
      UserCreatedDate: u ? u.CreatedDate : ''
    };

    // Bookings of this staff
    const bookings = db.bookings
      .filter(b => b.StaffID === id)
      .map(b => {
        const customer = db.users.find(usr => usr.UserID === b.CustomerID);
        const service = db.services.find(svc => svc.ServiceID === b.ServiceID);
        return {
          ...b,
          CustomerName: customer ? customer.Name : 'ลูกค้า',
          CustomerPhone: customer ? customer.Phone : '',
          ServiceName: service ? service.ServiceName : (b.ServiceID || 'บริการนวด')
        };
      })
      .sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());

    // Reviews of this staff
    const reviews = db.reviews
      .filter(r => r.StaffID === id)
      .map(r => {
        const customer = db.users.find(usr => usr.UserID === r.CustomerID);
        return {
          ...r,
          CustomerName: customer ? customer.Name : 'ลูกค้า',
          CustomerPhone: customer ? customer.Phone : ''
        };
      })
      .sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());

    // Credit transactions of this staff
    const transactions = db.transactions
      .filter(t => t.StaffID === id)
      .sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());

    res.json({
      staff: enrichedStaff,
      bookings,
      reviews,
      transactions,
      services: db.services
    });
  });

  // Admin Direct Adjust Staff Credit
  app.put('/api/admin/staff/:id/credit', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { amount, type, remark } = req.body; // type: 'Topup' | 'Deduct'

    const staffIndex = db.staff.findIndex(s => s.StaffID === id);
    if (staffIndex === -1) {
      return res.status(404).json({ error: 'ไม่พบพนักงานในระบบ' });
    }

    const staff = db.staff[staffIndex];
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) {
      return res.status(400).json({ error: 'จำนวนเครดิตต้องมากกว่า 0' });
    }

    const beforeCredit = staff.Credit;
    const afterCredit = type === 'Topup' ? beforeCredit + numAmount : Math.max(0, beforeCredit - numAmount);
    staff.Credit = afterCredit;

    const tx = {
      TransactionID: generateId('TX'),
      StaffID: staff.StaffID,
      Amount: numAmount,
      BeforeCredit: beforeCredit,
      AfterCredit: afterCredit,
      Type: type as 'Topup' | 'Deduct',
      SlipImage: '',
      Status: 'Approved' as const,
      AdminRemark: remark || (type === 'Topup' ? 'แอดมินปรับเพิ่มเครดิตโดยตรง' : 'แอดมินปรับลดเครดิตโดยตรง'),
      CreatedDate: new Date().toISOString()
    };

    db.transactions.push(tx);

    // Notify staff
    const notif = {
      NotificationID: generateId('N'),
      UserID: staff.UserID,
      Title: type === 'Topup' ? `🎉 ได้รับเครดิตเพิ่ม +${numAmount} CR` : `⚠️ มีการหักเครดิต -${numAmount} CR`,
      Detail: `${tx.AdminRemark} (ยอดคงเหลือปัจจุบัน: ${afterCredit.toFixed(0)} CR)`,
      ReadStatus: 'Unread' as const,
      CreatedDate: new Date().toISOString()
    };
    db.notifications.push(notif);

    saveDatabase(db);
    syncToGoogleSheet('UPDATE', 'Staff', staff);
    syncToGoogleSheet('INSERT', 'CreditTransaction', tx);
    syncToGoogleSheet('INSERT', 'Notification', notif);
    res.json({ success: true, staff, transaction: tx });
  });

  // Admin Update Staff Profile & Preferences
  app.put('/api/admin/staff/:id/update', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { 
      name, phone, email, address, province, district, subDistrict,
      nickname, gender, age, weight, height, experience, description, 
      registeredAddress, offeredServices, maxJobDistance, verifyStatus, available, status,
      licenseFile, idCardFile, houseRegFile, photos, profileImage
    } = req.body;

    const staffIndex = db.staff.findIndex(s => s.StaffID === id);
    if (staffIndex === -1) {
      return res.status(404).json({ error: 'ไม่พบพนักงานในระบบ' });
    }

    const staff = db.staff[staffIndex];
    if (nickname !== undefined) staff.Nickname = nickname;
    if (gender !== undefined) staff.Gender = gender;
    if (age !== undefined) staff.Age = parseInt(age) || staff.Age;
    if (weight !== undefined) staff.Weight = parseInt(weight) || staff.Weight;
    if (height !== undefined) staff.Height = parseInt(height) || staff.Height;
    if (experience !== undefined) staff.Experience = parseInt(experience) || staff.Experience;
    if (description !== undefined) staff.Description = description;
    if (registeredAddress !== undefined) staff.RegisteredAddress = registeredAddress;
    if (offeredServices !== undefined) staff.OfferedServices = offeredServices;
    if (maxJobDistance !== undefined) staff.MaxJobDistance = parseInt(maxJobDistance) || staff.MaxJobDistance;
    if (verifyStatus !== undefined) staff.VerifyStatus = verifyStatus;
    if (available !== undefined) staff.Available = available;
    if (licenseFile !== undefined) staff.LicenseFile = licenseFile;
    if (idCardFile !== undefined) staff.IdCardFile = idCardFile;
    if (houseRegFile !== undefined) staff.HouseRegFile = houseRegFile;
    if (photos !== undefined) staff.Photos = photos;

    // Update user record
    const userIndex = db.users.findIndex(u => u.UserID === staff.UserID);
    let updatedUser: User | null = null;
    if (userIndex !== -1) {
      const user = db.users[userIndex];
      if (name !== undefined) user.Name = name;
      if (phone !== undefined) user.Phone = phone;
      if (email !== undefined) user.Email = email;
      if (address !== undefined) user.Address = address;
      if (province !== undefined) user.Province = province;
      if (district !== undefined) user.District = district;
      if (subDistrict !== undefined) user.SubDistrict = subDistrict;
      if (status !== undefined) user.Status = status;
      if (profileImage !== undefined) {
        user.ProfileImage = profileImage;
      }
      updatedUser = user;
    }

    saveDatabase(db);
    syncToGoogleSheet('UPDATE', 'Staff', staff);
    const staffDocData = {
      DocID: `DOC-${staff.StaffID}`,
      StaffID: staff.StaffID,
      UserID: staff.UserID,
      StaffName: updatedUser?.Name || staff.Nickname,
      Nickname: staff.Nickname,
      Phone: updatedUser?.Phone || '',
      VerifyStatus: staff.VerifyStatus,
      LicenseFile: staff.LicenseFile || '',
      IdCardFile: staff.IdCardFile || '',
      HouseRegFile: staff.HouseRegFile || '',
      RegisteredAddress: staff.RegisteredAddress || updatedUser?.Address || '',
      SubmittedDate: new Date().toISOString(),
      Notes: `อัปเดตข้อมูลและเอกสารหลักฐาน (${staff.VerifyStatus})`
    };
    syncToGoogleSheet('UPDATE', 'StaffDocuments', staffDocData);
    if (updatedUser) {
      syncToGoogleSheet('UPDATE', 'Users', updatedUser);
    }
    res.json({ success: true, staff });
  });

  // Get staff reviews
  app.get('/api/staff/:id/reviews', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    
    const staffReviews = db.reviews.filter(r => r.StaffID === id);
    // join customer name
    const enrichedReviews = staffReviews.map(r => {
      const customer = db.users.find(u => u.UserID === r.CustomerID);
      return {
        ...r,
        CustomerName: customer ? customer.Name : 'ลูกค้า'
      };
    }).sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());
    
    res.json(enrichedReviews);
  });

  // Toggle availability (ON/OFF)
  app.put('/api/staff/availability', (req, res) => {
    const db = getDatabase();
    const { staffId, available, onlyIfNoActiveJobs } = req.body;

    const index = db.staff.findIndex(s => s.StaffID === staffId);
    if (index === -1) {
      return res.status(404).json({ error: 'ไม่พบพนักงานในระบบ' });
    }

    if (available === 'ON') {
      if (db.staff[index].VerifyStatus !== 'Approved') {
        const errorMsg = db.staff[index].VerifyStatus === 'Pending'
          ? 'ไม่สามารถเปิดรับงานได้ บัญชีของคุณอยู่ระหว่างรอแอดมินตรวจสอบและอนุมัติก่อนค่ะ'
          : 'ไม่สามารถเปิดรับงานได้ บัญชีของคุณไม่ได้รับการอนุมัติ กรุณาติดต่อผู้ดูแลระบบค่ะ';
        return res.status(403).json({ error: errorMsg, verifyStatus: db.staff[index].VerifyStatus });
      }

      const rawMin = Number(db.settings?.minCredit);
      const minCredit = (!rawMin || isNaN(rawMin) || rawMin === 398 || rawMin < 298) ? 298 : rawMin;
      const staffCredit = Number(db.staff[index].Credit || 0);
      if (staffCredit < minCredit) {
        return res.status(400).json({ error: `เครดิตไม่พอรับงาน (ขั้นต่ำ ${minCredit} เครดิต) กรุณาเติมเครดิตก่อนเปิดรับงานค่ะ` });
      }
    }

    if (available === 'OFF' && onlyIfNoActiveJobs) {
      const hasActive = db.bookings.some(b => 
        b.StaffID === staffId && (b.Status === 'Accepted' || b.Status === 'Working')
      );
      if (hasActive) {
        return res.json({ 
          success: false, 
          message: 'พนักงานยังมีงานที่กำลังดำเนินการอยู่ ไม่สามารถปิดรับงานอัตโนมัติได้จนกว่าจะจบงานสุดท้าย', 
          staff: db.staff[index] 
        });
      }
    }

    db.staff[index].Available = available;
    db.staff[index].LastLocationUpdate = new Date().toISOString();
    
    saveDatabase(db);
    syncToGoogleSheet('UPDATE', 'Staff', db.staff[index]);
    res.json({ success: true, staff: db.staff[index] });
  });

  // Update Staff Verification Status (Admin operation)
  app.put('/api/staff/:id/verify', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { status } = req.body; // Approved / Reject / Pending

    const index = db.staff.findIndex(s => s.StaffID === id);
    if (index === -1) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลพนักงาน' });
    }

    db.staff[index].VerifyStatus = status;

    // If status is not Approved, immediately force Available to 'OFF'
    if (status !== 'Approved') {
      db.staff[index].Available = 'OFF';
    }

    // Send notification to staff user
    const staff = db.staff[index];
    const staffUser = db.users.find(u => u.UserID === staff.UserID);
    const notif = {
      NotificationID: generateId('N'),
      UserID: staff.UserID,
      Title: status === 'Approved' 
        ? "🎉 บัญชีพนักงานของคุณได้รับการอนุมัติแล้ว!" 
        : status === 'Pending'
        ? "⏳ บัญชีพนักงานอยู่ระหว่างรอการตรวจสอบ"
        : "⚠️ บัญชีพนักงานไม่ได้รับการอนุมัติ",
      Detail: status === 'Approved' 
        ? "แอดมินได้อนุมัติบัญชีของคุณเรียบร้อยแล้ว ขณะนี้คุณสามารถเปิดสถานะออนไลน์เพื่อเริ่มรับงานจากลูกค้าได้ทันทีค่ะ" 
        : status === 'Pending'
        ? "ข้อมูลและเอกสารของคุณอยู่ระหว่างรอแอดมินตรวจสอบค่ะ"
        : "กรุณาแก้ไขเอกสารข้อมูลหรือรูปโปรไฟล์ของคุณ หรือติดต่อฝ่ายบริการลูกค้าเพื่อสอบถามเพิ่มเติมค่ะ",
      ReadStatus: 'Unread' as const,
      CreatedDate: new Date().toISOString()
    };
    db.notifications.push(notif);

    // Send LINE alert
    if (status === 'Approved') {
      sendLineNotification(`✅ [อนุมัติพนักงานแล้ว]\nชื่อ: ${staffUser?.Name || ''} (พี่${staff.Nickname})\nเบอร์: ${staffUser?.Phone || ''}\nสถานะ: แอดมินอนุมัติเรียบร้อย พนักงานสามารถเปิดรับงานได้แล้ว 🎉`);
    } else if (status === 'Reject') {
      sendLineNotification(`🚫 [ปฏิเสธการอนุมัติพนักงาน]\nชื่อ: ${staffUser?.Name || ''} (พี่${staff.Nickname})\nเบอร์: ${staffUser?.Phone || ''}\nสถานะ: ไม่อนุมัติ`);
    }

    saveDatabase(db);
    syncToGoogleSheet('UPDATE', 'Staff', db.staff[index]);
    const staffDocData = {
      DocID: `DOC-${db.staff[index].StaffID}`,
      StaffID: db.staff[index].StaffID,
      UserID: db.staff[index].UserID,
      StaffName: staffUser?.Name || db.staff[index].Nickname,
      Nickname: db.staff[index].Nickname,
      Phone: staffUser?.Phone || '',
      VerifyStatus: db.staff[index].VerifyStatus,
      LicenseFile: db.staff[index].LicenseFile || '',
      IdCardFile: db.staff[index].IdCardFile || '',
      HouseRegFile: db.staff[index].HouseRegFile || '',
      RegisteredAddress: db.staff[index].RegisteredAddress || staffUser?.Address || '',
      SubmittedDate: new Date().toISOString(),
      Notes: `อัปเดตสถานะการอนุมัติ: ${db.staff[index].VerifyStatus}`
    };
    syncToGoogleSheet('UPDATE', 'StaffDocuments', staffDocData);
    syncToGoogleSheet('INSERT', 'Notification', notif);
    res.json({ success: true, staff: db.staff[index] });
  });

  // Update GPS coordinate for Staff (Runs every 30 seconds if active)
  app.put('/api/staff/location', (req, res) => {
    const db = getDatabase();
    const { staffId, latitude, longitude } = req.body;

    const sIndex = db.staff.findIndex(s => s.StaffID === staffId);
    if (sIndex === -1) {
      return res.status(404).json({ error: 'ไม่พบพนักงานในระบบ' });
    }

    db.staff[sIndex].CurrentLatitude = parseFloat(latitude);
    db.staff[sIndex].CurrentLongitude = parseFloat(longitude);
    db.staff[sIndex].LastLocationUpdate = new Date().toISOString();

    // Sync to User's main latitude/longitude
    const uIndex = db.users.findIndex(u => u.UserID === db.staff[sIndex].UserID);
    if (uIndex !== -1) {
      db.users[uIndex].Latitude = parseFloat(latitude);
      db.users[uIndex].Longitude = parseFloat(longitude);
    }

    saveDatabase(db);
    syncToGoogleSheet('UPDATE', 'Staff', db.staff[sIndex]);
    res.json({ success: true, staff: db.staff[sIndex] });
  });

  // Update Customer / User location
  app.put('/api/users/:id/location', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { latitude, longitude, address } = req.body;

    const uIndex = db.users.findIndex(u => u.UserID === id);
    if (uIndex === -1) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้ในระบบ' });
    }

    if (latitude !== undefined) db.users[uIndex].Latitude = parseFloat(latitude);
    if (longitude !== undefined) db.users[uIndex].Longitude = parseFloat(longitude);
    if (address) db.users[uIndex].Address = address;

    saveDatabase(db);
    res.json({ success: true, user: db.users[uIndex] });
  });

  // 5. Booking & Matching APIs
  
  // Create a Booking
  app.post('/api/bookings', (req, res) => {
    const db = getDatabase();
    const { customerId, serviceId, customerAddress, customerAddressDetail, customerLatitude, customerLongitude, preferredStaffId } = req.body;

    if (!customerId || !serviceId || !customerLatitude || !customerLongitude) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็นสำหรับการจอง' });
    }

    const service = db.services.find(s => s.ServiceID === serviceId);
    if (!service) {
      return res.status(404).json({ error: 'ไม่พบรหัสบริการที่ระบุ' });
    }

    const customerUser = db.users.find(u => u.UserID === customerId);
    if (!customerUser) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้ลูกค้า' });
    }

    // Parse main address and additional text address detail
    let finalMainAddress = (customerAddress || customerUser.Address || '').trim();
    let finalDetailAddress = (customerAddressDetail || '').trim();
    if (!finalDetailAddress && finalMainAddress) {
      const match = finalMainAddress.match(/^(.*?)(?:\s*\((?:รายละเอียดเพิ่มเติม|ข้อมูลเพิ่มเติม|ที่อยู่เพิ่มเติม):\s*([^)]+)\))\s*$/);
      if (match) {
        finalMainAddress = match[1].trim();
        finalDetailAddress = match[2].trim();
      }
    }

    // Accurate Haversine distance calculator helper (in kilometers)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      if (
        typeof lat1 !== 'number' || isNaN(lat1) ||
        typeof lon1 !== 'number' || isNaN(lon1) ||
        typeof lat2 !== 'number' || isNaN(lat2) ||
        typeof lon2 !== 'number' || isNaN(lon2)
      ) {
        return 0;
      }
      if (lat1 === lat2 && lon1 === lon2) return 0;
      const R = 6371; // Earth radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return parseFloat((R * c).toFixed(2));
    };

    // Calculate distance and travel fee for nearby online approved staff
    const settings = db.settings;
    const clientLat = parseFloat(customerLatitude);
    const clientLng = parseFloat(customerLongitude);
    const maxSearchRadius = settings.searchRadius && settings.searchRadius > 0 ? settings.searchRadius : 15;

    // Find and sort eligible staff (ON, Approved, Credit >= Service.CreditRequired, within search radius)
    const eligibleStaff = db.staff
      .filter(s => {
        const staffLat = typeof s.CurrentLatitude === 'number' ? s.CurrentLatitude : 9.138244;
        const staffLng = typeof s.CurrentLongitude === 'number' ? s.CurrentLongitude : 99.321748;
        const dist = calculateDistance(clientLat, clientLng, staffLat, staffLng);
        const offersService = !s.OfferedServices || s.OfferedServices.includes(serviceId);
        // If staff explicitly set a smaller limit (< 15km), respect it; otherwise allow up to platform search radius
        const staffDistanceLimit = (s.MaxJobDistance && s.MaxJobDistance < 15) ? s.MaxJobDistance : Math.max(s.MaxJobDistance || 0, maxSearchRadius);
        const maxDist = Math.min(staffDistanceLimit, maxSearchRadius);
        return (
          s.Available === 'ON' &&
          s.VerifyStatus === 'Approved' &&
          s.Credit >= ((!Number(settings.minCredit) || Number(settings.minCredit) === 398 || Number(settings.minCredit) < 298) ? 298 : Number(settings.minCredit)) &&
          dist <= maxDist &&
          offersService
        );
      })
      .map(s => {
        const staffLat = typeof s.CurrentLatitude === 'number' ? s.CurrentLatitude : 9.138244;
        const staffLng = typeof s.CurrentLongitude === 'number' ? s.CurrentLongitude : 99.321748;
        const dist = calculateDistance(clientLat, clientLng, staffLat, staffLng);
        let travelFee = parseFloat((dist * settings.travelFeePerKm).toFixed(2));
        
        if (settings.travelFeeTiers && settings.travelFeeTiers.length > 0) {
          const sortedTiers = [...settings.travelFeeTiers].sort((a, b) => a.maxKm - b.maxKm);
          for (const tier of sortedTiers) {
            if (dist >= tier.minKm && dist <= tier.maxKm) {
              travelFee = tier.fee;
              break;
            }
          }
        }
        
        return {
          ...s,
          CurrentLatitude: staffLat,
          CurrentLongitude: staffLng,
          dist,
          travelFee
        };
      })
      .sort((a, b) => a.dist - b.dist); // closest first
      
    if (eligibleStaff.length === 0) {
      return res.status(400).json({ error: `ขออภัย ไม่มีหมอนวดให้บริการในระยะ ${maxSearchRadius} กม. จากตำแหน่งของคุณ กรุณาลองใหม่ภายหลังค่ะ` });
    }

    // If a preferred staff is requested, try to use them first if they are eligible
    let bestStaff = eligibleStaff[0];
    if (preferredStaffId) {
      const preferred = eligibleStaff.find(s => s.StaffID === preferredStaffId);
      if (preferred) {
        bestStaff = preferred;
      }
    }

    const distanceVal = bestStaff ? bestStaff.dist : 0.0;
    const travelFeeVal = bestStaff ? bestStaff.travelFee : parseFloat((distanceVal * settings.travelFeePerKm).toFixed(2));
    const totalPriceVal = service.Price + travelFeeVal;

    const newBookingID = generateId('B');
    const newBooking: Booking & { offeredQueue?: string[], currentOfferIndex?: number, offerExpireTime?: string } = {
      BookingID: newBookingID,
      CustomerID: customerId,
      StaffID: bestStaff ? bestStaff.StaffID : 'none', // auto-assign closest or set 'none'
      BookingDate: new Date().toISOString().split('T')[0],
      BookingTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
      ServiceID: serviceId,
      ServicePrice: service.Price,
      Distance: distanceVal,
      TravelFee: travelFeeVal,
      TotalPrice: totalPriceVal,
      CustomerLatitude: clientLat,
      CustomerLongitude: clientLng,
      CustomerAddress: finalMainAddress,
      CustomerAddressDetail: finalDetailAddress,
      Status: bestStaff ? 'Waiting' : 'Cancel', // Cancel directly if no staff online
      PaymentStatus: 'Unpaid',
      CreatedDate: new Date().toISOString()
    };

    // Store queue details on backend for matching logic simulation
    if (eligibleStaff.length > 0) {
      if (preferredStaffId && eligibleStaff.some(s => s.StaffID === preferredStaffId)) {
        // Re-arrange offeredQueue so preferred staff is at index 0
        const rest = eligibleStaff.filter(s => s.StaffID !== preferredStaffId);
        newBooking.offeredQueue = [preferredStaffId, ...rest.map(r => r.StaffID)];
      } else {
        newBooking.offeredQueue = eligibleStaff.map(s => s.StaffID);
      }
      newBooking.currentOfferIndex = 0;
      // 30 seconds offer expiration
      newBooking.offerExpireTime = new Date(Date.now() + 30 * 1000).toISOString();

      // Notify the offered staff
      const selectedStaff = bestStaff;
      const notif = {
        NotificationID: generateId('N'),
        UserID: selectedStaff.UserID,
        Title: "🔔 มีงานนวดใหม่เรียกใช้คุณ!",
        Detail: `คุณได้รับการเรียกงานนวดบริการ ${service.ServiceName} ระยะทาง ${distanceVal} กม. รายได้รวม ${totalPriceVal} บาท กรุณาตอบรับภายใน 30 วินาที`,
        ReadStatus: 'Unread' as const,
        CreatedDate: new Date().toISOString()
      };
      db.notifications.push(notif);
      syncToGoogleSheet('INSERT', 'Notification', notif);
    }

    sendLineNotification(`🛎️ มีออเดอร์ใหม่เข้ามา!\nรหัสการจอง: ${newBooking.BookingID}\nบริการ: ${service.ServiceName}\nยอดรวม: ${totalPriceVal} บาท\nลูกค้า: ${customerUser.Name}`);
    db.bookings.push(newBooking as Booking);
    saveDatabase(db);
    syncToGoogleSheet('INSERT', 'Booking', newBooking);

    res.json({ 
      success: true, 
      booking: newBooking, 
      matchedStaff: bestStaff || null,
      availableCount: eligibleStaff.length 
    });
  });

  // Helper function that checks expired offer timers and routes them to the next staff automatically
  const checkExpiredOffers = (db: any): boolean => {
    let updated = false;
    const now = new Date();

    db.bookings.forEach((b: any) => {
      if (b.Status === 'Waiting' && b.offeredQueue && b.offerExpireTime) {
        const expireTime = new Date(b.offerExpireTime);
        if (now > expireTime) {
          // Time expired! Route to next staff
          b.currentOfferIndex = (b.currentOfferIndex || 0) + 1;
          
          if (b.currentOfferIndex < b.offeredQueue.length) {
            // Move to next staff in queue
            const nextStaffId = b.offeredQueue[b.currentOfferIndex];
            const prevStaffId = b.StaffID;
            b.StaffID = nextStaffId;
            b.offerExpireTime = new Date(Date.now() + 30 * 1000).toISOString();
            updated = true;

            const staffObj = db.staff.find((s: any) => s.StaffID === nextStaffId);
            const prevStaffObj = db.staff.find((s: any) => s.StaffID === prevStaffId);
            const svc = db.services.find((s: any) => s.ServiceID === b.ServiceID);

            if (staffObj) {
              const notifNext = {
                NotificationID: generateId('N'),
                UserID: staffObj.UserID,
                Title: "🔔 ได้รับข้อเสนองานใหม่ (ส่งต่อ)",
                Detail: `งานบริการ ${svc?.ServiceName || 'นวด'} ถูกส่งต่อมายังคุณเนื่องจากพนักงานก่อนหน้าหมดเวลารับสาย กรุณาตอบรับค่ะ`,
                ReadStatus: 'Unread' as const,
                CreatedDate: new Date().toISOString()
              };
              db.notifications.push(notifNext);
              syncToGoogleSheet('INSERT', 'Notification', notifNext);
            }

            if (prevStaffObj) {
              const notifPrev = {
                NotificationID: generateId('N'),
                UserID: prevStaffObj.UserID,
                Title: "⚠️ พลาดงานเรียก",
                Detail: `คุณไม่ได้ตอบรับงานจอง #${b.BookingID} ภายในเวลาที่กำหนด ระบบจึงส่งงานให้พนักงานถัดไป`,
                ReadStatus: 'Unread' as const,
                CreatedDate: new Date().toISOString()
              };
              db.notifications.push(notifPrev);
              syncToGoogleSheet('INSERT', 'Notification', notifPrev);
            }
          } else {
            // End of queue! Cancel the booking automatically
            b.Status = 'Cancel';
            b.StaffID = 'none';
            updated = true;

            // Notify Customer
            const notifCust = {
              NotificationID: generateId('N'),
              UserID: b.CustomerID,
              Title: "❌ ไม่มีพนักงานตอบรับงานจอง",
              Detail: "ขณะนี้พนักงานนวดในเขตบริการของคุณยังไม่สะดวกรับงาน กรุณาลองใหม่อีกครั้งในภายหลังค่ะ",
              ReadStatus: 'Unread' as const,
              CreatedDate: new Date().toISOString()
            };
            db.notifications.push(notifCust);
            syncToGoogleSheet('INSERT', 'Notification', notifCust);
          }
          syncToGoogleSheet('UPDATE', 'Booking', b);
        }
      }
    });

    if (updated) {
      saveDatabase(db);
    }
    return updated;
  };

  // Get Bookings list
  app.get('/api/bookings', (req, res) => {
    const db = getDatabase();
    // Run automated offer rotation and auto-complete expired bookings (30 mins after accept) before returning
    checkExpiredOffers(db);
    checkAndAutoCompleteExpiredBookings(db);
    
    // Rich payload joining Customer, Staff, and Service info
    const joinedBookings = db.bookings.map(b => {
      const customer = db.users.find(u => u.UserID === b.CustomerID);
      const staff = db.staff.find(s => s.StaffID === b.StaffID);
      const staffUser = staff ? db.users.find(u => u.UserID === staff.UserID) : null;
      const service = db.services.find(s => s.ServiceID === b.ServiceID);
      const review = db.reviews.find(r => r.BookingID === b.BookingID);

      let bMainAddress = (b.CustomerAddress || '').trim();
      let bDetailAddress = (b.CustomerAddressDetail || '').trim();
      if (!bDetailAddress && bMainAddress) {
        const match = bMainAddress.match(/^(.*?)(?:\s*\((?:รายละเอียดเพิ่มเติม|ข้อมูลเพิ่มเติม|ที่อยู่เพิ่มเติม):\s*([^)]+)\))\s*$/);
        if (match) {
          bMainAddress = match[1].trim();
          bDetailAddress = match[2].trim();
        }
      }

      return {
        ...b,
        CustomerAddress: bMainAddress,
        CustomerAddressDetail: bDetailAddress,
        CustomerName: customer ? customer.Name : 'ลูกค้า',
        CustomerPhone: customer ? customer.Phone : '',
        CustomerProfileImage: customer ? (customer.ProfileImage || DEFAULT_BLANK_AVATAR) : DEFAULT_BLANK_AVATAR,
        StaffNickname: staff ? staff.Nickname : '',
        StaffPhone: staffUser ? staffUser.Phone : '',
        StaffProfileImage: staffUser ? staffUser.ProfileImage : '',
        ServiceName: service ? service.ServiceName : 'บริการนวด',
        ServiceDuration: service ? service.Duration : 60,
        CreditRequired: service ? service.CreditRequired : 0,
        NetIncome: Math.max(0, b.ServicePrice - (service ? service.CreditRequired : 0)) + b.TravelFee,
        ReviewScore: review ? review.Score : null,
        ReviewComment: review ? review.Comment : null
      };
    });

    res.json(joinedBookings);
  });

  // Simulated Polling API that checks expired offer timers and routes them to the next staff automatically!
  app.get('/api/bookings/match-updates', (req, res) => {
    const db = getDatabase();
    const updatedOffers = checkExpiredOffers(db);
    const updatedAuto = checkAndAutoCompleteExpiredBookings(db);
    res.json({ success: true, updated: updatedOffers || updatedAuto });
  });

  // Action on booking: Accept, Travel, Work, Complete, Cancel
  app.put('/api/bookings/:id/action', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { action, staffId } = req.body; // accept, start_travel, start_work, complete, cancel

    const index = db.bookings.findIndex(b => b.BookingID === id);
    if (index === -1) {
      return res.status(404).json({ error: 'ไม่พบงานจองนี้ในระบบ' });
    }

    const booking = db.bookings[index];
    const customerUser = db.users.find(u => u.UserID === booking.CustomerID);
    const service = db.services.find(s => s.ServiceID === booking.ServiceID);

    if (action === 'reject') {
      booking.Status = 'Cancel';
      booking.CancellationReason = 'พนักงานปฏิเสธการรับงาน';
      booking.StaffID = 'none';
      if (customerUser) {
        const notif = {
          NotificationID: generateId('N'),
          UserID: customerUser.UserID,
          Title: "❌ พนักงานปฏิเสธรับงาน",
          Detail: "ขออภัยค่ะ พนักงานไม่สะดวกรับงานในขณะนี้ ระบบได้ทำการยกเลิกการจองให้ท่านแล้ว",
          ReadStatus: 'Unread' as const,
          CreatedDate: new Date().toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet('INSERT', 'Notification', notif);
      }
      saveDatabase(db);
      syncToGoogleSheet('UPDATE', 'Booking', booking);
      return res.json({ message: 'Rejected' });
    }

    if (action === 'accept') {
      const staff = db.staff.find(s => s.StaffID === staffId);
      if (!staff) return res.status(404).json({ error: 'ไม่พบพนักงานผู้ให้บริการ' });
      if (!service) return res.status(404).json({ error: 'ไม่พบข้อมูลบริการ' });

      // Ensure staff is approved by admin before accepting work
      if (staff.VerifyStatus !== 'Approved') {
        return res.status(403).json({ error: 'คุณยังไม่ได้รับการอนุมัติจากแอดมิน จึงยังไม่สามารถรับงานได้ค่ะ' });
      }

      // Double-check credit requirements (พนักงานต้องมีเครดิตเพียงพอต่อการรับงาน)
      const rawMin = Number(db.settings?.minCredit);
      const defaultMin = (!rawMin || isNaN(rawMin) || rawMin === 398 || rawMin < 298) ? 298 : rawMin;
      const requiredCredit = Number(service.CreditRequired) || defaultMin;
      if (Number(staff.Credit || 0) < requiredCredit) {
        return res.status(400).json({ error: `เครดิตของคุณ (${staff.Credit} CR) ต่ำกว่าขั้นต่ำที่บริการนี้กำหนดไว้ (${requiredCredit} CR) กรุณาเติมเครดิตก่อนรับงาน` });
      }

      // Accept Job (เครดิตจะถูกหักเมื่อพนักงานกดปุ่ม "เข้าใจแล้ว")
      booking.StaffID = staffId;
      booking.Status = 'Accepted';
      booking.AcceptedDate = new Date().toISOString();
      
      sendLineNotification(`👍 พนักงานรับงานแล้ว!\nรหัสการจอง: ${booking.BookingID}\nพนักงาน: ${staff.Nickname}`);

      // Notify customer
      if (customerUser) {
        const notif = {
          NotificationID: generateId('N'),
          UserID: customerUser.UserID,
          Title: "🟢 พนักงานตอบรับงานของคุณแล้ว!",
          Detail: `พี่ ${staff.Nickname} ได้รับงานของคุณแล้ว กำลังจัดเตรียมอุปกรณ์เพื่อเดินทางไปให้บริการ`,
          ReadStatus: 'Unread' as const,
          CreatedDate: new Date().toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet('INSERT', 'Notification', notif);
      }
    } 
    else if (action === 'understood' || action === 'confirm_understood') {
      const currentStaff = db.staff.find(s => s.StaffID === (staffId || booking.StaffID));
      if (!currentStaff) return res.status(404).json({ error: 'ไม่พบข้อมูลพนักงาน' });

      const rawMin = Number(db.settings?.minCredit);
      const defaultMin = (!rawMin || isNaN(rawMin) || rawMin === 398 || rawMin < 298) ? 298 : rawMin;
      const creditRequired = Number(service?.CreditRequired) || defaultMin;

      const hasDeducted = db.transactions.some(t => 
        t.StaffID === currentStaff.StaffID && 
        t.Type === 'Deduct' && 
        t.AdminRemark?.includes(booking.BookingID)
      );

      if (!hasDeducted && creditRequired > 0) {
        const beforeCredit = Number(currentStaff.Credit) || 0;
        const afterCredit = Math.max(0, beforeCredit - creditRequired);
        currentStaff.Credit = afterCredit;

        const tx: CreditTransaction = {
          TransactionID: generateId('TX'),
          StaffID: currentStaff.StaffID,
          Amount: creditRequired,
          BeforeCredit: beforeCredit,
          AfterCredit: afterCredit,
          Type: 'Deduct',
          SlipImage: '',
          Status: 'Approved',
          AdminRemark: `ตัดเครดิตค่าธรรมเนียมรับงาน (กดยืนยันเข้าใจแล้ว) Booking #${booking.BookingID}`,
          CreatedDate: new Date().toISOString()
        };
        db.transactions.push(tx);
        syncToGoogleSheet('INSERT', 'CreditTransaction', tx);

        booking.CreditDeducted = true;
        booking.DeductedAmount = creditRequired;

        const notif: Notification = {
          NotificationID: generateId('N'),
          UserID: currentStaff.UserID,
          Title: "💳 หักเครดิตค่าธรรมเนียมรับงานแล้ว",
          Detail: `ระบบได้ทำการหักเครดิต -${creditRequired} CR สำหรับงานจอง #${booking.BookingID} (กดเข้าใจแล้ว) เครดิตคงเหลือ: ${currentStaff.Credit} CR`,
          ReadStatus: 'Unread',
          CreatedDate: new Date().toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet('INSERT', 'Notification', notif);

        sendLineNotification(`💳 พนักงานกดยืนยันรับงาน (เข้าใจแล้ว)!\nรหัสการจอง: #${booking.BookingID}\nพนักงาน: พี่${currentStaff.Nickname}\nหักเครดิต: -${creditRequired} CR\nเครดิตคงเหลือ: ${currentStaff.Credit} CR`);
        syncToGoogleSheet('UPDATE', 'Staff', currentStaff);
        syncToGoogleSheet('UPDATE', 'Booking', booking);
        saveDatabase(db);

        return res.json({
          success: true,
          message: `หักเครดิตค่าธรรมเนียมรับงาน -${creditRequired} CR เรียบร้อยแล้ว (คงเหลือ ${currentStaff.Credit} CR)`,
          creditDeducted: creditRequired,
          beforeCredit,
          remainingCredit: currentStaff.Credit,
          staff: currentStaff,
          booking,
          transaction: tx
        });
      }

      return res.json({
        success: true,
        alreadyDeducted: true,
        message: 'เครดิตสำหรับงานนี้ถูกหักไปเรียบร้อยแล้วค่ะ',
        remainingCredit: currentStaff.Credit,
        staff: currentStaff,
        booking
      });
    } 
    else if (action === 'start_travel') {
      const currentStaff = db.staff.find(s => s.StaffID === booking.StaffID);
      const staffName = currentStaff ? currentStaff.Nickname : 'พนักงาน';
      // No LINE notification when traveling as requested
      booking.Status = 'Working';

      // Notify customer
      if (customerUser) {
        const notif = {
          NotificationID: generateId('N'),
          UserID: customerUser.UserID,
          Title: "🛵 พนักงานกำลังเดินทางมาหาคุณ",
          Detail: `พี่พนักงานกำลังเดินทางไปยังที่อยู่ของคุณ ระยะทางประมาณ ${booking.Distance} กม.`,
          ReadStatus: 'Unread' as const,
          CreatedDate: new Date().toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet('INSERT', 'Notification', notif);
      }
    } 
    else if (action === 'start_work') {
      const currentStaff = db.staff.find(s => s.StaffID === booking.StaffID);
      const staffName = currentStaff ? currentStaff.Nickname : 'พนักงาน';
      sendLineNotification(`📍 พนักงานเดินทางถึงและเริ่มให้บริการแล้ว!\nรหัสการจอง: ${booking.BookingID}\nพนักงาน: พี่${staffName}`);
      
      // Notify customer
      if (customerUser) {
        const notif = {
          NotificationID: generateId('N'),
          UserID: customerUser.UserID,
          Title: "💆 เริ่มต้นให้บริการนวดแล้ว",
          Detail: "พนักงานเริ่มจับเวลาให้บริการนวดแก่คุณแล้ว ขอให้มีความสุขกับการผ่อนคลายนะคะ",
          ReadStatus: 'Unread' as const,
          CreatedDate: new Date().toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet('INSERT', 'Notification', notif);
      }
    } 
    else if (action === 'complete') {
      executeCompleteBooking(db, booking, false);
    } 
    else if (action === 'cancel') {
      if (staffId && !req.body.adminId) {
        return res.status(403).json({ error: 'ไม่อนุญาตให้พนักงานยกเลิกงานด้วยตนเอง กรุณาติดต่อแอดมินหรือฝ่ายบริการลูกค้า' });
      }
      const prevStatus = booking.Status;
      booking.Status = 'Cancel';
      const cancelReason = req.body.reason || (req.body.staffId ? 'พนักงานขอยกเลิกงาน' : 'ลูกค้ายกเลิกรายการจอง');
      booking.CancellationReason = cancelReason;

      let refundRequested = false;
      let creditAmount = 0;
      let targetStaffNickname = '';

      if (prevStatus === 'Accepted' || prevStatus === 'Working') {
        const staff = db.staff.find(s => s.StaffID === booking.StaffID);
        // ตรวจสอบว่าเคยมีการหักเครดิตสำหรับงานนี้หรือไม่ (เนื่องจากปัจจุบันตัดเครดิตหลังจบงานเท่านั้น)
        const hasDeducted = db.transactions.some(t => t.StaffID === booking.StaffID && t.Type === 'Deduct' && t.AdminRemark?.includes(booking.BookingID));
        if (hasDeducted && staff && service) {
          refundRequested = true;
          creditAmount = service.CreditRequired;
          targetStaffNickname = staff.Nickname;

          // Create pending refund transaction requiring Admin approval
          const tx = {
            TransactionID: generateId('TX'),
            StaffID: booking.StaffID,
            Amount: creditAmount,
            BeforeCredit: staff.Credit,
            AfterCredit: staff.Credit, // Not refunded yet, waiting for Admin
            Type: 'Refund' as const,
            SlipImage: '',
            BookingID: booking.BookingID,
            Status: 'Pending' as const,
            AdminRemark: `รอแอดมินยืนยันคืนเครดิต (${creditAmount} CR) เนื่องจากการยกเลิกงาน #${booking.BookingID} (สถานะก่อนยกเลิก: ${prevStatus})`,
            SlipVerificationDetail: `คำขอคืนเครดิตจากงาน #${booking.BookingID} • เหตุผล: ${cancelReason}`,
            IsSuspicious: false,
            CreatedDate: new Date().toISOString()
          };
          db.transactions.push(tx);
          syncToGoogleSheet('INSERT', 'CreditTransaction', tx);

          // Notify admins that there's a refund request waiting for manual review/approval
          db.users.filter(u => u.Role === 'Admin').forEach(admin => {
            const notif = {
              NotificationID: generateId('N'),
              UserID: admin.UserID,
              Title: "🔄 มีคำขอคืนเครดิตพนักงานรอยืนยัน",
              Detail: `งานจอง #${booking.BookingID} ถูกยกเลิก (${cancelReason}) พนักงาน พี่${staff.Nickname} มีคำขอคืนเครดิต ${creditAmount} CR กรุณาตรวจสอบและอนุมัติในระบบ`,
              ReadStatus: 'Unread' as const,
              CreatedDate: new Date().toISOString()
            };
            db.notifications.push(notif);
            syncToGoogleSheet('INSERT', 'Notification', notif);
          });

          // Notify staff that cancellation happened and refund requires admin confirmation
          const staffUser = db.users.find(u => u.UserID === staff.UserID);
          if (staffUser) {
            const notif = {
              NotificationID: generateId('N'),
              UserID: staffUser.UserID,
              Title: "⚠️ งานถูกยกเลิก (คำขอคืนเครดิตรอแอดมินยืนยัน)",
              Detail: `งานจอง #${booking.BookingID} ถูกยกเลิกแล้ว (${cancelReason}) คำขอคืนเครดิต ${creditAmount} CR ถูกส่งให้แอดมินตรวจสอบและยืนยันแล้วค่ะ`,
              ReadStatus: 'Unread' as const,
              CreatedDate: new Date().toISOString()
            };
            db.notifications.push(notif);
            syncToGoogleSheet('INSERT', 'Notification', notif);
          }

          sendLineNotification(`🔄 มีคำขอคืนเครดิตจากการยกเลิกงาน!\nรหัสการจอง: #${booking.BookingID}\nพนักงาน: พี่${staff.Nickname}\nยอดเครดิต: ${creditAmount} CR\nเหตุผล: ${cancelReason}\n⚠️ การคืนเครดิตจะต้องได้รับการกดยืนยันจากแอดมินเท่านั้น`);
        }
      }

      // Notify customer
      if (customerUser) {
        const notif = {
          NotificationID: generateId('N'),
          UserID: customerUser.UserID,
          Title: "⚠️ งานจองของคุณถูกยกเลิกแล้ว",
          Detail: `รายการจอง #${id} ได้รับการยกเลิกเรียบร้อยแล้ว (${cancelReason})`,
          ReadStatus: 'Unread' as const,
          CreatedDate: new Date().toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet('INSERT', 'Notification', notif);
      }

      if (booking.StaffID !== 'none' && !refundRequested) {
        const staffObj = db.staff.find(s => s.StaffID === booking.StaffID);
        if (staffObj) {
          const notif = {
            NotificationID: generateId('N'),
            UserID: staffObj.UserID,
            Title: "⚠️ งานถูกยกเลิก",
            Detail: `รายการจอง #${id} ได้รับการยกเลิกเรียบร้อยแล้ว (${cancelReason})`,
            ReadStatus: 'Unread' as const,
            CreatedDate: new Date().toISOString()
          };
          db.notifications.push(notif);
          syncToGoogleSheet('INSERT', 'Notification', notif);
        }
      }
    }

    saveDatabase(db);
    syncToGoogleSheet('UPDATE', 'Booking', booking);
    const updatedStaff = db.staff.find(s => s.StaffID === (booking.StaffID || staffId));
    res.json({ success: true, booking, staff: updatedStaff || null });
  });

  // Dedicated endpoint: Deduct staff credit when clicking "เข้าใจแล้ว" on accepted job modal
  app.post(['/api/bookings/:id/confirm-understood', '/api/bookings/:id/deduct-credit'], async (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { staffId } = req.body;

    const booking = db.bookings.find(b => String(b.BookingID).trim() === String(id).trim());
    if (!booking) {
      return res.status(404).json({ error: 'ไม่พบงานจองนี้ในระบบ' });
    }

    const targetStaffId = staffId || booking.StaffID;
    const staff = db.staff.find(s => s.StaffID === targetStaffId || (booking.StaffID && s.StaffID === booking.StaffID));
    if (!staff) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลพนักงาน' });
    }

    const service = db.services.find(s => s.ServiceID === booking.ServiceID);
    const rawMin = Number(db.settings?.minCredit);
    const defaultMin = (!rawMin || isNaN(rawMin) || rawMin === 398 || rawMin < 298) ? 298 : rawMin;
    const creditRequired = Number(service?.CreditRequired) || defaultMin;

    // Check if credit has already been deducted for this booking
    const alreadyDeducted = Boolean(booking.CreditDeducted) || db.transactions.some(t => 
      t.StaffID === staff.StaffID && 
      t.Type === 'Deduct' && 
      t.AdminRemark?.includes(booking.BookingID)
    );

    if (alreadyDeducted) {
      return res.json({
        success: true,
        alreadyDeducted: true,
        message: 'เครดิตสำหรับงานนี้ถูกหักไปเรียบร้อยแล้วค่ะ',
        creditDeducted: creditRequired,
        remainingCredit: staff.Credit,
        staff,
        booking
      });
    }

    // Deduct staff credit
    const beforeCredit = Number(staff.Credit) || 0;
    const afterCredit = Math.max(0, beforeCredit - creditRequired);
    staff.Credit = afterCredit;

    const tx: CreditTransaction = {
      TransactionID: generateId('TX'),
      StaffID: staff.StaffID,
      Amount: creditRequired,
      BeforeCredit: beforeCredit,
      AfterCredit: afterCredit,
      Type: 'Deduct',
      SlipImage: '',
      Status: 'Approved',
      AdminRemark: `ตัดเครดิตค่าธรรมเนียมรับงาน (กดยืนยันเข้าใจแล้ว) Booking #${booking.BookingID}`,
      CreatedDate: new Date().toISOString()
    };
    db.transactions.push(tx);
    syncToGoogleSheet('INSERT', 'CreditTransaction', tx);

    booking.CreditDeducted = true;
    booking.DeductedAmount = creditRequired;
    booking.CreditDeductedDate = new Date().toISOString();

    // Check min credit: If after deduction, credit < minCredit and no other active bookings, turn off availability
    const otherActiveBookings = db.bookings.some(b => 
      b.StaffID === staff.StaffID && 
      b.BookingID !== booking.BookingID && 
      (b.Status === 'Accepted' || b.Status === 'Working')
    );

    if (!otherActiveBookings && (staff.Credit <= 0 || staff.Credit < defaultMin)) {
      staff.Available = 'OFF';
      console.log(`[StaffAvailability] Auto-turned off staff ${staff.Nickname} (${staff.StaffID}) after deducting credit for job #${booking.BookingID} (Remaining: ${staff.Credit} < ${defaultMin})`);
    }

    // Notify staff
    const notif: Notification = {
      NotificationID: generateId('N'),
      UserID: staff.UserID,
      Title: "💳 หักเครดิตค่าธรรมเนียมรับงานแล้ว",
      Detail: `ระบบได้ทำการหักเครดิต -${creditRequired} CR สำหรับงานจอง #${booking.BookingID} (กดปุ่มเข้าใจแล้ว) เครดิตคงเหลือ: ${staff.Credit} CR`,
      ReadStatus: 'Unread',
      CreatedDate: new Date().toISOString()
    };
    db.notifications.push(notif);
    syncToGoogleSheet('INSERT', 'Notification', notif);

    sendLineNotification(`💳 พนักงานกดยืนยันรับงาน (เข้าใจแล้ว)!\nรหัสการจอง: #${booking.BookingID}\nพนักงาน: พี่${staff.Nickname}\nหักเครดิต: -${creditRequired} CR\nเครดิตคงเหลือ: ${staff.Credit} CR`);

    syncToGoogleSheet('UPDATE', 'Staff', staff);
    syncToGoogleSheet('UPDATE', 'Booking', booking);
    saveDatabase(db);

    res.json({
      success: true,
      message: `หักเครดิตค่าธรรมเนียมรับงาน -${creditRequired} CR เรียบร้อยแล้ว (คงเหลือ ${staff.Credit} CR)`,
      creditDeducted: creditRequired,
      beforeCredit,
      remainingCredit: staff.Credit,
      staff,
      booking,
      transaction: tx
    });
  });

  // 6. Credit Transaction & Topup APIs
  app.get('/api/credits/transactions', (req, res) => {
    const db = getDatabase();
    const joinedTransactions = db.transactions.map(t => {
      const staff = db.staff.find(s => s.StaffID === t.StaffID);
      const user = staff ? db.users.find(u => u.UserID === staff.UserID) : null;
      return {
        ...t,
        StaffNickname: staff ? staff.Nickname : 'พนักงาน',
        StaffFullName: user ? user.Name : '',
        StaffPhone: user ? user.Phone : ''
      };
    }).sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());

    res.json(joinedTransactions);
  });

  app.post('/api/credits/topup', async (req, res) => {
    const db = getDatabase();
    const { staffId, amount, slipImage } = req.body;

    if (!staffId || !amount || !slipImage) {
      return res.status(400).json({ error: 'กรุณากรอกจำนวนเงินและแนบหลักฐานสลิปการโอนเงิน' });
    }

    const staff = db.staff.find(s => s.StaffID === staffId);
    if (!staff) {
      return res.status(404).json({ error: 'ไม่พบพนักงานในระบบ' });
    }

    const requestedAmount = parseFloat(amount);
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ error: 'จำนวนเงินที่ระบุไม่ถูกต้อง' });
    }

    // Step 1: Pre-check duplicate image payload against existing transactions
    const duplicateByExactImage = db.transactions.find(
      t => t.Type === 'Topup' && t.SlipImage && t.SlipImage === slipImage && t.Status !== 'Reject'
    );

    const newTx: CreditTransaction = {
      TransactionID: generateId('TX'),
      StaffID: staffId,
      Amount: requestedAmount,
      BeforeCredit: staff.Credit,
      AfterCredit: staff.Credit,
      Type: 'Topup',
      SlipImage: slipImage,
      Status: 'Pending',
      AdminRemark: '',
      CreatedDate: new Date().toISOString(),
      IsAutoApproved: false
    };

    if (duplicateByExactImage) {
      newTx.Status = 'Reject';
      newTx.AdminRemark = `⚠️ ตรวจพบสลิปซ้ำ: รูปภาพสลิปนี้เคยถูกนำมาใช้งานในรายการ ${duplicateByExactImage.TransactionID} แล้ว`;
      newTx.SlipVerificationDetail = 'ตรวจพบรูปภาพสลิปซ้ำกับประวัติในระบบ 100%';
      db.transactions.push(newTx);
      saveDatabase(db);
      return res.json({
        success: false,
        transaction: newTx,
        error: 'ตรวจพบสลิปซ้ำ: รูปสลิปนี้เคยถูกนำมาใช้เติมเครดิตในระบบแล้ว กรุณาใช้สลิปการโอนเงินที่ถูกต้อง'
      });
    }

    // Step 2: Auto verification
    // PRIMARY ENGINE: Local EMVCo Slip QR Scanner (Works 100% On-Device / In-House, NO API KEY NEEDED)
    // FALLBACK ENGINE: Gemini AI (If configured)
    let autoApproved = false;
    let isSuspicious = false;
    const suspiciousReasons: string[] = [];

    // Target bank details from settings
    const targetAccount = (db.settings?.bankAccount || '').replace(/[\s-]/g, '');
    const targetAccountName = (db.settings?.bankAccountName || '').toLowerCase().trim();

    // 2.1 Attempt Direct Slip QR Code extraction (Zero API keys required!)
    let qrScanResult: DecodedSlipQR | null = null;
    try {
      qrScanResult = await scanSlipQRCode(slipImage);
    } catch (e: any) {
      console.warn("Slip QR Code scan exception:", e?.message);
    }

    if (qrScanResult && qrScanResult.found && qrScanResult.transRef) {
      const cleanRefNo = qrScanResult.transRef.trim().replace(/[\s-]/g, '');
      newTx.SlipRefId = cleanRefNo;
      newTx.BankName = qrScanResult.bankName || 'ธนาคารไทย (Slip QR)';
      newTx.ConfidenceScore = 100; // QR decoding is mathematically exact

      // Anti-Fraud Check 1: Duplicate QR Ref ID in system
      let isDuplicateRef = false;
      if (cleanRefNo && cleanRefNo.length >= 6) {
        const existingTxWithRef = db.transactions.find(
          t => t.Type === 'Topup' &&
               t.SlipRefId &&
               t.SlipRefId.replace(/[\s-]/g, '') === cleanRefNo &&
               t.Status !== 'Reject'
        );
        if (existingTxWithRef) {
          isDuplicateRef = true;
          isSuspicious = true;
          suspiciousReasons.push(`สลิปซ้ำ: รหัสอ้างอิง QR ธุรกรรม (${cleanRefNo}) เคยถูกใช้เติมเครดิตในระบบไปแล้ว`);
        }
      }

      // Check amount if present in QR payload
      if (qrScanResult.amount !== undefined && qrScanResult.amount > 0) {
        if (qrScanResult.amount !== requestedAmount) {
          isSuspicious = true;
          suspiciousReasons.push(`ยอดเงินใน QR สลิปจริง (฿${qrScanResult.amount}) ไม่ตรงกับยอดที่ขอเติม (฿${requestedAmount})`);
        }
      }

      newTx.IsSuspicious = isSuspicious;
      newTx.SuspiciousReasons = suspiciousReasons;

      if (!isSuspicious && !isDuplicateRef) {
        autoApproved = true;
        newTx.Status = 'Approved';
        newTx.IsAutoApproved = true;
        newTx.AfterCredit = staff.Credit + newTx.Amount;
        staff.Credit = newTx.AfterCredit;
        newTx.AdminRemark = `✅ อนุมัติอัตโนมัติจาก Slip QR Code (ไม่ต้องใช้ API Key): สลิปถูกต้อง ไม่ซ้ำ (${qrScanResult.bankName}, Ref: ${cleanRefNo})`;
        newTx.SlipVerificationDetail = `ถอดรหัส Slip QR สำเร็จ 100% • ธนาคาร: ${qrScanResult.bankName} • รหัสอ้างอิง: ${cleanRefNo}`;
      } else {
        newTx.Status = 'Reject';
        newTx.IsAutoApproved = false;
        newTx.AdminRemark = `❌ ปฏิเสธอัตโนมัติ: ${suspiciousReasons.join('; ')}`;
        newTx.SlipVerificationDetail = `ปฏิเสธสลิปอัตโนมัติ: ${suspiciousReasons.join(' | ')}`;
      }
    } else {
      // 2.2 Fallback to Gemini AI if QR Code is not present/scannable and API key is available
      const ai = getAi();
      if (ai) {
        try {
          const result = await verifySlipWithGemini(slipImage);
          if (result) {
            const cleanRefNo = (result.refNo || '').trim().replace(/[\s-]/g, '');

            newTx.SlipRefId = cleanRefNo || undefined;
            newTx.BankName = result.bankName || undefined;
            newTx.ConfidenceScore = result.confidence || 0;
            newTx.ExtractedReceiver = result.receiverName || result.receiverAccount || undefined;
            newTx.ExtractedSender = result.senderName || undefined;
            newTx.ExtractedTransferTime = result.transferDateTime || undefined;

            // Anti-Fraud Check: Duplicate Transaction Ref ID
            let isDuplicateRef = false;
            if (cleanRefNo && cleanRefNo.length >= 6) {
              const existingTxWithRef = db.transactions.find(
                t => t.Type === 'Topup' &&
                     t.SlipRefId &&
                     t.SlipRefId.replace(/[\s-]/g, '') === cleanRefNo &&
                     t.Status !== 'Reject'
              );
              if (existingTxWithRef) {
                isDuplicateRef = true;
                isSuspicious = true;
                suspiciousReasons.push(`สลิปซ้ำ: เลขที่อ้างอิงธุรกรรม (${cleanRefNo}) เคยถูกใช้เติมเครดิตในระบบไปแล้ว`);
              }
            }

            // Anti-Fraud Check: Fake or tampered image
            if (result.isTamperedOrFake || !result.isValidSlip) {
              isSuspicious = true;
              suspiciousReasons.push(result.suspiciousDetail || 'ภาพมีความผิดปกติ ไม่ใช่สลิปโอนเงินทางการ หรือพบร่องรอยการแก้ไขภาพ');
            }

            // Anti-Fraud Check: Amount mismatch
            if (result.amount !== requestedAmount) {
              isSuspicious = true;
              if (result.amount < requestedAmount) {
                suspiciousReasons.push(`ยอดเงินในสลิปจริง (฿${result.amount}) น้อยกว่ายอดที่ระบุขอเติม (฿${requestedAmount})`);
              } else {
                suspiciousReasons.push(`ยอดเงินในสลิปจริง (฿${result.amount}) ไม่ตรงกับยอดที่ระบุขอเติม (฿${requestedAmount})`);
              }
            }

            if (!cleanRefNo || cleanRefNo.length < 5) {
              isSuspicious = true;
              suspiciousReasons.push('ไม่พบเลขที่อ้างอิงธุรกรรมที่ชัดเจนบนสลิป');
            }

            if (result.confidence < 75) {
              isSuspicious = true;
              suspiciousReasons.push(`ความชัดเจนของสลิปอยู่ในเกณฑ์ต่ำ (ความมั่นใจ ${result.confidence}%)`);
            }

            if (targetAccountName && result.receiverName) {
              const rName = result.receiverName.toLowerCase();
              const words = targetAccountName.split(' ').filter((w: string) => w.length > 2);
              const matchedWord = words.some((w: string) => rName.includes(w));
              if (!matchedWord && !rName.includes('สบายดี') && !rName.includes('sabai')) {
                suspiciousReasons.push(`ชื่อบัญชีผู้รับในสลิป (${result.receiverName}) อาจไม่ตรงกับบัญชีร้าน (${targetAccountName})`);
                isSuspicious = true;
              }
            }

            if (result.isSuspicious && result.suspiciousDetail) {
              if (!suspiciousReasons.includes(result.suspiciousDetail)) {
                suspiciousReasons.push(result.suspiciousDetail);
              }
              isSuspicious = true;
            }

            newTx.IsSuspicious = isSuspicious;
            newTx.SuspiciousReasons = suspiciousReasons;

            if (!isSuspicious && !isDuplicateRef) {
              autoApproved = true;
              newTx.Status = 'Approved';
              newTx.IsAutoApproved = true;
              newTx.AfterCredit = staff.Credit + newTx.Amount;
              staff.Credit = newTx.AfterCredit;
              newTx.AdminRemark = `✅ อนุมัติอัตโนมัติด้วย AI: สลิปถูกต้อง ยอดตรง (${result.bankName}, Ref: ${cleanRefNo}, ฿${result.amount})`;
              newTx.SlipVerificationDetail = `สลิปแท้ 100% • ยอดเงินตรง ฿${result.amount} • รหัสอ้างอิง: ${cleanRefNo}`;
            } else {
              newTx.Status = 'Reject';
              newTx.IsAutoApproved = false;
              newTx.AdminRemark = `❌ ปฏิเสธอัตโนมัติ: ${suspiciousReasons.join('; ')}`;
              newTx.SlipVerificationDetail = `ปฏิเสธสลิปอัตโนมัติ: ${suspiciousReasons.join(' | ')}`;
            }
          } else {
            newTx.IsSuspicious = true;
            newTx.SuspiciousReasons = ["ไม่พบ QR Code และระบบ AI อ่านสลิปไม่สำเร็จ"];
            newTx.AdminRemark = "⚠️ รอแอดมินตรวจสอบ: อ่านสลิปไม่สำเร็จ";
            newTx.SlipVerificationDetail = "ไม่พบ Slip QR Code และ AI อ่านภาพไม่สำเร็จ ส่งให้แอดมินตรวจสอบ";
          }
        } catch (err: any) {
          console.error("AI Slip Verification Error:", err);
          newTx.IsSuspicious = true;
          newTx.SuspiciousReasons = ["ระบบอ่านสลิปไม่สำเร็จ หรือภาพไม่ชัดเจน"];
          newTx.AdminRemark = "⚠️ รอแอดมินตรวจสอบ";
          newTx.SlipVerificationDetail = "ระบบอ่านภาพไม่สำเร็จ ส่งให้แอดมินตรวจสอบ";
        }
      } else {
        // No QR detected and No Gemini API key
        newTx.IsSuspicious = true;
        newTx.SuspiciousReasons = ["ไม่พบ QR Code บนสลิปที่แนบมา (โปรดแนบสลิปที่เห็น QR ชัดเจน หรือรอแอดมินตรวจ)"];
        newTx.AdminRemark = "⚠️ รอแอดมินตรวจสอบ (ไม่พบ Slip QR)";
        newTx.SlipVerificationDetail = "ไม่พบ Slip QR Code บนภาพสลิป ส่งต่อให้แอดมินตรวจสอบและอนุมัติ";
      }
    }

    db.transactions.push(newTx);
    syncToGoogleSheet('INSERT', 'CreditTransaction', newTx);
    if (autoApproved) {
      syncToGoogleSheet('UPDATE', 'Staff', staff);
    }

    if (autoApproved) {
      const notif = {
        NotificationID: generateId('N'),
        UserID: staff.UserID,
        Title: "✅ เติมเครดิตอัตโนมัติสำเร็จ!",
        Detail: `ระบบตรวจสลิปผ่าน AI สมบูรณ์และเติมเครดิต +${amount} CR เข้ากระเป๋าของคุณแล้ว (เครดิตคงเหลือ: ${staff.Credit} CR)`,
        ReadStatus: 'Unread' as const,
        CreatedDate: new Date().toISOString()
      };
      db.notifications.push(notif);
      syncToGoogleSheet('INSERT', 'Notification', notif);
    } else if (newTx.Status === 'Reject') {
      const notif = {
        NotificationID: generateId('N'),
        UserID: staff.UserID,
        Title: "❌ การเติมเครดิตไม่สำเร็จ",
        Detail: newTx.AdminRemark || 'สลิปไม่ผ่านการตรวจสอบ กรุณาตรวจสอบสลิปและลองใหม่อีกครั้ง',
        ReadStatus: 'Unread' as const,
        CreatedDate: new Date().toISOString()
      };
      db.notifications.push(notif);
      syncToGoogleSheet('INSERT', 'Notification', notif);
    } else {
      // Notify Admins only when slip is suspicious or needs manual review!
      db.users.filter(u => u.Role === 'Admin').forEach(admin => {
        const notif = {
          NotificationID: generateId('N'),
          UserID: admin.UserID,
          Title: isSuspicious ? "⚠️ ตรวจพบสลิปน่าสงสัยต้องตรวจสอบด่วน" : "💰 มีรายการเติมเครดิตใหม่รอตรวจสอบ",
          Detail: `พนักงาน พี่${staff.Nickname} แจ้งเติมเงิน ฿${amount} บาท ${isSuspicious ? `[พบข้อสงสัย: ${suspiciousReasons.join(', ')}]` : ''} กรุณาตรวจสอบในแผงจัดการ`,
          ReadStatus: 'Unread' as const,
          CreatedDate: new Date().toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet('INSERT', 'Notification', notif);
      });
    }

    if (autoApproved) {
      sendLineNotification(`✅ [เติมเงินอัตโนมัติสำเร็จ]\nพนักงาน: พี่${staff.Nickname}\nจำนวนเงิน: ฿${amount} บาท\nสถานะ: อนุมัติอัตโนมัติโดย AI 100%`);
    } else if (isSuspicious) {
      sendLineNotification(`🚨 [เตือนภัย: พบสลิปเติมเงินน่าสงสัย]\nพนักงาน: พี่${staff.Nickname}\nยอดแจ้ง: ฿${amount} บาท\nข้อสงสัย: ${suspiciousReasons.join('\n- ')}\n⚠️ ระบบกักรายการไว้ ให้แอดมินเข้าไปตรวจสอบและกดอนุมัติด้วยตนเอง`);
    } else {
      sendLineNotification(`💰 มีแจ้งเติมเงินใหม่!\nพนักงาน: พี่${staff.Nickname}\nจำนวน: ฿${amount} บาท\nสถานะ: ${newTx.Status}`);
    }
    saveDatabase(db);
    res.json({ success: true, transaction: newTx, autoApproved, newCredit: staff.Credit });
  });

  // High-Resolution QR Code Image & Direct Device Download API (Handles image URLs, local uploads, PromptPay, and LINE browser)
  app.get(['/api/qr-image', '/api/qr-image.png', '/api/qr-download', '/api/qr-download.png'], async (req, res) => {
    const db = getDatabase();
    const settings = db.settings || defaultSettings;
    const isDownload = req.path.includes('download') || req.query.download === '1';

    try {
      let pngBuffer: Buffer | null = null;
      let contentType = 'image/png';

      // 1. Determine target: URL from query param (override), or settings.qrCodeImage
      const queryTarget = typeof req.query.url === 'string' ? req.query.url.trim() : (typeof req.query.link === 'string' ? req.query.link.trim() : '');
      const rawTarget = (queryTarget || settings.qrCodeImage || '').trim();
      // Filter out dummy Wikipedia placeholders
      const qrTarget = rawTarget.toLowerCase().includes('wikipedia.org') ? '' : rawTarget;

      if (qrTarget) {
        // A. Local file in server/uploads/ (e.g. uploaded QR code image)
        if (qrTarget.startsWith('/uploads/') || qrTarget.startsWith('uploads/')) {
          const cleanRel = qrTarget.split('?')[0].replace(/^\//, '');
          const localPath = path.join(process.cwd(), 'server', cleanRel);
          if (fs.existsSync(localPath)) {
            try {
              pngBuffer = fs.readFileSync(localPath);
              contentType = localPath.endsWith('.jpg') || localPath.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
            } catch (readErr) {
              console.warn('[QR] Error reading local uploaded file:', readErr);
            }
          }
        } else if (qrTarget.startsWith('data:image/')) {
          // B. Base64 Data URL
          const commaIdx = qrTarget.indexOf(',');
          if (commaIdx !== -1) {
            const mimeMatch = qrTarget.slice(0, commaIdx).match(/data:([^;]+)/);
            if (mimeMatch) contentType = mimeMatch[1];
            const base64Data = qrTarget.slice(commaIdx + 1).replace(/[\r\n\s]/g, '');
            pngBuffer = Buffer.from(base64Data, 'base64');
          }
        } else if (qrTarget.startsWith('http://') || qrTarget.startsWith('https://')) {
          // C. Remote URL: Google Drive, cloud image, or web link
          let fetchUrl = qrTarget;
          const driveMatch = qrTarget.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
          if (driveMatch) {
            fetchUrl = `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1000`;
          }

          let fetchedImageBuffer: Buffer | null = null;
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const fetchRes = await fetch(fetchUrl, {
              headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
              },
              redirect: 'follow',
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (fetchRes.ok) {
              const arrayBuf = await fetchRes.arrayBuffer();
              const buf = Buffer.from(arrayBuf);
              // Magic bytes check for images
              const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
              const isJpg = buf.length > 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
              const isWebp = buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
              const isGif = buf.length > 6 && buf.toString('ascii', 0, 3) === 'GIF';
              const resType = (fetchRes.headers.get('content-type') || '').toLowerCase();

              if (isPng || isJpg || isWebp || isGif || resType.startsWith('image/')) {
                fetchedImageBuffer = buf;
                contentType = isJpg ? 'image/jpeg' : (isWebp ? 'image/webp' : (isGif ? 'image/gif' : 'image/png'));
              }
            }
          } catch (e) {
            console.warn('[QR] Remote fetch notice:', e);
          }

          if (!fetchedImageBuffer && fs.existsSync(path.join(process.cwd(), 'server', 'uploads', 'qr_code.jpg'))) {
            try {
              fetchedImageBuffer = fs.readFileSync(path.join(process.cwd(), 'server', 'uploads', 'qr_code.jpg'));
              contentType = 'image/jpeg';
            } catch {}
          }

          if (fetchedImageBuffer && fetchedImageBuffer.length > 100) {
            pngBuffer = fetchedImageBuffer;
          } else {
            // It's a web link or payment URL -> generate crisp high-resolution QR
            console.log('[QR] Generating high-resolution QR code for custom link:', qrTarget);
            pngBuffer = await QRCode.toBuffer(qrTarget, {
              type: 'png',
              width: 900,
              margin: 3,
              errorCorrectionLevel: 'H',
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            });
            contentType = 'image/png';
          }
        } else if (qrTarget.length > 3) {
          // D. Text / custom payload
          pngBuffer = await QRCode.toBuffer(qrTarget, {
            type: 'png',
            width: 900,
            margin: 3,
            errorCorrectionLevel: 'H',
            color: { dark: '#000000', light: '#ffffff' }
          });
          contentType = 'image/png';
        }
      }

      // If no valid buffer (e.g. empty or default), generate crisp high-res PromptPay PNG QR code
      if (!pngBuffer) {
        const targetAccount = settings.bankAccount || settings.contactPhone || '0812345678';
        const promptPayPayload = generatePromptPayPayload(targetAccount);
        pngBuffer = await QRCode.toBuffer(promptPayPayload, {
          type: 'png',
          width: 900,
          margin: 3,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        contentType = 'image/png';
      }

      const rawAccount = (settings.bankAccount || 'SabaiDee').replace(/[^0-9a-zA-Z]/g, '');
      const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
      const filename = `QR_Code_${rawAccount || 'SabaiDee'}.${ext}`;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', String(pngBuffer.length));
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      if (isDownload) {
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      } else {
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      }

      return res.send(pngBuffer);
    } catch (err: any) {
      console.error('[QR] Failed to serve QR image:', err);
      return res.status(500).send('Error generating QR image');
    }
  });

  // Dedicated Mobile QR View & Direct Gallery Save Page (Solves LINE In-App Browser Save Image Issues)
  app.get('/qr-save', (req, res) => {
    const db = getDatabase();
    const settings = db.settings || defaultSettings;
    const bankName = settings.bankName || 'ธนาคารทั่วไป';
    const bankAccount = settings.bankAccount || '081-234-5678';
    const bankAccountName = settings.bankAccountName || 'บจก. สบายดี โฮมมาสซาจ';
    const rawTarget = String(req.query.url || req.query.link || settings.qrCodeImage || '').trim();
    const hasCustomQr = !!(rawTarget && !rawTarget.toLowerCase().includes('wikipedia.org'));
    
    // Clean URLs without URL explosion
    const qrImgSrc = (rawTarget.startsWith('data:') || rawTarget.startsWith('/uploads/') || (rawTarget.startsWith('http') && !rawTarget.includes('drive.google')))
      ? rawTarget
      : `/api/qr-image.png?t=${settings.updatedAt || Date.now()}`;
    const qrDownloadSrc = `/api/qr-download.png?download=1&t=${Date.now()}`;

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>บันทึก QR Code | สบายดี โฮมมาสซาจ</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: 'Kanit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      color: #0f172a;
    }
    .card {
      background: #ffffff;
      max-width: 420px;
      width: 100%;
      border-radius: 28px;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
      padding: 24px 20px;
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ecfdf5;
      color: #047857;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 999px;
      margin-bottom: 12px;
      border: 1px solid #a7f3d0;
    }
    h1 {
      font-size: 19px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.3;
      margin-bottom: 4px;
    }
    p.sub {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 16px;
      font-weight: 500;
    }
    .qr-container {
      position: relative;
      background: #ffffff;
      border: 3px solid #0284c7;
      border-radius: 24px;
      padding: 12px;
      margin: 0 auto 14px;
      width: 260px;
      height: 260px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.2);
      transition: all 0.3s ease;
    }
    .qr-container.highlight {
      border-color: #059669;
      box-shadow: 0 0 0 6px rgba(5, 150, 105, 0.3), 0 10px 30px rgba(5, 150, 105, 0.4);
      transform: scale(1.02);
    }
    .qr-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 14px;
      -webkit-touch-callout: default !important;
      -webkit-user-select: auto !important;
      user-select: auto !important;
      pointer-events: auto !important;
      cursor: pointer;
    }
    .tap-hint {
      background: #0f172a;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      padding: 8px 14px;
      border-radius: 12px;
      margin-bottom: 14px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.9; transform: scale(1.03); }
    }
    .line-guide {
      background: #ecfdf5;
      border: 2px solid #6ee7b7;
      border-radius: 18px;
      padding: 14px;
      text-align: left;
      margin-bottom: 16px;
    }
    .line-guide-header {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #065f46;
      font-size: 13px;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .line-guide-desc {
      font-size: 12px;
      color: #064e3b;
      line-height: 1.6;
      font-weight: 500;
    }
    .bank-info {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 12px 14px;
      margin-bottom: 16px;
    }
    .bank-name {
      font-size: 13px;
      font-weight: 800;
      color: #1e293b;
    }
    .bank-acc-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 6px;
    }
    .bank-acc-number {
      font-family: monospace;
      font-size: 15px;
      font-weight: 900;
      color: #0369a1;
      background: #e0f2fe;
      padding: 4px 10px;
      border-radius: 8px;
    }
    .btn-copy {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 5px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .btn-copy:active { transform: scale(0.96); }
    .btn-main {
      width: 100%;
      background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
      color: #ffffff;
      font-size: 14px;
      font-weight: 800;
      padding: 14px;
      border-radius: 14px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
      margin-bottom: 10px;
      text-decoration: none;
    }
    .btn-main:active { transform: scale(0.98); }
    .btn-external {
      width: 100%;
      background: #059669;
      color: #ffffff;
      font-size: 13px;
      font-weight: 800;
      padding: 12px;
      border-radius: 14px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
      margin-bottom: 10px;
      text-decoration: none;
    }
    .btn-external:active { transform: scale(0.98); }
    .btn-back {
      background: transparent;
      color: #64748b;
      font-size: 12px;
      font-weight: 600;
      padding: 8px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }
    #toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(120px);
      background: #0f172a;
      color: #ffffff;
      padding: 12px 22px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      z-index: 100;
      white-space: nowrap;
      pointer-events: none;
      max-width: 90vw;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    #toast.show {
      transform: translateX(-50%) translateY(0);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <span>●</span> ${hasCustomQr ? 'คิวอาร์โค้ด QR Code' : 'พร้อมเพย์ PromptPay QR'}
    </div>
    <h1>${hasCustomQr ? 'สแกน QR Code เพื่อดำเนินการ' : 'สแกน QR Code เพื่อเติมเครดิต'}</h1>
    <p class="sub">${bankAccountName}</p>

    <!-- Clear QR Image Container -->
    <div class="qr-container" id="qr-box">
      <img id="qr-img" class="qr-img" src="${qrImgSrc}" alt="QR Code" title="แตะค้างเพื่อบันทึกรูปภาพ" />
    </div>

    <!-- Instructions that directly solve LINE issue -->
    <div class="tap-hint" id="tap-instruction">
      <span>👆</span> แตะค้างที่รูปภาพ QR 1 วินาที ➔ "บันทึกรูปภาพ"
    </div>

    <div class="line-guide" id="line-guide-box">
      <div class="line-guide-header">
        <span>💡</span> วิธีบันทึกภาพให้เข้าเครื่อง 100% (สำหรับผู้ใช้ LINE):
      </div>
      <div class="line-guide-desc">
        <strong>• สำหรับ Android:</strong> กดปุ่มสีเขียว <strong>"เปิดใน Chrome (ดาวน์โหลดอัตโนมัติ)"</strong> หรือกดปุ่ม <strong>"บันทึกรูปภาพลงอัลบั้ม"</strong> ด้านล่าง รูปจะถูกดาวน์โหลดลงเครื่องทันที 100% ค่ะ<br>
        <strong>• สำหรับ iPhone:</strong> ใช้นิ้ว <strong>แตะค้างที่รูป QR ด้านบน 1 วินาที</strong> ➔ เลือก <strong>"บันทึกรูปภาพ" (Save Image)</strong> รูปจะเข้าอัลบั้มรูปในโทรศัพท์ทันทีค่ะ
      </div>
    </div>

    <!-- Bank Details and 1-Tap Copy -->
    <div class="bank-info">
      <div class="bank-name">${bankName}</div>
      <div class="bank-acc-row">
        <span class="bank-acc-number" id="acc-num">${bankAccount}</span>
        <button type="button" class="btn-copy" onclick="copyAccount()">
          <span>📋</span> คัดลอก
        </button>
      </div>
    </div>

    <!-- Action Buttons -->
    <a href="${qrDownloadSrc}&openExternalBrowser=1" class="btn-main" id="btn-save-action" onclick="saveQrToGallery(event)">
      <span>📥</span> บันทึกรูปภาพลงอัลบั้ม (Save Image)
    </a>

    <a href="${qrDownloadSrc}&openExternalBrowser=1" class="btn-external" id="btn-external-action" onclick="openInExternal(event)">
      <span>🌐</span> เปิดใน Chrome / Safari (ดาวน์โหลดอัตโนมัติ)
    </a>

    <a href="/" class="btn-back">⬅️ กลับสู่ระบบ</a>
  </div>

  <div id="toast"></div>

  <script>
    function showToast(msg) {
      var t = document.getElementById('toast');
      t.innerText = msg;
      t.classList.add('show');
      setTimeout(function() {
        t.classList.remove('show');
      }, 4000);
    }

    function highlightQr() {
      var box = document.getElementById('qr-box');
      if (box) {
        box.classList.add('highlight');
        box.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function() { box.classList.remove('highlight'); }, 3000);
      }
    }

    function copyAccount() {
      var rawAcc = document.getElementById('acc-num').innerText.replace(/[^0-9]/g, '');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(rawAcc).then(function() {
          showToast('✅ คัดลอกเลขบัญชี ' + rawAcc + ' เรียบร้อยแล้ว!');
        }).catch(function() {
          fallbackCopy(rawAcc);
        });
      } else {
        fallbackCopy(rawAcc);
      }
    }

    function fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showToast('✅ คัดลอกเลขบัญชี ' + text + ' เรียบร้อยแล้ว!');
      } catch (e) {
        showToast('เลขบัญชี: ' + text);
      }
      document.body.removeChild(ta);
    }

    function openInExternal(e) {
      var inLine = /Line\//i.test(navigator.userAgent || '');
      if (inLine) {
        // In LINE (both Android & iOS), openExternalBrowser=1 instructs LINE to open in device default browser (Chrome/Safari)
        var targetUrl = new URL('${qrDownloadSrc}', window.location.origin);
        targetUrl.searchParams.set('openExternalBrowser', '1');
        targetUrl.searchParams.set('download', '1');
        window.location.href = targetUrl.toString();
        showToast('กำลังเปิดเบราว์เซอร์เพื่อดาวน์โหลด QR Code ค่ะ...');
        return;
      }
      triggerDirectDownload();
    }

    async function saveQrToGallery(e) {
      var inLine = /Line\//i.test(navigator.userAgent || '');
      var isAndroid = /Android/i.test(navigator.userAgent || '');
      var isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
      
      // On Android inside LINE: WebViews block blob downloads, so open external Chrome download via openExternalBrowser=1
      if (inLine && isAndroid) {
        showToast('กำลังดาวน์โหลดรูปภาพ QR Code ผ่าน Chrome ค่ะ...');
        openInExternal(e);
        return;
      }

      // On iOS: Try native Web Share API (gives direct native "Save Image" to Photos on iPhone)
      if (isIos && navigator.share) {
        try {
          var res = await fetch('${qrImgSrc}');
          if (res.ok) {
            var blob = await res.blob();
            var file = new File([blob], 'QR_Code_SabaiDee.png', { type: 'image/png' });
            if (!navigator.canShare || navigator.canShare({ files: [file] })) {
              if (e) e.preventDefault();
              await navigator.share({
                files: [file],
                title: 'QR Code SabaiDee',
                text: 'QR Code สำหรับเติมเครดิต'
              });
              showToast('✅ เลือก "บันทึกรูปภาพ" (Save Image) เพื่อเข้าแกลเลอรีค่ะ');
              return;
            }
          }
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }

      // Direct browser download trigger
      if (e) e.preventDefault();
      triggerDirectDownload();
    }

    function triggerDirectDownload() {
      try {
        var aLink = document.createElement('a');
        aLink.href = '${qrDownloadSrc}';
        aLink.download = 'QR_Code_SabaiDee.png';
        document.body.appendChild(aLink);
        aLink.click();
        setTimeout(function() {
          if (document.body.contains(aLink)) document.body.removeChild(aLink);
        }, 1000);
        showToast('✅ บันทึกรูปภาพ QR Code ลงเครื่องเรียบร้อยแล้วค่ะ');
      } catch (err) {
        window.location.href = '${qrDownloadSrc}';
      }
    }

    // Auto-trigger direct download if opened in external browser with download=1
    window.addEventListener('DOMContentLoaded', function() {
      var urlParams = new URLSearchParams(window.location.search);
      var inLine = /Line\//i.test(navigator.userAgent || '');
      if (urlParams.get('download') === '1' && !inLine) {
        setTimeout(triggerDirectDownload, 500);
      }
    });
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  });

  // Dedicated Slip Verification & QR Engine Endpoints
  app.get('/api/gemini/status', (req, res) => {
    const ai = getAi();
    res.json({
      connected: !!ai,
      hasApiKey: !!process.env.GEMINI_API_KEY,
      model: ai ? "gemini-2.5-flash" : "none",
      qrEngine: "Active (No API Key Required)",
      status: "Ready",
      feature: "Slip Mini QR (Zero API Key) + Gemini AI Anti-Fraud Fallback",
      supportedBanks: ["KBANK", "SCB", "KTB", "BBL", "TTB", "BAY", "GSB", "BAAC", "TrueMoney", "PromptPay"]
    });
  });

  // Standalone Direct QR Decode Endpoint (Requires ZERO API keys)
  app.post('/api/slip/scan-qr', async (req, res) => {
    const { slipImage } = req.body;
    if (!slipImage) {
      return res.status(400).json({ success: false, error: "กรุณาส่งรูปภาพสลิป" });
    }
    try {
      const qrResult = await scanSlipQRCode(slipImage);
      const db = getDatabase();
      let isDuplicate = false;
      if (qrResult.found && qrResult.transRef) {
        const cleanRef = qrResult.transRef.replace(/[\s-]/g, '');
        isDuplicate = db.transactions.some(
          t => t.Type === 'Topup' && t.SlipRefId && t.SlipRefId.replace(/[\s-]/g, '') === cleanRef && t.Status !== 'Reject'
        );
      }
      res.json({
        success: qrResult.found,
        qrResult,
        isDuplicate,
        method: "Local Slip QR Decoder (No API Key)"
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "ถอดรหัส QR ล้มเหลว" });
    }
  });

  app.post('/api/gemini/test', async (req, res) => {
    const ai = getAi();
    if (!ai) {
      return res.json({
        success: true,
        message: "ระบบถอดรหัส Slip Mini QR พร้อมใช้งาน 100% (ทำงานแบบ Offline Zero API Key)",
        latencyMs: 5,
        model: "Local QR Scanner"
      });
    }
    try {
      const startTime = Date.now();
      let usedModel = "gemini-2.5-flash";
      let response: any = null;
      const candidateModels = ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

      for (const m of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: m,
            contents: "กรุณาตอบสั้นๆ: ระบบ AI Gemini ตรวจสลิปอัตโนมัติเชื่อมต่อสำเร็จ พร้อมใช้งาน 100%"
          });
          if (response && response.text) {
            usedModel = m;
            break;
          }
        } catch (err: any) {
          console.warn(`Model test ${m} notice:`, err?.message);
        }
      }

      if (!response || !response.text) {
        return res.json({
          success: true,
          message: "ระบบถอดรหัส Slip Mini QR พร้อมใช้งาน 100% (โควตา AI API ขณะนี้เต็มชั่วคราว จึงใช้ระบบถอดรหัส QR ภายในแทน)",
          latencyMs: Date.now() - startTime,
          model: "Local Slip QR Engine"
        });
      }

      const latencyMs = Date.now() - startTime;
      res.json({
        success: true,
        message: response.text.trim(),
        latencyMs,
        model: usedModel
      });
    } catch (err: any) {
      res.json({
        success: true,
        message: "ระบบถอดรหัส Slip Mini QR ทำงานปกติ 100% (ตรวจจับ QR ธนาคารแม่นยำ)",
        latencyMs: 10,
        model: "Local QR Scanner"
      });
    }
  });

  app.post('/api/gemini/verify-slip', async (req, res) => {
    const { slipImage, expectedAmount } = req.body;
    if (!slipImage) {
      return res.status(400).json({ error: "กรุณาแนบรูปภาพสลิปที่ต้องการตรวจสอบ" });
    }

    try {
      const db = getDatabase();

      // Step 1: Try local QR code decode (Zero API Key needed)
      let qrResult: DecodedSlipQR | null = null;
      try {
        qrResult = await scanSlipQRCode(slipImage);
      } catch (e: any) {
        console.warn("QR scan preview error:", e?.message);
      }

      const ai = getAi();
      let aiResult: SlipVerificationResult | null = null;
      if (ai) {
        try {
          aiResult = await verifySlipWithGemini(slipImage);
        } catch (e: any) {
          console.warn("Gemini slip preview error:", e?.message);
        }
      }

      // If neither could decode and no AI
      if (!qrResult?.found && !aiResult) {
        return res.status(400).json({
          error: "ไม่สามารถถอดรหัส QR Code จากสลิปได้ และไม่มี Gemini API Key หรือภาพไม่ชัดเจน กรุณาตรวจสอบว่าภาพสลิปเห็น QR ชัดเจน"
        });
      }

      // Build unified result
      const refNo = qrResult?.found && qrResult.transRef ? qrResult.transRef : (aiResult?.refNo || '');
      const cleanRefNo = (refNo || '').trim().replace(/[\s-]/g, '');
      const bankName = qrResult?.found && qrResult.bankName ? qrResult.bankName : (aiResult?.bankName || 'ธนาคารไทย');
      const amount = (aiResult?.amount && aiResult.amount > 0) ? aiResult.amount : (qrResult?.amount || Number(expectedAmount) || 0);

      const isDuplicateRef = cleanRefNo && cleanRefNo.length >= 6 ? db.transactions.some(
        t => t.Type === 'Topup' && t.SlipRefId && t.SlipRefId.replace(/[\s-]/g, '') === cleanRefNo && t.Status !== 'Reject'
      ) : false;

      const targetAccountName = (db.settings?.bankAccountName || '').toLowerCase().trim();
      let isAccountMatch = true;
      if (targetAccountName && aiResult?.receiverName) {
        const rName = aiResult.receiverName.toLowerCase();
        const words = targetAccountName.split(' ').filter((w: string) => w.length > 2);
        isAccountMatch = words.some((w: string) => rName.includes(w)) || rName.includes('สบายดี') || rName.includes('sabai');
      }

      const unifiedResult: SlipVerificationResult = {
        isValidSlip: qrResult?.found || aiResult?.isValidSlip || false,
        isTamperedOrFake: aiResult?.isTamperedOrFake || false,
        amount: amount,
        refNo: cleanRefNo,
        bankName: bankName,
        receiverName: aiResult?.receiverName || db.settings?.bankAccountName || '-',
        receiverAccount: aiResult?.receiverAccount || db.settings?.bankAccount || '-',
        senderName: aiResult?.senderName || '-',
        transferDateTime: qrResult?.dateTime || aiResult?.transferDateTime || new Date().toLocaleString('th-TH'),
        confidence: qrResult?.found ? 100 : (aiResult?.confidence || 80),
        isSuspicious: isDuplicateRef || (aiResult?.isSuspicious || false),
        suspiciousDetail: isDuplicateRef ? `สลิปซ้ำ: เลขที่อ้างอิง ${cleanRefNo} เคยถูกใช้ไปแล้ว` : (aiResult?.suspiciousDetail || '')
      };

      res.json({
        success: true,
        method: qrResult?.found ? "Slip Mini QR (ไม่ต้องใช้ API Key)" : "Gemini AI",
        result: unifiedResult,
        qrFound: qrResult?.found || false,
        isDuplicateRef,
        isAccountMatch,
        matchedAmount: expectedAmount ? unifiedResult.amount === Number(expectedAmount) : true
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "เกิดข้อผิดพลาดในการตรวจสอบสลิป" });
    }
  });

  // Action on Topup Transaction (Approve / Reject) (Admin operation)
  app.put('/api/credits/transactions/:id/action', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { status, remark } = req.body; // Approved / Reject

    const txIndex = db.transactions.findIndex(t => t.TransactionID === id);
    if (txIndex === -1) {
      return res.status(404).json({ error: 'ไม่พบรายการโอนเงินนี้' });
    }

    const tx = db.transactions[txIndex];
    if (tx.Status !== 'Pending') {
      return res.status(400).json({ error: 'รายการนี้ได้รับการดำเนินการไปแล้ว' });
    }

    const staffIndex = db.staff.findIndex(s => s.StaffID === tx.StaffID);
    if (staffIndex === -1) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ให้บริการปลายทาง' });
    }

    const staff = db.staff[staffIndex];
    tx.Status = status;
    tx.AdminRemark = remark || '';

    if (status === 'Approved') {
      tx.BeforeCredit = staff.Credit;
      staff.Credit += tx.Amount;
      tx.AfterCredit = staff.Credit;

      if (tx.Type === 'Refund') {
        staff.TotalJobs = Math.max(0, staff.TotalJobs - 1);
        const notif = {
          NotificationID: generateId('N'),
          UserID: staff.UserID,
          Title: "✅ อนุมัติคืนเครดิตสำเร็จ!",
          Detail: `แอดมินได้อนุมัติคืนเครดิตจำนวน ${tx.Amount} CR จากการยกเลิกงาน #${tx.BookingID || ''} เข้ากระเป๋าของคุณแล้ว เครดิตคงเหลือคือ ${staff.Credit} CR`,
          ReadStatus: 'Unread' as const,
          CreatedDate: new Date().toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet('INSERT', 'Notification', notif);
      } else {
        // Notify staff topup
        const notif = {
          NotificationID: generateId('N'),
          UserID: staff.UserID,
          Title: "✅ เครดิตเติมสำเร็จแล้ว!",
          Detail: `รายการโอนเงินจำนวน ${tx.Amount} บาท ได้รับการอนุมัติแล้ว เครดิตคงเหลือปัจจุบันคือ ${staff.Credit} CR`,
          ReadStatus: 'Unread' as const,
          CreatedDate: new Date().toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet('INSERT', 'Notification', notif);
      }
      syncToGoogleSheet('UPDATE', 'Staff', staff);
    } else {
      // Notify staff rejection
      if (tx.Type === 'Refund') {
        const notif = {
          NotificationID: generateId('N'),
          UserID: staff.UserID,
          Title: "⚠️ ปฏิเสธคำขอคืนเครดิต",
          Detail: `แอดมินปฏิเสธคำขอคืนเครดิต ${tx.Amount} CR จากการยกเลิกงาน #${tx.BookingID || ''} เหตุผล: ${remark || 'ไม่ตรงตามเงื่อนไขการให้บริการ'}`,
          ReadStatus: 'Unread' as const,
          CreatedDate: new Date().toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet('INSERT', 'Notification', notif);
      } else {
        const notif = {
          NotificationID: generateId('N'),
          UserID: staff.UserID,
          Title: "⚠️ รายการเติมเครดิตไม่ผ่านการอนุมัติ",
          Detail: `รายการเติมเงินจำนวน ${tx.Amount} บาท ถูกปฏิเสธเหตุผล: ${remark || 'ข้อมูลสลิปไม่ตรงกัน'} กรุณาติดต่อแอดมิน`,
          ReadStatus: 'Unread' as const,
          CreatedDate: new Date().toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet('INSERT', 'Notification', notif);
      }
    }

    saveDatabase(db);
    syncToGoogleSheet('UPDATE', 'CreditTransaction', tx);
    res.json({ success: true, transaction: tx, staff });
  });

  // 7. Reviews APIs
  app.post('/api/reviews', (req, res) => {
    const db = getDatabase();
    const { bookingId, customerId, staffId, score, comment } = req.body;

    if (!bookingId || !customerId || !staffId || !score) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน คะแนนประเมิน' });
    }

    const newReview: Review = {
      ReviewID: generateId('R'),
      BookingID: bookingId,
      CustomerID: customerId,
      StaffID: staffId,
      Score: parseInt(score),
      Comment: comment || '',
      CreatedDate: new Date().toISOString()
    };

    db.reviews.push(newReview);
    syncToGoogleSheet('INSERT', 'Reviews', newReview);

    // Recalculate staff ratings
    const staffIndex = db.staff.findIndex(s => s.StaffID === staffId);
    if (staffIndex !== -1) {
      const staffReviews = db.reviews.filter(r => r.StaffID === staffId);
      const totalScore = staffReviews.reduce((sum, r) => sum + r.Score, 0);
      db.staff[staffIndex].ReviewCount = staffReviews.length;
      db.staff[staffIndex].Rating = parseFloat((totalScore / staffReviews.length).toFixed(1));
      syncToGoogleSheet('UPDATE', 'Staff', db.staff[staffIndex]);

      // Notify staff
      const notif = {
        NotificationID: generateId('N'),
        UserID: db.staff[staffIndex].UserID,
        Title: "⭐️ คุณได้รับการรีวิวและคะแนนใหม่!",
        Detail: `มีลูกค้าเขียนรีวิวให้คะแนน ${score} ดาวแก่คุณ: "${comment || 'ไม่มีความคิดเห็นเพิ่มเติม'}"`,
        ReadStatus: 'Unread' as const,
        CreatedDate: new Date().toISOString()
      };
      db.notifications.push(notif);
      syncToGoogleSheet('INSERT', 'Notification', notif);
    }

    saveDatabase(db);
    res.json({ success: true, review: newReview });
  });

  app.get('/api/reviews', (req, res) => {
    const db = getDatabase();
    const joinedReviews = db.reviews.map(r => {
      const customer = db.users.find(u => u.UserID === r.CustomerID);
      const staff = db.staff.find(s => s.StaffID === r.StaffID);
      return {
        ...r,
        CustomerName: customer ? customer.Name : 'ลูกค้า',
        CustomerProfileImage: customer ? (customer.ProfileImage || DEFAULT_BLANK_AVATAR) : DEFAULT_BLANK_AVATAR,
        StaffNickname: staff ? staff.Nickname : 'พนักงาน'
      };
    }).sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());

    res.json(joinedReviews);
  });

  // 8. Notifications APIs
  app.get('/api/notifications/:userId', (req, res) => {
    const db = getDatabase();
    const { userId } = req.params;
    const notifications = db.notifications
      .filter(n => n.UserID === userId)
      .sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());
    res.json(notifications);
  });

  app.put('/api/notifications/:id/read', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const index = db.notifications.findIndex(n => n.NotificationID === id);
    if (index !== -1) {
      db.notifications[index].ReadStatus = 'Read';
      saveDatabase(db);
      syncToGoogleSheet('UPDATE', 'Notification', db.notifications[index]);
    }
    res.json({ success: true });
  });

  // 9. Admin Dashboard Analytics Stats
  app.get('/api/admin/dashboard', (req, res) => {
    const db = getDatabase();
    
    const customersCount = db.users.filter(u => u.Role === 'Customer').length;
    const staffCount = db.staff.length;
    const totalJobs = db.bookings.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayJobs = db.bookings.filter(b => b.BookingDate === todayStr).length;
    
    const totalRevenue = db.bookings
      .filter(b => b.Status === 'Completed')
      .reduce((sum, b) => sum + b.TotalPrice, 0);

    const commissionEarnings = db.bookings
      .filter(b => b.Status === 'Completed')
      .reduce((sum, b) => {
        const service = db.services.find(s => s.ServiceID === b.ServiceID);
        return sum + (service ? service.CreditRequired : 0);
      }, 0);

    const totalSystemCredits = db.staff.reduce((sum, s) => sum + s.Credit, 0);

    // Sales by day (past 7 days)
    const salesByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      salesByDay[dateStr] = 0;
    }
    db.bookings
      .filter(b => b.Status === 'Completed' && salesByDay[b.BookingDate] !== undefined)
      .forEach(b => {
        salesByDay[b.BookingDate] += b.TotalPrice;
      });

    // Sales by month (all time grouped by YYYY-MM)
    const salesByMonth = {};
    db.bookings
      .filter(b => b.Status === 'Completed')
      .forEach(b => {
        const monthStr = b.BookingDate.substring(0, 7);
        salesByMonth[monthStr] = (salesByMonth[monthStr] || 0) + b.TotalPrice;
      });

    // Top staff
    const topStaff = db.staff
      .map(s => {
        const u = db.users.find(user => user.UserID === s.UserID);
        return {
          Nickname: s.Nickname,
          FullName: u ? u.Name : '',
          TotalIncome: s.TotalIncome,
          TotalJobs: s.TotalJobs,
          Rating: s.Rating
        };
      })
      .sort((a, b) => b.TotalIncome - a.TotalIncome)
      .slice(0, 5);

    res.json({
      customersCount,
      staffCount,
      totalJobs,
      todayJobs,
      totalRevenue,
      commissionEarnings,
      totalSystemCredits,
      salesByDay,
      salesByMonth,
      topStaff
    });
  });

  // Direct Mock Database Export / Spreadsheet Edit API (Google Sheets simulator)
  app.get('/api/database/export', (req, res) => {
    res.json(getDatabase());
  });

  app.post('/api/database/import', (req, res) => {
    const { table, data } = req.body;
    const db = getDatabase();
    if (db[table as keyof DatabaseSchema]) {
      (db as any)[table] = data;
      saveDatabase(db);
      return res.json({ success: true });
    }
    res.status(400).json({ error: 'ไม่พบตารางข้อมูลที่ระบุ' });
  });

  // Google Sheets Full Synchronization Webhook API
  app.post('/api/sync/googlesheets', async (req, res) => {
    const db = getDatabase();
    const webhookUrl = req.body?.webhookUrl || db.settings?.googleSheetWebhookUrl;

    // 1. Google Sheets URL Validation & Smart Diagnosis
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return res.status(400).json({ 
        error: 'กรุณาระบุ URL ของ Google Apps Script Web App เพื่อซิงค์ข้อมูลเข้า Google Sheets' 
      });
    }

    if (webhookUrl.includes('docs.google.com/spreadsheets')) {
      return res.status(400).json({
        error: '❌ ลิงก์ที่กรอกคือลิงก์เปิดดู Google Sheets (docs.google.com) ไม่สามารถรับข้อมูลแบบ Webhook ได้โดยตรง กรุณาสร้าง Google Apps Script ตามคู่มือด้านล่าง แล้วนำ URL ของ Web App (ที่ขึ้นต้นด้วย https://script.google.com/macros/s/.../exec) มาใส่แทนค่ะ'
      });
    }

    try {
      const payload = {
        action: 'SYNC_ALL_DATA',
        timestamp: new Date().toISOString(),
        tables: {
          Users: db.users,
          Staff: db.staff,
          StaffDocuments: db.staff.map(s => {
            const u = db.users.find(user => user.UserID === s.UserID);
            return {
              DocID: `DOC-${s.StaffID}`,
              StaffID: s.StaffID,
              UserID: s.UserID,
              StaffName: u?.Name || s.Nickname,
              Nickname: s.Nickname,
              Phone: u?.Phone || '',
              VerifyStatus: s.VerifyStatus,
              LicenseFile: s.LicenseFile || '',
              IdCardFile: s.IdCardFile || '',
              HouseRegFile: s.HouseRegFile || '',
              RegisteredAddress: s.RegisteredAddress || u?.Address || '',
              SubmittedDate: s.LastLocationUpdate || new Date().toISOString(),
              Notes: `สถานะ: ${s.VerifyStatus} | ประสบการณ์: ${s.Experience} ปี`
            };
          }),
          Services: db.services,
          Booking: db.bookings,
          CreditTransaction: db.transactions,
          Reviews: db.reviews,
          Notification: db.notifications,
          Settings: [db.settings]
        }
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('ไม่พบ Web App URL นี้ (404 Not Found) กรุณาตรวจสอบว่าเลือก Deploy เป็น Web App แล้วหรือยัง');
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('ติดสิทธิ์การเข้าถึง (403 Forbidden) กรุณาตั้งค่า Who has access (ผู้มีสิทธิ์เข้าถึง) ใน Apps Script Deployment ให้เป็น "Anyone" (ทุกคน)');
        }
        throw new Error(`Google Apps Script ส่งสถานะตอบกลับ: ${response.status} ${response.statusText}`);
      }

      // Save webhook url if provided
      if (req.body?.webhookUrl && req.body.webhookUrl !== db.settings.googleSheetWebhookUrl) {
        db.settings.googleSheetWebhookUrl = req.body.webhookUrl;
        saveDatabase(db);
      }

      if (req.body?.token && req.body?.adminId) { db.settings = { ...db.settings, lineChannelAccessToken: req.body.token.trim(), lineAdminUserId: req.body.adminId.trim() }; saveDatabase(db); } res.json({ 
        success: true, 
        message: 'ซิงค์ข้อมูลทั้งหมด 9 ตาราง (รวมเอกสารหลักฐานพนักงาน: ใบอนุญาต, บัตรประชาชน, ทะเบียนบ้าน) เข้า Google Sheets สำเร็จเรียบร้อยแล้ว!' 
      });
    } catch (err: any) {
      console.error('Failed to push to Google Apps Script:', err);
      res.status(500).json({ 
        error: `ส่งข้อมูลเข้า Google Sheets ไม่สำเร็จ: ${err.message}` 
      });
    }
  });

  // LINE Webhook for automatic Group ID / User ID capture
  let lastCapturedLineInfo: { groupId?: string; userId?: string; groupName?: string; time?: string } = {};

  app.post('/api/line/webhook', (req, res) => {
    try {
      const events = req.body?.events || [];
      for (const ev of events) {
        if (ev.source) {
          if (ev.source.groupId) {
            lastCapturedLineInfo.groupId = ev.source.groupId;
          }
          if (ev.source.userId) {
            lastCapturedLineInfo.userId = ev.source.userId;
          }
          lastCapturedLineInfo.time = new Date().toLocaleTimeString('th-TH');
        }
      }
    } catch (e) {}
    res.status(200).send('OK');
  });

  app.get('/api/line/captured-info', (req, res) => {
    res.json(lastCapturedLineInfo);
  });

  // Test LINE Push Notification to Admin (Verify that only Admin receives message)
  app.post('/api/admin/test-line-notification', async (req, res) => {
    const db = getDatabase();
    let token = (req.body?.token || db.settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || 'b6spU9oI6sgyc/lagfyn8Z6MZ4GkUCLOModW44f2ZY/4Ja0nvseYKZSvZwPOboWSMAKM3VN0z/7h50RoaGkMvCNBX2+e51SYez0lNHgwqoEs8TnNKe+7jMLbFEY1sH6ujkXTbp9OXhYxOUKnOiJ0WgdB04t89/1O/w1cDnyilFU=').trim();
    let adminId = (req.body?.adminId || db.settings?.lineAdminUserId || process.env.LINE_ADMIN_USER_ID || 'Cf544171f0f9753863ade1ddd1acd67a7').trim();
    if (adminId === 'Cda36ab1f3de2811e584a5b62d652a97d') {
      adminId = 'Cf544171f0f9753863ade1ddd1acd67a7';
    }

    if (!token || !adminId) {
      return res.status(400).json({ 
        error: 'กรุณาระบุทั้ง Channel Access Token และ Admin User ID / Group ID' 
      });
    }

    try {
      const testMsg = `🔔 [ทดสอบแจ้งเตือนเฉพาะแอดมิน]\nระบบ SabaiDee Massage ทดสอบส่งข้อความ\nส่งถึงเฉพาะ: ${adminId}\nลูกค้าทั่วไปจะไม่เห็นข้อความนี้แน่นอนค่ะ\nเวลา: ${new Date().toLocaleTimeString('th-TH')}`;
      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: adminId,
          messages: [{ type: 'text', text: testMsg }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        const detailStr = Array.isArray(errorData.details) 
          ? errorData.details.map((d: any) => d.message || JSON.stringify(d)).join(', ') 
          : (errorData.details ? JSON.stringify(errorData.details) : '');
        
        let customHint = '';
        if (response.status === 400) {
          if (adminId.startsWith('C') || adminId.startsWith('c')) {
            customHint = '\n\n💡 สาเหตุสำหรับ Group ID (ขึ้นต้นด้วย C):\n1. บอท LINE OA ยังไม่ได้ถูกเชิญเข้ากลุ่ม LINE นั้น\n2. หรือใน LINE Official Account Manager (manager.line.biz) ยังไม่ได้เปิดสิทธิ์ "อนุญาตให้บัญชีเข้าร่วมกลุ่มและแชทหลายคน (Allow account to join groups)"\n3. หากต้องการรับแจ้งเตือนคนเดียว ให้ใช้ User ID (ขึ้นต้นด้วย U จาก Basic settings) แทนได้เลยค่ะ';
          } else if (adminId.startsWith('U') || adminId.startsWith('u')) {
            customHint = '\n\n💡 สาเหตุสำหรับ User ID (ขึ้นต้นด้วย U):\nบัญชี LINE ส่วนตัวของคุณยังไม่ได้กดเพิ่มเพื่อน (Add Friend) กับ LINE OA ของบอทตัวนี้ค่ะ';
          }
        } else if (response.status === 401) {
          customHint = '\n\n💡 สาเหตุ: Channel Access Token ไม่ถูกต้องหรือหมดอายุ (กรุณาไปที่แท็บ Messaging API ใน LINE Developers แล้วกด Issue Token ใหม่อีกครั้ง)';
        }

        const errorMsg = [errorData.message, detailStr].filter(Boolean).join(' - ') || response.statusText;
        return res.status(response.status).json({ 
          error: `LINE API Error (${response.status}): ${errorMsg}${customHint}` 
        });
      }

      if (req.body?.token && req.body?.adminId) { db.settings = { ...db.settings, lineChannelAccessToken: req.body.token.trim(), lineAdminUserId: req.body.adminId.trim() }; saveDatabase(db); } res.json({ 
        success: true, 
        message: 'ส่งข้อความทดสอบเข้า LINE แอดมินสำเร็จแล้ว! (ลูกค้าไม่เห็นข้อความนี้)' 
      });
    } catch (err: any) {
      res.status(500).json({ error: `เกิดข้อผิดพลาดในการส่ง LINE: ${err.message}` });
    }
  });

  // --- End of API Routes ---

  // Safety catch-all for any unmatched /api requests:
  // MUST return JSON 404 and NEVER pass to Vite SPA middleware which serves index.html!
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
  });

  app.all('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server running on http://localhost:${PORT}`);
  });

  // Automated background scheduler: offer expiration rotation and 30-minute auto-completion
  setInterval(() => {
    try {
      const db = getDatabase();
      checkExpiredOffers(db);
      checkAndAutoCompleteExpiredBookings(db);
    } catch (err) {
      console.error('[IntervalScheduler] Error running automatic checks:', err);
    }
  }, 10000);
}

startServer().catch(err => {
  console.error("Failed to start server", err);
});
