const nodemailer = require("nodemailer");
require("dotenv").config();

async function sendEmail(to, subject, text) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  let mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log("Email yuborildi:", info.messageId);
  } catch (err) {
    console.error("Xatolik:", err);
  }
}

module.exports = sendEmail;
