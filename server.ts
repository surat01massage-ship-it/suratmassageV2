import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { getDatabase, saveDatabase, DatabaseSchema } from './server/db';
import { User, Staff, Service, Booking, CreditTransaction, Review, Notification, AppSettings } from './src/types';

// Simple unique ID generator
const generateId = (prefix: string): string => {
  return `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
};

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
  return aiClient;
}

// LINE Messaging API helper (Sends ONLY to specified Admin User ID or Admin Group ID - NEVER broadcasted to customers)
async function sendLineNotification(message: string) {
  try {
    const db = getDatabase();
    const dbToken = (db.settings?.lineChannelAccessToken || '').trim(); const envToken = (process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim(); const token = dbToken ? dbToken : envToken;
    const dbAdminId = (db.settings?.lineAdminUserId || '').trim(); const envAdminId = (process.env.LINE_ADMIN_USER_ID || '').trim(); const adminId = dbAdminId ? dbAdminId : envAdminId;
    
    if (!token || !adminId) {
      return;
    }
    
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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
    if (!webhookUrl || !webhookUrl.startsWith('http')) return;
    
    // Non-blocking asynchronous sync to Google Sheets
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      body: JSON.stringify({
        action,
        table,
        data,
        timestamp: new Date().toISOString()
      })
    }).then(res => {
      if (!res.ok) {
        console.warn(`[GoogleSheetSync] ${table} (${action}) responded with status ${res.status}`);
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
      ProfileImage: req.body.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60',
      Role: role,
      Status: 'Active',
      CreatedDate: new Date().toISOString()
    };

    db.users.push(newUser);
    syncToGoogleSheet('INSERT', 'Users', newUser);

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
        Credit: 398, // เครดิตเริ่มต้น 398 เครดิตสำหรับพนักงานใหม่เพื่อรับงานฟรีได้ 1 ครั้ง
        Available: 'ON', // Auto online so staff is immediately visible
        VerifyStatus: 'Approved', // Auto-approved for instant visibility
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
      db.staff.push(newStaff);
      syncToGoogleSheet('INSERT', 'Staff', newStaff);

      // Add welcome bonus credit transaction (398 credits = 1 free job)
      const welcomeTx = {
        TransactionID: generateId('TX'),
        StaffID: newStaffID,
        Amount: 398,
        BeforeCredit: 0,
        AfterCredit: 398,
        Type: 'Topup' as const,
        SlipImage: '',
        Status: 'Approved' as const,
        AdminRemark: '🎁 โบนัสต้อนรับพนักงานใหม่ 398 เครดิต (รับงานฟรี 1 ครั้ง)',
        CreatedDate: new Date().toISOString()
      };
      db.transactions.push(welcomeTx);
      syncToGoogleSheet('INSERT', 'CreditTransaction', welcomeTx);

      // Welcome Notification to Staff
      const staffWelcomeNotif = {
        NotificationID: generateId('N'),
        UserID: newUserID,
        Title: '🎁 ยินดีต้อนรับ! คุณได้รับ 398 เครดิตฟรี',
        Detail: 'ยินดีต้อนรับสู่ SabaiDee Massage! คุณได้รับเครดิตฟรี 398 เครดิต สามารถใช้รับงานลูกค้าฟรีได้ 1 ครั้งทันทีค่ะ',
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
          Title: "มีผู้สมัครเป็นพนักงานใหม่",
          Detail: `พนักงานนวดคนใหม่ คุณ ${name} (ชื่อเล่น ${newStaff.Nickname}) ได้สมัครสมาชิกเข้ามา พร้อมรับเครดิตฟรี 398 CR`,
          ReadStatus: 'Unread' as const,
          CreatedDate: new Date().toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet('INSERT', 'Notification', notif);
      });
    }

    if (role === 'Staff') {
      sendLineNotification(`🎉 มีพนักงานใหม่สมัครใช้งาน!\nชื่อ: ${name}\nเบอร์โทร: ${phone}\n(รอการอนุมัติ)`);
    } else {
      sendLineNotification(`🎉 มีลูกค้าใหม่สมัครใช้งาน!\nชื่อ: ${name}\nเบอร์โทร: ${phone}`);
    }

    saveDatabase(db);
    res.json({ success: true, user: newUser });
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
            Credit: 398,
            Available: 'OFF',
            VerifyStatus: 'Pending',
            CurrentLatitude: user.Latitude,
            CurrentLongitude: user.Longitude,
            LastLocationUpdate: new Date().toISOString(),
            TotalIncome: 0,
            TotalJobs: 0,
            OfferedServices: db.services.map(s => s.ServiceID),
            MaxJobDistance: db.settings.searchRadius || 25
          };
          db.staff.push(staff);
          syncToGoogleSheet('INSERT', 'Staff', staff);

          const welcomeTx = {
            TransactionID: generateId('TX'),
            StaffID: newStaffID,
            Amount: 398,
            BeforeCredit: 0,
            AfterCredit: 398,
            Type: 'Topup' as const,
            SlipImage: '',
            Status: 'Approved' as const,
            AdminRemark: '🎁 โบนัสต้อนรับพนักงานใหม่ 398 เครดิต (รับงานฟรี 1 ครั้ง)',
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

  // Delete User API
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

    // Delete user from db.users
    db.users.splice(uIndex, 1);

    // If staff, remove staff profile as well
    const sIndex = db.staff.findIndex(s => s.UserID === id);
    if (sIndex !== -1) {
      const deletedStaff = db.staff[sIndex];
      db.staff.splice(sIndex, 1);
      syncToGoogleSheet('DELETE', 'Staff', { StaffID: deletedStaff.StaffID, UserID: id });
    }

    // Remove user notifications
    db.notifications = db.notifications.filter(n => n.UserID !== id);

    saveDatabase(db);
    syncToGoogleSheet('DELETE', 'Users', { UserID: id, Name: userToDelete.Name });

    res.json({ success: true, message: `ลบผู้ใช้งาน "${userToDelete.Name}" เรียบร้อยแล้ว` });
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
    res.json(db.settings);
  });

  app.put('/api/settings', (req, res) => {
    const db = getDatabase();
    db.settings = { ...db.settings, ...req.body };
    saveDatabase(db);
    syncToGoogleSheet('UPDATE', 'Settings', db.settings);
    res.json({ success: true, settings: db.settings });
  });

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
      registeredAddress, offeredServices, maxJobDistance, verifyStatus, available, status
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
      updatedUser = user;
    }

    saveDatabase(db);
    syncToGoogleSheet('UPDATE', 'Staff', staff);
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
    const { staffId, available } = req.body;

    const index = db.staff.findIndex(s => s.StaffID === staffId);
    if (index === -1) {
      return res.status(404).json({ error: 'ไม่พบพนักงานในระบบ' });
    }

    if (available === 'ON') {
      const minCredit = db.settings?.minCredit || 398;
      if (db.staff[index].Credit < minCredit) {
        return res.status(400).json({ error: `เครดิตไม่พอรับงาน (ขั้นต่ำ ${minCredit} CR)` });
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

    // Send notification to staff user
    const staff = db.staff[index];
    const notif = {
      NotificationID: generateId('N'),
      UserID: staff.UserID,
      Title: status === 'Approved' ? "🎉 บัญชีผู้ใช้ของคุณได้รับอนุมัติแล้ว!" : "⚠️ บัญชีผู้ใช้ไม่ได้รับการอนุมัติ",
      Detail: status === 'Approved' 
        ? "ขณะนี้คุณสามารถเปิดสถานะออนไลน์เพื่อเริ่มรับงานจากลูกค้าได้แล้วค่ะ" 
        : "กรุณาแก้ไขเอกสารข้อมูลหรือรูปโปรไฟล์ของคุณ หรือติดต่อฝ่ายบริการลูกค้าเพื่อสอบถามเพิ่มเติม",
      ReadStatus: 'Unread' as const,
      CreatedDate: new Date().toISOString()
    };
    db.notifications.push(notif);

    saveDatabase(db);
    syncToGoogleSheet('UPDATE', 'Staff', db.staff[index]);
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
    const { customerId, serviceId, customerAddress, customerLatitude, customerLongitude, preferredStaffId } = req.body;

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
          s.VerifyStatus !== 'Reject' &&
          s.Credit >= (settings.minCredit || 398) &&
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
      CustomerAddress: customerAddress || customerUser.Address,
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
    // Run automated offer rotation before returning
    checkExpiredOffers(db);
    
    // Rich payload joining Customer, Staff, and Service info
    const joinedBookings = db.bookings.map(b => {
      const customer = db.users.find(u => u.UserID === b.CustomerID);
      const staff = db.staff.find(s => s.StaffID === b.StaffID);
      const staffUser = staff ? db.users.find(u => u.UserID === staff.UserID) : null;
      const service = db.services.find(s => s.ServiceID === b.ServiceID);
      const review = db.reviews.find(r => r.BookingID === b.BookingID);

      return {
        ...b,
        CustomerName: customer ? customer.Name : 'ลูกค้า',
        CustomerPhone: customer ? customer.Phone : '',
        CustomerProfileImage: customer ? customer.ProfileImage : '',
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
    const updated = checkExpiredOffers(db);
    res.json({ success: true, updated });
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

      // Double-check credit requirements
      if (staff.Credit < service.CreditRequired) {
        return res.status(400).json({ error: `เครดิตของคุณ (${staff.Credit} CR) ต่ำกว่าขั้นต่ำที่บริการนี้กำหนดไว้ (${service.CreditRequired} CR) กรุณาเติมเครดิตก่อนรับงาน` });
      }

      // Accept Job
      booking.StaffID = staffId;
      booking.Status = 'Accepted';
      
      // Deduct credit immediately on acceptance
      staff.Credit -= service.CreditRequired;
      staff.TotalJobs += 1;
      
      sendLineNotification(`👍 พนักงานรับงานแล้ว!\nรหัสการจอง: ${booking.BookingID}\nพนักงาน: ${staff.Nickname}`);

      // Add Credit Transaction entry
      const tx = {
        TransactionID: generateId('TX'),
        StaffID: staffId,
        Amount: service.CreditRequired,
        BeforeCredit: staff.Credit + service.CreditRequired,
        AfterCredit: staff.Credit,
        Type: 'Deduct' as const,
        SlipImage: '',
        Status: 'Approved' as const,
        AdminRemark: `หักค่าคอมมิชชันล่วงหน้าสำหรับ Booking #${id}`,
        CreatedDate: new Date().toISOString()
      };
      db.transactions.push(tx);
      syncToGoogleSheet('INSERT', 'CreditTransaction', tx);
      syncToGoogleSheet('UPDATE', 'Staff', staff);

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
      const currentStaff = db.staff.find(s => s.StaffID === booking.StaffID);
      const staffName = currentStaff ? currentStaff.Nickname : 'พนักงาน';
      sendLineNotification(`✅ งานเสร็จสิ้นแล้ว!\nรหัสการจอง: ${booking.BookingID}\nพนักงาน: พี่${staffName}\nยอดรวม: ${booking.ServicePrice + booking.TravelFee} บาท`);
      booking.Status = 'Completed';
      booking.PaymentStatus = 'Paid';

      // Distribute income to staff
      const staff = db.staff.find(s => s.StaffID === booking.StaffID);
      const service = db.services.find(s => s.ServiceID === booking.ServiceID);
      if (staff) {
        const creditRequired = service ? service.CreditRequired : 0;
        const staffEarning = Math.max(0, booking.ServicePrice - creditRequired) + booking.TravelFee;
        staff.TotalIncome += staffEarning;

        // Ensure credit was deducted for this booking if it was somehow missed earlier
        const hasDeducted = db.transactions.some(t => t.StaffID === staff.StaffID && t.Type === 'Deduct' && t.AdminRemark?.includes(booking.BookingID));
        if (!hasDeducted && creditRequired > 0) {
          staff.Credit = Math.max(0, staff.Credit - creditRequired);
          staff.TotalJobs = Math.max(1, (staff.TotalJobs || 0) + 1);
          const tx = {
            TransactionID: generateId('TX'),
            StaffID: staff.StaffID,
            Amount: creditRequired,
            BeforeCredit: staff.Credit + creditRequired,
            AfterCredit: staff.Credit,
            Type: 'Deduct' as const,
            SlipImage: '',
            Status: 'Approved' as const,
            AdminRemark: `หักค่าคอมมิชชันล่วงหน้าสำหรับ Booking #${booking.BookingID}`,
            CreatedDate: new Date().toISOString()
          };
          db.transactions.push(tx);
          syncToGoogleSheet('INSERT', 'CreditTransaction', tx);
        } else {
          staff.TotalJobs = Math.max(1, (staff.TotalJobs || 0));
        }

        syncToGoogleSheet('UPDATE', 'Staff', staff);
      }

      // Notify customer
      if (customerUser) {
        const notif = {
          NotificationID: generateId('N'),
          UserID: customerUser.UserID,
          Title: "✅ การให้บริการเสร็จสิ้นแล้ว",
          Detail: "ขอบคุณที่ใช้บริการ SabaiDee Massage ค่ะ กรุณาให้คะแนนรีวิวเพื่อเป็นกำลังใจและพัฒนาคุณภาพต่อไป",
          ReadStatus: 'Unread' as const,
          CreatedDate: new Date().toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet('INSERT', 'Notification', notif);
      }
    } 
    else if (action === 'cancel') {
      const prevStatus = booking.Status;
      booking.Status = 'Cancel';
      const cancelReason = req.body.reason || (req.body.staffId ? 'พนักงานขอยกเลิกงาน' : 'ลูกค้ายกเลิกรายการจอง');
      booking.CancellationReason = cancelReason;

      // When booking was already accepted/working, staff was already charged credit.
      // Do NOT refund automatically! Require admin verification and approval.
      let refundRequested = false;
      let creditAmount = 0;
      let targetStaffNickname = '';

      if (prevStatus === 'Accepted' || prevStatus === 'Working') {
        const staff = db.staff.find(s => s.StaffID === booking.StaffID);
        if (staff && service) {
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

    // Step 2: Auto verification using Gemini 3.8 Flash (Multi-layered Anti-Fraud Verification)
    let autoApproved = false;
    let isSuspicious = false;
    const suspiciousReasons: string[] = [];
    const ai = getAi();

    // Target bank details from settings
    const targetAccount = (db.settings?.bankAccount || '').replace(/[\s-]/g, '');
    const targetAccountName = (db.settings?.bankAccountName || '').toLowerCase().trim();

    if (ai) {
      try {
        const match = slipImage.match(/^data:(image\/[a-zA-Z0-9+.-]*);base64,(.*)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];

          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
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
          });

          const text = response.text;
          if (text) {
            const result = JSON.parse(text);
            const cleanRefNo = (result.refNo || '').trim().replace(/[\s-]/g, '');

            newTx.SlipRefId = cleanRefNo || undefined;
            newTx.BankName = result.bankName || undefined;
            newTx.ConfidenceScore = result.confidence || 0;
            newTx.ExtractedReceiver = result.receiverName || result.receiverAccount || undefined;
            newTx.ExtractedSender = result.senderName || undefined;
            newTx.ExtractedTransferTime = result.transferDateTime || undefined;

            // Anti-Fraud Check 1: Duplicate Transaction Ref ID across system
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

            // Anti-Fraud Check 2: Fake or tampered image
            if (result.isTamperedOrFake || !result.isValidSlip) {
              isSuspicious = true;
              suspiciousReasons.push(result.suspiciousDetail || 'ภาพมีความผิดปกติ ไม่ใช่สลิปโอนเงินทางการ หรือพบร่องรอยการแก้ไขภาพ');
            }

            // Anti-Fraud Check 3: Amount mismatch
            if (result.amount !== requestedAmount) {
              isSuspicious = true;
              if (result.amount < requestedAmount) {
                suspiciousReasons.push(`ยอดเงินในสลิปจริง (฿${result.amount}) น้อยกว่ายอดที่ระบุขอเติม (฿${requestedAmount})`);
              } else {
                suspiciousReasons.push(`ยอดเงินในสลิปจริง (฿${result.amount}) ไม่ตรงกับยอดที่ระบุขอเติม (฿${requestedAmount})`);
              }
            }

            // Anti-Fraud Check 4: Missing or invalid reference number
            if (!cleanRefNo || cleanRefNo.length < 5) {
              isSuspicious = true;
              suspiciousReasons.push('ไม่พบเลขที่อ้างอิงธุรกรรมที่ชัดเจนบนสลิป');
            }

            // Anti-Fraud Check 5: Low confidence score
            if (result.confidence < 75) {
              isSuspicious = true;
              suspiciousReasons.push(`ความชัดเจนของสลิปอยู่ในเกณฑ์ต่ำ (ความมั่นใจ ${result.confidence}%)`);
            }

            // Anti-Fraud Check 6: Receiver check (if target account info is configured)
            if (targetAccountName && result.receiverName) {
              const rName = result.receiverName.toLowerCase();
              const words = targetAccountName.split(' ').filter((w: string) => w.length > 2);
              const matchedWord = words.some((w: string) => rName.includes(w));
              if (!matchedWord && !rName.includes('สบายดี') && !rName.includes('sabai')) {
                // If receiver looks entirely different, flag as suspicious for review
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

            // Decision Engine (Fully Automated):
            // 1. IF completely clean & legitimate -> AUTO-APPROVE IMMEDIATELY
            // 2. IF ANY suspicion (fake, duplicate, mismatch) -> AUTO-REJECT IMMEDIATELY (No manual admin review needed)
            if (!isSuspicious && !isDuplicateRef) {
              autoApproved = true;
              newTx.Status = 'Approved';
              newTx.IsAutoApproved = true;
              newTx.AfterCredit = staff.Credit + newTx.Amount;
              staff.Credit = newTx.AfterCredit;
              newTx.AdminRemark = `✅ อนุมัติอัตโนมัติ 100%: สลิปถูกต้อง ยอดตรง บัญชีตรง (${result.bankName}, Ref: ${cleanRefNo}, ฿${result.amount})`;
              newTx.SlipVerificationDetail = `สลิปแท้ 100% • ยอดเงินตรง ฿${result.amount} • รหัสอ้างอิง: ${cleanRefNo} • บัญชี: ${result.receiverName || 'ตรงตามระบบ'}`;
            } else {
              newTx.Status = 'Reject';
              newTx.IsAutoApproved = false;
              newTx.AdminRemark = `❌ ปฏิเสธอัตโนมัติ: ${suspiciousReasons.join('; ')}`;
              newTx.SlipVerificationDetail = `ปฏิเสธสลิปอัตโนมัติ: ${suspiciousReasons.join(' | ')}`;
            }
          }
        }
      } catch (err: any) {
        console.error("AI Slip Verification Error:", err);
        newTx.IsSuspicious = true;
        newTx.SuspiciousReasons = ["ระบบ AI ไม่สามารถอ่านสลิปได้ชัดเจน หรือบริการ AI ขัดข้องชั่วคราว"];
        newTx.AdminRemark = "⚠️ รอแอดมินตรวจสอบ: ระบบอัตโนมัติอ่านสลิปไม่สำเร็จ ส่งให้แอดมินตรวจสอบแทน";
        newTx.SlipVerificationDetail = "ระบบอ่านภาพไม่สำเร็จ จำเป็นต้องใช้แอดมินตรวจสอบด้วยตนเอง";
      }
    } else {
      // No Gemini API configured - must fall back to Admin review
      newTx.IsSuspicious = true;
      newTx.SuspiciousReasons = ["ยังไม่ได้เชื่อมต่อ Gemini API เพื่อตรวจสลิปอัตโนมัติ"];
      newTx.AdminRemark = "⚠️ รอแอดมินตรวจสอบ (ไม่มีคีย์ตรวจอัตโนมัติ)";
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
        CustomerProfileImage: customer ? customer.ProfileImage : '',
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
        message: 'ซิงค์ข้อมูลทั้งหมด 8 ตารางเข้า Google Sheets สำเร็จเรียบร้อยแล้ว!' 
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
    const token = (req.body?.token || process.env.LINE_CHANNEL_ACCESS_TOKEN || db.settings?.lineChannelAccessToken || '').trim();
    const adminId = (req.body?.adminId || process.env.LINE_ADMIN_USER_ID || db.settings?.lineAdminUserId || '').trim();

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
}

startServer().catch(err => {
  console.error("Failed to start server", err);
});
