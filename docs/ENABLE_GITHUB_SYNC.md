# 启用 GitHub 同步功能指南

## 背景

GitHub 同步功能已完整实现并备份在 `service/github_sync.go.bak` 文件中。为了解决 Docker 构建时缺少 Go 环境的问题，该功能暂时被禁用。当你有条件启用此功能时，请按照以下步骤操作。

## 推荐方案：使用 GitHub Actions（无需本地 Go 环境）⭐

这是最简单的方法，完全在云端自动化完成，不需要本地 Go 环境。

### 步骤

1. **打开 GitHub 仓库的 Actions 页面**
   - 访问：`https://github.com/你的用户名/你的仓库名/actions`

2. **找到并运行 workflow**
   - 在左侧侧边栏找到 "Enable GitHub Sync Feature"
   - 点击该 workflow

3. **手动触发**
   - 点击右侧的 "Run workflow" 按钮
   - 在弹出的对话框中：
     * 确认分支（通常是 `main` 或 `master`）
     * 在 "确认启用 GitHub 同步功能" 输入框中输入 `yes`
   - 点击绿色的 "Run workflow" 按钮开始执行

4. **等待完成**
   - 工作流运行大约需要 1-2 分钟
   - 你可以点击正在运行的 workflow 查看实时日志

5. **拉取更新**
   ```bash
   git pull
   ```

### 工作流程会自动完成以下操作：

- ✅ 检出代码仓库
- ✅ 设置 Go 1.21 环境
- ✅ 恢复 `service/github_sync.go` 文件（从 .bak）
- ✅ 添加所需的依赖到 `go.mod`
- ✅ 运行 `go mod tidy` 补全所有传递依赖
- ✅ 更新 `go.sum` 文件
- ✅ 提交并推送更改
- ✅ 显示配置指南

### 查看结果

工作流运行完成后：
- ✅ 在 Actions 页面查看详细日志和输出
- ✅ 在仓库的 Commits 中看到新的提交
- ✅ `service/github_sync.go` 已恢复
- ✅ `go.mod` 和 `go.sum` 已更新

## 备选方案

### 方案一：使用本地 Go 环境

如果你有 Go 1.21+ 环境：

```bash
# 1. 恢复源文件
mv service/github_sync.go.bak service/github_sync.go

# 2. 添加依赖
go get github.com/google/go-github/v50@v50.2.0
go get golang.org/x/oauth2@v0.0.0-20220223155221-ee480838109b

# 3. 补全所有依赖
go mod tidy

# 4. 验证构建
go build

# 5. 提交更改
git add service/github_sync.go go.mod go.sum
git commit -m "feat: enable GitHub sync feature"
git push
```

### 方案二：使用 Docker 容器

如果没有本地 Go 环境但有 Docker：

```bash
# 1. 恢复源文件
mv service/github_sync.go.bak service/github_sync.go

# 2. 使用 Go 容器运行 go mod tidy
docker run --rm -v ${PWD}:/app -w /app golang:1.21 sh -c "
  go get github.com/google/go-github/v50@v50.2.0 && \
  go get golang.org/x/oauth2@v0.0.0-20220223155221-ee480838109b && \
  go mod tidy
"

# 3. 验证 go.sum 已更新
git diff go.sum

# 4. 提交更改
git add service/github_sync.go go.mod go.sum
git commit -m "feat: enable GitHub sync feature"
git push
```

## 启用后的配置

功能启用后，需要配置以下环境变量：

```bash
# GitHub 个人访问令牌（需要 repo 权限）
GITHUB_SYNC_TOKEN=ghp_your_token_here

# GitHub 仓库地址
GITHUB_SYNC_REPO=https://github.com/owner/repo

# 同步间隔（秒，可选，默认 300）
GITHUB_SYNC_INTERVAL=300
```

### 生成 GitHub Token

1. 访问：https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 选择权限：
   - ✅ `repo` - 完整的仓库访问权限
4. 设置过期时间
5. 生成并复制 token

### 配置文件格式

GitHub 仓库中的配置文件需要放在根目录：

- `channels.json` - 渠道配置
- `users.json` - 用户配置  
- `tokens.json` - 令牌配置

详细格式请参考：[docs/GITHUB_SYNC.md](./GITHUB_SYNC.md)

## 功能说明

启用后，系统会：

1. **自动同步**：定期从 GitHub 仓库拉取配置
2. **手动触发**：通过管理员 API 手动触发同步
3. **安全验证**：仅同步有效的配置数据
4. **错误处理**：同步失败不影响现有系统运行

## 验证功能

启用后可以通过以下方式验证：

```bash
# 查看日志
docker logs kiki20

# 应该看到类似输出：
# GitHub 同步服务已启动，间隔: 300秒
# GitHub 同步成功完成
```

或访问管理员 API：

```bash
curl -X POST http://localhost:7860/api/github/sync \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 文档链接

- [GitHub 同步功能文档](./GITHUB_SYNC.md) - 详细功能说明
- [README_GITHUB_SYNC_CN.md](../README_GITHUB_SYNC_CN.md) - 快速开始指南
- [workflow 文件](../.github/workflows/enable-github-sync.yml) - Actions 配置

## 故障排除

### workflow 运行失败

1. 检查是否输入了 `yes` 确认
2. 查看 workflow 日志中的错误信息
3. 确认仓库有 `service/github_sync.go.bak` 文件

### 本地方案依赖下载失败

```bash
# 使用代理
export GOPROXY=https://goproxy.cn,direct
go mod tidy
```

### Docker 方案权限问题（Linux）

```bash
# 给予容器适当的权限
docker run --rm -v ${PWD}:/app -w /app --user $(id -u):$(id -g) golang:1.21 sh -c "..."
```

## 需要帮助？

如有问题，请：
1. 查看 [docs/GITHUB_SYNC.md](./GITHUB_SYNC.md) 详细文档
2. 检查 workflow 运行日志
3. 在仓库中提交 Issue