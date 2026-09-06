---
id: T-27
title: M1 可操控黄昏城镇
depends_on: []
files: [/Users/bb/Projects/0xbb.me/App.tsx, /Users/bb/Projects/0xbb.me/index.css, /Users/bb/Projects/0xbb.me/portfolio/geometry.ts, /Users/bb/Projects/0xbb.me/portfolio/character.ts, /Users/bb/Projects/0xbb.me/portfolio/state.ts, /Users/bb/Projects/0xbb.me/portfolio/input.ts, /Users/bb/Projects/0xbb.me/portfolio/runtime.ts, /Users/bb/Projects/0xbb.me/portfolio/world.ts, /Users/bb/Projects/0xbb.me/portfolio/scenes/town.ts, /Users/bb/Projects/0xbb.me/components/portfolio/WorldViewport.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/WorldViewport.css, /Users/bb/Projects/0xbb.me/components/portfolio/Hud.tsx, /Users/bb/Projects/0xbb.me/tests/browser.ts, /Users/bb/Projects/0xbb.me/tests/portfolio-playable.test.ts]
refs: [portfolio/player/AC-1, portfolio/player/AC-2, portfolio/player/AC-3, portfolio/player/AC-4, portfolio/player/AC-5, portfolio/player/AC-7, portfolio/world/AC-2, portfolio/responsive-layout/AC-1]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./tests/portfolio-playable.test.ts
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
从现有主页直接替换成一个可真实行走的黄昏城镇样板：代码绘制的全身二维像素人物、立体道路布景、跟随镜头和键盘/触屏操作。
## 2. 业务规则
- player/C-1：系统应展示具有银白马尾、蓝色眼睛和黑白服饰的全身像素主人公，双腿与双脚完整；角色外缘不带矩形立绘背景。
- player/C-2：当主人公在待机、向左行走和向右行走之间切换时，系统应展示对应状态与朝向，行走时可见双腿交替迈步，待机时停止迈步，不能以整幅立绘平移代替行走动画。
- player/C-3：当桌面访客持续按住 A、D、左方向键或右方向键时，系统应分别向左、向右、向左或向右移动主人公，并允许停下或回头，不要求跳跃才能走完全程。
- player/C-4：当触屏访客持续按住屏幕左行或右行按钮时，系统应向对应方向移动主人公，松手后停止。
- player/C-5：如果方向输入结束、触屏操作被取消或窗口失去焦点，系统应停止行走；恢复焦点时不得因失焦前的输入继续移动，必须重新操作。
- player/C-7：如果访客在道路起点向左或在终点向右持续操作，系统应将主人公限制在道路可行走范围内，不使其离开场景或落出道路。
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
### player/AC-3 四种键盘输入 ← C-3
- 触发: 操作 分别按住 A、D、左方向键、右方向键后松开。
- Given: 桌面访客位于道路中段，未打开对话或速览。
- When: 访客逐一执行四种方向输入，并沿道路走完全程。
- Then: 移动方向依次为左、右、左、右，可以回头，完成探索不需要跳跃或战斗。
### player/AC-4 触屏移动 ← C-4
- 触发: 操作 持续按住并松开触屏左右按钮。
- Given: 触屏模式下，主人公位于道路中段。
- When: 访客分别长按左行和右行按钮后松手。
- Then: 主人公在按住期间向对应方向行走，松手后停止，两种方向均可使用。
### player/AC-5 输入中断不粘连 ← C-5
- 触发: 操作 行走时松开按键、取消触屏操作或切换窗口后返回。
- Given: 主人公正在行走，未到道路边界。
- When: 分别结束键盘输入、取消触屏操作、在按住方向时切换窗口并在外部松手后返回。
- Then: 每种情况下行走均停止；重新聚焦页面时人物不自行移动，重新输入方向后才恢复行走。
### player/AC-7 道路两端边界 ← C-7
- 触发: 操作 在道路起点持续向左，在终点持续向右。
- Given: 主人公分别到达道路两端。
- When: 访客持续输入越界方向，再输入返回道路的方向。
- Then: 主人公不会走出世界或掉落，反向输入可以正常返回道路。
- world/C-2：系统应展示 HD-2D 世界，其中像素人物位于立体布景中，道路、前景和远景具有可见纵深，场景物体具有明暗面与落地阴影；黄昏城镇以暖光为主，科技工坊具有蓝色科技细节，星夜展街呈现夜色展览环境。
### world/AC-2 立体布景与场景辨识 ← C-2
- 触发: 操作 在三个场景分别行走、停下并观察画面。
- Given: 三个场景均可访问，图形加载成功。
- When: 访客在每处观察主人公、道路、近处道具和远景。
- Then: 可见清晰像素人物、立体物体明暗面与落地阴影、前中后景层次；三个场景分别可辨认暖光城镇、蓝色设备工坊和星夜展览环境，而非单张平面背景加滤镜。
- responsive-layout/C-1：系统应在 1440×900、390×844、844×390 三种视口展示可用的主人公画面、语言入口及资料速览入口，不产生整页水平滚动。
### responsive-layout/AC-1 三种视口入口 ← C-1
- 触发: 操作 分别以 1440×900、390×844、844×390 打开主页。
- Given: 图形与必要资源加载成功。
- When: 访客查看世界画面、语言入口和资料速览入口。
- Then: 每种视口均能看到并使用对应入口，主人公可见，页面没有需要左右拖动才能消除的整页水平溢出。
## 3. 涉及文件
- files 中列明所有授权路径；不存在则新建，已存在则仅为本行为修改，明确淘汰项删除。测试只由测试角色修改，生产代码只在可信 Red 后实现。
## 6. 函数清单
- App：组合场景、身份与控件；index.css：新主页基础视觉。
- state/input：唯一位置与朝向状态、键盘和触屏、松手/失焦停止及边界。
- geometry/character：程序化二维像素形体、完整腿脚、马尾与分组步态，不做有厚重方块头的通用体素人。
- town/world/runtime：仅城镇的道路、建筑、远景、暖光阴影、镜头跟随和资源释放。
- WorldViewport/Hud：挂载真实画布、显示身份与行走说明和触屏方向按钮。
## 7. 协作关系
- USER-016/AI-008：完整行为竖切片，代码仍分层；全部串行，可按明确依赖复用已声明文件，不跨范围。不得执行后续未授权里程碑，不新增依赖，不操作git或自行派工；任务运行字段只由主agent写。
## 8. 验证方式
- 仓库根：`/Users/bb/Projects/0xbb.me`；独立命令：`cd /Users/bb/Projects/0xbb.me && bun test ./tests/portfolio-playable.test.ts`。
- 测试授权：仅新增或修改 tests/browser.ts、tests/portfolio-playable.test.ts（相对仓库根），不修改任何生产文件。
- 真实公开入口：http://127.0.0.1:3000/。先断言该地址响应且浏览器可打开，再按公开网页断言可玩画布、身份与控件；旧首页缺少可玩世界应导致实际业务断言失败，而非模块缺失、连接失败或零测试。
- 通过已安装 ego-browser 的 nodejs 标准输入执行脚本；Bun 测试可使用内置子进程能力，tests/browser.ts 仅封装测试启动与结构化输出解析，不是生产测试替身。不得新装浏览器测试库。
- 不导入任何尚不存在的生产模块，不创建生产空函数，也不要求事先确定内部接口。测试只依据本区的网页输入与观察结果。
- 桌面打开后按住 A/D 和左右方向键，再释放；真实截图/录制核验人物向相应方向迈步、转身、镜头跟随及松手停止，不能把背景动画造成的任意像素变化当作行走证明。
- 触屏390×844、844×390使用实际左右按钮；pointerup/cancel、失焦后返回不续走，两端限制与反向返回可用；记录1440×900画面并检查整页不横向溢出。
- 人物必须与设定的白发马尾、蓝眼、黑白衣装相符，腿脚完整、像素轮廓清楚；画面有建筑明暗面、道路接触阴影和前中后景。原图仅供只读参考，路径为public/profile-full.png或design-reference/profile-full.png。
- 人工视觉核验不由DOM存在断言替代；Red阶段实际页面缺少目标行为足以失败，Green必须补真实按键/触屏及画面证据。world/AC-2本任务仅验证城镇，完整三景由T-30负责。
- 本任务不制作工坊/展街或正式NPC介绍，不提前宣布M1完成；网页仍可取得现有个人事实，双语和完整阅读在T-28完成。数据结构本任务不修改。
