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
  companyName: 'M/S PRIYA SALES',
  phone: '9871772123',
  email: 'admin@priyasales.com',
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
        // Ensure admin user exists with prince password
        const others = parsed.filter((u) => u.username.toLowerCase() !== 'admin');
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

  // 1. Check if default Admin Master
  if (normalizedId === 'admin' || normalizedId === 'admin@priyasales.com') {
    const adminMobile = sanitizeMobile(ADMIN_MASTER_USER.phone);
    if (rawPass === ADMIN_MASTER_USER.password && mobile === adminMobile) {
      return {
        success: true,
        user: ADMIN_MASTER_USER,
        source: 'master_admin',
        message: '✓ Authenticated as Master Administrator.',
      };
    } else if (rawPass !== ADMIN_MASTER_USER.password) {
      return {
        success: false,
        message: 'Incorrect password for admin account.',
      };
    } else {
      return {
        success: false,
        message: `Mobile number ${mobile} does not match registered admin mobile (${adminMobile}).`,
      };
    }
  }

  // 2. Try Cloud Firestore (Cross-Device Database - IP Independent)
  if (isFirebaseConfigured()) {
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

          // Cache in local storage for offline use
          const localList = getLocalUsers();
          const filtered = localList.filter(
            (u) => u.username.toLowerCase() !== cloudUser.username.toLowerCase()
          );
          saveLocalUsers([cloudUser, ...filtered]);

          return {
            success: true,
            user: cloudUser,
            source: 'cloud_firestore',
            message: '✓ Login successful from Cloud Database (Any Device / Any IP).',
          };
        }

        // Also check if user entered email or registered mobile
        const allUsersSnap = await getDocs(collection(db, 'app_users'));
        for (const d of allUsersSnap.docs) {
          const u = d.data();
          const uMobile = sanitizeMobile(u.phone);
          const matchesId =
            (u.email && u.email.toLowerCase() === normalizedId) ||
            u.username.toLowerCase() === normalizedId ||
            (uMobile && uMobile === normalizedId);

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

            // Cache locally
            const localList = getLocalUsers();
            const filtered = localList.filter(
              (x) => x.username.toLowerCase() !== u.username.toLowerCase()
            );
            saveLocalUsers([u, ...filtered]);

            return {
              success: true,
              user: u,
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
  const localAccount = localUsers.find(
    (u) =>
      u.username.toLowerCase() === normalizedId ||
      (u.email && u.email.toLowerCase() === normalizedId) ||
      (u.phone && sanitizeMobile(u.phone) === normalizedId)
  );

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
    return {
      success: true,
      user: localAccount,
      source: 'local_storage',
      message: '✓ Login successful (Local Cache).',
    };
  }

  return {
    success: false,
    message: 'Account not found for this User ID. Please check your User ID, Mobile Number & Password or Sign Up.',
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

  const userRecord = {
    username: trimmedUser,
    password: trimmedPass,
    phone: rawMobile,
    email: userData.email?.trim() || '',
    companyName: userData.companyName?.trim() || '',
    role: userData.role || 'Operator',
    subscription: userData.subscription || {
      planId: 'pro',
      planName: 'Professional Plan',
      status: 'Active',
      activatedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    syncedToCloud: true,
  };

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

  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        const snapshot = await getDocs(collection(db, 'app_users'));
        snapshot.forEach((docSnap) => {
          const cloudData = docSnap.data();
          if (cloudData.username) {
            userMap.set(cloudData.username.toLowerCase(), {
              ...cloudData,
              syncedToCloud: true,
            });
          }
        });
      }
    } catch (err) {
      console.warn('Could not sync all users from cloud:', err);
    }
  }

  const merged = Array.from(userMap.values());
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
      companyName: 'M/S PRIYA SALES',
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
            companyName: result.user.companyName || 'M/S PRIYA SALES',
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
