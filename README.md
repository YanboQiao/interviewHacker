# interview hacker

基于 Node + Ts + `@openai/codex-sdk` 截图生成答案并自动发送到邮箱的AGENT 使用场景欢迎自行发掘，不可以是INTERVIEW / TEST 哦（意味深）

## 启动方式

### 安装依赖
```bash
pnpm install
```

如果已经安装好了codex cli可以跳过
```bash
npm i -g @openai/codex
```
登录自己的codex账号

建议充一个plus会员，这个agent本质上是一个触发器，截图后把图片和预设提示词发给AGENT，AGENT想出答案后用gmail mcp把答案发到指定邮箱

### 启动并常驻在后台
```bash
pnpm listen
```

启动后脚本会一直监听全局快捷键：

- `Control + Option + ;`

截图后，图片会放在 `/pic` 文件夹中

## REQUIREMENT
- 需要本机已安装并可用 `codex` CLI。
- `pnpm listen` 首次运行时，macOS 可能会要求你给终端或 Node 进程授予 Accessibility 权限，否则全局快捷键监听不会生效。
- 如果需要邮件成功发送，还需要当前 Codex 环境里已经配置好 Gmail MCP 工具，否则 Agent 会完成代码生成，但 `email.sent` 会是 `false`。需要登录openai账户将自己的账号绑定好gmail


## HOW TO USE

建议摆放位置：
```
  O      [__]       [__]
 /|\     用来写题    用来接收邮件
 / \
```
请务必提前测试，本这个AGENT不会有任何的log
正式使用前请首先使用leetcode测试，测试的过程会弹出权限提示，需要给vscode 截图等权限

正式使用的时候需要在双机位看不到的地方放置一个能登录上自己GMAIL的设备，在自己的设备运行

```bash
pnpm listen
```

等待1min左右 答案会以邮件的形式发送到邮箱