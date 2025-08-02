// API Configuration
export const WORKER_URL = 'https://dl.api.yxc.us.kg/';
export const GITHUB_PAGES_URL = 'https://dl.xsoar.cfd/';
export const CAP_API_ENDPOINT = 'https://cap.shandian.eu.org/3cdb5a3793/';

// WeChat Domain Interception API
export const WECHAT_OFFICIAL_CHECK_API = 'https://cgi.urlsec.qq.com/index.php?m=url&a=validUrl&url=';
export const WECHAT_PROXY_API = `${WORKER_URL}wechat-check-proxy`; // 使用现有的WORKER_URL作为Cloudflare Worker部署URL

// For testing or forced interception: specify a domain to always check, regardless of browser.
// Set to null or an empty string to disable.
export const FORCE_CHECK_DOMAIN = null; // 例如: 'example.com'
