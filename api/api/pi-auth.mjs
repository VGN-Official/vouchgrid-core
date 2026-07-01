// POST /api/pi-auth
app.post('/api/pi-auth', async (req, res) => {
    try {
        const { accessToken } = req.body;
        
        if (!accessToken) {
            return res.status(400).json({ success: false, error: "Missing authentication access token parameters." });
        }

        console.log("[Backend Auth] Handshaking with Pi Network Server Layer...");
        
        // Execute direct external authorization validation lookup
        const piNetworkResponse = await fetch('https://api.minepi.com/v2/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!piNetworkResponse.ok) {
            const errorDetails = await piNetworkResponse.text();
            console.error("[Backend Auth] Pi Network signature authentication verification refused:", errorDetails);
            return res.status(401).json({ success: false, error: "Invalid or expired Pi signature credential." });
        }

        const piUserData = await piNetworkResponse.json();
        console.log(`[Backend Auth] Identity validation clear for: @${piUserData.username}`);

        // Return validated profile response context to frontend
        return res.status(200).json({
            success: true,
            username: piUserData.username,
            uid: piUserData.uid
        });

    } catch (error) {
        console.error("[Backend Auth] Intercepted runtime authentication failure loop:", error);
        return res.status(500).json({ success: false, error: "Internal session identity pipeline failure." });
    }
});