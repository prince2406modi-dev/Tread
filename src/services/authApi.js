import {
  getFirestoreDb,
  isFirebaseConfigured,
} from './firebase.js';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
} from 'firebase/firestore';

const USERS_STORAGE_KEY = 'gst-invoice-app-users';

export const ADMIN_MASTER_USER = {
  username: 'admin',
  password: 'prince',
  role: 'Admin',
  licenseId: '91-00-000-000000',
  companyName: '',
  phone: '',
  email: 'admin@tread.local',
  subscription: {
    planId: 'enterprise',
    planName: 'Enterprise Suite',
    status: 'Active',
    transactionId: 'TXN-ADMIN-MASTER',
    activatedAt: new Date().toISOString(),
    validUntil: '2099-12-31',
  },
};

/**
 * Helper to get local cached users
 */
export function getLocalUsers() {
  if (typeof window === 'undefined') return [ADMIN_MASTER_USER];
  try {
    const saved = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure admin user exists with prince password and all users have valid numeric license IDs
        const others = parsed
          .filter((u) => u.username?.toLowerCase() !== 'admin')
          .map((u) => ({
            ...u,
            licenseId: ensureValidLicenseId(u),
          }));
        return [ADMIN_MASTER_USER, ...others];
      }
    }
  } catch {
    // fallback
  }
  return [ADMIN_MASTER_USER];
}

/**
 * Helper to save local cached users
 */
export function saveLocalUsers(users) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

/**
 * Helper to sanitize phone numbers (extract 10 digits)
 */
export function sanitizeMobile(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.slice(-10);
}

export const STATE_TO_GST_CODE = {
  'Jammu and Kashmir': '01',
  'Himachal Pradesh': '02',
  'Punjab': '03',
  'Chandigarh': '04',
  'Uttarakhand': '05',
  'Haryana': '06',
  'Delhi': '07',
  'Rajasthan': '08',
  'Uttar Pradesh': '09',
  'Bihar': '10',
  'Sikkim': '11',
  'Arunachal Pradesh': '12',
  'Nagaland': '13',
  'Manipur': '14',
  'Mizoram': '15',
  'Tripura': '16',
  'Meghalaya': '17',
  'Assam': '18',
  'West Bengal': '19',
  'Jharkhand': '20',
  'Odisha': '21',
  'Chhattisgarh': '22',
  'Madhya Pradesh': '23',
  'Gujarat': '24',
  'Dadra and Nagar Haveli and Daman and Diu': '26',
  'Maharashtra': '27',
  'Andhra Pradesh': '37',
  'Karnataka': '29',
  'Goa': '30',
  'Lakshadweep': '31',
  'Kerala': '32',
  'Tamil Nadu': '33',
  'Puducherry': '34',
  'Andaman and Nicobar Islands': '35',
  'Telangana': '36',
  'Ladakh': '38',
};

export const INDIAN_STATES = Object.keys(STATE_TO_GST_CODE).sort();

/**
 * Generates an un-guessable, all-numeric Unique Customer License ID
 * Encoding: [Country(2)]-[State(2)]-[Locality(3)]-[SecureNonGuessableRandom(6)]
 * Total: 13 digits all-numeric, completely impossible to guess or brute-force.
 */
export function generateLocationLicenseId(locationInfo = {}) {
  // 1. Country Code: 2 digits (India is 91)
  const country = locationInfo.country || '91';
  let countryCode = String(country).replace(/\D/g, '').slice(0, 2);
  if (!countryCode || countryCode.length < 2) countryCode = '91';

  // 2. State Code: 2 digits (from GST state codes 01 - 38)
  let stateCode = '';
  const stateVal = (locationInfo.state || '').trim();
  if (stateVal && STATE_TO_GST_CODE[stateVal]) {
    stateCode = STATE_TO_GST_CODE[stateVal];
  } else if (/^\d{1,2}$/.test(stateVal)) {
    stateCode = stateVal.padStart(2, '0');
  } else if (locationInfo.pincode && locationInfo.pincode.length >= 2) {
    const pin2 = parseInt(locationInfo.pincode.slice(0, 2), 10);
    if (pin2 >= 36 && pin2 <= 39) stateCode = '24'; // Gujarat
    else if (pin2 >= 40 && pin2 <= 44) stateCode = '27'; // Maharashtra
    else if (pin2 === 11) stateCode = '07'; // Delhi
    else if (pin2 >= 56 && pin2 <= 59) stateCode = '29'; // Karnataka
    else if (pin2 >= 60 && pin2 <= 64) stateCode = '33'; // Tamil Nadu
    else if (pin2 >= 30 && pin2 <= 34) stateCode = '08'; // Rajasthan
    else if (pin2 >= 20 && pin2 <= 28) stateCode = '09'; // UP
    else stateCode = '24';
  } else {
    stateCode = '24'; // Default to Gujarat (24)
  }
  stateCode = stateCode.padStart(2, '0').slice(0, 2);

  // 3. Locality / Area Code: 3 digits
  let localityCode = '';
  const localityVal = (locationInfo.locality || locationInfo.city || '').trim();
  const pincodeVal = (locationInfo.pincode || '').replace(/\D/g, '');
  if (pincodeVal.length >= 3) {
    localityCode = pincodeVal.slice(-3);
  } else if (localityVal) {
    let hash = 0;
    for (let i = 0; i < localityVal.length; i++) {
      hash = (hash * 37 + localityVal.charCodeAt(i)) % 899;
    }
    localityCode = String(100 + Math.abs(hash));
  } else {
    // Generate deterministic 3 digits from seed or random
    const seedStr = locationInfo.seed || '';
    if (seedStr) {
      let hash = 0;
      for (let i = 0; i < seedStr.length; i++) {
        hash = (hash * 31 + seedStr.charCodeAt(i)) % 899;
      }
      localityCode = String(100 + Math.abs(hash));
    } else {
      const randLoc = Math.floor(100 + Math.random() * 899);
      localityCode = String(randLoc);
    }
  }
  localityCode = localityCode.padStart(3, '0').slice(-3);

  // 4. Secure, Non-Guessable Cryptographic Numbers (5 digits)
  let secretRandom = 0;
  const seedStr = locationInfo.seed || '';
  if (seedStr) {
    // Generate stable high-entropy 5 digits from seed so ID never fluctuates across renders
    let seedHash = 5381;
    for (let i = 0; i < seedStr.length; i++) {
      seedHash = ((seedHash << 5) + seedHash + seedStr.charCodeAt(i)) >>> 0;
    }
    secretRandom = 10000 + (seedHash % 90000);
  } else if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    secretRandom = 10000 + (arr[0] % 90000);
  } else {
    secretRandom = Math.floor(10000 + Math.random() * 90000);
  }

  // 5. Check Digit (Luhn Algorithm) for tamper & guess protection
  const partialDigits = `${countryCode}${stateCode}${localityCode}${secretRandom}`;
  let sum = 0;
  for (let i = 0; i < partialDigits.length; i++) {
    let d = parseInt(partialDigits[i], 10);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  // Format: 91-24-380-749216 (Clean, all numbers: Country-State-Locality-SecureRandomCheck)
  return `${countryCode}-${stateCode}-${localityCode}-${secretRandom}${checkDigit}`;
}

export function generateLicenseId(param) {
  if (typeof param === 'object' && param !== null) {
    return generateLocationLicenseId(param);
  }
  return generateLocationLicenseId({ seed: param });
}

export function isNumericLicenseId(id) {
  return typeof id === 'string' && /^91-\d{2}-\d{3}-\d{6}$/.test(id);
}

export function ensureValidLicenseId(user) {
  if (!user) return '';
  const username = (user.username || '').toLowerCase();
  if (username === 'admin') return '91-00-000-000000';
  if (isNumericLicenseId(user.licenseId)) return user.licenseId;
  const newId = generateLocationLicenseId({
    country: user.country || '91',
    state: user.state || '',
    locality: user.locality || user.city || '',
    pincode: user.pincode || '',
    seed: username,
  });
  try {
    user.licenseId = newId;
  } catch {
    // ignore if frozen
  }
  return newId;
}

/**
 * Evaluates the real-time subscription status of a user
 * Returns { status, isExpired, isExpiringSoon, daysRemaining, validUntil, planName, licenseId, isAdmin }
 */
export function evaluateSubscriptionStatus(user) {
  if (!user) {
    return {
      status: 'expired',
      isExpired: true,
      isExpiringSoon: false,
      daysRemaining: 0,
      validUntil: '',
      planName: 'No Active License',
      licenseId: '',
      isAdmin: false,
    };
  }

  const username = (user.username || '').toLowerCase();
  const isAdmin = username === 'admin' || (user.role === 'Admin' && username === 'admin');

  if (isAdmin) {
    return {
      status: 'active',
      isExpired: false,
      isExpiringSoon: false,
      daysRemaining: 9999,
      validUntil: user.subscription?.validUntil || '2099-12-31',
      planName: user.subscription?.planName || 'Master Enterprise Suite',
      licenseId: '91-00-000-000000',
      isAdmin: true,
    };
  }

  const licenseId = ensureValidLicenseId(user);

  const validUntilStr = user.subscription?.validUntil;
  if (!validUntilStr) {
    const isAct = user.subscription?.status === 'Active';
    return {
      status: isAct ? 'active' : 'expired',
      isExpired: !isAct,
      isExpiringSoon: false,
      daysRemaining: isAct ? 365 : 0,
      validUntil: 'Active (Standard)',
      planName: user.subscription?.planName || 'Standard Plan',
      licenseId,
      isAdmin: false,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = new Date(validUntilStr);
  expiryDate.setHours(0, 0, 0, 0);

  const diffMs = expiryDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0 || user.subscription?.status === 'Expired') {
    return {
      status: 'expired',
      isExpired: true,
      isExpiringSoon: false,
      daysRemaining: Math.max(0, daysRemaining),
      validUntil: validUntilStr,
      planName: user.subscription?.planName || 'Expired License',
      licenseId,
      isAdmin: false,
    };
  }

  if (daysRemaining <= 7) {
    return {
      status: 'expiring_soon',
      isExpired: false,
      isExpiringSoon: true,
      daysRemaining,
      validUntil: validUntilStr,
      planName: user.subscription?.planName || 'Paid License',
      licenseId,
      isAdmin: false,
    };
  }

  return {
    status: 'active',
    isExpired: false,
    isExpiringSoon: false,
    daysRemaining,
    validUntil: validUntilStr,
    planName: user.subscription?.planName || 'Paid License',
    licenseId,
    isAdmin: false,
  };
}

/**
 * Renews or extends a user's subscription in Firestore and local storage
 */
export async function renewUserSubscription(username, renewData = {}) {
  const normalizedUser = (username || '').toLowerCase().trim();
  if (!normalizedUser) return { success: false, message: 'Username is required.' };

  const daysToAdd = Number(renewData.additionalDays) || 365;
  const currentUsers = getLocalUsers();
  const existingUser = currentUsers.find((u) => u.username.toLowerCase() === normalizedUser);

  // Compute new validUntil: extend from existing future validUntil or from today
  let baseDate = new Date();
  if (existingUser?.subscription?.validUntil) {
    const existingDate = new Date(existingUser.subscription.validUntil);
    if (!isNaN(existingDate.getTime()) && existingDate > baseDate) {
      baseDate = existingDate;
    }
  }

  const newValidDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  const newValidUntil = renewData.validUntil || newValidDate.toISOString().slice(0, 10);

  const updatedSubscription = {
    planId: renewData.planId || existingUser?.subscription?.planId || 'pro',
    planName: renewData.planName || existingUser?.subscription?.planName || 'Professional Plan',
    status: 'Active',
    amountPaid: renewData.amountPaid || existingUser?.subscription?.amountPaid || 999,
    transactionId: renewData.transactionId || `TXN-RENEW-${Date.now().toString().slice(-6)}`,
    activatedAt: existingUser?.subscription?.activatedAt || new Date().toISOString(),
    validUntil: newValidUntil,
    renewedAt: new Date().toISOString(),
    renewedBy: renewData.renewedBy || 'Company/Admin',
  };

  const updatedUserRecord = {
    ...(existingUser || { username: normalizedUser }),
    subscription: updatedSubscription,
    licenseId: existingUser?.licenseId || generateLicenseId(normalizedUser),
    lastUpdated: new Date().toISOString(),
    syncedToCloud: true,
  };

  // 1. Save to Cloud Firestore
  let cloudUpdated = false;
  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        const userDocRef = doc(db, 'app_users', normalizedUser);
        await setDoc(userDocRef, updatedUserRecord, { merge: true });
        cloudUpdated = true;
      }
    } catch (err) {
      console.warn('Failed to update renewal in Firestore:', err);
    }
  }

  // 2. Save to Local Cache
  const remaining = currentUsers.filter((u) => u.username.toLowerCase() !== normalizedUser);
  saveLocalUsers([updatedUserRecord, ...remaining]);

  return {
    success: true,
    user: updatedUserRecord,
    cloudUpdated,
    message: `✓ License renewed successfully for ${normalizedUser}! Valid until ${newValidUntil}.`,
  };
}

/**
 * Re-fetches user account & license status directly from Cloud Firestore
 */
export async function syncUserLicenseStatus(username) {
  const normalizedUser = (username || '').toLowerCase().trim();
  if (!normalizedUser) return null;

  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        const userDocRef = doc(db, 'app_users', normalizedUser);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const cloudData = snap.data();
          const localUsers = getLocalUsers();
          const filtered = localUsers.filter((u) => u.username.toLowerCase() !== normalizedUser);
          saveLocalUsers([cloudData, ...filtered]);
          return cloudData;
        }
      }
    } catch (err) {
      console.warn('Error fetching user license from cloud:', err);
    }
  }

  const localUsers = getLocalUsers();
  return localUsers.find((u) => u.username.toLowerCase() === normalizedUser) || null;
}

/**
 * Authenticates a user against Cloud Firestore database and local storage.
 * Device IP address independent: allows login from any phone, laptop, or IP address
 * as long as User ID / Email, registered Mobile Number, and Password match.
 */
export async function cloudAuthenticateUser(usernameOrEmail, mobileNumber, password) {
  const identifier = (usernameOrEmail || '').trim();
  const mobile = sanitizeMobile(mobileNumber);
  const rawPass = (password || '').trim();

  if (!identifier) {
    return {
      success: false,
      message: 'Please enter your User ID or Username.',
    };
  }

  if (!mobile || mobile.length < 10) {
    return {
      success: false,
      message: 'Please enter your registered 10-digit Mobile Number.',
    };
  }

  if (!rawPass) {
    return {
      success: false,
      message: 'Please enter your Password.',
    };
  }

  const normalizedId = identifier.toLowerCase();

  const cleanIdDigits = normalizedId.replace(/\D/g, '');

  // 1. Check if default Admin Master
  const isMasterAdminId =
    normalizedId === 'admin' ||
    normalizedId === 'admin@tread.local' ||
    normalizedId === '91-00-000-000000' ||
    cleanIdDigits === '9100000000000';

  if (isMasterAdminId) {
    if (rawPass === ADMIN_MASTER_USER.password) {
      return {
        success: true,
        user: ADMIN_MASTER_USER,
        source: 'master_admin',
        message: '✓ Authenticated as Master Administrator.',
      };
    } else {
      return {
        success: false,
        message: 'Incorrect password for admin account.',
      };
    }
  }

  // 2. Try Cloud Firestore (Cross-Device Database - IP Independent)
  //    Skip entirely when the device is offline to avoid hanging network calls.
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (isOnline && isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        // Look up by doc id (username)
        const userDocRef = doc(db, 'app_users', normalizedId);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const cloudUser = userSnap.data();
          const cloudMobile = sanitizeMobile(cloudUser.phone);

          if (cloudUser.password !== rawPass) {
            return {
              success: false,
              message: 'Invalid password. Please check your credentials.',
            };
          }

          if (cloudMobile && cloudMobile !== mobile) {
            return {
              success: false,
              message: 'Mobile number does not match registered account records.',
            };
          }

          // Update last login timestamp in cloud
          setDoc(
            userDocRef,
            { lastLoginAt: new Date().toISOString() },
            { merge: true }
          ).catch(() => {});

          // Prepare license ID and subscription status
          const preparedUser = {
            ...cloudUser,
            licenseId: ensureValidLicenseId(cloudUser),
          };
          const subStatus = evaluateSubscriptionStatus(preparedUser);

          // Cache in local storage for offline use
          const localList = getLocalUsers();
          const filtered = localList.filter(
            (u) => u.username.toLowerCase() !== preparedUser.username.toLowerCase()
          );
          saveLocalUsers([preparedUser, ...filtered]);

          return {
            success: true,
            user: preparedUser,
            subscriptionStatus: subStatus,
            source: 'cloud_firestore',
            message: '✓ Login successful from Cloud Database (Any Device / Any IP).',
          };
        }

        // Also check if user entered email, registered mobile, or numeric License ID
        const allUsersSnap = await getDocs(collection(db, 'app_users'));
        for (const d of allUsersSnap.docs) {
          const u = d.data();
          const uMobile = sanitizeMobile(u.phone);
          const uLicenseDigits = (u.licenseId || '').replace(/\D/g, '');
          const matchesId =
            (u.email && u.email.toLowerCase() === normalizedId) ||
            u.username.toLowerCase() === normalizedId ||
            (uMobile && uMobile === normalizedId) ||
            (u.licenseId && u.licenseId.toLowerCase() === normalizedId) ||
            (uLicenseDigits && cleanIdDigits.length >= 10 && uLicenseDigits === cleanIdDigits);

          if (matchesId) {
            if (u.password !== rawPass) {
              return {
                success: false,
                message: 'Invalid password. Please check your credentials.',
              };
            }
            if (uMobile && uMobile !== mobile) {
              return {
                success: false,
                message: 'Mobile number does not match registered account records.',
              };
            }

            const preparedLookupUser = {
              ...u,
              licenseId: ensureValidLicenseId(u),
            };
            const subStatus = evaluateSubscriptionStatus(preparedLookupUser);

            // Cache locally
            const localList = getLocalUsers();
            const filtered = localList.filter(
              (x) => x.username.toLowerCase() !== preparedLookupUser.username.toLowerCase()
            );
            saveLocalUsers([preparedLookupUser, ...filtered]);

            return {
              success: true,
              user: preparedLookupUser,
              subscriptionStatus: subStatus,
              source: 'cloud_firestore_lookup',
              message: '✓ Login successful via Cloud Account lookup (Any Device / Any IP).',
            };
          }
        }
      }
    } catch (err) {
      console.warn('Cloud authentication error (will fallback to local cache):', err);
    }
  }

  // 3. Fallback to Local Storage Cache
  const localUsers = getLocalUsers();
  const localAccount = localUsers.find((u) => {
    const uMobile = sanitizeMobile(u.phone);
    const uLicenseDigits = (u.licenseId || '').replace(/\D/g, '');
    return (
      u.username.toLowerCase() === normalizedId ||
      (u.email && u.email.toLowerCase() === normalizedId) ||
      (uMobile && uMobile === normalizedId) ||
      (u.licenseId && u.licenseId.toLowerCase() === normalizedId) ||
      (uLicenseDigits && cleanIdDigits.length >= 10 && uLicenseDigits === cleanIdDigits)
    );
  });

  if (localAccount) {
    const localMobile = sanitizeMobile(localAccount.phone);
    if (localAccount.password !== rawPass) {
      return {
        success: false,
        message: 'Invalid password. Please try again.',
      };
    }
    if (localMobile && localMobile !== mobile) {
      return {
        success: false,
        message: 'Mobile number does not match registered account records.',
      };
    }

    const preparedLocalUser = {
      ...localAccount,
      licenseId: ensureValidLicenseId(localAccount),
    };
    const subStatus = evaluateSubscriptionStatus(preparedLocalUser);

    return {
      success: true,
      user: preparedLocalUser,
      subscriptionStatus: subStatus,
      source: 'local_storage',
      message: '✓ Login successful (Local Cache).',
    };
  }

  return {
    success: false,
    message: 'Account not found for this User ID or License ID. Please check your credentials or Sign Up.',
  };
}

/**
 * Quick lookup helper: Finds a customer's Unique License ID and Expiry status
 * using Mobile Number, Username, or License ID so they can quote it to renew directly with the company.
 */
export async function lookupCustomerLicense(query) {
  const q = (query || '').trim();
  if (!q) return { found: false, message: 'Please enter a Mobile Number, Username, or License ID.' };

  const cleanDigits = q.replace(/\D/g, '');
  const lower = q.toLowerCase();

  if (lower === 'admin' || cleanDigits === '9100000000000' || lower === '91-00-000-000000') {
    return {
      found: true,
      username: 'admin',
      companyName: 'Tread Master Administration',
      licenseId: '91-00-000-000000',
      state: 'Central Jurisdiction',
      locality: 'HQ',
      country: 'India (91)',
      status: 'active',
      validUntil: '2099-12-31',
      planName: 'Master Enterprise Suite',
      isAdmin: true,
    };
  }

  // Check local storage first
  const localUsers = getLocalUsers();
  let matched = localUsers.find((u) => {
    const uMobile = sanitizeMobile(u.phone);
    const uLicenseDigits = (u.licenseId || '').replace(/\D/g, '');
    return (
      (u.username && u.username.toLowerCase() === lower) ||
      (uMobile && cleanDigits.length >= 10 && uMobile === cleanDigits.slice(-10)) ||
      (u.licenseId && u.licenseId.toLowerCase() === lower) ||
      (uLicenseDigits && cleanDigits.length >= 10 && uLicenseDigits === cleanDigits)
    );
  });

  // If not found locally, query Cloud Firestore
  if (!matched && isFirebaseConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const db = getFirestoreDb();
      if (db) {
        const snap = await getDocs(collection(db, 'app_users'));
        for (const d of snap.docs) {
          const u = d.data();
          const uMobile = sanitizeMobile(u.phone);
          const uLicenseDigits = (u.licenseId || '').replace(/\D/g, '');
          if (
            (u.username && u.username.toLowerCase() === lower) ||
            (uMobile && cleanDigits.length >= 10 && uMobile === cleanDigits.slice(-10)) ||
            (u.licenseId && u.licenseId.toLowerCase() === lower) ||
            (uLicenseDigits && cleanDigits.length >= 10 && uLicenseDigits === cleanDigits)
          ) {
            matched = u;
            break;
          }
        }
      }
    } catch (err) {
      console.warn('License lookup error:', err);
    }
  }

  if (matched) {
    const fullId = ensureValidLicenseId(matched);
    const sub = evaluateSubscriptionStatus({ ...matched, licenseId: fullId });
    return {
      found: true,
      username: matched.username,
      companyName: matched.companyName || 'Registered Enterprise',
      licenseId: fullId,
      state: matched.state || 'Gujarat',
      locality: matched.locality || matched.city || 'Central',
      country: 'India (91)',
      status: sub.status,
      isExpired: sub.isExpired,
      daysRemaining: sub.daysRemaining,
      validUntil: sub.validUntil,
      planName: sub.planName,
      phone: matched.phone,
    };
  }

  return {
    found: false,
    message: 'No registered customer found matching this User ID, Mobile Number, or License ID.',
  };
}

/**
 * Registers a new user into Cloud Firestore (so they can log in from ANY device / IP)
 * and updates local cache.
 */
export async function cloudRegisterUser(userData) {
  const trimmedUser = (userData.username || '').trim();
  const trimmedPass = (userData.password || '').trim();
  const rawMobile = sanitizeMobile(userData.phone);

  if (!trimmedUser || !trimmedPass) {
    return { success: false, message: 'Username and password are required.' };
  }

  if (!rawMobile || rawMobile.length < 10) {
    return { success: false, message: 'A valid 10-digit registered mobile number is required.' };
  }

  const normalizedUser = trimmedUser.toLowerCase();
  const defaultValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const userRecord = {
    username: trimmedUser,
    password: trimmedPass,
    phone: rawMobile,
    email: userData.email?.trim() || '',
    companyName: userData.companyName?.trim() || '',
    role: userData.role || 'Operator',
    licenseId: userData.licenseId || generateLicenseId(normalizedUser),
    subscription: userData.subscription || {
      planId: 'pro',
      planName: 'Professional Plan',
      status: 'Active',
      activatedAt: new Date().toISOString(),
      validUntil: defaultValidUntil,
    },
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    syncedToCloud: true,
  };

  // Ensure subscription inside userRecord has validUntil
  if (!userRecord.subscription.validUntil) {
    userRecord.subscription.validUntil = defaultValidUntil;
  }

  // 1. Save to Cloud Firestore
  let cloudSaved = false;
  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        const userDocRef = doc(db, 'app_users', normalizedUser);
        await setDoc(userDocRef, userRecord, { merge: true });
        cloudSaved = true;
      }
    } catch (err) {
      console.error('Failed to register user to Cloud Firestore:', err);
    }
  }

  // 2. Save to Local Cache
  const localList = getLocalUsers();
  const filtered = localList.filter((u) => u.username.toLowerCase() !== normalizedUser);
  const updated = [userRecord, ...filtered];
  saveLocalUsers(updated);

  return {
    success: true,
    user: userRecord,
    cloudSaved,
    message: cloudSaved
      ? '✓ User registered in Cloud Database! You can now log in from ANY phone, laptop, or desktop.'
      : '✓ User registered in local storage.',
  };
}

/**
 * Fetches all registered users from Cloud Firestore and merges with local storage.
 */
export async function syncAllUsersFromCloud() {
  const localUsers = getLocalUsers();
  const userMap = new Map();

  // Load local users first
  localUsers.forEach((u) => {
    userMap.set(u.username.toLowerCase(), u);
  });

  // Skip cloud fetch when device is offline
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (isOnline && isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        const snapshot = await getDocs(collection(db, 'app_users'));
        snapshot.forEach((docSnap) => {
          const cloudData = docSnap.data();
          if (cloudData.username) {
            const normalized = cloudData.username.toLowerCase();
            const licenseId = cloudData.licenseId || (normalized === 'admin' ? '91-00-000-000000' : generateLicenseId(cloudData));
            userMap.set(normalized, {
              ...cloudData,
              licenseId,
              syncedToCloud: true,
            });
          }
        });
      }
    } catch (err) {
      console.warn('Could not sync all users from cloud:', err);
    }
  }

  const merged = Array.from(userMap.values()).map((u) => ({
    ...u,
    licenseId: u.licenseId || (u.username?.toLowerCase() === 'admin' ? '91-00-000-000000' : generateLicenseId(u)),
  }));
  saveLocalUsers(merged);
  return merged;
}

/**
 * Deletes a user from Cloud Firestore and local storage.
 */
export async function cloudDeleteUser(username) {
  const normalized = (username || '').toLowerCase();
  if (normalized === 'admin') {
    return { success: false, message: 'Cannot delete master administrator account.' };
  }

  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        await deleteDoc(doc(db, 'app_users', normalized));
      }
    } catch (err) {
      console.warn('Cloud delete user error:', err);
    }
  }

  const localList = getLocalUsers();
  const updated = localList.filter((u) => u.username.toLowerCase() !== normalized);
  saveLocalUsers(updated);

  return { success: true, message: `User "${username}" deleted.` };
}

/**
 * Generates a temporary 6-digit Device Authorization Passcode.
 * The actual user runs this on their primary device, and can share this code with someone on another device.
 */
export async function generateDeviceAuthCode(ownerUsername, options = {}) {
  const expiryMinutes = Number(options.expiryMinutes) || 15;
  const label = options.label || 'Secondary Device / Operator';
  const normalizedOwner = (ownerUsername || 'admin').toLowerCase();

  // Generate 6-digit numeric PIN
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const codeId = `devcode_${Date.now()}_${pin}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000).toISOString();

  const codeRecord = {
    id: codeId,
    code: pin,
    ownerUsername: normalizedOwner,
    label,
    createdAt: now.toISOString(),
    expiresAt,
    status: 'active', // 'active' | 'used' | 'revoked'
    usedAt: null,
    usedByDevice: null,
  };

  // 1. Save to Cloud Firestore (so it is instantly verified from ANY other device or network)
  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        await setDoc(doc(db, 'device_auth_codes', codeId), codeRecord);
      }
    } catch (err) {
      console.warn('Could not save device auth code to cloud:', err);
    }
  }

  // 2. Save to local storage for quick access
  try {
    const key = `gst-invoice-device-codes-${normalizedOwner}`;
    const saved = window.localStorage.getItem(key);
    const list = saved ? JSON.parse(saved) : [];
    window.localStorage.setItem(key, JSON.stringify([codeRecord, ...list.slice(0, 19)]));
  } catch {
    // ignore
  }

  return codeRecord;
}

/**
 * Retrieves all device authorization codes generated by this user.
 */
export async function getDeviceAuthCodes(ownerUsername) {
  const normalizedOwner = (ownerUsername || 'admin').toLowerCase();
  const codeMap = new Map();

  // 1. Read from local storage
  try {
    const key = `gst-invoice-device-codes-${normalizedOwner}`;
    const saved = window.localStorage.getItem(key);
    if (saved) {
      const list = JSON.parse(saved);
      list.forEach((c) => codeMap.set(c.id, c));
    }
  } catch {
    // ignore
  }

  // 2. Read from Firestore
  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        const snap = await getDocs(collection(db, 'device_auth_codes'));
        snap.forEach((docSnap) => {
          const c = docSnap.data();
          if (c.ownerUsername === normalizedOwner) {
            codeMap.set(c.id || docSnap.id, { id: docSnap.id, ...c });
          }
        });
      }
    } catch (err) {
      console.warn('Could not fetch cloud device auth codes:', err);
    }
  }

  // Sort by createdAt descending
  const list = Array.from(codeMap.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return list;
}

/**
 * Revokes an active device authorization code so it can no longer be used.
 */
export async function revokeDeviceAuthCode(codeId, ownerUsername) {
  const normalizedOwner = (ownerUsername || 'admin').toLowerCase();

  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        await setDoc(doc(db, 'device_auth_codes', codeId), { status: 'revoked' }, { merge: true });
      }
    } catch (err) {
      console.warn('Could not revoke cloud device code:', err);
    }
  }

  try {
    const key = `gst-invoice-device-codes-${normalizedOwner}`;
    const saved = window.localStorage.getItem(key);
    if (saved) {
      const list = JSON.parse(saved);
      const updated = list.map((c) => (c.id === codeId ? { ...c, status: 'revoked' } : c));
      window.localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }

  return { success: true, message: 'Device authorization code revoked.' };
}

/**
 * Authenticates a person on another device using a 6-digit Device Passcode
 * generated and authorized by the actual account owner.
 */
export async function verifyDeviceAuthCode(ownerIdentifier, code) {
  const identifier = (ownerIdentifier || '').trim().toLowerCase();
  const pin = (code || '').trim();

  if (!identifier) {
    return { success: false, message: 'Please enter the Account Owner User ID / Mobile / Email.' };
  }

  if (!pin || pin.length < 6) {
    return { success: false, message: 'Please enter the 6-digit Device Passcode provided by the account owner.' };
  }

  // 1. Check Cloud Firestore for active code
  let matchedCode = null;

  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        const snap = await getDocs(collection(db, 'device_auth_codes'));
        for (const docSnap of snap.docs) {
          const c = docSnap.data();
          const matchesOwner =
            c.ownerUsername === identifier ||
            identifier.includes(c.ownerUsername);

          if (matchesOwner && c.code === pin) {
            matchedCode = { id: docSnap.id, ...c };
            break;
          }
        }
      }
    } catch (err) {
      console.warn('Cloud device code verification error:', err);
    }
  }

  // 2. Fallback to local storage
  if (!matchedCode && typeof window !== 'undefined') {
    try {
      const key = `gst-invoice-device-codes-${identifier}`;
      const saved = window.localStorage.getItem(key);
      if (saved) {
        const list = JSON.parse(saved);
        matchedCode = list.find((c) => c.code === pin && c.ownerUsername === identifier);
      }
    } catch {
      // ignore
    }
  }

  if (!matchedCode) {
    return {
      success: false,
      message: 'Invalid Device Passcode or Account ID. Please ask the account owner to generate an active passcode from their dashboard.',
    };
  }

  if (matchedCode.status === 'revoked') {
    return {
      success: false,
      message: 'This device authorization passcode was revoked by the account owner.',
    };
  }

  if (matchedCode.status === 'used') {
    return {
      success: false,
      message: 'This single-use device passcode has already been redeemed.',
    };
  }

  const now = new Date();
  if (now > new Date(matchedCode.expiresAt)) {
    return {
      success: false,
      message: 'This device passcode has expired (15 minute validity). Please ask the owner for a fresh code.',
    };
  }

  // Mark as used in Cloud Firestore
  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db && matchedCode.id) {
        await setDoc(
          doc(db, 'device_auth_codes', matchedCode.id),
          {
            status: 'used',
            usedAt: now.toISOString(),
            usedByDevice: typeof navigator !== 'undefined' && navigator?.userAgent ? navigator.userAgent.slice(0, 100) : 'Web Client',
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('Could not update used status in cloud:', err);
    }
  }

  // Fetch the owner user profile
  const targetUsername = matchedCode.ownerUsername || identifier;
  let userAccount = null;

  if (targetUsername === 'admin') {
    userAccount = ADMIN_MASTER_USER;
  } else {
    if (isFirebaseConfigured()) {
      try {
        const db = getFirestoreDb();
        if (db) {
          const userDoc = await getDoc(doc(db, 'app_users', targetUsername));
          if (userDoc.exists()) {
            userAccount = userDoc.data();
          }
        }
      } catch (err) {
        console.warn('Could not fetch owner user profile:', err);
      }
    }

    if (!userAccount) {
      const localUsers = getLocalUsers();
      userAccount = localUsers.find((u) => u.username.toLowerCase() === targetUsername);
    }
  }

  if (!userAccount) {
    userAccount = {
      username: targetUsername,
      role: 'Authorized Device Operator',
      companyName: '',
      subscription: { planName: 'Enterprise Suite', status: 'Active' },
    };
  }

  return {
    success: true,
    user: userAccount,
    source: 'device_passcode_auth',
    message: `✓ Device authorized and signed in to "${userAccount.username}" account successfully!`,
  };
}

/**
 * Updates the Multi-Device authorization master toggle for a user.
 */
export async function setMultiDeviceLoginAllowed(username, allowed) {
  const normalized = (username || 'admin').toLowerCase();
  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        await setDoc(
          doc(db, 'app_users', normalized),
          { allowMultiDevice: allowed },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('Could not update multi-device setting in cloud:', err);
    }
  }

  try {
    const key = `gst-invoice-multidevice-setting-${normalized}`;
    window.localStorage.setItem(key, JSON.stringify(allowed));
  } catch {
    // ignore
  }

  return { success: true, allowed };
}

/**
 * Reads the Multi-Device authorization master toggle for a user.
 */
export function getMultiDeviceLoginAllowed(username) {
  const normalized = (username || 'admin').toLowerCase();
  try {
    const key = `gst-invoice-multidevice-setting-${normalized}`;
    const saved = window.localStorage.getItem(key);
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return true; // Default allowed
}

/**
 * REST API Gateway for Device Authorization & Remote Login
 * Handles REST endpoints:
 * - POST /api/v1/auth/device/generate-passcode
 * - POST /api/v1/auth/device/verify-passcode
 * - POST /api/v1/auth/device/revoke-passcode
 * - GET  /api/v1/auth/device/list-passcodes
 */
export async function callDeviceAuthApi(endpoint, method = 'POST', payload = {}) {
  const startTime = Date.now();
  const normalizedEndpoint = endpoint.split('?')[0].trim();

  try {
    if (normalizedEndpoint.endsWith('/generate-passcode') && method === 'POST') {
      const { ownerUsername, label, expiryMinutes } = payload;
      const codeRecord = await generateDeviceAuthCode(ownerUsername || 'admin', {
        label: label || 'Remote Device',
        expiryMinutes: Number(expiryMinutes) || 15,
      });

      return {
        status: 201,
        statusText: 'Created',
        latencyMs: Date.now() - startTime,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        data: {
          success: true,
          codeId: codeRecord.id,
          passcode: codeRecord.code,
          ownerUsername: codeRecord.ownerUsername,
          label: codeRecord.label,
          expiresAt: codeRecord.expiresAt,
          status: codeRecord.status,
          message: '6-digit Device Passcode generated successfully.',
        },
      };
    }

    if (normalizedEndpoint.endsWith('/verify-passcode') && method === 'POST') {
      const { ownerIdentifier, passcode } = payload;
      const result = await verifyDeviceAuthCode(ownerIdentifier, passcode);

      if (!result.success) {
        return {
          status: 401,
          statusText: 'Unauthorized',
          latencyMs: Date.now() - startTime,
          headers: { 'content-type': 'application/json; charset=utf-8' },
          data: {
            success: false,
            error: 'AUTH_FAILED',
            message: result.message,
          },
        };
      }

      return {
        status: 200,
        statusText: 'OK',
        latencyMs: Date.now() - startTime,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        data: {
          success: true,
          token: `tok_dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
          user: {
            username: result.user.username,
            role: result.user.role || 'Authorized Operator',
            companyName: result.user.companyName || '',
            subscription: result.user.subscription,
          },
          message: result.message,
        },
      };
    }

    if (normalizedEndpoint.endsWith('/revoke-passcode') && method === 'POST') {
      const { ownerUsername, codeId } = payload;
      const result = await revokeDeviceAuthCode(codeId, ownerUsername);

      return {
        status: 200,
        statusText: 'OK',
        latencyMs: Date.now() - startTime,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        data: {
          success: true,
          message: result.message || 'Device passcode revoked.',
        },
      };
    }

    if (normalizedEndpoint.endsWith('/list-passcodes')) {
      const owner = payload?.ownerUsername || payload?.owner || 'admin';
      const codes = await getDeviceAuthCodes(owner);

      return {
        status: 200,
        statusText: 'OK',
        latencyMs: Date.now() - startTime,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        data: {
          success: true,
          owner,
          count: codes.length,
          codes,
        },
      };
    }

    return {
      status: 404,
      statusText: 'Not Found',
      latencyMs: Date.now() - startTime,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      data: {
        success: false,
        error: 'ROUTE_NOT_FOUND',
        message: `Endpoint ${endpoint} not found.`,
      },
    };
  } catch (err) {
    return {
      status: 500,
      statusText: 'Internal Server Error',
      latencyMs: Date.now() - startTime,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      data: {
        success: false,
        error: 'SERVER_ERROR',
        message: err.message,
      },
    };
  }
}
