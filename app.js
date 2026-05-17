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
    
    try {
        const res = await fetch(base);
        if (res.ok) return res.text();
    } catch(e) { console.log('Direct failed, using proxy'); }
    
    const proxyUrl = `https://corsproxy.io/?` + encodeURIComponent(base);
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
}

function getThumbUrl(thumb) {
    return thumb ? `${serverUrl}${thumb}?X-Plex-Token=${token}` : '';
}

async function loadHome() {
    await Promise.allSettled([loadContinueWatching(), loadRecentlyAdded(), loadLibraries()]);
}

async function loadContinueWatching() {
    const div = document.getElementById('continueWatching');
    div.innerHTML = '<h2>Continue Watching</h2>';
    const fallbacks = ['/hubs/home/continueWatching', '/library/onDeck', '/hubs/home/onDeck'];
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
        div.innerHTML += `<p>Error: ${e.message}</p>`;
    }
}

async function browseSection(sectionKey) {
    const browseDiv = document.getElementById('browse');
    browseDiv.innerHTML = '<h2>Browsing...</h2><button onclick="loadHome()">← Back</button>';
    try {
        const xml = await apiCall(`/library/sections/${sectionKey}/all`);
        renderItems(xml, browseDiv);
    } catch(e) {}
}

function renderItems(xml, container, isContinue = false) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const items = doc.querySelectorAll('Video, Directory, Show, Season, Episode');
    const grid = document.createElement('div');
    grid.className = 'grid';
    items.forEach(item => {
        const title = item.getAttribute('title') || item.getAttribute('grandparentTitle') || 'Untitled';
        const thumb = item.getAttribute('thumb') || item.getAttribute('grandparentThumb') || '';
        const key = item.getAttribute('key');
        const viewOffset = parseInt(item.getAttribute('viewOffset') || '0');
        const type = item.tagName.toLowerCase();

        const div = document.createElement('div');
        div.className = 'item focusable';
        div.innerHTML = `<img src="${getThumbUrl(thumb)}" onerror="this.style.display='none'"><div class="title">${title}${viewOffset > 0 ? ' (Resume)' : ''}</div>`;
        div.onclick = () => {
            if (type === 'show') loadSeasons(key);
            else if (type === 'season') loadEpisodes(key);
            else playMedia(key, viewOffset);
        };
        grid.appendChild(div);
    });
    container.appendChild(grid);
}

async function search() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;
    const browseDiv = document.getElementById('browse');
    browseDiv.innerHTML = `<h2>Results for "${query}"</h2><button onclick="loadHome()">← Back</button>`;
    try {
        const xml = await apiCall(`/search?query=${encodeURIComponent(query)}`);
        renderItems(xml, browseDiv);
    } catch(e) {}
}

async function loadSeasons(showKey) {
    const browseDiv = document.getElementById('browse');
    browseDiv.innerHTML = '<h2>Seasons</h2><button onclick="loadHome()">← Back</button>';
    try { 
        const xml = await apiCall(`/library/metadata/${showKey}/children`); 
        renderItems(xml, browseDiv); 
    } catch(e) {}
}

async function loadEpisodes(seasonKey) {
    const browseDiv = document.getElementById('browse');
    browseDiv.innerHTML = '<h2>Episodes</h2><button onclick="loadHome()">← Back</button>';
    try { 
        const xml = await apiCall(`/library/metadata/${seasonKey}/children`); 
        renderItems(xml, browseDiv); 
    } catch(e) {}
}

async function playMedia(key, offset = 0) {
    const video = document.getElementById('videoPlayer');
    let url = `${serverUrl}/library/metadata/${key}/?X-Plex-Token=${token}`;
    if (offset > 0) url += `&offset=${offset}`;
    video.src = url;
    document.getElementById('main').classList.add('hidden');
    document.getElementById('player').classList.remove('hidden');
    video.play();
    window.currentMediaKey = key;
}

function exitPlayer() {
    const video = document.getElementById('videoPlayer');
    video.pause(); 
    video.src = '';
    document.getElementById('player').classList.add('hidden');
    document.getElementById('main').classList.remove('hidden');
}

async function toggleSubtitles() { 
    alert('Subtitles coming soon'); 
}

// Load saved config
const saved = localStorage.getItem('plexConfig');
if (saved) {
    const cfg = JSON.parse(saved);
    document.getElementById('serverUrl').value = cfg.serverUrl;
    document.getElementById('plexToken').value = cfg.token;
    serverUrl = cfg.serverUrl;
    token = cfg.token;
    loadHome();
}
