// === RictWorld Backend Configuration ===
//
// 后端通过 cpolar 内网穿透暴露的公网 HTTPS 地址
//
// 设置步骤:
// 1. 本地运行: python3 server.py
// 2. 启动 cpolar: cpolar http 10021
// 3. 打开控制台: http://localhost:4040 查看隧道状态
// 4. 复制 cpolar 分配的公网 URL (如 https://xxxx.cpolar.io)
// 5. 将下面的 BACKEND_URL 替换为你的 cpolar URL
//
// 免费版 cpolar 每次重启隧道 URL 会变，需重新更新此配置
// 付费版可绑定固定子域名

const BACKEND_URL = 'http://localhost:10021';  // ← 替换为 cpolar 的 HTTPS 地址
