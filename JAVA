let serverUrl = '', token = '';

function saveConfig() {
    serverUrl = document.getElementById('serverUrl').value.trim().replace(/\/$/, '');
    token = document.getElementById('plexToken').value.trim();
    if (!serverUrl || !token) return alert('Enter server URL and token');
    localStorage.setItem('plexConfig', JSON.stringify({serverUrl, token}));
    loadContinueWatching();
    loadLibraries();
}

async function apiCall(endpoint) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const url = `${serverUrl}${endpoint}${sep}X-Plex-Token=${token}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API error');
    return res.text();
}

function getThumbUrl(thumb) {
    if (!thumb) return '';
    return `${serverUrl}${thumb}?X-Plex-Token=${token}`;
}

async function loadContinueWatching() {
    const div = document.getElementById('continueWatching');
    div.innerHTML = '<h2>Continue Watching</h2>';
    try {
        // Common hub endpoint for Continue Watching / On Deck
        const xml = await apiCall('/hubs/home/continueWatching');
        renderItems(xml, div, true); // true = allow resume
    } catch(e) {
        // Fallback
        try {
            const xml = await apiCall('/library/onDeck');
            renderItems(xml, div, true);
        } catch(e2) { div.innerHTML += '<p>No continue items</p>'; }
    }
}

async function loadLibraries() { /* same as before */ }

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
        const type = item.tagName;

        const div = document.createElement('div');
        div.className = 'item focusable';
        div.innerHTML = `
            <img src="${getThumbUrl(thumb)}" alt="${title}" onerror="this.style.display='none'">
            <div class="title">${title} ${viewOffset > 0 ? '(Resume)' : ''}</div>
        `;
        div.onclick = () => {
            if (type === 'Show' || (type === 'Directory' && item.getAttribute('type') === 'show')) {
                loadSeasons(key);
            } else if (type === 'Season') {
                loadEpisodes(key);
            } else {
                playMedia(key, viewOffset);
            }
        };
        grid.appendChild(div);
    });
    container.appendChild(grid);
}

/* search, loadSeasons, loadEpisodes, browseSection - same as previous version */

async function playMedia(key, offset = 0) {
    const player = document.getElementById('player');
    const video = document.getElementById('videoPlayer');
    
    // Stream URL with resume offset + basic transcode params
    let streamUrl = `${serverUrl}/library/metadata/${key}/?X-Plex-Token=${token}`;
    if (offset > 0) streamUrl += `&offset=${offset}`;
    
    video.src = streamUrl;
    document.getElementById('main').classList.add('hidden');
    player.classList.remove('hidden');
    
    video.play().catch(err => console.error(err));
    
    // Store current key for subtitle menu
    window.currentMediaKey = key;
}

function exitPlayer() {
    const video = document.getElementById('videoPlayer');
    video.pause();
    video.src = '';
    document.getElementById('player').classList.add('hidden');
    document.getElementById('main').classList.remove('hidden');
    document.getElementById('subtitleMenu').classList.add('hidden');
}

async function toggleSubtitles() {
    const menu = document.getElementById('subtitleMenu');
    menu.innerHTML = '<div>Loading subtitles...</div>';
    menu.classList.toggle('hidden');
    
    if (menu.classList.contains('hidden')) return;
    
    try {
        const xml = await apiCall(`/library/metadata/${window.currentMediaKey}`);
        const doc = new DOMParser().parseFromString(xml, 'text/xml');
        const streams = doc.querySelectorAll('Stream[streamType="3"]'); // Subtitle streams
        
        menu.innerHTML = '<div onclick="setSubtitle(0)">None</div>';
        streams.forEach((s, i) => {
            const lang = s.getAttribute('language') || 'Unknown';
            const id = s.getAttribute('id');
            const div = document.createElement('div');
            div.textContent = lang + (s.getAttribute('selected') === '1' ? ' (current)' : '');
            div.onclick = () => setSubtitle(id);
            menu.appendChild(div);
        });
    } catch(e) { menu.innerHTML = '<div>Error loading subs</div>'; }
}

function setSubtitle(streamId) {
    // Reload player with subtitle param (Plex transcode)
    const video = document.getElementById('videoPlayer');
    const currentTime = video.currentTime;
    const key = window.currentMediaKey;
    
    let url = `${serverUrl}/library/metadata/${key}/?X-Plex-Token=${token}&subtitleStreamID=${streamId}`;
    video.src = url;
    video.currentTime = currentTime;
    video.play();
    document.getElementById('subtitleMenu').classList.add('hidden');
}

// Load saved config and initial data
const saved = localStorage.getItem('plexConfig');
if (saved) {
    const cfg = JSON.parse(saved);
    document.getElementById('serverUrl').value = cfg.serverUrl;
    document.getElementById('plexToken').value = cfg.token;
    serverUrl = cfg.serverUrl;
    token = cfg.token;
    loadContinueWatching();
    loadLibraries();
}
