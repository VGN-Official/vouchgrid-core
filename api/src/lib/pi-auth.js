import { authWithTimeout } from "./lib/pi-auth";

export async function loadData() {
  const auth = await authWithTimeout();          // wait for Pi auth first
  const res = await fetch("/api/data", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.accessToken}`,
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

//const SCOPES = ["username", "payments"]; // match Portal scopes exactly

//function onIncompletePaymentFound(payment) {
  //console.warn("Incomplete payment:", payment);
//}

//export async function authWithTimeout(ms = 15000) {
  //if (typeof window === "undefined" || !window.Pi) {
    //throw new Error("Pi SDK not loaded. Open this app inside Pi Browser.");
  //}
  //return await Promise.race([
    //window.Pi.authenticate(SCOPES, onIncompletePaymentFound),
    //new Promise((_, reject) =>
      //setTimeout(() => reject(new Error(`Pi.authenticate timed out after ${ms}ms`)), ms)
    //),
  //]);
//}

// Surface silent errors to the console + a debug banner
//if (typeof window !== "undefined") {
  //window.addEventListener("error", (e) =>
    //console.error("[window.error]", e.error || e.message)
  //);
  //window.addEventListener("unhandledrejection", (e) =>
    //console.error("[unhandledrejection]", e.reason)
  //);
//}
