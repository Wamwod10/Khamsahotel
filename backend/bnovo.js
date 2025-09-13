// bnovo.js

import axios from "axios";

class BnovoAPI {
  constructor(apiKey, baseUrl = "https://api.bnovo.pro/v1") {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "apikey": this.apiKey, // API kalitni headerga qo'shish
      },
      timeout: 10000, // 10 soniya timeout
    });
  }

  // 🏨 1. Xonalarni olish (GET /room)
  async getRooms() {
    try {
      const response = await this.client.get("/room");
      return response.data;
    } catch (error) {
      this.handleError(error, "Xonalarni olishda xato");
      throw error;
    }
  }

  // 📅 2. Tariflar ro‘yxati (GET /tariff/tariffs)
  async getTariffs() {
    try {
      const response = await this.client.get("/tariff/tariffs");
      return response.data;
    } catch (error) {
      this.handleError(error, "Tariflarni olishda xato");
      throw error;
    }
  }

  // 💰 3. Tarif narxlarini qo‘shish (POST /tariff/prices)
  async setTariffPrice(priceValue, planId, dfrom) {
    const payload = {
      price: {
        dolor_5f: {
          laboris_46: priceValue,
        },
      },
      plan_id: planId,
      dfrom: dfrom,
    };

    try {
      const response = await this.client.post("/tariff/prices", payload);
      return response.data;
    } catch (error) {
      this.handleError(error, "Tarif narxini o‘rnatishda xato");
      throw error;
    }
  }

  // 🛎️ 4. Xizmat qo‘shish (POST /service/add)
  async addService(serviceData) {
    try {
      const response = await this.client.post("/service/add", serviceData);
      return response.data;
    } catch (error) {
      this.handleError(error, "Xizmat qo‘shishda xato");
      throw error;
    }
  }

  // 🧾 5. Xizmatlar ro‘yxati (GET /service)
  async getServices() {
    try {
      const response = await this.client.get("/service");
      return response.data;
    } catch (error) {
      this.handleError(error, "Xizmatlarni olishda xato");
      throw error;
    }
  }

  // ❌ 6. Xizmat o‘chirish (GET /service/delete/{id})
  async deleteService(serviceId) {
    try {
      const response = await this.client.get(`/service/delete/${serviceId}`);
      return response.data;
    } catch (error) {
      this.handleError(error, "Xizmatni o‘chirishda xato");
      throw error;
    }
  }

  // ✅ 7. BRON YARATISH (POST /booking)
  async createBooking(bookingData) {
    try {
      const response = await this.client.post("/booking", bookingData);
      return response.data;
    } catch (error) {
      this.handleError(error, "Bron yaratishda xato");
      throw error;
    }
  }

  // ❗ Xatoliklarni boshqarish
  handleError(error, message) {
    if (error.response) {
      console.error(`❌ ${message}`, {
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      console.error(`❌ ${message}: So‘rov yuborildi, ammo javob kelmadi`, error.request);
    } else {
      console.error(`❌ ${message}:`, error.message);
    }
  }
}

export default BnovoAPI;
