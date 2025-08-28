import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Octo parametrlari
const OCTO_API_URL = "https://secure.octo.uz/prepare_payment";
const SHOP_ID = process.env.OCTO_SHOP_ID;
const SECRET_KEY = process.env.OCTO_SECRET;

app.use(cors());
app.use(express.json());

app.post("/create-payment", async (req, res) => {
  try {
    const { amount, currency = "UZS", description = "Mehmonxona to'lovi" } = req.body;

    if (!amount || typeof amount !== "number") {
      return res.status(400).json({ error: "Noto‘g‘ri amount qiymati" });
    }

    const body = {
      octo_shop_id: Number(SHOP_ID),
      octo_secret: SECRET_KEY,
      shop_transaction_id: Date.now().toString(),
      auto_capture: true,
      test: false,
      init_time: new Date().toISOString().replace("T", " ").substring(0, 19),
      total_sum: amount,
      currency,
      description,
      return_url: "https://yourfrontend.com/success", // frontend success URL
      notify_url: "https://yourbackend.com/payment-callback", // backend notification URL (ixtiyoriy)
      language: "uz"
    };

    const response = await fetch(OCTO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error === 0 && data.data?.octo_pay_url) {
      return res.json({ paymentUrl: data.data.octo_pay_url });
    } else {
      return res.status(400).json({ error: data.errMessage || "Octo xatosi" });
    }

  } catch (error) {
    res.status(500).json({ error: error.message || "Server xatosi" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend ${PORT}-portda ishlayapti`);
});
