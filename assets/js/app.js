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

    widget.addEventListener("solve", function (e) {
        window.capToken = e.detail.token;
        modal.style.display = "none";
        document.getElementById('main-container').classList.remove('no-blur');
        build_url(window.capToken);
    });

    widget.addEventListener("reset", function () {
        window.capToken = null;
    });

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (window.capToken) {
            build_url(window.capToken);
        } else {
            modal.style.display = "flex";
            document.getElementById('main-container').classList.add('no-blur');
        }
    });

    const alertModal = document.getElementById("alert-modal");

    modal.addEventListener("click", function (e) {
        if (e.target === modal) {
            modal.style.display = "none";
            document.getElementById('main-container').classList.remove('no-blur');
            const resultElement = document.getElementById('b_url');
            resultElement.innerHTML = `<span style="color: #ff4d4f;">请先完成人机验证。</span>`;
        }
    });

    const alertOkBtn = document.getElementById("alert-ok-btn");

    alertModal.addEventListener("click", function (e) {
        if (e.target === alertModal) {
            alertModal.style.display = "none";
        }
    });

    alertOkBtn.addEventListener("click", function () {
        alertModal.style.display = "none";
    });
});
