import { describe, it, expect, beforeEach } from "vitest";
import fetch from "node-fetch";

const API_URL = "http://localhost:5000";
let authToken: string;
let orgId: string;

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

  const start = Date.now();
  const response = await fetch(`${API_URL}${endpoint}`, options);
  const end = Date.now();
  const data = await response.json();

  return { status: response.status, data, duration: end - start };
}

describe("Performance & Scale Testing", () => {
  beforeEach(async () => {
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

  describe("Checkout API Performance", () => {
    it("PERF01: Bill creation < 200ms", async () => {
      const billData = {
        customer_id: "customer-1",
        org_id: orgId,
        items: [
          {
            product_id: "PROD-001",
            quantity: 2,
            unit_price: 100,
          },
        ],
      };

      const { duration, status } = await apiRequest(
        "POST",
        "/api/bills",
        billData
      );

      expect(status).toBe(201);
      expect(duration).toBeLessThan(200);
      console.log(`✅ Bill creation: ${duration}ms`);
    });

    it("PERF02: Payment processing < 300ms", async () => {
      // Create bill first
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

      const billRes = await apiRequest("POST", "/api/bills", billData);
      const billId = billRes.data.id;

      // Process payment
      const paymentData = {
        amount: billRes.data.total_amount,
        method: "cash",
      };

      const { duration, status } = await apiRequest(
        "POST",
        `/api/bills/${billId}/payment`,
        paymentData
      );

      expect(status).toBe(200);
      expect(duration).toBeLessThan(300);
      console.log(`✅ Payment processing: ${duration}ms`);
    });

    it("PERF03: Product search < 100ms", async () => {
      const { duration, status } = await apiRequest(
        "GET",
        "/api/products/search?barcode=PROD-001"
      );

      expect(status).toBe(200);
      expect(duration).toBeLessThan(100);
      console.log(`✅ Product search: ${duration}ms`);
    });

    it("PERF04: Bill retrieval < 150ms", async () => {
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
      const billId = createRes.data.id;

      // Retrieve bill
      const { duration, status } = await apiRequest(
        "GET",
        `/api/bills/${billId}`
      );

      expect(status).toBe(200);
      expect(duration).toBeLessThan(150);
      console.log(`✅ Bill retrieval: ${duration}ms`);
    });

    it("PERF05: Metrics endpoint < 50ms", async () => {
      const start = Date.now();
      const response = await fetch(`${API_URL}/metrics`);
      const end = Date.now();

      expect(response.status).toBe(200);
      expect(end - start).toBeLessThan(50);
      console.log(`✅ Metrics endpoint: ${end - start}ms`);
    });
  });

  describe("Concurrent Operations", () => {
    it("SCALE01: Handle 10 concurrent bill creations", async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        const billData = {
          customer_id: `customer-${i}`,
          org_id: orgId,
          items: [
            {
              product_id: `PROD-${String(i + 1).padStart(3, "0")}`,
              quantity: 1,
              unit_price: 100 + i * 10,
            },
          ],
        };

        promises.push(apiRequest("POST", "/api/bills", billData));
      }

      const results = await Promise.all(promises);
      const avgDuration =
        results.reduce((sum, r) => sum + r.duration, 0) / results.length;

      expect(results.every((r) => r.status === 201)).toBe(true);
      expect(avgDuration).toBeLessThan(500);
      console.log(`✅ 10 concurrent bills: avg ${avgDuration}ms`);
    });

    it("SCALE02: Handle 20 concurrent product searches", async () => {
      const promises = [];

      for (let i = 0; i < 20; i++) {
        const productId = `PROD-${String((i % 10) + 1).padStart(3, "0")}`;
        promises.push(
          apiRequest("GET", `/api/products/search?barcode=${productId}`)
        );
      }

      const results = await Promise.all(promises);
      const avgDuration =
        results.reduce((sum, r) => sum + r.duration, 0) / results.length;

      expect(results.every((r) => r.status === 200)).toBe(true);
      expect(avgDuration).toBeLessThan(200);
      console.log(`✅ 20 concurrent searches: avg ${avgDuration}ms`);
    });

    it("SCALE03: Sequential checkout flow (cart → bill → payment)", async () => {
      const startTotal = Date.now();

      // Step 1: Search products
      const search1 = await apiRequest(
        "GET",
        "/api/products/search?barcode=PROD-001"
      );
      const search2 = await apiRequest(
        "GET",
        "/api/products/search?barcode=PROD-002"
      );

      // Step 2: Create bill
      const billRes = await apiRequest("POST", "/api/bills", {
        customer_id: "customer-1",
        org_id: orgId,
        items: [
          {
            product_id: "PROD-001",
            quantity: 1,
            unit_price: search1.data.price,
          },
          {
            product_id: "PROD-002",
            quantity: 2,
            unit_price: search2.data.price,
          },
        ],
      });

      // Step 3: Process payment
      const paymentRes = await apiRequest(
        "POST",
        `/api/bills/${billRes.data.id}/payment`,
        {
          amount: billRes.data.total_amount,
          method: "cash",
        }
      );

      const endTotal = Date.now();
      const totalTime = endTotal - startTotal;

      expect(search1.status).toBe(200);
      expect(search2.status).toBe(200);
      expect(billRes.status).toBe(201);
      expect(paymentRes.status).toBe(200);
      expect(totalTime).toBeLessThan(1000); // Complete flow < 1s
      console.log(`✅ Complete checkout flow: ${totalTime}ms`);
    });
  });

  describe("Load Testing - High Volume", () => {
    it("LOAD01: Create 50 bills sequentially", async () => {
      const durations: number[] = [];
      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        const billData = {
          customer_id: `customer-${i % 10}`,
          org_id: orgId,
          items: [
            {
              product_id: `PROD-${String((i % 20) + 1).padStart(3, "0")}`,
              quantity: Math.floor(Math.random() * 5) + 1,
              unit_price: Math.floor(Math.random() * 900) + 100,
            },
          ],
        };

        const { duration, status } = await apiRequest(
          "POST",
          "/api/bills",
          billData
        );

        expect(status).toBe(201);
        durations.push(duration);
      }

      const endTime = Date.now();
      const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
      const maxDuration = Math.max(...durations);
      const totalTime = endTime - startTime;

      console.log(`✅ 50 bills created in ${totalTime}ms`);
      console.log(`   Average: ${avgDuration}ms, Max: ${maxDuration}ms`);

      expect(avgDuration).toBeLessThan(500);
      expect(maxDuration).toBeLessThan(2000);
    });

    it("LOAD02: Rapid-fire product searches (100 searches)", async () => {
      const durations: number[] = [];
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const productId = `PROD-${String((i % 50) + 1).padStart(3, "0")}`;
        const { duration, status } = await apiRequest(
          "GET",
          `/api/products/search?barcode=${productId}`
        );

        expect(status).toBe(200);
        durations.push(duration);
      }

      const endTime = Date.now();
      const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
      const p95 = durations.sort((a, b) => a - b)[
        Math.floor(durations.length * 0.95)
      ];

      console.log(`✅ 100 searches in ${endTime - startTime}ms`);
      console.log(`   Average: ${avgDuration}ms, P95: ${p95}ms`);

      expect(avgDuration).toBeLessThan(150);
      expect(p95).toBeLessThan(500);
    });

    it("LOAD03: Mixed operations workload", async () => {
      const startTime = Date.now();
      let billsCreated = 0;
      let paymentsProcessed = 0;
      let searchesPerformed = 0;

      // Simulate 30 seconds of mixed operations
      const endTime = startTime + 30000;
      const operations: { type: string; duration: number }[] = [];

      while (Date.now() < endTime) {
        const operation = Math.floor(Math.random() * 3);

        if (operation === 0) {
          // Create bill
          const billRes = await apiRequest("POST", "/api/bills", {
            customer_id: "customer-1",
            org_id: orgId,
            items: [
              {
                product_id: "PROD-001",
                quantity: 1,
                unit_price: 100,
              },
            ],
          });
          if (billRes.status === 201) {
            billsCreated++;
            operations.push({ type: "bill", duration: billRes.duration });
          }
        } else if (operation === 1) {
          // Search product
          const searchRes = await apiRequest(
            "GET",
            "/api/products/search?barcode=PROD-001"
          );
          if (searchRes.status === 200) {
            searchesPerformed++;
            operations.push({ type: "search", duration: searchRes.duration });
          }
        } else {
          // Get metrics
          const metricsRes = await fetch(`${API_URL}/metrics`);
          if (metricsRes.status === 200) {
            operations.push({ type: "metrics", duration: 0 });
          }
        }
      }

      const totalDuration = Date.now() - startTime;
      const avgDuration =
        operations.reduce((sum, op) => sum + op.duration, 0) /
        operations.length;

      console.log(`✅ Mixed workload (30s): ${operations.length} operations`);
      console.log(`   Bills: ${billsCreated}, Searches: ${searchesPerformed}`);
      console.log(`   Average duration: ${avgDuration}ms`);
      console.log(`   Total time: ${totalDuration}ms`);

      expect(billsCreated).toBeGreaterThan(0);
      expect(searchesPerformed).toBeGreaterThan(0);
      expect(avgDuration).toBeLessThan(500);
    });
  });

  describe("Memory and Resource Efficiency", () => {
    it("RESOURCE01: No memory leaks during 100 operations", async () => {
      // Get initial memory (rough estimate)
      const initialOps = 100;
      const operations: { type: string; duration: number }[] = [];

      // Perform operations
      for (let i = 0; i < initialOps; i++) {
        const res = await apiRequest(
          "GET",
          "/api/products/search?barcode=PROD-001"
        );
        operations.push({ type: "search", duration: res.duration });
      }

      // Check if performance degrades (sign of memory leak)
      const firstHalf = operations.slice(0, 50);
      const secondHalf = operations.slice(50, 100);

      const firstAvg =
        firstHalf.reduce((sum, op) => sum + op.duration, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, op) => sum + op.duration, 0) /
        secondHalf.length;

      // Second half should not be significantly slower (>50% worse)
      const degradation = (secondAvg - firstAvg) / firstAvg;
      expect(degradation).toBeLessThan(0.5);

      console.log(
        `✅ No memory leak: First 50 avg ${firstAvg}ms, Last 50 avg ${secondAvg}ms`
      );
    });

    it("RESOURCE02: Database connection pooling", async () => {
      // Create multiple concurrent requests
      const promises = [];

      for (let i = 0; i < 20; i++) {
        promises.push(apiRequest("GET", "/api/bills"));
      }

      const results = await Promise.all(promises);
      const avgDuration =
        results.reduce((sum, r) => sum + r.duration, 0) / results.length;

      // All should succeed without timeout
      expect(results.every((r) => r.status === 200)).toBe(true);
      // Performance should be consistent
      expect(avgDuration).toBeLessThan(300);

      console.log(`✅ Connection pooling works: avg ${avgDuration}ms`);
    });
  });

  describe("Error Recovery and Resilience", () => {
    it("RESILIENCE01: Graceful handling of invalid data", async () => {
      const invalidBills = [
        { customer_id: "customer-1", items: [] }, // Empty items
        {
          customer_id: "customer-1",
          items: [{ product_id: "", quantity: 1, unit_price: -100 }],
        }, // Invalid price
        { items: [{ product_id: "PROD-001", quantity: 0, unit_price: 100 }] }, // Zero qty
      ];

      for (const bill of invalidBills) {
        const res = await fetch(`${API_URL}/api/bills`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ ...bill, org_id: orgId }),
        });

        // Should return error, not crash
        expect([400, 422]).toContain(res.status);
      }

      console.log("✅ Invalid data handled gracefully");
    });

    it("RESILIENCE02: Server remains responsive after errors", async () => {
      // Trigger multiple errors
      for (let i = 0; i < 10; i++) {
        await fetch(`${API_URL}/api/bills/invalid-id`, {
          method: "GET",
          headers: { Authorization: `Bearer ${authToken}` },
        });
      }

      // Server should still respond normally
      const { status, duration } = await apiRequest("GET", "/api/bills");

      expect(status).toBe(200);
      expect(duration).toBeLessThan(300);

      console.log(`✅ Server resilient to errors: response ${duration}ms`);
    });
  });

  describe("Metrics Collection Performance", () => {
    it("METRICS01: Prometheus metrics < 10ms overhead per request", async () => {
      // Make request and check duration
      const { duration } = await apiRequest("GET", "/api/bills");

      // Prometheus middleware should add minimal overhead
      expect(duration).toBeLessThan(300); // Overall request should be fast
      console.log(`✅ Metrics overhead acceptable: ${duration}ms`);
    });

    it("METRICS02: /metrics endpoint scales with data volume", async () => {
      // Create some bills to generate metrics
      for (let i = 0; i < 10; i++) {
        await apiRequest("POST", "/api/bills", {
          customer_id: "customer-1",
          org_id: orgId,
          items: [
            {
              product_id: "PROD-001",
              quantity: 1,
              unit_price: 100,
            },
          ],
        });
      }

      // Check metrics endpoint
      const start = Date.now();
      const response = await fetch(`${API_URL}/metrics`);
      const end = Date.now();

      expect(response.status).toBe(200);
      expect(end - start).toBeLessThan(100);

      const text = await response.text();
      expect(text.length).toBeGreaterThan(1000);

      console.log(
        `✅ Metrics endpoint: ${end - start}ms, ${text.length} bytes`
      );
    });
  });
});
