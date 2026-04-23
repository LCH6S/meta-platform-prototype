const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");
const toastRoot = document.querySelector("#toast-root");

const state = {
  loggedIn: false,
  username: "liu",
  activeMain: "首页",
  activePage: "首页",
  userMenuOpen: false,
  sidebarScrollTop: 0,
  sidebarCollapsed: {},
  expandedStoreSummaryDates: {},
  expandedSalesReportRows: {},
  expandedReconcileRows: {},
  quickCashierOrder: null,
  insuranceCart: [],
  insuranceOrder: null,
  refundApplyOrderNo: "",
  detailOrderNo: "",
  detailRefundId: "",
  detailBackMain: "交易管理",
  detailBackPage: "订单查询",
};

const menus = [
  { name: "首页", children: [] },
  { name: "收银管理", children: ["快速收款", "保险卡收款"] },
  { name: "交易管理", children: ["订单查询", "门店交易汇总查询", "集团销售报表", "按日销售报表", "门店销售报表", "商户对账报表"] },
  { name: "退款管理", children: ["退款申请", "退款查询", "退款复核"] },
  { name: "安全设置", children: ["个人密码修改"] },
];

const orders = [
  {
    seq: 1,
    merchantNo: "EQB2900200021",
    merchant: "博悠",
    storeNo: "LPK001",
    store: "月头礼品卡",
    area: "上海片区",
    time: "2026-04-21 11:41:36",
    orderNo: "7903247986975174",
    platformNo: "S6360399",
    amount: 0.1,
    type: "收款",
    status: "支付成功",
    payWay: "银联刷卡h",
    success: true,
    refundable: 0.1,
    products: [{ code: "-", name: "复方维生素片", approval: "国药准字H20201234", category: "OTC", spec: "30片/盒", unit: "盒", price: 0.1, qty: 1 }],
    payDetail: { channelFlow: "7903247986975174", channelOrder: "无" },
  },
  {
    seq: 2,
    merchantNo: "EQB2900200021",
    merchant: "博悠",
    storeNo: "LPK001",
    store: "月头礼品卡",
    area: "上海片区",
    time: "2026-04-21 10:03:40",
    orderNo: "7903247986920027",
    platformNo: "S6344242",
    amount: -1,
    type: "退款",
    status: "退款成功",
    payWay: "银联刷卡h",
    success: true,
    refundable: 0,
    products: [{ code: "YP001", name: "感冒灵颗粒", approval: "国药准字Z44021940", category: "OTC", spec: "10g*9袋", unit: "盒", price: 1, qty: 1 }],
    payDetail: { channelFlow: "7903247986920027", channelOrder: "R20260421100340" },
  },
  {
    seq: 3,
    merchantNo: "EQB2900200021",
    merchant: "博悠",
    storeNo: "LPK001",
    store: "月头礼品卡",
    area: "上海片区",
    time: "2026-04-21 10:01:58",
    orderNo: "7903247986919220",
    platformNo: "S6344069",
    amount: 1,
    type: "收款",
    status: "支付成功",
    payWay: "银联刷卡h",
    success: true,
    refundable: 0,
    products: [{ code: "YP003", name: "医用退热贴", approval: "-", category: "器械", spec: "4贴/盒", unit: "盒", price: 1, qty: 1 }],
    payDetail: { channelFlow: "7903247986919220", channelOrder: "无" },
  },
  {
    seq: 4,
    merchantNo: "EQB2900200021",
    merchant: "博悠",
    storeNo: "LPK001",
    store: "月头礼品卡",
    area: "上海片区",
    time: "2026-04-20 15:39:22",
    orderNo: "7903247986686896",
    platformNo: "S6218377",
    amount: -0.1,
    type: "退款",
    status: "退款成功",
    payWay: "银联刷卡h",
    success: true,
    refundable: 0,
    products: [{ code: "YP004", name: "葡萄糖酸钙口服液", approval: "国药准字H33021939", category: "OTC", spec: "10ml*12支", unit: "盒", price: 0.1, qty: 1 }],
    payDetail: { channelFlow: "7903247986686896", channelOrder: "R20260420153922" },
  },
  {
    seq: 5,
    merchantNo: "EQB2900200021",
    merchant: "博悠",
    storeNo: "LPK001",
    store: "月头礼品卡",
    area: "上海片区",
    time: "2026-04-20 15:38:16",
    orderNo: "790324798666681",
    platformNo: "S6218209",
    amount: 0.1,
    type: "收款",
    status: "支付成功",
    payWay: "银联刷卡h",
    success: true,
    refundable: 0,
    products: [{ code: "YP005", name: "维C银翘片", approval: "国药准字Z44020320", category: "OTC", spec: "24片", unit: "盒", price: 0.1, qty: 1 }],
    payDetail: { channelFlow: "790324798666681", channelOrder: "无" },
  },
  {
    seq: 6,
    merchantNo: "EQB2900200021",
    merchant: "博悠",
    storeNo: "LPK002",
    store: "康宁路药房",
    area: "上海片区",
    time: "2026-04-16 17:08:33",
    orderNo: "790324799616123",
    platformNo: "S6500914",
    amount: 0.1,
    type: "收款",
    status: "支付成功",
    payWay: "医保电子凭证",
    success: true,
    refundable: 0.1,
    products: [{ code: "YP006", name: "阿莫西林胶囊", approval: "国药准字H34023089", category: "处方药", spec: "0.25g*24粒", unit: "盒", price: 0.1, qty: 1 }],
    payDetail: { channelFlow: "790324799616123", channelOrder: "无" },
  },
  {
    seq: 7,
    merchantNo: "EQB2900200021",
    merchant: "博悠",
    storeNo: "LPK003",
    store: "长宁医保店",
    area: "上海片区",
    time: "2026-04-10 11:28:05",
    orderNo: "7903247987889032",
    platformNo: "S6377954",
    amount: -1,
    type: "退款",
    status: "退款成功",
    payWay: "医保电子凭证",
    success: true,
    refundable: 0,
    products: [{ code: "YP007", name: "布洛芬缓释胶囊", approval: "国药准字H10900089", category: "OTC", spec: "0.3g*20粒", unit: "盒", price: 1, qty: 1 }],
    payDetail: { channelFlow: "7903247987889032", channelOrder: "R20260410112805" },
  },
  {
    seq: 8,
    merchantNo: "EQB2900200021",
    merchant: "博悠",
    storeNo: "LPK003",
    store: "长宁医保店",
    area: "上海片区",
    time: "2026-04-10 11:26:21",
    orderNo: "790324798788660",
    platformNo: "S6377741",
    amount: 1,
    type: "收款",
    status: "支付成功",
    payWay: "支付宝",
    success: true,
    refundable: 0,
    products: [{ code: "YP008", name: "盐酸西替利嗪片", approval: "国药准字H20000379", category: "OTC", spec: "10mg*12片", unit: "盒", price: 1, qty: 1 }],
    payDetail: { channelFlow: "790324798788660", channelOrder: "无" },
  },
  {
    seq: 9,
    merchantNo: "EQB2900200021",
    merchant: "博悠",
    storeNo: "LPK004",
    store: "和平测试",
    area: "华东片区",
    time: "2026-04-03 16:59:11",
    orderNo: "790324798367411",
    platformNo: "S6220426",
    amount: -0.1,
    type: "退款",
    status: "退款成功",
    payWay: "微信支付",
    success: true,
    refundable: 0,
    products: [{ code: "YP009", name: "医用口罩", approval: "-", category: "器械", spec: "10只/包", unit: "包", price: 0.1, qty: 1 }],
    payDetail: { channelFlow: "790324798367411", channelOrder: "R20260403165911" },
  },
  {
    seq: 10,
    merchantNo: "EQB2900200021",
    merchant: "博悠",
    storeNo: "LPK004",
    store: "和平测试",
    area: "华东片区",
    time: "2026-04-03 16:57:27",
    orderNo: "790324798367032",
    platformNo: "S6220068",
    amount: 0.1,
    type: "收款",
    status: "支付成功",
    payWay: "微信支付",
    success: true,
    refundable: 0,
    products: [{ code: "YP010", name: "板蓝根颗粒", approval: "国药准字Z44023485", category: "OTC", spec: "10g*20袋", unit: "包", price: 0.1, qty: 1 }],
    payDetail: { channelFlow: "790324798367032", channelOrder: "无" },
  },
];

let refunds = [
  { id: "RF20260421001", merchantNo: "EQB2900200021", merchant: "博悠", store: "月头礼品卡", orderNo: "7903247986920027", orderDate: "2026-04-21", platformNo: "S6344242", platformDate: "2026-04-21", amount: 1, status: "退款成功", way: "人工审核退款", applyTime: "2026-04-21 10:03:47", applicant: "liu", reason: "顾客申请退款", products: "感冒灵颗粒" },
  { id: "RF20260420001", merchantNo: "EQB2900200021", merchant: "博悠", store: "月头礼品卡", orderNo: "7903247986686896", orderDate: "2026-04-20", platformNo: "S6218377", platformDate: "2026-04-20", amount: 0.1, status: "退款成功", way: "人工审核退款", applyTime: "2026-04-20 15:39:29", applicant: "liu", reason: "顾客申请退款", products: "葡萄糖酸钙口服液" },
  { id: "RF20260416001", merchantNo: "EQB2900200021", merchant: "博悠", store: "康宁路药房", orderNo: "790324799616123", orderDate: "2026-04-16", platformNo: "S6500914", platformDate: "2026-04-16", amount: 0.1, status: "退款申请成功（审核中）", way: "人工审核退款", applyTime: "2026-04-22 09:10:12", applicant: "liuliu", reason: "顾客申请退款", products: "阿莫西林胶囊" },
  { id: "RF20260403001", merchantNo: "EQB2900200021", merchant: "博悠", store: "和平测试", orderNo: "790324798367032", orderDate: "2026-04-03", platformNo: "S6220068", platformDate: "2026-04-03", amount: 0.1, status: "退款申请成功（审核中）", way: "人工审核退款", applyTime: "2026-04-22 09:18:43", applicant: "liuliu", reason: "顾客申请退款", products: "板蓝根颗粒" },
];

let operators = [
  { id: "U001", store: "月头礼品卡", name: "liu", phone: "15201711909", status: "启用", createdAt: "2025-12-18 10:21", remark: "商户管理员" },
  { id: "U002", store: "康宁路药房", name: "zhangyu", phone: "19821852272", status: "启用", createdAt: "2026-01-02 09:36", remark: "店长" },
  { id: "U003", store: "长宁医保店", name: "jaysun", phone: "18317609393", status: "停用", createdAt: "2026-02-11 14:22", remark: "离职" },
];

let roles = [
  { id: "R001", name: "商户管理员", users: 2, desc: "拥有全部菜单和用户管理权限", status: "启用" },
  { id: "R002", name: "门店店长", users: 8, desc: "可查看门店交易、发起退款、查看报表", status: "启用" },
  { id: "R003", name: "财务对账", users: 3, desc: "可查看销售报表和对账报表", status: "启用" },
  { id: "R004", name: "退款复核员", users: 1, desc: "可处理人工审核退款", status: "启用" },
];

const insuranceProducts = [
  { code: "100403", name: "二甲硅油片(消胀片)", spec: "25mg*100片", price: 11, approval: "国药准字H31020964", category: "OTC", unit: "盒" },
  { code: "100676", name: "有机原味豆浆粉", spec: "300克", price: 11, approval: "-", category: "食品", unit: "袋" },
  { code: "100055", name: "酒神金樽", spec: "380毫克*20粒", price: 11, approval: "国食健字G20110421", category: "保健品", unit: "盒" },
  { code: "100738", name: "小儿氨酚黄那敏颗粒", spec: "3克*12袋", price: 11, approval: "国药准字H33022118", category: "OTC", unit: "盒" },
  { code: "100766", name: "盐酸左氧氟沙星胶囊", spec: "0.1g*12粒", price: 11, approval: "国药准字H20058234", category: "处方药", unit: "盒" },
  { code: "100924", name: "中华跌打丸", spec: "6g*6丸", price: 11, approval: "国药准字Z44020768", category: "OTC", unit: "盒" },
  { code: "101182", name: "洁热解毒口服液", spec: "10支*10毫升", price: 11, approval: "国药准字Z20010187", category: "OTC", unit: "盒" },
];

function yuan(value) {
  return Number(value).toFixed(2);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getStatusClass(value) {
  const text = String(value);
  if (text.includes("失败") || value === "停用") return "danger";
  if (text.includes("审核中") || text.includes("退款中") || text.includes("待")) return "warning";
  if (text.includes("成功") || value === "启用" || value === "正常") return "success";
  return "";
}

function toast(message, type = "") {
  toastRoot.innerHTML = `<div class="toast ${type}">${escapeHtml(message)}</div>`;
  window.setTimeout(() => {
    toastRoot.innerHTML = "";
  }, 2600);
}

function openModal(title, body, footer = "") {
  modalRoot.innerHTML = `
    <div class="modal-mask" data-close-modal>
      <div class="modal ${footer.includes("small-modal") ? "small-modal" : ""}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="close-btn" data-close-modal>×</button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ""}
      </div>
    </div>`;
  window.setTimeout(() => {
    modalRoot.querySelector(".modal-body input:not([disabled]), .modal-body select:not([disabled]), .modal-body textarea:not([disabled])")?.focus();
  }, 0);
}

function closeModal() {
  modalRoot.innerHTML = "";
}

function clearFieldErrors(root = document) {
  root.querySelectorAll(".field.error").forEach((field) => field.classList.remove("error"));
  root.querySelectorAll(".form-control[aria-invalid='true']").forEach((control) => control.removeAttribute("aria-invalid"));
  root.querySelectorAll(".field-error").forEach((item) => item.remove());
}

function showFieldError(selector, message, root = document) {
  const control = root.querySelector(selector);
  if (!control) return;
  const field = control.closest(".field");
  if (!field) return;
  field.classList.add("error");
  control.setAttribute("aria-invalid", "true");
  const error = document.createElement("div");
  error.className = "field-error";
  error.textContent = message;
  field.append(error);
}

function focusFirstError(root = document) {
  root.querySelector(".form-control[aria-invalid='true']")?.focus();
}

function fieldValue(selector, root = document) {
  return root.querySelector(selector)?.value.trim() || "";
}

function render(options = {}) {
  const preserveContentScroll = !!options.preserveContentScroll;
  const currentSidebar = app.querySelector(".sidebar");
  const currentContent = app.querySelector(".content-wrap");
  const contentScrollTop = preserveContentScroll && currentContent ? currentContent.scrollTop : 0;
  if (currentSidebar) state.sidebarScrollTop = currentSidebar.scrollTop;
  app.innerHTML = state.loggedIn ? renderApp() : renderLogin();
  bindEvents();
  const nextSidebar = app.querySelector(".sidebar");
  const nextContent = app.querySelector(".content-wrap");
  if (nextSidebar) nextSidebar.scrollTop = state.sidebarScrollTop;
  if (preserveContentScroll && nextContent) nextContent.scrollTop = contentScrollTop;
}

function renderLogin() {
  return `
    <main class="login-page">
      <section class="login-card">
        <div class="brand-block">
          <img class="brand-logo login-logo" src="./assets/shouqianba-standard.png" alt="收钱吧" />
        </div>
        <h1 class="login-title">欢迎登录医药品牌服务平台</h1>
        <form class="login-form" data-action="login">
          <input name="account" value="liu" placeholder="请输入账号" />
          <input name="password" value="123456" type="password" placeholder="请输入密码" />
          <button class="btn primary" style="height:54px;font-size:16px" type="submit">登录</button>
        </form>
      </section>
    </main>`;
}

function renderApp() {
  const current = pageTitle();
  const sectioned = isSectionedPage(current);
  return `
    <div class="app">
      <header class="topbar">
        <div class="topbar-left">
          <img class="brand-logo topbar-logo" src="./assets/shouqianba-yellow.png" alt="收钱吧" />
        </div>
        <div class="topbar-right">
          <button class="user-trigger" data-action="toggle-user">${escapeHtml(state.username)}</button>
          ${state.userMenuOpen ? `<div class="user-popover"><button data-action="logout">退出登录</button></div>` : ""}
        </div>
      </header>
      <div class="main-shell">
        <aside class="sidebar">${renderSidebar()}</aside>
        <main class="content-wrap">
          ${renderBreadcrumb()}
          <section class="page-card ${sectioned ? "sectioned-card" : ""} ${current === "首页" ? "home-card" : ""}">
            ${current === "首页" ? "" : `<h2 class="page-title">${escapeHtml(current)}</h2>`}
            ${renderPage()}
          </section>
        </main>
      </div>
    </div>`;
}

function isSectionedPage(page) {
  return ["门店交易汇总查询", "集团销售报表", "按日销售报表", "门店销售报表", "商户对账报表"].includes(page);
}

function renderSidebar() {
  return menus
    .map((menu) => {
      const active = state.activeMain === menu.name;
      if (!menu.children.length) {
        return `
          <div class="side-section">
            <button class="side-main ${active ? "active" : ""}" data-nav-main="${menu.name}" data-page="${menu.name}" ${active ? 'aria-current="page"' : ""}>${menu.name}</button>
          </div>`;
      }
      const collapsed = !!state.sidebarCollapsed[menu.name];
      return `
        <div class="side-section">
          <button class="side-main ${active ? "open" : ""}" data-action="side-main" data-nav-main="${menu.name}" aria-expanded="${!collapsed}">
            <span>${menu.name}</span>
            <span class="side-caret ${collapsed ? "collapsed" : ""}">⌃</span>
          </button>
          <div class="side-children ${collapsed ? "collapsed" : ""}">
            ${menu.children.map((child) => `<button class="side-child ${state.activePage === child ? "active" : ""}" data-nav-main="${menu.name}" data-page="${child}" ${state.activePage === child ? 'aria-current="page"' : ""}>${child}</button>`).join("")}
          </div>
        </div>`;
    })
    .join("");
}

function renderBreadcrumb() {
  if (state.activePage !== "订单详情") return "";
  const items = [
    { label: "首页", main: "首页", page: "首页" },
    { label: state.detailBackMain || state.activeMain },
    { label: state.detailBackPage || "订单查询", main: state.detailBackMain || state.activeMain, page: state.detailBackPage || "订单查询" },
    { label: "订单详情", current: true },
  ].filter((item, index, list) => item.label && (index === 0 || item.label !== list[index - 1].label));
  return `
    <nav class="breadcrumb" aria-label="面包屑">
      ${items
        .map((item, index) => {
          const separator = index ? `<span class="breadcrumb-separator">/</span>` : "";
          if (item.current || !item.page) return `${separator}<strong>${escapeHtml(item.label)}</strong>`;
          return `${separator}<button class="breadcrumb-link" data-breadcrumb-main="${escapeHtml(item.main)}" data-breadcrumb-page="${escapeHtml(item.page)}">${escapeHtml(item.label)}</button>`;
        })
        .join("")}
    </nav>`;
}

function pageTitle() {
  return state.activePage;
}

function renderPage() {
  const page = state.activePage;
  const map = {
    首页: renderHome,
    快速收款: renderQuickCashier,
    保险卡收款: renderInsuranceCardCashier,
    订单查询: renderOrderSearch,
    订单详情: renderOrderDetail,
    门店交易汇总查询: renderStoreSummary,
    退款申请: renderRefundApply,
    退款查询: renderRefundSearch,
    退款复核: renderRefundReview,
    集团销售报表: () => renderSalesReport("group"),
    按日销售报表: () => renderSalesReport("daily"),
    门店销售报表: () => renderSalesReport("store"),
    商户对账报表: renderMerchantReconcile,
    操作员管理: renderOperatorManage,
    角色管理: renderRoleManage,
    个人密码修改: renderPassword,
  };
  return (map[page] || renderHome)();
}

function renderHome() {
  return `
    <div class="home-page">
      <section class="home-overview" aria-label="首页概览">
        <div class="home-head">
          <div>
            <div class="home-kicker">医药品牌服务平台</div>
            <h2 class="welcome-title">欢迎回来，${escapeHtml(state.username)}</h2>
          </div>
        </div>
        <div class="home-scope">
          <div class="home-section-title">所属组织</div>
          <div class="scope-grid">
            <div class="scope-item"><div class="label">所属商户</div><div class="value">博悠</div></div>
            <div class="scope-item"><div class="label">所属分支机构</div><div class="value">华东事业部</div></div>
            <div class="scope-item"><div class="label">所属片区</div><div class="value">上海片区</div></div>
            <div class="scope-item"><div class="label">所属门店</div><div class="value">月头礼品卡</div></div>
          </div>
        </div>
      </section>
    </div>`;
}

function renderFilter(fields, actions = true, cols = 4) {
  return `
    <div class="filter-panel">
      <div class="filter-grid ${cols === 3 ? "cols-3" : ""}">
        ${fields
          .map((field) => {
            if (field.type === "checkbox") {
              return `<div class="field inline"><input id="${field.id}" type="checkbox" ${field.checked ? "checked" : ""} /><label for="${field.id}">${field.label}</label></div>`;
            }
            if (field.type === "select") {
              return `<div class="field"><label>${field.label}</label><select class="form-control">${field.options.map((option) => `<option>${option}</option>`).join("")}</select></div>`;
            }
            if (field.type === "dateRange") {
              return `<div class="field"><label>${field.label}</label><input class="form-control date-range-control" value="${field.value || ""}" placeholder="${field.placeholder || "请选择日期范围"}" /></div>`;
            }
            return `<div class="field"><label>${field.label}</label><input class="form-control" value="${field.value || ""}" placeholder="${field.placeholder || ""}" /></div>`;
          })
          .join("")}
        ${actions ? `<div class="actions"><button class="btn text" data-action="reset-filter">重置</button><button class="btn primary" data-action="query">查询</button></div>` : ""}
      </div>
    </div>`;
}

function renderTable(columns, rows, options = {}) {
  const total = options.total || rows.length;
  const summary = options.summary || "";
  const rowKey = options.rowKey;
  return `
    <div class="table-wrap">
      <table class="data-table ${options.className || ""}">
        <thead>
          <tr>${columns.map((col) => `<th class="${columnClass(col)}">${col.title}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${
            rows.length
              ? rows
                  .map((row, index) => `<tr data-row-key="${escapeHtml(resolveRowKey(row, index, rowKey))}">${columns.map((col) => `<td class="${columnClass(col)}">${renderCell(col, row, index)}</td>`).join("")}</tr>`)
                  .join("")
              : `<tr><td colspan="${columns.length}"><div class="empty">查询结果集为空</div></td></tr>`
          }
        </tbody>
      </table>
    </div>
    <div class="summary-bar">
      <div>共<b>${total}</b>条 ${summary}</div>
      <div class="pager"><button class="page-num active">1</button><button class="page-num">2</button><button class="btn small">下一页</button><span>10 条/页</span></div>
    </div>`;
}

function renderResultSection(title, content) {
  return `
    <section class="result-section">
      <h3 class="result-title">${escapeHtml(title)}</h3>
      ${content}
    </section>`;
}

function renderPlainTable(columns, rows, options = {}) {
  const rowKey = options.rowKey;
  return `
    <div class="table-wrap">
      <table class="data-table ${options.className || ""}">
        <thead>
          <tr>${columns.map((col) => `<th class="${columnClass(col)}">${col.title}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${
            rows.length
              ? rows
                  .map((row, index) => `<tr data-row-key="${escapeHtml(resolveRowKey(row, index, rowKey))}">${columns.map((col) => `<td class="${columnClass(col)}">${renderCell(col, row, index)}</td>`).join("")}</tr>`)
                  .join("")
              : `<tr><td colspan="${columns.length}"><div class="empty">查询结果集为空</div></td></tr>`
          }
        </tbody>
      </table>
    </div>`;
}

function renderReportResults(summaryColumns, summaryRow, detailColumns, detailRows, options = {}) {
  const summaryTitle = options.summaryTitle || "汇总结果";
  return `
    ${renderResultSection(summaryTitle, renderPlainTable(summaryColumns, [summaryRow], { className: "summary-result-table" }))}
    ${renderResultSection("明细结果", renderTable(detailColumns, detailRows, { total: options.total || detailRows.length, summary: options.summary || "" }))}`;
}

function renderCell(col, row, index) {
  if (col.render) return col.render(row, index);
  const value = row[col.key];
  if (col.status) return `<span class="status ${getStatusClass(value)}">${escapeHtml(value)}</span>`;
  if (col.amount) return `<span class="amount ${Number(value) < 0 ? "negative" : ""}">${yuan(value)}</span>`;
  if (col.ellipsis || ["orderNo", "platformNo", "channelFlow", "channelOrder", "payFlow"].includes(col.key)) {
    return `<span class="cell-text ellipsis" title="${escapeHtml(value)}">${escapeHtml(value)}</span>`;
  }
  return escapeHtml(value);
}

function columnClass(col) {
  return [
    col.amount || col.align === "right" ? "amount-cell" : "",
    col.action ? "action-cell" : "",
    col.ellipsis ? "ellipsis-cell" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function resolveRowKey(row, index, rowKey) {
  if (typeof rowKey === "function") return rowKey(row, index);
  if (typeof rowKey === "string") return row[rowKey] ?? index;
  return row.id ?? row.orderNo ?? row.reportKey ?? row.reconcileKey ?? row.date ?? row.seq ?? index;
}

function orderFilters() {
  return renderFilter([
    { label: "商户", type: "select", options: ["博悠", "澄一金融"] },
    { label: "片区", type: "select", options: ["全部", "上海片区", "华东片区"] },
    { label: "门店", placeholder: "请选择" },
    { label: "交易日期", type: "dateRange", value: "2026-04-01 至 2026-04-22" },
    { label: "交易单号", placeholder: "请输入交易单号" },
    { label: "渠道平台单号", placeholder: "请输入平台单号" },
    { label: "交易类型", type: "select", options: ["全部", "收款", "退款"] },
    { label: "支付方式", type: "select", options: ["全部", "银联刷卡h", "医保电子凭证", "支付宝", "微信支付"] },
    { label: "只看成功交易", id: "successOnly", type: "checkbox", checked: true },
  ]);
}

function orderColumns(showActions = true) {
  return [
    { title: "序号", key: "seq" },
    { title: "商户号", key: "merchantNo" },
    { title: "商户", key: "merchant" },
    { title: "门店号", key: "storeNo" },
    { title: "门店", key: "store" },
    { title: "时间", key: "time" },
    { title: "交易单号", key: "orderNo" },
    { title: "金额", key: "amount", amount: true },
    { title: "类型", key: "type" },
    { title: "状态", key: "status", status: true },
    { title: "支付方式", key: "payWay" },
    { title: "渠道平台单号", key: "platformNo" },
    ...(showActions
      ? [
          {
            title: "操作",
            action: true,
            render: (row) => `<button class="btn link" data-action="order-detail" data-order="${row.orderNo}">详情</button>`,
          },
        ]
      : []),
  ];
}

function renderOrderSearch() {
  const income = orders.filter((o) => o.amount > 0).reduce((sum, o) => sum + o.amount, 0);
  const refund = orders.filter((o) => o.amount < 0).reduce((sum, o) => sum + o.amount, 0);
  return `
    ${orderFilters()}
    <div class="toolbar"><span class="subtle">交易明细用于查单、核对状态、查看商品与支付通道信息。</span><button class="btn" data-action="download">导出订单</button><button class="icon-btn" data-action="query" aria-label="列设置" title="列设置">⚙</button></div>
    ${renderTable(orderColumns(true), orders, { total: 43, summary: `收款金额：<b>${yuan(income)}</b> 退款金额：<b class="amount negative">${yuan(refund)}</b>` })}`;
}

function renderQuickCashier() {
  const order = state.quickCashierOrder;
  if (!order) {
    return `
      <div class="quick-cashier-page">
        <section class="quick-cashier-panel">
          <div class="quick-cashier-head">
            <h3>收款信息</h3>
            <p>用于门店线下临时收款，提交后生成待支付订单。</p>
          </div>
          <form class="quick-cashier-form" data-action="quick-cashier">
            <div class="field quick-amount-field">
              <label>收款金额（元）</label>
              <input class="form-control" id="quickAmount" name="amount" inputmode="decimal" value="1.00" placeholder="请输入收款金额" />
            </div>
            <div class="field">
              <label>备注</label>
              <input class="form-control" id="quickRemark" name="remark" placeholder="添加备注信息，便于记忆订单" />
            </div>
            <div class="actions quick-cashier-actions">
              <button class="btn primary" type="submit">提交</button>
            </div>
          </form>
        </section>
      </div>`;
  }

  return `
    <div class="quick-cashier-page">
      <section class="quick-order-block">
        <h3 class="result-title">订单详情</h3>
        <div class="quick-order-summary">
          <div><span>单号</span><strong>${escapeHtml(order.orderNo)}</strong></div>
          <div><span>日期</span><strong>${escapeHtml(order.date)}</strong></div>
          <div><span>金额（元）</span><strong>${yuan(order.amount)}</strong></div>
          <div><span>状态</span><strong>${escapeHtml(order.status)}</strong></div>
        </div>
        <div class="quick-order-actions">
          ${
            order.status === "待支付"
              ? `<button class="btn primary" data-action="quick-cashier-pay">确认支付</button><button class="btn" data-action="reset-quick-cashier">返回</button>`
              : `<button class="btn primary" data-action="reset-quick-cashier">继续收款</button><button class="btn" data-action="quick-cashier-view-order">查看订单</button>`
          }
        </div>
      </section>
    </div>`;
}

function insuranceCartTotal() {
  return state.insuranceCart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
}

function renderInsuranceCardCashier() {
  const total = insuranceCartTotal();
  const order = state.insuranceOrder;
  const canSubmit = state.insuranceCart.length > 0 && order?.status !== "支付成功";
  const canPay = order?.status === "待支付";
  const cartRows = state.insuranceCart.map((item, index) => ({
    ...item,
    index: index + 1,
    amount: item.price * item.qty,
  }));
  return `
    <div class="insurance-cashier-page">
      <section class="insurance-search-panel">
        <form class="insurance-search-form" data-action="insurance-search">
          <input class="form-control" id="insuranceSearch" name="keyword" value="" placeholder="可输入商品号、名称、单价、拼音码等信息" />
          <button class="btn primary" type="submit">搜索</button>
        </form>
      </section>

      <section class="insurance-cart-panel">
        <div class="insurance-cart-table">
          ${renderPlainTable(
            [
              { title: "序号", key: "index" },
              { title: "名称", key: "name" },
              { title: "规格", key: "spec" },
              {
                title: "单价",
                key: "price",
                render: (row) => `<input class="form-control price-input" data-action="insurance-price" data-code="${row.code}" value="${yuan(row.price)}" inputmode="decimal" aria-label="${escapeHtml(row.name)}单价" />`,
              },
              {
                title: "数量",
                key: "qty",
                render: (row) => `
                  <div class="qty-control">
                    <button class="icon-btn" data-action="insurance-qty" data-code="${row.code}" data-step="-1" aria-label="减少">−</button>
                    <input class="form-control qty-input" value="${row.qty}" readonly />
                    <button class="icon-btn add" data-action="insurance-qty" data-code="${row.code}" data-step="1" aria-label="增加">+</button>
                  </div>`,
              },
              { title: "小计", key: "amount", amount: true },
              { title: "操作", action: true, render: (row) => `<button class="btn link link-danger" data-action="insurance-remove" data-code="${row.code}">删除</button>` },
            ],
            cartRows,
            { className: "insurance-table" }
          )}
        </div>
        <div class="insurance-submit-row">
          <span>收款总价</span>
          <strong>${yuan(total)}</strong>
          <button class="btn primary" data-action="insurance-presubmit" ${canSubmit ? "" : "disabled"}>提交</button>
        </div>
      </section>

      <section class="insurance-order-footer">
        <div class="insurance-order-meta">
          <div><span>日期：</span><strong>${order?.date || "-"}</strong></div>
          <div><span>单号：</span><strong>${order?.orderNo || "-"}</strong></div>
          <div><span>状态：</span><strong>${order?.status || "-"}</strong></div>
        </div>
        <div class="insurance-order-amount"><span>金额：</span><strong>${order ? `¥ ${yuan(order.amount)}` : "-"}</strong></div>
        <div class="insurance-order-actions">
          ${
            order?.status === "支付成功"
              ? `<button class="btn primary" data-action="insurance-reset">继续收款</button>`
              : `<button class="btn success" data-action="insurance-pay" ${canPay ? "" : "disabled"}>支付</button>`
          }
        </div>
      </section>
    </div>`;
}

function renderOrderDetail() {
  const refund = state.detailRefundId ? refunds.find((item) => item.id === state.detailRefundId) : null;
  const order = orders.find((item) => item.orderNo === state.detailOrderNo) || buildOrderFromRefund(refund);
  if (!order) {
    return `<div class="empty">未找到订单信息</div><button class="btn" data-action="back-to-list">返回列表</button>`;
  }
  const relatedRefunds = refunds.filter((item) => item.orderNo === order.orderNo || item.id === state.detailRefundId);
  const paidAmount = order.amount > 0 ? order.amount : 0;
  const refundedAmount = relatedRefunds.filter((item) => item.status.includes("成功")).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const completeTime = nextSecond(order.time);
  const orderInfo = [
    ["商户号", order.merchantNo],
    ["商户名", order.merchant],
    ["门店号", order.storeNo],
    ["门店名", order.store],
    ["支付方式", order.payWay],
    ["平台单号", order.platformNo],
  ];
  const productRows = order.products.map((product, index) => ({
    ...product,
    index: index + 1,
    amount: Number(product.price) * Number(product.qty),
    agreement: "否",
  }));
  const tradeRows = [
    {
      payDate: order.time.slice(0, 10),
      payFlow: order.platformNo,
      payTime: completeTime,
      payType: order.type === "退款" ? "退款" : "消费",
      payAmount: Math.abs(order.amount),
      actualAmount: paidAmount || Math.abs(order.amount),
      payStatus: order.success ? "支付成功" : order.status,
      channelMessage: order.success ? "00(支付成功)" : "-",
      payAccount: order.payWay.includes("银联") ? "13254-1076078737985" : "-",
      channelNo: order.payWay.includes("微信") ? "WX" : order.payWay.includes("支付宝") ? "ALIPAY" : "SQBWX0",
      channelDate: order.time.slice(0, 10),
      channelFlow: order.payDetail?.channelFlow || order.orderNo,
      channelOrder: order.payDetail?.channelOrder || "-",
      refundedAmount,
      refundable: order.refundable || 0,
    },
  ];
  return `
    <div class="detail-page">
      <div class="detail-heading">
        <div>
          <div class="detail-kicker">单号</div>
          <h3>${escapeHtml(order.orderNo)}</h3>
        </div>
        <div class="detail-actions">
          <button class="btn" data-action="back-to-list">返回列表</button>
        </div>
      </div>
      <div class="detail-summary">
        <div><span>交易时间</span><strong>${escapeHtml(order.time)}</strong></div>
        <div><span>金额</span><strong>${yuan(order.amount)}</strong></div>
        <div><span>交易类型</span><strong>${escapeHtml(order.type)}</strong></div>
        <div><span>状态</span><strong>${escapeHtml(order.status)}</strong></div>
      </div>
      <section class="detail-block">${renderDetailGrid(orderInfo)}</section>
      ${renderDetailBlock(
        "商品信息",
        renderPlainTable(
          [
            { title: "#", key: "index" },
            { title: "商品编号", key: "code" },
            { title: "商品名称", key: "name" },
            { title: "商品类型", key: "category" },
            { title: "商品说明", key: "approval" },
            { title: "规格", key: "spec" },
            { title: "单位", key: "unit" },
            { title: "单价", key: "price", amount: true },
            { title: "数量", key: "qty" },
            { title: "金额", key: "amount", amount: true },
            { title: "协议商品", key: "agreement" },
          ],
          productRows
        )
      )}
      ${renderDetailBlock(
        "交易信息",
        renderPlainTable(
          [
            { title: "支付日期", key: "payDate" },
            { title: "支付流水号", key: "payFlow" },
            { title: "支付完成时间", key: "payTime" },
            { title: "支付类型", key: "payType" },
            { title: "支付金额", key: "payAmount", amount: true },
            { title: "实收金额", key: "actualAmount", amount: true },
            { title: "支付状态", key: "payStatus", status: true },
            { title: "渠道响应消息", key: "channelMessage" },
            { title: "支付账号", key: "payAccount" },
            { title: "渠道号", key: "channelNo" },
            { title: "渠道日期", key: "channelDate" },
            { title: "渠道流水号", key: "channelFlow" },
            { title: "收款通道订单号", key: "channelOrder" },
            { title: "已退款金额", key: "refundedAmount", amount: true },
            { title: "可退款金额", key: "refundable", amount: true },
          ],
          tradeRows
        )
      )}
      ${
        relatedRefunds.length
          ? renderDetailBlock(
              "退款信息",
              renderPlainTable(
                [
                  { title: "退款单号", key: "id" },
                  { title: "商户订单号", key: "orderNo" },
                  { title: "平台订单号", key: "platformNo" },
                  { title: "退款金额", key: "amount", amount: true },
                  { title: "退款状态", key: "status", status: true },
                  { title: "退款方式", key: "way" },
                  { title: "申请人", key: "applicant" },
                  { title: "申请时间", key: "applyTime" },
                  { title: "退款商品", key: "products" },
                ],
                relatedRefunds
              )
            )
          : ""
      }
    </div>`;
}

function renderDetailBlock(title, content) {
  return `
    <section class="detail-block">
      <h3 class="result-title">${escapeHtml(title)}</h3>
      ${content}
    </section>`;
}

function renderDetailGrid(items) {
  return `<div class="detail-grid">${items.map(([label, value]) => `<div class="detail-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>`;
}

function buildOrderFromRefund(refund) {
  if (!refund) return null;
  return {
    seq: 0,
    merchantNo: refund.merchantNo,
    merchant: refund.merchant,
    storeNo: "-",
    store: refund.store,
    area: "-",
    time: `${refund.orderDate} 00:00:00`,
    orderNo: refund.orderNo,
    platformNo: refund.platformNo,
    amount: -Number(refund.amount),
    type: "退款",
    status: refund.status,
    payWay: "-",
    success: refund.status.includes("成功"),
    refundable: 0,
    products: [{ code: "-", name: refund.products, approval: "-", category: "-", spec: "-", unit: "-", price: refund.amount, qty: 1 }],
    payDetail: { channelFlow: refund.platformNo, channelOrder: refund.id },
  };
}

function nextSecond(time) {
  const date = new Date(String(time).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return time;
  date.setSeconds(date.getSeconds() + 1);
  return formatDateTime(date);
}

function formatDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function renderStoreSummary() {
  const rows = [
    { date: "2026-04-01", unionPayCount: 6, unionPayAmount: 5.3, unionRefundCount: 3, unionRefundAmount: -1, wechatPayCount: 2, wechatPayAmount: 1.2, wechatRefundCount: 0, wechatRefundAmount: 0 },
    { date: "2026-04-02", unionPayCount: 9, unionPayAmount: 5.1, unionRefundCount: 2, unionRefundAmount: -0.2, wechatPayCount: 1, wechatPayAmount: 0.8, wechatRefundCount: 0, wechatRefundAmount: 0 },
    { date: "2026-04-03", unionPayCount: 7, unionPayAmount: 1.6, unionRefundCount: 8, unionRefundAmount: -1.5, wechatPayCount: 3, wechatPayAmount: 2.4, wechatRefundCount: 1, wechatRefundAmount: -0.4 },
    { date: "2026-04-10", unionPayCount: 1, unionPayAmount: 1, unionRefundCount: 1, unionRefundAmount: -1, wechatPayCount: 0, wechatPayAmount: 0, wechatRefundCount: 0, wechatRefundAmount: 0 },
    { date: "2026-04-16", unionPayCount: 1, unionPayAmount: 0.1, unionRefundCount: 0, unionRefundAmount: 0, wechatPayCount: 4, wechatPayAmount: 3.2, wechatRefundCount: 1, wechatRefundAmount: -0.6 },
    { date: "2026-04-20", unionPayCount: 1, unionPayAmount: 0.1, unionRefundCount: 1, unionRefundAmount: -0.1, wechatPayCount: 2, wechatPayAmount: 1.6, wechatRefundCount: 0, wechatRefundAmount: 0 },
    { date: "2026-04-21", unionPayCount: 2, unionPayAmount: 1.1, unionRefundCount: 1, unionRefundAmount: -1, wechatPayCount: 5, wechatPayAmount: 4.5, wechatRefundCount: 1, wechatRefundAmount: -0.5 },
  ];
  const summary = rows.reduce(
    (total, row) => ({
      date: "汇总",
      unionPayCount: total.unionPayCount + row.unionPayCount,
      unionPayAmount: total.unionPayAmount + row.unionPayAmount,
      unionRefundCount: total.unionRefundCount + row.unionRefundCount,
      unionRefundAmount: total.unionRefundAmount + row.unionRefundAmount,
      wechatPayCount: total.wechatPayCount + row.wechatPayCount,
      wechatPayAmount: total.wechatPayAmount + row.wechatPayAmount,
      wechatRefundCount: total.wechatRefundCount + row.wechatRefundCount,
      wechatRefundAmount: total.wechatRefundAmount + row.wechatRefundAmount,
      isSummary: true,
    }),
    { date: "汇总", unionPayCount: 0, unionPayAmount: 0, unionRefundCount: 0, unionRefundAmount: 0, wechatPayCount: 0, wechatPayAmount: 0, wechatRefundCount: 0, wechatRefundAmount: 0, isSummary: true }
  );
  return `
    <div class="sectioned-page">
      <div class="filter-panel">
        <div class="filter-grid cols-3">
          <div class="field">
            <label>门店</label>
            <input class="form-control" value="月头礼品卡" disabled />
          </div>
          <div class="field">
            <label>订单日期</label>
            <input class="form-control date-range-control" value="2026-04-01 至 2026-04-22" />
          </div>
          <div class="actions inline-actions">
            <button class="btn primary" data-action="query">查询</button>
            <button class="btn" data-action="download">导出</button>
          </div>
        </div>
      </div>
      ${renderStoreDailySummaryTable(rows, summary)}
    </div>`;
}

function renderStoreDailySummaryTable(rows, summary) {
  return `
    ${renderResultSection("汇总结果（统计范围 2026-04-01 至 2026-04-22）", renderStoreSummaryResult(summary))}
    ${renderResultSection(
      "明细结果",
      `${renderStoreDailyDetailTable(rows)}
      <div class="summary-bar">
        <div>共<b>${rows.length}</b>条</div>
      </div>`
    )}`;
}

function storeSummarySubtotal(row) {
  return {
    payCount: row.unionPayCount + row.wechatPayCount,
    payAmount: row.unionPayAmount + row.wechatPayAmount,
    refundCount: row.unionRefundCount + row.wechatRefundCount,
    refundAmount: row.unionRefundAmount + row.wechatRefundAmount,
  };
}

function storePaymentRows(row) {
  return [
    { payWay: "银联刷卡h", payCount: row.unionPayCount, payAmount: row.unionPayAmount, refundCount: row.unionRefundCount, refundAmount: row.unionRefundAmount },
    { payWay: "微信支付", payCount: row.wechatPayCount, payAmount: row.wechatPayAmount, refundCount: row.wechatRefundCount, refundAmount: row.wechatRefundAmount },
  ].map((item) => ({
    ...item,
    countTotal: item.payCount + item.refundCount,
    amountTotal: item.payAmount + item.refundAmount,
  }));
}

function storePaymentColumns() {
  return [
    { title: "支付方式", key: "payWay" },
    { title: "支付笔数", key: "payCount" },
    { title: "支付金额", key: "payAmount", amount: true },
    { title: "退款笔数", render: (row) => `<span class="amount negative">${row.refundCount}</span>` },
    { title: "退款金额", key: "refundAmount", amount: true },
    { title: "笔数小计", key: "countTotal" },
    { title: "金额小计", key: "amountTotal", amount: true },
  ];
}

function renderStoreSummaryResult(summary) {
  const subtotal = storeSummarySubtotal(summary);
  const rows = [
    ...storePaymentRows(summary),
    {
      payWay: "合计",
      payCount: subtotal.payCount,
      payAmount: subtotal.payAmount,
      refundCount: subtotal.refundCount,
      refundAmount: subtotal.refundAmount,
      countTotal: subtotal.payCount + subtotal.refundCount,
      amountTotal: subtotal.payAmount + subtotal.refundAmount,
    },
  ];
  return renderPlainTable(storePaymentColumns(), rows, { className: "summary-result-table compact-table" });
}

function renderStoreDailyDetailTable(rows) {
  const moneyCell = (value) => `<span class="amount ${Number(value) < 0 ? "negative" : ""}">${yuan(value)}</span>`;
  return `
    <div class="table-wrap">
      <table class="compact-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>支付笔数</th>
            <th>支付金额</th>
            <th>退款笔数</th>
            <th>退款金额</th>
            <th>笔数小计</th>
            <th>金额小计</th>
            <th class="action-cell">操作</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => {
              const subtotal = storeSummarySubtotal(row);
              const expanded = !!state.expandedStoreSummaryDates[row.date];
              return `
                <tr>
                  <td>${escapeHtml(row.date)}</td>
                  <td>${subtotal.payCount}</td>
                  <td>${moneyCell(subtotal.payAmount)}</td>
                  <td><span class="amount negative">${subtotal.refundCount}</span></td>
                  <td>${moneyCell(subtotal.refundAmount)}</td>
                  <td>${subtotal.payCount + subtotal.refundCount}</td>
                  <td>${moneyCell(subtotal.payAmount + subtotal.refundAmount)}</td>
                  <td class="action-cell"><button class="btn link" data-action="toggle-store-summary-date" data-date="${row.date}">${expanded ? "收起" : "展开"}</button></td>
                </tr>
                ${
                  expanded
                    ? `<tr class="drilldown-row"><td colspan="8">${renderPlainTable(storePaymentColumns(), storePaymentRows(row), { className: "nested-table compact-table" })}</td></tr>`
                    : ""
                }`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`;
}

function renderRefundApply() {
  if (state.refundApplyOrderNo) return renderRefundApplyDetail();
  const rows = orders.filter((order) => order.type === "收款").map((order) => ({
    ...order,
    orderDate: order.time.slice(0, 10),
    platformDate: order.time.slice(0, 10),
    orderTime: order.time,
  }));
  return `
    ${renderFilter([
      { label: "商户", type: "select", options: ["博悠"] },
      { label: "门店", placeholder: "请选择" },
      { label: "商户订单号", placeholder: "请输入商户订单号" },
      { label: "订单日期", type: "dateRange", value: "2026-04-16 至 2026-04-23" },
    ])}
    ${renderTable(
      [
        { title: "序号", key: "seq" },
        { title: "商户号", key: "merchantNo" },
        { title: "商户名称", key: "merchant" },
        { title: "商户门店", key: "store" },
        { title: "商户订单号", key: "orderNo" },
        { title: "商户订单日期", key: "orderDate" },
        { title: "平台订单号", key: "platformNo" },
        { title: "平台订单日期", key: "platformDate" },
        { title: "订单金额", key: "amount", amount: true },
        { title: "可退金额", key: "refundable", amount: true },
        { title: "订单类型", key: "type" },
        { title: "订单状态", key: "status", status: true },
        { title: "订单时间", key: "orderTime" },
        {
          title: "操作",
          action: true,
          render: (row) => (row.refundable > 0 ? `<button class="btn link" data-action="open-refund-apply" data-order="${row.orderNo}">申请退款</button>` : `<span class="subtle">不可退款</span>`),
        },
      ],
      rows,
      { total: 27 }
    )}`;
}

function renderRefundApplyDetail() {
  const order = orders.find((item) => item.orderNo === state.refundApplyOrderNo);
  if (!order) return `<div class="empty">未找到可退款订单</div><button class="btn" data-action="refund-apply-back">返回</button>`;
  const productRows = order.products.map((product, index) => ({
    ...product,
    index: index + 1,
    refundableQty: product.qty,
    refundQty: product.qty,
    amount: Number(product.price) * Number(product.qty),
  }));
  const orderInfo = [
    ["商户号", order.merchantNo],
    ["商户名称", order.merchant],
    ["商户门店", order.store],
    ["商户订单号", order.orderNo],
    ["商户订单日期", order.time.slice(0, 10)],
    ["平台订单号", order.platformNo],
    ["平台订单日期", order.time.slice(0, 10)],
    ["订单金额(元)", yuan(order.amount)],
    ["可退款金额(元)", yuan(order.refundable)],
  ];
  return `
    <div class="refund-apply-detail">
      <section class="refund-detail-block">
        <h3 class="result-title">订单详情</h3>
        ${renderDetailGrid(orderInfo)}
      </section>
      <section class="refund-detail-block">
        <h3 class="result-title">退款信息</h3>
        <div class="refund-product-label">退款商品</div>
        ${renderPlainTable(
          [
            { title: "选择退款", render: () => `<input type="checkbox" checked />` },
            { title: "商品编号", key: "code" },
            { title: "商品名称", key: "name", ellipsis: true },
            { title: "批准文号", key: "approval" },
            { title: "商品类型", key: "category" },
            { title: "规格", key: "spec" },
            { title: "单位", key: "unit" },
            { title: "单价", key: "price", amount: true },
            { title: "可退数量", key: "refundableQty" },
            { title: "退款数量", render: (row) => `<input class="form-control refund-qty-input" value="${row.refundQty}" />` },
            { title: "小计", key: "amount", amount: true },
          ],
          productRows,
          { className: "refund-product-table" }
        )}
        <div class="refund-amount-row">
          <div class="field">
            <label for="refundAmount">退款金额</label>
            <input class="form-control" id="refundAmount" value="${yuan(order.refundable)}" />
          </div>
          <div class="field">
            <label for="refundReason">退款原因</label>
            <input class="form-control" id="refundReason" value="顾客申请退款" placeholder="请输入退款原因" />
          </div>
        </div>
        <div class="refund-apply-actions">
          <button class="btn primary" data-action="submit-refund" data-order="${order.orderNo}">提交申请</button>
          <button class="btn danger" data-action="refund-apply-back">返回</button>
        </div>
      </section>
    </div>`;
}

function renderRefundSearch() {
  return `
    ${renderFilter([
      { label: "商户", type: "select", options: ["博悠"] },
      { label: "门店", placeholder: "请选择" },
      { label: "商户订单号", placeholder: "请输入商户订单号" },
      { label: "退款状态", type: "select", options: ["全部", "退款成功", "退款申请成功（审核中）", "退款审核成功（退款中）", "退款审核失败（退款失败）", "无效退款", "退款中", "退款失败"] },
      { label: "退款方式", type: "select", options: ["全部", "人工审核退款"] },
      { label: "商户订单日期", type: "dateRange", value: "2026-04-16 至 2026-04-23" },
    ])}
    ${refundTable(refunds, true)}`;
}

function renderRefundReview() {
  const pending = refunds.filter(isManualReviewRefund);
  return `
    ${renderFilter([
      { label: "商户", type: "select", options: ["博悠"] },
      { label: "门店", placeholder: "请选择" },
      { label: "商户订单号", placeholder: "请输入商户订单号" },
      { label: "商户订单日期", type: "dateRange", value: "2026-04-16 至 2026-04-23" },
    ])}
    <div class="toolbar left refund-review-toolbar">
      <button class="btn" data-action="review-pass">批量退款</button>
      <button class="btn" data-action="review-reject">批量取消</button>
    </div>
    ${renderTable(
      [
        { title: `<input type="checkbox" checked />`, render: () => `<input type="checkbox" checked />` },
        { title: "商户号", key: "merchantNo" },
        { title: "商户名称", key: "merchant" },
        { title: "商户门店", key: "store" },
        { title: "商户订单号", key: "orderNo" },
        { title: "商户订单日期", key: "orderDate" },
        { title: "退款金额", key: "amount", amount: true },
        { title: "退款原因", key: "reason", ellipsis: true },
        { title: "退款状态", key: "status", status: true },
        { title: "申请时间", key: "applyTime" },
        {
          title: "操作",
          action: true,
          render: (row) => `
            <div class="table-actions">
              <button class="btn link" data-action="review-pass" data-refund="${row.id}">确认退款</button>
              <button class="btn link link-danger" data-action="review-reject" data-refund="${row.id}">取消退款</button>
            </div>`,
        },
      ],
      pending
    )}`;
}

function refundTable(rows, actions) {
  return renderTable(
    [
      { title: "商户号", key: "merchantNo" },
      { title: "商户名称", key: "merchant" },
      { title: "商户门店", key: "store" },
      { title: "商户订单号", key: "orderNo" },
      { title: "商户订单日期", key: "orderDate" },
      { title: "平台订单号", key: "platformNo" },
      { title: "平台订单日期", key: "platformDate" },
      { title: "退款金额", key: "amount", amount: true },
      { title: "退款状态", key: "status", status: true },
      { title: "退款方式", key: "way" },
      { title: "申请时间", key: "applyTime" },
      ...(actions
        ? [
            {
              title: "操作",
              action: true,
              render: (row) => `<button class="btn link" data-action="refund-products-detail" data-refund="${row.id}">退款商品详情</button>`,
            },
          ]
        : []),
    ],
    rows
  );
}

function isManualReviewRefund(item) {
  return item.way === "人工审核退款" && item.status === "退款申请成功（审核中）";
}

function reportMetricColumns() {
  return [
    { title: "支付笔数", key: "payCount" },
    { title: "支付金额", key: "payAmount", amount: true },
    { title: "退款笔数", render: (row) => `<span class="amount negative">${row.refundCount}</span>` },
    { title: "退款金额", key: "refundAmount", amount: true },
    { title: "笔数小计", key: "countTotal" },
    { title: "金额小计", key: "amountTotal", amount: true },
  ];
}

function withReportTotals(row) {
  return {
    ...row,
    countTotal: row.payCount + row.refundCount,
    amountTotal: row.payAmount + row.refundAmount,
  };
}

function sumReportRows(rows) {
  return withReportTotals(
    rows.reduce(
      (total, row) => ({
        payCount: total.payCount + row.payCount,
        payAmount: total.payAmount + row.payAmount,
        refundCount: total.refundCount + row.refundCount,
        refundAmount: total.refundAmount + row.refundAmount,
      }),
      { payCount: 0, payAmount: 0, refundCount: 0, refundAmount: 0 }
    )
  );
}

function summarizeByPayWay(rows, includeTotal = false) {
  const map = new Map();
  rows.forEach((row) => {
    const current = map.get(row.payWay) || { payWay: row.payWay, payCount: 0, payAmount: 0, refundCount: 0, refundAmount: 0 };
    current.payCount += row.payCount;
    current.payAmount += row.payAmount;
    current.refundCount += row.refundCount;
    current.refundAmount += row.refundAmount;
    map.set(row.payWay, current);
  });
  const result = Array.from(map.values()).map(withReportTotals);
  if (includeTotal) result.push({ payWay: "合计", ...sumReportRows(rows) });
  return result;
}

function salesReportConfig(type) {
  const configs = {
    group: {
      dimensions: [
        { title: "商户", key: "name" },
        { title: "门店类型", key: "type" },
      ],
      key: (row) => `${row.name}|${row.type}`,
    },
    daily: {
      dimensions: [{ title: "日期", key: "date" }],
      key: (row) => row.date,
    },
    store: {
      dimensions: [
        { title: "门店号", key: "storeNo" },
        { title: "门店", key: "store" },
        { title: "门店类型", key: "storeType" },
      ],
      key: (row) => row.storeNo,
    },
  };
  return configs[type];
}

function aggregateSalesReportRows(type, rows) {
  const config = salesReportConfig(type);
  const map = new Map();
  rows.forEach((row) => {
    const key = config.key(row);
    const current =
      map.get(key) ||
      config.dimensions.reduce(
        (item, column) => ({
          ...item,
          [column.key]: row[column.key],
        }),
        { reportKey: key, payCount: 0, payAmount: 0, refundCount: 0, refundAmount: 0 }
      );
    current.payCount += row.payCount;
    current.payAmount += row.payAmount;
    current.refundCount += row.refundCount;
    current.refundAmount += row.refundAmount;
    map.set(key, current);
  });
  return Array.from(map.values()).map(withReportTotals);
}

function reportScopeTitle() {
  return "汇总结果（统计范围 商户：博悠 / 片区：全部 / 门店：全部 / 订单日期：2026-04-01 至 2026-04-22）";
}

function renderSalesReportResults(type, sourceRows) {
  const summaryRows = summarizeByPayWay(sourceRows, true);
  const detailRows = aggregateSalesReportRows(type, sourceRows);
  return `
    ${renderResultSection(reportScopeTitle(), renderPlainTable([{ title: "支付方式", key: "payWay" }, ...reportMetricColumns()], summaryRows, { className: "summary-result-table compact-table" }))}
    ${renderResultSection(
      "明细结果",
      `${renderSalesReportDetailTable(type, detailRows, sourceRows)}
      <div class="summary-bar">
        <div>共<b>${detailRows.length}</b>条</div>
        <div class="pager"><button class="page-num active">1</button><button class="page-num">2</button><button class="btn small">下一页</button><span>10 条/页</span></div>
      </div>`
    )}`;
}

function renderSalesReportDetailTable(type, detailRows, sourceRows) {
  const config = salesReportConfig(type);
  const columns = [...config.dimensions, ...reportMetricColumns()];
  return `
    <div class="table-wrap">
      <table class="compact-table">
        <thead>
          <tr>${columns.map((column) => `<th class="${columnClass(column)}">${column.title}</th>`).join("")}<th class="action-cell">操作</th></tr>
        </thead>
        <tbody>
          ${detailRows
            .map((row) => {
              const expanded = !!state.expandedSalesReportRows[`${type}:${row.reportKey}`];
              const drillRows = summarizeByPayWay(sourceRows.filter((source) => config.key(source) === row.reportKey));
              return `
                <tr>
                  ${columns.map((column) => `<td class="${columnClass(column)}">${renderCell(column, row, 0)}</td>`).join("")}
                  <td class="action-cell"><button class="btn link" data-action="toggle-sales-report-row" data-report="${type}" data-key="${row.reportKey}">${expanded ? "收起" : "展开"}</button></td>
                </tr>
                ${
                  expanded
                    ? `<tr class="drilldown-row"><td colspan="${columns.length + 1}">${renderPlainTable([{ title: "支付方式", key: "payWay" }, ...reportMetricColumns()], drillRows, { className: "nested-table compact-table" })}</td></tr>`
                    : ""
                }`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`;
}

function renderSalesReport(type) {
  const titleMap = {
    group: "按商户维度统计，区分直营店和加盟店。",
    daily: "按日期维度统计所选对象每日交易情况。",
    store: "按门店维度统计所选日期范围内每个门店交易情况。",
  };
  const rowsMap = {
    group: [
      { name: "博悠", type: "直营店", payWay: "银联刷卡h", payCount: 18, payAmount: 12.2, refundCount: 11, refundAmount: -3.1 },
      { name: "博悠", type: "直营店", payWay: "微信支付", payCount: 7, payAmount: 1, refundCount: 4, refundAmount: -0.7 },
      { name: "博悠", type: "加盟店", payWay: "支付宝", payCount: 10, payAmount: 7.8, refundCount: 1, refundAmount: -0.3 },
      { name: "博悠", type: "加盟店", payWay: "医保电子凭证", payCount: 6, payAmount: 2, refundCount: 2, refundAmount: -0.6 },
    ],
    daily: [
      { date: "2026-04-20", payWay: "银联刷卡h", payCount: 1, payAmount: 0.1, refundCount: 1, refundAmount: -0.1 },
      { date: "2026-04-20", payWay: "微信支付", payCount: 2, payAmount: 1.4, refundCount: 0, refundAmount: 0 },
      { date: "2026-04-21", payWay: "医保电子凭证", payCount: 12, payAmount: 8.1, refundCount: 2, refundAmount: -1 },
      { date: "2026-04-21", payWay: "支付宝", payCount: 4, payAmount: 2.7, refundCount: 1, refundAmount: -0.5 },
    ],
    store: [
      { storeNo: "LPK001", store: "月头礼品卡", storeType: "直营店", payWay: "银联刷卡h", payCount: 12, payAmount: 8.4, refundCount: 4, refundAmount: -2.2 },
      { storeNo: "LPK001", store: "月头礼品卡", storeType: "直营店", payWay: "微信支付", payCount: 3, payAmount: 2.1, refundCount: 1, refundAmount: -0.4 },
      { storeNo: "LPK002", store: "康宁路药房", storeType: "直营店", payWay: "医保电子凭证", payCount: 8, payAmount: 6.2, refundCount: 1, refundAmount: -0.1 },
      { storeNo: "LPK003", store: "长宁医保店", storeType: "加盟店", payWay: "支付宝", payCount: 5, payAmount: 4.8, refundCount: 1, refundAmount: -1 },
    ],
  };
  return `
    <div class="sectioned-page">
      <div class="filter-panel">
        <div class="filter-grid">
          <div class="field"><label>商户</label><select class="form-control"><option>博悠</option></select></div>
          <div class="field"><label>片区</label><select class="form-control"><option>全部</option><option>上海片区</option><option>华东片区</option></select></div>
          <div class="field"><label>门店</label><input class="form-control" placeholder="请选择" /></div>
          <div class="field"><label>订单日期</label><input class="form-control date-range-control" value="2026-04-01 至 2026-04-22" /></div>
          <div class="actions">
            <span class="subtle">${titleMap[type]}</span>
            <button class="btn primary" data-action="query">查询</button>
            <button class="btn" data-action="download">导出</button>
          </div>
        </div>
      </div>
      ${renderSalesReportResults(type, rowsMap[type])}
    </div>`;
}

function reconcileRows() {
  return [
    { date: "2026-04-01", merchant: "博悠", storeType: "直营店", payWay: "银联刷卡h", tradeCount: 6, tradeAmount: 5.3, refundCount: 3, refundAmount: -1, merchantCoupon: 0, channelCoupon: 0, prepaidCoupon: 0, freeCoupon: 0, diff: 0, actual: 4.3, fee: 0, settle: 4.3 },
    { date: "2026-04-01", merchant: "博悠", storeType: "直营店", payWay: "微信支付", tradeCount: 4, tradeAmount: 2.4, refundCount: 1, refundAmount: -0.3, merchantCoupon: 0, channelCoupon: 0, prepaidCoupon: 0, freeCoupon: 0, diff: 0, actual: 2.1, fee: 0, settle: 2.1 },
    { date: "2026-04-02", merchant: "博悠", storeType: "直营店", payWay: "银联刷卡h", tradeCount: 9, tradeAmount: 5.1, refundCount: 2, refundAmount: -0.2, merchantCoupon: 0, channelCoupon: 0, prepaidCoupon: 0, freeCoupon: 0, diff: 0, actual: 4.9, fee: 0, settle: 4.9 },
    { date: "2026-04-03", merchant: "博悠", storeType: "加盟店", payWay: "医保电子凭证", tradeCount: 7, tradeAmount: 1.6, refundCount: 8, refundAmount: -1.5, merchantCoupon: 0, channelCoupon: 0, prepaidCoupon: 0, freeCoupon: 0, diff: 0, actual: 0.1, fee: 0, settle: 0.1 },
  ];
}

function reconcileMetricColumns() {
  return [
    { title: "交易笔数", key: "tradeCount" },
    { title: "交易金额", key: "tradeAmount", amount: true },
    { title: "退款笔数", key: "refundCount", render: (row) => `<span class="amount negative">${row.refundCount}</span>` },
    { title: "退款金额", key: "refundAmount", amount: true },
    { title: "商户优惠", key: "merchantCoupon", amount: true },
    { title: "支付渠道优惠", key: "channelCoupon", amount: true },
    { title: "调差金额", key: "diff", amount: true },
    { title: "实收金额", key: "actual", amount: true },
    { title: "渠道手续费", key: "fee", amount: true },
    { title: "结算金额", key: "settle", amount: true },
  ];
}

function sumReconcileRows(rows, base = {}) {
  return rows.reduce(
    (total, row) => ({
      ...total,
      tradeCount: total.tradeCount + row.tradeCount,
      tradeAmount: total.tradeAmount + row.tradeAmount,
      refundCount: total.refundCount + row.refundCount,
      refundAmount: total.refundAmount + row.refundAmount,
      merchantCoupon: total.merchantCoupon + row.merchantCoupon,
      channelCoupon: total.channelCoupon + row.channelCoupon,
      diff: total.diff + row.diff,
      actual: total.actual + row.actual,
      fee: total.fee + row.fee,
      settle: total.settle + row.settle,
    }),
    { tradeCount: 0, tradeAmount: 0, refundCount: 0, refundAmount: 0, merchantCoupon: 0, channelCoupon: 0, diff: 0, actual: 0, fee: 0, settle: 0, ...base }
  );
}

function summarizeReconcileByPayWay(rows, includeTotal = true) {
  const grouped = new Map();
  rows.forEach((row) => {
    if (!grouped.has(row.payWay)) grouped.set(row.payWay, []);
    grouped.get(row.payWay).push(row);
  });
  const payWayRows = Array.from(grouped.entries()).map(([payWay, items]) => sumReconcileRows(items, { payWay }));
  return includeTotal ? [...payWayRows, sumReconcileRows(rows, { payWay: "合计" })] : payWayRows;
}

function summarizeReconcileDetailRows(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = `${row.date}|${row.merchant}|${row.storeType}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });
  return Array.from(grouped.entries()).map(([key, items]) => {
    const [date, merchant, storeType] = key.split("|");
    return sumReconcileRows(items, { date, merchant, storeType, reconcileKey: key });
  });
}

function renderMerchantReconcileResults(rows) {
  const summaryColumns = [{ title: "支付方式", key: "payWay" }, ...reconcileMetricColumns()];
  return `
    ${renderResultSection("汇总结果（统计范围 商户：博悠 / 日期范围：2026-04-01 至 2026-04-22 / 支付方式：全部）", renderPlainTable(summaryColumns, summarizeReconcileByPayWay(rows), { className: "summary-result-table compact-table" }))}
    ${renderResultSection("明细结果", renderMerchantReconcileDetailTable(rows))}`;
}

function renderMerchantReconcileDetailTable(rows) {
  const detailRows = summarizeReconcileDetailRows(rows);
  const columns = [{ title: "日期", key: "date" }, { title: "商户", key: "merchant" }, { title: "门店类型", key: "storeType" }, ...reconcileMetricColumns()];
  return `
    <div class="table-wrap">
      <table class="compact-table">
        <thead>
          <tr>${columns.map((column) => `<th class="${columnClass(column)}">${column.title}</th>`).join("")}<th class="action-cell">操作</th></tr>
        </thead>
        <tbody>
          ${detailRows
            .map((row) => {
              const expanded = !!state.expandedReconcileRows[row.reconcileKey];
              const drillRows = summarizeReconcileByPayWay(rows.filter((item) => `${item.date}|${item.merchant}|${item.storeType}` === row.reconcileKey), false);
              return `
                <tr>
                  ${columns.map((column) => `<td class="${columnClass(column)}">${renderCell(column, row, 0)}</td>`).join("")}
                  <td class="action-cell"><button class="btn link" data-action="toggle-reconcile-row" data-key="${row.reconcileKey}">${expanded ? "收起" : "展开"}</button></td>
                </tr>
                ${
                  expanded
                    ? `<tr class="drilldown-row"><td colspan="${columns.length + 1}">${renderPlainTable([{ title: "支付方式", key: "payWay" }, ...reconcileMetricColumns()], drillRows, { className: "nested-table compact-table" })}</td></tr>`
                    : ""
                }`;
            })
            .join("")}
        </tbody>
      </table>
    </div>
    <div class="summary-bar">
      <div>共<b>${detailRows.length}</b>条</div>
      <div class="pager"><button class="page-num active">1</button><button class="page-num">2</button><button class="btn small">下一页</button><span>10 条/页</span></div>
    </div>`;
}

function renderMerchantReconcile() {
  const rows = reconcileRows();
  return `
    <div class="sectioned-page">
      <div class="filter-panel">
        <div class="filter-grid cols-3">
          <div class="field"><label>商户</label><select class="form-control"><option>博悠</option></select></div>
          <div class="field"><label>日期</label><input class="form-control date-range-control" value="2026-04-01 至 2026-04-22" /></div>
          <div class="field"><label>支付方式</label><select class="form-control"><option>全部</option><option>银联刷卡h</option><option>微信支付</option><option>医保电子凭证</option></select></div>
          <div class="actions">
            <span class="subtle">基于倍赞销售数据与交易渠道侧数据对账后生成。</span>
            <button class="btn text" data-action="reset-filter">重置</button>
            <button class="btn primary" data-action="query">查询</button>
            <button class="btn" data-action="download">导出</button>
          </div>
        </div>
      </div>
      ${renderMerchantReconcileResults(rows)}
    </div>`;
}

function renderOperatorManage() {
  return `
    ${renderFilter([
      { label: "姓名", placeholder: "请输入姓名" },
      { label: "手机号", placeholder: "请输入手机号" },
      { label: "状态", type: "select", options: ["全部", "启用", "停用"] },
    ], true, 3)}
    <div class="toolbar left"><button class="btn primary" data-action="operator-form">新增操作员</button></div>
    ${renderTable(
      [
        { title: "门店", key: "store" },
        { title: "操作员姓名", key: "name" },
        { title: "手机号", key: "phone" },
        { title: "状态", key: "status", status: true },
        { title: "注册时间", key: "createdAt" },
        { title: "说明", key: "remark" },
        { title: "操作", action: true, render: (row) => `<button class="btn link" data-action="operator-form" data-user="${row.id}">编辑</button> <button class="btn link" data-action="toggle-operator" data-user="${row.id}">${row.status === "启用" ? "停用" : "启用"}</button>` },
      ],
      operators
    )}`;
}

function renderRoleManage() {
  return `
    <div class="toolbar left"><button class="btn primary" data-action="role-form">新增角色</button></div>
    ${renderTable(
      [
        { title: "角色名称", key: "name" },
        { title: "关联用户数", key: "users" },
        { title: "说明", key: "desc" },
        { title: "状态", key: "status", status: true },
        { title: "操作", action: true, render: (row) => `<button class="btn link" data-action="role-form" data-role="${row.id}">编辑权限</button>` },
      ],
      roles
    )}`;
}

function renderPassword() {
  return `
    <div class="password-page">
      <section class="password-section">
        <h3 class="password-section-title">账号信息</h3>
        <div class="password-account-grid">
          <div class="password-account-item"><span>手机号</span><strong>15201711909</strong></div>
          <div class="password-account-item"><span>操作员姓名</span><strong>${escapeHtml(state.username)}</strong></div>
        </div>
      </section>
      <section class="password-section">
        <h3 class="password-section-title">修改密码</h3>
        <div class="password-form">
          <div class="field"><label>原密码</label><input class="form-control" id="oldPwd" type="password" placeholder="请输入原密码" /></div>
          <div class="field"><label>新密码</label><input class="form-control" id="newPwd" type="password" placeholder="请输入新密码" /></div>
          <div class="field"><label>确认密码</label><input class="form-control" id="confirmPwd" type="password" placeholder="请再次输入新密码" /></div>
        </div>
        <div class="password-actions">
          <button class="btn primary" data-action="change-password">保存修改</button>
        </div>
      </section>
    </div>`;
}

function showRefundApply(orderNo) {
  const order = orders.find((item) => item.orderNo === orderNo);
  if (!order) return;
  openModal(
    "申请退款",
    `<div class="form-grid">
      <div class="field"><label>商户订单号</label><input class="form-control" value="${order.orderNo}" disabled /></div>
      <div class="field"><label>可退金额</label><input class="form-control" value="${yuan(order.refundable)}" disabled /></div>
      <div class="field"><label>退款金额</label><input class="form-control" id="refundAmount" value="${yuan(order.refundable)}" /></div>
      <div class="field full"><label>退款原因</label><textarea class="form-control" id="refundReason">顾客申请退款</textarea></div>
    </div>`,
    `<button class="btn" data-close-modal>取消</button><button class="btn primary" data-action="submit-refund" data-order="${order.orderNo}">提交申请</button>`
  );
}

function openOrderDetail(orderNo, refundId = "", backMain = "交易管理", backPage = "订单查询") {
  state.activeMain = backMain;
  state.activePage = "订单详情";
  state.detailOrderNo = orderNo;
  state.detailRefundId = refundId;
  state.detailBackMain = backMain;
  state.detailBackPage = backPage;
  state.userMenuOpen = false;
  render();
}

function backToDetailList() {
  state.activeMain = state.detailBackMain || "交易管理";
  state.activePage = state.detailBackPage || "订单查询";
  state.detailOrderNo = "";
  state.detailRefundId = "";
  render();
}

function showOperatorForm(id) {
  const user = operators.find((item) => item.id === id) || { store: "月头礼品卡", name: "", phone: "", status: "启用", remark: "" };
  openModal(
    id ? "编辑操作员" : "新增操作员",
    `<div class="form-grid">
      <div class="field"><label>门店</label><select class="form-control" id="opStore"><option ${user.store === "月头礼品卡" ? "selected" : ""}>月头礼品卡</option><option ${user.store === "康宁路药房" ? "selected" : ""}>康宁路药房</option></select></div>
      <div class="field"><label>操作员姓名</label><input class="form-control" id="opName" value="${user.name}" /></div>
      <div class="field"><label>手机号</label><input class="form-control" id="opPhone" value="${user.phone}" /></div>
      <div class="field"><label>状态</label><select class="form-control" id="opStatus"><option ${user.status === "启用" ? "selected" : ""}>启用</option><option ${user.status === "停用" ? "selected" : ""}>停用</option></select></div>
      <div class="field full"><label>说明</label><input class="form-control" id="opRemark" value="${user.remark || ""}" /></div>
    </div>`,
    `<button class="btn" data-close-modal>取消</button><button class="btn primary" data-action="save-operator" data-user="${id || ""}">保存</button>`
  );
}

function showRoleForm(id) {
  const role = roles.find((item) => item.id === id) || { name: "", desc: "", status: "启用" };
  openModal(
    id ? "编辑角色权限" : "新增角色",
    `<div class="form-grid">
      <div class="field"><label>角色名称</label><input class="form-control" id="roleName" value="${role.name}" /></div>
      <div class="field"><label>状态</label><select class="form-control" id="roleStatus"><option>启用</option><option>停用</option></select></div>
      <div class="field full"><label>说明</label><input class="form-control" id="roleDesc" value="${role.desc}" /></div>
      <div class="field full"><label>权限</label>
        <div class="scope-grid" style="grid-template-columns:repeat(2,1fr)">
          ${["交易管理", "退款管理", "安全设置"].map((p) => `<label><input type="checkbox" checked /> ${p}</label>`).join("")}
        </div>
      </div>
    </div>`,
    `<button class="btn" data-close-modal>取消</button><button class="btn primary" data-action="save-role" data-role="${id || ""}">保存</button>`
  );
}

function bindEvents() {
  app.onclick = (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    const action = target.dataset.action;
    const page = target.dataset.page;
    const main = target.dataset.navMain;
    if (target.dataset.breadcrumbPage) {
      state.activeMain = target.dataset.breadcrumbMain;
      state.activePage = target.dataset.breadcrumbPage;
      if (state.activePage !== "订单详情") {
        state.detailOrderNo = "";
        state.detailRefundId = "";
      }
      state.userMenuOpen = false;
      render();
      return;
    }
    if (action === "side-main") {
      state.sidebarCollapsed[main] = !state.sidebarCollapsed[main];
      state.userMenuOpen = false;
      render();
      return;
    }
    if (page) {
      state.activeMain = main;
      state.activePage = page;
      state.sidebarCollapsed[main] = false;
      if (page !== "退款申请") state.refundApplyOrderNo = "";
      state.userMenuOpen = false;
      render();
      return;
    }
    if (action === "toggle-user") {
      state.userMenuOpen = !state.userMenuOpen;
      render();
    }
    if (action === "logout") {
      state.loggedIn = false;
      state.userMenuOpen = false;
      render();
    }
    if (action === "query") toast("查询完成，已加载示例数据");
    if (action === "reset-filter") toast("已清空查询条件", "warn");
    if (action === "download") toast("已生成下载任务");
    if (action === "toggle-store-summary-date") {
      const date = target.dataset.date;
      state.expandedStoreSummaryDates[date] = !state.expandedStoreSummaryDates[date];
      render({ preserveContentScroll: true });
      return;
    }
    if (action === "toggle-sales-report-row") {
      const key = `${target.dataset.report}:${target.dataset.key}`;
      state.expandedSalesReportRows[key] = !state.expandedSalesReportRows[key];
      render({ preserveContentScroll: true });
      return;
    }
    if (action === "toggle-reconcile-row") {
      const key = target.dataset.key;
      state.expandedReconcileRows[key] = !state.expandedReconcileRows[key];
      render({ preserveContentScroll: true });
      return;
    }
    if (action === "order-detail") {
      openOrderDetail(target.dataset.order, "", "交易管理", "订单查询");
      return;
    }
    if (action === "refund-detail") {
      openOrderDetail(target.dataset.order, target.dataset.refund, "退款管理", "退款查询");
      return;
    }
    if (action === "back-to-list") {
      backToDetailList();
      return;
    }
    if (action === "reset-quick-cashier") {
      state.quickCashierOrder = null;
      render();
      return;
    }
    if (action === "quick-cashier-pay") {
      showQuickCashierPayment();
      return;
    }
    if (action === "quick-cashier-view-order") {
      openOrderDetail(state.quickCashierOrder?.orderNo, "", "交易管理", "订单查询");
      return;
    }
    if (action === "insurance-qty") {
      updateInsuranceQty(target.dataset.code, Number(target.dataset.step));
      return;
    }
    if (action === "insurance-remove") {
      removeInsuranceProduct(target.dataset.code);
      return;
    }
    if (action === "insurance-presubmit") {
      preSubmitInsuranceOrder();
      return;
    }
    if (action === "insurance-pay") {
      payInsuranceOrder();
      return;
    }
    if (action === "insurance-reset") {
      state.insuranceCart = [];
      state.insuranceOrder = null;
      render();
      return;
    }
    if (action === "open-refund-apply") {
      if (state.activeMain === "退款管理" && state.activePage === "退款申请") {
        state.refundApplyOrderNo = target.dataset.order;
        render();
      } else {
        showRefundApply(target.dataset.order);
      }
      return;
    }
    if (action === "refund-apply-back") {
      state.refundApplyOrderNo = "";
      render();
      return;
    }
    if (action === "submit-refund") {
      submitRefund(target.dataset.order, app);
      return;
    }
    if (action === "refund-products-detail") {
      showRefundProductsDetail(target.dataset.refund);
      return;
    }
    if (action === "review-pass") reviewRefund(target.dataset.refund, true);
    if (action === "review-reject") reviewRefund(target.dataset.refund, false);
    if (action === "operator-form") showOperatorForm(target.dataset.user);
    if (action === "role-form") showRoleForm(target.dataset.role);
    if (action === "toggle-operator") toggleOperator(target.dataset.user);
    if (action === "change-password") changePassword();
  };

  app.onchange = (event) => {
    const target = event.target.closest("[data-action='insurance-price']");
    if (!target) return;
    updateInsurancePrice(target.dataset.code, target.value);
  };

  app.onkeydown = (event) => {
    const target = event.target.closest("[data-action='insurance-price']");
    if (!target || event.key !== "Enter") return;
    event.preventDefault();
    target.blur();
  };

  app.onsubmit = (event) => {
    const form = event.target.closest("form");
    if (!form) return;
    event.preventDefault();
    if (form.dataset.action === "quick-cashier") {
      submitQuickCashier(form);
      return;
    }
    if (form.dataset.action === "insurance-search") {
      showInsuranceProductPicker(form.elements.keyword.value.trim());
      return;
    }
    if (form.dataset.action !== "login") return;
    const account = form.elements.account.value.trim();
    state.username = account || "liu";
    state.loggedIn = true;
    state.activeMain = "首页";
    state.activePage = "首页";
    render();
    toast("登录成功");
  };

  modalRoot.onclick = (event) => {
    const target = event.target.closest("button");
    if (!target) {
      if (event.target.dataset.closeModal !== undefined) closeModal();
      return;
    }
    if (target.dataset.closeModal !== undefined) closeModal();
    if (target.dataset.action === "submit-refund") submitRefund(target.dataset.order);
    if (target.dataset.action === "quick-cashier-paid") completeQuickCashierPayment();
    if (target.dataset.action === "quick-cashier-cancel") {
      closeModal();
      toast("已取消本次支付", "warn");
    }
    if (target.dataset.action === "add-insurance-product") addInsuranceProduct(target.dataset.code);
    if (target.dataset.action === "insurance-paid") completeInsurancePayment();
    if (target.dataset.action === "save-operator") saveOperator(target.dataset.user);
    if (target.dataset.action === "save-role") saveRole(target.dataset.role);
  };

  document.onkeydown = (event) => {
    if (event.key === "Escape" && modalRoot.innerHTML) closeModal();
  };
}

function submitQuickCashier(form) {
  clearFieldErrors(app);
  const amountText = fieldValue("#quickAmount", app);
  const amount = Number(amountText);
  const remark = fieldValue("#quickRemark", app);
  if (!amountText || Number.isNaN(amount) || amount <= 0) showFieldError("#quickAmount", "请输入大于 0 的收款金额", app);
  if (amount > 999999.99) showFieldError("#quickAmount", "单笔收款金额不能超过 999999.99 元", app);
  if (app.querySelector(".field.error")) {
    focusFirstError(app);
    return;
  }
  const orderNo = `M20260423${String(Date.now()).slice(-8)}`;
  state.quickCashierOrder = {
    orderNo,
    date: "2026-04-23",
    amount,
    remark,
    status: "待支付",
  };
  render();
  toast("订单已提交，请确认支付");
}

function showQuickCashierPayment() {
  const order = state.quickCashierOrder;
  if (!order) return;
  openModal(
    "收钱吧倍赞提示",
    `<div class="payment-state">
      <div class="payment-icon">?</div>
      <div>
        <strong>支付中...</strong>
        <p>订单金额 ${yuan(order.amount)} 元，请根据收银设备或支付结果确认订单状态。</p>
      </div>
    </div>`,
    `<button class="btn primary" data-action="quick-cashier-paid">支付完成</button><button class="btn" data-action="quick-cashier-cancel">支付取消</button>`
  );
}

function completeQuickCashierPayment() {
  const order = state.quickCashierOrder;
  if (!order) return;
  state.quickCashierOrder = { ...order, status: "支付成功" };
  if (!orders.some((item) => item.orderNo === order.orderNo)) {
    orders.unshift({
      seq: orders.length + 1,
      merchantNo: "EQB2900200021",
      merchant: "博悠",
      storeNo: "LPK001",
      store: "月头礼品卡",
      area: "上海片区",
      time: "2026-04-23 19:37:43",
      orderNo: order.orderNo,
      platformNo: `S${String(Date.now()).slice(-7)}`,
      amount: order.amount,
      type: "收款",
      status: "支付成功",
      payWay: "快速收款",
      success: true,
      refundable: order.amount,
      products: [{ code: "-", name: order.remark || "购物", approval: "-", category: "-", spec: "-", unit: "-", price: order.amount, qty: 1 }],
      payDetail: { channelFlow: order.orderNo, channelOrder: "无" },
    });
  }
  closeModal();
  render();
  toast("支付完成，订单已入账");
}

function showInsuranceProductPicker(keyword = "") {
  const normalized = keyword.trim().toLowerCase();
  const rows = insuranceProducts.filter((item) => {
    if (!normalized) return true;
    return [item.code, item.name, item.spec, item.price, item.approval, item.category].some((value) => String(value).toLowerCase().includes(normalized));
  });
  openModal(
    "选择保险卡商品",
    `<div class="insurance-picker">
      ${renderPlainTable(
        [
          { title: "商品编号", key: "code" },
          { title: "名称", key: "name" },
          { title: "规格", key: "spec" },
          { title: "单价", key: "price", amount: true },
          { title: "操作", action: true, render: (row) => `<button class="btn link" data-action="add-insurance-product" data-code="${row.code}">添加</button>` },
        ],
        rows,
        { className: "insurance-picker-table" }
      )}
    </div>`,
    `<button class="btn" data-close-modal>关闭</button>`
  );
}

function addInsuranceProduct(code) {
  const product = insuranceProducts.find((item) => item.code === code);
  if (!product) return;
  const existing = state.insuranceCart.find((item) => item.code === code);
  if (existing) {
    state.insuranceCart = state.insuranceCart.map((item) => (item.code === code ? { ...item, qty: item.qty + 1 } : item));
  } else {
    state.insuranceCart = [...state.insuranceCart, { ...product, qty: 1 }];
  }
  state.insuranceOrder = null;
  closeModal();
  render();
  toast("商品已添加");
}

function updateInsuranceQty(code, step) {
  state.insuranceCart = state.insuranceCart
    .map((item) => (item.code === code ? { ...item, qty: Math.max(1, item.qty + step) } : item))
    .filter((item) => item.qty > 0);
  state.insuranceOrder = null;
  render({ preserveContentScroll: true });
}

function updateInsurancePrice(code, value) {
  const price = Number(value);
  if (!value || Number.isNaN(price) || price <= 0) {
    toast("请输入大于 0 的单价", "warn");
    render({ preserveContentScroll: true });
    return;
  }
  if (price > 999999.99) {
    toast("单价不能超过 999999.99 元", "warn");
    render({ preserveContentScroll: true });
    return;
  }
  state.insuranceCart = state.insuranceCart.map((item) => (item.code === code ? { ...item, price } : item));
  state.insuranceOrder = null;
  render({ preserveContentScroll: true });
}

function removeInsuranceProduct(code) {
  state.insuranceCart = state.insuranceCart.filter((item) => item.code !== code);
  state.insuranceOrder = null;
  render({ preserveContentScroll: true });
  toast("商品已删除", "warn");
}

function preSubmitInsuranceOrder() {
  if (!state.insuranceCart.length) {
    toast("请先添加商品", "warn");
    return;
  }
  const amount = insuranceCartTotal();
  state.insuranceOrder = {
    orderNo: `BX20260423${String(Date.now()).slice(-8)}`,
    date: "2026-04-23 20:15:46",
    amount,
    status: "待支付",
  };
  render({ preserveContentScroll: true });
  openModal(
    "预提交完成",
    `<div class="insurance-order-tip">
      <h4>预提交完成</h4>
      <p>单号：${escapeHtml(state.insuranceOrder.orderNo)}，金额：${yuan(amount)}</p>
      <p class="emphasis">订单已更新为可支付状态，请直接进行支付</p>
    </div>`,
    `<button class="btn primary" data-close-modal>知道了</button>`
  );
}

function payInsuranceOrder() {
  const order = state.insuranceOrder;
  if (!order || order.status !== "待支付") return;
  openModal(
    "正在支付",
    `<div class="payment-state insurance-paying">
      <div class="payment-icon">⌛</div>
      <div>
        <strong>正在支付，请稍候...</strong>
        <p>保险卡收款金额 ${yuan(order.amount)} 元。</p>
      </div>
    </div>`,
    `<button class="btn primary" data-action="insurance-paid">支付完成</button><button class="btn" data-close-modal>取消</button>`
  );
}

function completeInsurancePayment() {
  const order = state.insuranceOrder;
  if (!order) return;
  if (!orders.some((item) => item.orderNo === order.orderNo)) {
    orders.unshift({
      seq: orders.length + 1,
      merchantNo: "EQB2900200021",
      merchant: "博悠",
      storeNo: "LPK001",
      store: "月头礼品卡",
      area: "上海片区",
      time: "2026-04-23 20:15:46",
      orderNo: order.orderNo,
      platformNo: `BX${String(Date.now()).slice(-7)}`,
      amount: order.amount,
      type: "收款",
      status: "支付成功",
      payWay: "保险卡",
      success: true,
      refundable: order.amount,
      products: state.insuranceCart.map((item) => ({
        code: item.code,
        name: item.name,
        approval: item.approval,
        category: item.category,
        spec: item.spec,
        unit: item.unit,
        price: item.price,
        qty: item.qty,
      })),
      payDetail: { channelFlow: order.orderNo, channelOrder: "无" },
    });
  }
  state.insuranceCart = [];
  state.insuranceOrder = null;
  closeModal();
  render();
  toast("保险卡支付完成，已清空本次商品");
}

function showRefundProductsDetail(refundId) {
  const refund = refunds.find((item) => item.id === refundId);
  if (!refund) return;
  const order = orders.find((item) => item.orderNo === refund.orderNo);
  const products = order?.products?.length
    ? order.products.map((product, index) => ({
        ...product,
        index: index + 1,
        refundQty: product.qty,
        amount: Number(product.price) * Number(product.qty),
      }))
    : [
        {
          index: 1,
          code: "-",
          name: refund.products,
          approval: "-",
          category: "-",
          spec: "-",
          unit: "-",
          price: refund.amount,
          refundQty: 1,
          amount: refund.amount,
        },
      ];
  const refundInfo = [
    ["退款单号", refund.id],
    ["商户订单号", refund.orderNo],
    ["商户订单日期", refund.orderDate],
    ["平台订单号", refund.platformNo || "-"],
    ["退款金额(元)", yuan(refund.amount)],
    ["退款状态", refund.status],
    ["退款方式", refund.way],
    ["申请时间", refund.applyTime],
  ];
  openModal(
    "退款商品详情",
    `<div class="refund-products-modal">
      ${renderDetailGrid(refundInfo)}
      ${renderPlainTable(
        [
          { title: "序号", key: "index" },
          { title: "商品编号", key: "code" },
          { title: "商品名称", key: "name", ellipsis: true },
          { title: "批准文号", key: "approval" },
          { title: "商品类型", key: "category" },
          { title: "规格", key: "spec" },
          { title: "单位", key: "unit" },
          { title: "单价", key: "price", amount: true },
          { title: "退款数量", key: "refundQty" },
          { title: "小计", key: "amount", amount: true },
        ],
        products,
        { className: "refund-product-table" }
      )}
    </div>`,
    `<button class="btn primary" data-close-modal>确定</button>`
  );
}

function refundInitialStatus() {
  return "退款申请成功（审核中）";
}

function submitRefund(orderNo, root = modalRoot) {
  const order = orders.find((item) => item.orderNo === orderNo);
  if (!order) return;
  clearFieldErrors(root);
  const amountText = fieldValue("#refundAmount", root);
  const amount = Number(amountText || order.refundable);
  const way = "人工审核退款";
  const reason = fieldValue("#refundReason", root);
  if (!amountText || Number.isNaN(amount) || amount <= 0) showFieldError("#refundAmount", "请输入大于 0 的退款金额", root);
  if (amount > Number(order.refundable)) showFieldError("#refundAmount", `退款金额不能超过可退金额 ${yuan(order.refundable)}`, root);
  if (!reason) showFieldError("#refundReason", "请填写退款原因", root);
  if (root.querySelector(".field.error")) {
    focusFirstError(root);
    return;
  }
  refunds.unshift({
    id: `RF${Date.now()}`,
    merchantNo: order.merchantNo,
    merchant: order.merchant,
    store: order.store,
    orderNo: order.orderNo,
    orderDate: order.time.slice(0, 10),
    platformNo: order.platformNo,
    platformDate: order.time.slice(0, 10),
    amount,
    status: refundInitialStatus(),
    way,
    applyTime: "2026-04-23 21:16:16",
    applicant: state.username,
    reason,
    products: order.products.map((p) => p.name).join("、"),
  });
  if (root === modalRoot) closeModal();
  state.refundApplyOrderNo = "";
  state.activeMain = "退款管理";
  state.activePage = "退款查询";
  render();
  toast("退款申请已提交");
}

function reviewRefund(id, pass) {
  const targets = id ? refunds.filter((item) => item.id === id && isManualReviewRefund(item)) : refunds.filter(isManualReviewRefund);
  if (!targets.length) {
    toast("暂无待复核退款", "warn");
    return;
  }
  const message = id ? (pass ? "确认退款吗？" : "确认取消退款吗？") : pass ? `确认通过选中的 ${targets.length} 笔退款审核？` : `确认取消选中的 ${targets.length} 笔退款申请？`;
  if (!window.confirm(message)) return;
  const targetIds = new Set(targets.map((item) => item.id));
  refunds = refunds.map((item) => (targetIds.has(item.id) ? { ...item, status: pass ? "退款审核成功（退款中）" : "退款审核失败（退款失败）" } : item));
  render();
  toast(pass ? "退款审核成功" : "已取消退款申请", pass ? "" : "warn");
}

function saveOperator(id) {
  clearFieldErrors(modalRoot);
  const name = fieldValue("#opName", modalRoot);
  const phone = fieldValue("#opPhone", modalRoot);
  if (!name) showFieldError("#opName", "请输入操作员姓名", modalRoot);
  if (!/^1\d{10}$/.test(phone)) showFieldError("#opPhone", "请输入 11 位手机号", modalRoot);
  if (modalRoot.querySelector(".field.error")) {
    focusFirstError(modalRoot);
    return;
  }
  const data = {
    id: id || `U${String(operators.length + 1).padStart(3, "0")}`,
    store: fieldValue("#opStore", modalRoot) || "月头礼品卡",
    name,
    phone,
    status: fieldValue("#opStatus", modalRoot) || "启用",
    createdAt: id ? operators.find((item) => item.id === id)?.createdAt : "2026-04-22 10:30",
    remark: fieldValue("#opRemark", modalRoot) || "-",
  };
  if (id) operators = operators.map((item) => (item.id === id ? data : item));
  else operators.unshift(data);
  closeModal();
  render();
  toast("操作员已保存");
}

function saveRole(id) {
  clearFieldErrors(modalRoot);
  const name = fieldValue("#roleName", modalRoot);
  if (!name) showFieldError("#roleName", "请输入角色名称", modalRoot);
  if (modalRoot.querySelector(".field.error")) {
    focusFirstError(modalRoot);
    return;
  }
  const data = {
    id: id || `R${String(roles.length + 1).padStart(3, "0")}`,
    name,
    users: id ? roles.find((item) => item.id === id)?.users || 0 : 0,
    desc: fieldValue("#roleDesc", modalRoot) || "-",
    status: fieldValue("#roleStatus", modalRoot) || "启用",
  };
  if (id) roles = roles.map((item) => (item.id === id ? data : item));
  else roles.unshift(data);
  closeModal();
  render();
  toast("角色已保存");
}

function toggleOperator(id) {
  operators = operators.map((item) => (item.id === id ? { ...item, status: item.status === "启用" ? "停用" : "启用" } : item));
  render();
  toast("操作员状态已更新");
}

function changePassword() {
  clearFieldErrors(app);
  const oldPwd = fieldValue("#oldPwd", app);
  const next = fieldValue("#newPwd", app);
  const confirm = fieldValue("#confirmPwd", app);
  if (!oldPwd) showFieldError("#oldPwd", "请输入原密码", app);
  if (!next) showFieldError("#newPwd", "请输入新密码", app);
  if (next && next.length < 6) showFieldError("#newPwd", "新密码至少 6 位", app);
  if (!confirm) showFieldError("#confirmPwd", "请再次输入新密码", app);
  if (next && confirm && next !== confirm) showFieldError("#confirmPwd", "两次输入的新密码不一致", app);
  if (app.querySelector(".field.error")) {
    focusFirstError(app);
    return;
  }
  toast("个人登录密码已修改");
}

render();
