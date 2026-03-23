const { app, initDB } = require("./app");

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await initDB();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`GitOps API running on port ${PORT} (via Bun)`);
      console.log(`Pod: ${process.env.HOSTNAME || "local"}`);
      console.log(`Version: ${process.env.APP_VERSION || "2.0.0"}`);
      console.log(`Metrics: http://localhost:${PORT}/metrics`);
    });
  } catch (error) {
    console.error("Failed to start:", error.message);
    process.exit(1);
  }
}

start();
