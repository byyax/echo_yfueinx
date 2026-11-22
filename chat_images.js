// ===== 内置 SVG 发图系统 =====
// 图片都是 image_svg/ 里的本地 SVG，不走上传图库。
// 入口：randomReply() 的“图片事件”分支；整体图片概率低于互动，内置 SVG 再占图片事件的一小部分。

const IMAGE_SVG_BASE = 'image_svg/';
const IMAGE_SVG_COOLDOWN_MS = 8 * 60 * 1000; // 8 分钟内不再发内置 SVG，避免刷图

// 分类权重：食物/散步最多，天气和房间次之，桌宠最少
const IMAGE_SVG_CATEGORY_WEIGHTS = {
  weather: 0.16,
  scenery: 0.19,
  food: 0.18,
  fruit: 0.06,
  drink: 0.11,
  room: 0.14,
  home: 0.05,
  desk: 0.07,
  pet: 0.04
};

// 月份 → 天气权重（北半球默认）。权重为 0 的天气不会出现。
// 夏天 6–8 月雪为 0；冬天雷雨为 0。
const WEATHER_MONTH_WEIGHTS = {
  1:  { sunny: 8,  overcast: 18, rain_light: 8,  rain_medium: 4,  rain_heavy: 2,  thunderstorm: 0,  snow_light: 20, snow_heavy: 18 },
  2:  { sunny: 10, overcast: 18, rain_light: 10, rain_medium: 5,  rain_heavy: 2,  thunderstorm: 0,  snow_light: 16, snow_heavy: 12 },
  3:  { sunny: 18, overcast: 16, rain_light: 16, rain_medium: 8,  rain_heavy: 3,  thunderstorm: 1,  snow_light: 4,  snow_heavy: 0 },
  4:  { sunny: 22, overcast: 14, rain_light: 18, rain_medium: 10, rain_heavy: 4,  thunderstorm: 3,  snow_light: 1,  snow_heavy: 0 },
  5:  { sunny: 24, overcast: 12, rain_light: 20, rain_medium: 12, rain_heavy: 6,  thunderstorm: 6,  snow_light: 0,  snow_heavy: 0 },
  6:  { sunny: 22, overcast: 10, rain_light: 18, rain_medium: 16, rain_heavy: 10, thunderstorm: 12, snow_light: 0,  snow_heavy: 0 },
  7:  { sunny: 20, overcast: 8,  rain_light: 14, rain_medium: 18, rain_heavy: 16, thunderstorm: 16, snow_light: 0,  snow_heavy: 0 },
  8:  { sunny: 20, overcast: 8,  rain_light: 14, rain_medium: 18, rain_heavy: 16, thunderstorm: 14, snow_light: 0,  snow_heavy: 0 },
  9:  { sunny: 22, overcast: 12, rain_light: 18, rain_medium: 10, rain_heavy: 4,  thunderstorm: 6,  snow_light: 0,  snow_heavy: 0 },
  10: { sunny: 18, overcast: 16, rain_light: 16, rain_medium: 8,  rain_heavy: 3,  thunderstorm: 2,  snow_light: 0,  snow_heavy: 0 },
  11: { sunny: 12, overcast: 18, rain_light: 10, rain_medium: 5,  rain_heavy: 2,  thunderstorm: 0,  snow_light: 6,  snow_heavy: 2 },
  12: { sunny: 8,  overcast: 18, rain_light: 8,  rain_medium: 4,  rain_heavy: 2,  thunderstorm: 0,  snow_light: 16, snow_heavy: 10 }
};

// 时间段：凌晨 / 清晨 / 上午 / 中午 / 下午 / 傍晚 / 晚上 / 深夜
function getImageTimeSlot(hour) {
  const h = Math.min(23, Math.max(0, Math.floor(Number(hour) || 0)));
  if (h < 5) return 'lateNight';
  if (h < 8) return 'dawn';
  if (h < 11) return 'morning';
  if (h < 14) return 'noon';
  if (h < 17) return 'afternoon';
  if (h < 20) return 'evening';
  if (h < 23) return 'night';
  return 'lateNight';
}

// times 里没写的时间段按 0 处理；完全没写 times 的图片全天可用。
// captions 是这张图可配的文案，发送时随机抽一句；每张图至少 5 条。
const IMAGE_SVG_CATALOG = [
  // 天气
  {
    file: 'weather_sunny_01.svg', category: 'weather', weather: 'sunny',
    times: { dawn: 0.35, morning: 1, noon: 1, afternoon: 1, evening: 0.2, night: 0, lateNight: 0 },
    captions: ['今天天气挺好的', '外面太阳有点大', '这种天适合出去走走', '晒得我有点睁不开眼', '今天天很蓝，基本看不到云']
  },
  {
    file: 'weather_overcast_01.svg', category: 'weather', weather: 'overcast',
    times: { dawn: 0.4, morning: 1, noon: 1, afternoon: 1, evening: 0.9, night: 0.2, lateNight: 0 },
    captions: ['今天阴沉沉的', '看着像要下雨', '外面没什么太阳', '今天的天一直都是灰的', '风有点凉', '不同季节的阴天，槽点都不一样']
  },
  {
    file: 'weather_rain_light_01.svg', category: 'weather', weather: 'rain_light',
    times: { dawn: 0.5, morning: 1, noon: 1, afternoon: 1, evening: 1.1, night: 0.9, lateNight: 0.6 },
    captions: ['下雨了', '外面在下小雨', '希望等下我出门的时候。雨已经停了', '雨不大，就是一直下', '窗户上都是啪嗒啪嗒流下来的水珠']
  },
  {
    file: 'weather_rain_medium_01.svg', category: 'weather', weather: 'rain_medium',
    times: { dawn: 0.3, morning: 1, noon: 1, afternoon: 1, evening: 1.2, night: 1, lateNight: 0.5 },
    captions: ['这雨下得不小', '雨有点密', '路上都湿了', '鞋都快湿了', '雨声还挺大']
  },
  {
    file: 'weather_rain_heavy_01.svg', category: 'weather', weather: 'rain_heavy',
    times: { dawn: 0.3, morning: 0.9, noon: 0.9, afternoon: 1, evening: 1.3, night: 1.1, lateNight: 0.5 },
    captions: ['雨太大了', '外面跟倒水一样', '裤脚全湿了', '路上都没什么人了', '这雨下得有点吓人']
  },
  {
    file: 'weather_thunderstorm_01.svg', category: 'weather', weather: 'thunderstorm',
    times: { dawn: 0.1, morning: 0.3, noon: 0.5, afternoon: 1, evening: 1.2, night: 0.8, lateNight: 0.2 },
    captions: ['打雷了', '外面雷声好大', '这天气有点吓人', '刚闪了一下', '雨跟着就下来了']
  },
  {
    file: 'weather_snow_light_01.svg', category: 'weather', weather: 'snow_light',
    times: { dawn: 0.3, morning: 1, noon: 1, afternoon: 1, evening: 0.6, night: 0.1, lateNight: 0 },
    captions: ['下雪了', '外面飘雪了', '雪不大，但是挺好看', '地上薄薄一层', '落在衣服上就化了']
  },
  {
    file: 'weather_snow_heavy_01.svg', category: 'weather', weather: 'snow_heavy',
    times: { dawn: 0.2, morning: 1, noon: 1, afternoon: 0.9, evening: 0.5, night: 0.1, lateNight: 0 },
    captions: ['雪下得好大', '外面白了一片', '这雪有点夸张', '路上脚印都没了', '出门得慢点走', '你在的话，我们出去堆雪人和打雪仗']
  },

  // 散步/风景
  {
    file: 'scenery_walk_01.svg', category: 'scenery',
    times: { dawn: 0.1, morning: 0.1, noon: 0.1, afternoon: 0.5, evening: 1.5, night: 0.1, lateNight: 0 },
    captions: ['出来走走', '公园这边挺安静的', '傍晚的风还挺舒服', '走一圈再回去', '今天人不多']
  },
  {
    file: 'scenery_walk_02.svg', category: 'scenery',
    times: { dawn: 0.3, morning: 1, noon: 1, afternoon: 1, evening: 0.3, night: 0, lateNight: 0 },
    captions: ['出门又碰见小动物了', '公园里人不多', '我听说，抱树就是接触大自然的一种方式', '天气也很好，心情也很好', '不开心的时候，出门逛逛就好了']
  },
  {
    file: 'scenery_walk_street_01.svg', category: 'scenery',
    times: { afternoon: 0.4, evening: 1.4, night: 1, lateNight: 0.4 },
    captions: ['街上灯都亮了', '下班路上', '这边晚上还挺热闹', '路边小店还开着', '今天街上人挺多']
  },
  {
    file: 'scenery_walk_riverside_01.svg', category: 'scenery',
    times: { afternoon: 0.3, evening: 1.4, night: 0.3 },
    captions: ['河边走走', '今天晚霞不错', '风有点凉', '水面上都是灯光', '走累了坐一会儿']
  },
  {
    file: 'scenery_walk_beach_01.svg', category: 'scenery',
    times: { dawn: 0.1, morning: 0.5, noon: 1.2, afternoon: 1.2, evening: 0.3, night: 0, lateNight: 0 },
    captions: ['海边', '今天浪不大', '沙子有点烫', '海风挺舒服的', '人比想象中少']
  },
  {
    file: 'scenery_sky_01.svg', category: 'scenery',
    times: { dawn: 0.2, morning: 0.5, noon: 0.8, afternoon: 1.4, evening: 0.5, night: 0, lateNight: 0 },
    captions: ['今天的云挺好看', '抬头看了一眼', '下午的天空', '云像被吹散了', '今天光线挺好']
  },
  {
    file: 'scenery_sunset_01.svg', category: 'scenery',
    times: { afternoon: 0.15, evening: 1.6, night: 0, dawn: 0, morning: 0, noon: 0, lateNight: 0 },
    captions: ['晚霞', '今天的天色很好看', '刚好赶上日落', '一会就黑天了', '这个颜色挺少见的']
  },
  {
    file: 'scenery_night_01.svg', category: 'scenery',
    times: { evening: 0.5, night: 1.5, lateNight: 1, dawn: 0, morning: 0, noon: 0, afternoon: 0 },
    captions: ['夜景', '这边晚上挺好看的', '城市还没睡', '楼下还有车声', '灯一直亮着']
  },

  // 食物
  {
    file: 'food_simple_06.svg', category: 'food',
    times: { dawn: 0.2, morning: 0.5, noon: 0.8, afternoon: 0.3, evening: 1, night: 1.2, lateNight: 1.3 },
    captions: ['随便吃点', '今天不想做饭', '凑合一口', '能填饱就行', '冰箱里翻出来的']
  },
  {
    file: 'food_rice_06.svg', category: 'food',
    times: { morning: 0.2, noon: 1, afternoon: 0.2, evening: 1, night: 0.5, lateNight: 0.15 },
    captions: ['吃饭了', '今天炒了两个菜', '家常饭', '味道还行', '今天胃口不错']
  },
  {
    file: 'food_bento_06.svg', category: 'food',
    times: { morning: 0.3, noon: 1.3, afternoon: 0.3, evening: 0.7, night: 0.1, lateNight: 0 },
    captions: ['今天的午饭', '带了盒饭', '看着还行吧', '比外卖便宜', '今天菜放得有点多']
  },
  {
    file: 'food_snack_02.svg', category: 'food',
    times: { afternoon: 0.4, evening: 1.2, night: 1.5, lateNight: 1.3, morning: 0, noon: 0, dawn: 0 },
    captions: ['夜市', '出来吃点小吃', '这个闻着挺香', '排队的人不少', '吃完再逛一圈']
  },
  {
    file: 'food_takeout_01.svg', category: 'food',
    times: { dawn: 0, morning: 0.1, noon: 0.6, afternoon: 0.4, evening: 1.2, night: 1.4, lateNight: 1.2 },
    captions: ['点了两份，才想起来你不在', '一个人吃，还是拿了两双筷子', '这家你肯定喜欢，下次带你来', '下次我们一起吃吧？', '什么时候能见面呢，我不想一个人吃饭了']
  },

  // 水果
  {
    file: 'fruit_plate_01.svg', category: 'fruit',
    times: { morning: 0.8, noon: 1, afternoon: 1, evening: 0.7, night: 0.2, dawn: 0, lateNight: 0 },
    captions: ['切了点水果', '饭后吃点', '挺甜的', '摆得还挺好看', '今天买多了', '本来想和你一起吃的']
  },
  {
    file: 'fruit_summer_01.svg', category: 'fruit',
    months: { 4: 0.12, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 0.12 },
    times: { morning: 0.4, noon: 1.2, afternoon: 1.2, evening: 0.6, night: 0.1, dawn: 0, lateNight: 0 },
    captions: ['夏天就该吃这个', '刚从冰箱里拿出来，应该很好吃', '西瓜很甜', '一口下去全是汁', '夏天就靠这个续命']
  },
  {
    file: 'fruit_winter_01.svg', category: 'fruit',
    months: { 10: 0.12, 11: 1, 12: 1, 1: 1, 2: 1, 3: 0.12 },
    times: { morning: 0.6, noon: 1, afternoon: 1, evening: 0.8, night: 0.2, dawn: 0, lateNight: 0 },
    captions: ['冬天吃点橙子', '这个季节的水果', '有点酸，不过还行', '剥了一手橙子味', '烤火的时候吃刚好']
  },

  // 饮品
  {
    file: 'drink_coffee_01.svg', category: 'drink',
    times: { dawn: 0.5, morning: 1.6, noon: 1.2, afternoon: 0.9, evening: 0.25, night: 0.05, lateNight: 0 },
    captions: ['今天的咖啡', '提提神', '有点苦', '喝到最后有点凉', '今天加了点糖']
  },
  {
    file: 'drink_milktea_01.svg', category: 'drink',
    times: { morning: 0.2, noon: 1.2, afternoon: 1.4, evening: 1, night: 0.35, dawn: 0, lateNight: 0 },
    captions: ['给你也带一杯？', '今天想喝点甜的', '这家还不错', '珍珠给得挺多', '喝一半就有点撑']
  },
  {
    file: 'drink_milk_01.svg', category: 'drink',
    times: { dawn: 0.5, morning: 0.5, noon: 0.1, afternoon: 0.1, evening: 0.5, night: 1.3, lateNight: 1 },
    captions: ['睡前喝杯牛奶', '冰箱里只剩这个了', '热了一下', '喝完准备睡了', '今天的有点淡']
  },
  {
    file: 'drink_water_01.svg', category: 'drink',
    times: { dawn: 1, morning: 1, noon: 1, afternoon: 1, evening: 1, night: 1, lateNight: 1 },
    captions: ['多喝水', '今天忘了买饮料', '先喝口水', '嗓子有点干', '杯子一直放桌上']
  },

  // 房间/居家
  {
    file: 'bath_06_day.svg', category: 'room',
    times: { dawn: 0.1, morning: 0.7, noon: 1, afternoon: 1, evening: 0, night: 0, lateNight: 0 },
    captions: ['白天泡一会儿', '今天浴室光线挺好', '水温刚好', '泡完有点困', '难得白天有空']
  },
  {
    file: 'bath_06.svg', category: 'room',
    times: { afternoon: 0.4, evening: 1.5, night: 0, dawn: 0, morning: 0, noon: 0, lateNight: 0 },
    captions: ['傍晚泡个澡', '天快黑了', '忙完泡一会儿', '水汽把窗户糊住了', '今天想早点收拾完']
  },
  {
    file: 'bath_06_night.svg', category: 'room',
    times: { evening: 0.4, night: 1.6, lateNight: 0.9, dawn: 0.2, morning: 0, noon: 0, afternoon: 0 },
    captions: ['晚上泡个澡', '准备睡了', '热水泡着挺舒服', '泡完就想直接躺下', '今天有点累']
  },
  {
    file: 'bed_02.svg', category: 'room',
    times: { dawn: 0.3, morning: 0.05, noon: 0, afternoon: 0.5, evening: 0.8, night: 1.4, lateNight: 1.2 },
    captions: ['躺一会儿', '今天有点累', '床单刚换过', '一躺下就不想动', '被子有点暖']
  },
  {
    file: 'gym_02.svg', category: 'room',
    times: { dawn: 0.1, morning: 0.7, noon: 0.8, afternoon: 1, evening: 1.3, night: 0.3, lateNight: 0 },
    captions: ['来健身房了', '今天练一会儿', '人不多', '今天没什么力气', '练完再回去']
  },

  // 家居小物
  {
    file: 'home_fridge_note_01.svg', category: 'home',
    times: { dawn: 0.3, morning: 1, noon: 0.5, afternoon: 0.5, evening: 0.8, night: 0.6, lateNight: 0.2 },
    captions: ['冰箱上还留着你的便签', '今天不知道吃什么，对着冰箱发呆，蹲在地上思考要不要点外卖', '我想给冰箱也贴上很多东西', '冰箱快空了，你什么时候回来', '看到你的字，突然很想你']
  },

  // 桌面/电脑
  {
    file: 'computer_video_01.svg', category: 'desk',
    times: { afternoon: 0.4, evening: 1.2, night: 1.5, lateNight: 1.2, dawn: 0, morning: 0, noon: 0 },
    captions: ['看会儿视频', '我最近在看新追的系列', '今晚不出门了', '我看了好久了，看困了', '这个还挺好看']
  },
  {
    file: 'computer_game_01.svg', category: 'desk',
    times: { afternoon: 0.6, evening: 1.3, night: 1.4, lateNight: 0.8, dawn: 0, morning: 0, noon: 0 },
    captions: ['打两把游戏', '我刚才在打游戏', '气死我了，今天一直输', '今天赢了好多把！', '刚输了一局', '再玩一把就睡']
  },
  {
    file: 'computer_work_01.svg', category: 'desk',
    times: { dawn: 0.1, morning: 1.3, noon: 1, afternoon: 1.3, evening: 0.5, night: 0.1, lateNight: 0 },
    captions: ['还有一点没弄完', '今天事有点多', '不知不觉就过了几个小时', '眼睛有点酸了..', '快弄完了', '来活了，最近一直在忙这件事']
  },

  // 宠物
  {
    file: 'cat_02.svg', category: 'pet',
    times: { dawn: 0.3, morning: 1, noon: 0.9, afternoon: 1.2, evening: 0.8, night: 0.35, lateNight: 0.15 },
    captions: ['给你看大运，是不是很想他？', '他又睡了', '他今天特别黏人', '依旧霸占我的位置', '大运是不是胖了？', '我刚给他喂食', '闯祸精，贪吃鬼'
    ]
  }
];

let lastSvgImageAt = 0;
let lastSvgImageFile = '';
let lastSvgImageCaption = '';

function pickWeightedKey(weights) {
  const entries = Object.keys(weights || {})
    .map(k => [k, Number(weights[k]) || 0])
    .filter(([, w]) => w > 0);
  if (!entries.length) return null;
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function imageTimeWeight(entry, slot) {
  if (!entry || !entry.times) return 1;
  const w = entry.times[slot];
  return w == null ? 0 : Math.max(0, Number(w) || 0);
}

function imageMonthWeight(entry, month) {
  if (!entry || !entry.months) return 1;
  const w = entry.months[month];
  return w == null ? 0 : Math.max(0, Number(w) || 0);
}

function weatherMonthWeight(weather, month) {
  const m = Math.min(12, Math.max(1, Number(month) || (new Date().getMonth() + 1)));
  const weights = WEATHER_MONTH_WEIGHTS[m] || WEATHER_MONTH_WEIGHTS[1];
  return Math.max(0, Number(weights[weather]) || 0);
}

function imageWeightFor(entry, slot, month) {
  let weight = imageTimeWeight(entry, slot) * imageMonthWeight(entry, month);
  if (entry.category === 'weather') weight *= weatherMonthWeight(entry.weather, month);
  return weight;
}

function pickWeightedImage(candidates) {
  const pool = (candidates || []).filter(item => item && item.entry && item.weight > 0);
  if (!pool.length) return null;

  let usable = pool;
  if (pool.length > 1) {
    const fresh = pool.filter(item => item.entry.file !== lastSvgImageFile);
    if (fresh.length) usable = fresh;
  }

  const total = usable.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;
  for (const item of usable) {
    r -= item.weight;
    if (r <= 0) return item.entry;
  }
  return usable[usable.length - 1].entry;
}

function getImageCandidates(category, slot, month) {
  return IMAGE_SVG_CATALOG
    .filter(item => item.category === category)
    .map(entry => ({ entry, weight: imageWeightFor(entry, slot, month) }))
    .filter(item => item.weight > 0);
}

function pickCategoryImage(category, month, slot) {
  return pickWeightedImage(getImageCandidates(category, slot, month));
}

function pickWeatherImage(month, slot) {
  return pickCategoryImage('weather', month, slot);
}

function getAvailableCategoryWeights(slot, month) {
  const weights = {};
  Object.keys(IMAGE_SVG_CATEGORY_WEIGHTS).forEach(category => {
    if (getImageCandidates(category, slot, month).length) {
      weights[category] = IMAGE_SVG_CATEGORY_WEIGHTS[category];
    }
  });
  return weights;
}

function findSvgImageEntry(file) {
  const name = String(file || '');
  return IMAGE_SVG_CATALOG.find(item => item.file === name) || null;
}

function pickCaption(entry) {
  const captions = (entry && Array.isArray(entry.captions)) ? entry.captions.filter(Boolean) : [];
  if (!captions.length) return '';

  let pool = captions;
  if (captions.length > 1) {
    const fresh = captions.filter(text => text !== lastSvgImageCaption);
    if (fresh.length) pool = fresh;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// 真正把一张内置图片卡写进聊天；调试命令和随机发图都走这里。
function sendSvgImageEntry(entry, options) {
  const opts = options || {};
  if (!entry || !entry.file || typeof sendMessage !== 'function') return false;

  const caption = opts.caption != null ? String(opts.caption) : pickCaption(entry);
  const src = IMAGE_SVG_BASE + entry.file;
  if (caption) sendMessage({ val: src, caption }, 'image', false, opts.quote || null);
  else sendMessage(src, 'image', false, opts.quote || null);

  lastSvgImageAt = Date.now();
  lastSvgImageFile = entry.file;
  lastSvgImageCaption = caption;
  return true;
}

// 发一张内置 SVG 图。返回 false 表示这次不发（冷却中/没有可用图）。
// options: { quote, month, hour, file, caption, ignoreCooldown }
// month/hour/file/caption/ignoreCooldown 主要给调试命令用，正常随机只用 quote。
function sendRandomSvgImage(options) {
  const opts = options || {};
  if (typeof sendMessage !== 'function') return false;

  if (!opts.ignoreCooldown && Date.now() - lastSvgImageAt < IMAGE_SVG_COOLDOWN_MS) return false;

  const forced = opts.file ? findSvgImageEntry(opts.file) : null;
  if (opts.file && !forced) return false;

  const date = new Date();
  const rawMonth = opts.month == null ? date.getMonth() + 1 : Number(opts.month);
  const month = Math.min(12, Math.max(1, Number.isFinite(rawMonth) ? rawMonth : date.getMonth() + 1));

  const rawHour = opts.hour == null ? date.getHours() : Number(opts.hour);
  const hour = ((Math.floor(Number.isFinite(rawHour) ? rawHour : date.getHours()) % 24) + 24) % 24;
  const slot = getImageTimeSlot(hour);

  if (forced) return sendSvgImageEntry(forced, { quote: opts.quote, caption: opts.caption });

  const categoryWeights = getAvailableCategoryWeights(slot, month);
  const category = pickWeightedKey(categoryWeights);
  if (!category) return false;

  const entry = category === 'weather'
    ? pickWeatherImage(month, slot)
    : pickCategoryImage(category, month, slot);
  if (!entry || !entry.file) return false;

  return sendSvgImageEntry(entry, { quote: opts.quote, caption: opts.caption });
}
