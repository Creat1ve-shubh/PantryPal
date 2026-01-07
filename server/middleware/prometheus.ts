import prometheus from "prom-client";
import type { Express, Request, Response, NextFunction } from "express";

/**
 * Prometheus Metrics for PantryPal
 * Production-ready observability with Grafana integration
 *
 * Metrics tracked:
 * - HTTP request latency and count
 * - Bill creation and payment processing
 * - Product search and inventory operations
 * - Cart operations and conversion metrics
 * - Error rates and types
 * - Database connection pool status
 */

// Create register for all metrics
const register = new prometheus.Registry();

// Default metrics (CPU, memory, Node.js internals)
prometheus.collectDefaultMetrics({ register });

// Custom Metrics

/**
 * HTTP Request Metrics
 */
export const httpRequestDuration = new prometheus.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.1, 0.5, 1, 2, 5, 10], // 100ms, 500ms, 1s, 2s, 5s, 10s
  registers: [register],
});

export const httpRequestsTotal = new prometheus.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

/**
 * Cart Metrics
 */
export const cartItemsAdded = new prometheus.Counter({
  name: "cart_items_added_total",
  help: "Total number of items added to cart",
  labelNames: ["product_category"],
  registers: [register],
});

export const cartCheckouts = new prometheus.Counter({
  name: "cart_checkouts_total",
  help: "Total number of checkout attempts",
  labelNames: ["status", "payment_method"],
  registers: [register],
});

export const cartConversionRate = new prometheus.Gauge({
  name: "cart_conversion_rate",
  help: "Percentage of carts converted to orders",
  registers: [register],
});

/**
 * Bill Metrics
 */
export const billsCreated = new prometheus.Counter({
  name: "bills_created_total",
  help: "Total number of bills created",
  labelNames: ["payment_method"],
  registers: [register],
});

export const billAmount = new prometheus.Histogram({
  name: "bill_amount_inr",
  help: "Bill amounts in INR",
  labelNames: ["payment_method"],
  buckets: [100, 500, 1000, 5000, 10000, 50000],
  registers: [register],
});

export const billsFinalized = new prometheus.Counter({
  name: "bills_finalized_total",
  help: "Total number of bills finalized",
  registers: [register],
});

/**
 * Payment Metrics
 */
export const paymentsProcessed = new prometheus.Counter({
  name: "payments_processed_total",
  help: "Total number of payments processed",
  labelNames: ["method", "status"],
  registers: [register],
});

export const paymentLatency = new prometheus.Histogram({
  name: "payment_processing_latency_seconds",
  help: "Payment processing latency",
  labelNames: ["method"],
  buckets: [0.5, 1, 2, 5, 10],
  registers: [register],
});

/**
 * Product Search Metrics
 */
export const productsSearched = new prometheus.Counter({
  name: "products_searched_total",
  help: "Total number of product searches",
  labelNames: ["method"],
  registers: [register],
});

export const searchLatency = new prometheus.Histogram({
  name: "search_latency_seconds",
  help: "Product search latency",
  labelNames: ["method"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

/**
 * Barcode Scanner Metrics
 */
export const barcodesScanned = new prometheus.Counter({
  name: "barcodes_scanned_total",
  help: "Total number of barcodes scanned",
  labelNames: ["result"],
  registers: [register],
});

/**
 * Database Metrics
 */
export const dbConnections = new prometheus.Gauge({
  name: "db_connections_active",
  help: "Active database connections",
  registers: [register],
});

export const dbQueryDuration = new prometheus.Histogram({
  name: "db_query_duration_seconds",
  help: "Database query duration",
  labelNames: ["operation", "table"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

/**
 * Error Metrics
 */
export const errors = new prometheus.Counter({
  name: "errors_total",
  help: "Total number of errors",
  labelNames: ["type", "route"],
  registers: [register],
});

/**
 * Middleware to track HTTP requests
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();
  const route = req.route?.path || req.path || "unknown";

  // Track response
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const duration = (Date.now() - start) / 1000;
    const status = res.statusCode;

    // Record metrics
    httpRequestDuration.observe(
      { method: req.method, route, status },
      duration
    );
    httpRequestsTotal.inc({ method: req.method, route, status });

    if (status >= 500) {
      errors.inc({ type: "server_error", route });
    } else if (status >= 400) {
      errors.inc({ type: "client_error", route });
    }

    return originalJson(body);
  };

  next();
}

/**
 * Metrics endpoint - expose Prometheus format
 */
export async function metricsHandler(_req: Request, res: Response) {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
}

export default register;
