// ================== YOUR PLEX SETTINGS ==================
const DEFAULT_SERVER_URL = "http://23.119.50.243:32400";
const DEFAULT_PLEX_TOKEN = "W2SAvvUNygsyESTDtgY_";
// =======================================================

let serverUrl = DEFAULT_SERVER_URL;
let token = DEFAULT_PLEX_TOKEN;

function saveConfig() {
    const inputUrl = document.getElementById('serverUrl').value.trim();
    const inputToken = document.getElementById('plexToken').value.trim();
    if (inputUrl) serverUrl = inputUrl;
    if (inputToken) token = inputToken;
    
    localStorage.setItem('plexConfig', JSON.stringify({serverUrl, token}));
    loadHome();
}

async function apiCall(endpoint) {
    let base = `${serverUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}X-Plex-Token=${token}`;
    
    // Try direct first
    try {
        const res = await fetch(base);
        if (res.ok) return res.text();
    } catch(e) {}

    // Try public proxy as fallback
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=` + encodeURIComponent(base);
        const res = await fetch(proxyUrl);
        if (res.ok) {
            const data = await res.json();
            return data.contents || '';
        }
    } catch(e) {}

    console.error('All connection attempts failed');
    return '<p>Connection failed. Check your Plex server.</p>';
}

function getThumbUrl(thumb) {
    return thumb ? `${serverUrl}${thumb}?X-Plex-Token=${token}` : '';
}

// ================== CORE FUNCTIONS ==================
async function loadHome() {
    await Promise.allSettled([loadContinueWatching(), loadRecentlyAdded(), loadLibraries()]);
}

async function loadContinueWatching() {
    const div = document.getElementById('continueWatching');
    div.innerHTML = '<h2>Continue Watching</h2>';
    const fallbacks = ['/hubs/home/continueWatching', '/library/onDeck'];
    for (let ep of fallbacks) {
        try {
            const xml = await apiCall(ep);
            if (xml.includes('<Video') || xml.includes('<Directory')) {
                renderItems(xml, div, true);
                return;
            }
        } catch(e) {}
    }
    div.innerHTML += '<p>No continue items yet.</p>';
}

async function loadRecentlyAdded() {
    const div = document.getElementById('recentlyAdded');
    div.innerHTML = '<h2>Recently Added</h2>';
    try {
        const xml = await apiCall('/library/recentlyAdded');
        renderItems(xml, div);
    } catch(e) {
        div.innerHTML += '<p>Could not load recently added</p>';
    }
}

async function loadLibraries() {
    const div = document.getElementById('libraries');
    div.innerHTML = '<h2>Libraries</h2>';
    try {
        const xml = await apiCall('/library/sections');
        const doc = new DOMParser().parseFromString(xml, 'text/xml');
        const dirs = doc.querySelectorAll('Directory');
        if (dirs.length === 0) {
            div.innerHTML += '<p>No libraries found.</p>';
            return;
        }
        dirs.forEach(dir => {
            const el = document.createElement('div');
            el.className = 'focusable';
            el.textContent = `📚 ${dir.getAttribute('title')}`;
            el.onclick = () => browseSection(dir.getAttribute('key'));
            div.appendChild(el);
        });
    } catch(e) {
        div.innerHTML += `<p>Error loading libraries.<br>${e.message}</p>`;
    }
}

async function browseSection(key) {
    const div = document.getElementById('browse');
    div.innerHTML = '<h2>Browsing...</h2><button onclick="loadHome()">← Back</button>';
    try {
        const xml = await apiCall(`/library/sections/${key}/all`);
        renderItems(xml, div);
    } catch(e) {}
}

function renderItems(xml, container) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const items = doc.querySelectorAll('Video, Directory, Show, Season, Episode');
    const grid = document.createElement('div');
    grid.className = 'grid';
    items.forEach(item => {
        const title = item.getAttribute('title') || item.getAttribute('grandparentTitle') || 'Untitled';
        const thumb = item.getAttribute('thumb') || item.getAttribute('grandparentThumb') || '';
        const key = item.getAttribute('key');
        const div = document.createElement('div');
        div.className = 'item focusable';
        div.innerHTML = `<img src="${getThumbUrl(thumb)}" onerror="this.style.display='none'"><div class="title">${title}</div>`;
        div.onclick = () => playMedia(key);
        grid.appendChild(div);
    });
    container.appendChild(grid);
}

async function search() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;
    const div = document.getElementById('browse');
    div.innerHTML = `<h2>Results for "${query}"</h2><button onclick="loadHome()">← Back</button>`;
    try {
        const xml = await apiCall(`/search?query=${encodeURIComponent(query)}`);
        renderItems(xml, div);
    } catch(e) {}
}

async function playMedia(key) {
    const video = document.getElementById('videoPlayer');
    let url = `${serverUrl}/library/metadata/${key}/?X-Plex-Token=${token}`;
    video.src = url;
    document.getElementById('main').classList.add('hidden');
    document.getElementById('player').classList.remove('hidden');
    video.play().catch(err => console.error(err));
}

function exitPlayer() {
    const video = document.getElementById('videoPlayer');
    video.pause();
    video.src = '';
    document.getElementById('player').classList.add('hidden');
    document.getElementById('main').classList.remove('hidden');
}

// Auto load when page opens
window.onload = () => {
    document.getElementById('serverUrl').value = serverUrl;
    document.getElementById('plexToken').value = token;
    loadHome();
};