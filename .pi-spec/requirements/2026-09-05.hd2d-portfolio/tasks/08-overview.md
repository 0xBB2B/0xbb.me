---
id: T-8
title: M1 完整资料速览
depends_on: [T-1, T-2]
files: [/Users/bb/Projects/0xbb.me/components/portfolio/Overview.tsx, /Users/bb/Projects/0xbb.me/components/portfolio/Overview.css, /Users/bb/Projects/0xbb.me/components/portfolio/Overview.test.tsx]
refs: [portfolio/profile-overview/AC-4, portfolio/profile-overview/AC-5, portfolio/profile-overview/AC-6]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./components/portfolio/Overview.test.tsx
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
在正常、加载和图形故障状态均直接提供同一份完整中英资料与明确外链。
## 2. 业务规则
- C-4：系统应提供下方联系表中的 GitHub、LinkedIn、Juejin 和 Email 共 4 个入口，文字或可访问名称能区分其目标。
- C-5：当访客打开资料速览时，系统应在无需行走或 NPC 对话的情况下提供完整资料，暂停行走；关闭速览后回到打开前的位置。
- C-6：如果图形不可用，系统仍应展示相同的简介、6 项技能、3 个作品及 4 个联系入口，不能要求先恢复游戏才能阅读或使用外链。
联系表：GitHub → https://github.com/0xBB2b；LinkedIn → https://www.linkedin.com/in/0xbb2b；Juejin → https://juejin.cn/user/1037558235795032；Email → mailto:bb@yorha.xyz。
### AC-4 四个联系入口 ← C-4
- 触发: 操作 检查并激活 GitHub、LinkedIn、Juejin 和 Email。
- Given: 资料速览可访问。
- When: 访客逐一使用 4 个入口。
- Then: 各入口具有可辨认名称并指向联系表地址；邮件入口使用指定邮件地址，实际是否打开邮件客户端取决于访客设备设置。
### AC-5 无需游戏的阅读与返回 ← C-5
- 触发: 操作 在起点直接打开速览，再在道路中段打开和关闭速览。
- Given: 图形运行正常，访客尚未完成任何 NPC 介绍。
- When: 访客阅读速览，尝试移动并关闭。
- Then: 全部资料无需解锁即可阅读；打开期间人物不移动，关闭后仍处于打开前的位置。
### AC-6 图形故障仍可阅读 ← C-6
- 触发: 操作 禁用所需图形能力或使必要图形资源报错后访问主页。
- Given: 浏览器能加载个人资料，但图形不可用。
- When: 访客阅读资料并检查作品和联系入口。
- Then: 简介、6 项技能、3 个作品、4 个联系入口仍完整可用，不要求恢复游戏或前往 NPC。
## 3. 涉及文件
- 新建 `/Users/bb/Projects/0xbb.me/components/portfolio/Overview.tsx`、`/Users/bb/Projects/0xbb.me/components/portfolio/Overview.css`。
- 新建 `/Users/bb/Projects/0xbb.me/components/portfolio/Overview.test.tsx`。
## 6. 函数清单
- Overview.tsx：Overview，呈现完整本地化资料、可辨认外链与关闭操作。
- Overview.css：无函数，长文阅读与固定可触达操作区。
## 7. 协作关系
仅消费 getProfile/getCopy 和共享探索状态，不 import 图形运行时；由 App 在速览打开或图形故障时呈现。资料必须整份读取，不按已遇到 NPC 解锁，无新增依赖。
## 8. 验证方式
- 测试写入授权：仅新增或修改 `/Users/bb/Projects/0xbb.me/components/portfolio/Overview.test.tsx`；不得修改生产文件或任务字段。
- 独立验证命令：`cd /Users/bb/Projects/0xbb.me && bun test ./components/portfolio/Overview.test.tsx`。
- 公开验证入口：`components/portfolio/Overview.tsx` 的 Overview 输出及网页 `/` 的资料速览；资料输入来自公开 getProfile/getCopy，预期的四个联系目标已在业务规则内明确，打开与关闭的行为以下列场景为准。
- 公开 React 输出入口分别渲染 en/zh、正常打开和故障资料：简介、6 技能准确等级、3 ONLINE 作品及访问/源码入口、4 个具名联系入口全部出现；不显示百分比、不缺资料、无位图图标。
- ego-browser 在起点直接打开；中段打开后用键盘/触屏试走，关闭位置不变且需新输入；切换语言不关闭速览或重置位置。
- 分别在无图形支持、必要场景和角色模块加载失败时直接阅读同一资料并点击作品/联系入口；核对导航目标，不将第三方可用性或系统邮件客户端配置作为本站通过条件。
- 390×844、844×390、1440×900 双语正文全部可滚动读完，关闭与语言入口不被裁切。
