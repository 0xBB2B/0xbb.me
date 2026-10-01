---
name: license-plate
description: 画日本车牌贴图，把两块车牌装到保时捷车头和车尾，字体预载文字加上车牌的字
---
# 保时捷的日本车牌

## 目标
保时捷车头、车尾各出现一块白底绿字的日本车牌，写着「秋葉原 310 / み ・9 92」。

## 业务规则（来源：spec car-license-plate）
- 车头、车尾各一块车牌，内容相同，正好 2 块。
- 样式：白底、绿字、不发光。上排是地名「秋葉原」和分类号「310」；下排左边是平假名「み」，右边是号码「・9 92」（三位数前补圆点，百位和后两位之间留一个空）。
- 尺寸按真车比例宽 33 厘米、高 16.5 厘米；车牌跟着整车等比缩到 90%，场景里实际宽 29.7 厘米、高 14.9 厘米，误差不超过 1 厘米。
- 两块都左右居中，中心偏离车身中轴线不超过 1 厘米；中心离停车场地面 40 到 50 厘米。
- 车尾车牌整块低于贯穿式尾灯下沿、高于排气管上沿。车头车牌整块高于进气口上沿，上沿不高于前大灯下沿。
- 车牌贴着车身：在车牌中心处，背面离它正后方的车上部件表面不超过 3 厘米；从车牌正前方朝车牌中心和四角看，先碰到的都是车牌。
- 车牌不发光：材质颜色亮度低于泛光阈值 0.97，不产生光晕；场景里灯的数量不变。
- 车牌是贴在车身表面的薄板，字画在贴图上，不加载外部图片或模型；用招牌已经在用的字体，不新增字体文件。
- 车牌贴图画的每个字都在字体预载文字里，字体预载文字里没有任何贴图都不画的字。

## 涉及文件
- `diorama/textures.ts`（修改）
- `diorama/car.ts`（修改）
- `tests/car.test.ts`（修改）
- `tests/world.test.ts`（修改）

## 成品定义
车牌在车身自己的坐标里的摆放（缩放前；车头朝 +x，y 向上，z 是车宽方向；`buildCar` 末尾会把整车缩到 90% 并转向）：

```ts
// 薄板尺寸：宽 0.33（沿 z），高 0.165（沿 y）
// 车头：name = 'license-plate-front'，中心 (2.275, 0.51, 0)，板面朝 +x，绕 z 轴后仰 15°（上沿往 -x 倒）
// 车尾：name = 'license-plate-rear'， 中心 (-2.345, 0.52, 0)，板面朝 -x，竖直
// 贴图画布 512 × 256；底色 '#f2f3ee'；字色 '#1f5d3a'
// fillText 调用正好四次，文字依次为：'秋葉原'、'310'、'み'、'・9 92'
// 材质：不发光的卡通材质（项目里的 toon()），基色 '#d9dbd6' 乘贴图，使亮度低于泛光阈值 0.97
// SIGNAGE_TEXT 新增四项：'秋葉原'、'310'、'み'、'・9 92'
```

## 函数清单
### diorama/textures.ts
| 函数名 | 职责 |
|---|---|
| `drawLicensePlate`（新增，导出） | 在画布上画车牌：底色、圆角边框、上排地名和分类号、下排平假名和号码 |

### diorama/car.ts
| 函数名 | 职责 |
|---|---|
| `buildCar`（修改） | 用 `ctex` 和 `drawLicensePlate` 生成一张车牌贴图，创建车头、车尾两块具名薄板并加到车组里 |

## 协作关系
- `buildCar` 调 `ctex`（`diorama/materials.ts`）生成贴图，画法是 `drawLicensePlate`；材质用 `toon`。
- `drawLicensePlate` 的字体用 `FONT_D` / `FONT_R`（`diorama/textures.ts` 已有）。
- `CANVAS_TEXT` 由 `SIGNAGE_TEXT` 拼出，`diorama/fonts.ts` 用它预载字体，不需要改 `fonts.ts`。
- `diorama/textures.ts` 目前不依赖 `car.ts`，`car.ts` 新增对 `textures.ts` 的依赖，方向是单向的。

## 验证方式
- 测试入口：
  - `buildCar()`（`diorama/car`）返回的 `group`：里面有两个网格，名字是 `license-plate-front` 和 `license-plate-rear`。测试把 `group` 加进场景并 `updateMatrixWorld(true)` 后按世界坐标量。车头朝世界 +z，车宽方向是世界 x，停车场地面在世界 y = `CAR_CENTER[1]`（`diorama/layout`）。
  - `drawLicensePlate`（`diorama/textures`）：传入假画布（`tests/fake-canvas.ts`）的 2D 上下文和画布宽高，读 `fillTextCalls` 和 `fillStyleCalls`。
  - `CANVAS_TEXT`（`diorama/textures`）。
- 测试输入：无参数；测试前用 `setCanvasFactory(createFakeCanvasFactory())`。
- 预期结果：
  - [ ] 名字以 `license-plate-` 开头的网格正好 2 个；front 的中心在车身包围盒中心的 +z 一侧，rear 在 -z 一侧。
  - [ ] 每块世界包围盒：宽（世界 x）0.297 ± 0.01，高（世界 y）0.149 ± 0.01。
  - [ ] 每块中心的世界 x 与车身包围盒中心的 x 相差不超过 0.01。
  - [ ] 每块中心的世界 y 减去停车场地面高度，在 0.40 到 0.50 之间。
  - [ ] 车尾车牌最高点低于贯穿式尾灯（红色发光长条，现有测试已有筛选办法）的最低点，最低点高于排气管（灰色圆柱 `#a3aab5`）的最高点。
  - [ ] 车头车牌最低点高于进气口（车头最前面的黑色盒子）的最高点，最高点不高于前大灯灯罩（现有测试已有筛选办法）的最低点。
  - [ ] 从车牌中心沿车牌背面方向打射线，碰到车上其他网格的距离不超过 0.03；从车牌正前方 1 米处朝车牌中心和四角（向内缩 1 厘米）打射线，先碰到的是车牌。
  - [ ] 车牌材质不是发光材质（没有非黑的 emissive，不是 `glow()` 做的 MeshBasicMaterial），材质颜色亮度小于 0.97；车组里的灯仍然只有 4 盏双闪点光源。
  - [ ] `drawLicensePlate` 的 `fillTextCalls` 正好是「秋葉原」「310」「み」「・9 92」；`fillStyleCalls` 里有白色系底色和绿色字色（绿色分量大于红、蓝分量）。
  - [ ] 现有的两条字体预载测试（`tests/world.test.ts`「every character drawn on canvas textures…」和「the font preload text contains no character beyond…」）把车牌画布也算进"画出的字"之后仍然通过：车牌的字都在 `CANVAS_TEXT` 里，`CANVAS_TEXT` 里没有多余的字。
