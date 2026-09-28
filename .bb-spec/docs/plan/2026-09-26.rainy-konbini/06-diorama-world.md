---
name: 06-diorama-world
description: 搬移原型的展示台、铭牌、地面与标线、便利店及店内陈设、街道设施、旧楼与灯光
---
# 静态场景搭建

## 目标
按原型搭出完整的微缩街角（除车、雨、动效之外），铭牌文字能按语言重绘。

## 业务规则（来源：spec scene/diorama-layout、plaque/plaque-text）
- 底座边长 26 米，放在更大一圈的黑色亮面展示台上，两者之间有黄铜装饰线。铭牌只有一块，嵌在展示台正面。
- 铭牌三行：
  - `FUBUKI_BB`；
  - 三个职位用「 · 」连接；
  - 点车提示：中文「点击红色跑车，坐进驾驶座」，英文 "Tap the red car to take the driver's seat"。
  切换语言后下一帧显示新文字。1440×900 默认视角下第三行文字高度 ≥ 10 像素（铭牌贴图与尺寸需保证）。
- 街区布局：
  - 便利店居中偏后，门脸朝主路，有招牌、雨棚、屋顶空调，店内陈设完整；
  - 店前 3 个车位；
  - 主路横穿前沿，小路垂直伸向后方，成丁字路口；两条斑马线；主路黄色中线；
  - 小路车道喷「止まれ」和停车线，路口立倒三角「止まれ」标志，小路无车辆信号灯；
  - 左侧旧楼和小巷，小巷出口地面也喷「止まれ」；
  - 街道设施：立式招牌、路灯、电线杆与电线、主路信号灯、护栏、绿篱、贩卖机、自行车、雨伞架、垃圾桶、公告栏、反光镜、排水沟格栅。
- 底座和展示台之外只有背景，不放其他三维物件。
- 便利店玻璃外侧有水滴沿玻璃下滑（玻璃雨痕叠加层，每块玻璃一个随机种子）。
- 关键物件设置稳定的 `name`，供测试查找：`pedestal`、`plaque`、`store`、`crosswalk-main`、`crosswalk-side`、`stop-marking-side`、`stop-marking-alley`、`stop-sign-side`、`signal-main`、`neighbor-building`。

## 涉及文件
- 新建：`diorama/fonts.ts`、`diorama/textures.ts`、`diorama/ground.ts`、`diorama/store.ts`、`diorama/street.ts`、`diorama/plaque.ts`、`diorama/lights.ts`
- 新建：`tests/world.test.ts`、`tests/fake-canvas.ts`（测试用假画布：记录 `fillText` 调用，其余方法空实现）

## 新增第三方依赖（2026-09-26 用户批准）
| 库名 | 用途 | 版本策略 |
|---|---|---|
| `@fontsource/dela-gothic-one` | 招牌、海报、铭牌大字的画布字体（原型字体，打包进站点） | 最新稳定版（精确钉版本，与现有 fontsource 一致） |
| `@fontsource/m-plus-rounded-1c` | 画布贴图的圆体中日文字体 | 最新稳定版（精确钉版本） |

## 铭牌尺寸（2026-09-26 用户裁决）
铭牌面板放大到约 9.85×1.6 米（画布 2400×390，三行 130/60/116px），三行重排字号（名字最大、第三行大于第二行），以满足默认视角下第三行可见字形高度（按字号 0.7 倍计）≥ 10 像素，且在第三行实际高度、面板左右两端都满足；对外导出 `PLAQUE_LAYOUT`（画布尺寸与每行字号/基线）与 `PLAQUE_PANEL`（面板物理宽高与中心位置）供测试投影计算。

## 函数清单
### diorama/textures.ts
| 函数名 | 职责 |
|---|---|
| `createTextures` | 生成原型中的全部画布贴图（招牌、立牌、贩卖机、海报、烟草架、菜单、饮料柜/便当柜标题、公告栏、止まれ标志与路面字、地址牌、菱形标线、瓷砖、地板、格栅、地垫、门贴、卷帘、喫茶招牌、旗子、STAFF ONLY），返回按名称索引的对象 |
| `drawPlaque` | 在给定画布上下文按 `PLAQUE_LAYOUT` 绘制铭牌三行（黄铜渐变底、深色刻字），第一行最大、第三行大于第二行，`fillText` 带最大宽度 |
| `CANVAS_TEXT` | 所有画布贴图会画到的文字（招牌、海报、铭牌中英三行等），供字体预加载 |

### diorama/fonts.ts
| 函数名 | 职责 |
|---|---|
| `loadCanvasFonts` | 导入两款打包字体的 CSS，按完整字体栈 `FONT_D`/`FONT_R` 与 `CANVAS_TEXT` 调用 `document.fonts.load`（含 Noto 补字分片），3 秒超时后照常继续 |

### diorama/plaque.ts
| 函数名 | 职责 |
|---|---|
| `createPlaque` | 创建铭牌网格（黄铜边框 + 贴图平面，名为 `plaque`），挂到展示台正面 |
| `setPlaqueLanguage` | 调用 `drawPlaque` 重绘并标记贴图更新 |

### diorama/ground.ts
| 函数名 | 职责 |
|---|---|
| `buildPedestal` | 底座分层、黄铜线、黑色亮面展示台（环境贴图来自 `RoomEnvironment`），名为 `pedestal` |
| `buildGround` | 路面、地块、对面人行道、路缘石、瓷砖带 |
| `buildRoadMarkings` | 斑马线、停车线、主路黄色中线、边线、菱形、两处「止まれ」、排水沟格栅、停车位线与车挡 |

### diorama/store.ts
| 函数名 | 职责 |
|---|---|
| `glassRainMaterial` | 玻璃雨痕叠加着色器材质（沿用原型，按玻璃尺寸与随机种子生成） |
| `buildStore` | 便利店外墙、玻璃、门框、招牌（上下灯条）、雨棚、屋顶与空调、自动门两扇、地垫、橱窗海报、店内全部陈设（实例化商品）、贩卖机、垃圾桶、雨伞架、旗子；返回动画需要的引用（门扇、招牌材质、旗子）；玻璃雨痕材质共用 05 的时间 uniform |

### diorama/street.ts
| 函数名 | 职责 |
|---|---|
| `buildStreet` | 立式招牌、路灯（聚光灯 + 光锥）、电线杆与电线、信号灯与行人灯、护栏、绿篱、小路「止まれ」标志、小巷标志与反光镜、自行车、公告栏、店后杂物与树、旧楼（窗户、电视光窗）；返回信号灯灯头、行人灯、信号灯点光源、电视光材质引用 |

### diorama/lights.ts
| 函数名 | 职责 |
|---|---|
| `buildLights` | 半球光、月光方向光、店内 4 盏点光源、门口外溢光、贩卖机与立牌点光源 |

## 协作关系
- 使用 05 的 `materials`、`primitives`、`layout`；使用 02 的 `rolesLine`、`COPY`。
- 返回的动画引用交给 07 的环境动效；`setPlaqueLanguage` 由 09 的 `world.ts` 在切换语言时调用。
- 代码按原型对应段落搬移：「底座与地面」「玻璃上的雨痕」「路面标线」「便利店」「店内」「街道设施」「左侧：旧楼、小巷、自行车、公告栏」「店后」「环境光」。

## 验证方式
- 测试入口：`bun test tests/world.test.ts`（通过 `setCanvasFactory` 注入 `tests/fake-canvas.ts`，在 bun 中直接构建 three 场景，不需要 WebGL）
- 测试输入：新建空 `THREE.Scene`，依次调用 `buildPedestal`、`buildGround`、`buildRoadMarkings`、`buildStore`、`buildStreet`、`buildLights`、`createPlaque`。
- 预期结果：
  - 用 `getObjectByName` 能找到上文列出的 10 个名称。
  - 所有网格的世界坐标包围盒都在 `|x|, |z| ≤ 14.8`（展示台外沿）以内。
  - 小路方向（`x` 在 5～11、`z < 5`）上空没有名为 `signal-*` 的车辆信号灯头。
  - 对假画布调用 `drawPlaque(ctx, 'zh')` 记录到的 `fillText` 文本依次为 `FUBUKI_BB`、`全栈工程师 · 系统架构师 · AI Agent开发者`、`点击红色跑车，坐进驾驶座`；`'en'` 时为英文三行。
- [ ] 上述断言全部通过。
- [ ] 铭牌第三行字形投影高度 ≥ 10 像素（单元测试按默认镜头投影第三行实际高度与面板两端）。
- [ ] 所有贴图画出的字符都包含在 `CANVAS_TEXT` 中。
