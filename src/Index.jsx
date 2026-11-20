import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { v4 as uuidv4 } from 'uuid';

import './index.css';

// Immediate Eager Component for Fast Login Screen Paint (< 0.5s LCP)
import Login from './Components/Login/index.jsx';

// Navigation & Routing Components
import { TopNavbar, SubNavbar, MobileDrawer, MobileBottomBar } from './Components/Navigation/index.jsx';
import ViewRouter from './Components/ViewRouter.jsx';

// Tread AI Assistant Components
import { TreadAICopilot, FloatingAiButton } from './Components/AI/index.jsx';
import AppOpeningSequence from './Components/Common/AppOpeningSequence.jsx';

// Constants & Custom Hooks
import { MENUS, ALL_SHORTCUTS } from './constants/navigation.js';
import { useVoiceAssistant } from './hooks/useVoiceAssistant.js';

// Services
import { getNextInvoiceNumber } from './services/invoiceStorage.js';
import { TreadBackend } from './services/treadBackend.js';
import {
  syncAllUsersFromCloud,
  getLocalUsers,
  evaluateSubscriptionStatus,
  renewUserSubscription,
  generateLicenseId,
  ensureValidLicenseId,
  syncUserLicenseStatus,
} from './services/authApi.js';
import { syncUserDataToCloud, fetchUserDataFromCloud, subscribeUserDataFromCloud } from './services/firebase.js';
import { GST_STATE_CODES } from './services/gstinValidator.js';
import { DEFAULT_UNIT } from './constants/units.js';
import { useNetworkStatus } from './services/networkStatus.js';
import { hasFeatureAccess } from './constants/subscriptionPlans.js';

// Lazy Loaded Dialog Modals
const ShareInvoiceModal = lazy(() => import('./Components/Communication/index.jsx').then((m) => ({ default: m.ShareInvoiceModal })));
const AboutModal = lazy(() => import('./Components/Help/index.jsx').then((m) => ({ default: m.AboutModal })));
const CloudSyncModal = lazy(() => import('./Components/Communication/index.jsx').then((m) => ({ default: m.CloudSyncModal })));
const ExitConfirmModal = lazy(() => import('./Components/Communication/index.jsx').then((m) => ({ default: m.ExitConfirmModal })));
const AppAccessModal = lazy(() => import('./Components/Modals/AppAccessModal.jsx'));
import LicenseRenewalModal from './Components/Modals/LicenseRenewalModal.jsx';

// Capacitor Native Platform Support
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

// Require fresh login each time the app is opened: do not auto-login from persistent storage
const getSavedCurrentUser = () => {
  return null;
};

function Index() {
  // =========================================================
  // USER AUTHENTICATION STATE & CLOUD SYNC
  // =========================================================
  const [users, setUsers] = useState(getLocalUsers);
  const [currentUser, setCurrentUser] = useState(null);
  const [cloudNotice, setCloudNotice] = useState(null);
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [isCheckingLicense, setIsCheckingLicense] = useState(false);

  // Evaluate real-time license and subscription validity
  const subscriptionStatus = useMemo(() => {
    return evaluateSubscriptionStatus(currentUser);
  }, [currentUser]);

  // Build a role-filtered menu: Settings is hidden from all users except Master Admin
  const visibleMenus = useMemo(() => {
    if (subscriptionStatus.isAdmin) return MENUS; // Master admin sees everything
    return {
      ...MENUS,
      Administration: {
        ...MENUS.Administration,
        'System & Security': MENUS.Administration['System & Security'].filter(
          (item) => item !== 'Settings'
        ),
      },
    };
  }, [subscriptionStatus.isAdmin]);

  const [isBooting, setIsBooting] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Check if app was already booted in this session to prevent repeated splash on soft navigation
    const alreadyBooted = window.sessionStorage.getItem('tread-session-booted');
    return !alreadyBooted;
  });
  const isRemoteSyncingRef = useRef(false);

  // Auto-detect network status — no manual toggle needed
  const isOnline = useNetworkStatus();

  // Sync users from Cloud Firestore on application startup (only when online)
  useEffect(() => {
    if (!isOnline) return;
    syncAllUsersFromCloud()
      .then((cloudUsers) => {
        if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
          setUsers(cloudUsers);
        }
      })
      .catch(() => {});
  }, [isOnline]);


  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('gst-invoice-app-users', JSON.stringify(users));
  }, [users]);

  // Session-only user tracking: do not auto-restore across app launches
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentUser?.username) {
      window.sessionStorage.setItem('gst-invoice-app-current-user', JSON.stringify(currentUser));
    } else {
      window.sessionStorage.removeItem('gst-invoice-app-current-user');
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
    const savedUser = getSavedCurrentUser();
    return savedUser?.username ? loadInvoices(savedUser.username) : [];
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return;
    window.localStorage.setItem(invoiceStorageKey(currentUser.username), JSON.stringify(invoices));
    TreadBackend.saveEntity('invoices', currentUser.username, invoices);
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
    TreadBackend.saveEntity('customers', currentUser.username, customers);
    TreadBackend.updateCache('customers', customers);
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
    if (customer.gstin && customer.gstin.length >= 2 && company?.gstin && company.gstin.length >= 2) {
      const custState = customer.gstin.slice(0, 2);
      const compState = company.gstin.slice(0, 2);
      setInvoiceType(custState === compState ? 'local' : 'central');
    } else if (customer.address && company?.state) {
      const compStateLower = company.state.toLowerCase().trim();
      const custAddrLower = customer.address.toLowerCase().trim();
      setInvoiceType(custAddrLower.includes(compStateLower) ? 'local' : 'central');
    }
    setActivePage('Add Sales');
  };

  const handleSaveSingleCustomer = (newCust) => {
    if (!newCust?.name?.trim()) {
      alert('Please enter a valid customer name.');
      return;
    }
    const targetName = newCust.name.trim().toLowerCase();
    const exists = customers.some(
      (c) => (c?.name || '').trim().toLowerCase() === targetName
    );
    if (exists) {
      alert(`Customer "${newCust.name.trim()}" is already saved in your directory.`);
      return;
    }
    const newEntry = {
      id: uuidv4(),
      type: 'Customer',
      ...newCust,
      name: newCust.name.trim(),
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newEntry, ...prev]);
    alert(`✓ Customer "${newCust.name.trim()}" saved to your Sales Directory!`);
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
    TreadBackend.saveEntity('stockItems', currentUser.username, stockItems);
    TreadBackend.updateCache('stockItems', stockItems);
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
    TreadBackend.saveEntity('purchaseBills', currentUser.username, purchaseBills);
  }, [purchaseBills, currentUser]);

  const handleSavePurchaseBills = (updatedBills) => {
    setPurchaseBills(updatedBills);
  };

  // =========================================================
  // SALES ORDERS STATE
  // =========================================================
  const salesOrdersStorageKey = (username) => `gst-invoice-app-sales-orders-${username || 'default'}`;

  const loadSalesOrders = (username) => {
    if (typeof window === 'undefined' || !username) return [];
    try {
      const saved = window.localStorage.getItem(salesOrdersStorageKey(username));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const [salesOrders, setSalesOrders] = useState(() => {
    const savedUser = getSavedCurrentUser();
    return savedUser?.username ? loadSalesOrders(savedUser.username) : [];
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return;
    window.localStorage.setItem(salesOrdersStorageKey(currentUser.username), JSON.stringify(salesOrders));
    TreadBackend.saveEntity('salesOrders', currentUser.username, salesOrders);
  }, [salesOrders, currentUser]);

  // =========================================================
  // PURCHASE ORDERS STATE
  // =========================================================
  const purchaseOrdersStorageKey = (username) => `gst-invoice-app-purchase-orders-${username || 'default'}`;

  const loadPurchaseOrders = (username) => {
    if (typeof window === 'undefined' || !username) return [];
    try {
      const saved = window.localStorage.getItem(purchaseOrdersStorageKey(username));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const [purchaseOrders, setPurchaseOrders] = useState(() => {
    const savedUser = getSavedCurrentUser();
    return savedUser?.username ? loadPurchaseOrders(savedUser.username) : [];
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return;
    window.localStorage.setItem(purchaseOrdersStorageKey(currentUser.username), JSON.stringify(purchaseOrders));
    TreadBackend.saveEntity('purchaseOrders', currentUser.username, purchaseOrders);
  }, [purchaseOrders, currentUser]);

  // =========================================================
  // PAYMENTS & RECEIPTS STATE
  // =========================================================
  const paymentsStorageKey = (username) => `gst-invoice-app-payments-${username || 'default'}`;

  const loadPayments = (username) => {
    if (typeof window === 'undefined' || !username) return [];
    try {
      const saved = window.localStorage.getItem(paymentsStorageKey(username));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const [payments, setPayments] = useState(() => {
    const savedUser = getSavedCurrentUser();
    return savedUser?.username ? loadPayments(savedUser.username) : [];
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return;
    window.localStorage.setItem(paymentsStorageKey(currentUser.username), JSON.stringify(payments));
    TreadBackend.saveEntity('payments', currentUser.username, payments);
  }, [payments, currentUser]);

  // 1-Click Convert Sales Order to Invoice
  const handleConvertSalesOrderToInvoice = (order) => {
    if (!order) return;
    setSalesOrderNumber(order.orderNumber || '');
    setCustomerName(order.customerName || '');
    setCustomerPhone(order.customerPhone || '');
    setCustomerAddress(order.customerAddress || '');
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setInvoiceNumber(getNextInvoiceNumber(invoices || []));

    const isInterState =
      company?.state &&
      order.customerState &&
      company.state.trim().toLowerCase() !== order.customerState.trim().toLowerCase();
    setInvoiceType(isInterState ? 'central' : 'local');

    if (Array.isArray(order.items) && order.items.length > 0) {
      setItems(
        order.items.map((it) => {
          const rawRate = Number(it.rate) || 0;
          const discountPct = Number(it.discount) || 0;
          const effectiveRate = discountPct > 0 ? +(rawRate * (1 - discountPct / 100)).toFixed(2) : rawRate;
          return {
            id: uuidv4(),
            description: it.description || 'Order Item',
            hsn: it.hsn || '',
            unit: it.unit || 'PCS',
            quantity: Number(it.qty) || 1,
            rate: effectiveRate,
            gstPercent: Number(it.gstRate) || 18,
          };
        })
      );
    }

    setSalesOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, orderStatus: 'Converted to Invoice' } : o))
    );

    setActivePage('Add Sales');
    alert(`✓ Sales Order ${order.orderNumber} converted to active invoice!`);
  };

  // 1-Click Convert Purchase Order to Purchase Bill
  const handleConvertPOToPurchaseBill = (po) => {
    if (!po) return;
    const subtotal = Number(po.subtotal || po.grandTotal || 0);
    const totalTax = Number(po.totalTax || 0);
    const grandTotal = Number(po.grandTotal || subtotal + totalTax);
    const vendorName = po.vendorName || po.partyName || '';
    const vendorGstin = po.vendorGstin || po.partyGstin || '';

    const newBill = {
      id: 'bill_' + uuidv4(),
      billNumber: `BILL-${po.poNumber}`,
      billDate: new Date().toISOString().slice(0, 10),
      poNumber: po.poNumber || '',
      vendorName: vendorName,
      partyName: vendorName,
      vendorGstin: vendorGstin,
      partyGstin: vendorGstin,
      vendorPhone: po.vendorPhone || '',
      vendorAddress: po.vendorAddress || '',
      totalAmount: grandTotal,
      grandTotal: grandTotal,
      totals: {
        subtotal,
        totalTax,
        grandTotal,
      },
      items: (po.items || []).map((it) => ({
        id: 'item_' + uuidv4(),
        description: it.description || it.name || 'Order Item',
        name: it.description || it.name || 'Order Item',
        hsn: it.hsn || '',
        quantity: Number(it.qty || it.quantity) || 1,
        rate: Number(it.rate || it.purchasePrice) || 0,
        purchasePrice: Number(it.rate || it.purchasePrice) || 0,
        gstPercent: Number(it.gstRate || it.gstPercent) || 18,
        gstRate: Number(it.gstRate || it.gstPercent) || 18,
        unit: it.unit || 'PCS',
        amount: (Number(it.qty || it.quantity) || 1) * (Number(it.rate || it.purchasePrice) || 0),
      })),
      notes: `Converted from PO #${po.poNumber}`,
      createdAt: new Date().toISOString(),
    };

    setPurchaseBills((prev) => [newBill, ...prev]);
    setPurchaseOrders((prev) =>
      prev.map((p) => (p.id === po.id ? { ...p, status: 'Received / Fulfilled', poStatus: 'Converted to Bill' } : p))
    );

    setActivePage('List Purchase');
    alert(`✓ PO ${po.poNumber} converted to Purchase Bill successfully!`);
  };

  // =========================================================
  // ACTIVE INVOICE DRAFT STATE
  // =========================================================
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [salesOrderNumber, setSalesOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [invoiceType, setInvoiceType] = useState('local');
  const [items, setItems] = useState([]);

  const totals = useMemo(() => {
    const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

    const subtotal = round2(
      items.reduce((sum, item) => {
        const q = Number(item.quantity || 1);
        const r = Number(item.rate || 0);
        return sum + q * r;
      }, 0)
    );

    const totalGst = round2(
      items.reduce((sum, item) => {
        const q = Number(item.quantity || 1);
        const r = Number(item.rate || 0);
        const g = Number(item.gstPercent || 0);
        return sum + (q * r * g) / 100;
      }, 0)
    );

    const isCentral = invoiceType === 'central';
    const cgst = isCentral ? 0 : round2(totalGst / 2);
    const sgst = isCentral ? 0 : round2(totalGst - cgst);
    const igst = isCentral ? totalGst : 0;
    const total = round2(subtotal + totalGst);

    return {
      subtotal,
      cgst,
      sgst,
      igst,
      totalGst,
      total,
      invoiceType,
      isInterState: isCentral,
    };
  }, [items, invoiceType]);

  const resetInvoice = (currentInvoices) => {
    setEditingInvoiceId(null);
    setSalesOrderNumber('');
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
      (c) => c?.name?.trim().toLowerCase() === customerName.trim().toLowerCase()
    );
    if (!matchedCustomer) {
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

    // Guard against duplicate invoice numbers assigned to distinct invoices
    const duplicateInv = invoices.find(
      (i) => i.id !== editingInvoiceId && i.invoiceNumber?.trim().toLowerCase() === calculatedInvoiceNumber.toLowerCase()
    );
    if (duplicateInv) {
      alert(`⚠️ Invoice number "${calculatedInvoiceNumber}" is already in use by another invoice. Please specify a unique invoice number.`);
      return;
    }

    // Pull customer GSTIN
    const buyerGstin = (matchedCustomer.gstin || '').trim().toUpperCase();
    const isCentral = invoiceType === 'central';

    let placeOfSupply = (company.state || '').trim();
    if (buyerGstin.length === 15) {
      const buyerStateCode = buyerGstin.slice(0, 2);
      const buyerStateName = GST_STATE_CODES[buyerStateCode];
      if (buyerStateName) {
        placeOfSupply = `${buyerStateName} (${buyerStateCode})`;
      }
    }

    const isEditing = Boolean(editingInvoiceId);
    const existingInvoice = isEditing ? invoices.find((i) => i.id === editingInvoiceId) : null;
    const oldItems = existingInvoice?.items || [];
    const targetSalesOrderNo = isEditing
      ? (salesOrderNumber || existingInvoice?.salesOrderNumber || '')
      : salesOrderNumber;

    const invoicePayload = {
      id: isEditing ? editingInvoiceId : uuidv4(),
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
      salesOrderNumber: targetSalesOrderNo,
      items,
      totals,
      createdAt: existingInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updatedInvoices;
    if (isEditing) {
      updatedInvoices = invoices.map((i) => (i.id === editingInvoiceId ? invoicePayload : i));
    } else {
      updatedInvoices = [invoicePayload, ...invoices];
    }
    setInvoices(updatedInvoices);

    // If invoice number was changed during edit, cascade rename to linked payments
    if (isEditing && existingInvoice?.invoiceNumber && existingInvoice.invoiceNumber !== calculatedInvoiceNumber) {
      setPayments((prevPayments) =>
        (prevPayments || []).map((p) =>
          p.linkedDocument === existingInvoice.invoiceNumber
            ? { ...p, linkedDocument: calculatedInvoiceNumber }
            : p
        )
      );
    }

    // Ensure linked sales order is marked converted
    if (targetSalesOrderNo) {
      setSalesOrders((prev) =>
        (prev || []).map((o) =>
          o.orderNumber === targetSalesOrderNo ? { ...o, orderStatus: 'Converted to Invoice' } : o
        )
      );
    }

    // Reconcile inventory stock levels:
    // If updating: delta = newSold - oldSold (returns stock if qty reduced; deducts if increased)
    // If creating: oldSold = 0, delta = newSold (deducts full sold quantity)
    setStockItems((prevStock) =>
      prevStock.map((stockItem) => {
        const nameLower = stockItem.name.trim().toLowerCase();
        const oldSold = oldItems.reduce(
          (sum, it) => (it.description?.trim().toLowerCase() === nameLower ? sum + (Number(it.quantity) || 1) : sum),
          0
        );
        const newSold = items.reduce(
          (sum, it) => (it.description?.trim().toLowerCase() === nameLower ? sum + (Number(it.quantity) || 1) : sum),
          0
        );
        const netDelta = newSold - oldSold;
        if (netDelta !== 0) {
          return {
            ...stockItem,
            stock: Math.max(0, (Number(stockItem.stock) || 0) - netDelta),
          };
        }
        return stockItem;
      })
    );

    resetInvoice(updatedInvoices);
    alert(`✓ Invoice ${calculatedInvoiceNumber} ${isEditing ? 'updated' : 'saved'} successfully!`);
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
    setEditingInvoiceId(inv?.id || null);
    setSalesOrderNumber(inv?.salesOrderNumber || '');
    setCustomerName(inv?.customerName || '');
    setInvoiceNumber(inv?.invoiceNumber || '');
    setInvoiceDate(inv?.invoiceDate || new Date().toISOString().slice(0, 10));
    setCustomerPhone(inv?.customerPhone || '');
    setCustomerAddress(inv?.customerAddress || '');
    setInvoiceType(inv?.invoiceType || (inv?.isInterState ? 'central' : 'local'));
    setItems(inv?.items || []);
    setActivePage('Add Sales');
  };

  const deleteInvoice = (id) => {
    const invoiceToDelete = invoices.find((i) => i.id === id);
    if (!invoiceToDelete) return;

    // Check for linked payment vouchers
    const linkedPayments = (payments || []).filter(
      (p) => p.linkedDocument && p.linkedDocument === invoiceToDelete.invoiceNumber
    );

    if (linkedPayments.length > 0) {
      const totalLinked = linkedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const confirmMsg = `Notice: Invoice ${invoiceToDelete.invoiceNumber} has ${linkedPayments.length} linked payment voucher(s) totaling ₹${totalLinked.toFixed(2)}.\n\nDeleting this invoice will unlink these vouchers. Do you wish to proceed?`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
      setPayments((prev) =>
        (prev || []).map((p) =>
          p.linkedDocument === invoiceToDelete.invoiceNumber
            ? {
                ...p,
                linkedDocument: '',
                narration: (p.narration ? p.narration + ' | ' : '') + `[Unlinked from deleted invoice ${invoiceToDelete.invoiceNumber}]`,
              }
            : p
        )
      );
    }

    // Revert converted Sales Order status back to 'Open / Pending' if linked
    if (invoiceToDelete.salesOrderNumber) {
      setSalesOrders((prev) =>
        (prev || []).map((o) =>
          o.orderNumber === invoiceToDelete.salesOrderNumber
            ? { ...o, orderStatus: 'Open / Pending' }
            : o
        )
      );
    }

    // Replenish / restore sold stock items back to inventory catalog
    if (Array.isArray(invoiceToDelete.items)) {
      setStockItems((prevStock) =>
        prevStock.map((stockItem) => {
          const nameLower = stockItem.name.trim().toLowerCase();
          const restoredQty = invoiceToDelete.items.reduce(
            (sum, it) => (it.description?.trim().toLowerCase() === nameLower ? sum + (Number(it.quantity) || 1) : sum),
            0
          );
          if (restoredQty > 0) {
            return {
              ...stockItem,
              stock: (Number(stockItem.stock) || 0) + restoredQty,
            };
          }
          return stockItem;
        })
      );
    }

    setInvoices((current) => current.filter((i) => i.id !== id));
    if (editingInvoiceId === id) {
      resetInvoice();
    }
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
  const handleOptionClick = (rawOption, subKey, menuGroup) => {
    setActiveMenu(null);

    let option = rawOption;
    // Map simplified sub-section actions (Add, Modify, List) to their target views
    if (subKey) {
      if (subKey === 'Sales') {
        option = option === 'Add' ? 'Add Sales' : option === 'Modify' ? 'Modify Sales' : 'List Sales';
      } else if (subKey === 'Sales Order') {
        option = option === 'Add' ? 'Add Sales Order' : option === 'Modify' ? 'Modify Sales Order' : 'List Sales Orders';
      } else if (subKey === 'Purchase') {
        option = option === 'Add' ? 'Add Purchase' : option === 'Modify' ? 'Modify Purchase' : 'List Purchase';
      } else if (subKey === 'Purchase Order') {
        option = option === 'Add' ? 'Add Purchase Order' : option === 'Modify' ? 'Modify Purchase Order' : 'List Purchase Orders';
      } else if (subKey === 'Payment' || subKey === 'Payments') {
        option = option === 'Add' ? 'Add Payment' : option === 'Modify' ? 'Modify Payment' : 'List Payments';
      } else if (subKey === 'Accounts') {
        option = option === 'Add' ? 'Add Account' : option === 'Modify' ? 'Modify Account' : 'List Account';
      } else if (subKey === 'Items') {
        option = option === 'Add' ? 'Add Item' : option === 'Modify' ? 'Modify Item' : 'List Items';
      }
    }

    // Product Network Actions
    if (
      menuGroup === 'Product Network' ||
      option === 'Product Network' ||
      option === 'Manufacturer Catalogs' ||
      option === 'Discover Products' ||
      option === 'My Catalog Imports' ||
      option === 'Manufacturer Connections' ||
      option === 'Catalog Updates' ||
      option === 'Import History' ||
      (option === 'Overview' && (menuGroup === 'Product Network' || !subKey)) ||
      (option === 'Settings' && menuGroup === 'Product Network')
    ) {
      const targetSub = option === 'Product Network' ? 'Overview' : option;
      setActivePage(`Product Network: ${targetSub}`);
      return;
    }

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
    if (option === 'Modify Sales') {
      setActivePage('Modify Sales');
      return;
    }
    if (option === 'List Sales') {
      setActivePage('List Sales');
      return;
    }
    if (option === 'Add Sales Order') {
      setActivePage('Add Sales Order');
      return;
    }
    if (option === 'Modify Sales Order') {
      setActivePage('Modify Sales Order');
      return;
    }
    if (option === 'List Sales Orders' || option === 'Sales Orders' || option === 'Sales Order') {
      setActivePage('List Sales Orders');
      return;
    }
    if (option === 'Add Purchase') {
      setActivePage('Add Purchase');
      return;
    }
    if (option === 'Modify Purchase') {
      setActivePage('Modify Purchase');
      return;
    }
    if (option === 'List Purchase') {
      setActivePage('List Purchase');
      return;
    }
    if (option === 'Add Purchase Order') {
      setActivePage('Add Purchase Order');
      return;
    }
    if (option === 'Modify Purchase Order') {
      setActivePage('Modify Purchase Order');
      return;
    }
    if (option === 'List Purchase Orders' || option === 'Purchase Orders' || option === 'Purchase Order') {
      setActivePage('List Purchase Orders');
      return;
    }
    if (option === 'Add Payment' || option === 'Receive Payment (In)' || option === 'Make Payment (Out)') {
      setActivePage('Add Payment');
      return;
    }
    if (option === 'Modify Payment') {
      setActivePage('Modify Payment');
      return;
    }
    if (option === 'List Payments' || option === 'Payment Register' || option === 'Payments' || option === 'Payment') {
      setActivePage('List Payments');
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
    if (
      option === 'Company Profile PDF' ||
      option === 'Download Company Details PDF' ||
      option === 'Company Details PDF'
    ) {
      setShareModal({ isOpen: true, mode: 'company', targetInvoice: null });
      return;
    }
    if (option === 'Download PDF') {
      setShareModal({ isOpen: true, mode: 'pdf', targetInvoice: null });
      return;
    }
    if (option === 'Print Invoice') {
      setShareModal({ isOpen: true, mode: 'print', targetInvoice: null });
      return;
    }
    if (option === 'Email Invoice') {
      if (!hasFeatureAccess(currentUser, 'whatsapp_email_share')) {
        setRenewalModalOpen(true);
        alert('⚡ Direct Email & WhatsApp invoice dispatching requires the Enterprise Suite. You can still download high-resolution PDFs and print invoices on your current plan!');
        return;
      }
      setShareModal({ isOpen: true, mode: 'email', targetInvoice: null });
      return;
    }
    if (option === 'Send SMS') {
      if (!hasFeatureAccess(currentUser, 'whatsapp_email_share')) {
        setRenewalModalOpen(true);
        alert('⚡ Direct SMS & WhatsApp dispatching requires the Enterprise Suite. You can still download high-resolution PDFs and print invoices on your current plan!');
        return;
      }
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
    const targetUser = (username || currentUser?.username || '').toLowerCase().trim();
    if (!targetUser) return;
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

      // 4b. Sales Orders
      if (Array.isArray(cloudData.salesOrders)) {
        setSalesOrders((prevLocal) => {
          const map = new Map();
          cloudData.salesOrders.forEach((o) => map.set(o.id || o.orderNumber, o));
          (prevLocal || []).forEach((o) => map.set(o.id || o.orderNumber, o));
          const merged = Array.from(map.values());
          window.localStorage.setItem(salesOrdersStorageKey(targetUser), JSON.stringify(merged));
          return merged;
        });
      }

      // 4c. Purchase Orders
      if (Array.isArray(cloudData.purchaseOrders)) {
        setPurchaseOrders((prevLocal) => {
          const map = new Map();
          cloudData.purchaseOrders.forEach((p) => map.set(p.id || p.poNumber, p));
          (prevLocal || []).forEach((p) => map.set(p.id || p.poNumber, p));
          const merged = Array.from(map.values());
          window.localStorage.setItem(purchaseOrdersStorageKey(targetUser), JSON.stringify(merged));
          return merged;
        });
      }

      // 4d. Payments
      if (Array.isArray(cloudData.payments)) {
        setPayments((prevLocal) => {
          const map = new Map();
          cloudData.payments.forEach((p) => map.set(p.id || p.voucherNumber, p));
          (prevLocal || []).forEach((p) => map.set(p.id || p.voucherNumber, p));
          const merged = Array.from(map.values());
          window.localStorage.setItem(paymentsStorageKey(targetUser), JSON.stringify(merged));
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

      // 7. Favourites
      if (Array.isArray(cloudData.favourites) && cloudData.favourites.length > 0) {
        setFavourites(cloudData.favourites);
        window.localStorage.setItem('gst-invoice-app-favourites', JSON.stringify(cloudData.favourites));
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
  }, [currentUser?.username]);

  // Extract user's complete data from Firebase Cloud Firestore
  const extractUserDataFromCloud = useCallback(
    async (explicitUser) => {
      const targetUser = (explicitUser || currentUser?.username || '').toLowerCase().trim();
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
    [currentUser?.username, applyCloudData, setCloudSyncStatus]
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
        salesOrders,
        purchaseOrders,
        payments,
        favourites,
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
  }, [invoices, customers, stockItems, purchaseBills, salesOrders, purchaseOrders, payments, favourites, company, settings, currentUser?.username]);

  // Manual Cloud Sync Handlers
  const handleForceCloudSync = async () => {
    if (!currentUser?.username) return;
    return await extractUserDataFromCloud(currentUser.username);
  };

  const handlePushToCloud = async () => {
    if (!currentUser?.username) return;

    if (!hasFeatureAccess(currentUser, 'cloud_sync')) {
      setCloudNotice({
        type: 'warning',
        message: '⚡ Multi-Device Cloud Sync is available on the Professional Plan & Enterprise Suite. Your local data remains securely saved.',
      });
      setTimeout(() => setCloudNotice(null), 5000);
      return { success: false, tierRestricted: true };
    }

    setCloudSyncStatus('syncing');
    const targetUser = currentUser.username.toLowerCase();

    try {
      await syncUserDataToCloud(targetUser, {
        invoices,
        customers,
        stockItems,
        purchaseBills,
        salesOrders,
        purchaseOrders,
        payments,
        favourites,
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
  const handleLogin = async (rawUsername, fullUser = null) => {
    const extractedName = typeof rawUsername === 'string' ? rawUsername : rawUsername?.username;
    if (!extractedName && !fullUser) {
      console.warn('handleLogin called without valid user');
      return;
    }
    const username = (extractedName || fullUser?.username || '').toLowerCase().trim();
    const userInvoices = loadInvoices(username);

    // Resolve complete user object with subscription and unique license ID
    const foundUser = fullUser || users.find((u) => u.username.toLowerCase() === username);
    const userObj = foundUser
      ? {
          ...foundUser,
          licenseId: ensureValidLicenseId(foundUser),
        }
      : {
          username,
          role: username === 'admin' ? 'Admin' : 'Owner',
          licenseId: username === 'admin' ? '91-00-000-000000' : ensureValidLicenseId({ username }),
        };

    setCurrentUser(userObj);
    window.sessionStorage.setItem('gst-invoice-app-current-user', JSON.stringify(userObj));
    window.localStorage.removeItem('gst-invoice-app-current-user');

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
    setSalesOrders(loadSalesOrders(username));
    setPurchaseOrders(loadPurchaseOrders(username));
    setPayments(loadPayments(username));
    setInvoices(userInvoices);

    setInvoiceNumber(getNextInvoiceNumber(userInvoices));
    setActivePage(null);

    // If user has saved company details in their profile, update company state
    if (userObj.companyName) {
      setCompany((prev) => ({
        ...prev,
        name: userObj.companyName,
        phone: userObj.phone || prev.phone,
        email: userObj.email || prev.email,
      }));
    }

    // Immediately extract user's data from Cloud Firestore on login!
    extractUserDataFromCloud(username);
  };

  const handleRegister = (newUser) => {
    const preparedUser = {
      ...newUser,
      licenseId: newUser.licenseId || generateLicenseId(newUser.username),
    };
    setUsers((current) => [...current, preparedUser]);
    if (preparedUser.companyName) {
      setCompany((prev) => ({
        ...prev,
        name: preparedUser.companyName,
        phone: preparedUser.phone || prev.phone,
        email: preparedUser.email || prev.email,
      }));
    }
    setCurrentUser(preparedUser);
    window.sessionStorage.setItem('gst-invoice-app-current-user', JSON.stringify(preparedUser));
    window.localStorage.removeItem('gst-invoice-app-current-user');
    setInvoices([]);
    setCustomers([]);
    setStockItems([]);
    setPurchaseBills([]);
    setSalesOrders([]);
    setPurchaseOrders([]);
    setPayments([]);
    setInvoiceNumber('1001/2026-27');
    setActivePage(null);

    // Extract cloud data
    extractUserDataFromCloud(preparedUser.username);
  };

  // License & Subscription Renewal Handlers
  const handleRenewSubscription = async (renewData) => {
    if (!currentUser?.username) return { success: false, message: 'No active user session' };
    const res = await renewUserSubscription(currentUser.username, renewData);
    if (res?.success && res.user) {
      setCurrentUser(res.user);
      setUsers((prev) => {
        const remaining = prev.filter((u) => u.username.toLowerCase() !== res.user.username.toLowerCase());
        return [res.user, ...remaining];
      });
      setCloudNotice({
        type: 'success',
        message: `✓ License extended successfully! Valid until ${res.user.subscription?.validUntil}.`,
      });
    }
    return res;
  };

  const handleCheckLicenseStatus = async () => {
    if (!currentUser?.username) return null;
    setIsCheckingLicense(true);
    try {
      const updated = await syncUserLicenseStatus(currentUser.username);
      if (updated) {
        setCurrentUser(updated);
        setUsers((prev) => {
          const remaining = prev.filter((u) => u.username.toLowerCase() !== updated.username.toLowerCase());
          return [updated, ...remaining];
        });
        const evalRes = evaluateSubscriptionStatus(updated);
        if (!evalRes.isExpired) {
          setCloudNotice({
            type: 'success',
            message: `✓ Active license confirmed! Valid until ${updated.subscription?.validUntil}.`,
          });
        }
        return updated;
      }
    } finally {
      setIsCheckingLicense(false);
    }
    return null;
  };

  const executeLogout = () => {
    resetInvoice([]);
    setCurrentUser(null);
    setInvoices([]);
    setPurchaseBills([]);
    setSalesOrders([]);
    setPurchaseOrders([]);
    setPayments([]);
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

  // When not authenticated, render the full-window executive login experience (zero scroll, edge-to-edge)
  if (!currentUser) {
    return (
      <div className="login-window-fullscreen" style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {isBooting && (
          <AppOpeningSequence
            currentUser={currentUser}
            onComplete={() => {
              setIsBooting(false);
              if (typeof window !== 'undefined') {
                window.sessionStorage.setItem('tread-session-booted', 'true');
              }
            }}
          />
        )}
        <Login
          users={users}
          onLogin={handleLogin}
          onRegister={handleRegister}
          isOnline={isOnline}
        />
      </div>
    );
  }

  return (
    <div className="menu-container" ref={menuRef}>
      {/* Executive App Opening Sequence & Verified Initializer */}
      {isBooting && (
        <AppOpeningSequence
          currentUser={currentUser}
          onComplete={() => {
            setIsBooting(false);
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem('tread-session-booted', 'true');
            }
          }}
        />
      )}

      {/* ================= TOP NAVIGATION BAR ================= */}
      <TopNavbar
        currentUser={currentUser}
        menus={visibleMenus}
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
        subscriptionStatus={subscriptionStatus}
        onOpenRenewalModal={() => setRenewalModalOpen(true)}
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
        menus={visibleMenus}
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
        isOnline={isOnline}
        subscriptionStatus={subscriptionStatus}
        onOpenRenewalModal={() => setRenewalModalOpen(true)}
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

        {/* 7-Day Subscription Expiry Warning Banner */}
        {subscriptionStatus.isExpiringSoon && !subscriptionStatus.isAdmin && (
          <div className="container-fluid px-3 pt-2">
            <div
              className="alert py-2 px-3 d-flex flex-wrap align-items-center justify-content-between mb-2 shadow-xs border"
              style={{
                fontSize: '13px',
                borderRadius: '10px',
                background: 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)',
                borderColor: '#f59e0b',
                color: '#92400e',
              }}
              role="alert"
            >
              <div className="d-flex align-items-center gap-2">
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <span>
                  <strong>Subscription Notice:</strong> Your license expires in{' '}
                  <span className="badge bg-warning text-dark px-2 py-1 fw-bold">
                    {subscriptionStatus.daysRemaining} {subscriptionStatus.daysRemaining === 1 ? 'day' : 'days'}
                  </span>{' '}
                  (valid until {subscriptionStatus.validUntil}). Your Unique License ID:{' '}
                  <span className="badge bg-dark font-monospace text-warning px-2 py-1">
                    {subscriptionStatus.licenseId}
                  </span>
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-warning text-dark fw-bold px-3 py-1 shadow-xs mt-2 mt-md-0"
                style={{ borderRadius: '8px', fontSize: '12px' }}
                onClick={() => setRenewalModalOpen(true)}
              >
                ⚡ Renew License
              </button>
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
          {subscriptionStatus.isExpired && !subscriptionStatus.isAdmin ? (
            /* Dedicated Expired Lockout Screen */
            <div className="container py-5">
              <div
                className="card border-0 rounded-4 shadow-luxury mx-auto overflow-hidden text-center p-4 p-md-5"
                style={{
                  maxWidth: '680px',
                  background: 'linear-gradient(170deg, #ffffff 0%, #f8fafc 100%)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                }}
              >
                <div
                  className="mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3"
                  style={{
                    width: '80px',
                    height: '80px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#dc2626',
                    fontSize: '36px',
                  }}
                >
                  🔒
                </div>
                <span
                  className="badge bg-danger text-white mx-auto px-3 py-1 mb-2 fw-bold text-uppercase"
                  style={{ letterSpacing: '0.06em' }}
                >
                  Subscription License Expired
                </span>
                <h2 className="h4 fw-bold text-dark mb-2">Your Tread License Has Ended</h2>
                <p className="text-muted small mb-4 px-md-3">
                  Your business subscription expired on{' '}
                  <strong>{subscriptionStatus.validUntil || 'Recent Date'}</strong>. To continue creating GST invoices, managing inventory, and syncing across devices, please renew your account.
                </p>

                {/* Unique Customer License ID Box */}
                <div
                  className="card border-0 rounded-3 p-3 mb-4 text-white text-start shadow-sm mx-auto w-100"
                  style={{
                    background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 100%)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
                    <div>
                      <div className="text-white-50 small text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>
                        Your Unique Customer License ID
                      </div>
                      <div className="font-monospace fw-bold fs-4 text-warning mt-1">
                        {subscriptionStatus.licenseId}
                      </div>
                      <div className="text-white-50 small">
                        Account: <strong>{currentUser?.username}</strong> &bull; Plan: {currentUser?.subscription?.planName || 'Standard'}
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-light px-3 py-2 fw-semibold"
                        onClick={() => {
                          if (typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText(subscriptionStatus.licenseId);
                            setCloudNotice({ type: 'success', message: '✓ License ID copied to clipboard!' });
                          }
                        }}
                      >
                        📋 Copy ID
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-warning px-3 py-2 fw-semibold"
                        onClick={handleCheckLicenseStatus}
                        disabled={isCheckingLicense}
                      >
                        {isCheckingLicense ? '⏳ Checking...' : '🔄 Check Cloud Status'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="d-flex flex-wrap justify-content-center gap-2 mb-3">
                  <button
                    type="button"
                    className="btn btn-success fw-bold px-4 py-2 d-flex align-items-center gap-2 shadow-sm"
                    onClick={() => {
                      const text = encodeURIComponent(
                        `Hello! I want to renew my Tread Subscription.\nLicense ID: ${subscriptionStatus.licenseId}\nUser ID: ${currentUser?.username || ''}\nCompany: ${company?.name || ''}`
                      );
                      window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <span>💬</span>
                    <span>WhatsApp Us to Renew</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary fw-bold px-4 py-2 d-flex align-items-center gap-2 shadow-sm"
                    onClick={() => setRenewalModalOpen(true)}
                  >
                    <span>⚡</span>
                    <span>Instant Direct Renewal</span>
                  </button>
                </div>

                <div className="border-top pt-3 mt-2 d-flex justify-content-between align-items-center">
                  <span className="small text-muted">
                    Need help? Quote License ID <strong>{subscriptionStatus.licenseId}</strong>
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-danger text-decoration-none fw-semibold p-0"
                    onClick={initiateLogout}
                  >
                    Sign Out &rarr;
                  </button>
                </div>
              </div>
            </div>
          ) : currentUser ? (
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
              isEditingInvoice={Boolean(editingInvoiceId)}
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
              salesOrders={salesOrders}
              onSaveSalesOrders={setSalesOrders}
              onConvertSalesOrderToInvoice={handleConvertSalesOrderToInvoice}
              purchaseOrders={purchaseOrders}
              onSavePurchaseOrders={setPurchaseOrders}
              onConvertPOToPurchaseBill={handleConvertPOToPurchaseBill}
              payments={payments}
              onSavePayments={setPayments}
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
              subscriptionStatus={subscriptionStatus}
              onOpenRenewalModal={() => setRenewalModalOpen(true)}
              onExtendLicense={handleRenewSubscription}
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
        © {new Date().getFullYear()} {currentUser && company?.name ? `${company.name} | ` : ''}Tread GST Invoicing &amp; Accounting
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
            purchaseBills={purchaseBills}
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
            onSavePurchaseBill={(newBill) => {
              setPurchaseBills((prev) => [newBill, ...prev]);
            }}
            onNavigate={setActivePage}
            onTriggerCloudSync={handleForceCloudSync}
            onOpenAppAccessModal={() => setAppAccessModalOpen(true)}
            onShareInvoice={(inv, mode = 'pdf') => {
              setShareModal({ isOpen: true, mode, targetInvoice: inv || invoices[0] });
            }}
          />
        )}

        {shareModal.isOpen && (
          <ShareInvoiceModal
            invoices={invoices}
            invoice={shareModal.targetInvoice || invoices[0]}
            company={company}
            currentUser={currentUser}
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

        {/* License & Subscription Renewal Modal */}
        <LicenseRenewalModal
          isOpen={renewalModalOpen}
          onClose={() => setRenewalModalOpen(false)}
          currentUser={currentUser}
          company={company}
          subscriptionStatus={subscriptionStatus}
          companyPhone={company?.phone}
          onRenew={handleRenewSubscription}
          onCheckStatus={handleCheckLicenseStatus}
          allowClose={!subscriptionStatus.isExpired || subscriptionStatus.isAdmin}
        />
      </Suspense>
    </div>
  );
}

export default Index;
