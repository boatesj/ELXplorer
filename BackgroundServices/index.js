const express = require("express");
const app = express();
const dotenv = require("dotenv");
const cron = require("node-cron");
const mongoose = require("mongoose");

// Import all email jobs
const { sendWelcomeMail } = require("./EmailService/WelcomeEmail");
const { PendingShipmentEmail } = require("./EmailService/PendingShipment");
const { DeliveredShipmentEmail } = require("./EmailService/DeliveredShipment");

dotenv.config();

// --- DB CONNECTION ---
const DB = process.env.DB;
mongoose
  .connect(DB)
  .then(() => {
    console.log("✅ DB connection is successful");
  })
  .catch((e) => {
    console.error("❌ DB connection failed:", e.message);
  });

// --- TASK SCHEDULER ---
const run = () => {
  // Run every minute for testing
  cron.schedule("* * * * *", async () => {
    console.log("⏰ Running scheduled background tasks...");
    try {
      await sendWelcomeMail();
      await PendingShipmentEmail();
      await DeliveredShipmentEmail();
      console.log("✅ All background email jobs completed successfully.");
    } catch (err) {
      console.error("❌ Error running scheduled tasks:", err);
    }
  });
};

run();

// --- SERVER ---
const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`🚀 BackgroundServices is running on port ${PORT}`);
});
