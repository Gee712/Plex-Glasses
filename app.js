let serverUrl = '', token = '';

function saveConfig() {
    serverUrl = document.getElementById('serverUrl').value.trim().replace(/\/$/, '');
    token = document.getElementById('plexToken').value.trim();
    if (!serverUrl || !token) return alert('Enter server URL and token');
    localStorage.setItem('plexConfig', JSON.stringify({serverUrl, token}));
    loadHome();
}

async function apiCall(endpoint) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const url = `${serverUrl}${endpoint}${sep}X-Plex-Token=${token}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
}

function getThumbUrl(thumb) {
    if (!thumb) return '';
    return `${serverUrl}${thumb}?X-Plex-Token=${token}`;
}

async function loadHome() {
    await Promise.all([loadContinueWatching(), loadRecentlyAdded(), loadLibraries()]);
}

async function loadContinueWatching() {
    const div = document.getElementById('continueWatching');
    div.innerHTML = '<h2>Continue Watching</h2>';
    
    const fallbacks = [
        '/hubs/home/continueWatching',
        '/hubs/home/onDeck',
        '/library/onDeck',
        '/hubs/sections/continueWatching'  // another possible path
    ];

    for (let endpoint of fallbacks) {
        try {
            const xml = await apiCall(endpoint);
            const doc = new DOMParser().parseFromString(xml, 'text/xml');
            const items = doc.querySelectorAll('Video, Directory');
            if (items.length > 0) {
                renderItems(xml, div, true);
                return;
            }
        } catch(e) {}
    }
    div.innerHTML += '<p>No continue items yet.<br>Watch something and it will appear here.</p>';
}

async function loadRecentlyAdded() {
    const div = document.getElementById('recentlyAdded'); // we'll add this to HTML
    if (!div) return;
    div.innerHTML = '<h2>Recently Added</h2>';
    try {
        const xml = await apiCall('/library/recentlyAdded');
        renderItems(xml, div);
    } catch(e) {
        div.innerHTML += '<p>Could not load recently added</p>';
    }
}

async function loadLibraries() { /* keep your existing loadLibraries() */ }

// renderItems, search, loadSeasons, loadEpisodes, playMedia, etc. stay the same as last version

// At the bottom, change the load part to:
const saved = localStorage.getItem('plexConfig');
if (saved) {
    const cfg = JSON.parse(saved);
    document.getElementById('serverUrl').value = cfg.serverUrl;
    document.getElementById('plexToken').value = cfg.token;
    serverUrl = cfg.serverUrl;
    token = cfg.token;
    loadHome();   // ← changed to loadHome()
}
