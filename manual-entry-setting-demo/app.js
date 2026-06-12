const app = document.querySelector("#app");

const state = {
  modalOpen: false,
  toast: "",
  storeManualEntryPolicy: "same",
  draftPolicy: "same",
  brandManualEntry: {
    enabled: false,
    passwordRequired: true,
    mode: "录入订单信息",
    fields: ["订单号", "商品名称", "手机号"],
  },
};

const policyText = {
  same: "同品牌",
  enabled: "开启",
  disabled: "关闭",
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function brandStatusText() {
  return state.brandManualEntry.enabled ? "开启" : "关闭";
}

function effectiveEnabled(policy = state.storeManualEntryPolicy) {
  if (policy === "enabled") return true;
  if (policy === "disabled") return false;
  return state.brandManualEntry.enabled;
}

function effectiveText(policy = state.storeManualEntryPolicy) {
  return effectiveEnabled(policy) ? "开启" : "关闭";
}

function statusPillClass(text) {
  return text === "开启" ? "success" : "danger";
}

function icon(type) {
  const icons = {
    calendar: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="4" y="5" width="16" height="15" rx="1.5"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3M13 14h3"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M12 3 19 6v5c0 4.6-2.9 7.6-7 9-4.1-1.4-7-4.4-7-9V6l7-3Z"/><circle cx="12" cy="12" r="2.5"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="5" y="10" width="14" height="10" rx="1.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>`,
    manual: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M5 4h10l4 4v12H5V4Z"/><path d="M14 4v5h5M8 13h8M8 17h5"/></svg>`,
  };
  return icons[type] || icons.manual;
}

function renderTopbar() {
  const navItems = ["首页", "电子发票", "电子小票", "支付业务", "门店收银", "管理功能"];
  return `
    <header class="topbar">
      <img class="topbar-logo" src="../assets/shouqianba-yellow.png" alt="收钱吧" />
      <nav class="topnav" aria-label="一级导航">
        ${navItems.map((item) => `<button class="topnav-item ${item === "支付业务" ? "active" : ""}" type="button">${item}</button>`).join("")}
      </nav>
      <div class="topbar-spacer"></div>
      <div class="topbar-actions" aria-label="工具栏">
        <span class="top-icon" aria-hidden="true">⇧</span>
        <span class="top-icon" aria-hidden="true">♙</span>
        <span class="top-icon" aria-hidden="true">◔</span>
        <span class="divider" aria-hidden="true"></span>
        <span class="user-name">♙ admin</span>
        <span class="top-icon" aria-hidden="true">文</span>
      </div>
    </header>`;
}

function renderSidebar() {
  return `
    <aside class="sidebar">
      <button class="side-item" type="button">销售类订单 <span>⌄</span></button>
      <button class="side-item" type="button">退款规则</button>
      <button class="side-item" type="button">分期活动管理</button>
      <div class="side-group">
        <button class="side-main" type="button">门店POS管理 <span>⌃</span></button>
        <button class="side-child" type="button">- POS设备列表</button>
        <button class="side-child active" type="button">- POS功能设置</button>
      </div>
    </aside>`;
}

function renderInfoCard() {
  return `
    <section class="info-card">
      <h2 class="section-title">基本信息</h2>
      <div class="dashed-line"></div>
      <div class="store-grid">
        <div>
          <span class="info-label">门店名称</span>
          <div class="info-value">litepos</div>
        </div>
        <div>
          <span class="info-label">门店号</span>
          <div class="info-value">KAGroup店</div>
        </div>
        <div>
          <span class="info-label">门店ID</span>
          <div class="info-value">161247766776</div>
        </div>
      </div>
    </section>`;
}

function renderSettingRow(item) {
  return `
    <article class="setting-row">
      <div class="setting-icon" aria-hidden="true">${icon(item.icon)}</div>
      <div>
        <h3 class="setting-title">${escapeHtml(item.title)}</h3>
        <p class="setting-desc">${escapeHtml(item.desc)}</p>
      </div>
      <div class="row-actions">
        ${item.status ? `<span class="state-text ${item.status === "已开启" ? "on" : "off"}">${escapeHtml(item.status)}</span>` : ""}
        <button class="outline-btn" type="button" data-action="${escapeHtml(item.action)}">修改</button>
      </div>
    </article>`;
}

function renderSettings() {
  const rows = [
    {
      icon: "calendar",
      title: "可退时间范围",
      desc: "控制POS机首页上退款入口，可退订单的时间范围（可退任意时间完成的订单）",
      action: "noop",
    },
    {
      icon: "shield",
      title: "退款密码设置",
      desc: "在POS上发起退款时，需输入的门店POS的退款密码",
      action: "noop",
    },
    {
      icon: "lock",
      title: "管理密码设置",
      desc: "在POS上进行重要操作时，需输入门店POS管理密码（如退出轻POS应用等）",
      action: "noop",
    },
    {
      icon: "manual",
      title: "手动录入设置",
      desc: "控制轻POS应用是否允许该门店使用手动录入收款",
      status: `已${effectiveText()}`,
      action: "open-manual-modal",
    },
  ];

  return `
    <section class="settings-card">
      <div class="setting-list">
        ${rows.map(renderSettingRow).join("")}
      </div>
    </section>`;
}

function renderManualModal() {
  if (!state.modalOpen) return "";
  const options = [
    ["same", "同品牌", `由品牌统一控制，当前品牌设置为：${brandStatusText()}`],
    ["enabled", "开启", "该门店单独开启手动录入"],
    ["disabled", "关闭", "该门店单独关闭手动录入"],
  ];

  return `
    <div class="mask" data-action="modal-mask">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="manual-modal-title">
        <div class="modal-header">
          <h2 class="modal-title" id="manual-modal-title">修改手动录入设置</h2>
          <button class="close-btn" type="button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <div class="modal-body">
          <p class="field-title">手动录入设置</p>
          <div class="radio-list">
            ${options
              .map(
                ([value, label, hint]) => `
                  <label class="radio-row">
                    <input type="radio" name="manualEntryPolicy" value="${value}" ${state.draftPolicy === value ? "checked" : ""} />
                    <span class="radio-text">
                      <span>${label}</span>
                      <span class="radio-hint">${hint}</span>
                    </span>
                  </label>`,
              )
              .join("")}
          </div>
        </div>
        <div class="modal-footer">
          <button class="footer-btn" type="button" data-action="close-modal">取消</button>
          <button class="footer-btn primary" type="button" data-action="confirm-manual-policy">确认</button>
        </div>
      </section>
    </div>`;
}

function renderToast() {
  if (!state.toast) return "";
  return `<div class="toast">${escapeHtml(state.toast)}</div>`;
}

function render() {
  app.innerHTML = `
    <div class="app">
      ${renderTopbar()}
      <div class="layout">
        ${renderSidebar()}
        <main class="page">
          <nav class="breadcrumb" aria-label="面包屑">
            <span>⌂</span><span>/</span><span>门店POS管理</span><span>/</span><strong>门店详情</strong>
          </nav>
          ${renderInfoCard()}
          ${renderSettings()}
        </main>
      </div>
    </div>
    ${renderManualModal()}
    ${renderToast()}`;
}

function showToast(message) {
  state.toast = message;
  render();
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    state.toast = "";
    render();
  }, 1800);
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  if (action === "open-manual-modal") {
    state.draftPolicy = state.storeManualEntryPolicy;
    state.modalOpen = true;
    render();
    return;
  }

  if (action === "close-modal") {
    state.modalOpen = false;
    render();
    return;
  }

  if (action === "modal-mask" && event.target === target) {
    state.modalOpen = false;
    render();
    return;
  }

  if (action === "confirm-manual-policy") {
    state.storeManualEntryPolicy = state.draftPolicy;
    state.modalOpen = false;
    showToast(`手动录入设置已保存为：${policyText[state.storeManualEntryPolicy]}`);
  }
});

app.addEventListener("change", (event) => {
  if (event.target.name !== "manualEntryPolicy") return;
  state.draftPolicy = event.target.value;
  render();
});

render();
