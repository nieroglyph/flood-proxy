// index.js
const express = require("express");
const axios = require("axios");
const fs      = require("fs");
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

// SMS Blast
// Semaphore credentials
const SEMAPHORE_KEY    = process.env.SEMAPHORE_API_KEY;
const SEMAPHORE_SENDER = process.env.SEMAPHORE_SENDER;

// Admin‑triggered SMS blast: POST /blast-sms { "message": "Your text here" }
app.post("/blast-sms", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Please provide a message." });
  }

  // Load numbers from a local file
  let numbers;
  try {
    numbers = fs
      .readFileSync("numbers.txt", "utf8")
      .split("\n")
      .map(n => n.trim())
      .filter(n => n);
  } catch (e) {
    return res
      .status(500)
      .json({ error: "Cannot read numbers.txt: " + e.message });
  }

  const results = [];
  for (let to of numbers) {
    try {
      const r = await axios.get("https://semaphore.co/api/v4/messages", {
        params: {
          apikey: SEMAPHORE_KEY,
          number: to,
          message,
          sendername: SEMAPHORE_SENDER
        }
      });
      results.push({ to, status: r.data.status });
    } catch (err) {
      results.push({ to, status: "error", error: err.message });
    }
    // tiny pause so we don’t get rate‑limited
    await new Promise(r => setTimeout(r, 200));
  }

  return res.json({ sent: results.length, results });
});

// Receive replies from PhilSMS
app.post("/sms-reply", (req, res) => {
  // 1. Grab the incoming data
  const from    = req.body.sender;   // phone number
  const message = req.body.message;  // text they sent

  console.log(`📥 Reply from ${from}: "${message}"`);

  // 2. (Optional) If they text "1", send back location
  if (message.trim() === "1") {
    const replyText = "Your location is Talaba, Bacoor City";
    axios.post("https://app.philsms.com/api/v3/sms/send", {
      recipient: from,
      sender_id: process.env.PHILSMS_SENDER,
      type: "plain",
      message: replyText
    }, {
      headers: { Authorization: `Bearer ${process.env.PHILSMS_TOKEN}` }
    }).catch(console.error);
  }

  // 3. Send a 200 OK back to PhilSMS
  res.sendStatus(200);
});


// Start server on the port provided by Render (or 3000 locally)
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
