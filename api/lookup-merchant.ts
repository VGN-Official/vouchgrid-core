import type { VercelRequest, VercelResponse } from '@vercel/node';

// Strict validation matching your Zod BodySchema properties
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enforce CORS so your Pi Browser sandbox webview won't block the handshake
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { targetUsername } = req.body;
    if (!targetUsername || targetUsername.trim() === "") {
      return res.status(400).json({ success: false, error: "Invalid request body: Missing targetUsername" });
    }

    // --- TODO: Connect your real database / memory layer connection here ---
    // Presenting the exact properties your client UI logic parses:
    const mockUser = {
      username: targetUsername.trim(),
      currentStatus: "PENDING",   // or "VERIFIED"
      vouchesCount: 0,
      requiredVouches: 3,
    };

    return res.status(200).json({ success: true, user: mockUser });

  } catch (err: any) {
    console.error("[lookup-merchant] error:", err.message);
    return res.status(500).json({ success: false, error: "Lookup failed inside memory node." });
  }
}