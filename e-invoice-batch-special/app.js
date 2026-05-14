const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");
const toastRoot = document.querySelector("#toast-root");

const BUSINESS_TYPES = {
  NONE: "不涉及",
  REAL_ESTATE_LEASE: "不动产租赁",
  JEWELRY: "金银首饰",
  REFINED_OIL: "成品油",
};

const state = {
  view: "list",
  filterType: "ALL",
  taskTab: "pending",
  processedSubtab: "ALL",
  currentTaskId: "186247790353",
  currentApplicationId: "99001",
  modalBusinessType: "",
};

const tasks = [
  {
    id: "186247790353",
    createTime: "2026-05-12 09:57:13",
    taskType: "批量开具蓝字发票",
    businessType: "REAL_ESTATE_LEASE",
    desc: "2026年05月12日不动产租赁批量开票",
    imported: 12,
    pending: 3,
    voided: 0,
    processed: 9,
    success: 9,
    failed: 0,
    processing: 0,
    status: "处理中",
    creator: "集团老一",
    step: "upload",
  },
  {
    id: "186247733760",
    createTime: "2025-12-16 15:09:52",
    taskType: "批量开具蓝字发票",
    businessType: "NONE",
    desc: "2025年12月16日批量开票-2",
    imported: 9,
    pending: 0,
    voided: 0,
    processed: 9,
    success: 9,
    failed: 0,
    processing: 0,
    status: "处理完成",
    creator: "Ying.Wang6@burberry.com",
    step: "done",
  },
  {
    id: "186247805118",
    createTime: "2026-05-13 10:21:08",
    taskType: "批量开具蓝字发票",
    businessType: "JEWELRY",
    desc: "2026年05月13日金银首饰批量开票",
    imported: 0,
    pending: 0,
    voided: 0,
    processed: 0,
    success: 0,
    failed: 0,
    processing: 0,
    status: "待导入",
    creator: "集团老一",
    step: "upload",
  },
  {
    id: "186247805299",
    createTime: "2026-05-13 11:08:41",
    taskType: "批量开具蓝字发票",
    businessType: "REFINED_OIL",
    desc: "2026年05月13日成品油批量开票",
    imported: 0,
    pending: 0,
    voided: 0,
    processed: 0,
    success: 0,
    failed: 0,
    processing: 0,
    status: "待导入",
    creator: "集团老一",
    step: "upload",
  },
];

const applications = [
  {
    id: "99001",
    taskId: "186247790353",
    status: "待处理",
    amount: "¥10,000.00",
    invoiceType: "专票",
    buyer: "上海收钱吧科技有限公司",
    buyerTaxNo: "9131000066935277XR",
    seller: "上海收钱吧科技有限公司",
    sellerTaxNo: "9131000066935277XR",
    invoiceNo: "-",
    invoiceStatus: "-",
    businessType: "REAL_ESTATE_LEASE",
  },
  {
    id: "99002",
    taskId: "186247790353",
    status: "待处理",
    amount: "¥8,520.00",
    invoiceType: "专票",
    buyer: "嘉兴市新金陵钟表眼镜有限公司",
    buyerTaxNo: "91316666662712345",
    seller: "上海收钱吧科技有限公司",
    sellerTaxNo: "9131000066935277XR",
    invoiceNo: "-",
    invoiceStatus: "-",
    businessType: "REAL_ESTATE_LEASE",
  },
  {
    id: "99011",
    taskId: "186247733760",
    status: "开票成功",
    amount: "¥8,030.00",
    invoiceType: "普票",
    buyer: "张芳霞",
    buyerTaxNo: "-",
    seller: "博柏利（上海）贸易有限公司",
    sellerTaxNo: "9131000066935277XR",
    invoiceNo: "25312000000415915039",
    invoiceStatus: "开票成功",
    businessType: "NONE",
  },
  {
    id: "99012",
    taskId: "186247733760",
    status: "开票成功",
    amount: "¥8,135.00",
    invoiceType: "普票",
    buyer: "林芯慧",
    buyerTaxNo: "-",
    seller: "博柏利（上海）贸易有限公司",
    sellerTaxNo: "9131000066935277XR",
    invoiceNo: "25312000000415914690",
    invoiceStatus: "开票成功",
    businessType: "NONE",
  },
];

const specialInfo = {
  REAL_ESTATE_LEASE: [
    ["产权证书/不动产权证号", "沪(2025)徐字第001234号"],
    ["不动产地址", "上海市徐汇区"],
    ["不动产详细地址", "漕溪北路88号2层201室"],
    ["租赁期起", "2026-05-01"],
    ["租赁期止", "2026-05-31"],
    ["跨地市标志", "否"],
    ["面积单位", "平方米"],
    ["车牌号", ""],
  ],
  JEWELRY: [["子业务类型", "零售"]],
  REFINED_OIL: [
    ["加油站点", "上海徐汇漕溪北路站"],
    ["交易时间", "2026-05-13 10:35:21"],
    ["油枪号", "06"],
  ],
};

function currentTask() {
  return tasks.find((task) => task.id === state.currentTaskId) || tasks[0];
}

function currentApplication() {
  return applications.find((item) => item.id === state.currentApplicationId) || applications[0];
}

function businessLabel(type) {
  return BUSINESS_TYPES[type] || "不涉及";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  app.innerHTML = `
    <header class="topbar">
      <img class="topbar-logo" src="../assets/shouqianba-yellow.png" alt="收钱吧" />
      <nav class="topnav" aria-label="主导航">
        <button class="topnav-item">首页</button>
        <button class="topnav-item active">电子发票</button>
        <button class="topnav-item">商场联营管理</button>
        <button class="topnav-item">管理功能</button>
      </nav>
      <div class="topbar-right">
        <span class="topbar-icon">⇧</span>
        <span class="topbar-separator"></span>
        <span>♙ 管理员</span>
        <span class="topbar-icon">文</span>
      </div>
    </header>
    <div class="shell">
      ${renderSidebar()}
      <main class="content">${renderPage()}</main>
    </div>
  `;
}

function renderSidebar() {
  return `
    <aside class="sidebar">
      <div class="side-caption">发票业务</div>
      <div class="side-section">
        <button class="side-main">发票管理 <span>⌄</span></button>
        <button class="side-main">纳税人管理 <span>⌄</span></button>
      </div>
      <div class="side-caption">场景功能</div>
      <div class="side-section">
        <button class="side-main">手动开票 <span>⌃</span></button>
        <button class="side-child active" data-nav="list">－ 批量开票</button>
        <button class="side-main">自营店结算开票 <span>⌄</span></button>
        <button class="side-main">联营店结算开票 <span>⌄</span></button>
        <button class="side-main">企业订单开票 <span>⌄</span></button>
      </div>
    </aside>
  `;
}

function renderPage() {
  if (state.view === "taskDetail") return renderTaskDetail();
  if (state.view === "appDetail") return renderApplicationDetail();
  if (state.view === "invoiceDetail") return renderInvoiceDetail();
  return renderTaskList();
}

function renderTaskList() {
  const rows = tasks.filter((task) => state.filterType === "ALL" || task.businessType === state.filterType);
  return `
    <div class="page-header">
      <div>
        <h1>批量开票</h1>
        <p>导入开票信息文件，批量开具发票</p>
      </div>
      <div class="header-actions">
        <button class="btn primary" data-action="open-create">批量开具蓝字发票</button>
        <button class="btn primary" disabled>批量开具红字发票</button>
      </div>
    </div>
    <section class="panel">
      <h2 class="panel-title">任务列表</h2>
      <div class="filter-grid">
        <div class="field"><label>创建时间</label><input placeholder="" /></div>
        <div class="field"><label>任务描述</label><input placeholder="" /></div>
        <div class="field">
          <label>任务状态</label>
          <select><option>全部</option><option>待导入</option><option>处理中</option><option>处理完成</option></select>
        </div>
        <div class="field">
          <label>特定业务类型</label>
          <select data-action="filter-business">
            ${["ALL", "NONE", "REAL_ESTATE_LEASE", "JEWELRY", "REFINED_OIL"].map((type) => `<option value="${type}" ${state.filterType === type ? "selected" : ""}>${type === "ALL" ? "全部" : businessLabel(type)}</option>`).join("")}
          </select>
        </div>
        <div class="filter-actions">
          <button class="btn text" data-action="clear-filter">清空条件</button>
          <button class="btn primary">搜索</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>创建时间</th><th>任务类型</th><th>特定业务类型</th><th>任务描述</th><th>已导入</th><th>待处理</th><th>已作废</th><th>已处理</th><th>任务状态</th><th>任务号</th><th>创建人</th><th class="action-cell">操作</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((task) => `
              <tr>
                <td>${task.createTime}</td>
                <td>${task.taskType}</td>
                <td><span class="tag ${task.businessType === "NONE" ? "" : "special"}">${businessLabel(task.businessType)}</span></td>
                <td>${task.desc}</td>
                <td>${task.imported}</td>
                <td>${task.pending}</td>
                <td>${task.voided}</td>
                <td>${task.processed}（成功：<span style="color:#237804">${task.success}</span>｜失败：<span style="color:#cf1322">${task.failed}</span>｜进行中：${task.processing}）</td>
                <td>${task.status}</td>
                <td>${task.id}</td>
                <td>${task.creator}</td>
                <td class="action-cell"><button class="btn link" data-action="view-task" data-task="${task.id}">查看</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderTaskDetail() {
  const task = currentTask();
  const hasImportedApplications = task.step === "done" || task.imported > 0 || task.pending > 0 || task.voided > 0 || task.processed > 0;
  return `
    <div class="breadcrumb">⌂ / 批量开票 / <strong>任务详情</strong></div>
    ${renderTaskSummary(task)}
    ${hasImportedApplications ? renderTaskApplications(task) : renderUploadFlow(task)}
  `;
}

function renderTaskSummary(task) {
  const specialItem = task.businessType === "NONE" ? "" : `
    <div>
      <div class="summary-label">特定业务类型</div>
      <div class="summary-value">${businessLabel(task.businessType)}</div>
    </div>`;
  return `
    <section class="summary-card">
      <div>
        <h2 class="panel-title">批量开票任务详情</h2>
        <div class="summary-grid">
          <div><div class="summary-label">创建时间</div><div class="summary-value">${task.createTime.slice(0, 16)}</div></div>
          <div><div class="summary-label">创建人</div><div class="summary-value">${task.creator}</div></div>
          <div><div class="summary-label">任务号</div><div class="summary-value">${task.id}</div></div>
          <div><div class="summary-label">任务类型</div><div class="summary-value">${task.taskType}</div></div>
          <div><div class="summary-label">任务描述</div><div class="summary-value">${task.desc}</div></div>
          ${specialItem}
        </div>
      </div>
      <div class="status-box">
        <span class="status-dot ${task.status === "处理完成" ? "success" : "processing"}">${task.status === "处理完成" ? "✓" : "…"}</span>
        <div class="status-title">${task.status}</div>
        <button class="btn">导入记录</button>
      </div>
    </section>
  `;
}

function renderUploadFlow(task) {
  const stepIndex = task.step === "check" ? 2 : task.step === "execute" ? 3 : 1;
  return `
    <section class="panel" style="padding:0">
      <div class="stepper">
        ${["上传文件", "检查文件", "执行"].map((label, index) => `<div class="step ${stepIndex === index + 1 ? "active" : ""}"><span class="num">${index + 1}</span>${label}</div>`).join("")}
      </div>
      ${task.step === "check" ? renderCheckStep(task) : task.step === "execute" ? renderExecuteStep(task) : renderUploadStep(task)}
    </section>
  `;
}

function renderUploadStep(task) {
  const type = businessLabel(task.businessType);
  const templateHint = task.businessType === "NONE"
    ? "下载导入模板，并根据模板提示完善内容"
    : `下载${type}业务导入模板，并根据模板提示完善内容`;
  return `
    <div class="upload-layout">
      <div class="upload-card">
        <div>1. ${templateHint}</div>
        <div class="template-line">
          <button class="btn">▣ 下载模板</button>
          <span class="hint">${task.businessType === "NONE" ? "当前任务不涉及特定业务" : `模板仅包含${type}所需字段和可用税收分类编码`}</span>
        </div>
      </div>
      <div class="upload-card">
        <div>2. 上传完善后的内容，支持扩展名：xlsx</div>
        <div class="upload-box">
          <div style="text-align:center">
            <div style="font-size:30px">▣</div>
            <button class="btn">选择文件</button>
            <p class="hint">下载模板并完善信息后，可直接将文件拖拽到此处进行上传</p>
          </div>
        </div>
      </div>
      <textarea class="control" style="height:52px;border:1px solid #d9d9d9;padding:10px" placeholder="请填写备注(非必填)"></textarea>
      <div class="footer-actions">
        <button class="btn primary" data-action="start-check" data-task="${task.id}">开始检查</button>
      </div>
    </div>
  `;
}

function renderCheckStep(task) {
  const hasError = task.businessType === "REFINED_OIL";
  return `
    <div class="upload-layout" style="max-width:980px">
      ${hasError ? `
        <div class="alert error">检查失败：第 4 行税收分类编码不属于成品油范围。请修改文件后重新上传。</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>行号</th><th>字段</th><th>问题</th><th>处理建议</th></tr></thead>
            <tbody>
              <tr><td>4</td><td>税收分类编码</td><td>编码不属于成品油允许范围</td><td>更换成品油税收分类编码或重新创建任务</td></tr>
            </tbody>
          </table>
        </div>
        <div class="footer-actions"><button class="btn" data-action="back-upload" data-task="${task.id}">返回上传</button></div>
      ` : `
        <div class="alert">检查通过：共识别 12 条开票申请，其中待处理 3 条，已处理 9 条。特定业务类型：${businessLabel(task.businessType)}。</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>检查项</th><th>结果</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td>任务特定业务类型</td><td><span class="tag special">${businessLabel(task.businessType)}</span></td><td>文件内容与任务类型一致</td></tr>
              <tr><td>税收分类编码范围</td><td>通过</td><td>均属于当前特定业务允许范围</td></tr>
              <tr><td>特定业务字段</td><td>通过</td><td>已识别结构化特定业务信息</td></tr>
            </tbody>
          </table>
        </div>
        <div class="footer-actions"><button class="btn primary" data-action="execute-import" data-task="${task.id}">生成待开票申请</button></div>
      `}
    </div>
  `;
}

function renderExecuteStep(task) {
  return `
    <div class="upload-layout" style="max-width:860px">
      <div class="alert">已生成待处理预开票申请。你可以进入待处理列表查看并确认开票。</div>
      <div class="footer-actions">
        <button class="btn primary" data-action="show-task-list" data-tab="pending" data-task="${task.id}">查看待处理申请</button>
      </div>
    </div>
  `;
}

function renderTaskApplications(task) {
  const taskApps = applications.filter((item) => item.taskId === task.id);
  const pending = taskApps.filter((item) => item.status === "待处理");
  const processed = taskApps.filter((item) => item.status !== "待处理");
  const rows = state.taskTab === "processed" ? processed : state.taskTab === "voided" ? [] : pending;
  return `
    <section class="panel" style="padding:0">
      <div class="tabs">
        <button class="tab ${state.taskTab === "pending" ? "active" : ""}" data-action="task-tab" data-tab="pending">待处理 (${pending.length})</button>
        <button class="tab ${state.taskTab === "voided" ? "active" : ""}" data-action="task-tab" data-tab="voided">已作废 (0)</button>
        <button class="tab ${state.taskTab === "processed" ? "active" : ""}" data-action="task-tab" data-tab="processed">已处理 (${processed.length})</button>
      </div>
      <div style="padding:28px">
        <div class="filter-grid" style="grid-template-columns:repeat(3,minmax(180px,1fr)) 180px">
          <div class="field"><label>序号</label><input /></div>
          <div class="field"><label>购买方名称</label><input /></div>
          <div class="field"><label>购买方税号</label><input /></div>
          <div class="filter-actions"><button class="btn text">清空条件</button><button class="btn primary">搜索</button></div>
        </div>
        ${state.taskTab === "processed" ? renderProcessedSubtabs(processed.length) : ""}
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>序号</th><th>价税合计</th><th>发票类型</th><th>购买方名称</th><th>购买方税号</th><th>销售方名称</th><th>销售方税号</th><th>${state.taskTab === "processed" ? "开票状态" : "特定业务类型"}</th><th>发票号码</th><th class="action-cell">操作</th></tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map((item, index) => `
                <tr>
                  <td>${index + 1}</td><td>${item.amount}</td><td>${item.invoiceType}</td><td>${item.buyer}</td><td>${item.buyerTaxNo}</td><td>${item.seller}</td><td>${item.sellerTaxNo}</td>
                  <td>${state.taskTab === "processed" ? item.invoiceStatus : `<span class="tag special">${businessLabel(item.businessType)}</span>`}</td>
                  <td>${item.invoiceNo}</td>
                  <td class="action-cell">
                    ${state.taskTab === "processed"
                      ? `<button class="btn link" data-action="view-invoice" data-app="${item.id}">详情</button> <button class="btn link">撤销</button> <button class="btn link">更多⌄</button>`
                      : `<button class="btn link" data-action="open-invoice" data-app="${item.id}">开票</button> <button class="btn link danger">作废</button> <button class="btn link" data-action="view-application" data-app="${item.id}">详情</button>`}
                  </td>
                </tr>
              `).join("") : `<tr><td colspan="10" style="text-align:center;color:#aaa;height:180px">暂无数据</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderProcessedSubtabs(total) {
  const tabs = ["全部", "开票成功", "开票失败", "开票中", "已撤销", "撤销失败", "撤销中"];
  return `<div class="subtabs">${tabs.map((tab, index) => `<button class="subtab ${index === 0 ? "active" : ""}">${tab} (${index === 0 ? total : index === 1 ? total : 0})</button>`).join("")}</div>`;
}

function renderApplicationDetail() {
  const item = currentApplication();
  const type = item.businessType;
  const special = type !== "NONE";
  return `
    <div class="breadcrumb">⌂ / 批量开票 / 待开票申请详情</div>
    <section class="summary-card">
      <div>
        <h2 class="panel-title">待开票申请</h2>
        <div class="summary-grid">
          <div><div class="summary-label">创建时间</div><div class="summary-value">2026-05-12 10:08</div></div>
          <div><div class="summary-label">序号</div><div class="summary-value">${item.id}</div></div>
          <div><div class="summary-label">价税合计</div><div class="summary-value">${item.amount}</div></div>
          <div><div class="summary-label">发票类型</div><div class="summary-value">${item.invoiceType}</div></div>
          ${special ? `<div><div class="summary-label">特定业务类型</div><div class="summary-value">${businessLabel(type)}</div></div>` : ""}
        </div>
      </div>
      <div class="status-box"><div class="status-title">待处理</div></div>
    </section>
    <section class="invoice-shell">
      <h2 class="invoice-title">电子发票（增值税专用发票）</h2>
      <div class="invoice-grid">
        <div class="buyer-box">
          <h3 class="box-title">购买方信息</h3>
          ${renderFormRow("名称", item.buyer, true)}
          ${renderFormRow("统一社会信用代码/纳税人识别号", item.buyerTaxNo, true)}
          ${renderFormRow("地址", "浙江省嘉兴市XXXXXXXXXXXXXX")}
          ${renderFormRow("电话", "1384782718348")}
          ${renderFormRow("开户银行", "上海银行杨思支行")}
          ${renderFormRow("银行账户", "4858738475884929")}
        </div>
        <div class="seller-box">
          <h3 class="box-title">销售方信息</h3>
          <p>名称：${item.seller}</p>
          <p>统一社会信用代码/纳税人识别号：${item.sellerTaxNo}</p>
          <p>地址：浙江省嘉兴市XXXXXXXXXXXXXX</p>
          <p>电话：1384782718348</p>
          <p>开户银行：上海银行杨思支行</p>
          <p>银行账户：4858738475884929</p>
        </div>
      </div>
      ${renderGoodsTable(type)}
      <div class="remark-section">
        <h3 class="section-title">备注信息</h3>
        <textarea placeholder="导入模板里填写的备注"></textarea>
        <div class="checkbox-line">
          <label><input type="checkbox" /> 展示购买方地址、电话</label>
          <label><input type="checkbox" /> 展示购买方银行账户、开户银行</label>
          <label><input type="checkbox" /> 展示销售方地址、电话</label>
          <label><input type="checkbox" /> 展示销售方银行账户、开户银行</label>
        </div>
      </div>
      ${special ? renderSpecialSection(type) : ""}
      <div class="delivery-section">
        <h3 class="section-title">发票交付</h3>
        <div class="delivery-grid">
          <div class="form-row"><label>接收邮箱</label><input class="control" value="sk6219@163.com" /></div>
          <div class="form-row"><label></label><input class="control" placeholder="请输入" /></div>
          <button class="btn" style="width:220px;margin-left:122px">＋ 添加接收邮箱</button>
        </div>
      </div>
      <div class="footer-actions">
        <button class="btn">作废</button>
        <button class="btn primary" data-action="confirm-invoice" data-app="${item.id}">确认开票</button>
      </div>
    </section>
  `;
}

function renderFormRow(label, value, required = false) {
  return `<div class="form-row"><label>${required ? `<span class="required">*</span>` : ""}${label}</label><input class="control" value="${escapeHtml(value)}" /></div>`;
}

function renderGoodsTable(type) {
  const code = type === "REAL_ESTATE_LEASE" ? "3040502020200000000" : type === "JEWELRY" ? "1060509010000000000" : type === "REFINED_OIL" ? "1070101010100000000" : "1060512990000000000";
  const name = type === "REAL_ESTATE_LEASE" ? "*经营租赁*车辆停放服务" : type === "JEWELRY" ? "*金银珠宝首饰*黄金项链" : type === "REFINED_OIL" ? "*成品油*汽油" : "*钟表*Calvin Klein 手表零件";
  return `
    <div class="goods-section">
      <h3 class="box-title">商品信息</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>项目名称</th><th>税收分类编码</th><th>规格型号</th><th>单位</th><th>数量</th><th>单价</th><th>金额</th><th>税率/征收率</th><th>税额</th></tr></thead>
          <tbody>
            <tr><td>${name}</td><td>${code}</td><td>-</td><td>${type === "REFINED_OIL" ? "升" : "件"}</td><td>1</td><td>¥8,849.56</td><td>¥8,849.56</td><td>13%</td><td>¥1,150.44</td></tr>
            <tr><td colspan="6" style="text-align:center">合计</td><td>¥8,849.56</td><td></td><td>¥1,150.44</td></tr>
            <tr><td colspan="6" style="text-align:center">价税合计(大写)</td><td colspan="3">壹万元整　（小写）¥10,000.00</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSpecialSection(type) {
  return `
    <div class="special-section">
      <h3 class="section-title">特定业务信息</h3>
      <div class="special-grid">
        ${specialInfo[type].map(([label, value]) => `
          <div class="field">
            <label>${label}</label>
            ${label === "子业务类型"
              ? `<select><option ${value === "零售" ? "selected" : ""}>零售</option><option ${value === "批发" ? "selected" : ""}>批发</option></select>`
              : `<input value="${escapeHtml(value)}" />`}
          </div>
        `).join("")}
      </div>
      <p class="hint">这些字段最终会参与特定业务要素传参，并在发票备注中承接展示；不需要手工拼接到普通备注文本中。</p>
    </div>
  `;
}

function renderProcessedRemark(item) {
  if (item.businessType === "NONE") return "";
  const fields = specialInfo[item.businessType] || [];
  const rows = fields
    .filter(([, value]) => value)
    .map(([label, value]) => `<div><span>${escapeHtml(label)}：</span>${escapeHtml(value)}</div>`)
    .join("");
  return `
    <div class="invoice-remark-content">
      <div class="invoice-remark-title">特定业务信息：${businessLabel(item.businessType)}</div>
      <div class="invoice-remark-fields">${rows}</div>
    </div>
  `;
}

function renderInvoiceDetail() {
  const item = currentApplication();
  return `
    <div class="breadcrumb">⌂ / 批量开票 / 任务详情 / <strong>开票任务</strong></div>
    <section class="summary-card">
      <div>
        <h2 class="panel-title">开票任务</h2>
        <div class="summary-grid">
          <div><div class="summary-label">创建时间</div><div class="summary-value">2025-12-16 15:15</div></div>
          <div><div class="summary-label">序号</div><div class="summary-value">1</div></div>
          <div><div class="summary-label">价税合计</div><div class="summary-value">${item.amount}</div></div>
          <div><div class="summary-label">发票类型</div><div class="summary-value">${item.invoiceType}</div></div>
        </div>
      </div>
      <div class="status-box"><div class="status-title" style="color:#38a01d">开票成功</div></div>
    </section>
    <section class="panel">
      <div class="inline-actions" style="justify-content:space-between;margin-bottom:22px">
        <div>
          <strong>蓝票开具成功</strong>
          <div class="hint">申请号：182247701466 ｜ 发票号码：${item.invoiceNo} ｜ 价税合计：${item.amount} ｜ 开票日期：2025-12-16</div>
        </div>
        <button class="btn primary">撤销</button>
      </div>
      <div class="processed-invoice">
        <div class="invoice-meta"><span>发票号码：${item.invoiceNo}</span><span>开票日期：2025-12-16</span></div>
        <h2>电子发票（普通发票）</h2>
        <table class="red-table">
          <tbody>
            <tr><td style="width:52px">购买方信息</td><td>名称：${item.buyer}<br />统一社会信用代码/纳税人识别号：${item.buyerTaxNo}</td><td style="width:52px">销售方信息</td><td>名称：${item.seller}<br />统一社会信用代码/纳税人识别号：${item.sellerTaxNo}</td></tr>
          </tbody>
        </table>
        <table class="red-table">
          <thead><tr><th>项目名称</th><th>规格型号</th><th>单位</th><th>数量</th><th>单价</th><th>金额</th><th>税率/征收率</th><th>税额</th></tr></thead>
          <tbody>
            <tr><td>*皮革毛皮制品*BURBERRY女包</td><td>80816941</td><td>件</td><td>1</td><td>¥5,867.26</td><td>¥5,867.26</td><td>13%</td><td>¥762.74</td></tr>
            <tr><td>*鞋*BURBERRY男运动鞋</td><td>80888271007</td><td>双</td><td>1</td><td>¥1,238.94</td><td>¥1,238.94</td><td>13%</td><td>¥161.06</td></tr>
            <tr><td colspan="5" style="text-align:center">合计</td><td>¥7,106.20</td><td></td><td>¥923.80</td></tr>
            <tr><td colspan="4" style="text-align:center">价税合计(大写)</td><td colspan="4">捌仟零叁拾元　（小写）${item.amount}</td></tr>
            <tr><td>备注</td><td colspan="7" class="invoice-remark-cell">${renderProcessedRemark(item)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="delivery-section">
        <h3 class="section-title">发票交付</h3>
        <p>接收邮箱</p>
        <p>602000593@qq.com</p>
      </div>
      <div class="footer-actions" style="justify-content:flex-end">
        <button class="btn primary">发送发票 ✉</button>
        <button class="btn primary">下载发票⌄</button>
      </div>
    </section>
  `;
}

function openCreateModal() {
  state.modalBusinessType = "";
  modalRoot.innerHTML = `
    <div class="modal-mask" data-close-modal>
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div class="modal-title">创建批量开具蓝字发票任务</div>
          <button class="close-btn" data-close-modal>×</button>
        </div>
        <div class="modal-body">
          <p class="hint" style="margin-top:0">创建批量开票任务后，即可导入待开票信息</p>
          <div class="field" style="margin-bottom:18px">
            <label><span class="required">*</span>任务描述</label>
            <textarea id="task-desc">2026年05月13日批量开具蓝字发票</textarea>
          </div>
          <div class="field">
            <label>特定业务类型</label>
            <select data-action="modal-business-type">
              <option value="">仅在开具特定业务发票时需选择</option>
              ${["REAL_ESTATE_LEASE", "JEWELRY", "REFINED_OIL"].map((type) => `
                <option value="${type}">${businessLabel(type)}</option>
              `).join("")}
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" data-close-modal>取消</button>
          <button class="btn primary" data-action="create-task">开始导入</button>
        </div>
      </div>
    </div>
  `;
}

function closeModal() {
  modalRoot.innerHTML = "";
}

function toast(message) {
  toastRoot.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`;
  window.setTimeout(() => {
    toastRoot.innerHTML = "";
  }, 1800);
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action], [data-close-modal], [data-nav]");
  if (!target) return;

  if (target.dataset.closeModal !== undefined) {
    closeModal();
    return;
  }
  if (target.dataset.nav === "list") {
    state.view = "list";
    render();
    return;
  }
  const action = target.dataset.action;
  if (action === "open-create") openCreateModal();
  if (action === "create-task") {
    const newTask = {
      id: String(186247900000 + tasks.length),
      createTime: "2026-05-13 14:30:00",
      taskType: "批量开具蓝字发票",
      businessType: state.modalBusinessType || "NONE",
      desc: modalRoot.querySelector("#task-desc").value || "批量开具蓝字发票",
      imported: 0,
      pending: 0,
      voided: 0,
      processed: 0,
      success: 0,
      failed: 0,
      processing: 0,
      status: "待导入",
      creator: "管理员",
      step: "upload",
    };
    tasks.unshift(newTask);
    state.currentTaskId = newTask.id;
    state.view = "taskDetail";
    closeModal();
    render();
    toast("任务已创建");
  }
  if (action === "view-task") {
    state.currentTaskId = target.dataset.task;
    state.view = "taskDetail";
    state.taskTab = "pending";
    render();
  }
  if (action === "filter-business") {
    state.filterType = target.value;
    render();
  }
  if (action === "clear-filter") {
    state.filterType = "ALL";
    render();
  }
  if (action === "start-check") {
    const task = tasks.find((item) => item.id === target.dataset.task);
    task.step = "check";
    render();
  }
  if (action === "back-upload") {
    const task = tasks.find((item) => item.id === target.dataset.task);
    task.step = "upload";
    render();
  }
  if (action === "execute-import") {
    const task = tasks.find((item) => item.id === target.dataset.task);
    task.step = "execute";
    task.status = "处理中";
    render();
  }
  if (action === "show-task-list") {
    const task = tasks.find((item) => item.id === target.dataset.task);
    task.step = "done";
    task.imported = Math.max(task.imported, 12);
    task.pending = Math.max(task.pending, 3);
    task.processed = Math.max(task.processed, 9);
    state.taskTab = target.dataset.tab;
    render();
  }
  if (action === "task-tab") {
    state.taskTab = target.dataset.tab;
    render();
  }
  if (action === "view-application") {
    state.currentApplicationId = target.dataset.app;
    state.view = "appDetail";
    render();
  }
  if (action === "open-invoice") {
    state.currentApplicationId = target.dataset.app;
    state.view = "appDetail";
    render();
  }
  if (action === "confirm-invoice") {
    const item = applications.find((appItem) => appItem.id === target.dataset.app);
    item.status = "开票成功";
    item.invoiceStatus = "开票成功";
    item.invoiceNo = "253120000004159" + item.id.slice(-4);
    state.view = "invoiceDetail";
    render();
    toast("开票成功");
  }
  if (action === "view-invoice") {
    state.currentApplicationId = target.dataset.app;
    state.view = "invoiceDetail";
    render();
  }
});

document.addEventListener("change", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  if (target.dataset.action === "filter-business") {
    state.filterType = target.value;
    render();
  }
  if (target.dataset.action === "modal-business-type") {
    state.modalBusinessType = target.value;
  }
});

render();
