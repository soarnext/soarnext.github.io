import { build_url } from './build_url.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector("#signup-form");

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        build_url();
    });

    const alertModal = document.getElementById("alert-modal");
    const alertOkBtn = document.getElementById("alert-ok-btn");

    alertModal.addEventListener("click", function (e) {
        if (e.target === alertModal) {
            alertModal.style.display = "none";
        }
    });

    alertOkBtn.addEventListener("click", function () {
        alertModal.style.display = "none";
    });

    console.log(`%c本站由 %c翛Soar%c 制作`, 
        'color: #2196F3; font-size: 14px;', // Style for "本站由 "
        'color: #FF5722; font-size: 14px; font-weight: bold; text-decoration: underline; cursor: pointer;', // Style for "翛Soar"
        'color: #2196F3; font-size: 14px;' // Style for " 制作"
    );
    console.log(`%c作者主页: %chttps://xsoar.cfd`, 
        'color: #607D8B; font-size: 12px;', // Style for "作者主页: "
        'color: #00BCD4; font-size: 12px; text-decoration: underline; cursor: pointer;' // Style for URL
    );
    console.log(`%c项目链接: %chttps://github.com/xiaosoar/lianjie`, 
        'color: #607D8B; font-size: 12px;', // Style for "项目链接: "
        'color: #00BCD4; font-size: 12px; text-decoration: underline; cursor: pointer;' // Style for URL
    );
});
