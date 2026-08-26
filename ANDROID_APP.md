# ?? Tread - Android Application Guide & Release

Welcome to the standalone Android App configuration and build guide for **Tread GST Invoicing & Accounting**.

---

## ?? Quick Access & Project Files

- **Android Project Directory**: [`android/`](file:///c:/Users/Prince/OneDrive/Desktop/Project/Tread/android)
- **Downloadable ZIP Archive**: [`Tread-Android-Capacitor.zip`](file:///c:/Users/Prince/OneDrive/Desktop/Project/Tread/Tread-Android-Capacitor.zip)
- **Capacitor Configuration**: [`capacitor.config.json`](file:///c:/Users/Prince/OneDrive/Desktop/Project/Tread/capacitor.config.json)
- **1-Click Build & Sync Script**: [`build-android.bat`](file:///c:/Users/Prince/OneDrive/Desktop/Project/Tread/build-android.bat)
- **1-Click Android Studio Launcher**: [`open-android-studio.bat`](file:///c:/Users/Prince/OneDrive/Desktop/Project/Tread/open-android-studio.bat)

---

## ?? App Specifications

| Property | Value |
| :--- | :--- |
| **App Name** | Tread - GST Billing & Invoicing |
| **Package ID** | `com.tread.business` |
| **Target SDK** | Android 15 (API 35) |
| **Min SDK** | Android 7.0 (API 24) |
| **Framework** | React 19 + Vite 8 + Capacitor 8 Native Bridge |
| **Hardware Back Button** | Handled natively (Closes menus/modals -^> Dashboard -^> Cloud sync prompt before exit) |
| **Theme / Status Bar** | Dark Slate `#0f172a` with responsive native status bar styling |

---

## ?? How to Build APK / AAB (3 Simple Steps)

### Step 1: Sync Assets (1-Click)
Double-click [`build-android.bat`](file:///c:/Users/Prince/OneDrive/Desktop/Project/Tread/build-android.bat) or run in terminal:
```bash
npm run cap:sync
```

### Step 2: Open Android Studio
Double-click [`open-android-studio.bat`](file:///c:/Users/Prince/OneDrive/Desktop/Project/Tread/open-android-studio.bat) or run in terminal:
```bash
npm run cap:open
```

### Step 3: Generate APK or Google Play App Bundle
In **Android Studio**:
1. Go to top menu: **`Build`** -> **`Build Bundle(s) / APK(s)`** -> **`Build APK(s)`**.
2. Once finished, click **`locate`** in the bottom-right notification popup to get your ready-to-install `.apk` file!
3. For Google Play Store submission: Select **`Build`** -> **`Generate Signed Bundle / APK`** -> **`Android App Bundle (.aab)`**.

---

## ?? Integrated Mobile Features

1. **Top Slide-Down Accordion Menu**:
   - 3-tier structure (`Add`, `Modify`, `List`) across **Sales**, **Purchase**, **Account**, and **Items**.
2. **1-Thumb Mobile Bottom Navigation**:
   - Instant access to Dashboard, New Sale, Sales Invoices, and Parties.
3. **Cloud Sync Confirmation on Exit & Logout**:
   - Prompts for automatic Cloud Firestore backup whenever exiting or logging out.
4. **Offline Capability**:
   - Full offline invoice generation, inventory tracking, and local receipt storage with real-time sync capabilities.

