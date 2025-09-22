import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;
const BASE_URL = process.env.BASE_URL || "https://hotel-backend-bmlk.onrender.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://khamsahotel.uz";
const EUR_TO_UZS = 14000;

const {
  OCTO_SHOP_ID,
  OCTO_SECRET,
  EMAIL_USER,
  EMAIL_PASS,
  // BNOVO_API_KEY, 
  // BNOVO_API_BASE, 
} = process.env;

const ADMIN_EMAIL = "shamshodochilov160@gmail.com";

if (!OCTO_SHOP_ID || !OCTO_SECRET || !EMAIL_USER || !EMAIL_PASS /*|| !BNOVO_API_KEY*/) {
  console.error("❌ .env faylida kerakli ma'lumotlar yetishmayapti");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

async function sendEmail(to, subject, text) {
  if (!to || !subject || !text) {
    console.warn("Email yuborish uchun yetarli ma'lumot yo'q, yoki xato");
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: `"Khamsa Hotel" <${EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log(`✅ Email yuborildi: ${to}`);
    return info;
  } catch (err) {
    console.error(`❌ Email yuborishda xatolik (${to}):`, err.message || err);
    throw err;
  }
}

app.use(cors({
  origin: [FRONTEND_URL, `${FRONTEND_URL}/`],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());

app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description = "Mehmonxona to'lovi", email } = req.body;
    if (!amount || !email) {
      return res.status(400).json({ error: "Ma'lumot yetarli emas" });
    }

    const amountUZS = Math.round(amount * EUR_TO_UZS);

    const paymentData = {
      octo_shop_id: Number(OCTO_SHOP_ID),
      octo_secret: OCTO_SECRET,
      shop_transaction_id: Date.now().toString(),
      auto_capture: true,
      test: false,
      init_time: new Date().toISOString().replace("T", " ").substring(0, 19),
      total_sum: amountUZS,
      currency: "UZS",
      description: `${description} (${amount} EUR)`,
      return_url: `${FRONTEND_URL}/success`,
      notify_url: `${BASE_URL}/payment-callback`,
      language: "uz",
      custom_data: { email },
    };

    const response = await fetch("https://secure.octo.uz/prepare_payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData),
    });

    const responseText = await response.text();
    const data = JSON.parse(responseText);

    if (data.error === 0 && data.data?.octo_pay_url) {
      return res.json({ paymentUrl: data.data.octo_pay_url });
    } else {
      return res.status(400).json({ error: data.errMessage || "Octobank xatosi" });
    }
  } catch (err) {
    console.error("❌ create-payment xatolik:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text } = req.body;

    if (!to || !subject || !text) {
      return res.status(400).json({ success: false, error: "To‘liq ma’lumot yuborilmadi" });
    }

    await sendEmail(to, subject, text);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ /send-email xatolik:", err);
    res.status(500).json({ success: false, error: "Email yuborilmadi" });
  }
});

app.post("/payment-callback", (req, res) => {
  console.log("🔁 Callback body:", req.body);
  res.json({ status: "callback received" });
});

// Bnovo bilan bog'liq import olib tashlandi
// const bnovo = new BnovoAPI(BNOVO_API_KEY, BNOVO_API_BASE);

app.post("/api/bookings", async (req, res) => {
  try {
    const {
      checkIn,
      checkOutTime,
      duration,
      rooms,
      guests,
      firstName,
      lastName,
      phone,
      email,
      price,
    } = req.body;

    if (!checkIn || !checkOutTime || !rooms || !firstName || !email) {
      return res.status(400).json({ error: "Kerakli ma'lumotlar yetarli emas" });
    }

    const getCheckoutDate = (checkIn, duration) => {
      const date = new Date(checkIn);
      if (duration && duration.includes("3")) date.setHours(date.getHours() + 3);
      else if (duration && duration.includes("10")) date.setHours(date.getHours() + 10);
      else date.setDate(date.getDate() + 1);
      return date.toISOString().split("T")[0];
    };

    const checkOut = getCheckoutDate(checkIn, duration);

    const roomTypeMap = {
      "Standard Room": 117445,
      "Family Room": 117446,
      "2 Standard Rooms": 117445,
      "2 Family Rooms": 117446,
      "Standard + 1 Family room": 117447,
    };

    const room_type_id = roomTypeMap[rooms] || 117445;

    const createdAt = new Date().toISOString();

    const bookingPayload = {
      date_from: checkIn,
      date_to: checkOut,
      rooms: [
        {
          room_type_id: room_type_id,
          guests: guests,
        },
      ],
      customer: {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        email: email,
      },
      comment: `Xona: ${rooms} | Narx: ${price} EUR | Sayt: ${FRONTEND_URL}`,
    };

    // const bnovoResponse = await bnovo.createBooking(bookingPayload); // <-- olib tashlandi

    const emailSubject = "Yangi bron qilish haqida xabar";
    const emailText = `
Yangi bron qabul qilindi:

👤 Ism: ${firstName} ${lastName}
📞 Telefon: ${phone || "Noma'lum"}
📧 Email: ${email}

📅 Kirish sana: ${checkIn}
📆 Chiqish sana: ${checkOut}
🛏️ Xona turi: ${rooms}
👥 Mehmonlar soni: ${guests || "Noma'lum"}
💶 Narx: ${price} EUR
🕓 Bron qilingan vaqt: ${createdAt}

🌐 Sayt: ${FRONTEND_URL}
    `;

    try {
      await sendEmail(ADMIN_EMAIL, emailSubject, emailText);
      console.log("✅ Admin email yuborildi:", ADMIN_EMAIL);
    } catch (emailErr) {
      console.error("❌ Admin email yuborishda xatolik:", emailErr.message || emailErr);
    }

    res.json({
      success: true,
      message: "Bron muvaffaqiyatli yuborildi",
      // bnovoData: bnovoResponse, // <-- olib tashlandi
      createdAt,
    });
  } catch (error) {
    console.error("❌ Bnovo booking xatolik:", error.message || error);
    res.status(500).json({ error: "Bron qilishda server xatosi" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server ishlayapti: ${BASE_URL} (port: ${PORT})`);
});