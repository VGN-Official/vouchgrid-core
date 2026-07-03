import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  
  const { action, paymentId, txid } = req.body;
  const targetUsername = req.body.targetUsername || req.body.metadata?.targetMerchant;
  const validatorUsername = req.body.validatorUsername || req.body.metadata?.validatorOperator;
  
  const apiKey = "w7cvctqnahva2nqmfw8gjsflu6aue1chhnonoqdoep2chp2pg9wudgnuxxihxvwb";

  try {
    if (action === 'approve') {
      const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' }
      });
      if (!approveRes.ok) throw new Error(await approveRes.text());
      return res.status(200).json({ success: true });
    }

    if (action === 'complete') {
      const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ txid })
      });
      if (!completeRes.ok) throw new Error(await completeRes.text());
      const paymentData = await completeRes.json();

      // Database Record Update Loop
      if (targetUsername && validatorUsername) {
        const key = `user:${targetUsername.toLowerCase()}`;
        let record: any = await redis.get(key) || {
          username: targetUsername, kycStatus: "PENDING", currentStatus: "PENDING",
          vouchesCount: 0, requiredVouches: 3, vouchesReceived: []
        };
        if (typeof record === 'string') record = JSON.parse(record);

        if (!record.vouchesReceived.includes(validatorUsername)) {
          record.vouchesReceived.push(validatorUsername);
          record.vouchesCount = record.vouchesReceived.length;
          if (record.vouchesCount >= record.requiredVouches) {
            record.kycStatus = "VERIFIED";
            record.currentStatus = "VERIFIED";
          }
          await redis.set(key, JSON.stringify(record));
        }
      }
      return res.status(200).json({ success: true, payment: paymentData });
    }
    return res.status(400).json({ error: "Invalid parameters." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}