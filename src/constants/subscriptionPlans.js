/**
 * Tread ERP Subscription Plans & Feature Permissions Matrix
 *
 * Tiers:
 * 1. Starter (Rs 499/year) - Core Sales Invoicing, Accounts/Customers, Print & PDF, Local Encrypted Storage.
 * 2. Professional (Rs 999/year) - All Starter + Inventory & Low Stock Alerts, Purchase Bills, Sales Orders,
 *                              Purchase Orders, Payments In/Out, GST Hub (GSTR-1/2B/3B), Multi-Device Cloud Sync.
 * 3. Enterprise (Rs 1999/year) - All Professional + Multi-User Roles & Permissions, Device Access Control,
 *                              Master Item Catalog API, Audit & Financial Reports, WhatsApp/Email direct delivery.
 * 4. Master Admin - Full unrestricted access to everything.
 */

export const SUBSCRIPTION_TIERS = {
  STARTER: 'starter',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
};

export const PLANS_CONFIG = [
  {
    id: 'starter',
    name: 'Starter Plan',
    tierLevel: 1,
    price: 499,
    period: '/ year',
    badge: 'Basic',
    color: 'border-secondary',
    headerBg: 'bg-secondary text-white',
    description: 'Perfect for small retailers & individual proprietorships.',
    features: [
      'Up to 500 Invoices / Year',
      'Standard GST Tax Invoice Formats',
      'Customer & Party Directory (Accounts)',
      'Instant PDF Export & Print',
      'Local Secure Encrypted Storage',
    ],
  },
  {
    id: 'pro',
    name: 'Professional Plan',
    tierLevel: 2,
    price: 999,
    period: '/ year',
    popular: true,
    badge: 'Most Popular',
    color: 'border-primary',
    headerBg: 'bg-primary text-white',
    description: 'Best for growing businesses with stock inventory & GST filing.',
    features: [
      'Unlimited Tax Invoices',
      'Live Stock Inventory & Low-Stock Alerts',
      'Purchase Bills & Supplier Management',
      'Sales Orders & Purchase Orders (with 1-Click Convert)',
      'Payment Register (Receive & Pay Track)',
      'GSTR-1, GSTR-2B & GSTR-3B Return Filing & JSON Export',
      'Multi-Device Cloud Sync & Backup',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Suite',
    tierLevel: 3,
    price: 1999,
    period: '/ year',
    badge: 'Enterprise',
    color: 'border-dark',
    headerBg: 'bg-dark text-white',
    description: 'For wholesale distributors, multi-user teams & high-volume counters.',
    features: [
      'All Professional Features Included',
      'Multi-User Team Management & Role Permissions',
      'Device Access Control & Security Authorization',
      'Master Item Catalog & Developer API',
      'WhatsApp & Email Direct Document Sharing',
      'Comprehensive Financial & Tax Audit Reports',
      'Priority Cloud Backup & Dedicated Support',
    ],
  },
];

export const FEATURE_PERMISSIONS = {
  sales_invoicing: {
    name: 'Sales Invoicing',
    minTier: SUBSCRIPTION_TIERS.STARTER,
    minTierLevel: 1,
    description: 'Generate standard GST invoices, print, and download PDF.',
  },
  customers: {
    name: 'Customer & Party Directory',
    minTier: SUBSCRIPTION_TIERS.STARTER,
    minTierLevel: 1,
    description: 'Manage customers, vendors, and contact accounts.',
  },
  pdf_print: {
    name: 'PDF & Print Services',
    minTier: SUBSCRIPTION_TIERS.STARTER,
    minTierLevel: 1,
    description: 'Print invoices and download high-resolution GST PDFs.',
  },
  local_storage: {
    name: 'Local Encrypted Storage',
    minTier: SUBSCRIPTION_TIERS.STARTER,
    minTierLevel: 1,
    description: 'Secure offline-ready local invoice data storage.',
  },
  inventory_stock: {
    name: 'Stock Inventory Management',
    minTier: SUBSCRIPTION_TIERS.PRO,
    minTierLevel: 2,
    description: 'Real-time item stock tracking, batch numbers, and low stock notifications.',
  },
  purchase_bills: {
    name: 'Purchase Bills & Vendor Orders',
    minTier: SUBSCRIPTION_TIERS.PRO,
    minTierLevel: 2,
    description: 'Record inward purchases, calculate Input Tax Credit (ITC), and manage supplier bills.',
  },
  sales_orders: {
    name: 'Sales Orders',
    minTier: SUBSCRIPTION_TIERS.PRO,
    minTierLevel: 2,
    description: 'Draft sales bookings and convert directly to GST invoices in one click.',
  },
  purchase_orders: {
    name: 'Purchase Orders',
    minTier: SUBSCRIPTION_TIERS.PRO,
    minTierLevel: 2,
    description: 'Issue official purchase orders to vendors and convert directly to purchase bills.',
  },
  payments: {
    name: 'Payment & Receipts Register',
    minTier: SUBSCRIPTION_TIERS.PRO,
    minTierLevel: 2,
    description: 'Track receivables and payables across cash, bank, UPI, and cheques.',
  },
  gst_hub: {
    name: 'GST Filing Hub & Returns',
    minTier: SUBSCRIPTION_TIERS.PRO,
    minTierLevel: 2,
    description: 'GSTR-1 JSON export, GSTR-2B ITC reconciliation, and GSTR-3B tax summaries.',
  },
  cloud_sync: {
    name: 'Cross-Device Cloud Sync',
    minTier: SUBSCRIPTION_TIERS.PRO,
    minTierLevel: 2,
    description: 'Continuous real-time database sync across computers, phones, and tablets.',
  },
  user_management: {
    name: 'Multi-User Management & Team Roles',
    minTier: SUBSCRIPTION_TIERS.ENTERPRISE,
    minTierLevel: 3,
    description: 'Add team operators, assign granular permissions, and track active staff.',
  },
  device_access: {
    name: 'Device Access Control & Security',
    minTier: SUBSCRIPTION_TIERS.ENTERPRISE,
    minTierLevel: 3,
    description: 'Authorize specific mobile and desktop devices with passcodes and IP tracking.',
  },
  item_api: {
    name: 'Master Item Catalog & API',
    minTier: SUBSCRIPTION_TIERS.ENTERPRISE,
    minTierLevel: 3,
    description: 'Programmatic API access and nationwide master catalog database import.',
  },
  whatsapp_email_share: {
    name: 'Direct WhatsApp & Email Delivery',
    minTier: SUBSCRIPTION_TIERS.ENTERPRISE,
    minTierLevel: 3,
    description: 'Send invoices directly to clients via WhatsApp API and SMTP email.',
  },
  audit_reports: {
    name: 'Comprehensive Financial & Tax Audit',
    minTier: SUBSCRIPTION_TIERS.ENTERPRISE,
    minTierLevel: 3,
    description: 'In-depth chartered accountant audit trail and financial intelligence reports.',
  },
};

export function getUserPlanId(user) {
  if (!user) return SUBSCRIPTION_TIERS.STARTER;
  const username = (user.username || '').toLowerCase();
  if (username === 'admin') return SUBSCRIPTION_TIERS.ENTERPRISE;
  const raw = (user.subscription?.planId || '').toLowerCase().trim();
  if (raw === 'enterprise' || raw.includes('enterprise')) return SUBSCRIPTION_TIERS.ENTERPRISE;
  if (raw === 'pro' || raw.includes('pro') || raw.includes('professional')) return SUBSCRIPTION_TIERS.PRO;
  return SUBSCRIPTION_TIERS.STARTER;
}

export function getTierLevel(planId) {
  const normalized = (planId || '').toLowerCase();
  if (normalized === SUBSCRIPTION_TIERS.ENTERPRISE) return 3;
  if (normalized === SUBSCRIPTION_TIERS.PRO) return 2;
  return 1;
}

export function hasFeatureAccess(userOrPlanId, featureKey) {
  if (!userOrPlanId) return false;
  if (typeof userOrPlanId === 'object') {
    const uname = (userOrPlanId.username || '').toLowerCase();
    if (uname === 'admin' || userOrPlanId.role === 'Admin') return true;
  }
  const planId = typeof userOrPlanId === 'string' ? userOrPlanId : getUserPlanId(userOrPlanId);
  if (planId === 'admin') return true;
  const perm = FEATURE_PERMISSIONS[featureKey];
  if (!perm) return true;
  const currentLevel = getTierLevel(planId);
  return currentLevel >= perm.minTierLevel;
}

export function getRequiredPlanForFeature(featureKey) {
  const perm = FEATURE_PERMISSIONS[featureKey];
  if (!perm) return PLANS_CONFIG[0];
  return PLANS_CONFIG.find((p) => p.id === perm.minTier) || PLANS_CONFIG[1];
}

export function getPlanDetails(planId) {
  const normalized = (planId || '').toLowerCase();
  return PLANS_CONFIG.find((p) => p.id === normalized) || PLANS_CONFIG[0];
}

export function getNavBadgeForPage(pageName, subKey = '', menu = '') {
  const pageMap = {
    // Pro features
    'Add Stock Item': 'PRO',
    'Modify Item': 'PRO',
    'List Items': 'PRO',
    'Add Purchase': 'PRO',
    'Modify Purchase': 'PRO',
    'List Purchase': 'PRO',
    'Add Sales Order': 'PRO',
    'Modify Sales Order': 'PRO',
    'List Sales Orders': 'PRO',
    'Add Purchase Order': 'PRO',
    'Modify Purchase Order': 'PRO',
    'List Purchase Orders': 'PRO',
    'Add Payment': 'PRO',
    'Modify Payment': 'PRO',
    'List Payments': 'PRO',
    'GST': 'PRO',
    'GST File Importer (All Types)': 'PRO',
    'GSTR-1 (Sales Outward)': 'PRO',
    'GSTR-2B (ITC Reconcile)': 'PRO',
    'GSTR-3B Return Summary': 'PRO',
    'GSTIN & HSN Directory': 'PRO',
    'Master Item Catalog & API': 'ENT',
    'Users': 'ENT',
    'Device Access Control': 'ENT',
    'App Permissions & Access': 'ENT',
    'Roles & Permissions': 'ENT',
  };

  if (pageMap[pageName]) return pageMap[pageName];

  // Also check based on subKey (e.g., Transactions sub-sections)
  if (subKey === 'Sales Order' || subKey === 'Purchase' || subKey === 'Purchase Order' || subKey === 'Payment' || subKey === 'Items') {
    return 'PRO';
  }

  // Entire GST menu items are PRO
  if (menu === 'GST') {
    return 'PRO';
  }

  return null;
}
