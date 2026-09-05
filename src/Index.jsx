import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { v4 as uuidv4 } from 'uuid';

import './index.css';

// Immediate Eager Component for Fast Login Screen Paint (< 0.5s LCP)
import Login from './Components/Login/Login.jsx';

// Navigation & Routing Components
import TopNavbar from './Components/Navigation/TopNavbar.jsx';
import SubNavbar from './Components/Navigation/SubNavbar.jsx';
import MobileDrawer from './Components/Navigation/MobileDrawer.jsx';
import MobileBottomBar from './Components/Navigation/MobileBottomBar.jsx';
import ViewRouter from './Components/ViewRouter.jsx';

// Tread AI Assistant Components
import TreadAICopilot from './Components/AI/TreadAICopilot.jsx';
import FloatingAiButton from './Components/AI/FloatingAiButton.jsx';

// Constants & Custom Hooks
import { MENUS, ALL_SHORTCUTS } from './constants/navigation.js';
import { useVoiceAssistant } from './hooks/useVoiceAssistant.js';

// Services
import { getNextInvoiceNumber } from './services/invoiceStorage.js';
import { syncAllUsersFromCloud, getLocalUsers } from './services/authApi.js';
import { syncUserDataToCloud, fetchUserDataFromCloud, subscribeUserDataFromCloud } from './services/firebase.js';
import { GST_STATE_CODES } from './services/gstinValidator.js';
import { DEFAULT_UNIT } from './constants/units.js';

// Lazy Loaded Dialog Modals
const ShareInvoiceModal = lazy(() => import('./Components/Communication/ShareInvoiceModal.jsx'));
const AboutModal = lazy(() => import('./Components/Help/AboutModal.jsx'));
const CloudSyncModal = lazy(() => import('./Components/Communication/CloudSyncModal.jsx'));
const ExitConfirmModal = lazy(() => import('./Components/Communication/ExitConfirmModal.jsx'));
const AppAccessModal = lazy(() => import('./Components/Modals/AppAccessModal.jsx'));

// Capacitor Native Platform Support
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

const getSavedCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem('gst-invoice-app-current-user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.username) return parsed;
    }
  } catch {
    // ignore
  }
  return null;
};

function Index() {
  // =========================================================
  // USER AUTHENTICATION STATE & CLOUD SYNC
  // =========================================================
  const [users, setUsers] = useState(getLocalUsers);
  const [currentUser, setCurrentUser] = useState(getSavedCurrentUser);
  const [cloudNotice, setCloudNotice] = useState(null);
  const isRemoteSyncingRef = useRef(false);

  // Sync users from Cloud Firestore on application startup
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
  }, [users]);

  // Persist logged-in user in localStorage across app restarts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentUser?.username) {
      window.localStorage.setItem('gst-invoice-app-current-user', JSON.stringify(currentUser));
    } else {
      window.localStorage.removeItem('gst-invoice-app-current-user');
    }
  }, [currentUser]);

  // =========================================================
  // COMPANY & SETTINGS STATE
  // =========================================================
  const [company, setCompany] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = window.localStorage.getItem('gst-invoice-app-company');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name === 'Priya Sales' && parsed?.gstin === '07AAAAA0000A1Z5') {
          return {
            name: '',
            gstin: '',
            pan: '',
            fssai: '',
            email: '',
            phone: '',
            address: '',
            cityState: '',
            pincode: '',
            state: '',
            bankName: '',
            accountNumber: '',
            ifsc: '',
            branch: '',
            logo: '',
            terms: '1. Payment due upon receipt of invoice.\n2. Goods once sold are not refundable.',
          };
        }
        return parsed;
      }
      return {
        name: '',
        gstin: '',
        pan: '',
        fssai: '',
        email: '',
        phone: '',
        address: '',
        cityState: '',
        pincode: '',
        state: '',
        bankName: '',
        accountNumber: '',
        ifsc: '',
        branch: '',
        logo: '',
        terms: '1. Payment due upon receipt of invoice.\n2. Goods once sold are not refundable.',
      };
    } catch {
      return {};
    }
  });

  const [settings, setSettings] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = window.localStorage.getItem('gst-invoice-app-settings');
      return saved
        ? JSON.parse(saved)
        : {
            defaultGst: '18',
            currencySymbol: 'â‚¹',
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
    const savedUser = getSavedCurrentUser();
    return savedUser?.username ? loadInvoices(savedUser.username) : [];
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return;
    window.localStorage.setItem(invoiceStorageKey(currentUser.username), JSON.stringify(invoices));
  }, [invoices, currentUser]);

  // =========================================================
  // CUSTOMERS STATE
  // =========================================================
  const customersStorageKey = (username) => `gst-invoice-app-customers-${username || 'default'}`;

  const [customers, setCustomers] = useState(() => {
    const savedUser = getSavedCurrentUser();
    if (typeof window === 'undefined' || !savedUser?.username) return [];
    try {
      const saved = window.localStorage.getItem(customersStorageKey(savedUser.username));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return;
    window.localStorage.setItem(customersStorageKey(currentUser.username), JSON.stringify(customers));
  }, [customers, currentUser]);

  const handleSaveCustomers = (updatedCustomers) => {
    setCustomers(updatedCustomers);
  };

  const handleDeleteCustomer = (id) => {
    setCustomers((current) => current.filter((c) => c.id !== id));
  };

  const handleLoadCustomerToInvoice = (customer) => {
    setCustomerName(customer.name || '');
    setCustomerPhone(customer.phone || '');
    setCustomerAddress(customer.address || '');
    setActivePage('Add Sales');
  };

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
  // STOCK / INVENTORY DATA STATE
  // =========================================================
  const stockStorageKey = (username) => `gst-invoice-app-stock-${username || 'default'}`;

  const [stockItems, setStockItems] = useState(() => {
    const savedUser = getSavedCurrentUser();
    if (typeof window === 'undefined' || !savedUser?.username) return [];
    try {
      const saved = window.localStorage.getItem(stockStorageKey(savedUser.username));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return;
    window.localStorage.setItem(stockStorageKey(currentUser.username), JSON.stringify(stockItems));
  }, [stockItems, currentUser]);

  const handleSaveStock = (updatedStock) => {
    setStockItems(updatedStock);
  };

  // =========================================================
  // PURCHASE BILLS STATE
  // =========================================================
  const purchasesStorageKey = (username) => `gst-invoice-app-purchases-${username || 'default'}`;

  const loadPurchaseBills = (username) => {
    if (typeof window === 'undefined' || !username) return [];
    try {
      const saved = window.localStorage.getItem(purchasesStorageKey(username));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const [purchaseBills, setPurchaseBills] = useState(() => {
    const savedUser = getSavedCurrentUser();
    return savedUser?.username ? loadPurchaseBills(savedUser.username) : [];
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return;
    window.localStorage.setItem(purchasesStorageKey(currentUser.username), JSON.stringify(purchaseBills));
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
  const [invoiceType, setInvoiceType] = useState('local');
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
        hsn: itemData.hsn || '',
        unit: itemData.unit || DEFAULT_UNIT,
        quantity: Number(itemData.quantity) || 1,
        rate: Number(itemData.rate) || 0,
        gstPercent: Number(itemData.gstPercent) || 18,
      },
    ]);
  };

  // Text fields (description, HSN code, unit) must stay as text - only the
  // actual number fields (quantity, rate, gstPercent) should be converted
  // to numbers. Forcing every field through Number() previously turned a
  // typed unit like "PCS" into 0 the moment it was edited in the table.
  const TEXT_ITEM_FIELDS = ['description', 'hsn', 'unit'];

  const updateItem = (id, field, value) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: TEXT_ITEM_FIELDS.includes(field) ? value : Number(value) || 0,
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

    const matchedCustomer = customers.find(
      (c) => c.name.trim().toLowerCase() === customerName.trim().toLowerCase()
    );
    if (!matchedCustomer) {
      alert(
        `âŒ Error: Customer "${customerName.trim()}" is not saved in your Customers folder.\n\nPlease select a saved customer or register them in the Customer folder first.`
      );
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one line item.');
      return;
    }

    const calculatedInvoiceNumber = invoiceNumber.trim() || getNextInvoiceNumber(invoices);

    // Pull the customer's GSTIN from their saved contact card so it travels
    // with the invoice (needed for GST reports, exports, and the printed PDF).
    const buyerGstin = (matchedCustomer.gstin || '').trim().toUpperCase();
    const isCentral = invoiceType === 'central';

    // Work out "Place of Supply" / customer state. If the customer has a
    // valid 15-char GSTIN, its first 2 digits are the official state code -
    // that's the real, correct place of supply. If they don't have one
    // (a normal walk-in/retail customer), there is no dedicated "customer
    // state" field yet, so we fall back to our own business's state - which
    // is accurate for the common same-state sale, but is a known
    // approximation for an inter-state sale to a non-GSTIN customer.
    let placeOfSupply = (company.state || '').trim();
    if (buyerGstin.length === 15) {
      const buyerStateCode = buyerGstin.slice(0, 2);
      const buyerStateName = GST_STATE_CODES[buyerStateCode];
      if (buyerStateName) {
        placeOfSupply = `${buyerStateName} (${buyerStateCode})`;
      }
    }

    const newInvoice = {
      id: uuidv4(),
      customerName: customerName.trim(),
      invoiceNumber: calculatedInvoiceNumber,
      invoiceDate,
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      customerGstin: buyerGstin,
      customerState: placeOfSupply,
      placeOfSupply,
      invoiceType,
      isInterState: isCentral,
      items,
      totals,
      createdAt: new Date().toISOString(),
    };

    const updatedInvoices = [newInvoice, ...invoices];
    setInvoices(updatedInvoices);

    // Deduct sold quantity from inventory
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
    alert(`âœ“ Invoice ${calculatedInvoiceNumber} saved successfully!`);
  };

  // =========================================================
  // ACTIVE SCREEN & NAVIGATION STATE
  // =========================================================
  const [activeMenu, setActiveMenu] = useState(null);
  const [activePage, setActivePage] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [shareModal, setShareModal] = useState({ isOpen: false, mode: 'pdf', targetInvoice: null });
  const [aboutModal, setAboutModal] = useState(false);
  const [cloudSyncModalOpen, setCloudSyncModalOpen] = useState(false);
  const [exitConfirmModal, setExitConfirmModal] = useState({ isOpen: false, type: 'logout' });
  const [aiCopilotOpen, setAiCopilotOpen] = useState(false);
  const [appAccessModalOpen, setAppAccessModalOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const dontShow = window.localStorage.getItem('tread-access-dont-show-again');
      return !dontShow;
    } catch {
      return true;
    }
  });

  const [expandedMobileGroups, setExpandedMobileGroups] = useState({
    Transactions: true,
    Administration: true,
    GST: false,
    Display: false,
    Company: false,
    'Print/Email/SMS': false,
    'House-Keeping': false,
    Help: false,
  });

  const toggleMobileGroup = (group) => {
    setExpandedMobileGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const [openSubSections, setOpenSubSections] = useState({});

  const toggleSubSection = (key) => {
    setOpenSubSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // =========================================================
  // CAPACITOR NATIVE ANDROID INTEGRATION
  // =========================================================
  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      try {
        StatusBar.setStyle({ style: Style.Dark });
        StatusBar.setBackgroundColor({ color: '#0f172a' });
        SplashScreen.hide();
      } catch (err) {
        console.warn('Capacitor native UI notice:', err);
      }

      const backListener = CapApp.addListener('backButton', () => {
        if (mobileDrawerOpen) {
          setMobileDrawerOpen(false);
        } else if (appAccessModalOpen) {
          setAppAccessModalOpen(false);
        } else if (aiCopilotOpen) {
          setAiCopilotOpen(false);
        } else if (exitConfirmModal.isOpen) {
          setExitConfirmModal({ isOpen: false, type: 'logout' });
        } else if (cloudSyncModalOpen) {
          setCloudSyncModalOpen(false);
        } else if (shareModal.isOpen) {
          setShareModal({ isOpen: false, mode: 'pdf', targetInvoice: null });
        } else if (aboutModal) {
          setAboutModal(false);
        } else if (activePage) {
          setActivePage(null);
        } else if (currentUser) {
          setExitConfirmModal({ isOpen: true, type: 'exit' });
        } else {
          CapApp.exitApp();
        }
      });

      return () => {
        backListener.then((handle) => handle.remove()).catch(() => {});
      };
    }
  }, [mobileDrawerOpen, appAccessModalOpen, aiCopilotOpen, exitConfirmModal.isOpen, cloudSyncModalOpen, shareModal.isOpen, aboutModal, activePage, currentUser]);

  const [favourites, setFavourites] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem('gst-invoice-app-favourites');
      return saved
        ? JSON.parse(saved)
        : ['Dashboard', 'Add Sales', 'List Sales', 'Add Purchase', 'List Account', 'List Items', 'Reports'];
    } catch {
      return ['Dashboard', 'Add Sales', 'List Sales', 'Add Purchase', 'List Account', 'List Items', 'Reports'];
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
    setActivePage('Add Sales');
  };

  const deleteInvoice = (id) => {
    setInvoices((current) => current.filter((i) => i.id !== id));
  };

  const clearAllInvoices = () => {
    setInvoices([]);
  };

  // =========================================================
  // VOICE ASSISTANT CUSTOM HOOK
  // =========================================================
  const {
    voiceSupported,
    recognitionActive,
    setRecognitionActive,
    voiceTranscript,
  } = useVoiceAssistant({
    onResetInvoice: () => resetInvoice(invoices),
    onSaveInvoice: saveInvoice,
    onSetCustomerName: setCustomerName,
    onSetInvoiceNumber: setInvoiceNumber,
    onSetCustomerPhone: setCustomerPhone,
    onSetCustomerAddress: setCustomerAddress,
    onAddItem: addItem,
  });

  const menuRef = useRef(null);

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
        setAiCopilotOpen(false);
        setActivePage(null);
        return;
      }

      if (isTyping) return;

      // Alt + A -> Toggle Tread AI Copilot
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAiCopilotOpen((prev) => !prev);
      }
      // Alt + N -> New Invoice
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActivePage('Add Sales');
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
  }, [setRecognitionActive]);

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

    // AI Copilot Actions
    if (
      option === '✨ Tread AI Copilot' ||
      option === 'Tread AI Copilot' ||
      option === 'Tread AI' ||
      option === 'AI Copilot'
    ) {
      setAiCopilotOpen(true);
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

    // Administration Actions
    if (
      option === 'Master Item Catalog & API' ||
      option === 'Master Item Catalog' ||
      option === 'Add Item (Master Catalog & API)' ||
      option === 'Item API'
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
    if (option === 'App Permissions & Access' || option === 'App Permissions' || option === 'Device Access & Permissions') {
      setAppAccessModalOpen(true);
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
    if (option === 'Create Transaction' || option === 'Add Sales') {
      setActivePage('Add Sales');
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
    if (option === 'Customers' || option === 'List Account') {
      setActivePage('List Account');
      return;
    }
    if (option === 'Stock Inventory' || option === 'Stock' || option === 'Inventory' || option === 'List Items') {
      setActivePage('List Items');
      return;
    }

    // Display Actions
    if (option === 'Dashboard') {
      setActivePage('Dashboard');
      return;
    }
    if (option === 'All Transactions' || option === 'List Sales') {
      setActivePage('List Sales');
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
      alert('âœ“ Unsaved invoice draft cleared.');
      return;
    }

    // Favourites Actions
    if (option === 'Add to Favourites') {
      if (activePage) {
        toggleFavourite(activePage);
        alert(`Updated favourites for "${activePage}"!`);
      }
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

  // =========================================================
  // CLOUD SYNC & DATA EXTRACTION ENGINE
  // =========================================================
  const [cloudSyncStatus, setCloudSyncStatus] = useState('idle');
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('gst-invoice-app-last-cloud-sync') || null;
  });

  // Apply cloud data payload into app state and localStorage
  const applyCloudData = useCallback((cloudData, username) => {
    if (!cloudData) return;
    const targetUser = (username || 'admin').toLowerCase().trim();
    isRemoteSyncingRef.current = true;

    try {
      // 1. Invoices
      if (Array.isArray(cloudData.invoices)) {
        setInvoices((prevLocal) => {
          const map = new Map();
          cloudData.invoices.forEach((inv) => map.set(inv.id || inv.invoiceNumber, inv));
          (prevLocal || []).forEach((inv) => map.set(inv.id || inv.invoiceNumber, inv));
          const merged = Array.from(map.values());
          window.localStorage.setItem(invoiceStorageKey(targetUser), JSON.stringify(merged));
          return merged;
        });
      }

      // 2. Customers
      if (Array.isArray(cloudData.customers)) {
        setCustomers((prevLocal) => {
          const map = new Map();
          cloudData.customers.forEach((c) => map.set(c.id || (c.name ? c.name.toLowerCase() : null), c));
          (prevLocal || []).forEach((c) => map.set(c.id || (c.name ? c.name.toLowerCase() : null), c));
          const merged = Array.from(map.values());
          window.localStorage.setItem(customersStorageKey(targetUser), JSON.stringify(merged));
          return merged;
        });
      }

      // 3. Stock Items
      if (Array.isArray(cloudData.stockItems)) {
        setStockItems((prevLocal) => {
          const map = new Map();
          cloudData.stockItems.forEach((s) => map.set(s.id || (s.name ? s.name.toLowerCase() : null), s));
          (prevLocal || []).forEach((s) => map.set(s.id || (s.name ? s.name.toLowerCase() : null), s));
          const merged = Array.from(map.values());
          window.localStorage.setItem(stockStorageKey(targetUser), JSON.stringify(merged));
          return merged;
        });
      }

      // 4. Purchase Bills
      if (Array.isArray(cloudData.purchaseBills)) {
        setPurchaseBills((prevLocal) => {
          const map = new Map();
          cloudData.purchaseBills.forEach((p) => map.set(p.id || p.billNumber, p));
          (prevLocal || []).forEach((p) => map.set(p.id || p.billNumber, p));
          const merged = Array.from(map.values());
          window.localStorage.setItem(`gst-invoice-app-purchases-${targetUser}`, JSON.stringify(merged));
          return merged;
        });
      }

      // 5. Company Details
      if (cloudData.company && cloudData.company.name) {
        setCompany((prev) => {
          const updated = { ...prev, ...cloudData.company };
          window.localStorage.setItem('gst-invoice-app-company', JSON.stringify(updated));
          return updated;
        });
      }

      // 6. Settings
      if (cloudData.settings && Object.keys(cloudData.settings).length > 0) {
        setSettings((prev) => {
          const updated = { ...prev, ...cloudData.settings };
          window.localStorage.setItem('gst-invoice-app-settings', JSON.stringify(updated));
          return updated;
        });
      }

      const syncTimestamp = new Date().toLocaleTimeString('en-IN');
      setCloudSyncStatus('synced');
      setLastSyncTime(syncTimestamp);
      window.localStorage.setItem('gst-invoice-app-last-cloud-sync', syncTimestamp);
      setCloudNotice({
        type: 'success',
        message: `✓ Extracted latest cloud data for "${targetUser}" (${syncTimestamp})`,
      });
      setTimeout(() => setCloudNotice(null), 4000);
    } finally {
      setTimeout(() => {
        isRemoteSyncingRef.current = false;
      }, 500);
    }
  }, []);

  // Extract user's complete data from Firebase Cloud Firestore
  const extractUserDataFromCloud = useCallback(
    async (explicitUser) => {
      const targetUser = (explicitUser || currentUser?.username || 'admin').toLowerCase().trim();
      if (!targetUser) return { success: false };

      setCloudSyncStatus('syncing');
      setCloudNotice({
        type: 'info',
        message: `☁️ Extracting data from cloud for ${targetUser}...`,
      });

      try {
        const cloudRes = await fetchUserDataFromCloud(targetUser);
        if (cloudRes.success && cloudRes.data) {
          applyCloudData(cloudRes.data, targetUser);
          return { success: true, count: cloudRes.data.invoices?.length || 0 };
        } else {
          setCloudSyncStatus('idle');
          setCloudNotice(null);
          return { success: false, message: cloudRes.message };
        }
      } catch (err) {
        console.warn('Cloud data extraction notice:', err);
        setCloudSyncStatus('error');
        setCloudNotice({
          type: 'warning',
          message: '⚠️ Working in offline mode (using local cached data)',
        });
        setTimeout(() => setCloudNotice(null), 4000);
        return { success: false, error: err.message };
      }
    },
    [currentUser?.username, applyCloudData]
  );

  // 1. EXTRACT DATA ON APPLICATION STARTUP (When App Opens)
  useEffect(() => {
    const initialUser = getSavedCurrentUser();
    if (initialUser?.username) {
      Promise.resolve().then(() => {
        extractUserDataFromCloud(initialUser.username);
      });
    }
  }, [extractUserDataFromCloud]);

  // 2. EXTRACT DATA WHEN APP IS BROUGHT TO FOREGROUND / RE-OPENED (Tab Visibility)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUser?.username) {
        extractUserDataFromCloud(currentUser.username);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser?.username, extractUserDataFromCloud]);

  // 3. EXTRACT DATA ON MOBILE APP RESUME (Capacitor Native Platform)
  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      const appStateHandle = CapApp.addListener('appStateChange', (state) => {
        if (state.isActive && currentUser?.username) {
          extractUserDataFromCloud(currentUser.username);
        }
      });

      return () => {
        appStateHandle.then((h) => h.remove()).catch(() => {});
      };
    }
  }, [currentUser?.username, extractUserDataFromCloud]);

  // 4. REAL-TIME CROSS-DEVICE SNAPSHOT SUBSCRIPTION
  useEffect(() => {
    if (!currentUser?.username) return;
    const unsubscribe = subscribeUserDataFromCloud(currentUser.username, (cloudData) => {
      applyCloudData(cloudData, currentUser.username);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [currentUser?.username, applyCloudData]);

  // 5. DEBOUNCED AUTO-SAVE TO CLOUD ON LOCAL DATA CHANGES
  useEffect(() => {
    if (!currentUser?.username || isRemoteSyncingRef.current) return;

    const timer = setTimeout(() => {
      syncUserDataToCloud(currentUser.username, {
        invoices,
        customers,
        stockItems,
        purchaseBills,
        company,
        settings,
      })
        .then((res) => {
          if (res?.success) {
            const syncTimestamp = new Date().toLocaleTimeString('en-IN');
            setCloudSyncStatus('synced');
            setLastSyncTime(syncTimestamp);
            window.localStorage.setItem('gst-invoice-app-last-cloud-sync', syncTimestamp);
          }
        })
        .catch(() => {});
    }, 2500);

    return () => clearTimeout(timer);
  }, [invoices, customers, stockItems, purchaseBills, company, settings, currentUser?.username]);

  // Manual Cloud Sync Handlers
  const handleForceCloudSync = async () => {
    if (!currentUser?.username) return;
    return await extractUserDataFromCloud(currentUser.username);
  };

  const handlePushToCloud = async () => {
    if (!currentUser?.username) return;
    setCloudSyncStatus('syncing');
    const targetUser = currentUser.username.toLowerCase();

    try {
      await syncUserDataToCloud(targetUser, {
        invoices,
        customers,
        stockItems,
        purchaseBills,
        company,
        settings,
      });
      const syncTimestamp = new Date().toLocaleTimeString('en-IN');
      setCloudSyncStatus('synced');
      setLastSyncTime(syncTimestamp);
      window.localStorage.setItem('gst-invoice-app-last-cloud-sync', syncTimestamp);
      setCloudNotice({
        type: 'success',
        message: `✓ Pushed local data to cloud for "${targetUser}" (${syncTimestamp})`,
      });
      setTimeout(() => setCloudNotice(null), 4000);
      return { success: true };
    } catch (err) {
      console.error(err);
      setCloudSyncStatus('error');
      throw err;
    }
  };

  const handlePullFromCloud = async () => {
    if (!currentUser?.username) return;
    return await extractUserDataFromCloud(currentUser.username);
  };

  // Auth Handlers
  const handleLogin = async (rawUsername) => {
    const username = (rawUsername || 'admin').toLowerCase().trim();
    const userInvoices = loadInvoices(username);
    const userObj = { username };
    setCurrentUser(userObj);
    window.localStorage.setItem('gst-invoice-app-current-user', JSON.stringify(userObj));

    let loadedCust = [];
    try {
      const savedCust = window.localStorage.getItem(`gst-invoice-app-customers-${username}`);
      if (savedCust) loadedCust = JSON.parse(savedCust);
    } catch {
      loadedCust = [];
    }
    setCustomers(loadedCust);

    let loadedStock = [];
    try {
      const savedStock = window.localStorage.getItem(`gst-invoice-app-stock-${username}`);
      if (savedStock) loadedStock = JSON.parse(savedStock);
    } catch {
      loadedStock = [];
    }
    setStockItems(loadedStock);

    let loadedPurchases = [];
    try {
      const savedPurchases = window.localStorage.getItem(`gst-invoice-app-purchases-${username}`);
      if (savedPurchases) loadedPurchases = JSON.parse(savedPurchases);
    } catch {
      loadedPurchases = [];
    }
    setPurchaseBills(loadedPurchases);
    setInvoices(userInvoices);

    setInvoiceNumber(getNextInvoiceNumber(userInvoices));
    setActivePage(null);

    // Immediately extract user's data from Cloud Firestore on login!
    extractUserDataFromCloud(username);
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
    const userObj = { username: newUser.username };
    setCurrentUser(userObj);
    window.localStorage.setItem('gst-invoice-app-current-user', JSON.stringify(userObj));
    setInvoices([]);
    setCustomers([]);
    setStockItems([]);
    setPurchaseBills([]);
    setInvoiceNumber('1001/2026-27');
    setActivePage(null);

    // Extract cloud data
    extractUserDataFromCloud(newUser.username);
  };

  const executeLogout = () => {
    resetInvoice([]);
    setCurrentUser(null);
    setInvoices([]);
    setPurchaseBills([]);
    window.sessionStorage.removeItem('gst-invoice-app-current-user');
    window.localStorage.removeItem('gst-invoice-app-current-user');
    setExitConfirmModal({ isOpen: false, type: 'logout' });
    setActivePage(null);
  };

  const initiateLogout = () => {
    setExitConfirmModal({ isOpen: true, type: 'logout' });
  };

  const handleSyncAndProceedExitOrLogout = async () => {
    await handleForceCloudSync();
    if (exitConfirmModal.type === 'exit') {
      window.sessionStorage.removeItem('gst-invoice-app-current-user');
      window.localStorage.removeItem('gst-invoice-app-current-user');
      if (Capacitor.isNativePlatform()) {
        CapApp.exitApp();
      } else {
        executeLogout();
      }
    } else {
      executeLogout();
    }
  };

  const handleProceedWithoutSync = () => {
    if (exitConfirmModal.type === 'exit') {
      window.sessionStorage.removeItem('gst-invoice-app-current-user');
      window.localStorage.removeItem('gst-invoice-app-current-user');
      if (Capacitor.isNativePlatform()) {
        CapApp.exitApp();
      } else {
        executeLogout();
      }
    } else {
      executeLogout();
    }
  };

  // Download PDF helper
  const handleDownloadPDF = async (inv) => {
    const { default: downloadPDF } = await import('./Components/DownloadInvoice/Invoice.jsx');
    downloadPDF(inv, company);
  };

  return (
    <div className="menu-container" ref={menuRef}>
      {/* ================= TOP NAVIGATION BAR ================= */}
      <TopNavbar
        currentUser={currentUser}
        menus={MENUS}
        activeMenu={activeMenu}
        onMenuClick={handleMenuClick}
        onOptionClick={handleOptionClick}
        openSubSections={openSubSections}
        onToggleSubSection={toggleSubSection}
        mobileDrawerOpen={mobileDrawerOpen}
        onToggleMobileDrawer={() => setMobileDrawerOpen((prev) => !prev)}
        onBrandClick={() => {
          setActivePage(null);
          setActiveMenu(null);
        }}
      />

      {/* ================= MOBILE SLIDE-DOWN ACCORDION MENU ================= */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        currentUser={currentUser}
        company={company}
        cloudSyncStatus={cloudSyncStatus}
        onOpenCloudSync={() => setCloudSyncModalOpen(true)}
        onInitiateLogout={initiateLogout}
        menus={MENUS}
        expandedGroups={expandedMobileGroups}
        onToggleGroup={toggleMobileGroup}
        openSubSections={openSubSections}
        onToggleSubSection={toggleSubSection}
        activePage={activePage}
        onSelectOption={handleOptionClick}
      />

      {/* ================= SECONDARY SUB-NAV / STATUS BAR ================= */}
      <SubNavbar
        currentUser={currentUser}
        company={company}
        activePage={activePage}
        onClosePage={() => setActivePage(null)}
        recognitionActive={recognitionActive}
        favourites={favourites}
        onSelectFavourite={(fav) => setActivePage(fav)}
        cloudSyncStatus={cloudSyncStatus}
        lastSyncTime={lastSyncTime}
        onOpenCloudSync={() => setCloudSyncModalOpen(true)}
        onOpenAiCopilot={() => setAiCopilotOpen(true)}
        onInitiateLogout={initiateLogout}
      />

      {/* ================= MAIN PAGE VIEWPORT ================= */}
      <main className="content-area">
        {cloudNotice && (
          <div className="container-fluid px-3 pt-2">
            <div
              className={`alert alert-${cloudNotice.type === 'success' ? 'success' : cloudNotice.type === 'warning' ? 'warning' : 'info'} py-2 px-3 d-flex align-items-center justify-content-between mb-2 shadow-xs border`}
              style={{ fontSize: '13px', borderRadius: '8px' }}
              role="alert"
            >
              <div className="d-flex align-items-center gap-2">
                <span>{cloudNotice.message}</span>
              </div>
              <button
                type="button"
                className="btn-close btn-close-sm"
                style={{ fontSize: '10px' }}
                onClick={() => setCloudNotice(null)}
                aria-label="Close"
              />
            </div>
          </div>
        )}
        <Suspense
          fallback={
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading Module...</span>
              </div>
              <div className="text-muted small mt-2">Loading feature module...</div>
            </div>
          }
        >
          {currentUser ? (
            <ViewRouter
              activePage={activePage}
              onNavigate={setActivePage}
              currentUser={currentUser}
              users={users}
              onLogin={handleLogin}
              onRegister={handleRegister}
              company={company}
              onSaveCompany={handleSaveCompany}
              settings={settings}
              onSaveSettings={handleSaveSettings}
              invoices={invoices}
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
              loadInvoiceToEditor={loadInvoiceToEditor}
              deleteInvoice={deleteInvoice}
              clearAllInvoices={clearAllInvoices}
              onDownloadPDF={handleDownloadPDF}
              onShareInvoice={(inv) =>
                setShareModal({ isOpen: true, mode: 'email', targetInvoice: inv })
              }
              customers={customers}
              onSaveCustomers={handleSaveCustomers}
              onSaveSingleCustomer={handleSaveSingleCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onLoadCustomerToInvoice={handleLoadCustomerToInvoice}
              stockItems={stockItems}
              onSaveStock={handleSaveStock}
              purchaseBills={purchaseBills}
              onSavePurchaseBills={handleSavePurchaseBills}
              favourites={favourites}
              onToggleFavourite={toggleFavourite}
              allAvailableShortcuts={ALL_SHORTCUTS}
              voiceSupported={voiceSupported}
              recognitionActive={recognitionActive}
              setRecognitionActive={setRecognitionActive}
              voiceTranscript={voiceTranscript}
              onStartVoice={() => {
                setActivePage('Add Sales');
                setRecognitionActive(true);
              }}
              onOpenAppAccessModal={() => setAppAccessModalOpen(true)}
            />
          ) : (
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
          )}
        </Suspense>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="app-footer text-center py-2 text-muted small border-top bg-white">
        Â© {new Date().getFullYear()} {company?.name ? `${company.name} | ` : ''}Tread GST Invoicing &amp; Accounting
      </footer>

      {/* ================= FIXED MOBILE BOTTOM APP BAR ================= */}
      <MobileBottomBar
        currentUser={currentUser}
        activePage={activePage}
        onNavigate={setActivePage}
        onToggleMobileDrawer={() => setMobileDrawerOpen((prev) => !prev)}
      />

      {/* ================= FLOATING TREAD AI COPILOT BUTTON ================= */}
      {currentUser && (
        <FloatingAiButton onClick={() => setAiCopilotOpen(true)} />
      )}

      {/* ================= MODALS ================= */}
      <Suspense fallback={null}>
        {/* Tread AI Copilot Assistant Modal */}
        {aiCopilotOpen && (
          <TreadAICopilot
            isOpen={aiCopilotOpen}
            onClose={() => setAiCopilotOpen(false)}
            invoices={invoices}
            customers={customers}
            stockItems={stockItems}
            company={company}
            onLoadInvoiceToEditor={loadInvoiceToEditor}
            onSaveCustomer={handleSaveSingleCustomer}
            onAddStockItem={(newItem) => {
              const entry = {
                id: uuidv4(),
                name: newItem.name,
                price: Number(newItem.price) || 0,
                hsn: newItem.hsn || '',
                gst: Number(newItem.gst) || 18,
                stock: Number(newItem.stock) || 0,
                unit: newItem.unit || 'PCS',
                createdAt: new Date().toISOString(),
              };
              setStockItems((prev) => [entry, ...prev]);
            }}
            onNavigate={setActivePage}
          />
        )}

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

        {cloudSyncModalOpen && (
          <CloudSyncModal
            isOpen={cloudSyncModalOpen}
            onClose={() => setCloudSyncModalOpen(false)}
            currentUser={currentUser}
            cloudSyncStatus={cloudSyncStatus}
            lastSyncTime={lastSyncTime}
            onForceSync={handleForceCloudSync}
            onPushToCloud={handlePushToCloud}
            onPullFromCloud={handlePullFromCloud}
            stats={{
              invoiceCount: invoices.length,
              customerCount: customers.length,
              stockCount: stockItems.length,
              purchaseCount: purchaseBills.length,
            }}
          />
        )}

        {exitConfirmModal.isOpen && (
          <ExitConfirmModal
            isOpen={exitConfirmModal.isOpen}
            type={exitConfirmModal.type}
            currentUser={currentUser}
            lastSyncTime={lastSyncTime}
            stats={{
              invoiceCount: invoices.length,
              customerCount: customers.length,
              stockCount: stockItems.length,
              purchaseCount: purchaseBills.length,
            }}
            onSyncAndProceed={handleSyncAndProceedExitOrLogout}
            onProceedWithoutSync={handleProceedWithoutSync}
            onClose={() => setExitConfirmModal({ isOpen: false, type: 'logout' })}
          />
        )}

        {appAccessModalOpen && (
          <AppAccessModal
            isOpen={appAccessModalOpen}
            onClose={() => setAppAccessModalOpen(false)}
          />
        )}
      </Suspense>
    </div>
  );
}

export default Index;
