import { lazy } from 'react';

// Lazy-loaded feature views
const Dashboard = lazy(() => import('./Dashboard/index.jsx'));
const InvoiceEditor = lazy(() => import('./CreateInvoice/index.jsx'));
const InvoicesList = lazy(() => import('./Invoices/index.jsx'));
const CompanyProfile = lazy(() => import('./Company/index.jsx'));
const UserManagement = lazy(() => import('./Administration/index.jsx').then((m) => ({ default: m.UserManagement })));
const AppSettings = lazy(() => import('./Administration/index.jsx').then((m) => ({ default: m.AppSettings })));
const RolesPermissions = lazy(() => import('./Administration/index.jsx').then((m) => ({ default: m.RolesPermissions })));
const Housekeeping = lazy(() => import('./Housekeeping/index.jsx'));
const HelpCenter = lazy(() => import('./Help/index.jsx'));
const ManageFavourites = lazy(() => import('./Favourites/index.jsx'));
const CustomersPage = lazy(() => import('./Customers/index.jsx'));
const StockManagement = lazy(() => import('./Stock/index.jsx'));
const ItemCatalogApi = lazy(() => import('./Administration/index.jsx').then((m) => ({ default: m.ItemCatalogApi })));
const DeviceAccessControl = lazy(() => import('./Administration/index.jsx').then((m) => ({ default: m.DeviceAccessControl })));
const GstHub = lazy(() => import('./GST/index.jsx'));
const SalesOrderManager = lazy(() => import('./Orders/index.jsx').then((m) => ({ default: m.SalesOrderManager })));
const PurchaseOrderManager = lazy(() => import('./Orders/index.jsx').then((m) => ({ default: m.PurchaseOrderManager })));
const PaymentManager = lazy(() => import('./Payments/index.jsx'));
const DisplayHub = lazy(() => import('./Display/index.jsx'));
const UniversalFileAnalyzer = lazy(() => import('./AI/UniversalFileAnalyzer.jsx'));
const ProductNetwork = lazy(() => import('./ProductNetwork/index.jsx'));
import Login from './Login/index.jsx';
import FeatureLockGate from './Common/FeatureLockGate.jsx';
import { hasFeatureAccess } from '../constants/subscriptionPlans.js';
import { DISPLAY_MENU_STRUCTURE } from '../constants/navigation.js';

export default function ViewRouter({
  activePage,
  onNavigate,
  // User & Company
  currentUser,
  users,
  onLogin,
  onRegister,
  company,
  onSaveCompany,
  settings,
  onSaveSettings,
  // Invoices & Editor State
  invoices,
  customerName,
  setCustomerName,
  invoiceNumber,
  setInvoiceNumber,
  invoiceDate,
  setInvoiceDate,
  customerPhone,
  setCustomerPhone,
  customerAddress,
  setCustomerAddress,
  invoiceType,
  setInvoiceType,
  items,
  addItem,
  updateItem,
  removeItem,
  totals,
  resetInvoice,
  saveInvoice,
  isEditingInvoice = false,
  loadInvoiceToEditor,
  deleteInvoice,
  clearAllInvoices,
  onDownloadPDF,
  onShareInvoice,
  // Customers & Stock
  customers,
  onSaveCustomers,
  onSaveSingleCustomer,
  onDeleteCustomer,
  onLoadCustomerToInvoice,
  stockItems,
  onSaveStock,
  purchaseBills,
  onSavePurchaseBills,
  // Orders & Payments
  salesOrders = [],
  onSaveSalesOrders,
  onConvertSalesOrderToInvoice,
  purchaseOrders = [],
  onSavePurchaseOrders,
  onConvertPOToPurchaseBill,
  payments = [],
  onSavePayments,
  // Favourites
  favourites,
  onToggleFavourite,
  allAvailableShortcuts,
  // Voice Assistant
  voiceSupported,
  recognitionActive,
  setRecognitionActive,
  voiceTranscript,
  onStartVoice,
  onOpenAppAccessModal,
  subscriptionStatus,
  onOpenRenewalModal,
  onExtendLicense,
}) {
  if (!activePage) {
    return null;
  }

  // 1. Dashboard
  if (activePage === 'Dashboard') {
    return (
      <Dashboard
        invoices={invoices}
        company={company}
        currentUser={currentUser}
        subscriptionStatus={subscriptionStatus}
        onOpenRenewalModal={onOpenRenewalModal}
        onNavigate={onNavigate}
        onLoadInvoice={(inv) => {
          loadInvoiceToEditor(inv);
          onNavigate('Add Sales');
        }}
        onDownloadPDF={onDownloadPDF}
        onStartVoice={onStartVoice}
      />
    );
  }

  // 2. Sales Editor (Add Sales)
  if (
    activePage === 'Add Sales' ||
    activePage === 'Create Transaction' ||
    activePage === 'Create Invoice'
  ) {
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
        isEditing={isEditingInvoice}
        recognitionActive={recognitionActive}
        setRecognitionActive={setRecognitionActive}
        voiceSupported={voiceSupported}
        voiceTranscript={voiceTranscript}
        downloadPDF={onDownloadPDF}
        onViewAllInvoices={() => onNavigate('List Sales')}
        customers={customers}
        company={company}
        onSaveCustomer={onSaveSingleCustomer}
        onNavigateToCustomers={() => onNavigate('List Account')}
        stockItems={stockItems}
        onNavigateToStock={() => onNavigate('List Items')}
      />
    );
  }

  // 3. Invoices List (Modify / List Sales)
  const isModifySales = activePage === 'Modify Sales' || activePage === 'Edit Transaction';
  const isListSales =
    activePage === 'List Sales' ||
    activePage === 'All Transactions' ||
    activePage === 'View Transactions' ||
    activePage === 'Search Transaction';

  if (isModifySales || isListSales) {
    return (
      <InvoicesList
        key={activePage}
        invoices={invoices}
        company={company}
        onLoadInvoice={(inv) => {
          loadInvoiceToEditor(inv);
          onNavigate('Add Sales');
        }}
        onDeleteInvoice={deleteInvoice}
        onClearAllInvoices={clearAllInvoices}
        onDownloadPDF={onDownloadPDF}
        onShareInvoice={onShareInvoice}
        onNavigate={onNavigate}
        mode={isModifySales ? 'modify' : 'list'}
      />
    );
  }

  // 4. Purchases (Add, Modify, List Purchase)
  const isAddPurchase =
    activePage === 'Add Purchase' ||
    activePage === 'Purchase Bills' ||
    activePage === 'Purchase Bill Entry';
  const isModifyPurchase = activePage === 'Modify Purchase';
  const isListPurchase =
    activePage === 'List Purchase' ||
    activePage === 'Purchase' ||
    activePage === 'Purchase History' ||
    activePage === 'Purchase Register';

  if (isAddPurchase || isModifyPurchase || isListPurchase) {
    if (!hasFeatureAccess(currentUser, 'purchase_bills')) {
      return (
        <FeatureLockGate
          featureKey="purchase_bills"
          featureTitle="Purchase Bills & Supplier Orders"
          currentUser={currentUser}
          onOpenRenewalModal={onOpenRenewalModal}
          onBack={() => onNavigate(null)}
        />
      );
    }
    const purchaseMode = isAddPurchase ? 'add' : isModifyPurchase ? 'modify' : 'list';
    const purchaseTab = isAddPurchase ? 'manual-bill' : 'purchase-history';
    return (
      <StockManagement
        key={activePage}
        stockItems={stockItems}
        onSaveStock={onSaveStock}
        vendors={customers.filter((c) => c.type === 'Vendor' || c.type === 'Both')}
        purchaseBills={purchaseBills}
        onSavePurchaseBills={onSavePurchaseBills}
        onSaveVendor={onSaveSingleCustomer}
        onBack={() => onNavigate(null)}
        initialTab={purchaseTab}
        initialShowAdd={false}
        mode={purchaseMode}
      />
    );
  }

  // 4a. Sales Orders (Add, Modify, List Sales Orders)
  const isAddSalesOrder = activePage === 'Add Sales Order';
  const isModifySalesOrder = activePage === 'Modify Sales Order';
  const isListSalesOrders =
    activePage === 'List Sales Orders' ||
    activePage === 'Sales Orders' ||
    activePage === 'Sales Order';

  if (isAddSalesOrder || isModifySalesOrder || isListSalesOrders) {
    if (!hasFeatureAccess(currentUser, 'sales_orders')) {
      return (
        <FeatureLockGate
          featureKey="sales_orders"
          featureTitle="Sales Orders & Bookings"
          currentUser={currentUser}
          onOpenRenewalModal={onOpenRenewalModal}
          onBack={() => onNavigate(null)}
        />
      );
    }
    const orderMode = isAddSalesOrder ? 'add' : isModifySalesOrder ? 'modify' : 'list';
    return (
      <SalesOrderManager
        key={activePage}
        orders={salesOrders}
        onSaveOrders={onSaveSalesOrders}
        customers={customers}
        stockItems={stockItems}
        company={company}
        onConvertToInvoice={onConvertSalesOrderToInvoice}
        onNavigate={onNavigate}
        initialMode={orderMode}
      />
    );
  }

  // 4b. Purchase Orders (Add, Modify, List Purchase Orders)
  const isAddPurchaseOrder = activePage === 'Add Purchase Order';
  const isModifyPurchaseOrder = activePage === 'Modify Purchase Order';
  const isListPurchaseOrders =
    activePage === 'List Purchase Orders' ||
    activePage === 'Purchase Orders' ||
    activePage === 'Purchase Order';

  if (isAddPurchaseOrder || isModifyPurchaseOrder || isListPurchaseOrders) {
    if (!hasFeatureAccess(currentUser, 'purchase_orders')) {
      return (
        <FeatureLockGate
          featureKey="purchase_orders"
          featureTitle="Purchase Orders"
          currentUser={currentUser}
          onOpenRenewalModal={onOpenRenewalModal}
          onBack={() => onNavigate(null)}
        />
      );
    }
    const poMode = isAddPurchaseOrder ? 'add' : isModifyPurchaseOrder ? 'modify' : 'list';
    return (
      <PurchaseOrderManager
        key={activePage}
        purchaseOrders={purchaseOrders}
        onSavePurchaseOrders={onSavePurchaseOrders}
        vendors={customers.filter((c) => c.type === 'Vendor' || c.type === 'Both')}
        stockItems={stockItems}
        company={company}
        onConvertToPurchaseBill={onConvertPOToPurchaseBill}
        onNavigate={onNavigate}
        initialMode={poMode}
      />
    );
  }

  // 4c. Payments & Receipts (Add, Modify, List Payments)
  const isAddPayment =
    activePage === 'Add Payment' ||
    activePage === 'Receive Payment (In)' ||
    activePage === 'Make Payment (Out)';
  const isModifyPayment = activePage === 'Modify Payment';
  const isListPayment =
    activePage === 'List Payments' ||
    activePage === 'Payment Register' ||
    activePage === 'Payments' ||
    activePage === 'Payment';

  if (isAddPayment || isModifyPayment || isListPayment) {
    if (!hasFeatureAccess(currentUser, 'payments')) {
      return (
        <FeatureLockGate
          featureKey="payments"
          featureTitle="Payment Register & Cash/Bank Tracking"
          currentUser={currentUser}
          onOpenRenewalModal={onOpenRenewalModal}
          onBack={() => onNavigate(null)}
        />
      );
    }
    const payMode = isAddPayment ? 'add' : isModifyPayment ? 'modify' : 'list';
    return (
      <PaymentManager
        key={activePage}
        payments={payments}
        onSavePayments={onSavePayments}
        customers={customers}
        invoices={invoices}
        purchaseBills={purchaseBills}
        company={company}
        initialMode={payMode}
      />
    );
  }

  // 5. Accounts / Customers / Vendors (Add, Modify, List Account)
  const isAddAccount =
    activePage === 'Add Account' ||
    activePage === 'Add Customer' ||
    activePage === 'Add Vendor' ||
    activePage === 'Add Party';
  const isModifyAccount =
    activePage === 'Modify Account' ||
    activePage === 'Edit Party' ||
    activePage === 'Edit Customer';
  const isListAccount =
    activePage === 'List Account' ||
    activePage === 'Customers' ||
    activePage === 'Vendors' ||
    activePage === 'Parties' ||
    activePage === 'Account List';

  if (isAddAccount || isModifyAccount || isListAccount) {
    const accountMode = isAddAccount ? 'add' : isModifyAccount ? 'modify' : 'list';
    return (
      <CustomersPage
        key={activePage}
        customers={customers}
        onSave={onSaveCustomers}
        onDelete={onDeleteCustomer}
        onLoadToInvoice={onLoadCustomerToInvoice}
        onBack={() => onNavigate(null)}
        initialShowAdd={isAddAccount}
        initialMode={accountMode}
      />
    );
  }

  // 6. Items / Inventory (Add, Modify, List Items)
  const isAddItem =
    activePage === 'Add Item' ||
    activePage === 'Add Stock Item' ||
    activePage === 'Add Product';
  const isModifyItem = activePage === 'Modify Item' || activePage === 'Edit Item';
  const isListItems =
    activePage === 'List Items' ||
    activePage === 'Stock Inventory' ||
    activePage === 'Stock' ||
    activePage === 'Inventory' ||
    activePage === 'Items List';

  if (isAddItem || isModifyItem || isListItems) {
    if (!hasFeatureAccess(currentUser, 'inventory_stock')) {
      return (
        <FeatureLockGate
          featureKey="inventory_stock"
          featureTitle="Stock Inventory & Product Catalog"
          currentUser={currentUser}
          onOpenRenewalModal={onOpenRenewalModal}
          onBack={() => onNavigate(null)}
        />
      );
    }
    const itemMode = isAddItem ? 'add' : isModifyItem ? 'modify' : 'list';
    return (
      <StockManagement
        key={activePage}
        stockItems={stockItems}
        onSaveStock={onSaveStock}
        vendors={customers.filter((c) => c.type === 'Vendor' || c.type === 'Both')}
        purchaseBills={purchaseBills}
        onSavePurchaseBills={onSavePurchaseBills}
        onSaveVendor={onSaveSingleCustomer}
        onBack={() => onNavigate(null)}
        initialTab="inventory"
        initialShowAdd={isAddItem}
        mode={itemMode}
      />
    );
  }

  // 7. Master Item Catalog & API
  if (
    activePage === 'Master Item Catalog' ||
    activePage === 'Master Item Catalog & API' ||
    activePage === 'Item API'
  ) {
    if (!hasFeatureAccess(currentUser, 'item_api')) {
      return (
        <FeatureLockGate
          featureKey="item_api"
          featureTitle="Master Item Catalog & API"
          currentUser={currentUser}
          onOpenRenewalModal={onOpenRenewalModal}
          onBack={() => onNavigate(null)}
        />
      );
    }
    return (
      <ItemCatalogApi
        key={activePage}
        stockItems={stockItems}
        onImportToInventory={(newStockList) => onSaveStock(newStockList)}
        onBack={() => onNavigate(null)}
      />
    );
  }

  // 8. Device Access Control & Permissions
  if (
    activePage === 'Device Access Control' ||
    activePage === 'Device Security' ||
    activePage === 'Device Access' ||
    activePage === 'App Permissions & Access'
  ) {
    if (!hasFeatureAccess(currentUser, 'device_access')) {
      return (
        <FeatureLockGate
          featureKey="device_access"
          featureTitle="Device Access Control & Security"
          currentUser={currentUser}
          onOpenRenewalModal={onOpenRenewalModal}
          onBack={() => onNavigate(null)}
        />
      );
    }
    return (
      <DeviceAccessControl
        key={activePage}
        currentUser={currentUser}
        onBack={() => onNavigate(null)}
        onOpenAppAccessModal={onOpenAppAccessModal}
      />
    );
  }

  // 9. Company Details
  if (
    activePage === 'Company Details' ||
    activePage === 'Create Company' ||
    activePage === 'Edit Company' ||
    activePage === 'Open Company'
  ) {
    return (
      <CompanyProfile
        key={activePage}
        company={company}
        onSave={onSaveCompany}
        onBack={() => onNavigate(null)}
      />
    );
  }

  // 10. Display & Reports Center (Authentic Busy-Style)
  const isDisplayReport =
    activePage === 'Display' ||
    activePage === 'Reports' ||
    DISPLAY_MENU_STRUCTURE.some(
      (m) => m.title === activePage || (m.subItems && m.subItems.includes(activePage))
    );

  if (isDisplayReport) {
    const targetSection =
      activePage === 'Display' || activePage === 'Reports'
        ? 'Final Results'
        : DISPLAY_MENU_STRUCTURE.find(
            (m) => m.title === activePage || (m.subItems && m.subItems.includes(activePage))
          )?.title || 'Final Results';

    return (
      <DisplayHub
        key={activePage}
        initialSection={targetSection}
        invoices={invoices}
        customers={customers}
        stockItems={stockItems}
        purchaseBills={purchaseBills}
        salesOrders={salesOrders}
        purchaseOrders={purchaseOrders}
        payments={payments}
        company={company}
        onNavigate={onNavigate}
        onDownloadPDF={onDownloadPDF}
      />
    );
  }

  // 11. Users & Administration
  if (activePage === 'Users') {
    if (!hasFeatureAccess(currentUser, 'user_management')) {
      return (
        <FeatureLockGate
          featureKey="user_management"
          featureTitle="Multi-User Management & Team Roles"
          currentUser={currentUser}
          onOpenRenewalModal={onOpenRenewalModal}
          onBack={() => onNavigate(null)}
        />
      );
    }
    return (
      <UserManagement
        key={activePage}
        currentUser={currentUser}
        users={users}
        onSwitchUser={onLogin}
        onBack={() => onNavigate(null)}
        onExtendLicense={onExtendLicense}
      />
    );
  }

  // 12. Settings — Master Admin only (hides Firebase Cloud API & Database Sync from all other users)
  if (activePage === 'Settings') {
    if (!subscriptionStatus?.isAdmin) {
      return null; // Non-admins cannot access this page even via direct navigation
    }
    return (
      <AppSettings
        key={activePage}
        settings={settings}
        onSave={onSaveSettings}
        onBack={() => onNavigate(null)}
      />
    );
  }

  // 13. Roles & Permissions
  if (activePage === 'Roles & Permissions' || activePage === 'Roles') {
    if (!hasFeatureAccess(currentUser, 'user_management')) {
      return (
        <FeatureLockGate
          featureKey="user_management"
          featureTitle="Roles & Permissions"
          currentUser={currentUser}
          onOpenRenewalModal={onOpenRenewalModal}
          onBack={() => onNavigate(null)}
        />
      );
    }
    return (
      <RolesPermissions
        key={activePage}
        onBack={() => onNavigate(null)}
      />
    );
  }

  // 14. House-Keeping
  if (
    activePage === 'House-Keeping' ||
    activePage === 'Data Backup' ||
    activePage === 'Data Restore' ||
    activePage === 'Database Maintenance' ||
    activePage === 'System Cleanup' ||
    activePage === 'Backup' ||
    activePage === 'Restore'
  ) {
    return (
      <Housekeeping
        key={activePage}
        currentUser={currentUser}
        invoices={invoices}
        customers={customers}
        stockItems={stockItems}
        company={company}
        settings={settings}
        onRestoreData={(importedData) => {
          if (importedData.invoices) {
            window.localStorage.setItem(
              `gst-invoice-app-invoices-${currentUser.username}`,
              JSON.stringify(importedData.invoices)
            );
          }
          if (importedData.customers) onSaveCustomers(importedData.customers);
          if (importedData.stockItems) onSaveStock(importedData.stockItems);
          if (importedData.company) onSaveCompany(importedData.company);
          if (importedData.settings) onSaveSettings(importedData.settings);
          alert('✓ Data successfully restored. Refreshing workspace.');
          window.location.reload();
        }}
        onClearAllData={() => {
          clearAllInvoices();
          onSaveCustomers([]);
          onSaveStock([]);
          onSavePurchaseBills([]);
          alert('✓ Local workspace cleared.');
          onNavigate(null);
        }}
        onBack={() => onNavigate(null)}
      />
    );
  }

  // 15. Manage Favourites
  if (
    activePage === 'Manage Favourites' ||
    activePage === 'View Favourites' ||
    activePage === 'Favourites'
  ) {
    return (
      <ManageFavourites
        key={activePage}
        favourites={favourites}
        onToggleFavourite={onToggleFavourite}
        onNavigate={(page) => onNavigate(page)}
        allShortcuts={allAvailableShortcuts}
      />
    );
  }

  // 16. Help Center
  if (
    activePage === 'Help Center' ||
    activePage === 'User Guide' ||
    activePage === 'Keyboard Shortcuts'
  ) {
    return (
      <HelpCenter
        key={activePage}
        onNavigate={onNavigate}
        activeTab={activePage === 'Keyboard Shortcuts' ? 'shortcuts' : 'overview'}
      />
    );
  }

  // 16b. Universal AI File & Document Intelligence (Excel, PDF, CSV, TXT, JSON, Receipts)
  if (
    activePage === 'Universal File AI' ||
    activePage === 'Universal File AI (Excel, PDF, Images)' ||
    activePage === 'Smart File AI' ||
    activePage === 'Analyze Files' ||
    activePage === 'Universal File Importer' ||
    activePage === 'GST File Importer (All Types)' ||
    activePage === 'Document AI'
  ) {
    return (
      <UniversalFileAnalyzer
        key={activePage}
        onLoadInvoiceToEditor={loadInvoiceToEditor}
        onSavePurchaseBills={onSavePurchaseBills}
        onSaveStock={onSaveStock}
        onSaveCustomers={onSaveCustomers}
        onNavigate={onNavigate}
        onBack={() => onNavigate(null)}
        customers={customers}
        stockItems={stockItems}
        purchaseBills={purchaseBills}
      />
    );
  }

  // 17. GST Hub (All GST returns, GSTR-1, GSTR-2B, GSTR-3B, reconciliations)
  if (
    activePage === 'GST' ||
    activePage === 'GSTR-1 (Sales Outward)' ||
    activePage === 'GSTR-2B (ITC Reconcile)' ||
    activePage === 'GSTR-3B Return Summary' ||
    activePage === 'GSTIN & HSN Directory'
  ) {
    if (!hasFeatureAccess(currentUser, 'gst_hub')) {
      return (
        <FeatureLockGate
          featureKey="gst_hub"
          featureTitle="GST Filing Hub & Returns"
          currentUser={currentUser}
          onOpenRenewalModal={onOpenRenewalModal}
          onBack={() => onNavigate(null)}
        />
      );
    }
    let initialGstTab = 'importer';
    if (activePage.includes('GSTR-1')) initialGstTab = 'gstr1';
    else if (activePage.includes('GSTR-2B')) initialGstTab = 'gstr2b';
    else if (activePage.includes('GSTR-3B')) initialGstTab = 'gstr3b';
    else if (activePage.includes('Directory')) initialGstTab = 'directory';

    return (
      <GstHub
        key={activePage}
        invoices={invoices}
        purchaseBills={purchaseBills}
        company={company}
        customers={customers}
        stockItems={stockItems}
        onSaveCustomers={onSaveCustomers}
        onSaveStock={onSaveStock}
        onSavePurchaseBills={onSavePurchaseBills}
        onBack={() => onNavigate(null)}
        initialTab={initialGstTab}
      />
    );
  }

  // 17.5. TREAD Product Network
  const isProductNetwork =
    activePage === 'Product Network' ||
    (typeof activePage === 'string' && activePage.startsWith('Product Network')) ||
    activePage === 'Manufacturer Catalogs' ||
    activePage === 'Discover Products' ||
    activePage === 'My Catalog Imports' ||
    activePage === 'Manufacturer Connections' ||
    activePage === 'Catalog Updates' ||
    activePage === 'Import History';

  if (isProductNetwork) {
    let subTab = 'overview';
    if (typeof activePage === 'string') {
      if (activePage.includes(':')) {
        subTab = activePage.split(':')[1].trim();
      } else {
        subTab = activePage;
      }
    }

    return (
      <ProductNetwork
        initialSubTab={subTab}
        stockItems={stockItems}
        onSaveStock={onSaveStock}
        company={company}
        currentUser={currentUser}
        users={users}
        subscriptionStatus={subscriptionStatus}
        onNavigate={onNavigate}
      />
    );
  }

  // 18. Login Screen
  if (activePage === 'Login') {
    return (
      <div className="py-4">
        <div className="row justify-content-center">
          <div className="col-xl-6 col-lg-8">
            <Login
              users={users}
              onLogin={onLogin}
              onRegister={onRegister}
              onBack={() => onNavigate(null)}
            />
          </div>
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="text-center py-5">
      <h2 className="h4 fw-bold">{activePage}</h2>
      <p className="text-muted">Section loaded. Choose an option from the menu.</p>
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => onNavigate(null)}
      >
        Close View
      </button>
    </div>
  );
}
