// 极简 Service Worker：只为满足 Chrome / Edge 的"可安装"条件。
// 不缓存任何资源，所以每次打开都是最新的；离线时也照常走网络失败。
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
