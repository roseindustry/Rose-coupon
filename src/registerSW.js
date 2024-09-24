// Define a cache name
const CACHE_NAME = 'rose-coupon-cache-v1';

// List of assets to cache
const CACHE_ASSETS = [
    '/',
    '/index.html',
    '/client-portal', // Your client portal route
    '/assets/img/icon/roseapp-icon.png',
    '/assets/img/icon/playstore.png',
];

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching app shell');
            return cache.addAll(CACHE_ASSETS);
        })
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Cache hit - return the response from the cached version
            if (response) {
                return response;
            }
            // Otherwise, fetch the resource from the network
            return fetch(event.request);
        })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
