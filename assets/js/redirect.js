import { WORKER_URL } from './config.js';

(function() {
    document.addEventListener('DOMContentLoaded', function() {
        const params = new URLSearchParams(window.location.search);
        const shortId = params.get('id');

        if (shortId) {
            document.title = '跳转中...';
            document.body.className = 'redirect-mode'; // Add class for external CSS
            const mainContainer = document.getElementById('main-container');
            if (mainContainer) {
                mainContainer.innerHTML = `
                    <div id="tips">
                        <h2>正在安全跳转...</h2>
                        <div class="loader"></div>
                    </div>
                `;
            }
            
            const ua = navigator.userAgent.toLowerCase();
            const isWeixin = ua.indexOf('micromessenger') !== -1;
            const isQQ = ua.indexOf('qq') !== -1;
            const isMobile = /iphone|ipad|ipod|android/.test(ua);

            if (isWeixin || isQQ) {
                let instructionHTML = '<h2>请在外部浏览器中打开</h2>';
                if(isWeixin){
                    if (isMobile) {
                        instructionHTML += '<p>1.点击右上角的菜单按钮(通常是三个点)<br>2.选择<i class="fas fa-globe"></i>“用浏览器打开”</p>';
                    } else {
                        instructionHTML += `<a href="${window.location.href}" target="_blank">
                                            <div style="margin-bottom: 1em; font-size: 48px;"><i class="fas fa-globe"></i></div>
                                            <p>请点击图标或复制网址，<br>并在您电脑的浏览器中打开。</p>
                                         </a>`;
                    }
                    document.getElementById('tips').innerHTML = instructionHTML;}
                else{
                    if (isMobile) {
                        instructionHTML += '<p>1.点击右上角的菜单按钮(通常是三个点)<br>2. 选择<i class="fas fa-globe">“浏览器"</i><br>如果没有菜单按钮请复制链接至浏览器打开</p>';
                    } else {
                        instructionHTML += `<a href="${window.location.href}" target="_blank">
                                            <div style="margin-bottom: 1em; font-size: 48px;"><i class="fas fa-globe"></i></div>
                                            <p>请点击图标或复制网址，<br>并在您电脑的浏览器中打开。</p>
                                         </a>`;
                    }
                    document.getElementById('tips').innerHTML = instructionHTML;
                }
            } else {
                fetch(`${WORKER_URL}${shortId}`)
                    .then(response => {
                        if (!response.ok) {
                            return response.json().then(err => {
                                let message = '链接未找到或已失效。';
                                if (err && err.error) {
                                    if (err.error.includes('expired')) message = '此链接已过期。';
                                    if (err.error.includes('maximum number of visits')) message = '此链接已达到最大访问次数。';
                                }
                                throw new Error(message);
                            });
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (data && data.url) {
                            window.location.href = data.url;
                        } else {
                            throw new Error('从服务器返回的数据格式无效。');
                        }
                    })
                    .catch(error => {
                        console.error('Redirect error:', error);
                        document.getElementById('tips').innerHTML = `<h2>跳转失败</h2><p>${error.message}</p>`;
                    });
            }
        }
        // If no 'id', the script does nothing and the rest of the page loads normally.
    });
})();
