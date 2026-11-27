import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { bookingIcs, confirmationText, googleCalendarUrl } from "../../../../utils/bookingCalendar.js";
import { API_BASE } from "../../../../config.ts";
import "./PaymentSuccess.scss";

const PaymentSuccess = () => {
  const { t } = useTranslation();
  const [result, setResult] = useState(null);
  const [state, setState] = useState("loading");
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [bookingStatus, setBookingStatus] = useState("unknown");
  const [now, setNow] = useState(() => Date.now());
  const qrRef = useRef(null);
  const shareLink = result ? window.location.origin + "/success?stid=" + encodeURIComponent(result.reference) : "";
  const firstItem = result?.items?.[0];
  const arrivalAt = firstItem ? new Date(firstItem.checkInDate + "T" + firstItem.checkInTime + ":00+05:00").getTime() : NaN;
  const remaining = Number.isFinite(arrivalAt) ? Math.max(0, arrivalAt - now) : null;
  const countdown = remaining === null ? "" : [
    Math.floor(remaining / 86400000),
    String(Math.floor((remaining % 86400000) / 3600000)).padStart(2, "0"),
    String(Math.floor((remaining % 3600000) / 60000)).padStart(2, "0"),
  ].join(" : ");
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Only generate the QR in the guest browser; the booking link is not sent to third parties.
  useEffect(() => {
    if (!result || !qrRef.current || typeof window.QRCode !== "function") return;
    qrRef.current.innerHTML = "";
    new window.QRCode(qrRef.current, {text:shareLink,width:152,height:152,colorDark:"#222222",colorLight:"#ffffff",correctLevel:window.QRCode.CorrectLevel.M});
    return () => { if(qrRef.current) qrRef.current.innerHTML = ""; };
  }, [result, shareLink]);

  // Read-only polling; never repeat a payment request.
  useEffect(() => {
    if (state === "confirmed") return;
    const stid = new URLSearchParams(window.location.search).get("stid");
    if (!stid) return;
    let active = true;
    const check = async () => {
      try {
        const res = await fetch(API_BASE + "/api/booking-status?stid=" + encodeURIComponent(stid), {cache:"no-store"});
        const data = await res.json();
        if (!active || !res.ok || !data.ok) return;
        setBookingStatus(data.status);
        if (data.status === "confirmed") {
          const confirmation = await fetch(API_BASE + "/api/booking-confirmation?stid=" + encodeURIComponent(stid), {cache:"no-store"});
          const details = await confirmation.json();
          if (active && confirmation.ok && details.ok && Array.isArray(details.items) && details.items.length) {
            setResult(details); setState("confirmed");
          }
        }
      } catch { /* Offline: never infer payment success. */ }
    };
    check();
    const timer = window.setInterval(check, 20000);
    return () => { active=false; window.clearInterval(timer); };
  }, [state]);

  const shareBooking = async () => {
    if (!shareLink) return;
    try {
      if (navigator.share) await navigator.share({ title:"Khamsa Hotel", url:shareLink });
      else await navigator.clipboard.writeText(shareLink);
      setShared(true);
    } catch { /* User cancelled or clipboard permission was denied. */ }
  };

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
          <h1>{bookingStatus === "pending" ? t("bookingStatusPending") : bookingStatus === "failed" ? t("bookingStatusFailed") : t("bookingVerificationUnavailable")}</h1>
          <p>{t("bookingVerificationInstructions")}</p>
          <a href="/mybooking">{t("bookingReturnSelection")}</a>
        </>
      ) : (
        <>
          <div className="success-icon" aria-hidden="true">✓</div>
          <h1>{t("bookingPaymentConfirmed")}</h1>
          <p>{t("bookingConfirmationEmailSent")}</p>
          <p className="booking-confirmation-reference">{t("bookingReference")}: {result.reference}</p>
          <p role="status" className="booking-confirmation-reference">{t("bookingStatus")}: {t("bookingPaymentConfirmed")}</p>
          {remaining !== null && <p className="booking-confirmation-reference">{t("bookingCountdown")}: <strong>{remaining > 0 ? countdown : t("bookingStarted")}</strong></p>}
          <div className="booking-confirmation-qr">
            <div ref={qrRef} aria-label={t("bookingQrLabel")} role="img" />
            <small>{t("bookingQrNote")}</small>
          </div>
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
            <button type="button" onClick={shareBooking}>{shared ? t("bookingShareDone") : t("bookingShare")}</button>
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
