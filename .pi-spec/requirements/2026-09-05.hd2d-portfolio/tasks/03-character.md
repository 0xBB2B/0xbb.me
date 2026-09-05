---
id: T-3
title: M1 全身像素主人公
depends_on: []
files: [/Users/bb/Projects/0xbb.me/portfolio/geometry.ts, /Users/bb/Projects/0xbb.me/portfolio/character.ts, /Users/bb/Projects/0xbb.me/portfolio/geometry.test.ts, /Users/bb/Projects/0xbb.me/portfolio/character.test.ts]
refs: [portfolio/player/AC-1, portfolio/player/AC-2, portfolio/site-entry/AC-5]
parallel: true
verify: cd /Users/bb/Projects/0xbb.me && bun test ./portfolio/geometry.test.ts ./portfolio/character.test.ts
status: doing
step: test
agent: wf_4bd9ad9fc500
commit: ""
note: "设计参考可从 public/profile-full.png 或 T-12 迁移后的 design-reference/profile-full.png 读取；不作为运行素材。"
---
## 1. 目标
以程序化几何表现具有个人辨识度的全身像素角色和真实交替步态。
## 2. 业务规则
- player/C-1：系统应展示具有银白马尾、蓝色眼睛和黑白服饰的全身像素主人公，双腿与双脚完整；角色外缘不带矩形立绘背景。
- player/C-2：当主人公在待机、向左行走和向右行走之间切换时，系统应展示对应状态与朝向，行走时可见双腿交替迈步，待机时停止迈步，不能以整幅立绘平移代替行走动画。
- site-entry/C-5：系统应仅用程序化图形或纯矢量 SVG 交付主人公、NPC、背景、道具、特效、头像、图标及交互 UI，动画由代码驱动；成品不得包含 PNG、JPEG/JPG、WebP、GIF、BMP、AVIF、TIFF 等位图素材或位图精灵表。正常屏幕栅格化不视为位图素材，设计参考及测试截图不得进入发布产物。
### player/AC-1 角色设定可辨认 ← C-1
- 触发: 操作 观察起点主人公的全身造型。
- Given: 图形及角色资源加载成功。
- When: 访客查看主人公及其周围背景。
- Then: 可辨认银白马尾、蓝眼、黑白服饰、完整双腿和双脚；人物边缘外显示场景而非矩形立绘底色。
### player/AC-2 待机行走转向 ← C-2
- 触发: 操作 先不输入方向，再向右走、松开、向左走。
- Given: 主人公位于道路中段且未打开阅读面板。
- When: 访客执行待机、右行、停止、左行四个动作。
- Then: 待机停止迈步，左右行走时分别面向相应方向并有交替步态；动画切换不使脚底持续上下跳动或将人物变为滑动整幅立绘。
### site-entry/AC-5 无位图的图形成品 ← C-5
- 触发: 命令 bun run build，并检查生成的图形产物和完整页面。
- Given: 构建成功，桌面和触屏均可访问全部场景、NPC 与阅读界面。
- When: 检查构建产物的实际图形格式，操作主人公、NPC、全部场景和交互 UI，查看头像、图标与页面图形引用。
- Then: 所有成品图形为程序化图形或纯矢量 SVG，行走及交互动画正常；位图文件与位图精灵表数量为 0，原始设计参考和测试截图没有进入发布产物。
## 3. 涉及文件
- 新建 `/Users/bb/Projects/0xbb.me/portfolio/geometry.ts`、`/Users/bb/Projects/0xbb.me/portfolio/character.ts`。
- 新建 `/Users/bb/Projects/0xbb.me/portfolio/geometry.test.ts`、`/Users/bb/Projects/0xbb.me/portfolio/character.test.ts`。
## 6. 函数清单
- geometry.ts：createPixelForm，建立像素形体与分组；disposeGeometry，释放自身图形资源。
- character.ts：createCharacter，建立全身人物；animateCharacter，更新待机、左右步态和朝向。
## 7. 协作关系
使用现有 Three.js；runtime 持有主人公并按状态推进动画，场景可调用几何能力构造 NPC。原始设定图只供观察，可在 T-12 迁移前后读取，不导入应用。不开新引擎，不复制许可不明图形。
## 8. 验证方式
- 测试写入授权：仅新增或修改 `/Users/bb/Projects/0xbb.me/portfolio/geometry.test.ts`、`/Users/bb/Projects/0xbb.me/portfolio/character.test.ts`；不得修改生产文件、图像或任务字段。
- 独立验证命令：`cd /Users/bb/Projects/0xbb.me && bun test ./portfolio/geometry.test.ts ./portfolio/character.test.ts`。
- 公开验证入口：`portfolio/geometry.ts` 的 createPixelForm、disposeGeometry，及 `portfolio/character.ts` 的 createCharacter、animateCharacter。设计参考输入为 `public/profile-full.png` 或迁移后的 `design-reference/profile-full.png`，仅可读取，不作为测试生成的运行素材；按业务规则检查可渲染外形、材质及动画结果。
- 调用公开构造接口得到可渲染几何：观察几何外形、材质及纹理资源，银白马尾、蓝眼、黑白服饰、完整腿脚存在，无矩形图卡或位图纹理。
- 给公开动画接口输入待机、右行、停止、左行及一完整周期时间：朝向正确，左右腿交替变化，停止迈步且脚底锚点稳定；重复创建/释放不留自身资源。
- M1 联调后 ego-browser 录制同一角色四状态并交用户确认辨识度、步态；几何测试不能替代视觉确认。
- 本任务只证明样板图形；全站 site-entry/AC-5 由 T-24 核验全部产物与页面，不把未来场景记为已通过。
