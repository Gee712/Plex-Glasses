// ================== YOUR SETTINGS (EDIT THESE) ==================
const DEFAULT_SERVER_URL = "https://23.119.50.243:32400";   // ← Change to your IP
const DEFAULT_PLEX_TOKEN = "W2SAvvUNygsyESTDtgY_"; // ← Paste your full token here
// ================================================================

let serverUrl = DEFAULT_SERVER_URL;
let token = DEFAULT_PLEX_TOKEN;

function saveConfig() {
    // Optional: still allow manual override
    const inputUrl = document.getElementById('serverUrl').value.trim();
    const inputToken = document.getElementById('plexToken').value.trim();
    if (inputUrl) serverUrl = inputUrl;
    if (inputToken) token = inputToken;
    
    localStorage.setItem('plexConfig', JSON.stringify({serverUrl, token}));
    loadHome();
}

// Rest of the code stays the same (I kept it short & clean)
async function apiCall(endpoint) {
    let base = `${serverUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}X-Plex-Token=${token}`;
    try {
        const res = await fetch(base);
        if (res.ok) return res.text();
    } catch(e) {}
    // Fallback proxy
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=` + encodeURIComponent(base);
        const res = await fetch(proxyUrl);
        if (res.ok) {
            const data = await res.json();
            return data.contents || '';
        }
    } catch(e) {}
    throw new Error('Connection failed');
}

// ... (the rest of the previous working functions: loadHome, loadLibraries, etc.)

// Auto-load on start
window.onload = () => {
    document.getElementById('serverUrl').value = serverUrl;
    document.getElementById('plexToken').value = token;
    loadHome();
};
