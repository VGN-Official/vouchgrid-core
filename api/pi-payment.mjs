export default async function handler(req, res) {
  // Handle CORS options preflight requests from Pi Servers
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { action, paymentId, txid } = req.body;

    // Phase 1: Pi Server is asking us to approve the payment creation
    if (action === "approve") {
      console.log(`Approving payment generation for ID: ${paymentId}`);
      return res.status(200).json({ action: "approve" });
    }

    // Phase 2: Pi Server tells us the transaction was submitted to the blockchain
    if (action === "complete") {
      console.log(`Transaction submitted successfully! TXID: ${txid}`);
      return res.status(200).json({ action: "complete" });
    }

    return res.status(400).json({ error: "Unknown payment action" });
  } catch (error) {
    console.error("Payment Handshake Error:", error);
    return res.status(500).json({ error: "Internal processing crash" });
  }
}

