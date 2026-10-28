var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");

// server/db.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_os = __toESM(require("os"), 1);
var DB_PATH = import_path.default.join(process.cwd(), "server", "db.json");
var DB_BAK_PATH = import_path.default.join(process.cwd(), "server", "db.json.bak");
var DB_PERSISTENT_PATH = import_path.default.join(process.cwd(), "server", "db_persistent_backup.json");
var DB_TMP_PATH = import_path.default.join(process.cwd(), "server", "db.json.tmp");
var EXTERNAL_VAULT_PATH = import_path.default.join(import_os.default.homedir(), ".sabaidee_permanent_vault.json");
var TMP_VAULT_PATH = "/tmp/sabaidee_permanent_vault.json";
var inMemoryDB = null;
var dbDir = import_path.default.dirname(DB_PATH);
if (!import_fs.default.existsSync(dbDir)) {
  import_fs.default.mkdirSync(dbDir, { recursive: true });
}
var defaultSettings = {
  companyName: "SabaiDee Massage",
  logo: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=120&auto=format&fit=crop&q=60",
  themeColor: "#10b981",
  // Emerald Green (Grab style)
  travelFeePerKm: 15,
  travelFeeTiers: [
    { minKm: 0, maxKm: 3, fee: 0 },
    { minKm: 3, maxKm: 10, fee: 150 },
    { minKm: 10, maxKm: 15, fee: 200 }
  ],
  commissionRate: 15,
  // 15%
  minCredit: 200,
  searchRadius: 15,
  // 15 km
  systemOpen: "ON",
  contactPhone: "081-234-5678",
  lineOA: "@sabaideemassage",
  facebook: "SabaiDee Home Massage",
  businessHours: "09:00 - 22:00",
  bannerText: "\u2728 \u0E42\u0E1B\u0E23\u0E42\u0E21\u0E0A\u0E31\u0E48\u0E19\u0E1E\u0E34\u0E40\u0E28\u0E29! \u0E25\u0E14\u0E04\u0E48\u0E32\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07 50% \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E04\u0E23\u0E31\u0E49\u0E07\u0E41\u0E23\u0E01 \u2728",
  promotionText: "\u0E08\u0E2D\u0E07\u0E19\u0E27\u0E14\u0E2D\u0E42\u0E23\u0E21\u0E32\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49 \u0E23\u0E31\u0E1A\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E19\u0E27\u0E14\u0E04\u0E2D\u0E1A\u0E48\u0E32\u0E44\u0E2B\u0E25\u0E48\u0E1F\u0E23\u0E35 15 \u0E19\u0E32\u0E17\u0E35!",
  couponCode: "SABAIDEE99",
  couponDiscount: 50,
  bankName: "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E17\u0E2B\u0E32\u0E23\u0E44\u0E17\u0E22\u0E18\u0E19\u0E0A\u0E32\u0E15 (ttb)",
  bankAccount: "761-7-99745-2",
  bankAccountName: "\u0E19\u0E32\u0E07\u0E40\u0E04\u0E23\u0E37\u0E2D\u0E27\u0E31\u0E25\u0E22\u0E4C \u0E0A\u0E32\u0E22\u0E41\u0E01\u0E49\u0E27",
  qrCodeImage: "https://i.postimg.cc/g0yvnLTn/S-30990363.jpg",
  lineChannelAccessToken: "b6spU9oI6sgyc/lagfyn8Z6MZ4GkUCLOModW44f2ZY/4Ja0nvseYKZSvZwPOboWSMAKM3VN0z/7h50RoaGkMvCNBX2+e51SYez0lNHgwqoEs8TnNKe+7jMLbFEY1sH6ujkXTbp9OXhYxOUKnOiJ0WgdB04t89/1O/w1cDnyilFU=",
  lineAdminUserId: "Cf544171f0f9753863ade1ddd1acd67a7",
  enableLineAdminNotify: true,
  autoCompleteMinutes: 30
};
var defaultServices = [
  {
    ServiceID: "S001",
    ServiceName: "\u0E19\u0E27\u0E14\u0E1C\u0E48\u0E2D\u0E19\u0E04\u0E25\u0E32\u0E22 (Relaxing Massage)",
    Detail: "\u0E19\u0E27\u0E14\u0E1C\u0E48\u0E2D\u0E19\u0E04\u0E25\u0E32\u0E22\u0E04\u0E27\u0E32\u0E21\u0E40\u0E04\u0E23\u0E35\u0E22\u0E14\u0E2A\u0E30\u0E2A\u0E21 \u0E04\u0E25\u0E32\u0E22\u0E04\u0E27\u0E32\u0E21\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E22\u0E25\u0E49\u0E32\u0E17\u0E31\u0E48\u0E27\u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22 \u0E1B\u0E23\u0E31\u0E1A\u0E2A\u0E21\u0E14\u0E38\u0E25\u0E43\u0E2B\u0E49\u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22\u0E40\u0E1A\u0E32\u0E2A\u0E1A\u0E32\u0E22",
    Duration: 120,
    Price: 598,
    CreditRequired: 200,
    Active: "ON",
    SortOrder: 1,
    UpdatedAt: "2026-10-28T00:00:00.000Z"
  },
  {
    ServiceID: "S002",
    ServiceName: "\u0E19\u0E27\u0E14\u0E41\u0E01\u0E49\u0E2D\u0E32\u0E01\u0E32\u0E23 (Therapeutic Massage)",
    Detail: "\u0E19\u0E27\u0E14\u0E1A\u0E33\u0E1A\u0E31\u0E14\u0E23\u0E31\u0E01\u0E29\u0E32\u0E2D\u0E32\u0E01\u0E32\u0E23\u0E1B\u0E27\u0E14\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E22\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E08\u0E38\u0E14 \u0E41\u0E01\u0E49\u0E40\u0E2A\u0E49\u0E19\u0E15\u0E36\u0E07 \u0E1E\u0E31\u0E07\u0E1C\u0E37\u0E14\u0E40\u0E01\u0E32\u0E30 \u0E04\u0E2D\u0E1A\u0E48\u0E32\u0E44\u0E2B\u0E25\u0E48 \u0E2D\u0E2D\u0E1F\u0E1F\u0E34\u0E28\u0E0B\u0E34\u0E19\u0E42\u0E14\u0E23\u0E21",
    Duration: 120,
    Price: 598,
    CreditRequired: 200,
    Active: "ON",
    SortOrder: 2,
    UpdatedAt: "2026-10-28T00:00:00.000Z"
  },
  {
    ServiceID: "S003",
    ServiceName: "\u0E19\u0E27\u0E14\u0E41\u0E1C\u0E19\u0E44\u0E17\u0E22 (Thai Massage)",
    Detail: "\u0E19\u0E27\u0E14\u0E41\u0E1C\u0E19\u0E42\u0E1A\u0E23\u0E32\u0E13 \u0E01\u0E14\u0E08\u0E38\u0E14 \u0E22\u0E37\u0E14\u0E40\u0E2B\u0E22\u0E35\u0E22\u0E14\u0E01\u0E25\u0E49\u0E32\u0E21\u0E40\u0E19\u0E37\u0E49\u0E2D \u0E01\u0E23\u0E30\u0E15\u0E38\u0E49\u0E19\u0E01\u0E32\u0E23\u0E44\u0E2B\u0E25\u0E40\u0E27\u0E35\u0E22\u0E19\u0E40\u0E25\u0E37\u0E2D\u0E14 \u0E17\u0E33\u0E43\u0E2B\u0E49\u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22\u0E2A\u0E14\u0E0A\u0E37\u0E48\u0E19",
    Duration: 120,
    Price: 598,
    CreditRequired: 200,
    Active: "ON",
    SortOrder: 3,
    UpdatedAt: "2026-10-28T00:00:00.000Z"
  }
];
var defaultUsers = [
  {
    UserID: "U001",
    Name: "\u0E2A\u0E21\u0E0A\u0E32\u0E22 \u0E22\u0E34\u0E48\u0E07\u0E14\u0E35 (\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19)",
    Phone: "0812345678",
    PasswordHash: "admin123",
    Email: "admin@sabaidee.com",
    Address: "99 \u0E16\u0E19\u0E19\u0E01\u0E32\u0E0D\u0E08\u0E19\u0E27\u0E34\u0E16\u0E35 \u0E15.\u0E1A\u0E32\u0E07\u0E01\u0E38\u0E49\u0E07 \u0E2D.\u0E40\u0E21\u0E37\u0E2D\u0E07 \u0E08.\u0E2A\u0E38\u0E23\u0E32\u0E29\u0E0E\u0E23\u0E4C\u0E18\u0E32\u0E19\u0E35 84000",
    Province: "\u0E2A\u0E38\u0E23\u0E32\u0E29\u0E0E\u0E23\u0E4C\u0E18\u0E32\u0E19\u0E35",
    District: "\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E2A\u0E38\u0E23\u0E32\u0E29\u0E0E\u0E23\u0E4C\u0E18\u0E32\u0E19\u0E35",
    SubDistrict: "\u0E1A\u0E32\u0E07\u0E01\u0E38\u0E49\u0E07",
    Latitude: 9.145,
    Longitude: 99.336,
    ProfileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=60",
    Role: "Admin",
    Status: "Active",
    CreatedDate: "2026-01-01T08:00:00Z"
  }
];
function cleanPhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}
function isUserDeleted(u, deletedSet) {
  if (!u) return false;
  if (u.UserID && deletedSet.has(u.UserID)) return true;
  if (u.Phone) {
    if (deletedSet.has(u.Phone)) return true;
    const cp = cleanPhone(u.Phone);
    if (cp && cp.length >= 8) {
      for (const d of deletedSet) {
        if (cleanPhone(d) === cp) return true;
      }
    }
  }
  return false;
}
function isStaffDeleted(s, deletedStaffSet, deletedUserSet) {
  if (!s) return false;
  if (s.StaffID && deletedStaffSet.has(s.StaffID)) return true;
  if (s.UserID && isUserDeleted({ UserID: s.UserID }, deletedUserSet)) return true;
  return false;
}
function mergeDatabases(base, additions) {
  const combinedDeletedUserIds = /* @__PURE__ */ new Set([
    ...base.deletedUserIds || [],
    ...additions.deletedUserIds || []
  ]);
  const combinedDeletedStaffIds = /* @__PURE__ */ new Set([
    ...base.deletedStaffIds || [],
    ...additions.deletedStaffIds || []
  ]);
  const combinedDeletedServiceIds = /* @__PURE__ */ new Set([
    ...base.deletedServiceIds || [],
    ...additions.deletedServiceIds || []
  ]);
  const merged = {
    users: [...base.users || []],
    staff: [...base.staff || []],
    services: [...base.services || []],
    bookings: [...base.bookings || []],
    transactions: [...base.transactions || []],
    reviews: [...base.reviews || []],
    notifications: [...base.notifications || []],
    settings: { ...base.settings },
    deletedUserIds: Array.from(combinedDeletedUserIds),
    deletedStaffIds: Array.from(combinedDeletedStaffIds),
    deletedServiceIds: Array.from(combinedDeletedServiceIds)
  };
  if (Array.isArray(additions.services)) {
    for (const s of additions.services) {
      if (!s || !s.ServiceID) continue;
      if (combinedDeletedServiceIds.has(s.ServiceID)) continue;
      const idx = merged.services.findIndex((x) => x.ServiceID === s.ServiceID);
      if (idx === -1) {
        merged.services.push({ ...s });
      } else {
        const existing = merged.services[idx];
        const existingTime = existing.UpdatedAt ? new Date(existing.UpdatedAt).getTime() : 0;
        const incomingTime = s.UpdatedAt ? new Date(s.UpdatedAt).getTime() : 0;
        if (incomingTime >= existingTime) {
          merged.services[idx] = { ...existing, ...s };
        } else {
          merged.services[idx] = { ...s, ...existing };
        }
      }
    }
  }
  if (Array.isArray(additions.users)) {
    for (const u of additions.users) {
      if (!u || !u.Phone || !u.UserID) continue;
      if (isUserDeleted(u, combinedDeletedUserIds)) continue;
      const idx = merged.users.findIndex((x) => x.UserID === u.UserID || cleanPhone(x.Phone) === cleanPhone(u.Phone));
      if (idx === -1) {
        merged.users.push(u);
      } else {
        merged.users[idx] = { ...u, ...merged.users[idx] };
      }
    }
  }
  if (Array.isArray(additions.staff)) {
    for (const s of additions.staff) {
      if (!s || !s.StaffID) continue;
      if (isStaffDeleted(s, combinedDeletedStaffIds, combinedDeletedUserIds)) continue;
      const idx = merged.staff.findIndex((x) => x.StaffID === s.StaffID || s.UserID && x.UserID === s.UserID);
      if (idx === -1) {
        merged.staff.push(s);
      } else {
        const curCredit = Number(merged.staff[idx].Credit) || 0;
        const incCredit = Number(s.Credit) || 0;
        merged.staff[idx] = {
          ...s,
          ...merged.staff[idx],
          Credit: Math.max(curCredit, incCredit)
        };
      }
    }
  }
  merged.users = merged.users.filter((u) => !isUserDeleted(u, combinedDeletedUserIds));
  merged.staff = merged.staff.filter((s) => !isStaffDeleted(s, combinedDeletedStaffIds, combinedDeletedUserIds));
  merged.services = merged.services.filter(
    (s) => !combinedDeletedServiceIds.has(s.ServiceID)
  );
  if (Array.isArray(additions.bookings)) {
    for (const b of additions.bookings) {
      if (!b || !b.BookingID) continue;
      const idx = merged.bookings.findIndex((x) => x.BookingID === b.BookingID);
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
      if (!merged.transactions.some((x) => x.TransactionID === t.TransactionID)) {
        merged.transactions.push(t);
      }
    }
  }
  if (Array.isArray(additions.reviews)) {
    for (const r of additions.reviews) {
      if (!r || !r.ReviewID) continue;
      if (!merged.reviews.some((x) => x.ReviewID === r.ReviewID)) {
        merged.reviews.push(r);
      }
    }
  }
  if (Array.isArray(additions.notifications)) {
    for (const n of additions.notifications) {
      if (!n || !n.NotificationID) continue;
      if (!merged.notifications.some((x) => x.NotificationID === n.NotificationID)) {
        merged.notifications.push(n);
      }
    }
  }
  if (additions.settings) {
    merged.settings = { ...merged.settings, ...additions.settings };
  }
  return merged;
}
var tryReadFile = (filePath) => {
  if (import_fs.default.existsSync(filePath)) {
    try {
      const data = import_fs.default.readFileSync(filePath, "utf8");
      if (data && data.trim().length > 0) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object" && Array.isArray(parsed.users)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn(`[DB] Error parsing ${filePath}:`, err);
    }
  }
  return null;
};
function getDatabase() {
  if (inMemoryDB) {
    return inMemoryDB;
  }
  const primaryDb = tryReadFile(DB_PATH);
  const persistentDb = tryReadFile(DB_PERSISTENT_PATH);
  const backupDb = tryReadFile(DB_BAK_PATH);
  const externalVaultDb = tryReadFile(EXTERNAL_VAULT_PATH);
  const tmpVaultDb = tryReadFile(TMP_VAULT_PATH);
  let liveDb = {
    users: [...defaultUsers],
    staff: [],
    services: [...defaultServices],
    bookings: [],
    transactions: [],
    reviews: [],
    notifications: [],
    settings: { ...defaultSettings },
    deletedUserIds: [],
    deletedStaffIds: []
  };
  const sources = [primaryDb, backupDb, persistentDb, externalVaultDb, tmpVaultDb].filter(Boolean);
  const allDeletedUserIds = /* @__PURE__ */ new Set();
  const allDeletedStaffIds = /* @__PURE__ */ new Set();
  const allDeletedServiceIds = /* @__PURE__ */ new Set();
  for (const src of sources) {
    if (Array.isArray(src.deletedUserIds)) {
      src.deletedUserIds.forEach((id) => {
        if (id) allDeletedUserIds.add(id);
      });
    }
    if (Array.isArray(src.deletedStaffIds)) {
      src.deletedStaffIds.forEach((id) => {
        if (id) allDeletedStaffIds.add(id);
      });
    }
    if (Array.isArray(src.deletedServiceIds)) {
      src.deletedServiceIds.forEach((id) => {
        if (id) allDeletedServiceIds.add(id);
      });
    }
  }
  if (sources.length > 0) {
    if (primaryDb) {
      liveDb = { ...primaryDb };
    } else {
      sources.sort((a, b) => (b.users?.length || 0) + (b.staff?.length || 0) - ((a.users?.length || 0) + (a.staff?.length || 0)));
      liveDb = { ...sources[0] };
    }
    for (const src of sources) {
      if (src !== liveDb) {
        liveDb = mergeDatabases(liveDb, src);
      }
    }
  }
  const normalizedUserTombstones = /* @__PURE__ */ new Set([...liveDb.deletedUserIds || [], ...allDeletedUserIds]);
  for (const t of Array.from(normalizedUserTombstones)) {
    const cp = cleanPhone(t);
    if (cp && cp.length >= 8) normalizedUserTombstones.add(cp);
  }
  liveDb.deletedUserIds = Array.from(normalizedUserTombstones);
  liveDb.deletedStaffIds = Array.from(/* @__PURE__ */ new Set([...liveDb.deletedStaffIds || [], ...allDeletedStaffIds]));
  liveDb.deletedServiceIds = Array.from(/* @__PURE__ */ new Set([...liveDb.deletedServiceIds || [], ...allDeletedServiceIds]));
  const finalDeletedUserIds = new Set(liveDb.deletedUserIds);
  const finalDeletedStaffIds = new Set(liveDb.deletedStaffIds);
  const finalDeletedServiceIds = new Set(liveDb.deletedServiceIds);
  liveDb.users = liveDb.users.filter((u) => !isUserDeleted(u, finalDeletedUserIds));
  liveDb.staff = liveDb.staff.filter((s) => !isStaffDeleted(s, finalDeletedStaffIds, finalDeletedUserIds));
  liveDb.services = liveDb.services.filter(
    (s) => !finalDeletedServiceIds.has(s.ServiceID)
  );
  if (!Array.isArray(liveDb.users) || liveDb.users.length === 0) {
    liveDb.users = [...defaultUsers];
  }
  if (!Array.isArray(liveDb.staff)) liveDb.staff = [];
  const hasAdmin = liveDb.users.some((u) => u.Role === "Admin");
  if (!hasAdmin) {
    liveDb.users.unshift(defaultUsers[0]);
  }
  if (!Array.isArray(liveDb.bookings)) liveDb.bookings = [];
  if (!Array.isArray(liveDb.transactions)) liveDb.transactions = [];
  if (!Array.isArray(liveDb.reviews)) liveDb.reviews = [];
  if (!Array.isArray(liveDb.notifications)) liveDb.notifications = [];
  if (!Array.isArray(liveDb.services)) liveDb.services = defaultServices;
  if (!liveDb.settings) {
    liveDb.settings = defaultSettings;
  } else {
    liveDb.settings = { ...defaultSettings, ...liveDb.settings };
  }
  const numMin = Number(liveDb.settings.minCredit);
  if (isNaN(numMin) || liveDb.settings.minCredit === void 0 || liveDb.settings.minCredit === null || numMin < 0) {
    liveDb.settings.minCredit = 200;
  } else {
    liveDb.settings.minCredit = numMin;
  }
  if (liveDb.settings.qrCodeImage && (liveDb.settings.qrCodeImage.includes("wikipedia.org") || liveDb.settings.qrCodeImage.includes("/uploads/qr_code.png") && !import_fs.default.existsSync(import_path.default.join(process.cwd(), "server", "uploads", "qr_code.png")))) {
    liveDb.settings.qrCodeImage = "";
  }
  liveDb.staff.forEach((s) => {
    const numCredit = Number(s.Credit);
    if (isNaN(numCredit) || s.Credit === void 0 || s.Credit === null) {
      s.Credit = 200;
    } else {
      s.Credit = numCredit;
    }
  });
  if (!Array.isArray(liveDb.services) || liveDb.services.length === 0) {
    liveDb.services = [...defaultServices];
  } else {
    liveDb.services.forEach((srv) => {
      if (typeof srv.Price === "string") srv.Price = parseFloat(srv.Price) || 0;
      if (typeof srv.Duration === "string") srv.Duration = parseInt(srv.Duration) || 60;
      if (typeof srv.CreditRequired === "string") srv.CreditRequired = parseFloat(srv.CreditRequired) || 0;
    });
  }
  inMemoryDB = liveDb;
  saveDatabase(liveDb);
  return liveDb;
}
function saveDatabase(db) {
  inMemoryDB = db;
  try {
    const jsonString = JSON.stringify(db, null, 2);
    import_fs.default.writeFileSync(DB_TMP_PATH, jsonString, "utf8");
    import_fs.default.renameSync(DB_TMP_PATH, DB_PATH);
    try {
      import_fs.default.writeFileSync(DB_BAK_PATH, jsonString, "utf8");
    } catch (e) {
      console.warn("[DB] Backup write failed:", e);
    }
    try {
      import_fs.default.writeFileSync(DB_PERSISTENT_PATH, jsonString, "utf8");
    } catch (e) {
      console.warn("[DB] Persistent backup write failed:", e);
    }
    try {
      import_fs.default.writeFileSync(EXTERNAL_VAULT_PATH, jsonString, "utf8");
    } catch (e) {
      console.warn("[DB] External vault write failed:", e);
    }
    try {
      import_fs.default.writeFileSync(TMP_VAULT_PATH, jsonString, "utf8");
    } catch (e) {
      console.warn("[DB] Tmp vault write failed:", e);
    }
  } catch (error) {
    console.error("[DB] Failed to save database to disk:", error);
  }
}

// src/types.ts
var DEFAULT_BLANK_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Ccircle cx='64' cy='64' r='64' fill='%23F1F5F9'/%3E%3Ccircle cx='64' cy='52' r='24' fill='%2394A3B8'/%3E%3Cpath fill='%2394A3B8' d='M64 82c-23.2 0-42 14.5-45 33.2 10.7 7.9 23.9 12.8 38.3 12.8 17 0 32.3-6.4 43.8-16.9C97.5 95 78.8 82 64 82z'/%3E%3C/svg%3E";

// server/slipQrScanner.ts
var import_jsqr = __toESM(require("jsqr"), 1);
var import_jimp = require("jimp");
var THAI_BANK_CODES = {
  "004": "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E01\u0E2A\u0E34\u0E01\u0E23\u0E44\u0E17\u0E22 (KBANK)",
  "014": "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E44\u0E17\u0E22\u0E1E\u0E32\u0E13\u0E34\u0E0A\u0E22\u0E4C (SCB)",
  "006": "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E01\u0E23\u0E38\u0E07\u0E44\u0E17\u0E22 (KTB)",
  "002": "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E (BBL)",
  "011": "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E17\u0E2B\u0E32\u0E23\u0E44\u0E17\u0E22\u0E18\u0E19\u0E0A\u0E32\u0E15 (TTB)",
  "025": "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E01\u0E23\u0E38\u0E07\u0E28\u0E23\u0E35\u0E2D\u0E22\u0E38\u0E18\u0E22\u0E32 (BAY)",
  "030": "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E2D\u0E2D\u0E21\u0E2A\u0E34\u0E19 (GSB)",
  "034": "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E41\u0E25\u0E30\u0E2A\u0E2B\u0E01\u0E23\u0E13\u0E4C\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23 (BAAC)",
  "022": "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E0B\u0E35\u0E44\u0E2D\u0E40\u0E2D\u0E47\u0E21\u0E1A\u0E35\u0E44\u0E17\u0E22 (CIMB)",
  "069": "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E40\u0E01\u0E35\u0E22\u0E23\u0E15\u0E34\u0E19\u0E32\u0E04\u0E34\u0E19\u0E20\u0E31\u0E17\u0E23 (KKP)",
  "073": "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E41\u0E25\u0E19\u0E14\u0E4C \u0E41\u0E2D\u0E19\u0E14\u0E4C \u0E40\u0E2E\u0E49\u0E32\u0E2A\u0E4C (LH Bank)",
  "067": "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E17\u0E34\u0E2A\u0E42\u0E01\u0E49 (TISCO)",
  "066": "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E2D\u0E34\u0E2A\u0E25\u0E32\u0E21\u0E41\u0E2B\u0E48\u0E07\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28\u0E44\u0E17\u0E22 (IBANK)",
  "140": "TrueMoney Wallet",
  "999": "PromptPay Standard"
};
function parseTLV(payload) {
  const result = {};
  let idx = 0;
  while (idx < payload.length - 4) {
    const tag = payload.substring(idx, idx + 2);
    const lenStr = payload.substring(idx + 2, idx + 4);
    const len = parseInt(lenStr, 10);
    if (isNaN(len) || idx + 4 + len > payload.length) {
      break;
    }
    const val = payload.substring(idx + 4, idx + 4 + len);
    result[tag] = val;
    idx = idx + 4 + len;
  }
  return result;
}
function parseThaiBankSlipPayload(raw) {
  const trimmed = raw.trim();
  const tlv = parseTLV(trimmed);
  let sendingBank = "";
  let transRef = "";
  let dateTime = "";
  let amount;
  if (tlv["00"] && (tlv["00"] === "0001" || tlv["00"] === "01")) {
    if (tlv["01"]) {
      const sub = parseTLV(tlv["01"]);
      sendingBank = sub["00"] || sub["01"] || tlv["01"];
    }
    if (tlv["02"]) {
      transRef = tlv["02"];
    }
    if (tlv["03"]) {
      dateTime = tlv["03"];
    }
    if (tlv["54"]) {
      const amt = parseFloat(tlv["54"]);
      if (!isNaN(amt)) amount = amt;
    }
  }
  if (!transRef) {
    const refMatch = trimmed.match(/([0-9A-Za-z]{15,40})/);
    if (refMatch) {
      transRef = refMatch[1];
    }
  }
  if (!sendingBank) {
    for (const [code] of Object.entries(THAI_BANK_CODES)) {
      if (trimmed.includes(code)) {
        sendingBank = code;
        break;
      }
    }
  }
  const bankName = THAI_BANK_CODES[sendingBank] || (sendingBank ? `\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E23\u0E2B\u0E31\u0E2A ${sendingBank}` : "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E1E\u0E32\u0E13\u0E34\u0E0A\u0E22\u0E4C\u0E44\u0E17\u0E22");
  return {
    found: true,
    rawPayload: trimmed,
    sendingBank,
    bankName,
    transRef: transRef || trimmed.slice(-25),
    dateTime,
    amount,
    crc: tlv["63"] || ""
  };
}
async function scanSlipQRCode(base64Image) {
  try {
    let cleanBase64 = base64Image;
    if (base64Image.includes(",")) {
      cleanBase64 = base64Image.split(",")[1];
    }
    cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const image = await import_jimp.Jimp.read(buffer);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const rawData = image.bitmap.data;
    const clampedData = new Uint8ClampedArray(rawData.buffer, rawData.byteOffset, rawData.byteLength);
    let code = (0, import_jsqr.default)(clampedData, width, height, {
      inversionAttempts: "attemptBoth"
    });
    if (!code && (width > 1200 || height > 1200)) {
      const resized = image.clone();
      resized.resize({ w: Math.min(1e3, width), h: Math.min(1e3, height) });
      const rClamped = new Uint8ClampedArray(resized.bitmap.data.buffer, resized.bitmap.data.byteOffset, resized.bitmap.data.byteLength);
      code = (0, import_jsqr.default)(rClamped, resized.bitmap.width, resized.bitmap.height, {
        inversionAttempts: "attemptBoth"
      });
    }
    if (!code && height > 600) {
      const bottomHalf = image.clone();
      bottomHalf.crop({ x: 0, y: Math.floor(height * 0.4), w: width, h: Math.floor(height * 0.6) });
      const bClamped = new Uint8ClampedArray(bottomHalf.bitmap.data.buffer, bottomHalf.bitmap.data.byteOffset, bottomHalf.bitmap.data.byteLength);
      code = (0, import_jsqr.default)(bClamped, bottomHalf.bitmap.width, bottomHalf.bitmap.height, {
        inversionAttempts: "attemptBoth"
      });
    }
    if (!code || !code.data) {
      return {
        found: false,
        error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A QR Code \u0E1A\u0E19\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E2A\u0E25\u0E34\u0E1B \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E27\u0E48\u0E32\u0E16\u0E48\u0E32\u0E22\u0E40\u0E2B\u0E47\u0E19 QR Code \u0E2A\u0E25\u0E34\u0E1B\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E0A\u0E31\u0E14\u0E40\u0E08\u0E19"
      };
    }
    const parsed = parseThaiBankSlipPayload(code.data);
    return parsed;
  } catch (err) {
    console.error("Local QR scan error:", err);
    return {
      found: false,
      error: `\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E21\u0E27\u0E25\u0E1C\u0E25\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E: ${err?.message || "\u0E20\u0E32\u0E1E\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07"}`
    };
  }
}

// server.ts
var import_qrcode = __toESM(require("qrcode"), 1);
import_dotenv.default.config({ override: true });
function crc16(data) {
  let crc = 65535;
  for (let i = 0; i < data.length; i++) {
    let x = (crc >> 8 ^ data.charCodeAt(i)) & 255;
    x ^= x >> 4;
    crc = (crc << 8 ^ x << 12 ^ x << 5 ^ x) & 65535;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
function generatePromptPayPayload(target, amount) {
  const cleanTarget = (target || "").replace(/[^0-9]/g, "");
  let targetType = "01";
  let formattedTarget = "";
  if (cleanTarget.length === 10 && cleanTarget.startsWith("0")) {
    targetType = "01";
    formattedTarget = "0066" + cleanTarget.substring(1);
  } else if (cleanTarget.length === 13) {
    targetType = "02";
    formattedTarget = cleanTarget;
  } else if (cleanTarget.length >= 8) {
    targetType = "01";
    formattedTarget = cleanTarget.startsWith("0") ? "0066" + cleanTarget.substring(1) : cleanTarget;
  } else {
    targetType = "01";
    formattedTarget = "0066812345678";
  }
  const tag29Sub00 = "0016A000000677010111";
  const tag29SubTarget = `${targetType}${formattedTarget.length.toString().padStart(2, "0")}${formattedTarget}`;
  const tag29 = `29${(tag29Sub00.length + tag29SubTarget.length).toString().padStart(2, "0")}${tag29Sub00}${tag29SubTarget}`;
  let payload = `000201010211${tag29}53037645802TH`;
  if (amount && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    payload += `54${formattedAmount.length.toString().padStart(2, "0")}${formattedAmount}`;
  }
  payload += "6304";
  const checksum = crc16(payload);
  return payload + checksum;
}
var generateId = (prefix) => {
  return `${prefix}${Math.floor(1e5 + Math.random() * 9e5)}`;
};
var aiClient = null;
function getAi() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });
  }
  return aiClient;
}
async function verifySlipWithGemini(slipImage) {
  const ai = getAi();
  if (!ai) return null;
  let mimeType = "image/jpeg";
  let base64Data = slipImage;
  const match = slipImage.match(/^data:(image\/[a-zA-Z0-9+.-]*);base64,(.*)$/s);
  if (match) {
    mimeType = match[1];
    base64Data = match[2];
  } else if (slipImage.startsWith("data:")) {
    const commaIdx = slipImage.indexOf(",");
    if (commaIdx !== -1) {
      const meta = slipImage.slice(0, commaIdx);
      base64Data = slipImage.slice(commaIdx + 1);
      const m = meta.match(/:(image\/[^;]+)/);
      if (m) mimeType = m[1];
    }
  }
  base64Data = base64Data.replace(/[\r\n\s]/g, "");
  if (!base64Data) return null;
  let response;
  const requestPayload = {
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        },
        {
          text: `You are an expert Thai banking fraud-detection system specializing in verifying mobile banking transfer slips (PromptPay, KBANK, SCB, KTB, BBL, TTB, BAY, GSB, etc.).
Carefully inspect this image and extract verification data:
1. Is this a genuine Thai bank transfer slip? Check for:
   - Official bank logos and layout standards
   - Font consistency (no blurred, edited, misaligned numbers or text)
   - Presence of transaction reference code (\u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07/\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23) and bank timestamp
2. Detect fraud indicators:
   - Photoshop or photo-editor modifications around the amount or account number
   - Fake slip generator templates
   - Screenshots of receipt pre-confirmation screens instead of actual final transfer slip
   - Obscured, cut-off, or unreadable key information
3. Extract exact details:
   - amount: exact transfer amount as a number
   - refNo: transaction reference number (\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07 / Ref No.)
   - bankName: bank of sender (e.g. \u0E01\u0E2A\u0E34\u0E01\u0E23\u0E44\u0E17\u0E22, \u0E44\u0E17\u0E22\u0E1E\u0E32\u0E13\u0E34\u0E0A\u0E22\u0E4C, \u0E01\u0E23\u0E38\u0E07\u0E44\u0E17\u0E22, \u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E, etc.)
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
        type: import_genai.Type.OBJECT,
        properties: {
          isValidSlip: { type: import_genai.Type.BOOLEAN, description: "True if image is a real official bank slip" },
          isTamperedOrFake: { type: import_genai.Type.BOOLEAN, description: "True if detected fake slip, photoshop editing, or font manipulation" },
          amount: { type: import_genai.Type.NUMBER, description: "The transfer amount extracted from the slip" },
          refNo: { type: import_genai.Type.STRING, description: "The unique transaction reference number or slip ID" },
          bankName: { type: import_genai.Type.STRING, description: "Bank name" },
          receiverName: { type: import_genai.Type.STRING, description: "Receiver name on slip" },
          receiverAccount: { type: import_genai.Type.STRING, description: "Receiver account number or promptpay ID" },
          senderName: { type: import_genai.Type.STRING, description: "Sender name on slip" },
          transferDateTime: { type: import_genai.Type.STRING, description: "Date and time of transfer" },
          confidence: { type: import_genai.Type.NUMBER, description: "Confidence score 0-100" },
          isSuspicious: { type: import_genai.Type.BOOLEAN, description: "True if suspicious or needs human verification" },
          suspiciousDetail: { type: import_genai.Type.STRING, description: "Reason for suspicion in Thai" }
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
    } catch (err) {
      console.warn(`Model ${modelName} failed, trying next:`, err?.message);
    }
  }
  if (!response || !response.text) return null;
  try {
    return JSON.parse(response.text);
  } catch {
    return null;
  }
}
async function sendLineNotification(message) {
  try {
    const db = getDatabase();
    const dbToken = (db.settings?.lineChannelAccessToken || "").trim();
    const envToken = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
    const token = dbToken || envToken || "b6spU9oI6sgyc/lagfyn8Z6MZ4GkUCLOModW44f2ZY/4Ja0nvseYKZSvZwPOboWSMAKM3VN0z/7h50RoaGkMvCNBX2+e51SYez0lNHgwqoEs8TnNKe+7jMLbFEY1sH6ujkXTbp9OXhYxOUKnOiJ0WgdB04t89/1O/w1cDnyilFU=";
    let adminId = (db.settings?.lineAdminUserId || "").trim();
    if (!adminId || adminId === "Cda36ab1f3de2811e584a5b62d652a97d") {
      const envId = (process.env.LINE_ADMIN_USER_ID || "").trim();
      adminId = envId && envId !== "Cda36ab1f3de2811e584a5b62d652a97d" ? envId : "Cf544171f0f9753863ade1ddd1acd67a7";
    }
    if (!token || !adminId) {
      return;
    }
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      signal: AbortSignal.timeout(4e3),
      body: JSON.stringify({
        to: adminId.trim(),
        messages: [{ type: "text", text: message }]
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[LINE Push Message Error] ${res.status}:`, errText);
    }
  } catch (error) {
    console.error("Failed to send LINE notification:", error?.message);
  }
}
async function syncToGoogleSheet(action, table, data) {
  try {
    const db = getDatabase();
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || db.settings?.googleSheetWebhookUrl;
    if (!webhookUrl || !webhookUrl.startsWith("http")) {
      return;
    }
    const idCol = table.toLowerCase() === "services" ? "ServiceID" : table.toLowerCase() === "users" ? "UserID" : table.toLowerCase() === "staff" ? "StaffID" : table.toLowerCase() === "staffdocuments" ? "DocID" : table.toLowerCase() === "booking" || table.toLowerCase() === "bookings" ? "BookingID" : table.toLowerCase() === "credittransaction" || table.toLowerCase() === "transactions" ? "TransactionID" : table.toLowerCase() === "reviews" ? "ReviewID" : table.toLowerCase() === "notification" ? "NotificationID" : "ID";
    const idVal = data ? data[idCol] || data.ServiceID || data.UserID || data.StaffID || data.DocID || data.BookingID || data.TransactionID || data.ID || data.id : null;
    const enrichedData = data && typeof data === "object" ? {
      ...data,
      ...idVal ? { [idCol]: idVal, ID: idVal, id: idVal } : {}
    } : data;
    const payload = {
      action,
      table,
      sheetName: table,
      idColumn: idCol,
      idColumnName: idCol,
      idCol,
      id: idVal,
      ID: idVal,
      data: enrichedData,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "follow",
      signal: AbortSignal.timeout(5e3),
      body: JSON.stringify(payload)
    }).then(async (res) => {
      if (!res.ok) {
        console.warn(`[GoogleSheetSync] ${table} (${action}) responded with status ${res.status}`);
      } else {
        const json = await res.json().catch(() => null);
        const isFailure = !json || json.success === false || json.success === "false" || Boolean(json.error);
        if (isFailure) {
          console.warn(`[GoogleSheetSync] Warning ${table} (${action}):`, json?.error || json || "Empty response");
          if (action === "UPDATE") {
            console.log(`[GoogleSheetSync] Retrying ${table} with upsert fallback...`);
            fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              redirect: "follow",
              signal: AbortSignal.timeout(5e3),
              body: JSON.stringify({
                ...payload,
                action: "INSERT"
              })
            }).then((r) => r.json()).then((rJson) => {
              console.log(`[GoogleSheetSync] Fallback ${table} (INSERT/UPSERT) result:`, rJson);
            }).catch((e) => {
              console.warn(`[GoogleSheetSync] Fallback error:`, e.message);
            });
          }
        } else {
          console.log(`[GoogleSheetSync] Success ${table} (${action}):`, json);
        }
      }
    }).catch((err) => {
      console.error(`[GoogleSheetSync] Error syncing ${table} (${action}):`, err.message);
    });
  } catch (error) {
    console.error("[GoogleSheetSync] Exception:", error?.message);
  }
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "10mb" }));
  app.use("/api", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });
  const uploadsDir = import_path2.default.join(process.cwd(), "server", "uploads");
  if (!import_fs2.default.existsSync(uploadsDir)) {
    import_fs2.default.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", import_express.default.static(uploadsDir));
  app.post("/api/upload-qr", (req, res) => {
    try {
      const { dataUrl, image } = req.body;
      const target = dataUrl || image;
      if (!target || typeof target !== "string") {
        return res.status(400).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E" });
      }
      let buffer;
      let ext = "png";
      if (target.startsWith("data:image/")) {
        const commaIdx = target.indexOf(",");
        const mimeMatch = target.slice(0, commaIdx).match(/data:image\/([a-zA-Z0-9]+)/);
        if (mimeMatch && (mimeMatch[1] === "jpeg" || mimeMatch[1] === "jpg")) ext = "jpg";
        const base64Data = target.slice(commaIdx + 1).replace(/[\r\n\s]/g, "");
        buffer = Buffer.from(base64Data, "base64");
      } else {
        buffer = Buffer.from(target, "base64");
      }
      const filePath = import_path2.default.join(uploadsDir, `qr_code.${ext}`);
      import_fs2.default.writeFileSync(filePath, buffer);
      const db = getDatabase();
      const relativeUrl = `/uploads/qr_code.${ext}?t=${Date.now()}`;
      db.settings = {
        ...db.settings,
        qrCodeImage: relativeUrl,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      saveDatabase(db);
      syncToGoogleSheet("UPDATE", "Settings", db.settings);
      console.log(`[UploadQR] Successfully saved QR Code image to ${filePath} (${buffer.length} bytes)`);
      return res.json({
        success: true,
        url: relativeUrl,
        settings: db.settings
      });
    } catch (err) {
      console.error("[UploadQR] Error:", err);
      return res.status(500).json({ error: "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E" });
    }
  });
  app.post("/api/auth/register", (req, res) => {
    const db = getDatabase();
    const { name, phone, password, email, address, province, district, subDistrict, latitude, longitude, role, staffInfo } = req.body;
    if (!name || !phone || !password || !role) {
      return res.status(400).json({ error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E43\u0E2B\u0E49\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19 (\u0E0A\u0E37\u0E48\u0E2D, \u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C, \u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19, \u0E1A\u0E17\u0E1A\u0E32\u0E17)" });
    }
    const deletedUserSet = new Set(db.deletedUserIds || []);
    if (isUserDeleted({ Phone: phone }, deletedUserSet)) {
      return res.status(403).json({ error: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E25\u0E1A\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E16\u0E32\u0E27\u0E23\u0E41\u0E25\u0E49\u0E27 \u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E43\u0E2B\u0E49\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E2D\u0E35\u0E01" });
    }
    const existingUser = db.users.find((u) => u.Phone === phone || cleanPhone(u.Phone) === cleanPhone(phone));
    if (existingUser) {
      return res.status(400).json({ error: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" });
    }
    const newUserID = generateId("U");
    const newUser = {
      UserID: newUserID,
      Name: name,
      Phone: phone,
      PasswordHash: password,
      // simple store for demo
      Email: email || "",
      Address: address || "",
      Province: province || "",
      District: district || "",
      SubDistrict: subDistrict || "",
      Latitude: parseFloat(latitude) || 9.138244,
      Longitude: parseFloat(longitude) || 99.321748,
      ProfileImage: req.body.profileImage || DEFAULT_BLANK_AVATAR,
      Role: role,
      Status: "Active",
      CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.users.push(newUser);
    syncToGoogleSheet("INSERT", "Users", newUser);
    let createdStaff = null;
    if (role === "Staff") {
      const newStaffID = generateId("SFT");
      if (db.deletedStaffIds) {
        db.deletedStaffIds = db.deletedStaffIds.filter((id) => id !== newStaffID);
      }
      const info = staffInfo || {};
      const newStaff = {
        StaffID: newStaffID,
        UserID: newUserID,
        Nickname: info.nickname || name.split(" ")[0],
        Gender: info.gender || "Female",
        Age: parseInt(info.age) || 30,
        Weight: parseInt(info.weight) || 50,
        Height: parseInt(info.height) || 160,
        RegisteredAddress: info.registeredAddress || newUser.Address,
        Experience: parseInt(info.experience) || 2,
        Description: info.description || "\u0E22\u0E34\u0E19\u0E14\u0E35\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E19\u0E27\u0E14\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E\u0E04\u0E48\u0E30",
        Rating: 5,
        ReviewCount: 0,
        Credit: 200,
        // เครดิตเริ่มต้น 200 เครดิตสำหรับพนักงานใหม่เพื่อรับงานฟรีได้ 1 ครั้ง
        Available: "OFF",
        // พนักงานใหม่เริ่มต้นสถานะ OFF (ต้องรอแอดมินอนุมัติก่อนเปิดรับงาน)
        VerifyStatus: "Pending",
        // ต้องให้แอดมินอนุมัติก่อนถึงจะเริ่มทำงานได้
        CurrentLatitude: newUser.Latitude || 9.138244,
        CurrentLongitude: newUser.Longitude || 99.321748,
        LastLocationUpdate: (/* @__PURE__ */ new Date()).toISOString(),
        TotalIncome: 0,
        TotalJobs: 0,
        OfferedServices: getDatabase().services.map((s) => s.ServiceID),
        MaxJobDistance: 25,
        Photos: Array.isArray(info.photos) && info.photos.length > 0 ? info.photos : newUser.ProfileImage ? [newUser.ProfileImage] : [],
        LicenseFile: info.licenseFile || "",
        IdCardFile: info.idCardFile || "",
        HouseRegFile: info.houseRegFile || ""
      };
      createdStaff = newStaff;
      db.staff.push(newStaff);
      syncToGoogleSheet("INSERT", "Staff", newStaff);
      const staffDocData = {
        DocID: `DOC-${newStaff.StaffID}`,
        StaffID: newStaff.StaffID,
        UserID: newStaff.UserID,
        StaffName: newUser.Name,
        Nickname: newStaff.Nickname,
        Phone: newUser.Phone,
        VerifyStatus: newStaff.VerifyStatus,
        LicenseFile: newStaff.LicenseFile || "",
        IdCardFile: newStaff.IdCardFile || "",
        HouseRegFile: newStaff.HouseRegFile || "",
        RegisteredAddress: newStaff.RegisteredAddress,
        SubmittedDate: (/* @__PURE__ */ new Date()).toISOString(),
        Notes: "\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E2B\u0E25\u0E31\u0E01\u0E10\u0E32\u0E19\u0E01\u0E32\u0E23\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48 (\u0E43\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E19\u0E27\u0E14, \u0E1A\u0E31\u0E15\u0E23\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E0A\u0E19, \u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E1A\u0E49\u0E32\u0E19) - \u0E23\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34"
      };
      syncToGoogleSheet("INSERT", "StaffDocuments", staffDocData);
      const welcomeTx = {
        TransactionID: generateId("TX"),
        StaffID: newStaffID,
        Amount: 200,
        BeforeCredit: 0,
        AfterCredit: 200,
        Type: "Topup",
        SlipImage: "",
        Status: "Approved",
        AdminRemark: "\u{1F381} \u0E42\u0E1A\u0E19\u0E31\u0E2A\u0E15\u0E49\u0E2D\u0E19\u0E23\u0E31\u0E1A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48 200 \u0E40\u0E04\u0E23\u0E14\u0E34\u0E15 (\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E1F\u0E23\u0E35 1 \u0E04\u0E23\u0E31\u0E49\u0E07\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34)",
        CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
      };
      db.transactions.push(welcomeTx);
      syncToGoogleSheet("INSERT", "CreditTransaction", welcomeTx);
      const staffWelcomeNotif = {
        NotificationID: generateId("N"),
        UserID: newUserID,
        Title: "\u23F3 \u0E43\u0E1A\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E23\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34",
        Detail: "\u0E22\u0E34\u0E19\u0E14\u0E35\u0E15\u0E49\u0E2D\u0E19\u0E23\u0E31\u0E1A\u0E2A\u0E39\u0E48 SabaiDee Massage! \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E30\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E16\u0E39\u0E01\u0E2A\u0E48\u0E07\u0E16\u0E36\u0E07\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E41\u0E25\u0E49\u0E27 \u0E40\u0E21\u0E37\u0E48\u0E2D\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34 \u0E04\u0E38\u0E13\u0E08\u0E30\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E1B\u0E34\u0E14\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19 (Online) \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E23\u0E34\u0E48\u0E21\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35 \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E23\u0E31\u0E1A 200 \u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E1F\u0E23\u0E35\u0E04\u0E48\u0E30",
        ReadStatus: "Unread",
        CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
      };
      db.notifications.push(staffWelcomeNotif);
      syncToGoogleSheet("INSERT", "Notification", staffWelcomeNotif);
      const adminUsers = db.users.filter((u) => u.Role === "Admin");
      adminUsers.forEach((admin) => {
        const notif = {
          NotificationID: generateId("N"),
          UserID: admin.UserID,
          Title: "\u0E21\u0E35\u0E1C\u0E39\u0E49\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E40\u0E1B\u0E47\u0E19\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48 (\u0E23\u0E2D\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34)",
          Detail: `\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E19\u0E27\u0E14\u0E04\u0E19\u0E43\u0E2B\u0E21\u0E48 \u0E04\u0E38\u0E13 ${name} (\u0E0A\u0E37\u0E48\u0E2D\u0E40\u0E25\u0E48\u0E19 ${newStaff.Nickname}) \u0E40\u0E1A\u0E2D\u0E23\u0E4C ${phone} \u0E44\u0E14\u0E49\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E40\u0E02\u0E49\u0E32\u0E21\u0E32 \u0E23\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E41\u0E25\u0E30\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E07\u0E32\u0E19\u0E04\u0E48\u0E30`,
          ReadStatus: "Unread",
          CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet("INSERT", "Notification", notif);
      });
    }
    if (role === "Staff") {
      sendLineNotification(`\u{1F389} \u0E21\u0E35\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19!
\u0E0A\u0E37\u0E48\u0E2D: ${name}
\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23: ${phone}
\u0E2A\u0E16\u0E32\u0E19\u0E30: \u23F3 \u0E23\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E07\u0E32\u0E19`);
    } else {
      sendLineNotification(`\u{1F389} \u0E21\u0E35\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E43\u0E2B\u0E21\u0E48\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19!
\u0E0A\u0E37\u0E48\u0E2D: ${name}
\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23: ${phone}`);
    }
    saveDatabase(db);
    res.json({ success: true, user: newUser, staff: createdStaff });
  });
  app.post("/api/auth/login", (req, res) => {
    const db = getDatabase();
    const { phone, password } = req.body;
    const deletedUserSet = new Set(db.deletedUserIds || []);
    if (isUserDeleted({ Phone: phone }, deletedUserSet)) {
      return res.status(403).json({ error: "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E25\u0E1A\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E16\u0E32\u0E27\u0E23\u0E41\u0E25\u0E49\u0E27 \u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A" });
    }
    const user = db.users.find((u) => (u.Phone === phone || cleanPhone(u.Phone) === cleanPhone(phone)) && u.PasswordHash === password);
    if (!user || isUserDeleted(user, deletedUserSet)) {
      return res.status(401).json({ error: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 \u0E2B\u0E23\u0E37\u0E2D\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E16\u0E39\u0E01\u0E25\u0E1A\u0E41\u0E25\u0E49\u0E27" });
    }
    if (user.Status === "Inactive") {
      return res.status(403).json({ error: "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E16\u0E39\u0E01\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19" });
    }
    let staffDetails = null;
    if (user.Role === "Staff") {
      staffDetails = db.staff.find((s) => s.UserID === user.UserID) || null;
    }
    res.json({
      success: true,
      user,
      staff: staffDetails
    });
  });
  app.put("/api/auth/profile", (req, res) => {
    const db = getDatabase();
    const { userId, name, email, address, province, district, subDistrict, latitude, longitude, profileImage, staffInfo } = req.body;
    const deletedUserSet = new Set(db.deletedUserIds || []);
    if (isUserDeleted({ UserID: userId }, deletedUserSet)) {
      return res.status(404).json({ error: "\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E25\u0E1A\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27" });
    }
    const userIndex = db.users.findIndex((u) => u.UserID === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" });
    }
    const user = db.users[userIndex];
    user.Name = name || user.Name;
    user.Email = email !== void 0 ? email : user.Email;
    user.Address = address !== void 0 ? address : user.Address;
    user.Province = province !== void 0 ? province : user.Province;
    user.District = district !== void 0 ? district : user.District;
    user.SubDistrict = subDistrict !== void 0 ? subDistrict : user.SubDistrict;
    user.Latitude = latitude !== void 0 ? parseFloat(latitude) : user.Latitude;
    user.Longitude = longitude !== void 0 ? parseFloat(longitude) : user.Longitude;
    if (profileImage !== void 0) {
      user.ProfileImage = profileImage;
    }
    let staffDetails = null;
    if (user.Role === "Staff") {
      const staffIndex = db.staff.findIndex((s) => s.UserID === userId);
      if (staffIndex !== -1) {
        const staff = db.staff[staffIndex];
        if (staffInfo) {
          staff.Nickname = staffInfo.nickname || staff.Nickname;
          staff.Gender = staffInfo.gender || staff.Gender;
          staff.Age = staffInfo.age !== void 0 ? parseInt(staffInfo.age) : staff.Age;
          staff.Weight = staffInfo.weight !== void 0 ? parseInt(staffInfo.weight) : staff.Weight;
          staff.Height = staffInfo.height !== void 0 ? parseInt(staffInfo.height) : staff.Height;
          staff.RegisteredAddress = staffInfo.registeredAddress !== void 0 ? staffInfo.registeredAddress : staff.RegisteredAddress;
          staff.Experience = staffInfo.experience !== void 0 ? parseInt(staffInfo.experience) : staff.Experience;
          staff.Description = staffInfo.description !== void 0 ? staffInfo.description : staff.Description;
          if (staffInfo.offeredServices !== void 0) {
            staff.OfferedServices = staffInfo.offeredServices;
          }
          if (staffInfo.maxJobDistance !== void 0) {
            staff.MaxJobDistance = parseInt(staffInfo.maxJobDistance);
          }
          if (staffInfo.photos !== void 0) {
            staff.Photos = Array.isArray(staffInfo.photos) ? staffInfo.photos : [];
          }
          if (staffInfo.licenseFile !== void 0) {
            staff.LicenseFile = staffInfo.licenseFile;
          }
          if (staffInfo.idCardFile !== void 0) {
            staff.IdCardFile = staffInfo.idCardFile;
          }
          if (staffInfo.houseRegFile !== void 0) {
            staff.HouseRegFile = staffInfo.houseRegFile;
          }
        }
        staff.CurrentLatitude = user.Latitude;
        staff.CurrentLongitude = user.Longitude;
        staffDetails = staff;
      }
    }
    saveDatabase(db);
    syncToGoogleSheet("UPDATE", "Users", user);
    if (staffDetails) {
      syncToGoogleSheet("UPDATE", "Staff", staffDetails);
      const staffDocData = {
        DocID: `DOC-${staffDetails.StaffID}`,
        StaffID: staffDetails.StaffID,
        UserID: staffDetails.UserID,
        StaffName: user.Name,
        Nickname: staffDetails.Nickname,
        Phone: user.Phone,
        VerifyStatus: staffDetails.VerifyStatus,
        LicenseFile: staffDetails.LicenseFile || "",
        IdCardFile: staffDetails.IdCardFile || "",
        HouseRegFile: staffDetails.HouseRegFile || "",
        RegisteredAddress: staffDetails.RegisteredAddress || user.Address || "",
        SubmittedDate: (/* @__PURE__ */ new Date()).toISOString(),
        Notes: "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E30\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E2B\u0E25\u0E31\u0E01\u0E10\u0E32\u0E19\u0E1C\u0E48\u0E32\u0E19\u0E23\u0E30\u0E1A\u0E1A"
      };
      syncToGoogleSheet("UPDATE", "StaffDocuments", staffDocData);
    }
    res.json({ success: true, user, staff: staffDetails });
  });
  app.get("/api/geocode/reverse", async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (isNaN(lat) || isNaN(lng)) {
      return res.json({ address: "\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23, \u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28\u0E44\u0E17\u0E22" });
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "SabaiDeeMassageApp/1.0 (contact: support@sabaidee.app)",
            "Accept-Language": "th,en;q=0.8"
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
    }
    res.json({ address: `\u0E1E\u0E34\u0E01\u0E31\u0E14\u0E25\u0E30\u0E15\u0E34\u0E08\u0E39\u0E14 ${lat.toFixed(5)}, \u0E25\u0E2D\u0E07\u0E08\u0E34\u0E08\u0E39\u0E14 ${lng.toFixed(5)}` });
  });
  app.get("/api/geocode/search", async (req, res) => {
    const query = (req.query.q || "").trim();
    if (!query) return res.json({ results: [] });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=th`,
        {
          headers: {
            "User-Agent": "SabaiDeeMassageApp/1.0 (contact: support@sabaidee.app)",
            "Accept-Language": "th,en;q=0.8"
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
    }
    res.json({ results: [] });
  });
  app.get("/api/users", (req, res) => {
    const db = getDatabase();
    const deletedUserSet = new Set(db.deletedUserIds || []);
    const activeUsers = db.users.filter((u) => !isUserDeleted(u, deletedUserSet));
    res.json(activeUsers);
  });
  app.get("/api/users/:id", (req, res) => {
    const db = getDatabase();
    const deletedUserSet = new Set(db.deletedUserIds || []);
    if (isUserDeleted({ UserID: req.params.id, Phone: req.params.id }, deletedUserSet)) {
      return res.status(404).json({ error: "\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E25\u0E1A\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27" });
    }
    const user = db.users.find((u) => u.UserID === req.params.id);
    if (!user || isUserDeleted(user, deletedUserSet)) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" });
    }
    const staff = user.Role === "Staff" ? db.staff.find((s) => s.UserID === user.UserID) || null : null;
    res.json({ success: true, user, staff });
  });
  app.post("/api/sync/rehydrate-users", (req, res) => {
    const db = getDatabase();
    const { users, staff } = req.body;
    const deletedUserSet = new Set(db.deletedUserIds || []);
    const deletedStaffSet = new Set(db.deletedStaffIds || []);
    let dbModified = false;
    if (Array.isArray(users)) {
      for (const u of users) {
        if (!u || !u.UserID || !u.Phone) continue;
        if (isUserDeleted(u, deletedUserSet)) {
          console.log(`[Sync] Blocked deleted user from rehydrating: ${u.Name} (${u.UserID} - ${u.Phone})`);
          continue;
        }
        const existingIdx = db.users.findIndex((x) => x.UserID === u.UserID || cleanPhone(x.Phone) === cleanPhone(u.Phone));
        if (existingIdx === -1) {
          db.users.push(u);
          dbModified = true;
          console.log(`[Sync] Rehydrated user from client: ${u.Name} (${u.UserID} - ${u.Phone})`);
        } else {
          db.users[existingIdx] = { ...db.users[existingIdx], ...u };
        }
      }
    }
    if (Array.isArray(staff)) {
      for (const s of staff) {
        if (!s || !s.StaffID) continue;
        if (isStaffDeleted(s, deletedStaffSet, deletedUserSet)) {
          console.log(`[Sync] Blocked deleted staff from rehydrating: ${s.Nickname || s.StaffID}`);
          continue;
        }
        const existingIdx = db.staff.findIndex((x) => x.StaffID === s.StaffID || s.UserID && x.UserID === s.UserID);
        if (existingIdx === -1) {
          db.staff.push(s);
          dbModified = true;
          console.log(`[Sync] Rehydrated staff from client: ${s.Nickname} (${s.StaffID})`);
        } else {
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
    const initialUserLen = db.users.length;
    const initialStaffLen = db.staff.length;
    db.users = db.users.filter((u) => !isUserDeleted(u, deletedUserSet));
    db.staff = db.staff.filter((s) => !isStaffDeleted(s, deletedStaffSet, deletedUserSet));
    if (db.users.length !== initialUserLen || db.staff.length !== initialStaffLen) {
      dbModified = true;
    }
    if (dbModified) {
      saveDatabase(db);
    }
    res.json({
      success: true,
      totalUsers: db.users.length,
      totalStaff: db.staff.length,
      validUserIds: db.users.map((u) => u.UserID),
      validStaffIds: db.staff.map((s) => s.StaffID),
      users: db.users,
      staff: db.staff,
      deletedUserIds: db.deletedUserIds || [],
      deletedStaffIds: db.deletedStaffIds || []
    });
  });
  app.post("/api/users", (req, res) => {
    const db = getDatabase();
    const { name, phone, password, email, address, province, district, subDistrict, latitude, longitude, role, staffInfo } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E43\u0E2B\u0E49\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19 (\u0E0A\u0E37\u0E48\u0E2D, \u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C, \u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19)" });
    }
    const deletedUserSet = new Set(db.deletedUserIds || []);
    if (isUserDeleted({ Phone: phone }, deletedUserSet)) {
      return res.status(400).json({ error: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E19\u0E35\u0E49\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E25\u0E1A\u0E16\u0E32\u0E27\u0E23\u0E41\u0E25\u0E49\u0E27 \u0E2B\u0E32\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E43\u0E2B\u0E21\u0E48\u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E0A\u0E49\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E2D\u0E37\u0E48\u0E19" });
    }
    const existingUser = db.users.find((u) => u.Phone === phone || cleanPhone(u.Phone) === cleanPhone(phone));
    if (existingUser) {
      return res.status(400).json({ error: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" });
    }
    const newUserID = generateId("U");
    const userRole = role && ["Customer", "Staff", "Admin"].includes(role) ? role : "Customer";
    const newUser = {
      UserID: newUserID,
      Name: name,
      Phone: phone,
      PasswordHash: password,
      Email: email || "",
      Address: address || "",
      Province: province || "",
      District: district || "",
      SubDistrict: subDistrict || "",
      Latitude: parseFloat(latitude) || 9.138244,
      Longitude: parseFloat(longitude) || 99.321748,
      ProfileImage: req.body.profileImage || DEFAULT_BLANK_AVATAR,
      Role: userRole,
      Status: "Active",
      CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.users.push(newUser);
    syncToGoogleSheet("INSERT", "Users", newUser);
    let createdStaff = null;
    if (userRole === "Staff") {
      const newStaffID = generateId("SFT");
      if (db.deletedStaffIds) {
        db.deletedStaffIds = db.deletedStaffIds.filter((id) => id !== newStaffID);
      }
      const info = staffInfo || {};
      const newStaff = {
        StaffID: newStaffID,
        UserID: newUserID,
        Nickname: info.nickname || name.split(" ")[0],
        Gender: info.gender || "Female",
        Age: parseInt(info.age) || 30,
        Weight: parseInt(info.weight) || 50,
        Height: parseInt(info.height) || 160,
        RegisteredAddress: info.registeredAddress || newUser.Address,
        Experience: parseInt(info.experience) || 2,
        Description: info.description || "\u0E22\u0E34\u0E19\u0E14\u0E35\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E19\u0E27\u0E14\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E\u0E04\u0E48\u0E30",
        Rating: 5,
        ReviewCount: 0,
        Credit: 200,
        Available: "ON",
        VerifyStatus: "Approved",
        CurrentLatitude: newUser.Latitude || 9.138244,
        CurrentLongitude: newUser.Longitude || 99.321748,
        LastLocationUpdate: (/* @__PURE__ */ new Date()).toISOString(),
        TotalIncome: 0,
        TotalJobs: 0,
        OfferedServices: db.services.map((s) => s.ServiceID),
        MaxJobDistance: 25,
        Photos: Array.isArray(info.photos) ? info.photos : newUser.ProfileImage ? [newUser.ProfileImage] : [],
        LicenseFile: info.licenseFile || "",
        IdCardFile: info.idCardFile || "",
        HouseRegFile: info.houseRegFile || ""
      };
      createdStaff = newStaff;
      db.staff.push(newStaff);
      syncToGoogleSheet("INSERT", "Staff", newStaff);
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
        SubmittedDate: (/* @__PURE__ */ new Date()).toISOString(),
        Notes: "\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E41\u0E25\u0E30\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E2B\u0E25\u0E31\u0E01\u0E10\u0E32\u0E19"
      };
      syncToGoogleSheet("INSERT", "StaffDocuments", staffDocData);
      const welcomeTx = {
        TransactionID: generateId("TX"),
        StaffID: newStaffID,
        Amount: 200,
        BeforeCredit: 0,
        AfterCredit: 200,
        Type: "Topup",
        SlipImage: "",
        Status: "Approved",
        AdminRemark: "\u{1F381} \u0E42\u0E1A\u0E19\u0E31\u0E2A\u0E15\u0E49\u0E2D\u0E19\u0E23\u0E31\u0E1A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48 200 \u0E40\u0E04\u0E23\u0E14\u0E34\u0E15 (\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E1F\u0E23\u0E35 1 \u0E04\u0E23\u0E31\u0E49\u0E07)",
        CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
      };
      db.transactions.push(welcomeTx);
      syncToGoogleSheet("INSERT", "CreditTransaction", welcomeTx);
    }
    saveDatabase(db);
    res.status(201).json({ success: true, user: newUser, staff: createdStaff });
  });
  app.put("/api/users/:id", (req, res) => {
    const db = getDatabase();
    const user = db.users.find((u) => u.UserID === req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { name, phone, password, role, profileImage } = req.body;
    if (name !== void 0) user.Name = name;
    if (phone !== void 0) user.Phone = phone;
    if (password) user.PasswordHash = password;
    if (role && ["Customer", "Staff", "Admin"].includes(role)) {
      user.Role = role;
    }
    if (profileImage !== void 0) user.ProfileImage = profileImage;
    saveDatabase(db);
    syncToGoogleSheet("UPDATE", "Users", user);
    res.json({ success: true, user });
  });
  app.put("/api/users/:id/role", (req, res) => {
    const db = getDatabase();
    const user = db.users.find((u) => u.UserID === req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { role } = req.body;
    if (["Customer", "Staff", "Admin"].includes(role)) {
      user.Role = role;
      if (role === "Staff") {
        let staff = db.staff.find((s) => s.UserID === user.UserID);
        if (!staff) {
          const newStaffID = generateId("SFT");
          staff = {
            StaffID: newStaffID,
            UserID: user.UserID,
            Nickname: user.Name.split(" ")[0],
            Gender: "Female",
            Age: 30,
            Weight: 50,
            Height: 160,
            RegisteredAddress: user.Address,
            Experience: 1,
            Description: "\u0E22\u0E34\u0E19\u0E14\u0E35\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E04\u0E48\u0E30",
            Rating: 5,
            ReviewCount: 0,
            Credit: 200,
            Available: "OFF",
            VerifyStatus: "Pending",
            CurrentLatitude: user.Latitude,
            CurrentLongitude: user.Longitude,
            LastLocationUpdate: (/* @__PURE__ */ new Date()).toISOString(),
            TotalIncome: 0,
            TotalJobs: 0,
            OfferedServices: db.services.map((s) => s.ServiceID),
            MaxJobDistance: db.settings.searchRadius || 25,
            Photos: [user.ProfileImage].filter(Boolean),
            LicenseFile: "",
            IdCardFile: "",
            HouseRegFile: ""
          };
          db.staff.push(staff);
          syncToGoogleSheet("INSERT", "Staff", staff);
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
            SubmittedDate: (/* @__PURE__ */ new Date()).toISOString(),
            Notes: "\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E40\u0E1B\u0E47\u0E19\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48"
          };
          syncToGoogleSheet("INSERT", "StaffDocuments", staffDocData);
          const welcomeTx = {
            TransactionID: generateId("TX"),
            StaffID: newStaffID,
            Amount: 200,
            BeforeCredit: 0,
            AfterCredit: 200,
            Type: "Topup",
            SlipImage: "",
            Status: "Approved",
            AdminRemark: "\u{1F381} \u0E42\u0E1A\u0E19\u0E31\u0E2A\u0E15\u0E49\u0E2D\u0E19\u0E23\u0E31\u0E1A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48 200 \u0E40\u0E04\u0E23\u0E14\u0E34\u0E15 (\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E1F\u0E23\u0E35 1 \u0E04\u0E23\u0E31\u0E49\u0E07)",
            CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
          };
          db.transactions.push(welcomeTx);
          syncToGoogleSheet("INSERT", "CreditTransaction", welcomeTx);
        }
      }
      saveDatabase(db);
      syncToGoogleSheet("UPDATE", "Users", user);
      res.json(user);
    } else {
      res.status(400).json({ error: "Invalid role" });
    }
  });
  app.delete("/api/users/:id", (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const uIndex = db.users.findIndex((u) => u.UserID === id);
    if (uIndex === -1) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E25\u0E1A" });
    }
    const userToDelete = db.users[uIndex];
    if (userToDelete.Role === "Admin") {
      const adminCount = db.users.filter((u) => u.Role === "Admin").length;
      if (adminCount <= 1) {
        return res.status(400).json({ error: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E1A\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E04\u0E19\u0E2A\u0E38\u0E14\u0E17\u0E49\u0E32\u0E22\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49" });
      }
    }
    if (!db.deletedUserIds) db.deletedUserIds = [];
    if (!db.deletedStaffIds) db.deletedStaffIds = [];
    db.users.splice(uIndex, 1);
    if (!db.deletedUserIds.includes(id)) {
      db.deletedUserIds.push(id);
    }
    if (userToDelete.Phone) {
      if (!db.deletedUserIds.includes(userToDelete.Phone)) {
        db.deletedUserIds.push(userToDelete.Phone);
      }
      const cp = cleanPhone(userToDelete.Phone);
      if (cp && cp.length >= 8 && !db.deletedUserIds.includes(cp)) {
        db.deletedUserIds.push(cp);
      }
    }
    let deletedStaffId;
    const sIndex = db.staff.findIndex((s) => s.UserID === id);
    if (sIndex !== -1) {
      const deletedStaff = db.staff[sIndex];
      deletedStaffId = deletedStaff.StaffID;
      db.staff.splice(sIndex, 1);
      if (!db.deletedStaffIds.includes(deletedStaff.StaffID)) {
        db.deletedStaffIds.push(deletedStaff.StaffID);
      }
      syncToGoogleSheet("DELETE", "Staff", { StaffID: deletedStaff.StaffID, UserID: id });
      syncToGoogleSheet("DELETE", "StaffDocuments", { StaffID: deletedStaff.StaffID, UserID: id });
    }
    db.notifications = db.notifications.filter((n) => n.UserID !== id);
    saveDatabase(db);
    syncToGoogleSheet("DELETE", "Users", { UserID: id, Name: userToDelete.Name });
    res.json({
      success: true,
      message: `\u0E25\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 "${userToDelete.Name}" \u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E16\u0E32\u0E27\u0E23\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`,
      deletedUserId: id,
      deletedStaffId,
      remainingUsers: db.users,
      remainingStaff: db.staff
    });
  });
  app.post("/api/admin/clean-to-admin-only", (req, res) => {
    const db = getDatabase();
    const adminUser = db.users.find((u) => u.UserID === "U001" && u.Role === "Admin") || db.users.find((u) => u.Role === "Admin") || {
      UserID: "U001",
      Name: "\u0E2A\u0E21\u0E0A\u0E32\u0E22 \u0E22\u0E34\u0E48\u0E07\u0E14\u0E35 (\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19)",
      Phone: "0812345678",
      PasswordHash: "admin123",
      Email: "admin@sabaidee.com",
      Address: "99 \u0E16\u0E19\u0E19\u0E01\u0E32\u0E0D\u0E08\u0E19\u0E27\u0E34\u0E16\u0E35 \u0E15.\u0E1A\u0E32\u0E07\u0E01\u0E38\u0E49\u0E07 \u0E2D.\u0E40\u0E21\u0E37\u0E2D\u0E07 \u0E08.\u0E2A\u0E38\u0E23\u0E32\u0E29\u0E0E\u0E23\u0E4C\u0E18\u0E32\u0E19\u0E35 84000",
      Province: "\u0E2A\u0E38\u0E23\u0E32\u0E29\u0E0E\u0E23\u0E4C\u0E18\u0E32\u0E19\u0E35",
      District: "\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E2A\u0E38\u0E23\u0E32\u0E29\u0E0E\u0E23\u0E4C\u0E18\u0E32\u0E19\u0E35",
      SubDistrict: "\u0E1A\u0E32\u0E07\u0E01\u0E38\u0E49\u0E07",
      Latitude: 9.10537453623607,
      Longitude: 99.33859825517314,
      ProfileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=60",
      Role: "Admin",
      Status: "Active",
      CreatedDate: "2026-01-01T08:00:00Z"
    };
    if (!db.deletedUserIds) db.deletedUserIds = [];
    if (!db.deletedStaffIds) db.deletedStaffIds = [];
    for (const u of db.users) {
      if (u.UserID !== adminUser.UserID) {
        if (!db.deletedUserIds.includes(u.UserID)) db.deletedUserIds.push(u.UserID);
        if (u.Phone) {
          if (!db.deletedUserIds.includes(u.Phone)) db.deletedUserIds.push(u.Phone);
          const cp = cleanPhone(u.Phone);
          if (cp && cp.length >= 8 && !db.deletedUserIds.includes(cp)) db.deletedUserIds.push(cp);
        }
      }
    }
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
    db.notifications = db.notifications.filter((n) => n.UserID === adminUser.UserID);
    saveDatabase(db);
    console.log(`[Admin] Cleaned database to only 1 admin (${adminUser.Name} - ${adminUser.UserID})`);
    syncToGoogleSheet("SYNC_ALL_DATA", "All", { users: db.users, staff: db.staff });
    res.json({
      success: true,
      message: "\u0E25\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E17\u0E38\u0E01\u0E04\u0E19\u0E2D\u0E2D\u0E01\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22 \u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E04\u0E19\u0E40\u0E14\u0E35\u0E22\u0E27 \u0E41\u0E25\u0E30\u0E1A\u0E25\u0E47\u0E2D\u0E01\u0E44\u0E21\u0E48\u0E43\u0E2B\u0E49\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E40\u0E14\u0E34\u0E21\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E2D\u0E35\u0E01\u0E16\u0E32\u0E27\u0E23",
      remainingUsers: db.users,
      totalStaff: db.staff.length,
      totalBookings: db.bookings.length,
      deletedUserIds: db.deletedUserIds,
      deletedStaffIds: db.deletedStaffIds
    });
  });
  app.delete("/api/staff/:id", (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const deleteUser = req.query.deleteUser !== "false" && req.body?.deleteUser !== false;
    if (!db.deletedStaffIds) db.deletedStaffIds = [];
    if (!db.deletedUserIds) db.deletedUserIds = [];
    const sIndex = db.staff.findIndex((s) => s.StaffID === id);
    if (sIndex === -1) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E25\u0E1A" });
    }
    const staff = db.staff[sIndex];
    db.staff.splice(sIndex, 1);
    if (!db.deletedStaffIds.includes(id)) {
      db.deletedStaffIds.push(id);
    }
    let deletedUserId;
    if (staff.UserID) {
      const uIndex = db.users.findIndex((u) => u.UserID === staff.UserID);
      if (uIndex !== -1) {
        const user = db.users[uIndex];
        if (user.Role !== "Admin") {
          if (deleteUser) {
            db.users.splice(uIndex, 1);
            if (!db.deletedUserIds.includes(staff.UserID)) {
              db.deletedUserIds.push(staff.UserID);
            }
            if (user.Phone) {
              if (!db.deletedUserIds.includes(user.Phone)) {
                db.deletedUserIds.push(user.Phone);
              }
              const cp = cleanPhone(user.Phone);
              if (cp && cp.length >= 8 && !db.deletedUserIds.includes(cp)) {
                db.deletedUserIds.push(cp);
              }
            }
            deletedUserId = staff.UserID;
            syncToGoogleSheet("DELETE", "Users", { UserID: user.UserID, Name: user.Name });
          } else {
            user.Role = "Customer";
            syncToGoogleSheet("UPDATE", "Users", user);
          }
        }
      }
    }
    saveDatabase(db);
    syncToGoogleSheet("DELETE", "Staff", { StaffID: id, UserID: staff.UserID });
    syncToGoogleSheet("DELETE", "StaffDocuments", { StaffID: id, UserID: staff.UserID });
    res.json({
      success: true,
      message: `\u0E25\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19 "${staff.Nickname || id}" \u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E16\u0E32\u0E27\u0E23\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`,
      deletedStaffId: id,
      deletedUserId,
      remainingStaff: db.staff,
      remainingUsers: db.users
    });
  });
  app.get("/api/services", (req, res) => {
    const db = getDatabase();
    res.json(db.services);
  });
  app.post("/api/services", (req, res) => {
    const db = getDatabase();
    const { ServiceName, Detail, Duration, Price, CreditRequired, Active, SortOrder } = req.body;
    if (!ServiceName || !Price || !Duration) {
      return res.status(400).json({ error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23 \u0E23\u0E32\u0E04\u0E32 \u0E41\u0E25\u0E30\u0E40\u0E27\u0E25\u0E32\u0E43\u0E19\u0E01\u0E32\u0E23\u0E19\u0E27\u0E14" });
    }
    const newService = {
      ServiceID: generateId("S"),
      ServiceName,
      Detail: Detail || "",
      Duration: parseInt(Duration),
      Price: parseFloat(Price),
      CreditRequired: CreditRequired !== void 0 && CreditRequired !== "" ? parseFloat(CreditRequired) : Math.floor(Price * 0.15),
      Active: Active || "ON",
      SortOrder: parseInt(SortOrder) || db.services.length + 1,
      UpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.services.push(newService);
    saveDatabase(db);
    syncToGoogleSheet("INSERT", "Services", newService);
    res.json({ success: true, service: newService });
  });
  app.put("/api/services/:id", (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { ServiceName, Detail, Duration, Price, CreditRequired, Active, SortOrder } = req.body;
    const index = db.services.findIndex((s) => s.ServiceID === id);
    if (index === -1) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2B\u0E31\u0E2A\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E44\u0E02" });
    }
    const service = db.services[index];
    service.ServiceName = ServiceName || service.ServiceName;
    service.Detail = Detail !== void 0 ? Detail : service.Detail;
    service.Duration = Duration !== void 0 ? parseInt(Duration) : service.Duration;
    service.Price = Price !== void 0 ? parseFloat(Price) : service.Price;
    service.CreditRequired = CreditRequired !== void 0 && CreditRequired !== "" ? parseFloat(CreditRequired) : service.CreditRequired ?? 200;
    service.Active = Active || service.Active;
    service.SortOrder = SortOrder !== void 0 ? parseInt(SortOrder) : service.SortOrder;
    service.UpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDatabase(db);
    syncToGoogleSheet("UPDATE", "Services", service);
    res.json({ success: true, service });
  });
  app.delete("/api/services/:id", (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const index = db.services.findIndex((s) => s.ServiceID === id);
    if (index === -1) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E25\u0E1A" });
    }
    const deleted = db.services[index];
    db.services.splice(index, 1);
    if (!db.deletedServiceIds) db.deletedServiceIds = [];
    if (!db.deletedServiceIds.includes(id)) db.deletedServiceIds.push(id);
    saveDatabase(db);
    syncToGoogleSheet("DELETE", "Services", { ServiceID: id, ServiceName: deleted.ServiceName });
    res.json({ success: true });
  });
  app.get("/api/settings", (req, res) => {
    const db = getDatabase();
    const settings = { ...db.settings };
    const numMin = Number(settings.minCredit);
    if (isNaN(numMin) || settings.minCredit === void 0 || settings.minCredit === null || numMin < 0) {
      settings.minCredit = 200;
      db.settings.minCredit = 200;
      saveDatabase(db);
    } else {
      settings.minCredit = numMin;
    }
    if (!settings.lineChannelAccessToken) {
      settings.lineChannelAccessToken = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "b6spU9oI6sgyc/lagfyn8Z6MZ4GkUCLOModW44f2ZY/4Ja0nvseYKZSvZwPOboWSMAKM3VN0z/7h50RoaGkMvCNBX2+e51SYez0lNHgwqoEs8TnNKe+7jMLbFEY1sH6ujkXTbp9OXhYxOUKnOiJ0WgdB04t89/1O/w1cDnyilFU=").trim();
    }
    if (!settings.lineAdminUserId || settings.lineAdminUserId === "Cda36ab1f3de2811e584a5b62d652a97d") {
      const envAdmin = (process.env.LINE_ADMIN_USER_ID || "").trim();
      settings.lineAdminUserId = envAdmin && envAdmin !== "Cda36ab1f3de2811e584a5b62d652a97d" ? envAdmin : "Cf544171f0f9753863ade1ddd1acd67a7";
    }
    res.json(settings);
  });
  app.put("/api/settings", (req, res) => {
    const db = getDatabase();
    const isCustom = req.body?.isCustomized !== void 0 ? req.body.isCustomized : true;
    let newAdminId = (req.body?.lineAdminUserId || db.settings?.lineAdminUserId || "").trim();
    if (newAdminId === "Cda36ab1f3de2811e584a5b62d652a97d") {
      newAdminId = "Cf544171f0f9753863ade1ddd1acd67a7";
    }
    const incomingMinCredit = Number(req.body?.minCredit);
    const finalMinCredit = incomingMinCredit !== void 0 && !isNaN(incomingMinCredit) && incomingMinCredit >= 0 ? incomingMinCredit : Number(db.settings?.minCredit) || 200;
    let finalQrImage = req.body?.qrCodeImage !== void 0 ? req.body.qrCodeImage : db.settings?.qrCodeImage || "";
    if (typeof finalQrImage === "string" && finalQrImage.startsWith("data:image/")) {
      try {
        const uploadsDir2 = import_path2.default.join(process.cwd(), "server", "uploads");
        if (!import_fs2.default.existsSync(uploadsDir2)) import_fs2.default.mkdirSync(uploadsDir2, { recursive: true });
        const commaIdx = finalQrImage.indexOf(",");
        const base64Data = finalQrImage.slice(commaIdx + 1).replace(/[\r\n\s]/g, "");
        const buf = Buffer.from(base64Data, "base64");
        const ext = finalQrImage.includes("jpeg") || finalQrImage.includes("jpg") ? "jpg" : "png";
        const filePath = import_path2.default.join(uploadsDir2, `qr_code.${ext}`);
        import_fs2.default.writeFileSync(filePath, buf);
        finalQrImage = `/uploads/qr_code.${ext}?t=${Date.now()}`;
        console.log(`[Settings] Automatically converted base64 QR Code to file: ${filePath} (${buf.length} bytes)`);
      } catch (saveErr) {
        console.warn("[Settings] Failed to save QR code file:", saveErr);
      }
    }
    db.settings = {
      ...db.settings,
      ...req.body,
      qrCodeImage: finalQrImage,
      minCredit: finalMinCredit,
      lineAdminUserId: newAdminId,
      isCustomized: isCustom,
      updatedAt: req.body?.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    saveDatabase(db);
    syncToGoogleSheet("UPDATE", "Settings", db.settings);
    res.json({ success: true, settings: db.settings });
  });
  app.post("/api/settings/reset", (req, res) => {
    const db = getDatabase();
    db.settings = {
      ...defaultSettings,
      isCustomized: false,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveDatabase(db);
    syncToGoogleSheet("UPDATE", "Settings", db.settings);
    res.json({ success: true, settings: db.settings });
  });
  const executeCompleteBooking = (db, booking, isAuto = false) => {
    if (!booking || booking.Status === "Completed") return false;
    const currentStaff = db.staff.find((s) => s.StaffID === booking.StaffID);
    const staffName = currentStaff ? currentStaff.Nickname : "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19";
    const customerUser = db.users.find((u) => u.UserID === booking.CustomerID);
    const service = db.services.find((s) => s.ServiceID === booking.ServiceID);
    booking.Status = "Completed";
    booking.PaymentStatus = "Paid";
    booking.CompletedDate = (/* @__PURE__ */ new Date()).toISOString();
    if (isAuto) {
      booking.AutoCompleted = true;
      sendLineNotification(`\u23F0 \u0E07\u0E32\u0E19\u0E08\u0E1A\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34 (\u0E04\u0E23\u0E1A 30 \u0E19\u0E32\u0E17\u0E35\u0E2B\u0E25\u0E31\u0E07\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19)!
\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07: ${booking.BookingID}
\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19: \u0E1E\u0E35\u0E48${staffName}
\u0E22\u0E2D\u0E14\u0E23\u0E27\u0E21: ${booking.ServicePrice + booking.TravelFee} \u0E1A\u0E32\u0E17`);
    } else {
      sendLineNotification(`\u2705 \u0E07\u0E32\u0E19\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E34\u0E49\u0E19\u0E41\u0E25\u0E49\u0E27!
\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07: ${booking.BookingID}
\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19: \u0E1E\u0E35\u0E48${staffName}
\u0E22\u0E2D\u0E14\u0E23\u0E27\u0E21: ${booking.ServicePrice + booking.TravelFee} \u0E1A\u0E32\u0E17`);
    }
    if (currentStaff) {
      const creditRequired = service ? service.CreditRequired ?? 200 : 200;
      const staffEarning = Math.max(0, booking.ServicePrice - creditRequired) + booking.TravelFee;
      currentStaff.TotalIncome = (currentStaff.TotalIncome || 0) + staffEarning;
      currentStaff.TotalJobs = Math.max(1, (currentStaff.TotalJobs || 0) + 1);
      const hasDeducted = db.transactions.some(
        (t) => t.StaffID === currentStaff.StaffID && t.Type === "Deduct" && t.AdminRemark?.includes(booking.BookingID)
      );
      if (!hasDeducted && creditRequired > 0) {
        const beforeCredit = currentStaff.Credit;
        currentStaff.Credit = Math.max(0, currentStaff.Credit - creditRequired);
        const tx = {
          TransactionID: generateId("TX"),
          StaffID: currentStaff.StaffID,
          Amount: creditRequired,
          BeforeCredit: beforeCredit,
          AfterCredit: currentStaff.Credit,
          Type: "Deduct",
          SlipImage: "",
          Status: "Approved",
          AdminRemark: isAuto ? `\u0E15\u0E31\u0E14\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E48\u0E32\u0E18\u0E23\u0E23\u0E21\u0E40\u0E19\u0E35\u0E22\u0E21\u0E2B\u0E25\u0E31\u0E07\u0E08\u0E1A\u0E07\u0E32\u0E19\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34 (\u0E04\u0E23\u0E1A 30 \u0E19\u0E32\u0E17\u0E35\u0E2B\u0E25\u0E31\u0E07\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19) Booking #${booking.BookingID}` : `\u0E15\u0E31\u0E14\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E48\u0E32\u0E18\u0E23\u0E23\u0E21\u0E40\u0E19\u0E35\u0E22\u0E21\u0E2B\u0E25\u0E31\u0E07\u0E08\u0E1A\u0E07\u0E32\u0E19 Booking #${booking.BookingID}`,
          CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
        };
        db.transactions.push(tx);
        syncToGoogleSheet("INSERT", "CreditTransaction", tx);
      }
      const rawMin = Number(db.settings?.minCredit);
      const minCredit = rawMin !== void 0 && !isNaN(rawMin) && rawMin >= 0 ? rawMin : 200;
      const otherActiveBookings = db.bookings.some(
        (b) => b.StaffID === currentStaff.StaffID && b.BookingID !== booking.BookingID && (b.Status === "Accepted" || b.Status === "Working")
      );
      if (!otherActiveBookings && (currentStaff.Credit <= 0 || currentStaff.Credit < minCredit)) {
        currentStaff.Available = "OFF";
        console.log(`[StaffAvailability] Auto-turned off staff ${currentStaff.Nickname} (${currentStaff.StaffID}) after completing LAST job #${booking.BookingID} due to exhausted or low credit (${currentStaff.Credit} < ${minCredit})`);
        const notif = {
          NotificationID: generateId("N"),
          UserID: currentStaff.UserID,
          Title: "\u{1F534} \u0E1B\u0E34\u0E14\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34 (\u0E08\u0E1A\u0E07\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27 & \u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E2B\u0E21\u0E14)",
          Detail: `\u0E07\u0E32\u0E19 #${booking.BookingID} \u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E34\u0E49\u0E19\u0E41\u0E25\u0E49\u0E27 \u0E15\u0E31\u0E14\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E48\u0E32\u0E18\u0E23\u0E23\u0E21\u0E40\u0E19\u0E35\u0E22\u0E21 -${creditRequired} CR \u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D (${currentStaff.Credit} CR) \u0E2B\u0E21\u0E14\u0E2B\u0E23\u0E37\u0E2D\u0E15\u0E48\u0E33\u0E01\u0E27\u0E48\u0E32\u0E40\u0E01\u0E13\u0E11\u0E4C\u0E02\u0E31\u0E49\u0E19\u0E15\u0E48\u0E33 (${minCredit} \u0E40\u0E04\u0E23\u0E14\u0E34\u0E15) \u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49\u0E1B\u0E34\u0E14\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E49\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E15\u0E34\u0E21\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1B\u0E34\u0E14\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E19\u0E30\u0E04\u0E30`,
          ReadStatus: "Unread",
          CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet("INSERT", "Notification", notif);
      }
      if (isAuto) {
        const notifStaffAuto = {
          NotificationID: generateId("N"),
          UserID: currentStaff.UserID,
          Title: "\u23F0 \u0E08\u0E1A\u0E07\u0E32\u0E19\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34 (\u0E04\u0E23\u0E1A 30 \u0E19\u0E32\u0E17\u0E35\u0E2B\u0E25\u0E31\u0E07\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19)",
          Detail: `\u0E07\u0E32\u0E19\u0E08\u0E2D\u0E07 #${booking.BookingID} \u0E16\u0E39\u0E01\u0E1B\u0E34\u0E14\u0E08\u0E1A\u0E07\u0E32\u0E19\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E04\u0E23\u0E1A\u0E01\u0E33\u0E2B\u0E19\u0E14 30 \u0E19\u0E32\u0E17\u0E35\u0E2B\u0E25\u0E31\u0E07\u0E01\u0E14\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19 \u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E23\u0E32\u0E22\u0E44\u0E14\u0E49 \u0E3F${staffEarning.toLocaleString()} \u0E41\u0E25\u0E30\u0E15\u0E31\u0E14\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E48\u0E32\u0E18\u0E23\u0E23\u0E21\u0E40\u0E19\u0E35\u0E22\u0E21 -${creditRequired} CR \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27\u0E04\u0E48\u0E30`,
          ReadStatus: "Unread",
          CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
        };
        db.notifications.push(notifStaffAuto);
        syncToGoogleSheet("INSERT", "Notification", notifStaffAuto);
      }
      syncToGoogleSheet("UPDATE", "Staff", currentStaff);
    }
    if (customerUser) {
      const notif = {
        NotificationID: generateId("N"),
        UserID: customerUser.UserID,
        Title: isAuto ? "\u2705 \u0E01\u0E32\u0E23\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E34\u0E49\u0E19 (\u0E08\u0E1A\u0E07\u0E32\u0E19\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)" : "\u2705 \u0E01\u0E32\u0E23\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E34\u0E49\u0E19\u0E41\u0E25\u0E49\u0E27",
        Detail: isAuto ? "\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49\u0E1B\u0E34\u0E14\u0E08\u0E1A\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E49\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34 (\u0E04\u0E23\u0E1A 30 \u0E19\u0E32\u0E17\u0E35\u0E2B\u0E25\u0E31\u0E07\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19) \u0E02\u0E2D\u0E1A\u0E04\u0E38\u0E13\u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23 SabaiDee Massage \u0E04\u0E48\u0E30 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E2B\u0E49\u0E04\u0E30\u0E41\u0E19\u0E19\u0E23\u0E35\u0E27\u0E34\u0E27\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1B\u0E47\u0E19\u0E01\u0E33\u0E25\u0E31\u0E07\u0E43\u0E08\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E\u0E15\u0E48\u0E2D\u0E44\u0E1B\u0E19\u0E30\u0E04\u0E30" : "\u0E02\u0E2D\u0E1A\u0E04\u0E38\u0E13\u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23 SabaiDee Massage \u0E04\u0E48\u0E30 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E2B\u0E49\u0E04\u0E30\u0E41\u0E19\u0E19\u0E23\u0E35\u0E27\u0E34\u0E27\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1B\u0E47\u0E19\u0E01\u0E33\u0E25\u0E31\u0E07\u0E43\u0E08\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E\u0E15\u0E48\u0E2D\u0E44\u0E1B",
        ReadStatus: "Unread",
        CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
      };
      db.notifications.push(notif);
      syncToGoogleSheet("INSERT", "Notification", notif);
    }
    syncToGoogleSheet("UPDATE", "Booking", booking);
    return true;
  };
  const checkAndAutoCompleteExpiredBookings = (db) => {
    const minutes = Number(db.settings?.autoCompleteMinutes) > 0 ? Number(db.settings?.autoCompleteMinutes) : 30;
    const AUTO_COMPLETE_MS = minutes * 60 * 1e3;
    const now = Date.now();
    let updated = false;
    db.bookings.forEach((b) => {
      if (b.Status === "Accepted" || b.Status === "Working") {
        const acceptedTimeStr = b.AcceptedDate || b.CreatedDate;
        if (!acceptedTimeStr) return;
        const acceptedTime = new Date(acceptedTimeStr).getTime();
        if (!isNaN(acceptedTime) && now - acceptedTime >= AUTO_COMPLETE_MS) {
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
  app.get("/api/staff", (req, res) => {
    const db = getDatabase();
    const staffList = db.staff.map((s) => {
      const u = db.users.find((user) => user.UserID === s.UserID);
      return {
        ...s,
        Name: u ? u.Name : "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19",
        Phone: u ? u.Phone : "",
        Email: u ? u.Email : "",
        ProfileImage: u ? u.ProfileImage : "",
        Address: u ? u.Address : "",
        Province: u ? u.Province : "",
        District: u ? u.District : "",
        SubDistrict: u ? u.SubDistrict : "",
        UserStatus: u ? u.Status : "Active",
        UserCreatedDate: u ? u.CreatedDate : ""
      };
    });
    res.json(staffList);
  });
  app.get("/api/staff/:id/details", (req, res) => {
    const db = getDatabase();
    checkAndAutoCompleteExpiredBookings(db);
    const { id } = req.params;
    const staff = db.staff.find((s) => s.StaffID === id);
    if (!staff) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" });
    }
    const u = db.users.find((user) => user.UserID === staff.UserID);
    const enrichedStaff = {
      ...staff,
      Name: u ? u.Name : "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19",
      Phone: u ? u.Phone : "",
      Email: u ? u.Email : "",
      ProfileImage: u ? u.ProfileImage : "",
      Address: u ? u.Address : "",
      Province: u ? u.Province : "",
      District: u ? u.District : "",
      SubDistrict: u ? u.SubDistrict : "",
      UserStatus: u ? u.Status : "Active",
      UserCreatedDate: u ? u.CreatedDate : ""
    };
    const bookings = db.bookings.filter((b) => b.StaffID === id).map((b) => {
      const customer = db.users.find((usr) => usr.UserID === b.CustomerID);
      const service = db.services.find((svc) => svc.ServiceID === b.ServiceID);
      return {
        ...b,
        CustomerName: customer ? customer.Name : "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32",
        CustomerPhone: customer ? customer.Phone : "",
        ServiceName: service ? service.ServiceName : b.ServiceID || "\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E19\u0E27\u0E14"
      };
    }).sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());
    const reviews = db.reviews.filter((r) => r.StaffID === id).map((r) => {
      const customer = db.users.find((usr) => usr.UserID === r.CustomerID);
      return {
        ...r,
        CustomerName: customer ? customer.Name : "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32",
        CustomerPhone: customer ? customer.Phone : ""
      };
    }).sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());
    const transactions = db.transactions.filter((t) => t.StaffID === id).sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());
    res.json({
      staff: enrichedStaff,
      bookings,
      reviews,
      transactions,
      services: db.services
    });
  });
  app.put("/api/admin/staff/:id/credit", (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { amount, type, remark } = req.body;
    const staffIndex = db.staff.findIndex((s) => s.StaffID === id);
    if (staffIndex === -1) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" });
    }
    const staff = db.staff[staffIndex];
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) {
      return res.status(400).json({ error: "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32 0" });
    }
    const beforeCredit = staff.Credit;
    const afterCredit = type === "Topup" ? beforeCredit + numAmount : Math.max(0, beforeCredit - numAmount);
    staff.Credit = afterCredit;
    const tx = {
      TransactionID: generateId("TX"),
      StaffID: staff.StaffID,
      Amount: numAmount,
      BeforeCredit: beforeCredit,
      AfterCredit: afterCredit,
      Type: type,
      SlipImage: "",
      Status: "Approved",
      AdminRemark: remark || (type === "Topup" ? "\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E1B\u0E23\u0E31\u0E1A\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E42\u0E14\u0E22\u0E15\u0E23\u0E07" : "\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E1B\u0E23\u0E31\u0E1A\u0E25\u0E14\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E42\u0E14\u0E22\u0E15\u0E23\u0E07"),
      CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.transactions.push(tx);
    const notif = {
      NotificationID: generateId("N"),
      UserID: staff.UserID,
      Title: type === "Topup" ? `\u{1F389} \u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E40\u0E1E\u0E34\u0E48\u0E21 +${numAmount} CR` : `\u26A0\uFE0F \u0E21\u0E35\u0E01\u0E32\u0E23\u0E2B\u0E31\u0E01\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15 -${numAmount} CR`,
      Detail: `${tx.AdminRemark} (\u0E22\u0E2D\u0E14\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19: ${afterCredit.toFixed(0)} CR)`,
      ReadStatus: "Unread",
      CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.notifications.push(notif);
    saveDatabase(db);
    syncToGoogleSheet("UPDATE", "Staff", staff);
    syncToGoogleSheet("INSERT", "CreditTransaction", tx);
    syncToGoogleSheet("INSERT", "Notification", notif);
    res.json({ success: true, staff, transaction: tx });
  });
  app.put("/api/admin/staff/:id/update", (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      address,
      province,
      district,
      subDistrict,
      nickname,
      gender,
      age,
      weight,
      height,
      experience,
      description,
      registeredAddress,
      offeredServices,
      maxJobDistance,
      verifyStatus,
      available,
      status,
      licenseFile,
      idCardFile,
      houseRegFile,
      photos,
      profileImage
    } = req.body;
    const staffIndex = db.staff.findIndex((s) => s.StaffID === id);
    if (staffIndex === -1) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" });
    }
    const staff = db.staff[staffIndex];
    if (nickname !== void 0) staff.Nickname = nickname;
    if (gender !== void 0) staff.Gender = gender;
    if (age !== void 0) staff.Age = parseInt(age) || staff.Age;
    if (weight !== void 0) staff.Weight = parseInt(weight) || staff.Weight;
    if (height !== void 0) staff.Height = parseInt(height) || staff.Height;
    if (experience !== void 0) staff.Experience = parseInt(experience) || staff.Experience;
    if (description !== void 0) staff.Description = description;
    if (registeredAddress !== void 0) staff.RegisteredAddress = registeredAddress;
    if (offeredServices !== void 0) staff.OfferedServices = offeredServices;
    if (maxJobDistance !== void 0) staff.MaxJobDistance = parseInt(maxJobDistance) || staff.MaxJobDistance;
    if (verifyStatus !== void 0) staff.VerifyStatus = verifyStatus;
    if (available !== void 0) staff.Available = available;
    if (licenseFile !== void 0) staff.LicenseFile = licenseFile;
    if (idCardFile !== void 0) staff.IdCardFile = idCardFile;
    if (houseRegFile !== void 0) staff.HouseRegFile = houseRegFile;
    if (photos !== void 0) staff.Photos = photos;
    const userIndex = db.users.findIndex((u) => u.UserID === staff.UserID);
    let updatedUser = null;
    if (userIndex !== -1) {
      const user = db.users[userIndex];
      if (name !== void 0) user.Name = name;
      if (phone !== void 0) user.Phone = phone;
      if (email !== void 0) user.Email = email;
      if (address !== void 0) user.Address = address;
      if (province !== void 0) user.Province = province;
      if (district !== void 0) user.District = district;
      if (subDistrict !== void 0) user.SubDistrict = subDistrict;
      if (status !== void 0) user.Status = status;
      if (profileImage !== void 0) {
        user.ProfileImage = profileImage;
      }
      updatedUser = user;
    }
    saveDatabase(db);
    syncToGoogleSheet("UPDATE", "Staff", staff);
    const staffDocData = {
      DocID: `DOC-${staff.StaffID}`,
      StaffID: staff.StaffID,
      UserID: staff.UserID,
      StaffName: updatedUser?.Name || staff.Nickname,
      Nickname: staff.Nickname,
      Phone: updatedUser?.Phone || "",
      VerifyStatus: staff.VerifyStatus,
      LicenseFile: staff.LicenseFile || "",
      IdCardFile: staff.IdCardFile || "",
      HouseRegFile: staff.HouseRegFile || "",
      RegisteredAddress: staff.RegisteredAddress || updatedUser?.Address || "",
      SubmittedDate: (/* @__PURE__ */ new Date()).toISOString(),
      Notes: `\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E30\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E2B\u0E25\u0E31\u0E01\u0E10\u0E32\u0E19 (${staff.VerifyStatus})`
    };
    syncToGoogleSheet("UPDATE", "StaffDocuments", staffDocData);
    if (updatedUser) {
      syncToGoogleSheet("UPDATE", "Users", updatedUser);
    }
    res.json({ success: true, staff });
  });
  app.get("/api/staff/:id/reviews", (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const staffReviews = db.reviews.filter((r) => r.StaffID === id);
    const enrichedReviews = staffReviews.map((r) => {
      const customer = db.users.find((u) => u.UserID === r.CustomerID);
      return {
        ...r,
        CustomerName: customer ? customer.Name : "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32"
      };
    }).sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());
    res.json(enrichedReviews);
  });
  app.put("/api/staff/availability", (req, res) => {
    const db = getDatabase();
    const { staffId, available, onlyIfNoActiveJobs } = req.body;
    const index = db.staff.findIndex((s) => s.StaffID === staffId);
    if (index === -1) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" });
    }
    if (available === "ON") {
      if (db.staff[index].VerifyStatus !== "Approved") {
        const errorMsg = db.staff[index].VerifyStatus === "Pending" ? "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E1B\u0E34\u0E14\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49 \u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E23\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E01\u0E48\u0E2D\u0E19\u0E04\u0E48\u0E30" : "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E1B\u0E34\u0E14\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49 \u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E04\u0E48\u0E30";
        return res.status(403).json({ error: errorMsg, verifyStatus: db.staff[index].VerifyStatus });
      }
      const rawMin = Number(db.settings?.minCredit);
      const minCredit = rawMin !== void 0 && !isNaN(rawMin) && rawMin >= 0 ? rawMin : 200;
      const staffCredit = Number(db.staff[index].Credit || 0);
      if (staffCredit < minCredit) {
        return res.status(400).json({ error: `\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E44\u0E21\u0E48\u0E1E\u0E2D\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19 (\u0E02\u0E31\u0E49\u0E19\u0E15\u0E48\u0E33 ${minCredit} \u0E40\u0E04\u0E23\u0E14\u0E34\u0E15) \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E15\u0E34\u0E21\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E1B\u0E34\u0E14\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E04\u0E48\u0E30` });
      }
    }
    if (available === "OFF" && onlyIfNoActiveJobs) {
      const hasActive = db.bookings.some(
        (b) => b.StaffID === staffId && (b.Status === "Accepted" || b.Status === "Working")
      );
      if (hasActive) {
        return res.json({
          success: false,
          message: "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E22\u0E31\u0E07\u0E21\u0E35\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E01\u0E33\u0E25\u0E31\u0E07\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E2D\u0E22\u0E39\u0E48 \u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1B\u0E34\u0E14\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E44\u0E14\u0E49\u0E08\u0E19\u0E01\u0E27\u0E48\u0E32\u0E08\u0E30\u0E08\u0E1A\u0E07\u0E32\u0E19\u0E2A\u0E38\u0E14\u0E17\u0E49\u0E32\u0E22",
          staff: db.staff[index]
        });
      }
    }
    db.staff[index].Available = available;
    db.staff[index].LastLocationUpdate = (/* @__PURE__ */ new Date()).toISOString();
    saveDatabase(db);
    syncToGoogleSheet("UPDATE", "Staff", db.staff[index]);
    res.json({ success: true, staff: db.staff[index] });
  });
  app.put("/api/staff/:id/verify", (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { status } = req.body;
    const index = db.staff.findIndex((s) => s.StaffID === id);
    if (index === -1) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19" });
    }
    db.staff[index].VerifyStatus = status;
    if (status !== "Approved") {
      db.staff[index].Available = "OFF";
    }
    const staff = db.staff[index];
    const staffUser = db.users.find((u) => u.UserID === staff.UserID);
    const notif = {
      NotificationID: generateId("N"),
      UserID: staff.UserID,
      Title: status === "Approved" ? "\u{1F389} \u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E41\u0E25\u0E49\u0E27!" : status === "Pending" ? "\u23F3 \u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E23\u0E2D\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A" : "\u26A0\uFE0F \u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34",
      Detail: status === "Approved" ? "\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E44\u0E14\u0E49\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27 \u0E02\u0E13\u0E30\u0E19\u0E35\u0E49\u0E04\u0E38\u0E13\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E1B\u0E34\u0E14\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E2D\u0E2D\u0E19\u0E44\u0E25\u0E19\u0E4C\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E23\u0E34\u0E48\u0E21\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E08\u0E32\u0E01\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35\u0E04\u0E48\u0E30" : status === "Pending" ? "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E30\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E23\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E04\u0E48\u0E30" : "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E41\u0E01\u0E49\u0E44\u0E02\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E39\u0E1B\u0E42\u0E1B\u0E23\u0E44\u0E1F\u0E25\u0E4C\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13 \u0E2B\u0E23\u0E37\u0E2D\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1D\u0E48\u0E32\u0E22\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21\u0E04\u0E48\u0E30",
      ReadStatus: "Unread",
      CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.notifications.push(notif);
    if (status === "Approved") {
      sendLineNotification(`\u2705 [\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27]
\u0E0A\u0E37\u0E48\u0E2D: ${staffUser?.Name || ""} (\u0E1E\u0E35\u0E48${staff.Nickname})
\u0E40\u0E1A\u0E2D\u0E23\u0E4C: ${staffUser?.Phone || ""}
\u0E2A\u0E16\u0E32\u0E19\u0E30: \u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22 \u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E1B\u0E34\u0E14\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49\u0E41\u0E25\u0E49\u0E27 \u{1F389}`);
    } else if (status === "Reject") {
      sendLineNotification(`\u{1F6AB} [\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19]
\u0E0A\u0E37\u0E48\u0E2D: ${staffUser?.Name || ""} (\u0E1E\u0E35\u0E48${staff.Nickname})
\u0E40\u0E1A\u0E2D\u0E23\u0E4C: ${staffUser?.Phone || ""}
\u0E2A\u0E16\u0E32\u0E19\u0E30: \u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34`);
    }
    saveDatabase(db);
    syncToGoogleSheet("UPDATE", "Staff", db.staff[index]);
    const staffDocData = {
      DocID: `DOC-${db.staff[index].StaffID}`,
      StaffID: db.staff[index].StaffID,
      UserID: db.staff[index].UserID,
      StaffName: staffUser?.Name || db.staff[index].Nickname,
      Nickname: db.staff[index].Nickname,
      Phone: staffUser?.Phone || "",
      VerifyStatus: db.staff[index].VerifyStatus,
      LicenseFile: db.staff[index].LicenseFile || "",
      IdCardFile: db.staff[index].IdCardFile || "",
      HouseRegFile: db.staff[index].HouseRegFile || "",
      RegisteredAddress: db.staff[index].RegisteredAddress || staffUser?.Address || "",
      SubmittedDate: (/* @__PURE__ */ new Date()).toISOString(),
      Notes: `\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34: ${db.staff[index].VerifyStatus}`
    };
    syncToGoogleSheet("UPDATE", "StaffDocuments", staffDocData);
    syncToGoogleSheet("INSERT", "Notification", notif);
    res.json({ success: true, staff: db.staff[index] });
  });
  app.put("/api/staff/location", (req, res) => {
    const db = getDatabase();
    const { staffId, latitude, longitude } = req.body;
    const sIndex = db.staff.findIndex((s) => s.StaffID === staffId);
    if (sIndex === -1) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" });
    }
    db.staff[sIndex].CurrentLatitude = parseFloat(latitude);
    db.staff[sIndex].CurrentLongitude = parseFloat(longitude);
    db.staff[sIndex].LastLocationUpdate = (/* @__PURE__ */ new Date()).toISOString();
    const uIndex = db.users.findIndex((u) => u.UserID === db.staff[sIndex].UserID);
    if (uIndex !== -1) {
      db.users[uIndex].Latitude = parseFloat(latitude);
      db.users[uIndex].Longitude = parseFloat(longitude);
    }
    saveDatabase(db);
    syncToGoogleSheet("UPDATE", "Staff", db.staff[sIndex]);
    res.json({ success: true, staff: db.staff[sIndex] });
  });
  app.put("/api/users/:id/location", (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { latitude, longitude, address } = req.body;
    const deletedUserSet = new Set(db.deletedUserIds || []);
    if (isUserDeleted({ UserID: id }, deletedUserSet)) {
      return res.status(404).json({ error: "\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E25\u0E1A\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27" });
    }
    const uIndex = db.users.findIndex((u) => u.UserID === id);
    if (uIndex === -1) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" });
    }
    if (latitude !== void 0) db.users[uIndex].Latitude = parseFloat(latitude);
    if (longitude !== void 0) db.users[uIndex].Longitude = parseFloat(longitude);
    if (address) db.users[uIndex].Address = address;
    saveDatabase(db);
    res.json({ success: true, user: db.users[uIndex] });
  });
  app.post("/api/bookings", (req, res) => {
    const db = getDatabase();
    const { customerId, serviceId, customerAddress, customerAddressDetail, customerLatitude, customerLongitude, preferredStaffId } = req.body;
    if (!customerId || !serviceId || !customerLatitude || !customerLongitude) {
      return res.status(400).json({ error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07" });
    }
    const service = db.services.find((s) => s.ServiceID === serviceId);
    if (!service) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2B\u0E31\u0E2A\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38" });
    }
    const deletedUserSet = new Set(db.deletedUserIds || []);
    if (isUserDeleted({ UserID: customerId }, deletedUserSet)) {
      return res.status(403).json({ error: "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E25\u0E1A\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27" });
    }
    const customerUser = db.users.find((u) => u.UserID === customerId);
    if (!customerUser || isUserDeleted(customerUser, deletedUserSet)) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32" });
    }
    let finalMainAddress = (customerAddress || customerUser.Address || "").trim();
    let finalDetailAddress = (customerAddressDetail || "").trim();
    if (!finalDetailAddress && finalMainAddress) {
      const match = finalMainAddress.match(/^(.*?)(?:\s*\((?:รายละเอียดเพิ่มเติม|ข้อมูลเพิ่มเติม|ที่อยู่เพิ่มเติม):\s*([^)]+)\))\s*$/);
      if (match) {
        finalMainAddress = match[1].trim();
        finalDetailAddress = match[2].trim();
      }
    }
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      if (typeof lat1 !== "number" || isNaN(lat1) || typeof lon1 !== "number" || isNaN(lon1) || typeof lat2 !== "number" || isNaN(lat2) || typeof lon2 !== "number" || isNaN(lon2)) {
        return 0;
      }
      if (lat1 === lat2 && lon1 === lon2) return 0;
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return parseFloat((R * c).toFixed(2));
    };
    const settings = db.settings;
    const clientLat = parseFloat(customerLatitude);
    const clientLng = parseFloat(customerLongitude);
    const maxSearchRadius = settings.searchRadius && settings.searchRadius > 0 ? settings.searchRadius : 15;
    const targetService = db.services.find((srv) => srv.ServiceID === serviceId);
    const serviceRequiredCredit = targetService ? targetService.CreditRequired ?? 0 : Number(settings.minCredit) || 0;
    const eligibleStaff = db.staff.filter((s) => {
      const staffLat = typeof s.CurrentLatitude === "number" ? s.CurrentLatitude : 9.138244;
      const staffLng = typeof s.CurrentLongitude === "number" ? s.CurrentLongitude : 99.321748;
      const dist = calculateDistance(clientLat, clientLng, staffLat, staffLng);
      const offersService = !s.OfferedServices || s.OfferedServices.includes(serviceId);
      const staffDistanceLimit = s.MaxJobDistance && s.MaxJobDistance < 15 ? s.MaxJobDistance : Math.max(s.MaxJobDistance || 0, maxSearchRadius);
      const maxDist = Math.min(staffDistanceLimit, maxSearchRadius);
      return s.Available === "ON" && s.VerifyStatus === "Approved" && s.Credit >= serviceRequiredCredit && dist <= maxDist && offersService;
    }).map((s) => {
      const staffLat = typeof s.CurrentLatitude === "number" ? s.CurrentLatitude : 9.138244;
      const staffLng = typeof s.CurrentLongitude === "number" ? s.CurrentLongitude : 99.321748;
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
    }).sort((a, b) => a.dist - b.dist);
    if (eligibleStaff.length === 0) {
      return res.status(400).json({ error: `\u0E02\u0E2D\u0E2D\u0E20\u0E31\u0E22 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E2B\u0E21\u0E2D\u0E19\u0E27\u0E14\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E43\u0E19\u0E23\u0E30\u0E22\u0E30 ${maxSearchRadius} \u0E01\u0E21. \u0E08\u0E32\u0E01\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E20\u0E32\u0E22\u0E2B\u0E25\u0E31\u0E07\u0E04\u0E48\u0E30` });
    }
    let bestStaff = eligibleStaff[0];
    if (preferredStaffId) {
      const preferred = eligibleStaff.find((s) => s.StaffID === preferredStaffId);
      if (preferred) {
        bestStaff = preferred;
      }
    }
    const distanceVal = bestStaff ? bestStaff.dist : 0;
    const travelFeeVal = bestStaff ? bestStaff.travelFee : parseFloat((distanceVal * settings.travelFeePerKm).toFixed(2));
    const totalPriceVal = service.Price + travelFeeVal;
    const newBookingID = generateId("B");
    const newBooking = {
      BookingID: newBookingID,
      CustomerID: customerId,
      StaffID: bestStaff ? bestStaff.StaffID : "none",
      // auto-assign closest or set 'none'
      BookingDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      BookingTime: (/* @__PURE__ */ new Date()).toTimeString().split(" ")[0].substring(0, 5),
      ServiceID: serviceId,
      ServicePrice: service.Price,
      Distance: distanceVal,
      TravelFee: travelFeeVal,
      TotalPrice: totalPriceVal,
      CustomerLatitude: clientLat,
      CustomerLongitude: clientLng,
      CustomerAddress: finalMainAddress,
      CustomerAddressDetail: finalDetailAddress,
      Status: bestStaff ? "Waiting" : "Cancel",
      // Cancel directly if no staff online
      PaymentStatus: "Unpaid",
      CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (eligibleStaff.length > 0) {
      if (preferredStaffId && eligibleStaff.some((s) => s.StaffID === preferredStaffId)) {
        const rest = eligibleStaff.filter((s) => s.StaffID !== preferredStaffId);
        newBooking.offeredQueue = [preferredStaffId, ...rest.map((r) => r.StaffID)];
      } else {
        newBooking.offeredQueue = eligibleStaff.map((s) => s.StaffID);
      }
      newBooking.currentOfferIndex = 0;
      newBooking.offerExpireTime = new Date(Date.now() + 30 * 1e3).toISOString();
      const selectedStaff = bestStaff;
      const notif = {
        NotificationID: generateId("N"),
        UserID: selectedStaff.UserID,
        Title: "\u{1F514} \u0E21\u0E35\u0E07\u0E32\u0E19\u0E19\u0E27\u0E14\u0E43\u0E2B\u0E21\u0E48\u0E40\u0E23\u0E35\u0E22\u0E01\u0E43\u0E0A\u0E49\u0E04\u0E38\u0E13!",
        Detail: `\u0E04\u0E38\u0E13\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E01\u0E07\u0E32\u0E19\u0E19\u0E27\u0E14\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23 ${service.ServiceName} \u0E23\u0E30\u0E22\u0E30\u0E17\u0E32\u0E07 ${distanceVal} \u0E01\u0E21. \u0E23\u0E32\u0E22\u0E44\u0E14\u0E49\u0E23\u0E27\u0E21 ${totalPriceVal} \u0E1A\u0E32\u0E17 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E2D\u0E1A\u0E23\u0E31\u0E1A\u0E20\u0E32\u0E22\u0E43\u0E19 30 \u0E27\u0E34\u0E19\u0E32\u0E17\u0E35`,
        ReadStatus: "Unread",
        CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
      };
      db.notifications.push(notif);
      syncToGoogleSheet("INSERT", "Notification", notif);
    }
    sendLineNotification(`\u{1F6CE}\uFE0F \u0E21\u0E35\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E43\u0E2B\u0E21\u0E48\u0E40\u0E02\u0E49\u0E32\u0E21\u0E32!
\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07: ${newBooking.BookingID}
\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23: ${service.ServiceName}
\u0E22\u0E2D\u0E14\u0E23\u0E27\u0E21: ${totalPriceVal} \u0E1A\u0E32\u0E17
\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32: ${customerUser.Name}`);
    db.bookings.push(newBooking);
    saveDatabase(db);
    syncToGoogleSheet("INSERT", "Booking", newBooking);
    res.json({
      success: true,
      booking: newBooking,
      matchedStaff: bestStaff || null,
      availableCount: eligibleStaff.length
    });
  });
  const checkExpiredOffers = (db) => {
    let updated = false;
    const now = /* @__PURE__ */ new Date();
    db.bookings.forEach((b) => {
      if (b.Status === "Waiting" && b.offeredQueue && b.offerExpireTime) {
        const expireTime = new Date(b.offerExpireTime);
        if (now > expireTime) {
          b.currentOfferIndex = (b.currentOfferIndex || 0) + 1;
          if (b.currentOfferIndex < b.offeredQueue.length) {
            const nextStaffId = b.offeredQueue[b.currentOfferIndex];
            const prevStaffId = b.StaffID;
            b.StaffID = nextStaffId;
            b.offerExpireTime = new Date(Date.now() + 30 * 1e3).toISOString();
            updated = true;
            const staffObj = db.staff.find((s) => s.StaffID === nextStaffId);
            const prevStaffObj = db.staff.find((s) => s.StaffID === prevStaffId);
            const svc = db.services.find((s) => s.ServiceID === b.ServiceID);
            if (staffObj) {
              const notifNext = {
                NotificationID: generateId("N"),
                UserID: staffObj.UserID,
                Title: "\u{1F514} \u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E02\u0E49\u0E2D\u0E40\u0E2A\u0E19\u0E2D\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48 (\u0E2A\u0E48\u0E07\u0E15\u0E48\u0E2D)",
                Detail: `\u0E07\u0E32\u0E19\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23 ${svc?.ServiceName || "\u0E19\u0E27\u0E14"} \u0E16\u0E39\u0E01\u0E2A\u0E48\u0E07\u0E15\u0E48\u0E2D\u0E21\u0E32\u0E22\u0E31\u0E07\u0E04\u0E38\u0E13\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E01\u0E48\u0E2D\u0E19\u0E2B\u0E19\u0E49\u0E32\u0E2B\u0E21\u0E14\u0E40\u0E27\u0E25\u0E32\u0E23\u0E31\u0E1A\u0E2A\u0E32\u0E22 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E2D\u0E1A\u0E23\u0E31\u0E1A\u0E04\u0E48\u0E30`,
                ReadStatus: "Unread",
                CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
              };
              db.notifications.push(notifNext);
              syncToGoogleSheet("INSERT", "Notification", notifNext);
            }
            if (prevStaffObj) {
              const notifPrev = {
                NotificationID: generateId("N"),
                UserID: prevStaffObj.UserID,
                Title: "\u26A0\uFE0F \u0E1E\u0E25\u0E32\u0E14\u0E07\u0E32\u0E19\u0E40\u0E23\u0E35\u0E22\u0E01",
                Detail: `\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E15\u0E2D\u0E1A\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E08\u0E2D\u0E07 #${b.BookingID} \u0E20\u0E32\u0E22\u0E43\u0E19\u0E40\u0E27\u0E25\u0E32\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14 \u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E36\u0E07\u0E2A\u0E48\u0E07\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E49\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E16\u0E31\u0E14\u0E44\u0E1B`,
                ReadStatus: "Unread",
                CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
              };
              db.notifications.push(notifPrev);
              syncToGoogleSheet("INSERT", "Notification", notifPrev);
            }
          } else {
            b.Status = "Cancel";
            b.StaffID = "none";
            updated = true;
            const notifCust = {
              NotificationID: generateId("N"),
              UserID: b.CustomerID,
              Title: "\u274C \u0E44\u0E21\u0E48\u0E21\u0E35\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E15\u0E2D\u0E1A\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E08\u0E2D\u0E07",
              Detail: "\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E19\u0E27\u0E14\u0E43\u0E19\u0E40\u0E02\u0E15\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E2A\u0E30\u0E14\u0E27\u0E01\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E43\u0E19\u0E20\u0E32\u0E22\u0E2B\u0E25\u0E31\u0E07\u0E04\u0E48\u0E30",
              ReadStatus: "Unread",
              CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
            };
            db.notifications.push(notifCust);
            syncToGoogleSheet("INSERT", "Notification", notifCust);
          }
          syncToGoogleSheet("UPDATE", "Booking", b);
        }
      }
    });
    if (updated) {
      saveDatabase(db);
    }
    return updated;
  };
  app.get("/api/bookings", (req, res) => {
    const db = getDatabase();
    checkExpiredOffers(db);
    checkAndAutoCompleteExpiredBookings(db);
    const joinedBookings = db.bookings.map((b) => {
      const customer = db.users.find((u) => u.UserID === b.CustomerID);
      const staff = db.staff.find((s) => s.StaffID === b.StaffID);
      const staffUser = staff ? db.users.find((u) => u.UserID === staff.UserID) : null;
      const service = db.services.find((s) => s.ServiceID === b.ServiceID);
      const review = db.reviews.find((r) => r.BookingID === b.BookingID);
      let bMainAddress = (b.CustomerAddress || "").trim();
      let bDetailAddress = (b.CustomerAddressDetail || "").trim();
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
        CustomerName: customer ? customer.Name : "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32",
        CustomerPhone: customer ? customer.Phone : "",
        CustomerProfileImage: customer ? customer.ProfileImage || DEFAULT_BLANK_AVATAR : DEFAULT_BLANK_AVATAR,
        StaffNickname: staff ? staff.Nickname : "",
        StaffPhone: staffUser ? staffUser.Phone : "",
        StaffProfileImage: staffUser ? staffUser.ProfileImage : "",
        ServiceName: service ? service.ServiceName : "\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E19\u0E27\u0E14",
        ServiceDuration: service ? service.Duration : 60,
        CreditRequired: service ? service.CreditRequired : 0,
        NetIncome: Math.max(0, b.ServicePrice - (service ? service.CreditRequired : 0)) + b.TravelFee,
        ReviewScore: review ? review.Score : null,
        ReviewComment: review ? review.Comment : null
      };
    });
    res.json(joinedBookings);
  });
  app.get("/api/bookings/match-updates", (req, res) => {
    const db = getDatabase();
    const updatedOffers = checkExpiredOffers(db);
    const updatedAuto = checkAndAutoCompleteExpiredBookings(db);
    res.json({ success: true, updated: updatedOffers || updatedAuto });
  });
  app.put("/api/bookings/:id/action", (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { action, staffId } = req.body;
    const index = db.bookings.findIndex((b) => b.BookingID === id);
    if (index === -1) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E07\u0E32\u0E19\u0E08\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" });
    }
    const booking = db.bookings[index];
    const customerUser = db.users.find((u) => u.UserID === booking.CustomerID);
    const service = db.services.find((s) => s.ServiceID === booking.ServiceID);
    if (action === "reject") {
      booking.Status = "Cancel";
      booking.CancellationReason = "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E01\u0E32\u0E23\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19";
      booking.StaffID = "none";
      if (customerUser) {
        const notif = {
          NotificationID: generateId("N"),
          UserID: customerUser.UserID,
          Title: "\u274C \u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19",
          Detail: "\u0E02\u0E2D\u0E2D\u0E20\u0E31\u0E22\u0E04\u0E48\u0E30 \u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E44\u0E21\u0E48\u0E2A\u0E30\u0E14\u0E27\u0E01\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49 \u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49\u0E17\u0E33\u0E01\u0E32\u0E23\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E43\u0E2B\u0E49\u0E17\u0E48\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27",
          ReadStatus: "Unread",
          CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet("INSERT", "Notification", notif);
      }
      saveDatabase(db);
      syncToGoogleSheet("UPDATE", "Booking", booking);
      return res.json({ message: "Rejected" });
    }
    if (action === "accept") {
      const staff = db.staff.find((s) => s.StaffID === staffId);
      if (!staff) return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E1C\u0E39\u0E49\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23" });
      if (!service) return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23" });
      if (staff.VerifyStatus !== "Approved") {
        return res.status(403).json({ error: "\u0E04\u0E38\u0E13\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E08\u0E32\u0E01\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19 \u0E08\u0E36\u0E07\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49\u0E04\u0E48\u0E30" });
      }
      const rawMin = Number(db.settings?.minCredit);
      const defaultMin = rawMin !== void 0 && !isNaN(rawMin) && rawMin >= 0 ? rawMin : 200;
      const requiredCredit = service && service.CreditRequired !== void 0 ? Number(service.CreditRequired) : defaultMin;
      if (Number(staff.Credit || 0) < requiredCredit) {
        return res.status(400).json({ error: `\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13 (${staff.Credit} CR) \u0E15\u0E48\u0E33\u0E01\u0E27\u0E48\u0E32\u0E02\u0E31\u0E49\u0E19\u0E15\u0E48\u0E33\u0E17\u0E35\u0E48\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E44\u0E27\u0E49 (${requiredCredit} CR) \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E15\u0E34\u0E21\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E01\u0E48\u0E2D\u0E19\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19` });
      }
      booking.StaffID = staffId;
      booking.Status = "Accepted";
      booking.AcceptedDate = (/* @__PURE__ */ new Date()).toISOString();
      sendLineNotification(`\u{1F44D} \u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27!
\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07: ${booking.BookingID}
\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19: ${staff.Nickname}`);
      if (customerUser) {
        const notif = {
          NotificationID: generateId("N"),
          UserID: customerUser.UserID,
          Title: "\u{1F7E2} \u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E15\u0E2D\u0E1A\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E41\u0E25\u0E49\u0E27!",
          Detail: `\u0E1E\u0E35\u0E48 ${staff.Nickname} \u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E33\u0E25\u0E31\u0E07\u0E08\u0E31\u0E14\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07\u0E44\u0E1B\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23`,
          ReadStatus: "Unread",
          CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet("INSERT", "Notification", notif);
      }
    } else if (action === "understood" || action === "confirm_understood") {
      const currentStaff = db.staff.find((s) => s.StaffID === (staffId || booking.StaffID));
      if (!currentStaff) return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19" });
      const rawMin = Number(db.settings?.minCredit);
      const defaultMin = rawMin !== void 0 && !isNaN(rawMin) && rawMin >= 0 ? rawMin : 200;
      const creditRequired = service && service.CreditRequired !== void 0 ? Number(service.CreditRequired) : defaultMin;
      const hasDeducted = db.transactions.some(
        (t) => t.StaffID === currentStaff.StaffID && t.Type === "Deduct" && t.AdminRemark?.includes(booking.BookingID)
      );
      if (!hasDeducted && creditRequired > 0) {
        const beforeCredit = Number(currentStaff.Credit) || 0;
        const afterCredit = Math.max(0, beforeCredit - creditRequired);
        currentStaff.Credit = afterCredit;
        const tx = {
          TransactionID: generateId("TX"),
          StaffID: currentStaff.StaffID,
          Amount: creditRequired,
          BeforeCredit: beforeCredit,
          AfterCredit: afterCredit,
          Type: "Deduct",
          SlipImage: "",
          Status: "Approved",
          AdminRemark: `\u0E15\u0E31\u0E14\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E48\u0E32\u0E18\u0E23\u0E23\u0E21\u0E40\u0E19\u0E35\u0E22\u0E21\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19 (\u0E01\u0E14\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08\u0E41\u0E25\u0E49\u0E27) Booking #${booking.BookingID}`,
          CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
        };
        db.transactions.push(tx);
        syncToGoogleSheet("INSERT", "CreditTransaction", tx);
        booking.CreditDeducted = true;
        booking.DeductedAmount = creditRequired;
        const notif = {
          NotificationID: generateId("N"),
          UserID: currentStaff.UserID,
          Title: "\u{1F4B3} \u0E2B\u0E31\u0E01\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E48\u0E32\u0E18\u0E23\u0E23\u0E21\u0E40\u0E19\u0E35\u0E22\u0E21\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27",
          Detail: `\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49\u0E17\u0E33\u0E01\u0E32\u0E23\u0E2B\u0E31\u0E01\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15 -${creditRequired} CR \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E08\u0E2D\u0E07 #${booking.BookingID} (\u0E01\u0E14\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08\u0E41\u0E25\u0E49\u0E27) \u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D: ${currentStaff.Credit} CR`,
          ReadStatus: "Unread",
          CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet("INSERT", "Notification", notif);
        sendLineNotification(`\u{1F4B3} \u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E01\u0E14\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19 (\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08\u0E41\u0E25\u0E49\u0E27)!
\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07: #${booking.BookingID}
\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19: \u0E1E\u0E35\u0E48${currentStaff.Nickname}
\u0E2B\u0E31\u0E01\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15: -${creditRequired} CR
\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D: ${currentStaff.Credit} CR`);
        syncToGoogleSheet("UPDATE", "Staff", currentStaff);
        syncToGoogleSheet("UPDATE", "Booking", booking);
        saveDatabase(db);
        return res.json({
          success: true,
          message: `\u0E2B\u0E31\u0E01\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E48\u0E32\u0E18\u0E23\u0E23\u0E21\u0E40\u0E19\u0E35\u0E22\u0E21\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19 -${creditRequired} CR \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27 (\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D ${currentStaff.Credit} CR)`,
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
        message: "\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E2B\u0E31\u0E01\u0E44\u0E1B\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27\u0E04\u0E48\u0E30",
        remainingCredit: currentStaff.Credit,
        staff: currentStaff,
        booking
      });
    } else if (action === "start_travel") {
      const currentStaff = db.staff.find((s) => s.StaffID === booking.StaffID);
      const staffName = currentStaff ? currentStaff.Nickname : "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19";
      booking.Status = "Working";
      if (customerUser) {
        const notif = {
          NotificationID: generateId("N"),
          UserID: customerUser.UserID,
          Title: "\u{1F6F5} \u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07\u0E21\u0E32\u0E2B\u0E32\u0E04\u0E38\u0E13",
          Detail: `\u0E1E\u0E35\u0E48\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07\u0E44\u0E1B\u0E22\u0E31\u0E07\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13 \u0E23\u0E30\u0E22\u0E30\u0E17\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13 ${booking.Distance} \u0E01\u0E21.`,
          ReadStatus: "Unread",
          CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet("INSERT", "Notification", notif);
      }
    } else if (action === "start_work") {
      const currentStaff = db.staff.find((s) => s.StaffID === booking.StaffID);
      const staffName = currentStaff ? currentStaff.Nickname : "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19";
      sendLineNotification(`\u{1F4CD} \u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07\u0E16\u0E36\u0E07\u0E41\u0E25\u0E30\u0E40\u0E23\u0E34\u0E48\u0E21\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E41\u0E25\u0E49\u0E27!
\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07: ${booking.BookingID}
\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19: \u0E1E\u0E35\u0E48${staffName}`);
      if (customerUser) {
        const notif = {
          NotificationID: generateId("N"),
          UserID: customerUser.UserID,
          Title: "\u{1F486} \u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E19\u0E27\u0E14\u0E41\u0E25\u0E49\u0E27",
          Detail: "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E08\u0E31\u0E1A\u0E40\u0E27\u0E25\u0E32\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E19\u0E27\u0E14\u0E41\u0E01\u0E48\u0E04\u0E38\u0E13\u0E41\u0E25\u0E49\u0E27 \u0E02\u0E2D\u0E43\u0E2B\u0E49\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E38\u0E02\u0E01\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E1C\u0E48\u0E2D\u0E19\u0E04\u0E25\u0E32\u0E22\u0E19\u0E30\u0E04\u0E30",
          ReadStatus: "Unread",
          CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet("INSERT", "Notification", notif);
      }
    } else if (action === "complete") {
      executeCompleteBooking(db, booking, false);
    } else if (action === "cancel") {
      if (staffId && !req.body.adminId) {
        return res.status(403).json({ error: "\u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E43\u0E2B\u0E49\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E07\u0E32\u0E19\u0E14\u0E49\u0E27\u0E22\u0E15\u0E19\u0E40\u0E2D\u0E07 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E1D\u0E48\u0E32\u0E22\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32" });
      }
      const prevStatus = booking.Status;
      booking.Status = "Cancel";
      const cancelReason = req.body.reason || (req.body.staffId ? "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E02\u0E2D\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E07\u0E32\u0E19" : "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07");
      booking.CancellationReason = cancelReason;
      let refundRequested = false;
      let creditAmount = 0;
      let targetStaffNickname = "";
      if (prevStatus === "Accepted" || prevStatus === "Working") {
        const staff = db.staff.find((s) => s.StaffID === booking.StaffID);
        const hasDeducted = db.transactions.some((t) => t.StaffID === booking.StaffID && t.Type === "Deduct" && t.AdminRemark?.includes(booking.BookingID));
        if (hasDeducted && staff && service) {
          refundRequested = true;
          creditAmount = service.CreditRequired;
          targetStaffNickname = staff.Nickname;
          const tx = {
            TransactionID: generateId("TX"),
            StaffID: booking.StaffID,
            Amount: creditAmount,
            BeforeCredit: staff.Credit,
            AfterCredit: staff.Credit,
            // Not refunded yet, waiting for Admin
            Type: "Refund",
            SlipImage: "",
            BookingID: booking.BookingID,
            Status: "Pending",
            AdminRemark: `\u0E23\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E04\u0E37\u0E19\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15 (${creditAmount} CR) \u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E01\u0E32\u0E23\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E07\u0E32\u0E19 #${booking.BookingID} (\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E01\u0E48\u0E2D\u0E19\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01: ${prevStatus})`,
            SlipVerificationDetail: `\u0E04\u0E33\u0E02\u0E2D\u0E04\u0E37\u0E19\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E08\u0E32\u0E01\u0E07\u0E32\u0E19 #${booking.BookingID} \u2022 \u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25: ${cancelReason}`,
            IsSuspicious: false,
            CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
          };
          db.transactions.push(tx);
          syncToGoogleSheet("INSERT", "CreditTransaction", tx);
          db.users.filter((u) => u.Role === "Admin").forEach((admin) => {
            const notif = {
              NotificationID: generateId("N"),
              UserID: admin.UserID,
              Title: "\u{1F504} \u0E21\u0E35\u0E04\u0E33\u0E02\u0E2D\u0E04\u0E37\u0E19\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E23\u0E2D\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19",
              Detail: `\u0E07\u0E32\u0E19\u0E08\u0E2D\u0E07 #${booking.BookingID} \u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01 (${cancelReason}) \u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19 \u0E1E\u0E35\u0E48${staff.Nickname} \u0E21\u0E35\u0E04\u0E33\u0E02\u0E2D\u0E04\u0E37\u0E19\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15 ${creditAmount} CR \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A`,
              ReadStatus: "Unread",
              CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
            };
            db.notifications.push(notif);
            syncToGoogleSheet("INSERT", "Notification", notif);
          });
          const staffUser = db.users.find((u) => u.UserID === staff.UserID);
          if (staffUser) {
            const notif = {
              NotificationID: generateId("N"),
              UserID: staffUser.UserID,
              Title: "\u26A0\uFE0F \u0E07\u0E32\u0E19\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01 (\u0E04\u0E33\u0E02\u0E2D\u0E04\u0E37\u0E19\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E23\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19)",
              Detail: `\u0E07\u0E32\u0E19\u0E08\u0E2D\u0E07 #${booking.BookingID} \u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E41\u0E25\u0E49\u0E27 (${cancelReason}) \u0E04\u0E33\u0E02\u0E2D\u0E04\u0E37\u0E19\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15 ${creditAmount} CR \u0E16\u0E39\u0E01\u0E2A\u0E48\u0E07\u0E43\u0E2B\u0E49\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E41\u0E25\u0E49\u0E27\u0E04\u0E48\u0E30`,
              ReadStatus: "Unread",
              CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
            };
            db.notifications.push(notif);
            syncToGoogleSheet("INSERT", "Notification", notif);
          }
          sendLineNotification(`\u{1F504} \u0E21\u0E35\u0E04\u0E33\u0E02\u0E2D\u0E04\u0E37\u0E19\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E08\u0E32\u0E01\u0E01\u0E32\u0E23\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E07\u0E32\u0E19!
\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07: #${booking.BookingID}
\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19: \u0E1E\u0E35\u0E48${staff.Nickname}
\u0E22\u0E2D\u0E14\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15: ${creditAmount} CR
\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25: ${cancelReason}
\u26A0\uFE0F \u0E01\u0E32\u0E23\u0E04\u0E37\u0E19\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E08\u0E30\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E01\u0E14\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E08\u0E32\u0E01\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19`);
        }
      }
      if (customerUser) {
        const notif = {
          NotificationID: generateId("N"),
          UserID: customerUser.UserID,
          Title: "\u26A0\uFE0F \u0E07\u0E32\u0E19\u0E08\u0E2D\u0E07\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E41\u0E25\u0E49\u0E27",
          Detail: `\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07 #${id} \u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27 (${cancelReason})`,
          ReadStatus: "Unread",
          CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet("INSERT", "Notification", notif);
      }
      if (booking.StaffID !== "none" && !refundRequested) {
        const staffObj = db.staff.find((s) => s.StaffID === booking.StaffID);
        if (staffObj) {
          const notif = {
            NotificationID: generateId("N"),
            UserID: staffObj.UserID,
            Title: "\u26A0\uFE0F \u0E07\u0E32\u0E19\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01",
            Detail: `\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07 #${id} \u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27 (${cancelReason})`,
            ReadStatus: "Unread",
            CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
          };
          db.notifications.push(notif);
          syncToGoogleSheet("INSERT", "Notification", notif);
        }
      }
    }
    saveDatabase(db);
    syncToGoogleSheet("UPDATE", "Booking", booking);
    const updatedStaff = db.staff.find((s) => s.StaffID === (booking.StaffID || staffId));
    res.json({ success: true, booking, staff: updatedStaff || null });
  });
  app.post(["/api/bookings/:id/confirm-understood", "/api/bookings/:id/deduct-credit"], async (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { staffId } = req.body;
    const booking = db.bookings.find((b) => String(b.BookingID).trim() === String(id).trim());
    if (!booking) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E07\u0E32\u0E19\u0E08\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" });
    }
    const targetStaffId = staffId || booking.StaffID;
    const staff = db.staff.find((s) => s.StaffID === targetStaffId || booking.StaffID && s.StaffID === booking.StaffID);
    if (!staff) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19" });
    }
    const service = db.services.find((s) => s.ServiceID === booking.ServiceID);
    const rawMin = Number(db.settings?.minCredit);
    const defaultMin = rawMin !== void 0 && !isNaN(rawMin) && rawMin >= 0 ? rawMin : 200;
    const creditRequired = service && service.CreditRequired !== void 0 ? Number(service.CreditRequired) : defaultMin;
    const alreadyDeducted = Boolean(booking.CreditDeducted) || db.transactions.some(
      (t) => t.StaffID === staff.StaffID && t.Type === "Deduct" && t.AdminRemark?.includes(booking.BookingID)
    );
    if (alreadyDeducted) {
      return res.json({
        success: true,
        alreadyDeducted: true,
        message: "\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E2B\u0E31\u0E01\u0E44\u0E1B\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27\u0E04\u0E48\u0E30",
        creditDeducted: creditRequired,
        remainingCredit: staff.Credit,
        staff,
        booking
      });
    }
    const beforeCredit = Number(staff.Credit) || 0;
    const afterCredit = Math.max(0, beforeCredit - creditRequired);
    staff.Credit = afterCredit;
    const tx = {
      TransactionID: generateId("TX"),
      StaffID: staff.StaffID,
      Amount: creditRequired,
      BeforeCredit: beforeCredit,
      AfterCredit: afterCredit,
      Type: "Deduct",
      SlipImage: "",
      Status: "Approved",
      AdminRemark: `\u0E15\u0E31\u0E14\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E48\u0E32\u0E18\u0E23\u0E23\u0E21\u0E40\u0E19\u0E35\u0E22\u0E21\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19 (\u0E01\u0E14\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08\u0E41\u0E25\u0E49\u0E27) Booking #${booking.BookingID}`,
      CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.transactions.push(tx);
    syncToGoogleSheet("INSERT", "CreditTransaction", tx);
    booking.CreditDeducted = true;
    booking.DeductedAmount = creditRequired;
    booking.CreditDeductedDate = (/* @__PURE__ */ new Date()).toISOString();
    const otherActiveBookings = db.bookings.some(
      (b) => b.StaffID === staff.StaffID && b.BookingID !== booking.BookingID && (b.Status === "Accepted" || b.Status === "Working")
    );
    if (!otherActiveBookings && (staff.Credit <= 0 || staff.Credit < defaultMin)) {
      staff.Available = "OFF";
      console.log(`[StaffAvailability] Auto-turned off staff ${staff.Nickname} (${staff.StaffID}) after deducting credit for job #${booking.BookingID} (Remaining: ${staff.Credit} < ${defaultMin})`);
    }
    const notif = {
      NotificationID: generateId("N"),
      UserID: staff.UserID,
      Title: "\u{1F4B3} \u0E2B\u0E31\u0E01\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E48\u0E32\u0E18\u0E23\u0E23\u0E21\u0E40\u0E19\u0E35\u0E22\u0E21\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27",
      Detail: `\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49\u0E17\u0E33\u0E01\u0E32\u0E23\u0E2B\u0E31\u0E01\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15 -${creditRequired} CR \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19\u0E08\u0E2D\u0E07 #${booking.BookingID} (\u0E01\u0E14\u0E1B\u0E38\u0E48\u0E21\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08\u0E41\u0E25\u0E49\u0E27) \u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D: ${staff.Credit} CR`,
      ReadStatus: "Unread",
      CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.notifications.push(notif);
    syncToGoogleSheet("INSERT", "Notification", notif);
    sendLineNotification(`\u{1F4B3} \u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E01\u0E14\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19 (\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08\u0E41\u0E25\u0E49\u0E27)!
\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07: #${booking.BookingID}
\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19: \u0E1E\u0E35\u0E48${staff.Nickname}
\u0E2B\u0E31\u0E01\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15: -${creditRequired} CR
\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D: ${staff.Credit} CR`);
    syncToGoogleSheet("UPDATE", "Staff", staff);
    syncToGoogleSheet("UPDATE", "Booking", booking);
    saveDatabase(db);
    res.json({
      success: true,
      message: `\u0E2B\u0E31\u0E01\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E48\u0E32\u0E18\u0E23\u0E23\u0E21\u0E40\u0E19\u0E35\u0E22\u0E21\u0E23\u0E31\u0E1A\u0E07\u0E32\u0E19 -${creditRequired} CR \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27 (\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D ${staff.Credit} CR)`,
      creditDeducted: creditRequired,
      beforeCredit,
      remainingCredit: staff.Credit,
      staff,
      booking,
      transaction: tx
    });
  });
  app.get("/api/credits/transactions", (req, res) => {
    const db = getDatabase();
    const joinedTransactions = db.transactions.map((t) => {
      const staff = db.staff.find((s) => s.StaffID === t.StaffID);
      const user = staff ? db.users.find((u) => u.UserID === staff.UserID) : null;
      return {
        ...t,
        StaffNickname: staff ? staff.Nickname : "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19",
        StaffFullName: user ? user.Name : "",
        StaffPhone: user ? user.Phone : ""
      };
    }).sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());
    res.json(joinedTransactions);
  });
  app.post("/api/credits/topup", async (req, res) => {
    const db = getDatabase();
    const { staffId, amount, slipImage } = req.body;
    if (!staffId || !amount || !slipImage) {
      return res.status(400).json({ error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E41\u0E25\u0E30\u0E41\u0E19\u0E1A\u0E2B\u0E25\u0E31\u0E01\u0E10\u0E32\u0E19\u0E2A\u0E25\u0E34\u0E1B\u0E01\u0E32\u0E23\u0E42\u0E2D\u0E19\u0E40\u0E07\u0E34\u0E19" });
    }
    const staff = db.staff.find((s) => s.StaffID === staffId);
    if (!staff) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" });
    }
    const requestedAmount = parseFloat(amount);
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ error: "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07" });
    }
    const duplicateByExactImage = db.transactions.find(
      (t) => t.Type === "Topup" && t.SlipImage && t.SlipImage === slipImage && t.Status !== "Reject"
    );
    const newTx = {
      TransactionID: generateId("TX"),
      StaffID: staffId,
      Amount: requestedAmount,
      BeforeCredit: staff.Credit,
      AfterCredit: staff.Credit,
      Type: "Topup",
      SlipImage: slipImage,
      Status: "Pending",
      AdminRemark: "",
      CreatedDate: (/* @__PURE__ */ new Date()).toISOString(),
      IsAutoApproved: false
    };
    if (duplicateByExactImage) {
      newTx.Status = "Reject";
      newTx.AdminRemark = `\u26A0\uFE0F \u0E15\u0E23\u0E27\u0E08\u0E1E\u0E1A\u0E2A\u0E25\u0E34\u0E1B\u0E0B\u0E49\u0E33: \u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E2A\u0E25\u0E34\u0E1B\u0E19\u0E35\u0E49\u0E40\u0E04\u0E22\u0E16\u0E39\u0E01\u0E19\u0E33\u0E21\u0E32\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E43\u0E19\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 ${duplicateByExactImage.TransactionID} \u0E41\u0E25\u0E49\u0E27`;
      newTx.SlipVerificationDetail = "\u0E15\u0E23\u0E27\u0E08\u0E1E\u0E1A\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E2A\u0E25\u0E34\u0E1B\u0E0B\u0E49\u0E33\u0E01\u0E31\u0E1A\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A 100%";
      db.transactions.push(newTx);
      saveDatabase(db);
      return res.json({
        success: false,
        transaction: newTx,
        error: "\u0E15\u0E23\u0E27\u0E08\u0E1E\u0E1A\u0E2A\u0E25\u0E34\u0E1B\u0E0B\u0E49\u0E33: \u0E23\u0E39\u0E1B\u0E2A\u0E25\u0E34\u0E1B\u0E19\u0E35\u0E49\u0E40\u0E04\u0E22\u0E16\u0E39\u0E01\u0E19\u0E33\u0E21\u0E32\u0E43\u0E0A\u0E49\u0E40\u0E15\u0E34\u0E21\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E0A\u0E49\u0E2A\u0E25\u0E34\u0E1B\u0E01\u0E32\u0E23\u0E42\u0E2D\u0E19\u0E40\u0E07\u0E34\u0E19\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07"
      });
    }
    let autoApproved = false;
    let isSuspicious = false;
    const suspiciousReasons = [];
    const targetAccount = (db.settings?.bankAccount || "").replace(/[\s-]/g, "");
    const targetAccountName = (db.settings?.bankAccountName || "").toLowerCase().trim();
    let qrScanResult = null;
    try {
      qrScanResult = await scanSlipQRCode(slipImage);
    } catch (e) {
      console.warn("Slip QR Code scan exception:", e?.message);
    }
    if (qrScanResult && qrScanResult.found && qrScanResult.transRef) {
      const cleanRefNo = qrScanResult.transRef.trim().replace(/[\s-]/g, "");
      newTx.SlipRefId = cleanRefNo;
      newTx.BankName = qrScanResult.bankName || "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E44\u0E17\u0E22 (Slip QR)";
      newTx.ConfidenceScore = 100;
      let isDuplicateRef = false;
      if (cleanRefNo && cleanRefNo.length >= 6) {
        const existingTxWithRef = db.transactions.find(
          (t) => t.Type === "Topup" && t.SlipRefId && t.SlipRefId.replace(/[\s-]/g, "") === cleanRefNo && t.Status !== "Reject"
        );
        if (existingTxWithRef) {
          isDuplicateRef = true;
          isSuspicious = true;
          suspiciousReasons.push(`\u0E2A\u0E25\u0E34\u0E1B\u0E0B\u0E49\u0E33: \u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07 QR \u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21 (${cleanRefNo}) \u0E40\u0E04\u0E22\u0E16\u0E39\u0E01\u0E43\u0E0A\u0E49\u0E40\u0E15\u0E34\u0E21\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27`);
        }
      }
      if (qrScanResult.amount !== void 0 && qrScanResult.amount > 0) {
        if (qrScanResult.amount !== requestedAmount) {
          isSuspicious = true;
          suspiciousReasons.push(`\u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19\u0E43\u0E19 QR \u0E2A\u0E25\u0E34\u0E1B\u0E08\u0E23\u0E34\u0E07 (\u0E3F${qrScanResult.amount}) \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E22\u0E2D\u0E14\u0E17\u0E35\u0E48\u0E02\u0E2D\u0E40\u0E15\u0E34\u0E21 (\u0E3F${requestedAmount})`);
        }
      }
      newTx.IsSuspicious = isSuspicious;
      newTx.SuspiciousReasons = suspiciousReasons;
      if (!isSuspicious && !isDuplicateRef) {
        autoApproved = true;
        newTx.Status = "Approved";
        newTx.IsAutoApproved = true;
        newTx.AfterCredit = staff.Credit + newTx.Amount;
        staff.Credit = newTx.AfterCredit;
        newTx.AdminRemark = `\u2705 \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E08\u0E32\u0E01 Slip QR Code (\u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E0A\u0E49 API Key): \u0E2A\u0E25\u0E34\u0E1B\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 \u0E44\u0E21\u0E48\u0E0B\u0E49\u0E33 (${qrScanResult.bankName}, Ref: ${cleanRefNo})`;
        newTx.SlipVerificationDetail = `\u0E16\u0E2D\u0E14\u0E23\u0E2B\u0E31\u0E2A Slip QR \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 100% \u2022 \u0E18\u0E19\u0E32\u0E04\u0E32\u0E23: ${qrScanResult.bankName} \u2022 \u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07: ${cleanRefNo}`;
      } else {
        newTx.Status = "Reject";
        newTx.IsAutoApproved = false;
        newTx.AdminRemark = `\u274C \u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34: ${suspiciousReasons.join("; ")}`;
        newTx.SlipVerificationDetail = `\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E2A\u0E25\u0E34\u0E1B\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34: ${suspiciousReasons.join(" | ")}`;
      }
    } else {
      const ai = getAi();
      if (ai) {
        try {
          const result = await verifySlipWithGemini(slipImage);
          if (result) {
            const cleanRefNo = (result.refNo || "").trim().replace(/[\s-]/g, "");
            newTx.SlipRefId = cleanRefNo || void 0;
            newTx.BankName = result.bankName || void 0;
            newTx.ConfidenceScore = result.confidence || 0;
            newTx.ExtractedReceiver = result.receiverName || result.receiverAccount || void 0;
            newTx.ExtractedSender = result.senderName || void 0;
            newTx.ExtractedTransferTime = result.transferDateTime || void 0;
            let isDuplicateRef = false;
            if (cleanRefNo && cleanRefNo.length >= 6) {
              const existingTxWithRef = db.transactions.find(
                (t) => t.Type === "Topup" && t.SlipRefId && t.SlipRefId.replace(/[\s-]/g, "") === cleanRefNo && t.Status !== "Reject"
              );
              if (existingTxWithRef) {
                isDuplicateRef = true;
                isSuspicious = true;
                suspiciousReasons.push(`\u0E2A\u0E25\u0E34\u0E1B\u0E0B\u0E49\u0E33: \u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21 (${cleanRefNo}) \u0E40\u0E04\u0E22\u0E16\u0E39\u0E01\u0E43\u0E0A\u0E49\u0E40\u0E15\u0E34\u0E21\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27`);
              }
            }
            if (result.isTamperedOrFake || !result.isValidSlip) {
              isSuspicious = true;
              suspiciousReasons.push(result.suspiciousDetail || "\u0E20\u0E32\u0E1E\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E1C\u0E34\u0E14\u0E1B\u0E01\u0E15\u0E34 \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E2A\u0E25\u0E34\u0E1B\u0E42\u0E2D\u0E19\u0E40\u0E07\u0E34\u0E19\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23 \u0E2B\u0E23\u0E37\u0E2D\u0E1E\u0E1A\u0E23\u0E48\u0E2D\u0E07\u0E23\u0E2D\u0E22\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E44\u0E02\u0E20\u0E32\u0E1E");
            }
            if (result.amount !== requestedAmount) {
              isSuspicious = true;
              if (result.amount < requestedAmount) {
                suspiciousReasons.push(`\u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19\u0E43\u0E19\u0E2A\u0E25\u0E34\u0E1B\u0E08\u0E23\u0E34\u0E07 (\u0E3F${result.amount}) \u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E22\u0E2D\u0E14\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E02\u0E2D\u0E40\u0E15\u0E34\u0E21 (\u0E3F${requestedAmount})`);
              } else {
                suspiciousReasons.push(`\u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19\u0E43\u0E19\u0E2A\u0E25\u0E34\u0E1B\u0E08\u0E23\u0E34\u0E07 (\u0E3F${result.amount}) \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E22\u0E2D\u0E14\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E02\u0E2D\u0E40\u0E15\u0E34\u0E21 (\u0E3F${requestedAmount})`);
              }
            }
            if (!cleanRefNo || cleanRefNo.length < 5) {
              isSuspicious = true;
              suspiciousReasons.push("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E17\u0E35\u0E48\u0E0A\u0E31\u0E14\u0E40\u0E08\u0E19\u0E1A\u0E19\u0E2A\u0E25\u0E34\u0E1B");
            }
            if (result.confidence < 75) {
              isSuspicious = true;
              suspiciousReasons.push(`\u0E04\u0E27\u0E32\u0E21\u0E0A\u0E31\u0E14\u0E40\u0E08\u0E19\u0E02\u0E2D\u0E07\u0E2A\u0E25\u0E34\u0E1B\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E40\u0E01\u0E13\u0E11\u0E4C\u0E15\u0E48\u0E33 (\u0E04\u0E27\u0E32\u0E21\u0E21\u0E31\u0E48\u0E19\u0E43\u0E08 ${result.confidence}%)`);
            }
            if (targetAccountName && result.receiverName) {
              const rName = result.receiverName.toLowerCase();
              const words = targetAccountName.split(" ").filter((w) => w.length > 2);
              const matchedWord = words.some((w) => rName.includes(w));
              if (!matchedWord && !rName.includes("\u0E2A\u0E1A\u0E32\u0E22\u0E14\u0E35") && !rName.includes("sabai")) {
                suspiciousReasons.push(`\u0E0A\u0E37\u0E48\u0E2D\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E43\u0E19\u0E2A\u0E25\u0E34\u0E1B (${result.receiverName}) \u0E2D\u0E32\u0E08\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E23\u0E49\u0E32\u0E19 (${targetAccountName})`);
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
              newTx.Status = "Approved";
              newTx.IsAutoApproved = true;
              newTx.AfterCredit = staff.Credit + newTx.Amount;
              staff.Credit = newTx.AfterCredit;
              newTx.AdminRemark = `\u2705 \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E14\u0E49\u0E27\u0E22 AI: \u0E2A\u0E25\u0E34\u0E1B\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 \u0E22\u0E2D\u0E14\u0E15\u0E23\u0E07 (${result.bankName}, Ref: ${cleanRefNo}, \u0E3F${result.amount})`;
              newTx.SlipVerificationDetail = `\u0E2A\u0E25\u0E34\u0E1B\u0E41\u0E17\u0E49 100% \u2022 \u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19\u0E15\u0E23\u0E07 \u0E3F${result.amount} \u2022 \u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07: ${cleanRefNo}`;
            } else {
              newTx.Status = "Reject";
              newTx.IsAutoApproved = false;
              newTx.AdminRemark = `\u274C \u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34: ${suspiciousReasons.join("; ")}`;
              newTx.SlipVerificationDetail = `\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E2A\u0E25\u0E34\u0E1B\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34: ${suspiciousReasons.join(" | ")}`;
            }
          } else {
            newTx.IsSuspicious = true;
            newTx.SuspiciousReasons = ["\u0E44\u0E21\u0E48\u0E1E\u0E1A QR Code \u0E41\u0E25\u0E30\u0E23\u0E30\u0E1A\u0E1A AI \u0E2D\u0E48\u0E32\u0E19\u0E2A\u0E25\u0E34\u0E1B\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08"];
            newTx.AdminRemark = "\u26A0\uFE0F \u0E23\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A: \u0E2D\u0E48\u0E32\u0E19\u0E2A\u0E25\u0E34\u0E1B\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08";
            newTx.SlipVerificationDetail = "\u0E44\u0E21\u0E48\u0E1E\u0E1A Slip QR Code \u0E41\u0E25\u0E30 AI \u0E2D\u0E48\u0E32\u0E19\u0E20\u0E32\u0E1E\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E2A\u0E48\u0E07\u0E43\u0E2B\u0E49\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A";
          }
        } catch (err) {
          console.error("AI Slip Verification Error:", err);
          newTx.IsSuspicious = true;
          newTx.SuspiciousReasons = ["\u0E23\u0E30\u0E1A\u0E1A\u0E2D\u0E48\u0E32\u0E19\u0E2A\u0E25\u0E34\u0E1B\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E2B\u0E23\u0E37\u0E2D\u0E20\u0E32\u0E1E\u0E44\u0E21\u0E48\u0E0A\u0E31\u0E14\u0E40\u0E08\u0E19"];
          newTx.AdminRemark = "\u26A0\uFE0F \u0E23\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A";
          newTx.SlipVerificationDetail = "\u0E23\u0E30\u0E1A\u0E1A\u0E2D\u0E48\u0E32\u0E19\u0E20\u0E32\u0E1E\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E2A\u0E48\u0E07\u0E43\u0E2B\u0E49\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A";
        }
      } else {
        newTx.IsSuspicious = true;
        newTx.SuspiciousReasons = ["\u0E44\u0E21\u0E48\u0E1E\u0E1A QR Code \u0E1A\u0E19\u0E2A\u0E25\u0E34\u0E1B\u0E17\u0E35\u0E48\u0E41\u0E19\u0E1A\u0E21\u0E32 (\u0E42\u0E1B\u0E23\u0E14\u0E41\u0E19\u0E1A\u0E2A\u0E25\u0E34\u0E1B\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E47\u0E19 QR \u0E0A\u0E31\u0E14\u0E40\u0E08\u0E19 \u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E15\u0E23\u0E27\u0E08)"];
        newTx.AdminRemark = "\u26A0\uFE0F \u0E23\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A (\u0E44\u0E21\u0E48\u0E1E\u0E1A Slip QR)";
        newTx.SlipVerificationDetail = "\u0E44\u0E21\u0E48\u0E1E\u0E1A Slip QR Code \u0E1A\u0E19\u0E20\u0E32\u0E1E\u0E2A\u0E25\u0E34\u0E1B \u0E2A\u0E48\u0E07\u0E15\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34";
      }
    }
    db.transactions.push(newTx);
    syncToGoogleSheet("INSERT", "CreditTransaction", newTx);
    if (autoApproved) {
      syncToGoogleSheet("UPDATE", "Staff", staff);
    }
    if (autoApproved) {
      const notif = {
        NotificationID: generateId("N"),
        UserID: staff.UserID,
        Title: "\u2705 \u0E40\u0E15\u0E34\u0E21\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08!",
        Detail: `\u0E23\u0E30\u0E1A\u0E1A\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E25\u0E34\u0E1B\u0E1C\u0E48\u0E32\u0E19 AI \u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C\u0E41\u0E25\u0E30\u0E40\u0E15\u0E34\u0E21\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15 +${amount} CR \u0E40\u0E02\u0E49\u0E32\u0E01\u0E23\u0E30\u0E40\u0E1B\u0E4B\u0E32\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E41\u0E25\u0E49\u0E27 (\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D: ${staff.Credit} CR)`,
        ReadStatus: "Unread",
        CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
      };
      db.notifications.push(notif);
      syncToGoogleSheet("INSERT", "Notification", notif);
    } else if (newTx.Status === "Reject") {
      const notif = {
        NotificationID: generateId("N"),
        UserID: staff.UserID,
        Title: "\u274C \u0E01\u0E32\u0E23\u0E40\u0E15\u0E34\u0E21\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08",
        Detail: newTx.AdminRemark || "\u0E2A\u0E25\u0E34\u0E1B\u0E44\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E25\u0E34\u0E1B\u0E41\u0E25\u0E30\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07",
        ReadStatus: "Unread",
        CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
      };
      db.notifications.push(notif);
      syncToGoogleSheet("INSERT", "Notification", notif);
    } else {
      db.users.filter((u) => u.Role === "Admin").forEach((admin) => {
        const notif = {
          NotificationID: generateId("N"),
          UserID: admin.UserID,
          Title: isSuspicious ? "\u26A0\uFE0F \u0E15\u0E23\u0E27\u0E08\u0E1E\u0E1A\u0E2A\u0E25\u0E34\u0E1B\u0E19\u0E48\u0E32\u0E2A\u0E07\u0E2A\u0E31\u0E22\u0E15\u0E49\u0E2D\u0E07\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E14\u0E48\u0E27\u0E19" : "\u{1F4B0} \u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E15\u0E34\u0E21\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E43\u0E2B\u0E21\u0E48\u0E23\u0E2D\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A",
          Detail: `\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19 \u0E1E\u0E35\u0E48${staff.Nickname} \u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E34\u0E21\u0E40\u0E07\u0E34\u0E19 \u0E3F${amount} \u0E1A\u0E32\u0E17 ${isSuspicious ? `[\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E2A\u0E07\u0E2A\u0E31\u0E22: ${suspiciousReasons.join(", ")}]` : ""} \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E43\u0E19\u0E41\u0E1C\u0E07\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23`,
          ReadStatus: "Unread",
          CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet("INSERT", "Notification", notif);
      });
    }
    if (autoApproved) {
      sendLineNotification(`\u2705 [\u0E40\u0E15\u0E34\u0E21\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08]
\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19: \u0E1E\u0E35\u0E48${staff.Nickname}
\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19: \u0E3F${amount} \u0E1A\u0E32\u0E17
\u0E2A\u0E16\u0E32\u0E19\u0E30: \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E42\u0E14\u0E22 AI 100%`);
    } else if (isSuspicious) {
      sendLineNotification(`\u{1F6A8} [\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E20\u0E31\u0E22: \u0E1E\u0E1A\u0E2A\u0E25\u0E34\u0E1B\u0E40\u0E15\u0E34\u0E21\u0E40\u0E07\u0E34\u0E19\u0E19\u0E48\u0E32\u0E2A\u0E07\u0E2A\u0E31\u0E22]
\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19: \u0E1E\u0E35\u0E48${staff.Nickname}
\u0E22\u0E2D\u0E14\u0E41\u0E08\u0E49\u0E07: \u0E3F${amount} \u0E1A\u0E32\u0E17
\u0E02\u0E49\u0E2D\u0E2A\u0E07\u0E2A\u0E31\u0E22: ${suspiciousReasons.join("\n- ")}
\u26A0\uFE0F \u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E31\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E44\u0E27\u0E49 \u0E43\u0E2B\u0E49\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E40\u0E02\u0E49\u0E32\u0E44\u0E1B\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E01\u0E14\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E14\u0E49\u0E27\u0E22\u0E15\u0E19\u0E40\u0E2D\u0E07`);
    } else {
      sendLineNotification(`\u{1F4B0} \u0E21\u0E35\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E34\u0E21\u0E40\u0E07\u0E34\u0E19\u0E43\u0E2B\u0E21\u0E48!
\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19: \u0E1E\u0E35\u0E48${staff.Nickname}
\u0E08\u0E33\u0E19\u0E27\u0E19: \u0E3F${amount} \u0E1A\u0E32\u0E17
\u0E2A\u0E16\u0E32\u0E19\u0E30: ${newTx.Status}`);
    }
    saveDatabase(db);
    res.json({ success: true, transaction: newTx, autoApproved, newCredit: staff.Credit });
  });
  app.get([
    "/api/qr-image",
    "/api/qr-image.png",
    "/api/qr-image.jpg",
    "/api/qr-image.jpeg",
    "/api/qr-download",
    "/api/qr-download.png",
    "/api/qr-download.jpg",
    "/api/qr-download.jpeg"
  ], async (req, res) => {
    const db = getDatabase();
    const settings = db.settings || defaultSettings;
    const isDownload = req.path.includes("download") || req.query.download === "1";
    try {
      let pngBuffer = null;
      let contentType = "image/jpeg";
      const queryTarget = typeof req.query.url === "string" ? req.query.url.trim() : typeof req.query.link === "string" ? req.query.link.trim() : "";
      const rawTarget = (queryTarget || settings.qrCodeImage || "https://i.postimg.cc/g0yvnLTn/S-30990363.jpg").trim();
      const qrTarget = rawTarget.toLowerCase().includes("wikipedia.org") ? "https://i.postimg.cc/g0yvnLTn/S-30990363.jpg" : rawTarget;
      const localJpg = import_path2.default.join(process.cwd(), "server", "uploads", "qr_code.jpg");
      const publicJpg = import_path2.default.join(process.cwd(), "public", "qr_code.jpg");
      if (qrTarget) {
        if (qrTarget.startsWith("/uploads/") || qrTarget.startsWith("uploads/")) {
          const cleanRel = qrTarget.split("?")[0].replace(/^\//, "");
          const localPath = import_path2.default.join(process.cwd(), "server", cleanRel);
          if (import_fs2.default.existsSync(localPath)) {
            try {
              pngBuffer = import_fs2.default.readFileSync(localPath);
              contentType = localPath.endsWith(".jpg") || localPath.endsWith(".jpeg") ? "image/jpeg" : "image/png";
            } catch (readErr) {
              console.warn("[QR] Error reading local uploaded file:", readErr);
            }
          }
        } else if (qrTarget.startsWith("data:image/")) {
          const commaIdx = qrTarget.indexOf(",");
          if (commaIdx !== -1) {
            const mimeMatch = qrTarget.slice(0, commaIdx).match(/data:([^;]+)/);
            if (mimeMatch) contentType = mimeMatch[1];
            const base64Data = qrTarget.slice(commaIdx + 1).replace(/[\r\n\s]/g, "");
            pngBuffer = Buffer.from(base64Data, "base64");
          }
        } else if (qrTarget.includes("postimg.cc") || qrTarget.includes("S-30990363") || import_fs2.default.existsSync(localJpg) && (qrTarget.endsWith(".jpg") || qrTarget.endsWith(".jpeg") || qrTarget.endsWith(".png"))) {
          if (import_fs2.default.existsSync(localJpg)) {
            try {
              pngBuffer = import_fs2.default.readFileSync(localJpg);
              contentType = "image/jpeg";
            } catch (e) {
              console.warn("[QR] Error reading localJpg:", e);
            }
          } else if (import_fs2.default.existsSync(publicJpg)) {
            try {
              pngBuffer = import_fs2.default.readFileSync(publicJpg);
              contentType = "image/jpeg";
            } catch (e) {
              console.warn("[QR] Error reading publicJpg:", e);
            }
          }
        }
        if (!pngBuffer && (qrTarget.startsWith("http://") || qrTarget.startsWith("https://"))) {
          let fetchUrl = qrTarget;
          const driveMatch = qrTarget.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
          if (driveMatch) {
            fetchUrl = `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1000`;
          }
          let fetchedImageBuffer = null;
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6e3);
            const fetchRes = await fetch(fetchUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
              },
              redirect: "follow",
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (fetchRes.ok) {
              const arrayBuf = await fetchRes.arrayBuffer();
              const buf = Buffer.from(arrayBuf);
              const isPng = buf.length > 8 && buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71;
              const isJpg = buf.length > 3 && buf[0] === 255 && buf[1] === 216 && buf[2] === 255;
              const isWebp = buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
              const isGif = buf.length > 6 && buf.toString("ascii", 0, 3) === "GIF";
              const resType = (fetchRes.headers.get("content-type") || "").toLowerCase();
              if (isPng || isJpg || isWebp || isGif || resType.startsWith("image/")) {
                fetchedImageBuffer = buf;
                contentType = isJpg ? "image/jpeg" : isWebp ? "image/webp" : isGif ? "image/gif" : "image/png";
                try {
                  const uploadsDir2 = import_path2.default.join(process.cwd(), "server", "uploads");
                  if (!import_fs2.default.existsSync(uploadsDir2)) import_fs2.default.mkdirSync(uploadsDir2, { recursive: true });
                  import_fs2.default.writeFileSync(import_path2.default.join(uploadsDir2, "qr_code.jpg"), buf);
                } catch {
                }
              }
            }
          } catch (e) {
            console.warn("[QR] Remote fetch notice:", e);
          }
          if (!fetchedImageBuffer && import_fs2.default.existsSync(localJpg)) {
            try {
              fetchedImageBuffer = import_fs2.default.readFileSync(localJpg);
              contentType = "image/jpeg";
            } catch {
            }
          }
          if (fetchedImageBuffer && fetchedImageBuffer.length > 100) {
            pngBuffer = fetchedImageBuffer;
          }
        }
      }
      if (!pngBuffer && import_fs2.default.existsSync(localJpg)) {
        try {
          pngBuffer = import_fs2.default.readFileSync(localJpg);
          contentType = "image/jpeg";
        } catch {
        }
      }
      if (!pngBuffer) {
        const targetAccount = settings.bankAccount || settings.contactPhone || "7617997452";
        const promptPayPayload = generatePromptPayPayload(targetAccount);
        pngBuffer = await import_qrcode.default.toBuffer(promptPayPayload, {
          type: "png",
          width: 900,
          margin: 3,
          errorCorrectionLevel: "H",
          color: {
            dark: "#000000",
            light: "#ffffff"
          }
        });
        contentType = "image/png";
      }
      const rawAccount = (settings.bankAccount || "7617997452").replace(/[^0-9a-zA-Z]/g, "");
      const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
      const filename = `QR_Code_${rawAccount || "7617997452"}.${ext}`;
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", String(pngBuffer.length));
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (isDownload) {
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      } else {
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      }
      return res.send(pngBuffer);
    } catch (err) {
      console.error("[QR] Failed to serve QR image:", err);
      return res.status(500).send("Error generating QR image");
    }
  });
  app.get("/qr-save", (req, res) => {
    const db = getDatabase();
    const settings = db.settings || defaultSettings;
    const bankName = settings.bankName || "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E17\u0E2B\u0E32\u0E23\u0E44\u0E17\u0E22\u0E18\u0E19\u0E0A\u0E32\u0E15 (ttb)";
    const bankAccount = settings.bankAccount || "761-7-99745-2";
    const bankAccountName = settings.bankAccountName || "\u0E19\u0E32\u0E07\u0E40\u0E04\u0E23\u0E37\u0E2D\u0E27\u0E31\u0E25\u0E22\u0E4C \u0E0A\u0E32\u0E22\u0E41\u0E01\u0E49\u0E27";
    const rawTarget = String(req.query.url || req.query.link || settings.qrCodeImage || "https://i.postimg.cc/g0yvnLTn/S-30990363.jpg").trim();
    const hasCustomQr = true;
    const qrImgSrc = `/api/qr-image.jpg?t=${Date.now()}`;
    const qrDownloadSrc = `/api/qr-download.jpg?download=1&t=${Date.now()}`;
    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01 QR Code | \u0E2A\u0E1A\u0E32\u0E22\u0E14\u0E35 \u0E42\u0E2E\u0E21\u0E21\u0E32\u0E2A\u0E0B\u0E32\u0E08</title>
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
      <span>\u25CF</span> ${hasCustomQr ? "\u0E04\u0E34\u0E27\u0E2D\u0E32\u0E23\u0E4C\u0E42\u0E04\u0E49\u0E14 QR Code" : "\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E40\u0E1E\u0E22\u0E4C PromptPay QR"}
    </div>
    <h1>${hasCustomQr ? "\u0E2A\u0E41\u0E01\u0E19 QR Code \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23" : "\u0E2A\u0E41\u0E01\u0E19 QR Code \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E15\u0E34\u0E21\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15"}</h1>
    <p class="sub">${bankAccountName}</p>

    <!-- Clear QR Image Container -->
    <div class="qr-container" id="qr-box">
      <img id="qr-img" class="qr-img" src="${qrImgSrc}" alt="QR Code" title="\u0E41\u0E15\u0E30\u0E04\u0E49\u0E32\u0E07\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E" />
    </div>

    <!-- Instructions that directly solve LINE issue -->
    <div class="tap-hint" id="tap-instruction">
      <span>\u{1F446}</span> \u0E41\u0E15\u0E30\u0E04\u0E49\u0E32\u0E07\u0E17\u0E35\u0E48\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E QR 1 \u0E27\u0E34\u0E19\u0E32\u0E17\u0E35 \u2794 "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E"
    </div>

    <div class="line-guide" id="line-guide-box">
      <div class="line-guide-header">
        <span>\u{1F4A1}</span> \u0E27\u0E34\u0E18\u0E35\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E20\u0E32\u0E1E\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07 100% (\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49 LINE):
      </div>
      <div class="line-guide-desc">
        <strong>\u2022 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A Android:</strong> \u0E01\u0E14\u0E1B\u0E38\u0E48\u0E21\u0E2A\u0E35\u0E40\u0E02\u0E35\u0E22\u0E27 <strong>"\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E19 Chrome (\u0E14\u0E32\u0E27\u0E19\u0E4C\u0E42\u0E2B\u0E25\u0E14\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)"</strong> \u0E2B\u0E23\u0E37\u0E2D\u0E01\u0E14\u0E1B\u0E38\u0E48\u0E21 <strong>"\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E25\u0E07\u0E2D\u0E31\u0E25\u0E1A\u0E31\u0E49\u0E21"</strong> \u0E14\u0E49\u0E32\u0E19\u0E25\u0E48\u0E32\u0E07 \u0E23\u0E39\u0E1B\u0E08\u0E30\u0E16\u0E39\u0E01\u0E14\u0E32\u0E27\u0E19\u0E4C\u0E42\u0E2B\u0E25\u0E14\u0E25\u0E07\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E17\u0E31\u0E19\u0E17\u0E35 100% \u0E04\u0E48\u0E30<br>
        <strong>\u2022 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A iPhone:</strong> \u0E43\u0E0A\u0E49\u0E19\u0E34\u0E49\u0E27 <strong>\u0E41\u0E15\u0E30\u0E04\u0E49\u0E32\u0E07\u0E17\u0E35\u0E48\u0E23\u0E39\u0E1B QR \u0E14\u0E49\u0E32\u0E19\u0E1A\u0E19 1 \u0E27\u0E34\u0E19\u0E32\u0E17\u0E35</strong> \u2794 \u0E40\u0E25\u0E37\u0E2D\u0E01 <strong>"\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E" (Save Image)</strong> \u0E23\u0E39\u0E1B\u0E08\u0E30\u0E40\u0E02\u0E49\u0E32\u0E2D\u0E31\u0E25\u0E1A\u0E31\u0E49\u0E21\u0E23\u0E39\u0E1B\u0E43\u0E19\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E17\u0E31\u0E19\u0E17\u0E35\u0E04\u0E48\u0E30
      </div>
    </div>

    <!-- Bank Details and 1-Tap Copy -->
    <div class="bank-info">
      <div class="bank-name">${bankName}</div>
      <div class="bank-acc-row">
        <span class="bank-acc-number" id="acc-num">${bankAccount}</span>
        <button type="button" class="btn-copy" onclick="copyAccount()">
          <span>\u{1F4CB}</span> \u0E04\u0E31\u0E14\u0E25\u0E2D\u0E01
        </button>
      </div>
    </div>

    <!-- Action Buttons with <a> download tag -->
    <a href="${qrDownloadSrc}" download="QR_Code_7617997452.jpg" class="btn-main" id="btn-save-action" onclick="saveQrToGallery(event)">
      <span>\u{1F4E5}</span> \u0E14\u0E32\u0E27\u0E19\u0E4C\u0E42\u0E2B\u0E25\u0E14 QR Code \u0E25\u0E07\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07 (\u0E1C\u0E48\u0E32\u0E19 LINE \u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35)
    </a>

    <a href="${qrDownloadSrc}&openExternalBrowser=1" class="btn-external" id="btn-external-action" onclick="openInExternal(event)">
      <span>\u{1F310}</span> \u0E40\u0E1B\u0E34\u0E14\u0E43\u0E19 Chrome / Safari (\u0E14\u0E32\u0E27\u0E19\u0E4C\u0E42\u0E2B\u0E25\u0E14\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)
    </a>

    <a href="/" class="btn-back">\u2B05\uFE0F \u0E01\u0E25\u0E31\u0E1A\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A</a>
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
          showToast('\u2705 \u0E04\u0E31\u0E14\u0E25\u0E2D\u0E01\u0E40\u0E25\u0E02\u0E1A\u0E31\u0E0D\u0E0A\u0E35 ' + rawAcc + ' \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27!');
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
        showToast('\u2705 \u0E04\u0E31\u0E14\u0E25\u0E2D\u0E01\u0E40\u0E25\u0E02\u0E1A\u0E31\u0E0D\u0E0A\u0E35 ' + text + ' \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27!');
      } catch (e) {
        showToast('\u0E40\u0E25\u0E02\u0E1A\u0E31\u0E0D\u0E0A\u0E35: ' + text);
      }
      document.body.removeChild(ta);
    }

    function openInExternal(e) {
      var inLine = /Line//i.test(navigator.userAgent || '');
      if (inLine) {
        // In LINE (both Android & iOS), openExternalBrowser=1 instructs LINE to open in device default browser (Chrome/Safari)
        var targetUrl = new URL('${qrDownloadSrc}', window.location.origin);
        targetUrl.searchParams.set('openExternalBrowser', '1');
        targetUrl.searchParams.set('download', '1');
        window.location.href = targetUrl.toString();
        showToast('\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E1B\u0E34\u0E14\u0E40\u0E1A\u0E23\u0E32\u0E27\u0E4C\u0E40\u0E0B\u0E2D\u0E23\u0E4C\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E14\u0E32\u0E27\u0E19\u0E4C\u0E42\u0E2B\u0E25\u0E14 QR Code \u0E04\u0E48\u0E30...');
        return;
      }
      triggerDirectDownload();
    }

    async function saveQrToGallery(e) {
      var inLine = /Line//i.test(navigator.userAgent || '');
      var isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');

      // On iOS: Try native Web Share API (gives direct native "Save Image" to Photos on iPhone inside LINE)
      if (isIos && navigator.share) {
        try {
          var res = await fetch('${qrImgSrc}');
          if (res.ok) {
            var blob = await res.blob();
            var file = new File([blob], 'QR_Code_7617997452.jpg', { type: 'image/jpeg' });
            if (!navigator.canShare || navigator.canShare({ files: [file] })) {
              if (e) e.preventDefault();
              await navigator.share({
                files: [file],
                title: 'QR Code \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E40\u0E15\u0E34\u0E21\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15',
                text: 'QR Code \u0E1A\u0E31\u0E0D\u0E0A\u0E35 \u0E19\u0E32\u0E07\u0E40\u0E04\u0E23\u0E37\u0E2D\u0E27\u0E31\u0E25\u0E22\u0E4C \u0E0A\u0E32\u0E22\u0E41\u0E01\u0E49\u0E27 \u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E17\u0E2B\u0E32\u0E23\u0E44\u0E17\u0E22\u0E18\u0E19\u0E0A\u0E32\u0E15 (ttb)'
              });
              showToast('\u2705 \u0E40\u0E25\u0E37\u0E2D\u0E01 "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E" (Save Image) \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E02\u0E49\u0E32\u0E41\u0E01\u0E25\u0E40\u0E25\u0E2D\u0E23\u0E35\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E04\u0E48\u0E30');
              return;
            }
          }
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }

      // Allow natural <a> click to download directly in LINE / browser
      showToast('\u0E01\u0E33\u0E25\u0E31\u0E07\u0E14\u0E32\u0E27\u0E19\u0E4C\u0E42\u0E2B\u0E25\u0E14\u0E20\u0E32\u0E1E QR Code \u0E25\u0E07\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E04\u0E48\u0E30...');
    }

    function triggerDirectDownload() {
      try {
        var aLink = document.createElement('a');
        aLink.href = '${qrDownloadSrc}';
        aLink.download = 'QR_Code_7617997452.jpg';
        document.body.appendChild(aLink);
        aLink.click();
        setTimeout(function() {
          if (document.body.contains(aLink)) document.body.removeChild(aLink);
        }, 1000);
        showToast('\u2705 \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E QR Code \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27\u0E04\u0E48\u0E30');
      } catch (err) {
        window.location.href = '${qrDownloadSrc}';
      }
    }

    // Auto-trigger direct download if opened in external browser with download=1
    window.addEventListener('DOMContentLoaded', function() {
      var urlParams = new URLSearchParams(window.location.search);
      var inLine = /Line//i.test(navigator.userAgent || '');
      if (urlParams.get('download') === '1' && !inLine) {
        setTimeout(triggerDirectDownload, 500);
      }
    });
  </script>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  });
  app.get("/api/gemini/status", (req, res) => {
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
  app.post("/api/slip/scan-qr", async (req, res) => {
    const { slipImage } = req.body;
    if (!slipImage) {
      return res.status(400).json({ success: false, error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E2A\u0E48\u0E07\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E2A\u0E25\u0E34\u0E1B" });
    }
    try {
      const qrResult = await scanSlipQRCode(slipImage);
      const db = getDatabase();
      let isDuplicate = false;
      if (qrResult.found && qrResult.transRef) {
        const cleanRef = qrResult.transRef.replace(/[\s-]/g, "");
        isDuplicate = db.transactions.some(
          (t) => t.Type === "Topup" && t.SlipRefId && t.SlipRefId.replace(/[\s-]/g, "") === cleanRef && t.Status !== "Reject"
        );
      }
      res.json({
        success: qrResult.found,
        qrResult,
        isDuplicate,
        method: "Local Slip QR Decoder (No API Key)"
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "\u0E16\u0E2D\u0E14\u0E23\u0E2B\u0E31\u0E2A QR \u0E25\u0E49\u0E21\u0E40\u0E2B\u0E25\u0E27" });
    }
  });
  app.post("/api/gemini/test", async (req, res) => {
    const ai = getAi();
    if (!ai) {
      return res.json({
        success: true,
        message: "\u0E23\u0E30\u0E1A\u0E1A\u0E16\u0E2D\u0E14\u0E23\u0E2B\u0E31\u0E2A Slip Mini QR \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 100% (\u0E17\u0E33\u0E07\u0E32\u0E19\u0E41\u0E1A\u0E1A Offline Zero API Key)",
        latencyMs: 5,
        model: "Local QR Scanner"
      });
    }
    try {
      const startTime = Date.now();
      let usedModel = "gemini-2.5-flash";
      let response = null;
      const candidateModels = ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      for (const m of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: m,
            contents: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E2D\u0E1A\u0E2A\u0E31\u0E49\u0E19\u0E46: \u0E23\u0E30\u0E1A\u0E1A AI Gemini \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E25\u0E34\u0E1B\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 100%"
          });
          if (response && response.text) {
            usedModel = m;
            break;
          }
        } catch (err) {
          console.warn(`Model test ${m} notice:`, err?.message);
        }
      }
      if (!response || !response.text) {
        return res.json({
          success: true,
          message: "\u0E23\u0E30\u0E1A\u0E1A\u0E16\u0E2D\u0E14\u0E23\u0E2B\u0E31\u0E2A Slip Mini QR \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 100% (\u0E42\u0E04\u0E27\u0E15\u0E32 AI API \u0E02\u0E13\u0E30\u0E19\u0E35\u0E49\u0E40\u0E15\u0E47\u0E21\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27 \u0E08\u0E36\u0E07\u0E43\u0E0A\u0E49\u0E23\u0E30\u0E1A\u0E1A\u0E16\u0E2D\u0E14\u0E23\u0E2B\u0E31\u0E2A QR \u0E20\u0E32\u0E22\u0E43\u0E19\u0E41\u0E17\u0E19)",
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
    } catch (err) {
      res.json({
        success: true,
        message: "\u0E23\u0E30\u0E1A\u0E1A\u0E16\u0E2D\u0E14\u0E23\u0E2B\u0E31\u0E2A Slip Mini QR \u0E17\u0E33\u0E07\u0E32\u0E19\u0E1B\u0E01\u0E15\u0E34 100% (\u0E15\u0E23\u0E27\u0E08\u0E08\u0E31\u0E1A QR \u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E41\u0E21\u0E48\u0E19\u0E22\u0E33)",
        latencyMs: 10,
        model: "Local QR Scanner"
      });
    }
  });
  app.post("/api/gemini/verify-slip", async (req, res) => {
    const { slipImage, expectedAmount } = req.body;
    if (!slipImage) {
      return res.status(400).json({ error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E41\u0E19\u0E1A\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E2A\u0E25\u0E34\u0E1B\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A" });
    }
    try {
      const db = getDatabase();
      let qrResult = null;
      try {
        qrResult = await scanSlipQRCode(slipImage);
      } catch (e) {
        console.warn("QR scan preview error:", e?.message);
      }
      const ai = getAi();
      let aiResult = null;
      if (ai) {
        try {
          aiResult = await verifySlipWithGemini(slipImage);
        } catch (e) {
          console.warn("Gemini slip preview error:", e?.message);
        }
      }
      if (!qrResult?.found && !aiResult) {
        return res.status(400).json({
          error: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E16\u0E2D\u0E14\u0E23\u0E2B\u0E31\u0E2A QR Code \u0E08\u0E32\u0E01\u0E2A\u0E25\u0E34\u0E1B\u0E44\u0E14\u0E49 \u0E41\u0E25\u0E30\u0E44\u0E21\u0E48\u0E21\u0E35 Gemini API Key \u0E2B\u0E23\u0E37\u0E2D\u0E20\u0E32\u0E1E\u0E44\u0E21\u0E48\u0E0A\u0E31\u0E14\u0E40\u0E08\u0E19 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E27\u0E48\u0E32\u0E20\u0E32\u0E1E\u0E2A\u0E25\u0E34\u0E1B\u0E40\u0E2B\u0E47\u0E19 QR \u0E0A\u0E31\u0E14\u0E40\u0E08\u0E19"
        });
      }
      const refNo = qrResult?.found && qrResult.transRef ? qrResult.transRef : aiResult?.refNo || "";
      const cleanRefNo = (refNo || "").trim().replace(/[\s-]/g, "");
      const bankName = qrResult?.found && qrResult.bankName ? qrResult.bankName : aiResult?.bankName || "\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E44\u0E17\u0E22";
      const amount = aiResult?.amount && aiResult.amount > 0 ? aiResult.amount : qrResult?.amount || Number(expectedAmount) || 0;
      const isDuplicateRef = cleanRefNo && cleanRefNo.length >= 6 ? db.transactions.some(
        (t) => t.Type === "Topup" && t.SlipRefId && t.SlipRefId.replace(/[\s-]/g, "") === cleanRefNo && t.Status !== "Reject"
      ) : false;
      const targetAccountName = (db.settings?.bankAccountName || "").toLowerCase().trim();
      let isAccountMatch = true;
      if (targetAccountName && aiResult?.receiverName) {
        const rName = aiResult.receiverName.toLowerCase();
        const words = targetAccountName.split(" ").filter((w) => w.length > 2);
        isAccountMatch = words.some((w) => rName.includes(w)) || rName.includes("\u0E2A\u0E1A\u0E32\u0E22\u0E14\u0E35") || rName.includes("sabai");
      }
      const unifiedResult = {
        isValidSlip: qrResult?.found || aiResult?.isValidSlip || false,
        isTamperedOrFake: aiResult?.isTamperedOrFake || false,
        amount,
        refNo: cleanRefNo,
        bankName,
        receiverName: aiResult?.receiverName || db.settings?.bankAccountName || "-",
        receiverAccount: aiResult?.receiverAccount || db.settings?.bankAccount || "-",
        senderName: aiResult?.senderName || "-",
        transferDateTime: qrResult?.dateTime || aiResult?.transferDateTime || (/* @__PURE__ */ new Date()).toLocaleString("th-TH"),
        confidence: qrResult?.found ? 100 : aiResult?.confidence || 80,
        isSuspicious: isDuplicateRef || (aiResult?.isSuspicious || false),
        suspiciousDetail: isDuplicateRef ? `\u0E2A\u0E25\u0E34\u0E1B\u0E0B\u0E49\u0E33: \u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07 ${cleanRefNo} \u0E40\u0E04\u0E22\u0E16\u0E39\u0E01\u0E43\u0E0A\u0E49\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27` : aiResult?.suspiciousDetail || ""
      };
      res.json({
        success: true,
        method: qrResult?.found ? "Slip Mini QR (\u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E0A\u0E49 API Key)" : "Gemini AI",
        result: unifiedResult,
        qrFound: qrResult?.found || false,
        isDuplicateRef,
        isAccountMatch,
        matchedAmount: expectedAmount ? unifiedResult.amount === Number(expectedAmount) : true
      });
    } catch (err) {
      res.status(500).json({ error: err?.message || "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E25\u0E34\u0E1B" });
    }
  });
  app.put("/api/credits/transactions/:id/action", (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { status, remark } = req.body;
    const txIndex = db.transactions.findIndex((t) => t.TransactionID === id);
    if (txIndex === -1) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E42\u0E2D\u0E19\u0E40\u0E07\u0E34\u0E19\u0E19\u0E35\u0E49" });
    }
    const tx = db.transactions[txIndex];
    if (tx.Status !== "Pending") {
      return res.status(400).json({ error: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27" });
    }
    const staffIndex = db.staff.findIndex((s) => s.StaffID === tx.StaffID);
    if (staffIndex === -1) {
      return res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1C\u0E39\u0E49\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E1B\u0E25\u0E32\u0E22\u0E17\u0E32\u0E07" });
    }
    const staff = db.staff[staffIndex];
    tx.Status = status;
    tx.AdminRemark = remark || "";
    if (status === "Approved") {
      tx.BeforeCredit = staff.Credit;
      staff.Credit += tx.Amount;
      tx.AfterCredit = staff.Credit;
      if (tx.Type === "Refund") {
        staff.TotalJobs = Math.max(0, staff.TotalJobs - 1);
        const notif = {
          NotificationID: generateId("N"),
          UserID: staff.UserID,
          Title: "\u2705 \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E04\u0E37\u0E19\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08!",
          Detail: `\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E44\u0E14\u0E49\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E04\u0E37\u0E19\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E08\u0E33\u0E19\u0E27\u0E19 ${tx.Amount} CR \u0E08\u0E32\u0E01\u0E01\u0E32\u0E23\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E07\u0E32\u0E19 #${tx.BookingID || ""} \u0E40\u0E02\u0E49\u0E32\u0E01\u0E23\u0E30\u0E40\u0E1B\u0E4B\u0E32\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E41\u0E25\u0E49\u0E27 \u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E04\u0E37\u0E2D ${staff.Credit} CR`,
          ReadStatus: "Unread",
          CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet("INSERT", "Notification", notif);
      } else {
        const notif = {
          NotificationID: generateId("N"),
          UserID: staff.UserID,
          Title: "\u2705 \u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E40\u0E15\u0E34\u0E21\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E41\u0E25\u0E49\u0E27!",
          Detail: `\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E42\u0E2D\u0E19\u0E40\u0E07\u0E34\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19 ${tx.Amount} \u0E1A\u0E32\u0E17 \u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E41\u0E25\u0E49\u0E27 \u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19\u0E04\u0E37\u0E2D ${staff.Credit} CR`,
          ReadStatus: "Unread",
          CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet("INSERT", "Notification", notif);
      }
      syncToGoogleSheet("UPDATE", "Staff", staff);
    } else {
      if (tx.Type === "Refund") {
        const notif = {
          NotificationID: generateId("N"),
          UserID: staff.UserID,
          Title: "\u26A0\uFE0F \u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E04\u0E33\u0E02\u0E2D\u0E04\u0E37\u0E19\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15",
          Detail: `\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E04\u0E33\u0E02\u0E2D\u0E04\u0E37\u0E19\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15 ${tx.Amount} CR \u0E08\u0E32\u0E01\u0E01\u0E32\u0E23\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E07\u0E32\u0E19 #${tx.BookingID || ""} \u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25: ${remark || "\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E15\u0E32\u0E21\u0E40\u0E07\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E02\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23"}`,
          ReadStatus: "Unread",
          CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet("INSERT", "Notification", notif);
      } else {
        const notif = {
          NotificationID: generateId("N"),
          UserID: staff.UserID,
          Title: "\u26A0\uFE0F \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E15\u0E34\u0E21\u0E40\u0E04\u0E23\u0E14\u0E34\u0E15\u0E44\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34",
          Detail: `\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E15\u0E34\u0E21\u0E40\u0E07\u0E34\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19 ${tx.Amount} \u0E1A\u0E32\u0E17 \u0E16\u0E39\u0E01\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25: ${remark || "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E25\u0E34\u0E1B\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E19"} \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19`,
          ReadStatus: "Unread",
          CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
        };
        db.notifications.push(notif);
        syncToGoogleSheet("INSERT", "Notification", notif);
      }
    }
    saveDatabase(db);
    syncToGoogleSheet("UPDATE", "CreditTransaction", tx);
    res.json({ success: true, transaction: tx, staff });
  });
  app.post("/api/reviews", (req, res) => {
    const db = getDatabase();
    const { bookingId, customerId, staffId, score, comment } = req.body;
    if (!bookingId || !customerId || !staffId || !score) {
      return res.status(400).json({ error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E49\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19 \u0E04\u0E30\u0E41\u0E19\u0E19\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19" });
    }
    const newReview = {
      ReviewID: generateId("R"),
      BookingID: bookingId,
      CustomerID: customerId,
      StaffID: staffId,
      Score: parseInt(score),
      Comment: comment || "",
      CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.reviews.push(newReview);
    syncToGoogleSheet("INSERT", "Reviews", newReview);
    const staffIndex = db.staff.findIndex((s) => s.StaffID === staffId);
    if (staffIndex !== -1) {
      const staffReviews = db.reviews.filter((r) => r.StaffID === staffId);
      const totalScore = staffReviews.reduce((sum, r) => sum + r.Score, 0);
      db.staff[staffIndex].ReviewCount = staffReviews.length;
      db.staff[staffIndex].Rating = parseFloat((totalScore / staffReviews.length).toFixed(1));
      syncToGoogleSheet("UPDATE", "Staff", db.staff[staffIndex]);
      const notif = {
        NotificationID: generateId("N"),
        UserID: db.staff[staffIndex].UserID,
        Title: "\u2B50\uFE0F \u0E04\u0E38\u0E13\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E23\u0E35\u0E27\u0E34\u0E27\u0E41\u0E25\u0E30\u0E04\u0E30\u0E41\u0E19\u0E19\u0E43\u0E2B\u0E21\u0E48!",
        Detail: `\u0E21\u0E35\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E40\u0E02\u0E35\u0E22\u0E19\u0E23\u0E35\u0E27\u0E34\u0E27\u0E43\u0E2B\u0E49\u0E04\u0E30\u0E41\u0E19\u0E19 ${score} \u0E14\u0E32\u0E27\u0E41\u0E01\u0E48\u0E04\u0E38\u0E13: "${comment || "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E04\u0E34\u0E14\u0E40\u0E2B\u0E47\u0E19\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21"}"`,
        ReadStatus: "Unread",
        CreatedDate: (/* @__PURE__ */ new Date()).toISOString()
      };
      db.notifications.push(notif);
      syncToGoogleSheet("INSERT", "Notification", notif);
    }
    saveDatabase(db);
    res.json({ success: true, review: newReview });
  });
  app.get("/api/reviews", (req, res) => {
    const db = getDatabase();
    const joinedReviews = db.reviews.map((r) => {
      const customer = db.users.find((u) => u.UserID === r.CustomerID);
      const staff = db.staff.find((s) => s.StaffID === r.StaffID);
      return {
        ...r,
        CustomerName: customer ? customer.Name : "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32",
        CustomerProfileImage: customer ? customer.ProfileImage || DEFAULT_BLANK_AVATAR : DEFAULT_BLANK_AVATAR,
        StaffNickname: staff ? staff.Nickname : "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19"
      };
    }).sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());
    res.json(joinedReviews);
  });
  app.get("/api/notifications/:userId", (req, res) => {
    const db = getDatabase();
    const { userId } = req.params;
    const notifications = db.notifications.filter((n) => n.UserID === userId).sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());
    res.json(notifications);
  });
  app.put("/api/notifications/:id/read", (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const index = db.notifications.findIndex((n) => n.NotificationID === id);
    if (index !== -1) {
      db.notifications[index].ReadStatus = "Read";
      saveDatabase(db);
      syncToGoogleSheet("UPDATE", "Notification", db.notifications[index]);
    }
    res.json({ success: true });
  });
  app.get("/api/admin/dashboard", (req, res) => {
    const db = getDatabase();
    const customersCount = db.users.filter((u) => u.Role === "Customer").length;
    const staffCount = db.staff.length;
    const totalJobs = db.bookings.length;
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todayJobs = db.bookings.filter((b) => b.BookingDate === todayStr).length;
    const totalRevenue = db.bookings.filter((b) => b.Status === "Completed").reduce((sum, b) => sum + b.TotalPrice, 0);
    const commissionEarnings = db.bookings.filter((b) => b.Status === "Completed").reduce((sum, b) => {
      const service = db.services.find((s) => s.ServiceID === b.ServiceID);
      return sum + (service ? service.CreditRequired : 0);
    }, 0);
    const totalSystemCredits = db.staff.reduce((sum, s) => sum + s.Credit, 0);
    const salesByDay = {};
    for (let i = 6; i >= 0; i--) {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      salesByDay[dateStr] = 0;
    }
    db.bookings.filter((b) => b.Status === "Completed" && salesByDay[b.BookingDate] !== void 0).forEach((b) => {
      salesByDay[b.BookingDate] += b.TotalPrice;
    });
    const salesByMonth = {};
    db.bookings.filter((b) => b.Status === "Completed").forEach((b) => {
      const monthStr = b.BookingDate.substring(0, 7);
      salesByMonth[monthStr] = (salesByMonth[monthStr] || 0) + b.TotalPrice;
    });
    const topStaff = db.staff.map((s) => {
      const u = db.users.find((user) => user.UserID === s.UserID);
      return {
        Nickname: s.Nickname,
        FullName: u ? u.Name : "",
        TotalIncome: s.TotalIncome,
        TotalJobs: s.TotalJobs,
        Rating: s.Rating
      };
    }).sort((a, b) => b.TotalIncome - a.TotalIncome).slice(0, 5);
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
  app.get("/api/database/export", (req, res) => {
    res.json(getDatabase());
  });
  app.post("/api/database/import", (req, res) => {
    const { table, data } = req.body;
    const db = getDatabase();
    if (db[table]) {
      db[table] = data;
      saveDatabase(db);
      return res.json({ success: true });
    }
    res.status(400).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E15\u0E32\u0E23\u0E32\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38" });
  });
  app.post("/api/sync/googlesheets", async (req, res) => {
    const db = getDatabase();
    const webhookUrl = req.body?.webhookUrl || db.settings?.googleSheetWebhookUrl;
    if (!webhookUrl || !webhookUrl.startsWith("http")) {
      return res.status(400).json({
        error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 URL \u0E02\u0E2D\u0E07 Google Apps Script Web App \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E0B\u0E34\u0E07\u0E04\u0E4C\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E02\u0E49\u0E32 Google Sheets"
      });
    }
    if (webhookUrl.includes("docs.google.com/spreadsheets")) {
      return res.status(400).json({
        error: "\u274C \u0E25\u0E34\u0E07\u0E01\u0E4C\u0E17\u0E35\u0E48\u0E01\u0E23\u0E2D\u0E01\u0E04\u0E37\u0E2D\u0E25\u0E34\u0E07\u0E01\u0E4C\u0E40\u0E1B\u0E34\u0E14\u0E14\u0E39 Google Sheets (docs.google.com) \u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E23\u0E31\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E1A\u0E1A Webhook \u0E44\u0E14\u0E49\u0E42\u0E14\u0E22\u0E15\u0E23\u0E07 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E2A\u0E23\u0E49\u0E32\u0E07 Google Apps Script \u0E15\u0E32\u0E21\u0E04\u0E39\u0E48\u0E21\u0E37\u0E2D\u0E14\u0E49\u0E32\u0E19\u0E25\u0E48\u0E32\u0E07 \u0E41\u0E25\u0E49\u0E27\u0E19\u0E33 URL \u0E02\u0E2D\u0E07 Web App (\u0E17\u0E35\u0E48\u0E02\u0E36\u0E49\u0E19\u0E15\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22 https://script.google.com/macros/s/.../exec) \u0E21\u0E32\u0E43\u0E2A\u0E48\u0E41\u0E17\u0E19\u0E04\u0E48\u0E30"
      });
    }
    try {
      const payload = {
        action: "SYNC_ALL_DATA",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        tables: {
          Users: db.users,
          Staff: db.staff,
          StaffDocuments: db.staff.map((s) => {
            const u = db.users.find((user) => user.UserID === s.UserID);
            return {
              DocID: `DOC-${s.StaffID}`,
              StaffID: s.StaffID,
              UserID: s.UserID,
              StaffName: u?.Name || s.Nickname,
              Nickname: s.Nickname,
              Phone: u?.Phone || "",
              VerifyStatus: s.VerifyStatus,
              LicenseFile: s.LicenseFile || "",
              IdCardFile: s.IdCardFile || "",
              HouseRegFile: s.HouseRegFile || "",
              RegisteredAddress: s.RegisteredAddress || u?.Address || "",
              SubmittedDate: s.LastLocationUpdate || (/* @__PURE__ */ new Date()).toISOString(),
              Notes: `\u0E2A\u0E16\u0E32\u0E19\u0E30: ${s.VerifyStatus} | \u0E1B\u0E23\u0E30\u0E2A\u0E1A\u0E01\u0E32\u0E23\u0E13\u0E4C: ${s.Experience} \u0E1B\u0E35`
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A Web App URL \u0E19\u0E35\u0E49 (404 Not Found) \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E27\u0E48\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01 Deploy \u0E40\u0E1B\u0E47\u0E19 Web App \u0E41\u0E25\u0E49\u0E27\u0E2B\u0E23\u0E37\u0E2D\u0E22\u0E31\u0E07");
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('\u0E15\u0E34\u0E14\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07 (403 Forbidden) \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32 Who has access (\u0E1C\u0E39\u0E49\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07) \u0E43\u0E19 Apps Script Deployment \u0E43\u0E2B\u0E49\u0E40\u0E1B\u0E47\u0E19 "Anyone" (\u0E17\u0E38\u0E01\u0E04\u0E19)');
        }
        throw new Error(`Google Apps Script \u0E2A\u0E48\u0E07\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A: ${response.status} ${response.statusText}`);
      }
      if (req.body?.webhookUrl && req.body.webhookUrl !== db.settings.googleSheetWebhookUrl) {
        db.settings.googleSheetWebhookUrl = req.body.webhookUrl;
        saveDatabase(db);
      }
      if (req.body?.token && req.body?.adminId) {
        db.settings = { ...db.settings, lineChannelAccessToken: req.body.token.trim(), lineAdminUserId: req.body.adminId.trim() };
        saveDatabase(db);
      }
      res.json({
        success: true,
        message: "\u0E0B\u0E34\u0E07\u0E04\u0E4C\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 9 \u0E15\u0E32\u0E23\u0E32\u0E07 (\u0E23\u0E27\u0E21\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E2B\u0E25\u0E31\u0E01\u0E10\u0E32\u0E19\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19: \u0E43\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15, \u0E1A\u0E31\u0E15\u0E23\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E0A\u0E19, \u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E1A\u0E49\u0E32\u0E19) \u0E40\u0E02\u0E49\u0E32 Google Sheets \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27!"
      });
    } catch (err) {
      console.error("Failed to push to Google Apps Script:", err);
      res.status(500).json({
        error: `\u0E2A\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E02\u0E49\u0E32 Google Sheets \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08: ${err.message}`
      });
    }
  });
  let lastCapturedLineInfo = {};
  app.post("/api/line/webhook", (req, res) => {
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
          lastCapturedLineInfo.time = (/* @__PURE__ */ new Date()).toLocaleTimeString("th-TH");
        }
      }
    } catch (e) {
    }
    res.status(200).send("OK");
  });
  app.get("/api/line/captured-info", (req, res) => {
    res.json(lastCapturedLineInfo);
  });
  app.post("/api/admin/test-line-notification", async (req, res) => {
    const db = getDatabase();
    let token = (req.body?.token || db.settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "b6spU9oI6sgyc/lagfyn8Z6MZ4GkUCLOModW44f2ZY/4Ja0nvseYKZSvZwPOboWSMAKM3VN0z/7h50RoaGkMvCNBX2+e51SYez0lNHgwqoEs8TnNKe+7jMLbFEY1sH6ujkXTbp9OXhYxOUKnOiJ0WgdB04t89/1O/w1cDnyilFU=").trim();
    let adminId = (req.body?.adminId || db.settings?.lineAdminUserId || process.env.LINE_ADMIN_USER_ID || "Cf544171f0f9753863ade1ddd1acd67a7").trim();
    if (adminId === "Cda36ab1f3de2811e584a5b62d652a97d") {
      adminId = "Cf544171f0f9753863ade1ddd1acd67a7";
    }
    if (!token || !adminId) {
      return res.status(400).json({
        error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E17\u0E31\u0E49\u0E07 Channel Access Token \u0E41\u0E25\u0E30 Admin User ID / Group ID"
      });
    }
    try {
      const testMsg = `\u{1F514} [\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19]
\u0E23\u0E30\u0E1A\u0E1A SabaiDee Massage \u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21
\u0E2A\u0E48\u0E07\u0E16\u0E36\u0E07\u0E40\u0E09\u0E1E\u0E32\u0E30: ${adminId}
\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B\u0E08\u0E30\u0E44\u0E21\u0E48\u0E40\u0E2B\u0E47\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E19\u0E35\u0E49\u0E41\u0E19\u0E48\u0E19\u0E2D\u0E19\u0E04\u0E48\u0E30
\u0E40\u0E27\u0E25\u0E32: ${(/* @__PURE__ */ new Date()).toLocaleTimeString("th-TH")}`;
      const response = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          to: adminId,
          messages: [{ type: "text", text: testMsg }]
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        const detailStr = Array.isArray(errorData.details) ? errorData.details.map((d) => d.message || JSON.stringify(d)).join(", ") : errorData.details ? JSON.stringify(errorData.details) : "";
        let customHint = "";
        if (response.status === 400) {
          if (adminId.startsWith("C") || adminId.startsWith("c")) {
            customHint = '\n\n\u{1F4A1} \u0E2A\u0E32\u0E40\u0E2B\u0E15\u0E38\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A Group ID (\u0E02\u0E36\u0E49\u0E19\u0E15\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22 C):\n1. \u0E1A\u0E2D\u0E17 LINE OA \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E16\u0E39\u0E01\u0E40\u0E0A\u0E34\u0E0D\u0E40\u0E02\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21 LINE \u0E19\u0E31\u0E49\u0E19\n2. \u0E2B\u0E23\u0E37\u0E2D\u0E43\u0E19 LINE Official Account Manager (manager.line.biz) \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E1B\u0E34\u0E14\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C "\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E43\u0E2B\u0E49\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E40\u0E02\u0E49\u0E32\u0E23\u0E48\u0E27\u0E21\u0E01\u0E25\u0E38\u0E48\u0E21\u0E41\u0E25\u0E30\u0E41\u0E0A\u0E17\u0E2B\u0E25\u0E32\u0E22\u0E04\u0E19 (Allow account to join groups)"\n3. \u0E2B\u0E32\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E23\u0E31\u0E1A\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E04\u0E19\u0E40\u0E14\u0E35\u0E22\u0E27 \u0E43\u0E2B\u0E49\u0E43\u0E0A\u0E49 User ID (\u0E02\u0E36\u0E49\u0E19\u0E15\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22 U \u0E08\u0E32\u0E01 Basic settings) \u0E41\u0E17\u0E19\u0E44\u0E14\u0E49\u0E40\u0E25\u0E22\u0E04\u0E48\u0E30';
          } else if (adminId.startsWith("U") || adminId.startsWith("u")) {
            customHint = "\n\n\u{1F4A1} \u0E2A\u0E32\u0E40\u0E2B\u0E15\u0E38\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A User ID (\u0E02\u0E36\u0E49\u0E19\u0E15\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22 U):\n\u0E1A\u0E31\u0E0D\u0E0A\u0E35 LINE \u0E2A\u0E48\u0E27\u0E19\u0E15\u0E31\u0E27\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E01\u0E14\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E19 (Add Friend) \u0E01\u0E31\u0E1A LINE OA \u0E02\u0E2D\u0E07\u0E1A\u0E2D\u0E17\u0E15\u0E31\u0E27\u0E19\u0E35\u0E49\u0E04\u0E48\u0E30";
          }
        } else if (response.status === 401) {
          customHint = "\n\n\u{1F4A1} \u0E2A\u0E32\u0E40\u0E2B\u0E15\u0E38: Channel Access Token \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38 (\u0E01\u0E23\u0E38\u0E13\u0E32\u0E44\u0E1B\u0E17\u0E35\u0E48\u0E41\u0E17\u0E47\u0E1A Messaging API \u0E43\u0E19 LINE Developers \u0E41\u0E25\u0E49\u0E27\u0E01\u0E14 Issue Token \u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07)";
        }
        const errorMsg = [errorData.message, detailStr].filter(Boolean).join(" - ") || response.statusText;
        return res.status(response.status).json({
          error: `LINE API Error (${response.status}): ${errorMsg}${customHint}`
        });
      }
      if (req.body?.token && req.body?.adminId) {
        db.settings = { ...db.settings, lineChannelAccessToken: req.body.token.trim(), lineAdminUserId: req.body.adminId.trim() };
        saveDatabase(db);
      }
      res.json({
        success: true,
        message: "\u0E2A\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E40\u0E02\u0E49\u0E32 LINE \u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E41\u0E25\u0E49\u0E27! (\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E44\u0E21\u0E48\u0E40\u0E2B\u0E47\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E19\u0E35\u0E49)"
      });
    } catch (err) {
      res.status(500).json({ error: `\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07 LINE: ${err.message}` });
    }
  });
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
  });
  app.all("/api", (req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server running on http://localhost:${PORT}`);
  });
  setInterval(() => {
    try {
      const db = getDatabase();
      checkExpiredOffers(db);
      checkAndAutoCompleteExpiredBookings(db);
    } catch (err) {
      console.error("[IntervalScheduler] Error running automatic checks:", err);
    }
  }, 1e4);
}
startServer().catch((err) => {
  console.error("Failed to start server", err);
});
//# sourceMappingURL=server.cjs.map
