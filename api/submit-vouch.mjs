import { Redis } from '@upstash/redis';

// Initialize the Redis client using the environment variables automatically injected by Vercel
const redis = Redis.fromEnv();

export default async function handler(req, res) {
    // 1. Enforce strict CORS and Method Security
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Added Authorization header clearance

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    try {
        const { targetUsername, validatorUsername } = req.body;

        if (!targetUsername || !validatorUsername) {
            return res.status(400).json({ error: "Missing required parameters." });
        }

        // --- NEW: CRYPTOGRAPHIC AUTHENTICATION ENFORCEMENT ---
        // If it is an active submission attempt (not a public search lookup), we verify the token with Pi Servers
        if (validatorUsername !== "PUBLIC_LOOKUP_QUERY") {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: "Security Exception: Unauthenticated session context. Missing token." });
            }

            const accessToken = authHeader.split(' ')[1];

            try {
                // Verify directly with Pi Network's production user profile node
                const piResponse = await fetch('https://api.minepi.com/v2/me', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (!piResponse.ok) {
                    return res.status(401).json({ error: "Security Exception: Pi Network authentication token signature is invalid." });
                }

                const piUser = await piResponse.json();

                // Enforce that the authenticated user username matches the identity signed onto the form field
                if (piUser.username !== validatorUsername) {
                    return res.status(403).json({ error: "Identity Mismatch: Form operator identity does not match your authenticated Pi account." });
                }
            } catch (authErr) {
                console.error("🔴 Server-side Pi handshake crash:", authErr);
                return res.status(501).json({ error: "Upstream token network handshake failed." });
            }
        }
        // --- END OF SECURITY LAYER ---

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

        // --- NEW: PUBLIC LOOKUP BYPASS GUARD ---
        // If this request was only checking status, stop here and return profile state without writing records!
        if (validatorUsername === "PUBLIC_LOOKUP_QUERY") {
            return res.status(200).json({
                success: true,
                currentStatus: userProfile.kycStatus,
                vouchesCount: userProfile.vouchesReceived.length,
                requiredVouches: userProfile.requiredVouches,
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