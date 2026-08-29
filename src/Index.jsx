import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
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

// Constants & Custom Hooks
import { MENUS, ALL_SHORTCUTS } from './constants/navigation.js';
import { useVoiceAssistant } from './hooks/useVoiceAssistant.js';

// Services
import { getNextInvoiceNumber } from './services/invoiceStorage.js';
import { syncAllUsersFromCloud, getLocalUsers } from './services/authApi.js';
import { syncUserDataToCloud, fetchUserDataFromCloud } from './services/firebase.js';

// Lazy Loaded Dialog Modals
const ShareInvoiceModal = lazy(() => import('./Components/Communication/ShareInvoiceModal.jsx'));
const AboutModal = lazy(() => import('./Components/Help/AboutModal.jsx'));
const CloudSyncModal = lazy(() => import('./Components/Communication/CloudSyncModal.jsx'));
const ExitConfirmModal = lazy(() => import('./Components/Communication/ExitConfirmModal.jsx'));

// Capacitor Native Platform Support
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

function Index() {
  // =========================================================
  // USER AUTHENTICATION STATE & CLOUD SYNC
  // =========================================================
  const [users, setUsers] = useState(getLocalUsers);
  const [currentUser, setCurrentUser] = useState(null);

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
    window.sessionStorage.removeItem('gst-invoice-app-current-user');
    window.localStorage.removeItem('gst-invoice-app-current-user');
  }, [users]);

  // Prompt before unload if logged in
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
    window.localStorage.setItem(invoiceStorageKey(currentUser.username), JSON.stringify(invoices));
  }, [invoices, currentUser]);

  // =========================================================
  // CUSTOMERS STATE
  // =========================================================
  const customersStorageKey = (username) => `gst-invoice-app-customers-${username || 'default'}`;

  const [customers, setCustomers] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(customersStorageKey(currentUser?.username));
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
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(stockStorageKey(currentUser?.username));
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

  const [purchaseBills, setPurchaseBills] = useState([]);

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

    const isRegistered = customers.some(
      (c) => c.name.trim().toLowerCase() === customerName.trim().toLowerCase()
    );
    if (!isRegistered) {
      alert(
        `❌ Error: Customer "${customerName.trim()}" is not saved in your Customers folder.\n\nPlease select a saved customer or register them in the Customer folder first.`
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
    alert(`✓ Invoice ${calculatedInvoiceNumber} saved successfully!`);
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
  }, [mobileDrawerOpen, exitConfirmModal.isOpen, cloudSyncModalOpen, shareModal.isOpen, aboutModal, activePage, currentUser]);

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
        setActivePage(null);
        return;
      }

      if (isTyping) return;

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
      alert('✓ Unsaved invoice draft cleared.');
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
  // ON-DEMAND MANUAL CLOUD SYNC CONTROLS
  // =========================================================
  const [cloudSyncStatus, setCloudSyncStatus] = useState('idle');
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('gst-invoice-app-last-cloud-sync') || null;
  });

  const handleForceCloudSync = async () => {
    if (!currentUser?.username) return;
    setCloudSyncStatus('syncing');
    const targetUser = currentUser.username.toLowerCase();

    try {
      const cloudRes = await fetchUserDataFromCloud(targetUser);
      if (cloudRes.success && cloudRes.data) {
        const cloudInvoices = cloudRes.data.invoices || [];
        const cloudCustomers = cloudRes.data.customers || [];
        const cloudStock = cloudRes.data.stockItems || [];
        const cloudPurchases = cloudRes.data.purchaseBills || [];

        const combinedInvoicesMap = new Map();
        cloudInvoices.forEach((inv) => combinedInvoicesMap.set(inv.id || inv.invoiceNumber, inv));
        invoices.forEach((inv) => combinedInvoicesMap.set(inv.id || inv.invoiceNumber, inv));
        const mergedInvoices = Array.from(combinedInvoicesMap.values());

        setInvoices(mergedInvoices);
        if (cloudCustomers.length > 0) setCustomers(cloudCustomers);
        if (cloudStock.length > 0) setStockItems(cloudStock);
        if (cloudPurchases.length > 0) setPurchaseBills(cloudPurchases);
        if (cloudRes.data.company?.name) setCompany(cloudRes.data.company);
        if (cloudRes.data.settings) setSettings(cloudRes.data.settings);

        await syncUserDataToCloud(targetUser, {
          invoices: mergedInvoices,
          customers: cloudCustomers.length > 0 ? cloudCustomers : customers,
          stockItems: cloudStock.length > 0 ? cloudStock : stockItems,
          purchaseBills: cloudPurchases.length > 0 ? cloudPurchases : purchaseBills,
          company: cloudRes.data.company?.name ? cloudRes.data.company : company,
          settings: cloudRes.data.settings || settings,
        });
      } else {
        await syncUserDataToCloud(targetUser, {
          invoices,
          customers,
          stockItems,
          purchaseBills,
          company,
          settings,
        });
      }
      const syncTimestamp = new Date().toLocaleTimeString('en-IN');
      setCloudSyncStatus('synced');
      setLastSyncTime(syncTimestamp);
      window.localStorage.setItem('gst-invoice-app-last-cloud-sync', syncTimestamp);
      return { success: true };
    } catch (err) {
      console.error(err);
      setCloudSyncStatus('error');
      throw err;
    }
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
      return { success: true };
    } catch (err) {
      console.error(err);
      setCloudSyncStatus('error');
      throw err;
    }
  };

  const handlePullFromCloud = async () => {
    if (!currentUser?.username) return;
    setCloudSyncStatus('syncing');
    const targetUser = currentUser.username.toLowerCase();

    try {
      const cloudRes = await fetchUserDataFromCloud(targetUser);
      if (cloudRes.success && cloudRes.data) {
        const d = cloudRes.data;
        if (Array.isArray(d.invoices)) {
          setInvoices(d.invoices);
          window.localStorage.setItem(invoiceStorageKey(targetUser), JSON.stringify(d.invoices));
        }
        if (Array.isArray(d.customers)) {
          setCustomers(d.customers);
          window.localStorage.setItem(customersStorageKey(targetUser), JSON.stringify(d.customers));
        }
        if (Array.isArray(d.stockItems)) {
          setStockItems(d.stockItems);
          window.localStorage.setItem(stockStorageKey(targetUser), JSON.stringify(d.stockItems));
        }
        if (Array.isArray(d.purchaseBills)) {
          setPurchaseBills(d.purchaseBills);
          window.localStorage.setItem(`gst-invoice-app-purchases-${targetUser}`, JSON.stringify(d.purchaseBills));
        }
        if (d.company && d.company.name) {
          setCompany(d.company);
          window.localStorage.setItem('gst-invoice-app-company', JSON.stringify(d.company));
        }
        if (d.settings && Object.keys(d.settings).length > 0) {
          setSettings(d.settings);
          window.localStorage.setItem('gst-invoice-app-settings', JSON.stringify(d.settings));
        }
      }
      const syncTimestamp = new Date().toLocaleTimeString('en-IN');
      setCloudSyncStatus('synced');
      setLastSyncTime(syncTimestamp);
      window.localStorage.setItem('gst-invoice-app-last-cloud-sync', syncTimestamp);
      return { success: true };
    } catch (err) {
      console.error(err);
      setCloudSyncStatus('error');
      throw err;
    }
  };

  // Auth Handlers
  const handleLogin = async (rawUsername) => {
    const username = (rawUsername || 'admin').toLowerCase().trim();
    const userInvoices = loadInvoices(username);
    setCurrentUser({ username });

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
    setCloudSyncStatus('idle');

    setInvoiceNumber(getNextInvoiceNumber(userInvoices));
    setActivePage(null);
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
    setCustomers([]);
    setStockItems([]);
    setPurchaseBills([]);
    setInvoiceNumber('1001/2026-27');
    setActivePage(null);
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
        onInitiateLogout={initiateLogout}
      />

      {/* ================= MAIN PAGE VIEWPORT ================= */}
      <main className="content-area">
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
        © {new Date().getFullYear()} {company?.name ? `${company.name} | ` : ''}Tread GST Invoicing &amp; Accounting
      </footer>

      {/* ================= FIXED MOBILE BOTTOM APP BAR ================= */}
      <MobileBottomBar
        currentUser={currentUser}
        activePage={activePage}
        onNavigate={setActivePage}
        onToggleMobileDrawer={() => setMobileDrawerOpen((prev) => !prev)}
      />

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
      </Suspense>
    </div>
  );
}

export default Index;