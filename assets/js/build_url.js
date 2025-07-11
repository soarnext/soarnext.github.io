// --- Configuration ---
const WORKER_URL = 'https://dl.api.yxc.us.kg/';
const GITHUB_PAGES_URL = 'https://soarnext.github.io/';

/**
 * Handles the short URL generation process.
 */
async function build_url() {
    const urlInput = document.querySelector('#url');
    const expiresInHoursInput = document.querySelector('#expiresInHours');
    const maxVisitsInput = document.querySelector('#maxVisits');
    const resultElement = document.getElementById('b_url');

    const longUrl = urlInput.value.trim();
    const expiresInHours = parseFloat(expiresInHoursInput.value) || null;
    const maxVisits = parseInt(maxVisitsInput.value, 10) || null;

    if (longUrl === "" || !isValidHttpUrl(longUrl)) {
        resultElement.innerHTML = `<span style="color: #ff4d4f;">请输入有效的链接（以 http/https 开头）。</span>`;
        return;
    }

    resultElement.innerHTML = '正在生成短链接...';

    try {
        const payload = {
            url: longUrl,
            expiresInHours: expiresInHours,
            maxVisits: maxVisits
        };

        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `API Error: ${response.statusText}`);
        }

        const shortUrl = new URL(`?id=${data.id}`, GITHUB_PAGES_URL).href;

        resultElement.innerHTML = `
            生成成功！短链接： <a href="${shortUrl}" target="_blank">${shortUrl}</a>
            <button class="copy-btn" onclick="copyToClipboard('${shortUrl}')">复制</button>
        `;

    } catch (error) {
        console.error('Error generating short URL:', error);
        resultElement.innerHTML = `<span style="color: #ff4d4f;">生成失败：${error.message}</span>`;
    }
}

/**
 * Copies the given text to the user's clipboard.
 */
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alert('短链接已复制到剪贴板！');
        }).catch(err => {
            console.error('Could not copy text: ', err);
            alert('复制失败。');
        });
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            alert('短链接已复制到剪贴板！');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            alert('复制失败。');
        }
        document.body.removeChild(textArea);
    }
}

/**
 * Validates if a string is a valid HTTP/HTTPS URL.
 */
function isValidHttpUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}
