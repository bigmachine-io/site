const PRECACHE = 'pre-cache';
const RUNTIME = 'runtime-cache';

// A list of local resources we always want to be cached.
const PRECACHE_URLS = [
  '/offline/'
];

const OFFLINE_URL = [
  '/offline/'
]

// The install handler takes care of precaching the resources we always need.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())
  );
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener('activate', event => {
  const currentCaches = [PRECACHE, RUNTIME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// The fetch handler serves responses for same-origin resources from a cache.
// If no response is found, it populates the runtime cache with the response
// from the network before returning it to the page.
self.addEventListener('fetch', event => {
  // Skip cross-origin requests, like those for Google Analytics.
  if (event.request.url.startsWith(self.location.origin)) {

    // Exclude certain paths from caching
    if ( event.request.url.includes('/ghost') || // Ghost Admin
      event.request.url.includes('/signin') ||   // Signin Page
      event.request.url.includes('/signup') ||   // Signin Page
      event.request.url.includes('/account') ||  // Signin Page
      event.request.url.includes('/members') )   // Members  
    {
      return false
    }

    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        return caches.open(RUNTIME).then(cache => {
          return fetch(event.request).then(response => {
            // Put a copy of the response in the runtime cache.
            return cache.put(event.request, response.clone()).then(() => {
              return response;
            });
          }).catch(error => {
            if (cachedResponse) {
              return cachedResponse;
            } else {
              // Check if the user is offline first and is trying to navigate to a web page
              return caches.match(OFFLINE_URL);
            }
          });
        });
      })
    );
  }
});