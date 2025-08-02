import { CAP_API_ENDPOINT } from './config.js';
import { build_url } from './build_url.js';

document.addEventListener('DOMContentLoaded', () => {
    const widget = document.querySelector("#cap");
    const form = document.querySelector("#signup-form");

    // Set the data-cap-api-endpoint dynamically
    if (widget) {
        widget.setAttribute("data-cap-api-endpoint", CAP_API_ENDPOINT);
    }

    const modal = document.getElementById("captcha-modal");
    window.capToken = null;
    let currentUrlToShorten = ''; // 新增变量，用于存储待处理的URL

    widget.addEventListener("solve", function (e) {
        window.capToken = e.detail.token;
        modal.style.display = "none";
        document.getElementById('main-container').classList.remove('no-blur');
        build_url(window.capToken, currentUrlToShorten); // 传递存储的URL
    });

    widget.addEventListener("reset", function () {
        window.capToken = null;
    });

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const urlInput = document.getElementById('url');
        let url = urlInput.value.trim();

        // 如果URL没有http://或https://前缀，则自动添加https://
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        currentUrlToShorten = url; // 存储处理后的URL

        // 在发送请求或显示验证码之前，先进行URL验证
        if (!isValidHttpUrl(currentUrlToShorten)) {
            const resultElement = document.getElementById('b_url');
            resultElement.innerHTML = `<span style="color: #ff4d4f;">请输入有效的链接</span>`;
            return; // 如果URL无效，则停止执行
        }

        if (window.capToken) {
            build_url(window.capToken, currentUrlToShorten); // 传递存储的URL
        } else {
            modal.style.display = "flex";
            document.getElementById('main-container').classList.add('no-blur');
        }
    });

    // 将 isValidHttpUrl 函数从 build_url.js 复制到 app.js，以便在 app.js 中直接使用
    function isValidHttpUrl(string) {
        try {
            const url = new URL(string);
            // 进一步验证协议和主机名，确保是有效的HTTP/HTTPS URL
            // 检查协议是否为http或https
            const isHttpOrHttps = url.protocol === 'http:' || url.protocol === 'https:';
            // 检查主机名是否存在且不为空，并且包含点号（基本域名结构）
            const hasValidHostname = url.hostname && url.hostname.includes('.');

            return isHttpOrHttps && hasValidHostname;
        } catch (_) {
            return false;
        }
    }

    const alertModal = document.getElementById("alert-modal");

    function closeModal() {
        modal.style.display = "none";
        document.getElementById('main-container').classList.remove('no-blur');
        const resultElement = document.getElementById('b_url');
        resultElement.innerHTML = `<span style="color: #ff4d4f;">请先完成人机验证。</span>`;
    }

    modal.addEventListener("click", function (e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    const closeBtn = document.querySelector(".close-btn");
    closeBtn.addEventListener("click", closeModal);
    closeBtn.addEventListener("touchend", closeModal);

    const alertOkBtn = document.getElementById("alert-ok-btn");

    alertModal.addEventListener("click", function (e) {
        if (e.target === alertModal) {
            alertModal.style.display = "none";
        }
    });

    alertOkBtn.addEventListener("click", function () {
        alertModal.style.display = "none";
    });

    // 计算并显示网站运行天数和制作信息
    const launchDate = new Date('2025-07-11T00:00:00Z'); // 请替换为您的网站上线日期
    const now = new Date();
    const diffTime = Math.abs(now - launchDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 更新关于页面中的网站运行天数
    const aboutUptimeElement = document.getElementById('about-uptime');
    if (aboutUptimeElement) {
        aboutUptimeElement.textContent = `本站已运行 ${diffDays} 天`;
    }

    console.log(`%c本站已运行 ${diffDays} 天`, 'color: #4CAF50; font-size: 16px; font-weight: bold;');
    console.log(`%c本站由 %c翛Soar%c 制作`, 
        'color: #2196F3; font-size: 14px;', // Style for "本站由 "
        'color: #FF5722; font-size: 14px; font-weight: bold; text-decoration: underline; cursor: pointer;', // Style for "翛Soar"
        'color: #2196F3; font-size: 14px;' // Style for " 制作"
    );
    console.log(`%c作者主页: %chttps://xsoar.cfd`, 
        'color: #607D8B; font-size: 12px;', // Style for "作者主页: "
        'color: #00BCD4; font-size: 12px; text-decoration: underline; cursor: pointer;' // Style for URL
    );
    console.log(`%c项目链接: %chttps://github.com/soarnext/lianjie`, 
        'color: #607D8B; font-size: 12px;', // Style for "项目链接: "
        'color: #00BCD4; font-size: 12px; text-decoration: underline; cursor: pointer;' // Style for URL
    );

    // Dynamically load captcha scripts
    function loadCaptchaScripts() {
        const script1 = document.createElement('script');
        script1.src = 'https://cap.shandian.eu.org/assets/widget.js';
        script1.defer = true;
        document.body.appendChild(script1);

        const script2 = document.createElement('script');
        script2.src = 'https://cap.shandian.eu.org/assets/floating.js';
        script2.defer = true;
        document.body.appendChild(script2);
    }

    loadCaptchaScripts(); // Call the function to load scripts
});
