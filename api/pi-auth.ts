import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { accessToken } = req.body;
  if (!accessToken) return res.status(400).json({ error: "Missing identity token." });

  try {
    const piResponse = await fetch('https://api.minepi.com/v2/me', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!piResponse.ok) return res.status(401).json({ error: "Pi signature refused." });

    const userData = await piResponse.json();
    return res.status(200).json({ success: true, username: userData.username, uid: userData.uid });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}