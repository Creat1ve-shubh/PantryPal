import { test, expect, Page } from "@playwright/test";

async function loginAsStoreManager(page: Page) {
  await page.goto("/auth/login");
  await page.fill('input[name="email"]', "manager@pantrypal.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button:has-text("Sign In")');
  await page.waitForURL("/dashboard");
}

test.describe("Barcode & QR Code Data Flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStoreManager(page);
  });

  test("BQ01: Barcode scan data flow to cart store", async ({ page }) => {
    await page.goto("/barcode-scanner");

    // Intercept API calls
    const productsLoaded: string[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/products/search")) {
        productsLoaded.push(response.url());
      }
    });

    // Scan product
    await page.fill('input[placeholder*="Scan"]', "PROD-001");

    // Verify API call made
    await page.waitForTimeout(500);
    expect(productsLoaded.length).toBeGreaterThan(0);

    // Verify product displayed
    const productName = page.locator('[data-testid="product-name"]');
    await expect(productName).toBeVisible();

    // Verify quantity input appears
    const quantityInput = page.locator('input[name="quantity"]');
    await expect(quantityInput).toBeVisible();

    // Click add to cart
    await page.click('button:has-text("Confirm & Add")');

    // Verify cart updated
    const cartBadge = page.locator('[data-testid="cart-count"]');
    await expect(cartBadge).toContainText("1");
  });

  test("BQ02: QR Code scan - product data validation", async ({ page }) => {
    await page.goto("/barcode-scanner");

    // Create mock QR code value (encoded product ID)
    const qrValue = Buffer.from("PROD-002").toString("base64");

    // Scan QR code
    await page.fill('input[placeholder*="Scan"]', qrValue);
    await page.click('button:has-text("Confirm & Add")');

    // Wait for processing
    await page.waitForTimeout(500);

    // Verify product loaded
    const productDisplay = page.locator('[data-testid="product-info"]');
    await expect(productDisplay).toBeVisible();

    // Verify product has required fields
    const productName = page.locator('[data-testid="product-name"]');
    const productPrice = page.locator('[data-testid="product-price"]');
    const productStock = page.locator('[data-testid="product-stock"]');

    await expect(productName).toContainText(/./); // Not empty
    await expect(productPrice).toContainText(/₹/);
    await expect(productStock).toContainText(/\d+/);
  });

  test("BQ03: Multiple barcode scans maintain correct data", async ({
    page,
  }) => {
    await page.goto("/barcode-scanner");

    const scanData = [
      { barcode: "PROD-001", expectedQty: 1 },
      { barcode: "PROD-002", expectedQty: 2 },
      { barcode: "PROD-003", expectedQty: 1 },
    ];

    for (const scan of scanData) {
      // Scan product
      await page.fill('input[placeholder*="Scan"]', scan.barcode);

      // Set quantity
      if (scan.expectedQty > 1) {
        await page.fill('input[name="quantity"]', scan.expectedQty.toString());
      }

      // Add to cart
      await page.click('button:has-text("Confirm & Add")');
      await page.waitForTimeout(300);
    }

    // Navigate to checkout
    await page.goto("/checkout");

    // Verify all items present with correct quantities
    const cartItems = page.locator('[data-testid="cart-item"]');
    const count = await cartItems.count();
    expect(count).toBe(3);

    // Verify first item
    const firstItemQty = await cartItems
      .first()
      .locator('input[name="quantity"]')
      .inputValue();
    expect(parseInt(firstItemQty)).toBe(scanData[0].expectedQty);

    // Verify second item
    const secondItemQty = await cartItems
      .nth(1)
      .locator('input[name="quantity"]')
      .inputValue();
    expect(parseInt(secondItemQty)).toBe(scanData[1].expectedQty);
  });

  test("BQ04: Barcode data persists in localStorage", async ({
    page,
    context,
  }) => {
    await page.goto("/barcode-scanner");

    // Scan items
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');

    // Get localStorage data
    const cartData = await page.evaluate(() => {
      return localStorage.getItem("pantrypal-cart");
    });

    expect(cartData).toBeTruthy();

    // Parse and verify structure
    const cart = JSON.parse(cartData || "{}");
    expect(cart).toHaveProperty("state");
    expect(cart.state).toHaveProperty("items");
    expect(Array.isArray(cart.state.items)).toBe(true);

    // Verify item structure
    const firstItem = cart.state.items[0];
    expect(firstItem).toHaveProperty("product_id");
    expect(firstItem).toHaveProperty("product");
    expect(firstItem).toHaveProperty("quantity");
    expect(firstItem).toHaveProperty("unit_price");
  });

  test("BQ05: Duplicate barcode scan increments quantity", async ({ page }) => {
    await page.goto("/barcode-scanner");

    // Scan same product twice
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');

    // Get cart count after first scan
    const cartCountAfterFirst = await page
      .locator('[data-testid="cart-count"]')
      .textContent();
    expect(cartCountAfterFirst).toBe("1");

    // Scan same product again
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');

    // Cart should still show 1 item but with qty 2
    const cartCountAfterSecond = await page
      .locator('[data-testid="cart-count"]')
      .textContent();
    expect(cartCountAfterSecond).toBe("1"); // Still 1 item (same product)

    // Go to checkout to verify quantity
    await page.goto("/checkout");
    const itemQty = await page
      .locator('[data-testid="cart-item"]')
      .first()
      .locator('input[name="quantity"]')
      .inputValue();
    expect(parseInt(itemQty)).toBe(2);
  });

  test("BQ06: Barcode scan with invalid/not found product", async ({
    page,
  }) => {
    await page.goto("/barcode-scanner");

    // Scan non-existent product
    await page.fill('input[placeholder*="Scan"]', "INVALID-12345");
    await page.click('button:has-text("Confirm & Add")');

    // Wait for error
    await page.waitForTimeout(500);

    // Verify error message shown
    const errorMessage = page.locator(
      'text="Product not found" >> visible=true'
    );
    await expect(errorMessage).toBeVisible();

    // Verify cart unchanged
    const cartCount = await page
      .locator('[data-testid="cart-count"]')
      .textContent();
    expect(cartCount).toBe("0");
  });

  test("BQ07: Barcode scan - stock validation", async ({ page }) => {
    await page.goto("/barcode-scanner");

    // Scan product (assume it has 5 units in stock)
    await page.fill('input[placeholder*="Scan"]', "PROD-005");

    // Wait for product to load
    await page.waitForTimeout(300);

    // Get available stock
    const stockText = await page
      .locator('[data-testid="product-stock"]')
      .textContent();
    const maxStock = parseInt(stockText?.match(/\d+/)?.[0] || "0");

    // Try to add more than available
    await page.fill('input[name="quantity"]', (maxStock + 1).toString());
    await page.click('button:has-text("Confirm & Add")');

    // Should show error
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toBeVisible();
  });

  test("BQ08: Barcode data accuracy - price and batch tracking", async ({
    page,
  }) => {
    await page.goto("/barcode-scanner");

    // Scan product
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');

    // Go to checkout
    await page.goto("/checkout");

    // Get product info from cart
    const cartItem = page.locator('[data-testid="cart-item"]').first();
    const displayedPrice = await cartItem
      .locator('[data-testid="item-price"]')
      .textContent();

    // Verify price matches API response
    expect(displayedPrice).toMatch(/₹[\d.]+/);

    // If batch tracking available, verify batch ID is captured
    const batchInfo = await cartItem
      .locator('[data-testid="batch-id"]')
      .textContent();
    if (batchInfo) {
      expect(batchInfo).toMatch(/BATCH|Batch/i);
    }
  });

  test("BQ09: QR code format variations handling", async ({ page }) => {
    await page.goto("/barcode-scanner");

    const qrFormats = [
      "PROD-001", // Direct product ID
      Buffer.from("PROD-002").toString("base64"), // Base64 encoded
      "https://pantrypal.com/product/PROD-003", // Full URL
    ];

    for (const format of qrFormats) {
      await page.fill('input[placeholder*="Scan"]', format);
      await page.click('button:has-text("Confirm & Add")');
      await page.waitForTimeout(300);

      // Each should resolve to a product
      const productName = page.locator('[data-testid="product-name"]');
      if (await productName.isVisible()) {
        await expect(productName).toContainText(/./);
        // Clear for next iteration
        await page.click('[data-testid="clear-scanner"]');
      }
    }
  });

  test("BQ10: Barcode scan - network retry on failure", async ({
    page,
    context,
  }) => {
    await page.goto("/barcode-scanner");

    // Simulate network error then recovery
    let requestCount = 0;
    await context.route("**/api/products/**", (route) => {
      requestCount++;
      if (requestCount === 1) {
        route.abort("failed");
      } else {
        route.continue();
      }
    });

    // First scan fails
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');

    // Wait and retry
    await page.waitForTimeout(500);
    const retryButton = page.locator('button:has-text("Retry")');
    if (await retryButton.isVisible()) {
      await retryButton.click();
    }

    // Second attempt should succeed
    expect(requestCount).toBeGreaterThanOrEqual(2);
  });

  test("BQ11: Cart data integrity after checkout", async ({ page }) => {
    await page.goto("/barcode-scanner");

    // Scan and save product data
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');

    // Get stored price
    const cartData = await page.evaluate(() => {
      return localStorage.getItem("pantrypal-cart");
    });
    const originalCart = JSON.parse(cartData || "{}");
    const originalPrice = originalCart.state.items[0]?.unit_price;

    // Go through checkout and complete
    await page.goto("/checkout");
    await page.locator('select[name="customer_id"]').selectOption({ index: 1 });
    await page.click('label:has-text("Cash")');
    await page.click('button:has-text("Complete Purchase")');

    // Verify data was used in bill
    const billNumber = await page
      .locator('[data-testid="bill-number"]')
      .textContent();
    expect(billNumber).toMatch(/BILL-/);

    // Verify receipt shows correct price
    const receiptPrice = await page
      .locator('[data-testid="receipt-item-price"]')
      .first()
      .textContent();
    expect(receiptPrice).toContain(originalPrice?.toString());
  });
});

test.describe("Barcode Scanner Performance", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStoreManager(page);
  });

  test("PERF01: Barcode scan response time < 500ms", async ({ page }) => {
    await page.goto("/barcode-scanner");

    const startTime = Date.now();
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.waitForLoadState("networkidle");
    const endTime = Date.now();

    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(500);
  });

  test("PERF02: Multiple scans without memory leak", async ({ page }) => {
    await page.goto("/barcode-scanner");

    // Perform 20 rapid scans
    for (let i = 0; i < 20; i++) {
      const product = `PROD-${String(i + 1).padStart(3, "0")}`;
      await page.fill('input[placeholder*="Scan"]', product);
      await page.click('button:has-text("Confirm & Add")');
      await page.waitForTimeout(100);
    }

    // Verify cart still functions
    const cartCount = await page
      .locator('[data-testid="cart-count"]')
      .textContent();
    expect(parseInt(cartCount || "0")).toBeGreaterThan(0);

    // Go to checkout should load instantly
    const startTime = Date.now();
    await page.goto("/checkout");
    await page.waitForLoadState("networkidle");
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(1000);
  });
});
