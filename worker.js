/**
 * Cloudflare Worker for URL Shortener with D1 Database
 *
 * - Expects a D1 binding named 'DB'
 * - API endpoints:
 *   - POST /: Creates a short URL. Expects a JSON body with { url: "..." }. Returns { id: "..." }.
 *   - GET /:id: Retrieves a long URL. Returns { url: "..." }.
 */

export default {
    async fetch(request, env) {
        if (!env.DB) {
            return new Response('D1 database binding not found.', { status: 500 });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            return handleOptions(request);
        }

        // Handle short URL creation
        if (request.method === 'POST' && path === '/') {
            return handleCreateShortUrl(request, env);
        }

        // Handle short URL retrieval
        if (request.method === 'GET' && path.length > 1) {
            const id = path.substring(1);
            return handleGetShortUrl(id, env);
        }

        return new Response('Not Found', { status: 404 });
    },
};

async function handleCreateShortUrl(request, env) {
    try {
        const { url: longUrl } = await request.json();
        if (!longUrl || !isValidHttpUrl(longUrl)) {
            return new Response('Invalid URL provided.', { status: 400, headers: corsHeaders() });
        }

        const shortId = generateShortId();
        const stmt = env.DB.prepare('INSERT INTO links (id, url) VALUES (?, ?)');
        await stmt.bind(shortId, longUrl).run();

        return new Response(JSON.stringify({ id: shortId }), {
            headers: corsHeaders({ 'Content-Type': 'application/json' }),
        });
    } catch (error) {
        console.error('Error creating short URL:', error);
        return new Response('Failed to create short URL.', { status: 500, headers: corsHeaders() });
    }
}

async function handleGetShortUrl(id, env) {
    const stmt = env.DB.prepare('SELECT url FROM links WHERE id = ?');
    const result = await stmt.bind(id).first();

    if (result && result.url) {
        return new Response(JSON.stringify({ url: result.url }), {
            headers: corsHeaders({ 'Content-Type': 'application/json' }),
        });
    } else {
        return new Response('Short URL not found.', { status: 404, headers: corsHeaders() });
    }
}

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

// Handle CORS
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
        // Handle CORS preflight requests.
        return new Response(null, {
            headers: corsHeaders(),
        });
    } else {
        // Handle standard OPTIONS request.
        return new Response(null, {
            headers: {
                Allow: 'GET, POST, OPTIONS',
            },
        });
    }
}
