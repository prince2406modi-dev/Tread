/**
 * Navigation Menu Configuration, Shortcuts, and Icon Helpers
 */

export const MENUS = {
  Company: [
    'Company Details',
    'Create Company',
    'Edit Company',
    'Open Company',
  ],
  Transactions: {
    Sales: [
      'Add',
      'Modify',
      'List',
    ],
    'Sales Order': [
      'Add',
      'Modify',
      'List',
    ],
    Purchase: [
      'Add',
      'Modify',
      'List',
    ],
    'Purchase Order': [
      'Add',
      'Modify',
      'List',
    ],
    Payment: [
      'Add',
      'Modify',
      'List',
    ],
  },
  Administration: {
    Accounts: [
      'Add Account',
      'Modify Account',
      'List Account',
    ],
    Items: [
      'Add Item',
      'Modify Item',
      'List Items',
    ],
    'System & Security': [
      'Master Item Catalog & API',
      'Users',
      'Device Access Control',
      'App Permissions & Access',
      'Roles & Permissions',
      'Settings',
      'Backup',
      'Restore',
    ],
  },
  'Product Network': [
    'Overview',
    'Manufacturer Catalogs',
    'Discover Products',
    'My Catalog Imports',
    'Manufacturer Connections',
    'Catalog Updates',
    'Import History',
    'Settings',
  ],
  GST: [
    'Universal File AI (Excel, PDF, Images)',
    'GST File Importer (All Types)',
    'GSTR-1 (Sales Outward)',
    'GSTR-2B (ITC Reconcile)',
    'GSTR-3B Return Summary',
    'GSTIN & HSN Directory',
  ],
  Display: {
    'Final Results': ['Balance Sheet', 'Profit & Loss A/c', 'Payment & Receipt Statement'],
    'Trial Balance': ['Closing Trial Balance', 'Opening Trial Balance', 'Group-wise Trial Balance'],
    'Account Books': ['Day Book', 'Account Ledger', 'Cash / Bank Book'],
    'Account Summary': ['Account Group Summary', 'Monthly Summary'],
    'Outstanding Analysis': ['Amount Receivable (Debtors)', 'Bills Receivable'],
    'Interest Calculation': ['Interest on Receivables'],
    'Depreciation Chart': ['Fixed Assets Depreciation Schedule'],
    'My Dash Board': ['Executive Dashboard'],
    'Stock Status': ['Closing Stock', 'Low Stock Alert', 'Stock Valuation Summary'],
    'Inventory Books': ['Item Movement Ledger', 'Item Inward / Outward Register'],
    'Inventory Summary': ['Category Summary', 'Subcategory Summary'],
    'MRP-wise Reports': ['Price List Directory'],
    'Order/Challan Processing': ['Sales Orders', 'Purchase Orders'],
    'GST Reports': ['GSTR-1 (Sales Outward)', 'GSTR-3B Return Summary'],
    'MIS Reports': ['Cash Flow Summary', 'Financial Ratios'],
    'Check List': ['Audit Checklist'],
    'Sales Analysis': ['Monthly Sales Trend', 'Customer-wise Sales'],
    'Purchase Analysis': ['Supplier-wise Purchase'],
    'Issue-Receipt Analysis': ['Movement Balance'],
    'Consumption Analysis': ['Inventory Turnover'],
    'Item Receivable/Issuable': ['Pending Deliveries'],
    'Production Reports': ['Production Logs'],
    'Query System': ['Universal Voucher Query'],
  },
  'Print/Email/SMS': [
    'Print Invoice',
    'Email Invoice',
    'Send SMS',
    'Download PDF',
    'Company Profile PDF',
  ],
  'House-Keeping': [
    'Data Backup',
    'Data Restore',
    'Clear Temporary Data',
    'Database Maintenance',
    'System Cleanup',
  ],
  Favourites: [
    'Add to Favourites',
    'View Favourites',
    'Remove Favourite',
    'Manage Favourites',
  ],
  Help: [
    'Help Center',
    '✨ Tread AI Copilot',
    'User Guide',
    'Keyboard Shortcuts',
    'Login',
    'About Tread',
  ],
};

export const ALL_SHORTCUTS = [
  { name: 'Dashboard', category: 'Display', icon: '📊' },
  { name: '✨ Tread AI Copilot', category: 'Display', icon: '✨' },
  { name: 'Add Sales', category: 'Transactions', icon: '📝' },
  { name: 'Modify Sales', category: 'Transactions', icon: '✏️' },
  { name: 'List Sales', category: 'Transactions', icon: '📋' },
  { name: 'Add Sales Order', category: 'Transactions', icon: '📋' },
  { name: 'List Sales Orders', category: 'Transactions', icon: '📑' },
  { name: 'Add Purchase', category: 'Transactions', icon: '🛒' },
  { name: 'Modify Purchase', category: 'Transactions', icon: '✎' },
  { name: 'List Purchase', category: 'Transactions', icon: '📦' },
  { name: 'Add Purchase Order', category: 'Transactions', icon: '📑' },
  { name: 'List Purchase Orders', category: 'Transactions', icon: '📦' },
  { name: 'Add Payment', category: 'Transactions', icon: '💵' },
  { name: 'List Payments', category: 'Transactions', icon: '💳' },
  { name: 'Add Account', category: 'Administration', icon: '👤' },
  { name: 'Modify Account', category: 'Administration', icon: '✏️' },
  { name: 'List Account', category: 'Administration', icon: '📋' },
  { name: 'Add Item', category: 'Administration', icon: '📦' },
  { name: 'Modify Item', category: 'Administration', icon: '🔧' },
  { name: 'List Items', category: 'Administration', icon: '📑' },
  { name: 'GST File Importer (All Types)', category: 'GST', icon: '📥' },
  { name: 'GSTR-1 (Sales Outward)', category: 'GST', icon: '📤' },
  { name: 'GSTR-2B (ITC Reconcile)', category: 'GST', icon: '⚖️' },
  { name: 'GSTR-3B Return Summary', category: 'GST', icon: '📊' },
  { name: 'GSTIN & HSN Directory', category: 'GST', icon: '🔍' },
  { name: 'Master Item Catalog & API', category: 'Administration', icon: '🏷️' },
  { name: 'Reports', category: 'Display', icon: '📈' },
  { name: 'Company Details', category: 'Company', icon: '🏢' },
  { name: 'Product Network Overview', category: 'Product Network', icon: '🌐' },
  { name: 'Discover Products', category: 'Product Network', icon: '🔍' },
  { name: 'Manufacturer Catalogs', category: 'Product Network', icon: '🏭' },
  { name: 'My Catalog Imports', category: 'Product Network', icon: '📥' },
  { name: 'Manufacturer Connections', category: 'Product Network', icon: '🤝' },
  { name: 'Catalog Updates', category: 'Product Network', icon: '🔔' },
  { name: 'Users', category: 'Administration', icon: '👤' },
  { name: 'Settings', category: 'Administration', icon: '⚙️' },
  { name: 'Company Profile PDF', category: 'Print/Email/SMS', icon: '🏢' },
  { name: 'Data Backup', category: 'House-Keeping', icon: '💾' },
  { name: 'Help Center', category: 'Help', icon: '❓' },
];

export const getCategoryIcon = (group) => {
  switch (group) {
    case 'Transactions':
      return '💳';
    case 'Account':
      return '👥';
    case 'Items':
      return '📦';
    case 'GST':
      return '🏛️';
    case 'Product Network':
      return '🌐';
    case 'Display':
      return '📊';
    case 'Administration':
      return '⚙️';
    case 'Company':
      return '🏢';
    case 'Print/Email/SMS':
      return '✉️';
    case 'House-Keeping':
      return '🧹';
    case 'Favourites':
      return '⭐';
    case 'Help':
      return '❓';
    default:
      return '📁';
  }
};

export const getSubSectionIcon = (sub) => {
  if (sub.includes('Sales Order')) return '📋';
  if (sub.includes('Purchase Order')) return '📑';
  if (sub.includes('Payment')) return '💵';
  if (sub.includes('Sales')) return '💰';
  if (sub.includes('Purchase')) return '🛒';
  if (sub.includes('Account')) return '👤';
  if (sub.includes('Item')) return '📦';
  if (sub.includes('System') || sub.includes('Security')) return '⚙️';
  return '📁';
};

export const getItemIcon = (item) => {
  if (item === 'Overview' || item.includes('Overview')) return '📊';
  if (item.includes('Manufacturer Catalog') || item === 'Manufacturer Catalogs') return '🏭';
  if (item.includes('Discover Products') || item === 'Discover Products') return '🔍';
  if (item.includes('My Catalog Imports') || item === 'My Catalog Imports') return '📥';
  if (item.includes('Manufacturer Connection') || item === 'Manufacturer Connections') return '🤝';
  if (item.includes('Catalog Updates') || item === 'Catalog Updates') return '🔔';
  if (item.includes('Import History') || item === 'Import History') return '📜';
  if (item.includes('Universal File') || item.includes('Smart File') || item.includes('Analyze')) return '⚡';
  if (item.includes('Import') || item.includes('Download')) return '📥';
  if (item.includes('GSTR-1') || item.includes('Export')) return '📤';
  if (item.includes('Reconcile') || item.includes('GSTR-2B') || item.includes('2B')) return '⚖️';
  if (item.includes('GSTR-3B') || item.includes('3B')) return '📊';
  if (item === 'Add' || item.includes('Add') || item.includes('Create') || item.includes('Receive') || item.includes('Make')) return '＋';
  if (item === 'Modify' || item.includes('Modify') || item.includes('Edit')) return '✏️';
  if (item === 'List' || item.includes('List') || item.includes('View') || item.includes('All') || item.includes('Register')) return '📋';
  if (item.includes('Order')) return '📑';
  if (item.includes('Payment')) return '💵';
  if (item.includes('Delete') || item.includes('Remove')) return '✕';
  if (item.includes('Users')) return '👤';
  if (item.includes('Device') || item.includes('Permissions')) return '🛡️';
  if (item.includes('Roles')) return '👥';
  if (item.includes('Settings')) return '⚙️';
  if (item.includes('Backup')) return '💾';
  if (item.includes('Restore')) return '🔄';
  if (item.includes('Catalog') || item.includes('API')) return '🏷️';
  if (item.includes('Dashboard')) return '📊';
  if (item.includes('Reports')) return '📈';
  if (item.includes('Company')) return '🏢';
  if (item.includes('Print')) return '🖨️';
  if (item.includes('Email')) return '📧';
  if (item.includes('SMS')) return '📱';
  if (item.includes('Help') || item.includes('Guide') || item.includes('About')) return '❓';
  if (item.includes('Login')) return '🔐';
  if (item.includes('Maintenance') || item.includes('Cleanup')) return '🧹';
  if (item.includes('Directory')) return '🔍';
  return '•';
};

export const DISPLAY_MENU_STRUCTURE = [
  // Group 1: Financial Results & Accounts
  { title: 'Final Results', hasSub: true, subItems: ['Balance Sheet', 'Profit & Loss A/c', 'Payment & Receipt Statement'] },
  { title: 'Trial Balance', hasSub: true, subItems: ['Closing Trial Balance', 'Opening Trial Balance', 'Group-wise Trial Balance'] },
  { title: 'Account Books', hasSub: true, subItems: ['Day Book', 'Account Ledger', 'Cash / Bank Book'] },
  { title: 'Account Summary', hasSub: true, subItems: ['Account Group Summary', 'Monthly Summary'] },
  { title: 'Outstanding Analysis', hasSub: true, subItems: ['Amount Receivable (Debtors)', 'Bills Receivable'] },
  { title: 'Interest Calculation', hasSub: true, subItems: ['Interest on Receivables'] },
  { title: 'Depreciation Chart', hasSub: true, subItems: ['Fixed Assets Depreciation Schedule'] },

  { isSeparator: true },

  // Group 2: My Dash Board
  { title: 'My Dash Board', hasSub: false, isBullet: true, targetPage: 'Dashboard' },

  { isSeparator: true },

  // Group 3: Inventory / Stock
  { title: 'Stock Status', hasSub: true, subItems: ['Closing Stock', 'Low Stock Alert', 'Stock Valuation Summary'] },
  { title: 'Inventory Books', hasSub: true, subItems: ['Item Movement Ledger', 'Item Inward / Outward Register'] },
  { title: 'Inventory Summary', hasSub: true, subItems: ['Category Summary', 'Subcategory Summary'] },
  { title: 'MRP-wise Reports', hasSub: true, subItems: ['Price List Directory'] },
  { title: 'Order/Challan Processing', hasSub: true, subItems: ['Sales Orders', 'Purchase Orders'] },

  { isSeparator: true },

  // Group 4: GST Reports
  { title: 'GST Reports', hasSub: true, subItems: ['GSTR-1 (Sales Outward)', 'GSTR-3B Return Summary'] },

  { isSeparator: true },

  // Group 5: MIS & Analysis
  { title: 'MIS Reports', hasSub: true, subItems: ['Cash Flow Summary', 'Financial Ratios'] },
  { title: 'Check List', hasSub: true, subItems: ['Audit Checklist'] },
  { title: 'Sales Analysis', hasSub: true, subItems: ['Monthly Sales Trend', 'Customer-wise Sales'] },
  { title: 'Purchase Analysis', hasSub: true, subItems: ['Supplier-wise Purchase'] },
  { title: 'Issue-Receipt Analysis', hasSub: true, subItems: ['Movement Balance'] },
  { title: 'Consumption Analysis', hasSub: true, subItems: ['Inventory Turnover'] },
  { title: 'Item Receivable/Issuable', hasSub: true, subItems: ['Pending Deliveries'] },
  { title: 'Production Reports', hasSub: true, subItems: ['Production Logs'] },
  { title: 'Query System', hasSub: true, subItems: ['Universal Voucher Query'] },
];

