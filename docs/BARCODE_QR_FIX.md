# QR Code / Barcode Scanner Fix

## Problem

When scanning a QR code with a barcode scanner, the system wasn't recognizing the product from inventory. This was due to code mismatch issues.

## Root Causes

### 1. **QR Code Not Stored for Scanning**

- When generating a QR code via `/api/products/:id/generate-qr`, the system only stored the **image** (`qr_code_image`) but not the **scannable code value** (`qr_code` field)
- When the scanner tried to match the scanned QR code against products, it searched the `qr_code` field which was empty
- Result: 404 "Product not found"

### 2. **Barcode Generation Endpoint Missing**

- The Inventory page called `/api/products/:id/generate-barcode` but this endpoint didn't exist on the backend
- There was no way to actually generate and store barcode values
- The search endpoint checks barcode first, then QR code, but barcodes were never being created

### 3. **Search Logic Gap**

- The `/api/products/search/:code` endpoint tries:
  1. Search by `barcode` field
  2. Search by `qr_code` field
- But neither field was being populated when codes were generated

## Solution

### Fixed QR Code Generation

**File**: [server/routes/qrRoutes.ts](server/routes/qrRoutes.ts#L39-L48)

Changed from:

```typescript
const updatedProduct = await productService.updateProduct(
  id,
  { qr_code_image: qrCodeImage }, // Only storing image
  orgId
);
```

To:

```typescript
const updatedProduct = await productService.updateProduct(
  id,
  {
    qr_code: qrData, // Now also store the scannable code
    qr_code_image: qrCodeImage, // And keep the image
  },
  orgId
);
```

### Added Barcode Generation Endpoint

**File**: [server/routes/qrRoutes.ts](server/routes/qrRoutes.ts#L55-L96)

New endpoint `POST /api/products/:id/generate-barcode`:

```typescript
router.post(
  "/api/products/:id/generate-barcode",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const orgId = requireOrgId(req);

    const product = await productService.getProduct(id, orgId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Use existing barcode or fall back to product ID
    const barcodeData = product.barcode || product.id;

    // Update product with barcode value
    const updatedProduct = await productService.updateProduct(
      id,
      { barcode: barcodeData },
      orgId
    );

    res.json({
      success: true,
      barcode: barcodeData,
      product: updatedProduct,
    });
  })
);
```

## How It Works Now

1. **When generating QR code**:

   - Endpoint generates QR code image from product ID (or existing `qr_code` field)
   - Stores **both** the code value (`qr_code`) and image (`qr_code_image`)
   - Scanner can now match the scanned value against the `qr_code` field

2. **When generating barcode**:

   - Endpoint stores the barcode value in the `barcode` field
   - Scanner will find it via the search endpoint which checks barcode first

3. **When scanning**:
   - `/api/products/search/:code` is called with the scanned code
   - It searches: `barcode` field first, then `qr_code` field
   - Returns the matching product or 404 if not found

## Testing

1. Go to Inventory page
2. Click QR icon on any product → "Generate QR Code"
3. Scan the generated QR code with barcode scanner
4. Product should now be recognized ✓

Or:

1. Click "Batch Generate QR Codes" to generate for multiple products
2. Try scanning any of them

## Files Changed

- [server/routes/qrRoutes.ts](server/routes/qrRoutes.ts) - Fixed QR storage + added barcode endpoint
