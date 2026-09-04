import { lazy } from 'react';

// Lazy-loaded feature views
const Dashboard = lazy(() => import('./Dashboard/Dashboard.jsx'));
const InvoiceEditor = lazy(() => import('./CreateInvoice/InvoiceEditor.jsx'));
const InvoicesList = lazy(() => import('./Invoices/InvoicesList.jsx'));
const CompanyProfile = lazy(() => import('./Company/CompanyProfile.jsx'));
const Reports = lazy(() => import('./Reports/Reports.jsx'));
const UserManagement = lazy(() => import('./Administration/UserManagement.jsx'));
const AppSettings = lazy(() => import('./Administration/AppSettings.jsx'));
const RolesPermissions = lazy(() => import('./Administration/RolesPermissions.jsx'));
const Housekeeping = lazy(() => import('./Housekeeping/Housekeeping.jsx'));
const HelpCenter = lazy(() => import('./Help/HelpCenter.jsx'));
const ManageFavourites = lazy(() => import('./Favourites/ManageFavourites.jsx'));
const CustomersPage = lazy(() => import('./Customers/CustomersPage.jsx'));
const StockManagement = lazy(() => import('./Stock/StockManagement.jsx'));
const ItemCatalogApi = lazy(() => import('./Administration/ItemCatalogApi.jsx'));
const DeviceAccessControl = lazy(() => import('./Administration/DeviceAccessControl.jsx'));
const GstHub = lazy(() => import('./GST/GstHub.jsx'));
import Login from './Login/Login.jsx';

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

  // 10. Reports
  if (activePage === 'Reports') {
    return (
      <Reports
        key={activePage}
        invoices={invoices}
        company={company}
        onDownloadPDF={onDownloadPDF}
      />
    );
  }

  // 11. Users & Administration
  if (activePage === 'Users') {
    return (
      <UserManagement
        key={activePage}
        currentUser={currentUser}
        users={users}
        onSwitchUser={onLogin}
        onBack={() => onNavigate(null)}
      />
    );
  }

  // 12. Settings
  if (activePage === 'Settings') {
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

  // 17. GST Hub (All GST returns, file importer, reconciliations)
  if (
    activePage === 'GST' ||
    activePage === 'GST File Importer (All Types)' ||
    activePage === 'GSTR-1 (Sales Outward)' ||
    activePage === 'GSTR-2B (ITC Reconcile)' ||
    activePage === 'GSTR-3B Return Summary' ||
    activePage === 'GSTIN & HSN Directory'
  ) {
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
