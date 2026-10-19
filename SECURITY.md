# Security Policy

## Supported versions

安全修复仅面向最新版本和 `master` 分支。

## Reporting a vulnerability

请不要公开提交包含利用细节、Cookie、令牌、密码或个人数据的 Issue。请通过 GitHub Security Advisories 的私密报告功能联系维护者。

报告应包含受影响版本、影响范围、复现步骤和建议修复方式。维护者会在确认后协调修复与披露时间。

## Deployment guidance

本项目是单用户自托管应用。公网部署必须启用访问认证和 HTTPS，限制 `DATA_DIR`、`DOWNLOAD_DIR` 的文件权限，并仅允许可信用户使用自定义 yt-dlp 参数。
