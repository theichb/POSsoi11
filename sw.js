// Counter — app-shell service worker.
// Only caches the shell (this app's own HTML/CSS/JS/icons) so the app
// installs and opens instantly, even on a flaky connection. It never
// touches Supabase, fonts, or the Supabase JS CDN script — those always
// go straight to the network, since sales/stock data has to be live.
var CACHE_NAME = "counter-shell-v1";
var SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache){ return cache.addAll(SHELL_FILES); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_NAME; })
             .map(function(n){ return caches.delete(n); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(event){
  var req = event.request;
  if(req.method !== "GET") return;

  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return; // let Supabase/CDN/fonts pass through untouched

  // Network-first for the app shell, so a redeploy is picked up as soon
  // as there's a connection; fall back to the cached copy when offline.
  event.respondWith(
    fetch(req).then(function(res){
      var copy = res.clone();
      caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
      return res;
    }).catch(function(){
      return caches.match(req).then(function(cached){
        return cached || caches.match("./index.html");
      });
    })
  );
});
