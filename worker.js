/**
 * Cloudflare Worker for URL Shortener with D1 Database
 *
 * - Expects a D1 binding named 'DB'
 */

export default {
    async fetch(request, env) {
        if (!env.DB) {
            return new Response('D1 database binding not found.', { status: 500 });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        if (request.method === 'OPTIONS') {
            return handleOptions(request);
        }
        if (request.method === 'POST' && path === '/') {
            return handleCreateShortUrl(request, env);
        }
        if (request.method === 'GET' && path.length > 1) {
            const id = path.substring(1);
            return handleGetShortUrl(id, env);
        }

        return new Response('Not Found', { status: 404 });
    },
};

async function handleCreateShortUrl(request, env) {
    try {
        const { url: longUrl, expiresInHours = 2, maxVisits = null } = await request.json();

        if (!longUrl || !isValidHttpUrl(longUrl)) {
            return new Response(JSON.stringify({ error: 'Invalid URL provided.' }), { status: 400, headers: corsHeaders() });
        }

        // Check if the URL already exists and is not expired
        const now = new Date().toISOString();
        const existingStmt = env.DB.prepare('SELECT id FROM links WHERE url = ? AND (expires_at IS NULL OR expires_at > ?)');
        const existing = await existingStmt.bind(longUrl, now).first();

        if (existing) {
            return new Response(JSON.stringify({ id: existing.id }), { headers: corsHeaders({ 'Content-Type': 'application/json' }) });
        }

        // Create new short URL
        const shortId = generateShortId();
        const expires_at = expiresInHours ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString() : null;

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

async function handleGetShortUrl(id, env) {
    try {
        const stmt = env.DB.prepare('SELECT url, expires_at, max_visits, visit_count FROM links WHERE id = ?');
        const link = await stmt.bind(id).first();

        if (!link) {
            return new Response(JSON.stringify({ error: 'Short URL not found.' }), { status: 404, headers: corsHeaders() });
        }

        // Check for expiration
        if (link.expires_at && new Date(link.expires_at) < new Date()) {
            return new Response(JSON.stringify({ error: 'This link has expired.' }), { status: 410, headers: corsHeaders() });
        }

        // Check for visit limit
        if (link.max_visits !== null && link.visit_count >= link.max_visits) {
            return new Response(JSON.stringify({ error: 'This link has reached its maximum number of visits.' }), { status: 410, headers: corsHeaders() });
        }

        // Increment visit count
        const updateStmt = env.DB.prepare('UPDATE links SET visit_count = visit_count + 1 WHERE id = ?');
        await updateStmt.bind(id).run();

        return new Response(JSON.stringify({ url: link.url }), {
            headers: corsHeaders({ 'Content-Type': 'application/json' }),
        });

    } catch (error) {
        console.error('Error retrieving short URL:', error);
        return new Response(JSON.stringify({ error: 'Failed to retrieve short URL.' }), { status: 500, headers: corsHeaders() });
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
