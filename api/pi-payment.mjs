import { Redis } from '@upstash/redis';

// Initialize the data memory layer safely via infrastructure context environment variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const { action, paymentId, txid, targetUsername, validatorUsername, incompleteRecovery } = req.body;
    
    // Hardcoded API Key for testing/production deployment bypass
    const apiKey = "w7cvctqnahva2nqmfw8gjsflu6aue1chhnonoqdoep2chp2pg9wudgnuxxihxvwb";

    try {
        if (action === 'approve') {
            console.log(`[Backend Payments] Approving payment on Pi Blockchain Server for ID: ${paymentId}`);
            
            const approveRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Key ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!approveRes.ok) {
                const errText = await approveRes.text();
                throw new Error(`Pi Server approval rejection: ${errText}`);
            }

            return res.status(200).json({ success: true });

        } else if (action === 'complete') {
            console.log(`[Backend Payments] Completing transaction on Pi Blockchain Server for ID: ${paymentId}`);

            const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Key ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ txid })
            });

            if (!completeRes.ok) {
                const errText = await completeRes.text();
                throw new Error(`Pi Server completion rejection: ${errText}`);
            }

            const platformPaymentData = await completeRes.json();
            console.log(`[Backend Payments] Transaction finalized successfully for TxID: ${txid}`);

            // Skip database writing operations if this is an implicit onIncompletePaymentFound cleaning loop execution
            if (incompleteRecovery) {
                console.log("[Backend Payments] Recovery loop payment clearance routine complete.");
                return res.status(200).json({ success: true, recovered: true });
            }

            // --- PRODUCTION DATA REGISTRY ATTESTATION PERSISTENCE WRITE ---
            if (targetUsername && validatorUsername) {
                const merchantKey = `user:${targetUsername.toLowerCase()}`;
                
                // Fetch current user or create clean layout object schemas matching lookup expectations
                let userRecord = await redis.get(merchantKey);
                if (!userRecord) {
                    userRecord = {
                        username: targetUsername,
                        kycStatus: "PENDING",
                        currentStatus: "PENDING",
                        vouchesCount: 0,
                        requiredVouches: 3,
                        vouchesReceived: []
                    };
                } else if (typeof userRecord === 'string') {
                    userRecord = JSON.parse(userRecord);
                }

                // Append the attestation if not already signed by this validator operator
                if (!userRecord.vouchesReceived.includes(validatorUsername)) {
                    userRecord.vouchesReceived.push(validatorUsername);
                    userRecord.vouchesCount = userRecord.vouchesReceived.length;
                    
                    // Auto-escalate validation status to VERIFIED when reaching consensus weights threshold parameters
                    if (userRecord.vouchesCount >= userRecord.requiredVouches) {
                        userRecord.kycStatus = "VERIFIED";
                        userRecord.currentStatus = "VERIFIED";
                    }

                    // Save transactional records back to Upstash key distribution
                    await redis.set(merchantKey, JSON.stringify(userRecord));
                    console.log(`[Backend Database] Identity ledger updated for @${targetUsername}. Total Attestations: ${userRecord.vouchesCount}`);
                }
            }

            return res.status(200).json({ success: true, payment: platformPaymentData });
        }

        return res.status(400).json({ success: false, error: "Invalid action parameter specified." });

    } catch (error) {
        console.error("[Backend Payments] Runtime exception within payment pipeline:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}