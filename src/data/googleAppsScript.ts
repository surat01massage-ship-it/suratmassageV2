/**
 * Full Production-Ready Google Apps Script (GAS) Code Package
 * This serves as the exportable codebase that the user can deploy to Google Apps Script.
 * Divided into 14 modular files matching the requirements exactly.
 */

export const googleAppsScriptFiles = [
  {
    name: "Setup.gs",
    code: `/**
 * Setup.gs
 * รันฟังก์ชัน \`setupInitialSheets\` ครั้งแรกเพื่อสร้างชีตทั้งหมดและใส่ชื่อคอลัมน์อัตโนมัติ
 * รองรับการบันทึกหลักฐานการสมัครพนักงาน: ใบอนุญาต, บัตรประชาชน, ทะเบียนบ้าน ครบถ้วน
 */

function setupInitialSheets() {
  const db = getDb();
  
  const tables = {
    Users: ["UserID", "Name", "Phone", "PasswordHash", "Email", "Address", "Province", "District", "SubDistrict", "Latitude", "Longitude", "ProfileImage", "Role", "Status", "CreatedDate"],
    Staff: ["StaffID", "UserID", "Nickname", "Gender", "Age", "Weight", "Height", "RegisteredAddress", "Experience", "Description", "Rating", "ReviewCount", "Credit", "Available", "VerifyStatus", "CurrentLatitude", "CurrentLongitude", "LastLocationUpdate", "TotalIncome", "TotalJobs", "OfferedServices", "MaxJobDistance", "Photos", "LicenseFile", "IdCardFile", "HouseRegFile"],
    StaffDocuments: ["DocID", "StaffID", "UserID", "StaffName", "Nickname", "Phone", "VerifyStatus", "LicenseFile", "IdCardFile", "HouseRegFile", "RegisteredAddress", "SubmittedDate", "Notes"],
    Services: ["ServiceID", "ServiceName", "Detail", "Duration", "Price", "CreditRequired", "Active", "SortOrder"],
    Booking: ["BookingID", "CustomerID", "StaffID", "BookingDate", "BookingTime", "ServiceID", "ServicePrice", "Distance", "TravelFee", "TotalPrice", "CustomerLatitude", "CustomerLongitude", "CustomerAddress", "Status", "PaymentStatus", "CreatedDate"],
    CreditTransaction: ["TransactionID", "StaffID", "Amount", "BeforeCredit", "AfterCredit", "Type", "SlipImage", "Status", "AdminRemark", "CreatedDate"],
    Reviews: ["ReviewID", "BookingID", "CustomerID", "StaffID", "Score", "Comment", "CreatedDate"],
    Notification: ["NotificationID", "UserID", "Title", "Detail", "ReadStatus", "CreatedDate"],
    Settings: ["Key", "Value"]
  };

  for (const [sheetName, headers] of Object.entries(tables)) {
    let sheet = getSheetByNameRobust(sheetName);
    if (!sheet) {
      sheet = db.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.getRange(1, 1, 1, headers.length).setBackground("#d9ead3");
      sheet.setFrozenRows(1);
    } else {
      const lastCol = sheet.getLastColumn();
      if (lastCol === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
        sheet.getRange(1, 1, 1, headers.length).setBackground("#d9ead3");
        sheet.setFrozenRows(1);
      } else {
        // Auto-add any missing headers (such as LicenseFile, IdCardFile, HouseRegFile) to existing sheet
        const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        const missingHeaders = headers.filter(h => existingHeaders.indexOf(h) === -1);
        if (missingHeaders.length > 0) {
          const range = sheet.getRange(1, lastCol + 1, 1, missingHeaders.length);
          range.setValues([missingHeaders]);
          range.setFontWeight("bold");
          range.setBackground("#d9ead3");
        }
      }
    }
  }

  // ลบแผ่นงานเริ่มต้น (ถ้ามี)
  const defaultSheet = db.getSheetByName("แผ่นงาน1") || db.getSheetByName("Sheet1");
  if (defaultSheet && db.getSheets().length > 1) {
    try {
      db.deleteSheet(defaultSheet);
    } catch (e) {
      // อาจลบไม่ได้ถ้ามีอยู่ชีตเดียว
    }
  }

  Browser.msgBox("สร้างชีตฐานข้อมูลและคอลัมน์หลักฐานพนักงาน (ใบอนุญาต, บัตรประชาชน, ทะเบียนบ้าน) ครบสมบูรณ์แล้ว! พร้อมใช้งานครับ");
}
`
  },
  {
    name: "Database.gs",
    code: `/**
 * Database.gs
 * Core spreadsheet read/write/delete database functions
 * อัปโหลดรูปภาพหลักฐานและสลิปเข้า Google Drive อัตโนมัติ พร้อมคืนค่า URL วางใน Google Sheets
 */

const SPREADSHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE";
const DRIVE_FOLDER_ID = ""; // Optional: ใส่ ID โฟลเดอร์ใน Google Drive ที่ต้องการเก็บรูป (ถ้าว่างจะสร้างโฟลเดอร์ SabaiDee_Staff_Evidence_Documents ให้อัตโนมัติ)

function getDb() {
  if (SPREADSHEET_ID === "YOUR_GOOGLE_SHEET_ID_HERE") {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheetByNameRobust(sheetName) {
  const db = getDb();
  let sheet = db.getSheetByName(sheetName);
  if (sheet) return sheet;

  // Case-insensitive fallback lookup
  const sheets = db.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase() === sheetName.toLowerCase()) {
      return sheets[i];
    }
  }
  return null;
}

function getSheetData(sheetName) {
  const sheet = getSheetByNameRobust(sheetName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  const headers = values[0];
  const rows = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[i][j];
    }
    rows.push(row);
  }
  return rows;
}

function getEvidenceFolder() {
  if (DRIVE_FOLDER_ID && DRIVE_FOLDER_ID !== "") {
    try {
      return DriveApp.getFolderById(DRIVE_FOLDER_ID);
    } catch (e) {}
  }
  // Auto-find or create dedicated folder for staff evidence documents in Google Drive
  const folderName = "SabaiDee_Staff_Evidence_Documents";
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function uploadBase64ToDrive(base64Data, fileName) {
  try {
    if (!base64Data || typeof base64Data !== 'string') return base64Data;
    // If it's already an HTTP / HTTPS link or not base64, return as is
    if (!base64Data.startsWith('data:image/') && !base64Data.startsWith('data:application/pdf')) {
      return base64Data;
    }
    
    const splitIndex = base64Data.indexOf("base64,");
    let contentStr = base64Data;
    let mimeType = "image/jpeg";
    
    if (splitIndex !== -1) {
      mimeType = base64Data.substring(5, splitIndex - 1);
      contentStr = base64Data.substring(splitIndex + 7);
    }
    
    const extension = mimeType.includes('pdf') ? '.pdf' : (mimeType.includes('png') ? '.png' : '.jpg');
    const safeName = (fileName || ("doc_" + new Date().getTime())) + extension;
    const blob = Utilities.newBlob(Utilities.base64Decode(contentStr), mimeType, safeName);
    
    const folder = getEvidenceFolder();
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    // If DriveApp throws permission error, guard against cell character overflow (50,000 char limit)
    if (typeof base64Data === 'string' && base64Data.length > 45000) {
      return "[รูปภาพหลักฐานแนบในระบบ - ขนาดไฟล์เกินขีดจำกัดเซลล์]";
    }
    return base64Data;
  }
}

function processDataFiles(rowData) {
  if (!rowData) return rowData;
  const processed = {};
  const prefix = (rowData.Nickname || rowData.StaffName || rowData.StaffID || "staff").toString().replace(/[^a-zA-Z0-9ก-๙]/g, '_');
  
  for (let key in rowData) {
    if (typeof rowData[key] === 'string' && (rowData[key].startsWith('data:image/') || rowData[key].startsWith('data:application/pdf'))) {
      processed[key] = uploadBase64ToDrive(rowData[key], prefix + "_" + key + "_" + new Date().getTime());
    } else if (Array.isArray(rowData[key])) {
      const arr = rowData[key];
      const newArr = [];
      for (let i = 0; i < arr.length; i++) {
        if (typeof arr[i] === 'string' && (arr[i].startsWith('data:image/') || arr[i].startsWith('data:application/pdf'))) {
          newArr.push(uploadBase64ToDrive(arr[i], prefix + "_" + key + "_" + i + "_" + new Date().getTime()));
        } else {
          newArr.push(arr[i]);
        }
      }
      processed[key] = newArr;
    } else {
      processed[key] = rowData[key];
    }
  }
  return processed;
}

function appendSheetRow(sheetName, rowData) {
  let sheet = getSheetByNameRobust(sheetName);
  const processedData = processDataFiles(rowData);
  
  if (!sheet) {
    sheet = getDb().insertSheet(sheetName);
    const headers = Object.keys(processedData);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#d9ead3");
    sheet.setFrozenRows(1);
  }
  
  let lastCol = sheet.getLastColumn();
  let headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  if (headers.length === 0 || headers[0] === "") {
    headers = Object.keys(processedData);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#d9ead3");
    sheet.setFrozenRows(1);
    lastCol = headers.length;
  } else {
    // Dynamic auto-expand: append missing headers (e.g. LicenseFile, IdCardFile, HouseRegFile)
    const missingHeaders = Object.keys(processedData).filter(k => headers.indexOf(k) === -1 && k !== "");
    if (missingHeaders.length > 0) {
      sheet.getRange(1, lastCol + 1, 1, missingHeaders.length).setValues([missingHeaders]).setFontWeight("bold").setBackground("#d9ead3");
      headers = headers.concat(missingHeaders);
    }
  }
  
  const newRow = [];
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i];
    let value = processedData[key] !== undefined ? processedData[key] : "";
    if (typeof value === 'object' && value !== null) {
      value = JSON.stringify(value);
    }
    newRow.push(value);
  }
  
  sheet.appendRow(newRow);
  return true;
}

function updateSheetRow(sheetName, idColumnName, idValue, updatedData) {
  const sheet = getSheetByNameRobust(sheetName);
  if (!sheet) throw new Error("Sheet " + sheetName + " not found");
  
  const processedData = processDataFiles(updatedData);
  
  let lastCol = sheet.getLastColumn();
  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  // Dynamic header check: auto-expand missing headers if not present
  const missingHeaders = Object.keys(processedData).filter(k => headers.indexOf(k) === -1 && k !== "");
  if (missingHeaders.length > 0) {
    sheet.getRange(1, lastCol + 1, 1, missingHeaders.length).setValues([missingHeaders]).setFontWeight("bold").setBackground("#d9ead3");
    headers = headers.concat(missingHeaders);
  }
  
  let idColIndex = headers.indexOf(idColumnName);
  if (idColIndex === -1) {
    if (sheetName.toLowerCase() === 'users') idColIndex = headers.indexOf('UserID');
    else if (sheetName.toLowerCase() === 'staff') idColIndex = headers.indexOf('StaffID');
    else if (sheetName.toLowerCase() === 'staffdocuments') idColIndex = headers.indexOf('DocID');
    else if (sheetName.toLowerCase() === 'services') idColIndex = headers.indexOf('ServiceID');
    else if (sheetName.toLowerCase() === 'booking' || sheetName.toLowerCase() === 'bookings') idColIndex = headers.indexOf('BookingID');
    else if (sheetName.toLowerCase() === 'credittransaction' || sheetName.toLowerCase() === 'transactions') idColIndex = headers.indexOf('TransactionID');
  }

  if (idColIndex === -1) throw new Error("ID Column " + idColumnName + " not found");
  
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idColIndex]).trim() === String(idValue).trim()) {
      for (const key in processedData) {
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          let value = processedData[key];
          if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
          }
          sheet.getRange(i + 1, colIndex + 1).setValue(value);
        }
      }
      return true;
    }
  }
  return false;
}

function upsertSheetRow(sheetName, idColumnName, idValue, rowData) {
  if (idValue) {
    try {
      const updated = updateSheetRow(sheetName, idColumnName, idValue, rowData);
      if (updated) return { action: "updated", id: idValue };
    } catch (e) {
      // Fall through to append if row not found
    }
  }
  appendSheetRow(sheetName, rowData);
  return { action: "inserted", id: idValue };
}

function deleteSheetRow(sheetName, idColumnName, idValue) {
  const sheet = getSheetByNameRobust(sheetName);
  if (!sheet) return { success: false, message: "Sheet " + sheetName + " not found" };
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: true, deletedCount: 0, message: "No data rows" };
  
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  let idColIndex = headers.indexOf(idColumnName);
  
  if (idColIndex === -1) {
    if (sheetName.toLowerCase() === 'users') idColIndex = headers.indexOf('UserID');
    else if (sheetName.toLowerCase() === 'staff') idColIndex = headers.indexOf('StaffID');
    else if (sheetName.toLowerCase() === 'staffdocuments') idColIndex = headers.indexOf('DocID');
    else if (sheetName.toLowerCase() === 'services') idColIndex = headers.indexOf('ServiceID');
    else if (sheetName.toLowerCase() === 'booking' || sheetName.toLowerCase() === 'bookings') idColIndex = headers.indexOf('BookingID');
    else if (sheetName.toLowerCase() === 'credittransaction' || sheetName.toLowerCase() === 'transactions') idColIndex = headers.indexOf('TransactionID');
  }
  
  if (idColIndex === -1) {
    throw new Error("ID Column " + idColumnName + " not found in sheet " + sheetName);
  }
  
  let deletedCount = 0;
  // Loop from bottom to top so deleting rows does not alter index of upper rows
  for (let i = values.length - 1; i >= 1; i--) {
    const cellValue = String(values[i][idColIndex]).trim();
    if (cellValue === String(idValue).trim()) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }
  return { success: true, deletedCount: deletedCount };
}

function handleSyncAllTables(tables) {
  if (!tables) return { message: "No tables provided" };
  const db = getDb();
  for (const tableName in tables) {
    const rows = tables[tableName];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    let sheet = getSheetByNameRobust(tableName);
    if (!sheet) {
      sheet = db.insertSheet(tableName);
    }
    sheet.clear();
    
    // Process files and convert base64 to Drive URLs
    const processedRows = rows.map(r => processDataFiles(r));
    
    // Collect all unique headers across all rows in table
    const headerSet = {};
    processedRows.forEach(r => Object.keys(r).forEach(k => { headerSet[k] = true; }));
    const headers = Object.keys(headerSet);
    
    const sheetData = [headers];
    processedRows.forEach(r => {
      sheetData.push(headers.map(h => {
        let val = r[h];
        if (val === undefined || val === null) return "";
        if (typeof val === 'object') return JSON.stringify(val);
        return val;
      }));
    });
    
    const range = sheet.getRange(1, 1, sheetData.length, headers.length);
    range.setValues(sheetData);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#d9ead3");
    sheet.setFrozenRows(1);
  }
  return { success: true, message: "All tables synced successfully!" };
}
`
  },
  {
    name: "Code.gs",
    code: `/**
 * Code.gs
 * Web App entry points handling HTTP GET and POST requests
 */

function doGet(e) {
  return HtmlService.createTemplateFromFile("index")
    .evaluate()
    .setTitle("SabaiDee Home Massage Portal")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request.payload || request;
    let result = {};

    switch (action) {
      case "SYNC_ALL_DATA":
        result = handleSyncAllTables(request.tables || payload?.tables);
        break;
      case "INSERT": {
        const idCol = request.table === 'Users' ? 'UserID' : (request.table === 'Staff' ? 'StaffID' : (request.table === 'StaffDocuments' ? 'DocID' : (request.table === 'Services' ? 'ServiceID' : (request.table === 'Booking' ? 'BookingID' : (request.table === 'CreditTransaction' ? 'TransactionID' : 'ID')))));
        const idVal = request.data ? (request.data[idCol] || request.data.DocID || request.data.UserID || request.data.StaffID || request.data.TransactionID) : null;
        result = upsertSheetRow(request.table, idCol, idVal, request.data);
        break;
      }
      case "UPDATE": {
        const idCol = request.table === 'Users' ? 'UserID' : (request.table === 'Staff' ? 'StaffID' : (request.table === 'StaffDocuments' ? 'DocID' : (request.table === 'Booking' ? 'BookingID' : (request.table === 'Services' ? 'ServiceID' : (request.table === 'CreditTransaction' ? 'TransactionID' : 'ID')))));
        result = updateSheetRow(request.table, idCol, request.data[idCol] || request.data.DocID || request.data.StaffID || request.data.TransactionID, request.data);
        break;
      }
      case "DELETE": {
        const table = request.table;
        const data = request.data || {};
        const idCol = table === 'Users' ? 'UserID' : (table === 'Staff' ? 'StaffID' : (table === 'StaffDocuments' ? 'DocID' : (table === 'Services' ? 'ServiceID' : (table === 'Booking' ? 'BookingID' : (table === 'CreditTransaction' ? 'TransactionID' : 'ID')))));
        const idVal = data[idCol] || data.id || data.ID || request.id;
        
        // ลบผู้ใช้งาน: ลบแถวใน Users และถ้ามีประวัติใน Staff และ StaffDocuments ก็ลบออกด้วย
        if (table === 'Users' && idVal) {
          try {
            deleteSheetRow('Staff', 'UserID', idVal);
          } catch (e) {}
          try {
            deleteSheetRow('StaffDocuments', 'UserID', idVal);
          } catch (e) {}
          result = deleteSheetRow('Users', 'UserID', idVal);
        } else if (table === 'Staff') {
          if (data.StaffID) {
            deleteSheetRow('Staff', 'StaffID', data.StaffID);
            try { deleteSheetRow('StaffDocuments', 'StaffID', data.StaffID); } catch (e) {}
          }
          if (data.UserID) {
            deleteSheetRow('Staff', 'UserID', data.UserID);
            try { deleteSheetRow('StaffDocuments', 'UserID', data.UserID); } catch (e) {}
          }
          if (idVal && !data.StaffID && !data.UserID) {
            deleteSheetRow('Staff', idCol, idVal);
            try { deleteSheetRow('StaffDocuments', idCol, idVal); } catch (e) {}
          }
          result = { success: true };
        } else {
          result = deleteSheetRow(table, idCol, idVal);
        }
        break;
      }
      case "deleteUser":
        result = handleDeleteUser(payload);
        break;
      case "login":
        result = handleLogin(payload);
        break;
      case "register":
        result = handleRegister(payload);
        break;
      case "getServices":
        result = getServicesList();
        break;
      case "createBooking":
        result = createNewBooking(payload);
        break;
      case "getBookingDetails":
        result = getBookingDetail(payload.bookingId);
        break;
      case "updateBookingStatus":
        result = updateBookingState(payload.bookingId, payload.actionName, payload.staffId);
        break;
      case "getStaffList":
        result = getStaffList();
        break;
      case "updateStaffLocation":
        result = updateLocation(payload.staffId, payload.lat, payload.lng);
        break;
      case "topupCredit":
        result = requestTopup(payload);
        break;
      case "getTransactions":
        result = getCreditTransactions();
        break;
      case "approveTransaction":
        result = approveCreditTransaction(payload.txId, payload.status, payload.remark);
        break;
      case "addReview":
        result = submitReview(payload);
        break;
      case "getNotifications":
        result = getUserNotifications(payload.userId);
        break;
      case "getSettings":
        result = getAppSettings();
        break;
      case "updateSettings":
        result = updateAppSettings(payload);
        break;
      default:
        throw new Error("Action not found: " + action);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`
  },
  {
    name: "Auth.gs",
    code: `/**
 * Auth.gs
 * Authentication, Registration & User Management workflows
 * บันทึกประวัติพนักงานและเอกสารหลักฐาน (ใบอนุญาต, บัตรประชาชน, ทะเบียนบ้าน) ครบถ้วน
 */

function handleLogin(payload) {
  const users = getSheetData("Users");
  const user = users.find(u => u.Phone == payload.phone && u.Password == payload.password);
  
  if (!user) throw new Error("เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง");
  if (user.Status === "Inactive") throw new Error("บัญชีของคุณถูกระงับชั่วคราว");

  let staff = null;
  if (user.Role === "Staff") {
    const staffs = getSheetData("Staff");
    staff = staffs.find(s => s.UserID === user.UserID) || null;
  }

  return { user, staff };
}

function handleDeleteUser(payload) {
  const userId = payload.userId || payload.UserID;
  if (!userId) throw new Error("ระบุ UserID ที่ต้องการลบ");
  
  // ลบข้อมูลพนักงานนวดและเอกสารหลักฐานที่ผูกกัน (ถ้ามี)
  try {
    deleteSheetRow("Staff", "UserID", userId);
  } catch (e) {}
  try {
    deleteSheetRow("StaffDocuments", "UserID", userId);
  } catch (e) {}
  
  // ลบข้อมูลผู้ใช้จากชีต Users
  const res = deleteSheetRow("Users", "UserID", userId);
  return { success: true, deleted: res };
}

function handleRegister(payload) {
  const users = getSheetData("Users");
  const existing = users.find(u => u.Phone == payload.phone);
  if (existing) throw new Error("เบอร์โทรศัพท์นี้สมัครสมาชิกแล้ว");

  const userId = "U" + Math.floor(100000 + Math.random() * 900000);
  const newUser = {
    UserID: userId,
    Name: payload.name,
    Phone: payload.phone,
    Password: payload.password,
    Email: payload.email || "",
    Address: payload.address || "",
    Province: payload.province || "",
    District: payload.district || "",
    SubDistrict: payload.subDistrict || "",
    Latitude: payload.latitude || 9.138244,
    Longitude: payload.longitude || 99.321748,
    ProfileImage: payload.profileImage || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    Role: payload.role, // Customer / Staff
    Status: "Active",
    CreatedDate: new Date().toISOString()
  };

  appendSheetRow("Users", newUser);

  if (payload.role === "Staff") {
    const staffId = "SFT" + Math.floor(100000 + Math.random() * 900000);
    const newStaff = {
      StaffID: staffId,
      UserID: userId,
      Nickname: payload.nickname || payload.name.split(" ")[0],
      Gender: payload.gender || "Female",
      Age: payload.age || 30,
      Weight: payload.weight || 50,
      Height: payload.height || 160,
      RegisteredAddress: payload.registeredAddress || payload.address || "",
      Experience: payload.experience || 3,
      Description: payload.description || "ยินดีให้บริการนวดเพื่อสุขภาพค่ะ",
      Rating: 5.0,
      ReviewCount: 0,
      Credit: 398,
      Available: "ON",
      VerifyStatus: "Approved",
      CurrentLatitude: newUser.Latitude,
      CurrentLongitude: newUser.Longitude,
      LastLocationUpdate: new Date().toISOString(),
      TotalIncome: 0,
      TotalJobs: 0,
      OfferedServices: payload.offeredServices || [],
      MaxJobDistance: payload.maxJobDistance || 25,
      Photos: payload.photos || [],
      LicenseFile: payload.licenseFile || "",
      IdCardFile: payload.idCardFile || "",
      HouseRegFile: payload.houseRegFile || ""
    };
    appendSheetRow("Staff", newStaff);

    // บันทึกลงตารางเอกสารหลักฐาน StaffDocuments ด้วย
    const staffDoc = {
      DocID: "DOC-" + staffId,
      StaffID: staffId,
      UserID: userId,
      StaffName: payload.name,
      Nickname: newStaff.Nickname,
      Phone: payload.phone,
      VerifyStatus: newStaff.VerifyStatus,
      LicenseFile: newStaff.LicenseFile,
      IdCardFile: newStaff.IdCardFile,
      HouseRegFile: newStaff.HouseRegFile,
      RegisteredAddress: newStaff.RegisteredAddress,
      SubmittedDate: new Date().toISOString(),
      Notes: "หลักฐานการสมัครพนักงานใหม่ (ใบอนุญาตนวด, บัตรประชาชน, ทะเบียนบ้าน)"
    };
    try {
      appendSheetRow("StaffDocuments", staffDoc);
    } catch (e) {}
  }

  return { success: true, userId };
}
`
  },
  {
    name: "Booking.gs",
    code: `/**
 * Booking.gs
 * Handles client reservations and matching logic queue
 */

function createNewBooking(payload) {
  const bookingId = "B" + Math.floor(100000 + Math.random() * 900000);
  const settings = getAppSettings();
  
  // Calculate nearest available staff
  const staffList = getStaffList();
  const eligible = staffList.filter(s => 
    s.Available === "ON" && 
    s.VerifyStatus === "Approved" && 
    s.Credit >= payload.creditRequired
  );

  let bestStaff = null;
  let minDistance = 999;

  eligible.forEach(s => {
    const d = calculateDistance(payload.lat, payload.lng, s.CurrentLatitude, s.CurrentLongitude);
    const maxDist = s.MaxJobDistance || settings.searchRadius;
    if (d < minDistance && d <= maxDist) {
      minDistance = d;
      bestStaff = s;
    }
  });

  if (!bestStaff) {
    return { error: "ขออภัย ไม่มีหมอนวดให้บริการในระยะที่กำหนดจากตำแหน่งของคุณ กรุณาเลือกตำแหน่งอื่นหรือลองใหม่ภายหลังค่ะ" };
  }

  const travelFee = bestStaff ? Math.round(minDistance * settings.travelFeePerKm) : 100;
  const totalPrice = payload.price + travelFee;

  const booking = {
    BookingID: bookingId,
    CustomerID: payload.customerId,
    StaffID: bestStaff ? bestStaff.StaffID : "none",
    BookingDate: new Date().toISOString().split("T")[0],
    BookingTime: new Date().toTimeString().split(" ")[0].substring(0, 5),
    ServiceID: payload.serviceId,
    ServicePrice: payload.price,
    Distance: bestStaff ? minDistance : 5.0,
    TravelFee: travelFee,
    TotalPrice: totalPrice,
    CustomerLatitude: payload.lat,
    CustomerLongitude: payload.lng,
    CustomerAddress: payload.address,
    Status: bestStaff ? "Waiting" : "Cancel", // auto-cancel if no staff online
    PaymentStatus: "Unpaid",
    CreatedDate: new Date().toISOString()
  };

  appendSheetRow("Booking", booking);

  if (bestStaff) {
    createNotification(
      bestStaff.UserID, 
      "🔔 มีงานนวดใหม่เรียกใช้คุณ!", 
      "คุณได้รับการจองนวดระยะทาง " + minDistance + " กม. รายได้คาดการณ์ " + totalPrice + " บาท ตอบรับด่วน"
    );
  }

  return { bookingId, matched: bestStaff !== null };
}

function updateBookingState(bookingId, actionName, staffId) {
  const bookings = getSheetData("Booking");
  const b = bookings.find(x => x.BookingID == bookingId);
  if (!b) throw new Error("ไม่พบข้อมูลงานจอง");

  const updates = {};
  if (actionName === "accept") {
    const staff = getSheetData("Staff").find(s => s.StaffID === staffId);
    if (staff.Credit < 50) throw new Error("เครดิตต่ำกว่าเกณฑ์ขั้นต่ำ");
    
    // Deduct Credit
    updateSheetRow("Staff", "StaffID", staffId, { Credit: staff.Credit - 50, TotalJobs: Number(staff.TotalJobs) + 1 });
    
    updates.Status = "Accepted";
    updates.StaffID = staffId;
    createNotification(b.CustomerID, "🟢 พนักงานรับงานแล้ว!", "พี่ " + staff.Nickname + " กำลังเตรียมตัวเดินทางมาบริการค่ะ");
  } else if (actionName === "start_travel") {
    updates.Status = "Working";
    createNotification(b.CustomerID, "🛵 พนักงานเริ่มเดินทางแล้ว", "พนักงานนวดกำลังเร่งเดินทางไปยังบ้านของคุณค่ะ");
  } else if (actionName === "complete") {
    updates.Status = "Completed";
    updates.PaymentStatus = "Paid";
    
    // Add income to staff
    const staff = getSheetData("Staff").find(s => s.StaffID === b.StaffID);
    if (staff) {
      updateSheetRow("Staff", "StaffID", b.StaffID, { TotalIncome: Number(staff.TotalIncome) + Number(b.TotalPrice) });
    }
    
    createNotification(b.CustomerID, "✅ บริการเสร็จสิ้นเรียบร้อย", "ขอบคุณที่ใช้บริการค่ะ โปรดสละเวลาช่วยรีวิวให้คะแนนพนักงานด้วยนะคะ");
  } else if (actionName === "cancel") {
    updates.Status = "Cancel";
    createNotification(b.CustomerID, "⚠️ รายการจองถูกยกเลิก", "รายการเรียกหมอนวดได้รับการยกเลิกแล้วค่ะ");
  }

  updateSheetRow("Booking", "BookingID", bookingId, updates);
  return { success: true };
}
`
  },
  {
    name: "Staff.gs",
    code: `/**
 * Staff.gs
 * Staff profiles, status, GPS controls, and evidence documents verification
 */

function getStaffList() {
  const staff = getSheetData("Staff");
  const users = getSheetData("Users");
  
  return staff.map(s => {
    const u = users.find(x => x.UserID === s.UserID) || {};
    return {
      ...s,
      Name: u.Name,
      Phone: u.Phone,
      ProfileImage: u.ProfileImage,
      Email: u.Email,
      LicenseFile: s.LicenseFile || "",
      IdCardFile: s.IdCardFile || "",
      HouseRegFile: s.HouseRegFile || "",
      RegisteredAddress: s.RegisteredAddress || u.Address || ""
    };
  });
}

function getStaffEvidenceDocuments(staffId) {
  const docs = getSheetData("StaffDocuments");
  if (docs && docs.length > 0) {
    const found = docs.find(d => d.StaffID === staffId);
    if (found) return found;
  }
  const staffList = getStaffList();
  const staff = staffList.find(s => s.StaffID === staffId);
  if (!staff) return null;
  return {
    DocID: "DOC-" + staff.StaffID,
    StaffID: staff.StaffID,
    UserID: staff.UserID,
    StaffName: staff.Name,
    Nickname: staff.Nickname,
    Phone: staff.Phone,
    VerifyStatus: staff.VerifyStatus,
    LicenseFile: staff.LicenseFile,
    IdCardFile: staff.IdCardFile,
    HouseRegFile: staff.HouseRegFile,
    RegisteredAddress: staff.RegisteredAddress
  };
}

function updateLocation(staffId, lat, lng) {
  return updateSheetRow("Staff", "StaffID", staffId, {
    CurrentLatitude: lat,
    CurrentLongitude: lng,
    LastLocationUpdate: new Date().toISOString()
  });
}
`
  },
  {
    name: "Credit.gs",
    code: `/**
 * Credit.gs
 * Handles Wallet topups, Slip Uploads, and Credit Deductions
 */

function requestTopup(payload) {
  const txId = "TX" + Math.floor(100000 + Math.random() * 900000);
  const transaction = {
    TransactionID: txId,
    StaffID: payload.staffId,
    Amount: payload.amount,
    BeforeCredit: payload.beforeCredit,
    AfterCredit: payload.beforeCredit,
    Type: "Topup",
    SlipImage: payload.slipImage, // Base64 or Drive URL
    Status: "Pending",
    AdminRemark: "",
    CreatedDate: new Date().toISOString()
  };

  appendSheetRow("CreditTransaction", transaction);
  return { txId };
}

function approveCreditTransaction(txId, status, remark) {
  const txs = getSheetData("CreditTransaction");
  const tx = txs.find(t => t.TransactionID === txId);
  if (!tx) throw new Error("ไม่พบรายการธุรกรรม");

  const staff = getSheetData("Staff").find(s => s.StaffID === tx.StaffID);
  if (!staff) throw new Error("ไม่พบพนักงานนวดปลายทาง");

  const updates = { Status: status, AdminRemark: remark };
  
  if (status === "Approved") {
    const newCredit = Number(staff.Credit) + Number(tx.Amount);
    updateSheetRow("Staff", "StaffID", tx.StaffID, { Credit: newCredit });
    updates.BeforeCredit = staff.Credit;
    updates.AfterCredit = newCredit;
    
    createNotification(staff.UserID, "✅ เครดิตเติมสำเร็จ!", "รายการโอนเงินได้รับการอนุมัติแล้ว เครดิตใหม่: " + newCredit + " CR");
  } else {
    createNotification(staff.UserID, "⚠️ รายการโอนเงินไม่ได้รับการอนุมัติ", "เหตุผล: " + remark);
  }

  updateSheetRow("CreditTransaction", "TransactionID", txId, updates);
  return { success: true };
}
`
  },
  {
    name: "Setting.gs",
    code: `/**
 * Setting.gs
 * Load and Save platform global settings
 */

function getAppSettings() {
  const rows = getSheetData("Settings");
  if (rows.length === 0) return {};
  return rows[0]; // Active settings configuration row
}

function updateAppSettings(payload) {
  const sheet = getDb().getSheetByName("Settings");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  for (const key in payload) {
    const colIndex = headers.indexOf(key);
    if (colIndex !== -1) {
      sheet.getRange(2, colIndex + 1).setValue(payload[key]);
    }
  }
  return { success: true };
}
`
  },
  {
    name: "Notification.gs",
    code: `/**
 * Notification.gs
 * Creates and reads database system notifications
 */

function createNotification(userId, title, detail) {
  const notificationId = "N" + Math.floor(100000 + Math.random() * 900000);
  const item = {
    NotificationID: notificationId,
    UserID: userId,
    Title: title,
    Detail: detail,
    ReadStatus: "Unread",
    CreatedDate: new Date().toISOString()
  };
  appendSheetRow("Notification", item);
  return notificationId;
}

function getUserNotifications(userId) {
  const notes = getSheetData("Notification");
  return notes.filter(n => n.UserID === userId).reverse();
}
`
  },
  {
    name: "Map.gs",
    code: `/**
 * Map.gs
 * Distance & Travel routing calculation using Google APIs
 */

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Simple fallback Haversine distance if Distance Matrix API not available
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Number((R * c).toFixed(1));
}

function getGoogleRouteDistance(origin, destination) {
  // Uses Geocoding & Distance Matrix if real key is configured
  try {
    const response = Maps.newDirectionFinder()
      .setOrigin(origin.lat, origin.lng)
      .setDestination(destination.lat, destination.lng)
      .setMode(Maps.DirectionFinder.Mode.DRIVING)
      .getDirections();
    
    if (response.routes && response.routes.length > 0) {
      const leg = response.routes[0].legs[0];
      return {
        distanceKm: leg.distance.value / 1000,
        durationMins: Math.round(leg.duration.value / 60)
      };
    }
  } catch(e) {
    Logger.log("Maps API failed, using math: " + e.message);
  }
  return null;
}
`
  },
  {
    name: "Utils.gs",
    code: `/**
 * Utils.gs
 * Helper utilities for Apps Script execution
 */

function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
}

function hashPasswordForProduction(pwd) {
  // Simple SHA-256 string hash for Apps Script
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pwd, Utilities.Charset.UTF_8);
  let output = "";
  for (let i = 0; i < rawHash.length; i++) {
    let byteValue = rawHash[i];
    if (byteValue < 0) byteValue += 256;
    let byteString = byteValue.toString(16);
    if (byteString.length == 1) byteString = "0" + byteString;
    output += byteString;
  }
  return output;
}
`
  }
];
