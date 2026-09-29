import fs from 'fs';
import path from 'path';
import { User, Staff, Service, Booking, CreditTransaction, Review, Notification, AppSettings } from '../src/types';

const DB_PATH = path.join(process.cwd(), 'server', 'db.json');
const DB_BAK_PATH = path.join(process.cwd(), 'server', 'db.json.bak');
const DB_PERSISTENT_PATH = path.join(process.cwd(), 'server', 'db_persistent_backup.json');
const DB_TMP_PATH = path.join(process.cwd(), 'server', 'db.json.tmp');

// In-memory cache to prevent race conditions and frequent disk read locks
let inMemoryDB: DatabaseSchema | null = null;

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export interface DatabaseSchema {
  users: User[];
  staff: Staff[];
  services: Service[];
  bookings: Booking[];
  transactions: CreditTransaction[];
  reviews: Review[];
  notifications: Notification[];
  settings: AppSettings;
  deletedUserIds?: string[];
  deletedStaffIds?: string[];
}

export const defaultSettings: AppSettings = {
  companyName: "SabaiDee Massage",
  logo: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=120&auto=format&fit=crop&q=60",
  themeColor: "#10b981", // Emerald Green (Grab style)
  travelFeePerKm: 15,
  travelFeeTiers: [
    { minKm: 0, maxKm: 3, fee: 0 },
    { minKm: 3, maxKm: 10, fee: 150 },
    { minKm: 10, maxKm: 15, fee: 200 }
  ],
  commissionRate: 15, // 15%
  minCredit: 398,
  searchRadius: 15, // 15 km
  systemOpen: 'ON',
  contactPhone: "081-234-5678",
  lineOA: "@sabaideemassage",
  facebook: "SabaiDee Home Massage",
  businessHours: "09:00 - 22:00",
  bannerText: "✨ โปรโมชั่นพิเศษ! ลดค่าเดินทาง 50% สำหรับการจองครั้งแรก ✨",
  promotionText: "จองนวดอโรมาวันนี้ รับสิทธิ์นวดคอบ่าไหล่ฟรี 15 นาที!",
  couponCode: "SABAIDEE99",
  couponDiscount: 50,
  bankName: "ธนาคารกสิกรไทย",
  bankAccount: "123-4-56789-0",
  bankAccountName: "บจก. สบายดี มาสสาจ",
  qrCodeImage: "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg",
  lineChannelAccessToken: "b6spU9oI6sgyc/lagfyn8Z6MZ4GkUCLOModW44f2ZY/4Ja0nvseYKZSvZwPOboWSMAKM3VN0z/7h50RoaGkMvCNBX2+e51SYez0lNHgwqoEs8TnNKe+7jMLbFEY1sH6ujkXTbp9OXhYxOUKnOiJ0WgdB04t89/1O/w1cDnyilFU=",
  lineAdminUserId: "Cf544171f0f9753863ade1ddd1acd67a7",
  enableLineAdminNotify: true
};

const defaultServices: Service[] = [
  {
    ServiceID: "S001",
    ServiceName: "นวดผ่อนคลาย (Relaxing Massage)",
    Detail: "นวดผ่อนคลายความเครียดสะสม คลายความเมื่อยล้าทั่วร่างกาย ปรับสมดุลให้ร่างกายเบาสบาย",
    Duration: 120,
    Price: 798,
    CreditRequired: 398,
    Active: 'ON',
    SortOrder: 1
  },
  {
    ServiceID: "S002",
    ServiceName: "นวดแก้อาการ (Therapeutic Massage)",
    Detail: "นวดบำบัดรักษาอาการปวดเมื่อยเฉพาะจุด แก้เส้นตึง พังผืดเกาะ คอบ่าไหล่ ออฟฟิศซินโดรม",
    Duration: 120,
    Price: 798,
    CreditRequired: 398,
    Active: 'ON',
    SortOrder: 2
  },
  {
    ServiceID: "S003",
    ServiceName: "นวดแผนไทย (Thai Massage)",
    Detail: "นวดแผนโบราณ กดจุด ยืดเหยียดกล้ามเนื้อ กระตุ้นการไหลเวียนเลือด ทำให้ร่างกายสดชื่น",
    Duration: 120,
    Price: 798,
    CreditRequired: 398,
    Active: 'ON',
    SortOrder: 3
  }
];

const defaultUsers: User[] = [
  {
    UserID: "U001",
    Name: "สมชาย ยิ่งดี (แอดมิน)",
    Phone: "0812345678",
    PasswordHash: "admin123",
    Email: "admin@sabaidee.com",
    Address: "99 ถนนกาญจนวิถี ต.บางกุ้ง อ.เมือง จ.สุราษฎร์ธานี 84000",
    Province: "สุราษฎร์ธานี",
    District: "เมืองสุราษฎร์ธานี",
    SubDistrict: "บางกุ้ง",
    Latitude: 9.145000,
    Longitude: 99.336000,
    ProfileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=60",
    Role: "Admin",
    Status: "Active",
    CreatedDate: "2026-01-01T08:00:00Z"
  }
];

const defaultStaff: Staff[] = [];

const defaultBookings: Booking[] = [];

const defaultTransactions: CreditTransaction[] = [];

const defaultReviews: Review[] = [];

const defaultNotifications: Notification[] = [];

export function mergeDatabases(base: DatabaseSchema, additions: Partial<DatabaseSchema>): DatabaseSchema {
  const deletedUserIds = new Set([...(base.deletedUserIds || []), ...(additions.deletedUserIds || [])]);
  const deletedStaffIds = new Set([...(base.deletedStaffIds || []), ...(additions.deletedStaffIds || [])]);

  const merged: DatabaseSchema = {
    users: [...(base.users || [])],
    staff: [...(base.staff || [])],
    services: [...(base.services || [])],
    bookings: [...(base.bookings || [])],
    transactions: [...(base.transactions || [])],
    reviews: [...(base.reviews || [])],
    notifications: [...(base.notifications || [])],
    settings: { ...base.settings },
    deletedUserIds: Array.from(deletedUserIds),
    deletedStaffIds: Array.from(deletedStaffIds)
  };

  // Filter out any already deleted records from base
  merged.users = merged.users.filter(u => !deletedUserIds.has(u.UserID));
  merged.staff = merged.staff.filter(s => !deletedStaffIds.has(s.StaffID) && !deletedUserIds.has(s.UserID));

  if (Array.isArray(additions.users)) {
    for (const u of additions.users) {
      if (!u || !u.Phone || !u.UserID) continue;
      if (deletedUserIds.has(u.UserID)) continue; // Never re-add permanently deleted user
      const idx = merged.users.findIndex(x => x.UserID === u.UserID || x.Phone === u.Phone);
      if (idx === -1) {
        merged.users.push(u);
      } else {
        merged.users[idx] = { ...merged.users[idx], ...u };
      }
    }
  }

  if (Array.isArray(additions.staff)) {
    for (const s of additions.staff) {
      if (!s || !s.StaffID) continue;
      if (deletedStaffIds.has(s.StaffID) || (s.UserID && deletedUserIds.has(s.UserID))) continue; // Never re-add permanently deleted staff
      const idx = merged.staff.findIndex(x => x.StaffID === s.StaffID || x.UserID === s.UserID);
      if (idx === -1) {
        merged.staff.push(s);
      } else {
        merged.staff[idx] = { ...merged.staff[idx], ...s };
      }
    }
  }

  if (Array.isArray(additions.bookings)) {
    for (const b of additions.bookings) {
      if (!b || !b.BookingID) continue;
      const idx = merged.bookings.findIndex(x => x.BookingID === b.BookingID);
      if (idx === -1) {
        merged.bookings.push(b);
      } else {
        merged.bookings[idx] = { ...merged.bookings[idx], ...b };
      }
    }
  }

  if (Array.isArray(additions.transactions)) {
    for (const t of additions.transactions) {
      if (!t || !t.TransactionID) continue;
      if (!merged.transactions.some(x => x.TransactionID === t.TransactionID)) {
        merged.transactions.push(t);
      }
    }
  }

  if (Array.isArray(additions.reviews)) {
    for (const r of additions.reviews) {
      if (!r || !r.ReviewID) continue;
      if (!merged.reviews.some(x => x.ReviewID === r.ReviewID)) {
        merged.reviews.push(r);
      }
    }
  }

  if (Array.isArray(additions.notifications)) {
    for (const n of additions.notifications) {
      if (!n || !n.NotificationID) continue;
      if (!merged.notifications.some(x => x.NotificationID === n.NotificationID)) {
        merged.notifications.push(n);
      }
    }
  }

  if (additions.settings) {
    merged.settings = { ...merged.settings, ...additions.settings };
  }

  return merged;
}

const tryReadFile = (filePath: string): DatabaseSchema | null => {
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      if (data && data.trim().length > 0) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.users)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn(`[DB] Error parsing ${filePath}:`, err);
    }
  }
  return null;
};

export function getDatabase(): DatabaseSchema {
  if (inMemoryDB) {
    return inMemoryDB;
  }

  // 1. Try reading the saved database from primary or persistent backup
  const primaryDb = tryReadFile(DB_PATH);
  const persistentDb = tryReadFile(DB_PERSISTENT_PATH);
  const backupDb = tryReadFile(DB_BAK_PATH);

  // If primaryDb is present and valid, it is the canonical database (authoritative source of truth)
  // We only use backups if primaryDb is missing or corrupt
  const sourceDb = primaryDb || persistentDb || backupDb;
  if (sourceDb && Array.isArray(sourceDb.users) && sourceDb.users.length > 0) {
    let liveDb: DatabaseSchema = { ...sourceDb };

    // Collect all deleted tombstones across files so deleted records are never resurrected
    const allDeletedUsers = new Set<string>([
      'U002', 'U005', 'U759249', 'U347114',
      ...(primaryDb?.deletedUserIds || []),
      ...(persistentDb?.deletedUserIds || []),
      ...(backupDb?.deletedUserIds || [])
    ]);
    const allDeletedStaff = new Set<string>([
      'SFT001', 'SFT956678', 'SFT738787',
      ...(primaryDb?.deletedStaffIds || []),
      ...(persistentDb?.deletedStaffIds || []),
      ...(backupDb?.deletedStaffIds || [])
    ]);

    liveDb.deletedUserIds = Array.from(allDeletedUsers);
    liveDb.deletedStaffIds = Array.from(allDeletedStaff);

    // Filter out any deleted records
    if (!Array.isArray(liveDb.users)) liveDb.users = [];
    if (!Array.isArray(liveDb.staff)) liveDb.staff = [];
    liveDb.users = liveDb.users.filter(u => !allDeletedUsers.has(u.UserID));
    liveDb.staff = liveDb.staff.filter(s => !allDeletedStaff.has(s.StaffID) && !allDeletedUsers.has(s.UserID));

    if (!Array.isArray(liveDb.services)) liveDb.services = defaultServices;
    if (!Array.isArray(liveDb.bookings)) liveDb.bookings = [];
    if (!Array.isArray(liveDb.transactions)) liveDb.transactions = [];
    if (!Array.isArray(liveDb.reviews)) liveDb.reviews = [];
    if (!Array.isArray(liveDb.notifications)) liveDb.notifications = [];
    if (!liveDb.settings) liveDb.settings = defaultSettings;

    inMemoryDB = liveDb;
    saveDatabase(liveDb);
    return liveDb;
  }

  // 2. Only if no database exists anywhere (first-time launch), initialize with defaults
  const initialDB: DatabaseSchema = {
    users: defaultUsers,
    staff: defaultStaff,
    services: defaultServices,
    bookings: defaultBookings,
    transactions: defaultTransactions,
    reviews: defaultReviews,
    notifications: defaultNotifications,
    settings: defaultSettings,
    deletedUserIds: ['U002', 'U005', 'U759249', 'U347114'],
    deletedStaffIds: ['SFT001', 'SFT956678', 'SFT738787']
  };

  inMemoryDB = initialDB;
  saveDatabase(initialDB);
  return initialDB;
}

export function saveDatabase(db: DatabaseSchema): void {
  inMemoryDB = db;

  try {
    const jsonString = JSON.stringify(db, null, 2);
    
    // 1. Atomic write to primary DB_PATH
    fs.writeFileSync(DB_TMP_PATH, jsonString, 'utf8');
    fs.renameSync(DB_TMP_PATH, DB_PATH);

    // 2. Safe writes to backup and persistent files
    try {
      fs.writeFileSync(DB_BAK_PATH, jsonString, 'utf8');
    } catch (e) {
      console.warn('[DB] Backup write failed:', e);
    }

    try {
      fs.writeFileSync(DB_PERSISTENT_PATH, jsonString, 'utf8');
    } catch (e) {
      console.warn('[DB] Persistent backup write failed:', e);
    }
  } catch (error) {
    console.error("[DB] Failed to save database to disk:", error);
  }
}
