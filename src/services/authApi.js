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
