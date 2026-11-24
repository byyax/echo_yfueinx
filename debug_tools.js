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
      ['echoDebug.interactReply("accept", "抱抱")', '直接发一条接受后续内置文案'],
      ['echoDebug.interactReply("reject", "抱抱")', '直接发一条拒绝后续内置文案'],
      ['echoDebug.location("在你身边(CR)")', '对方发位置'],
      ['echoDebug.musicShare("歌名")', '对方分享歌曲'],
      ['echoDebug.sharePlayable("歌名")', '对方发一张可播放音乐卡'],
      ['echoDebug.shareLyric("歌名")', '对方发一张只分享歌词的音乐卡'],
      ['echoDebug.musicInvite("歌名")', '对方邀请一起听'],
      ['echoDebug.choice("标题", ["A", "B"], 1)', '对方发选择卡'],
      ['echoDebug.pat()', '对方拍一拍你'],
      ['echoDebug.network("2G")', '切换网络：WiFi / 5G / 2G'],
      ['echoDebug.offline()', '切成离线，可传 sleep / work / phone_off'],
      ['echoDebug.status("offline", "sleep")', '直接切换对方主状态'],
      ['echoDebug.online()', '切成在线'],
      ['echoDebug.offlineAuto()', '立即发一条离线自动回复'],
      ['echoDebug.offlineReturn()', '立即模拟离线回来'],
      ['echoDebug.networkRecover()', '模拟 2G 恢复并可能补一句'],
      ['echoDebug.typing(true)', '显示“正在输入”，false 收起'],
      ['echoDebug.reply()', '立即随机回一条'],
      ['echoDebug.image(22, 11)', '按 22 点、11 月随机发一张内置图片卡'],
      ['echoDebug.imageFile("bath_06_night.svg")', '强制发指定内置图片卡'],
      ['echoDebug.images()', '查看内置图片、时段和配文数量'],
      ['echoDebug.captions("bath_06_night.svg")', '查看某张图片的全部配文'],
      ['echoDebug.signature("内容")', '把当前个性签名改成指定内容'],
      ['echoDebug.randomSignature()', '从签名库随机换一条'],
      ['echoDebug.signatureList()', '查看签名库'],
      ['debugMoodSwitch("sad")', '切换情绪（旧命令）'],
      ['debugMoodUpgrade()', '当前情绪升一档（旧命令）'],
      ['debugMoodSample("happy", 20)', '批量查看某档情绪文案'],
      ['debugMoodWeights()', '查看当前情绪权重'],
      ['debugLateNightMood()', '触发熬夜情绪']
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

  E.interactReply = function (kind, name) {
    const k = String(kind || 'accept').toLowerCase() === 'reject' ? 'reject' : 'accept';
    if (typeof INTERACT_ACCEPT_REPLIES === 'undefined' || typeof INTERACT_REJECT_REPLIES === 'undefined') {
      return '互动后续文案文件没有加载';
    }
    const table = k === 'reject' ? INTERACT_REJECT_REPLIES : INTERACT_ACCEPT_REPLIES;
    const n = String(name || '抱抱');
    const pool = (table[n] && table[n].length) ? table[n] : table.default;
    const line = pool[Math.floor(Math.random() * pool.length)];
    sendMessage(line, 'text', false);
    return '已发送' + (k === 'reject' ? '拒绝' : '接受') + '后续：' + line;
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

  E.sharePlayable = function (title) {
    const list = (typeof MUSIC_PLAYLIST !== 'undefined' && Array.isArray(MUSIC_PLAYLIST))
      ? MUSIC_PLAYLIST.filter(s => s && s.kind !== 'book' && s.src)
      : [];
    let song = null;
    const q = title == null ? '' : String(title).trim();
    if (q) song = list.find(s => s.title === q) || list.find(s => s.title.includes(q));
    if (!song && typeof pickRandomSong === 'function') song = pickRandomSong();
    if (!song) return '没有可播放歌曲';
    sendMessage({ name: song.title, artist: song.artist, val: song.title, note: '测试分享' }, 'musicshare', false);
    return '已分享可播放音乐：' + song.title;
  };

  E.shareLyric = function (title) {
    const list = (typeof SHARE_ONLY_SONGS !== 'undefined' && Array.isArray(SHARE_ONLY_SONGS))
      ? SHARE_ONLY_SONGS
      : [];
    if (!list.length) return 'share_songs.js 还没有歌';
    let song = null;
    const q = title == null ? '' : String(title).trim();
    if (q) song = list.find(s => s && s.title === q) || list.find(s => s && s.title.includes(q));
    if (!song) song = list[Math.floor(Math.random() * list.length)];
    if (!song) return '没有找到这首歌';
    sendMessage({
      name: song.title,
      artist: song.artist || '分享',
      lyric: song.lyric || '',
      noPlay: true,
      val: song.title
    }, 'musicshare', false);
    return '已分享歌词卡：' + song.title;
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

  E.image = function (hour, month, day) {
    if (typeof sendRandomSvgImage !== 'function') return '内置图片函数不可用';
    const h = hour == null ? new Date().getHours() : Number(hour);
    const ok = sendRandomSvgImage({ hour: h, month, day, ignoreCooldown: true });
    if (!ok) return '没有符合这个时间的图片';
    const file = (typeof lastSvgImageFile !== 'undefined') ? lastSvgImageFile : '';
    return '已发送内置图片：' + file;
  };

  E.imageFile = function (file, caption) {
    if (typeof sendRandomSvgImage !== 'function') return '内置图片函数不可用';
    const name = String(file || '').trim();
    if (!name) return '用法：echoDebug.imageFile("bath_06_night.svg")';
    const ok = sendRandomSvgImage({ file: name, caption, ignoreCooldown: true });
    return ok ? '已发送内置图片：' + name : '找不到这张图片：' + name;
  };

  E.images = function () {
    if (typeof IMAGE_SVG_CATALOG === 'undefined' || !Array.isArray(IMAGE_SVG_CATALOG)) return '图片目录不可用';
    const rows = IMAGE_SVG_CATALOG.map(item => {
      const times = item.times
        ? Object.keys(item.times).filter(k => item.times[k] > 0).map(k => k + ':' + item.times[k]).join(' ')
        : '全天';
      const months = item.months
        ? Object.keys(item.months).filter(k => item.months[k] > 0).map(k => k + ':' + item.months[k]).join(' ')
        : '全年';
      const week = (item.weekday != null || item.weekend != null)
        ? `工作日:${item.weekday || 0} 周末:${item.weekend || 0}`
        : '不限';
      return {
        文件: item.file,
        分类: item.category,
        天气: item.weather || '',
        月份权重: months,
        星期权重: week,
        时段权重: times,
        配文数: (item.captions || []).length
      };
    });
    console.table(rows);
    return '共 ' + rows.length + ' 张内置图片';
  };

  E.captions = function (file) {
    if (typeof findSvgImageEntry !== 'function') return '图片目录不可用';
    const entry = findSvgImageEntry(file);
    if (!entry) return '找不到这张图片：' + String(file || '');
    const list = entry.captions || [];
    list.forEach((text, i) => console.log(i + 1 + '.', text));
    if (!list.length) return '这张图还没有配文';
    return entry.file + ' 共 ' + list.length + ' 条配文';
  };

  window.echoDebug = E;
})();
