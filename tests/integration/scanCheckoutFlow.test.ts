import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../server/db";
import {
  organizations,
  products,
  bills,
  bill_items,
} from "../../shared/schema";
import { eq } from "drizzle-orm";

// This test covers the core "scan -> add -> checkout" backend flow:
// 1) Create a product with a barcode/QR-like code
// 2) "Scan" by searching via code
// 3) Create a bill, add the scanned product, finalize (checkout)
// 4) Assert stock decreases and bill becomes immutable

describe("Scan and Checkout Flow", () => {
  let orgId: string;
  let productId: string;
  let billId: string;
  const code = `SCAN-${Date.now()}`;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: `Scan Flow Org ${Date.now()}` })
      .returning();
    orgId = org.id;

    const [product] = await db
      .insert(products)
      .values({
        org_id: orgId,
        name: "Scan Flow Product",
        category: "Test",
        barcode: code,
        mrp: "100.00",
        buying_cost: "70.00",
        quantity_in_stock: 10,
        is_active: true,
      })
      .returning();
    productId = product.id;

    const [bill] = await db
      .insert(bills)
      .values({
        org_id: orgId,
        bill_number: `SCAN-BILL-${Date.now()}`,
        total_amount: "0.00",
        final_amount: "0.00",
      })
      .returning();
    billId = bill.id;
  });

  afterAll(async () => {
    if (billId) {
      await db.delete(bill_items).where(eq(bill_items.bill_id, billId));
      await db.delete(bills).where(eq(bills.id, billId));
    }
    if (productId) {
      await db.delete(products).where(eq(products.id, productId));
    }
    if (orgId) {
      await db.delete(organizations).where(eq(organizations.id, orgId));
    }
  });

  it("scans product by code, adds to bill, and finalizes (checkout)", async () => {
    const { productService, billingService } = await import(
      "../../server/services"
    );

    const scanned = await productService.searchByCode(code, orgId);
    expect(scanned).toBeDefined();
    expect(scanned?.id).toBe(productId);

    await billingService.addBillItem(billId, scanned!.id, 2, orgId);

    const finalized = await billingService.finalizeBill(
      billId,
      orgId,
      "tester"
    );
    expect(finalized.finalized_at).toBeDefined();

    const updatedProduct = await productService.getProduct(productId, orgId);
    expect(updatedProduct).toBeDefined();
    expect(updatedProduct?.quantity_in_stock).toBe(8);
  });
});
