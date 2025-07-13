# Lianjie
### 本项目fork自CalmXin的[xin-tencent-fang-hong](https://github.com/CalmXin/xin-tencent-fang-hong)
## 项目简介
这是一个基于GitHub Pages和Cloudflare Worker/D1数据库构建的短链接生成器，旨在帮助用户生成防屏蔽/防红的短链接，方便在微信、QQ等平台分享。

## 功能特性
- **自定义短链接**：使用您自己的Cloudflare Worker和D1数据库作为后端。
- **链接去重**：如果相同的长链接已被缩短过，将直接返回之前生成的短链接，避免重复创建。
- **高级选项**：
    - **过期时间**：可为短链接设置一个有效时长（默认2小时，可自定义）。
    - **最大访问次数**：可限制短链接被访问的最大次数（默认无限次，可自定义）。
- **智能跳转**：
    - 在微信/QQ内置浏览器中打开时，会根据设备类型（手机/电脑）给出清晰的指引，提示用户在外部浏览器中打开。
    - 自动处理链接跳转，提供友好的加载和错误提示。
- **性能优化**：后端Worker利用Cloudflare Cache API减少数据库访问次数，提高响应速度。
- **自动清理**：通过Cloudflare Worker的Cron Trigger定时任务，自动删除过期或达到最大访问次数的链接，保持数据库整洁。
- **动态背景**：背景图片通过 API (https://bing.img.run) 动态加载。如果 API 加载失败，将根据设备类型（移动/桌面）使用本地的备用图片。
## 已知BUG
- 无法记录域名地址(如添加此[链接](https://blog.yxc.us.kg/posts/hallo)会转跳[根域名](https://blog.yxc.us.kg/))
## 部署教程

本项目的部署分为两大部分：**前端（GitHub Pages）** 和 **后端（Cloudflare Worker & D1）**。

### 1. 前端部署 (GitHub Pages)

1.  **克隆仓库**：
    ```bash
    git clone https://github.com/soarnext/soarnext.github.io.git
    cd soarnext.github.io
    ```
2.  **上传到GitHub**：
    将此仓库的内容上传到您的GitHub账户下的一个新仓库。
3.  **启用GitHub Pages**：
    在您的GitHub仓库设置中，找到 `Pages` 选项，选择 `main` 分支作为部署来源，并选择 `/ (root)` 目录。保存后，GitHub Pages会自动部署您的网站。
    您的前端网站URL将是 `https://<您的用户名>.github.io/<您的仓库名>/` (例如：`https://soarnext.github.io/soarnext.github.io/`)。

### 2. 后端部署 (Cloudflare Worker & D1)

#### 2.1. Cloudflare D1 数据库设置

1.  **登录Cloudflare**：
    登录您的Cloudflare账户。
2.  **创建D1数据库**：
    在Cloudflare控制台中，导航到 `Workers & Pages` -> `D1`，点击 `Create database`，给您的数据库起一个名字（例如：`shortener-db`）。
3.  **创建表结构**：
    在您创建的D1数据库页面，找到 `Query` 或 `Browse Data` 选项，执行以下SQL命令来创建 `links` 表并添加索引。**请务必一条一条地执行这些命令**：

    ```sql
    -- 创建表
    CREATE TABLE links (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 添加 expires_at 列
    ALTER TABLE links ADD COLUMN expires_at TIMESTAMP;

    -- 添加 max_visits 列
    ALTER TABLE links ADD COLUMN max_visits INTEGER;

    -- 添加 visit_count 列
    ALTER TABLE links ADD COLUMN visit_count INTEGER DEFAULT 0;

    -- 创建索引以优化URL查询（用于去重）
    CREATE INDEX idx_url ON links (url);
    ```

#### 2.2. Cloudflare Worker 部署

1.  **创建Worker**：
    在Cloudflare控制台中，导航到 `Workers & Pages`，点击 `Create application` -> `Create Worker`，给您的Worker起一个名字（例如：`my-shortener-worker`）。
2.  **编辑Worker代码**：
    进入您创建的Worker页面，点击 `Quick Edit` 或 `Deploy`，将本项目根目录下的 `worker.js` 文件内容复制并粘贴到Worker的代码编辑器中。
3.  **绑定D1数据库**：
    在Worker的设置页面，找到 `Settings` -> `Variables` -> `D1 database bindings`。
    点击 `Add binding`：
    -   **Variable name**：输入 `DB` (必须是这个名字，因为Worker代码中使用了 `env.DB`)
    -   **D1 database**：选择您之前创建的D1数据库（例如：`shortener-db`）。
    保存。
4.  **配置Cron Trigger (定时清理)**：
    在Worker的设置页面，找到 `Triggers` -> `Cron Triggers`。
    点击 `Add Cron Trigger`，添加一个Cron表达式，例如 `0 * * * *` (表示每小时运行一次，用于清理过期/超限链接)。
    保存并部署Worker。
    您的Worker URL将是 `https://<您的Worker名>.<您的子域名>.workers.dev` (例如：`https://my-shortener.yourusername.workers.dev/`)。

### 3. 更新前端配置

1.  **获取Worker URL**：
    复制您部署的Cloudflare Worker的URL（例如：`https://my-shortener.yourusername.workers.dev/`）。
2.  **修改 `assets/js/build_url.js`**：
    打开您GitHub Pages仓库中的 `assets/js/build_url.js` 文件。
    找到以下两行：
    ```javascript
    const WORKER_URL = 'https://dl.api.yxc.us.kg/';
    const GITHUB_PAGES_URL = 'https://soarnext.github.io/';
    ```
    -   将 `WORKER_URL` 的值替换为您自己的Cloudflare Worker URL。
    -   将 `GITHUB_PAGES_URL` 的值替换为您自己的GitHub Pages网站的根URL（例如：`https://<您的用户名>.github.io/<您的仓库名>/`）。
    保存并提交这些更改到您的GitHub仓库。GitHub Pages会自动重新部署。

### 4. 使用方法

1.  访问您的GitHub Pages网站。
2.  在输入框中粘贴您想要缩短的长链接。
3.  （可选）点击“高级选项”设置链接的过期时间或最大访问次数。
4.  点击“生成短链接”按钮。
5.  复制生成的短链接，即可在微信、QQ等平台分享。
6.  当用户点击短链接时，如果是在微信/QQ内置浏览器中，会提示用户在外部浏览器中打开；否则，将直接跳转到原始长链接。

---
