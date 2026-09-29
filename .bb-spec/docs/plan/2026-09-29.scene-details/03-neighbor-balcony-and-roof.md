---
name: 03-neighbor-balcony-and-roof
description: 旧楼二楼窗帘、阳台晾衣杆与空衣架、盆栽、空调，以及屋顶女儿墙、楼梯间、晾衣架
---
# 旧楼二楼阳台与屋顶

## 目标
二楼有住家的生活感，屋顶有常见的杂物，同时旧楼总物件数守在上限以内。

## 业务规则（来源：spec scene/neighbor-building）
- 旧楼的全部物件都在 `neighbor-building` 组里，组内可绘制物件总数不超过 72 个。
- 二楼：
  - 正面两扇窗和侧面的窗都挂着窗帘，窗帘画在窗户贴图上。
  - 各扇窗的灯光：正面一扇暖光、一扇暗；侧面一扇白光、一扇电视光（忽明忽暗）、一扇暗。
  - 阳台上有一根晾衣杆，挂着 3 到 4 个空衣架，不挂衣服。
  - 阳台上有 2 到 3 盆盆栽和一台空调外机。
- 屋顶：
  - 四周围一圈女儿墙。
  - 有一间带门的楼梯间小屋。
  - 有一个晾衣架。
  - 有一个水箱和一根天线。
- 旧楼的实体物件都带深蓝色细描边。
- 高档和低档画质下，旧楼显示的物件完全相同。

## 现状
- 二楼窗户由 `diorama/street.ts` 旧楼代码块里的局部函数 `win()` 生成：窗框盒子、窗面平面（传入的材质）、竖向窗棂。
  - 正面两扇：`glow('#ffc97a', 1.05)` 暖光、`toon('#26304a')` 暗。
  - 侧面三扇：`glow('#e8f2ff', 0.85)` 白光、`glow('#7fa8ff', 0.9)` 电视光、`toon('#26304a')` 暗。
- 电视光窗的窗面材质通过 `buildStreet` 返回值 `tvMaterial` 交给 `diorama/ambient.ts`，那里每帧改它的 `color`。
  - 窗面材质挂上窗帘贴图后，颜色和贴图相乘，闪烁照样生效。
  - `tvMaterial` 仍要指向电视光窗的窗面材质。
- 阳台：板子在 y≈3.9、z≈-3.15；13 根竖杆和一根扶手在 z≈-2.82；x 范围约 [-12.3,-8.5]。
- 屋顶：板顶面在 y=7.2，占 x∈[-13.1,-7.5]、z∈[-13.1,-3.4]。水箱在 (-11.5, 7.2, -10.5)（1 个圆柱加 4 条腿），天线在 x=-9、z=-6。
- `primitives.ts` 的 `acUnit()` 一台就生成 9 个网格，超出预算，这里不用它。
- 描边效果不支持实例化网格，所以衣架和盆栽做成单独的小网格。多块同材质的零件用 `three/addons/utils/BufferGeometryUtils.js` 的 `mergeGeometries` 合并。

## 涉及文件
- 修改：`diorama/textures.ts`
- 修改：`diorama/street.ts`
- 修改（测试，由 Test Agent 负责）：`tests/world.test.ts`

## 函数清单
### diorama/textures.ts
| 名称 | 职责 |
|---|---|
| `Textures`（接口） | 新增 `curtain`、`acFront` |
| `createTextures` | 新增窗帘褶皱贴图（浅色布料加竖向褶皱阴影，中间留一道缝）；新增空调外机正面贴图（圆形扇叶格栅加右侧铭牌） |

### diorama/street.ts
| 名称 | 职责 |
|---|---|
| `win()`（旧楼代码块内的局部函数） | 修改。窗面材质挂上 `textures.curtain` 贴图，各扇窗的颜色和亮度保持原值；电视光窗的窗面材质仍作为 `tvMaterial` 返回 |
| `buildStreet`（旧楼代码块） | 修改。阳台加晾衣杆（一根横杆）、4 个衣架（每个一个网格）、3 个盆栽（每个是花盆和植物用 `mergeGeometries` 合成的一个网格）、1 台空调外机（一个盒子，正面贴 `acFront`）；屋顶板四周加女儿墙（四段合成一个网格）；加楼梯间小屋（一个盒子加一个门平面）；加晾衣架（立柱和横杆合成一个网格）；给水箱圆柱和天线命名；所有新物件命名（见验证方式） |

## 协作关系
- `ambient.ts` 通过 `street.tvMaterial` 改颜色，接口不变，不用改。
- 女儿墙、楼梯间放在屋顶板顶面（y=7.2）上。楼梯间和晾衣架不要压住水箱和天线。
- 屋顶积水涟漪层（01 负责）在旧楼组外，不计入本组预算。
- 预算估算：
  - 执行本 plan 前，组内约 48 个（02 完成后）。
  - 本 plan 新增约 13 个：晾衣杆 1、衣架 4、盆栽 3、空调 1、女儿墙 1、楼梯间 2、晾衣架 1。
  - 合计约 61 个，低于上限 72。

## 验证方式
- 测试入口：`bun test tests/world.test.ts`，沿用该文件的 `assembleScene()` 组装场景（fake canvas）。
- 测试输入：按名称在场景中查找以下对象：
  - 阳台：`balcony-pole`、`balcony-hanger`（多个同名）、`balcony-pot`（多个同名）、`balcony-ac`。
  - 屋顶：`neighbor-parapet`、`neighbor-stair-house`（组，内含名为 `neighbor-stair-door` 的门）、`neighbor-drying-rack`、`neighbor-water-tank`、`neighbor-antenna`。
  - 另外：`buildStreet` 的返回值 `tvMaterial`。
- 预期结果：
  - 同名 `balcony-hanger` 有 3 到 4 个，这里是 4 个；阳台一带（y 在 3.9 到 5.5、z 大于 -3.5）没有名字含 `cloth`、`shirt`、`towel` 的物件。
  - 同名 `balcony-pot` 有 2 到 3 个，这里是 3 个。
  - 以上阳台物件都在阳台范围内：y 在 3.9 到 5.5 之间，z 在 -3.5 到 -2.7 之间。
  - `neighbor-parapet`、`neighbor-stair-house`、`neighbor-drying-rack`、`neighbor-water-tank`、`neighbor-antenna` 的包围盒底部都不低于 7.15，即都在屋顶上。
  - `neighbor-stair-house` 内能找到 `neighbor-stair-door`。
  - 旧楼二楼五扇窗的窗面材质都有 `map`，且是同一张窗帘贴图。
  - `tvMaterial` 是其中一扇窗的窗面材质。
  - `neighbor-building` 组内 Mesh 总数不超过 72。
  - 除发光面外，组内网格材质都没有关闭描边。
- [ ] 以上各项断言通过，全量 `bun test` 与 `tsc` 通过
- [ ] 1440×900 生产构建下旋转 30 秒的帧率用例仍然通过
