---
name: 01-legacy-removal
description: 删除 MC-2D 旧站点代码、专属测试与旧图片，改造仍有用的测试以校验新结构
---
# 清除 MC-2D 旧站点

## 目标
仓库里不再有 MC-2D 旧站点的代码、测试和图片。仍有用的测试基础设施改成校验新结构，后续 plan 在干净的地基上搭建。

## 业务规则（来源：spec site/static-profile-html、profile/cabin-displays、site/favicon）
- 站点只有一个页面，不描述技能详情和项目；旧站点的「可玩主页」「漫步」「灯塔」说法不再出现。
- 分享图只用 `public/profile.jpg`（1250×1250），其余旧图片 `profile.png`、`profile-full.png`、`site-card.svg` 都不再发布。
- 旧灯塔图标由新的红色 911 剪影取代（新图标在 04-site-shell 落盘）。

## 涉及文件
- 删除：`portfolio/`（整个目录，含 `scenes/`、`models/`、同目录测试）
- 删除：`components/portfolio/`（整个目录）
- 删除测试：`tests/character-toggle.test.ts`、`tests/favicon.test.ts`、`tests/model-fingerprint.ts`、`tests/portrait-asset.test.ts`、`tests/portfolio-delivery.test.ts`、`tests/portfolio-release.test.ts`，以及其余所有 `tests/portfolio-*.test.ts(x)`（`tests/portfolio-typography.test.ts` 除外，见下文改名）
- 删除图片：`public/profile.png`、`public/profile-full.png`、`public/site-card.svg`
- 修改：`App.tsx`：只保留渲染一个空的 `<main id="app">`，删除全部旧导入（10-app-shell 会整体重写）
- 修改：`plugins/htmlPlugin.ts`：删除对旧 `LoadingScreen` 的导入与 `#root` 静态注入，只保留元信息注入（04-site-shell 会加回新的静态注入）
- 修改：`vite.config.ts`：公开资源清单删除三个旧图片
- 修改：`package.json`：`name` 改为 `rainy-konbini-portfolio`
- 修改：`tests/browser-harness.test.ts`：删除第二个用例（它依赖旧站点的移动输入）
- 修改：`tests/legacy-removal.test.ts`：改为校验 MC-2D 已删除
- 修改：`tests/current-docs.test.ts`：扫描范围改为新目录
- 修改：`public-assets.test.ts`、`tests/public-images.test.ts`：只登记 `profile.jpg`
- 改名并修改：`tests/portfolio-typography.test.ts` → `tests/typography.test.ts`

## 函数清单
### tests/legacy-removal.test.ts
| 用例 | 职责 |
|---|---|
| MC-2D 源码已删除 | `portfolio/`、`components/portfolio/`、`tests/model-fingerprint.ts` 不存在 |
| 旧图片已删除 | `public/profile.png`、`public/profile-full.png`、`public/site-card.svg` 不存在，`public/profile.jpg` 存在 |
| 运行时依赖 | `package.json` 依赖恰为 `react`、`react-dom`、`three`、`@fontsource-variable/noto-sans-sc`、`@fontsource-variable/noto-serif-sc`；`bun.lock` 不含 motion 系包 |
| 构建产物不含旧入口 | `dist/index.html` 存在；`dist/game`、`dist/profile.png`、`dist/profile-full.png`、`dist/site-card.svg` 不存在；HTML 不含 `/game/`、`MC-2D`、`RHYTHM_BLADE` |

### tests/current-docs.test.ts
| 用例 | 职责 |
|---|---|
| README 无迁移期措辞 | 保持原正则，检查 `README.md` |
| 生产代码注释无迁移期措辞 | 扫描根目录 `App.tsx`、`copy.ts`、`language.ts`（存在才扫）和目录 `diorama/`、`components/`（存在才扫）下的非测试 `.ts/.tsx/.css` |

### tests/typography.test.ts
| 用例 | 职责 |
|---|---|
| 保留 | 字体来自打包的可变字体、初始 HTML 只预加载两个拉丁子集、字符范围覆盖中英文、所有界面字体声明使用 `--font-sans` / `--font-display` 变量（扫描范围改为 `components/` 与 `index.css`） |
| 删除 | 针对旧场景字幕与 HUD 标签的用例、以及依赖旧组件文件名的断言 |

### public-assets.test.ts / tests/public-images.test.ts
| 位置 | 职责 |
|---|---|
| `userPortraits` | 只登记 `profile.jpg`（sha256 `c28ed9a1e2296e6b667212bd3758323b496791982f25b4e663d84ebbb2422543`） |
| 已发布图片请求 | 只校验 `profile.jpg` 原字节返回并能在无窗口 Chrome 解码；Pages 工作流用例保持不变 |

## 协作关系
- `vite.config.ts` 的 `portfolio-public-assets` 插件按清单 `readFileSync` 发布资源，清单必须与 `public/` 实际文件一致，否则构建失败。
- 本 plan 完成后站点首页是空白页，这是预期的中间状态，由 04 和 10 补齐。

## 验证方式
- 测试入口：`bun run build && bun test tests/legacy-removal.test.ts tests/current-docs.test.ts tests/typography.test.ts public-assets.test.ts tests/public-images.test.ts tests/browser-harness.test.ts`
- 测试输入：当前仓库文件、`bun run build` 产物。
- 预期结果：全部通过；`git ls-files portfolio components/portfolio` 输出为空。
- [ ] `bun run build` 成功。
- [ ] 上述测试全部通过。
- [ ] 仓库中搜索 `portfolio/` 的导入语句无结果（`grep -rn "from './portfolio\|components/portfolio" --include=*.ts* .` 为空，排除 `node_modules`）。
