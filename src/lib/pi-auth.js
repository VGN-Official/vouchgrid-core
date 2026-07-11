const SCOPES = ["username", "payments"]; 

function onIncompletePaymentFound(payment) {
  console.warn("Incomplete payment tracked:", payment);
}

// 1. Your core timeout function
export async function authWithTimeout(ms = 15000) {
  if (typeof window === "undefined" || !window.Pi) {
    throw new Error("Pi SDK not loaded. Please open VouchGrid inside the Pi Browser.");
  }
  
  return await Promise.race([
    window.Pi.authenticate(SCOPES, onIncompletePaymentFound),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Pi Authentication timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// 2. The data loading function from file #2 (merged here natively)
export async function loadData() {
  const auth = await authWithTimeout(); 
  const res = await fetch("/api/data", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.accessToken}`,
    },
  });
  
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}