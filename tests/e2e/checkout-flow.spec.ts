import { test, expect, Page, BrowserContext } from "@playwright/test";

// Helper to login
async function loginAsStoreManager(page: Page) {
  await page.goto("/auth/login");
  await page.fill('input[name="email"]', "manager@pantrypal.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button:has-text("Sign In")');
  await page.waitForURL("/dashboard");
  return page;
}

// Helper to get auth token
async function getAuthToken(context: BrowserContext): Promise<string> {
  const cookies = await context.cookies();
  const sessionCookie = cookies.find((c) => c.name === "session");
  return sessionCookie?.value || "";
}

test.describe("Checkout Flow - Production Ready", () => {
  test.beforeEach(async ({ page, context }) => {
    // Setup: Login before each test
    await loginAsStoreManager(page);
  });

  test("SC01: Complete checkout flow - from barcode to confirmation", async ({
    page,
    context,
  }) => {
    // Step 1: Navigate to barcode scanner
    await page.goto("/barcode-scanner");
    await page.waitForLoadState("networkidle");

    // Step 2: Add first product via barcode
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');
    await expect(page.locator('text="✓ Added to Cart"')).toBeVisible();
    let toastText = await page.locator('[role="status"]').textContent();
    expect(toastText).toContain("1 item");

    // Step 3: Add second product
    await page.fill('input[placeholder*="Scan"]', "PROD-002");
    await page.fill('input[name="quantity"]', "2");
    await page.click('button:has-text("Confirm & Add")');
    await expect(page.locator('text="✓ Added to Cart"')).toBeVisible();
    toastText = await page.locator('[role="status"]').textContent();
    expect(toastText).toContain("3 items");

    // Step 4: Navigate to checkout via toast button
    const viewCartButton = page.locator('button:has-text("View Cart")').first();
    await viewCartButton.click();
    await page.waitForURL("/checkout");

    // Step 5: Verify cart items display
    const cartItems = page.locator('[data-testid="cart-item"]');
    await expect(cartItems).toHaveCount(2);

    // Step 6: Verify cart calculations
    const subtotal = await page
      .locator('[data-testid="subtotal"]')
      .textContent();
    expect(subtotal).toMatch(/₹[\d.]+/);

    // Step 7: Select customer
    const customerSelect = page.locator('select[name="customer_id"]');
    const options = await customerSelect.locator("option").count();
    expect(options).toBeGreaterThan(0);
    await customerSelect.selectOption({ index: 1 });

    // Step 8: Apply discount
    await page.fill('input[name="discount_percent"]', "10");
    await page.waitForTimeout(500);
    const discountAmount = await page
      .locator('[data-testid="discount-amount"]')
      .textContent();
    expect(discountAmount).toMatch(/₹[\d.]+/);

    // Step 9: Adjust tax
    await page.fill('input[name="tax_percent"]', "5");
    await page.waitForTimeout(500);
    const taxAmount = await page
      .locator('[data-testid="tax-amount"]')
      .textContent();
    expect(taxAmount).toMatch(/₹[\d.]+/);

    // Step 10: Select payment method
    await page.click('label:has-text("Cash")');
    const paymentMethod = page.locator('input[name="payment_method"][checked]');
    await expect(paymentMethod).toHaveValue("cash");

    // Step 11: Verify final total
    const total = await page
      .locator('[data-testid="total-amount"]')
      .textContent();
    expect(total).toMatch(/₹[\d.]+/);

    // Step 12: Add notes
    await page.fill('textarea[name="notes"]', "VIP Customer - Regular buyer");

    // Step 13: Complete purchase
    await page.click('button:has-text("Complete Purchase")');
    await page.waitForURL(/\/order-confirmation\/[\w-]+/);

    // Step 14: Verify order confirmation page
    await expect(page.locator('text="Order Confirmed"')).toBeVisible();
    const billNumber = await page
      .locator('[data-testid="bill-number"]')
      .textContent();
    expect(billNumber).toMatch(/BILL-\d+/);

    // Step 15: Verify receipt details
    const receiptItems = page.locator('[data-testid="receipt-item"]');
    await expect(receiptItems).toHaveCount(2);

    // Step 16: Verify PDF download button exists
    const downloadButton = page.locator('button:has-text("Download PDF")');
    await expect(downloadButton).toBeVisible();

    // Step 17: Verify print button exists
    const printButton = page.locator('button:has-text("Print Receipt")');
    await expect(printButton).toBeVisible();

    // Step 18: Navigate to new sale
    await page.click('button:has-text("New Sale")');
    await page.waitForURL("/barcode-scanner");

    // Step 19: Verify cart is cleared
    const cartBadge = page.locator('[data-testid="cart-count"]');
    const cartCount = await cartBadge.textContent();
    expect(cartCount).toBe("0");

    console.log("✅ SC01: Complete checkout flow passed");
  });

  test("SC02: Checkout with multiple items and quantity adjustments", async ({
    page,
  }) => {
    await page.goto("/barcode-scanner");

    // Add 3 products
    for (let i = 1; i <= 3; i++) {
      await page.fill('input[placeholder*="Scan"]', `PROD-00${i}`);
      await page.click('button:has-text("Confirm & Add")');
      await page.waitForTimeout(300);
    }

    // Navigate to checkout
    await page.goto("/checkout");

    // Verify all items added
    const items = page.locator('[data-testid="cart-item"]');
    await expect(items).toHaveCount(3);

    // Adjust quantity for first item (increase)
    const firstItemQtyButton = items.first().locator('button:has-text("+")');
    await firstItemQtyButton.click();
    let qtyValue = await items
      .first()
      .locator('input[name="quantity"]')
      .inputValue();
    expect(parseInt(qtyValue)).toBe(2);

    // Adjust quantity for second item (decrease)
    const secondItemDecButton = items.nth(1).locator('button:has-text("-")');
    await secondItemDecButton.click();

    // Remove third item
    const removeButtons = items.locator('button[aria-label="Remove item"]');
    await removeButtons.last().click();
    await expect(items).toHaveCount(2);

    // Complete checkout
    await page.locator('select[name="customer_id"]').selectOption({ index: 1 });
    await page.click('label:has-text("Card")');
    await page.click('button:has-text("Complete Purchase")');

    // Verify success
    await expect(page.locator('text="Order Confirmed"')).toBeVisible();
  });

  test("SC03: Checkout with discount and tax calculations", async ({
    page,
  }) => {
    await page.goto("/barcode-scanner");
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');

    await page.goto("/checkout");

    // Get initial values
    const initialSubtotal = await page
      .locator('[data-testid="subtotal"]')
      .textContent();
    const subtotalValue = parseFloat(initialSubtotal?.replace(/₹/, "") || "0");

    // Apply 20% discount
    await page.fill('input[name="discount_percent"]', "20");
    await page.waitForTimeout(500);

    // Verify discount calculation
    const discountAmount = await page
      .locator('[data-testid="discount-amount"]')
      .textContent();
    const discountValue = parseFloat(discountAmount?.replace(/₹/, "") || "0");
    expect(discountValue).toBeCloseTo(subtotalValue * 0.2, 1);

    // Apply 18% tax (IGST)
    await page.fill('input[name="tax_percent"]', "18");
    await page.waitForTimeout(500);

    // Verify tax calculation on discounted amount
    const taxAmount = await page
      .locator('[data-testid="tax-amount"]')
      .textContent();
    const taxValue = parseFloat(taxAmount?.replace(/₹/, "") || "0");
    const discountedSubtotal = subtotalValue - discountValue;
    expect(taxValue).toBeCloseTo(discountedSubtotal * 0.18, 1);

    // Verify final total
    const totalAmount = await page
      .locator('[data-testid="total-amount"]')
      .textContent();
    const totalValue = parseFloat(totalAmount?.replace(/₹/, "") || "0");
    const expectedTotal = discountedSubtotal + taxValue;
    expect(totalValue).toBeCloseTo(expectedTotal, 1);

    console.log("✅ SC03: Tax and discount calculations correct");
  });

  test("SC04: Payment method selection and processing", async ({ page }) => {
    await page.goto("/barcode-scanner");
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');
    await page.goto("/checkout");
    await page.locator('select[name="customer_id"]').selectOption({ index: 1 });

    const paymentMethods = ["cash", "card", "upi", "razorpay"];

    for (const method of paymentMethods) {
      // Select payment method
      await page.click(`label:has-text("${method}")`);
      const selected = page.locator(
        `input[name="payment_method"][value="${method}"][checked]`
      );
      await expect(selected).toBeVisible();
    }

    // Complete with cash
    await page.click('label:has-text("Cash")');
    await page.click('button:has-text("Complete Purchase")');
    await expect(page.locator('text="Order Confirmed"')).toBeVisible();
  });

  test("SC05: Cart persistence across page refresh", async ({ page }) => {
    await page.goto("/barcode-scanner");

    // Add items
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');
    await page.fill('input[placeholder*="Scan"]', "PROD-002");
    await page.click('button:has-text("Confirm & Add")');

    // Get cart count
    const cartCountBefore = await page
      .locator('[data-testid="cart-count"]')
      .textContent();

    // Refresh page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify cart persisted
    const cartCountAfter = await page
      .locator('[data-testid="cart-count"]')
      .textContent();
    expect(cartCountAfter).toBe(cartCountBefore);

    // Go to checkout
    await page.goto("/checkout");
    const items = page.locator('[data-testid="cart-item"]');
    await expect(items).toHaveCount(2);
  });

  test("SC06: Empty cart validation", async ({ page }) => {
    await page.goto("/checkout");

    // Should show empty state
    const emptyMessage = page.locator('text="Your cart is empty"');
    await expect(emptyMessage).toBeVisible();

    // Complete Purchase button should be disabled or hidden
    const completeButton = page.locator('button:has-text("Complete Purchase")');
    const isDisabled = await completeButton.isDisabled();
    expect(isDisabled || !(await completeButton.isVisible())).toBeTruthy();
  });

  test("SC07: Order confirmation receipt details", async ({ page }) => {
    await page.goto("/barcode-scanner");
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');
    await page.goto("/checkout");

    // Save values before completing
    const subtotalBefore = await page
      .locator('[data-testid="subtotal"]')
      .textContent();
    const taxBefore = await page
      .locator('[data-testid="tax-amount"]')
      .textContent();
    const totalBefore = await page
      .locator('[data-testid="total-amount"]')
      .textContent();

    await page.locator('select[name="customer_id"]').selectOption({ index: 1 });
    await page.click('label:has-text("Cash")');
    await page.click('button:has-text("Complete Purchase")');

    // Verify values match on confirmation page
    const receiptSubtotal = await page
      .locator('[data-testid="receipt-subtotal"]')
      .textContent();
    const receiptTax = await page
      .locator('[data-testid="receipt-tax"]')
      .textContent();
    const receiptTotal = await page
      .locator('[data-testid="receipt-total"]')
      .textContent();

    expect(receiptSubtotal).toBe(subtotalBefore);
    expect(receiptTax).toBe(taxBefore);
    expect(receiptTotal).toBe(totalBefore);
  });

  test("SC08: PDF download functionality", async ({ page, context }) => {
    await page.goto("/barcode-scanner");
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');
    await page.goto("/checkout");
    await page.locator('select[name="customer_id"]').selectOption({ index: 1 });
    await page.click('label:has-text("Cash")');
    await page.click('button:has-text("Complete Purchase")');

    // Wait for confirmation page
    await expect(page.locator('text="Order Confirmed"')).toBeVisible();

    // Listen for download
    const downloadPromise = context.waitForEvent("download");
    await page.click('button:has-text("Download PDF")');
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/receipt.*\.pdf/i);
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test("SC09: Customer selection - existing and new", async ({ page }) => {
    await page.goto("/barcode-scanner");
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');
    await page.goto("/checkout");

    // Test existing customer
    const customerSelect = page.locator('select[name="customer_id"]');
    await customerSelect.selectOption({ index: 1 });
    const selectedValue = await customerSelect.inputValue();
    expect(selectedValue).toBeTruthy();

    // Test new customer creation
    const newCustomerTab = page.locator('button:has-text("New Customer")');
    if (await newCustomerTab.isVisible()) {
      await newCustomerTab.click();
      await page.fill('input[name="customer_name"]', "Test Customer");
      await page.fill('input[name="customer_phone"]', "9876543210");
      const saveButton = page.locator('button:has-text("Add Customer")');
      await expect(saveButton).toBeVisible();
    }
  });

  test("SC10: Responsive design on mobile checkout", async ({
    page,
    context,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/barcode-scanner");
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');
    await page.goto("/checkout");

    // Verify layout is stacked (not side-by-side)
    const cartSection = page.locator('[data-testid="cart-section"]');
    const summarySection = page.locator('[data-testid="summary-section"]');

    const cartBox = await cartSection.boundingBox();
    const summaryBox = await summarySection.boundingBox();

    // On mobile, summary should be below cart (y-coordinate should be larger)
    if (summaryBox && cartBox) {
      expect(summaryBox.y).toBeGreaterThan(cartBox.y);
    }

    // Verify buttons are full width on mobile
    const completeButton = page.locator('button:has-text("Complete Purchase")');
    const buttonBox = await completeButton.boundingBox();
    if (buttonBox) {
      expect(buttonBox.width).toBeGreaterThan(300);
    }
  });
});

test.describe("Checkout Error Handling", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStoreManager(page);
  });

  test("ERR01: Invalid discount percentage", async ({ page }) => {
    await page.goto("/barcode-scanner");
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');
    await page.goto("/checkout");

    // Try to set discount > 100%
    await page.fill('input[name="discount_percent"]', "150");
    await page.click('button:has-text("Complete Purchase")');

    // Should show error
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toBeVisible();
  });

  test("ERR02: Invalid tax percentage", async ({ page }) => {
    await page.goto("/barcode-scanner");
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');
    await page.goto("/checkout");

    // Try to set negative tax
    await page.fill('input[name="tax_percent"]', "-5");
    await page.click('button:has-text("Complete Purchase")');

    // Should show error
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toBeVisible();
  });

  test("ERR03: Missing customer selection", async ({ page }) => {
    await page.goto("/barcode-scanner");
    await page.fill('input[placeholder*="Scan"]', "PROD-001");
    await page.click('button:has-text("Confirm & Add")');
    await page.goto("/checkout");

    // Don't select customer
    await page.click('button:has-text("Complete Purchase")');

    // Should show validation error
    const errorMessage = page.locator('text="Please select a customer"');
    await expect(errorMessage).toBeVisible();
  });
});
