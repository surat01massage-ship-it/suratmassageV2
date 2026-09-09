/**
 * SabaiDee Massage Types Definitions
 * Matching Google Sheets database structure exactly
 */

export interface User {
  UserID: string;
  Name: string;
  Phone: string;
  PasswordHash: string; // Stored as simple hash
  Email: string;
  Address: string;
  Province: string;
  District: string;
  SubDistrict: string;
  Latitude: number;
  Longitude: number;
  ProfileImage: string;
  Role: 'Customer' | 'Staff' | 'Admin';
  Status: 'Active' | 'Inactive';
  CreatedDate: string;
}

export interface Staff {
  StaffID: string;
  UserID: string;
  Nickname: string;
  Gender: 'Male' | 'Female' | 'Other';
  Age: number;
  Weight?: number;
  Height?: number;
  RegisteredAddress?: string;
  Experience: number; // in years
  Description: string;
  Rating: number;
  ReviewCount: number;
  Credit: number;
  Available: 'ON' | 'OFF';
  VerifyStatus: 'Pending' | 'Approved' | 'Reject';
  CurrentLatitude: number;
  CurrentLongitude: number;
  LastLocationUpdate: string;
  TotalIncome: number;
  TotalJobs: number;
  OfferedServices?: string[]; // Array of ServiceIDs the staff offers
  MaxJobDistance?: number; // Max distance in km the staff is willing to travel
  Photos?: string[]; // Staff portfolio/album photos
  LicenseFile?: string; // ใบอนุญาต
  IdCardFile?: string; // สำเนาบัตรประชาชน
  HouseRegFile?: string; // สำเนาทะเบียนบ้าน
}

export interface Service {
  ServiceID: string;
  ServiceName: string;
  Detail: string;
  Duration: number; // in minutes
  Price: number; // in THB
  CreditRequired: number; // minimum credit required by staff to accept
  Active: 'ON' | 'OFF';
  SortOrder: number;
}

export type BookingStatus = 'Waiting' | 'Accepted' | 'Working' | 'Completed' | 'Cancel';

export interface Booking {
  BookingID: string;
  CustomerID: string;
  StaffID: string; // can be empty "none" when waiting
  BookingDate: string;
  BookingTime: string;
  ServiceID: string; // Single or multiple service ids (comma-separated or single)
  ServicePrice: number;
  Distance: number; // in km
  TravelFee: number;
  TotalPrice: number;
  CustomerLatitude: number;
  CustomerLongitude: number;
  CustomerAddress: string;
  Status: BookingStatus;
  PaymentStatus: 'Unpaid' | 'Paid';
  CreatedDate: string;
  CancellationReason?: string;
}

export interface CreditTransaction {
  TransactionID: string;
  StaffID: string;
  Amount: number;
  BeforeCredit: number;
  AfterCredit: number;
  Type: 'Topup' | 'Deduct' | 'Refund';
  SlipImage: string; // Base64 or mock URL
  BookingID?: string;
  Status: 'Pending' | 'Approved' | 'Reject';
  AdminRemark: string;
  CreatedDate: string;
  SlipRefId?: string;
  BankName?: string;
  IsAutoApproved?: boolean;
  SlipVerificationDetail?: string;
  IsSuspicious?: boolean;
  SuspiciousReasons?: string[];
  ConfidenceScore?: number;
  ExtractedReceiver?: string;
  ExtractedSender?: string;
  ExtractedTransferTime?: string;
}

export interface Review {
  ReviewID: string;
  BookingID: string;
  CustomerID: string;
  StaffID: string;
  Score: number; // 1-5
  Comment: string;
  CreatedDate: string;
}

export interface Notification {
  NotificationID: string;
  UserID: string;
  Title: string;
  Detail: string;
  ReadStatus: 'Unread' | 'Read';
  CreatedDate: string;
}

export interface TravelFeeTier {
  minKm: number;
  maxKm: number;
  fee: number;
}

export interface AppSettings {
  companyName: string;
  logo: string;
  themeColor: string; // hex code
  travelFeePerKm: number;
  travelFeeTiers: TravelFeeTier[];
  commissionRate: number; // percentage, e.g. 15
  minCredit: number; // general minimum credit
  searchRadius: number; // in km
  systemOpen: 'ON' | 'OFF';
  contactPhone: string;
  lineOA: string;
  facebook: string;
  businessHours: string;
  bannerText: string;
  promotionText: string;
  couponCode: string;
  couponDiscount: number;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  qrCodeImage?: string;
  googleSheetWebhookUrl?: string;
  autoSyncGoogleSheet?: boolean;
  lineChannelAccessToken?: string;
  lineAdminUserId?: string;
  enableLineAdminNotify?: boolean;
}
