---
id: T-27
title: M1 可操控黄昏城镇
depends_on: []
files: [/Users/bb/Projects/0xbb.me/portfolio/character.ts, /Users/bb/Projects/0xbb.me/portfolio/character.test.ts]
refs: [portfolio/player/AC-1, portfolio/player/AC-2, portfolio/player/AC-3, portfolio/player/AC-4, portfolio/player/AC-5, portfolio/player/AC-7, portfolio/world/AC-2, portfolio/responsive-layout/AC-1]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./portfolio/character.test.ts ./portfolio/models/player-voxel.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts && ./node_modules/.bin/tsc --noEmit
status: done
agent: a8ceccac-3005-4050-a27f-865b6de32951
commit: e38e54f73940a1241f0354601d385b4699e0f75e
note: "AI-028返修运行a8ceccac正常完成且red-green PASS；主agent独立verify为48 pass/2126断言及tsc通过，并查看实际待机/移动截图。接地已按真实石板顶面0.035修正并抵消模型俯仰；USER-031已确认修正后的落地观感和步态；提交前再次verify为48 pass/2126断言及tsc通过，不复用此前悬空版本PASS。"
---
## 1. 目标
从现有主页直接替换成一个可真实行走的黄昏城镇样板：符合确认稿的全身像素人物、立体道路布景、跟随镜头和键盘/触屏操作。
## 2. 业务规则
- player/C-1：系统应默认显示最新黑装参考对应的 Minecraft 方块三维主角，具有银白高马尾、蓝眼、蓝色耳饰、自然闭嘴且无舌头的表情、黑色短外套与短上衣、腰部肤色色块、黑短裤与腰带、单侧长袜、无挂件及挂链的厚底系带靴；身体部件、衣装色块和完整手脚可辨认，不能以 SVG 或位图人物替代。
- player/C-2：当主人公在待机、向左行走和向右行走之间切换时，系统应展示对应状态与朝向，行走时可见双腿交替迈步，待机时停止迈步，不能以整幅立绘平移代替行走动画。
- player/C-3：当桌面访客持续按住 A、D、左方向键或右方向键时，系统应分别向左、向右、向左或向右移动主人公，并允许停下或回头，不要求跳跃才能走完全程。
- player/C-4：当触屏访客持续按住屏幕左行或右行按钮时，系统应向对应方向移动主人公，松手后停止。
- player/C-5：如果方向输入结束、触屏操作被取消或窗口失去焦点，系统应停止行走；恢复焦点时不得因失焦前的输入继续移动，必须重新操作。
- player/C-7：如果访客在道路起点向左或在终点向右持续操作，系统应将主人公限制在道路可行走范围内，不使其离开场景或落出道路。
### player/AC-1 角色设定可辨认 ← C-1
- 触发: 操作 观察起点主人公的全身造型。
- Given: 最新黑装人物参考已由用户指定，主页与角色模型加载成功。
- When: 访客观察默认主角，并将头部、衣装与腿脚同参考对照。
- Then: 默认是完整的 Minecraft 方块三维人物，可辨认银白高马尾、蓝眼、蓝色耳饰、自然闭嘴无舌头、黑短外套/短上衣、腰部肤色、短裤/腰带、单侧长袜及系带厚底靴，双靴无蓝色挂件、挂链或挂件高光，鞋带、鞋扣、厚底和蓝色耳饰保持可辨；不是 SVG、位图或带矩形背景的图卡。
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
- 修改portfolio/character.ts：对当前黑装运行实例加入真实腿臂步态、左右朝向和停止复位，保持静态外观与现有接口。
- 新建portfolio/character.test.ts：通过现有createCharacter/update及真实几何检查动作，不依赖尚不存在模块；先Red后冻结测试再Green。
- 只读App、Hud、WorldViewport、state/input/runtime、world/town、geometry和所有底模/GLB及已有测试。场景基础代码已经交付，不重做。
## 6. 函数清单
- createCharacter：创建保持当前造型的角色实例，准备髋部/肩部动画转轴与初始姿态。
- update：复用session的x/facing/walking/stride，按真实行走距离驱动交替步态和朝向，停下/暂停时复位且不漂移。
- dispose：释放本实例几何及材质，无额外全局资源。
## 7. 协作关系
- USER-030与AI-027限定本轮；T-35/T-36已确认静态造型，禁止恢复舌头、挂件或造型切换。
- App→WorldViewport→mountWorld→createCharacter.update；state.advance已有walking和stride，输入释放/暂停/边界不再累积stride。
- 腿部当前Group原点在脚底，需在运行实例正确组织髋部转轴，不改静态构造/GLB；初始姿态和其它部件几何颜色应保持。不加依赖、不操作git/任务/台账、不派工。
- 现有预览提示在本轮保持，待真实步态验证及用户视觉确认后处理，不提前宣称完整M1通过。
## 8. 验证方式
- AI-028返修测试授权：允许修改portfolio/character.test.ts中错误接地基线并增加实际路面断言；必须先在当前悬空实现上产生真实Red，随后冻结测试。保留有效交替步态、手臂、停止/暂停/转向断言，不因修接地放宽它们。
- 用只读createTown实际石板几何推导路面高度（中心-0.015、厚0.1，顶面0.035），不得从character里的目标常量反推预期。待机左右两只鞋底应贴在路面而非仅全模型最低角一点接触；行走支撑脚接地、摆动脚允许抬起，不穿地，不明显整体跳动。考虑鞋底四角经真实相机/人物变换后的世界位置，纠正错误俯仰而非改镜头或底模。
- 对三视口分别实看待机、右行两个相反相位、松手、左行两个相反相位、资料开关后的停止与恢复，给出实际观察证据，不以DOM画布存在替代。所有真实截图/录制验证后清理。
- 测试写入仅portfolio/character.test.ts，原tests/browser.ts、tests/portfolio-playable.test.ts、tests/character-toggle.test.ts、design-reference/character-design.test.ts全部只读复跑。
- Red命令：cd /Users/bb/Projects/0xbb.me && bun test ./portfolio/character.test.ts；已有createCharacter和update可直接调用，失败应来自腿脚无周期运动或朝向不符，不得来自导入缺失/环境失败。
- 使用真实Group/几何输出在同一位置及相机下测待机、左右facing、walking以及stride完整周期；至少两个相反相位显示双腿交替前后运动、手臂相反配合，不以整个人平移/根节点旋转或任意像素变化替代腿部动作。
- 冻结当前静态造型基线：黑装闭嘴无挂件/挂链，鞋带/鞋扣/耳饰完整，静态高2.4单位，0.8缩放保持；停止后无累积变形。步态时举起的脚允许高于道路，但支撑脚贴地、不穿地，不靠明显抬升整个人避免穿地。
- 验证左右行走朝向对应道路方向，保留角色辨识度；由运行时相机变换后的实际脚底检查地面关系，不能只检查未变换的局部y坐标。
- 反复相位更新以及左右转向不累积缩放/位移误差；walking=false、paused=true及道路端点停止状态均停止迈步，重新输入后正常恢复。
- 复用已有createSession/advance/input公开接口或真实浏览器输入验证A/D/箭头、触屏左右及释放/cancel/blur，关闭资料后须新输入恢复，两端可返回；不得以DOM控件存在当作移动停止证据。
- 完整verify：cd /Users/bb/Projects/0xbb.me && bun test ./portfolio/character.test.ts ./portfolio/models/player-voxel.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts && ./node_modules/.bin/tsc --noEmit。
- 真实网页http://127.0.0.1:3000/，用已有ego-browser和helper；先确认HTTP与图形正常。1440×900、390×844、844×390分别操作左右行走、松手、资料开关；拍同视口待机/左右不同步态相位或录制并实际查看，不用静态截图声称完整步态。
- 画面检查双腿交替、手臂配合、朝向、完整鞋脚、无明显穿地/跳动/滑行，房屋/镜头/速度不变；world/AC-2仍仅验城镇，三景由T-30处理。不得制作NPC/工坊/展街或修改数据/依赖/发布配置。
- 若两文件范围不足以正确完成，报告具体技术阻塞，不越权改外部文件或弱化测试。临时日志/截图/视频验证后清理，最终structured_output提供真实命令与动作证据。
