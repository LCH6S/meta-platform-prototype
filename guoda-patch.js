(() => {
  const LOGO = "data:image/png;base64,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";
  const CUSTOMER_NAME = "国大药房";
  const CUSTOMER_CODE = "160247730728";

  function setLogo(img) {
    if (!img) return;
    img.src = LOGO;
    img.alt = CUSTOMER_NAME;
    img.style.width = "240px";
    img.style.maxHeight = "72px";
    img.style.objectFit = "contain";
  }

  function applyGuodaPatch() {
    const app = document.querySelector("#app");
    if (!app) return;

    app.querySelectorAll(".customer-brand-badge").forEach((badge) => {
      badge.innerHTML = `<img src="${LOGO}" alt="${CUSTOMER_NAME}" />`;
      Object.assign(badge.style, { width: "240px", height: "72px", minWidth: "0", padding: "0", background: "transparent" });
      const img = badge.querySelector("img");
      Object.assign(img.style, { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" });
    });

    app.querySelectorAll(".customer-entry-name, .tenant-name").forEach((el) => { el.textContent = CUSTOMER_NAME; });
    app.querySelectorAll(".customer-entry-code").forEach((el) => { el.textContent = `客户编号：${CUSTOMER_CODE}`; });
    app.querySelectorAll(".tenant-meta").forEach((el) => { el.textContent = `集团编号：${CUSTOMER_CODE}`; });

    const beizanForm = app.querySelector('form[data-action="beizan-login"]');
    if (beizanForm) {
      setLogo(app.querySelector(".brand-block .brand-logo.login-logo"));
      const title = app.querySelector(".login-title");
      if (title) title.textContent = "欢迎登录品牌服务平台";
      beizanForm.querySelector(".login-links")?.remove();
    }
  }

  const observer = new MutationObserver(applyGuodaPatch);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  applyGuodaPatch();
})();
