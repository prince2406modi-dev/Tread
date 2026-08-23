// Indian GSTIN (Goods and Services Tax Identification Number) Validator & Parser

export const GST_STATE_CODES = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
};

export const PAN_ENTITY_TYPES = {
  'C': 'Company / Corporate',
  'P': 'Individual / Sole Proprietor',
  'H': 'Hindu Undivided Family (HUF)',
  'F': 'Partnership Firm / LLP',
  'A': 'Association of Persons (AOP)',
  'T': 'Trust / NGO',
  'B': 'Body of Individuals (BOI)',
  'G': 'Government Agency',
  'J': 'Artificial Juridical Person',
  'L': 'Local Authority / Municipal',
};

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Calculates the expected 15th checksum character using standard Mod 36 Luhn algorithm.
 */
export function calculateGSTINChecksum(first14Chars) {
  if (!first14Chars || first14Chars.length !== 14) return null;
  const upper = first14Chars.toUpperCase();
  let sum = 0;

  for (let i = 0; i < 14; i++) {
    const char = upper[i];
    const val = CHARS.indexOf(char);
    if (val === -1) return null;

    // Weight factor: 1 for even index (0, 2, 4...), 2 for odd index (1, 3, 5...)
    const factor = i % 2 === 0 ? 1 : 2;
    const product = val * factor;
    const quotient = Math.floor(product / 36);
    const remainder = product % 36;
    sum += quotient + remainder;
  }

  const checkCode = (36 - (sum % 36)) % 36;
  return CHARS[checkCode];
}

/**
 * Validates and parses a GSTIN string.
 * Returns detailed analysis, state info, entity type, and error reason if invalid.
 */
export function validateGSTIN(gstinInput) {
  if (!gstinInput || typeof gstinInput !== 'string') {
    return {
      isValid: false,
      gstin: '',
      errorMessage: 'GSTIN is empty.',
    };
  }

  const gstin = gstinInput.trim().toUpperCase();

  if (gstin.length !== 15) {
    return {
      isValid: false,
      gstin,
      errorMessage: `GSTIN must be exactly 15 characters (currently ${gstin.length} chars).`,
    };
  }

  // Regex format: 2 digits + 5 letters + 4 digits + 1 letter + 1 digit/letter + 'Z' + 1 digit/letter
  const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!GST_REGEX.test(gstin)) {
    return {
      isValid: false,
      gstin,
      errorMessage: 'Invalid GSTIN format structure (Expected: 2 state digits + 10 PAN chars + 1 entity char + Z + 1 checksum).',
    };
  }

  const stateCode = gstin.slice(0, 2);
  const stateName = GST_STATE_CODES[stateCode];
  if (!stateName) {
    return {
      isValid: false,
      gstin,
      stateCode,
      errorMessage: `Invalid State Code '${stateCode}'. State code must be between 01 and 38.`,
    };
  }

  const pan = gstin.slice(2, 12);
  const entityChar = pan[3];
  const entityType = PAN_ENTITY_TYPES[entityChar] || 'Other Legal Entity';
  const entityNumber = gstin[12];
  const checkDigit = gstin[14];

  const expectedChecksum = calculateGSTINChecksum(gstin.slice(0, 14));
  const isChecksumValid = expectedChecksum === checkDigit;

  return {
    isValid: isChecksumValid,
    gstin,
    stateCode,
    stateName,
    pan,
    entityType,
    entityNumber,
    checkDigit,
    expectedChecksum,
    isChecksumValid,
    portalUrl: `https://services.gst.gov.in/services/searchtp?gstin=${gstin}`,
    message: isChecksumValid
      ? `✓ Valid GSTIN registered in ${stateName} (${entityType})`
      : `⚠️ Format matches ${stateName}, but check-digit '${checkDigit}' differs from standard algorithm '${expectedChecksum}'. Verify on GST Portal if newly allotted.`,
  };
}

/**
 * Parses raw text copied directly from the official GST Portal (services.gst.gov.in),
 * e-Way bills, tax invoices, or GST certificates.
 * Extracts Legal Name, Trade Name, Principal Place of Business Address, Pincode, and GSTIN.
 */
export function parseGSTPortalText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { success: false, error: 'No text provided to parse.' };
  }

  const text = rawText.trim();
  let gstin = '';
  let legalName = '';
  let tradeName = '';
  let address = '';
  let pincode = '';
  let state = '';
  let status = '';

  // 1. Extract GSTIN via Regex
  const gstinMatch = text.match(/[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/i);
  if (gstinMatch) {
    gstin = gstinMatch[0].toUpperCase();
    const stateCode = gstin.slice(0, 2);
    if (GST_STATE_CODES[stateCode]) {
      state = GST_STATE_CODES[stateCode];
    }
  }

  // 2. Extract 6-digit Indian Pincode
  const pinMatch = text.match(/\b([1-9][0-9]{5})\b/);
  if (pinMatch) {
    pincode = pinMatch[1];
  }

  // 3. Extract Principal Place of Business Address
  // Common patterns in GST portal copied text:
  // "Principal Place of Business" followed by address
  // "Address" or "Address of Principal Place of Business"
  const addressPatterns = [
    /Principal\s+Place\s+of\s+Business(?:\s+Address)?\s*[:\-\n]+\s*([^]*?)(?=(?:Additional|State\s+Jurisdiction|Center\s+Jurisdiction|Nature|Date|Taxpayer|Whether|Last|$))/i,
    /Address\s*[:\-\n]+\s*([^]*?)(?=(?:State\s+Jurisdiction|Center\s+Jurisdiction|Nature|Date|Taxpayer|$))/i,
    /Registered\s+Office\s+Address\s*[:\-\n]+\s*([^]*?)(?=(?:State|Date|Taxpayer|$))/i,
  ];

  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 5) {
      address = match[1]
        .replace(/\s+/g, ' ')
        .replace(/^\s*[:\-.]+\s*/, '')
        .trim();
      break;
    }
  }

  // 4. Extract Legal Name
  const legalNamePatterns = [
    /Legal\s+Name\s+of\s+Business\s*[:\-\n]+\s*([^\n\r]+)/i,
    /Legal\s+Name\s*[:\-\n]+\s*([^\n\r]+)/i,
  ];
  for (const pattern of legalNamePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      legalName = match[1].trim();
      break;
    }
  }

  // 5. Extract Trade Name
  const tradeNamePatterns = [
    /Trade\s+Name\s*[:\-\n]+\s*([^\n\r]+)/i,
  ];
  for (const pattern of tradeNamePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      tradeName = match[1].trim();
      break;
    }
  }

  // 6. Extract Status (Active / Inactive)
  const statusMatch = text.match(/GSTIN\s*\/?\s*UIN\s+Status\s*[:\-\n]+\s*([^\n\r]+)/i);
  if (statusMatch && statusMatch[1]) {
    status = statusMatch[1].trim();
  }

  // Fallback: If address was not found by header label but the text looks like a pasted address block
  if (!address && text.length > 10) {
    // If user simply pasted the address itself
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const candidateLines = lines.filter(
      (l) =>
        !l.match(/^(GSTIN|Legal Name|Trade Name|Status|Search Taxpayer)/i) &&
        !l.match(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i)
    );
    if (candidateLines.length > 0) {
      address = candidateLines.join(', ');
    }
  }

  const preferredName = tradeName && tradeName !== 'NA' && tradeName !== legalName
    ? tradeName
    : legalName;

  return {
    success: Boolean(address || gstin || preferredName),
    gstin,
    legalName,
    tradeName,
    businessName: preferredName,
    address,
    pincode,
    state,
    status,
  };
}