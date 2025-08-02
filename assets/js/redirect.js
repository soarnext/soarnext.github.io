import { WORKER_URL, WECHAT_OFFICIAL_CHECK_API, WECHAT_PROXY_API, FORCE_CHECK_DOMAIN } from './config.js';

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
                        <h2>正在检测链接状态...</h2>
                        <div class="loader"></div>
                    </div>
                `;
            }
            
            const ua = navigator.userAgent.toLowerCase();
            const isWeixin = ua.indexOf('micromessenger') !== -1;
            const isQQ = ua.indexOf('qq') !== -1;
            const isMobile = /iphone|ipad|ipod|android/.test(ua);

            // 函数：显示外部浏览器打开提示
            function showExternalBrowserPrompt(apiMessage = '', isBlocked = false) {
                let instructionHTML = '';
                if (isBlocked) {
                    instructionHTML += `<h2>本网站已被拦截\n请在外部浏览器中打开</h2>`;
                    if (apiMessage) {
                        instructionHTML += `<p>原因：${apiMessage}</p>`; // 更明确地显示拦截原因
                    }
                } else {
                    instructionHTML += '<h2>请在外部浏览器中打开</h2>';
                    if (apiMessage) {
                        instructionHTML += `<p>检测结果：${apiMessage}</p>`;
                    }
                }
                
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
            }

            // 首先获取目标URL
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
                        const targetUrl = data.url;
                        const targetDomain = new URL(targetUrl).hostname;

                        // 判断是否需要进行API检测：在微信/QQ浏览器中，或者目标域名是强制检测域名
                        const shouldCheckApi = (isWeixin || isQQ) || 
                                               (FORCE_CHECK_DOMAIN && targetDomain.includes(FORCE_CHECK_DOMAIN));

                        if (shouldCheckApi) {
                            fetch(`${WECHAT_PROXY_API}?url=${encodeURIComponent(targetUrl)}`)
                                .then(response => response.json()) // 假设返回JSON
                                .then(apiData => {
                                    const apiMessage = apiData.data || '未知状态'; // 获取API返回的data信息
                                    // 根据用户提供的文档，reCode为0且data为"ok"表示被拦截
                                    if (apiData.reCode === 0 && apiData.data === "ok") {
                                        // 域名被封，显示外部浏览器提示，并带上API检测结果
                                        showExternalBrowserPrompt(apiMessage, true); // 传入true表示被拦截
                                    } else {
                                        // 域名正常，或者API返回其他状态（如-202, -203），直接重定向
                                        window.location.href = targetUrl;
                                    }
                                })
                                .catch(apiError => {
                                    console.error('WeChat Proxy API check error:', apiError);
                                    // API调用失败，为了安全起见，显示提示
                                    showExternalBrowserPrompt('API检测失败，请尝试在外部浏览器打开。', false); // API失败，不确定是否拦截
                                });
                        } else {
                            // 不需要检查API，直接重定向
                            window.location.href = targetUrl;
                        }
                    } else {
                        throw new Error('从服务器返回的数据格式无效。');
                    }
                })
                .catch(error => {
                    console.error('Redirect error:', error);
                    document.getElementById('tips').innerHTML = `<h2>跳转失败</h2><p>${error.message}</p>`;
                });
        }
        // If no 'id', the script does nothing and the rest of the page loads normally.
    });
})();
