import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// backend/index.js
app.post("/create-payment", (req, res) => {
  console.log("Amount:", req.body.amount);
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({ clientSecret: "demo_client_secret" });
});

app.listen(5000, () => console.log("Backend running on port 5000"));
