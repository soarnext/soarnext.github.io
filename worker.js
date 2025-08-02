/**
 * Cloudflare Worker for URL Shortener with D1 Database
 *
 * - Expects a D1 binding named 'DB'
 * - API endpoints:
 *   - POST /: Creates a short URL. Expects a JSON body with { url: "...", expiresInHours?: number, maxVisits?: number }. Returns { id: "..." }.
 *   - GET /:id: Retrieves a long URL. Returns { url: "..." }.
 * - Scheduled event: Cleans up expired/maxed-out links.
 */

const CAP_SERVER_BASE_URL = 'https://cap.shandian.eu.org';
const CAP_SITE_KEY = '3cdb5a3793'; // Updated based on user's latest preference

export default {
    async fetch(request, env) {
        console.log(`Received request: ${request.method} ${request.url}`); // Added for debugging

        if (!env.DB) {
            return new Response('D1 database binding not found.', { status: 500, headers: corsHeaders() }); // Added corsHeaders
        }
        if (!env.CAP_SECRET_KEY) {
            return new Response('CAP_SECRET_KEY environment variable not found.', { status: 500, headers: corsHeaders() }); // Added corsHeaders
        }

        const url = new URL(request.url);
        const path = url.pathname;

        if (request.method === 'OPTIONS') {
            return handleOptions(request);
        }
        if (request.method === 'POST' && path === '/') {
            return handleCreateShortUrl(request, env);
        }
        if (request.method === 'GET' && path === '/wechat-check-proxy') {
            return handleWechatCheckProxy(request);
        }
        if (request.method === 'GET' && path.length > 1) {
            let id = path.substring(1);
            // If the path is just '/', check for 'id' in query parameters
            if (id === '' && url.searchParams.has('id')) {
                id = url.searchParams.get('id');
            } else if (id.startsWith('?id=')) { // Handle cases like /?id=xxx directly in path
                id = url.searchParams.get('id');
            }

            if (!id) { // If no ID is found after parsing
                return new Response(JSON.stringify({ error: 'Short URL ID missing.' }), { status: 400, headers: corsHeaders() });
            }
            return handleGetShortUrl(id, request, env); // Pass request for caching
        }

        return new Response('Not Found', { status: 404, headers: corsHeaders() }); // Added corsHeaders
    },

    // Handle scheduled events for cleanup
    async scheduled(event, env, ctx) {
        ctx.waitUntil(cleanupExpiredLinks(env));
    },
};


async function handleCreateShortUrl(request, env) {
    try {
        const { url: longUrl, expiresInHours = 2, maxVisits = null, capToken } = await request.json();

        if (!capToken) {
            return new Response(JSON.stringify({ error: 'CAPTCHA token missing.' }), { status: 403, headers: corsHeaders() });
        }

        // Verify Cap.js token
        const verifyResponse = await fetch(`${CAP_SERVER_BASE_URL}/${CAP_SITE_KEY}/siteverify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ secret: env.CAP_SECRET_KEY, response: capToken }),
        });

        if (!verifyResponse.ok) {
            console.error('Cap.js token verification failed:', verifyResponse.status, verifyResponse.statusText);
            return new Response(JSON.stringify({ error: 'CAPTCHA verification failed.' }), { status: 403, headers: corsHeaders() });
        }

        const verifyData = await verifyResponse.json();
        if (!verifyData.success) {
            return new Response(JSON.stringify({ error: 'CAPTCHA verification failed.' }), { status: 403, headers: corsHeaders() });
        }

        if (!longUrl || !isValidHttpUrl(longUrl)) {
            return new Response(JSON.stringify({ error: 'Invalid URL provided.' }), { status: 400, headers: corsHeaders() });
        }

        const now = new Date();
        const nowISO = now.toISOString();

        // Check if the URL already exists and is not expired/maxed out
        const existingStmt = env.DB.prepare(
            'SELECT id, expires_at, max_visits, visit_count FROM links WHERE url = ? AND (expires_at IS NULL OR expires_at > ?) AND (max_visits IS NULL OR visit_count < max_visits)'
        );
        const existing = await existingStmt.bind(longUrl, nowISO).first();

        if (existing) {
            return new Response(JSON.stringify({ id: existing.id }), { headers: corsHeaders({ 'Content-Type': 'application/json' }) });
        }

        // Create new short URL
        const shortId = generateShortId();
        const expires_at = expiresInHours ? new Date(now.getTime() + expiresInHours * 60 * 60 * 1000).toISOString() : null;

        const insertStmt = env.DB.prepare('INSERT INTO links (id, url, expires_at, max_visits) VALUES (?, ?, ?, ?)');
        await insertStmt.bind(shortId, longUrl, expires_at, maxVisits).run();

        return new Response(JSON.stringify({ id: shortId }), {
            headers: corsHeaders({ 'Content-Type': 'application/json' }),
        });
    } catch (error) {
        console.error('Error creating short URL:', error);
        return new Response(JSON.stringify({ error: 'Failed to create short URL.' }), { status: 500, headers: corsHeaders() });
    }
}

async function handleGetShortUrl(id, request, env) {
    const cacheKey = new Request(request.url, request);
    const cache = caches.default;

    // Try to find in cache first
    let response = await cache.match(cacheKey);
    if (response) {
        console.log('Cache hit for ID:', id);
        return response;
    }

    console.log('Cache miss for ID:', id);
    try {
        const stmt = env.DB.prepare('SELECT url, expires_at, max_visits, visit_count FROM links WHERE id = ?');
        const link = await stmt.bind(id).first();

        if (!link) {
            return new Response(JSON.stringify({ error: 'Short URL not found.' }), { status: 404, headers: corsHeaders() });
        }

        const now = new Date();

        // Check for expiration
        if (link.expires_at && new Date(link.expires_at) < now) {
            return new Response(JSON.stringify({ error: 'This link has expired.' }), { status: 410, headers: corsHeaders() });
        }

        // Check for visit limit
        if (link.max_visits !== null && link.visit_count >= link.max_visits) {
            return new Response(JSON.stringify({ error: 'This link has reached its maximum number of visits.' }), { status: 410, headers: corsHeaders() });
        }

        // Increment visit count (only if not expired/maxed out)
        const updateStmt = env.DB.prepare('UPDATE links SET visit_count = visit_count + 1 WHERE id = ?');
        await updateStmt.bind(id).run();

        // Create response and cache it
        response = new Response(JSON.stringify({ url: link.url }), {
            headers: corsHeaders({ 'Content-Type': 'application/json' }),
        });
        // Cache for 5 minutes (adjust as needed)
        response.headers.append('Cache-Control', 'public, max-age=300');
        await cache.put(cacheKey, response.clone());

        return response;

    } catch (error) {
        console.error('Error retrieving short URL:', error);
        return new Response(JSON.stringify({ error: 'Failed to retrieve short URL.' }), { status: 500, headers: corsHeaders() });
    }
}

// Scheduled cleanup function
async function cleanupExpiredLinks(env) {
    console.log('Running scheduled cleanup for expired/maxed links...');
    const now = new Date().toISOString();
    try {
        // Delete expired links
        const expiredStmt = env.DB.prepare('DELETE FROM links WHERE expires_at IS NOT NULL AND expires_at < ?');
        const expiredResult = await expiredStmt.bind(now).run();
        console.log(`Deleted ${expiredResult.changes} expired links.`);

        // Delete links that reached max visits
        const maxVisitsStmt = env.DB.prepare('DELETE FROM links WHERE max_visits IS NOT NULL AND visit_count >= max_visits');
        const maxVisitsResult = await maxVisitsStmt.run();
        console.log(`Deleted ${maxVisitsResult.changes} links that reached max visits.`);

    } catch (error) {
        console.error('Error during scheduled cleanup:', error);
    }
}

// --- Utility and CORS Functions ---

function generateShortId(length = 7) {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function isValidHttpUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// Function to extract main domain (eTLD+1) - simplified, does not fully handle Public Suffix List
function getMainDomain(url) {
    try {
        const hostname = new URL(url).hostname;
        // Simple check for IP address
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
            return hostname;
        }
        const parts = hostname.split('.');
        // For domains like example.com, returns example.com
        // For domains like sub.example.com, returns example.com
        // For domains like example.co.uk, this simplified version will return co.uk, which is incorrect.
        // A full solution requires a Public Suffix List.
        if (parts.length > 2) {
            return parts.slice(-2).join('.');
        }
        return hostname;
    } catch (e) {
        console.error("Error getting main domain:", e);
        return null;
    }
}

function corsHeaders(extraHeaders = {}) {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        ...extraHeaders
    };
}

function handleOptions(request) {
    if (
        request.headers.get('Origin') !== null &&
        request.headers.get('Access-Control-Request-Method') !== null &&
        request.headers.get('Access-Control-Request-Headers') !== null
    ) {
        return new Response(null, { headers: corsHeaders() });
    } else {
        return new Response(null, { headers: { Allow: 'GET, POST, OPTIONS' } });
    }
}

// New function to proxy WeChat domain check API
async function handleWechatCheckProxy(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url'); // Get the URL to check from query params

    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'URL parameter missing for WeChat check proxy.' }), { status: 400, headers: corsHeaders() });
    }

    const cacheKey = new Request(request.url, request);
    const cache = caches.default;

    // 尝试从缓存中获取响应
    let response = await cache.match(cacheKey);
    if (response) {
        console.log('Cache hit for WeChat check:', targetUrl);
        return response;
    }

    console.log('Cache miss for WeChat check:', targetUrl);
    const domainToCheck = getMainDomain(targetUrl);
    if (!domainToCheck) {
        return new Response(JSON.stringify({ error: '无法解析目标域名。' }), { status: 400, headers: corsHeaders() });
    }
    const officialApiUrl = `https://cgi.urlsec.qq.com/index.php?m=url&a=validUrl&url=${encodeURIComponent(domainToCheck)}`;

    try {
        const apiResponse = await fetch(officialApiUrl);
        const data = await apiResponse.json();
        
        // 如果reCode为0且data为"ok"，则修改data字段
        if (data.reCode === 0 && data.data === "ok") {
            data.data = "本网站已被拦截";
        }

        // 创建响应并缓存
        response = new Response(JSON.stringify(data), {
            headers: corsHeaders({ 'Content-Type': 'application/json' }),
        });
        // 缓存微信域名检测结果，例如缓存1小时 (3600秒)，因为域名状态变化不频繁
        response.headers.append('Cache-Control', 'public, max-age=3600');
        await cache.put(cacheKey, response.clone());

        return response;
    } catch (error) {
        console.error('Error fetching from WeChat Official API via proxy:', error);
        return new Response(JSON.stringify({ error: 'Failed to proxy WeChat API request.', details: error.message }), { status: 500, headers: corsHeaders() });
    }
}
