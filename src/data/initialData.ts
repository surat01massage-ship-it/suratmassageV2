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
  }
];

export const initialStaff: Staff[] = [];

export const initialTransactions: CreditTransaction[] = [];

