import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from '../_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const keys = await redis.keys('user:*');
    return res.status(200).json({
      totalRegisteredMerchants: keys.length,
      networkLayerStatus: "OPERATIONAL",
      consensusEngine: "VOUCHGRID_CORE_v1.0"
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

