const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require("./firebase-key.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.post("/saveTaps", async (req, res) => {
  try {
    const sessionId = req.body.id;
    const devicePlatform = req.body.var;
    const tapsRaw = req.body.taps;

    if (!sessionId || !devicePlatform || !tapsRaw) {
      return res.status(400).send("Missing required fields");
    }

    let taps;

    if (typeof tapsRaw === "string") {
      taps = JSON.parse(tapsRaw);
    } else {
      taps = tapsRaw;
    }

    if (!Array.isArray(taps)) {
      return res.status(400).send("Invalid tap data");
    }

    const batch = db.batch();

    taps.forEach((tap) => {
      const startTimestamp = tap.startTimestamp;
      const endTimestamp = tap.endTimestamp;
      const tapSequenceNumber = tap.tapSequenceNumber;
      const interfaceType = tap.interface;
      const interfaceSequence = tap.interfaceSequence;
      const durationMs = endTimestamp - startTimestamp;

      const docRef = db.collection("tap_logs").doc();

      batch.set(docRef, {
        sessionId: String(sessionId),
        devicePlatform: String(devicePlatform),
        tapSequenceNumber: Number(tapSequenceNumber),
        startTimestamp: Number(startTimestamp),
        endTimestamp: Number(endTimestamp),
        durationMs: Number(durationMs),
        interfaceType: String(interfaceType),
        interfaceSequence: Number(interfaceSequence),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();

    res.send("Data saved successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

app.get("/", (req, res) => {
  res.send("Clicklogs backend is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});