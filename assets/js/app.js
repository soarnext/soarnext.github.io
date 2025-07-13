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
});
