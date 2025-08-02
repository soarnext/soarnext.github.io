import { WORKER_URL } from './config.js';

// --- Configuration ---
import { GITHUB_PAGES_URL } from './config.js';

/**
 * Handles the short URL generation process.
 * @param {string} capToken - The CAPTCHA token from Cap.js.
 * @param {string} longUrl - The long URL to be shortened.
 */
export async function build_url(capToken, longUrl) {
    const expiresInHoursInput = document.querySelector('#expiresInHours');
    const maxVisitsInput = document.querySelector('#maxVisits');
    const resultElement = document.getElementById('b_url');

    const expiresInHours = parseFloat(expiresInHoursInput.value) || null;
    const maxVisits = parseInt(maxVisitsInput.value, 10) || null;

    if (longUrl === "" || !isValidHttpUrl(longUrl)) {
        resultElement.innerHTML = `<span style="color: #ff4d4f;">请输入有效的链接（以 http/https 开头）。</span>`;
        return;
    }

    resultElement.innerHTML = '正在生成链接...';

    try {
        const payload = {
            url: longUrl,
            expiresInHours: expiresInHours,
            maxVisits: maxVisits,
            capToken: capToken // Add the CAPTCHA token to the payload
        };

        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.status === 403) {
            window.capToken = null;
            document.querySelector("#cap").reset();
            throw new Error('CAPTCHA 验证失败，请重试。');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `API Error: ${response.statusText}`);
        }

        const shortUrl = new URL(`?id=${data.id}`, GITHUB_PAGES_URL).href;

        resultElement.innerHTML = `
            生成成功！短链接： <a href="${shortUrl}" target="_blank">${shortUrl}</a>
            <button class="copy-btn" onclick="copyToClipboard('${shortUrl}')">复制</button>
        `;

        // Reset the CAPTCHA widget
        window.capToken = null;
        document.querySelector("#cap").reset();

    } catch (error) {
        console.error('Error generating short URL:', error);
        // 使用 textContent 避免 XSS 风险
        resultElement.textContent = `生成失败：${error.message}`;
        resultElement.style.color = '#ff4d4f'; // 重新设置颜色，因为 textContent 会覆盖样式
        // Reset the CAPTCHA widget
        window.capToken = null;
        document.querySelector("#cap").reset();
    }
}

/**
 * Copies the given text to the user's clipboard.
 */
window.copyToClipboard = function(text) {
    const alertModal = document.getElementById('alert-modal');
    const alertMessage = document.getElementById('alert-message');

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alertMessage.textContent = '链接已复制到剪贴板！';
            alertModal.style.display = 'flex';
        }).catch(err => {
            console.error('Could not copy text: ', err);
            alertMessage.textContent = '复制失败。';
            alertModal.style.display = 'flex';
        });
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            alertMessage.textContent = '链接已复制到剪贴板！';
            alertModal.style.display = 'flex';
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            alertMessage.textContent = '复制失败。';
            alertModal.style.display = 'flex';
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
