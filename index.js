const express = require("express");
const axios = require("axios");
const app = express();

// 🛠️ Enable trusting the proxy (Render) to detect HTTPS correctly
app.enable("trust proxy");

// ✅ Allow HTTP requests (disable HTTPS redirect for SIM800L)
app.use((req, res, next) => {
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    return next();
  }
  // Allow insecure HTTP (SIM800L does not support HTTPS)
  next();
});

// ✅ Allow parsing JSON request bodies
app.use(express.json());

// ✅ Health check endpoint
app.get("/", (req, res) => {
  return res.send("🌊 Flood‑Proxy is up and running!");
});

// ✅ SIM800L POST upload endpoint (your ESP32 uses this)
app.post("/upload", async (req, res) => {
  try {
    const data = req.body; // Should be { device_id: ..., distance: ..., timestamp: ... }

    console.log("Received data from GSM device:", data);

    // 🔐 Firebase config from environment variables (set in Render Dashboard)
    const firebaseBase = process.env.FIREBASE_URL;
    const firebaseSecret = process.env.FIREBASE_SECRET;

    if (!firebaseBase || !firebaseSecret) {
      return res.status(500).json({ status: "error", message: "Missing Firebase credentials" });
    }

    // 👉 Example: https://your-firebase.firebaseio.com/sensors/Node_1.json?auth=...
    const nodeName = data.device_id || "Node_1";
    const firebaseUrl = `${firebaseBase}/sensors/${nodeName}.json?auth=${firebaseSecret}`;

    // 🔁 Patch the data to Firebase
    const firebaseResponse = await axios.patch(firebaseUrl, data);

    return res.json({ status: "ok", firebase: firebaseResponse.data });
  } catch (err) {
    console.error("Error forwarding to Firebase:", err.message);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// ✅ Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
