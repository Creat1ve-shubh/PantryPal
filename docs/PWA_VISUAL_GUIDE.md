# PWA Testing - Visual Step-by-Step Guide

## 🎬 Visual Walkthroughs

### Test 1: Desktop Installation (Chrome/Edge)

#### Step 1: Build PWA

```bash
npm run build
```

Expected output:

```
✓ vite build complete
✓ PWA manifest generated
✓ Service worker generated
```

#### Step 2: Start Server

```bash
npm run dev
# or
npm run start
```

Visit: `http://localhost:5000`

#### Step 3: Look for Install Button

```
Address Bar:
┌─────────────────────────────────────────────────────┐
│ localhost:5000                          [⬇] [★] [⋮] │  ← Install icon appears here
└─────────────────────────────────────────────────────┘
```

#### Step 4: Click Install Button

```
┌────────────────────────────┐
│  Install PantryPal?        │
│                            │
│  📦 PantryPal              │
│  Add PantryPal to your...  │
│                            │
│  [Cancel]    [Install]     │  ← Click "Install"
└────────────────────────────┘
```

#### Step 5: App Launches Fullscreen

```
Before:
┌─────────────────────────────────────────────────────┐
│ localhost:5000                          [⬇] [★] [⋮] │  ← Address bar visible
│─────────────────────────────────────────────────────│
│                                                     │
│        PantryPal App Content                       │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘

After:
┌─────────────────────────────────────────────────────┐
│ PantryPal                                           │  ← No address bar!
│─────────────────────────────────────────────────────│
│                                                     │
│        PantryPal App Content                       │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Step 6: Verify Installation

✅ Taskbar shows "PantryPal" icon
✅ Start Menu has PantryPal shortcut
✅ App can be uninstalled like other apps

---

### Test 2: Offline Testing

#### Setup

Open DevTools: `F12`

```
┌─────────────────────────────────────────────────────┐
│ DevTools                                            │
├─────────────────────────────────────────────────────┤
│ [Elements] [Console] [Sources] [Network] [App...] │ ← Click "Network"
│                                                     │
│ ☐ Offline  ← Check this box                        │
│ ☐ Disable cache                                     │
│ ☐ Throttling: [No throttling]                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Step 1: Go Online (Baseline)

1. Uncheck "Offline"
2. Navigate to `/barcode-scanner`
3. Page loads normally from network

```
Network Requests:
✓ GET /barcode-scanner           200
✓ GET /api/customers             200
✓ GET /api/products/search       200
```

#### Step 2: Go Offline

1. Check "Offline" checkbox in DevTools
2. Refresh page (Ctrl+R)

```
Expected Result:
✓ Page loads instantly (< 500ms)
✓ No network requests shown
✓ Content same as online
✓ Cart data visible (from localStorage)
```

#### Step 3: Try Operations

- Navigate between pages → ✅ Works (cached pages)
- Search for product → ❌ Fails (API call) → Shows "No connection" message
- View cart → ✅ Works (localStorage)
- Scan barcode (mock) → ✅ Works (stored locally)

```
Network Requests when Offline:
✗ GET /api/products/search       (blocked - offline)
✗ GET /api/bills                 (blocked - offline)
✓ GET /barcode-scanner           (from cache)
```

#### Step 4: Go Back Online

1. Uncheck "Offline"
2. Refresh page
3. App reconnects to server

```
Network Requests after reconnecting:
✓ GET /barcode-scanner           200 (from network)
✓ GET /api/customers             200 (fresh data)
✓ GET /api/products/search       200 (up-to-date)
```

---

### Test 3: Cache Storage Inspection

#### Open Cache Storage

```
DevTools → Application → Cache Storage
│
├─ google-fonts-cache (2 items, ~500 KB)
│  ├─ https://fonts.googleapis.com/css2?...
│  └─ https://fonts.gstatic.com/s/roboto/...
│
├─ gstatic-fonts-cache (1 item, ~200 KB)
│  └─ https://fonts.gstatic.com/s/inter/...
│
├─ api-cache (15 items, ~2 MB)
│  ├─ http://localhost:5000/api/bills
│  ├─ http://localhost:5000/api/customers
│  ├─ http://localhost:5000/api/products/search?barcode=PROD-001
│  └─ ... more API responses
│
└─ PantryPal-v1.0.0 (120 items, ~5 MB)
   ├─ http://localhost:5000/
   ├─ http://localhost:5000/assets/index-*.js
   ├─ http://localhost:5000/assets/index-*.css
   └─ ... static assets
```

#### Inspect Single Cache Entry

Click on `api-cache` → Click on `/api/bills`:

```
Request Headers:
GET /api/bills HTTP/1.1
Authorization: Bearer token...

Response Headers:
HTTP/1.1 200 OK
Cache-Control: public, max-age=86400
Content-Type: application/json

Response Body:
{
  "data": [
    {
      "id": "bill-1",
      "bill_number": "BILL-001",
      ...
    }
  ]
}
```

#### Delete a Cache

Right-click cache name → Delete Cache:

```
Before:
├─ api-cache (15 items)

After:
├─ api-cache ← Removed

Next request: Refetch from server, re-add to cache
```

---

### Test 4: Service Worker Monitoring

#### Check Service Worker Status

```
DevTools → Application → Service Workers

Status:
┌──────────────────────────────────────────┐
│ sw.js                                    │
│ http://localhost:5000/sw.js              │
│ Scope: http://localhost:5000/            │
│ Status: activated and running            │ ← Green ✅
│                                          │
│ [Update] [Unregister] [Skip waiting]    │
└──────────────────────────────────────────┘
```

#### Check for Updates

Click "Update" button:

```
Status changes:
1. installing → Downloading new SW
2. installed → New version ready
3. activated → New version active
4. running → Ready to serve requests
```

#### Unregister Service Worker

Click "Unregister":

```
After unregistering:
├─ sw.js
│ Status: (no service worker)  ← Red ❌
│
Next benefits lost:
❌ Offline support gone
❌ Caching disabled
❌ Install option gone

Resolution: Refresh page to re-register
```

---

### Test 5: Mobile Installation (Android Chrome)

#### Step 1: Open App in Chrome

Visit: `https://your-domain.com`

#### Step 2: Install Popup

```
Automatic popup appears (on first visit):
┌─────────────────────┐
│ Get App             │
│                     │
│ Install PantryPal   │
│ (version 1.0.0)     │
│                     │
│  [Install] [No]     │
└─────────────────────┘
```

Alternative if popup doesn't appear:

1. Menu (⋮) → Install app
2. Or: Hamburger menu → "Install PantryPal"

#### Step 3: Confirm Installation

```
┌─────────────────────────────────────────┐
│ Install PantryPal                       │
│                                         │
│ 📦 PantryPal                            │
│ 📲 This app will be installed on your   │
│    device and can be launched from      │
│    the app drawer and home screen       │
│                                         │
│ [Cancel] [Install]                      │
└─────────────────────────────────────────┘
```

#### Step 4: Post-Installation

✅ App shortcut appears on home screen
✅ App icon in app drawer
✅ Tap to launch fullscreen (no Chrome UI)
✅ Can pin to home screen
✅ Can uninstall like other apps

---

### Test 6: Mobile Installation (iOS Safari)

#### Step 1: Open App in Safari

Visit: `https://your-domain.com`

#### Step 2: Share Menu

```
Bottom buttons:
[← Back] [Reload] [Share] ← Tap this
```

Tap Share (↗):

```
Share menu appears:
┌──────────────────────────┐
│ Share                    │
│                          │
│ Scroll to find:          │
│ "Add to Home Screen" ← Click
│                          │
│ Or look for "More..."    │
└──────────────────────────┘
```

#### Step 3: Add to Home Screen

```
┌────────────────────────────────┐
│ Add to Home Screen             │
│                                │
│ 📱 PantryPal                   │
│ [Thumbnail of app]             │
│                                │
│ [Cancel]  [Add]                │
└────────────────────────────────┘
```

#### Step 4: Post-Installation

✅ App shortcut on home screen
✅ Tap to open fullscreen
✅ First launch may take 5-10s
✅ Offline caching works
✅ Can delete like other apps

---

### Test 7: Lighthouse PWA Audit

#### Open Lighthouse

1. DevTools → Lighthouse tab
2. Device: Mobile or Desktop
3. Categories: Check only "PWA"
4. Click "Analyze page load"

```
┌────────────────────────────────────┐
│ Lighthouse Report                  │
├────────────────────────────────────┤
│ PWA Checklist (Desktop)            │
│                                    │
│ ✅ Web App Manifest             76 │
│ ✅ Service Worker                76 │
│ ✅ HTTPS                         76 │
│ ✅ Viewport                      76 │
│ ✅ Icons                         76 │
│ ✅ Splash Screen                 76 │
│ ✅ Display                       76 │
│ ✅ Theme Color                   76 │
│                                    │
│ Overall PWA Score: 76              │
└────────────────────────────────────┘
```

**Target scores**:

- ✅ All checks: Pass (no ❌)
- ✅ Overall score: 80+

---

## 🎯 Quick Test Checklist

```
Build Phase:
☐ npm run build succeeds
☐ dist/manifest.webmanifest exists
☐ dist/sw.js exists
☐ dist/pwa-*.png exists

Installation:
☐ Install button appears (address bar)
☐ Install succeeds
☐ App opens fullscreen
☐ App in taskbar/home screen

Offline:
☐ DevTools Network → Offline → Reload
☐ Page loads from cache (< 1 second)
☐ No network requests
☐ Graceful error for API calls

Cache:
☐ DevTools Application → Cache Storage
☐ Multiple caches visible
☐ Cache contains API responses

Service Worker:
☐ DevTools Service Workers shows entry
☐ Status: "activated and running"
☐ No error messages

Performance:
☐ Initial load: < 3 seconds
☐ Offline load: < 500ms
☐ Cache size: < 100 MB

Mobile:
☐ Android installation works
☐ iOS installation works
☐ App runs fullscreen

Lighthouse:
☐ PWA audit passes
☐ All checks green ✅
☐ Score 80+
```

---

## 📋 Expected File Sizes

```
Generated PWA Files:
├─ manifest.webmanifest      ~2-5 KB
├─ sw.js                     ~30-50 KB
├─ workbox-*.js              ~15-30 KB (chunks)
├─ pwa-192x192.png           ~10-30 KB
└─ pwa-512x512.png           ~30-100 KB

Total App Bundle:
├─ index.js (gzipped)        ~200-500 KB
├─ index.css (gzipped)       ~50-150 KB
├─ vendor JS (gzipped)       ~300-600 KB
└─ Total (gzipped)           ~600-1200 KB

Cache Growth:
├─ First visit               ~1 MB
├─ After usage               ~5-10 MB
└─ Max safe                  < 100 MB
```

---

**Last Updated**: January 7, 2026
**Visual Guide Version**: 1.0
