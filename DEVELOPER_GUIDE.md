# Tread — Developer Guide & Codebase Architecture Deep-Dive

Welcome to the **Tread Developer Guide**. This document is specifically written for **intermediate-level developers** looking to understand how Tread is designed, how data flows through it, and how to confidently extend or debug any feature in the codebase.

---

## 🧭 Architecture at a Glance

Tread is structured into 4 distinct layers:

```
[Presentation Layer]     React 19 Components (Lazy Loaded, ViewRouter.jsx)
        ▲
        │ Props & Callbacks
        ▼
[State Management Layer] src/Index.jsx (In-Memory React State + Custom Hooks)
        ▲
        │ Synchronous Writes & Asynchronous Sync
        ▼
[Storage & Cloud Layer]  LocalStorage (Offline 0ms) + Firebase Firestore (Cloud)
        ▲
        │ Hardware Bridges
        ▼
[Native Platform Layer]  Capacitor Plugins (StatusBar, App, SplashScreen)
```

---

## 1. Directory Anatomy & The Barrel Export Pattern

Every directory in `src/Components/` follows the **Barrel Pattern**:
```
src/Components/CreateInvoice/
├── InvoiceEditor.jsx        # Core table & keyboard grid logic
├── InvoiceTotals.jsx        # Summary footer (CGST, SGST, IGST, Net Total)
├── InvoiceHeader.jsx        # Customer selector, invoice number, date picker
├── ActionButtons.jsx        # Save, Reset, Print, PDF, WhatsApp buttons
└── index.jsx                # Barrel: exports { InvoiceEditor, InvoiceTotals, ... }
```

### Why this matters to you:
- You never need to remember the internal filename inside a component folder.
- Simply import from the folder: `import { InvoiceEditor } from './Components/CreateInvoice';`.
- If you refactor or split an internal file into two, other components won't break as long as `index.jsx` continues exporting the public interface.

---

## 2. State Management: The "Lifted State" Paradigm

Instead of adding the complexity of Redux or Zustand, Tread uses **Lifted React State** in `src/Index.jsx`:

1. **Why?**
   - GST Invoicing requires multiple independent components to react immediately to data changes:
     - When you add a new customer in `Customers/`, the dropdown in `CreateInvoice/` must instantly have it.
     - When you save an invoice in `CreateInvoice/`, `Invoices/` (list view), `Dashboard/` (metrics), and `Reports/` (P&L) must reflect it immediately.
     - When you purchase stock in `PurchaseBills/`, `Stock/` inventory counts must update immediately.
   - Having all primary entity lists (`invoices`, `customers`, `stockItems`, `purchaseBills`) in `src/Index.jsx` ensures a **Single Source of Truth**.

2. **Persistence Guarantee:**
   - Every entity has a twin `useEffect`:
     ```javascript
     useEffect(() => {
       if (typeof window === 'undefined' || !currentUser) return;
       window.localStorage.setItem(invoiceStorageKey(currentUser.username), JSON.stringify(invoices));
     }, [invoices, currentUser]);
     ```
   - If the user closes the browser or the app crashes, zero data is lost.

---

## 3. The Indian GST Tax Calculation Engine

Indian Goods and Services Tax (GST) follows strict legal rules implemented in `src/Index.jsx` and `src/services/gstinValidator.js`.

### How Inter-State vs Intra-State is Determined:
1. Every GSTIN has 15 characters. The first 2 digits are the **State Code**:
   - `07` = Delhi
   - `27` = Maharashtra
   - `24` = Gujarat
2. If `Customer State Code === Seller State Code`:
   - Tax is split **50% CGST** and **50% SGST**.
   - Example: 18% GST on ₹1,000 = ₹90 CGST + ₹90 SGST.
3. If `Customer State Code !== Seller State Code`:
   - 100% of tax is **IGST**.
   - Example: 18% GST on ₹1,000 = ₹180 IGST.

### Real-Time Math (`totals` useMemo in `src/Index.jsx`):
```javascript
const totals = useMemo(() => {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.rate)), 0);
  const totalGst = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.rate) * Number(item.gstPercent)) / 100, 0);
  const isCentral = invoiceType === 'central';
  return {
    subtotal,
    cgst: isCentral ? 0 : totalGst / 2,
    sgst: isCentral ? 0 : totalGst / 2,
    igst: isCentral ? totalGst : 0,
    totalGst,
    total: subtotal + totalGst,
  };
}, [items, invoiceType]);
```

---

## 4. Excel-Style Spreadsheet Billing Grid

In `src/Components/CreateInvoice/InvoiceEditor.jsx`, the line item table mimics a desktop spreadsheet:

- **Arrow Key Navigation:** Keyboard events listen for `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` and calculate the next active cell `(rowIndex, colIndex)`.
- **Auto-Row Creation:** Pressing `Tab` or `Enter` on the last cell (`gstPercent`) triggers `addItem()` and moves focus to the first cell of the newly created row.
- **Clipboard TSV Paste:** A custom `onPaste` handler splits pasted text by tabs (`\t`) and newlines (`\r?\n`), allowing users to copy 50 rows from Excel and paste them directly into the invoice.
- **Type Safety on Number Inputs:** 
  - Text fields (`description`, `hsn`, `unit`) are stored as strings.
  - Number fields (`quantity`, `rate`, `gstPercent`) are coerced to numbers.

---

## 5. Cloud Sync Engine (Firebase Firestore)

The cloud sync engine is located in `src/services/firebase.js`:
- Document path: `user-data/{username}`
- When local changes occur: A debounced function sends the JSON payload to Firestore.
- When remote changes occur (e.g. edited on another tablet or phone):
  `subscribeUserDataFromCloud` receives the snapshot and updates local state through `isRemoteSyncingRef` to prevent infinite feedback loops.

---

## 6. Capacitor Native Android Integration

Tread runs natively on Android via Capacitor. Three key native lifecycle controls are handled in `src/Index.jsx`:

1. **Hardware Back Button:**
   ```javascript
   CapApp.addListener('backButton', ({ canGoBack }) => {
     if (activePage !== 'Dashboard') {
       setActivePage('Dashboard'); // return to home before exiting
     } else {
       setShowExitModal(true);     // ask confirmation to exit app
     }
   });
   ```
2. **Status Bar & Splash Screen:**
   - Dark/light status bar theming via `@capacitor/status-bar`.
   - Smooth splash screen dismiss via `SplashScreen.hide()`.

---

## 7. Common Gotchas & Best Practices for Contributors

1. **Never mutate state directly:**
   - ❌ `items.push(newItem)`
   - ✅ `setItems(prev => [...prev, newItem])`
2. **Preserve Barrel Exports:**
   - When adding a new component file inside any folder in `src/Components/`, always export it from that folder's `index.jsx`.
3. **Always Run Linter:**
   - Run `npm run lint` before committing. Tread enforces zero ESLint warnings and errors.
