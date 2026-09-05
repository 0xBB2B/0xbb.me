---
id: T-23
title: M3 清理失去引用的依赖
depends_on: [T-16, T-21, T-22]
files: [/Users/bb/Projects/0xbb.me/package.json, /Users/bb/Projects/0xbb.me/bun.lock, /Users/bb/Projects/0xbb.me/dependencies.test.ts]
refs: [portfolio/site-entry/AC-3]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./dependencies.test.ts && bun run build
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
在 M3 移除无消费者的 motion 及专属锁记录，不升级其它依赖或引入新库。
## 2. 业务规则
- C-3：系统应通过命令 bun run build 生成可静态托管的页面与资源；访客浏览主页、交谈、切换语言和打开速览不需要账号、服务端存档或独立后端应用。
### AC-3 纯静态构建 ← C-3
- 触发: 命令 bun run build，并通过静态服务打开构建结果。
- Given: 已安装项目约定依赖，构建环境可用。
- When: 执行构建，再仅用静态服务访问主页、NPC 对话、语言切换和资料速览。
- Then: 构建退出码为 0；上述功能无需独立后端应用、登录或服务端存档即可使用。
## 3. 涉及文件
- 修改 `/Users/bb/Projects/0xbb.me/package.json`、`/Users/bb/Projects/0xbb.me/bun.lock`。
- 新建 `/Users/bb/Projects/0xbb.me/dependencies.test.ts`。
## 4. 成品定义
package.json 完整配置：
```json
{
  "name": "cyberdeck-portfolio",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.1",
    "react-dom": "^19.2.1",
    "three": "^0.184.0"
  },
  "devDependencies": {
    "@types/bun": "^1.3.13",
    "@types/node": "^22.19.1",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@types/three": "^0.184.0",
    "@vitejs/plugin-react": "^5.1.1",
    "typescript": "~5.8.3",
    "vite": "^6.4.1"
  }
}
```
bun.lock 为上述清单的 Bun 生成产物；现有非 motion 依赖的解析版本与完整性不得改变，不手工构造或整库升级。只移除 motion 及无人引用的专属传递依赖。
## 6. 函数清单
无新增生产函数；依赖清单和锁文件由包管理器生成/校验。
## 7. 协作关系
新体验只使用已安装 React、Three.js、Vite 和 Bun；主 agent 执行前核对 motion 无有效消费者，不因盲目缩小依赖而删其它库。未使用的包名重命名与部署改造不属于本需求。
## 8. 验证方式
- 公开依赖清单与锁解析结果：motion 及无人使用的专属传递记录消失，React/Three/Vite/Bun 类型等现有解析版本不变，所有脚本名和功能不变。
- 冻结锁安装验证成功、build 退出 0；若删除会损坏有效消费者或导致版本漂移，测试失败并报告主 agent，不升级兜底。
- 仅静态服务操作新主页行走、交谈、切语言、速览，无后端、登录或存档服务要求；完整构建与类型检查在 T-24 复核。
