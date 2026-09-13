import fs from 'fs';
import path from 'path';
import { User, Staff, Service, Booking, CreditTransaction, Review, Notification, AppSettings } from '../src/types';

const DB_PATH = path.join(process.cwd(), 'server', 'db.json');
const DB_BAK_PATH = path.join(process.cwd(), 'server', 'db.json.bak');
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
  qrCodeImage: "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"
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
  },
  // Test Staff User
  {
    UserID: "U002",
    Name: "วรรณภา แสนดี (พี่นง)",
    Phone: "0823456789",
    PasswordHash: "staff123",
    Email: "nong@sabaidee.com",
    Address: "45/12 ถนนหน้าเมือง ต.ตลาด อ.เมือง จ.สุราษฎร์ธานี 84000",
    Province: "สุราษฎร์ธานี",
    District: "เมืองสุราษฎร์ธานี",
    SubDistrict: "ตลาด",
    Latitude: 9.141500,
    Longitude: 99.329200,
    ProfileImage: "",
    Role: "Staff",
    Status: "Active",
    CreatedDate: "2026-03-15T09:30:00Z"
  },
  // Test Customer User
  {
    UserID: "U005",
    Name: "อภิสิทธิ์ วรศิลป์",
    Phone: "0898765432",
    PasswordHash: "customer123",
    Email: "apisit@gmail.com",
    Address: "128/9 ถนนชนเกษม ต.ตลาด อ.เมือง จ.สุราษฎร์ธานี 84000",
    Province: "สุราษฎร์ธานี",
    District: "เมืองสุราษฎร์ธานี",
    SubDistrict: "ตลาด",
    Latitude: 9.137200,
    Longitude: 99.324500,
    ProfileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=60",
    Role: "Customer",
    Status: "Active",
    CreatedDate: "2026-05-20T11:00:00Z"
  }
];

const defaultStaff: Staff[] = [
  {
    StaffID: "SFT001",
    UserID: "U002",
    Nickname: "เจ้นง",
    Gender: "Female",
    Age: 38,
    Weight: 54,
    Height: 162,
    RegisteredAddress: "45/12 ถนนหน้าเมือง ต.ตลาด อ.เมือง จ.สุราษฎร์ธานี 84000",
    Experience: 8,
    Description: "ถนัดนวดไทยกดจุด แก้อาการออฟฟิศซินโดรม นวดรีดเส้น และนวดประคบสมุนไพร ใจดี พูดจาไพเราะ ยินดีให้บริการในสุราษฎร์ธานีค่ะ",
    Rating: 5.0,
    ReviewCount: 0,
    Credit: 1000,
    Available: "ON",
    VerifyStatus: "Approved",
    CurrentLatitude: 9.141500,
    CurrentLongitude: 99.329200,
    LastLocationUpdate: "2026-06-27T18:50:00Z",
    TotalIncome: 0,
    TotalJobs: 0,
    OfferedServices: ["S001", "S002", "S003"],
    MaxJobDistance: 20,
    Photos: [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&auto=format&fit=crop&q=80"
    ],
    LicenseFile: "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=1000&auto=format&fit=crop&q=80",
    IdCardFile: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1000&auto=format&fit=crop&q=80",
    HouseRegFile: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=1000&auto=format&fit=crop&q=80"
  }
];

const defaultBookings: Booking[] = [];

const defaultTransactions: CreditTransaction[] = [];

const defaultReviews: Review[] = [];

const defaultNotifications: Notification[] = [];

export function getDatabase(): DatabaseSchema {
  // 1. If we have in-memory database cached, return it immediately (fastest & safe from disk race conditions)
  if (inMemoryDB) {
    return inMemoryDB;
  }

  const createInitialDB = (): DatabaseSchema => ({
    users: defaultUsers,
    staff: defaultStaff,
    services: defaultServices,
    bookings: defaultBookings,
    transactions: defaultTransactions,
    reviews: defaultReviews,
    notifications: defaultNotifications,
    settings: defaultSettings
  });

  // 2. Try loading from main DB_PATH
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      if (data && data.trim().length > 0) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && parsed.settings) {
          inMemoryDB = parsed;
          return parsed;
        }
      }
    } catch (error) {
      console.warn("⚠️ Warning: Primary db.json reading failed, checking backup file...", error);
    }
  }

  // 3. Try fallback to backup DB_BAK_PATH
  if (fs.existsSync(DB_BAK_PATH)) {
    try {
      const bakData = fs.readFileSync(DB_BAK_PATH, 'utf8');
      if (bakData && bakData.trim().length > 0) {
        const parsedBak = JSON.parse(bakData);
        if (parsedBak && typeof parsedBak === 'object' && parsedBak.settings) {
          console.log("✅ Successfully recovered database from backup db.json.bak!");
          inMemoryDB = parsedBak;
          // Restore primary file from backup
          saveDatabase(parsedBak);
          return parsedBak;
        }
      }
    } catch (bakError) {
      console.error("Failed to read backup database:", bakError);
    }
  }

  // 4. If neither exists or both failed, initialize default DB
  console.log("ℹ️ Initializing fresh database with defaults...");
  const initialDB = createInitialDB();
  inMemoryDB = initialDB;
  saveDatabase(initialDB);
  return initialDB;
}

export function saveDatabase(db: DatabaseSchema): void {
  // Always update in-memory cache first so all simultaneous requests see latest data immediately
  inMemoryDB = db;

  try {
    const jsonString = JSON.stringify(db, null, 2);
    
    // Atomic write pattern:
    // Write to a temporary file first, then atomically rename it to DB_PATH.
    // This guarantees other read processes never catch the file in a truncated 0-byte or half-written state.
    fs.writeFileSync(DB_TMP_PATH, jsonString, 'utf8');
    fs.renameSync(DB_TMP_PATH, DB_PATH);

    // Also update backup file asynchronously/safely for recovery
    try {
      fs.writeFileSync(DB_BAK_PATH, jsonString, 'utf8');
    } catch {
      // ignore backup write error
    }
  } catch (error) {
    console.error("Failed to save database to disk:", error);
  }
}
