import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const keys = await redis.keys('user:*');
    const records = [];
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) records.push(typeof data === 'string' ? JSON.parse(data) : data);
    }
    return res.status(200).json({ success: true, total: records.length, data: records });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}