// Service Worker for NITH Results - Performance Optimization
// Version 1.0.0

const CACHE_NAME = 'nith-results-v1';
const STATIC_CACHE = 'nith-static-v1';
const API_CACHE = 'nith-api-v1';

// Assets to cache immediately
const PRECACHE_ASSETS = [
    '/',
    '/static/css/styles.css',
    '/static/js/script.js',
    '/favicon.ico',
    '/static/assets/og-image.png'
];

// Install event - precache critical assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Precaching static assets');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => {
                        return cacheName !== STATIC_CACHE && 
                               cacheName !== API_CACHE;
                    })
                    .map((cacheName) => {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // API requests - Network first, then cache
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/documents')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Clone response before caching
                    const responseClone = response.clone();
                    caches.open(API_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if network fails
                    return caches.match(request);
                })
        );
        return;
    }

    // Static assets - Cache first, then network
    if (url.pathname.startsWith('/static/') || 
        url.pathname === '/' ||
        url.pathname === '/favicon.ico' ||
        url.pathname === '/robots.txt' ||
        url.pathname === '/sitemap.xml') {
        
        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        // Return cached version and update in background
                        fetch(request).then((response) => {
                            caches.open(STATIC_CACHE).then((cache) => {
                                cache.put(request, response);
                            });
                        });
                        return cachedResponse;
                    }
                    
                    // Not in cache, fetch from network
                    return fetch(request).then((response) => {
                        return caches.open(STATIC_CACHE).then((cache) => {
                            cache.put(request, response.clone());
                            return response;
                        });
                    });
                })
        );
        return;
    }

    // For everything else, just fetch from network
    event.respondWith(fetch(request));
});

// Background sync for offline data collection (future enhancement)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-results') {
        console.log('[SW] Background sync triggered');
        // Handle background sync
    }
});

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');
    // Handle push notifications
});
