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
export function parseNaturalLanguageAction(prompt) {
  const text = prompt.trim();
  const lower = text.toLowerCase();

  // 1. Detect Invoicing Intent
  // E.g. "Bill 10 pcs LED bulb at 150 each to Sharma Traders"
  // E.g. "Create invoice for Ramesh: 5 mouse at 400, 18% gst"
  if (
    lower.includes('bill') ||
    lower.includes('invoice') ||
    lower.includes('challan') ||
    lower.includes('sale')
  ) {
    const custMatch = text.match(/(?:to|for)\s+([A-Za-z0-9\s&.-]+?)(?::|,|\s+at|\s+with|\s+for|\s+\d|$)/i);
    const customerName = custMatch ? custMatch[1].trim() : 'Walk-in Customer';

    // Extract item candidate
    const qtyMatch = text.match(/(\d+)\s*(?:pcs|pieces|nos|boxes|units|pkt)?/i);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

    const rateMatch = text.match(/(?:at|@|rs\.?|inr|price)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:each|per|\/)?/i);
    const rate = rateMatch ? parseFloat(rateMatch[1]) : 100;

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

    // Try extracting specific item name between qty and rate
    const itemRegex = /(?:pcs|pieces|nos|boxes|units|bill|invoice)\s+(?:of\s+)?([A-Za-z0-9\s-]+?)(?:\s+(?:at|@|for|to|rs|inr|\d+%)|$)/i;
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

  // 2. Detect Customer Addition Intent
  // E.g. "Add customer Sharma Electronics phone 9876543210 gstin 07AAAAA0000A1Z5"
  if (lower.includes('add customer') || lower.includes('add party') || lower.includes('add vendor')) {
    const phoneMatch = text.match(/(?:phone|mobile|call)?\s*(\d{10})/i);
    const gstinMatch = text.match(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i);
    const nameMatch = text.match(/add (?:customer|party|vendor)\s+([A-Za-z0-9\s&.-]+?)(?:\s+(?:phone|mobile|gstin|with|\d{10})|$)/i);

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

  // 3. Detect Stock Item Addition Intent
  // E.g. "Add stock item 20W LED Bulb price 250 hsn 8539 gst 18% stock 100"
  if (lower.includes('add item') || lower.includes('add stock') || lower.includes('add product')) {
    const priceMatch = text.match(/(?:price|rate|at|rs)\s*([0-9]+(?:\.[0-9]+)?)/i);
    const hsnMatch = text.match(/(?:hsn|code)\s*(\d{4,8})/i);
    const stockMatch = text.match(/(?:stock|qty|quantity)\s*(\d+)/i);
    const gstMatch = text.match(/(\d+)\s*%/);
    const nameMatch = text.match(/add (?:item|stock|product)\s+([A-Za-z0-9\s&.-]+?)(?:\s+(?:price|rate|hsn|gst|stock|\d+)|\b)/i);

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
  const action = parseNaturalLanguageAction(prompt);

  // 1. Action detected (Invoice / Customer / Stock creation)
  if (action) {
    if (action.type === 'CREATE_INVOICE') {
      const it = action.payload.items[0];
      const subtotal = it.quantity * it.rate;
      const gst = (subtotal * it.gstPercent) / 100;
      const total = subtotal + gst;
      return {
        reply: `I have prepared an invoice draft for **${action.payload.customerName}** with **${it.quantity}x ${it.description}** at ₹${it.rate} each (+${it.gstPercent}% GST). Total Amount: **₹${total.toFixed(2)}**.\n\nClick the button below to instantly load it into your Invoice Editor.`,
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
    reply: `👋 Hello! I am **Tread AI Copilot**, your intelligent assistant for GST billing, inventory management, and business analytics.\n\n` +
      `Here is what you can ask me to do:\n` +
      `1. **Create an invoice**: *"Bill 5 LED bulbs at 120 each to Sharma Traders"*\n` +
      `2. **Add a customer**: *"Add customer Anita Mills phone 9876543210 gstin 27ABCDE1234F1Z5"*\n` +
      `3. **Add stock item**: *"Add item USB-C Cable price 150 hsn 8504 gst 18% stock 50"*\n` +
      `4. **Check taxes & HSN**: *"What is the HSN code and GST rate for solar panels?"*\n` +
      `5. **Business overview**: *"Summarize my total sales and revenue"*\n` +
      `6. **Stock check**: *"Which items are running low on stock?"*`,
  };
}

/**
 * Query Ollama Local LLM (e.g. Qwen2.5-7B, Llama3.2)
 */
async function queryOllama(prompt, context, config) {
  const cleanUrl = (config.ollamaUrl || 'http://localhost:11434').replace(/\/+$/, '');
  const endpoint = `${cleanUrl}/api/chat`;

  const topItems = (context?.stockItems || [])
    .slice(0, 15)
    .map((s) => `${s.name} (Rate: ₹${s.price}, Stock: ${s.stock}, GST: ${s.gst}%)`)
    .join('; ');

  const systemPrompt = `You are Tread AI Copilot, an expert Indian GST billing, accounting, and ERP assistant powered by Ollama.
Current Company: "${context?.company?.name || 'Tread Business'}" (GSTIN: "${context?.company?.gstin || 'None'}", State: "${context?.company?.state || ''}").
Available Catalog Items: ${topItems || 'None yet registered'}.
Total Invoices Invoiced: ${context?.invoices?.length || 0}.
Total Parties Registered: ${context?.customers?.length || 0}.

Instructions:
1. When asked to bill or create an invoice, clearly state the customer name, item descriptions, quantities, rates, and GST percentage so the user can review it.
2. Provide concise, expert answers regarding Indian GST tax laws (CGST, SGST, IGST, HSN codes, GSTR-1, GSTR-3B, GSTR-2B, E-Way bills, Input Tax Credit ITC).
3. Use clean markdown formatting (bullet points, bold text) for readability.`;

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
  const action = parseNaturalLanguageAction(prompt);

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

  const systemInstruction = `You are Tread AI Copilot, an expert Indian GST accounting and billing assistant for Tread ERP.
Business: ${context?.company?.name || 'Tread Business'} (GSTIN: ${context?.company?.gstin || 'None'}).
Total Invoices: ${context?.invoices?.length || 0}, Customers: ${context?.customers?.length || 0}, Stock: ${context?.stockItems?.length || 0}.
Respond concisely with helpful guidance on GST, invoicing, party details, and stock calculations.`;

  const payload = {
    contents: [
      {
        parts: [
          { text: `${systemInstruction}\n\nUser Question: ${prompt}` },
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
  const action = parseNaturalLanguageAction(prompt);

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
          ? `⚠️ **Browser Mixed-Content Block**: You are on HTTPS (\`https://tread-8f7a2.web.app\`). Web browsers strictly block HTTPS websites from talking to insecure \`http://localhost:11434\`.\n\n` +
            `> **How to use Ollama with Tread**:\n` +
            `> 1. **Run locally on your PC (Recommended)**: Run \`npm run dev\` and open \`http://localhost:5173\`. On HTTP, your browser talks to Ollama without any mixed-content restrictions!\n` +
            `> 2. **Or use an HTTPS Tunnel**: Run \`ngrok http 11434\` and paste the \`https://....ngrok-free.app\` URL into Tread AI ⚙️ Settings.\n` +
            `> 3. **Or use Built-in Engine**: Click **⚙️ Settings** and select **⚡ Built-in Offline Engine** for instant responses without needing Ollama.\n\n`
          : `⚠️ **Ollama is not running on your computer** (${err.message}):\n\n` +
            `> **To start Ollama**:\n` +
            `> 1. Download & install from **[ollama.com](https://ollama.com)** if not already installed.\n` +
            `> 2. Open PowerShell/Terminal and run: \`ollama run ${config.ollamaModel || 'qwen2.5:7b'}\`\n` +
            `> 3. Set origin: \`$env:OLLAMA_ORIGINS="*"; ollama serve\`\n\n`;

      return {
        ...fallback,
        reply: explanation + `*(Fell back to Built-in Engine below so your task still succeeds)*\n\n---\n\n` + fallback.reply,
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
