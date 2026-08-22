import { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

import Logo from './assets/Images/Logo.png';
import './index.css';

// Components
import Dashboard from './Components/Dashboard/Dashboard.jsx';
import InvoiceEditor from './Components/CreateInvoice/InvoiceEditor.jsx';
import InvoicesList from './Components/Invoices/InvoicesList.jsx';
import CompanyProfile from './Components/Company/CompanyProfile.jsx';
import Reports from './Components/Reports/Reports.jsx';
import UserManagement from './Components/Administration/UserManagement.jsx';
import AppSettings from './Components/Administration/AppSettings.jsx';
import RolesPermissions from './Components/Administration/RolesPermissions.jsx';
import Housekeeping from './Components/Housekeeping/Housekeeping.jsx';
import ShareInvoiceModal from './Components/Communication/ShareInvoiceModal.jsx';
import HelpCenter from './Components/Help/HelpCenter.jsx';
import AboutModal from './Components/Help/AboutModal.jsx';
import ManageFavourites from './Components/Favourites/ManageFavourites.jsx';
import Login from './Components/Login/Login.jsx';
import CustomersPage from './Components/Customers/CustomersPage.jsx';
import StockManagement from './Components/Stock/StockManagement.jsx';

import downloadPDF from './Components/DownloadInvoice/Invoice.jsx';
import { getNextInvoiceNumber } from './services/invoiceStorage.js';

function Index() {
  // =========================================================
  // USER AUTHENTICATION STATE
  // =========================================================
  const getInitialUsers = () => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem('gst-invoice-app-users');
      return saved ? JSON.parse(saved) : [{ username: 'admin', password: 'password', role: 'Admin' }];
    } catch {
      return [{ username: 'admin', password: 'password', role: 'Admin' }];
    }
  };

  const getInitialCurrentUser = () => {
    if (typeof window === 'undefined') return null;
    const username =
      window.sessionStorage.getItem('gst-invoice-app-current-user') ||
      window.localStorage.getItem('gst-invoice-app-current-user');
    return username ? { username } : null;
  };

  const [users, setUsers] = useState(getInitialUsers);
  const [currentUser, setCurrentUser] = useState(getInitialCurrentUser);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('gst-invoice-app-users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentUser) {
      window.sessionStorage.setItem('gst-invoice-app-current-user', currentUser.username);
      window.localStorage.setItem('gst-invoice-app-current-user', currentUser.username);
    } else {
      window.sessionStorage.removeItem('gst-invoice-app-current-user');
      window.localStorage.removeItem('gst-invoice-app-current-user');
    }
  }, [currentUser]);

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

  const [invoices, setInvoices] = useState(() => {
    const user = getInitialCurrentUser();
    return user ? loadInvoices(user.username) : [];
  });

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

  const [customers, setCustomers] = useState(() => {
    const user = getInitialCurrentUser();
    if (!user || typeof window === 'undefined') return defaultContacts;
    try {
      const saved = window.localStorage.getItem(
        `gst-invoice-app-customers-${user.username}`
      );
      return saved ? JSON.parse(saved) : defaultContacts;
    } catch {
      return defaultContacts;
    }
  });

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

  const [stockItems, setStockItems] = useState(() => {
    const user = getInitialCurrentUser();
    if (!user || typeof window === 'undefined') return defaultStockCatalog;
    try {
      const saved = window.localStorage.getItem(stockStorageKey(user.username));
      return saved ? JSON.parse(saved) : defaultStockCatalog;
    } catch {
      return defaultStockCatalog;
    }
  });

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

  const [purchaseBills, setPurchaseBills] = useState(() => {
    const user = getInitialCurrentUser();
    if (!user || typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(purchasesStorageKey(user.username));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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
  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    // Auto-fill with next number on first load
    const user = getInitialCurrentUser();
    if (!user) return '';
    try {
      const key = `gst-invoice-app-invoices-${user.username}`;
      const saved = window.localStorage.getItem(key);
      const existing = saved ? JSON.parse(saved) : [];
      return getNextInvoiceNumber(existing);
    } catch {
      return 'INV-0001';
    }
  });
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
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

    return {
      subtotal,
      totalGst,
      total: subtotal + totalGst,
    };
  }, [items]);

  const resetInvoice = (currentInvoices) => {
    setCustomerName('');
    setInvoiceNumber(getNextInvoiceNumber(currentInvoices || []));
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setCustomerPhone('');
    setCustomerAddress('');
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
      if (e.key === 'Escape') {
        setActiveMenu(null);
        setShareModal({ isOpen: false, mode: 'pdf', targetInvoice: null });
        setAboutModal(false);
      }
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

    document.addEventListener('mousedown', handleClickOutside);
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
    // Pre-fill invoice number based on last saved invoice
    setInvoiceNumber(getNextInvoiceNumber(userInvoices));
    setActivePage('Dashboard');
  };

  const handleRegister = (newUser) => {
    setUsers((current) => [...current, newUser]);
    setCurrentUser({ username: newUser.username });
    setInvoices([]);
    // First invoice for new user starts at 0001
    setInvoiceNumber('INV-0001');
    setActivePage('Dashboard');
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out from Tread?')) {
      resetInvoice([]);
      setCurrentUser(null);
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

  // Download PDF helper passing current company profile
  const handleDownloadPDF = (inv) => {
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
          {Object.keys(menus).map((menu) => (
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
          ))}
        </div>
      </div>

      {/* ================= SECONDARY SUB-NAV / STATUS BAR ================= */}
      <div className="sub-navbar">
        <div className="breadcrumb-tag">
          <span>📁 {company?.name || 'Priya Sales'}</span>
          <span className="text-muted">/</span>
          <span className="active-page-name">{activePage}</span>
          {recognitionActive && (
            <span className="badge bg-danger animate-pulse ms-2">
              ● Voice Active
            </span>
          )}
        </div>

        {/* Quick Favourites Pills */}
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
              🔒 Locked
            </span>
          )}
        </div>
      </div>

      {/* ================= MAIN PAGE VIEWPORT ================= */}
      <main className="content-area">
        {renderActiveView()}
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
    </div>
  );
}

export default Index;