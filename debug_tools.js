// 调试工具：只在控制台使用，不会出现在正常界面里。
// 用法：打开网站 → F12 → 控制台 → 输入 echoDebug.help() 查看命令。
(function () {
  const E = {};
  const say = msg => console.log('[echoDebug]', msg);

  E.help = function () {
    const rows = [
      ['echoDebug.text("内容")', '对方发一条文字'],
      ['echoDebug.gift("礼物名", 价格)', '对方送礼物'],
      ['echoDebug.redpacket("52.00", "备注")', '对方发红包'],
      ['echoDebug.transfer("520.00", "备注")', '对方转账'],
      ['echoDebug.interact("抱抱")', '对方发互动请求'],
      ['echoDebug.location("在你身边(CR)")', '对方发位置'],
      ['echoDebug.musicShare("歌名")', '对方分享歌曲'],
      ['echoDebug.musicInvite("歌名")', '对方邀请一起听'],
      ['echoDebug.choice("标题", ["A", "B"], 1)', '对方发选择卡'],
      ['echoDebug.pat()', '对方拍一拍你'],
      ['echoDebug.network("2G")', '切换网络：WiFi / 5G / 2G'],
      ['echoDebug.offline()', '切成离线，可传 sleep / work / phone_off'],
      ['echoDebug.online()', '切成在线'],
      ['echoDebug.offlineAuto()', '立即发一条离线自动回复'],
      ['echoDebug.offlineReturn()', '立即模拟离线回来'],
      ['echoDebug.networkRecover()', '模拟 2G 恢复并可能补一句'],
      ['echoDebug.typing(true)', '显示“正在输入”，false 收起'],
      ['echoDebug.reply()', '立即随机回一条'],
      ['echoDebug.signature("内容")', '把当前个性签名改成指定内容'],
      ['echoDebug.randomSignature()', '从签名库随机换一条'],
      ['echoDebug.signatureList()', '查看签名库'],
      ['debugMoodSwitch("sad")', '切换情绪（旧命令）'],
      ['debugMoodUpgrade()', '当前情绪升一档（旧命令）']
    ];
    console.table(rows.map(([命令, 作用]) => ({ 命令, 作用 })));
    say('这些消息会真的写进聊天记录，测完可以长按删除。');
  };

  E.text = function (text) {
    sendMessage(String(text == null ? '测试消息' : text), 'text', false);
    return '已发送文字';
  };

  E.gift = function (name, price) {
    const n = String(name || '测试礼物');
    sendMessage({ name: n, icon: '🎁', price: Number(price) || 0, val: '送了你' + n }, 'gift', false);
    return '已发送礼物：' + n;
  };

  E.redpacket = function (amount, note) {
    sendMessage({ amount: String(amount || '52.00'), note: String(note || '测试红包'), isOpened: false }, 'redpacket', false);
    return '已发送红包';
  };

  E.transfer = function (amount, note) {
    sendMessage({ amount: String(amount || '520.00'), note: String(note || '测试转账'), isOpened: false }, 'transfer', false);
    return '已发送转账';
  };

  E.interact = function (name) {
    const n = String(name || '抱抱');
    const pool = (typeof interactLibrary !== 'undefined' && Array.isArray(interactLibrary)) ? interactLibrary : [];
    const it = pool.find(x => x && x.name === n) || { name: n, icon: '💞' };
    sendMessage({ name: it.name, icon: it.icon || '💞', val: '想' + it.name, isOpened: false, interact: true }, 'interact', false);
    return '已发送互动：' + it.name;
  };

  E.location = function (text) {
    sendMessage(String(text || '在你身边(CR)'), 'location', false);
    return '已发送位置';
  };

  E.musicShare = function (title) {
    let t = title;
    if (!t && typeof pickRandomSong === 'function') {
      const s = pickRandomSong();
      t = s && s.title;
    }
    t = t || '测试歌曲';
    sendMessage({ name: t, artist: '测试', val: t, note: '测试分享' }, 'musicshare', false);
    return '已分享歌曲：' + t;
  };

  E.musicInvite = function (title) {
    const t = title ? String(title) : '';
    sendMessage({ name: t, artist: '测试' }, 'musicinvite', false);
    return '已发送一起听邀请';
  };

  E.choice = function (title, options, pickCount) {
    const opts = (Array.isArray(options) ? options : ['选项 A', '选项 B'])
      .map(x => ({ text: String(x) }))
      .filter(x => x.text.trim());
    if (!opts.length) return '至少需要一个选项';
    const pick = Math.max(1, Math.min(Number(pickCount) || 1, opts.length));
    const t = String(title || '帮我选一下');
    sendMessage({ title: t, options: opts, pickCount: pick, chosen: [], val: t }, 'choice', false);
    return '已发送选择卡';
  };

  E.pat = function () {
    if (typeof triggerPat === 'function') {
      triggerPat(false);
      return '已拍一拍';
    }
    return '拍一拍函数不可用';
  };

  E.network = function (mode) {
    const m = String(mode || '2G');
    if (typeof setOtherNetworkMode === 'function') setOtherNetworkMode(m, { silent: false });
    return '网络已切换为 ' + m;
  };

  E.status = function (id, reason) {
    if (typeof STATUS_MAIN === 'undefined' || typeof otherStatus === 'undefined') return '状态函数不可用';
    const s = STATUS_MAIN.find(x => x && x.id === String(id || 'offline')) || STATUS_MAIN[0];
    otherStatus.main = s;
    otherStatus.sub = null;
    if (s.id === 'offline') {
      window.__offlineReason = reason || 'generic';
      if (typeof resetOfflineReturnState === 'function') resetOfflineReturnState();
    }
    if (typeof renderOtherStatus === 'function') renderOtherStatus();
    if (s.id === 'offline' && typeof setOtherNetworkMode === 'function') setOtherNetworkMode('2G', { silent: true });
    return '状态已切换为 ' + s.label;
  };

  E.offline = function (reason) { return E.status('offline', reason); };
  E.online = function () {
    if (typeof setOtherOnline === 'function') { setOtherOnline(); return '已恢复在线'; }
    return '在线函数不可用';
  };

  E.offlineAuto = function () {
    if (typeof sendOfflineAutoReply === 'function') {
      sendOfflineAutoReply();
      return '已尝试发送离线自动回复';
    }
    return '离线自动回复函数不可用';
  };

  E.offlineReturn = function () {
    const reason = window.__offlineReason || 'generic';
    let line = (typeof pickOfflineReturnLine === 'function') ? pickOfflineReturnLine(reason) : '';
    if (!line) {
      const lines = (typeof offlineReplyLines !== 'undefined' && Array.isArray(offlineReplyLines) && offlineReplyLines.length)
        ? offlineReplyLines : ['刚刚没看手机，怎么啦？'];
      line = lines[Math.floor(Math.random() * lines.length)];
    }
    if (Math.random() < 0.55) line += ' ' + (Math.random() < 0.5 ? '😭' : '🥺');
    if (typeof setOtherOnline === 'function') setOtherOnline();
    window.__offlineReason = '';
    if (typeof sendMessage === 'function') sendMessage(line, 'text', false);
    return '已模拟离线回来：' + line;
  };

  E.networkRecover = function () {
    if (typeof setOtherNetworkMode !== 'function') return '网络函数不可用';
    window.__slowNetworkStartedAt = Date.now() - 12000;
    window.__slowNetworkHadUserMsg = true;
    window.__lastNetworkRecoveryAt = 0;
    setOtherNetworkMode('WiFi', { silent: false });
    return '已模拟 2G → WiFi 恢复';
  };

  E.typing = function (on) {
    if (on === false) {
      if (typeof hideTypingIndicator === 'function') hideTypingIndicator();
      return '已收起正在输入';
    }
    if (typeof showTypingIndicator === 'function') showTypingIndicator('测试输入…');
    return '已显示正在输入';
  };

  E.signature = function (text) {
    if (text === undefined || text === null) return E.randomSignature();
    const value = String(text).trim();
    if (!value) return '签名不能为空';
    chatSettings.signature = value;
    saveAllData();
    const sigEl = document.getElementById('signatureBar');
    if (sigEl && sigEl.classList.contains('lyric-bubble')) {
      if (typeof savedSignatureText !== 'undefined') savedSignatureText = value;
    } else if (typeof setSignatureText === 'function') {
      setSignatureText(value);
    } else if (typeof applyChatSettings === 'function') {
      applyChatSettings();
    }
    return '个性签名已更新：' + value;
  };

  E.randomSignature = function () {
    if (typeof changeSignatureNow !== 'function') return '签名函数不可用';
    if (changeSignatureNow()) return '已随机换签名：' + chatSettings.signature;
    return '签名库为空或没有别的签名';
  };

  E.signatureList = function () {
    const list = (typeof signatureLibrary !== 'undefined' && Array.isArray(signatureLibrary)) ? signatureLibrary : [];
    if (!list.length) return '签名库为空';
    list.forEach((item, i) => console.log(i + 1 + '.', item && item.val));
    if (chatSettings && chatSettings.signature) say('当前：' + chatSettings.signature);
    return '共 ' + list.length + ' 条签名';
  };

  E.reply = function () {
    if (typeof randomReply === 'function') { randomReply(); return '已随机回复'; }
    return '随机回复函数不可用';
  };

  window.echoDebug = E;
})();
