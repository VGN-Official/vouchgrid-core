export default async function handler(req, res) {
  // Handle preflight routing safely
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ success: false, error: 'Cryptographic access token is missing.' });
  }

  try {
    console.log("[VouchGrid Handshake] Verifying token authenticity with Pi Network...");

    // Behavior Requirement: Validate token via GET https://api.minepi.com/v2/me 
    const piProfileRes = await fetch('https://api.minepi.com/v2/me', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!piProfileRes.ok) {
      const errorText = await piProfileRes.text();
      console.error("[VouchGrid Handshake] Pi Core Node rejected signature verification:", errorText);
      return res.status(401).json({ success: false, error: 'Pi Network signature validation refused.' });
    }

    const userData = await piProfileRes.json();
    console.log(`[VouchGrid Handshake] Verified Secure User Instance: @${userData.username}`);

    // Return authorization block payload back to your front-end scripts
    return res.status(200).json({ success: true, user: userData });

  } catch (error) {
    console.error('[VouchGrid Handshake] Secure session validation node crash:', error);
    return res.status(500).json({ success: false, error: 'Internal edge architecture fault.' });
  }
}