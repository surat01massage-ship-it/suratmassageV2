import { Service, User, Staff, CreditTransaction } from '../types';

export const initialServices: Service[] = [
  {
    ServiceID: "S001",
    ServiceName: "นวดผ่อนคลาย (Relaxing Massage)",
    Detail: "นวดผ่อนคลายความเครียดสะสม คลายความเมื่อยล้าทั่วร่างกาย ปรับสมดุลให้ร่างกายเบาสบาย",
    Duration: 120,
    Price: 598,
    CreditRequired: 200,
    Active: 'ON',
    SortOrder: 1,
    UpdatedAt: new Date().toISOString()
  },
  {
    ServiceID: "S002",
    ServiceName: "นวดแก้อาการ (Therapeutic Massage)",
    Detail: "นวดบำบัดรักษาอาการปวดเมื่อยเฉพาะจุด แก้เส้นตึง พังผืดเกาะ คอบ่าไหล่ ออฟฟิศซินโดรม",
    Duration: 120,
    Price: 598,
    CreditRequired: 200,
    Active: 'ON',
    SortOrder: 2,
    UpdatedAt: new Date().toISOString()
  },
  {
    ServiceID: "S003",
    ServiceName: "นวดแผนไทย (Thai Massage)",
    Detail: "นวดแผนโบราณ กดจุด ยืดเหยียดกล้ามเนื้อ กระตุ้นการไหลเวียนเลือด ทำให้ร่างกายสดชื่น",
    Duration: 120,
    Price: 598,
    CreditRequired: 200,
    Active: 'ON',
    SortOrder: 3,
    UpdatedAt: new Date().toISOString()
  }
];

export const initialUsers: User[] = [
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
    Latitude: 9.145,
    Longitude: 99.336,
    ProfileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=60",
    Role: "Admin",
    Status: "Active",
    CreatedDate: "2026-01-01T08:00:00Z"
  },
  {
    UserID: "U002",
    Name: "พี่สมศรี ใจดี",
    Phone: "0891234567",
    PasswordHash: "123456",
    Email: "somsri@sabaidee.com",
    Address: "เมืองสุราษฎร์ธานี",
    Province: "สุราษฎร์ธานี",
    District: "เมืองสุราษฎร์ธานี",
    SubDistrict: "มะขามเตี้ย",
    Latitude: 9.138244,
    Longitude: 99.321748,
    ProfileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=60",
    Role: "Staff",
    Status: "Active",
    CreatedDate: "2026-01-05T08:00:00Z"
  },
  {
    UserID: "U003",
    Name: "คุณสมชาย ลูกค้าประจำ",
    Phone: "0823456789",
    PasswordHash: "123456",
    Email: "somchai@gmail.com",
    Address: "เมืองสุราษฎร์ธานี",
    Province: "สุราษฎร์ธานี",
    District: "เมืองสุราษฎร์ธานี",
    SubDistrict: "บางกุ้ง",
    Latitude: 9.138244,
    Longitude: 99.321748,
    ProfileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=60",
    Role: "Customer",
    Status: "Active",
    CreatedDate: "2026-01-10T08:00:00Z"
  }
];

export const initialStaff: Staff[] = [
  {
    StaffID: "SFT001",
    UserID: "U002",
    Nickname: "สมศรี",
    Gender: "Female",
    Age: 35,
    Weight: 52,
    Height: 160,
    RegisteredAddress: "สุราษฎร์ธานี",
    Experience: 5,
    Description: "หมอนวดแผนไทยเชี่ยวชาญแก้อาการ คลายเส้น นวดออฟฟิศซินโดรม",
    Rating: 5.0,
    ReviewCount: 18,
    Credit: 200,
    Available: "ON",
    VerifyStatus: "Approved",
    CurrentLatitude: 9.138244,
    CurrentLongitude: 99.321748,
    LastLocationUpdate: new Date().toISOString(),
    TotalIncome: 12000,
    TotalJobs: 25,
    OfferedServices: ["S001", "S002", "S003"],
    MaxJobDistance: 25,
    Photos: ["https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80"]
  }
];

export const initialTransactions: CreditTransaction[] = [
  {
    TransactionID: "TX001",
    StaffID: "SFT001",
    Amount: 200,
    BeforeCredit: 0,
    AfterCredit: 200,
    Type: "Topup",
    SlipImage: "",
    Status: "Approved",
    AdminRemark: "🎁 โบนัสต้อนรับพนักงานใหม่ 200 เครดิต (รับงานฟรี 1 ครั้ง)",
    CreatedDate: "2026-01-05T08:05:00Z"
  }
];
