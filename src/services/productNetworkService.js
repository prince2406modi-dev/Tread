/**
 * TREAD PRODUCT NETWORK SERVICE
 * -------------------------------------------------------------
 * Modular business-to-business product catalog network, AI-powered
 * import engine, permission-based manufacturer connections, and
 * non-destructive integration with TREAD GST Billing & Stock Inventory.
 */

import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { COMMON_HSN_SAC_CODES, validateHSN } from './hsnValidator.js';
import { validateGSTIN } from './gstinValidator.js';

// Local storage keys scoped by company / user
const STORAGE_PREFIX = 'tread_product_network';
const getKey = (scope, username) => `${STORAGE_PREFIX}_${scope}_${(username || 'admin').toLowerCase().trim()}`;
const getGlobalKey = (scope) => `${STORAGE_PREFIX}_${scope}_global`;

// Standard GST Rate slabs recognized in Indian GST law
export const STANDARD_GST_RATES = [0, 5, 12, 18, 28];

// ============================================================================
// REALISTIC INITIAL SEED DATA
// ============================================================================

export const SEED_MANUFACTURERS = [
  {
    id: 'mfr-havells',
    name: 'Havells India Limited',
    brandName: 'Havells',
    gstin: '07AAACH1234F1Z9',
    state: 'Delhi',
    city: 'Noida',
    category: 'Electrical & Electronics',
    description: 'Leading Fast Moving Electrical Goods (FMEG) company with pan-India distribution.',
    verified: true,
    logoUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=100&auto=format&fit=crop&q=60',
    contactPhone: '+91 120 4771000',
    contactEmail: 'connect@havells.com',
    catalogsCount: 2,
    productsCount: 18,
    connectionStatus: 'approved',
    connectionDate: '2026-08-15T10:00:00.000Z',
    permissionTier: 'full',
  },
  {
    id: 'mfr-dabur',
    name: 'Dabur India Ltd',
    brandName: 'Dabur',
    gstin: '07AAACD1111Q1Z8',
    state: 'Uttar Pradesh',
    city: 'Ghaziabad',
    category: 'FMCG & Consumer Goods',
    description: 'One of India’s largest Ayurvedic and natural consumer healthcare product manufacturers.',
    verified: true,
    logoUrl: 'https://images.unsplash.com/photo-1608248597359-5776269b6dbd?w=100&auto=format&fit=crop&q=60',
    contactPhone: '+91 120 3982000',
    contactEmail: 'supplychain@dabur.com',
    catalogsCount: 1,
    productsCount: 14,
    connectionStatus: 'approved',
    connectionDate: '2026-09-01T14:30:00.000Z',
    permissionTier: 'standard',
  },
  {
    id: 'mfr-astral',
    name: 'Astral Pipes & Fittings Ltd',
    brandName: 'Astral',
    gstin: '24AAACA5555L1Z1',
    state: 'Gujarat',
    city: 'Ahmedabad',
    category: 'Plumbing & Building Materials',
    description: 'Pioneers in CPVC piping systems, drainage solutions, and advanced industrial plumbing.',
    verified: true,
    logoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100&auto=format&fit=crop&q=60',
    contactPhone: '+91 79 66212000',
    contactEmail: 'catalog@astralpipes.com',
    catalogsCount: 1,
    productsCount: 12,
    connectionStatus: 'none',
    connectionDate: null,
    permissionTier: 'none',
  },
  {
    id: 'mfr-tatasteel',
    name: 'Tata Steel Ltd - Tiscon',
    brandName: 'Tata Tiscon',
    gstin: '20AAACT2702H1ZZ',
    state: 'Jharkhand',
    city: 'Jamshedpur',
    category: 'Building & Construction',
    description: 'India’s leading rebar and structural steel manufacturer, greenpro certified.',
    verified: true,
    logoUrl: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=100&auto=format&fit=crop&q=60',
    contactPhone: '+91 657 2426666',
    contactEmail: 'distributors@tatasteel.com',
    catalogsCount: 1,
    productsCount: 8,
    connectionStatus: 'pending',
    connectionDate: '2026-10-20T09:15:00.000Z',
    permissionTier: 'standard',
  },
  {
    id: 'mfr-sunpharma',
    name: 'Sun Pharmaceutical Industries Ltd',
    brandName: 'Sun Pharma',
    gstin: '27AAACS1000B1ZU',
    state: 'Maharashtra',
    city: 'Mumbai',
    category: 'Pharmaceuticals & Healthcare',
    description: 'Global specialty pharmaceutical company with therapeutic presence across all clinical branches.',
    verified: true,
    logoUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100&auto=format&fit=crop&q=60',
    contactPhone: '+91 22 43244324',
    contactEmail: 'trade@sunpharma.com',
    catalogsCount: 1,
    productsCount: 15,
    connectionStatus: 'none',
    connectionDate: null,
    permissionTier: 'none',
  },
];

export const SEED_CATALOGS = [
  {
    id: 'cat-havells-elec-2026',
    manufacturerId: 'mfr-havells',
    manufacturerName: 'Havells India Limited',
    name: 'Havells Master Electrical & Lighting Catalog 2026',
    version: 'v2.1.0',
    category: 'Electrical & Electronics',
    description: 'Comprehensive wholesale price list for switches, LED battens, MCBs, and industrial cables.',
    status: 'published',
    publishedAt: '2026-10-10T12:00:00.000Z',
    effectiveDate: '2026-10-15',
    productsCount: 10,
    sharingMode: 'connection_only',
    changeNotes: 'Revised brass terminal MCB rates and introduced 9W Glitz Smart LED lamps.',
    pricePerYear: 1499,
    tier: 'Paid - Premium',
    isPaid: true,
  },
  {
    id: 'cat-dabur-wellness-2026',
    manufacturerId: 'mfr-dabur',
    manufacturerName: 'Dabur India Ltd',
    name: 'Dabur Ayurvedic Healthcare & Wellness Catalog',
    version: 'v3.0.0',
    category: 'FMCG & Consumer Goods',
    description: 'Standard OTC remedies, Chyawanprash, honey, digestive drops, and oral hygiene.',
    status: 'published',
    publishedAt: '2026-09-25T15:00:00.000Z',
    effectiveDate: '2026-10-01',
    productsCount: 8,
    sharingMode: 'public',
    changeNotes: 'Added 1kg family pack Dabur Chyawanprash and revised GST rate documentation.',
    pricePerYear: 999,
    tier: 'Paid - Standard',
    isPaid: true,
  },
  {
    id: 'cat-astral-cpvc-2026',
    manufacturerId: 'mfr-astral',
    manufacturerName: 'Astral Pipes & Fittings Ltd',
    name: 'Astral ProFlow CPVC & Industrial Fittings',
    version: 'v1.4.0',
    category: 'Plumbing & Building Materials',
    description: 'SDR 11 and SDR 13.5 CPVC pipes, brass transition fittings, and solvent cements.',
    status: 'published',
    publishedAt: '2026-09-18T11:00:00.000Z',
    effectiveDate: '2026-10-01',
    productsCount: 6,
    sharingMode: 'public',
    changeNotes: 'Standardized pack sizes and updated barcode formats.',
    pricePerYear: 1299,
    tier: 'Paid - Standard',
    isPaid: true,
  },
  {
    id: 'cat-tatasteel-rebars-2026',
    manufacturerId: 'mfr-tatasteel',
    manufacturerName: 'Tata Steel Ltd - Tiscon',
    name: 'Tata Tiscon 550D Super Ductile Rebars',
    version: 'v2.0.0',
    category: 'Building & Construction',
    description: 'High ductile earthquake-resistant TMT rebars 8mm to 32mm with test certificates.',
    status: 'published',
    publishedAt: '2026-10-01T08:00:00.000Z',
    effectiveDate: '2026-10-05',
    productsCount: 5,
    sharingMode: 'connection_only',
    changeNotes: 'New 550D metallurgy release with enhanced rib design.',
    pricePerYear: 1999,
    tier: 'Paid - Enterprise',
    isPaid: true,
  },
];

export const SEED_PRODUCTS = [
  // Havells products
  {
    id: 'prod-hav-001',
    catalogId: 'cat-havells-elec-2026',
    manufacturerId: 'mfr-havells',
    manufacturerName: 'Havells India Limited',
    name: 'Havells Crabtree Verona 6A Modular Switch 1-Way (White)',
    sku: 'HVL-CRB-VR6A-W',
    barcode: '8901765012341',
    category: 'Modular Switches',
    hsn: '8536',
    gstRate: 18,
    unit: 'PCS',
    packSize: '20 Pcs / Box',
    mrp: 145,
    wholesalePrice: 98,
    moq: 20,
    specs: {
      Current: '6 Amperes',
      Voltage: '240V AC',
      Material: 'Polycarbonate Flame Retardant',
      Color: 'Arctic White',
      Warranty: '10 Years',
    },
    description: 'Premium soft click modular switch with silver cadmium oxide contacts for extended electrical life.',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&auto=format&fit=crop&q=60',
    catalogVersion: 'v2.1.0',
    status: 'active',
  },
  {
    id: 'prod-hav-002',
    catalogId: 'cat-havells-elec-2026',
    manufacturerId: 'mfr-havells',
    manufacturerName: 'Havells India Limited',
    name: 'Havells Crabtree Verona 16A Power Socket 3-Pin with Shutter',
    sku: 'HVL-CRB-VR16S-W',
    barcode: '8901765012358',
    category: 'Modular Switches',
    hsn: '8536',
    gstRate: 18,
    unit: 'PCS',
    packSize: '10 Pcs / Box',
    mrp: 235,
    wholesalePrice: 162,
    moq: 10,
    specs: {
      Current: '16 Amperes',
      Safety: 'Child-proof Safety Shutter',
      Contacts: 'Phosphor Bronze Heavy Gauge',
      Color: 'Arctic White',
    },
    description: 'Heavy duty modular power socket for air conditioners, geysers, and kitchen appliances.',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=60',
    catalogVersion: 'v2.1.0',
    status: 'active',
  },
  {
    id: 'prod-hav-003',
    catalogId: 'cat-havells-elec-2026',
    manufacturerId: 'mfr-havells',
    manufacturerName: 'Havells India Limited',
    name: 'Havells Adore 9W B22 LED Bulb (Cool Day White 6500K)',
    sku: 'HVL-ADR-9W-CDW',
    barcode: '8901765012365',
    category: 'LED Lighting',
    hsn: '8539',
    gstRate: 18,
    unit: 'PCS',
    packSize: '10 Pcs / Pack',
    mrp: 120,
    wholesalePrice: 72,
    moq: 20,
    specs: {
      Wattage: '9 Watts',
      Base: 'B22 Standard Pin',
      Lumen: '900 Lumens (100 Lm/W)',
      SurgeProtection: '4 kV High Surge',
    },
    description: 'High lumen energy efficient LED lamp with wide beam angle and 25,000 burning hours lifespan.',
    imageUrl: 'https://images.unsplash.com/photo-1550524514-9b578e079737?w=300&auto=format&fit=crop&q=60',
    catalogVersion: 'v2.1.0',
    status: 'active',
  },
  {
    id: 'prod-hav-004',
    catalogId: 'cat-havells-elec-2026',
    manufacturerId: 'mfr-havells',
    manufacturerName: 'Havells India Limited',
    name: 'Havells Euro-X 32A C-Curve Single Pole MCB (10kA)',
    sku: 'HVL-ERX-32A-1P',
    barcode: '8901765012372',
    category: 'Circuit Protection',
    hsn: '8536',
    gstRate: 18,
    unit: 'PCS',
    packSize: '12 Pcs / Box',
    mrp: 310,
    wholesalePrice: 215,
    moq: 6,
    specs: {
      Poles: 'Single Pole (1P)',
      RatedCurrent: '32A',
      Curve: 'C-Curve',
      BreakingCapacity: '10kA IS/IEC 60898-1',
    },
    description: 'Miniature Circuit Breaker with mid-trip indicator and dual-termination bi-connect terminals.',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&auto=format&fit=crop&q=60',
    catalogVersion: 'v2.1.0',
    status: 'active',
  },
  {
    id: 'prod-hav-005',
    catalogId: 'cat-havells-elec-2026',
    manufacturerId: 'mfr-havells',
    manufacturerName: 'Havells India Limited',
    name: 'Havells Life Line Plus S3 HRFR 1.5 sq mm Single Core Cable (90m Red)',
    sku: 'HVL-LLP-1.5MM-RED',
    barcode: '8901765012389',
    category: 'Cables & Wires',
    hsn: '8544',
    gstRate: 18,
    unit: 'COIL',
    packSize: '90 Meters / Coil',
    mrp: 2650,
    wholesalePrice: 1940,
    moq: 2,
    specs: {
      Conductor: '100% Electrolytic High Purity Copper',
      Insulation: 'Heat Resistant Flame Retardant (HRFR)',
      Length: '90 Meters',
      Color: 'Red',
    },
    description: 'Certified RoHS compliant home wiring cable with 101% conductivity for lower power bills.',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=60',
    catalogVersion: 'v2.1.0',
    status: 'active',
  },

  // Dabur products
  {
    id: 'prod-dab-001',
    catalogId: 'cat-dabur-wellness-2026',
    manufacturerId: 'mfr-dabur',
    manufacturerName: 'Dabur India Ltd',
    name: 'Dabur Chyawanprash 2X Immunity Booster (1 Kg Jar)',
    sku: 'DAB-CHY-1KG',
    barcode: '8901207010012',
    category: 'Ayurvedic & Health',
    hsn: '3004',
    gstRate: 12,
    unit: 'JAR',
    packSize: '1 Kg / Jar (12 Jars/Case)',
    mrp: 450,
    wholesalePrice: 355,
    moq: 12,
    specs: {
      Weight: '1 Kilogram',
      KeyIngredients: 'Amla, Ashwagandha, Pippali, Giloy',
      Form: 'Herbal Paste',
      ShelfLife: '24 Months',
    },
    description: 'Clinically tested Ayurvedic formulation containing 40+ herbs to double antibody count and combat infections.',
    imageUrl: 'https://images.unsplash.com/photo-1608248597359-5776269b6dbd?w=300&auto=format&fit=crop&q=60',
    catalogVersion: 'v3.0.0',
    status: 'active',
  },
  {
    id: 'prod-dab-002',
    catalogId: 'cat-dabur-wellness-2026',
    manufacturerId: 'mfr-dabur',
    manufacturerName: 'Dabur India Ltd',
    name: 'Dabur 100% Pure Raw Squeezy Honey (500g Bottle)',
    sku: 'DAB-HNY-500G-SQZ',
    barcode: '8901207010029',
    category: 'Food & Nutrition',
    hsn: '0402',
    gstRate: 5,
    unit: 'BTL',
    packSize: '500 Grams (24 Bottles/Case)',
    mrp: 230,
    wholesalePrice: 178,
    moq: 24,
    specs: {
      Weight: '500 Grams',
      Type: 'NMR Tested 100% Pure Honey',
      Packaging: 'Anti-Drip Squeezy Dispenser',
      FSSAI: '10012011000618',
    },
    description: 'NMR laboratory verified pure honey sourced from Himalayan apiaries without added sugar.',
    imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300&auto=format&fit=crop&q=60',
    catalogVersion: 'v3.0.0',
    status: 'active',
  },
  {
    id: 'prod-dab-003',
    catalogId: 'cat-dabur-wellness-2026',
    manufacturerId: 'mfr-dabur',
    manufacturerName: 'Dabur India Ltd',
    name: 'Dabur Red Ayurvedic Toothpaste (200g + 50g Extra)',
    sku: 'DAB-RED-250G',
    barcode: '8901207010036',
    category: 'Oral Care',
    hsn: '3306',
    gstRate: 18,
    unit: 'PCS',
    packSize: '250 Grams (36 Tubes/Case)',
    mrp: 140,
    wholesalePrice: 104,
    moq: 12,
    specs: {
      Weight: '250 Grams',
      KeyHerbs: 'Laung (Clove), Pudina (Mint), Tomar Beej',
      Fluoride: 'No Chemical Fluoride',
    },
    description: 'India’s No. 1 Ayurvedic toothpaste providing 7 dental protection benefits against toothache and cavities.',
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=60',
    catalogVersion: 'v3.0.0',
    status: 'active',
  },

  // Astral Pipes
  {
    id: 'prod-ast-001',
    catalogId: 'cat-astral-cpvc-2026',
    manufacturerId: 'mfr-astral',
    manufacturerName: 'Astral Pipes & Fittings Ltd',
    name: 'Astral CPVC Pro 3/4" (20mm) SDR 11 Plumbing Pipe (3 Meter)',
    sku: 'AST-CPVC-20MM-3M',
    barcode: '8904123001015',
    category: 'Pipes & Tubing',
    hsn: '3917',
    gstRate: 18,
    unit: 'MTR',
    packSize: '3 Meters / Length (30 Pcs/Bundle)',
    mrp: 385,
    wholesalePrice: 280,
    moq: 10,
    specs: {
      Size: '20mm (3/4 Inch)',
      Standard: 'ASTM D2846 / IS 15778',
      Pressure: 'Class 1 (SDR 11) - 28.1 Bar at 23°C',
      MaxTemp: '93° Celsius',
    },
    description: 'Hot and cold water distribution pipe with NSF-61 certified lead-free compound.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=60',
    catalogVersion: 'v1.4.0',
    status: 'active',
  },
  {
    id: 'prod-ast-002',
    catalogId: 'cat-astral-cpvc-2026',
    manufacturerId: 'mfr-astral',
    manufacturerName: 'Astral Pipes & Fittings Ltd',
    name: 'Astral CPVC Pro Brass Female Threaded Elbow (20mm x 1/2")',
    sku: 'AST-CPVC-BFTA-20X15',
    barcode: '8904123001022',
    category: 'Pipe Fittings',
    hsn: '3917',
    gstRate: 18,
    unit: 'PCS',
    packSize: '25 Pcs / Box',
    mrp: 145,
    wholesalePrice: 96,
    moq: 25,
    specs: {
      Inlet: '20mm CPVC Solvent Socket',
      Outlet: '1/2" Female BSP Brass Thread',
      InsertMaterial: 'DZR Brass Heavy Duty',
    },
    description: 'Transition elbow designed for leak-proof connection with chrome faucets and mixer units.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=60',
    catalogVersion: 'v1.4.0',
    status: 'active',
  },

  // Tata Steel Tiscon
  {
    id: 'prod-tat-001',
    catalogId: 'cat-tatasteel-rebars-2026',
    manufacturerId: 'mfr-tatasteel',
    manufacturerName: 'Tata Steel Ltd - Tiscon',
    name: 'Tata Tiscon 550D Super Ductile TMT Rebar 12mm (12m Length)',
    sku: 'TAT-TSC-550D-12MM',
    barcode: '8902500001019',
    category: 'Steel & Rebars',
    hsn: '7214',
    gstRate: 18,
    unit: 'KGS',
    packSize: '12 Meters (10.66 Kg per Piece)',
    mrp: 85,
    wholesalePrice: 68.5,
    moq: 500,
    specs: {
      Diameter: '12 mm',
      Grade: 'Fe 550D',
      YieldStrength: '550 MPa Min',
      Elongation: '14.5% Min',
      Standard: 'IS 1786:2008',
    },
    description: 'Thermo-mechanically treated primary steel rebar engineered for high seismic load tolerance.',
    imageUrl: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=300&auto=format&fit=crop&q=60',
    catalogVersion: 'v2.0.0',
    status: 'active',
  },
];

export const SEED_CATALOG_UPDATES = [
  {
    id: 'upd-havells-2026-10',
    catalogId: 'cat-havells-elec-2026',
    catalogName: 'Havells Master Electrical & Lighting Catalog 2026',
    manufacturerId: 'mfr-havells',
    manufacturerName: 'Havells India Limited',
    previousVersion: 'v2.0.0',
    newVersion: 'v2.1.0',
    publishedAt: '2026-10-10T12:00:00.000Z',
    changeSummary: 'Price revisions (+4.5% on brass MCBs), 2 new LED items added, 1 obsolete switch discontinued.',
    status: 'pending',
    itemsDiff: [
      {
        productId: 'prod-hav-004',
        productName: 'Havells Euro-X 32A C-Curve Single Pole MCB (10kA)',
        sku: 'HVL-ERX-32A-1P',
        changeType: 'price_change',
        field: 'wholesalePrice',
        oldValue: 198,
        newValue: 215,
        status: 'pending',
      },
      {
        productId: 'prod-hav-004',
        productName: 'Havells Euro-X 32A C-Curve Single Pole MCB (10kA)',
        sku: 'HVL-ERX-32A-1P',
        changeType: 'price_change',
        field: 'mrp',
        oldValue: 285,
        newValue: 310,
        status: 'pending',
      },
      {
        productId: 'prod-hav-003',
        productName: 'Havells Adore 9W B22 LED Bulb (Cool Day White 6500K)',
        sku: 'HVL-ADR-9W-CDW',
        changeType: 'hsn_verified',
        field: 'hsn',
        oldValue: '8539',
        newValue: '8539.52.00',
        status: 'pending',
      },
      {
        productId: 'prod-hav-new-001',
        productName: 'Havells Glitz Smart Wi-Fi Batten 20W RGB + White',
        sku: 'HVL-GLZ-20W-RGB',
        changeType: 'new_product',
        field: 'product',
        oldValue: null,
        newValue: {
          mrp: 1499,
          wholesalePrice: 940,
          gstRate: 18,
          hsn: '8539',
          unit: 'PCS',
        },
        status: 'pending',
      },
    ],
  },
];

export const SEED_MY_IMPORTS = [];

export const SEED_ACCESS_GRANTS = [
  {
    id: 'grant-sample-01',
    catalogId: 'cat-havells-elec-2026',
    catalogName: 'Havells Master Electrical & Lighting Catalog 2026',
    manufacturerName: 'Havells India Limited',
    username: 'admin',
    licenseId: '91-00-000-000000',
    companyName: 'Master Enterprise',
    paymentStatus: 'paid',
    amountPaid: 1499,
    validUntil: '2099-12-31',
    grantedBy: 'admin',
    grantedAt: '2026-10-01T10:00:00.000Z',
    notes: 'Master Administrator Unlimited Catalog Access',
  },
];

export const ACCESS_GRANTS_KEY = 'tread_product_network_access_grants_global';
export const ACCESS_REQUESTS_KEY = 'tread_product_network_access_requests_global';

export function getAccessGrants() {
  if (typeof window === 'undefined') return SEED_ACCESS_GRANTS;
  try {
    const raw = window.localStorage.getItem(ACCESS_GRANTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to load access grants:', err);
  }
  return SEED_ACCESS_GRANTS;
}

export function saveAccessGrants(grants) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACCESS_GRANTS_KEY, JSON.stringify(grants));
  } catch (err) {
    console.warn('Failed to save access grants:', err);
  }
}

export function grantCatalogAccess({
  username,
  licenseId,
  companyName,
  catalogId,
  catalogName,
  manufacturerName,
  price = 1499,
  validUntil,
  paymentStatus = 'paid',
  adminUsername = 'admin',
  notes = 'Paid catalog access authorized by Admin',
}) {
  const grants = getAccessGrants();
  const cleanUser = (username || '').toLowerCase().trim();

  // Filter out any duplicate grant for this user/license & catalog
  const filtered = grants.filter(
    (g) =>
      !(
        ((g.username && g.username.toLowerCase().trim() === cleanUser) ||
          (licenseId && g.licenseId === licenseId)) &&
        g.catalogId === catalogId
      )
  );

  const newGrant = {
    id: `grant-${uuidv4().slice(0, 8)}`,
    username: cleanUser,
    licenseId: licenseId || '',
    companyName: companyName || '',
    catalogId,
    catalogName: catalogName || '',
    manufacturerName: manufacturerName || '',
    paymentStatus,
    amountPaid: Number(price) || 0,
    validUntil: validUntil || `${new Date().getFullYear() + 1}-12-31`,
    grantedBy: adminUsername || 'admin',
    grantedAt: new Date().toISOString(),
    notes,
  };

  const updated = [newGrant, ...filtered];
  saveAccessGrants(updated);
  return newGrant;
}

export function revokeCatalogAccess(grantId) {
  const grants = getAccessGrants();
  const updated = grants.filter((g) => g.id !== grantId);
  saveAccessGrants(updated);
  return updated;
}

export function getAccessRequests() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ACCESS_REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAccessRequests(requests) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(requests));
  } catch {}
}

export function submitCatalogAccessRequest({
  catalogId,
  catalogName,
  manufacturerName,
  username,
  licenseId,
  companyName,
  notes = '',
}) {
  const requests = getAccessRequests();
  const newReq = {
    id: `req-${uuidv4().slice(0, 8)}`,
    catalogId,
    catalogName,
    manufacturerName,
    username: username || '',
    licenseId: licenseId || '',
    companyName: companyName || '',
    notes,
    requestedAt: new Date().toISOString(),
    status: 'pending',
  };
  const updated = [newReq, ...requests];
  saveAccessRequests(updated);
  return newReq;
}

export function approveAccessRequest(requestId, adminUsername = 'admin') {
  const requests = getAccessRequests();
  const req = requests.find((r) => r.id === requestId);
  if (!req) return null;

  const updatedRequests = requests.map((r) =>
    r.id === requestId ? { ...r, status: 'approved', approvedAt: new Date().toISOString() } : r
  );
  saveAccessRequests(updatedRequests);

  return grantCatalogAccess({
    username: req.username,
    licenseId: req.licenseId,
    companyName: req.companyName,
    catalogId: req.catalogId,
    catalogName: req.catalogName,
    manufacturerName: req.manufacturerName,
    paymentStatus: 'paid',
    price: 1499,
    adminUsername,
    notes: `Approved request from ${req.companyName || req.username} (License: ${req.licenseId})`,
  });
}

export function rejectAccessRequest(requestId) {
  const requests = getAccessRequests();
  const updated = requests.map((r) =>
    r.id === requestId ? { ...r, status: 'rejected', rejectedAt: new Date().toISOString() } : r
  );
  saveAccessRequests(updated);
  return updated;
}

export function checkCatalogPaidAccess(user, licenseId, catalogId) {
  const uname = (user?.username || '').toLowerCase().trim();
  const isMasterAdmin = uname === 'admin' || user?.role === 'Admin';
  if (isMasterAdmin) {
    return {
      hasAccess: true,
      status: 'admin',
      label: '✓ Master Admin Access',
      grant: null,
    };
  }

  const grants = getAccessGrants();
  const today = new Date().toISOString().slice(0, 10);

  const matched = grants.find((g) => {
    if (g.catalogId !== catalogId) return false;
    const matchUser = g.username && g.username.toLowerCase().trim() === uname;
    const matchLicense = licenseId && g.licenseId === licenseId;
    return matchUser || matchLicense;
  });

  if (!matched) {
    return {
      hasAccess: false,
      status: 'locked',
      label: '🔒 Paid Catalog Access Required (Admin Must Grant)',
      grant: null,
    };
  }

  if (matched.validUntil && matched.validUntil < today) {
    return {
      hasAccess: false,
      status: 'expired',
      label: '⚠️ License Expired (Contact Admin)',
      grant: matched,
    };
  }

  return {
    hasAccess: true,
    status: 'paid',
    label: `✓ Paid Access Active (Valid until ${matched.validUntil})`,
    grant: matched,
  };
}

export const SEED_IMPORT_HISTORY = [
  {
    id: 'hist-001',
    timestamp: '2026-10-15T14:22:00.000Z',
    fileName: 'Havells_Modular_PriceList_Oct2026.xlsx',
    fileType: 'xlsx',
    target: 'inventory',
    totalRows: 18,
    importedCount: 18,
    errorCount: 0,
    warningCount: 1,
    status: 'success',
    notes: 'Imported with automatic column recognition and HSN directory mapping.',
  },
  {
    id: 'hist-002',
    timestamp: '2026-09-28T10:15:00.000Z',
    fileName: 'Dabur_OTC_Stock_September.csv',
    fileType: 'csv',
    target: 'inventory',
    totalRows: 14,
    importedCount: 14,
    errorCount: 0,
    warningCount: 0,
    status: 'success',
    notes: 'All GST slabs (5%, 12%, 18%) validated against standard schedules.',
  },
];

export const SEED_AUDIT_LOGS = [
  {
    id: 'aud-001',
    timestamp: '2026-10-20T09:15:00.000Z',
    actor: 'admin',
    action: 'CONNECTION_REQUESTED',
    target: 'Tata Steel Ltd - Tiscon',
    details: 'Requested connection for Tata Tiscon 550D rebar catalog access.',
  },
  {
    id: 'aud-002',
    timestamp: '2026-10-10T12:00:00.000Z',
    actor: 'Havells India Limited',
    action: 'CATALOG_PUBLISHED',
    target: 'v2.1.0',
    details: 'New catalog version v2.1.0 published with 10 products and price revisions.',
  },
  {
    id: 'aud-003',
    timestamp: '2026-09-01T14:30:00.000Z',
    actor: 'admin',
    action: 'CONNECTION_APPROVED',
    target: 'Dabur India Ltd',
    details: 'Authorized partner connection approved with standard wholesale tier.',
  },
];

// ============================================================================
// DATA PERSISTENCE & RETRIEVAL HELPERS
// ============================================================================

export function getNetworkData(username) {
  if (typeof window === 'undefined') {
    return {
      manufacturers: SEED_MANUFACTURERS,
      catalogs: SEED_CATALOGS,
      products: SEED_PRODUCTS,
      updates: SEED_CATALOG_UPDATES,
      myImports: [],
      history: SEED_IMPORT_HISTORY,
      auditLogs: SEED_AUDIT_LOGS,
      accessGrants: getAccessGrants(),
      accessRequests: getAccessRequests(),
      settings: getDefaultSettings(),
    };
  }

  try {
    const raw = window.localStorage.getItem(getKey('state', username));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        manufacturers: parsed.manufacturers || SEED_MANUFACTURERS,
        catalogs: parsed.catalogs || SEED_CATALOGS,
        products: parsed.products || SEED_PRODUCTS,
        updates: parsed.updates || SEED_CATALOG_UPDATES,
        myImports: Array.isArray(parsed.myImports) ? parsed.myImports : [],
        history: parsed.history || SEED_IMPORT_HISTORY,
        auditLogs: parsed.auditLogs || SEED_AUDIT_LOGS,
        accessGrants: getAccessGrants(),
        accessRequests: getAccessRequests(),
        settings: parsed.settings || getDefaultSettings(),
      };
    }
  } catch (err) {
    console.warn('Failed to parse Product Network state from localStorage:', err);
  }

  // Fallback to clean state
  const initial = {
    manufacturers: SEED_MANUFACTURERS,
    catalogs: SEED_CATALOGS,
    products: SEED_PRODUCTS,
    updates: SEED_CATALOG_UPDATES,
    myImports: [],
    history: SEED_IMPORT_HISTORY,
    auditLogs: SEED_AUDIT_LOGS,
    accessGrants: getAccessGrants(),
    accessRequests: getAccessRequests(),
    settings: getDefaultSettings(),
  };
  saveNetworkData(username, initial);
  return initial;
}

export function saveNetworkData(username, state) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getKey('state', username), JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to persist Product Network state:', err);
  }
}

export function getDefaultSettings() {
  return {
    businessRole: 'distributor', // 'distributor' | 'retailer' | 'manufacturer' | 'brand'
    companyDisplayName: '',
    shareCatalogMode: 'connection_only',
    notifyOnVersionUpdate: true,
    autoSuggestCatalogMapping: true,
    preserveLocalPricesOnUpdate: true,
    defaultGstRate: 18,
    defaultUnit: 'PCS',
    showOnlyApprovedCatalogs: true,
  };
}

// ============================================================================
// AI-POWERED COLUMN RECOGNITION & HEADER MATCHER
// ============================================================================

const COLUMN_PATTERNS = {
  name: [
    'product name', 'item name', 'item description', 'description',
    'title', 'product', 'item', 'goods description', 'material name',
    'product title', 'item title'
  ],
  sku: [
    'sku', 'sku code', 'item code', 'product code', 'part number',
    'model', 'model no', 'part no', 'material code', 'cat no', 'catalog no'
  ],
  barcode: [
    'barcode', 'bar code', 'ean', 'ean13', 'ean-13', 'upc', 'gtin',
    'scan code', 'qr code', 'bar code number'
  ],
  hsn: [
    'hsn', 'hsn code', 'sac', 'hsn/sac', 'commodity code', 'tariff',
    'tax code', 'itc hsn', 'hsn_sac'
  ],
  gstRate: [
    'gst', 'gst%', 'gst rate', 'tax', 'tax%', 'tax rate', 'igst',
    'gst percentage', 'gst percent', 'applicable tax', 'gst slab'
  ],
  mrp: [
    'mrp', 'maximum retail price', 'retail price', 'list price',
    'm.r.p.', 'mrp (inr)', 'mrp rs', 'retail mrp'
  ],
  wholesalePrice: [
    'wholesale price', 'trade price', 'price', 'rate', 'unit price',
    'dealer price', 'purchase rate', 'cost', 'distributor price',
    'basic rate', 'offer price', 'net rate'
  ],
  unit: [
    'unit', 'uom', 'unit of measure', 'pkg unit', 'uqc', 'measurement unit',
    'base unit', 'billing unit'
  ],
  packSize: [
    'pack size', 'pack', 'packaging', 'case qty', 'box size', 'package',
    'inner pack', 'packing unit', 'master carton'
  ],
  category: [
    'category', 'group', 'product type', 'department', 'sub-category',
    'product group', 'item group', 'segment'
  ],
  moq: [
    'moq', 'minimum order quantity', 'min order', 'min qty', 'minimum order'
  ],
  description: [
    'description', 'long description', 'specifications', 'features', 'details'
  ],
};

/**
 * Automatically inspects raw column headers and maps them to standardized product fields.
 */
export function identifyColumns(headers = []) {
  const mapping = {};
  const lowerHeaders = headers.map((h) => String(h || '').trim().toLowerCase());
  const usedHeaders = new Set();

  // Priority order for fields to resolve specific fields before general ones
  const FIELD_ORDER = [
    'barcode',
    'sku',
    'hsn',
    'gstRate',
    'mrp',
    'wholesalePrice',
    'name',
    'unit',
    'packSize',
    'category',
    'moq',
    'description',
  ];

  FIELD_ORDER.forEach((field) => {
    const patterns = COLUMN_PATTERNS[field];
    if (!patterns) return;

    let matchedHeader = null;
    let highestScore = 0;

    patterns.forEach((pat) => {
      lowerHeaders.forEach((lh, idx) => {
        const headerOriginal = headers[idx];
        if (usedHeaders.has(headerOriginal)) return;

        const clean = lh.replace(/[_\-.\s]+/g, ' ');

        // Disambiguation exclusions
        if (field === 'wholesalePrice' && (clean.includes('mrp') || clean.includes('retail') || clean.includes('list price'))) {
          return;
        }
        if (field === 'mrp' && (clean.includes('wholesale') || clean.includes('dealer') || clean.includes('trade') || clean.includes('net rate') || clean.includes('cost'))) {
          return;
        }
        if (field === 'description' && mapping.name === headerOriginal) {
          return;
        }

        if (clean === pat) {
          const score = 100 + pat.length;
          if (score > highestScore) {
            highestScore = score;
            matchedHeader = headerOriginal;
          }
        } else if (clean.includes(pat)) {
          const score = 60 + (pat.length * 2);
          if (score > highestScore) {
            highestScore = score;
            matchedHeader = headerOriginal;
          }
        } else if (pat.includes(clean) && clean.length > 2) {
          const score = 40 + clean.length;
          if (score > highestScore) {
            highestScore = score;
            matchedHeader = headerOriginal;
          }
        }
      });
    });

    if (matchedHeader) {
      mapping[field] = matchedHeader;
      usedHeaders.add(matchedHeader);
    }
  });

  return mapping;
}

// ============================================================================
// DATA VALIDATION & QUALITY AUDITOR
// ============================================================================

/**
 * Validates a single product row.
 * Returns { isValid, status: 'valid'|'warning'|'error', errors: [], warnings: [] }
 */
export function validateProductRow(row, rowIndex = 0, existingItems = []) {
  const errors = [];
  const warnings = [];

  // 1. Mandatory Name
  if (!row.name || !String(row.name).trim()) {
    errors.push('Missing Product Name (Mandatory)');
  }

  // 2. SKU Check
  if (!row.sku || !String(row.sku).trim()) {
    warnings.push('SKU is recommended for automated inventory matching');
  }

  // 3. HSN Code Validation (Indian GST Rules)
  if (row.hsn) {
    const cleanHsn = String(row.hsn).replace(/\D/g, '');
    if (!cleanHsn) {
      errors.push(`Invalid HSN format "${row.hsn}" (must contain numeric digits)`);
    } else if (![2, 4, 6, 8].includes(cleanHsn.length)) {
      warnings.push(`HSN code "${row.hsn}" is ${cleanHsn.length} digits. GST requires 4, 6, or 8 digits for goods.`);
    } else {
      // Validate chapter prefix
      const chapter = cleanHsn.slice(0, 2);
      const isKnownHsn = COMMON_HSN_SAC_CODES.some((c) => c.code.startsWith(cleanHsn) || cleanHsn.startsWith(c.code));
      if (!isKnownHsn && parseInt(chapter, 10) > 99) {
        warnings.push(`HSN chapter "${chapter}" is outside valid Indian tariff chapters (01-99)`);
      }
    }
  } else {
    warnings.push('HSN code missing (Mandatory for GST B2B billing)');
  }

  // 4. GST Rate Validation
  if (row.gstRate !== undefined && row.gstRate !== null && row.gstRate !== '') {
    const numGst = Number(row.gstRate);
    if (isNaN(numGst) || numGst < 0 || numGst > 40) {
      errors.push(`Invalid GST Rate "${row.gstRate}"`);
    } else if (!STANDARD_GST_RATES.includes(numGst)) {
      warnings.push(`Non-standard GST Rate ${numGst}%. Recognized slabs: 0%, 5%, 12%, 18%, 28%`);
    }
  } else {
    warnings.push('GST Rate missing (will default to standard 18% if not verified)');
  }

  // 5. Pricing Sanity Checks
  const numMrp = Number(row.mrp) || 0;
  const numPrice = Number(row.wholesalePrice || row.price) || 0;

  if (numPrice < 0) {
    errors.push(`Negative wholesale/purchase price (${numPrice})`);
  }
  if (numMrp < 0) {
    errors.push(`Negative MRP (${numMrp})`);
  }
  if (numMrp > 0 && numPrice > 0 && numPrice > numMrp) {
    warnings.push(`Wholesale price (₹${numPrice}) is higher than MRP (₹${numMrp})`);
  }

  // 6. Duplicate Detection (within catalog or existing inventory)
  if (row.sku && existingItems.length > 0) {
    const isDupSku = existingItems.some(
      (e, idx) => idx !== rowIndex && String(e.sku || '').trim().toLowerCase() === String(row.sku).trim().toLowerCase()
    );
    if (isDupSku) {
      warnings.push(`Duplicate SKU "${row.sku}" detected`);
    }
  }

  if (row.barcode && existingItems.length > 0) {
    const isDupBarcode = existingItems.some(
      (e, idx) => idx !== rowIndex && String(e.barcode || '').trim().toLowerCase() === String(row.barcode).trim().toLowerCase()
    );
    if (isDupBarcode) {
      warnings.push(`Duplicate Barcode "${row.barcode}" detected`);
    }
  }

  let status = 'valid';
  if (errors.length > 0) {
    status = 'error';
  } else if (warnings.length > 0) {
    status = 'warning';
  }

  return {
    isValid: errors.length === 0,
    status,
    errors,
    warnings,
  };
}

// ============================================================================
// REAL FILE PARSING (EXCEL / CSV VIA XLSX)
// ============================================================================

/**
 * Parses an uploaded File object (Excel .xlsx, .xls or CSV .csv)
 * Returns { headers, rows, sheetNames, detectedMapping }
 */
export async function parseCatalogFile(file) {
  if (!file) throw new Error('No file selected.');

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('No sheets found in uploaded file.');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to JSON array with header objects
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', blankrows: false });
  if (rawRows.length === 0) {
    throw new Error('The uploaded sheet contains no data rows.');
  }

  const headers = Object.keys(rawRows[0]);
  const detectedMapping = identifyColumns(headers);

  // Normalize rows according to detected or partial mapping
  const normalizedRows = rawRows.map((raw, idx) => {
    const nameVal = raw[detectedMapping.name] || raw['Product Name'] || raw['Item Name'] || raw['Description'] || '';
    const skuVal = raw[detectedMapping.sku] || raw['SKU'] || raw['Item Code'] || '';
    const barcodeVal = raw[detectedMapping.barcode] || raw['Barcode'] || raw['EAN'] || '';
    const hsnVal = raw[detectedMapping.hsn] || raw['HSN'] || raw['HSN Code'] || '';
    const gstVal = raw[detectedMapping.gstRate] || raw['GST%'] || raw['GST Rate'] || raw['Tax%'] || '';
    const mrpVal = raw[detectedMapping.mrp] || raw['MRP'] || '';
    const priceVal = raw[detectedMapping.wholesalePrice] || raw['Price'] || raw['Rate'] || raw['Wholesale Price'] || '';
    const unitVal = raw[detectedMapping.unit] || raw['Unit'] || raw['UOM'] || 'PCS';
    const packVal = raw[detectedMapping.packSize] || raw['Pack Size'] || '';
    const catVal = raw[detectedMapping.category] || raw['Category'] || 'General';

    const normalized = {
      _rawIndex: idx,
      name: String(nameVal).trim(),
      sku: String(skuVal).trim(),
      barcode: String(barcodeVal).trim(),
      hsn: String(hsnVal).trim(),
      gstRate: gstVal !== '' ? Number(gstVal) : 18,
      mrp: mrpVal !== '' ? Number(mrpVal) : 0,
      wholesalePrice: priceVal !== '' ? Number(priceVal) : 0,
      unit: String(unitVal).trim().toUpperCase() || 'PCS',
      packSize: String(packVal).trim(),
      category: String(catVal).trim() || 'General',
    };

    const audit = validateProductRow(normalized, idx, rawRows);
    return {
      ...normalized,
      _audit: audit,
    };
  });

  return {
    sheetNames: workbook.SheetNames,
    activeSheet: firstSheetName,
    headers,
    detectedMapping,
    rows: normalizedRows,
    totalRows: normalizedRows.length,
    validCount: normalizedRows.filter((r) => r._audit.status === 'valid').length,
    warningCount: normalizedRows.filter((r) => r._audit.status === 'warning').length,
    errorCount: normalizedRows.filter((r) => r._audit.status === 'error').length,
  };
}

/**
 * Generates an Excel / CSV downloadable template
 */
export function generateSampleFile(format = 'xlsx') {
  const sampleData = [
    {
      'Product Name': 'UltraGlide 20W LED Batten (Cool White)',
      'SKU Code': 'LGT-BAT-20W-CW',
      'Barcode / EAN': '8901999001012',
      'HSN Code': '8539',
      'GST Rate (%)': 18,
      'MRP (₹)': 499,
      'Wholesale Price (₹)': 295,
      'Unit of Measure': 'PCS',
      'Pack Size': '20 Pcs / Box',
      'Product Category': 'LED Lighting',
    },
    {
      'Product Name': 'Goldline Modular 16A Shuttered Socket (Arctic White)',
      'SKU Code': 'ELE-GLD-16S-W',
      'Barcode / EAN': '8901999001029',
      'HSN Code': '8536',
      'GST Rate (%)': 18,
      'MRP (₹)': 210,
      'Wholesale Price (₹)': 135,
      'Unit of Measure': 'PCS',
      'Pack Size': '10 Pcs / Box',
      'Product Category': 'Electrical Switches',
    },
    {
      'Product Name': 'ProFit CPVC Brass Transition Elbow 20mm x 1/2"',
      'SKU Code': 'PLM-CPVC-20X15',
      'Barcode / EAN': '8901999001036',
      'HSN Code': '3917',
      'GST Rate (%)': 18,
      'MRP (₹)': 125,
      'Wholesale Price (₹)': 78,
      'Unit of Measure': 'PCS',
      'Pack Size': '25 Pcs / Box',
      'Product Category': 'Plumbing Fittings',
    },
    {
      'Product Name': 'PureBio Organic Amla Juice (1000ml Bottle)',
      'SKU Code': 'FMC-AML-1000',
      'Barcode / EAN': '8901999001043',
      'HSN Code': '2106',
      'GST Rate (%)': 12,
      'MRP (₹)': 290,
      'Wholesale Price (₹)': 210,
      'Unit of Measure': 'BTL',
      'Pack Size': '12 Bottles / Case',
      'Product Category': 'Health & Wellness',
    },
    {
      'Product Name': 'PureBio 100% Wild Forest Honey (500g Squeezy)',
      'SKU Code': 'FMC-HNY-500',
      'Barcode / EAN': '8901999001050',
      'HSN Code': '0402',
      'GST Rate (%)': 5,
      'MRP (₹)': 240,
      'Wholesale Price (₹)': 180,
      'Unit of Measure': 'BTL',
      'Pack Size': '24 Bottles / Case',
      'Product Category': 'Food Products',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Product_Catalog_Sample');

  if (format === 'csv') {
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Tread_Product_Network_Sample_Catalog.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    XLSX.writeFile(workbook, 'Tread_Product_Network_Sample_Catalog.xlsx');
  }
}

/**
 * Exports CSV containing rows flagged with errors or warnings
 */
export function exportErrorReportCsv(rows = []) {
  const errorRows = rows
    .filter((r) => r._audit && (r._audit.errors.length > 0 || r._audit.warnings.length > 0))
    .map((r) => ({
      'Row Number': (r._rawIndex || 0) + 1,
      'Product Name': r.name || 'MISSING',
      'SKU': r.sku || '',
      'Status': r._audit.status.toUpperCase(),
      'Errors': r._audit.errors.join('; '),
      'Warnings': r._audit.warnings.join('; '),
      'HSN Provided': r.hsn || '',
      'GST Rate Provided': r.gstRate || '',
      'MRP': r.mrp || 0,
      'Wholesale Price': r.wholesalePrice || 0,
    }));

  if (errorRows.length === 0) {
    alert('No errors or warnings found in current catalog.');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(errorRows);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Tread_Catalog_Import_Validation_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// INTEGRATION WITH TREAD STOCK INVENTORY
// ============================================================================

/**
 * Non-destructively imports or updates products into TREAD stockItems.
 *
 * Requirements:
 * - Preserve existing business stock quantities
 * - Preserve existing purchase prices and selling prices if preferred
 * - Prevent duplicate local inventory records
 * - Enforce standard TREAD stock item format
 */
export function syncNetworkProductsToTreadStock(
  selectedProducts = [],
  currentStockItems = [],
  options = { preservePrices: true, initialStockForNew: 0 }
) {
  const updatedStock = [...currentStockItems];
  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  selectedProducts.forEach((prod) => {
    // Attempt to match with existing local stock item by SKU, Barcode, or Name
    const normName = String(prod.name || '').trim().toLowerCase();
    const normSku = String(prod.sku || '').trim().toLowerCase();
    const normBarcode = String(prod.barcode || '').trim().toLowerCase();

    const existingIdx = updatedStock.findIndex((s) => {
      if (normSku && String(s.sku || '').trim().toLowerCase() === normSku) return true;
      if (normBarcode && String(s.barcode || '').trim().toLowerCase() === normBarcode) return true;
      if (normName && String(s.name || '').trim().toLowerCase() === normName) return true;
      return false;
    });

    if (existingIdx !== -1) {
      // EXISTING ITEM: Non-destructive update
      const existing = updatedStock[existingIdx];

      updatedStock[existingIdx] = {
        ...existing,
        // Preserve local business stock and prices
        stock: existing.stock !== undefined ? existing.stock : (options.initialStockForNew || 0),
        rate: options.preservePrices && existing.rate ? existing.rate : (prod.wholesalePrice || prod.mrp || existing.rate || 0),
        wholesalePrice: options.preservePrices && existing.wholesalePrice ? existing.wholesalePrice : (prod.wholesalePrice || existing.wholesalePrice || 0),
        mrp: options.preservePrices && existing.mrp ? existing.mrp : (prod.mrp || existing.mrp || 0),
        purchasePrice: options.preservePrices && existing.purchasePrice ? existing.purchasePrice : (prod.wholesalePrice || existing.purchasePrice || 0),
        // Enrich metadata from verified manufacturer
        hsn: prod.hsn || existing.hsn || '',
        gst: prod.gstRate !== undefined ? Number(prod.gstRate) : (existing.gst || 18),
        unit: prod.unit || existing.unit || 'PCS',
        barcode: prod.barcode || existing.barcode || '',
        sku: prod.sku || existing.sku || '',
        category: prod.category || existing.category || '',
        sourceNetworkCatalog: prod.catalogId || existing.sourceNetworkCatalog || null,
        sourceManufacturer: prod.manufacturerName || existing.sourceManufacturer || null,
        networkProductId: prod.id || existing.networkProductId || null,
        lastNetworkSync: new Date().toISOString(),
      };
      updatedCount += 1;
    } else {
      // NEW ITEM: Create new TREAD stock record
      const newStockItem = {
        id: uuidv4(),
        name: String(prod.name || '').trim(),
        sku: String(prod.sku || '').trim(),
        barcode: String(prod.barcode || '').trim(),
        hsn: String(prod.hsn || '').trim(),
        gst: Number(prod.gstRate) || 18,
        unit: String(prod.unit || 'PCS').toUpperCase(),
        stock: Math.max(0, Number(options.initialStockForNew) || 0),
        rate: Number(prod.wholesalePrice) || Number(prod.mrp) || 0,
        mrp: Number(prod.mrp) || 0,
        wholesalePrice: Number(prod.wholesalePrice) || 0,
        purchasePrice: Number(prod.wholesalePrice) || 0,
        category: String(prod.category || 'General').trim(),
        subcategory: '',
        sourceNetworkCatalog: prod.catalogId || null,
        sourceManufacturer: prod.manufacturerName || null,
        networkProductId: prod.id || null,
        createdAt: new Date().toISOString(),
        lastNetworkSync: new Date().toISOString(),
      };
      updatedStock.unshift(newStockItem);
      addedCount += 1;
    }
  });

  return {
    updatedStock,
    stats: {
      total: selectedProducts.length,
      added: addedCount,
      updated: updatedCount,
      skipped: skippedCount,
    },
  };
}
