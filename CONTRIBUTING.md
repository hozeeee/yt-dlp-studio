# Contributing

感谢参与 yt-dlp Studio 的开发。

## 开发流程

1. Fork 仓库并从 `master` 创建功能分支。
2. 使用 Node.js 22 和仓库声明的 pnpm 版本安装依赖。
3. 保持前后端模块边界清晰，避免在单个组件或服务中堆积无关逻辑。
4. 提交前执行：

```bash
pnpm lint
pnpm typecheck
pnpm build:all
```

5. Pull Request 中说明变更、验证方式和兼容性影响。

站点解析或下载行为首先由 yt-dlp 决定。提交相关 Issue 前，请用最新 yt-dlp 命令行复现并确认问题属于本项目。
