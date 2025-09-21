// bnovo.js  (ESM)
// Minimal Bnovo API klienti: GET /bookings, POST /bookings (endpoint/path sozlanadi)

import fetch from "node-fetch";

export default class BnovoAPI {
  /**
   * @param {object} cfg
   * @param {string} cfg.apiKey           // BNOVO_API_KEY
   * @param {string} cfg.baseUrl          // BNOVO_API_BASE (masalan: https://api.pms.bnovo.ru)
   * @param {string} [cfg.createPath]     // bron yaratish yo'li (default: /api/v1/bookings)
   * @param {string} [cfg.readPath]       // bronlarni olish yo'li (default: /api/v1/bookings)
   */
  constructor({ apiKey, baseUrl, createPath = "/api/v1/bookings", readPath = "/api/v1/bookings" }) {
    if (!apiKey || !baseUrl) throw new Error("BnovoAPI: apiKey va baseUrl shart");
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.createPath = createPath;
    this.readPath = readPath;
  }

  // Ichki: so'rovni yuborish. Avval Bearer, 401 bo'lsa Basic bilan qayta urinadi.
  async _request(method, path, body) {
    const url = `${this.baseUrl}${path}`;
    const tryOnce = async (authHeader) => {
      const resp = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await resp.text();
      let data;
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
      if (!resp.ok) {
        const err = new Error(`Bnovo ${method} ${path} failed: ${resp.status}`);
        err.status = resp.status;
        err.data = data;
        throw err;
      }
      return data;
    };

    // 1) Bearer bilan
    try {
      return await tryOnce(`Bearer ${this.apiKey}`);
    } catch (e) {
      if (e.status !== 401) throw e;
    }
    // 2) Basic bilan (apiKey allaqachon base64 bo'lishi mumkin)
    return await tryOnce(`Basic ${this.apiKey}`);
  }

  // Davr bo'yicha bronlar (read-only)
  async getBookings(dateFrom /* YYYY-MM-DD */, dateTo /* YYYY-MM-DD */) {
    const q = new URLSearchParams({ date_from: dateFrom, date_to: dateTo }).toString();
    const path = `${this.readPath}?${q}`;
    return this._request("GET", path);
  }

  // Bron yaratish / yuborish (to'lovdan keyin)
  async createBooking(payload /* {date_from,date_to,rooms:[{room_type_id,guests}],customer:{...},comment} */) {
    return this._request("POST", this.createPath, payload);
  }

  // Oddiy availability hisoblash (local stock bilan)
  static computeAvailability({ bookings = [], checkInISO, nights = 1, stock = { standard: 23, family: 1 } }) {
    const checkIn = new Date(checkInISO);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + Number(nights));

    const overlap = (b) => {
      const from = new Date(b.date_from || b.check_in || b.arrival);
      const to   = new Date(b.date_to   || b.check_out || b.departure);
      return from < checkOut && to > checkIn;
    };

    let stdBusy = 0, famBusy = 0;
    for (const b of bookings) {
      if (!overlap(b)) continue;
      const cat = (b.room_type || b.category || b.roomTypeName || "").toString().toLowerCase();
      if (cat.includes("standard")) stdBusy += 1;
      else if (cat.includes("family")) famBusy += 1;
    }

    const stdFree = Math.max(0, Number(stock.standard) - stdBusy);
    const famFree = Math.max(0, Number(stock.family) - famBusy);

    return {
      standard: { free: stdFree, total: Number(stock.standard) },
      family:   { free: famFree, total: Number(stock.family) },
    };
  }
}
