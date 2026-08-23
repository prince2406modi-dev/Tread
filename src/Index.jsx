import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { v4 as uuidv4 } from 'uuid';

import Logo from './assets/Images/Logo.png';
import './index.css';

// Immediate Eager Component for Instant Initial Screen Paint (< 0.5s LCP)
import Login from './Components/Login/Login.jsx';

// Lazy Loaded Sub-View Components (Downloaded On-Demand in Background)
const Dashboard = lazy(() => import('./Components/Dashboard/Dashboard.jsx'));
const InvoiceEditor = lazy(() => import('./Components/CreateInvoice/InvoiceEditor.jsx'));
const InvoicesList = lazy(() => import('./Components/Invoices/InvoicesList.jsx'));
const CompanyProfile = lazy(() => import('./Components/Company/CompanyProfile.jsx'));
const Reports = lazy(() => import('./Components/Reports/Reports.jsx'));
const UserManagement = lazy(() => import('./Components/Administration/UserManagement.jsx'));
const AppSettings = lazy(() => import('./Components/Administration/AppSettings.jsx'));
const RolesPermissions = lazy(() => import('./Components/Administration/RolesPermissions.jsx'));
const Housekeeping = lazy(() => import('./Components/Housekeeping/Housekeeping.jsx'));
const ShareInvoiceModal = lazy(() => import('./Components/Communication/ShareInvoiceModal.jsx'));
const HelpCenter = lazy(() => import('./Components/Help/HelpCenter.jsx'));
const AboutModal = lazy(() => import('./Components/Help/AboutModal.jsx'));
const ManageFavourites = lazy(() => import('./Components/Favourites/ManageFavourites.jsx'));
const CustomersPage = lazy(() => import('./Components/Customers/CustomersPage.jsx'));
const StockManagement = lazy(() => import('./Components/Stock/StockManagement.jsx'));
const ItemCatalogApi = lazy(() => import('./Components/Administration/ItemCatalogApi.jsx'));

import { getNextInvoiceNumber } from './services/invoiceStorage.js';
import { syncAllUsersFromCloud, getLocalUsers } from './services/authApi.js';
import { fetchUserDataFromCloud } from './services/firebase.js';

function Index() {
  // =========================================================
  // USER AUTHENTICATION STATE & CROSS-DEVICE CLOUD SYNC
  // =========================================================
  const [users, setUsers] = useState(getLocalUsers);
  // Always require User ID and Password when app opens (no auto-login)
  const [currentUser, setCurrentUser] = useState(null);

  // Sync latest users from Cloud Firestore on application startup
  useEffect(() => {
    syncAllUsersFromCloud()
      .then((cloudUsers) => {
        if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
          setUsers(cloudUsers);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('gst-invoice-app-users', JSON.stringify(users));
    // Clear any previous persistent login session so fresh opening always requires credentials
    window.sessionStorage.removeItem('gst-invoice-app-current-user');
    window.localStorage.removeItem('gst-invoice-app-current-user');
  }, [users]);

  // Prompt user before leaving the app if logged in, and clear session upon exit
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = (e) => {
      if (currentUser) {
        e.preventDefault();
        e.returnValue = 'You are currently logged into Tread. Please make sure to log out before leaving!';
        return e.returnValue;
      }
    };

    const handleUnload = () => {
      window.sessionStorage.removeItem('gst-invoice-app-current-user');
      window.localStorage.removeItem('gst-invoice-app-current-user');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [currentUser]);

  // =========================================================
  // COMPANY & SETTINGS STATE
  // =========================================================
  const [company, setCompany] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = window.localStorage.getItem('gst-invoice-app-company');
      return saved ? JSON.parse(saved) : {
        name: 'Priya Sales',
        gstin: '07AAAAA0000A1Z5',
        pan: 'AAAAA0000A',
        email: 'contact@priyasales.com',
        phone: '+91 98765 43210',
        address: 'Sector 53, Vill-Gijhor, Noida',
        cityState: 'Gautambuddha Nagar, Uttar Pradesh',
        pincode: '201301',
        state: 'Uttar Pradesh (09)',
        bankName: 'State Bank of India',
        accountNumber: '123456789012',
        ifsc: 'SBIN0001234',
        terms: '1. Payment due upon receipt of invoice.\n2. Goods once sold are not refundable.\n3. Subject to Noida jurisdiction.',
      };
    } catch {
      return {};
    }
  });

  const [settings, setSettings] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = window.localStorage.getItem('gst-invoice-app-settings');
      return saved ? JSON.parse(saved) : {
        defaultGst: '18',
        currencySymbol: '₹',
        invoicePrefix: 'INV',
        autoInvoiceNumber: true,
        enableVoice: true,
        dateFormat: 'YYYY-MM-DD',
      };
    } catch {
      return {};
    }
  });

  const handleSaveCompany = (updatedCompany) => {
    setCompany(updatedCompany);
    window.localStorage.setItem('gst-invoice-app-company', JSON.stringify(updatedCompany));
  };

  const handleSaveSettings = (updatedSettings) => {
    setSettings(updatedSettings);
    window.localStorage.setItem('gst-invoice-app-settings', JSON.stringify(updatedSettings));
  };

  // =========================================================
  // INVOICES DATA STATE
  // =========================================================
  const invoiceStorageKey = (username) => `gst-invoice-app-invoices-${username || 'default'}`;

  const loadInvoices = (username) => {
    if (typeof window === 'undefined' || !username) return [];
    try {
      const saved = window.localStorage.getItem(invoiceStorageKey(username));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return;
    window.localStorage.setItem(
      invoiceStorageKey(currentUser.username),
      JSON.stringify(invoices)
    );
  }, [invoices, currentUser]);

  // =========================================================
  // CUSTOMERS STATE
  // =========================================================
  const customersStorageKey = (username) => `gst-invoice-app-customers-${username || 'default'}`;

  const defaultContacts = useMemo(() => [
    {
      id: 'cust-1',
      name: 'Sharma Electronics & Traders',
      type: 'Customer',
      phone: '+91 98765 12345',
      email: 'sharma.traders@email.com',
      gstin: '07ABCDE1234F1Z5',
      address: 'Shop 14, Main Market, Delhi',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cust-2',
      name: 'Apex Hardware & Supplies Corp',
      type: 'Vendor',
      phone: '+91 98123 45678',
      email: 'sales@apexsupplies.com',
      gstin: '09AABCA9876C1Z2',
      address: 'Plot 45, Industrial Area, Noida',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cust-3',
      name: 'Pooja Enterprises',
      type: 'Both',
      phone: '+91 99887 76655',
      email: 'contact@poojaent.in',
      gstin: '06AAACR5544B1Z8',
      address: 'Sector 18, Gurugram, Haryana',
      createdAt: new Date().toISOString(),
    },
  ], []);

  const [customers, setCustomers] = useState(defaultContacts);

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return;
    window.localStorage.setItem(
      customersStorageKey(currentUser.username),
      JSON.stringify(customers)
    );
  }, [customers, currentUser]);

  const handleSaveCustomers = (updatedCustomers) => {
    setCustomers(updatedCustomers);
  };

  const handleDeleteCustomer = (id) => {
    setCustomers((current) => current.filter((c) => c.id !== id));
  };

  // Load a saved customer's details into the invoice editor fields
  const handleLoadCustomerToInvoice = (customer) => {
    setCustomerName(customer.name || '');
    setCustomerPhone(customer.phone || '');
    setCustomerAddress(customer.address || '');
    setActivePage('Create Transaction');
  };

  // Quick save a customer directly from invoice creation
  const handleSaveSingleCustomer = (newCust) => {
    const exists = customers.some(
      (c) => c.name.toLowerCase() === newCust.name.toLowerCase()
    );
    if (exists) {
      alert(`Customer "${newCust.name}" is already saved in your directory.`);
      return;
    }
    const newEntry = {
      id: uuidv4(),
      type: 'Customer',
      ...newCust,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newEntry, ...prev]);
    alert(`✓ Customer "${newCust.name}" saved to your Sales Directory!`);
  };

  // =========================================================
  // STOCK / INVENTORY DATA STATE (LOCAL STORAGE PERSISTENCE)
  // =========================================================
  const stockStorageKey = (username) => `gst-invoice-app-stock-${username || 'default'}`;

  const defaultStockCatalog = useMemo(() => [
    { id: 'stock-1', name: 'LED Light Bulb 9W', hsn: '8539', stock: 50, rate: 120, gst: 18, unit: 'PCS' },
    { id: 'stock-2', name: 'USB-C Fast Charger 65W', hsn: '8504', stock: 30, rate: 450, gst: 18, unit: 'PCS' },
    { id: 'stock-3', name: 'Wireless Optical Mouse', hsn: '8471', stock: 25, rate: 350, gst: 18, unit: 'NOS' },
    { id: 'stock-4', name: 'A4 Copier Paper 75GSM', hsn: '4802', stock: 100, rate: 280, gst: 12, unit: 'BOX' },
    { id: 'stock-5', name: 'HDMI High Speed Cable 2M', hsn: '8544', stock: 40, rate: 199, gst: 18, unit: 'PCS' },
  ], []);

  const [stockItems, setStockItems] = useState(defaultStockCatalog);

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return;
    window.localStorage.setItem(
      stockStorageKey(currentUser.username),
      JSON.stringify(stockItems)
    );
  }, [stockItems, currentUser]);

  const handleSaveStock = (updatedStock) => {
    setStockItems(updatedStock);
  };

  // =========================================================
  // PURCHASE BILLS STATE (LOCAL STORAGE PERSISTENCE)
  // =========================================================
  const purchasesStorageKey = (username) => `gst-invoice-app-purchases-${username || 'default'}`;

  const [purchaseBills, setPurchaseBills] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return;
    window.localStorage.setItem(
      purchasesStorageKey(currentUser.username),
      JSON.stringify(purchaseBills)
    );
  }, [purchaseBills, currentUser]);

  const handleSavePurchaseBills = (updatedBills) => {
    setPurchaseBills(updatedBills);
  };

  // =========================================================
  // ACTIVE INVOICE DRAFT STATE
  // =========================================================
  const [customerName, setCustomerName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [invoiceType, setInvoiceType] = useState('local'); // 'local' (CGST+SGST) | 'central' (IGST)
  const [items, setItems] = useState([]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const q = Number(item.quantity || 1);
      const r = Number(item.rate || 0);
      return sum + q * r;
    }, 0);

    const totalGst = items.reduce((sum, item) => {
      const q = Number(item.quantity || 1);
      const r = Number(item.rate || 0);
      const g = Number(item.gstPercent || 0);
      return sum + (q * r * g) / 100;
    }, 0);

    const isCentral = invoiceType === 'central';
    const cgst = isCentral ? 0 : totalGst / 2;
    const sgst = isCentral ? 0 : totalGst / 2;
    const igst = isCentral ? totalGst : 0;

    return {
      subtotal,
      cgst,
      sgst,
      igst,
      totalGst,
      total: subtotal + totalGst,
      invoiceType,
      isInterState: isCentral,
    };
  }, [items, invoiceType]);

  const resetInvoice = (currentInvoices) => {
    setCustomerName('');
    setInvoiceNumber(getNextInvoiceNumber(currentInvoices || []));
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setCustomerPhone('');
    setCustomerAddress('');
    setInvoiceType('local');
    setItems([]);
  };

  const addItem = (itemData) => {
    setItems((current) => [
      ...current,
      {
        id: uuidv4(),
        description: itemData.description || 'New Item',
        quantity: Number(itemData.quantity) || 1,
        rate: Number(itemData.rate) || 0,
        gstPercent: Number(itemData.gstPercent) || 18,
      },
    ]);
  };

  const updateItem = (id, field, value) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === 'description' ? value : Number(value) || 0,
            }
          : item
      )
    );
  };

  const removeItem = (id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const saveInvoice = () => {
    if (!currentUser) {
      alert('Please sign in to save invoices.');
      return;
    }
    if (!customerName.trim()) {
      alert('Please select or enter a registered customer name.');
      return;
    }

    // Enforce that customer must be saved in the customers folder
    const isRegistered = customers.some(
      (c) => c.name.trim().toLowerCase() === customerName.trim().toLowerCase()
    );
    if (!isRegistered) {
      alert(
        `❌ Error: Customer "${customerName.trim()}" is not saved in your Customers folder.\n\nYou cannot create an invoice for an unsaved customer. Please select a saved customer or register them in the Customer folder first.`
      );
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one line item.');
      return;
    }

    const calculatedInvoiceNumber = invoiceNumber.trim() || getNextInvoiceNumber(invoices);

    const newInvoice = {
      id: uuidv4(),
      customerName: customerName.trim(),
      invoiceNumber: calculatedInvoiceNumber,
      invoiceDate,
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      invoiceType,
      isInterState: invoiceType === 'central',
      items,
      totals,
      createdAt: new Date().toISOString(),
    };

    const updatedInvoices = [newInvoice, ...invoices];
    setInvoices(updatedInvoices);

    // Automatically deduct sold items from available stock inventory
    setStockItems((prevStock) =>
      prevStock.map((stockItem) => {
        const matchingSold = items.find(
          (it) => it.description.trim().toLowerCase() === stockItem.name.trim().toLowerCase()
        );
        if (matchingSold) {
          const soldQty = Number(matchingSold.quantity) || 1;
          return {
            ...stockItem,
            stock: Math.max(0, (Number(stockItem.stock) || 0) - soldQty),
          };
        }
        return stockItem;
      })
    );

    resetInvoice(updatedInvoices);
    alert(`✓ Invoice ${calculatedInvoiceNumber} saved successfully!`);
  };

  // =========================================================
  // ACTIVE SCREEN & NAVIGATION STATE
  // =========================================================
  const [activeMenu, setActiveMenu] = useState(null);
  const [activePage, setActivePage] = useState('Dashboard');
  const [shareModal, setShareModal] = useState({ isOpen: false, mode: 'pdf', targetInvoice: null });
  const [aboutModal, setAboutModal] = useState(false);

  const [favourites, setFavourites] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem('gst-invoice-app-favourites');
      return saved ? JSON.parse(saved) : ['Dashboard', 'Create Transaction', 'All Transactions', 'Reports', 'Company Details'];
    } catch {
      return ['Dashboard', 'Create Transaction', 'All Transactions', 'Reports', 'Company Details'];
    }
  });

  const toggleFavourite = (pageName) => {
    setFavourites((current) => {
      const updated = current.includes(pageName)
        ? current.filter((p) => p !== pageName)
        : [...current, pageName];
      window.localStorage.setItem('gst-invoice-app-favourites', JSON.stringify(updated));
      return updated;
    });
  };

  const loadInvoiceToEditor = (inv) => {
    setCustomerName(inv.customerName || '');
    setInvoiceNumber(inv.invoiceNumber || '');
    setInvoiceDate(inv.invoiceDate || new Date().toISOString().slice(0, 10));
    setCustomerPhone(inv.customerPhone || '');
    setCustomerAddress(inv.customerAddress || '');
    setInvoiceType(inv.invoiceType || (inv.isInterState ? 'central' : 'local'));
    setItems(inv.items || []);
    setActivePage('Create Transaction');
  };

  const deleteInvoice = (id) => {
    setInvoices((current) => current.filter((i) => i.id !== id));
  };

  const clearAllInvoices = () => {
    setInvoices([]);
  };

  // =========================================================
  // VOICE ASSISTANT
  // =========================================================
  const [voiceSupported] = useState(
    () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recognitionRef = useRef(null);

  const processVoiceCommand = (command) => {
    if (!command) return;
    const text = command.toLowerCase().trim();

    if (text.includes('clear invoice') || text.includes('reset invoice') || text.includes('new invoice')) {
      resetInvoice(invoices);
      return;
    }
    if (text.includes('save invoice') || text.includes('submit invoice')) {
      saveInvoice();
      return;
    }
    if (text.includes('set customer name to')) {
      const val = command.split(/set customer name to/i)[1]?.trim();
      if (val) setCustomerName(val);
      return;
    }
    if (text.includes('set invoice number to')) {
      const val = command.split(/set invoice number to/i)[1]?.trim();
      if (val) setInvoiceNumber(val);
      return;
    }
    if (text.includes('set customer phone to') || text.includes('set mobile to') || text.includes('set phone to')) {
      const parts = command.split(/set (customer )?(phone|mobile) to/i);
      const val = parts[parts.length - 1]?.trim();
      if (val) setCustomerPhone(val);
      return;
    }
    if (text.includes('set address to') || text.includes('set customer address to')) {
      const val = command.split(/set (customer )?address to/i)[1]?.trim();
      if (val) setCustomerAddress(val);
      return;
    }
    if (text.includes('add item')) {
      const regex = /add item\s+(.+?)(?:\s+quantity\s+(\d+))?(?:\s+rate\s+(\d+(?:\.\d+)?))?(?:\s+gst\s+(\d+))?$/i;
      const match = command.match(regex);
      if (match) {
        addItem({
          description: match[1]?.trim() || 'Voice Item',
          quantity: Number(match[2] || 1),
          rate: Number(match[3] || 0),
          gstPercent: Number(match[4] || 18),
        });
      }
    }
  };

  const processVoiceRef = useRef(processVoiceCommand);

  useEffect(() => {
    processVoiceRef.current = processVoiceCommand;
  });

  useEffect(() => {
    if (!voiceSupported || typeof window === 'undefined') return;
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechClass) return;

    const recognition = new SpeechClass();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const sentence = last[0].transcript.trim();
      setVoiceTranscript((prev) => `${prev} ${sentence}`.trim());
      processVoiceRef.current?.(sentence);
    };

    recognition.onerror = () => setRecognitionActive(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [voiceSupported]);

  useEffect(() => {
    if (!recognitionRef.current) return;
    if (recognitionActive) {
      try {
        recognitionRef.current.start();
      } catch {
        // already started
      }
    } else {
      try {
        recognitionRef.current.stop();
      } catch {
        // already stopped
      }
    }
  }, [recognitionActive]);

  const menuRef = useRef(null);

  const menus = {
    Company: [
      'Create Company',
      'Open Company',
      'Edit Company',
      'Delete Company',
      'Company Details',
    ],
    Administration: [
      'Master Item Catalog & API',
      'Users',
      'Roles & Permissions',
      'Backup',
      'Restore',
      'Settings',
    ],
    Transactions: [
      'Create Transaction',
      'View Transactions',
      'Edit Transaction',
      'Delete Transaction',
      'Search Transaction',
      'Customers',
      'Stock Inventory',
      'Purchase Bills',
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

  const allAvailableShortcuts = [
    { name: 'Dashboard', category: 'Display', icon: '📊' },
    { name: 'Create Transaction', category: 'Transactions', icon: '📝' },
    { name: 'Stock Inventory', category: 'Transactions', icon: '📦' },
    { name: 'Purchase Bills', category: 'Transactions', icon: '🛒' },
    { name: 'All Transactions', category: 'Display', icon: '📋' },
    { name: 'Customers', category: 'Transactions', icon: '👥' },
    { name: 'Master Item Catalog & API', category: 'Administration', icon: '🏷️' },
    { name: 'Reports', category: 'Display', icon: '📈' },
    { name: 'Company Details', category: 'Company', icon: '🏢' },
    { name: 'Users', category: 'Administration', icon: '👤' },
    { name: 'Settings', category: 'Administration', icon: '⚙️' },
    { name: 'Data Backup', category: 'House-Keeping', icon: '💾' },
    { name: 'Help Center', category: 'Help', icon: '❓' },
  ];

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    const handleKeyDown = (e) => {
      const target = e.target;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        setActiveMenu(null);
        setShareModal({ isOpen: false, mode: 'pdf', targetInvoice: null });
        setAboutModal(false);
        return;
      }

      // Fast-path: bypass shortcut handling when actively typing to prevent INP delays
      if (isTyping) return;

      // Alt + N -> New Invoice
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActivePage('Create Transaction');
      }
      // Alt + D -> Dashboard
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setActivePage('Dashboard');
      }
      // Alt + V -> Toggle Voice
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setRecognitionActive((prev) => !prev);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMenuClick = (menu) => {
    if (!currentUser) {
      alert('Please sign in with your User ID and Password first.');
      return;
    }
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  // Dropdown option click handler
  const handleOptionClick = (option) => {
    setActiveMenu(null);

    if (!currentUser && option !== 'Login' && option !== 'About Tread') {
      alert('Please sign in with your User ID and Password first.');
      return;
    }

    // Company Actions
    if (
      option === 'Create Company' ||
      option === 'Open Company' ||
      option === 'Edit Company' ||
      option === 'Company Details'
    ) {
      setActivePage('Company Details');
      return;
    }
    if (option === 'Delete Company') {
      if (window.confirm('Reset company profile details to default?')) {
        handleSaveCompany({
          name: '',
          gstin: '',
          address: '',
          cityState: '',
          phone: '',
          email: '',
          terms: '',
        });
        alert('Company profile reset.');
      }
      return;
    }

    // Administration Actions
    if (
      option === 'Master Item Catalog & API' ||
      option === 'Master Item Catalog' ||
      option === 'Add Item (Master Catalog & API)' ||
      option === 'Item API' ||
      option === 'Add Item'
    ) {
      setActivePage('Master Item Catalog');
      return;
    }
    if (option === 'Users') {
      setActivePage('Users');
      return;
    }
    if (option === 'Roles & Permissions') {
      setActivePage('Roles & Permissions');
      return;
    }
    if (option === 'Settings') {
      setActivePage('Settings');
      return;
    }
    if (option === 'Backup' || option === 'Restore') {
      setActivePage('House-Keeping');
      return;
    }

    // Transactions Actions
    if (option === 'Create Transaction') {
      setActivePage('Create Transaction');
      return;
    }
    if (
      option === 'View Transactions' ||
      option === 'Edit Transaction' ||
      option === 'Delete Transaction' ||
      option === 'Search Transaction'
    ) {
      setActivePage('All Transactions');
      return;
    }
    if (option === 'Customers') {
      setActivePage('Customers');
      return;
    }
    if (
      option === 'Stock Inventory' ||
      option === 'Stock' ||
      option === 'Inventory'
    ) {
      setActivePage('Stock Inventory');
      return;
    }

    // Display Actions
    if (option === 'Dashboard') {
      setActivePage('Dashboard');
      return;
    }
    if (option === 'All Transactions') {
      setActivePage('All Transactions');
      return;
    }
    if (option === 'Reports') {
      setActivePage('Reports');
      return;
    }

    // Print / Email / SMS Actions
    if (option === 'Download PDF') {
      setShareModal({ isOpen: true, mode: 'pdf', targetInvoice: null });
      return;
    }
    if (option === 'Print Invoice') {
      setShareModal({ isOpen: true, mode: 'print', targetInvoice: null });
      return;
    }
    if (option === 'Email Invoice') {
      setShareModal({ isOpen: true, mode: 'email', targetInvoice: null });
      return;
    }
    if (option === 'Send SMS') {
      setShareModal({ isOpen: true, mode: 'sms', targetInvoice: null });
      return;
    }

    // House-Keeping Actions
    if (
      option === 'Data Backup' ||
      option === 'Data Restore' ||
      option === 'Database Maintenance' ||
      option === 'System Cleanup'
    ) {
      setActivePage('House-Keeping');
      return;
    }
    if (option === 'Clear Temporary Data') {
      resetInvoice();
      alert('✓ Unsaved invoice draft cleared.');
      return;
    }

    // Favourites Actions
    if (option === 'Add to Favourites') {
      toggleFavourite(activePage);
      alert(`Updated favourites for "${activePage}"!`);
      return;
    }
    if (
      option === 'View Favourites' ||
      option === 'Remove Favourite' ||
      option === 'Manage Favourites'
    ) {
      setActivePage('Manage Favourites');
      return;
    }

    // Help Actions
    if (
      option === 'Help Center' ||
      option === 'User Guide' ||
      option === 'Keyboard Shortcuts'
    ) {
      setActivePage('Help Center');
      return;
    }
    if (option === 'Login') {
      setActivePage('Login');
      return;
    }
    if (option === 'About Tread') {
      setAboutModal(true);
      return;
    }

    setActivePage(option);
  };

  // Auth Handlers
  const handleLogin = (username) => {
    const userInvoices = loadInvoices(username);
    setCurrentUser({ username });
    setInvoices(userInvoices);

    // Load customer directory for this user
    let loadedCust = defaultContacts;
    try {
      const savedCust = window.localStorage.getItem(`gst-invoice-app-customers-${username}`);
      if (savedCust) loadedCust = JSON.parse(savedCust);
      setCustomers(loadedCust);
    } catch {
      setCustomers(defaultContacts);
    }

    // Load stock catalog for this user
    let loadedStock = defaultStockCatalog;
    try {
      const savedStock = window.localStorage.getItem(`gst-invoice-app-stock-${username}`);
      if (savedStock) loadedStock = JSON.parse(savedStock);
      setStockItems(loadedStock);
    } catch {
      setStockItems(defaultStockCatalog);
    }

    // Load purchase bills for this user
    try {
      const savedPurchases = window.localStorage.getItem(`gst-invoice-app-purchases-${username}`);
      setPurchaseBills(savedPurchases ? JSON.parse(savedPurchases) : []);
    } catch {
      setPurchaseBills([]);
    }

    // If logging in on a new device with empty local invoices/customers, sync from Cloud Firestore
    fetchUserDataFromCloud(username).then((cloudRes) => {
      if (cloudRes.success && cloudRes.data) {
        if (cloudRes.data.invoices && cloudRes.data.invoices.length > 0) {
          setInvoices(cloudRes.data.invoices);
        }
        if (cloudRes.data.customers && cloudRes.data.customers.length > 0) {
          setCustomers(cloudRes.data.customers);
        }
        if (cloudRes.data.stockItems && cloudRes.data.stockItems.length > 0) {
          setStockItems(cloudRes.data.stockItems);
        }
        if (cloudRes.data.purchaseBills && cloudRes.data.purchaseBills.length > 0) {
          setPurchaseBills(cloudRes.data.purchaseBills);
        }
        if (cloudRes.data.company && cloudRes.data.company.name) {
          setCompany(cloudRes.data.company);
        }
      }
    }).catch(() => {});

    // Pre-fill invoice number based on last saved invoice
    setInvoiceNumber(getNextInvoiceNumber(userInvoices));
    setActivePage('Dashboard');
  };

  const handleRegister = (newUser) => {
    setUsers((current) => [...current, newUser]);
    if (newUser.companyName) {
      setCompany((prev) => ({
        ...prev,
        name: newUser.companyName,
        phone: newUser.phone || prev.phone,
        email: newUser.email || prev.email,
      }));
    }
    setCurrentUser({ username: newUser.username });
    setInvoices([]);
    setCustomers(defaultContacts);
    setStockItems(defaultStockCatalog);
    setPurchaseBills([]);
    // First invoice for new user starts at 1001/2026-27
    setInvoiceNumber('1001/2026-27');
    setActivePage('Dashboard');
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out from Tread?')) {
      resetInvoice([]);
      setCurrentUser(null);
      setInvoices([]);
      setPurchaseBills([]);
      window.sessionStorage.removeItem('gst-invoice-app-current-user');
      window.localStorage.removeItem('gst-invoice-app-current-user');
      setActivePage('Dashboard');
    }
  };

  const handleRestoreData = (parsed) => {
    if (parsed.company) {
      handleSaveCompany(parsed.company);
    }
    if (parsed.invoices) {
      setInvoices(parsed.invoices);
    }
    if (parsed.customers) {
      setCustomers(parsed.customers);
    }
    if (parsed.stockItems) {
      setStockItems(parsed.stockItems);
    }
    if (parsed.purchaseBills) {
      setPurchaseBills(parsed.purchaseBills);
    }
    if (parsed.settings) {
      setSettings(parsed.settings);
    }
    if (parsed.users) {
      setUsers(parsed.users);
    }
  };

  // Download PDF helper passing current company profile (dynamic import to reduce initial bundle)
  const handleDownloadPDF = async (inv) => {
    const { default: downloadPDF } = await import('./Components/DownloadInvoice/Invoice.jsx');
    downloadPDF(inv, company);
  };

  // Render current active screen
  const renderActiveView = () => {
    if (!currentUser) {
      return (
        <div className="py-4">
          <div className="row justify-content-center">
            <div className="col-xl-5 col-lg-7 col-md-9">
              <Login
                users={users}
                onLogin={handleLogin}
                onRegister={handleRegister}
              />
            </div>
          </div>
        </div>
      );
    }

    switch (activePage) {
      case 'Home':
        return (
          <div className="home-brand-screen py-4 text-center animate-fade-in">
            <div className="card shadow-sm border-0 p-5 mx-auto bg-white rounded-4" style={{ maxWidth: '850px' }}>
              <div className="mb-4">
                <img
                  src={Logo}
                  alt="Tread Logo"
                  className="tread-home-logo mb-3"
                  style={{ maxHeight: '160px', width: 'auto', objectFit: 'contain' }}
                />
                <h1 className="display-4 fw-bolder text-primary mb-1">
                  TREAD
                </h1>
                <div className="fs-5 text-uppercase fw-semibold text-secondary letter-spacing-2 mb-3">
                  GST Invoice & Billing Enterprise System
                </div>
                <p className="lead text-muted mx-auto" style={{ maxWidth: '620px' }}>
                  Smart tax billing platform with automated GST slab calculations, voice-assisted data entry, company customization, and instant PDF invoice generation.
                </p>
              </div>

              <div className="d-flex justify-content-center gap-3 flex-wrap mb-4">
                <button
                  type="button"
                  className="btn btn-primary btn-lg px-4 fw-bold shadow-sm"
                  onClick={() => setActivePage('Dashboard')}
                >
                  📊 Open Dashboard
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-lg px-4 fw-semibold"
                  onClick={() => setActivePage('Create Transaction')}
                >
                  ＋ Create New Invoice
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-lg px-4 fw-semibold"
                  onClick={() => setActivePage('All Transactions')}
                >
                  📋 View Invoices
                </button>
              </div>

              <div className="row g-3 text-start pt-3 border-top">
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded-3 h-100">
                    <div className="fw-bold mb-1">🎤 Voice Assistant</div>
                    <small className="text-muted">Speak natural voice commands to fill customer details and add items.</small>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded-3 h-100">
                    <div className="fw-bold mb-1">🏷️ GST Auto-Calculations</div>
                    <small className="text-muted">Automatic CGST, SGST, IGST per item slab (0%, 5%, 12%, 18%, 28%).</small>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded-3 h-100">
                    <div className="fw-bold mb-1">📥 Official PDF Invoices</div>
                    <small className="text-muted">Generate and export tax invoices with custom company branding.</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'Dashboard':
        return (
          <Dashboard
            invoices={invoices}
            company={company}
            currentUser={currentUser}
            onNavigate={setActivePage}
            onLoadInvoice={loadInvoiceToEditor}
            onDownloadPDF={handleDownloadPDF}
            onStartVoice={() => {
              setActivePage('Create Transaction');
              setRecognitionActive(true);
            }}
          />
        );

      case 'Create Transaction':
      case 'Create Invoice':
        return (
          <InvoiceEditor
            customerName={customerName}
            setCustomerName={setCustomerName}
            invoiceNumber={invoiceNumber}
            setInvoiceNumber={setInvoiceNumber}
            invoiceDate={invoiceDate}
            setInvoiceDate={setInvoiceDate}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            customerAddress={customerAddress}
            setCustomerAddress={setCustomerAddress}
            invoiceType={invoiceType}
            setInvoiceType={setInvoiceType}
            items={items}
            addItem={addItem}
            updateItem={updateItem}
            removeItem={removeItem}
            totals={totals}
            resetInvoice={resetInvoice}
            saveInvoice={saveInvoice}
            recognitionActive={recognitionActive}
            setRecognitionActive={setRecognitionActive}
            voiceSupported={voiceSupported}
            voiceTranscript={voiceTranscript}
            downloadPDF={handleDownloadPDF}
            onViewAllInvoices={() => setActivePage('All Transactions')}
            customers={customers}
            company={company}
            onSaveCustomer={handleSaveSingleCustomer}
            onNavigateToCustomers={() => setActivePage('Customers')}
            stockItems={stockItems}
            onNavigateToStock={() => setActivePage('Stock Inventory')}
          />
        );

      case 'Stock Inventory':
      case 'Stock':
      case 'Inventory':
      case 'Purchase Bills':
      case 'Purchase':
        return (
          <StockManagement
            stockItems={stockItems}
            onSaveStock={handleSaveStock}
            vendors={customers.filter((c) => c.type === 'Vendor' || c.type === 'Both')}
            purchaseBills={purchaseBills}
            onSavePurchaseBills={handleSavePurchaseBills}
            onSaveVendor={handleSaveSingleCustomer}
            onBack={() => setActivePage('Dashboard')}
          />
        );

      case 'Customers':
      case 'Vendors':
      case 'Parties':
        return (
          <CustomersPage
            customers={customers}
            onSave={handleSaveCustomers}
            onDelete={handleDeleteCustomer}
            onLoadToInvoice={handleLoadCustomerToInvoice}
            onBack={() => setActivePage('Dashboard')}
          />
        );

      case 'All Transactions':
      case 'View Transactions':
        return (
          <InvoicesList
            invoices={invoices}
            company={company}
            onLoadInvoice={loadInvoiceToEditor}
            onDeleteInvoice={deleteInvoice}
            onClearAllInvoices={clearAllInvoices}
            onDownloadPDF={handleDownloadPDF}
            onShareInvoice={(inv) =>
              setShareModal({ isOpen: true, mode: 'email', targetInvoice: inv })
            }
            onNavigate={setActivePage}
          />
        );

      case 'Company Details':
      case 'Create Company':
      case 'Edit Company':
        return (
          <CompanyProfile
            company={company}
            onSaveCompany={handleSaveCompany}
            onBack={() => setActivePage('Dashboard')}
          />
        );

      case 'Reports':
        return (
          <Reports
            invoices={invoices}
            company={company}
            onBack={() => setActivePage('Dashboard')}
          />
        );

      case 'Users':
        return (
          <UserManagement
            users={users}
            currentUser={currentUser}
            onSwitchUser={handleLogin}
            onAddUser={handleRegister}
            onLogout={handleLogout}
            onBack={() => setActivePage('Dashboard')}
          />
        );

      case 'Master Item Catalog':
      case 'Master Item Catalog & API':
      case 'Add Item (Master Catalog & API)':
      case 'Add Item':
        return (
          <ItemCatalogApi
            stockItems={stockItems}
            onSaveStock={handleSaveStock}
            onBack={() => setActivePage('Dashboard')}
          />
        );

      case 'Settings':
        return (
          <AppSettings
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onBack={() => setActivePage('Dashboard')}
          />
        );

      case 'Roles & Permissions':
        return (
          <RolesPermissions onBack={() => setActivePage('Dashboard')} />
        );

      case 'House-Keeping':
      case 'Data Backup':
      case 'Data Restore':
        return (
          <Housekeeping
            invoices={invoices}
            company={company}
            users={users}
            currentUser={currentUser}
            customers={customers}
            stockItems={stockItems}
            purchaseBills={purchaseBills}
            onRestoreData={handleRestoreData}
            onClearDrafts={resetInvoice}
            onBack={() => setActivePage('Dashboard')}
            onNavigateToSettings={() => setActivePage('Settings')}
          />
        );

      case 'Manage Favourites':
      case 'View Favourites':
        return (
          <ManageFavourites
            allOptions={allAvailableShortcuts}
            favourites={favourites}
            onToggleFavourite={toggleFavourite}
            onNavigate={setActivePage}
            onBack={() => setActivePage('Dashboard')}
          />
        );

      case 'Help Center':
      case 'User Guide':
      case 'Keyboard Shortcuts':
        return (
          <HelpCenter
            onNavigate={setActivePage}
            onBack={() => setActivePage('Dashboard')}
          />
        );

      case 'Login':
        return (
          <div className="py-4">
            <div className="row justify-content-center">
              <div className="col-xl-6 col-lg-8">
                <Login
                  users={users}
                  onLogin={handleLogin}
                  onRegister={handleRegister}
                  onBack={() => setActivePage('Dashboard')}
                />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-5">
            <h2 className="h4 fw-bold">{activePage}</h2>
            <p className="text-muted">Section loaded. Choose an option from the menu.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActivePage('Dashboard')}
            >
              Return to Dashboard
            </button>
          </div>
        );
    }
  };

  return (
    <div className="menu-container" ref={menuRef}>
      {/* ================= TOP NAVIGATION BAR ================= */}
      <div id="box">
        <div
          className="brand-nav-title"
          onClick={() => {
            setActivePage('Home');
            setActiveMenu(null);
          }}
          title="Tread Home - View Brand Logo & Overview"
          style={{ cursor: 'pointer' }}
        >
          <img src={Logo} alt="Tread Logo" className="brand-nav-logo" />
          <span>Tread</span>
        </div>

        <div className="menus-horizontal">
          {currentUser ? (
            Object.keys(menus).map((menu) => (
              <div className="menu-wrapper" key={menu}>
                <button
                  type="button"
                  className={`top-button ${activeMenu === menu ? 'active' : ''}`}
                  onClick={() => handleMenuClick(menu)}
                >
                  {menu}
                  <span className="arrow">{activeMenu === menu ? '▲' : '▼'}</span>
                </button>

                {/* DROPDOWN MENU */}
                {activeMenu === menu && (
                  <div className="dropdown-menu-custom">
                    {menus[menu].map((option, index) => (
                      <button
                        key={index}
                        type="button"
                        className="dropdown-item-custom"
                        onClick={() => handleOptionClick(option)}
                      >
                        <span className="item-icon">
                          {index === 0
                            ? '＋'
                            : index === 1
                            ? '◉'
                            : index === 2
                            ? '✎'
                            : index === 3
                            ? '✕'
                            : '☰'}
                        </span>
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-white-50 small ps-2">
              🔒 Please sign in with your User ID &amp; Password
            </div>
          )}
        </div>
      </div>

      {/* ================= SECONDARY SUB-NAV / STATUS BAR ================= */}
      <div className="sub-navbar">
        <div className="breadcrumb-tag">
          <span>📁 {company?.name || 'Priya Sales'}</span>
          <span className="text-muted">/</span>
          <span className="active-page-name">
            {currentUser ? activePage : 'Authentication Required'}
          </span>
          {currentUser && recognitionActive && (
            <span className="badge bg-danger animate-pulse ms-2">
              ● Voice Active
            </span>
          )}
        </div>

        {/* Quick Favourites Pills */}
        {currentUser && (
          <div className="favourites-pills d-none d-md-flex">
            <span className="text-muted small me-1">⭐ Quick:</span>
            {favourites.map((fav) => (
              <button
                key={fav}
                type="button"
                className={`fav-pill-btn ${activePage === fav ? 'active' : ''}`}
                onClick={() => setActivePage(fav)}
              >
                {fav}
              </button>
            ))}
          </div>
        )}

        {/* User Account & Quick Status */}
        <div className="d-flex align-items-center gap-2">
          {currentUser ? (
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-light text-dark border">
                👤 {currentUser.username}
              </span>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm py-0 px-2"
                style={{ fontSize: '11.5px' }}
                onClick={handleLogout}
              >
                🔒 Logout
              </button>
            </div>
          ) : (
            <span className="badge bg-warning text-dark border py-1 px-2">
              🔒 Sign In Required
            </span>
          )}
        </div>
      </div>

      {/* ================= MAIN PAGE VIEWPORT ================= */}
      <main className="content-area">
        <Suspense
          fallback={
            <div className="d-flex justify-content-center align-items-center py-5" style={{ minHeight: '300px' }}>
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          }
        >
          {renderActiveView()}
        </Suspense>
      </main>

      {/* ================= FOOTER BAR ================= */}
      <footer className="app-footer">
        <div>
          <strong>Tread GST ERP</strong> © 2026 | GSTIN: {company?.gstin || 'Unset'}
        </div>
        <div className="d-flex gap-3">
          <button
            type="button"
            className="btn btn-link p-0 text-muted text-decoration-none"
            onClick={() => setActivePage('Help Center')}
          >
            User Guide (Alt+N: New, Alt+D: Dashboard)
          </button>
          <button
            type="button"
            className="btn btn-link p-0 text-muted text-decoration-none"
            onClick={() => setAboutModal(true)}
          >
            About
          </button>
        </div>
      </footer>

      {/* ================= MODALS ================= */}
      <Suspense fallback={null}>
        {shareModal.isOpen && (
          <ShareInvoiceModal
            invoices={invoices}
            invoice={shareModal.targetInvoice || invoices[0]}
            company={company}
            defaultMode={shareModal.mode}
            onDownloadPDF={handleDownloadPDF}
            onClose={() => setShareModal({ isOpen: false, mode: 'pdf', targetInvoice: null })}
          />
        )}

        {aboutModal && <AboutModal onClose={() => setAboutModal(false)} />}
      </Suspense>
    </div>
  );
}

export default Index;