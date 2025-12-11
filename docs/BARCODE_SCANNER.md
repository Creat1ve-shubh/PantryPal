# Barcode & QR Scanner Feature

## Overview

Enhanced scanner supporting both 1D barcodes (retail products) and QR codes with quick action capabilities for efficient inventory management.

## Features

### 1. **Dual Scanner Support**

- **Barcode Scanner**: Reads 1D barcodes (EAN-13, UPC-A, Code-128, Code-39, etc.) using @zxing/library
- **QR Scanner**: Reads QR codes using qr-scanner library
- **Manual Entry**: Direct input for codes without camera

### 2. **Fast Product Lookup**

- Backend search API: `GET /api/products/search/:code`
- Searches across multiple fields:
  - Product ID (exact match)
  - Barcode field (exact match)
  - QR code field (exact match)
- Returns product instantly with all details
- Tenant-aware (filters by organization/store)

### 3. **Quick Stock Actions**

- **Add Stock**: Increment quantity by specified amount
- **Remove Stock**: Decrement quantity by specified amount
- **Set Stock**: Set exact quantity
- API endpoint: `PATCH /api/products/:id/stock`
- Operations: `add`, `subtract`, `set`
- Automatic inventory transaction logging
- Real-time stock updates with validation

### 4. **Product Information Display**

- Product name, brand, category
- Current stock level with visual indicators
- Stock status badges: Out of Stock, Low Stock, In Stock
- Expiry date with countdown
- MRP and pricing information
- Product IDs and codes

## Technical Implementation

### Backend APIs

#### Search Endpoint

```typescript
GET /api/products/search/:code

// Example: GET /api/products/search/8901234567890
// Returns: Product object or 404 error
```

**Features:**

- OR query across id, barcode, qr_code fields
- Automatic tenant context filtering
- Fast indexed lookups

#### Stock Update Endpoint

```typescript
PATCH /api/products/:id/stock
Body: { quantity: number, operation: 'add' | 'subtract' | 'set' }

// Example: PATCH /api/products/123/stock
// Body: { quantity: 10, operation: 'add' }
// Returns: Updated product object
```

**Features:**

- Three operation types for flexibility
- Validation prevents negative stock
- Creates inventory transaction records
- Returns updated product data

### Frontend Components

#### Scanner Component

**Location**: `client/src/pages/QRScanner.tsx`

**Key Functions:**

- `startBarcodeScanning()`: Initializes BrowserMultiFormatReader for 1D barcodes
- `startQRScanning()`: Initializes QrScanner for QR codes
- `processCode()`: Handles both JSON and plain text codes
- `findProductByCode()`: Calls backend search API
- `handleStockUpdate()`: Performs quick stock operations

**Libraries Used:**

- `@zxing/library`: 1D barcode decoding (BrowserMultiFormatReader)
- `qr-scanner`: QR code scanning with highlight support
- `lucide-react`: Icons for UI

#### API Client

**Location**: `client/src/lib/api.ts`

**New Method:**

```typescript
async searchProductByCode(code: string): Promise<Product>
```

## Usage Flow

### 1. Scanning a Barcode

1. User clicks "Scan Barcode" button
2. Camera activates with BrowserMultiFormatReader
3. Scanner continuously looks for barcodes
4. On detection:
   - Toast notification appears
   - Calls backend search API
   - Displays product information
   - Scanner stops automatically

### 2. Scanning a QR Code

1. User clicks "Scan QR" button
2. Camera activates with QrScanner
3. Scanner highlights detected QR codes
4. On successful scan:
   - Parses JSON data if applicable
   - Searches for product by ID/code
   - Shows product details
   - Scanner stops automatically

### 3. Manual Entry

1. User types barcode/ID in input field
2. Presses Enter or clicks search button
3. Backend API performs lookup
4. Product details displayed if found

### 4. Quick Stock Update

1. After product is found
2. Enter quantity in input field
3. Click Add/Remove button
4. Stock updates instantly
5. Inventory transaction logged
6. Toast confirmation shows success

## Database Schema

### Products Table

```sql
products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT,  -- For 1D barcodes
  qr_code TEXT,  -- For QR codes
  quantity_in_stock INTEGER,
  -- ... other fields
)

-- Indexes for fast lookup
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_qr_code ON products(qr_code);
```

### Inventory Transactions

Stock updates automatically create records in inventory_transactions table with:

- Product ID
- Quantity change
- Transaction type
- Timestamp
- User context

## Error Handling

### Camera Permissions

- Catches camera access errors
- Shows user-friendly error message
- Provides permission instructions

### Product Not Found

- 404 response from backend
- Displays "Product Not Found" toast
- Shows code that was scanned
- Allows retry with different code

### Stock Validation

- Backend validates non-negative stock
- Returns error if operation would result in negative quantity
- Frontend shows error toast with details

## UI Components

### Scanner View

- Video preview area (640x480)
- Scanner type badge (Barcode/QR)
- Stop button overlay
- Manual input field
- Scanner selection buttons

### Product Display

- Product name and brand
- Stock level with color-coded badges
- Expiry status badges
- Quick action buttons
- Stock quantity input
- Product metadata grid

### Status Indicators

- **Out of Stock**: Red badge, quantity = 0
- **Low Stock**: Yellow badge, quantity ≤ min_stock_level
- **In Stock**: Green badge, quantity > min_stock_level
- **Expired**: Red badge, expiry date passed
- **Expiring Soon**: Yellow badge, < 30 days

## Supported Barcode Formats

Via @zxing/library BrowserMultiFormatReader:

- EAN-13 (retail products)
- EAN-8
- UPC-A
- UPC-E
- Code-39
- Code-93
- Code-128
- ITF (Interleaved 2 of 5)
- RSS-14
- RSS-Expanded
- QR Code (via qr-scanner)
- Data Matrix
- Aztec
- PDF417

## Future Enhancements

### Potential Additions

1. **Bulk Scanning**: Scan multiple items in sequence
2. **Purchase Orders**: Create PO directly from scanned products
3. **Bill Creation**: Add scanned items to new bill
4. **Barcode Generation**: Create barcodes for products without them
5. **Multi-item Actions**: Scan multiple products for batch operations
6. **Sound Feedback**: Audio confirmation on successful scan
7. **Scan History**: List of recently scanned items
8. **Offline Mode**: Cache products for offline scanning

### Configuration Options

- Scanner timeout duration
- Auto-stop after successful scan
- Continuous scanning mode
- Default quantity for quick actions
- Scanner resolution settings

## Testing Checklist

- [ ] Test EAN-13 barcode scanning
- [ ] Test UPC-A barcode scanning
- [ ] Test QR code scanning
- [ ] Test manual code entry
- [ ] Test product not found scenario
- [ ] Test add stock operation
- [ ] Test remove stock operation
- [ ] Test set stock operation
- [ ] Test camera permission denial
- [ ] Test scanner stop functionality
- [ ] Verify inventory transactions created
- [ ] Check stock level updates in database
- [ ] Test with products having no barcode
- [ ] Test with products having no QR code
- [ ] Verify tenant context filtering

## Dependencies

```json
{
  "@zxing/library": "^0.21.3", // 1D barcode scanning
  "qr-scanner": "^1.4.2", // QR code scanning
  "lucide-react": "latest" // UI icons
}
```

## Performance Considerations

- Camera stream optimized for mobile devices
- Scanner stops immediately after detection to save resources
- Backend search uses indexed queries for fast lookups
- Single API call per scan (no N+1 queries)
- Video element hidden when not scanning
- Scanner cleanup on component unmount

## Security

- All APIs require authentication (credentials: 'include')
- Tenant context automatically applied to all queries
- Users can only access products in their organization/store
- Stock updates logged with user context
- XSS protection on code input sanitization
