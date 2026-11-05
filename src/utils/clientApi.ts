/**
 * SabaiDee Massage Client-side API Mock Engine
 * Ensures 100% stable operation on GitHub Pages and static deployments without throwing "Failed to fetch"
 */
import { initialServices, initialUsers, initialStaff, initialTransactions } from '../data/initialData';
import { User, Staff, Service, CreditTransaction, Booking, AppSettings } from '../types';

export const ADMIN_CHANG: User = {
  UserID: "U001",
  Name: "ช้าง",
  Phone: "2511",
  PasswordHash: "2511",
  Email: "chang@sabaidee.com",
  Address: "สุราษฎร์ธานี",
  Province: "สุราษฎร์ธานี",
  District: "เมืองสุราษฎร์ธานี",
  SubDistrict: "ตลาด",
  Latitude: 9.138244,
  Longitude: 99.321748,
  ProfileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  Role: "Admin",
  Status: "Active",
  CreatedDate: "2026-01-01T00:00:00.000Z"
};

export const defaultSettings: AppSettings = {
  companyName: "SabaiDee Massage",
  logo: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=120&auto=format&fit=crop&q=60",
  themeColor: "#10b981",
  travelFeePerKm: 15,
  travelFeeTiers: [
    { minKm: 0, maxKm: 3, fee: 0 },
    { minKm: 3, maxKm: 10, fee: 150 },
    { minKm: 10, maxKm: 15, fee: 200 }
  ],
  commissionRate: 15,
  minCredit: 200,
  searchRadius: 15,
  systemOpen: 'ON',
  contactPhone: "081-234-5678",
  lineOA: "@sabaideemassage",
  facebook: "SabaiDee Home Massage",
  businessHours: "09:00 - 22:00",
  bannerText: "✨ โปรโมชั่นพิเศษ! ลดค่าเดินทาง 50% สำหรับการจองครั้งแรก ✨",
  promotionText: "จองนวดอโรมาวันนี้ รับสิทธิ์นวดคอบ่าไหล่ฟรี 15 นาที!",
  couponCode: "SABAIDEE99",
  couponDiscount: 50,
  bankName: "ธนาคารทหารไทยธนชาต (ttb)",
  bankAccount: "761-7-99745-2",
  bankAccountName: "นางเครือวัลย์ ชายแก้ว",
  qrCodeImage: "https://i.postimg.cc/g0yvnLTn/S-30990363.jpg",
  lineChannelAccessToken: "b6spU9oI6sgyc/lagfyn8Z6MZ4GkUCLOModW44f2ZY/4Ja0nvseYKZSvZwPOboWSMAKM3VN0z/7h50RoaGkMvCNBX2+e51SYez0lNHgwqoEs8TnNKe+7jMLbFEY1sH6ujkXTbp9OXhYxOUKnOiJ0WgdB04t89/1O/w1cDnyilFU=",
  lineAdminUserId: "Cf544171f0f9753863ade1ddd1acd67a7",
  enableLineAdminNotify: true,
  autoCompleteMinutes: 30,
  googleSheetWebhookUrl: "https://script.google.com/macros/s/AKfycbwb1ovZB-WfYeUirZj3xuDIb_SA6LbJxLctNNySPr1sTCMwR_aig1gyECzAtE0ACue4CA/exec"
};

function cleanPersistedUsers(users: User[]): User[] {
  // Purge old mock users (สมชาย ยิ่งดี, พี่สมศรี, คุณสมชาย)
  const filtered = users.filter(u => 
    u.UserID !== "U002" && 
    u.UserID !== "U003" && 
    u.Phone !== "0812345678" && 
    u.Phone !== "0891234567" && 
    u.Phone !== "0823456789"
  );
  const hasChang = filtered.some(u => u.Phone === "2511" || u.Name === "ช้าง");
  if (!hasChang) {
    return [ADMIN_CHANG, ...filtered.filter(u => u.UserID !== "U001")];
  }
  return filtered.map(u => (u.Phone === "2511" || u.Name === "ช้าง") ? { ...ADMIN_CHANG, ...u, Role: 'Admin', Status: 'Active' } : u);
}

function cleanPersistedStaff(staffList: Staff[]): Staff[] {
  // Purge old mock staff SFT001
  return staffList.filter(s => s.StaffID !== "SFT001" && s.UserID !== "U002");
}

function getStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(fallback)) {
        if (Array.isArray(parsed)) {
          if (key === 'sabaidee_persisted_users') {
            return cleanPersistedUsers(parsed as unknown as User[]) as unknown as T;
          }
          if (key === 'sabaidee_persisted_staff') {
            return cleanPersistedStaff(parsed as unknown as Staff[]) as unknown as T;
          }
          return parsed as unknown as T;
        }
      } else if (parsed && typeof parsed === 'object') {
        if (key === 'sabaidee_persisted_settings') {
          return { ...defaultSettings, ...parsed } as T;
        }
        return parsed as T;
      }
    }
  } catch {}
  if (key === 'sabaidee_persisted_users') {
    return cleanPersistedUsers([...initialUsers]) as unknown as T;
  }
  if (key === 'sabaidee_persisted_staff') {
    return cleanPersistedStaff([...initialStaff]) as unknown as T;
  }
  return fallback;
}

function setStorage(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`localStorage set error for ${key}:`, e);
  }
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    statusText: status === 200 || status === 201 ? 'OK' : 'Error',
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function handleClientApiRequest(url: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const path = url.split('?')[0];

  let body: any = {};
  if (init?.body && typeof init.body === 'string') {
    try {
      body = JSON.parse(init.body);
    } catch {}
  }

  // 1. REGISTER
  if (path === '/api/auth/register' && method === 'POST') {
    const users = getStorage<User[]>('sabaidee_persisted_users', [...initialUsers]);
    const staffList = getStorage<Staff[]>('sabaidee_persisted_staff', [...initialStaff]);
    const txList = getStorage<CreditTransaction[]>('sabaidee_persisted_tx', [...initialTransactions]);

    const digits = String(body.phone || '').replace(/\D/g, '');
    const existing = users.find(u => String(u.Phone || '').replace(/\D/g, '') === digits && digits !== '');
    if (existing) {
      return jsonResponse({ error: 'เบอร์โทรศัพท์นี้ลงทะเบียนในระบบแล้ว กรุณาเข้าสู่ระบบค่ะ' }, 400);
    }

    const newUserId = 'U' + Math.floor(100000 + Math.random() * 900000);
    const role: 'Customer' | 'Staff' = body.role === 'Staff' ? 'Staff' : 'Customer';

    const newUser: User = {
      UserID: newUserId,
      Name: body.name || 'ผู้ใช้งานใหม่',
      Phone: body.phone,
      PasswordHash: body.password || '123456',
      Email: `${digits}@sabaidee.com`,
      Address: body.staffInfo?.registeredAddress || 'สุราษฎร์ธานี',
      Province: 'สุราษฎร์ธานี',
      District: 'เมืองสุราษฎร์ธานี',
      SubDistrict: 'ตลาด',
      Latitude: Number(body.latitude) || 9.138244,
      Longitude: Number(body.longitude) || 99.321748,
      ProfileImage: body.profileImage || '',
      Role: role,
      Status: 'Active',
      CreatedDate: new Date().toISOString()
    };

    let newStaff: Staff | null = null;
    if (role === 'Staff') {
      const newStaffId = 'SFT' + Math.floor(100000 + Math.random() * 900000);
      const sInfo = body.staffInfo || {};
      newStaff = {
        StaffID: newStaffId,
        UserID: newUserId,
        Nickname: sInfo.nickname || body.name?.split(' ')[0] || 'พนักงานใหม่',
        Gender: sInfo.gender || 'Female',
        Age: Number(sInfo.age) || 28,
        Weight: Number(sInfo.weight) || 52,
        Height: Number(sInfo.height) || 160,
        RegisteredAddress: sInfo.registeredAddress || 'สุราษฎร์ธานี',
        Experience: Number(sInfo.experience) || 2,
        Description: sInfo.description || 'ยินดีให้บริการนวดเพื่อสุขภาพและการผ่อนคลายค่ะ',
        Rating: 5.0,
        ReviewCount: 0,
        Credit: 200, // 200 CR welcome bonus
        Available: 'OFF',
        VerifyStatus: 'Pending',
        CurrentLatitude: Number(body.latitude) || 9.138244,
        CurrentLongitude: Number(body.longitude) || 99.321748,
        LastLocationUpdate: new Date().toISOString(),
        TotalIncome: 0,
        TotalJobs: 0,
        OfferedServices: ['S001', 'S002', 'S003'],
        MaxJobDistance: 25,
        Photos: Array.isArray(sInfo.photos) && sInfo.photos.length > 0 ? sInfo.photos : [body.profileImage].filter(Boolean),
        LicenseFile: sInfo.licenseFile || '',
        IdCardFile: sInfo.idCardFile || '',
        HouseRegFile: sInfo.houseRegFile || ''
      };

      staffList.push(newStaff);
      setStorage('sabaidee_persisted_staff', staffList);

      const welcomeTx: CreditTransaction = {
        TransactionID: 'TX' + Math.floor(100000 + Math.random() * 900000),
        StaffID: newStaffId,
        Amount: 200,
        BeforeCredit: 0,
        AfterCredit: 200,
        Type: 'Topup',
        SlipImage: '',
        Status: 'Approved',
        AdminRemark: '🎁 โบนัสต้อนรับพนักงานใหม่ 200 เครดิต (รับงานฟรี 1 ครั้งเมื่อได้รับการอนุมัติ)',
        CreatedDate: new Date().toISOString()
      };
      txList.push(welcomeTx);
      setStorage('sabaidee_persisted_tx', txList);
    }

    users.push(newUser);
    setStorage('sabaidee_persisted_users', users);

    // Sync to Google Sheet and trigger LINE push via GAS if Webhook configured
    const currentSettings = getStorage<AppSettings>('sabaidee_persisted_settings', defaultSettings);
    if (currentSettings?.googleSheetWebhookUrl && currentSettings.googleSheetWebhookUrl.startsWith('http')) {
      try {
        const staffPayload = role === 'Staff' && newStaff ? {
          ...newStaff,
          StaffName: body.name || newStaff.Nickname,
          Name: body.name || newStaff.Nickname,
          Phone: body.phone,
          Nickname: newStaff.Nickname || body.name
        } : newUser;

        fetch(currentSettings.googleSheetWebhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'INSERT',
            table: role === 'Staff' ? 'Staff' : 'Users',
            data: staffPayload,
            token: currentSettings.lineChannelAccessToken,
            adminId: currentSettings.lineAdminUserId
          })
        }).catch(console.warn);
      } catch {}
    }

    return jsonResponse({
      success: true,
      user: newUser,
      staff: newStaff
    }, 201);
  }

  // 2. LOGIN
  if (path === '/api/auth/login' && method === 'POST') {
    const rawInput = String(body.phone || body.username || '').trim();
    const digits = rawInput.replace(/\D/g, '');
    const pwd = String(body.password || '').trim();

    // Check for Admin Chang (2511 / 2511)
    if (rawInput === '2511' || digits === '2511' || rawInput.toLowerCase() === 'chang' || rawInput.includes('ช้าง')) {
      if (pwd === '2511' || !pwd) {
        return jsonResponse({
          success: true,
          user: ADMIN_CHANG,
          staff: null
        });
      } else {
        return jsonResponse({ error: 'รหัสผ่านไม่ถูกต้อง (รหัสผ่านคือ 2511)' }, 400);
      }
    }

    const users = getStorage<User[]>('sabaidee_persisted_users', [...initialUsers]);
    const staffList = getStorage<Staff[]>('sabaidee_persisted_staff', [...initialStaff]);

    const matchedUser = users.find(u => {
      const uDigits = String(u.Phone || '').replace(/\D/g, '');
      return (uDigits === digits || String(u.Phone || '').trim() === rawInput) && u.PasswordHash === pwd;
    });

    if (!matchedUser) {
      return jsonResponse({ error: 'เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบหรือสมัครสมาชิกก่อนค่ะ' }, 400);
    }

    let matchedStaff: Staff | null = null;
    if (matchedUser.Role === 'Staff') {
      matchedStaff = staffList.find(s => s.UserID === matchedUser.UserID) || null;
    }

    return jsonResponse({
      success: true,
      user: matchedUser,
      staff: matchedStaff
    });
  }

  // 3. STAFF VERIFICATION & APPROVAL (Crucial for Admin!)
  if (path.startsWith('/api/staff/') && path.endsWith('/verify') && method === 'PUT') {
    const parts = path.split('/');
    const staffId = parts[3];
    const status = body.status || 'Approved';
    let staffList = getStorage<Staff[]>('sabaidee_persisted_staff', [...initialStaff]);
    const staff = staffList.find(s => s.StaffID === staffId);
    if (staff) {
      staff.VerifyStatus = status;
      if (status !== 'Approved') {
        staff.Available = 'OFF';
      }
      setStorage('sabaidee_persisted_staff', staffList);

      // Sync to Google Sheet if Webhook is set
      const settings = getStorage<AppSettings>('sabaidee_persisted_settings', defaultSettings);
      if (settings?.googleSheetWebhookUrl && settings.googleSheetWebhookUrl.startsWith('http')) {
        try {
          fetch(settings.googleSheetWebhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'UPDATE',
              table: 'Staff',
              idColumn: 'StaffID',
              id: staffId,
              data: { VerifyStatus: status, Available: staff.Available }
            })
          }).catch(console.warn);
        } catch {}
      }
      return jsonResponse({ success: true, staff });
    }
    return jsonResponse({ error: 'ไม่พบข้อมูลพนักงาน' }, 404);
  }

  // 4. STAFF DETAILS (For inspection modal)
  if (path.startsWith('/api/staff/') && path.endsWith('/details') && method === 'GET') {
    const parts = path.split('/');
    const staffId = parts[3];
    const staffList = getStorage<Staff[]>('sabaidee_persisted_staff', [...initialStaff]);
    const users = getStorage<User[]>('sabaidee_persisted_users', [...initialUsers]);
    const services = getStorage<Service[]>('sabaidee_persisted_services', [...initialServices]);
    const bookings = getStorage<Booking[]>('sabaidee_persisted_bookings', []);
    const tx = getStorage<CreditTransaction[]>('sabaidee_persisted_tx', [...initialTransactions]);

    const staff = staffList.find(s => s.StaffID === staffId);
    if (!staff) {
      return jsonResponse({ error: 'ไม่พบข้อมูลพนักงาน' }, 404);
    }

    const u = users.find(user => user.UserID === staff.UserID) || ({} as any);
    const fullStaff = {
      ...staff,
      Name: u.Name || staff.Nickname,
      Phone: u.Phone || '',
      Email: u.Email || '',
      ProfileImage: u.ProfileImage || (staff.Photos && staff.Photos[0]) || '',
      Address: u.Address || staff.RegisteredAddress || '',
      Province: u.Province || 'สุราษฎร์ธานี',
      District: u.District || 'เมืองสุราษฎร์ธานี',
      SubDistrict: u.SubDistrict || 'ตลาด',
      UserStatus: u.Status || 'Active'
    };

    return jsonResponse({
      staff: fullStaff,
      bookings: bookings.filter(b => b.StaffID === staffId),
      reviews: [],
      transactions: tx.filter(t => t.StaffID === staffId),
      services
    });
  }

  // 5. STAFF CREDIT ADJUSTMENT (Topup/Deduct by Admin)
  if (path.startsWith('/api/admin/staff/') && path.endsWith('/credit') && method === 'PUT') {
    const parts = path.split('/');
    const staffId = parts[4];
    const amount = Number(body.amount) || 0;
    const type = body.type || 'Topup';
    const remark = body.remark || (type === 'Topup' ? 'เติมเครดิตโดยแอดมิน' : 'หักเครดิตโดยแอดมิน');

    let staffList = getStorage<Staff[]>('sabaidee_persisted_staff', [...initialStaff]);
    let txList = getStorage<CreditTransaction[]>('sabaidee_persisted_tx', [...initialTransactions]);

    const staff = staffList.find(s => s.StaffID === staffId);
    if (!staff) return jsonResponse({ error: 'ไม่พบพนักงาน' }, 404);

    const prevCr = staff.Credit || 0;
    const newCr = type === 'Topup' ? prevCr + amount : Math.max(0, prevCr - amount);
    staff.Credit = newCr;
    setStorage('sabaidee_persisted_staff', staffList);

    const newTx: CreditTransaction = {
      TransactionID: 'TX' + Math.floor(100000 + Math.random() * 900000),
      StaffID: staffId,
      Amount: amount,
      BeforeCredit: prevCr,
      AfterCredit: newCr,
      Type: type,
      SlipImage: '',
      Status: 'Approved',
      AdminRemark: remark,
      CreatedDate: new Date().toISOString()
    };
    txList.unshift(newTx);
    setStorage('sabaidee_persisted_tx', txList);

    return jsonResponse({ success: true, staff, transaction: newTx });
  }

  // 6. STAFF UPDATE (From modal)
  if ((path.startsWith('/api/admin/staff/') && path.endsWith('/update')) || (path.startsWith('/api/staff/') && method === 'PUT' && !path.endsWith('/verify') && !path.endsWith('/availability'))) {
    const parts = path.split('/');
    const staffId = parts[path.includes('/admin/staff/') ? 4 : 3];
    let staffList = getStorage<Staff[]>('sabaidee_persisted_staff', [...initialStaff]);
    let users = getStorage<User[]>('sabaidee_persisted_users', [...initialUsers]);
    const staff = staffList.find(s => s.StaffID === staffId);
    if (staff) {
      Object.assign(staff, body);
      setStorage('sabaidee_persisted_staff', staffList);
      if (staff.UserID) {
        const u = users.find(user => user.UserID === staff.UserID);
        if (u) {
          if (body.name) u.Name = body.name;
          if (body.phone) u.Phone = body.phone;
          setStorage('sabaidee_persisted_users', users);
        }
      }
      return jsonResponse({ success: true, staff });
    }
    return jsonResponse({ error: 'ไม่พบข้อมูลพนักงาน' }, 404);
  }

  // 7. CLEAN TO ADMIN ONLY
  if (path === '/api/admin/clean-to-admin-only' && method === 'POST') {
    setStorage('sabaidee_persisted_users', [ADMIN_CHANG]);
    setStorage('sabaidee_persisted_staff', []);
    setStorage('sabaidee_persisted_bookings', []);
    setStorage('sabaidee_persisted_tx', []);
    return jsonResponse({ success: true, message: 'ลบผู้ใช้ทุกคนสำเร็จ เหลือเฉพาะแอดมินคนเดียว' });
  }

  // 8. SERVICES
  if (path === '/api/services') {
    const services = getStorage<Service[]>('sabaidee_persisted_services', [...initialServices]);
    if (method === 'GET') {
      return jsonResponse(services);
    }
    if (method === 'POST') {
      const newService: Service = {
        ServiceID: 'S' + Math.floor(100 + Math.random() * 900),
        ServiceName: body.ServiceName || 'บริการนวดใหม่',
        Detail: body.Detail || '',
        Price: Number(body.Price) || 598,
        Duration: Number(body.Duration) || 120,
        CreditRequired: Number(body.CreditRequired ?? 200),
        Active: 'ON',
        SortOrder: services.length + 1,
        UpdatedAt: new Date().toISOString()
      };
      services.push(newService);
      setStorage('sabaidee_persisted_services', services);
      return jsonResponse({ success: true, service: newService });
    }
  }

  if (path.startsWith('/api/services/')) {
    const serviceId = path.split('/')[3];
    let services = getStorage<Service[]>('sabaidee_persisted_services', [...initialServices]);
    if (method === 'PUT') {
      services = services.map(s => s.ServiceID === serviceId ? { ...s, ...body, UpdatedAt: new Date().toISOString() } : s);
      setStorage('sabaidee_persisted_services', services);
      const updated = services.find(s => s.ServiceID === serviceId);
      return jsonResponse({ success: true, service: updated });
    }
    if (method === 'DELETE') {
      services = services.filter(s => s.ServiceID !== serviceId);
      setStorage('sabaidee_persisted_services', services);
      return jsonResponse({ success: true });
    }
  }

  // 9. USERS
  if (path === '/api/users' && method === 'GET') {
    const users = getStorage<User[]>('sabaidee_persisted_users', [...initialUsers]);
    return jsonResponse(users);
  }

  if (path.startsWith('/api/users/')) {
    const userId = path.split('/')[3];
    let users = getStorage<User[]>('sabaidee_persisted_users', [...initialUsers]);
    if (method === 'DELETE') {
      users = users.filter(u => u.UserID !== userId && u.UserID !== 'U001'); // protect Chang
      setStorage('sabaidee_persisted_users', [ADMIN_CHANG, ...users]);
      let staffList = getStorage<Staff[]>('sabaidee_persisted_staff', []);
      staffList = staffList.filter(s => s.UserID !== userId);
      setStorage('sabaidee_persisted_staff', staffList);
      return jsonResponse({ success: true });
    }
    const user = users.find(u => u.UserID === userId);
    return jsonResponse(user || ADMIN_CHANG);
  }

  // 10. STAFF
  if (path === '/api/staff' && method === 'GET') {
    const staffList = getStorage<Staff[]>('sabaidee_persisted_staff', [...initialStaff]);
    return jsonResponse(staffList);
  }

  if (path === '/api/staff/availability' && method === 'PUT') {
    const staffList = getStorage<Staff[]>('sabaidee_persisted_staff', [...initialStaff]);
    const staffId = body.staffId || (staffList[0] && staffList[0].StaffID);
    const updatedStaff = staffList.find(s => s.StaffID === staffId);
    if (updatedStaff) {
      updatedStaff.Available = body.available || 'OFF';
      setStorage('sabaidee_persisted_staff', staffList);
      return jsonResponse({ success: true, staff: updatedStaff });
    }
    return jsonResponse({ success: true });
  }

  // 11. SETTINGS
  if (path === '/api/settings') {
    const settings = getStorage<AppSettings>('sabaidee_persisted_settings', defaultSettings);
    if (method === 'GET') {
      return jsonResponse(settings);
    }
    if (method === 'POST') {
      const merged = { ...settings, ...body };
      setStorage('sabaidee_persisted_settings', merged);
      return jsonResponse({ success: true, settings: merged });
    }
  }

  // 12. TRANSACTIONS
  if (path === '/api/credits/transactions') {
    const tx = getStorage<CreditTransaction[]>('sabaidee_persisted_tx', [...initialTransactions]);
    return jsonResponse(tx);
  }

  if (path === '/api/credits/topup' && method === 'POST') {
    const txList = getStorage<CreditTransaction[]>('sabaidee_persisted_tx', [...initialTransactions]);
    const staffList = getStorage<Staff[]>('sabaidee_persisted_staff', [...initialStaff]);
    const amount = Number(body.amount) || 200;

    const staff = staffList.find(s => s.StaffID === body.staffId) || staffList[0];
    const currentCr = staff ? (staff.Credit || 0) : 0;
    const newCr = currentCr + amount;

    if (staff) {
      staff.Credit = newCr;
      setStorage('sabaidee_persisted_staff', staffList);
    }

    const newTx: CreditTransaction = {
      TransactionID: 'TX' + Math.floor(100000 + Math.random() * 900000),
      StaffID: body.staffId || (staff ? staff.StaffID : 'SFT001'),
      Amount: amount,
      BeforeCredit: currentCr,
      AfterCredit: newCr,
      Type: 'Topup',
      SlipImage: body.slipImage || '',
      Status: 'Approved',
      AdminRemark: 'เติมเครดิตเข้าบัญชีเรียบร้อย',
      CreatedDate: new Date().toISOString()
    };

    txList.unshift(newTx);
    setStorage('sabaidee_persisted_tx', txList);

    return jsonResponse({ success: true, transaction: newTx, staff });
  }

  // 13. BOOKINGS
  if (path === '/api/bookings') {
    const bookings = getStorage<Booking[]>('sabaidee_persisted_bookings', []);
    if (method === 'GET') {
      return jsonResponse(bookings);
    }
    if (method === 'POST') {
      const newBooking: Booking = {
        BookingID: 'BK' + Math.floor(100000 + Math.random() * 900000),
        CustomerID: body.customerId || 'U001',
        StaffID: body.staffId || 'none',
        BookingDate: new Date().toISOString().split('T')[0],
        BookingTime: new Date().toTimeString().slice(0, 5),
        CustomerAddress: body.customerAddress || 'สุราษฎร์ธานี',
        CustomerLatitude: Number(body.customerLat) || 9.138244,
        CustomerLongitude: Number(body.customerLng) || 99.321748,
        ServiceID: body.serviceId || 'S001',
        ServicePrice: Number(body.price) || 598,
        Distance: Number(body.distance) || 3.5,
        TravelFee: Number(body.travelFee) || 0,
        TotalPrice: Number(body.totalPrice) || 598,
        Status: 'Waiting',
        PaymentStatus: 'Unpaid',
        CreatedDate: new Date().toISOString()
      };
      bookings.unshift(newBooking);
      setStorage('sabaidee_persisted_bookings', bookings);

      // Trigger Webhook for new booking
      const settings = getStorage<AppSettings>('sabaidee_persisted_settings', defaultSettings);
      if (settings?.googleSheetWebhookUrl && settings.googleSheetWebhookUrl.startsWith('http')) {
        try {
          fetch(settings.googleSheetWebhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'INSERT',
              table: 'Booking',
              data: newBooking,
              token: settings.lineChannelAccessToken,
              adminId: settings.lineAdminUserId
            })
          }).catch(console.warn);
        } catch {}
      }

      return jsonResponse({ success: true, booking: newBooking });
    }
  }

  // 14. ADMIN DASHBOARD
  if (path === '/api/admin/dashboard') {
    const users = getStorage<User[]>('sabaidee_persisted_users', [...initialUsers]);
    const staffList = getStorage<Staff[]>('sabaidee_persisted_staff', [...initialStaff]);
    const bookings = getStorage<Booking[]>('sabaidee_persisted_bookings', []);

    return jsonResponse({
      customersCount: users.filter(u => u.Role === 'Customer').length,
      staffCount: staffList.length,
      totalJobs: bookings.length,
      todayJobs: bookings.filter(b => b.BookingDate === new Date().toISOString().split('T')[0]).length,
      totalRevenue: bookings.reduce((sum, b) => sum + (b.TotalPrice || 0), 0),
      commissionEarnings: Math.round(bookings.reduce((sum, b) => sum + (b.TotalPrice || 0), 0) * 0.15),
      salesByDay: {
        "จันทร์": 0,
        "อังคาร": 0,
        "พุธ": 0,
        "พฤหัสบดี": 0,
        "ศุกร์": 0,
        "เสาร์": 0,
        "อาทิตย์": 0
      },
      salesByMonth: {
        "ม.ค.": 0,
        "ก.พ.": 0,
        "มี.ค.": 0,
        "เม.ย.": 0
      },
      topStaff: staffList.slice(0, 5).map(s => ({
        StaffID: s.StaffID,
        staffId: s.StaffID,
        Nickname: s.Nickname,
        name: s.Nickname,
        TotalJobs: s.TotalJobs || 0,
        jobs: s.TotalJobs || 0,
        Rating: s.Rating || 5.0,
        rating: s.Rating || 5.0,
        TotalIncome: s.TotalIncome || 0,
        income: s.TotalIncome || 0
      }))
    });
  }

  // 15. REVIEWS
  if (path === '/api/reviews') {
    return jsonResponse({ success: true });
  }

  // 16. TEST LINE NOTIFICATION
  if (path === '/api/admin/test-line-notification' && method === 'POST') {
    const settings = getStorage<AppSettings>('sabaidee_persisted_settings', defaultSettings);
    const webhookUrl = body.webhookUrl || settings?.googleSheetWebhookUrl;
    const token = body.token || settings?.lineChannelAccessToken;
    const adminId = body.adminId || settings?.lineAdminUserId;

    if (webhookUrl && webhookUrl.startsWith('http')) {
      try {
        fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'TEST_LINE',
            message: '🔔 ทดสอบส่งข้อความเข้ากลุ่ม LINE แอดมินจาก SabaiDee Massage (ส่งผ่าน GitHub Pages สำเร็จเรียบร้อยค่ะ!)',
            token,
            adminId
          })
        }).catch(console.warn);
        return jsonResponse({ success: true, message: 'ส่งคำขอทดสอบไปยัง LINE ผ่าน Google Apps Script Webhook แล้วค่ะ' });
      } catch (e: any) {
        return jsonResponse({ error: e.message }, 500);
      }
    }
    return jsonResponse({
      success: true,
      message: 'การส่งแจ้งเตือนเข้า LINE สำหรับ GitHub Pages ต้องเชื่อมต่อ Google Apps Script Webhook ในหน้าตั้งค่าค่ะ'
    });
  }

  // Default catch-all response
  return jsonResponse({ success: true });
}
