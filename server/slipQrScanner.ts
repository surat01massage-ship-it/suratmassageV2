import jsQR from 'jsqr';
import { Jimp } from 'jimp';

export interface DecodedSlipQR {
  found: boolean;
  rawPayload?: string;
  sendingBank?: string;
  bankName?: string;
  transRef?: string;
  dateTime?: string;
  countryCode?: string;
  amount?: number;
  crc?: string;
  error?: string;
}

// Thai Bank Identification Codes standard in BOT PromptPay / EMVCo Slip Mini QR
const THAI_BANK_CODES: Record<string, string> = {
  '004': 'ธนาคารกสิกรไทย (KBANK)',
  '014': 'ธนาคารไทยพาณิชย์ (SCB)',
  '006': 'ธนาคารกรุงไทย (KTB)',
  '002': 'ธนาคารกรุงเทพ (BBL)',
  '011': 'ธนาคารทหารไทยธนชาต (TTB)',
  '025': 'ธนาคารกรุงศรีอยุธยา (BAY)',
  '030': 'ธนาคารออมสิน (GSB)',
  '034': 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (BAAC)',
  '022': 'ธนาคารซีไอเอ็มบีไทย (CIMB)',
  '069': 'ธนาคารเกียรตินาคินภัทร (KKP)',
  '073': 'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)',
  '067': 'ธนาคารทิสโก้ (TISCO)',
  '066': 'ธนาคารอิสลามแห่งประเทศไทย (IBANK)',
  '140': 'TrueMoney Wallet',
  '999': 'PromptPay Standard'
};

/**
 * Parses EMVCo Tag-Length-Value (TLV) encoded string
 * e.g. "0004000101030040225..."
 */
export function parseTLV(payload: string): Record<string, string> {
  const result: Record<string, string> = {};
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

/**
 * Decodes Thai Bank Slip QR (PromptPay / Bank of Thailand Mini QR standard)
 * Format usually starts with 00040001 or 000201 (standard EMVCo)
 */
export function parseThaiBankSlipPayload(raw: string): DecodedSlipQR {
  const trimmed = raw.trim();

  // Check if it follows standard Thai Bank Mini QR (Tag 00 = 0001 or standard TLV)
  const tlv = parseTLV(trimmed);

  // Sub-tag parsing:
  // Tag 00: Payload Format Indicator (often 0001 or 01)
  // Tag 01: Sub-data or Bank routing
  // Tag 02: TransRef or Transaction Identifier
  // Tag 51 / Tag 00 / Tag 01: Sub-tags containing Bank Code (004, 014, 006, etc.)
  
  let sendingBank = '';
  let transRef = '';
  let dateTime = '';
  let amount: number | undefined;

  // Pattern 1: Standard Thai Bank Mini QR: 00040001...
  // Sub-tags in Tag 00 or top-level
  if (tlv['00'] && (tlv['00'] === '0001' || tlv['00'] === '01')) {
    // Top-level TLV
    if (tlv['01']) {
      // Sub-TLV inside 01 or direct bank code
      const sub = parseTLV(tlv['01']);
      sendingBank = sub['00'] || sub['01'] || tlv['01'];
    }
    if (tlv['02']) {
      transRef = tlv['02'];
    }
    if (tlv['03']) {
      dateTime = tlv['03'];
    }
    if (tlv['54']) {
      const amt = parseFloat(tlv['54']);
      if (!isNaN(amt)) amount = amt;
    }
  }

  // Fallback regex pattern matching for bank code and transRef in Thai Slip Mini QR:
  // Usually contains bank code 3 digits e.g. 004, 014, 006 followed by reference
  if (!transRef) {
    // Look for 15-35 alphanumeric ref string
    const refMatch = trimmed.match(/([0-9A-Za-z]{15,40})/);
    if (refMatch) {
      transRef = refMatch[1];
    }
  }

  // Look for 3-digit bank code in payload if not found
  if (!sendingBank) {
    for (const [code] of Object.entries(THAI_BANK_CODES)) {
      if (trimmed.includes(code)) {
        sendingBank = code;
        break;
      }
    }
  }

  const bankName = THAI_BANK_CODES[sendingBank] || (sendingBank ? `ธนาคารรหัส ${sendingBank}` : 'ธนาคารพาณิชย์ไทย');

  return {
    found: true,
    rawPayload: trimmed,
    sendingBank,
    bankName,
    transRef: transRef || trimmed.slice(-25),
    dateTime,
    amount,
    crc: tlv['63'] || ''
  };
}

/**
 * Scans image base64 data directly on the server without any API key or external network request
 */
export async function scanSlipQRCode(base64Image: string): Promise<DecodedSlipQR> {
  try {
    let cleanBase64 = base64Image;
    if (base64Image.includes(',')) {
      cleanBase64 = base64Image.split(',')[1];
    }
    cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, '');

    const buffer = Buffer.from(cleanBase64, 'base64');
    const image = await Jimp.read(buffer);

    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const rawData = image.bitmap.data;

    // Convert to RGBA Uint8ClampedArray for jsQR
    const clampedData = new Uint8ClampedArray(rawData.buffer, rawData.byteOffset, rawData.byteLength);

    // First attempt: Full resolution
    let code = jsQR(clampedData, width, height, {
      inversionAttempts: 'attemptBoth'
    });

    // Second attempt if not found: Resize down if image is too huge (mobile camera photos 4000x3000)
    if (!code && (width > 1200 || height > 1200)) {
      const resized = image.clone();
      resized.resize({ w: Math.min(1000, width), h: Math.min(1000, height) });
      const rClamped = new Uint8ClampedArray(resized.bitmap.data.buffer, resized.bitmap.data.byteOffset, resized.bitmap.data.byteLength);
      code = jsQR(rClamped, resized.bitmap.width, resized.bitmap.height, {
        inversionAttempts: 'attemptBoth'
      });
    }

    // Third attempt: Crop bottom-half / bottom-corner where Thai bank slip QRs are located
    if (!code && height > 600) {
      const bottomHalf = image.clone();
      bottomHalf.crop({ x: 0, y: Math.floor(height * 0.4), w: width, h: Math.floor(height * 0.6) });
      const bClamped = new Uint8ClampedArray(bottomHalf.bitmap.data.buffer, bottomHalf.bitmap.data.byteOffset, bottomHalf.bitmap.data.byteLength);
      code = jsQR(bClamped, bottomHalf.bitmap.width, bottomHalf.bitmap.height, {
        inversionAttempts: 'attemptBoth'
      });
    }

    if (!code || !code.data) {
      return {
        found: false,
        error: 'ไม่พบ QR Code บนรูปภาพสลิป กรุณาตรวจสอบว่าถ่ายเห็น QR Code สลิปธนาคารชัดเจน'
      };
    }

    const parsed = parseThaiBankSlipPayload(code.data);
    return parsed;
  } catch (err: any) {
    console.error('Local QR scan error:', err);
    return {
      found: false,
      error: `เกิดข้อผิดพลาดในการประมวลผลรูปภาพ: ${err?.message || 'ภาพไม่ถูกต้อง'}`
    };
  }
}
