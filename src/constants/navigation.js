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
      'Add Sales',
      'Modify Sales',
      'List Sales',
    ],
    Purchase: [
      'Add Purchase',
      'Modify Purchase',
      'List Purchase',
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
      'Roles & Permissions',
      'Settings',
      'Backup',
      'Restore',
    ],
  },
  GST: [
    'GST File Importer (All Types)',
    'GSTR-1 (Sales Outward)',
    'GSTR-2B (ITC Reconcile)',
    'GSTR-3B Return Summary',
    'GSTIN & HSN Directory',
  ],
  Display: [
    'Dashboard',
    'All Transactions',
    'Company Details',
    'Reports',
  ],
  'Print/Email/SMS': [
    'Print Invoice',
    'Email Invoice',
    'Send SMS',
    'Download PDF',
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
    'User Guide',
    'Keyboard Shortcuts',
    'Login',
    'About Tread',
  ],
};

export const ALL_SHORTCUTS = [
  { name: 'Dashboard', category: 'Display', icon: '📊' },
  { name: 'Add Sales', category: 'Transactions', icon: '📝' },
  { name: 'Modify Sales', category: 'Transactions', icon: '✏️' },
  { name: 'List Sales', category: 'Transactions', icon: '📋' },
  { name: 'Add Purchase', category: 'Transactions', icon: '🛒' },
  { name: 'Modify Purchase', category: 'Transactions', icon: '✎' },
  { name: 'List Purchase', category: 'Transactions', icon: '📦' },
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
  { name: 'Users', category: 'Administration', icon: '👤' },
  { name: 'Settings', category: 'Administration', icon: '⚙️' },
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
  if (sub.includes('Sales')) return '💰';
  if (sub.includes('Purchase')) return '🛒';
  if (sub.includes('Account')) return '👤';
  if (sub.includes('Item')) return '📦';
  if (sub.includes('System') || sub.includes('Security')) return '⚙️';
  return '📁';
};

export const getItemIcon = (item) => {
  if (item.includes('Import') || item.includes('Download')) return '📥';
  if (item.includes('GSTR-1') || item.includes('Export')) return '📤';
  if (item.includes('Reconcile') || item.includes('GSTR-2B') || item.includes('2B')) return '⚖️';
  if (item.includes('GSTR-3B') || item.includes('3B')) return '📊';
  if (item.includes('Add') || item.includes('Create')) return '＋';
  if (item.includes('Modify') || item.includes('Edit')) return '✏️';
  if (item.includes('List') || item.includes('View') || item.includes('All')) return '📋';
  if (item.includes('Delete') || item.includes('Remove')) return '✕';
  if (item.includes('Users')) return '👤';
  if (item.includes('Device')) return '🔑';
  if (item.includes('Roles')) return '🛡️';
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
