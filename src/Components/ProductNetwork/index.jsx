import { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  getNetworkData,
  saveNetworkData,
  syncNetworkProductsToTreadStock,
  getAccessGrants,
  grantCatalogAccess,
  revokeCatalogAccess,
  getAccessRequests,
  submitCatalogAccessRequest,
  approveAccessRequest,
  rejectAccessRequest,
  checkCatalogPaidAccess,
} from '../../services/productNetworkService.js';

import OverviewTab from './OverviewTab.jsx';
import ManufacturerCatalogsTab from './ManufacturerCatalogsTab.jsx';
import DiscoverProductsTab from './DiscoverProductsTab.jsx';
import MyImportsTab from './MyImportsTab.jsx';
import ConnectionsTab from './ConnectionsTab.jsx';
import CatalogUpdatesTab from './CatalogUpdatesTab.jsx';
import ImportHistoryTab from './ImportHistoryTab.jsx';
import NetworkSettingsTab from './NetworkSettingsTab.jsx';
import AiCatalogImportTab from './AiCatalogImportTab.jsx';
import AdminAccessTab from './AdminAccessTab.jsx';
import ProductDetailModal from './ProductDetailModal.jsx';

// Map raw menu options from TREAD navbar to internal tab keys
export function resolveProductNetworkTab(optionName) {
  if (!optionName) return 'overview';
  const norm = optionName.toLowerCase().trim();
  if (norm.includes('manufacturer catalog') || norm.includes('catalogs')) return 'catalogs';
  if (norm.includes('discover') || norm.includes('marketplace')) return 'discover';
  if (norm.includes('my catalog import') || norm.includes('my imports') || norm.includes('import to inventory')) return 'imports';
  if (norm.includes('manufacturer connection') || norm.includes('connections') || norm.includes('partners')) return 'connections';
  if (norm.includes('catalog update') || norm.includes('updates') || norm.includes('diff')) return 'updates';
  if (norm.includes('import history') || norm.includes('history')) return 'history';
  if (norm.includes('admin access') || norm.includes('grant') || norm.includes('license')) return 'admin_access';
  if (norm.includes('settings') || norm.includes('preferences')) return 'settings';
  if (norm.includes('ai') || norm.includes('importer')) return 'ai_import';
  return 'overview';
}

export default function ProductNetwork({
  initialSubTab = 'overview',
  stockItems = [],
  onSaveStock,
  company = {},
  currentUser = {},
  users = [],
  subscriptionStatus = {},
  onNavigate,
}) {
  const [activeTab, setActiveTab] = useState(() => resolveProductNetworkTab(initialSubTab));
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);

  const isMasterAdmin =
    (currentUser?.username || '').toLowerCase() === 'admin' ||
    currentUser?.role === 'Admin' ||
    subscriptionStatus?.isAdmin;

  // Initialize data from persistent local storage / indexedDB
  const [networkState, setNetworkState] = useState(() => {
    return getNetworkData(currentUser?.username);
  });

  // Access Grants and Requests state
  const [accessGrants, setAccessGrants] = useState(getAccessGrants);
  const [accessRequests, setAccessRequests] = useState(getAccessRequests);

  // Sync state changes to storage
  useEffect(() => {
    saveNetworkData(currentUser?.username, networkState);
  }, [networkState, currentUser?.username]);

  // Keep active tab in sync if initialSubTab prop changes
  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(resolveProductNetworkTab(initialSubTab));
    }
  }, [initialSubTab]);

  // Helpers to update individual slices of state
  const updateManufacturers = (updated) => setNetworkState((prev) => ({ ...prev, manufacturers: updated }));
  const updateCatalogs = (updated) => setNetworkState((prev) => ({ ...prev, catalogs: updated }));
  const updateProducts = (updated) => setNetworkState((prev) => ({ ...prev, products: updated }));
  const updateUpdates = (updated) => setNetworkState((prev) => ({ ...prev, updates: updated }));
  const updateMyImports = (updated) => setNetworkState((prev) => ({ ...prev, myImports: updated }));
  const updateHistory = (updated) => setNetworkState((prev) => ({ ...prev, history: updated }));
  const updateAuditLogs = (updated) => setNetworkState((prev) => ({ ...prev, auditLogs: updated }));
  const updateSettings = (updated) => setNetworkState((prev) => ({ ...prev, settings: updated }));

  // ========================================================================
  // ADMIN ACCESS & PAID LICENSING HANDLERS
  // ========================================================================

  const handleGrantAccess = (grantData) => {
    grantCatalogAccess(grantData);
    setAccessGrants(getAccessGrants());

    const auditEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      actor: currentUser?.username || 'admin',
      action: 'PAID_ACCESS_GRANTED',
      target: grantData.catalogName,
      details: `Admin granted paid catalog access to ${grantData.companyName || grantData.username} (License: ${grantData.licenseId}). Fee: ₹${grantData.price}`,
    };
    updateAuditLogs([auditEvent, ...networkState.auditLogs]);
  };

  const handleRevokeAccess = (grantId) => {
    const updated = revokeCatalogAccess(grantId);
    setAccessGrants(updated);

    const auditEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      actor: currentUser?.username || 'admin',
      action: 'ACCESS_REVOKED',
      target: 'Catalog Grant',
      details: `Revoked catalog access license ID: ${grantId}`,
    };
    updateAuditLogs([auditEvent, ...networkState.auditLogs]);
  };

  const handleApproveRequest = (requestId, adminUsername) => {
    approveAccessRequest(requestId, adminUsername);
    setAccessGrants(getAccessGrants());
    setAccessRequests(getAccessRequests());

    const auditEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      actor: currentUser?.username || 'admin',
      action: 'REQUEST_APPROVED',
      target: 'Company Request',
      details: `Approved company catalog access request ${requestId}`,
    };
    updateAuditLogs([auditEvent, ...networkState.auditLogs]);
  };

  const handleRejectRequest = (requestId) => {
    const updated = rejectAccessRequest(requestId);
    setAccessRequests(updated);
  };

  const handleSubmitAccessRequest = (reqData) => {
    submitCatalogAccessRequest(reqData);
    setAccessRequests(getAccessRequests());
  };

  // ========================================================================
  // CONTROLLED INTEGRATION: IMPORT TO TREAD STOCK
  // ========================================================================

  const handleImportSingleToInventory = (product) => {
    // Check paid access before allowing import
    const access = checkCatalogPaidAccess(currentUser, currentUser?.licenseId, product.catalogId);
    if (!isMasterAdmin && !access.hasAccess) {
      alert('This catalog requires paid access authorized by the Master Admin before products can be imported.');
      return;
    }

    const newImportEntry = {
      id: `imp-${uuidv4().slice(0, 8)}`,
      networkProductId: product.id,
      catalogId: product.catalogId,
      catalogVersion: product.catalogVersion || 'v1.0',
      manufacturerId: product.manufacturerId,
      manufacturerName: product.manufacturerName,
      productName: product.name,
      sku: product.sku || '',
      barcode: product.barcode || '',
      hsn: product.hsn || '',
      gstRate: product.gstRate !== undefined ? product.gstRate : 18,
      unit: product.unit || 'PCS',
      mrp: product.mrp || 0,
      networkWholesalePrice: product.wholesalePrice || 0,
      localStockItemId: null,
      localStockQty: 0,
      localSellingPrice: product.wholesalePrice || product.mrp || 0,
      mappingStatus: 'mapped',
      importedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
    };

    updateMyImports([newImportEntry, ...networkState.myImports.filter((i) => i.sku !== product.sku)]);

    // Non-destructively sync into TREAD stockItems
    if (onSaveStock) {
      const syncResult = syncNetworkProductsToTreadStock([product], stockItems, {
        preservePrices: networkState.settings?.preserveLocalPricesOnUpdate !== false,
      });
      onSaveStock(syncResult.updatedStock);
    }

    const auditEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      actor: currentUser?.username || 'admin',
      action: 'PRODUCT_IMPORTED',
      target: product.name,
      details: `Imported from ${product.manufacturerName} (${product.catalogVersion || 'v1.0'}). Added to local stock.`,
    };
    updateAuditLogs([auditEvent, ...networkState.auditLogs]);

    alert(`✓ Imported "${product.name}" into your inventory! Available immediately for billing.`);
  };

  const handleBulkImportToInventory = (productsList) => {
    if (!productsList || productsList.length === 0) return;

    // Filter to only products user has paid access to
    const allowed = productsList.filter((p) => {
      const access = checkCatalogPaidAccess(currentUser, currentUser?.licenseId, p.catalogId);
      return isMasterAdmin || access.hasAccess;
    });

    if (allowed.length === 0) {
      alert('Selected products belong to locked catalogs. Please request activation from the Master Admin first.');
      return;
    }

    const newEntries = allowed.map((p) => ({
      id: `imp-${uuidv4().slice(0, 8)}`,
      networkProductId: p.id,
      catalogId: p.catalogId,
      catalogVersion: p.catalogVersion || 'v1.0',
      manufacturerId: p.manufacturerId,
      manufacturerName: p.manufacturerName,
      productName: p.name,
      sku: p.sku || '',
      barcode: p.barcode || '',
      hsn: p.hsn || '',
      gstRate: p.gstRate !== undefined ? p.gstRate : 18,
      unit: p.unit || 'PCS',
      mrp: p.mrp || 0,
      networkWholesalePrice: p.wholesalePrice || 0,
      localStockItemId: null,
      localStockQty: 0,
      localSellingPrice: p.wholesalePrice || p.mrp || 0,
      mappingStatus: 'mapped',
      importedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
    }));

    updateMyImports([...newEntries, ...networkState.myImports]);

    if (onSaveStock) {
      const syncResult = syncNetworkProductsToTreadStock(allowed, stockItems, {
        preservePrices: networkState.settings?.preserveLocalPricesOnUpdate !== false,
      });
      onSaveStock(syncResult.updatedStock);
    }

    const auditEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      actor: currentUser?.username || 'admin',
      action: 'BULK_PRODUCTS_IMPORTED',
      target: `${allowed.length} Products`,
      details: `Bulk imported ${allowed.length} items from paid manufacturer catalogs into billing inventory.`,
    };
    updateAuditLogs([auditEvent, ...networkState.auditLogs]);

    alert(`✓ Successfully imported ${allowed.length} products into your TREAD stock inventory!`);
  };

  // Sync entire imported dataset to TREAD stock
  const handleSyncImportsToStock = (importsList) => {
    if (!onSaveStock) return;
    const itemsToSync = importsList.map((imp) => ({
      id: imp.networkProductId || imp.id,
      name: imp.productName,
      sku: imp.sku,
      barcode: imp.barcode,
      hsn: imp.hsn,
      gstRate: imp.gstRate,
      unit: imp.unit,
      mrp: imp.mrp,
      wholesalePrice: imp.networkWholesalePrice,
      catalogId: imp.catalogId,
      manufacturerName: imp.manufacturerName,
    }));

    const syncResult = syncNetworkProductsToTreadStock(itemsToSync, stockItems, {
      preservePrices: networkState.settings?.preserveLocalPricesOnUpdate !== false,
    });
    onSaveStock(syncResult.updatedStock);
  };

  // Manual mapping confirmation
  const handleMapToLocalStock = (importId, localStockId) => {
    const updated = networkState.myImports.map((i) =>
      i.id === importId ? { ...i, localStockItemId: localStockId, mappingStatus: 'mapped' } : i
    );
    updateMyImports(updated);
  };

  const handleRemoveImport = (importId) => {
    const updated = networkState.myImports.filter((i) => i.id !== importId);
    updateMyImports(updated);
  };

  // Connection management
  const handleRequestConnection = (manufacturerId, note) => {
    const updated = networkState.manufacturers.map((m) =>
      m.id === manufacturerId ? { ...m, connectionStatus: 'pending' } : m
    );
    updateManufacturers(updated);

    const mfr = networkState.manufacturers.find((m) => m.id === manufacturerId);
    const auditEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      actor: currentUser?.username || 'admin',
      action: 'CONNECTION_REQUESTED',
      target: mfr?.name || 'Manufacturer',
      details: `Sent partnership request: "${note || 'Access catalog request'}"`,
    };
    updateAuditLogs([auditEvent, ...networkState.auditLogs]);
  };

  const handleApproveConnection = (manufacturerId) => {
    const updated = networkState.manufacturers.map((m) =>
      m.id === manufacturerId
        ? {
            ...m,
            connectionStatus: 'approved',
            connectionDate: new Date().toISOString(),
            permissionTier: 'standard',
          }
        : m
    );
    updateManufacturers(updated);
  };

  const handleRevokeConnection = (manufacturerId) => {
    const updated = networkState.manufacturers.map((m) =>
      m.id === manufacturerId
        ? { ...m, connectionStatus: 'revoked', permissionTier: 'none' }
        : m
    );
    updateManufacturers(updated);
  };

  const handleUpdatePermissionTier = (manufacturerId, tier) => {
    const updated = networkState.manufacturers.map((m) =>
      m.id === manufacturerId ? { ...m, permissionTier: tier } : m
    );
    updateManufacturers(updated);
  };

  // Catalog publishing
  const handlePublishVersion = (catalogId, nextVersion, changeNotes, effectiveDate) => {
    const targetCat = networkState.catalogs.find((c) => c.id === catalogId);
    if (!targetCat) return;

    const prevVersion = targetCat.version;
    const updatedCats = networkState.catalogs.map((c) =>
      c.id === catalogId
        ? {
            ...c,
            version: nextVersion,
            status: 'published',
            publishedAt: new Date().toISOString(),
            effectiveDate,
            changeNotes,
          }
        : c
    );
    updateCatalogs(updatedCats);

    const newUpdateNotification = {
      id: `upd-${uuidv4().slice(0, 8)}`,
      catalogId,
      catalogName: targetCat.name,
      manufacturerId: targetCat.manufacturerId,
      manufacturerName: targetCat.manufacturerName,
      previousVersion: prevVersion,
      newVersion: nextVersion,
      publishedAt: new Date().toISOString(),
      changeSummary: changeNotes,
      status: 'pending',
      itemsDiff: [
        {
          productId: `prod-mod-01`,
          productName: `${targetCat.name} Products`,
          sku: 'MODIFIED',
          changeType: 'price_change',
          field: 'wholesalePrice',
          oldValue: 100,
          newValue: 110,
          status: 'pending',
        },
      ],
    };

    updateUpdates([newUpdateNotification, ...networkState.updates]);
  };

  // Diff acceptance in Catalog Updates
  const handleAcceptUpdateDiff = (updateId, diffIndex) => {
    const updated = networkState.updates.map((u) => {
      if (u.id !== updateId) return u;
      const diffs = [...u.itemsDiff];
      diffs[diffIndex] = { ...diffs[diffIndex], status: 'accepted' };
      const allResolved = diffs.every((d) => d.status !== 'pending');
      return { ...u, itemsDiff: diffs, status: allResolved ? 'accepted' : u.status };
    });
    updateUpdates(updated);
  };

  const handleRejectUpdateDiff = (updateId, diffIndex) => {
    const updated = networkState.updates.map((u) => {
      if (u.id !== updateId) return u;
      const diffs = [...u.itemsDiff];
      diffs[diffIndex] = { ...diffs[diffIndex], status: 'rejected' };
      const allResolved = diffs.every((d) => d.status !== 'pending');
      return { ...u, itemsDiff: diffs, status: allResolved ? 'rejected' : u.status };
    });
    updateUpdates(updated);
  };

  const handleAcceptAllInUpdate = (updateId) => {
    const updated = networkState.updates.map((u) => {
      if (u.id !== updateId) return u;
      return {
        ...u,
        status: 'accepted',
        itemsDiff: u.itemsDiff.map((d) => ({ ...d, status: 'accepted' })),
      };
    });
    updateUpdates(updated);
  };

  const handleRejectAllInUpdate = (updateId) => {
    const updated = networkState.updates.map((u) => {
      if (u.id !== updateId) return u;
      return {
        ...u,
        status: 'rejected',
        itemsDiff: u.itemsDiff.map((d) => ({ ...d, status: 'rejected' })),
      };
    });
    updateUpdates(updated);
  };

  // AI Import handlers
  const handleAiImportToStock = (rows) => {
    handleBulkImportToInventory(rows);

    const historyRecord = {
      id: `hist-${uuidv4().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      fileName: 'AI_Catalog_Upload.xlsx',
      fileType: 'xlsx',
      target: 'inventory',
      totalRows: rows.length,
      importedCount: rows.length,
      errorCount: 0,
      warningCount: rows.filter((r) => r._audit?.warnings?.length > 0).length,
      status: 'success',
      notes: `Imported ${rows.length} products directly into TREAD inventory.`,
    };
    updateHistory([historyRecord, ...networkState.history]);
    setActiveTab('imports');
  };

  const handleAiImportToCatalog = (catalogId, rows) => {
    const newProducts = rows.map((r) => ({
      id: `prod-${uuidv4().slice(0, 8)}`,
      catalogId,
      manufacturerId: `mfr-${currentUser?.username || 'company'}`,
      manufacturerName: company?.name || 'Authorized Brand',
      name: r.name,
      sku: r.sku,
      barcode: r.barcode,
      category: r.category || 'General',
      hsn: r.hsn,
      gstRate: r.gstRate,
      unit: r.unit,
      packSize: r.packSize,
      mrp: r.mrp,
      wholesalePrice: r.wholesalePrice,
      moq: 1,
      specs: {},
      description: '',
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=60',
      catalogVersion: 'v1.0.0',
      status: 'active',
    }));

    updateProducts([...newProducts, ...networkState.products]);

    const updatedCats = networkState.catalogs.map((c) =>
      c.id === catalogId ? { ...c, productsCount: (c.productsCount || 0) + rows.length } : c
    );
    updateCatalogs(updatedCats);

    const historyRecord = {
      id: `hist-${uuidv4().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      fileName: 'Catalog_Bulk_Import.xlsx',
      fileType: 'xlsx',
      target: 'catalog',
      totalRows: rows.length,
      importedCount: rows.length,
      errorCount: 0,
      warningCount: rows.filter((r) => r._audit?.warnings?.length > 0).length,
      status: 'success',
      notes: `Batch added ${rows.length} products to catalog.`,
    };
    updateHistory([historyRecord, ...networkState.history]);
    setActiveTab('catalogs');
  };

  // Dashboard Stats
  const overviewStats = useMemo(() => {
    const approvedMfrs = networkState.manufacturers.filter((m) => m.connectionStatus === 'approved');
    const pendingUpds = networkState.updates.filter((u) => u.status === 'pending');
    const pendingReqs = accessRequests.filter((r) => r.status === 'pending');

    const unlockedCount = isMasterAdmin
      ? networkState.catalogs.length
      : networkState.catalogs.filter((c) => checkCatalogPaidAccess(currentUser, currentUser?.licenseId, c.id).hasAccess).length;

    return {
      availableCatalogs: networkState.catalogs.length,
      activePaidCatalogs: unlockedCount,
      totalProducts: networkState.products.length,
      importedProducts: networkState.myImports.length,
      connectedManufacturers: approvedMfrs.length,
      pendingUpdates: pendingUpds.length,
      pendingRequests: pendingReqs.length,
      importErrors: 0,
    };
  }, [networkState, accessRequests, isMasterAdmin, currentUser]);

  // Navigation Items
  const NAV_ITEMS = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'catalogs', label: 'Manufacturer Catalogs', icon: '🏭' },
    { key: 'discover', label: 'Discover Products', icon: '🔍' },
    { key: 'imports', label: 'My Catalog Imports', icon: '📥' },
    { key: 'connections', label: 'Manufacturer Connections', icon: '🤝' },
    {
      key: 'updates',
      label: 'Catalog Updates',
      icon: '🔔',
      badge: overviewStats.pendingUpdates > 0 ? overviewStats.pendingUpdates : null,
    },
    { key: 'history', label: 'Import History', icon: '📜' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  if (isMasterAdmin) {
    NAV_ITEMS.push({
      key: 'admin_access',
      label: 'Admin Access & Licenses',
      icon: '🛡️',
      badge: overviewStats.pendingRequests > 0 ? `${overviewStats.pendingRequests} New` : null,
    });
  }

  return (
    <div className="product-network-container container-fluid px-3 py-3">
      {/* Top Header */}
      <div className="card border-0 rounded-4 shadow-sm bg-white mb-3 p-3">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center text-white flex-shrink-0"
              style={{
                width: '42px',
                height: '42px',
                background: 'linear-gradient(135deg, #1e1b4b 0%, #2563eb 100%)',
                fontSize: '20px',
              }}
            >
              🌐
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h4 className="fw-bold mb-0 text-dark" style={{ fontSize: '18px', letterSpacing: '-0.01em' }}>
                  TREAD Product Network
                </h4>
                <span className="badge bg-warning text-dark border font-monospace" style={{ fontSize: '10px' }}>
                  PAID ACCESS MODEL
                </span>
                {isMasterAdmin && (
                  <span className="badge bg-dark text-warning border" style={{ fontSize: '10px' }}>
                    🛡️ MASTER ADMIN
                  </span>
                )}
              </div>
              <span className="small text-muted" style={{ fontSize: '12px' }}>
                Enterprise Manufacturer-to-Distributor Catalog Exchange &bull; Account: {company?.name || currentUser?.username} ({currentUser?.licenseId || 'Admin'})
              </span>
            </div>
          </div>

          {/* Quick Right Buttons */}
          <div className="d-flex align-items-center gap-2">
            {isMasterAdmin && (
              <button
                type="button"
                className="btn btn-sm btn-dark text-warning fw-bold d-flex align-items-center gap-1 shadow-xs"
                onClick={() => setActiveTab('admin_access')}
              >
                <span>🛡️</span>
                <span>Grant Access Console</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-sm btn-outline-primary fw-semibold d-flex align-items-center gap-1"
              onClick={() => setActiveTab('ai_import')}
              title="Launch AI Excel & CSV file importer"
            >
              <span>⚡</span>
              <span>AI File Importer</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => onNavigate && onNavigate(null)}
              title="Return to TREAD Cockpit"
            >
              ✕ Exit Network
            </button>
          </div>
        </div>

        {/* Submenu Navigation Bar (Responsive Pill Tabs) */}
        <div className="product-network-tabs-bar mt-3 pt-2 border-top d-flex align-items-center gap-1 overflow-x-auto pb-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`btn btn-sm d-flex align-items-center gap-2 text-nowrap rounded-3 px-3 py-2 transition-all ${
                  isActive
                    ? 'btn-dark fw-bold shadow-xs'
                    : 'btn-outline-light text-dark border-0 hover-bg-light'
                }`}
                style={{
                  fontSize: '12.5px',
                  backgroundColor: isActive ? '#090d16' : 'transparent',
                }}
                onClick={() => setActiveTab(item.key)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && (
                  <span className="badge bg-warning text-dark font-monospace" style={{ fontSize: '10px' }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Tab Body */}
      <div className="product-network-tab-body">
        {activeTab === 'overview' && (
          <OverviewTab
            stats={overviewStats}
            recentActivity={networkState.auditLogs.slice(0, 8)}
            pendingUpdates={networkState.updates.filter((u) => u.status === 'pending')}
            onNavigateTab={setActiveTab}
            onOpenImportModal={() => setActiveTab('ai_import')}
            company={company}
            roleMode={networkState.settings?.businessRole || 'distributor'}
            currentUser={currentUser}
            isMasterAdmin={isMasterAdmin}
          />
        )}

        {activeTab === 'catalogs' && (
          <ManufacturerCatalogsTab
            catalogs={networkState.catalogs}
            products={networkState.products}
            manufacturers={networkState.manufacturers}
            onSaveCatalogs={updateCatalogs}
            onSaveProducts={updateProducts}
            onPublishVersion={handlePublishVersion}
            onOpenAiImport={() => setActiveTab('ai_import')}
            onSelectProductDetails={setSelectedProductForModal}
            company={company}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'discover' && (
          <DiscoverProductsTab
            products={networkState.products}
            catalogs={networkState.catalogs}
            manufacturers={networkState.manufacturers}
            myImports={networkState.myImports}
            onImportToInventory={handleImportSingleToInventory}
            onBulkImportToInventory={handleBulkImportToInventory}
            onRequestConnection={handleRequestConnection}
            onSelectProductDetails={setSelectedProductForModal}
            onSubmitAccessRequest={handleSubmitAccessRequest}
            currentUser={currentUser}
            accessGrants={accessGrants}
          />
        )}

        {activeTab === 'imports' && (
          <MyImportsTab
            myImports={networkState.myImports}
            stockItems={stockItems}
            onSyncImportsToStock={handleSyncImportsToStock}
            onMapToLocalStock={handleMapToLocalStock}
            onRemoveImport={handleRemoveImport}
            onSelectProductDetails={setSelectedProductForModal}
          />
        )}

        {activeTab === 'connections' && (
          <ConnectionsTab
            manufacturers={networkState.manufacturers}
            onRequestConnection={handleRequestConnection}
            onApproveConnection={handleApproveConnection}
            onRevokeConnection={handleRevokeConnection}
            onUpdatePermissionTier={handleUpdatePermissionTier}
            onNavigateToCatalogs={() => setActiveTab('catalogs')}
            company={company}
          />
        )}

        {activeTab === 'updates' && (
          <CatalogUpdatesTab
            updates={networkState.updates}
            catalogs={networkState.catalogs}
            stockItems={stockItems}
            onAcceptUpdateDiff={handleAcceptUpdateDiff}
            onRejectUpdateDiff={handleRejectUpdateDiff}
            onAcceptAllInUpdate={handleAcceptAllInUpdate}
            onRejectAllInUpdate={handleRejectAllInUpdate}
          />
        )}

        {activeTab === 'history' && (
          <ImportHistoryTab
            history={networkState.history}
            onOpenAiImport={() => setActiveTab('ai_import')}
          />
        )}

        {activeTab === 'settings' && (
          <NetworkSettingsTab
            settings={networkState.settings}
            onSaveSettings={updateSettings}
            auditLogs={networkState.auditLogs}
            company={company}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'admin_access' && (
          <AdminAccessTab
            catalogs={networkState.catalogs}
            accessGrants={accessGrants}
            accessRequests={accessRequests}
            users={users}
            onGrantAccess={handleGrantAccess}
            onRevokeAccess={handleRevokeAccess}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'ai_import' && (
          <AiCatalogImportTab
            catalogs={networkState.catalogs}
            stockItems={stockItems}
            onImportToTreadStock={handleAiImportToStock}
            onImportToCatalog={handleAiImportToCatalog}
            onCancel={() => setActiveTab('overview')}
          />
        )}
      </div>

      {/* Global Product Specification Modal */}
      {selectedProductForModal && (
        <ProductDetailModal
          product={selectedProductForModal}
          onClose={() => setSelectedProductForModal(null)}
          onImportToInventory={handleImportSingleToInventory}
          isImported={networkState.myImports.some((i) => i.sku === selectedProductForModal.sku)}
          isManufacturerView={false}
        />
      )}
    </div>
  );
}
