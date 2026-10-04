// Minimal service worker: makes the site installable and shows a friendly page when offline.
// Record data is never cached — it always comes live from Supabase.
const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f3f1ec;color:#1a1c1e;padding:16px;text-align:center}
@media (prefers-color-scheme:dark){body{background:#121416;color:#ecebe7}}button{margin-top:16px;padding:10px 18px;border:0;border-radius:6px;background:#01411C;color:#fff;font:inherit}</style></head>
<body><div><h1 style="font-size:20px">You are offline</h1><p>Connect to the internet to view or submit records.</p><button onclick="location.reload()">Try again</button></div></body></html>`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    )
  );
});
