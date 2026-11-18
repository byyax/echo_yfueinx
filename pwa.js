// 注册 Service Worker，让浏览器允许把这个站点"安装"到桌面 / 主屏幕。
// 本地用 file:// 打开时浏览器不支持，会自动跳过。
if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
