const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

/**
 * Prepare the Gmail carrier (mail transporter).
 */
function prepareDispatch() {
  const config = {
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  };

  return nodemailer.createTransport(config);
}

/**
 * Dispatch an email shipment (using Gmail only at this stage).
 */
const dispatchMail = async (messageOptions) => {
  try {
    const transporter = prepareDispatch();

    // Verify connection
    await transporter.verify();
    console.log("✅ Gmail carrier is ready to dispatch messages");

    // Send email
    const info = await transporter.sendMail(messageOptions);
    console.log("📩 Message dispatched:", info.response);

    return info;
  } catch (err) {
    console.error("❌ Error dispatching mail:", err);
    throw err;
  }
};

module.exports = { dispatchMail };
