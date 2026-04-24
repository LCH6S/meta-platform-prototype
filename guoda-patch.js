(() => {
  const LOGO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 323 77" role="img" aria-label="国大药房 Guo Da Drugstore">
      <rect width="323" height="77" fill="white" fill-opacity="0"/>
      <g transform="translate(8 12)">
        <path d="M7 4c18 2 31 9 43 20C40 37 28 46 8 53 5 37 4 19 7 4Z" fill="#57af3b"/>
        <path d="M8 17c18 5 30 12 39 22-10 6-22 10-37 12C8 39 7 28 8 17Z" fill="#28a9df" opacity=".9"/>
        <path d="M5 33c15 8 29 12 45 11-9 8-22 13-42 13C6 49 5 41 5 33Z" fill="#29599f"/>
        <text x="0" y="67" font-family="Arial, sans-serif" font-size="9" font-weight="700" fill="#25508f">SINOPHARM</text>
      </g>
      <text x="88" y="39" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="34" font-weight="700" fill="#5bae3f">国大药房</text>
      <text x="90" y="62" font-family="Georgia, 'Times New Roman', serif" font-size="20" font-weight="700" fill="#63ad42">Guo Da Drugstore</text>
    </svg>`}`;
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
