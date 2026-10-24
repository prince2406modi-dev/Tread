/**
 * ============================================================================
 * TREAD GST SUITE — NATURAL LANGUAGE PROCESSING & VOICE COMMAND ENGINE
 * ============================================================================
 * 
 * Provides robust intent classification and entity extraction for voice commands
 * and conversational text inputs. Understands Indian business terminology,
 * informal billing phrases ("banao", "add karo", "rate", "pcs", "with gst"),
 * and standard English phrasing.
 * 
 * Coders can easily extend INTENTS, synonyms, or regex rules below.
 */

// Common Indian number words mapping
const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000, lakh: 100000,
  crore: 10000000, ek: 1, do: 2, teen: 3, chaar: 4, paanch: 5, chhe: 6, saat: 7, aath: 8, nau: 9, das: 10
};

/**
 * Normalizes voice transcript text (handles common speech-to-text artifacts)
 */
export function normalizeTranscript(text = '') {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[₹,]/g, '')
    .replace(/percent/gi, '%')
    .replace(/percentage/gi, '%')
    .replace(/at the rate of/gi, 'rate')
    .replace(/at the rate/gi, 'rate')
    .replace(/@/g, ' rate ')
    .replace(/\brupees\b|\brs\.?\b|\binr\b/gi, '')
    .trim();
}

/**
 * Parses numeric values from words or digits
 */
export function parseNumberString(str) {
  if (!str) return 0;
  const clean = String(str).toLowerCase().trim();
  const directNum = parseFloat(clean);
  if (!isNaN(directNum)) return directNum;

  // Word-based number resolution
  const words = clean.split(/\s+/);
  let total = 0;
  let current = 0;
  for (const w of words) {
    if (NUMBER_WORDS[w] !== undefined) {
      const val = NUMBER_WORDS[w];
      if (val === 100) current = (current || 1) * 100;
      else if (val >= 1000) {
        total += (current || 1) * val;
        current = 0;
      } else {
        current += val;
      }
    }
  }
  return total + current;
}

/**
 * Extracts line item details (Description, Quantity, Rate, Unit, GST %) from voice text
 * 
 * Example inputs:
 * - "Bill 10 wireless mouse to Sharma Electronics at 450 with 18% GST"
 * - "Add 5 pieces LED bulb rate 120 hsn 8539 gst 18"
 * - "2 laptops rate 45000"
 */
export function parseItemFromVoice(text) {
  const normalized = normalizeTranscript(text);

  let quantity = 1;
  let rate = 0;
  let gstPercent = 18;
  let hsn = '';
  let unit = 'PCS';
  let partyName = '';

  // 1. Extract Customer / Party Name ("to <Party Name>", "for <Party Name>")
  const partyMatch = normalized.match(/(?:to|for|naam|party)\s+([a-zA-Z0-9\s&]+?)(?:\s+(?:at|rate|price|with|having|qty|quantity|ke|ka)\b|$)/i);
  if (partyMatch) {
    partyName = partyMatch[1].trim();
  }

  // 2. Extract GST Percentage
  const gstMatch = normalized.match(/(?:gst|tax)\s*(?:rate|slab|is|of)?\s*(\d{1,2})\s*%?/i) ||
                   normalized.match(/(\d{1,2})\s*%\s*(?:gst|tax)?/i);
  if (gstMatch) {
    const val = parseInt(gstMatch[1], 10);
    if ([0, 5, 12, 18, 28].includes(val)) {
      gstPercent = val;
    }
  }

  // 3. Extract HSN Code
  const hsnMatch = normalized.match(/(?:hsn|sac|code)\s*(?:is|no)?\s*(\d{2,8})/i);
  if (hsnMatch) {
    hsn = hsnMatch[1];
  }

  // 4. Extract Rate / Price
  const rateMatch = normalized.match(/(?:rate|price|bhav|amount|cost)\s*(?:is|of|@)?\s*(\d+(?:\.\d+)?)/i) ||
                    normalized.match(/@\s*(\d+(?:\.\d+)?)/i) ||
                    normalized.match(/at\s+(\d+(?:\.\d+)?)(?:\s+(?:each|per|rupees|rs|with|gst)|$)/i);
  if (rateMatch) {
    rate = parseFloat(rateMatch[1]);
  }

  // 5. Extract Unit
  const unitMatch = normalized.match(/\b(pcs|pieces?|nos?|box(?:es)?|kgs?|packets?|mtr|mtrs?|litres?|ltr|sets?|bags?|rolls?|doz)\b/i);
  if (unitMatch) {
    const u = unitMatch[1].toUpperCase();
    if (u.startsWith('PC')) unit = 'PCS';
    else if (u.startsWith('NO')) unit = 'NOS';
    else if (u.startsWith('BOX')) unit = 'BOX';
    else if (u.startsWith('KG')) unit = 'KGS';
    else if (u.startsWith('PKT') || u.startsWith('PACK')) unit = 'PKT';
    else if (u.startsWith('MTR')) unit = 'MTR';
    else if (u.startsWith('BAG')) unit = 'BAG';
    else unit = u;
  }

  // 6. Extract Quantity
  // Looking for numbers preceding or following quantity keywords or units
  const qtyMatch = normalized.match(/(?:qty|quantity|nug|piece|pieces|nos?|add|bill)\s*(\d+)/i) ||
                   normalized.match(/^(\d+)\s+[a-zA-Z]/i) ||
                   normalized.match(/\b(\d+)\s*(?:pcs|pieces|nos|box|kg|pkt|mtr|bag|units?)\b/i);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10) || 1;
  }

  // 7. Extract Clean Item Description
  // Strip out command verbs, numbers, rate, gst, and party from the text
  let desc = normalized
    .replace(/^(?:bill|add|create|invoice|make|enter|karo|daalo|nug)\s+/i, '')
    .replace(/(?:to|for|party)\s+[a-zA-Z0-9\s&]+?(?:\s+(?:at|rate|price|with|qty)|$)/i, ' ')
    .replace(/(?:rate|price|cost|bhav)\s*(?:is|of|@)?\s*\d+(?:\.\d+)?/i, ' ')
    .replace(/(?:gst|tax)\s*(?:rate|slab|is|of)?\s*\d+\s*%?/i, ' ')
    .replace(/\d+\s*%\s*(?:gst|tax)?/i, ' ')
    .replace(/(?:hsn|sac)\s*(?:code)?\s*\d+/i, ' ')
    .replace(/(?:qty|quantity)\s*\d+/i, ' ')
    .replace(/\b\d+\s*(?:pcs|pieces|nos|box|kg|pkt|mtr|bag|units?)\b/i, ' ')
    .replace(/\b(?:pcs|pieces|nos|box|kg|pkt|mtr|bag|units?|at|with|each|per)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If description still starts with a standalone number, strip it
  desc = desc.replace(/^\d+\s+/, '').trim();

  const description = desc || 'General Item';

  return {
    description,
    quantity: Math.max(1, quantity),
    unit,
    rate: Math.max(0, rate),
    gstPercent,
    hsn,
    partyName: partyName.trim(),
  };
}

/**
 * Primary Natural Language Intent Classifier & Command Router
 * 
 * Returns: {
 *   intent: string,
 *   action: string,
 *   payload: object,
 *   voiceFeedback: string
 * }
 */
export function classifyVoiceCommand(rawTranscript) {
  const text = normalizeTranscript(rawTranscript).toLowerCase();

  if (!text) {
    return {
      intent: 'UNKNOWN',
      action: null,
      voiceFeedback: "I couldn't hear that clearly. Could you please repeat?",
    };
  }

  // -------------------------------------------------------------
  // 1. NAVIGATION INTENTS
  // -------------------------------------------------------------
  if (/^(?:go to|open|show|navigate to|view|load)\s+(?:the\s+)?dashboard/i.test(text) || text === 'dashboard') {
    return {
      intent: 'NAVIGATE',
      action: 'NAVIGATE_PAGE',
      payload: { page: 'Dashboard' },
      voiceFeedback: 'Opening Executive Analytics Dashboard.',
    };
  }

  if (/^(?:go to|open|show|navigate to|view|load)\s+(?:the\s+)?(display|reports? center|reports? hub)/i.test(text) || text === 'display') {
    return {
      intent: 'NAVIGATE',
      action: 'NAVIGATE_PAGE',
      payload: { page: 'Display' },
      voiceFeedback: 'Opening Display and Financial Reports Center.',
    };
  }

  if (/^(?:go to|open|show|navigate to|view)\s+(?:the\s+)?(?:all\s+)?(?:invoices?|sales list|bills list)/i.test(text)) {
    return {
      intent: 'NAVIGATE',
      action: 'NAVIGATE_PAGE',
      payload: { page: 'List Sales' },
      voiceFeedback: 'Opening All Invoices Directory.',
    };
  }

  if (/^(?:go to|open|show|navigate to|view)\s+(?:the\s+)?(?:stock|inventory|products?|catalog)/i.test(text)) {
    return {
      intent: 'NAVIGATE',
      action: 'NAVIGATE_PAGE',
      payload: { page: 'List Items' },
      voiceFeedback: 'Opening Stock Inventory Management.',
    };
  }

  if (/^(?:go to|open|show|navigate to|view)\s+(?:the\s+)?(?:customers?|parties|party master|debtors?)/i.test(text)) {
    return {
      intent: 'NAVIGATE',
      action: 'NAVIGATE_PAGE',
      payload: { page: 'List Account' },
      voiceFeedback: 'Opening Customers & Accounts Directory.',
    };
  }

  if (/^(?:go to|open|show|navigate to|view|load)\s+(?:the\s+)?(?:file analyzer|analyze files?|smart file|file import(?:er)?|document ai|universal import(?:er)?)/i.test(text) || /\b(?:analyze file|import file)\b/i.test(text)) {
    return {
      intent: 'NAVIGATE',
      action: 'NAVIGATE_PAGE',
      payload: { page: 'Universal File AI' },
      voiceFeedback: 'Opening Universal AI File & Document Intelligence.',
    };
  }

  if (/^(?:go to|open|show|navigate to|view)\s+(?:the\s+)?(?:gst|gstr|gstr-?1|gstr-?2b|gstr-?3b)/i.test(text)) {
    return {
      intent: 'NAVIGATE',
      action: 'NAVIGATE_PAGE',
      payload: { page: 'GST Reports' },
      voiceFeedback: 'Opening GST Returns & Compliance Hub.',
    };
  }

  if (/^(?:go to|open|show|navigate to|view)\s+(?:the\s+)?(?:trial balance)/i.test(text)) {
    return {
      intent: 'NAVIGATE',
      action: 'NAVIGATE_PAGE',
      payload: { page: 'Trial Balance' },
      voiceFeedback: 'Opening Trial Balance Statement.',
    };
  }

  if (/^(?:go to|open|show|navigate to|view)\s+(?:the\s+)?(?:balance sheet)/i.test(text)) {
    return {
      intent: 'NAVIGATE',
      action: 'NAVIGATE_PAGE',
      payload: { page: 'Final Results' },
      voiceFeedback: 'Opening Balance Sheet and Final Results.',
    };
  }

  if (/^(?:go to|open|show|navigate to|view)\s+(?:the\s+)?(?:outstanding|overdue|receivables?|debtors? balance)/i.test(text)) {
    return {
      intent: 'NAVIGATE',
      action: 'NAVIGATE_PAGE',
      payload: { page: 'Outstanding Analysis' },
      voiceFeedback: 'Opening Outstanding Analysis & Recovery Report.',
    };
  }

  // -------------------------------------------------------------
  // 2. INVOICE CREATION & LINE ITEM BILLING INTENTS
  // -------------------------------------------------------------
  // e.g. "Bill 5 wireless mouse to Ramesh at 400 with 18% GST"
  // e.g. "Add 10 pieces LED bulb rate 120"
  // e.g. "Create invoice for Sharma Electronics"
  if (
    /^(?:bill|add item|add product|create invoice|new bill|make bill|sell)\b/i.test(text) ||
    /\b(?:rate|price|pcs|pieces?|box|kgs?|gst)\b/i.test(text) && /\d+/.test(text)
  ) {
    const parsed = parseItemFromVoice(text);

    return {
      intent: 'ADD_INVOICE_ITEM',
      action: 'ADD_ITEM_TO_INVOICE',
      payload: parsed,
      voiceFeedback: parsed.rate > 0
        ? `Added ${parsed.quantity} ${parsed.unit} of ${parsed.description} at ₹${parsed.rate} with ${parsed.gstPercent}% GST${parsed.partyName ? ` for ${parsed.partyName}` : ''}.`
        : `Added ${parsed.quantity} ${parsed.unit} of ${parsed.description} to invoice.`,
    };
  }

  // -------------------------------------------------------------
  // 3. INVOICE CONTROLS (Save, Clear, Print, PDF)
  // -------------------------------------------------------------
  if (/\b(?:save|submit|finish|done|record)\s+(?:this\s+)?(?:invoice|bill)\b/i.test(text)) {
    return {
      intent: 'INVOICE_CONTROL',
      action: 'SAVE_INVOICE',
      payload: {},
      voiceFeedback: 'Saving invoice to database.',
    };
  }

  if (/\b(?:clear|reset|cancel|empty|new)\s+(?:this\s+)?(?:invoice|bill|draft)\b/i.test(text)) {
    return {
      intent: 'INVOICE_CONTROL',
      action: 'RESET_INVOICE',
      payload: {},
      voiceFeedback: 'Cleared invoice draft. Ready for fresh billing.',
    };
  }

  if (/\b(?:print|download pdf|download invoice|export pdf)\b/i.test(text)) {
    return {
      intent: 'INVOICE_CONTROL',
      action: 'PRINT_INVOICE',
      payload: {},
      voiceFeedback: 'Preparing high-resolution GST tax invoice printout.',
    };
  }

  // -------------------------------------------------------------
  // 4. PARTY / CUSTOMER QUICK REGISTRATION
  // -------------------------------------------------------------
  // e.g. "Add party Raj Electricals phone 9876543210 address Delhi gstin 07AAAAA0000A1Z5"
  if (/\b(?:add|create|new)\s+(?:party|customer|vendor|client|account)\b/i.test(text)) {
    const clean = text.replace(/^(?:add|create|new)\s+(?:party|customer|vendor|client|account)\s+/i, '');
    const phoneMatch = clean.match(/(?:phone|mobile|tel|number)\s*(\d{10})/i);
    const gstinMatch = clean.match(/(?:gstin|gst)\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i);
    const addressMatch = clean.match(/(?:address|city|location)\s+([a-zA-Z0-9\s,.-]+?)(?:\s+(?:phone|gstin|mobile)|$)/i);

    let name = clean
      .replace(/(?:phone|mobile|tel|number)\s*\d+/gi, '')
      .replace(/(?:gstin|gst)\s*[0-9a-zA-Z]+/gi, '')
      .replace(/(?:address|city|location)\s+[a-zA-Z0-9\s,.-]+/gi, '')
      .trim();

    return {
      intent: 'ADD_PARTY',
      action: 'ADD_CUSTOMER',
      payload: {
        name: name || 'New Party',
        phone: phoneMatch ? phoneMatch[1] : '',
        gstin: gstinMatch ? gstinMatch[1].toUpperCase() : '',
        address: addressMatch ? addressMatch[1].trim() : '',
      },
      voiceFeedback: `Registering party ${name || 'Customer'} to your directory.`,
    };
  }

  // -------------------------------------------------------------
  // 5. STOCK / INVENTORY MANAGEMENT INTENTS
  // -------------------------------------------------------------
  // e.g. "Add stock 20W Fast Charger price 299 hsn 8504 gst 18% stock 50"
  if (/\b(?:add|create|new)\s+(?:stock|product|item|sku)\b/i.test(text)) {
    const parsed = parseItemFromVoice(text);
    return {
      intent: 'ADD_STOCK',
      action: 'ADD_STOCK_ITEM',
      payload: {
        name: parsed.description,
        rate: parsed.rate,
        stock: parsed.quantity || 10,
        unit: parsed.unit,
        gst: parsed.gstPercent,
        hsn: parsed.hsn,
      },
      voiceFeedback: `Adding product "${parsed.description}" at ₹${parsed.rate} with opening stock of ${parsed.quantity} units.`,
    };
  }

  // -------------------------------------------------------------
  // 6. CLOUD & SYSTEM ACTIONS
  // -------------------------------------------------------------
  if (/\b(?:sync|cloud sync|synchronize|backup)\b/i.test(text)) {
    return {
      intent: 'SYSTEM',
      action: 'TRIGGER_CLOUD_SYNC',
      payload: {},
      voiceFeedback: 'Initiating on-demand encrypted cloud synchronization.',
    };
  }

  // Default: conversational query for AI Copilot
  return {
    intent: 'AI_CHAT_QUERY',
    action: 'QUERY_AI',
    payload: { query: rawTranscript },
    voiceFeedback: `Analyzing query: "${rawTranscript}"`,
  };
}
