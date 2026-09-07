/**
 * Tread AI Service
 * Supports 3 intelligent engines:
 * 1. Built-in Offline Business & GST Rules Intelligence (Default - zero setup, works everywhere)
 * 2. Ollama Local LLM (Qwen 2.5 / Llama / Custom Models via http://localhost:11434)
 * 3. Google Gemini Cloud API (Ultra-fast cloud reasoning)
 */

export const AI_PROVIDERS = {
  BUILTIN: 'builtin',
  OLLAMA: 'ollama',
  GEMINI: 'gemini',
};

export const DEFAULT_AI_CONFIG = {
  provider: AI_PROVIDERS.OLLAMA,
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'qwen2.5:7b',
  geminiApiKey: '',
  geminiModel: 'gemini-1.5-flash',
};

export function getAiConfig() {
  if (typeof window === 'undefined') return DEFAULT_AI_CONFIG;
  try {
    const saved = window.localStorage.getItem('tread-ai-config');
    if (!saved) return DEFAULT_AI_CONFIG;
    const parsed = JSON.parse(saved);
    return {
      ...DEFAULT_AI_CONFIG,
      ...parsed,
      provider: parsed.provider || AI_PROVIDERS.OLLAMA,
    };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

export function saveAiConfig(cfg) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('tread-ai-config', JSON.stringify(cfg));
}

/**
 * Fetch list of installed models from local Ollama instance
 */
export async function fetchOllamaModels(url = 'http://localhost:11434') {
  try {
    const cleanUrl = url.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/api/tags`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.models || []).map((m) => m.name);
  } catch {
    return [];
  }
}

/**
 * Test connectivity to local Ollama instance
 */
export async function testOllamaConnection(url = 'http://localhost:11434') {
  try {
    const cleanUrl = url.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/api/version`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { success: true, version: data.version || 'Connected' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Built-in Indian GST & HSN Reference Data for Offline AI
const GST_KNOWLEDGE = [
  { keywords: ['led', 'bulb', 'light', 'lamp'], hsn: '8539', gst: 18, desc: 'Electric lamps, LED bulbs & fixtures' },
  { keywords: ['computer', 'laptop', 'mouse', 'keyboard', 'printer'], hsn: '8471', gst: 18, desc: 'Automatic data processing machines & IT peripherals' },
  { keywords: ['mobile', 'phone', 'smartphone'], hsn: '8517', gst: 18, desc: 'Telephone sets, smartphones & transmission devices' },
  { keywords: ['charger', 'adapter', 'cable', 'wire', 'usb'], hsn: '8504', gst: 18, desc: 'Electrical transformers, static converters & chargers' },
  { keywords: ['solar', 'panel'], hsn: '8541', gst: 12, desc: 'Solar cells & modules' },
  { keywords: ['footwear', 'shoe', 'sandal', 'slipper'], hsn: '6403', gst: 12, desc: 'Footwear with outer soles of rubber or leather' },
  { keywords: ['garment', 'shirt', 'cloth', 'fabric', 'cotton', 'pant'], hsn: '6203', gst: 5, desc: 'Textile fabrics & readymade garments' },
  { keywords: ['cement'], hsn: '2523', gst: 28, desc: 'Portland cement, aluminous cement' },
  { keywords: ['steel', 'iron', 'rod', 'pipe'], hsn: '7214', gst: 18, desc: 'Bars and rods of iron or non-alloy steel' },
  { keywords: ['paint', 'varnish'], hsn: '3208', gst: 28, desc: 'Paints and varnishes based on synthetic polymers' },
  { keywords: ['stationery', 'paper', 'notebook'], hsn: '4820', gst: 12, desc: 'Registers, notebooks, paper stationery' },
  { keywords: ['software', 'cloud', 'hosting', 'consulting', 'service'], hsn: '9983', gst: 18, desc: 'Information technology and consulting services' },
];

/**
 * Parses user input to see if they want to create an invoice, add customer, or query data.
 */
/**
 * Parses user input into rich structured application actions.
 * Covers navigation, invoicing, parties, stock, purchases, GST hub, reports, and sync.
 * Resilient to English, Hindi, and Hinglish.
 */
export function parseNaturalLanguageAction(prompt, context = {}) {
  if (!prompt || typeof prompt !== 'string') return null;
  const text = prompt.trim();
  const lower = text.toLowerCase();

  // -------------------------------------------------------------
  // 1. NAVIGATION & SCREEN CONTROL ACTIONS
  // -------------------------------------------------------------
  // Dashboard
  if (
    lower === 'dashboard' ||
    lower.includes('go to dashboard') ||
    lower.includes('open dashboard') ||
    lower.includes('show dashboard') ||
    lower.includes('dashboard kholo') ||
    lower.includes('dashboard dikhao')
  ) {
    return { type: 'NAVIGATE', payload: { page: 'Dashboard', label: 'Analytics Dashboard' } };
  }

  // Add Sales / New Invoice
  if (
    lower === 'new invoice' ||
    lower === 'add sales' ||
    lower.includes('open new invoice') ||
    lower.includes('go to add sales') ||
    lower.includes('create invoice page') ||
    lower.includes('naya invoice') ||
    lower.includes('bill banaye')
  ) {
    return { type: 'NAVIGATE', payload: { page: 'Add Sales', label: 'Create Invoice / Sales Editor' } };
  }

  // Invoices List / Sales Register
  if (
    lower.includes('list sales') ||
    lower.includes('all sales') ||
    lower.includes('all invoices') ||
    lower.includes('show invoices') ||
    lower.includes('invoice list') ||
    lower.includes('sales register') ||
    lower.includes('saare bill dikhao') ||
    lower.includes('bills list')
  ) {
    return { type: 'NAVIGATE', payload: { page: 'List Sales', label: 'Sales & Invoice Register' } };
  }

  // Purchases / Purchase Bills
  if (
    lower.includes('add purchase') ||
    lower.includes('purchase bill') ||
    lower.includes('record purchase') ||
    lower.includes('purchase entry') ||
    lower.includes('kharid bill')
  ) {
    return { type: 'NAVIGATE', payload: { page: 'Add Purchase', label: 'Purchase Bill Entry' } };
  }
  if (
    lower.includes('list purchase') ||
    lower.includes('purchase register') ||
    lower.includes('all purchases') ||
    lower.includes('purchase history')
  ) {
    return { type: 'NAVIGATE', payload: { page: 'List Purchase', label: 'Purchase Register' } };
  }

  // Customers / Parties
  if (
    lower.includes('open customer') ||
    lower.includes('show customer') ||
    lower.includes('customer list') ||
    lower.includes('list account') ||
    lower.includes('all parties') ||
    lower.includes('party directory') ||
    lower.includes('party list') ||
    lower.includes('grahak list')
  ) {
    return { type: 'NAVIGATE', payload: { page: 'List Account', label: 'Customers & Parties Directory' } };
  }

  // Stock / Inventory
  if (
    lower === 'stock' ||
    lower === 'inventory' ||
    lower.includes('show stock') ||
    lower.includes('open inventory') ||
    lower.includes('inventory list') ||
    lower.includes('list items') ||
    lower.includes('all stock') ||
    lower.includes('stock dikhao')
  ) {
    return { type: 'NAVIGATE', payload: { page: 'List Items', label: 'Stock & Inventory Master' } };
  }

  // Master Item Catalog & API
  if (
    lower.includes('master catalog') ||
    lower.includes('master item') ||
    lower.includes('catalog api') ||
    lower.includes('item api')
  ) {
    return { type: 'NAVIGATE', payload: { page: 'Master Item Catalog', label: 'Master Item Catalog & API' } };
  }

  // GST Hub & GST Returns
  if (lower.includes('gstr-1') || lower.includes('gstr 1') || lower.includes('sales return')) {
    return { type: 'NAVIGATE', payload: { page: 'GSTR-1 (Sales Outward)', label: 'GSTR-1 Outward Return' } };
  }
  if (lower.includes('gstr-2b') || lower.includes('gstr 2b') || lower.includes('itc reconcile')) {
    return { type: 'NAVIGATE', payload: { page: 'GSTR-2B (ITC Reconcile)', label: 'GSTR-2B ITC Reconciliation' } };
  }
  if (lower.includes('gstr-3b') || lower.includes('gstr 3b') || lower.includes('tax return summary')) {
    return { type: 'NAVIGATE', payload: { page: 'GSTR-3B Return Summary', label: 'GSTR-3B Tax Return Summary' } };
  }
  if (lower.includes('gst hub') || lower.includes('gst portal') || lower === 'gst') {
    return { type: 'NAVIGATE', payload: { page: 'GST', label: 'GST Compliance Hub' } };
  }

  // Reports
  if (
    lower.includes('report') ||
    lower.includes('sales report') ||
    lower.includes('tax report') ||
    lower.includes('open report')
  ) {
    return { type: 'NAVIGATE', payload: { page: 'Reports', label: 'Business Reports & Analytics' } };
  }

  // Backup & Housekeeping
  if (
    lower.includes('backup') ||
    lower.includes('data restore') ||
    lower.includes('housekeeping') ||
    lower.includes('database maintenance') ||
    lower.includes('export data')
  ) {
    return { type: 'NAVIGATE', payload: { page: 'House-Keeping', label: 'Data Backup & House-Keeping' } };
  }

  // Company Profile
  if (
    lower.includes('company profile') ||
    lower.includes('company detail') ||
    lower.includes('edit company') ||
    lower.includes('my company')
  ) {
    return { type: 'NAVIGATE', payload: { page: 'Company Details', label: 'Company Profile' } };
  }

  // Settings & Permissions
  if (lower.includes('open settings') || lower.includes('app settings') || lower === 'settings') {
    return { type: 'NAVIGATE', payload: { page: 'Settings', label: 'Application Settings' } };
  }
  if (
    lower.includes('permission') ||
    lower.includes('device access') ||
    lower.includes('mic access') ||
    lower.includes('security control')
  ) {
    return { type: 'OPEN_APP_ACCESS', payload: { label: 'Device & Mic Permissions' } };
  }

  // Cloud Sync Intent
  if (
    lower.includes('sync') ||
    lower.includes('cloud sync') ||
    lower.includes('sync data') ||
    lower.includes('pull from cloud') ||
    lower.includes('push to cloud')
  ) {
    return { type: 'TRIGGER_CLOUD_SYNC', payload: { label: 'Cloud Firestore Sync' } };
  }

  // -------------------------------------------------------------
  // 2. INVOICING / BILLING INTENT
  // E.g. "Bill 10 pcs LED bulb at 150 each to Sharma Traders"
  // E.g. "Sharma Traders ko 5 mouse 400 me bill karo"
  // -------------------------------------------------------------
  if (
    lower.includes('bill') ||
    lower.includes('invoice') ||
    lower.includes('challan') ||
    lower.includes('sale') ||
    lower.includes('becho') ||
    lower.includes('karo bill')
  ) {
    // Extract customer candidate
    let customerName = 'Walk-in Customer';
    const custMatchEng = text.match(/(?:to|for)\s+([A-Za-z0-9\s&.-]+?)(?::|,|\s+at|\s+with|\s+for|\s+rate|\s+\d|$)/i);
    const custMatchHin = text.match(/([A-Za-z0-9\s&.-]+?)\s+ko\b/i);

    if (custMatchEng && custMatchEng[1].trim().length > 1) {
      customerName = custMatchEng[1].trim();
    } else if (custMatchHin && custMatchHin[1].trim().length > 1) {
      customerName = custMatchHin[1].trim();
    }

    // Try matching against existing registered customers in context
    if (Array.isArray(context.customers) && context.customers.length > 0) {
      const matchExisting = context.customers.find((c) =>
        lower.includes(c.name.toLowerCase())
      );
      if (matchExisting) {
        customerName = matchExisting.name;
      }
    }

    // Extract quantity candidate
    const qtyMatch = text.match(/(\d+)\s*(?:pcs|pieces|nos|boxes|units|pkt|piece|nug)?/i);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

    // Extract rate candidate
    const rateMatch = text.match(/(?:at|@|rs\.?|inr|rate|price|me|pe)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:each|per|\/|ka|me|pe)?/i);
    let rate = rateMatch ? parseFloat(rateMatch[1]) : 100;
    if (rate === quantity && text.includes('@')) {
      const atMatch = text.match(/@\s*([0-9]+(?:\.[0-9]+)?)/);
      if (atMatch) rate = parseFloat(atMatch[1]);
    }

    // Extract GST tax percentage
    const gstMatch = text.match(/(\d+)\s*%/);
    let gstPercent = gstMatch ? parseInt(gstMatch[1], 10) : 18;

    // Detect item description
    let description = 'Goods / Service';
    for (const item of GST_KNOWLEDGE) {
      if (item.keywords.some((k) => lower.includes(k))) {
        description = item.desc.split(',')[0];
        gstPercent = item.gst;
        break;
      }
    }

    // Try matching against registered stock items in context
    if (Array.isArray(context.stockItems) && context.stockItems.length > 0) {
      const stockMatch = context.stockItems.find((s) =>
        lower.includes(s.name.toLowerCase())
      );
      if (stockMatch) {
        description = stockMatch.name;
        if (stockMatch.price) rate = Number(stockMatch.price);
        if (stockMatch.gst) gstPercent = Number(stockMatch.gst);
      }
    }

    // Extract explicit item name between keywords
    const itemRegex = /(?:pcs|pieces|nos|boxes|units|bill|invoice)\s+(?:of\s+)?([A-Za-z0-9\s-]+?)(?:\s+(?:at|@|for|to|rs|inr|rate|\d+%)|$)/i;
    const descMatch = text.match(itemRegex);
    if (descMatch && descMatch[1].trim().length > 2) {
      description = descMatch[1].trim();
    }

    return {
      type: 'CREATE_INVOICE',
      payload: {
        customerName,
        items: [
          {
            description,
            quantity,
            rate,
            gstPercent,
          },
        ],
      },
    };
  }

  // -------------------------------------------------------------
  // 3. CUSTOMER / PARTY ADDITION INTENT
  // E.g. "Add customer Sharma Electronics phone 9876543210 gstin 07AAAAA0000A1Z5"
  // E.g. "Add party Anita Traders mobile 9988776655"
  // -------------------------------------------------------------
  if (
    lower.includes('add customer') ||
    lower.includes('add party') ||
    lower.includes('add vendor') ||
    lower.includes('new customer') ||
    lower.includes('new party') ||
    lower.includes('customer jodo')
  ) {
    const phoneMatch = text.match(/(?:phone|mobile|call)?\s*([6-9]\d{9})/i);
    const gstinMatch = text.match(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i);
    const nameMatch = text.match(/(?:add|new)\s+(?:customer|party|vendor)\s+([A-Za-z0-9\s&.-]+?)(?:\s+(?:phone|mobile|gstin|with|\d{10})|$)/i);

    return {
      type: 'ADD_CUSTOMER',
      payload: {
        name: nameMatch ? nameMatch[1].trim() : 'New Customer',
        phone: phoneMatch ? phoneMatch[1] : '',
        gstin: gstinMatch ? gstinMatch[1].toUpperCase() : '',
        type: lower.includes('vendor') ? 'Vendor' : 'Customer',
      },
    };
  }

  // -------------------------------------------------------------
  // 4. STOCK ITEM ADDITION INTENT
  // E.g. "Add stock item 20W LED Bulb price 250 hsn 8539 gst 18% stock 100"
  // -------------------------------------------------------------
  if (
    lower.includes('add item') ||
    lower.includes('add stock') ||
    lower.includes('add product') ||
    lower.includes('new stock') ||
    lower.includes('item jodo')
  ) {
    const priceMatch = text.match(/(?:price|rate|at|rs)\s*([0-9]+(?:\.[0-9]+)?)/i);
    const hsnMatch = text.match(/(?:hsn|code)\s*(\d{4,8})/i);
    const stockMatch = text.match(/(?:stock|qty|quantity)\s*(\d+)/i);
    const gstMatch = text.match(/(\d+)\s*%/);
    const nameMatch = text.match(/(?:add|new)\s+(?:item|stock|product)\s+([A-Za-z0-9\s&.-]+?)(?:\s+(?:price|rate|hsn|gst|stock|\d+)|\b)/i);

    return {
      type: 'ADD_STOCK',
      payload: {
        name: nameMatch ? nameMatch[1].trim() : 'New Item',
        price: priceMatch ? parseFloat(priceMatch[1]) : 100,
        hsn: hsnMatch ? hsnMatch[1] : '8504',
        gst: gstMatch ? gstMatch[1] : '18',
        stock: stockMatch ? parseInt(stockMatch[1], 10) : 10,
        unit: 'PCS',
      },
    };
  }

  return null;
}

/**
 * Built-in Offline Intelligence Response Generator
 */
export function generateBuiltinResponse(prompt, context) {
  const lower = prompt.toLowerCase();
  const action = parseNaturalLanguageAction(prompt, context);

  // 1. Action detected (Invoice / Customer / Stock creation / Navigation / Sync)
  if (action) {
    if (action.type === 'NAVIGATE') {
      return {
        reply: `Opening **${action.payload.label}** for you now.`,
        action,
      };
    }

    if (action.type === 'TRIGGER_CLOUD_SYNC') {
      return {
        reply: `Initiating **Cloud Firestore Sync** to synchronize your invoices, parties, and stock across your devices.`,
        action,
      };
    }

    if (action.type === 'OPEN_APP_ACCESS') {
      return {
        reply: `Opening **Device Access & Microphone Permissions** dialog.`,
        action,
      };
    }

    if (action.type === 'CREATE_INVOICE') {
      const it = action.payload.items[0];
      const subtotal = it.quantity * it.rate;
      const gst = (subtotal * it.gstPercent) / 100;
      const total = subtotal + gst;
      return {
        reply: `I have prepared an invoice draft for **${action.payload.customerName}** with **${it.quantity}x ${it.description}** at ₹${it.rate} each (+${it.gstPercent}% GST). Total Amount: **₹${total.toFixed(2)}**.\n\nClick below or say "Load" to open it in your Invoice Editor.`,
        action,
      };
    }

    if (action.type === 'ADD_CUSTOMER') {
      return {
        reply: `I've prepared the customer profile for **${action.payload.name}**${action.payload.gstin ? ` (GSTIN: \`${action.payload.gstin}\`)` : ''}${action.payload.phone ? ` (Phone: ${action.payload.phone})` : ''}.\n\nClick below to save this party to your directory.`,
        action,
      };
    }

    if (action.type === 'ADD_STOCK') {
      return {
        reply: `I've prepared the inventory entry for **${action.payload.name}** (Price: ₹${action.payload.price}, HSN: ${action.payload.hsn}, GST: ${action.payload.gst}%, Initial Stock: ${action.payload.stock} ${action.payload.unit}).\n\nClick below to add it to your Item Master.`,
        action,
      };
    }
  }

  // 2. Business Analytics & Health Check
  if (
    lower.includes('how much sale') ||
    lower.includes('total sale') ||
    lower.includes('revenue') ||
    lower.includes('turnover') ||
    lower.includes('performance') ||
    lower.includes('summary')
  ) {
    const invs = context?.invoices || [];
    const totalAmount = invs.reduce((sum, inv) => sum + (inv.totals?.total || 0), 0);
    const totalTax = invs.reduce((sum, inv) => sum + (inv.totals?.totalGst || 0), 0);
    const custCount = context?.customers?.length || 0;
    const itemCount = context?.stockItems?.length || 0;

    return {
      reply: `### 📊 Business Overview for ${context?.company?.name || 'Your Business'}\n\n` +
        `- **Total Sales Invoiced**: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
        `- **Total GST Collected**: ₹${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
        `- **Total Invoices Generated**: ${invs.length}\n` +
        `- **Registered Customers**: ${custCount}\n` +
        `- **Catalogued Stock Items**: ${itemCount}\n\n` +
        `Your accounts are up to date! Ask me if you'd like to inspect low stock items or file your GSTR-1 return summary.`,
    };
  }

  // 3. Low Stock / Inventory Check
  if (lower.includes('stock') || lower.includes('low stock') || lower.includes('inventory status')) {
    const stock = context?.stockItems || [];
    const lowStock = stock.filter((s) => Number(s.stock || 0) <= 5);

    if (lowStock.length === 0) {
      return {
        reply: `✅ All **${stock.length}** inventory items are adequately stocked above threshold levels! No items currently require immediate re-ordering.`,
      };
    }

    const itemsList = lowStock
      .map((s) => `- **${s.name}**: only **${s.stock || 0} ${s.unit || 'PCS'}** remaining (Price: ₹${s.price || 0})`)
      .join('\n');

    return {
      reply: `⚠️ **Low Stock Alert (${lowStock.length} items need attention)**:\n\n${itemsList}\n\nWould you like me to prepare a Purchase Bill for any of these items?`,
    };
  }

  // 4. GST & HSN Queries
  for (const item of GST_KNOWLEDGE) {
    if (item.keywords.some((k) => lower.includes(k))) {
      return {
        reply: `### 🏛️ GST Classification & Tax Slab\n\n` +
          `- **Category**: ${item.desc}\n` +
          `- **HSN Code**: \`${item.hsn}\`\n` +
          `- **Standard GST Rate**: **${item.gst}%** (Intra-state: ${item.gst / 2}% CGST + ${item.gst / 2}% SGST | Inter-state: ${item.gst}% IGST)\n\n` +
          `You can use this HSN code directly in your Tread invoices.`,
      };
    }
  }

  if (lower.includes('gstr-1') || lower.includes('gstr 1')) {
    return {
      reply: `**GSTR-1 (Outward Supplies Return)**:\n- **Filing Frequency**: Monthly (by 11th of succeeding month) or Quarterly under QRMP.\n- **Contents**: B2B taxable invoices, B2C large & small sales, export invoices, credit/debit notes, and HSN-wise summary.\n- You can export your GSTR-1 Excel/JSON anytime from the **GST Hub** section in Tread!`,
    };
  }

  if (lower.includes('gstr-2b') || lower.includes('gstr 2b') || lower.includes('itc')) {
    return {
      reply: `**GSTR-2B & Input Tax Credit (ITC)**:\n- GSTR-2B is an auto-drafted, static ITC statement generated on the 14th of every month.\n- Under Rule 36(4), ITC can only be claimed if the invoice is reflected in GSTR-2B.\n- You can import your GSTR-2B JSON/Excel directly in the **GST Hub** to auto-reconcile purchase bills.`,
    };
  }

  if (lower.includes('e-way bill') || lower.includes('eway')) {
    return {
      reply: `**E-Way Bill Thresholds**:\n- **Inter-state movement**: Mandatory for consignment value exceeding **₹50,000**.\n- **Intra-state movement**: Most states have a threshold of ₹50,000, with some states (like Delhi, Maharashtra) allowing up to ₹1,00,000 for intra-state transit.`,
    };
  }

  // Default Assistant Introduction
  return {
    reply: `👋 Hello! I am **Tread AI Copilot**, your intelligent voice-controlled ERP assistant.\n\n` +
      `Here is what you can ask me to do with your voice or text:\n` +
      `1. **Create an invoice**: *"Bill 5 LED bulbs at 120 each to Sharma Traders"*\n` +
      `2. **Navigate anywhere**: *"Go to dashboard"*, *"Open GSTR-1"*, *"Show customer list"*, *"Open stock"*\n` +
      `3. **Add a customer**: *"Add customer Anita Mills phone 9876543210 gstin 27ABCDE1234F1Z5"*\n` +
      `4. **Add stock item**: *"Add item USB-C Cable price 150 hsn 8504 gst 18% stock 50"*\n` +
      `5. **Check taxes & HSN**: *"What is the HSN code and GST rate for solar panels?"*\n` +
      `6. **Business overview**: *"Summarize my total sales and revenue"*\n` +
      `7. **Sync data**: *"Sync with cloud"*`,
  };
}

/**
 * Query Ollama Local LLM (e.g. Qwen 2.5, Llama 3, DeepSeek)
 * Advanced prompting with function dispatching and structured thoughts.
 */
async function queryOllama(prompt, context, config) {
  const cleanUrl = (config.ollamaUrl || 'http://localhost:11434').replace(/\/+$/, '');
  const endpoint = `${cleanUrl}/api/chat`;

  const topItems = (context?.stockItems || [])
    .slice(0, 15)
    .map((s) => `${s.name} (₹${s.price}, Stock: ${s.stock}, GST: ${s.gst}%)`)
    .join('; ');

  const topCustomers = (context?.customers || [])
    .slice(0, 15)
    .map((c) => `${c.name} (${c.type || 'Customer'})`)
    .join('; ');

  const systemPrompt = `You are Tread AI Copilot, an expert Indian GST billing, accounting, and voice-controlled ERP system assistant.
Current Company: "${context?.company?.name || 'Tread Business'}" (GSTIN: "${context?.company?.gstin || 'None'}", State: "${context?.company?.state || ''}").
Available Catalog Items: ${topItems || 'None yet registered'}.
Available Customers/Parties: ${topCustomers || 'None yet registered'}.
Total Invoices: ${context?.invoices?.length || 0}.

CAPABILITIES & DISPATCHING INSTRUCTIONS:
You can control each thing in the app using natural thought and voice recognition.
If the user's thought or command implies an action, formulate an action instruction:
1. Invoicing / Billing: When user wants to bill or sell (e.g. "Bill 5 LED bulbs at 120 each to Sharma"), state customer name, items, rates, quantities, and GST clearly.
2. Navigation: When user wants to open or go to any page ("Dashboard", "Add Sales", "List Sales", "Add Purchase", "List Purchase", "List Account", "List Items", "Master Item Catalog", "GSTR-1", "GSTR-2B", "GSTR-3B", "GST", "Reports", "House-Keeping", "Settings", "Device Access Control"), explain concisely that you are opening that screen.
3. Customer Management: Extract party name, phone, gstin.
4. Inventory Management: Check stock, report low items, add products.
5. Cloud Sync: Trigger Firestore synchronization.

IMPORTANT:
- Understand English, Hindi, and Hinglish thoughts naturally.
- Keep responses concise, clear, and professional. Use markdown formatting.`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ollamaModel || 'qwen2.5:7b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama server returned HTTP ${res.status}. Ensure model '${config.ollamaModel || 'qwen2.5:7b'}' is pulled and Ollama is active.`);
  }

  const data = await res.json();
  const text = data.message?.content || 'No response received from local Ollama model.';
  const action = parseNaturalLanguageAction(prompt, context);

  return {
    reply: text,
    action,
  };
}

/**
 * Query Google Gemini API
 */
async function queryGemini(prompt, context, config) {
  if (!config.geminiApiKey) {
    throw new Error('Google Gemini API key is missing. Please enter your API key in AI Settings.');
  }

  const model = config.geminiModel || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiApiKey}`;

  const systemInstruction = `You are Tread AI Copilot, an expert Indian GST accounting, billing, and voice ERP system assistant.
Business: ${context?.company?.name || 'Tread Business'} (GSTIN: ${context?.company?.gstin || 'None'}).
Total Invoices: ${context?.invoices?.length || 0}, Customers: ${context?.customers?.length || 0}, Stock: ${context?.stockItems?.length || 0}.
Respond concisely with helpful guidance on GST, invoicing, party details, navigation, and stock calculations.`;

  const payload = {
    contents: [
      {
        parts: [
          { text: `${systemInstruction}\n\nUser Question / Command: ${prompt}` },
        ],
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Gemini API request failed (HTTP ${res.status})`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received from Gemini.';
  const action = parseNaturalLanguageAction(prompt, context);

  return {
    reply: text,
    action,
  };
}

/**
 * Universal Unified AI Query Entrypoint
 */
export async function queryTreadAI(prompt, context = {}) {
  const config = getAiConfig();

  if (config.provider === AI_PROVIDERS.OLLAMA) {
    try {
      return await queryOllama(prompt, context, config);
    } catch (err) {
      console.warn('Ollama unavailable, falling back to built-in offline engine:', err.message);
      const fallback = generateBuiltinResponse(prompt, context);

      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const isLocalHttpOllama = (config.ollamaUrl || '').startsWith('http://localhost') || (config.ollamaUrl || '').startsWith('http://127.0.0.1');

      const explanation =
        isHttps && isLocalHttpOllama
          ? `⚠️ **Browser Mixed-Content Notice**: You are on HTTPS (\`https://tread-8f7a2.web.app\`). Web browsers block HTTPS pages from calling local insecure \`http://localhost:11434\`.\n\n` +
            `> **How to use Ollama with Tread**:\n` +
            `> 1. **Run locally on your PC (Recommended)**: Run \`npm run dev\` and open \`http://localhost:5173\` on HTTP where Ollama connects instantly!\n` +
            `> 2. **Or use an HTTPS Tunnel**: Run \`ngrok http 11434\` and paste the \`https://....ngrok-free.app\` URL into Tread AI ⚙️ Settings.\n` +
            `> 3. **Or use Built-in Engine**: Click **⚙️ Settings** and select **⚡ Built-in Offline Engine** for zero-setup offline responses.\n\n`
          : `⚠️ **Ollama is not running on your computer** (${err.message}):\n\n` +
            `> **To start Ollama**:\n` +
            `> 1. Download & install from **[ollama.com](https://ollama.com)**.\n` +
            `> 2. Open PowerShell/Terminal and run: \`ollama run ${config.ollamaModel || 'qwen2.5:7b'}\`\n` +
            `> 3. Set origin: \`$env:OLLAMA_ORIGINS="*"; ollama serve\`\n\n`;

      return {
        ...fallback,
        reply: explanation + `*(Fell back to Built-in Engine below so your command still succeeds)*\n\n---\n\n` + fallback.reply,
      };
    }
  }

  if (config.provider === AI_PROVIDERS.GEMINI) {
    try {
      return await queryGemini(prompt, context, config);
    } catch (err) {
      console.warn('Gemini query failed, falling back to built-in offline engine:', err.message);
      const fallback = generateBuiltinResponse(prompt, context);
      return {
        ...fallback,
        reply: `*(Cloud API Notice: ${err.message}. Falling back to Built-in Engine)*\n\n` + fallback.reply,
      };
    }
  }

  // Default: Built-in Offline Engine
  return generateBuiltinResponse(prompt, context);
}
