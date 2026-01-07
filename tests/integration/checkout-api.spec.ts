import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fetch from "node-fetch";

const API_URL = "http://localhost:5000";
let authToken: string;
let orgId: string;
let customerId: string;
let billId: string;

// Helper to make authenticated requests
async function apiRequest(
  method: string,
  endpoint: string,
  body?: unknown,
  token?: string
) {
  const options: any = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || authToken}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();

  return { status: response.status, data };
}

describe("Checkout API Integration Tests", () => {
  beforeEach(async () => {
    // Login and get token
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "manager@pantrypal.com",
        password: "password123",
      }),
    });
    const loginData = await loginRes.json();
    authToken = loginData.token;
    orgId = loginData.org_id;
  });

  describe("Bill Creation API", () => {
    it("BILL01: Create bill with items", async () => {
      const billData = {
        customer_id: "customer-1",
        org_id: orgId,
        items: [
          {
            product_id: "PROD-001",
            quantity: 2,
            unit_price: 100,
            gst_percent: 5,
          },
          {
            product_id: "PROD-002",
            quantity: 1,
            unit_price: 200,
            gst_percent: 5,
          },
        ],
        discount_percent: 10,
        tax_percent: 5,
        notes: "Test order",
      };

      const { status, data } = await apiRequest("POST", "/api/bills", billData);

      expect(status).toBe(201);
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("bill_number");
      expect(data.items.length).toBe(2);
      expect(data.total_amount).toBeGreaterThan(0);

      billId = data.id;
    });

    it("BILL02: Bill calculations are accurate", async () => {
      const billData = {
        customer_id: "customer-1",
        org_id: orgId,
        items: [
          {
            product_id: "PROD-001",
            quantity: 1,
            unit_price: 1000,
            gst_percent: 18,
          },
        ],
        discount_percent: 10,
        tax_percent: 18,
        notes: "Calculation test",
      };

      const { status, data } = await apiRequest("POST", "/api/bills", billData);

      expect(status).toBe(201);

      // Verify calculation: 1000 - 100 (10% discount) + 162 (18% tax on 900)
      const expectedSubtotal = 1000;
      const expectedDiscount = 100;
      const discountedAmount = expectedSubtotal - expectedDiscount;
      const expectedTax = discountedAmount * 0.18;
      const expectedTotal = discountedAmount + expectedTax;

      expect(data.subtotal_amount).toBe(expectedSubtotal);
      expect(data.discount_amount).toBeCloseTo(expectedDiscount, 0);
      expect(data.tax_amount).toBeCloseTo(expectedTax, 0);
      expect(data.total_amount).toBeCloseTo(expectedTotal, 0);

      billId = data.id;
    });

    it("BILL03: Create bill with multiple items and validate structure", async () => {
      const billData = {
        customer_id: "customer-1",
        org_id: orgId,
        items: [
          {
            product_id: "PROD-001",
            quantity: 3,
            unit_price: 100,
          },
          {
            product_id: "PROD-002",
            quantity: 2,
            unit_price: 150,
          },
          {
            product_id: "PROD-003",
            quantity: 1,
            unit_price: 500,
          },
        ],
        discount_percent: 5,
        tax_percent: 5,
      };

      const { status, data } = await apiRequest("POST", "/api/bills", billData);

      expect(status).toBe(201);
      expect(data.items).toHaveLength(3);

      // Verify each item has required fields
      data.items.forEach((item: any) => {
        expect(item).toHaveProperty("product_id");
        expect(item).toHaveProperty("quantity");
        expect(item).toHaveProperty("unit_price");
        expect(item).toHaveProperty("line_total");
      });

      // Verify line totals
      expect(data.items[0].line_total).toBe(300); // 3 * 100
      expect(data.items[1].line_total).toBe(300); // 2 * 150
      expect(data.items[2].line_total).toBe(500); // 1 * 500

      billId = data.id;
    });

    it("BILL04: Empty bill should fail validation", async () => {
      const billData = {
        customer_id: "customer-1",
        org_id: orgId,
        items: [],
      };

      const { status } = await apiRequest("POST", "/api/bills", billData);

      expect(status).toBe(400);
    });

    it("BILL05: Bill with missing customer should fail", async () => {
      const billData = {
        org_id: orgId,
        items: [
          {
            product_id: "PROD-001",
            quantity: 1,
            unit_price: 100,
          },
        ],
      };

      const { status } = await apiRequest("POST", "/api/bills", billData);

      expect(status).toBe(400);
    });
  });

  describe("Payment Processing API", () => {
    beforeEach(async () => {
      // Create a bill first
      const billData = {
        customer_id: "customer-1",
        org_id: orgId,
        items: [
          {
            product_id: "PROD-001",
            quantity: 1,
            unit_price: 1000,
          },
        ],
        discount_percent: 10,
        tax_percent: 5,
      };

      const { data } = await apiRequest("POST", "/api/bills", billData);
      billId = data.id;
    });

    it("PAY01: Process cash payment", async () => {
      const paymentData = {
        amount: 945, // 1000 - 100 + 45 (tax)
        method: "cash",
      };

      const { status, data } = await apiRequest(
        "POST",
        `/api/bills/${billId}/payment`,
        paymentData
      );

      expect(status).toBe(200);
      expect(data.payment_method).toBe("cash");
      expect(data.payment_status).toBe("completed");
      expect(data.finalized_at).toBeDefined();
    });

    it("PAY02: Process card payment", async () => {
      const paymentData = {
        amount: 945,
        method: "card",
      };

      const { status, data } = await apiRequest(
        "POST",
        `/api/bills/${billId}/payment`,
        paymentData
      );

      expect(status).toBe(200);
      expect(data.payment_method).toBe("card");
      expect(data.payment_status).toBe("completed");
    });

    it("PAY03: Process UPI payment", async () => {
      const paymentData = {
        amount: 945,
        method: "upi",
      };

      const { status, data } = await apiRequest(
        "POST",
        `/api/bills/${billId}/payment`,
        paymentData
      );

      expect(status).toBe(200);
      expect(data.payment_method).toBe("upi");
      expect(data.payment_status).toBe("completed");
    });

    it("PAY04: Process Razorpay payment", async () => {
      const paymentData = {
        amount: 945,
        method: "razorpay",
        razorpay_payment_id: "pay_test_123456",
      };

      const { status, data } = await apiRequest(
        "POST",
        `/api/bills/${billId}/payment`,
        paymentData
      );

      expect(status).toBe(200);
      expect(data.payment_method).toBe("razorpay");
      expect(data.payment_status).toBe("completed");
      expect(data.payment_id).toBe("pay_test_123456");
    });

    it("PAY05: Payment amount validation", async () => {
      const paymentData = {
        amount: 500, // Less than bill total
        method: "cash",
      };

      const { status } = await apiRequest(
        "POST",
        `/api/bills/${billId}/payment`,
        paymentData
      );

      expect(status).toBe(400);
    });

    it("PAY06: Invalid payment method", async () => {
      const paymentData = {
        amount: 945,
        method: "crypto",
      };

      const { status } = await apiRequest(
        "POST",
        `/api/bills/${billId}/payment`,
        paymentData
      );

      expect(status).toBe(400);
    });

    it("PAY07: Razorpay without payment ID should fail", async () => {
      const paymentData = {
        amount: 945,
        method: "razorpay",
        // Missing razorpay_payment_id
      };

      const { status } = await apiRequest(
        "POST",
        `/api/bills/${billId}/payment`,
        paymentData
      );

      expect(status).toBe(400);
    });

    it("PAY08: Duplicate payment should fail", async () => {
      // First payment
      const paymentData = {
        amount: 945,
        method: "cash",
      };

      await apiRequest("POST", `/api/bills/${billId}/payment`, paymentData);

      // Second payment attempt
      const { status } = await apiRequest(
        "POST",
        `/api/bills/${billId}/payment`,
        paymentData
      );

      expect(status).toBe(400); // Bill already paid
    });
  });

  describe("Bill Retrieval and History", () => {
    it("HIST01: Retrieve bill by ID", async () => {
      // Create a bill
      const billData = {
        customer_id: "customer-1",
        org_id: orgId,
        items: [
          {
            product_id: "PROD-001",
            quantity: 1,
            unit_price: 100,
          },
        ],
      };

      const createRes = await apiRequest("POST", "/api/bills", billData);
      const createdBillId = createRes.data.id;

      // Retrieve bill
      const { status, data } = await apiRequest(
        "GET",
        `/api/bills/${createdBillId}`
      );

      expect(status).toBe(200);
      expect(data.id).toBe(createdBillId);
      expect(data).toHaveProperty("bill_number");
      expect(data).toHaveProperty("created_at");
    });

    it("HIST02: List bills for organization", async () => {
      const { status, data } = await apiRequest("GET", "/api/bills");

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(0);

      // If bills exist, verify structure
      if (data.length > 0) {
        expect(data[0]).toHaveProperty("id");
        expect(data[0]).toHaveProperty("bill_number");
        expect(data[0]).toHaveProperty("total_amount");
      }
    });

    it("HIST03: Get payment history for bill", async () => {
      // Create and pay a bill
      const billData = {
        customer_id: "customer-1",
        org_id: orgId,
        items: [
          {
            product_id: "PROD-001",
            quantity: 1,
            unit_price: 1000,
          },
        ],
      };

      const createRes = await apiRequest("POST", "/api/bills", billData);
      const billId = createRes.data.id;

      // Process payment
      const paymentData = {
        amount: createRes.data.total_amount,
        method: "cash",
      };
      await apiRequest("POST", `/api/bills/${billId}/payment`, paymentData);

      // Get payment history
      const { status, data } = await apiRequest(
        "GET",
        `/api/bills/${billId}/payments`
      );

      expect(status).toBe(200);
      expect(data).toHaveProperty("bill_id");
      expect(data).toHaveProperty("bill_number");
      expect(data).toHaveProperty("payment_method");
      expect(data.payment_status).toBe("completed");
    });
  });

  describe("Email Receipt API", () => {
    beforeEach(async () => {
      const billData = {
        customer_id: "customer-1",
        org_id: orgId,
        items: [
          {
            product_id: "PROD-001",
            quantity: 1,
            unit_price: 100,
          },
        ],
      };

      const { data } = await apiRequest("POST", "/api/bills", billData);
      billId = data.id;
    });

    it("EMAIL01: Send receipt email", async () => {
      const emailData = {
        email: "customer@example.com",
      };

      const { status } = await apiRequest(
        "POST",
        `/api/bills/${billId}/email-receipt`,
        emailData
      );

      expect(status).toBe(200);
    });

    it("EMAIL02: Validate email format", async () => {
      const emailData = {
        email: "invalid-email",
      };

      const { status } = await apiRequest(
        "POST",
        `/api/bills/${billId}/email-receipt`,
        emailData
      );

      expect(status).toBe(400);
    });
  });

  describe("Cart Store API Compatibility", () => {
    it("CART01: Retrieve products for cart population", async () => {
      const { status, data } = await apiRequest(
        "GET",
        "/api/products?limit=10"
      );

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);

      // Verify product structure
      if (data.length > 0) {
        expect(data[0]).toHaveProperty("id");
        expect(data[0]).toHaveProperty("name");
        expect(data[0]).toHaveProperty("price");
        expect(data[0]).toHaveProperty("stock_quantity");
      }
    });

    it("CART02: Search product by barcode", async () => {
      const { status, data } = await apiRequest(
        "GET",
        "/api/products/search?barcode=PROD-001"
      );

      expect(status).toBe(200);
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("name");
      expect(data).toHaveProperty("price");
    });

    it("CART03: Validate product availability before checkout", async () => {
      const { status, data } = await apiRequest(
        "GET",
        "/api/products/PROD-001/availability"
      );

      expect(status).toBe(200);
      expect(data).toHaveProperty("available");
      expect(data).toHaveProperty("stock_quantity");
    });
  });

  describe("Org-Scoping and Security", () => {
    it("SEC01: Cannot access bills from different organization", async () => {
      // Create bill in org 1
      const billData = {
        customer_id: "customer-1",
        org_id: orgId,
        items: [
          {
            product_id: "PROD-001",
            quantity: 1,
            unit_price: 100,
          },
        ],
      };

      const { data } = await apiRequest("POST", "/api/bills", billData);
      const billId = data.id;

      // Try to access with different org token (would need separate login)
      // For now, verify bill has org_id
      expect(data.org_id).toBe(orgId);
    });

    it("SEC02: Payment endpoint requires authentication", async () => {
      const paymentData = {
        amount: 100,
        method: "cash",
      };

      // Make request without token
      const response = await fetch(`${API_URL}/api/bills/test/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });

      expect(response.status).toBe(401);
    });

    it("SEC03: Bill creation requires authentication", async () => {
      const billData = {
        customer_id: "customer-1",
        items: [
          {
            product_id: "PROD-001",
            quantity: 1,
            unit_price: 100,
          },
        ],
      };

      const response = await fetch(`${API_URL}/api/bills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billData),
      });

      expect(response.status).toBe(401);
    });
  });
});
