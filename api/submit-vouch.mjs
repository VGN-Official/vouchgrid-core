import { Redis } from '@upstash/redis';

// Initialize the Redis client using the environment variables automatically injected by Vercel
const redis = Redis.fromEnv();

export default async function handler(req, res) {
    // 1. Enforce strict CORS and Method Security
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

try {
        const { targetUsername, validatorUsername } = req.body;

        if (!targetUsername || !validatorUsername) {
            return res.status(400).json({ error: "Missing required parameters." });
        }

        if (targetUsername === validatorUsername) {
            return res.status(400).json({ error: "Security Violation: You cannot vouch for yourself." });
        }

        // 2. Fetch the target user's profile straight from your cloud database
        const dbKey = `user:${targetUsername}`;
        let userProfile = await redis.get(dbKey);
        
        // Handle variations in how the Redis client returns data structures
        if (typeof userProfile === 'string') {
            userProfile = JSON.parse(userProfile);
        }

        if (!userProfile) {
            userProfile = {
                username: targetUsername,
                kycStatus: "PENDING",
                tier: 1,
                vouchesReceived: [],
                requiredVouches: 3
            };
        }

        // 3. Short-circuit if user is already verified
        if (userProfile.kycStatus === "VERIFIED") {
            return res.status(200).json({ 
                message: "Identity is already fully verified and locked.", 
                user: userProfile 
            });
        }

        // 4. Fraud Mitigation: Prevent duplicate vouches from the same validator
        if (userProfile.vouchesReceived.includes(validatorUsername)) {
            return res.status(400).json({ error: "Validation Rejected: You have already vouched for this identity." });
        }

        // 5. Register the new behavioral attestation vouch
    userProfile.vouchesReceived.push(validatorUsername);

        // 6. Autoscaling Trust Engine: Check consensus rules
        if (userProfile.vouchesReceived.length >= userProfile.requiredVouches) {
            userProfile.kycStatus = "VERIFIED";
           userProfile.tier = 2; // Auto-promote user access level tier
        }

        // 7. Atomic Save straight to upstash-kv-teal-cloud memory
        await redis.set(dbKey, JSON.stringify(userProfile));
        return res.status(200).json({
            success: true,
            message: userProfile.kycStatus === "VERIFIED" ? "Identity fully verified via consensus!" : "Vouch recorded successfully.",
            currentStatus: userProfile.kycStatus,
            vouchesCount: userProfile.vouchesReceived.length,
            requiredVouches: userProfile.requiredVouches
        });

    } catch (error) {
        console.error("🔴 VouchGrid Engine Cloud KV Failure:", error);
        return res.status(500).json({ error: "Cloud database processing crash", details: error.message });
    }
}