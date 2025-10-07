const ejs = require("ejs");
const path = require("path");
const dotenv = require("dotenv");
const { dispatchMail } = require("../helpers/sendmail");
const Shipment = require("../models/Shipment");

dotenv.config();

/**
 * Sends notification emails for shipments marked as "delivered"
 * but not yet notified to shipper, consignee, and notify parties.
 */
const DeliveredShipmentEmail = async () => {
  try {
    // 🔍 Find delivered shipments not yet notified
    const shipments = await Shipment.find({
      status: "delivered",
      isDeleted: false,
      "notifications.delivered": { $ne: true },
    }).populate("customer", "fullname email");

    if (!shipments.length) {
      console.log("ℹ️ No newly delivered shipments to notify.");
      return;
    }

    for (const shipment of shipments) {
      const shipper = shipment.shipper || {};
      const consignee = shipment.consignee || {};
      const notify = shipment.notify || {};
      const vessel = shipment.vessel || {};
      const ports = shipment.ports || {};

      // 🧱 Template path
      const templatePath = path.join(__dirname, "../templates/deliveredshipment.ejs");

      // 🖋️ Render EJS template
      const html = await ejs.renderFile(templatePath, {
        shipper,
        consignee,
        notify,
        cargo: shipment.cargo || {},
        vessel,
        ports,
        shippingDate: shipment.shippingDate
          ? new Date(shipment.shippingDate).toLocaleDateString("en-GB")
          : "N/A",
        eta: shipment.eta
          ? new Date(shipment.eta).toLocaleDateString("en-GB")
          : "N/A",
        deliveredOn: shipment.updatedAt
          ? new Date(shipment.updatedAt).toLocaleDateString("en-GB")
          : "N/A",
        referenceNo: shipment.referenceNo || "Pending Ref.",
      });

      // ✉️ Build message object
      const message = {
        from: process.env.EMAIL,
        to: consignee.email || shipper.email || shipment.customer?.email || "support@ellcworth.com",
        cc: [shipper.email, notify.email].filter(Boolean),
        subject: `✅ Delivered: Shipment ${shipment.referenceNo || ""} Successfully Completed`,
        html,
      };

      // 🚀 Send email
      try {
        await dispatchMail(message);
        console.log(`📦 Delivered shipment email sent for ${shipment.referenceNo}`);

        // 🧾 Update notifications flag to avoid duplicate sends
        shipment.notifications = shipment.notifications || {};
        shipment.notifications.delivered = true;
        await shipment.save();
      } catch (mailErr) {
        console.error(`❌ Email send failed for ${shipment.referenceNo}:`, mailErr.message);
      }
    }

    console.log("✅ All delivered shipment emails processed successfully.");

  } catch (err) {
    console.error("❌ Error in DeliveredShipmentEmail:", err.message);
  }
};

module.exports = { DeliveredShipmentEmail };
