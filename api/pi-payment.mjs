// Read the key securely from Vercel's Environment Variables
const PI_NETWORK_API_KEY = process.env.PI_NETWORK_API_KEY;

export default async function handler(req, res) {
if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Safety check: Ensure the environment variable is loaded
  if (!PI_NETWORK_API_KEY) {
    console.error("Missing PI_NETWORK_API_KEY environment variable in Vercel settings.");
    return res.status(500).json({ error: "Server misconfiguration: API key missing." });
  }
  
  try {
    const { action, paymentId, txid } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: "Missing paymentId context." });
    }

    // Phase 1: Approve the payment via Pi Network API
    if (action === "approve") {
      console.log(`Submitting server approval for payment ID: ${paymentId}`);
      
      const piApproveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: { 
          'Authorization': `Key ${PI_NETWORK_API_KEY}` 
        }
      });

      if (!piApproveRes.ok) {
        const errText = await piApproveRes.text();
        console.error("Pi Server rejected approval request:", errText);
        return res.status(400).json({ error: "Pi Network rejected server approval.", details: errText });
      }

      return res.status(200).json({ success: true, action: "approve" });
    }

    // Phase 2: Complete the payment via Pi Network API
    if (action === "complete") {
      if (!txid) {
        return res.status(400).json({ error: "Missing ledger txid context for completion." });
      }

      console.log(`Submitting server completion for payment ID: ${paymentId}, TXID: ${txid}`);
      
      const piCompleteRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: { 
          'Authorization': `Key ${PI_NETWORK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ txid })
      });

      if (!piCompleteRes.ok) {
        const errText = await piCompleteRes.text();
        console.error("Pi Server rejected completion handshake:", errText);
        return res.status(400).json({ error: "Pi Network rejected server completion.", details: errText });
      }

      return res.status(200).json({ success: true, action: "complete" });
    }

    return res.status(400).json({ error: "Unknown payment action" });
  } catch (error) {
    console.error("Payment Handshake Error:", error);
    return res.status(500).json({ error: "Internal processing crash" });
  }

 }
