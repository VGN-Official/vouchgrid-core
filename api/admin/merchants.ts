import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../../src/_db'; // <-- Change this to .js

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: "Merchant target variable parameter missing." });

  try {
    const data = await redis.get(`user:${(username as string).toLowerCase()}`);
    if (!data) return res.status(404).json({ error: "No behavioral attestation file exists for this identity." });
    
    // Upstash automatically parses JSON strings into objects, but this double check keeps it bulletproof
    return res.status(200).json(typeof data === 'string' ? JSON.parse(data) : data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
