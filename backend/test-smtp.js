import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config(); // .env fayldan EMAIL_USER va EMAIL_PASS o'qish

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.error("SMTP Verify error:", err);
  } else {
    console.log("✅ SMTP OK");
  }
});

transporter.sendMail({
  from: process.env.EMAIL_USER,
  to: "shamshodochilov160@example.com", // o'zingizning emailingizga o'zgartiring
  subject: "Test Email",
  text: "Render + Gmail SMTP ishlayaptimi?",
});
