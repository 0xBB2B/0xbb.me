---
id: T-36
title: 移除双靴蓝色挂件及挂链
depends_on: [T-35]
files: [/Users/bb/Projects/0xbb.me/design-reference/player-voxel-black.ts, /Users/bb/Projects/0xbb.me/design-reference/player-voxel-black.glb, /Users/bb/Projects/0xbb.me/design-reference/character-design.test.ts]
refs: [portfolio/player/AC-1, portfolio/player/AC-11]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./design-reference/character-design.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts && ./node_modules/.bin/tsc --noEmit
status: doing
agent: 530320ca-b36f-4509-be8a-82f90ce84e62
commit: ""
note: "USER-029明确删除双靴挂件/挂链/高光；AI-026按已授权切片整理，只改两份模型交付物与模型测试。"
---
## 1. 目标
主页人物和导出GLB的双靴不再有蓝色挂件、挂链和挂件高光，其余人物外观、尺寸与操作不变。
## 2. 业务规则
- player/C-1：系统应默认显示最新黑装参考对应的 Minecraft 方块三维主角，具有银白高马尾、蓝眼、蓝色耳饰、自然闭嘴且无舌头的表情、黑色短外套与短上衣、腰部肤色色块、黑短裤与腰带、单侧长袜、无挂件及挂链的厚底系带靴；身体部件、衣装色块和完整手脚可辨认，不能以 SVG 或位图人物替代。
- player/C-11：系统应仅显示黑装 Minecraft 主角，不提供人物造型切换按钮或白装对照入口；人物三个方向尺寸相对原 3 单位模型均为 80%，高度为 2.4 场景单位，头身比例和脚底原点不变。房屋、镜头、移动速度、语言与资料操作不因此改变，重复更新不得累积缩放，预览期间仍应明确完整行走动画尚未完成。
### player/AC-1 角色设定可辨认 ← C-1
- 触发: 操作 观察起点主人公的全身造型。
- Given: 最新黑装人物参考已由用户指定，主页与角色模型加载成功。
- When: 访客观察默认主角，并将头部、衣装与腿脚同参考对照。
- Then: 默认是完整的 Minecraft 方块三维人物，可辨认银白高马尾、蓝眼、蓝色耳饰、自然闭嘴无舌头、黑短外套/短上衣、腰部肤色、短裤/腰带、单侧长袜及系带厚底靴，双靴无蓝色挂件、挂链或挂件高光，鞋带、鞋扣、厚底和蓝色耳饰保持可辨；不是 SVG、位图或带矩形背景的图卡。
### player/AC-11 单黑装与等比 80% 尺寸 ← C-11
- 触发: 操作 打开主页，在相同视口观察人物与房屋，移动、打开资料、切换语言并关闭资料后继续移动。
- Given: 黑装人物与城镇可正常显示，原尺寸基线为高 3 场景单位。
- When: 访客核对人物整体尺寸、脚底位置以及主页和资料面板中的控制，持续移动并刷新。
- Then: 只有黑装人物且没有造型切换或白装入口，人物等比缩至 80%、高 2.4 单位，脚底原点及头身比例保持；房屋、镜头、速度和语言/资料操作不变，持续更新不继续缩小，仍明确完整步态未完成。
## 3. 涉及文件
- 修改design-reference/player-voxel-black.ts：删除双靴挂件、挂链、高光的构造，不留隐藏模型或配饰切换分支。
- 修改design-reference/player-voxel-black.glb：重新导出实际无挂件模型，源与导出一致。
- 修改design-reference/character-design.test.ts：先增加真实几何和GLB无挂件及其余靴子部件保留断言，建立Red，再冻结断言实现Green。
- 只读character-comparison.html/ts：现有说明仅写系带厚底靴，无蓝挂件承诺；核验页面不需修改，并用既有exportVoxel实际导出。
## 6. 函数清单
- createBlackOutfitPlayerVoxel：构造当前单黑装人物，双靴不含挂件及挂链。
- 现有exportVoxel：直接导出当前黑装模型，无需新增导出接口。
## 7. 协作关系
- App→WorldViewport→mountWorld→createCharacter→createBlackOutfitPlayerVoxel，角色几何由主页与单模型页共用。
- 基础player-voxel.ts、运行时、场景、相机、输入和浏览器测试全部冻结；不安装依赖、不操作git或需求文档、不派工。
- 源模型当前每条腿有Charm_chain、Blue_boot_charm、Charm_glint，直接删除对应构造；保留Crossed_boot_lace、Boot_strap、Strap_buckle、Platform_sole与耳饰，不移除或重新命名整个腿部。
- 保持已有一次性0.8缩放、高2.4、脚底0和闭嘴无舌，不调整视角或人物其他形状补偿。
## 8. 验证方式
- 测试授权仅design-reference/character-design.test.ts；tests/browser.ts、tests/character-toggle.test.ts、tests/portfolio-playable.test.ts及全部其他测试只读。Green阶段不改测试预期，不把导入或环境失败作为Red。
- Red命令：cd /Users/bb/Projects/0xbb.me && bun test ./design-reference/character-design.test.ts。
- 通过既有createBlackOutfitPlayerVoxel返回的真实模型和GLTFLoader回读实际player-voxel-black.glb，先证明两组挂件仍存在导致新断言失败；测试不得只搜源码关键词。分别检测双腿的挂件/链/高光不存在，鞋带、鞋扣、厚底、耳饰及自然闭嘴保留。
- 在Red阶段捕获保留部件的真实几何/颜色/变换基线或现有准确数值，防止通过删腿、重命名、改色或隐藏挂件骗过断言；对照删除后其余几何及尺寸不变。
- 通过既有单模型页exportVoxel实际导出GLB，回读其高度2.4、脚底0、双靴无挂件/链/高光，且images/textures/外部buffer为空；不要只改源码而保留旧导出。
- 真实页面入口http://127.0.0.1:3000/，独立页http://127.0.0.1:3000/design-reference/character-comparison.html。使用已安装ego-browser及原helper，先确认HTTP/图形正常，再检查主页和独立页正面/斜侧近景：没有蓝挂件或悬空链条，鞋带/鞋扣/厚底/蓝耳饰仍可辨，无新增切换按钮。
- 完整独立verify：cd /Users/bb/Projects/0xbb.me && bun test ./design-reference/character-design.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-playable.test.ts && ./node_modules/.bin/tsc --noEmit。
- 保留三视口1440×900、390×844、844×390及真实左右移动/释放、语言/资料回归；不改变房屋/镜头/速度，不宣称步态或M1已完成。
- 提交结构化Red/Green命令、结果与实际回读/观察证据；临时导出中间文件、日志和截图结束后清理，不将位图引入页面或添加测试钩子。
