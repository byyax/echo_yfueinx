// ===== 情绪池数据（v13） =====
// 第一格是情绪；第二、三格是进一步状态、通用补充或另一条情绪。
// 文案尽量短；第三格可以带 emoji 或动画。

const MOOD_POOLS = {
  calm: {
    tone: 'mood-calm',
    first: ['平静', '安稳', '松弛'],
    second: ['安心', '淡然', '懒散'],
    third: ['听歌', '发呆', '刷手机'],
    emoji: ['☕', '🎧', '🌿']
  },
  happy: {
    tone: 'mood-happy',
    first: ['开心', '雀跃', '满足'],
    second: ['心里发甜', '想笑', '偷偷高兴'],
    third: ['摸鱼', '喝奶茶', '等你夸'],
    emoji: ['😁', '☺️', '😊', '✨', '🥰']
  },
  excited: {
    tone: 'mood-excited',
    first: ['激动', '兴奋', '心跳快'],
    second: ['上头', '坐不住', '等不及'],
    third: ['想见你', '转圈', '刷消息'],
    emoji: ['🤩', '⚡', '💓']
  },
  intimate: {
    tone: 'mood-intimate',
    first: ['心动', '亲密', '眷恋'],
    second: ['耳热', '想靠近', '不想停'],
    third: ['抱紧', '贴贴', '再待一会', '心跳'],
    emoji: ['💗', '🫶', '💞']
  },
  jealous: {
    tone: 'mood-jealous',
    first: ['吃醋', '泛酸', '在意'],
    second: ['装没事', '闷着', '占有欲'],
    third: ['看那个名字', '不吭声', '等你解释'],
    emoji: ['😤', '😒', '🙄', '💭']
  },
  irritated: {
    tone: 'mood-irritated',
    first: ['烦躁', '闷火', '没耐心'],
    second: ['别扭', '一点就炸', '沉默'],
    third: ['深呼吸', '别惹我', '放下手机'],
    emoji: ['😠', '😡', '😮‍💨']
  },
  sad: {
    tone: 'mood-sad',
    first: ['失落', '委屈', '难过'],
    second: ['鼻酸', '想被哄', '沉默'],
    third: ['忍住', '安静', '等你发现'],
    emoji: ['😔', '😢', '😞', '🥲']
  },
  anxious: {
    tone: 'mood-anxious',
    first: ['不安', '担心', '焦急', '慌张'],
    second: ['心慌', '数秒', '坐不住'],
    third: ['看手机', '转圈', '等回复'],
    emoji: ['😰', '📱']
  },
  anxiety: {
    tone: 'mood-anxiety',
    first: ['焦虑', '焦躁', '心神不宁'],
    second: ['绷着', '静不下来', '想太多'],
    third: ['深呼吸', '刷手机', '睡不着'],
    emoji: ['😟', '😖', '😵‍💫']
  },
  restrained: {
    tone: 'mood-restrained',
    first: ['隐忍', '嘴硬', '克制'],
    second: ['装没事', '其实在意', '不追问'],
    third: ['沉默', '咽回去', '移开视线'],
    emoji: ['😶', '🫥', '🤐']
  },
  waiting: {
    tone: 'mood-waiting',
    first: ['期待', '盼着', '惦记'],
    second: ['耐心', '张望', '偷偷看'],
    third: ['等你', '看手机', '竖起耳朵'],
    emoji: ['👀', '✨']
  },
  sleepy: {
    tone: 'mood-calm',
    first: ['疲惫', '累了', '没精神'],
    second: ['昏昏欲睡', '强撑着', '提不起劲'],
    third: ['揉眼睛', '打哈欠', '等你消息'],
    emoji: ['😴', '🥱']
  },
  clingy: {
    tone: 'mood-intimate',
    first: ['黏人', '赖着', '不想走'],
    second: ['想贴着你', '不想挂', '再待一会'],
    third: ['要抱抱', '凑近', '抓住衣角'],
    emoji: ['🫂', '🐾']
  },
  playful: {
    tone: 'mood-happy',
    first: ['调皮', '想闹', '手痒'],
    second: ['玩心', '坏笑', '想逗你'],
    third: ['发怪表情', '戳你', '逗你笑'],
    emoji: ['😜', '😏']
  },
  proud: {
    tone: 'mood-excited',
    first: ['暗爽', '得意', '受用'],
    second: ['尾巴翘', '心里美', '嘴上不说'],
    third: ['装淡定', '偷笑', '等你再夸'],
    emoji: ['😌', '😏']
  },
  thoughtful: {
    tone: 'mood-waiting',
    first: ['惦记', '挂念', '走神'],
    second: ['想起你', '出神', '偷偷看'],
    third: ['盯着聊天框', '发呆', '想你在干嘛'],
    emoji: ['💭', '🫧']
  }
};

// 可以接在任何情绪后面的通用补充
const MOOD_SUPPLEMENTS = [
  '等待', '看手机', '发呆', '想你', '偷看',
  '叹气', '走神', '沉默', '忙自己的', '等你'
];

// 基础权重，总和 100；平静不再压过一切
const MOOD_BASE_WEIGHTS = {
  calm: 20,
  happy: 18,
  waiting: 5,
  excited: 5,
  intimate: 6,
  jealous: 5,
  irritated: 4,
  sad: 4,
  anxious: 4,
  anxiety: 3,
  restrained: 6,
  sleepy: 4,
  clingy: 4,
  playful: 4,
  proud: 3,
  thoughtful: 5
};

// 切换到「另一条情绪」时的亲和权重：来源情绪 → 目标情绪
// 数值只是相对权重，没列出的目标用默认值 0.45。
const MOOD_TRANSITIONS = {
  calm:        { waiting: 3.0, sleepy: 2.5, thoughtful: 2.0, happy: 2.0, playful: 1.0, anxious: 0.8, sad: 0.5 },
  happy:       { excited: 4.0, playful: 3.0, intimate: 2.5, proud: 2.0, waiting: 1.5, sad: 0.8, jealous: 0.6, anxious: 0.4 },
  excited:     { happy: 3.5, intimate: 2.5, playful: 2.0, anxious: 1.2, waiting: 1.2 },
  intimate:    { clingy: 4.0, happy: 2.5, excited: 2.0, waiting: 1.5, proud: 1.0, jealous: 1.2 },
  jealous:     { anxious: 3.0, irritated: 2.5, sad: 2.0, restrained: 2.5, waiting: 1.5, calm: 0.5 },
  irritated:   { anxious: 2.5, jealous: 2.0, restrained: 2.0, sad: 1.5, calm: 1.0 },
  sad:         { waiting: 4.0, anxious: 2.5, restrained: 2.0, thoughtful: 2.0, calm: 0.8, happy: 0.4 },
  anxious:     { waiting: 3.0, anxiety: 3.0, sad: 2.0, restrained: 2.0, irritated: 1.5, calm: 0.8 },
  anxiety:     { anxious: 3.0, sleepy: 2.0, waiting: 1.5, sad: 1.5, calm: 0.7 },
  restrained:  { sad: 2.5, anxious: 2.0, jealous: 1.5, waiting: 1.5, calm: 1.5 },
  waiting:     { anxious: 2.5, thoughtful: 3.0, happy: 1.5, sad: 1.5, calm: 1.5 },
  sleepy:      { calm: 3.0, clingy: 2.0, waiting: 1.5, thoughtful: 1.5, happy: 0.8 },
  clingy:      { intimate: 3.5, happy: 1.5, waiting: 1.5, anxious: 1.0, sleepy: 1.0 },
  playful:     { happy: 3.5, excited: 2.5, intimate: 1.5, proud: 1.2, irritated: 0.8 },
  proud:       { happy: 3.0, playful: 2.0, excited: 1.5, intimate: 1.2, calm: 1.0 },
  thoughtful:  { waiting: 3.0, calm: 2.0, intimate: 1.5, sad: 1.2, happy: 1.0, sleepy: 1.0 }
};

// 第三格文字对应的动画
const MOOD_ANIM_BY_TEXT = {
  '转圈': 'spin',
  '等你': 'pulse',
  '看手机': 'pulse',
  '刷消息': 'pulse',
  '心跳': 'heartbeat',
  '打哈欠': 'breathe',
  '戳你': 'bounce',
  '忍住': 'fade'
};
