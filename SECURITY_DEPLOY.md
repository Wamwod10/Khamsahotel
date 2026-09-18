# Khamsa security deployment checklist

This project keeps the existing root frontend + `backend/` structure. No production secret belongs in the frontend or in Git.

Before deploying the updated backend, set/rotate these values in **Render > Environment**:

- `DATABASE_URL`
- `OCTO_SHOP_ID`
- `OCTO_SECRET`
- `OCTO_CALLBACK_KEY` (long random value)
- `EMAIL_USER`
- `EMAIL_PASS` (Gmail App Password)
- `ADMIN_EMAIL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `BNOVO_ID`
- `BNOVO_PASSWORD`
- `BNOVO_HOTEL_ID`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD` (new strong password)
- `ADMIN_TOKEN_SECRET` (at least 32 random bytes)
- `BASE_URL=https://khamsa-backend.onrender.com`
- `FRONTEND_URL=https://khamsahotel.uz`
- `NODE_ENV=production`

Keep the existing hotel/capacity/currency values already configured in Render unless intentionally changing them.

## Important incident step

Because production credentials were previously present in project files, rotate the old database, Telegram, email, Octo, Bnovo and admin credentials after deploying the code. Do not reuse the previous values.

## Verification after deploy

1. `GET /healthz` returns `{ "ok": true }`.
2. Anonymous `GET /api/checkins` returns `401`.
3. Anonymous `DELETE /api/checkins/<id>` returns `401`.
4. Admin login works through `/admin` and `/admin/bookings` still loads bookings.
5. Create a low-risk real test booking and complete Octo payment.
6. Confirm: DB status becomes `paid`, Telegram receives exactly one booking notification, guest receives the security/booking confirmation email, and the success page opens.
7. Confirm the home page “Stay Alert / Будьте бдительны / Ogoh bo'ling” button scrolls to the anti-fraud section in all three languages.
