let serverUrl = '', token = '';

function saveConfig() {
    serverUrl = document.getElementById('serverUrl').value.trim().replace(/\/$/, '');
    token = document.getElementById('plexToken').value.trim();
    if (!serverUrl || !token) return alert('Enter server URL and token');
    localStorage.setItem('plexConfig', JSON.stringify({serverUrl, token}));
    loadHome();
}

async function apiCall(endpoint) {
    let base = `${serverUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}X-Plex-Token=${token}`;
    
    // Try direct first, then CORS proxy
    try {
        console.log('Trying direct:', base);
        const res = await fetch(base);
        if (res.ok) return res.text();
    } catch(e) {
        console.log('Direct failed, trying proxy...');
    }
    
    // Fallback public CORS proxy (for testing only)
    const proxy = `https://corsproxy.io/?` + encodeURIComponent(base);
    console.log('Proxy URL:', proxy);
    const res = await fetch(proxy);
    if (!res.ok) throw new Error(`HTTP ${res.status} - Check console`);
    return res.text();
}

function getThumbUrl(thumb) {
    if (!thumb) return '';
    return `${serverUrl}${thumb}?X-Plex-Token=${token}`;
}

async function loadHome() {
    document.getElementById('libraries').innerHTML = '<h2>Loading libraries...</h2>';
    await Promise.allSettled([loadContinueWatching(), loadRecentlyAdded(), loadLibraries()]);
}

async function loadLibraries() {
    const div = document.getElementById('libraries');
    div.innerHTML = '<h2>Libraries</h2>';
    try {
        const xml = await apiCall('/library/sections');
        console.log('Libraries XML received');
        const doc = new DOMParser().parseFromString(xml, 'text/xml');
        const dirs = doc.querySelectorAll('Directory');
        if (dirs.length === 0) {
            div.innerHTML += '<p>No libraries found. Check Plex server.</p>';
            return;
        }
        dirs.forEach(dir => {
            const title = dir.getAttribute('title');
            const key = dir.getAttribute('key');
            const el = document.createElement('div');
            el.className = 'focusable';
            el.textContent = `📚 ${title}`;
            el.onclick = () => browseSection(key);
            div.appendChild(el);
        });
    } catch(e) {
        console.error(e);
        div.innerHTML += `<p>Error: ${e.message}<br>Check console (F12)</p>`;
    }
}

// Keep the rest of your functions (loadContinueWatching, loadRecentlyAdded, renderItems, search, etc.)
// Just make sure loadHome() is called on load

// Saved config
const saved = localStorage.getItem('plexConfig');
if (saved) {
    const cfg = JSON.parse(saved);
    document.getElementById('serverUrl').value = cfg.serverUrl;
    document.getElementById('plexToken').value = cfg.token;
    serverUrl = cfg.serverUrl;
    token = cfg.token;
    loadHome();
}
