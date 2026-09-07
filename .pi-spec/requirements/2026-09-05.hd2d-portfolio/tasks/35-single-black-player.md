---
id: T-35
title: M1 单黑装无舌人物等比缩小至80%
depends_on: []
files: [/Users/bb/Projects/0xbb.me/App.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/Hud.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/WorldViewport.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/WorldViewport.css, /Users/bb/Projects/0xbb.me/portfolio/character.ts, /Users/bb/Projects/0xbb.me/portfolio/runtime.ts, /Users/bb/Projects/0xbb.me/design-reference/player-voxel-black.ts, /Users/bb/Projects/0xbb.me/design-reference/player-voxel-black.glb, /Users/bb/Projects/0xbb.me/design-reference/character-comparison.html, /Users/bb/Projects/0xbb.me/design-reference/character-comparison.ts, /Users/bb/Projects/0xbb.me/design-reference/character-design.test.ts, /Users/bb/Projects/0xbb.me/tests/character-toggle.test.ts]
refs: [portfolio/player/AC-1, portfolio/player/AC-11, portfolio/responsive-layout/AC-1]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts ./design-reference/character-design.test.ts && ./node_modules/.bin/tsc --noEmit
status: doing
agent: 9e575291-776f-4903-aaed-c27dc61bddce
commit: ""
note: "原Red→Green运行56d38caf-92a9-4ff2-9fe9-ba1d9e1f4c09通过；AI-024续修已清理旧测试准备旅程且未改生产代码或断言语义，主agent再次复验40 pass、1308断言及tsc通过。已实看单黑装闭嘴与80%效果，仅本任务完成，不代表完整步态或M1通过。"
---
## 1. 目标
主页仅显示黑装Minecraft人物，无舌头、无造型切换，整体等比80%；保留既有场景、相机、移动与阅读，独立模型页只看和导出该黑装模型。
## 2. 业务规则
- player/C-1：系统应默认显示最新黑装参考对应的 Minecraft 方块三维主角，具有银白高马尾、蓝眼、蓝色耳饰、自然闭嘴且无舌头的表情、黑色短外套与短上衣、腰部肤色色块、黑短裤与腰带、单侧长袜、带蓝色挂饰的厚底系带靴；身体部件、衣装色块和完整手脚可辨认，不能以 SVG 或位图人物替代。
- player/C-11：系统应仅显示黑装 Minecraft 主角，不提供人物造型切换按钮或白装对照入口；人物三个方向尺寸相对原 3 单位模型均为 80%，高度为 2.4 场景单位，头身比例和脚底原点不变。房屋、镜头、移动速度、语言与资料操作不因此改变，重复更新不得累积缩放，预览期间仍应明确完整行走动画尚未完成。
- responsive-layout/C-1：系统应在 1440×900、390×844、844×390 三种视口展示可用的主人公画面、语言入口及资料速览入口，不产生整页水平滚动。
### player/AC-1 角色设定可辨认 ← C-1
- 触发: 操作 观察起点主人公的全身造型。
- Given: 最新黑装人物参考已由用户指定，主页与角色模型加载成功。
- When: 访客观察默认主角，并将头部、衣装与腿脚同参考对照。
- Then: 默认是完整的 Minecraft 方块三维人物，可辨认银白高马尾、蓝眼、蓝色耳饰、自然闭嘴无舌头、黑短外套/短上衣、腰部肤色、短裤/腰带、单侧长袜及带蓝挂饰的系带厚底靴；不是 SVG、位图或带矩形背景的图卡。
### player/AC-11 单黑装与等比 80% 尺寸 ← C-11
- 触发: 操作 打开主页，在相同视口观察人物与房屋，移动、打开资料、切换语言并关闭资料后继续移动。
- Given: 黑装人物与城镇可正常显示，原尺寸基线为高 3 场景单位。
- When: 访客核对人物整体尺寸、脚底位置以及主页和资料面板中的控制，持续移动并刷新。
- Then: 只有黑装人物且没有造型切换或白装入口，人物等比缩至 80%、高 2.4 单位，脚底原点及头身比例保持；房屋、镜头、速度和语言/资料操作不变，持续更新不继续缩小，仍明确完整步态未完成。
### responsive-layout/AC-1 三种视口入口 ← C-1
- 触发: 操作 分别以 1440×900、390×844、844×390 打开主页。
- Given: 图形与必要资源加载成功。
- When: 访客查看世界画面、语言入口和资料速览入口。
- Then: 每种视口均能看到并使用对应入口，主人公可见，页面没有需要左右拖动才能消除的整页水平溢出。
## 3. 涉及文件
- 修改App.tsx、Hud.tsx、WorldViewport.tsx及对应CSS：移除造型选择状态、回调、按钮与孤立布局；保留语言/资料及关闭后移动恢复。
- 修改portfolio/character.ts、runtime.ts：只挂黑装模型，删除CharacterStyle/select/setCharacterStyle等切换接口，不重建相机或改变道路/速度；必要时使角色接触阴影随人物尺寸协调，不改房屋。
- 修改design-reference/player-voxel-black.ts及GLB：去舌头与吐舌口型，使用自然闭嘴；构造时一次性等比0.8，不在每帧累乘。源模型与GLB均为2.4高、脚底0。
- 修改character-comparison.html/ts：改为黑装单模型查看、旋转、视角/背景及黑装导出，移除白装面板、白装导出和对比文字，不新增重定向或替代模式。
- 修改tests/character-toggle.test.ts与character-design.test.ts：按新契约取消切换和原3高断言，保护仍有效的控制/语言/资料与无位图检查；只在Red阶段修改。
- 只读tests/browser.ts、tests/portfolio-playable.test.ts、data.ts、portfolio/input.ts、state.ts、world.ts、scenes/town.ts、geometry.ts及依赖。player-voxel.ts仅为黑装仍实际使用的基础构造器，不复制整套骨架或为清理而改其数据；不再提供白装对照页面/下载入口。
## 6. 函数清单
- createBlackOutfitPlayerVoxel：只返回闭嘴、无舌头、等比80%的黑装实例。
- createCharacter：只创建一个黑装人物并按已有会话更新位置和朝向，无造型选择接口。
- App/Hud/WorldViewport/mountWorld：清除切换职责，维持探索、语言与资料操作。
- 模型页/exportVoxel：单黑装模型展示与导出，不接受白装类型选择。
## 7. 协作关系
- USER-027/028、AI-022已确认当前范围，不再执行旧T-34或其提交决定；背景、相机、速度及完整动画的后续范围不扩张。
- 黑装原尺寸实测为[x=1.2030719151632912,y=3.0000000000000004,z=1.0048746332120269]，min.y=0；目标为各维乘0.8、y=2.4，不能通过改视口/相机或隐藏模型部位凑结果。去舌后的其余造型比例保持。
- 当前真实模型包含Tongue、Tongue_crease及Open_smile，原基础构造中存在正常Mouth；删除吐舌并使用中性闭嘴，不加替换开关或模型测试钩子。
- 原白装构造器源码哈希b39748b4d37a12c8b4a82d9cf1ba3099d7fc905edc074d85b0e451035c2fcbef应不变；运行时不额外创建白装实例，单黑装构造内部复用不等于提供白装选项。
## 8. 验证方式
- 测试授权：首次Red仅修改tests/character-toggle.test.ts与design-reference/character-design.test.ts；tests/browser.ts和tests/portfolio-playable.test.ts只读保留。Red之后不得弱化断言换取Green。
- AI-024续修仅允许tests/character-toggle.test.ts移除无消费的toggle、SVG/白装/失败恢复准备旅程及孤立字段；不得改新断言语义或生产代码。清理前后跑完整verify，并明确引用同任务原生运行56d38caf-92a9-4ff2-9fe9-ba1d9e1f4c09的真实Red：12 pass/6 fail，按钮1而非0、尺寸3而非2.4、Tongue/Tongue_crease存在；不得制造假Red。报告清理的测试文件与未改断言证据。
- 独立命令：cd /Users/bb/Projects/0xbb.me && bun test ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts ./design-reference/character-design.test.ts && ./node_modules/.bin/tsc --noEmit。
- 使用已恢复的ego-browser和原runBrowser真实页面入口http://127.0.0.1:3000/；先确认HTTP与浏览器正常，再因现有切换按钮、模型3高及舌头存在产生真实行为Red，不把导入或环境错误作为Red。
- 公开模型接口为已存在的createBlackOutfitPlayerVoxel返回Group及实际GLB；测量真实几何包围盒为原[x=1.2030719151632912,y=3,z=1.0048746332120269]各乘0.8（允许浮点误差），高度2.4、脚底0；多次构造/更新尺寸不累积变化。
- 真实几何和导出模型不再有舌头/吐舌口型，实际近景截图确认自然闭嘴，不用仅改网格名称隐藏舌头；黑装、银白马尾、蓝眼/耳饰、腰部肤色、短裤/腰带、单侧袜、靴带/鞋带/蓝饰保持可辨。
- 三视口主页与资料面板中均没有造型切换按钮或白装入口；有一个正常画布、语言/速览/左右控件，打开/关闭资料和切语言保持会话、画布及位置，页面不横向溢出。
- 同视口起点和道路中段截图对照：房屋/地标/镜头不变，黑装人物变为原80%且脚底落在原处；实际左右键/触屏移动，释放/关闭资料后恢复正常；不因重复更新继续缩小，不把静态移动宣称完整步态。
- 黑装GLB实际重新导出并由GLTFLoader回读，几何高度2.4、无images/textures，不能写伪GLB。单模型页旋转与导出可用，无白装或SVG人物面板及下载。
- 未发布参考PNG只供查看，不进入人物或预览页面请求；不改旧metadata/public-assets已知Red所属的T-29，不安装依赖、不操作git/任务字段或派工。
