/* Alterna: офлайн-кэш одной страницы.
   Стратегия «сначала сеть, потом кэш»: свежая версия всегда побеждает,
   но без сети открывается последняя сохранённая. */
var CACHE="alterna-v1";
var CORE=["./","./index.html"];

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    return c.addAll(CORE).catch(function(){ return null; });
  }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ return (k===CACHE)? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  var req=e.request;
  if(req.method!=="GET") return;
  var url;
  try{ url=new URL(req.url); }catch(err){ return; }
  if(url.origin!==self.location.origin) return;
  e.respondWith(
    fetch(req).then(function(res){
      if(res && res.status===200 && res.type==="basic"){
        var copy=res.clone();
        caches.open(CACHE).then(function(c){ try{ c.put(req, copy); }catch(err){} });
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(hit){
        if(hit) return hit;
        return caches.match("./index.html").then(function(h2){
          return h2 || new Response("", {status:504});
        });
      });
    })
  );
});
