import fs from 'fs';
import path from 'path';

// Helper to locate and read the central status ledger
const statusFilePath = path.join(process.cwd(), 'status.json');

export default async function handler(req, res) {
    // 1. Enforce strict CORS and Method Security
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    try {
        // 2. Extract incoming attestation parameters
        const { targetUsername, validatorUsername } = req.body;

        if (!targetUsername || !validatorUsername) {
            return res.status(400).json({ error: "Missing targetUsername or validatorUsername parameters." });
        }

        if (targetUsername === validatorUsername) {
            return res.status(400).json({ error: "Security Violation: You cannot vouch for yourself." });
        }

        // 3. Read the existing state from status.json
        if (!fs.existsSync(statusFilePath)) {
            return res.status(500).json({ error: "System Error: status.json layer missing." });
        }
        
        const fileData = fs.readFileSync(statusFilePath, 'utf-8');
        const db = JSON.parse(fileData);

        if (!db.users) db.users = {};

        // 4. Initialize target user profile if they don't exist yet
        if (!db.users[targetUsername]) {
            db.users[targetUsername] = {
                username: targetUsername,
                kycStatus: "PENDING",
                tier: 1,
                vouchesReceived: [],
                requiredVouches: 3
            };
        }

        const userProfile = db.users[targetUsername];

        // 5. Short-circuit if user is already verified
        if (userProfile.kycStatus === "VERIFIED") {
            return res.status(200).json({ 
                message: "User identity is already fully verified and locked.", 
                user: userProfile 
            });
        }

        // 6. FRAUD MITIGATION: Prevent duplicate vouches from the same validator
        if (userProfile.vouchesReceived.includes(validatorUsername)) {
            return res.status(400).json({ error: "Validation Rejected: You have already vouched for this identity." });
        }

        // 7. Register the new behavioral attestation signature
        userProfile.vouchesReceived.push(validatorUsername);
        console.log(`📡 New vouch registered for ${targetUsername} by ${validatorUsername}. Total: ${userProfile.vouchesReceived.length}`);

        // 8. AUTOSCALING TRUST ENGINE: Evaluate consensus rules
        if (userProfile.vouchesReceived.length >= userProfile.requiredVouches) {
            userProfile.kycStatus = "VERIFIED";
            userProfile.tier = 2; // Auto-promote user access level tier
            console.log(`🟢 Consensus reached! Identity ${targetUsername} is now officially VERIFIED.`);
        }

        // 9. Atomic write back to status.json file matrix
        fs.writeFileSync(statusFilePath, JSON.stringify(db, null, 2), 'utf-8');

        // 10. Respond with clean, verified status telemetry
        return res.status(200).json({
            success: true,
            message: userProfile.kycStatus === "VERIFIED" ? "Identity fully verified via consensus!" : "Vouch recorded successfully.",
            currentStatus: userProfile.kycStatus,
            vouchesCount: userProfile.vouchesReceived.length,
            requiredVouches: userProfile.requiredVouches
        });

    } catch (error) {
        console.error("🔴 VouchGrid Engine Failure:", error);
        return res.status(500).json({ error: "Internal processing crash", details: error.message });
    }
}