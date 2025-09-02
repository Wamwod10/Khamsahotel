const nodemailer = require('nodemailer');
require('dotenv').config();

async function sendEmail(to, subject, text) {
  // Gmail uchun transporter yaratamiz
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Sizning gmail manzilingiz
      pass: process.env.EMAIL_PASS, // App parolingiz (2FA bo‘lsa)
    },
  });

  // Email opsiyalari
  let mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  // Email yuborish
  try {
    let info = await transporter.sendMail(mailOptions);
    console.log('Email yuborildi:', info.messageId);
  } catch (err) {
    console.error('Xatolik:', err);
  }
}

// Foydalanish
sendEmail('recipient@example.com', 'Test mavzu', 'Salom! Bu test email.');
