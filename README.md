# Lianjie
### 本项目fork自CalmXin的[xin-tencent-fang-hong](https://github.com/CalmXin/xin-tencent-fang-hong)
## 项目简介
这是一个基于GitHub Pages、github.io、Cloudflare Workers和Cloudflare D1数据库构建的防红短链接生成器

## 功能特性
- **防红域名**：可使用GitHub Pages的github.io作为防红域名，无需申请。
- **自定义短链接**：使用您自己的Cloudflare Worker和D1数据库作为后端。(免费版即可)
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
- **H5适配**：对移动端设备进行了适配，确保在小屏幕上也能有良好的用户体验。
## 已知BUG
- 无法记录域名地址(如添加此[链接](https://blog.yxc.us.kg/posts/hallo)会转跳[根域名](https://blog.yxc.us.kg/))
## 部署教程

本项目的部署分为两大部分：**前端（GitHub Pages）** 和 **后端（Cloudflare Worker & D1）**。

### 1. 前端部署 (GitHub Pages)
1. **Fork本仓库** [点击此链接](https://github.com/soarnext/lianjie/fork)或点击仓库右上角`Fork`按钮。
2.  **启用GitHub Pages**：
    在您的GitHub仓库设置中，找到 `Pages` 选项，选择 `main` 分支作为部署来源，并选择 `/ (root)` 目录。保存后，GitHub Pages会自动部署您的网站。
    您的前端网站URL将是 `https://<您的用户名>.github.io/<您的仓库名>/` (如果仓库名称为<您的用户名>.github.io，可使用<您的用户名>.github.io访问) 

### 2. 后端部署 (Cloudflare Worker & D1)

#### 2.1. Cloudflare D1 数据库设置

1.  **登录Cloudflare**：
    登录您的Cloudflare账户。
2.  **创建D1数据库**：
    在Cloudflare控制台中，导航到 `存储与数据库` -> `D1 SQL 数据库`，点击 `创建数据库`，给您的数据库起一个名字（例如：`lianjie-db`）。
3.  **创建表结构**：
    在您创建的D1数据库页面，点击 `控制台` ，执行以下SQL命令来创建 `links` 表并添加索引。**请务必一条一条地执行这些命令**：

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
    在Cloudflare控制台中，导航到 `Workers & Pages`，点击 `创建` -> `从 Hello World! 开始`，给您的Worker起一个名字（例如：`my-shortener-worker`），点击`部署`。
2.  **编辑Worker代码**：
    进入您创建的Worker页面(标题:成功！您的项目已部署到以下区域：全球)，点击 `编辑代码` ，将本项目根目录下的 `worker.js` 文件内容复制并粘贴到Worker的代码编辑器中，点击`部署`。
3.  **绑定D1数据库**：
    在Worker的设置页面，找到 `绑定` -> `添加绑定` -> `D1 数据库`。
    点击 `添加绑定`：
    -   **变量名称**：输入 `DB` (必须是这个名字，因为Worker代码中使用了 `env.DB`)
    -   **D1 数据库**：选择您之前创建的D1数据库（例如：`shortener-db`）。
    保存。
4.  **配置Cron Trigger (定时清理)**：
    在Worker的设置页面，找到 `设置` -> `触发事件`。
    点击 `添加` ->`Cron 触发器`->`计划`，添加一个执行 Worker 的频率，选择`小时`->填写`1` (表示每小时运行一次，用于清理过期/超限链接)。
    保存并部署Worker。
5. **配置自定义域名**：
   由于workers.dev在国内无法访问，需要自定义域名
   在Worker的设置页面，找到 `设置` -> `域和路由`。
   点击 `添加`，添加一个直接的域名(建议托管Cloudflare,可自动配置)。
   保存 

### 3. 更新前端配置

1.  **获取Worker URL**：
    复制您部署的Cloudflare Worker的域名
2.  **修改 `assets/js/config.js`**：
    打开您GitHub Pages仓库中的 `assets/js/config.js` 文件。
    找到以下两行：
    ```javascript
    export const WORKER_URL = 'https://api.yourname.com/';
    export const GITHUB_PAGES_URL = 'https://yourname.com/';
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
