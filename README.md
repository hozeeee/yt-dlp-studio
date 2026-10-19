# yt-dlp Studio

一个基于 Node.js 与 React 的自托管 yt-dlp Web UI。它提供下载队列、实时进度、媒体文件管理与预览、频道订阅和可视化设置，并支持将完整前后端构建为单个 JavaScript 文件。

## 功能

- 单个视频、播放列表、频道及批量 URL 下载
- 视频清晰度、容器、编码、音频格式和 yt-dlp format selector
- 字幕、封面、元数据、章节、SponsorBlock 与时间段下载
- 持久化下载队列，支持暂停、继续、取消、重试和并发控制
- SSE 实时进度与状态同步
- 文件库浏览、视频在线播放、音频播放、图片预览及文件管理
- 频道和播放列表订阅，定期自动发现新内容
- 多份 Cookie 文件（按网站分别上传、自动合并）、浏览器 Cookie、代理、限速及自定义参数
- 可选访问密码、SSRF 基础防护和路径穿越防护
- 自动查找 yt-dlp 与 ffmpeg，并可在 Web 中后台安装 / 更新（实时进度、可取消、显示错误日志）
- IPv4 / IPv6、反向代理子路径与环境变量配置
- 浅色、深色及响应式移动端界面

## 环境要求

- Node.js 20.12 或更高版本（推荐 22 LTS）
- pnpm 10
- yt-dlp（也可以在 Web 设置页中自动安装）
- ffmpeg（合并音视频、转码和后处理需要；也可以在 Web 设置页中自动安装）
- Linux 上自动安装 ffmpeg 需要系统 `tar` 支持 xz 解压（通常已自带 `xz-utils`）

## 开发

```bash
pnpm install
pnpm dev
```

开发模式会同时启动：

- Web：`http://localhost:5173`
- API：`http://localhost:8686`

也可以分别启动：

```bash
pnpm dev:web
pnpm dev:server
```

代码格式与检查使用 `@antfu/eslint-config`：

```bash
pnpm lint
pnpm lint:fix
pnpm typecheck
```

## 构建与运行

常规构建分别输出 Web 静态资源和服务端包：

```bash
pnpm build
pnpm start
```

输出位置：

- `apps/web/dist/`
- `apps/server/dist/index.mjs`

构建包含完整前后端的单 JavaScript 文件：

```bash
pnpm build:single
node dist/yt-dlp-studio.mjs
```

单文件不包含 yt-dlp 和 ffmpeg 二进制。首次运行后可在“设置 → 系统”中一键安装，安装在后台进行，切换页面不会中断，进度会在页头和设置页实时显示。未安装 yt-dlp 时，下载和订阅功能会被禁用并引导前往设置。

二进制查找顺序：设置中的自定义路径 → `DATA_DIR/bin` 中的托管版本 → `PATH`。托管版本的下载来源：

- yt-dlp：GitHub `yt-dlp/yt-dlp` 官方发布
- ffmpeg（Linux / Windows）：GitHub `yt-dlp/FFmpeg-Builds`
- ffmpeg（macOS）：`ffmpeg.martin-riedl.de`

GitHub 访问受限时，可在“设置 → 系统 → 可执行文件”中配置下载镜像前缀。

### Cookie

需要登录的网站可以在“设置 → 系统 → Cookie 文件”中上传 Netscape 格式的 cookies.txt：

1. 安装开源浏览器插件 [Get cookies.txt LOCALLY](https://github.com/kairi003/Get-cookies.txt-LOCALLY)（[Chrome / Edge](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)、[Firefox](https://addons.mozilla.org/en-US/firefox/addon/get-cookies-txt-locally/)）。
2. 登录目标网站，在该页面点击插件，以 Netscape 格式导出。
3. 上传文件。多个网站可分别上传多个文件，启用的文件会自动合并；同名文件会被替换，重复的 Cookie 以最近上传的为准。

并确保“设置 → 网络与高级 → Cookie 来源”为“上传的 cookies.txt”。请勿使用名为 “Get cookies.txt”（无 LOCALLY）的旧插件，它曾被发现窃取数据并已下架。

## 配置

服务默认监听 `[::]:8686`。在支持双栈的系统上，`::` 同时接受 IPv6 与 IPv4 连接。

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `::` | 监听地址；多个地址以逗号分隔 |
| `PORT` | `8686` | 监听端口 |
| `DATA_DIR` | `./data` | 设置、队列、订阅和托管二进制目录 |
| `DOWNLOAD_DIR` | `./downloads` | 下载文件目录 |
| `BASE_PATH` | `/` | 反向代理子路径，例如 `/ytdlp/` |
| `AUTH_PASSWORD` | 空 | 设置后启用访问密码，并锁定 Web 密码设置 |
| `YTDLP_PATH` | 自动 | yt-dlp 可执行文件路径 |
| `FFMPEG_PATH` | 自动 | ffmpeg 可执行文件路径 |
| `MAX_CONCURRENT` | `3` | 最大并发下载数 |
| `ALLOW_CUSTOM_ARGS` | `false` | 允许任务使用额外 yt-dlp 参数 |
| `WEB_DIR` | 自动 | 覆盖 Web 静态资源目录 |
| `LOG_LEVEL` | `info` | `debug`、`info`、`warn` 或 `error` |

命令行参数可通过以下命令查看：

```bash
node dist/yt-dlp-studio.mjs --help
```

完整示例见 [.env.example](.env.example)。项目不会自动加载 `.env`；可由 systemd、Docker Compose、进程管理器或 shell 注入环境变量。

## 数据目录

```text
data/
├── auth.json             # 会话密钥与密码哈希
├── settings.json         # 服务设置
├── tasks.json            # 下载队列与历史
├── subscriptions.json    # 订阅和已发现条目
├── archive.txt           # 可选 yt-dlp 下载归档
├── cookies/              # 上传的各个 Cookie 文件及索引
├── cookies.txt           # 由启用的 Cookie 文件自动合并生成
└── bin/                  # Web 安装的托管 yt-dlp / ffmpeg / ffprobe
```

生产环境请备份 `DATA_DIR` 和 `DOWNLOAD_DIR`，并限制两者的文件系统权限。

## 反向代理

使用子路径时同时设置 `BASE_PATH`，例如：

```bash
BASE_PATH=/ytdlp/ node dist/yt-dlp-studio.mjs
```

代理需要保留 SSE 长连接，且不应缓冲 `/api/events`。TLS 建议在 Caddy、NGINX 或 Traefik 上终止。

## Docker / NAS 预留

服务端已按容器化要求设计：

- 配置完全支持环境变量和 CLI 参数
- 数据与下载目录相互独立，可映射持久化卷
- 提供无鉴权的 `/healthz` 健康检查
- 可监听 IPv6，并支持反向代理子路径
- 单文件构建可直接复制到精简 Node.js 运行时
- 自动识别容器环境并在系统信息中展示

后续 Docker 镜像可在单文件产物基础上加入 ffmpeg、yt-dlp、PUID / PGID、UMASK 和多架构发布，而无需改变应用架构。

## 安全提示

- 这是面向自托管场景的单用户应用，不提供多租户权限模型。
- 暴露到公网前必须启用 `AUTH_PASSWORD` 或在反向代理层配置身份认证与 HTTPS。
- “自定义参数”允许向 yt-dlp 传递额外选项，只应为可信用户开启。
- Cookie 文件可能包含敏感登录信息，不应提交到 Git 或分享给他人。

## License

[MIT](LICENSE)
