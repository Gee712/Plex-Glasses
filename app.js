// ================== YOUR PLEX SETTINGS ==================
const DEFAULT_SERVER_URL = "http://192.168.1.66:32400";
const DEFAULT_PLEX_TOKEN = "W2SAvvUNygsyESTDtgY_";
// =======================================================

let serverUrl = DEFAULT_SERVER_URL;
let token = DEFAULT_PLEX_TOKEN;

async function apiCall(endpoint) {
    let base = `${serverUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}X-Plex-Token=${token}`;
    console.log("API Call:", base);
    
    try {
        const res = await fetch(base);
        console.log("Status:", res.status);
        if (res.ok) {
            const text = await res.text();
            console.log("Response received");
            return text;
        } else {
            return `<p>Server error ${res.status}</p>`;
        }
    } catch(e) {
        console.error("Fetch error:", e);
        return `<p>Connection error: ${e.message}</p>`;
    }
}

async function loadHome() {
    document.getElementById('recentlyAdded').innerHTML = '<h2>Recently Added</h2><p>Loading...</p>';
    document.getElementById('libraries').innerHTML = '<h2>Libraries</h2><p>Loading...</p>';
    
    await Promise.allSettled([loadRecentlyAdded(), loadLibraries()]);
}

async function loadRecentlyAdded() {
    const div = document.getElementById('recentlyAdded');
    try {
        const xml = await apiCall('/library/recentlyAdded');
        if (xml.includes('<Video') || xml.includes('<Directory')) {
            renderItems(xml, div);
        } else {
            div.innerHTML += '<p>No recently added items</p>';
        }
    } catch(e) {
        div.innerHTML += '<p>Error loading recently added</p>';
    }
}

async function loadLibraries() {
    const div = document.getElementById('libraries');
    try {
        const xml = await apiCall('/library/sections');
        const doc = new DOMParser().parseFromString(xml, 'text/xml');
        const dirs = doc.querySelectorAll('Directory');
        
        if (dirs.length === 0) {
            div.innerHTML += '<p>No libraries found. Check Plex server.</p>';
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
        div.innerHTML += `<p>Error: ${e.message}</p>`;
    }
}

// Keep the rest of your functions (renderItems, browseSection, playMedia, etc.)
// ... paste the rest from previous version here if needed

window.onload = loadHome;
