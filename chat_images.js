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
  1:  { sunny: 8,  overcast: 18, rain_light: 8,  rain_medium: 4,  rain_heavy: 2,  thunderstorm: 0,  snow_light: 20, snow_heavy: 18, windy: 8,  sleet: 8 },
  2:  { sunny: 10, overcast: 18, rain_light: 10, rain_medium: 5,  rain_heavy: 2,  thunderstorm: 0,  snow_light: 16, snow_heavy: 12, windy: 8,  sleet: 6 },
  3:  { sunny: 18, overcast: 16, rain_light: 16, rain_medium: 8,  rain_heavy: 3,  thunderstorm: 1,  snow_light: 4,  snow_heavy: 0,  windy: 10, sleet: 0 },
  4:  { sunny: 22, overcast: 14, rain_light: 18, rain_medium: 10, rain_heavy: 4,  thunderstorm: 3,  snow_light: 1,  snow_heavy: 0,  windy: 10, sleet: 0 },
  5:  { sunny: 24, overcast: 12, rain_light: 20, rain_medium: 12, rain_heavy: 6,  thunderstorm: 6,  snow_light: 0,  snow_heavy: 0,  windy: 8,  sleet: 0 },
  6:  { sunny: 22, overcast: 10, rain_light: 18, rain_medium: 16, rain_heavy: 10, thunderstorm: 12, snow_light: 0,  snow_heavy: 0,  windy: 6,  sleet: 0 },
  7:  { sunny: 20, overcast: 8,  rain_light: 14, rain_medium: 18, rain_heavy: 16, thunderstorm: 16, snow_light: 0,  snow_heavy: 0,  windy: 5,  sleet: 0 },
  8:  { sunny: 20, overcast: 8,  rain_light: 14, rain_medium: 18, rain_heavy: 16, thunderstorm: 14, snow_light: 0,  snow_heavy: 0,  windy: 5,  sleet: 0 },
  9:  { sunny: 22, overcast: 12, rain_light: 18, rain_medium: 10, rain_heavy: 4,  thunderstorm: 6,  snow_light: 0,  snow_heavy: 0,  windy: 7,  sleet: 0 },
  10: { sunny: 18, overcast: 16, rain_light: 16, rain_medium: 8,  rain_heavy: 3,  thunderstorm: 2,  snow_light: 0,  snow_heavy: 0,  windy: 9,  sleet: 0 },
  11: { sunny: 12, overcast: 18, rain_light: 10, rain_medium: 5,  rain_heavy: 2,  thunderstorm: 0,  snow_light: 6,  snow_heavy: 2,  windy: 9,  sleet: 0 },
  12: { sunny: 8,  overcast: 18, rain_light: 8,  rain_medium: 4,  rain_heavy: 2,  thunderstorm: 0,  snow_light: 16, snow_heavy: 10, windy: 8,  sleet: 7 }
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
  // 天气：按季节分文件，months 控制只在该季节出现
  // 春天
  {
    file: 'weather_spring_sunny_01.svg', category: 'weather', weather: 'sunny',
    months: { 3: 1, 4: 1.25, 5: 1 },
    times: { dawn: 0.35, morning: 1, noon: 1, afternoon: 1, evening: 0.2, night: 0, lateNight: 0 },
    captions: ['今天的太阳很暖和', '外面树都发芽了', '路边的花开了', '这种天气适合出去走走', '风里都是春天的味道']
  },
  {
    file: 'weather_spring_overcast_01.svg', category: 'weather', weather: 'overcast',
    months: { 3: 1, 4: 1.25, 5: 1 },
    times: { dawn: 0.4, morning: 1, noon: 1, afternoon: 1, evening: 0.9, night: 0.2, lateNight: 0 },
    captions: ['春天的阴天还是有点凉', '天灰灰的，花倒是开了', '看着像要下雨', '今天风有点大', '春天就是忽冷忽热']
  },
  {
    file: 'weather_spring_rain_light_01.svg', category: 'weather', weather: 'rain_light',
    months: { 3: 1, 4: 1.25, 5: 1 },
    times: { dawn: 0.5, morning: 1, noon: 1, afternoon: 1, evening: 1.1, night: 0.9, lateNight: 0.6 },
    captions: ['下小雨了', '雨里的花很好看', '出门记得带伞', '一场春雨一场暖', '窗户上都是水珠']
  },
  {
    file: 'weather_spring_rain_medium_01.svg', category: 'weather', weather: 'rain_medium',
    months: { 3: 1, 4: 1.25, 5: 1 },
    times: { dawn: 0.3, morning: 1, noon: 1, afternoon: 1, evening: 1.2, night: 1, lateNight: 0.5 },
    captions: ['春雨下得有点密', '路上都是落花', '今天有点凉', '鞋都快湿了', '雨声还挺大']
  },
  {
    file: 'weather_spring_rain_heavy_01.svg', category: 'weather', weather: 'rain_heavy',
    months: { 3: 1, 4: 1.25, 5: 1 },
    times: { dawn: 0.3, morning: 0.9, noon: 0.9, afternoon: 1, evening: 1.3, night: 1.1, lateNight: 0.5 },
    captions: ['这雨下得跟倒水一样', '今天还有点冷，但是出门的时候我穿了拖鞋和短裤', '感觉很快天气就回暖了', '裤脚又湿了', '这雨有点大']
  },
  {
    file: 'weather_spring_windy_01.svg', category: 'weather', weather: 'windy',
    months: { 3: 1, 4: 1.25, 5: 1 },
    times: { dawn: 0.3, morning: 1, noon: 1, afternoon: 1, evening: 0.8, night: 0.1, lateNight: 0 },
    captions: ['今天风好大', '树叶都被吹下来了', '头发都吹乱了', '走在路上的时候有一种花香', '出门记得穿件外套']
  },

  // 夏天
  {
    file: 'weather_summer_sunny_01.svg', category: 'weather', weather: 'sunny',
    months: { 6: 1, 7: 1.25, 8: 1 },
    times: { dawn: 0.35, morning: 1, noon: 1, afternoon: 1, evening: 0.2, night: 0, lateNight: 0 },
    captions: ['今天天气挺好的', '外面太阳太大了，今天会很热', '白天太晒了，还是得到晚上才适合出去走走', '晒得我有点睁不开眼', '今天天很蓝，基本看不到云']
  },
  {
    file: 'weather_summer_overcast_01.svg', category: 'weather', weather: 'overcast',
    months: { 6: 1, 7: 1.25, 8: 1 },
    times: { dawn: 0.4, morning: 1, noon: 1, afternoon: 1, evening: 0.9, night: 0.2, lateNight: 0 },
    captions: ['光闷着不下雨，太难受了', '你还好吗？会感到不舒服吗？', '今天阴沉沉的', '看着像要下雨', '外面没什么太阳', '阴天太闷了，雨要下不下的', '吹了凉风好舒服！']
  },
  {
    file: 'weather_summer_rain_light_01.svg', category: 'weather', weather: 'rain_light',
    months: { 6: 1, 7: 1.25, 8: 1 },
    times: { dawn: 0.5, morning: 1, noon: 1, afternoon: 1, evening: 1.1, night: 0.9, lateNight: 0.6 },
    captions: ['下雨了', '外面在下小雨', '希望等下我出门的时候。雨已经停了', '雨不大，就是一直下', '窗户上都是啪嗒啪嗒流下来的水珠']
  },
  {
    file: 'weather_summer_rain_medium_01.svg', category: 'weather', weather: 'rain_medium',
    months: { 6: 1, 7: 1.25, 8: 1 },
    times: { dawn: 0.3, morning: 1, noon: 1, afternoon: 1, evening: 1.2, night: 1, lateNight: 0.5 },
    captions: ['这雨下得不小', '我想出去淋雨', '我会享受夏日雨季的', '我的鞋和裤腿又湿了', '雨声其实对我来说听着很舒服', '如果在山里或者竹林里度假，下雨天会是什么样呢？']
  },
  {
    file: 'weather_summer_rain_heavy_01.svg', category: 'weather', weather: 'rain_heavy',
    months: { 6: 1, 7: 1.25, 8: 1 },
    times: { dawn: 0.3, morning: 0.9, noon: 0.9, afternoon: 1, evening: 1.3, night: 1.1, lateNight: 0.5 },
    captions: ['雨太大了', '外面跟倒水一样', '裤脚全湿了', '路上都没什么人了', '这雨下得有点吓人']
  },
  {
    file: 'weather_summer_thunderstorm_01.svg', category: 'weather', weather: 'thunderstorm',
    months: { 6: 1, 7: 1.25, 8: 1 },
    times: { dawn: 0.1, morning: 0.3, noon: 0.5, afternoon: 1, evening: 1.2, night: 0.8, lateNight: 0.2 },
    captions: ['打雷了', '外面闪电和雷声好大', '我不怕打雷，不伤害人的情况下，极端天气有一种世界末日的感觉，我很喜欢', '每次闪电，我都会想到光和声音的传播速度不一样，然后雷声就来了', '下了大雨，如果这个时候能和你在一起就好了，一起逃走吧']
  },
  {
    file: 'weather_summer_windy_01.svg', category: 'weather', weather: 'windy',
    months: { 6: 1, 7: 1.25, 8: 1 },
    times: { dawn: 0.2, morning: 1, noon: 1, afternoon: 1, evening: 1, night: 0.2, lateNight: 0 },
    captions: ['今天风挺大', '总算没那么闷热了', '树荫下还挺凉快', '云跑得很快', '晚上应该会舒服点']
  },

  // 秋天
  {
    file: 'weather_autumn_sunny_01.svg', category: 'weather', weather: 'sunny',
    months: { 9: 1, 10: 1.25, 11: 1 },
    times: { dawn: 0.35, morning: 1, noon: 1, afternoon: 1, evening: 0.2, night: 0, lateNight: 0 },
    captions: ['这天气正正好好，穿外套不冷也不热，没什么风，阳光让人很舒服', '今天天很蓝，树叶已经黄了，也挺好看', '给你拍了很多黄叶子的照片', '这种天气适合出去走走', '秋天真的来了']
  },
  {
    file: 'weather_autumn_overcast_01.svg', category: 'weather', weather: 'overcast',
    months: { 9: 1, 10: 1.25, 11: 1 },
    times: { dawn: 0.4, morning: 1, noon: 1, afternoon: 1, evening: 0.9, night: 0.2, lateNight: 0 },
    captions: ['秋天的阴天可不是开玩笑，会很凉的', '天灰灰的，叶子倒是很黄', '看着像要下雨', '今天风有点大', '秋天阴沉沉的']
  },
  {
    file: 'weather_autumn_rain_light_01.svg', category: 'weather', weather: 'rain_light',
    months: { 9: 1, 10: 1.25, 11: 1 },
    times: { dawn: 0.5, morning: 1, noon: 1, afternoon: 1, evening: 1.1, night: 0.9, lateNight: 0.6 },
    captions: ['下小雨了，又要降温了吗？', '雨打黄叶还挺好看', '出门记得带伞', '一场秋雨一场凉', '窗户上都是水珠']
  },
  {
    file: 'weather_autumn_rain_medium_01.svg', category: 'weather', weather: 'rain_medium',
    months: { 9: 1, 10: 1.25, 11: 1 },
    times: { dawn: 0.3, morning: 1, noon: 1, afternoon: 1, evening: 1.2, night: 1, lateNight: 0.5 },
    captions: ['这雨有点大了', '路上都是湿叶子', '今天降温了，你也要注意保暖', '雨声还挺大', '鞋都快湿了']
  },
  {
    file: 'weather_autumn_rain_heavy_01.svg', category: 'weather', weather: 'rain_heavy',
    months: { 9: 1, 10: 1.25, 11: 1 },
    times: { dawn: 0.3, morning: 0.9, noon: 0.9, afternoon: 1, evening: 1.3, night: 1.1, lateNight: 0.5 },
    captions: ['今天的雨好大，却不能像夏天那样享受雨了', '已经开始冷了，雨还那么大，出门不能穿短裤和拖鞋就是折磨', '我跟黄叶一样都要被秋雨打倒了', '...裤脚又湿了', '好大的雨，外面的声音真的很大']
  },
  {
    file: 'weather_autumn_windy_01.svg', category: 'weather', weather: 'windy',
    months: { 9: 1, 10: 1.25, 11: 1 },
    times: { dawn: 0.2, morning: 1, noon: 1, afternoon: 1, evening: 1, night: 0.2, lateNight: 0 },
    captions: ['风一吹，叶子全掉了', '今天风有点大', '路上都是落叶', '树都快吹秃了', '出门多穿一点']
  },

  // 冬天
  {
    file: 'weather_winter_sunny_01.svg', category: 'weather', weather: 'sunny',
    months: { 12: 1, 1: 1.25, 2: 1 },
    times: { dawn: 0.3, morning: 1, noon: 1, afternoon: 1, evening: 0.3, night: 0, lateNight: 0 },
    captions: ['冬天要多晒太阳，好舒服啊，虽然还是很冷', '今天天很蓝，就是有点冷', '阳光照在身上暖暖的', '好不容易放晴了，出去走走怎么样？', '难得这么好的天']
  },
  {
    file: 'weather_winter_overcast_01.svg', category: 'weather', weather: 'overcast',
    months: { 12: 1, 1: 1.25, 2: 1 },
    times: { dawn: 0.4, morning: 1, noon: 1, afternoon: 1, evening: 0.9, night: 0.2, lateNight: 0 },
    captions: ['秋冬的阴天真的很阴哈哈哈，真的好冷', '外边看起来越来越萧条了', '天气预报说晚间会刮大风降温，我今天晚上要盖厚被子了', '已经连续几天不是阴天就是下雨了', '我可能会因为这种天气去吃一顿好的', '想待在家里']
  },
  {
    file: 'weather_winter_rain_01.svg', category: 'weather', weather: 'rain_medium',
    months: { 12: 1, 1: 1.25, 2: 1 },
    times: { dawn: 0.3, morning: 1, noon: 1, afternoon: 1, evening: 1.1, night: 1, lateNight: 0.4 },
    captions: ['下雨了，再冷一点就下雪了', '雨落在枯草地上', '出门记得带伞', '今天又湿又冷', '今天吃热乎乎的东西犒劳自己']
  },
  {
    file: 'weather_winter_sleet_01.svg', category: 'weather', weather: 'sleet',
    months: { 12: 1, 1: 1.25, 2: 1 },
    times: { dawn: 0.3, morning: 1, noon: 1, afternoon: 1, evening: 1, night: 0.8, lateNight: 0.3 },
    captions: ['又下雨又下雪', '雨夹雪，地上全是水', '今天出门得小心点', '又冷又湿', '这种天最适合待在家']
  },
  {
    file: 'weather_winter_windy_01.svg', category: 'weather', weather: 'windy',
    months: { 12: 1, 1: 1.25, 2: 1 },
    times: { dawn: 0.3, morning: 1, noon: 1, afternoon: 1, evening: 0.8, night: 0.2, lateNight: 0 },
    captions: ['今天风刮得我脸好疼..真的是刀割一样的感觉', '得把全身都包起来，我还是更喜欢温度', '不是疗毒的话，这风还是不要刮我的骨头了', '感觉一不注意就会感冒了', '你那边冷不冷？']
  },
  {
    file: 'weather_winter_snow_light_01.svg', category: 'weather', weather: 'snow_light',
    months: { 12: 1, 1: 1.25, 2: 1 },
    times: { dawn: 0.3, morning: 1, noon: 1, afternoon: 1, evening: 0.6, night: 0.1, lateNight: 0 },
    captions: ['下雪了', '外面飘雪了', '是初雪的话，要听某首歌吧？', '地上薄薄一层', '雪落在我的掌心里，马上就化了', '第一场雪下起的午后，想和你分享感动']
  },
  {
    file: 'weather_winter_snow_heavy_01.svg', category: 'weather', weather: 'snow_heavy',
    months: { 12: 1, 1: 1.25, 2: 1 },
    times: { dawn: 0.2, morning: 1, noon: 1, afternoon: 0.9, evening: 0.5, night: 0.1, lateNight: 0 },
    captions: ['雪下得好大，你应该会喜欢这种雪景', '睡醒了，就看见了外面的雪景', '我好想和你一起堆雪人', '十二月的奇迹？', '出门得慢点走', '你在的话，我们出去堆雪人和打雪仗']
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
    captions: ['来健身房了', '今天练一会儿', '今天人不多，不用抢器械', '今天人很多，光是等，就花了点时间', '今天没什么力气，但是还是练了一会', '今天我没偷懒！练完再回去']
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
