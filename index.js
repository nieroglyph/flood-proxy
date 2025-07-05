// index.js
const express = require("express");
const axios = require("axios");
const app = express();

// Allow parsing JSON bodies
app.use(express.json());

// health‐check at root
app.get("/", (req, res) => {
  return res.send("🌊 Flood‑Proxy is up and running!");
});

// POST endpoint for your ESP32 to call
app.post("/upload", async (req, res) => {
  try {
    const data = req.body; // { distance: 12.34 }

    // Firebase credentials
    const firebaseBase = process.env.FIREBASE_URL;
    const firebaseSecret = process.env.FIREBASE_SECRET;

    const firebaseUrl = `${firebaseBase}/sensors/Node_1.json?auth=${firebaseSecret}`;


    // Forward data to Firebase
    const response = await axios.patch(firebaseUrl, data);

    // Send success back
    return res.json({ status: "ok", firebase: response.data });
  } catch (err) {
    console.error("Error forwarding to Firebase:", err.message);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// Add this to your index.js after the existing /upload endpoint
app.post("/upload-http", async (req, res) => {
  try {
    const data = req.body;
    const firebaseBase = process.env.FIREBASE_URL;
    const firebaseSecret = process.env.FIREBASE_SECRET;
    const firebaseUrl = `${firebaseBase}/sensors/Node_1.json?auth=${firebaseSecret}`;
    
    const response = await axios.patch(firebaseUrl, data);
    return res.json({ status: "ok", firebase: response.data });
  } catch (err) {
    console.error("Error forwarding to Firebase:", err.message);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// Start server on the port provided by Render (or 3000 locally)
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
