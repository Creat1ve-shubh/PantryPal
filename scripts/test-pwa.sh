#!/bin/bash
# PWA Testing Quick Start Script
# Tests all PWA features locally

set -e

echo "🚀 PantryPal PWA Testing Suite"
echo "=================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Build
echo -e "\n${BLUE}Step 1: Building PWA...${NC}"
npm run build
if [ -f "dist/manifest.webmanifest" ]; then
  echo -e "${GREEN}✅ Manifest generated${NC}"
else
  echo -e "${RED}❌ Manifest not found${NC}"
  exit 1
fi

if [ -f "dist/sw.js" ]; then
  echo -e "${GREEN}✅ Service Worker generated${NC}"
else
  echo -e "${RED}❌ Service Worker not found${NC}"
  exit 1
fi

# Step 2: Verify manifest content
echo -e "\n${BLUE}Step 2: Validating Manifest...${NC}"
if grep -q '"name":"PantryPal"' dist/manifest.webmanifest; then
  echo -e "${GREEN}✅ Manifest contains app name${NC}"
else
  echo -e "${RED}❌ Manifest missing app name${NC}"
fi

if grep -q '"display":"standalone"' dist/manifest.webmanifest; then
  echo -e "${GREEN}✅ Display mode: standalone${NC}"
else
  echo -e "${RED}❌ Display mode incorrect${NC}"
fi

# Step 3: Check icons
echo -e "\n${BLUE}Step 3: Checking PWA Icons...${NC}"
if [ -f "dist/pwa-192x192.png" ]; then
  SIZE=$(du -h dist/pwa-192x192.png | cut -f1)
  echo -e "${GREEN}✅ Icon 192x192 found (${SIZE})${NC}"
else
  echo -e "${YELLOW}⚠️  Icon 192x192 not found${NC}"
fi

if [ -f "dist/pwa-512x512.png" ]; then
  SIZE=$(du -h dist/pwa-512x512.png | cut -f1)
  echo -e "${GREEN}✅ Icon 512x512 found (${SIZE})${NC}"
else
  echo -e "${YELLOW}⚠️  Icon 512x512 not found${NC}"
fi

# Step 4: Verify service worker
echo -e "\n${BLUE}Step 4: Checking Service Worker...${NC}"
if grep -q "self.addEventListener" dist/sw.js 2>/dev/null; then
  echo -e "${GREEN}✅ Service Worker has event listeners${NC}"
else
  echo -e "${YELLOW}⚠️  Service Worker might be empty${NC}"
fi

# Step 5: Check bundle files
echo -e "\n${BLUE}Step 5: Checking Build Assets...${NC}"
JS_SIZE=$(du -sh dist/assets/*.js | tail -1 | cut -f1)
CSS_SIZE=$(du -sh dist/assets/*.css 2>/dev/null | tail -1 | cut -f1 || echo "0K")
echo -e "${GREEN}✅ JavaScript bundle: ${JS_SIZE}${NC}"
echo -e "${GREEN}✅ CSS bundle: ${CSS_SIZE}${NC}"

# Step 6: Display manifest content
echo -e "\n${BLUE}Step 6: Manifest Content:${NC}"
echo "---"
cat dist/manifest.webmanifest | jq . 2>/dev/null || cat dist/manifest.webmanifest
echo "---"

# Step 7: Summary
echo -e "\n${BLUE}Summary:${NC}"
echo "=================================="
echo -e "${GREEN}✅ PWA build complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Start dev server: ${YELLOW}npm run dev${NC}"
echo "2. Open browser: ${YELLOW}http://localhost:5000${NC}"
echo "3. Open DevTools (F12)"
echo "4. Go to ${YELLOW}Application${NC} tab"
echo "5. Check ${YELLOW}Manifest${NC} and ${YELLOW}Service Workers${NC}"
echo "6. Test offline: DevTools → Network → Check 'Offline'"
echo ""
echo "For production testing:"
echo "- Install: Address bar → Install button"
echo "- Offline: DevTools → Network → Offline → Reload"
echo "- Cache: Application → Cache Storage → Inspect"
echo ""
echo "For detailed guide, see: ${YELLOW}docs/PWA_GUIDE.md${NC}"
