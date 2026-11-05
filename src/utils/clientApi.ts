/**
 * SabaiDee Massage Client-side API Mock Engine
 * Ensures 100% stable operation on GitHub Pages and static deployments without throwing "Failed to fetch"
 */
import { initialServices, initialUsers, initialStaff, initialTransactions } from '../data/initialData';
import { User, Staff, Service, CreditTransaction, Booking, AppSettings } from '../types';

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
  lineChannelAccessToken: "",
  lineAdminUserId: "",
  enableLineAdminNotify: false,
  autoCompleteMinutes: 30
};

function getStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(fallback)) {
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as unknown as T;
      } else if (parsed && typeof parsed === 'object') {
        return parsed as T;
      }
    }
  } catch {}
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
    const existing = users.find(u => String(u.Phone || '').replace(/\D/g, '') === digits);
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
        Nickname: sInfo.nickname || body.name.split(' ')[0],
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
    const users = getStorage<User[]>('sabaidee_persisted_users', [...initialUsers]);
    const staffList = getStorage<Staff[]>('sabaidee_persisted_staff', [...initialStaff]);

    const digits = String(body.phone || '').replace(/\D/g, '');
    let matchedUser = users.find(u => String(u.Phone || '').replace(/\D/g, '') === digits);

    // Fallback built-in accounts
    if (!matchedUser) {
      if (digits === '0812345678') matchedUser = initialUsers[0];
      else if (digits === '0891234567') matchedUser = initialUsers[1];
      else if (digits === '0823456789') matchedUser = initialUsers[2];
    }

    if (!matchedUser) {
      return jsonResponse({ error: 'ไม่พบเบอร์โทรศัพท์นี้ในระบบ กรุณาสมัครสมาชิกก่อนค่ะ' }, 400);
    }

    let matchedStaff: Staff | null = null;
    if (matchedUser.Role === 'Staff') {
      matchedStaff = staffList.find(s => s.UserID === matchedUser!.UserID || s.StaffID === 'SFT001') || initialStaff[0];
    }

    return jsonResponse({
      success: true,
      user: matchedUser,
      staff: matchedStaff
    });
  }

  // 3. SERVICES
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

  // 4. USERS
  if (path === '/api/users' && method === 'GET') {
    const users = getStorage<User[]>('sabaidee_persisted_users', [...initialUsers]);
    return jsonResponse(users);
  }

  if (path.startsWith('/api/users/')) {
    const userId = path.split('/')[3];
    const users = getStorage<User[]>('sabaidee_persisted_users', [...initialUsers]);
    const user = users.find(u => u.UserID === userId);
    return jsonResponse(user || initialUsers[0]);
  }

  // 5. STAFF
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

  // 6. SETTINGS
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

  // 7. TRANSACTIONS
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
      StaffID: body.staffId || 'SFT001',
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

  // 8. BOOKINGS
  if (path === '/api/bookings') {
    const bookings = getStorage<Booking[]>('sabaidee_persisted_bookings', []);
    if (method === 'GET') {
      return jsonResponse(bookings);
    }
    if (method === 'POST') {
      const newBooking: Booking = {
        BookingID: 'BK' + Math.floor(100000 + Math.random() * 900000),
        CustomerID: body.customerId || 'U003',
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
      return jsonResponse({ success: true, booking: newBooking });
    }
  }

  if (path.includes('/deduct-credit-understood') && method === 'POST') {
    const bookingId = path.split('/')[3];
    const bookings = getStorage<Booking[]>('sabaidee_persisted_bookings', []);
    const staffList = getStorage<Staff[]>('sabaidee_persisted_staff', [...initialStaff]);

    const booking = bookings.find(b => b.BookingID === bookingId);
    const staff = staffList.find(s => s.StaffID === (body.staffId || booking?.StaffID)) || staffList[0];

    let remainingCredit = 200;
    if (staff) {
      staff.Credit = Math.max(0, (staff.Credit || 200) - 200);
      remainingCredit = staff.Credit;
      setStorage('sabaidee_persisted_staff', staffList);
    }

    if (booking) {
      booking.CreditDeducted = true;
      setStorage('sabaidee_persisted_bookings', bookings);
    }

    return jsonResponse({
      success: true,
      creditDeducted: 200,
      remainingCredit,
      staff
    });
  }

  // 9. ADMIN DASHBOARD
  if (path === '/api/admin/dashboard') {
    const users = getStorage<User[]>('sabaidee_persisted_users', [...initialUsers]);
    const staffList = getStorage<Staff[]>('sabaidee_persisted_staff', [...initialStaff]);
    const bookings = getStorage<Booking[]>('sabaidee_persisted_bookings', []);

    return jsonResponse({
      customersCount: users.filter(u => u.Role === 'Customer').length || 1,
      staffCount: staffList.length || 1,
      totalJobs: bookings.length || 25,
      todayJobs: 2,
      totalRevenue: 12500,
      commissionEarnings: 1875,
      salesByDay: {
        "จันทร์": 1200,
        "อังคาร": 1800,
        "พุธ": 2400,
        "พฤหัสบดี": 1600,
        "ศุกร์": 3200,
        "เสาร์": 4500,
        "อาทิตย์": 4800
      },
      salesByMonth: {
        "ม.ค.": 15000,
        "ก.พ.": 22000,
        "มี.ค.": 28000,
        "เม.ย.": 35000
      },
      topStaff: staffList.slice(0, 5).map((s, idx) => ({
        StaffID: s.StaffID,
        staffId: s.StaffID,
        Nickname: s.Nickname,
        name: s.Nickname,
        TotalJobs: s.TotalJobs || 25,
        jobs: s.TotalJobs || 25,
        Rating: s.Rating || 5.0,
        rating: s.Rating || 5.0,
        TotalIncome: s.TotalIncome || 12000,
        income: s.TotalIncome || 12000
      }))
    });
  }

  // 10. REVIEWS
  if (path === '/api/reviews') {
    return jsonResponse({ success: true });
  }

  // 11. TEST LINE NOTIFICATION
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
      message: 'การส่งแจ้งเตือนเข้า LINE สำหรับ GitHub Pages ต้องเชื่อมต่อ Google Apps Script Webhook ในหน้าตั้งค่า หรือเปิดใช้งานผ่านระบบเซิร์ฟเวอร์หลักค่ะ'
    });
  }

  // Default catch-all response
  return jsonResponse({ success: true });
}
