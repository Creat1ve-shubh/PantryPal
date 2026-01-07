# PantryPal Monitoring with Prometheus & Grafana

## Overview

PantryPal includes production-ready observability using Prometheus for metrics collection and Grafana for visualization. This setup provides real-time insights into:

- HTTP request rates and latency
- Bill creation and payment processing
- Cart conversion metrics
- Product search performance
- Barcode scanning activity
- Error rates and types
- System resources (CPU, memory, disk)

## Quick Start

### 1. Install Dependencies

```bash
npm install prom-client
```

### 2. Start Monitoring Stack

```bash
# Start Prometheus and Grafana
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker ps
```

### 3. Access Dashboards

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
  - Username: `admin`
  - Password: `admin` (change on first login)

### 4. Start Your Application

```bash
npm run dev
```

The application will expose metrics at `http://localhost:5000/metrics`

## Architecture

```
┌─────────────────┐
│  PantryPal App  │ ── Exposes /metrics endpoint
└────────┬────────┘
         │
         │ Scrapes every 15s
         ▼
┌─────────────────┐
│   Prometheus    │ ── Stores time-series data
└────────┬────────┘
         │
         │ Queries
         ▼
┌─────────────────┐
│    Grafana      │ ── Visualizes dashboards
└─────────────────┘
```

## Metrics Exposed

### HTTP Metrics

- `http_requests_total` - Total HTTP requests (counter)
- `http_request_duration_seconds` - Request latency histogram

### Business Metrics

- `bills_created_total` - Bills created by payment method
- `bill_amount_inr` - Bill amounts distribution
- `bills_finalized_total` - Finalized bills count
- `cart_items_added_total` - Items added to cart
- `cart_checkouts_total` - Checkout attempts by status
- `cart_conversion_rate` - Cart-to-order conversion %

### Payment Metrics

- `payments_processed_total` - Payments by method and status
- `payment_processing_latency_seconds` - Payment processing time

### Product/Search Metrics

- `products_searched_total` - Product searches
- `search_latency_seconds` - Search performance
- `barcodes_scanned_total` - Barcode scans

### Database Metrics

- `db_connections_active` - Active DB connections
- `db_query_duration_seconds` - Query performance

### Error Metrics

- `errors_total` - Errors by type and route

## Grafana Dashboard

The included dashboard (`monitoring/grafana-dashboard.json`) provides:

1. **HTTP Performance Panel**

   - Requests per second
   - P95/P99 latency

2. **Business KPIs**

   - Bills created per minute
   - Average bill amount
   - Payment method distribution

3. **Cart & Conversion**

   - Cart activity timeline
   - Conversion rate gauge
   - Checkout success rate

4. **System Health**
   - Error rates by type
   - Database connection pool
   - Resource utilization

## Production Deployment

### Option 1: Docker Compose (Single Server)

```bash
# Production compose file with persistent volumes
docker-compose -f docker-compose.monitoring.yml up -d
```

### Option 2: Kubernetes (Scalable)

```yaml
# prometheus-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
        - name: prometheus
          image: prom/prometheus:latest
          ports:
            - containerPort: 9090
          volumeMounts:
            - name: config
              mountPath: /etc/prometheus
      volumes:
        - name: config
          configMap:
            name: prometheus-config
```

### Option 3: Managed Services

**Grafana Cloud** (Free tier available):

```bash
# Install Grafana Agent
docker run -v ./monitoring/prometheus.yml:/etc/agent/agent.yaml \
  grafana/agent:latest
```

**AWS CloudWatch**:

```bash
# Use CloudWatch Container Insights
# Metrics automatically collected from ECS/EKS
```

## Alerting

Create alert rules in `monitoring/alerts.yml`:

```yaml
groups:
  - name: pantrypal_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      - alert: SlowPaymentProcessing
        expr: histogram_quantile(0.95, rate(payment_processing_latency_seconds_bucket[5m])) > 5
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Payment processing is slow"
          description: "P95 latency is {{ $value }} seconds"

      - alert: LowCartConversion
        expr: cart_conversion_rate < 50
        for: 1h
        labels:
          severity: info
        annotations:
          summary: "Cart conversion below 50%"
          description: "Current conversion rate: {{ $value }}%"
```

Add to `prometheus.yml`:

```yaml
rule_files:
  - "alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

## Custom Metrics

Add custom metrics in your code:

```typescript
import { billsCreated, billAmount } from "./middleware/prometheus";

// Track bill creation
billsCreated.inc({ payment_method: "cash" });

// Track bill amount
billAmount.observe({ payment_method: "cash" }, 1234.56);
```

## Querying Prometheus

### Via Prometheus UI (http://localhost:9090)

```promql
# Average request duration over 5 minutes
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Bills created per hour
increase(bills_created_total[1h])

# Top 5 error-prone routes
topk(5, sum by (route) (rate(errors_total[5m])))

# Payment success rate
rate(payments_processed_total{status="success"}[5m]) / rate(payments_processed_total[5m])
```

### Via HTTP API

```bash
curl 'http://localhost:9090/api/v1/query?query=up'
```

## Retention & Storage

Default retention: 30 days

Adjust in `docker-compose.monitoring.yml`:

```yaml
command:
  - "--storage.tsdb.retention.time=90d" # 90 days
  - "--storage.tsdb.retention.size=50GB" # OR size-based
```

## Scaling Considerations

### For High Traffic (>1000 req/sec)

1. **Use Remote Storage**

   ```yaml
   remote_write:
     - url: "https://prometheus-prod.example.com/api/v1/write"
   ```

2. **Sampling**

   ```typescript
   // Only track 10% of requests
   if (Math.random() < 0.1) {
     httpRequestDuration.observe({ method, route, status }, duration);
   }
   ```

3. **Sharding**
   - Run multiple Prometheus instances
   - Use Thanos or Cortex for federation

## Troubleshooting

### Metrics not appearing in Grafana

1. Check Prometheus targets: http://localhost:9090/targets
2. Verify app is exposing `/metrics`: http://localhost:5000/metrics
3. Check Prometheus can reach app:
   ```bash
   docker exec pantrypal-prometheus curl host.docker.internal:5000/metrics
   ```

### High memory usage

Reduce cardinality:

```typescript
// BAD: Too many unique label values
httpRequestsTotal.inc({ route: req.url });

// GOOD: Group similar routes
httpRequestsTotal.inc({ route: req.route?.path || "unknown" });
```

### Missing historical data

Prometheus data is ephemeral. For long-term storage:

- Use remote write to Thanos/Cortex
- Export to object storage (S3, GCS)
- Use Grafana Cloud for managed retention

## Security

### Production Checklist

- [ ] Change Grafana admin password
- [ ] Enable Prometheus authentication
- [ ] Use HTTPS for external access
- [ ] Restrict `/metrics` endpoint to internal network
- [ ] Rotate API keys regularly
- [ ] Enable audit logging

### Secure Metrics Endpoint

```typescript
app.get("/metrics", authenticateInternal, metricsHandler);

function authenticateInternal(req, res, next) {
  const token = req.headers["x-metrics-token"];
  if (token !== process.env.METRICS_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
```

## Cost Optimization

### Grafana Cloud Free Tier

- 10k series metrics
- 50GB logs
- 50GB traces
- 14-day retention

### Self-Hosted vs Managed

| Aspect      | Self-Hosted     | Managed (Grafana Cloud) |
| ----------- | --------------- | ----------------------- |
| Cost        | $20-50/mo (VPS) | Free tier, then $8+/mo  |
| Maintenance | High            | Low                     |
| Scalability | Manual          | Automatic               |
| Retention   | Configurable    | Limited on free tier    |

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
