const ejs = require("ejs");
const path = require("path");
const dotenv = require("dotenv");
const { dispatchMail } = require("../helpers/sendmail");
const Shipment = require("../models/Shipment");

dotenv.config();

const PendingShipmentEmail = async () => {
  try {
    // ✅ Find shipments that are pending and haven't been emailed yet
    const shipments = await Shipment.find({
      status: "pending",
      isDeleted: false,
      "notifications.pending": false,
    }).populate("customer", "fullname email");

    if (!shipments.length) {
      console.log("ℹ️ No new pending shipments to email.");
      return;
    }

    for (const shipment of shipments) {
      const shipper = shipment.shipper || {};
      const consignee = shipment.consignee || {};
      const notify = shipment.notify || {};
      const vessel = shipment.vessel || {};
      const ports = shipment.ports || {};

      // ✅ Render the email template
      const html = await ejs.renderFile(
        path.join(__dirname, "../templates/pendingshipment.ejs"),
        {
          shipper,
          consignee,
          notify,
          cargo: shipment.cargo || {},
          vessel,
          ports,
          referenceNo: shipment.referenceNo || "N/A",
          shippingDate: shipment.shippingDate
            ? new Date(shipment.shippingDate).toLocaleDateString("en-GB")
            : "TBA",
          eta: shipment.eta
            ? new Date(shipment.eta).toLocaleDateString("en-GB")
            : "TBA",
        }
      );

      // ✅ Construct the message
      const message = {
        from: process.env.EMAIL,
        to: shipper.email || process.env.SUPPORT_EMAIL,
        cc: [consignee.email, notify.email].filter(Boolean),
        subject: `📦 Shipment ${shipment.referenceNo} – Now Pending`,
        html,
      };

      try {
        await dispatchMail(message);
        console.log(
          `✅ Pending shipment email sent to ${shipper.email || "N/A"} for ${shipment.referenceNo}`
        );

        // ✅ Mark as notified (do NOT change shipment status automatically)
        shipment.notifications.pending = true;
        await shipment.save();
      } catch (mailErr) {
        console.error("❌ Failed to send pending shipment email:", mailErr);
      }
    }
  } catch (err) {
    console.error("❌ Error in PendingShipmentEmail:", err);
  }
};

module.exports = { PendingShipmentEmail };
