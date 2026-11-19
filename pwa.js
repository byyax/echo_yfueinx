// 注册 Service Worker，让浏览器允许把这个站点"安装"到桌面 / 主屏幕。
// 本地用 file:// 打开时浏览器不支持，会自动跳过。
if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// ===== 手机通知 =====
function requestNotifyPermission() {
  if (!('Notification' in window)) {
    if (typeof showToast === 'function') showToast('当前浏览器不支持通知');
    return Promise.resolve(false);
  }
  if (Notification.permission === 'granted') return Promise.resolve(true);
  if (Notification.permission === 'denied') {
    if (typeof showToast === 'function') showToast('通知权限已被拒绝，请在浏览器设置里允许');
    return Promise.resolve(false);
  }
  return Notification.requestPermission().then(p => {
    if (p === 'granted') return true;
    if (typeof showToast === 'function') showToast('没有开启通知权限');
    return false;
  }).catch(() => false);
}

function notifyIncomingMessage(content, type) {
  if (typeof chatSettings === 'undefined' || !chatSettings.notifications) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!document.hidden) return;

  let body = '';
  if (type === 'text' || type === 'audio' || type === 'image') {
    body = content && content.val ? String(content.val) : '发来一条消息';
  } else if (type === 'redpacket') {
    body = '[红包] ' + ((content && content.note) || '');
  } else if (type === 'transfer') {
    body = '[转账] ¥' + ((content && content.amount) || '0.00');
  } else if (type === 'gift') {
    body = '[礼物] ' + ((content && (content.name || content.val)) || '');
  } else if (type === 'interact') {
    body = '[互动] ' + ((content && content.name) || '');
  } else if (type === 'musicshare' || type === 'musicinvite') {
    body = '[音乐] ' + ((content && content.name) || '');
  } else if (type === 'location') {
    body = '[位置] ' + ((content && content.val) || '');
  } else if (type === 'choice') {
    body = '[选择] ' + ((content && content.title) || '');
  } else {
    body = '发来一条消息';
  }
  if (body.length > 80) body = body.slice(0, 80) + '…';

  const title = (typeof chatSettings !== 'undefined' && chatSettings.otherName) ? chatSettings.otherName : 'Echo';
  const options = {
    body,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'echo-chat',
    renotify: true,
    data: { url: location.href }
  };
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options)).catch(() => {
        try { new Notification(title, options); } catch (e) {}
      });
    } else {
      new Notification(title, options);
    }
  } catch (e) {}
}

window.requestNotifyPermission = requestNotifyPermission;
window.notifyIncomingMessage = notifyIncomingMessage;
