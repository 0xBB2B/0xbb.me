---
name: 02-neighbor-walls-and-kissa
description: 旧楼外墙分成一楼瓷砖、二楼抹面加分隔线，补雨水管与电表箱，一楼换成营业中的喫茶店门面
---
# 旧楼外墙与一楼喫茶店

## 目标
旧楼一楼和二楼墙面有不同的材质，墙上有附属物；一楼正面是夜里亮着灯的喫茶店，门外有菜单黑板和灯箱。

## 业务规则（来源：spec scene/neighbor-building）
- 旧楼是隔着小巷、位于便利店左侧的两层楼，正面朝主路。它的全部物件都在场景名为 `neighbor-building` 的组里，组内可绘制物件总数不超过 72 个。
- 外墙四面都有材质：
  - 一楼（离底座地面约 3.5 米以下）是暖褐色小口瓷砖，能看出瓷砖和砖缝。
  - 二楼是灰白色水泥抹面，带从上往下的深色雨水流痕。
  - 两层之间有一道横向分隔线，四面连续，高度在离地 3.2 到 3.8 米之间。
- 一楼墙面和二楼墙面使用不同的贴图。
- 一根雨水管从屋顶边沿竖直通到地面；一楼侧墙上有一个电表箱。
- 一楼喫茶店：
  - 正面是木框玻璃门，旁边是大玻璃窗，没有卷帘门。
  - 玻璃后面是画在贴图上的店内：吧台、高脚凳、暖色吊灯。
  - 玻璃整块发暖黄色光，亮度不随灯光变化，颜色的红色分量大于蓝色分量。
- 门上方有「喫茶ルナ」招牌和红色雨棚。
- 门口人行道上有一块立式菜单黑板和一个发光的小灯箱。
- 旧楼不包含任何点光源或聚光灯；门口地面上的暖色只来自湿路面倒影。
- 旧楼的实体物件都带深蓝色细描边；发光面（店面玻璃、灯箱面）可以关描边。
- 高档和低档画质下，旧楼显示的物件完全相同。

## 现状
- 旧楼代码在 `diorama/street.ts` 的 `buildStreet` 里，从 `neighborBuilding.name = 'neighbor-building'` 开始的代码块。
- 主体是 `box(b, 5.4, 6.8, 9.5, toon('#7d8497'), -10.3, 0.15, -8.25)`，占 x∈[-13,-7.6]、z∈[-13,-3.5]。
- 正面在 z=-3.5（朝 +z），侧面在 x=-7.6（朝小巷，+x）。
- 卷帘门：`plane(b, 3.2, 2.3, toon('#fff', { map: textures.shutter }), -10.6, 1.35, -3.49)`。
- 门前已有物件：公告栏组在 (-12.2, 0.15, -3.2)，占 x∈[-13,-11.4]；两辆自行车在 x≈-10.9 和 -10.1、z≈-1.5。新物件不能和它们重叠。
- 画布贴图用 `diorama/materials.ts` 的 `ctex()` 创建，在 `diorama/textures.ts` 的 `createTextures()` 里注册到 `Textures` 接口。
- 画布上写的每个字都必须出现在 `textures.ts` 的 `SIGNAGE_TEXT` 里；`tests/world.test.ts` 会双向校验，字不能多也不能少。
- 发光材质用 `materials.ts` 的 `glow(color, k, { map })`（MeshBasicMaterial，不受光照）。
- 关描边用 `noOutline()`，或给 `glow` / `toon` 传 `noOutline: true`。

## 涉及文件
- 修改：`diorama/textures.ts`
- 修改：`diorama/street.ts`
- 修改（测试，由 Test Agent 负责）：`tests/world.test.ts`

## 函数清单
### diorama/textures.ts
| 名称 | 职责 |
|---|---|
| `Textures`（接口） | 新增 `wallTile1f`、`wallMortar2f`、`kissaFront`、`kissaMenu`、`kissaLamp`；删除 `shutter` |
| `createTextures` | 新增上述 5 张画布贴图：暖褐小口瓷砖加砖缝（可平铺）；灰白抹面加竖向深色流痕（可平铺）；木框玻璃门加大窗，窗内画吧台、高脚凳、暖色吊灯；深色菜单黑板加手写菜单文字；灯箱面（暖白底加店名或「COFFEE」）。删除 `shutter` 的创建代码 |
| `SIGNAGE_TEXT`（常量） | 加入菜单黑板和灯箱上新写的每一段文字 |

### diorama/street.ts
| 名称 | 职责 |
|---|---|
| `wallMaterials` | 新增。给一个盒子按六个面生成材质数组：每个面克隆一次墙面贴图，并按该面的实际宽高设置 `repeat`，使瓷砖和抹面在各面上的尺度一致 |
| `buildStreet`（旧楼代码块） | 修改。主体盒子拆成一楼盒子（y 0.15 到 3.5）和二楼盒子（y 3.5 到 6.95），分别用 `wallMaterials` 贴 `wallTile1f`、`wallMortar2f`；在 y≈3.5 加一圈比墙体略大的分隔线盒子；在正面靠小巷的墙角加一根竖直雨水管（从屋顶板边沿到地面）；在侧墙一楼加电表箱；把卷帘门平面换成 `glow` 加 `kissaFront` 贴图的店面平面；在门外人行道上加菜单黑板（A 字形，两块板用 `mergeGeometries` 合成一个网格，放在 x≈-8.5、z≈-3.0）和发光灯箱（x≈-11.0、z≈-3.1）；给新物件设名称（见验证方式）；不加任何光源 |

## 协作关系
- `mergeGeometries` 从 `three/addons/utils/BufferGeometryUtils.js` 导入。它是已安装的 three 自带的扩展，不是新依赖。
- 描边效果（OutlineEffect）支持材质数组，所以按面贴图的墙体也会正常描边。
- 不用实例化网格：描边效果不支持实例化，会把描边画错位置。
- `store.ts`、`ambient.ts` 不用改。
- `neighbor-building` 组内的 `win()` 窗户、阳台、水箱、天线保持原样，由 03 处理。

## 验证方式
- 测试入口：`bun test tests/world.test.ts`，沿用该文件的 `assembleScene()` 组装场景（fake canvas）。
- 测试输入：按名称在场景中查找以下对象：
  - 墙体：`neighbor-wall-1f`、`neighbor-wall-2f`。
  - 分隔线：`neighbor-floor-line`。
  - 附属物：`neighbor-rain-pipe`、`neighbor-meter`。
  - 喫茶店：`kissa-front`、`kissa-menu-board`、`kissa-lightbox`。
- 预期结果：
  - `neighbor-building` 组存在，组内 Mesh 总数不超过 72，组内没有 `THREE.Light` 实例。
  - `neighbor-wall-1f` 和 `neighbor-wall-2f` 的材质贴图来自两张不同的画布（`map.image` 不同）。
  - `neighbor-floor-line` 的包围盒中心高度在 3.2 到 3.8 之间。
  - `neighbor-rain-pipe` 竖直，包围盒从地面（y≤0.3）延伸到屋顶板附近（y≥6.8）。
  - `kissa-front` 的材质是 MeshBasicMaterial，颜色 r 大于 b。
  - `kissa-menu-board` 和 `kissa-lightbox` 都在正面门外：z 大于 -3.5，x 在 [-13,-7.6] 内。
  - 场景中没有任何网格使用卷帘门贴图（`Textures` 上不再有 `shutter`）。
  - 除 `kissa-front` 和灯箱发光面外，旧楼组内网格材质的 `userData.outlineParameters.visible` 不为 false。
  - 现有字体预加载的双向校验用例仍然通过。
- [ ] 以上各项断言通过，全量 `bun test` 与 `tsc` 通过
