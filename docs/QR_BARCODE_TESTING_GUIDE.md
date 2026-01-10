# QR/Barcode Scanning Testing Guide

## Quick Test Checklist

### ✅ Pre-Test Verification

- [ ] Build succeeded: `npm run build`
- [ ] No TypeScript errors
- [ ] Server can start: `npm run dev`
- [ ] Database connection works
- [ ] Authentication middleware active

### ✅ Test Case 1: Add Product with Generated QR

**Steps:**

1. Login to PantryPal
2. Navigate to **Add Product** page
3. Fill in form:
   - Product Name: "Test Rice"
   - Category: "Rice & Grains"
   - Brand: "Test Brand"
   - MRP: 100
   - Buying Cost: 80
   - Stock: 50
4. Click **"Generate QR Code"** button
5. Verify QR code appears
6. Note the generated ID shown in form
7. Submit the form
8. Product should be created successfully

**Expected Result:**

- QR code displays in modal
- Product ID is in format: `PROD-<timestamp>-<random>`
- Product created in database with barcode field set

---

### ✅ Test Case 2: Generate QR in Inventory

**Steps:**

1. Navigate to **Inventory** page
2. Find the product created in Test Case 1
3. Click the **QR Icon** or **Generate QR** action
4. Verify new QR code is displayed
5. Compare QR codes between Test Case 1 and Test Case 2
   - Different codes (expected - different encoding)
   - First QR: Contains product ID
   - Second QR: Contains server UUID

**Expected Result:**

- New QR code generated (should be different from Test Case 1)
- Shows UUID format
- Both QR codes should be scannable

---

### ✅ Test Case 3: Scan from AddProduct QR

**Steps:**

1. Get the QR code from Test Case 1 (AddProduct)
2. Use barcode scanner or QR scanner app
3. Scan the QR code
4. Should receive: `PROD-<timestamp>-<random>` (plain ID)
5. Open browser console and navigate to:
   ```
   GET /api/products/search/PROD-<timestamp>-<random>
   ```
6. Check server logs

**Expected Output in Server Logs:**

```
🔎 Searching for product with code: "PROD-..." (len=30)
  📦 Checking barcode field for: "PROD-..."
    ✅ Found by barcode: [uuid]
```

**Expected API Response:**

```json
{
  "id": "[uuid]",
  "barcode": "PROD-...",
  "name": "Test Rice",
  "category": "Rice & Grains",
  ...
}
```

---

### ✅ Test Case 4: Scan from Inventory QR

**Steps:**

1. Get the QR code from Test Case 2 (Inventory)
2. Use barcode scanner or QR scanner app
3. Scan the QR code
4. Should receive: `[uuid-from-server]` (UUID)
5. Open browser console and navigate to:
   ```
   GET /api/products/search/[uuid]
   ```
6. Check server logs

**Expected Output in Server Logs:**

```
🔎 Searching for product with code: "[uuid]" (len=36)
  📦 Checking barcode field for: "[uuid]"
    ✅ Found by barcode: [uuid]
```

**Expected API Response:**

```json
{
  "id": "[uuid]",
  "qr_code": "[uuid]",
  "name": "Test Rice",
  "category": "Rice & Grains",
  ...
}
```

---

### ✅ Test Case 5: Batch QR Generation

**Steps:**

1. Navigate to **Inventory** page
2. Select multiple products
3. Click **"Batch Generate QR Codes"**
4. Wait for completion
5. Verify all products have QR codes assigned
6. Scan one of the generated codes

**Expected Result:**

- All selected products get QR codes
- Each code is the product's UUID
- Scanning any code returns the correct product

---

### ✅ Test Case 6: Barcode Generation

**Steps:**

1. Navigate to **Inventory** page
2. Find a product
3. Click **Barcode Icon** or **Generate Barcode**
4. Verify barcode appears
5. Scan the barcode using barcode scanner
6. Verify product is found

**Expected Result:**

- Barcode generated and displayed
- Barcode can be scanned
- Product lookup successful
- Server logs show barcode search

---

## Server Log Format Reference

### Successful Search (Barcode)

```
🔎 Searching for product with code: "PROD-1767729616764-rs5h6lt7i" in org: org-123
  📦 Checking barcode field for: "PROD-1767729616764-rs5h6lt7i"
    ✅ Found by barcode: 30cd1ba6-f1c8-41ea-a3be-ff037a5c3619
✅ Found product 30cd1ba6-f1c8-41ea-a3be-ff037a5c3619 (Test Rice) for code: "PROD-..."
```

### Successful Search (QR Code with JSON Parsing)

```
🔎 Searching for product with code: "{"id":"PROD-..."..." in org: org-123
  🔄 Extracted ID from JSON: "PROD-..."
  📦 Checking barcode field for: "PROD-..."
    ✅ Found by barcode: 30cd1ba6-f1c8-41ea-a3be-ff037a5c3619
✅ Found product 30cd1ba6-f1c8-41ea-a3be-ff037a5c3619 (Test Rice) for code: "PROD-..."
```

### Not Found

```
🔎 Searching for product with code: "INVALID-CODE" in org: org-123
  📦 Checking barcode field for: "INVALID-CODE"
    0 rows returned
  📱 Checking qr_code field for: "INVALID-CODE"
    0 rows returned
❌ No product found for code: "INVALID-CODE"
```

---

## Debugging Commands

### Check Recent Logs

```bash
# If using docker
docker logs pantrypal-app | grep "🔎"

# If running locally
# Check your terminal where npm run dev is running
```

### Manual API Test

```bash
# Test search endpoint directly
curl "http://localhost:5173/api/products/search/PROD-1767729616764-rs5h6lt7i" \
  -H "Authorization: Bearer [your-token]" \
  -H "X-Org-Id: [your-org-id]"
```

### Database Query

```sql
-- Check if product was created with correct barcode
SELECT id, barcode, qr_code, name FROM products
WHERE org_id = 'your-org-id'
AND name = 'Test Rice';
```

---

## Troubleshooting

### Issue: "Product not found" when scanning

1. Check if product exists in database
2. Verify barcode/qr_code fields are populated
3. Check organization ID (X-Org-Id header)
4. Review server logs for exact search code being used
5. Verify URL encoding is correct

### Issue: QR code doesn't generate

1. Check product has valid ID
2. Verify product exists in database
3. Check file write permissions
4. Review browser console for errors
5. Check server logs for generation errors

### Issue: Different QR codes for same product

1. This is expected!
   - AddProduct QR: encodes ID
   - Inventory QR: encodes UUID
2. Both should scan and find the product
3. If not, check logs for parsing errors

### Issue: JSON parsing error

1. Verify barcode scanner output (check server logs)
2. If output isn't valid JSON, fallback to plain code is used
3. Check for special characters or encoding issues
4. Review error message in logs: "⚠️ Failed to parse JSON"

---

## Performance Notes

### QR Code Generation

- Client-side: Using `react-qr-code` library
- Server-side: Using `qrcode` npm package
- Typical size: 200x200px or 300x300px
- Performance: <100ms per QR generation

### Search Performance

- Database indexed on barcode and qr_code fields
- Organization scoping filters results
- Typical response: <50ms
- JSON parsing (if needed): <1ms

### Batch Operations

- Generating 100 QR codes: ~5-10 seconds
- Network latency may add additional time
- UI shows progress indicator

---

## Security Checklist

- [ ] QR codes contain only product ID (no sensitive data)
- [ ] Product lookup requires authentication token
- [ ] Organization ID required (X-Org-Id header)
- [ ] CORS headers set correctly
- [ ] No PII in QR code data
- [ ] Barcode scanner input sanitized and parsed safely

---

## Roll-Out Checklist

Before deploying to production:

1. [ ] All test cases pass
2. [ ] No console errors in browser
3. [ ] Server logs show expected output
4. [ ] Existing products with old QR codes still work
5. [ ] Performance metrics acceptable (<100ms)
6. [ ] Backup database before migration
7. [ ] Test with actual barcode scanner device
8. [ ] Remove diagnostic console.log statements
9. [ ] Update any external documentation
10. [ ] Monitor production logs for errors

---
