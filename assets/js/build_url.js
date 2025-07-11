// --- Configuration ---
const WORKER_URL = 'https://dl.api.yxc.us.kg/';
const GITHUB_PAGES_URL = 'https://soarnext.github.io/';

/**
 * Handles the short URL generation process.
 */
async function build_url() {
    const urlInput = document.querySelector('#url');
    const longUrl = urlInput.value.trim();
    const resultElement = document.getElementById('b_url');

    if (longUrl === "" || !isValidHttpUrl(longUrl)) {
        resultElement.innerHTML = `<span style="color: #ff4d4f;">请输入有效的链接（以 http/https 开头）。</span>`;
        return;
    }

    resultElement.innerHTML = '正在生成短链接...';

    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: longUrl })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const shortUrl = new URL(`?id=${data.id}`, GITHUB_PAGES_URL).href;

        resultElement.innerHTML = `
            生成成功！短链接： <a href="${shortUrl}" target="_blank">${shortUrl}</a>
            <button class="copy-btn" onclick="copyToClipboard('${shortUrl}')">复制</button>
        `;

    } catch (error) {
        console.error('Error generating short URL:', error);
        resultElement.innerHTML = `<span style="color: #ff4d4f;">生成失败，请检查您的 Worker 是否已正确部署和配置。</span>`;
    }
}

/**
 * Copies the given text to the user's clipboard.
 * @param {string} text The text to copy.
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
        // Fallback for older browsers
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
 * @param {string} string The string to validate.
 * @returns {boolean} True if the URL is valid, false otherwise.
 */
function isValidHttpUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}
