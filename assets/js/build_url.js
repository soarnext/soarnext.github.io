import { WORKER_URL } from './config.js';

/**
 * Handles the short URL generation process.
 */
export async function build_url() {
    const urlInput = document.querySelector('#url');
    const expiresInHoursInput = document.querySelector('#expiresInHours');
    const maxVisitsInput = document.querySelector('#maxVisits');
    const resultElement = document.getElementById('b_url');

    let longUrl = urlInput.value.trim();
    const expiresInHours = parseFloat(expiresInHoursInput.value) || null;
    const maxVisits = parseInt(maxVisitsInput.value, 10) || null;

    // Automatically add https:// if protocol is missing
    if (longUrl !== "" && !longUrl.startsWith('http://') && !longUrl.startsWith('https://')) {
        longUrl = 'https://' + longUrl;
    }

    if (longUrl === "" || !isValidHttpUrl(longUrl)) {
        resultElement.innerHTML = `<span style="color: #ff4d4f;">请输入有效的链接（以 http/https 开头）。</span>`;
        return;
    }

    resultElement.innerHTML = '正在生成链接...';

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

        const shortUrl = new URL(`?id=${data.id}`, window.location.origin).href;

        resultElement.innerHTML = ''; // Clear previous content

        const successMessage = document.createElement('span');
        successMessage.textContent = '生成成功！短链接： ';
        resultElement.appendChild(successMessage);

        const link = document.createElement('a');
        link.href = shortUrl;
        link.target = '_blank';
        link.textContent = shortUrl;
        resultElement.appendChild(link);

        const copyButton = document.createElement('button');
        copyButton.className = 'copy-btn';
        copyButton.textContent = '复制';
        copyButton.onclick = () => copyToClipboard(shortUrl);
        resultElement.appendChild(copyButton);

    } catch (error) {
        console.error('Error generating short URL:', error);
        resultElement.innerHTML = `<span style="color: #ff4d4f;">生成失败：</span>`;
        const errorMessageSpan = document.createElement('span');
        errorMessageSpan.style.color = '#ff4d4f';
        errorMessageSpan.textContent = error.message;
        resultElement.appendChild(errorMessageSpan);
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
        // More robust check for http/https and a basic domain structure
        return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.');
    } catch (_) {
        return false;
    }
}
