import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { bookingIcs, confirmationText, googleCalendarUrl } from "../../../../utils/bookingCalendar.js";
import { API_BASE } from "../../../../config.ts";
import "./PaymentSuccess.scss";

const PaymentSuccess = () => {
  const { t } = useTranslation();
  const [result, setResult] = useState(null);
  const [state, setState] = useState("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const stid = new URLSearchParams(window.location.search).get("stid");
    if (!stid) { setState("unavailable"); return () => controller.abort(); }
    fetch(API_BASE + "/api/booking-confirmation?stid=" + encodeURIComponent(stid), {
      signal: controller.signal, cache: "no-store",
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok || !data.ok || !Array.isArray(data.items) || !data.items.length) throw new Error("unverified");
      if (!controller.signal.aborted) { setResult(data); setState("confirmed"); }
    }).catch((err) => {
      if (!controller.signal.aborted && err.name !== "AbortError") setState("unavailable");
    });
    return () => controller.abort();
  }, []);

  const downloadCalendar = () => {
    if (!result) return;
    const blob = new Blob([bookingIcs(result.items, result.reference)], { type: "text/calendar;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "khamsa-booking.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const copyDetails = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(confirmationText(result)); setCopied(true); }
    catch { setCopied(false); }
  };

  return (
    <div className="payment-success-container">
      {state === "loading" ? (
        <p role="status">{t("bookingVerifyingPayment")}</p>
      ) : state !== "confirmed" ? (
        <>
          <h1>{t("bookingVerificationUnavailable")}</h1>
          <p>{t("bookingVerificationInstructions")}</p>
          <a href="/mybooking">{t("bookingReturnSelection")}</a>
        </>
      ) : (
        <>
          <div className="success-icon" aria-hidden="true">✓</div>
          <h1>{t("bookingPaymentConfirmed")}</h1>
          <p>{t("bookingConfirmationEmailSent")}</p>
          <p className="booking-confirmation-reference">{t("bookingReference")}: {result.reference}</p>
          <div className="booking-confirmed-items">
            {result.items.map((item, index) => (
              <div className="booking-confirmed-item" key={index}>
                <strong>{item.room === "FAMILY" ? t("family") : t("standard")}</strong>
                <span>{item.checkInDate} {item.checkInTime} → {item.checkOutDate} {item.checkOutTime}</span>
                <small>{t("bookingTimeTimezoneShort")}</small>
                <a href={googleCalendarUrl(item)} target="_blank" rel="noopener noreferrer">
                  {t("bookingGoogleCalendar")}
                </a>
              </div>
            ))}
          </div>
          <div className="booking-confirmation-actions">
            <button type="button" onClick={downloadCalendar}>{t("bookingAppleCalendar")}</button>
            <button type="button" onClick={copyDetails}>{copied ? t("bookingCopied") : t("bookingCopyDetails")}</button>
            <button type="button" onClick={() => window.print()}>{t("bookingSavePdf")}</button>
          </div>
          <a href="/">{t("bookingBackHome")}</a>
        </>
      )}
    </div>
  );
};

export default PaymentSuccess;
