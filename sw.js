/* Alterna: офлайн одной страницы.
   Стратегия "кэш с проверкой в фоне": страница отдаётся из кэша сразу, а
   свежая версия скачивается параллельно и кладётся на следующий запуск.
   Сетевая гонка со ждущим сетевым запросом на трёхмегабайтном файле делала
   офлайн бесполезным: на медленной связи человек ждал всё равно. */
var VER="2026.09.28.2051";
var CACHE="alterna-"+VER;

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    /* кладём только сам документ: "./" и "./index.html" на GitHub Pages это
       один и тот же трёхмегабайтный ответ, и класть его дважды незачем */
    return c.add("./index.html").catch(function(){ return c.add("./").catch(function(){ return null; }); });
  }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){
      return (k===CACHE)? null : caches.delete(k);
    }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  var req=e.request;
  if(req.method!=="GET") return;
  var url;
  try{ url=new URL(req.url); }catch(err){ return; }
  if(url.origin!==self.location.origin) return;
  e.respondWith(
    caches.match(req).then(function(hit){
      var net=fetch(req).then(function(res){
        if(res && res.status===200 && res.type==="basic"){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){ try{ c.put(req, copy); }catch(err){} });
        }
        return res;
      }).catch(function(){ return null; });
      if(hit){
        /* обновление скачается в фоне и встанет при следующем открытии */
        return hit;
      }
      return net.then(function(res){
        if(res) return res;
        return caches.match("./index.html").then(function(h2){
          return h2 || new Response("", {status:504});
        });
      });
    })
  );
});
