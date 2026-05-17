// ================== YOUR PLEX SETTINGS ==================
const DEFAULT_SERVER_URL = "https://23.119.50.243:32400";
const DEFAULT_PLEX_TOKEN = "W2SAvvUNygsyESTDtgY_";
// =======================================================

let serverUrl = DEFAULT_SERVER_URL;
let token = DEFAULT_PLEX_TOKEN;

async function apiCall(endpoint) {
    let base = `${serverUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}X-Plex-Token=${token}`;
    try {
        const res = await fetch(base);
        if (res.ok) return res.text();
    } catch(e) {}
    return '<p>Connection failed</p>';
}

function getThumbUrl(thumb) {
    return thumb ? `${serverUrl}${thumb}?X-Plex-Token=${token}` : '';
}

async function loadHome() {
    await Promise.allSettled([loadRecentlyAdded(), loadLibraries()]);
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
            const el = document.createElement('div');
            el.className = 'focusable';
            el.textContent = `📚 ${dir.getAttribute('title')}`;
            el.onclick = () => browseSection(dir.getAttribute('key'));
            div.appendChild(el);
        });
    } catch(e) {
        div.innerHTML += '<p>Error loading libraries</p>';
    }
}

async function browseSection(key) {
    const div = document.getElementById('browse');
    div.innerHTML = '<h2>Loading content...</h2><button onclick="loadHome()">← Back to Home</button>';
    try {
        const xml = await apiCall(`/library/sections/${key}/all`);
        renderItems(xml, div);
    } catch(e) {
        div.innerHTML += '<p>Failed to load</p>';
    }
}

function renderItems(xml, container) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const items = doc.querySelectorAll('Video, Directory, Show, Season, Episode');
    const grid = document.createElement('div');
    grid.className = 'grid';

    items.forEach(item => {
        const title = item.getAttribute('title') || 'Untitled';
        const thumb = item.getAttribute('thumb') || '';
        const key = item.getAttribute('key');
        const div = document.createElement('div');
        div.className = 'item focusable';
        div.innerHTML = `<img src="${getThumbUrl(thumb)}" onerror="this.style.display='none'"><div class="title">${title}</div>`;
        div.onclick = () => playMedia(key);
        grid.appendChild(div);
    });
    container.appendChild(grid);
}

async function playMedia(key) {
    const video = document.getElementById('videoPlayer');
    video.src = `${serverUrl}/library/metadata/${key}/?X-Plex-Token=${token}`;
    document.getElementById('main').classList.add('hidden');
    document.getElementById('player').classList.remove('hidden');
    video.play();
}

function exitPlayer() {
    const video = document.getElementById('videoPlayer');
    video.pause(); video.src = '';
    document.getElementById('player').classList.add('hidden');
    document.getElementById('main').classList.remove('hidden');
}

// Start the app
window.onload = loadHome;
