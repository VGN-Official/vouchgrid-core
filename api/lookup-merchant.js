/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  // Enforce global CORS matching your pi-auth configurations
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
    // Fail-safe body parsing to guard against unparsed payload strings
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (pErr) {
        return res.status(400).json({ success: false, error: "Malformed JSON payload structure." });
      }
    }

    // Fallback block if body is altogether missing
    if (!body) {
      return res.status(400).json({ success: false, error: "Missing request body container." });
    }

    const targetUsername = body.targetUsername;
    if (!targetUsername || targetUsername.trim() === "") {
      return res.status(400).json({ success: false, error: "Invalid request body: Missing targetUsername" });
    }

    // --- Core Registry Simulation Object ---
    const mockUser = {
      username: targetUsername.trim(),
      currentStatus: "PENDING", 
      vouchesCount: 0,
      requiredVouches: 3,
    };

    return res.status(200).json({ success: true, user: mockUser });

  } catch (err) {
    console.error("[lookup-merchant] Internal Failure:", err);
    return res.status(500).json({ success: false, error: "Internal execution loop failed." });
  }
}