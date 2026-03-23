const client = require("prom-client");

// Collect default Node.js metrics (CPU, memory, event loop, GC)
client.collectDefaultMetrics({ prefix: "app_" });

// =============================================================================
// Custom Metrics
// =============================================================================

// HTTP request counter
const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

// HTTP request duration
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// Database query counter
const dbQueriesTotal = new client.Counter({
  name: "db_queries_total",
  help: "Total number of database queries",
  labelNames: ["operation", "status"],
});

// Database query duration
const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Database query duration in seconds",
  labelNames: ["operation"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// Cache hit/miss counter
const cacheOperationsTotal = new client.Counter({
  name: "cache_operations_total",
  help: "Total cache operations",
  labelNames: ["operation", "result"],
});

// Active database connections gauge
const dbActiveConnections = new client.Gauge({
  name: "db_active_connections",
  help: "Number of active database connections",
});

// App info gauge (for Grafana labels)
const appInfo = new client.Gauge({
  name: "app_info",
  help: "Application metadata",
  labelNames: ["version", "pod", "runtime"],
});

appInfo.set(
  {
    version: process.env.APP_VERSION || "2.0.0",
    pod: process.env.HOSTNAME || "unknown",
    runtime: "bun",
  },
  1
);

// =============================================================================
// Express Middleware — track every request
// =============================================================================

function metricsMiddleware(req, res, next) {
  if (req.path === "/metrics") return next();

  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route ? req.route.path : req.path;

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status: res.statusCode,
    });

    httpRequestDuration.observe(
      { method: req.method, route, status: res.statusCode },
      duration
    );
  });

  next();
}

module.exports = {
  client,
  metricsMiddleware,
  httpRequestsTotal,
  httpRequestDuration,
  dbQueriesTotal,
  dbQueryDuration,
  cacheOperationsTotal,
  dbActiveConnections,
};
