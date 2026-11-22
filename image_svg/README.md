# 照片插画样例（v14）

这个文件夹只是视觉测试，**还没有接入聊天功能**。

## 怎么查看

- 直接用浏览器打开 `photo_samples/index.html`；
- 或从网站根目录访问 `photo_samples/`；
- 页面右上角可以切换「聊天卡片 / 纯插画」和浅色/深色预览。

## 自己改

- `制作说明.md`：VSCode 操作、SVG 基础、边缘溢出怎么避免；
- `_template.svg`：800×600 空白模板，带安全框、网格、阴影和一只杯子示例；
- 复制一份 `_template.svg` 改成新文件即可练习。

## 文件

| 文件 | 内容 |
|---|---|
| `bath_01.svg` | 洗澡（傍晚版）：百叶窗晚霞、薄边浴缸、弧形出水口、小泡泡、架子、盆栽、蜡烛、两瓶沐浴露、长方形防滑垫 |
| `gym_01.svg` | 健身：哑铃、训练凳、毛巾、1L 水壶 |
| `food_snack_01.svg` | 吃饭：夜市章鱼小丸子 |
| `food_formal_01.svg` | 吃饭：正式晚餐、意面、红酒 |
| `food_feast_01.svg` | 吃饭：鸳鸯火锅大餐 |
| `food_simple_01.svg` | 吃饭：深夜泡面加蛋 |
| `scenery_sunset_01.svg` | 风景：天台晚霞 |
| `scenery_night_01.svg` | 风景：城市夜景 |
| `scenery_sky_01.svg` | 风景：蓝天白云 |
| `scenery_walk_01.svg` | 风景：公园散步小路 |

## 风格约定

- 画布：`800 × 600`，比例 `4:3`
- 统一使用暖色光影、柔和阴影和轻微颗粒
- 图片内不写 caption、时间、地点，这些由聊天卡片叠加
- 主体不贴边，四周留出安全区域
- 单张 SVG 只保留必要图层，方便以后改颜色和构图

## 后续接入建议

聊天消息使用 `photo` 类型，只保存 `assetId`，不重复保存图片：

```js
{
  role: 'other',
  type: 'photo',
  content: {
    assetId: 'food_lunch_01',
    category: 'food',
    frame: 'camera',
    caption: '午饭',
    timeLabel: '12:31'
  }
}
```
