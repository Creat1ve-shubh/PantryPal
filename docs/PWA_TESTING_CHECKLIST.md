# PWA Manual Testing Checklist

Use this checklist to verify all PWA functionality before deployment.

## 🔨 Build & Assets

- [ ] Run `npm run build` without errors
- [ ] Check dist files exist:
  - [ ] `dist/manifest.webmanifest` (5-10 KB)
  - [ ] `dist/sw.js` (30-50 KB)
  - [ ] `dist/pwa-192x192.png` (exists)
  - [ ] `dist/pwa-512x512.png` (exists)
- [ ] Manifest is valid JSON:
  ```bash
  cat dist/manifest.webmanifest | jq .
  # Should output without errors
  ```
- [ ] Service Worker has content:
  ```bash
  wc -l dist/sw.js
  # Should be 100+ lines
  ```

---

## 🌐 Installation (Desktop Chrome)

**Browser**: Chrome, Edge, Opera (PWA-supported)
**URL**: `http://localhost:5000` or `https://your-domain.com`

### Install Button Appearance

- [ ] Address bar shows install icon (right side)
- [ ] Icon is clickable
- [ ] Clicking shows "Install PantryPal" dialog

### Install Dialog

- [ ] Dialog appears with app name "PantryPal"
- [ ] Shows app icon (192x192)
- [ ] Has "Install" and "Cancel" buttons
- [ ] Clicking "Install" succeeds without errors

### Post-Installation

- [ ] App opens in new window (fullscreen, no address bar)
- [ ] App name shown in title bar
- [ ] App icon in taskbar/dock
- [ ] App appears in Start Menu / Applications (within 10 seconds)

### DevTools Verification

- [ ] DevTools → Application → Manifest shows:
  ```json
  {
    "name": "PantryPal",
    "short_name": "PantryPal",
    "display": "standalone",
    "theme_color": "#0f172a",
    "icons": [...]
  }
  ```
- [ ] No manifest errors shown

---

## 📡 Service Worker Registration

### Service Worker Tab

- [ ] DevTools → Application → Service Workers shows entry
- [ ] Status: "activated and running"
- [ ] Scope: `https://your-domain.com/`
- [ ] No error messages

### Service Worker Update

- [ ] Click "Update" button
- [ ] Browser checks for new version
- [ ] Status updates to reflect latest

### Service Worker Bypass

- [ ] Checkbox "Bypass for network" exists
- [ ] Checking it makes requests skip cache
- [ ] Unchecking uses cache again

---

## 💾 Cache Storage

### Cache Contents

- [ ] DevTools → Application → Cache Storage shows caches:
  - [ ] `google-fonts-cache` (fonts)
  - [ ] `gstatic-fonts-cache` (Google static assets)
  - [ ] `api-cache` (API responses)
  - [ ] `PantryPal-v*` (app assets)

### Cache Inspection

- [ ] Click each cache to view entries
- [ ] API cache contains `/api/*` endpoints
- [ ] Font cache contains `.woff2` files
- [ ] App cache contains `.js`, `.css` files

### Cache Size

- [ ] View → Storage → Shows total cache size
- [ ] Cache size reasonable (< 100 MB)
- [ ] Size doesn't grow unbounded

### Cache Deletion

- [ ] Right-click cache → Delete
- [ ] Cache removed from storage
- [ ] App refetches on next visit

---

## 🔌 Offline Mode Testing

### Setup

1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. Refresh page (Ctrl+R)

### Navigation

- [ ] App loads instantly (from cache)
- [ ] No network requests shown in DevTools
- [ ] Page layout correct
- [ ] All cached routes load

### Features

- [ ] Barcode scanner page loads
- [ ] Cart displays saved items
- [ ] Checkout page accessible
- [ ] Order history page shows cached data

### Error Handling

- [ ] Try to fetch new product (API call)
- [ ] Shows error message (not app crash)
- [ ] Message indicates "offline" or "no connection"
- [ ] App remains functional

### Recovery

1. Uncheck "Offline"
2. Refresh page
3. App reconnects to server
4. New data loads
5. API calls succeed

---

## 🔄 Update Mechanism

### Auto-Update

- [ ] Service Worker configured with `registerType: "autoUpdate"`
- [ ] DevTools → Service Workers shows active SW
- [ ] Deploy new version to production
- [ ] Refresh browser after 1-2 hours
- [ ] New version installed automatically
- [ ] No user action required (except refresh)

### Manual Update Check

- [ ] DevTools → Service Workers → Click "Update"
- [ ] Browser checks for new SW version
- [ ] If available, installs and activates
- [ ] App behavior unchanged (user doesn't see update)

---

## 📲 Mobile Installation (Android)

**Device**: Android phone with Chrome
**URL**: App deployed to HTTPS domain

### Install Prompt

- [ ] Browser automatically shows install popup
- [ ] Popup says "Install PantryPal?"
- [ ] Click "Install" or "Later"

### Installation

- [ ] App shortcut created on home screen
- [ ] Tap shortcut launches app fullscreen
- [ ] No Chrome address bar visible
- [ ] App has taskbar entry

### Home Screen

- [ ] App icon displays correctly
- [ ] App name shows below icon
- [ ] Icon opens app when tapped
- [ ] Long-press shows app info

---

## 🍎 Mobile Installation (iOS)

**Device**: iPhone with Safari
**URL**: App deployed to HTTPS domain

### Add to Home Screen

1. Open Safari
2. Tap Share button (↗)
3. Scroll down
4. Tap "Add to Home Screen"
5. Name: "PantryPal"
6. Tap "Add"

### Installation

- [ ] App shortcut appears on home screen
- [ ] Tap to launch (fullscreen, no Safari UI)
- [ ] First-time launch might take 5-10 seconds
- [ ] App icon displays correctly

### Offline Usage

- [ ] Open installed app
- [ ] Enable Airplane Mode
- [ ] Refresh page
- [ ] App loads from cache
- [ ] Functionality works offline

---

## 🎯 Install Prompt Hook

### First Visit (Clean Cache)

1. DevTools → Application → Storage → Clear site data
2. Refresh page
3. Disable "Bypass for network" (use cache)

- [ ] `beforeinstallprompt` event fires
- [ ] Custom install button appears (if implemented)
- [ ] Button is clickable
- [ ] Clicking shows native install dialog

### Subsequent Visits

- [ ] Install button not shown (app already installed)
- [ ] Or: Prompt respects user's previous choice

### Console Messages

- [ ] Browser console shows no install-related errors
- [ ] If implemented, custom handler logs user choice:
  ```
  User response to the install prompt: accepted
  ```

---

## 🧪 Cache Strategies

### Cache First (Fonts)

1. Load page with fonts
2. Observe fonts load
3. Turn offline
4. Reload page
5. - [ ] Fonts load instantly from cache
6. Go online
7. - [ ] Fonts still from cache (no refetch)

### Network First (API)

1. Make API request (barcode search)
2. DevTools shows network request
3. Turn offline
4. Repeat request
5. - [ ] Request fails (no cache) OR uses old cache if available
6. Go online
7. - [ ] New request succeeds

### Stale While Revalidate (Default)

1. Load page
2. Observe resource cached
3. Close DevTools
4. Reload page
5. - [ ] Page loads instantly from cache
6. In background, new version fetches
7. Next page load shows updated resource

---

## 🚨 Error Handling

### Network Errors

- [ ] Graceful degradation when offline
- [ ] Error messages user-friendly (not technical)
- [ ] No console errors shown
- [ ] App remains responsive

### Missing Manifest

- [ ] Remove `manifest.webmanifest` from dist
- [ ] Browser doesn't crash
- [ ] Console shows warning
- [ ] Install button doesn't appear

### Service Worker Errors

- [ ] Add syntax error to service worker
- [ ] SW registration fails gracefully
- [ ] App still functions (just no offline support)
- [ ] Console shows error message

---

## 🚀 Performance

### Initial Load

- [ ] First load: < 3 seconds (network dependent)
- [ ] Subsequent loads: < 1 second (cached)
- [ ] Measure in DevTools → Network → time

### Cache Hit Time

- [ ] Offline reload: < 500ms
- [ ] Measure: DevTools → Lighthouse → Performance

### Bundle Size

- [ ] Gzip size reasonable (< 500 KB app bundle)
- [ ] Icon files < 100 KB each
- [ ] Total cache < 100 MB

---

## 🔐 Security

### HTTPS Enforcement

- [ ] Service Worker only works on HTTPS (or localhost)
- [ ] HTTP version shows no install option
- [ ] Deployment runs on HTTPS

### Manifest Origin

- [ ] Manifest served with correct origin
- [ ] Cross-origin requests work with CORS headers

### CSP Headers

- [ ] Content-Security-Policy allows service worker
- [ ] No console warnings about CSP violations

---

## 📊 Browser DevTools Audit

### Lighthouse PWA Audit

1. DevTools → Lighthouse
2. Select "PWA" category
3. Click "Analyze page load"

Results should show:

- [ ] **Web App Manifest**: ✅ Pass
- [ ] **Service Worker**: ✅ Pass
- [ ] **HTTPS**: ✅ Pass
- [ ] **Viewport**: ✅ Pass
- [ ] **Icons**: ✅ Pass
- [ ] **Splash Screen**: ✅ Pass (optional)
- [ ] **Display**: ✅ Pass
- [ ] **Status Bar**: ✅ Pass (optional)
- [ ] **Theme Color**: ✅ Pass (optional)

---

## 🐛 Common Issues & Solutions

### Issue: Install Button Doesn't Appear

**Checklist**:

- [ ] App served over HTTPS (required, except localhost)
- [ ] Manifest file exists and loads
- [ ] Manifest contains required fields (name, icons, display)
- [ ] Icons exist and are accessible
- [ ] Service Worker registered successfully

**Solution**:

```bash
# Rebuild and ensure HTTPS
npm run build
npm run start  # Starts on localhost (works without HTTPS)
```

### Issue: Offline Page Blank

**Checklist**:

- [ ] Service Worker running (DevTools → Service Workers)
- [ ] Cache Storage contains pages
- [ ] "Bypass for network" is unchecked

**Solution**:

```typescript
// Add fallback offline page
workbox: {
  navigateFallback: "/offline.html";
}
```

### Issue: Cache Growing Too Large

**Solution**:

```typescript
// Limit cache size
expiration: {
  maxEntries: 50,      // Maximum 50 entries per cache
  maxAgeSeconds: 86400 // Auto-delete after 24 hours
}
```

### Issue: Update Not Installing

**Solution**:

```typescript
// Check registration
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then((reg) => {
    console.log("SW Ready:", reg);
    reg.update(); // Check for updates
  });
}
```

---

## ✅ Final Checklist

Before production deployment:

- [ ] All build checks pass (manifest, SW, icons)
- [ ] Installation works on desktop and mobile
- [ ] Offline mode functions correctly
- [ ] Cache Storage shows expected caches
- [ ] Service Worker shows "activated and running"
- [ ] No console errors or warnings
- [ ] Lighthouse audit passes (PWA category)
- [ ] Update mechanism works
- [ ] Security headers in place (HTTPS)
- [ ] Performance acceptable (< 1s cached load)
- [ ] Error handling graceful
- [ ] Tested on multiple browsers (Chrome, Firefox, Safari)
- [ ] Tested on multiple devices (desktop, mobile)

---

**Last Updated**: January 7, 2026
**Version**: 1.0
**Status**: Ready for Testing
