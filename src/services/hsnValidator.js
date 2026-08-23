// Indian GST HSN (Goods) and SAC (Services) Validator and Common Codes Directory

export const COMMON_HSN_SAC_CODES = [
  // Services (SAC - starts with 99)
  { code: '9983', type: 'SAC', name: 'Information Technology, Software, Consulting & Professional Services', gst: 18 },
  { code: '9954', type: 'SAC', name: 'Construction & Building Works Services', gst: 18 },
  { code: '9965', type: 'SAC', name: 'Goods Transport Agency (GTA) & Logistics Services', gst: 5 },
  { code: '9968', type: 'SAC', name: 'Postal, Courier, and Delivery Services', gst: 18 },
  { code: '9971', type: 'SAC', name: 'Financial, Banking, and Insurance Services', gst: 18 },
  { code: '9972', type: 'SAC', name: 'Real Estate Services & Renting of Immovable Property', gst: 18 },
  { code: '9973', type: 'SAC', name: 'Leasing or Rental Services of Machinery / Vehicles', gst: 18 },
  { code: '9982', type: 'SAC', name: 'Legal, Accounting, Auditing & Bookkeeping Services', gst: 18 },
  { code: '9984', type: 'SAC', name: 'Telecommunications, Broadcasting, and Internet Services', gst: 18 },
  { code: '9985', type: 'SAC', name: 'Support Services, Security, Cleaning, and Office Admin', gst: 18 },
  { code: '9987', type: 'SAC', name: 'Maintenance, Repair, and Installation Services', gst: 18 },
  { code: '9992', type: 'SAC', name: 'Education and Training Services', gst: 18 },
  { code: '9996', type: 'SAC', name: 'Recreational, Cultural, and Sporting Services', gst: 18 },

  // Goods (HSN Chapters)
  { code: '8471', type: 'HSN', name: 'Automatic Data Processing Machines, Computers, Laptops, Keyboards & Storage', gst: 18 },
  { code: '8517', type: 'HSN', name: 'Smartphones, Mobile Phones, Routers, Networking & Telecom Apparatus', gst: 18 },
  { code: '8528', type: 'HSN', name: 'Monitors, Projectors, Televisions & Video Displays', gst: 18 },
  { code: '8443', type: 'HSN', name: 'Printers, Photocopying Machines, Cartridges & Parts', gst: 18 },
  { code: '8504', type: 'HSN', name: 'Electrical Transformers, Inverters, SMPS, Power Adapters & UPS', gst: 18 },
  { code: '8523', type: 'HSN', name: 'Pen Drives, Hard Disks, SSDs, Memory Cards & Software Media', gst: 18 },
  { code: '8544', type: 'HSN', name: 'Insulated Wires, Cables, Optical Fiber Cables & USB Cords', gst: 18 },
  { code: '8708', type: 'HSN', name: 'Parts and Accessories for Motor Vehicles & Automobiles', gst: 28 },
  { code: '9403', type: 'HSN', name: 'Office, Commercial & Home Furniture (Wooden/Metal)', gst: 18 },
  { code: '4802', type: 'HSN', name: 'Uncoated Paper & Paperboard for Printing / Writing (A4 Reams)', gst: 12 },
  { code: '4820', type: 'HSN', name: 'Registers, Account Books, Note Books, Invoice Books & Stationery', gst: 12 },
  { code: '3923', type: 'HSN', name: 'Articles for Conveyance or Packing of Goods, Plastics, Bags & Bottles', gst: 18 },
  { code: '6109', type: 'HSN', name: 'T-Shirts, Singlets, and Other Vests (Knitted/Crocheted)', gst: 5 },
  { code: '6203', type: 'HSN', name: 'Men’s Suits, Jackets, Trousers, and Shorts (Woven Garments)', gst: 12 },
  { code: '3004', type: 'HSN', name: 'Medicaments, Pharmaceuticals, and Healthcare Formulations', gst: 12 },
  { code: '2106', type: 'HSN', name: 'Food Preparations, Namkeen, Snacks, Protein Powders, and Sweeteners', gst: 18 },
  { code: '1905', type: 'HSN', name: 'Bread, Pastries, Cakes, Biscuits, and Wafers', gst: 18 },
  { code: '0402', type: 'HSN', name: 'Milk, Cream, Concentrated or Containing Added Sugar (Dairy)', gst: 5 },
  { code: '7318', type: 'HSN', name: 'Screws, Bolts, Nuts, Coach Screws, Rivets, and Washers of Iron/Steel', gst: 18 },
  { code: '9018', type: 'HSN', name: 'Medical, Surgical, Dental, and Veterinary Instruments & Appliances', gst: 12 },
];

export const HSN_CHAPTERS = {
  '01': 'Live Animals',
  '02': 'Meat and Edible Meat Offal',
  '04': 'Dairy Produce, Birds Eggs, Natural Honey',
  '07': 'Edible Vegetables and Certain Roots and Tubers',
  '08': 'Edible Fruit and Nuts, Peel of Citrus Fruit or Melons',
  '09': 'Coffee, Tea, Mate and Spices',
  '10': 'Cereals (Wheat, Rice, Maize)',
  '11': 'Products of the Milling Industry, Malt, Starches, Inulin',
  '19': 'Preparations of Cereals, Flour, Starch or Milk (Biscuits/Bakery)',
  '21': 'Miscellaneous Edible Preparations (Sauces, Namkeens, Snacks)',
  '22': 'Beverages, Spirits, and Vinegar',
  '27': 'Mineral Fuels, Mineral Oils, Bituminous Substances, Mineral Waxes',
  '30': 'Pharmaceutical Products and Medicines',
  '33': 'Essential Oils, Perfumery, Cosmetic or Toilet Preparations',
  '34': 'Soap, Washing Preparations, Lubricating Preparations, Waxes',
  '39': 'Plastics and Articles Thereof',
  '40': 'Rubber and Articles Thereof',
  '48': 'Paper and Paperboard, Articles of Paper Pulp or Paperboard',
  '49': 'Printed Books, Newspapers, Pictures and Other Products of Printing',
  '50': 'Silk and Silk Fabrics',
  '52': 'Cotton and Cotton Fabrics',
  '61': 'Articles of Apparel and Clothing Accessories, Knitted or Crocheted',
  '62': 'Articles of Apparel and Clothing Accessories, Not Knitted or Crocheted',
  '64': 'Footwear, Gaiters and the Like, Parts of Such Articles',
  '72': 'Iron and Steel',
  '73': 'Articles of Iron or Steel',
  '74': 'Copper and Articles Thereof',
  '76': 'Aluminium and Articles Thereof',
  '84': 'Nuclear Reactors, Boilers, Machinery and Mechanical Appliances, Computers',
  '85': 'Electrical Machinery, Equipment, Telecom & Sound Recorders',
  '87': 'Vehicles Other Than Railway or Tramway Rolling-stock, Parts Thereof',
  '90': 'Optical, Photographic, Measuring, Checking, Medical or Surgical Instruments',
  '94': 'Furniture, Bedding, Mattresses, Lamps and Lighting Fittings',
  '95': 'Toys, Games and Sports Requisites, Parts and Accessories Thereof',
  '99': 'Services (SAC - Services Accounting Code)',
};

/**
 * Validates and analyzes an Indian GST HSN / SAC code.
 * Valid codes are numeric strings with length 2, 4, 6, or 8.
 */
export function validateHSN(codeInput) {
  if (!codeInput || typeof codeInput !== 'string') {
    return {
      isValid: false,
      code: '',
      errorMessage: 'HSN/SAC code is empty.',
    };
  }

  const code = codeInput.trim();

  // Must contain only digits
  if (!/^[0-9]+$/.test(code)) {
    return {
      isValid: false,
      code,
      errorMessage: 'HSN/SAC code must contain numeric digits only.',
    };
  }

  const len = code.length;
  if (![2, 4, 6, 8].includes(len)) {
    return {
      isValid: false,
      code,
      errorMessage: `HSN/SAC must be exactly 2, 4, 6, or 8 digits (currently ${len} digits).`,
    };
  }

  const isSAC = code.startsWith('99');
  const chapter = code.slice(0, 2);
  const chapterName = HSN_CHAPTERS[chapter] || (isSAC ? 'Services Accounting Code (SAC)' : `Chapter ${chapter}`);

  // Find if matching exact or parent code in common catalog
  const matchedItem = COMMON_HSN_SAC_CODES.find(
    (item) => item.code === code || item.code === code.slice(0, 4)
  );

  let recommendation = '';
  if (len === 2) {
    recommendation = '2-digit Chapter level. Under Indian GST, 4-digit (turnover < ₹5Cr) or 6-digit (turnover > ₹5Cr) is recommended for B2B billing.';
  } else if (len === 4) {
    recommendation = '4-digit Heading level. Compliant for B2B businesses with aggregate turnover up to ₹5 Crores.';
  } else if (len === 6) {
    recommendation = '6-digit Sub-heading level. Mandatory for businesses with turnover above ₹5 Crores and export transactions.';
  } else if (len === 8) {
    recommendation = '8-digit National Tariff Item level. Highly detailed for specific manufactured goods and customs clearance.';
  }

  return {
    isValid: true,
    code,
    length: len,
    isSAC,
    type: isSAC ? 'SAC (Services)' : 'HSN (Goods)',
    chapter,
    chapterName,
    description: matchedItem ? matchedItem.name : chapterName,
    suggestedGst: matchedItem ? matchedItem.gst : null,
    recommendation,
    message: `✓ Valid ${isSAC ? 'SAC' : 'HSN'} Code: ${matchedItem ? matchedItem.name : chapterName}`,
  };
}

/**
 * Searches the HSN/SAC catalog by query (code or description).
 */
export function searchHSNCatalog(query) {
  if (!query || !query.trim()) return COMMON_HSN_SAC_CODES;
  const q = query.toLowerCase().trim();
  return COMMON_HSN_SAC_CODES.filter(
    (item) =>
      item.code.includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q)
  );
}
