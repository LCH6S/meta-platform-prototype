const ORDER_QUERY_DEMO_DATE = "2026-06-12";
const ORDER_QUERY_DEFAULT_DAYS = 10;
const ORDER_QUERY_MAX_RANGE_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateParts(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const check = new Date(timestamp);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { year, month, day, timestamp };
}

function formatDateParts(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addUtcDays(dateText, days) {
  const parts = parseDateParts(dateText);
  if (!parts) return "";
  return formatDateParts(new Date(parts.timestamp + days * DAY_MS));
}

function splitQueryDateTime(value) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})\s(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return { date: "", time: "", second: "00" };
  return { date: match[1], time: `${match[2]}:${match[3]}`, second: match[4] || "00" };
}

function queryDateTimeTimestamp(value) {
  const { date, time, second } = splitQueryDateTime(value);
  const parts = parseDateParts(date);
  const timeMatch = time.match(/^(\d{2}):(\d{2})$/);
  if (!parts || !timeMatch) return Number.NaN;
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const seconds = Number(second);
  if (
    hour < 0
    || hour > 24
    || minute < 0
    || minute > 59
    || seconds < 0
    || seconds > 59
    || (hour === 24 && (minute !== 0 || seconds !== 0))
  ) return Number.NaN;
  return parts.timestamp + ((hour * 60 + minute) * 60 + seconds) * 1000;
}

function formatQueryDateTimeTimestamp(timestamp) {
  const date = new Date(timestamp);
  return `${formatDateParts(date)} ${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function inclusiveDateSpanDays(range) {
  const start = parseDateParts(splitQueryDateTime(range?.start).date);
  const end = parseDateParts(splitQueryDateTime(range?.end).date);
  if (!start || !end) return 0;
  return Math.floor((end.timestamp - start.timestamp) / DAY_MS) + 1;
}

function validateOrderDateRange(range, maxDays = ORDER_QUERY_MAX_RANGE_DAYS) {
  const startValue = String(range?.start || "");
  const endValue = String(range?.end || "");
  if (!startValue && !endValue) return "";
  if (!startValue || !endValue) return "请选择完整的起止时间";
  const start = queryDateTimeTimestamp(startValue);
  const end = queryDateTimeTimestamp(endValue);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "请输入有效的日期和时间";
  if (end <= start) return "结束时间必须晚于开始时间";
  if (end - start > maxDays * DAY_MS) {
    return `单次查询时间范围不能超过 ${maxDays} 天`;
  }
  return "";
}

function dateTimeInDateRange(value, range) {
  if (!range?.start && !range?.end) return true;
  if (validateOrderDateRange(range)) return false;
  const timestamp = queryDateTimeTimestamp(value);
  return Number.isFinite(timestamp)
    && timestamp >= queryDateTimeTimestamp(range.start)
    && timestamp < queryDateTimeTimestamp(range.end);
}

function defaultOrderQuery(anchorDate = ORDER_QUERY_DEMO_DATE) {
  const startDate = addUtcDays(anchorDate, -(ORDER_QUERY_DEFAULT_DAYS - 1));
  return {
    orderNo: "",
    salesNo: "",
    store: "",
    storeId: "",
    businessTag: "",
    returnStatus: "全部",
    invoiceStatus: "全部",
    syncTimeRange: {
      start: `${startDate} 00:00`,
      end: `${anchorDate} 24:00`,
    },
    salesTimeRange: { start: "", end: "" },
  };
}

function defaultApplicationQuery(anchorDate = ORDER_QUERY_DEMO_DATE) {
  const startDate = addUtcDays(anchorDate, -(ORDER_QUERY_DEFAULT_DAYS - 1));
  return {
    applicationNo: "",
    merchantOrderNo: "",
    store: "",
    storeId: "",
    buyerName: "",
    buyerTaxNo: "",
    source: "全部",
    status: "全部",
    applicationTimeRange: {
      start: `${startDate} 00:00`,
      end: `${anchorDate} 24:00`,
    },
  };
}

const state = {
  view: "orders",
  selectedOrder: "RO202606100001",
  selectedApplicationId: "",
  selectedInvoiceIndex: 0,
  selectedInvoiceNo: "",
  selectedInvoiceIdentity: "",
  applicationDetailOrigin: "orders",
  currentBrandCode: "BR-BURBERRY",
  pendingBrandCode: "BR-BURBERRY",
  ruleTab: "rules",
  color: "#1f2329",
  orderQuery: defaultOrderQuery(),
  orderPage: 1,
  orderPageSize: 10,
  applicationQuery: defaultApplicationQuery(),
  applicationPage: 1,
  applicationPageSize: 10,
  applicationListScrollTop: 0,
  applicationListTableScrollLeft: 0,
  lifecycleExpanded: true,
  orderDetailTab: "basic",
  manualInvoiceOrderIds: [],
  manualInvoiceDraft: null,
  visibleOrderColumns: [
    "salesTime",
    "merchantOrderNo",
    "businessOrderNo",
    "amount",
    "storeName",
    "storeNo",
    "returnStatus",
    "invoiceStatus",
    "businessTag",
    "syncTime",
    "actions",
  ],
  visibleApplicationColumns: [
    "applicationTime",
    "source",
    "invoiceType",
    "merchantOrderNo",
    "storeName",
    "storeNo",
    "sellerName",
    "sellerTaxNo",
    "buyerName",
    "buyerTaxNo",
    "amount",
    "status",
    "statusDescription",
    "applicationNo",
    "actions",
  ],
};

let activeOverflowTooltipCell = null;
let overflowTooltipEventsBound = false;
let activeOrderActionContext = null;
let orderActionReturnFocus = null;

const orderListColumns = [
  { key: "salesTime", label: "订单销售时间" },
  { key: "merchantOrderNo", label: "商家订单号", required: true },
  { key: "businessOrderNo", label: "业务订单号" },
  { key: "amount", label: "订单金额" },
  { key: "storeName", label: "销售门店名称" },
  { key: "storeNo", label: "门店号" },
  { key: "returnStatus", label: "退换货状态" },
  { key: "invoiceStatus", label: "开票状态" },
  { key: "businessTag", label: "业务标识" },
  { key: "syncTime", label: "同步时间" },
  { key: "actions", label: "操作", required: true, sticky: true },
];

const applicationListColumns = [
  { key: "applicationTime", label: "申请时间", width: 156 },
  { key: "source", label: "申请来源", width: 126 },
  { key: "invoiceType", label: "发票类型", width: 96 },
  { key: "merchantOrderNo", label: "商家订单号", width: 190 },
  { key: "storeName", label: "销售门店名称", width: 160 },
  { key: "storeNo", label: "门店号", width: 126 },
  { key: "sellerName", label: "销售方名称", width: 210 },
  { key: "sellerTaxNo", label: "销售方税号", width: 190 },
  { key: "buyerName", label: "购方名称", width: 210 },
  { key: "buyerTaxNo", label: "购方税号", width: 190 },
  { key: "amount", label: "开票金额", width: 150, align: "right" },
  { key: "status", label: "申请状态", width: 116 },
  { key: "statusDescription", label: "状态说明", width: 240 },
  { key: "applicationNo", label: "申请号", width: 210, required: true },
  { key: "actions", label: "操作", width: 240, align: "right", required: true, sticky: true },
];

const manualInvoiceOrderColumns = [
  { key: "merchantOrderNo", label: "商家订单号" },
  { key: "businessOrderNo", label: "业务订单号" },
  { key: "storeName", label: "销售门店" },
  { key: "storeNo", label: "门店号" },
  { key: "amount", label: "订单金额" },
  { key: "returnStatus", label: "退换货状态" },
  { key: "salesTime", label: "订单销售时间" },
];

const userContext = {
  role: "集团财务",
  accessibleBrandCodes: ["BR-BURBERRY", "BR-TEST-002"],
};

const brands = [
  {
    group: "博柏利集团",
    name: "Burberry",
    code: "BR-BURBERRY",
    number: "100001",
    logo: "B",
    company: "博柏利（上海）贸易有限公司",
    taxNo: "9131000066935277XR",
  },
  {
    group: "博柏利集团",
    name: "测试品牌_2",
    code: "BR-TEST-002",
    number: "100002",
    logo: "测",
    company: "测试品牌二（上海）贸易有限公司",
    taxNo: "91310000TEST000002",
  },
];

const invoiceItemNameSettings = {
  group: {
    itemName: "item_desc",
    updated: "2026-06-08 10:05",
  },
  brand: {
    "BR-BURBERRY": {
      itemName: "item_desc",
      updated: "2026-06-10 14:20",
    },
    "BR-TEST-002": {
      itemName: "商品别名",
      updated: "2026-06-11 15:10",
    },
  },
};

const taxRateOptions = ["0%", "1%", "3%", "4%", "5%", "6%", "9%", "10%", "11%", "13%", "16%", "17%"];
const preferentialPolicyOptions = [
  ["无", "无"],
  ["03", "免税"],
  ["04", "不征税"],
  ["08", "按3%简易征收"],
  ["09", "按5%简易征收"],
  ["10", "按5%简易征收减按1.5%计征"],
];
const taxCategoryShortNames = {
  "1040201000000000000": "服装",
  "3049900000000000000": "其他现代服务",
  "1030307000000000000": "食品",
  "1040207000000000000": "箱包",
};

const rules = [
  {
    id: "R-1001",
    scope: "品牌",
    group: "博柏利集团",
    brand: "Burberry",
    brandCode: "BR-BURBERRY",
    category: "服饰",
    alias: "服装",
    taxCode: "1040201000000000000",
    taxName: "服装",
    rate: "13%",
    policy: "无",
    status: "启用",
    updated: "2026-06-10 11:20",
  },
  {
    id: "R-1002",
    scope: "品牌",
    group: "博柏利集团",
    brand: "Burberry",
    brandCode: "BR-BURBERRY",
    category: "维修服务",
    alias: "售后维修",
    taxCode: "3049900000000000000",
    taxName: "其他现代服务",
    rate: "6%",
    policy: "无",
    status: "启用",
    updated: "2026-06-09 18:40",
  },
  {
    id: "R-2001",
    scope: "品牌",
    group: "博柏利集团",
    brand: "测试品牌_2",
    brandCode: "BR-TEST-002",
    category: "餐饮零售",
    alias: "餐饮礼盒",
    taxCode: "1030307000000000000",
    taxName: "食品",
    rate: "13%",
    policy: "无",
    status: "启用",
    updated: "2026-06-11 15:10",
  },
  {
    id: "R-1003",
    scope: "集团",
    group: "博柏利集团",
    brand: "-",
    category: "配饰",
    alias: "箱包配饰",
    taxCode: "1040207000000000000",
    taxName: "箱包",
    rate: "13%",
    policy: "无",
    status: "启用",
    updated: "2026-06-08 10:05",
  },
  {
    id: "R-1004",
    scope: "集团",
    group: "博柏利集团",
    brand: "-",
    category: "赠品",
    alias: "促销赠品",
    taxCode: "1040201000000000000",
    taxName: "服装",
    rate: "13%",
    policy: "不征税",
    status: "停用",
    updated: "2026-06-01 09:22",
  },
];

const orders = [
  {
    orderSn: "RO202606100001",
    salesSn: "S202606100001",
    sqbOrderSn: "SQB20260610009001",
    requestId: "REQ202606100001",
    brandName: "Burberry",
    brandCode: "BR-BURBERRY",
    storeName: "上海恒隆广场店",
    storeSn: "SH-HL-001",
    workstationSn: "POS-01",
    salesTime: "2026-06-10T11:54:00+08:00",
    salesTimeText: "2026-06-10 11:54",
    amount: "¥2,535,531.37",
    invoiceStatus: "已开票",
    returnStatus: "无退换货",
    effectiveInvoice: "1 张蓝票",
    updated: "2026-06-10 12:18",
    customer: "河北比国先天下广场有限责任公司",
    purchaserType: "企业",
    taxId: "911301007761592546",
    subject: "博柏利（上海）贸易有限公司",
    subjectTax: "9131000066935277XR",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=burberry-001",
    invoiceOptions: "电子普票 / 电子专票",
    invoiceRemark: "门店小票扫码开票",
    ruleHit: "品牌规则：服饰；项目名称取值 item_desc",
    items: [
      ["SKU-COAT-001", "经典风衣 Sandringham", "服饰", "件", "1", "¥1,735,531.37"],
      ["SKU-BAG-118", "皮革托特包", "配饰", "件", "1", "¥800,000.00"],
    ],
    tenders: [
      ["WECHAT", "微信支付", "-", "2026-06-10 11:54", "¥1,535,531.37", "WX202606100001", "420000260120260610001"],
      ["CARD", "银行卡", "银联", "2026-06-10 11:54", "¥1,000,000.00", "CARD202606100001", "UP202606100001"],
    ],
    invoices: [
      ["2026-06-10 12:16", "普票", "蓝票", "¥2,535,531.37", "河北比国先天下广场有限责任公司", "911301007761592546", "博柏利（上海）贸易有限公司", "9131000066935277XR", "开票成功", "2631200002582808331", `<button class="btn link">查看详情</button>`],
    ],
    invoiceEvents: [
      {
        name: "发票开具",
        time: "2026-06-10 12:14",
        completedAt: "2026-06-10 12:16",
        status: "成功",
        invoiceNo: "2631200002582808331",
      },
    ],
    applyInfo: ["APPLY202606100001", "2026-06-10 12:03", "2026-06-10 12:16", "-", "-"],
    followups: [],
    events: [
      ["2026-06-10 11:54", "主订单同步", "商家同步零售销售订单，生成开票生命周期。"],
      ["2026-06-10 11:55", "开票入口生成", "系统生成普票申请入口，小票二维码有效期 30 天。"],
      ["2026-06-10 12:03", "消费者提交申请", "购方抬头与接收邮箱已提交。"],
      ["2026-06-10 12:16", "开票成功", "生成 1 张蓝票，当前为有效发票。"],
      ["2026-06-10 12:17", "结果通知发送", "发票结果邮件发送成功。"],
    ],
  },
  {
    orderSn: "RO202606100002",
    salesSn: "S202606100002",
    sqbOrderSn: "SQB20260610009002",
    requestId: "REQ202606100002",
    brandName: "Burberry",
    brandCode: "BR-BURBERRY",
    storeName: "南京德基广场店",
    storeSn: "NJ-DJ-002",
    workstationSn: "POS-03",
    salesTime: "2026-06-10T10:49:00+08:00",
    salesTimeText: "2026-06-10 10:49",
    amount: "¥1,835,166.94",
    invoiceStatus: "已开票",
    returnStatus: "有退换货",
    effectiveInvoice: "蓝票已红冲，新蓝票 1 张",
    updated: "2026-06-10 13:40",
    customer: "南昌武商商业管理有限公司",
    purchaserType: "企业",
    taxId: "91360102MA7AH2FG3U",
    subject: "博柏利（上海）贸易有限公司",
    subjectTax: "9131000066935277XR",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=burberry-002",
    invoiceOptions: "电子普票 / 电子专票",
    invoiceRemark: "退货后自动红冲并按剩余商品重开",
    ruleHit: "品牌规则：服饰；项目名称取值 item_desc",
    items: [
      ["SKU-SCARF-009", "羊绒围巾", "配饰", "件", "1", "¥599,166.94"],
      ["SKU-COAT-021", "经典风衣 Kensington", "服饰", "件", "1", "¥1,236,000.00"],
    ],
    tenders: [
      ["ALIPAY", "支付宝", "-", "2026-06-10 10:49", "¥1,835,166.94", "ALI202606100002", "202606102200002"],
      ["REFUND", "退款", "支付宝原路退回", "2026-06-10 12:58", "-¥599,166.94", "RF202606100007", "202606102200099"],
    ],
    invoices: [
      ["2026-06-10 11:20", "普票", "蓝票", "¥1,835,166.94", "南昌武商商业管理有限公司", "91360102MA7AH2FG3U", "博柏利（上海）贸易有限公司", "9131000066935277XR", "红冲成功", "2631200002582794441", `<button class="btn link">查看详情</button>`],
      ["2026-06-10 13:34", "普票", "蓝票", "¥1,236,000.00", "南昌武商商业管理有限公司", "91360102MA7AH2FG3U", "博柏利（上海）贸易有限公司", "9131000066935277XR", "开票成功", "2631200002582801022", `<button class="btn link">查看详情</button>`],
    ],
    invoiceEvents: [
      {
        name: "发票开具",
        time: "2026-06-10 11:18",
        completedAt: "2026-06-10 11:20",
        status: "成功",
        invoiceNo: "2631200002582794441",
      },
      {
        name: "发票红冲",
        time: "2026-06-10 13:20",
        completedAt: "2026-06-10 13:22",
        status: "成功",
        originalInvoiceNo: "2631200002582794441",
      },
      {
        name: "发票开具",
        time: "2026-06-10 13:32",
        completedAt: "2026-06-10 13:34",
        status: "成功",
        invoiceNo: "2631200002582801022",
      },
    ],
    applyInfo: ["APPLY202606100002", "2026-06-10 11:02", "2026-06-10 13:34", "-", "-"],
    followups: [
      ["退货", "RT202606100007", "RO202606100002", "南京德基广场店 / NJ-DJ-002", "2026-06-10 12:58", "¥599,166.94", "处理成功", "已处理"],
    ],
    events: [
      ["2026-06-10 10:49", "主订单同步", "同步销售订单，等待消费者申请。"],
      ["2026-06-10 11:20", "开票成功", "生成原蓝票。"],
      ["2026-06-10 12:58", "退货订单同步", "消费者退回配饰商品，影响原订单可开票金额。"],
      ["2026-06-10 13:22", "自动红冲", "原蓝票已红冲。"],
      ["2026-06-10 13:34", "重开蓝票", "按剩余商品生成新蓝票。"],
    ],
  },
  {
    orderSn: "RO202606110052",
    salesSn: "S202606110052",
    sqbOrderSn: "SQB20260611009052",
    requestId: "REQ202606110052",
    brandName: "Burberry",
    brandCode: "BR-BURBERRY",
    storeName: "深圳万象城店",
    storeSn: "SZ-MIXC-052",
    workstationSn: "POS-05",
    salesTime: "2026-06-11T13:18:00+08:00",
    salesTimeText: "2026-06-11 13:18",
    amount: "¥328,600.00",
    invoiceStatus: "未开票",
    returnStatus: "无退换货",
    effectiveInvoice: "未开票",
    updated: "2026-06-11 13:22",
    customer: "深圳万象城商业管理有限公司",
    purchaserType: "企业",
    taxId: "91440300TEST110052",
    subject: "博柏利（上海）贸易有限公司",
    subjectTax: "9131000066935277XR",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=burberry-052",
    invoiceOptions: "电子普票 / 电子专票",
    invoiceRemark: "待消费者扫码申请开票",
    ruleHit: "品牌规则：服饰；项目名称取值 item_desc",
    items: [
      ["SKU-SHOE-052", "经典皮鞋", "服饰", "双", "1", "¥328,600.00"],
    ],
    tenders: [
      ["WECHAT", "微信支付", "-", "2026-06-11 13:18", "¥328,600.00", "WX202606110052", "420000260120260611052"],
    ],
    invoices: [],
    invoiceEvents: [],
    applyInfo: ["-", "-", "-", "-", "-"],
    followups: [],
    events: [
      ["2026-06-11 13:18", "主订单同步", "同步销售订单，当前待开票。"],
      ["2026-06-11 13:19", "开票入口待生成", "财务可手动开票或生成消费者申请入口。"],
    ],
  },
  {
    orderSn: "RO202606090018",
    salesSn: "S202606090018",
    sqbOrderSn: "SQB20260609007718",
    requestId: "REQ202606090018",
    brandName: "Burberry",
    brandCode: "BR-BURBERRY",
    storeName: "成都太古里店",
    storeSn: "CD-TGL-018",
    workstationSn: "POS-02",
    salesTime: "2026-06-09T20:31:00+08:00",
    salesTimeText: "2026-06-09 20:31",
    amount: "¥86,400.00",
    invoiceStatus: "未开票",
    returnStatus: "已全额退货",
    effectiveInvoice: "无可开票金额",
    updated: "2026-06-10 09:11",
    customer: "成都太古里商业管理有限公司",
    purchaserType: "企业",
    taxId: "91510100MA6PTGC68A",
    subject: "博柏利（上海）贸易有限公司",
    subjectTax: "9131000066935277XR",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=burberry-018",
    invoiceOptions: "电子普票",
    invoiceRemark: "全额退货后不可继续申请开票",
    ruleHit: "全额退货后无可开票商品",
    items: [
      ["SKU-SVC-018", "皮具护理服务", "服务", "次", "1", "¥86,400.00"],
    ],
    tenders: [
      ["CARD", "银行卡", "银联", "2026-06-09 20:31", "¥86,400.00", "CARD202606090018", "UP202606090018"],
      ["REFUND", "退款", "银行卡原路退回", "2026-06-10 09:01", "-¥86,400.00", "RF202606100021", "UP202606100021"],
    ],
    invoices: [],
    invoiceEvents: [],
    applyInfo: ["-", "-", "-", "-", "-"],
    followups: [
      ["退货", "RT202606100021", "RO202606090018", "成都太古里店 / CD-TGL-018", "2026-06-10 09:01", "¥86,400.00", "处理成功", "未处理"],
    ],
    events: [
      ["2026-06-09 20:31", "主订单同步", "同步销售订单。"],
      ["2026-06-10 09:01", "退货订单同步", "消费者发起全额退货。"],
      ["2026-06-10 09:10", "更新可开票金额", "订单已全额退货，当前无可开票金额。"],
    ],
  },
  {
    orderSn: "RO202606110036",
    salesSn: "S202606110036",
    sqbOrderSn: "SQB20260611008136",
    requestId: "REQ202606110036",
    brandName: "测试品牌_2",
    brandCode: "BR-TEST-002",
    storeName: "北京朝阳合生汇店",
    storeSn: "BJ-HSH-036",
    workstationSn: "POS-06",
    salesTime: "2026-06-11T14:28:00+08:00",
    salesTimeText: "2026-06-11 14:28",
    amount: "¥128,800.00",
    invoiceStatus: "开票中",
    returnStatus: "无退换货",
    effectiveInvoice: "开票处理中",
    updated: "2026-06-11 14:34",
    customer: "北京朝阳测试商业有限公司",
    purchaserType: "企业",
    taxId: "91110105TEST000036",
    subject: "测试品牌二（上海）贸易有限公司",
    subjectTax: "91310000TEST000002",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=testbrand-036",
    invoiceOptions: "电子普票",
    invoiceRemark: "测试品牌小票扫码开票",
    ruleHit: "品牌规则：餐饮零售；项目名称取值 item_desc",
    items: [
      ["SKU-FOOD-036", "测试品牌礼盒", "餐饮零售", "盒", "2", "¥126,800.00"],
      ["SKU-FEE-002", "积分抵扣", "支付抵扣", "次", "1", "¥2,000.00"],
    ],
    tenders: [
      ["WECHAT", "微信支付", "-", "2026-06-11 14:28", "¥126,800.00", "WX202606110036", "420000260120260611036"],
      ["POINTS", "积分抵扣", "-", "2026-06-11 14:28", "¥2,000.00", "PT202606110036", "-"],
    ],
    invoices: [
      ["2026-06-11 14:34", "普票", "蓝票", "¥126,800.00", "北京朝阳测试商业有限公司", "91110105TEST000036", "测试品牌二（上海）贸易有限公司", "91310000TEST000002", "开票中", "-", `<button class="btn link">刷新</button>`],
    ],
    invoiceEvents: [
      {
        name: "发票开具",
        time: "2026-06-11 14:34",
        status: "处理中",
      },
    ],
    applyInfo: ["APPLY202606110036", "2026-06-11 14:31", "-", "-", "-"],
    followups: [],
    events: [
      ["2026-06-11 14:28", "主订单同步", "同步测试品牌零售订单。"],
      ["2026-06-11 14:29", "开票入口生成", "按测试品牌二维码有效期生成入口。"],
      ["2026-06-11 14:31", "消费者提交申请", "购方信息已提交。"],
      ["2026-06-11 14:34", "开票中", "发票请求已提交，等待税控结果。"],
    ],
  },
  {
    orderSn: "RO202606100088",
    salesSn: "S202606100088",
    sqbOrderSn: "SQB20260610008888",
    requestId: "REQ202606100088",
    brandName: "测试品牌_2",
    brandCode: "BR-TEST-002",
    storeName: "上海五角场店",
    storeSn: "SH-WJC-088",
    workstationSn: "POS-02",
    salesTime: "2026-06-10T18:12:00+08:00",
    salesTimeText: "2026-06-10 18:12",
    amount: "¥56,900.00",
    invoiceStatus: "已开票",
    returnStatus: "有退换货",
    effectiveInvoice: "蓝票已红冲，新蓝票 1 张",
    updated: "2026-06-10 20:08",
    customer: "上海五角场测试商业有限公司",
    purchaserType: "企业",
    taxId: "91310110TEST000088",
    subject: "测试品牌二（上海）贸易有限公司",
    subjectTax: "91310000TEST000002",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=testbrand-088",
    invoiceOptions: "电子普票 / 电子专票",
    invoiceRemark: "退货后按剩余商品重开",
    ruleHit: "品牌规则：生活用品；项目名称取值商品别名",
    items: [
      ["SKU-LIFE-088", "生活用品套装", "生活用品", "套", "1", "¥56,900.00"],
    ],
    tenders: [
      ["ALIPAY", "支付宝", "-", "2026-06-10 18:12", "¥56,900.00", "ALI202606100088", "202606102200088"],
    ],
    invoices: [
      ["2026-06-10 18:20", "普票", "蓝票", "¥68,900.00", "上海五角场测试商业有限公司", "91310110TEST000088", "测试品牌二（上海）贸易有限公司", "91310000TEST000002", "红冲成功", "2631200002583000881", `<button class="btn link">查看详情</button>`],
      ["2026-06-10 19:14", "普票", "蓝票", "¥62,900.00", "上海五角场测试商业有限公司", "91310110TEST000088", "测试品牌二（上海）贸易有限公司", "91310000TEST000002", "红冲成功", "2631200002583000882", `<button class="btn link">查看详情</button>`],
      ["2026-06-10 20:02", "普票", "蓝票", "¥56,900.00", "上海五角场测试商业有限公司", "91310110TEST000088", "测试品牌二（上海）贸易有限公司", "91310000TEST000002", "开票成功", "2631200002583000883", `<button class="btn link">查看详情</button>`],
    ],
    invoiceEvents: [
      {
        name: "发票开具",
        time: "2026-06-10 18:18",
        completedAt: "2026-06-10 18:20",
        status: "成功",
        invoiceNo: "2631200002583000881",
      },
      {
        name: "发票红冲",
        time: "2026-06-10 19:02",
        completedAt: "2026-06-10 19:04",
        status: "成功",
        originalInvoiceNo: "2631200002583000881",
      },
      {
        name: "发票开具",
        time: "2026-06-10 19:12",
        completedAt: "2026-06-10 19:14",
        status: "成功",
        invoiceNo: "2631200002583000882",
      },
      {
        name: "发票红冲",
        time: "2026-06-10 19:42",
        completedAt: "2026-06-10 19:44",
        status: "成功",
        originalInvoiceNo: "2631200002583000882",
        statusHistory: [
          {
            status: "待重试",
            time: "2026-06-10 19:42",
            reason: "税控返回红冲请求超时，系统等待下一次重试。",
          },
          {
            status: "成功",
            time: "2026-06-10 19:44",
          },
        ],
      },
      {
        name: "发票换开",
        time: "2026-06-10 20:00",
        completedAt: "2026-06-10 20:02",
        status: "成功",
        invoiceNo: "2631200002583000883",
      },
    ],
    applyInfo: ["APPLY202606100088", "2026-06-10 18:18", "2026-06-10 20:02", "-", "-"],
    followups: [
      ["退货", "RT202606100089", "RO202606100088", "上海五角场店 / SH-WJC-088", "2026-06-10 18:56", "¥6,000.00", "处理成功", "已处理"],
      ["换货", "EX202606100088", "RO202606100088", "上海五角场店 / SH-WJC-088", "2026-06-10 19:40", "¥12,000.00", "处理成功", "已处理"],
    ],
    events: [
      ["2026-06-10 18:12", "主订单同步", "同步测试品牌销售订单。"],
      ["2026-06-10 18:20", "开票成功", "生成原蓝票。"],
      ["2026-06-10 19:40", "换货订单同步", "换货影响原订单开票金额。"],
      ["2026-06-10 19:44", "自动红冲", "原蓝票已红冲。"],
      ["2026-06-10 20:02", "重开蓝票", "按剩余金额生成新蓝票。"],
    ],
  },
];

// Scenario sample orders used to validate retail order lifecycle coverage.
orders.forEach((order) => {
  if (order.brandCode === "BR-BURBERRY") order.isLegacyCompatibilitySample = true;
});

orders.push(
  {
    orderSn: "RO-S01-202606120001",
    salesSn: "S-S01-202606120001",
    sqbOrderSn: "SQB-S01-202606120001",
    requestId: "REQ-S01-202606120001",
    brandName: "Burberry",
    brandCode: "BR-BURBERRY",
    storeName: "上海恒隆广场店",
    storeSn: "SH-HL-001",
    workstationSn: "POS-01",
    salesTime: "2026-06-12T10:05:00+08:00",
    salesTimeText: "2026-06-12 10:05",
    amount: "¥12,800.00",
    invoiceStatus: "未开票",
    returnStatus: "无退换货",
    effectiveInvoice: "未开票",
    updated: "2026-06-12 10:06",
    customer: "上海恒隆商业管理有限公司",
    purchaserType: "企业",
    taxId: "91310106S01000001",
    subject: "博柏利（上海）贸易有限公司",
    subjectTax: "9131000066935277XR",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=scenario-s01",
    invoiceOptions: "电子普票 / 电子专票",
    invoiceRemark: "样例 S01：正常销售，待消费者申请开票",
    ruleHit: "集团规则：配饰；项目名称取值 item_desc",
    items: [
      ["SKU-S01-SCARF", "经典围巾", "配饰", "件", "1", "¥12,800.00"],
    ],
    tenders: [
      ["WECHAT", "微信支付", "-", "2026-06-12 10:05", "¥12,800.00", "WX-S01-202606120001", "420000260120260612001"],
    ],
    invoices: [],
    invoiceEvents: [],
    applyInfo: ["-", "-", "-", "-", "-"],
    followups: [],
    events: [],
  },
  {
    orderSn: "RO-S02-202606120002",
    salesSn: "S-S02-202606120002",
    sqbOrderSn: "SQB-S02-202606120002",
    requestId: "REQ-S02-202606120002",
    brandName: "Burberry",
    brandCode: "BR-BURBERRY",
    storeName: "南京德基广场店",
    storeSn: "NJ-DJ-002",
    workstationSn: "POS-03",
    salesTime: "2026-06-12T10:18:00+08:00",
    salesTimeText: "2026-06-12 10:18",
    amount: "¥35,600.00",
    invoiceStatus: "开票中",
    returnStatus: "无退换货",
    effectiveInvoice: "开票处理中",
    updated: "2026-06-12 10:25",
    customer: "南京德基商业管理有限公司",
    purchaserType: "企业",
    taxId: "91320102S02000002",
    subject: "博柏利（上海）贸易有限公司",
    subjectTax: "9131000066935277XR",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=scenario-s02",
    invoiceOptions: "电子普票 / 电子专票",
    invoiceRemark: "样例 S02：正常销售，开票处理中",
    ruleHit: "品牌规则：服饰；项目名称取值 item_desc",
    items: [
      ["SKU-S02-COAT", "女士风衣", "服饰", "件", "1", "¥35,600.00"],
    ],
    tenders: [
      ["ALIPAY", "支付宝", "-", "2026-06-12 10:18", "¥35,600.00", "ALI-S02-202606120002", "202606122200002"],
    ],
    invoices: [
      ["2026-06-12 10:25", "普票", "蓝票", "¥35,600.00", "南京德基商业管理有限公司", "91320102S02000002", "博柏利（上海）贸易有限公司", "9131000066935277XR", "开票中", "-", `<button class="btn link">刷新</button>`],
    ],
    invoiceEvents: [
      {
        name: "发票开具",
        time: "2026-06-12 10:25",
        status: "处理中",
      },
    ],
    applyInfo: ["APPLY-S02-202606120002", "2026-06-12 10:22", "-", "-", "-"],
    followups: [],
    events: [],
  },
  {
    orderSn: "RO-S03-202606120003",
    salesSn: "S-S03-202606120003",
    sqbOrderSn: "SQB-S03-202606120003",
    requestId: "REQ-S03-202606120003",
    brandName: "Burberry",
    brandCode: "BR-BURBERRY",
    storeName: "成都太古里店",
    storeSn: "CD-TGL-018",
    workstationSn: "POS-02",
    salesTime: "2026-06-12T10:32:00+08:00",
    salesTimeText: "2026-06-12 10:32",
    amount: "¥8,900.00",
    invoiceStatus: "已开票",
    returnStatus: "无退换货",
    effectiveInvoice: "1 张蓝票",
    updated: "2026-06-12 10:43",
    customer: "成都太古里商业管理有限公司",
    purchaserType: "企业",
    taxId: "91510100S03000003",
    subject: "博柏利（上海）贸易有限公司",
    subjectTax: "9131000066935277XR",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=scenario-s03",
    invoiceOptions: "电子普票 / 电子专票",
    invoiceRemark: "样例 S03：正常销售，已开票成功",
    ruleHit: "品牌规则：维修服务；项目名称取值 item_desc",
    items: [
      ["SKU-S03-SVC", "皮具护理服务", "维修服务", "次", "1", "¥8,900.00"],
    ],
    tenders: [
      ["CARD", "银行卡", "银联", "2026-06-12 10:32", "¥8,900.00", "CARD-S03-202606120003", "UP-S03-202606120003"],
    ],
    invoices: [
      ["2026-06-12 10:43", "普票", "蓝票", "¥8,900.00", "成都太古里商业管理有限公司", "91510100S03000003", "博柏利（上海）贸易有限公司", "9131000066935277XR", "开票成功", "263120000259030003", `<button class="btn link">查看详情</button>`],
    ],
    invoiceEvents: [
      {
        name: "发票开具",
        time: "2026-06-12 10:41",
        completedAt: "2026-06-12 10:43",
        status: "成功",
        invoiceNo: "263120000259030003",
      },
    ],
    applyInfo: ["APPLY-S03-202606120003", "2026-06-12 10:39", "2026-06-12 10:43", "-", "-"],
    followups: [],
    events: [],
  },
  {
    orderSn: "RO-S04-202606120004",
    salesSn: "S-S04-202606120004",
    sqbOrderSn: "SQB-S04-202606120004",
    requestId: "REQ-S04-202606120004",
    brandName: "Burberry",
    brandCode: "BR-BURBERRY",
    storeName: "深圳万象城店",
    storeSn: "SZ-MIXC-052",
    workstationSn: "POS-05",
    salesTime: "2026-06-12T10:46:00+08:00",
    salesTimeText: "2026-06-12 10:46",
    amount: "¥28,000.00",
    invoiceStatus: "未开票",
    returnStatus: "有退换货",
    effectiveInvoice: "未开票，剩余可开票 ¥18,000.00",
    updated: "2026-06-12 11:02",
    customer: "深圳万象城商业管理有限公司",
    purchaserType: "企业",
    taxId: "91440300S04000004",
    subject: "博柏利（上海）贸易有限公司",
    subjectTax: "9131000066935277XR",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=scenario-s04",
    invoiceOptions: "电子普票 / 电子专票",
    invoiceRemark: "样例 S04：开票前部分退货，不发起红冲",
    ruleHit: "品牌规则：服饰；集团规则：配饰",
    items: [
      ["SKU-S04-COAT", "风衣", "服饰", "件", "1", "¥18,000.00"],
      ["SKU-S04-BAG", "托特包", "配饰", "件", "1", "¥10,000.00"],
    ],
    tenders: [
      ["WECHAT", "微信支付", "-", "2026-06-12 10:46", "¥28,000.00", "WX-S04-202606120004", "420000260120260612004"],
      ["REFUND", "退款", "微信原路退回", "2026-06-12 11:02", "-¥10,000.00", "RF-S04-202606120004", "420000260120260612904"],
    ],
    invoices: [],
    invoiceEvents: [],
    applyInfo: ["-", "-", "-", "-", "-"],
    followups: [
      ["退货", "RT-S04-202606120004", "RO-S04-202606120004", "深圳万象城店 / SZ-MIXC-052", "2026-06-12 11:02", "¥10,000.00", "处理成功", "未开票"],
    ],
    events: [],
  },
  {
    orderSn: "RO-S05-202606120005",
    salesSn: "S-S05-202606120005",
    sqbOrderSn: "SQB-S05-202606120005",
    requestId: "REQ-S05-202606120005",
    brandName: "Burberry",
    brandCode: "BR-BURBERRY",
    storeName: "上海恒隆广场店",
    storeSn: "SH-HL-001",
    workstationSn: "POS-01",
    salesTime: "2026-06-12T11:05:00+08:00",
    salesTimeText: "2026-06-12 11:05",
    amount: "¥6,800.00",
    invoiceStatus: "未开票",
    returnStatus: "已全额退货",
    effectiveInvoice: "无可开票金额",
    updated: "2026-06-12 11:18",
    customer: "上海恒隆商业管理有限公司",
    purchaserType: "企业",
    taxId: "91310106S05000005",
    subject: "博柏利（上海）贸易有限公司",
    subjectTax: "9131000066935277XR",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=scenario-s05",
    invoiceOptions: "电子普票",
    invoiceRemark: "样例 S05：开票前全额退货",
    ruleHit: "全额退货后无可开票商品",
    items: [
      ["SKU-S05-SCARF", "丝巾", "配饰", "件", "1", "¥6,800.00"],
    ],
    tenders: [
      ["ALIPAY", "支付宝", "-", "2026-06-12 11:05", "¥6,800.00", "ALI-S05-202606120005", "202606122200005"],
      ["REFUND", "退款", "支付宝原路退回", "2026-06-12 11:18", "-¥6,800.00", "RF-S05-202606120005", "202606122200905"],
    ],
    invoices: [],
    invoiceEvents: [],
    applyInfo: ["-", "-", "-", "-", "-"],
    followups: [
      ["退货", "RT-S05-202606120005", "RO-S05-202606120005", "上海恒隆广场店 / SH-HL-001", "2026-06-12 11:18", "¥6,800.00", "处理成功", "未处理"],
    ],
    events: [],
  },
  {
    orderSn: "RO-S06-202606120006",
    salesSn: "S-S06-202606120006",
    sqbOrderSn: "SQB-S06-202606120006",
    requestId: "REQ-S06-202606120006",
    brandName: "测试品牌_2",
    brandCode: "BR-TEST-002",
    storeName: "北京朝阳测试店",
    storeSn: "BJ-CY-006",
    workstationSn: "POS-06",
    salesTime: "2026-06-12T11:18:00+08:00",
    salesTimeText: "2026-06-12 11:18",
    amount: "¥20,000.00",
    invoiceStatus: "开票中",
    returnStatus: "有退换货",
    effectiveInvoice: "开票处理中，已记录部分退货",
    updated: "2026-06-12 11:28",
    customer: "北京朝阳测试商业有限公司",
    purchaserType: "企业",
    taxId: "91110105S06000006",
    subject: "测试品牌二（上海）贸易有限公司",
    subjectTax: "91310000TEST000002",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=scenario-s06",
    invoiceOptions: "电子普票",
    invoiceRemark: "样例 S06：开票中发生部分退货",
    ruleHit: "品牌规则：餐饮零售；项目名称取值商品别名",
    items: [
      ["SKU-S06-LIFE", "生活用品套装", "餐饮零售", "套", "1", "¥15,000.00"],
      ["SKU-S06-GIFT", "礼盒配件", "餐饮零售", "件", "1", "¥5,000.00"],
    ],
    tenders: [
      ["WECHAT", "微信支付", "-", "2026-06-12 11:18", "¥20,000.00", "WX-S06-202606120006", "420000260120260612006"],
      ["REFUND", "退款", "微信原路退回", "2026-06-12 11:28", "-¥5,000.00", "RF-S06-202606120006", "420000260120260612906"],
    ],
    invoices: [
      ["2026-06-12 11:20", "普票", "蓝票", "¥20,000.00", "北京朝阳测试商业有限公司", "91110105S06000006", "测试品牌二（上海）贸易有限公司", "91310000TEST000002", "开票中", "-", `<button class="btn link">刷新</button>`],
    ],
    invoiceEvents: [
      {
        name: "发票开具",
        time: "2026-06-12 11:20",
        status: "处理中",
      },
    ],
    applyInfo: ["APPLY-S06-202606120006", "2026-06-12 11:19", "-", "-", "-"],
    followups: [
      ["退货", "RT-S06-202606120006", "RO-S06-202606120006", "北京朝阳测试店 / BJ-CY-006", "2026-06-12 11:28", "¥5,000.00", "处理成功", "待开票结果"],
    ],
    events: [],
  },
  {
    orderSn: "RO-S07-202606120007",
    salesSn: "S-S07-202606120007",
    sqbOrderSn: "SQB-S07-202606120007",
    requestId: "REQ-S07-202606120007",
    brandName: "Burberry",
    brandCode: "BR-BURBERRY",
    storeName: "南京德基广场店",
    storeSn: "NJ-DJ-002",
    workstationSn: "POS-03",
    salesTime: "2026-06-12T11:35:00+08:00",
    salesTimeText: "2026-06-12 11:35",
    amount: "¥42,000.00",
    invoiceStatus: "已开票",
    returnStatus: "有退换货",
    effectiveInvoice: "原蓝票已红冲，新蓝票 1 张",
    updated: "2026-06-12 12:12",
    customer: "南京德基商业管理有限公司",
    purchaserType: "企业",
    taxId: "91320102S07000007",
    subject: "博柏利（上海）贸易有限公司",
    subjectTax: "9131000066935277XR",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=scenario-s07",
    invoiceOptions: "电子普票 / 电子专票",
    invoiceRemark: "样例 S07：已开票后部分退货，自动红冲并重开",
    ruleHit: "品牌规则：服饰；集团规则：配饰",
    items: [
      ["SKU-S07-COAT", "风衣", "服饰", "件", "1", "¥30,000.00"],
      ["SKU-S07-SCARF", "围巾", "配饰", "件", "1", "¥12,000.00"],
    ],
    tenders: [
      ["CARD", "银行卡", "银联", "2026-06-12 11:35", "¥42,000.00", "CARD-S07-202606120007", "UP-S07-202606120007"],
      ["REFUND", "退款", "银行卡原路退回", "2026-06-12 11:58", "-¥12,000.00", "RF-S07-202606120007", "UP-S07-202606120907"],
    ],
    invoices: [
      Object.assign(
        ["2026-06-12 11:47", "普票", "蓝票", "¥42,000.00", "南京德基商业管理有限公司", "91320102S07000007", "博柏利（上海）贸易有限公司", "9131000066935277XR", "红字确认单待确认", "263120000259070001", `<button class="btn link">查看详情</button>`],
        { requiresRedConfirmation: true },
      ),
      ["2026-06-12 12:12", "普票", "蓝票", "¥30,000.00", "南京德基商业管理有限公司", "91320102S07000007", "博柏利（上海）贸易有限公司", "9131000066935277XR", "开票成功", "263120000259070002", `<button class="btn link">查看详情</button>`],
    ],
    invoiceEvents: [
      {
        name: "发票开具",
        time: "2026-06-12 11:45",
        completedAt: "2026-06-12 11:47",
        status: "成功",
        invoiceNo: "263120000259070001",
      },
      {
        name: "发票红冲",
        time: "2026-06-12 12:02",
        completedAt: "-",
        status: "红字确认单待确认",
        originalInvoiceNo: "263120000259070001",
      },
      {
        name: "发票开具",
        time: "2026-06-12 12:10",
        completedAt: "2026-06-12 12:12",
        status: "成功",
        invoiceNo: "263120000259070002",
      },
    ],
    applyInfo: ["APPLY-S07-202606120007", "2026-06-12 11:42", "2026-06-12 12:12", "-", "-"],
    followups: [
      ["退货", "RT-S07-202606120007", "RO-S07-202606120007", "南京德基广场店 / NJ-DJ-002", "2026-06-12 11:58", "¥12,000.00", "处理成功", "已处理"],
    ],
    events: [],
  },
  {
    orderSn: "RO-S08-202606120008",
    salesSn: "S-S08-202606120008",
    sqbOrderSn: "SQB-S08-202606120008",
    requestId: "REQ-S08-202606120008",
    brandName: "Burberry",
    brandCode: "BR-BURBERRY",
    storeName: "成都太古里店",
    storeSn: "CD-TGL-018",
    workstationSn: "POS-02",
    salesTime: "2026-06-12T11:52:00+08:00",
    salesTimeText: "2026-06-12 11:52",
    amount: "¥16,600.00",
    invoiceStatus: "已开票",
    returnStatus: "已全额退货",
    effectiveInvoice: "原蓝票已红冲，无新蓝票",
    updated: "2026-06-12 12:22",
    customer: "成都太古里商业管理有限公司",
    purchaserType: "企业",
    taxId: "91510100S08000008",
    subject: "博柏利（上海）贸易有限公司",
    subjectTax: "9131000066935277XR",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=scenario-s08",
    invoiceOptions: "电子普票",
    invoiceRemark: "样例 S08：已开票后全额退货，只红冲不重开",
    ruleHit: "集团规则：配饰；全额退货后无剩余可开票金额",
    items: [
      ["SKU-S08-BAG", "背包", "配饰", "件", "1", "¥16,600.00"],
    ],
    tenders: [
      ["WECHAT", "微信支付", "-", "2026-06-12 11:52", "¥16,600.00", "WX-S08-202606120008", "420000260120260612008"],
      ["REFUND", "退款", "微信原路退回", "2026-06-12 12:16", "-¥16,600.00", "RF-S08-202606120008", "420000260120260612908"],
    ],
    invoices: [
      ["2026-06-12 12:01", "普票", "蓝票", "¥16,600.00", "成都太古里商业管理有限公司", "91510100S08000008", "博柏利（上海）贸易有限公司", "9131000066935277XR", "红冲成功", "263120000259080001", `<button class="btn link">查看详情</button>`],
    ],
    invoiceEvents: [
      {
        name: "发票开具",
        time: "2026-06-12 11:59",
        completedAt: "2026-06-12 12:01",
        status: "成功",
        invoiceNo: "263120000259080001",
      },
      {
        name: "发票红冲",
        time: "2026-06-12 12:20",
        completedAt: "2026-06-12 12:22",
        status: "成功",
        originalInvoiceNo: "263120000259080001",
      },
    ],
    applyInfo: ["APPLY-S08-202606120008", "2026-06-12 11:57", "2026-06-12 12:22", "-", "-"],
    followups: [
      ["退货", "RT-S08-202606120008", "RO-S08-202606120008", "成都太古里店 / CD-TGL-018", "2026-06-12 12:16", "¥16,600.00", "处理成功", "已处理"],
    ],
    events: [],
  },
  {
    orderSn: "RO-S09-202606120009",
    salesSn: "S-S09-202606120009",
    sqbOrderSn: "SQB-S09-202606120009",
    requestId: "REQ-S09-202606120009",
    brandName: "测试品牌_2",
    brandCode: "BR-TEST-002",
    storeName: "上海五角场店",
    storeSn: "SH-WJC-088",
    workstationSn: "POS-02",
    salesTime: "2026-06-12T12:10:00+08:00",
    salesTimeText: "2026-06-12 12:10",
    amount: "¥23,000.00",
    invoiceStatus: "未开票",
    returnStatus: "有退换货",
    effectiveInvoice: "未开票，跨门店部分换货后待开票",
    updated: "2026-06-12 12:32",
    businessCode: "跨门店部分换货",
    customer: "上海五角场测试商业有限公司",
    purchaserType: "企业",
    taxId: "91310110S09000009",
    subject: "测试品牌二（上海）贸易有限公司",
    subjectTax: "91310000TEST000002",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=scenario-s09",
    invoiceOptions: "电子普票",
    invoiceRemark: "样例 S09：多商品跨门店部分换货，全部使用可开票支付方式",
    ruleHit: "品牌规则：餐饮零售；项目名称取值商品别名",
    items: [
      ["SKU-S09-COAT-A", "风衣 A", "服饰", "件", "1", "¥12,000.00"],
      ["SKU-S09-SCARF-A", "围巾 A", "配饰", "件", "1", "¥8,000.00"],
      ["SKU-S09-BELT", "皮带", "配饰", "件", "1", "¥3,000.00"],
    ],
    tenders: [
      {
        code: "WECHAT",
        name: "微信支付",
        note: "原销售支付",
        time: "2026-06-12 12:10",
        transactionAmount: "¥23,000.00",
        receivedAmount: "¥22,800.00",
        paidAmount: "¥23,000.00",
        direction: "in",
        status: "success",
        paymentNo: "PAY-S09-ORIGINAL",
        relatedOrderNo: "RO-S09-202606120009",
        relatedPaymentNo: "",
        merchantTrace: "WX-S09-202606120009",
        channelTrace: "420000260120260612009",
      },
      {
        code: "REFUND",
        name: "微信退款",
        note: "换出商品退款",
        time: "2026-06-12 12:26",
        transactionAmount: "¥8,000.00",
        receivedAmount: "¥7,800.00",
        paidAmount: "¥8,000.00",
        direction: "out",
        status: "success",
        paymentNo: "PAY-S09-REFUND",
        relatedOrderNo: "EX-S09-202606120009",
        relatedPaymentNo: "PAY-S09-ORIGINAL",
        merchantTrace: "RF-S09-202606120009",
        channelTrace: "420000260120260612209",
      },
      {
        code: "WECHAT_TOPUP",
        name: "微信支付",
        note: "换货新销售（含补差）",
        time: "2026-06-12 12:32",
        transactionAmount: "¥10,000.00",
        receivedAmount: "¥9,600.00",
        paidAmount: "¥10,000.00",
        direction: "in",
        status: "success",
        paymentNo: "PAY-S09-EXCHANGE-SALE",
        relatedOrderNo: "RO-S09N-202606120009",
        relatedPaymentNo: "PAY-S09-REFUND",
        merchantTrace: "WX-S09-TOPUP-202606120009",
        channelTrace: "420000260120260612109",
      },
    ],
    invoices: [],
    invoiceEvents: [],
    applyInfo: ["-", "-", "-", "-", "-"],
    followups: [
      ["换货", "EX-S09-202606120009", "RO-S09-202606120009", "北京朝阳测试店 / BJ-CY-006", "2026-06-12 12:26", "¥8,000.00", "处理成功", "未开票"],
      ["换货新销售", "RO-S09N-202606120009", "RO-S09-202606120009", "北京朝阳测试店 / BJ-CY-006", "2026-06-12 12:32", "¥10,000.00", "处理成功", "未开票"],
    ],
    effectiveInvoiceContents: [
      {
        preInvoiceRequestId: "PRE-S09-SH-001",
        preInvoiceRequestSequence: 1,
        storeName: "上海五角场店",
        storeSn: "SH-WJC-088",
        relatedOrderNos: ["RO-S09-202606120009"],
        items: [
          ["SKU-S09-COAT-A", "风衣 A", "服饰", "件", "1", "¥12,000.00"],
          ["SKU-S09-BELT", "皮带", "配饰", "件", "1", "¥3,000.00"],
        ],
      },
      {
        preInvoiceRequestId: "PRE-S09-BJ-002",
        preInvoiceRequestSequence: 2,
        storeName: "北京朝阳测试店",
        storeSn: "BJ-CY-006",
        relatedOrderNos: ["RO-S09N-202606120009"],
        items: [
          ["SKU-S09-BAG-B", "皮包 B", "箱包", "件", "1", "¥10,000.00"],
        ],
      },
    ],
    events: [],
  },
  {
    orderSn: "RO-MI-202606120003",
    salesSn: "S-MI-202606120003",
    sqbOrderSn: "SQB-MI-202606120003",
    requestId: "REQ-MI-202606120003",
    brandName: "测试品牌_2",
    brandCode: "BR-TEST-002",
    storeName: "上海五角场店",
    storeSn: "SH-WJC-088",
    workstationSn: "POS-02",
    salesTime: "2026-06-12T14:05:00+08:00",
    salesTimeText: "2026-06-12 14:05",
    amount: "¥23,000.00",
    invoiceStatus: "未开票",
    returnStatus: "有退换货",
    effectiveInvoice: "未开票，跨门店换货并含不可开票支付",
    updated: "2026-06-12 14:27",
    businessCode: "跨门店部分换货+混合支付",
    customer: "上海五角场测试商业有限公司",
    purchaserType: "企业",
    taxId: "91310110MI0300003",
    subject: "测试品牌二（上海）贸易有限公司",
    subjectTax: "91310000TEST000002",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=manual-invoice-mi03",
    invoiceOptions: "电子普票",
    invoiceRemark: "手动开票复杂样例：跨店换货＋微信和礼品卡混合支付",
    ruleHit: "品牌规则：服饰；礼品卡支付不计入可开票金额",
    items: [
      ["SKU-MI03-COAT-A", "风衣 A", "服饰", "件", "1", "¥12,000.00"],
      ["SKU-MI03-SCARF-A", "围巾 A", "配饰", "件", "1", "¥8,000.00"],
      ["SKU-MI03-BELT", "皮带", "配饰", "件", "1", "¥3,000.00"],
    ],
    tenders: [
      {
        code: "WECHAT",
        name: "微信支付",
        note: "原销售支付",
        time: "2026-06-12 14:05",
        transactionAmount: "¥18,000.00",
        receivedAmount: "¥17,600.00",
        paidAmount: "¥18,000.00",
        direction: "in",
        status: "success",
        paymentNo: "PAY-MI03-WECHAT",
        relatedOrderNo: "RO-MI-202606120003",
        relatedPaymentNo: "",
        merchantTrace: "WX-MI03-202606120003",
        channelTrace: "420000260120260612303",
      },
      {
        code: "GIFT_CARD",
        name: "礼品卡支付",
        note: "原销售支付",
        time: "2026-06-12 14:05",
        transactionAmount: "¥5,000.00",
        receivedAmount: "¥4,800.00",
        paidAmount: "¥5,000.00",
        direction: "in",
        status: "success",
        paymentNo: "PAY-MI03-GIFT-CARD",
        relatedOrderNo: "RO-MI-202606120003",
        relatedPaymentNo: "",
        merchantTrace: "GC-MI03-202606120003",
        channelTrace: "GIFT202606120003",
      },
      {
        code: "REFUND",
        name: "微信退款",
        note: "换出商品退款",
        time: "2026-06-12 14:20",
        transactionAmount: "¥8,000.00",
        receivedAmount: "¥7,600.00",
        paidAmount: "¥8,000.00",
        direction: "out",
        status: "success",
        paymentNo: "PAY-MI03-REFUND",
        relatedOrderNo: "EX-MI-202606120003",
        relatedPaymentNo: "PAY-MI03-WECHAT",
        merchantTrace: "RF-MI03-202606120003",
        channelTrace: "420000260120260612503",
      },
      {
        code: "WECHAT_TOPUP",
        name: "微信支付",
        note: "换货新销售（含补差）",
        time: "2026-06-12 14:27",
        transactionAmount: "¥10,000.00",
        receivedAmount: "¥9,400.00",
        paidAmount: "¥10,000.00",
        direction: "in",
        status: "success",
        paymentNo: "PAY-MI03-EXCHANGE-SALE",
        relatedOrderNo: "RO-MI-N-202606120003",
        relatedPaymentNo: "PAY-MI03-REFUND",
        merchantTrace: "WX-MI03-TOPUP-202606120003",
        channelTrace: "420000260120260612403",
      },
    ],
    invoices: [],
    invoiceEvents: [],
    applyInfo: ["-", "-", "-", "-", "-"],
    followups: [
      ["换货", "EX-MI-202606120003", "RO-MI-202606120003", "北京朝阳测试店 / BJ-CY-006", "2026-06-12 14:20", "¥8,000.00", "处理成功", "未开票"],
      ["换货新销售", "RO-MI-N-202606120003", "RO-MI-202606120003", "北京朝阳测试店 / BJ-CY-006", "2026-06-12 14:27", "¥10,000.00", "处理成功", "未开票"],
    ],
    effectiveInvoiceContents: [
      {
        preInvoiceRequestId: "PRE-MI03-SH-001",
        preInvoiceRequestSequence: 1,
        storeName: "上海五角场店",
        storeSn: "SH-WJC-088",
        relatedOrderNos: ["RO-MI-202606120003"],
        items: [
          ["SKU-MI03-COAT-A", "风衣 A", "服饰", "件", "1", "¥12,000.00"],
          ["SKU-MI03-BELT", "皮带", "配饰", "件", "1", "¥3,000.00"],
        ],
      },
      {
        preInvoiceRequestId: "PRE-MI03-BJ-002",
        preInvoiceRequestSequence: 2,
        storeName: "北京朝阳测试店",
        storeSn: "BJ-CY-006",
        relatedOrderNos: ["RO-MI-N-202606120003"],
        items: [
          ["SKU-MI03-BAG-B", "皮包 B", "箱包", "件", "1", "¥10,000.00"],
        ],
      },
    ],
    events: [],
  },
  {
    orderSn: "RO-S10-202606120010",
    salesSn: "S-S10-202606120010",
    sqbOrderSn: "SQB-S10-202606120010",
    requestId: "REQ-S10-202606120010",
    brandName: "测试品牌_2",
    brandCode: "BR-TEST-002",
    storeName: "上海五角场店",
    storeSn: "SH-WJC-088",
    workstationSn: "POS-02",
    salesTime: "2026-06-12T12:28:00+08:00",
    salesTimeText: "2026-06-12 12:28",
    amount: "¥18,800.00",
    invoiceStatus: "已开票",
    returnStatus: "有退换货",
    effectiveInvoice: "原蓝票已红冲，新蓝票 1 张",
    updated: "2026-06-12 13:18",
    customer: "上海五角场测试商业有限公司",
    purchaserType: "企业",
    taxId: "91310110S10000010",
    subject: "测试品牌二（上海）贸易有限公司",
    subjectTax: "91310000TEST000002",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=scenario-s10",
    invoiceOptions: "电子普票",
    invoiceRemark: "样例 S10：已开票后换货，自动红冲并重开",
    ruleHit: "品牌规则：餐饮零售；项目名称取值商品别名",
    items: [
      ["SKU-S10-LIFE-A", "生活用品套装 A", "餐饮零售", "套", "1", "¥18,800.00"],
    ],
    tenders: [
      ["WECHAT", "微信支付", "-", "2026-06-12 12:28", "¥18,800.00", "WX-S10-202606120010", "420000260120260612010"],
    ],
    invoices: [
      ["2026-06-12 12:41", "普票", "蓝票", "¥18,800.00", "上海五角场测试商业有限公司", "91310110S10000010", "测试品牌二（上海）贸易有限公司", "91310000TEST000002", "红冲成功", "263120000259100001", `<button class="btn link">查看详情</button>`],
      ["2026-06-12 13:18", "普票", "蓝票", "¥18,800.00", "上海五角场测试商业有限公司", "91310110S10000010", "测试品牌二（上海）贸易有限公司", "91310000TEST000002", "开票成功", "263120000259100002", `<button class="btn link">查看详情</button>`],
    ],
    invoiceEvents: [
      {
        name: "发票开具",
        time: "2026-06-12 12:39",
        completedAt: "2026-06-12 12:41",
        status: "成功",
        invoiceNo: "263120000259100001",
      },
      {
        name: "发票红冲",
        time: "2026-06-12 13:08",
        completedAt: "2026-06-12 13:10",
        status: "成功",
        originalInvoiceNo: "263120000259100001",
      },
      {
        name: "发票开具",
        time: "2026-06-12 13:16",
        completedAt: "2026-06-12 13:18",
        status: "成功",
        invoiceNo: "263120000259100002",
      },
    ],
    applyInfo: ["APPLY-S10-202606120010", "2026-06-12 12:36", "2026-06-12 13:18", "-", "-"],
    followups: [
      ["换货", "EX-S10-202606120010", "RO-S10-202606120010", "上海五角场店 / SH-WJC-088", "2026-06-12 12:58", "¥18,800.00", "处理成功", "已处理"],
      ["换货新销售", "RO-S10N-202606120010", "RO-S10-202606120010", "上海五角场店 / SH-WJC-088", "2026-06-12 13:04", "¥18,800.00", "处理成功", "已处理"],
    ],
    events: [],
  },
  {
    orderSn: "RO-S11-202606120011",
    salesSn: "S-S11-202606120011",
    sqbOrderSn: "SQB-S11-202606120011",
    requestId: "REQ-S11-202606120011",
    brandName: "Burberry",
    brandCode: "BR-BURBERRY",
    storeName: "上海恒隆广场店",
    storeSn: "SH-HL-001",
    workstationSn: "POS-01",
    salesTime: "2026-06-12T12:45:00+08:00",
    salesTimeText: "2026-06-12 12:45",
    amount: "¥25,000.00",
    invoiceStatus: "已开票",
    returnStatus: "无退换货",
    effectiveInvoice: "原蓝票已红冲，换开新蓝票 1 张",
    updated: "2026-06-12 13:09",
    customer: "上海恒隆商业管理有限公司",
    purchaserType: "企业",
    taxId: "91310106S11000011",
    subject: "博柏利（上海）贸易有限公司",
    subjectTax: "9131000066935277XR",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=scenario-s11",
    invoiceOptions: "电子普票 / 电子专票",
    invoiceRemark: "样例 S11：业务方换开发票，不涉及退换货订单",
    ruleHit: "品牌规则：服饰；项目名称取值 item_desc",
    items: [
      ["SKU-S11-COAT", "风衣", "服饰", "件", "1", "¥25,000.00"],
    ],
    tenders: [
      ["CARD", "银行卡", "银联", "2026-06-12 12:45", "¥25,000.00", "CARD-S11-202606120011", "UP-S11-202606120011"],
    ],
    invoices: [
      ["2026-06-12 12:56", "普票", "蓝票", "¥25,000.00", "上海恒隆商业管理有限公司", "91310106S11000011", "博柏利（上海）贸易有限公司", "9131000066935277XR", "红冲成功", "263120000259110001", `<button class="btn link">查看详情</button>`],
      ["2026-06-12 13:09", "专票", "蓝票", "¥25,000.00", "上海恒隆商业管理有限公司", "91310106S11000011", "博柏利（上海）贸易有限公司", "9131000066935277XR", "开票成功", "263120000259110002", `<button class="btn link">查看详情</button>`],
    ],
    invoiceEvents: [
      {
        name: "发票开具",
        time: "2026-06-12 12:54",
        completedAt: "2026-06-12 12:56",
        status: "成功",
        invoiceNo: "263120000259110001",
      },
      {
        name: "发票红冲",
        time: "2026-06-12 13:03",
        completedAt: "2026-06-12 13:05",
        status: "成功",
        originalInvoiceNo: "263120000259110001",
      },
      {
        name: "发票换开",
        time: "2026-06-12 13:07",
        completedAt: "2026-06-12 13:09",
        status: "成功",
        invoiceNo: "263120000259110002",
      },
    ],
    applyInfo: ["APPLY-S11-202606120011", "2026-06-12 12:52", "2026-06-12 13:09", "-", "-"],
    followups: [],
    events: [],
  },
  {
    orderSn: "RO-S12-202606120012",
    salesSn: "S-S12-202606120012",
    sqbOrderSn: "SQB-S12-202606120012",
    requestId: "REQ-S12-202606120012",
    brandName: "测试品牌_2",
    brandCode: "BR-TEST-002",
    storeName: "北京朝阳测试店",
    storeSn: "BJ-CY-006",
    workstationSn: "POS-06",
    salesTime: "2026-06-12T13:05:00+08:00",
    salesTimeText: "2026-06-12 13:05",
    amount: "¥12,000.00",
    invoiceStatus: "未开票",
    returnStatus: "无退换货",
    effectiveInvoice: "未开票，积分抵扣不计入可开票金额",
    updated: "2026-06-12 13:06",
    customer: "北京朝阳测试商业有限公司",
    purchaserType: "企业",
    taxId: "91110105S12000012",
    subject: "测试品牌二（上海）贸易有限公司",
    subjectTax: "91310000TEST000002",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=scenario-s12",
    invoiceOptions: "电子普票",
    invoiceRemark: "样例 S12：部分不可开票支付方式",
    ruleHit: "品牌规则：餐饮零售；不可开票支付方式：积分抵扣",
    items: [
      ["SKU-S12-FOOD", "餐饮礼盒", "餐饮零售", "盒", "1", "¥12,000.00"],
    ],
    tenders: [
      ["WECHAT", "微信支付", "-", "2026-06-12 13:05", "¥10,000.00", "WX-S12-202606120012", "420000260120260612012"],
      ["POINTS", "积分抵扣", "-", "2026-06-12 13:05", "¥2,000.00", "PT-S12-202606120012", "-"],
    ],
    invoices: [],
    invoiceEvents: [],
    applyInfo: ["-", "-", "-", "-", "-"],
    followups: [],
    events: [],
  },
  {
    orderSn: "RO-S13-202606120013",
    salesSn: "S-S13-202606120013",
    sqbOrderSn: "SQB-S13-202606120013",
    requestId: "REQ-S13-202606120013",
    brandName: "测试品牌_2",
    brandCode: "BR-TEST-002",
    storeName: "北京朝阳测试店",
    storeSn: "BJ-CY-006",
    workstationSn: "POS-06",
    salesTime: "2026-06-12T13:20:00+08:00",
    salesTimeText: "2026-06-12 13:20",
    amount: "¥3,000.00",
    invoiceStatus: "未开票",
    returnStatus: "无退换货",
    effectiveInvoice: "当前无可开票金额",
    updated: "2026-06-12 13:21",
    businessCode: "全额不可开票支付",
    customer: "北京朝阳测试商业有限公司",
    purchaserType: "企业",
    taxId: "91110105S13000013",
    subject: "测试品牌二（上海）贸易有限公司",
    subjectTax: "91310000TEST000002",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=scenario-s13",
    invoiceOptions: "电子普票",
    invoiceRemark: "样例 S13：全部使用礼品卡支付，当前无可开票金额",
    ruleHit: "不可开票支付方式：礼品卡支付覆盖全额",
    items: [
      ["SKU-S13-MEMBER", "会员权益兑换礼盒", "餐饮零售", "盒", "1", "¥3,000.00"],
    ],
    tenders: [
      {
        code: "GIFT_CARD",
        name: "礼品卡支付",
        note: "-",
        time: "2026-06-12 13:20",
        transactionAmount: "¥3,000.00",
        receivedAmount: "¥2,850.00",
        paidAmount: "¥3,000.00",
        direction: "in",
        status: "success",
        paymentNo: "PAY-S13-GIFT-CARD",
        relatedOrderNo: "RO-S13-202606120013",
        relatedPaymentNo: "",
        merchantTrace: "GC-S13-202606120013",
        channelTrace: "GIFT202606120013",
      },
    ],
    invoices: [],
    invoiceEvents: [],
    applyInfo: ["-", "-", "-", "-", "-"],
    followups: [],
    events: [],
  },
  {
    orderSn: "RO-S14-202606120014",
    salesSn: "S-S14-202606120014",
    sqbOrderSn: "SQB-S14-202606120014",
    requestId: "REQ-S14-202606120014",
    brandName: "Burberry",
    brandCode: "BR-BURBERRY",
    storeName: "深圳万象城店",
    storeSn: "SZ-MIXC-052",
    workstationSn: "POS-05",
    salesTime: "2026-06-12T13:38:00+08:00",
    salesTimeText: "2026-06-12 13:38",
    amount: "¥7,200.00",
    invoiceStatus: "开票中",
    returnStatus: "无退换货",
    effectiveInvoice: "开票失败，待补充规则后重试",
    updated: "2026-06-12 13:47",
    customer: "深圳万象城商业管理有限公司",
    purchaserType: "企业",
    taxId: "91440300S14000014",
    subject: "博柏利（上海）贸易有限公司",
    subjectTax: "9131000066935277XR",
    invoiceUrl: "https://uinvoice.shouqianba.com/retail/apply?token=scenario-s14",
    invoiceOptions: "电子普票",
    invoiceRemark: "样例 S14：商品开票规则缺失导致开票失败",
    ruleHit: "未命中商品开票规则：个性化服务",
    items: [
      ["SKU-S14-CUSTOM", "定制刻字服务", "个性化服务", "次", "1", "¥7,200.00"],
    ],
    tenders: [
      ["ALIPAY", "支付宝", "-", "2026-06-12 13:38", "¥7,200.00", "ALI-S14-202606120014", "202606122200014"],
    ],
    invoices: [],
    invoiceEvents: [
      {
        name: "发票开具",
        time: "2026-06-12 13:45",
        status: "失败",
        reason: "未找到商品大类“个性化服务”对应的有效开票规则。",
      },
    ],
    applyInfo: ["APPLY-S14-202606120014", "2026-06-12 13:42", "-", "未找到商品大类对应的有效开票规则", "-"],
    followups: [],
    events: [],
  }
);

function cloneScenarioOrder(sourceOrderSn, sourceToken, targetToken) {
  const source = orders.find((order) => order.orderSn === sourceOrderSn);
  if (!source) return null;
  return JSON.parse(
    JSON.stringify(source)
      .replaceAll(sourceToken, targetToken)
      .replaceAll(sourceToken.toLowerCase(), targetToken.toLowerCase()),
  );
}

function replaceScenarioText(order, replacements) {
  if (!order) return order;
  const next = replacements.reduce(
    (serialized, [source, target]) => serialized.replaceAll(source, target),
    JSON.stringify(order),
  );
  return JSON.parse(next);
}

let s15 = cloneScenarioOrder("RO-S01-202606120001", "S01", "S15");
s15 = replaceScenarioText(s15, [["202606120001", "202606120015"]]);
Object.assign(s15, {
  salesTime: "2026-06-12T13:55:00+08:00",
  salesTimeText: "2026-06-12 13:55",
  updated: "2026-06-12 13:56",
  amount: "¥18,000.00",
  invoiceStatus: "未开票",
  returnStatus: "无退换货",
  effectiveInvoice: "未开票，赠品不参与开票",
  customer: "上海恒隆商业管理有限公司",
  taxId: "91310106S15000015",
  invoiceRemark: "样例 S15：普通商品与赠品，赠品不进入发票明细",
  ruleHit: "品牌规则：服饰；零金额赠品不参与开票",
  items: [
    ["SKU-S15-COAT", "经典风衣", "服饰", "件", "1", "¥18,000.00"],
    ["SKU-S15-GIFT", "护理套装（赠品）", "赠品", "套", "1", "¥0.00"],
  ],
  tenders: [
    ["WECHAT", "微信支付", "-", "2026-06-12 13:55", "¥18,000.00", "WX-S15-202606120015", "420000260120260612015"],
  ],
  invoices: [],
  invoiceEvents: [],
  applyInfo: ["-", "-", "-", "-", "-"],
  followups: [],
  events: [],
});

let s16 = cloneScenarioOrder("RO-S03-202606120003", "S03", "S16");
s16 = replaceScenarioText(s16, [["202606120003", "202606120016"]]);
Object.assign(s16, {
  storeName: "成都太古里店",
  storeSn: "CD-TGL-018",
  workstationSn: "POS-02",
  salesTime: "2026-06-12T14:12:00+08:00",
  salesTimeText: "2026-06-12 14:12",
  updated: "2026-06-12 14:28",
  amount: "¥21,000.00",
  invoiceStatus: "已开票",
  returnStatus: "无退换货",
  effectiveInvoice: "已按两个开票主体开具 2 张蓝票",
  customer: "成都太古里商业管理有限公司",
  taxId: "91510100S16000016",
  invoiceRemark: "样例 S16：普通商品与需独立税号开票商品，一次申请拆为两张票",
  ruleHit: "品牌规则：普通商品与特殊商品按开票主体拆票",
  items: [
    ["SKU-S16-BAG", "经典皮包", "箱包", "件", "1", "¥16,000.00"],
    ["SKU-S16-GIFT-CARD", "礼品卡商品", "预付卡", "张", "1", "¥5,000.00"],
  ],
  tenders: [
    ["CARD", "银行卡", "银联", "2026-06-12 14:12", "¥21,000.00", "CARD-S16-202606120016", "UP-S16-202606120016"],
  ],
  invoices: [
    ["2026-06-12 14:26", "普票", "蓝票", "¥16,000.00", "成都太古里商业管理有限公司", "91510100S16000016", "博柏利（成都）贸易有限公司", "91510100BURB000018", "开票成功", "263120000259160001", `<button class="btn link">查看详情</button>`],
    ["2026-06-12 14:28", "普票", "蓝票", "¥5,000.00", "成都太古里商业管理有限公司", "91510100S16000016", "博柏利礼品卡业务（上海）有限公司", "91310000BURBGIFT16", "开票成功", "263120000259160002", `<button class="btn link">查看详情</button>`],
  ],
  invoiceEvents: [
    { name: "发票开具", time: "2026-06-12 14:22", completedAt: "2026-06-12 14:28", status: "成功", invoiceNo: "263120000259160001 / 263120000259160002" },
  ],
  applyInfo: ["APPLY-S16-202606120016", "2026-06-12 14:20", "2026-06-12 14:28", "-", "-"],
  followups: [],
  events: [],
});

let s17 = cloneScenarioOrder("RO-S09-202606120009", "S09", "S17");
s17 = replaceScenarioText(s17, [
  ["202606120009", "202606120017"],
  ["2026-06-12T12:10:00+08:00", "2026-06-12T14:30:00+08:00"],
  ["2026-06-12 12:10", "2026-06-12 14:30"],
  ["2026-06-12 12:26", "2026-06-12 14:42"],
  ["2026-06-12 12:32", "2026-06-12 14:48"],
]);
Object.assign(s17, {
  updated: "2026-06-12 14:48",
  effectiveInvoice: "未开票，跨门店部分换货后待开票",
  invoiceRemark: "样例 S17：未开票前跨门店部分换货，按换货后的门店与税号拆分开票内容",
});

let s18 = cloneScenarioOrder("RO-S10-202606120010", "S10", "S18");
s18 = replaceScenarioText(s18, [
  ["202606120010", "202606120018"],
  ["2026-06-12T12:28:00+08:00", "2026-06-12T14:48:00+08:00"],
  ["2026-06-12 12:28", "2026-06-12 14:48"],
]);
Object.assign(s18, {
  storeName: "上海恒隆广场店",
  storeSn: "SH-HL-001",
  workstationSn: "POS-01",
  salesTime: "2026-06-12T14:48:00+08:00",
  salesTimeText: "2026-06-12 14:48",
  updated: "2026-06-12 15:26",
  amount: "¥32,000.00",
  effectiveInvoice: "原门店蓝票已红冲，新门店蓝票已开具",
  customer: "上海恒隆商业管理有限公司",
  taxId: "91310106S18000018",
  invoiceRemark: "样例 S18：已开票后跨门店换货，原门店红冲并按新门店税号重开",
  ruleHit: "原门店税号红冲；换货新销售门店税号重开",
  items: [
    ["SKU-S18-COAT-A", "风衣 A", "服饰", "件", "1", "¥32,000.00"],
  ],
  tenders: [
    ["WECHAT", "微信支付", "-", "2026-06-12 14:48", "¥32,000.00", "WX-S18-202606120018", "420000260120260612018"],
  ],
  invoices: [
    ["2026-06-12 14:58", "普票", "蓝票", "¥32,000.00", "上海恒隆商业管理有限公司", "91310106S18000018", "博柏利（上海）贸易有限公司", "9131000066935277XR", "红冲成功", "263120000259180001", `<button class="btn link">查看详情</button>`],
    ["2026-06-12 15:26", "普票", "蓝票", "¥32,000.00", "上海恒隆商业管理有限公司", "91310106S18000018", "博柏利（成都）贸易有限公司", "91510100BURB000018", "开票成功", "263120000259180002", `<button class="btn link">查看详情</button>`],
  ],
  invoiceEvents: [
    { name: "发票开具", time: "2026-06-12 14:56", completedAt: "2026-06-12 14:58", status: "成功", invoiceNo: "263120000259180001" },
    { name: "发票红冲", time: "2026-06-12 15:18", completedAt: "2026-06-12 15:20", status: "成功", originalInvoiceNo: "263120000259180001" },
    { name: "发票开具", time: "2026-06-12 15:24", completedAt: "2026-06-12 15:26", status: "成功", invoiceNo: "263120000259180002" },
  ],
  applyInfo: ["APPLY-S18-202606120018", "2026-06-12 14:54", "2026-06-12 15:26", "-", "-"],
  followups: [
    ["换货", "EX-S18-202606120018", "RO-S18-202606120018", "成都太古里店 / CD-TGL-018", "2026-06-12 15:06", "¥32,000.00", "处理成功", "已处理"],
    ["换货新销售", "RO-S18N-202606120018", "RO-S18-202606120018", "成都太古里店 / CD-TGL-018", "2026-06-12 15:12", "¥32,000.00", "处理成功", "已处理"],
  ],
  effectiveInvoiceContents: [
    {
      preInvoiceRequestId: "PRE-S18-CD-001",
      preInvoiceRequestSequence: 1,
      storeName: "成都太古里店",
      storeSn: "CD-TGL-018",
      relatedOrderNos: ["RO-S18N-202606120018"],
      items: [["SKU-S18-COAT-B", "风衣 B", "服饰", "件", "1", "¥32,000.00"]],
    },
  ],
  events: [],
});

let s20 = cloneScenarioOrder("RO-S14-202606120014", "S14", "S20");
s20 = replaceScenarioText(s20, [
  ["202606120014", "202606120020"],
  ["2026-06-12T13:38:00+08:00", "2026-06-12T15:40:00+08:00"],
  ["2026-06-12 13:38", "2026-06-12 15:40"],
  ["2026-06-12 13:42", "2026-06-12 15:44"],
  ["2026-06-12 13:45", "2026-06-12 15:47"],
  ["2026-06-12 13:47", "2026-06-12 15:47"],
]);
Object.assign(s20, {
  amount: "¥38,600.00",
  invoiceStatus: "开票中",
  returnStatus: "无退换货",
  effectiveInvoice: "渠道开票失败，额度处理后继续",
  customer: "深圳万象城商业管理有限公司",
  taxId: "91440300S20000020",
  invoiceRemark: "样例 S20：开票渠道额度不足，申请进入异常待处理",
  ruleHit: "渠道返回：税号可用开票额度不足",
  items: [["SKU-S20-COAT", "经典风衣", "服饰", "件", "1", "¥38,600.00"]],
  tenders: [["CARD", "银行卡", "银联", "2026-06-12 15:40", "¥38,600.00", "CARD-S20-202606120020", "UP-S20-202606120020"]],
  invoices: [
    ["2026-06-12 15:47", "普票", "蓝票", "¥38,600.00", "深圳万象城商业管理有限公司", "91440300S20000020", "博柏利（上海）贸易有限公司", "9131000066935277XR", "开票失败", "-", `<button class="btn link">查看详情</button>`],
  ],
  invoiceEvents: [
    { name: "发票开具", time: "2026-06-12 15:47", status: "失败", reason: "开票渠道返回：当前税号可用开票额度不足，请处理后重试。" },
  ],
  applyInfo: ["APPLY-S20-202606120020", "2026-06-12 15:44", "-", "开票渠道返回：当前税号可用开票额度不足，请处理后重试。", "-"],
  followups: [],
  events: [],
});

orders.push(s15, s16, s17, s18, s20);

const scenarioBusinessLabels = {
  S01: "S01｜正常销售—待申请开票",
  S02: "S02｜正常销售—开票处理中",
  S03: "S03｜正常销售—开票成功",
  S04: "S04｜开票前部分退货",
  S05: "S05｜开票前全额退货",
  S06: "S06｜开票中发生部分退货",
  S07: "S07｜已开票后部分退货",
  S08: "S08｜已开票后全额退货",
  S09: "S09｜未开票前原门店换货",
  S10: "S10｜已开票后原门店换货",
  S11: "S11｜消费者发票换开",
  S12: "S12｜部分不可开票支付",
  S13: "S13｜全部金额不可开票",
  S14: "S14｜商品开票规则缺失",
  S15: "S15｜普通商品＋赠品",
  S16: "S16｜特殊商品独立税号拆票",
  S17: "S17｜未开票前跨门店换货",
  S18: "S18｜已开票后跨门店换货",
  S19: "S19｜跨门店换货＋不可开票支付",
  S20: "S20｜渠道开票失败",
};

const scenarioApplicationSources = {
  S02: "顾客自助开票-微信",
  S03: "顾客自助开票-支付宝",
  S06: "顾客自助开票-微信",
  S07: "顾客自助开票-支付宝",
  S08: "顾客自助开票-微信",
  S10: "顾客自助开票-支付宝",
  S11: "顾客自助开票-微信",
  S14: "订单手动开票",
  S16: "商家平台手动开票",
  S18: "顾客自助开票-支付宝",
  S20: "接口开票",
};

const s09 = orders.find((order) => order.orderSn === "RO-S09-202606120009");
if (s09) {
  s09.effectiveInvoice = "未开票，原门店部分换货后待开票";
  s09.invoiceRemark = "样例 S09：未开票前原门店部分换货，不触发红冲";
  s09.followups = s09.followups.map((followup) => {
    const next = [...followup];
    next[3] = "上海五角场店 / SH-WJC-088";
    return next;
  });
  s09.effectiveInvoiceContents = [
    {
      preInvoiceRequestId: "PRE-S09-SH-001",
      preInvoiceRequestSequence: 1,
      storeName: "上海五角场店",
      storeSn: "SH-WJC-088",
      relatedOrderNos: ["RO-S09-202606120009", "RO-S09N-202606120009"],
      items: [
        ["SKU-S09-COAT-A", "风衣 A", "服饰", "件", "1", "¥12,000.00"],
        ["SKU-S09-BELT", "皮带", "配饰", "件", "1", "¥3,000.00"],
        ["SKU-S09-BAG-B", "皮包 B", "箱包", "件", "1", "¥10,000.00"],
      ],
    },
  ];
}

let complexScenario = orders.find((order) => order.orderSn === "RO-MI-202606120003");
complexScenario = replaceScenarioText(complexScenario, [
  ["2026-06-12T14:05:00+08:00", "2026-06-12T15:05:00+08:00"],
  ["2026-06-12 14:05", "2026-06-12 15:05"],
  ["2026-06-12 14:20", "2026-06-12 15:20"],
  ["2026-06-12 14:27", "2026-06-12 15:27"],
]);
if (complexScenario) {
  const complexIndex = orders.findIndex((order) => order.orderSn === "RO-MI-202606120003");
  orders[complexIndex] = complexScenario;
}

orders.forEach((order) => {
  const scenarioMatch = order.orderSn.match(/^RO-S(\d{2})-/);
  const scenarioKey = scenarioMatch ? `S${scenarioMatch[1]}` : order.orderSn === "RO-MI-202606120003" ? "S19" : "";
  if (!scenarioKey) return;
  order.brandName = "Burberry";
  order.brandCode = "BR-BURBERRY";
  order.businessCode = scenarioBusinessLabels[scenarioKey];
  order.applicationSource = scenarioApplicationSources[scenarioKey] || "";
  order.scenarioSequence = Number(scenarioKey.slice(1));
  order.subject = "博柏利（上海）贸易有限公司";
  order.subjectTax = "9131000066935277XR";
  if (order.storeName === "北京朝阳测试店") order.storeName = "北京朝阳店";
  order.followups = (order.followups || []).map((followup) => followup.map((value) => (
    typeof value === "string" ? value.replaceAll("北京朝阳测试店", "北京朝阳店") : value
  )));
  (order.effectiveInvoiceContents || []).forEach((content) => {
    if (content.storeName === "北京朝阳测试店") content.storeName = "北京朝阳店";
  });
  (order.invoices || []).forEach((invoice) => {
    if (String(invoice[6] || "").includes("测试品牌二")) {
      invoice[6] = "博柏利（上海）贸易有限公司";
      invoice[7] = "9131000066935277XR";
    }
  });
});

const s06 = orders.find((order) => order.orderSn === "RO-S06-202606120006");
if (s06) {
  s06.invoiceOptions = "电子普票";
  s06.applications = [
    {
      id: "APPLICATION-S06-ORIGINAL",
      applyNo: "APPLY-S06-202606120006-01",
      source: "顾客自助开票-微信",
      appliedAt: "2026-06-12 11:19",
      invoiceType: "普票",
      buyerName: s06.customer,
      buyerTaxNo: s06.taxId,
      amount: "¥20,000.00",
      status: "红冲中",
      statusDescription: "退换货自动红冲",
      invoices: [
        ["2026-06-12 11:24", "普票", "蓝票", "¥20,000.00", s06.customer, s06.taxId, s06.subject, s06.subjectTax, "红冲中", "263120000259060001", `<button class="btn link">查看详情</button>`],
      ],
      items: [
        ["SKU-S06-LIFE", "生活用品套装", "餐饮零售", "套", "1", "¥15,000.00"],
        ["SKU-S06-GIFT", "礼盒配件", "餐饮零售", "件", "1", "¥5,000.00"],
      ],
      relatedOrderIds: [s06.orderSn],
    },
    {
      id: "APPLICATION-S06-REISSUE",
      applyNo: "APPLY-S06-202606120006-02",
      source: "退换货自动申请",
      appliedAt: "2026-06-12 11:30",
      invoiceType: "普票",
      buyerName: s06.customer,
      buyerTaxNo: s06.taxId,
      amount: "¥15,000.00",
      status: "开票中",
      statusDescription: "",
      invoices: [
        ["2026-06-12 11:31", "普票", "蓝票", "¥15,000.00", s06.customer, s06.taxId, s06.subject, s06.subjectTax, "开票中", "-", `<button class="btn link">刷新</button>`],
      ],
      items: [["SKU-S06-LIFE", "生活用品套装", "餐饮零售", "套", "1", "¥15,000.00"]],
      relatedOrderIds: [s06.orderSn],
    },
  ];
  s06.invoices = s06.applications.flatMap((application) => application.invoices);
}

const s10 = orders.find((order) => order.orderSn === "RO-S10-202606120010");
if (s10) {
  s10.invoiceOptions = "电子专票";
  s10.invoices.forEach((invoice) => { invoice[1] = "专票"; });
}

const storeMasterRecords = [
  { brandCode: "BR-BURBERRY", storeName: "上海恒隆广场店", storeNo: "SH-HL-001", storeId: "ST100001" },
  { brandCode: "BR-BURBERRY", storeName: "南京德基广场店", storeNo: "NJ-DJ-002", storeId: "ST100002" },
  { brandCode: "BR-BURBERRY", storeName: "深圳万象城店", storeNo: "SZ-MIXC-052", storeId: "ST100003" },
  { brandCode: "BR-BURBERRY", storeName: "成都太古里店", storeNo: "CD-TGL-018", storeId: "ST100004" },
  { brandCode: "BR-BURBERRY", storeName: "北京朝阳合生汇店", storeNo: "BJ-HSH-036", storeId: "ST100005" },
  { brandCode: "BR-BURBERRY", storeName: "上海五角场店", storeNo: "SH-WJC-088", storeId: "ST100006" },
  { brandCode: "BR-BURBERRY", storeName: "北京朝阳店", storeNo: "BJ-CY-006", storeId: "ST100007" },
  { brandCode: "BR-TEST-002", storeName: "北京朝阳合生汇店", storeNo: "BJ-HSH-036", storeId: "ST200001" },
  { brandCode: "BR-TEST-002", storeName: "上海五角场店", storeNo: "SH-WJC-088", storeId: "ST200002" },
  { brandCode: "BR-TEST-002", storeName: "北京朝阳测试店", storeNo: "BJ-CY-006", storeId: "ST200003" },
];

orders.forEach((order) => {
  const storeMaster = storeMasterRecords.find((store) => store.brandCode === order.brandCode && store.storeNo === order.storeSn);
  const syncTimestamp = queryDateTimeTimestamp(order.salesTimeText) + 60 * 1000;
  const receiverKey = String(order.orderSn || "order").replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-12);
  order.storeId = storeMaster?.storeId || `ST-${String(order.storeSn || "UNKNOWN").replace(/[^A-Z0-9]/gi, "")}`;
  order.syncedAtText = order.syncedAtText || formatQueryDateTimeTimestamp(syncTimestamp);
  order.syncedAt = order.syncedAt || `${order.syncedAtText.replace(" ", "T")}:00+08:00`;
  order.receiverEmail = order.receiverEmail || `consumer.${receiverKey}@example.com`;
});

const brandSettings = {
  "BR-BURBERRY": {
    version: "2026-08-14",
    brand: "Burberry",
    title: "Burberry 电子发票申请",
    hint: "请确认消费订单并填写发票抬头信息，发票结果将通过短信或邮件发送。",
    phone: "400-000-1856",
    validity: 30,
    color: "#1f2329",
    blockedPayments: [
      ["POINTS", "积分抵扣", "不计入可开票金额", "积分抵扣金额不支持开票", "启用", `<button class="btn link">编辑</button>`],
      ["COUPON", "优惠券抵扣", "不计入可开票金额", "平台或商场券口径待确认", "启用", `<button class="btn link">编辑</button>`],
      ["GIFT_CARD", "礼品卡支付", "不计入可开票金额", "预付卡/礼品卡支付规则待确认", "启用", `<button class="btn link">编辑</button>`],
    ],
  },
  "BR-TEST-002": {
    version: "2026-08-14",
    brand: "测试品牌_2",
    title: "测试品牌_2 电子发票申请",
    hint: "当前为测试品牌开票申请页，页面元素、二维码有效期和不可开票支付方式均按品牌独立生效。",
    phone: "400-000-2002",
    validity: 15,
    color: "#8b1e3f",
    blockedPayments: [
      ["POINTS", "积分抵扣", "不计入可开票金额", "测试品牌默认排除积分抵扣", "启用", `<button class="btn link">编辑</button>`],
      ["STORE_COUPON", "门店优惠券", "不计入可开票金额", "券来源与税务口径待确认", "启用", `<button class="btn link">编辑</button>`],
      ["GIFT_CARD", "礼品卡支付", "不计入可开票金额", "礼品卡实收金额不计入可开票金额", "启用", `<button class="btn link">编辑</button>`],
    ],
  },
};

const workspace = document.querySelector("#workspace");
const drawer = document.querySelector("#drawer");
const drawerBody = document.querySelector("#drawerBody");
const drawerTitle = document.querySelector("#drawerTitle");
const drawerEyebrow = document.querySelector("#drawerEyebrow");
const brandModal = document.querySelector("#brandModal");
const brandModalBody = document.querySelector("#brandModalBody");
const orderActionModal = document.querySelector("#orderActionModal");
const orderActionModalPanel = orderActionModal.querySelector(".action-modal-panel");
const orderActionModalBody = document.querySelector("#orderActionModalBody");
const orderActionModalTitle = document.querySelector("#orderActionModalTitle");
const orderActionModalCancel = document.querySelector("#orderActionModalCancel");
const orderActionModalConfirm = document.querySelector("#orderActionModalConfirm");
const orderActionForm = document.querySelector("#orderActionForm");

if (!document.querySelector('link[rel="icon"]')) {
  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23f6c400'/%3E%3C/svg%3E";
  document.head.appendChild(favicon);
}

function ensureApplicationListNavigation() {
  if (document.querySelector('[data-view="applicationList"]')) return;
  const orderNavigation = document.querySelector('[data-view="orders"]');
  if (!orderNavigation) return;
  const applicationNavigation = document.createElement("button");
  applicationNavigation.type = "button";
  applicationNavigation.className = "menu-child nav-item";
  applicationNavigation.dataset.view = "applicationList";
  applicationNavigation.textContent = "开票申请管理";
  orderNavigation.insertAdjacentElement("afterend", applicationNavigation);
}

ensureApplicationListNavigation();

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => setView(item.dataset.view));
});

document.querySelector("#drawerClose").addEventListener("click", closeDrawer);
drawer.addEventListener("click", (event) => {
  if (event.target === drawer) closeDrawer();
});
document.querySelector("#brandModalClose").addEventListener("click", closeBrandModal);
document.querySelector("#brandModalCancel").addEventListener("click", closeBrandModal);
document.querySelector("#brandModalConfirm").addEventListener("click", confirmBrandSwitch);
brandModal.addEventListener("click", (event) => {
  if (event.target === brandModal) closeBrandModal();
});
document.querySelector("#orderActionModalClose").addEventListener("click", closeOrderActionModal);
orderActionModalCancel.addEventListener("click", closeOrderActionModal);
orderActionModal.addEventListener("click", (event) => {
  if (event.target === orderActionModal) closeOrderActionModal();
});
orderActionForm.addEventListener("submit", submitOrderActionModal);
document.addEventListener("keydown", (event) => {
  if (!orderActionModal.classList.contains("open")) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeOrderActionModal();
    return;
  }
  if (event.key === "Tab") {
    const focusable = [...orderActionModal.querySelectorAll("button:not(:disabled), input:not(:disabled), textarea:not(:disabled)")];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-query-dropdown]")) {
    document.querySelectorAll("[data-dropdown-menu]").forEach((menu) => { menu.hidden = true; });
    document.querySelectorAll("[data-dropdown-trigger]").forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
  }
  if (!event.target.closest("[data-order-column-settings]")) {
    document.querySelectorAll("[data-order-column-panel]").forEach((panel) => { panel.hidden = true; });
    document.querySelectorAll("[data-order-columns]").forEach((button) => button.setAttribute("aria-expanded", "false"));
  }
  if (!event.target.closest("[data-store-suggest]")) {
    document.querySelectorAll("[data-store-suggest]").forEach((root) => closeStoreSuggest(root));
  }
  if (!event.target.closest("[data-query-date-time-range]")) {
    document.querySelectorAll("[data-query-date-time-range]").forEach((root) => closeQueryDateTimeRange(root));
  }
});
bindOverflowTooltipEvents();

function setView(view) {
  const previousView = state.view;
  const shouldRestoreApplicationList = view === "applicationList"
    && ["applicationDetail", "invoiceDetail"].includes(previousView)
    && state.applicationDetailOrigin === "applicationList";
  state.view = view;
  if (view === "brandRules" || view === "groupRules") state.ruleTab = "rules";
  closeDrawer();
  closeBrandModal();
  closeOrderActionModal({ restoreFocus: false });
  document.querySelectorAll(".nav-item").forEach((item) => {
    const applicationOwnedDetail = ["applicationDetail", "invoiceDetail"].includes(view)
      && state.applicationDetailOrigin === "applicationList";
    const activeView = applicationOwnedDetail
      ? "applicationList"
      : ["orderDetail", "applicationDetail", "invoiceDetail", "manualInvoice"].includes(view)
        ? "orders"
        : view;
    const active = item.dataset.view === activeView;
    item.classList.toggle("active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
  updatePageTitle();
  render();
  if (shouldRestoreApplicationList) restoreApplicationListScroll();
  else resetViewScroll();
}

function captureApplicationListScroll() {
  state.applicationListScrollTop = document.querySelector(".main")?.scrollTop || window.scrollY || 0;
  state.applicationListTableScrollLeft = workspace.querySelector(".application-list-table")
    ?.closest(".table-scroll")?.scrollLeft || 0;
}

function restoreApplicationListScroll() {
  requestAnimationFrame(() => {
    const mainScroller = document.querySelector(".main");
    if (mainScroller) mainScroller.scrollTop = state.applicationListScrollTop;
    const tableScroller = workspace.querySelector(".application-list-table")?.closest(".table-scroll");
    if (tableScroller) tableScroller.scrollLeft = state.applicationListTableScrollLeft;
  });
}

function resetViewScroll() {
  const mainScroller = document.querySelector(".main");
  [mainScroller, workspace].filter(Boolean).forEach((container) => {
    container.scrollTop = 0;
    container.scrollLeft = 0;
    if (typeof container.scrollTo === "function") {
      container.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  });
  if (typeof window.scrollTo === "function") {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }
}

function render() {
  if (state.view === "orders") renderOrders();
  if (state.view === "applicationList") renderApplicationList();
  if (state.view === "orderDetail") renderOrderDetail();
  if (state.view === "applicationDetail") renderInvoiceApplicationDetail();
  if (state.view === "invoiceDetail") renderInvoiceDetail();
  if (state.view === "manualInvoice") renderManualInvoice();
  if (state.view === "brandRules") renderBrandRules();
  if (state.view === "groupRules") renderGroupRules();
  if (state.view === "settings") renderSettings();
}

function updatePageTitle() {
}

function accessibleBrands() {
  return brands.filter((brand) => userContext.accessibleBrandCodes.includes(brand.code));
}

function currentBrand() {
  const permittedBrands = accessibleBrands();
  return permittedBrands.find((brand) => brand.code === state.currentBrandCode) || permittedBrands[0] || null;
}

function brandNumberForCode(brandCode) {
  return brands.find((brand) => brand.code === brandCode)?.number || "-";
}

function currentSettings() {
  const brand = currentBrand();
  return brand ? brandSettings[brand.code] || brandSettings[brands[0].code] : brandSettings[brands[0].code];
}

function currentBrandOrders() {
  const brand = currentBrand();
  if (!brand) return [];
  return orders
    .filter((order) => (
      order.brandCode === brand.code
      && userContext.accessibleBrandCodes.includes(order.brandCode)
    ))
    .sort((left, right) => {
      const leftSequence = Number(left.scenarioSequence) || Number.MAX_SAFE_INTEGER;
      const rightSequence = Number(right.scenarioSequence) || Number.MAX_SAFE_INTEGER;
      if (leftSequence !== rightSequence) return leftSequence - rightSequence;
      return queryDateTimeTimestamp(left.salesTimeText) - queryDateTimeTimestamp(right.salesTimeText);
    });
}

function currentBrandVisibleOrders() {
  return currentBrandOrders().filter((order) => !order.isLegacyCompatibilitySample);
}

function currentBrandStoreOptions() {
  const brand = currentBrand();
  if (!brand) return [];
  return storeMasterRecords
    .filter((store) => store.brandCode === brand.code && userContext.accessibleBrandCodes.includes(store.brandCode))
    .map((store) => ({
      id: store.storeId,
      name: store.storeName,
      no: store.storeNo,
      searchText: `${store.storeName} ${store.storeNo} ${store.storeId}`.toLowerCase(),
    }));
}

function storeSuggestions(keyword = "") {
  const normalizedKeyword = String(keyword || "").trim().toLowerCase();
  return currentBrandStoreOptions().filter((store) => !normalizedKeyword || store.searchText.includes(normalizedKeyword));
}

function orderSyncTimeText(order) {
  return order.syncedAtText || order.salesTimeText || "";
}

function ensureSelectedOrderInCurrentBrand() {
  const brand = currentBrand();
  if (!brand) {
    state.selectedOrder = "";
    return;
  }
  const selectedOrder = orders.find((order) => order.orderSn === state.selectedOrder);
  if (selectedOrder?.brandCode === brand.code && userContext.accessibleBrandCodes.includes(selectedOrder.brandCode)) return;
  state.selectedOrder = currentBrandOrders()[0]?.orderSn || "";
}

function renderBrandScope() {
  const brand = currentBrand();
  if (!brand) {
    return `<section class="brand-scope permission-state" data-demo-state="permission"><div class="empty">当前身份暂无可访问品牌，请联系管理员授权。</div></section>`;
  }
  const canSwitchBrand = accessibleBrands().length > 1;
  return `
    <section class="brand-scope">
      <div class="brand-scope-main">
        <span class="brand-avatar">${brand.logo}</span>
        <div>
          <strong>${brand.name}</strong>
        </div>
      </div>
      ${canSwitchBrand ? `<div class="brand-scope-side"><button class="btn" data-brand-switch>切换品牌</button></div>` : ""}
    </section>
  `;
}

function bindBrandScope() {
  const switchButton = workspace.querySelector("[data-brand-switch]");
  if (switchButton) switchButton.addEventListener("click", openBrandModal);
}

function orderStats(list) {
  const invoiceAmount = list.reduce((sum, order) => {
    return (
      sum +
      order.invoices.reduce((invoiceSum, invoice) => {
        return invoiceSum + parseMoney(invoice[3]);
      }, 0)
    );
  }, 0);
  return {
    count: list.length,
    invoiceAmount: formatMoney(invoiceAmount),
    returnOrders: list.filter((order) => order.returnStatus !== "无退换货").length,
    fullReturnOrders: list.filter((order) => order.returnStatus === "已全额退货").length,
  };
}

function parseMoney(value) {
  const normalized = String(value).replace(/[¥,]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  return `¥${value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function normalizeTenderDirection(direction, amount, code, name) {
  const normalized = String(direction || "").trim().toLowerCase();
  if (["2", "out", "refund", "debit", "退款", "支出"].includes(normalized)) return "out";
  if (["1", "in", "income", "credit", "收入"].includes(normalized)) return "in";
  if (parseMoney(amount) < 0 || code === "REFUND" || String(name || "").includes("退款")) return "out";
  return "in";
}

function normalizeTenderStatus(status, legacy = false) {
  if (legacy) return "success";
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "1") return "success";
  if (["2", "3", "4"].includes(normalized)) return "inactive";
  return normalized || "unknown";
}

function apiCentAmount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number / 100 : 0;
}

function normalizeTenderRecord(tender, index = 0) {
  const legacy = Array.isArray(tender);
  const sourceType = legacy
    ? "legacy_tuple"
    : tender?.sourceType || (tender?.synthetic ? "synthetic_followup" : "explicit");
  const compatibilityPath = sourceType !== "explicit";
  const code = legacy ? tender[0] : tender?.code || tender?.tenderCode || tender?.payment_code;
  const name = legacy ? tender[1] : tender?.name || tender?.method || tender?.tenderName || tender?.payment_method_name;
  const note = legacy ? tender[2] : tender?.note || tender?.description;
  const time = legacy ? tender[3] : tender?.time || tender?.paidAt || tender?.transactionTime || tender?.transaction_time;
  const transactionAmount = legacy
    ? tender[4]
    : tender?.transactionAmount
      ?? (tender?.transaction_amount != null ? apiCentAmount(tender.transaction_amount) : tender?.amount ?? 0);
  const inferredReceivedAmountProvided = legacy
    || compatibilityPath
    || tender?.receivedAmount != null
    || tender?.actualReceivedAmount != null
    || tender?.received_amount != null
    || tender?.collectedAmount != null
    || tender?.collected_amount != null;
  const receivedAmountProvided = tender?.receivedAmountProvided == null
    ? inferredReceivedAmountProvided
    : Boolean(tender.receivedAmountProvided);
  const receivedAmount = legacy
    ? transactionAmount
    : tender?.receivedAmount
      ?? tender?.actualReceivedAmount
      ?? tender?.collectedAmount
      ?? (tender?.received_amount != null
        ? apiCentAmount(tender.received_amount)
        : tender?.collected_amount != null
          ? apiCentAmount(tender.collected_amount)
          : compatibilityPath ? transactionAmount : 0);
  const paidAmount = legacy
    ? transactionAmount
    : tender?.paidAmount
      ?? tender?.actualPaidAmount
      ?? (tender?.paid_amount != null ? apiCentAmount(tender.paid_amount) : compatibilityPath ? transactionAmount : 0);
  const merchantTrace = legacy
    ? tender[5]
    : tender?.merchantTrace || tender?.merchantTraceNo || tender?.merchant_trace_no;
  const channelTrace = legacy
    ? tender[6]
    : tender?.channelTrace || tender?.channelTraceNo || tender?.channel_trace_no;
  const direction = normalizeTenderDirection(
    legacy ? "" : tender?.direction ?? tender?.transaction_direction,
    transactionAmount,
    code,
    name
  );
  const transactionSn = legacy
    ? ""
    : tender?.transactionSn || tender?.transaction_sn || tender?.paymentNo || "";
  const originalTransactionSn = legacy
    ? ""
    : tender?.originalTransactionSn || tender?.original_transaction_sn || tender?.relatedPaymentNo || "";
  const paymentNo = legacy
    ? merchantTrace || `LEGACY-PAYMENT-${index + 1}`
    : transactionSn || merchantTrace || channelTrace || `PAYMENT-${index + 1}`;

  return {
    code: code || "-",
    name: name || "-",
    note: note || "-",
    time: time || "-",
    transactionAmount: formatMoney(Math.abs(parseMoney(transactionAmount))),
    receivedAmount: formatMoney(Math.abs(parseMoney(receivedAmount))),
    paidAmount: formatMoney(Math.abs(parseMoney(paidAmount))),
    direction,
    status: normalizeTenderStatus(legacy ? "success" : tender?.status ?? tender?.transaction_status, legacy),
    paymentNo,
    transactionSn,
    relatedOrderNo: legacy
      ? ""
      : tender?.relatedOrderNo || tender?.relatedOrderSn || tender?.related_order_sn || "",
    relatedPaymentNo: originalTransactionSn,
    originalTransactionSn,
    merchantTrace: merchantTrace || "-",
    channelTrace: channelTrace || "-",
    synthetic: Boolean(!legacy && tender?.synthetic),
    sourceType,
    compatibilityPath,
    receivedAmountProvided,
    dataValid: receivedAmountProvided,
  };
}

function tenderStatusIsEffective(status) {
  return ["success", "succeeded", "completed", "paid", "成功", "已支付", "已完成"].includes(
    String(status || "").trim().toLowerCase()
  );
}

function explicitOrderTenders(order) {
  const rawTenders = [
    ...(order?.tenders || []),
    ...(order?.followupTenders || []),
    ...(order?.followups || []).flatMap((followup) => Array.isArray(followup?.tenders) ? followup.tenders : []),
  ];
  const normalizedTenders = rawTenders.map((tender, index) => normalizeTenderRecord(tender, index));
  const positionsByTransactionSn = new Map();
  return normalizedTenders.reduce((result, tender) => {
    if (!tender.transactionSn) {
      result.push(tender);
      return result;
    }
    const existingIndex = positionsByTransactionSn.get(tender.transactionSn);
    if (existingIndex == null) {
      positionsByTransactionSn.set(tender.transactionSn, result.length);
      result.push(tender);
      return result;
    }
    const existing = result[existingIndex];
    if ((!tenderStatusIsEffective(existing.status) || !existing.dataValid)
      && tenderStatusIsEffective(tender.status)
      && tender.dataValid) {
      result[existingIndex] = tender;
    }
    return result;
  }, []);
}

function syntheticFollowupTender(followup) {
  const [type, followupSn, , , time, amount] = followup;
  const isNewSale = type.includes("换货新销售");
  const isOut = type.includes("退货") || (type.includes("换货") && !isNewSale);
  const code = isOut ? "REFUND" : "EXCHANGE_SALE";
  const name = type.includes("退货") ? "退款" : isOut ? "换货退款" : "换货新销售";
  return normalizeTenderRecord({
    code,
    name,
    note: "历史样例未提供支付明细，按后续订单金额兼容推导",
    time,
    transactionAmount: formatMoney(Math.abs(parseMoney(amount))),
    receivedAmount: formatMoney(Math.abs(parseMoney(amount))),
    paidAmount: formatMoney(Math.abs(parseMoney(amount))),
    direction: isOut ? "out" : "in",
    status: "success",
    paymentNo: `SYNTHETIC-${followupSn}`,
    relatedOrderNo: followupSn,
    relatedPaymentNo: "",
    merchantTrace: `${isOut ? "RF" : "EXS"}-${followupSn}`,
    channelTrace: `CHANNEL-${followupSn}`,
    synthetic: true,
  });
}

function tenderCoversFollowup(tender, followup) {
  const [type, followupSn, , , time, amount] = followup;
  if (tender.relatedOrderNo === followupSn) return true;
  const isNewSale = type.includes("换货新销售");
  const expectedDirection = type.includes("退货") || (type.includes("换货") && !isNewSale) ? "out" : "in";
  return tender.time === time
    && tender.direction === expectedDirection
    && Math.abs(parseMoney(tender.transactionAmount) - Math.abs(parseMoney(amount))) < 0.01;
}

function currentOrderTenders(order) {
  const tenders = explicitOrderTenders(order);
  if (tenders.some((tender) => tender.sourceType === "explicit")) return tenders;
  (order?.followups || []).forEach((followup) => {
    if (!tenders.some((tender) => tenderCoversFollowup(tender, followup))) {
      tenders.push(syntheticFollowupTender(followup));
    }
  });
  return tenders;
}

function enabledBlockedPaymentCodes(order) {
  const settings = brandSettings[order?.brandCode];
  return new Set((settings?.blockedPayments || [])
    .filter((payment) => {
      const status = Array.isArray(payment) ? payment[4] : payment?.status;
      return String(status || "").trim() === "启用";
    })
    .map((payment) => Array.isArray(payment) ? payment[0] : payment?.code)
    .filter(Boolean));
}

function currentInvoiceableResult(order) {
  const tenders = currentOrderTenders(order);
  const blockedCodes = enabledBlockedPaymentCodes(order);
  let eligibleReceivedCents = 0;
  let excludedReceivedCents = 0;
  const paymentChains = [];
  const paymentChainsByReference = new Map();
  const entries = tenders.map((tender) => {
    const statusEffective = tenderStatusIsEffective(tender.status);
    const effective = statusEffective && tender.dataValid;
    const receivedCents = Math.round(Math.abs(parseMoney(tender.receivedAmount)) * 100);
    return {
      ...tender,
      effective,
      nonInvoiceable: false,
      signedReceivedAmount: effective ? (tender.direction === "out" ? -receivedCents : receivedCents) / 100 : 0,
      appliedReceivedAmount: 0,
      ignoredReceivedAmount: 0,
      invoiceableContribution: 0,
      refundRelationValid: tender.direction === "out" ? false : null,
      originalPaymentNo: "",
      originalPaymentCode: "",
      originalPaymentName: "",
      calculationNote: effective
        ? ""
        : !tender.dataValid
          ? "正式支付数据缺少实收金额，不参与计算"
          : "支付状态未生效，不参与计算",
    };
  });

  entries.forEach((entry) => {
    if (!entry.effective || entry.direction !== "in") return;
    const receivedCents = Math.round(Math.abs(parseMoney(entry.receivedAmount)) * 100);
    const nonInvoiceable = blockedCodes.has(entry.code);
    const chain = {
      entry,
      receivedCents,
      remainingReceivedCents: receivedCents,
      nonInvoiceable,
    };
    paymentChains.push(chain);
    [entry.paymentNo, entry.merchantTrace, entry.channelTrace]
      .filter((reference) => reference && reference !== "-")
      .forEach((reference) => paymentChainsByReference.set(reference, chain));
    entry.nonInvoiceable = nonInvoiceable;
    entry.appliedReceivedAmount = receivedCents / 100;
    entry.invoiceableContribution = nonInvoiceable ? 0 : receivedCents / 100;
    entry.calculationNote = nonInvoiceable ? "命中当前启用的不可开票支付方式" : "按实收金额增加";
    if (nonInvoiceable) excludedReceivedCents += receivedCents;
    else eligibleReceivedCents += receivedCents;
  });

  entries.forEach((entry) => {
    if (!entry.effective || entry.direction !== "out") return;
    const requestedRefundCents = Math.round(Math.abs(parseMoney(entry.receivedAmount)) * 100);
    let chain = entry.relatedPaymentNo ? paymentChainsByReference.get(entry.relatedPaymentNo) : null;

    if (!chain && entry.compatibilityPath) {
      const compatibleChains = paymentChains.filter((candidate) => (
        candidate.entry.compatibilityPath
          && candidate.remainingReceivedCents > 0
          && String(candidate.entry.time || "") <= String(entry.time || "")
      ));
      chain = compatibleChains.find((candidate) => candidate.remainingReceivedCents >= requestedRefundCents)
        || compatibleChains[0]
        || null;
      if (chain) entry.calculationNote = "历史支付数据无关联号，按兼容路径关联原正向支付";
    }

    if (!chain) {
      entry.ignoredReceivedAmount = requestedRefundCents / 100;
      entry.calculationNote = entry.compatibilityPath
        ? "历史兼容路径未找到可冲减的原正向支付，本笔退款不参与计算"
        : "退款未关联可找到的原正向支付，不参与计算";
      return;
    }

    const appliedRefundCents = Math.min(requestedRefundCents, chain.remainingReceivedCents);
    chain.remainingReceivedCents -= appliedRefundCents;
    entry.refundRelationValid = true;
    entry.originalPaymentNo = chain.entry.paymentNo;
    entry.originalPaymentCode = chain.entry.code;
    entry.originalPaymentName = chain.entry.name;
    entry.nonInvoiceable = chain.nonInvoiceable;
    entry.appliedReceivedAmount = -appliedRefundCents / 100;
    entry.ignoredReceivedAmount = (requestedRefundCents - appliedRefundCents) / 100;
    entry.invoiceableContribution = chain.nonInvoiceable ? 0 : -appliedRefundCents / 100;
    if (!entry.calculationNote) {
      entry.calculationNote = appliedRefundCents < requestedRefundCents
        ? "退款按原支付剩余实收额封顶冲减"
        : "退款按已关联原支付的实收余额冲减";
    }
    if (chain.nonInvoiceable) excludedReceivedCents -= appliedRefundCents;
    else eligibleReceivedCents -= appliedRefundCents;
  });

  const netReceivedCents = eligibleReceivedCents + excludedReceivedCents;
  const invoiceableCents = Math.max(0, eligibleReceivedCents);
  const settings = brandSettings[order?.brandCode] || {};
  return {
    amount: invoiceableCents / 100,
    invoiceableAmount: invoiceableCents / 100,
    formattedAmount: formatMoney(invoiceableCents / 100),
    eligibleReceived: eligibleReceivedCents / 100,
    excludedReceived: excludedReceivedCents / 100,
    netReceived: netReceivedCents / 100,
    entries,
    evaluatedAt: order?.updated || order?.syncedAtText || "-",
    configVersion: settings.version || "demo-config-v1",
  };
}

function currentInvoiceableAmountText(order) {
  return currentInvoiceableResult(order).formattedAmount;
}

function signedTenderAmountText(value, direction) {
  const amount = Math.abs(parseMoney(value));
  return `${direction === "out" ? "-" : ""}${formatMoney(amount)}`;
}

function renderBrandRules() {
  const brand = currentBrand();
  const setting = invoiceItemNameSettings.brand[brand.code] || invoiceItemNameSettings.brand["BR-BURBERRY"];
  const brandRules = rules.filter((rule) => rule.scope === "品牌" && rule.brandCode === brand.code);

  workspace.innerHTML = `
    ${renderBrandScope()}
    ${renderRuleTabs()}
    ${
      state.ruleTab === "rules"
        ? `
          <div class="toolbar compact rules-toolbar">
            ${field("商品大类", `<input placeholder="商品大类" />`)}
            ${field("税收分类编码", `<input placeholder="税收分类编码" />`)}
            <div class="btn-row">
              <button class="btn secondary">清空</button>
              <button class="btn">搜索</button>
            </div>
          </div>
          ${renderRulesTable("品牌商品开票规则", brandRules, false, "brand")}
        `
        : renderItemNameSettingPanel("brand", setting)
    }
  `;

  bindBrandScope();
  bindRuleTabs();
  bindRulePageActions("brand");
}

function renderGroupRules() {
  const group = brands[0].group;
  const groupRules = rules.filter((rule) => rule.scope === "集团");

  workspace.innerHTML = `
    <section class="brand-scope">
      <div class="brand-scope-main">
        <span class="brand-avatar">集</span>
        <div>
          <strong>${group}</strong>
          <span>集团维度规则，对集团下各品牌作为兜底规则生效</span>
        </div>
      </div>
    </section>
    ${renderRuleTabs()}
    ${
      state.ruleTab === "rules"
        ? `
          <div class="toolbar compact rules-toolbar">
            ${field("商品大类", `<input placeholder="商品大类" />`)}
            ${field("税收分类编码", `<input placeholder="税收分类编码" />`)}
            <div class="btn-row">
              <button class="btn secondary">清空</button>
              <button class="btn">搜索</button>
            </div>
          </div>
          ${renderRulesTable("集团商品开票规则", groupRules, false, "group")}
        `
        : renderItemNameSettingPanel("group", invoiceItemNameSettings.group)
    }
  `;

  bindRuleTabs();
  bindRulePageActions("group");
}

function renderRuleTabs() {
  return `
    <div class="tabbar">
      <button class="${state.ruleTab === "rules" ? "active" : ""}" data-rule-tab="rules">商品开票规则设置</button>
      <button class="${state.ruleTab === "other" ? "active" : ""}" data-rule-tab="other">其他设置</button>
    </div>
  `;
}

function bindRuleTabs() {
  workspace.querySelectorAll("[data-rule-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.ruleTab = button.dataset.ruleTab;
      render();
    });
  });
}

function renderItemNameSettingPanel(scope, setting) {
  return `
    <section class="setting-list-panel">
      <div class="setting-list-item">
        <div class="setting-list-main">
          <h2>发票明细开票项目名称</h2>
          <p>控制发票明细中“开票项目名称”的取值来源。修改后影响后续新开、重开的发票明细。</p>
        </div>
        <div class="setting-list-meta">
          <div>
            <span>当前取值</span>
            <strong>${itemNameLabel(setting.itemName)}</strong>
          </div>
          <div>
            <span>更新时间</span>
            <strong>${setting.updated}</strong>
          </div>
        </div>
        <div class="setting-list-action">
          <button class="btn secondary" data-item-name-setting="${scope}">编辑设置</button>
        </div>
      </div>
    </section>
  `;
}

function renderRulesTable(title, ruleList, showBrand, scope) {
  return `
    <div class="section-head">
      <h2>${title}</h2>
      <div class="btn-row">
        <button class="btn secondary">导出</button>
        <button class="btn secondary">批量添加</button>
        <button class="btn" data-rule-new="${scope}">新增规则</button>
      </div>
    </div>
    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            ${showBrand ? "<th>品牌</th>" : ""}
            <th>商品大类</th>
            <th>商品别名</th>
            <th>税收分类编码</th>
            <th style="width:82px">税率</th>
            <th>优惠政策标识</th>
            <th style="width:86px">操作</th>
          </tr>
        </thead>
        <tbody>
          ${
            ruleList.length
              ? ruleList
                  .map(
                    (rule) => `
            <tr>
              ${showBrand ? `<td>${rule.brand}</td>` : ""}
              <td>${rule.category}</td>
              <td>${rule.alias}</td>
              <td>${rule.taxCode}</td>
              <td>${rule.rate}</td>
              <td>${rule.policy}</td>
              <td><button class="btn link" data-rule="${rule.id}">编辑</button></td>
            </tr>`
                  )
                  .join("")
              : `<tr><td colspan="${showBrand ? 7 : 6}" class="table-empty">暂无商品开票规则</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;
}

function bindRulePageActions(scope) {
  workspace.querySelectorAll("[data-rule]").forEach((button) => {
    button.addEventListener("click", () => openRule(button.dataset.rule, scope));
  });
  const newButton = workspace.querySelector("[data-rule-new]");
  if (newButton) newButton.addEventListener("click", () => openRule(undefined, scope));
  const itemNameButton = workspace.querySelector("[data-item-name-setting]");
  if (itemNameButton) itemNameButton.addEventListener("click", () => openItemNameSetting(scope));
}

function selectedOption(value, selectedValue) {
  return value === selectedValue ? "selected" : "";
}

function taxRateOptionsMarkup(selectedRate) {
  return taxRateOptions.map((rate) => `<option ${selectedOption(rate, selectedRate)}>${rate}</option>`).join("");
}

function policyOptionsMarkup(selectedPolicy) {
  return preferentialPolicyOptions
    .map(([code, name]) => {
      const label = code === "无" ? "无" : `${code} ${name}`;
      return `<option value="${name}" ${selectedOption(name, selectedPolicy)}>${label}</option>`;
    })
    .join("");
}

function itemNameLabel(value) {
  return value === "商品别名" ? "取命中商品开票规则的商品别名字段" : "取订单中的商品描述字段";
}

const applicationStatuses = [
  "开票中",
  "开票成功",
  "红冲中",
  "红冲成功",
  "异常待处理",
  "待重试",
];
const applicationSources = [
  "顾客自助开票-支付宝",
  "顾客自助开票-微信",
  "商家平台手动开票",
  "接口开票",
  "退换货自动申请",
  "订单手动开票",
];
const RED_CONFIRMATION_PENDING_STATUS = "红字确认单待确认";
const mergedApplicationSamples = {
  // 低频合并开票样例：仅影响申请层展示，订单仍保持自己的金额与归属。
  RO202606100001: { relatedOrderCount: 2 },
};
const invoiceItemSnapshotFixtures = {
  // S07 两张票分别保留开具当时的商品快照：历史票为原订单全量，重开票仅保留未退商品。
  "263120000259070001": [
    ["SKU-S07-COAT", "风衣", "服饰", "件", "1", "¥30,000.00", 0.13],
    ["SKU-S07-SCARF", "围巾", "配饰", "件", "1", "¥12,000.00", 0.13],
  ],
  "263120000259070002": [
    ["SKU-S07-COAT", "风衣", "服饰", "件", "1", "¥30,000.00", 0.13],
  ],
};

const manualInvoiceTaxpayerByStore = {
  "BR-BURBERRY|NJ-DJ-002": {
    name: "博柏利（南京）贸易有限公司",
    taxNo: "91320102BURB000002",
  },
  "BR-BURBERRY|CD-TGL-018": {
    name: "博柏利（成都）贸易有限公司",
    taxNo: "91510100BURB000018",
  },
  "BR-BURBERRY|BJ-CY-006": {
    name: "博柏利（北京）贸易有限公司",
    taxNo: "91110105BURB000006",
  },
  "BR-TEST-002|BJ-CY-006": {
    name: "测试品牌二（北京）贸易有限公司",
    taxNo: "91110105TEST000006",
  },
};

function normalizeOrderApplications(order) {
  if (Array.isArray(order.applications) && order.applications.length) {
    return order.applications.map((application, index) => normalizeApplicationRecord(application, order, index));
  }

  const hasLegacyApplication = Boolean(
    (order.applyInfo?.[0] && order.applyInfo[0] !== "-")
      || order.invoices?.length
      || order.invoiceEvents?.length
  );
  if (!hasLegacyApplication) return [];

  const sortedEvents = [...(order.invoiceEvents || [])].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const openingNames = new Set(["发票开具", "发票换开"]);
  const seeds = [];
  let currentSeed;

  sortedEvents.forEach((event) => {
    if (openingNames.has(event.name)) {
      if (!currentSeed || currentSeed.redFlushEvent) {
        currentSeed = { openingEvents: [], redFlushEvent: undefined };
        seeds.push(currentSeed);
      }
      currentSeed.openingEvents.push(event);
      return;
    }
    if (event.name === "发票红冲") {
      if (!currentSeed) {
        currentSeed = { openingEvents: [], redFlushEvent: undefined };
        seeds.push(currentSeed);
      }
      currentSeed.redFlushEvent = event;
    }
  });

  if (!seeds.length) seeds.push({ openingEvents: [], redFlushEvent: undefined });

  const invoiceRows = [...(order.invoices || [])];
  const claimedInvoiceNumbers = new Set();
  const applications = seeds.map((seed, index) => {
    const eventInvoiceNumbers = seed.openingEvents.map((event) => event.invoiceNo).filter(Boolean);
    const matchedInvoices = invoiceRows.filter((invoice) => eventInvoiceNumbers.includes(invoice[9]));
    matchedInvoices.forEach((invoice) => claimedInvoiceNumbers.add(invoice[9]));
    const openingEvent = seed.openingEvents[0];
    const latestOpeningEvent = seed.openingEvents.at(-1);
    const statusEvent = seed.redFlushEvent || latestOpeningEvent;
    const baseApplyNo = order.applyInfo?.[0] && order.applyInfo[0] !== "-"
      ? order.applyInfo[0]
      : `APPLY-${order.orderSn}`;
    const applyNo = index === 0 ? baseApplyNo : `${baseApplyNo}-${String(index + 1).padStart(2, "0")}`;
    const inferredStatus = applicationNeedsManualHandling(order, statusEvent)
      ? "异常待处理"
      : seed.redFlushEvent
        ? normalizeApplicationStatus(seed.redFlushEvent.status, "red-flush")
        : normalizeApplicationStatus(statusEvent?.status || applicationStatus(order));
    const source = index === 0
      ? applicationSource(order)
      : (order.invoiceRemark || "").includes("换开") ? applicationSource(order) : "退换货自动申请";
    const fallbackInvoices = seeds.length === 1 ? invoiceRows : [];
    const applicationInvoices = matchedInvoices.length ? matchedInvoices : fallbackInvoices;
    const applicationAmount = applicationInvoices.length
      ? formatMoney(applicationInvoices.reduce((total, invoice) => total + Math.abs(parseMoney(invoice[3])), 0))
      : currentInvoiceableAmountText(order);

    return normalizeApplicationRecord({
      id: `${order.orderSn}-${applyNo}`,
      applyNo,
      source,
      appliedAt: index === 0
        ? (order.applyInfo?.[1] && order.applyInfo[1] !== "-" ? order.applyInfo[1] : openingEvent?.time || "-")
        : openingEvent?.time || "-",
      buyerName: order.customer,
      buyerTaxNo: order.taxId,
      deliveryEmail: order.receiverEmail,
      amount: applicationAmount,
      status: inferredStatus,
      statusDescription: applicationStatusDescription(inferredStatus, order, applicationInvoices, statusEvent),
      completedAt: statusEvent?.completedAt || (index === 0 ? order.applyInfo?.[2] : "-") || "-",
      invoices: applicationInvoices,
      items: frozenApplicationItems(order, applicationInvoices, applicationAmount),
      relatedOrderCount: index === 0 ? mergedApplicationSamples[order.orderSn]?.relatedOrderCount || 1 : 1,
      currentOrderAmount: currentInvoiceableAmountText(order),
    }, order, index);
  });

  if (seeds.length > 1) {
    const unclaimedInvoices = invoiceRows.filter((invoice) => !claimedInvoiceNumbers.has(invoice[9]));
    if (unclaimedInvoices.length) applications.at(-1).invoices.push(...unclaimedInvoices);
  }

  return applications;
}

function normalizeApplicationRecord(application, order, index) {
  const relatedOrderIds = Array.isArray(application.relatedOrderIds) ? [...application.relatedOrderIds] : [];
  const relatedOrders = Array.isArray(application.relatedOrders) ? [...application.relatedOrders] : [];
  const applyNo = application.applyNo || application.applicationNo || `APPLY-${order.orderSn}-${index + 1}`;
  const applicationId = application.id || `${order.orderSn}-${applyNo}`;
  const invoices = Array.isArray(application.invoices) ? [...application.invoices] : [];
  invoices.forEach((invoice, invoiceIndex) => {
    if (Array.isArray(invoice) && !invoice[14]) {
      invoice[14] = `${applicationId}-INVOICE-${invoiceIndex + 1}`;
    }
  });
  const status = normalizeApplicationStatus(application.status);
  const amount = application.amount || currentInvoiceableAmountText(order) || "-";
  const buyerType = ["personal", "个人"].includes(application.buyerType) ? "personal" : "enterprise";
  const statusDescription = ["异常待处理", "待重试"].includes(status)
    ? application.statusDescription || applicationStatusDescription(status, order, invoices)
    : status === "红冲中"
      ? application.redFlushTrigger === "manual" ? "" : redFlushStatusDescription(order)
      : "";
  return {
    ...application,
    id: applicationId,
    applyNo,
    source: normalizeApplicationSource(application.source, order),
    invoiceType: normalizeApplicationInvoiceType(application.invoiceType || invoices[0]?.[1] || order.invoiceOptions),
    appliedAt: application.appliedAt || application.applicationTime || "-",
    buyerType,
    buyerName: application.buyerName || order.customer || "-",
    buyerTaxNo: buyerType === "personal"
      ? application.buyerTaxNo || ""
      : application.buyerTaxNo || order.taxId || "-",
    deliveryEmail: application.deliveryEmail || application.receiverEmail || order.receiverEmail || "",
    amount,
    status,
    statusDescription,
    completedAt: application.completedAt || "-",
    invoices,
    items: normalizeInvoiceItems(application.items?.length ? application.items : frozenApplicationItems(order, invoices, amount)),
    relatedOrderIds,
    relatedOrders,
    relatedOrderCount: Math.max(1, relatedOrderIds.length, relatedOrders.length),
    currentOrderAmount: application.currentOrderAmount || currentInvoiceableAmountText(order) || "-",
  };
}

function normalizeInvoiceItems(items = []) {
  return items.map((item) => {
    const normalized = [...item];
    normalized[6] = Number.isFinite(Number(normalized[6]))
      ? Number(normalized[6])
      : normalized[2] === "服务" ? 0.06 : 0.13;
    return normalized;
  });
}

function normalizeApplicationInvoiceType(value) {
  const type = String(value || "");
  if (type.includes("专")) return "专票";
  if (type.includes("普")) return "普票";
  return "-";
}

function normalizeApplicationSource(source, order) {
  const value = String(source || "").trim();
  if (applicationSources.includes(value)) return value;
  if (["消费者申请", "业务方换开"].includes(value)) return applicationSource(order);
  if (["财务手动开票", "手动开票"].includes(value)) return "订单手动开票";
  if (["系统重开", "系统自动申请"].includes(value)) return "退换货自动申请";
  if (value === "Meta 平台") return "商家平台手动开票";
  return value || "-";
}

function frozenApplicationItems(order, invoices, amount) {
  const fixtureItems = invoices.flatMap((invoice) => invoiceItemSnapshotFixtures[invoice[9]] || []);
  const fixtureTotal = fixtureItems.reduce((total, item) => total + Math.abs(parseMoney(item[5])), 0);
  if (fixtureItems.length && Math.abs(fixtureTotal - Math.abs(parseMoney(amount))) < 0.01) {
    return normalizeInvoiceItems(fixtureItems);
  }
  return inferFrozenItemsFromAmount(order.items || [], amount);
}

function inferFrozenItemsFromAmount(orderItems, amount) {
  const normalizedItems = normalizeInvoiceItems(orderItems);
  const targetCents = Math.round(Math.abs(parseMoney(amount)) * 100);
  if (!targetCents) return [];
  const itemCents = normalizedItems.map((item) => Math.round(Math.abs(parseMoney(item[5])) * 100));
  const selectedIndexes = findItemCombination(itemCents, targetCents);
  if (selectedIndexes.length) return selectedIndexes.map((index) => [...normalizedItems[index]]);
  return [["INVOICE-SNAPSHOT", "开票项目", "商品", "项", "1", formatMoney(targetCents / 100), 0.13]];
}

function findItemCombination(itemCents, targetCents) {
  const searchLimit = Math.min(itemCents.length, 16);
  const selected = [];
  function visit(index, remaining) {
    if (remaining === 0) return true;
    if (index >= searchLimit || remaining < 0) return false;
    selected.push(index);
    if (visit(index + 1, remaining - itemCents[index])) return true;
    selected.pop();
    return visit(index + 1, remaining);
  }
  return visit(0, targetCents) ? [...selected] : [];
}

function normalizeApplicationStatus(status, phase = "invoice") {
  const value = String(status || "");
  if (applicationStatuses.includes(value)) return value;
  if (value.includes(RED_CONFIRMATION_PENDING_STATUS) || value === "待确认") return "红冲中";
  if (value.includes("失败") || value.includes("重试")) return "待重试";
  if (phase === "red-flush" || value.includes("红冲")) {
    return value.includes("成功") ? "红冲成功" : value.includes("中") || value.includes("处理") ? "红冲中" : "待重试";
  }
  if (value.includes("成功") || value === "已开票") return "开票成功";
  if (value.includes("中") || value.includes("处理") || value.includes("待")) return "开票中";
  return "待重试";
}

function applicationNeedsManualHandling(order, event) {
  if ((order?.invoices || []).length > 0) return false;
  const signal = [
    event?.reason,
    order?.applyInfo?.[3],
    order?.applyInfo?.[4],
    order?.ruleHit,
    order?.invoiceRemark,
  ].filter((value) => value && value !== "-").join(" ");
  return /(?:mapping|未找到.*(?:规则|映射)|未命中.*(?:规则|映射)|缺少.*(?:规则|配置|信息)|未启用开票|开票开关.*关闭|额度不足|必填.*缺失)/i.test(signal);
}

function applicationStatusDescription(status, order, invoices = [], event) {
  if (status === "红冲中") return redFlushStatusDescription(order);
  if (["异常待处理", "待重试"].includes(status)) {
    const reason = [event?.reason, order.applyInfo?.[4], order.applyInfo?.[3], order.ruleHit]
      .find((value) => value && value !== "-");
    if (reason) return status === "异常待处理" ? `异常原因：${reason}` : `失败原因：${reason}`;
    return status === "异常待处理" ? "存在需要处理的异常，请处理后继续" : "处理失败，请重试";
  }
  return "";
}

function redFlushStatusDescription(order) {
  const signal = `${order.businessCode || ""} ${order.invoiceRemark || ""}`;
  return signal.includes("换开") ? "消费者换开自动红冲" : "退换货自动红冲";
}

function materializeOrderApplications(order) {
  order.applications = normalizeOrderApplications(order);
  return order.applications;
}

function findExactOrderApplication(order, applicationId) {
  if (!order || !applicationId) return null;
  return normalizeOrderApplications(order)
    .find((application) => application.id === applicationId || application.applyNo === applicationId)
    || null;
}

function findCurrentBrandApplicationContext(applicationId, preferredOrderSn = "") {
  if (!applicationId) return null;
  const brandOrders = currentBrandOrders();
  const preferredOrder = brandOrders.find((order) => order.orderSn === preferredOrderSn);
  const candidates = preferredOrder
    ? [preferredOrder, ...brandOrders.filter((order) => order !== preferredOrder)]
    : brandOrders;
  for (const order of candidates) {
    const application = findExactOrderApplication(order, applicationId);
    if (application) return { order, application };
  }
  return null;
}

function applicationExistsOutsideCurrentBrand(applicationId) {
  if (!applicationId) return false;
  const currentBrandOrderIds = new Set(currentBrandOrders().map((order) => order.orderSn));
  return orders.some((order) => (
    !currentBrandOrderIds.has(order.orderSn)
    && Boolean(findExactOrderApplication(order, applicationId))
  ));
}

function synchronizeRelatedApplicationCopies(sourceOrder, sourceApplication) {
  const relatedOrderIds = new Set(sourceApplication.relatedOrderIds || []);
  if (relatedOrderIds.size < 2) return;
  currentBrandOrders().forEach((relatedOrder) => {
    if (relatedOrder === sourceOrder || !relatedOrderIds.has(relatedOrder.orderSn)) return;
    const targetApplication = materializeOrderApplications(relatedOrder)
      .find((application) => application.id === sourceApplication.id || application.applyNo === sourceApplication.applyNo);
    if (!targetApplication) return;
    targetApplication.status = sourceApplication.status;
    targetApplication.statusDescription = sourceApplication.statusDescription;
    targetApplication.completedAt = sourceApplication.completedAt;
    targetApplication.lastEmailDelivery = sourceApplication.lastEmailDelivery;
    targetApplication.redFlushTrigger = sourceApplication.redFlushTrigger;
    targetApplication.invoices = sourceApplication.invoices.map(cloneInvoiceRecord);
  });
}

function cloneInvoiceRecord(invoice) {
  const clone = [...invoice];
  if (invoice?.requiresRedConfirmation) clone.requiresRedConfirmation = true;
  return clone;
}

function orderDemoState() {
  const requested = new URLSearchParams(window.location.search).get("demoState") || "data";
  if (requested === "no-permission") return "permission";
  return ["data", "loading", "empty", "error", "permission"].includes(requested) ? requested : "data";
}

function orderBusinessIdentifier(order) {
  return String(order?.businessCode || "零售销售");
}

function filteredCurrentBrandOrders() {
  const query = state.orderQuery;
  return currentBrandVisibleOrders().filter((order) => {
    const orderNoMatched = !query.orderNo || String(order.orderSn || "").toLowerCase().includes(query.orderNo.toLowerCase());
    const salesNoMatched = !query.salesNo || String(order.salesSn || "").toLowerCase().includes(query.salesNo.toLowerCase());
    const storeKeyword = String(query.store || "").toLowerCase();
    const storeMatched = query.storeId
      ? order.storeId === query.storeId
      : !storeKeyword || `${order.storeName || ""} ${order.storeSn || ""} ${order.storeId || ""}`.toLowerCase().includes(storeKeyword);
    const businessTagKeyword = String(query.businessTag || "").toLowerCase();
    const businessTagMatched = !businessTagKeyword
      || orderBusinessIdentifier(order).toLowerCase().includes(businessTagKeyword);
    const returnMatched = query.returnStatus === "全部" || order.returnStatus === query.returnStatus;
    const invoiceMatched = query.invoiceStatus === "全部" || order.invoiceStatus === query.invoiceStatus;
    const syncTimeMatched = dateTimeInDateRange(orderSyncTimeText(order), query.syncTimeRange);
    const salesTimeMatched = dateTimeInDateRange(order.salesTimeText, query.salesTimeRange);
    return orderNoMatched && salesNoMatched && storeMatched && businessTagMatched && returnMatched && invoiceMatched && syncTimeMatched && salesTimeMatched;
  });
}

function queryDropdown(name, value, options) {
  return `
    <div class="query-dropdown ${value !== "全部" ? "filled" : ""}" data-query-dropdown="${name}">
      <button class="query-dropdown-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" data-dropdown-trigger data-value="${escapeAttribute(value)}">
        <span data-dropdown-label>${escapeHtml(value)}</span><span aria-hidden="true">⌄</span>
      </button>
      <div class="query-dropdown-menu" role="listbox" data-dropdown-menu hidden>
        ${options.map((option) => `<button type="button" role="option" aria-selected="${option === value}" data-dropdown-option data-value="${escapeAttribute(option)}">${escapeHtml(option)}</button>`).join("")}
      </div>
    </div>
  `;
}

function storeSuggestMarkup(query) {
  const selectedStore = currentBrandStoreOptions().find((store) => store.id === query.storeId);
  const inputValue = query.store || (selectedStore ? `${selectedStore.name} / ${selectedStore.no}` : "");
  return `
    <div class="store-suggest" data-store-suggest>
      <input
        id="storeSearch"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded="false"
        aria-controls="storeSuggestList"
        autocomplete="off"
        data-order-query-input="store"
        data-store-suggest-input
        data-selected-store-id="${escapeAttribute(query.storeId || "")}"
        value="${escapeAttribute(inputValue)}"
        placeholder="输入门店名、门店号或门店 ID"
      />
      <div id="storeSuggestList" class="store-suggest-list" role="listbox" data-store-suggest-list hidden></div>
    </div>
  `;
}

function storeSuggestionOptionsMarkup(options) {
  if (!options.length) return `<div class="store-suggest-empty">未找到匹配门店</div>`;
  return options.map((store, index) => `
    <button
      id="storeSuggestOption${index}"
      class="store-suggest-option"
      type="button"
      role="option"
      aria-selected="false"
      data-store-suggest-option
      data-store-index="${index}"
      data-store-id="${escapeAttribute(store.id)}"
      data-store-no="${escapeAttribute(store.no)}"
      data-store-name="${escapeAttribute(store.name)}"
    >
      <strong>${escapeHtml(store.name)}</strong>
      <span>门店号：${escapeHtml(store.no)}&nbsp;&nbsp;门店 ID：${escapeHtml(store.id)}</span>
    </button>
  `).join("");
}

function monthCursorFromRange(range) {
  const dateText = splitQueryDateTime(range?.start).date || ORDER_QUERY_DEMO_DATE;
  const parts = parseDateParts(dateText) || parseDateParts(ORDER_QUERY_DEMO_DATE);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-01`;
}

function shiftCalendarMonth(cursor, offset) {
  const parts = parseDateParts(cursor) || parseDateParts(`${ORDER_QUERY_DEMO_DATE.slice(0, 7)}-01`);
  return formatDateParts(new Date(Date.UTC(parts.year, parts.month - 1 + offset, 1)));
}

function calendarMonthMarkup(cursor, range, position) {
  const parts = parseDateParts(cursor);
  const firstTimestamp = Date.UTC(parts.year, parts.month - 1, 1);
  const dayOffset = (new Date(firstTimestamp).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
  const startDate = splitQueryDateTime(range.start).date;
  const endDate = splitQueryDateTime(range.end).date;
  const cells = ["一", "二", "三", "四", "五", "六", "日"]
    .map((weekday) => `<span class="query-calendar-weekday">${weekday}</span>`);
  for (let index = 0; index < dayOffset; index += 1) cells.push(`<span class="query-calendar-empty" aria-hidden="true"></span>`);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isStart = date === startDate;
    const isEnd = date === endDate;
    const inRange = Boolean(startDate && endDate && date >= startDate && date <= endDate);
    cells.push(`
      <button
        class="query-calendar-day ${inRange ? "in-range" : ""} ${isStart ? "range-start" : ""} ${isEnd ? "range-end" : ""}"
        type="button"
        data-calendar-date="${date}"
        aria-label="${parts.year}年${parts.month}月${day}日"
        aria-pressed="${isStart || isEnd}"
      >${day}</button>
    `);
  }
  return `
    <section class="query-calendar" aria-label="${parts.year}年${parts.month}月">
      <header>
        ${position === "first" ? `<button type="button" class="query-calendar-nav" data-calendar-shift="-1" aria-label="上一个月">‹</button>` : `<span></span>`}
        <strong>${parts.year} 年 ${parts.month} 月</strong>
        ${position === "second" ? `<button type="button" class="query-calendar-nav" data-calendar-shift="1" aria-label="下一个月">›</button>` : `<span></span>`}
      </header>
      <div class="query-calendar-grid">${cells.join("")}</div>
    </section>
  `;
}

function timePickerMarkup(target, timeValue) {
  const match = String(timeValue || "00:00").match(/^(\d{2}):(\d{2})$/);
  const selectedHour = match?.[1] || "00";
  const selectedMinute = selectedHour === "24" ? "00" : match?.[2] || "00";
  const hours = Array.from({ length: 25 }, (_, hour) => String(hour).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"));
  return `
    <div class="query-time-picker" data-time-picker="${target}" hidden>
      <div class="query-time-column" role="listbox" aria-label="小时">
        ${hours.map((hour) => `<button type="button" role="option" aria-selected="${hour === selectedHour}" data-time-hour="${hour}">${hour}</button>`).join("")}
      </div>
      <div class="query-time-column" role="listbox" aria-label="分钟">
        ${minutes.map((minute) => `<button type="button" role="option" aria-selected="${minute === selectedMinute}" data-time-minute="${minute}" ${selectedHour === "24" && minute !== "00" ? "hidden" : ""}>${minute}</button>`).join("")}
      </div>
    </div>
  `;
}

function queryDateRangePopupMarkup(key, label, range, cursor, error = "") {
  const start = splitQueryDateTime(range.start);
  const end = splitQueryDateTime(range.end);
  const secondCursor = shiftCalendarMonth(cursor, 1);
  const validationError = error || validateOrderDateRange(range);
  return `
    <aside class="query-range-shortcuts" aria-label="快捷时间范围">
      ${[
        ["today", "今天"],
        ["week", "本周"],
        ["month", "本月"],
        ["three-months", "三个月"],
        ["half-year", "半年"],
      ].map(([value, text]) => `<button type="button" data-range-shortcut="${value}">${text}</button>`).join("")}
    </aside>
    <div class="query-range-main">
      <div class="query-range-inputs">
        <input type="text" inputmode="numeric" value="${escapeAttribute(start.date)}" placeholder="YYYY-MM-DD" aria-label="${label}开始日期" data-range-input="start-date" />
        <div class="query-time-input-wrap">
          <input type="text" inputmode="numeric" value="${escapeAttribute(start.time)}" placeholder="HH:mm" aria-label="${label}开始时间" data-range-input="start-time" data-time-input="start" />
          ${timePickerMarkup("start", start.time)}
        </div>
        <span aria-hidden="true">—</span>
        <input type="text" inputmode="numeric" value="${escapeAttribute(end.date)}" placeholder="YYYY-MM-DD" aria-label="${label}结束日期" data-range-input="end-date" />
        <div class="query-time-input-wrap">
          <input type="text" inputmode="numeric" value="${escapeAttribute(end.time)}" placeholder="HH:mm" aria-label="${label}结束时间" data-range-input="end-time" data-time-input="end" />
          ${timePickerMarkup("end", end.time)}
        </div>
      </div>
      <div class="query-range-calendars">
        ${calendarMonthMarkup(cursor, range, "first")}
        ${calendarMonthMarkup(secondCursor, range, "second")}
      </div>
      <div class="query-range-footer">
        <p id="${key}PopupError" class="query-range-error" role="alert" ${validationError ? "" : "hidden"}>${escapeHtml(validationError)}</p>
        <button class="btn" type="button" data-range-confirm ${validationError || !range.start || !range.end ? "disabled" : ""}>确定</button>
      </div>
    </div>
  `;
}

function queryDateTimeRangeMarkup(key, label, range) {
  const cursor = monthCursorFromRange(range);
  return `
    <div
      class="query-date-time-range"
      data-query-date-time-range="${key}"
      data-range-label="${escapeAttribute(label)}"
      data-max-span-days="${ORDER_QUERY_MAX_RANGE_DAYS}"
      data-start="${escapeAttribute(range.start)}"
      data-end="${escapeAttribute(range.end)}"
      data-calendar-cursor="${cursor}"
    >
      <button
        class="query-date-time-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="${key}RangePopup"
        aria-describedby="${key}RangeFieldError"
        data-range-trigger
      >
        <span class="query-date-time-half">
          <small>${label}（起）</small>
          <strong data-range-display="start">${escapeHtml(range.start || "请选择")}</strong>
        </span>
        <span class="query-date-time-half">
          <small>${label}（止）</small>
          <strong data-range-display="end">${escapeHtml(range.end || "请选择")}</strong>
        </span>
      </button>
      <div id="${key}RangePopup" class="query-date-time-popup" role="dialog" aria-label="${label}选择" data-range-popup hidden>
        ${queryDateRangePopupMarkup(key, label, range, cursor)}
      </div>
      <p id="${key}RangeFieldError" class="query-date-time-field-error" role="alert" data-range-field-error hidden></p>
    </div>
  `;
}

function queryQuickRange(shortcut, anchorDate = ORDER_QUERY_DEMO_DATE) {
  const anchor = parseDateParts(anchorDate);
  let startDate = anchorDate;
  if (shortcut === "week") {
    const weekday = (new Date(anchor.timestamp).getUTCDay() + 6) % 7;
    startDate = addUtcDays(anchorDate, -weekday);
  }
  if (shortcut === "month") startDate = `${anchor.year}-${String(anchor.month).padStart(2, "0")}-01`;
  if (shortcut === "three-months") startDate = addUtcDays(anchorDate, -89);
  if (shortcut === "half-year") startDate = addUtcDays(anchorDate, -(ORDER_QUERY_MAX_RANGE_DAYS - 1));
  return { start: `${startDate} 00:00`, end: `${anchorDate} 24:00` };
}

function visibleOrderColumnDefinitions() {
  return orderListColumns.filter((column) => state.visibleOrderColumns.includes(column.key));
}

function orderColumnSettingsMarkup() {
  return `
    <div class="column-settings" data-order-column-settings>
      <button class="btn secondary" type="button" data-order-columns aria-label="列设置" aria-haspopup="true" aria-expanded="false"><span class="settings-icon" aria-hidden="true">⚙</span> 列设置</button>
      <div class="column-settings-panel" data-order-column-panel hidden>
        <strong>显示列</strong>
        ${orderListColumns.map((column) => `
          <label>
            <input type="checkbox" data-order-column-toggle value="${column.key}" ${state.visibleOrderColumns.includes(column.key) ? "checked" : ""} ${column.required ? "disabled" : ""} />
            <span>${column.label}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function renderOrders() {
  ensureSelectedOrderInCurrentBrand();
  const demoState = currentBrand() ? orderDemoState() : "permission";
  const filteredOrders = demoState === "empty" ? [] : filteredCurrentBrandOrders();
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / state.orderPageSize));
  state.orderPage = Math.min(Math.max(1, state.orderPage), totalPages);
  const pageStart = (state.orderPage - 1) * state.orderPageSize;
  const visibleOrders = filteredOrders.slice(pageStart, pageStart + state.orderPageSize);
  const rowMarkup = renderOrderListRows(demoState, visibleOrders);
  workspace.innerHTML = `
    ${renderBrandScope()}
    <section class="list-surface">
      <div class="page-title-region"><h1>零售订单管理</h1></div>
      <div class="toolbar order-toolbar query-region" data-order-query>
        <div class="query-item query-item-normal">${field("商家订单号", `<input id="orderSearch" data-order-query-input="orderNo" value="${escapeAttribute(state.orderQuery.orderNo)}" placeholder="请输入完整商家订单号" />`)}</div>
        <div class="query-item query-item-normal">${field("业务订单号", `<input id="salesOrderSearch" data-order-query-input="salesNo" value="${escapeAttribute(state.orderQuery.salesNo)}" placeholder="请输入完整业务订单号" />`)}</div>
        <div class="query-item query-item-normal">${field("门店", storeSuggestMarkup(state.orderQuery))}</div>
        <div class="query-item query-item-normal">${field("业务标识", `<input id="businessTagSearch" data-order-query-input="businessTag" value="${escapeAttribute(state.orderQuery.businessTag)}" placeholder="支持业务标识关键词搜索" />`)}</div>
        <div class="query-item query-item-normal">${field("退换货状态", queryDropdown("returnStatus", state.orderQuery.returnStatus, ["全部", "无退换货", "有退换货", "已全额退货"]))}</div>
        <div class="query-item query-item-normal">${field("开票状态", queryDropdown("invoiceStatus", state.orderQuery.invoiceStatus, ["全部", "未开票", "开票中", "已开票"]))}</div>
        <div class="query-item query-item-time">${queryDateTimeRangeMarkup("syncTimeRange", "订单同步时间", state.orderQuery.syncTimeRange)}</div>
        <div class="query-item query-item-time">${queryDateTimeRangeMarkup("salesTimeRange", "订单销售时间", state.orderQuery.salesTimeRange)}</div>
        <div class="btn-row query-actions">
          <button class="btn query-reset" type="button" data-order-clear>清空条件</button>
          <button class="btn" type="button" data-order-search>搜索</button>
        </div>
      </div>
      <div class="list-toolbar">
        <span></span>
        <div class="btn-row">
          <button class="btn secondary" type="button" data-order-export>导出</button>
          ${orderColumnSettingsMarkup()}
        </div>
      </div>
      <div class="table-scroll">
        <table class="data-table order-list-table">
          <thead>
            <tr>
              ${visibleOrderColumnDefinitions().map((column) => `<th data-order-column="${column.key}" class="${column.sticky ? "sticky-col" : ""}">${column.label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rowMarkup}
          </tbody>
        </table>
      </div>
      ${renderOrderPagination(demoState, filteredOrders.length, totalPages)}
    </section>
  `;

  bindBrandScope();
  bindOrderQueryActions();
  bindOrderPagination();
  bindOrderToolbarActions(filteredOrders);
  workspace.querySelectorAll("[data-order]").forEach((button) => {
    button.addEventListener("click", () => openOrderDetail(button.dataset.order));
  });
  workspace.querySelector("[data-order-retry]")?.addEventListener("click", clearOrderDemoState);
  workspace.querySelector("[data-order-empty-clear]")?.addEventListener("click", clearOrderQuery);
}

function renderOrderListRows(demoState, visibleOrders) {
  const columnCount = visibleOrderColumnDefinitions().length;
  const stateMessages = {
    loading: "订单数据加载中…",
    empty: "暂无数据",
    permission: "当前身份暂无零售订单查看权限",
  };
  if (demoState === "error") {
    return `<tr data-demo-state="error"><td colspan="${columnCount}" class="table-empty">订单数据加载失败，请稍后重试。 <button class="btn secondary" type="button" data-order-retry>重试</button></td></tr>`;
  }
  if (demoState !== "data") {
    return `<tr data-demo-state="${demoState}"><td colspan="${columnCount}" class="table-empty">${stateMessages[demoState]}</td></tr>`;
  }
  if (visibleOrders.length) return visibleOrders.map(orderRow).join("");
  const hasQuery = Object.entries(state.orderQuery).some(([key, value]) => key.endsWith("Status") ? value !== "全部" : Boolean(value));
  return hasQuery
    ? `<tr data-demo-state="empty"><td colspan="${columnCount}" class="table-empty">未找到符合条件的数据 <button class="btn query-reset" type="button" data-order-empty-clear>清空条件</button></td></tr>`
    : `<tr data-demo-state="empty"><td colspan="${columnCount}" class="table-empty">暂无数据</td></tr>`;
}

function renderOrderPagination(demoState, total, totalPages) {
  if (demoState !== "data") return "";
  const pageButtons = Array.from({ length: totalPages }, (_, index) => index + 1)
    .map((page) => `<button class="btn ${page === state.orderPage ? "" : "secondary"}" type="button" data-order-page="${page}" aria-current="${page === state.orderPage ? "page" : "false"}">${page}</button>`)
    .join("");
  return `
    <div class="pagination" data-order-pagination>
      <span class="pagination-summary">共 ${total} 条，第 ${state.orderPage} / ${totalPages} 页</span>
      <label>每页
        <select data-order-page-size aria-label="每页条数">
          ${[10, 20, 50, 100].map((size) => `<option value="${size}" ${size === state.orderPageSize ? "selected" : ""}>${size} 条</option>`).join("")}
        </select>
      </label>
      <div class="btn-row">
        <button class="btn secondary" type="button" data-order-page="${Math.max(1, state.orderPage - 1)}" ${state.orderPage === 1 ? "disabled" : ""}>上一页</button>
        ${pageButtons}
        <button class="btn secondary" type="button" data-order-page="${Math.min(totalPages, state.orderPage + 1)}" ${state.orderPage === totalPages ? "disabled" : ""}>下一页</button>
      </div>
    </div>
  `;
}

function bindOrderQueryActions() {
  bindQueryDropdowns();
  bindStoreSuggest();
  bindQueryDateTimeRanges();
  workspace.querySelector("[data-order-search]")?.addEventListener("click", submitOrderQuery);
  workspace.querySelector("[data-order-clear]")?.addEventListener("click", clearOrderQuery);
  workspace.querySelectorAll("[data-order-query-input]").forEach((input) => {
    if (input.matches("[data-store-suggest-input]")) return;
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitOrderQuery();
      }
    });
  });
}

function closeStoreSuggest(root) {
  const input = root?.querySelector("[data-store-suggest-input]");
  const list = root?.querySelector("[data-store-suggest-list]");
  if (!input || !list) return;
  list.hidden = true;
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
}

function bindStoreSuggest(onSubmit = submitOrderQuery) {
  const root = workspace.querySelector("[data-store-suggest]");
  const input = root?.querySelector("[data-store-suggest-input]");
  const list = root?.querySelector("[data-store-suggest-list]");
  if (!root || !input || !list) return;
  let activeIndex = -1;
  let options = [];

  const selectOption = (option) => {
    if (!option) return;
    input.value = `${option.name} / ${option.no}`;
    input.dataset.selectedStoreId = option.id;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    list.hidden = true;
    activeIndex = -1;
    input.focus();
  };

  const renderOptions = (open = true) => {
    options = storeSuggestions(input.dataset.selectedStoreId ? "" : input.value);
    activeIndex = Math.min(activeIndex, options.length - 1);
    list.innerHTML = storeSuggestionOptionsMarkup(options);
    list.hidden = !open;
    input.setAttribute("aria-expanded", String(open));
    list.querySelectorAll("[data-store-suggest-option]").forEach((button, index) => {
      button.setAttribute("aria-selected", String(options[index]?.id === input.dataset.selectedStoreId));
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => selectOption(options[index]));
    });
  };

  const updateActiveOption = (nextIndex) => {
    if (!options.length) return;
    activeIndex = (nextIndex + options.length) % options.length;
    list.querySelectorAll("[data-store-suggest-option]").forEach((button, index) => {
      const active = index === activeIndex;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      if (active) {
        input.setAttribute("aria-activedescendant", button.id);
        button.scrollIntoView({ block: "nearest" });
      }
    });
  };

  input.addEventListener("focus", () => renderOptions(true));
  input.addEventListener("input", () => {
    input.dataset.selectedStoreId = "";
    activeIndex = -1;
    renderOptions(true);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (list.hidden) renderOptions(true);
      updateActiveOption(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeStoreSuggest(root);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!list.hidden && activeIndex >= 0) selectOption(options[activeIndex]);
      else onSubmit();
    }
  });
  root.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (!root.contains(document.activeElement)) closeStoreSuggest(root);
    }, 0);
  });
}

function dateRangeDraftFromInputs(root) {
  const popup = root.querySelector("[data-range-popup]");
  const value = (key) => popup.querySelector(`[data-range-input="${key}"]`)?.value.trim() || "";
  const build = (date, time) => (!date && !time ? "" : `${date} ${time}`.trim());
  return {
    start: build(value("start-date"), value("start-time")),
    end: build(value("end-date"), value("end-time")),
  };
}

function setQueryDateRangeFieldError(root, message = "") {
  const error = root.querySelector("[data-range-field-error]");
  const trigger = root.querySelector("[data-range-trigger]");
  error.textContent = message;
  error.hidden = !message;
  trigger.setAttribute("aria-invalid", String(Boolean(message)));
}

function closeQueryDateTimeRange(root, restoreFocus = false) {
  const popup = root?.querySelector("[data-range-popup]");
  const trigger = root?.querySelector("[data-range-trigger]");
  if (!popup || !trigger) return;
  popup.hidden = true;
  trigger.setAttribute("aria-expanded", "false");
  root.querySelectorAll("[data-time-picker]").forEach((picker) => { picker.hidden = true; });
  if (restoreFocus) trigger.focus();
}

function refreshQueryDateRangePopup(root, error = "") {
  const key = root.dataset.queryDateTimeRange;
  const label = root.dataset.rangeLabel;
  const range = {
    start: root.dataset.draftStart || "",
    end: root.dataset.draftEnd || "",
  };
  const cursor = root.dataset.calendarCursor || monthCursorFromRange(range);
  const popup = root.querySelector("[data-range-popup]");
  popup.innerHTML = queryDateRangePopupMarkup(key, label, range, cursor, error);
  popup.hidden = false;
  bindQueryDateRangePopupControls(root);
}

function commitQueryDateRange(root, range) {
  root.dataset.start = range.start;
  root.dataset.end = range.end;
  root.querySelector('[data-range-display="start"]').textContent = range.start || "请选择";
  root.querySelector('[data-range-display="end"]').textContent = range.end || "请选择";
  setQueryDateRangeFieldError(root, "");
  closeQueryDateTimeRange(root, true);
}

function updateQueryDateRangeDraft(root) {
  const range = dateRangeDraftFromInputs(root);
  root.dataset.draftStart = range.start;
  root.dataset.draftEnd = range.end;
  const error = validateOrderDateRange(range);
  const popupError = root.querySelector(".query-range-error");
  const confirm = root.querySelector("[data-range-confirm]");
  popupError.textContent = error;
  popupError.hidden = !error;
  confirm.disabled = Boolean(error || !range.start || !range.end);
  return { range, error };
}

function bindQueryDateRangePopupControls(root) {
  const popup = root.querySelector("[data-range-popup]");
  popup.addEventListener("click", (event) => event.stopPropagation());

  const syncTimePickerOptions = (input) => {
    const target = input?.dataset.timeInput;
    const picker = target ? popup.querySelector(`[data-time-picker="${target}"]`) : null;
    if (!picker) return;
    const [hour = "00", minute = "00"] = String(input.value || "00:00").split(":");
    picker.querySelectorAll("[data-time-hour]").forEach((button) => {
      button.setAttribute("aria-selected", String(button.dataset.timeHour === hour));
    });
    picker.querySelectorAll("[data-time-minute]").forEach((button) => {
      button.hidden = hour === "24" && button.dataset.timeMinute !== "00";
      button.setAttribute("aria-selected", String(button.dataset.timeMinute === (hour === "24" ? "00" : minute)));
    });
  };

  popup.querySelectorAll("[data-range-input]").forEach((input) => {
    input.addEventListener("input", () => {
      updateQueryDateRangeDraft(root);
      if (input.matches("[data-time-input]")) syncTimePickerOptions(input);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") event.preventDefault();
    });
  });

  popup.querySelectorAll("[data-time-input]").forEach((input) => {
    input.addEventListener("focus", () => {
      syncTimePickerOptions(input);
      popup.querySelectorAll("[data-time-picker]").forEach((picker) => {
        picker.hidden = picker.dataset.timePicker !== input.dataset.timeInput;
      });
    });
  });

  popup.querySelectorAll("[data-time-picker]").forEach((picker) => {
    const target = picker.dataset.timePicker;
    const input = popup.querySelector(`[data-time-input="${target}"]`);
    picker.querySelectorAll("[data-time-hour]").forEach((button) => {
      button.addEventListener("click", () => {
        const current = String(input.value || "00:00").split(":");
        input.value = `${button.dataset.timeHour}:${button.dataset.timeHour === "24" ? "00" : current[1] || "00"}`;
        syncTimePickerOptions(input);
        updateQueryDateRangeDraft(root);
      });
    });
    picker.querySelectorAll("[data-time-minute]").forEach((button) => {
      button.addEventListener("click", () => {
        const current = String(input.value || "00:00").split(":");
        input.value = `${current[0] || "00"}:${current[0] === "24" ? "00" : button.dataset.timeMinute}`;
        syncTimePickerOptions(input);
        picker.hidden = true;
        updateQueryDateRangeDraft(root);
        input.focus();
      });
    });
  });

  popup.querySelectorAll("[data-calendar-shift]").forEach((button) => {
    button.addEventListener("click", () => {
      const draft = updateQueryDateRangeDraft(root).range;
      root.dataset.draftStart = draft.start;
      root.dataset.draftEnd = draft.end;
      root.dataset.calendarCursor = shiftCalendarMonth(root.dataset.calendarCursor, Number(button.dataset.calendarShift));
      refreshQueryDateRangePopup(root);
    });
  });

  popup.querySelectorAll("[data-calendar-date]").forEach((button) => {
    button.addEventListener("click", () => {
      const clickedDate = button.dataset.calendarDate;
      const draft = updateQueryDateRangeDraft(root).range;
      const startDate = splitQueryDateTime(draft.start).date;
      const endDate = splitQueryDateTime(draft.end).date;
      if (!startDate || endDate || clickedDate < startDate) {
        root.dataset.draftStart = `${clickedDate} 00:00`;
        root.dataset.draftEnd = "";
      } else {
        root.dataset.draftStart = draft.start || `${startDate} 00:00`;
        root.dataset.draftEnd = `${clickedDate} 24:00`;
      }
      refreshQueryDateRangePopup(root);
    });
  });

  popup.querySelectorAll("[data-range-shortcut]").forEach((button) => {
    button.addEventListener("click", () => commitQueryDateRange(root, queryQuickRange(button.dataset.rangeShortcut)));
  });

  popup.querySelector("[data-range-confirm]")?.addEventListener("click", () => {
    const { range, error } = updateQueryDateRangeDraft(root);
    if (error) return;
    commitQueryDateRange(root, range);
  });
}

function bindQueryDateTimeRanges() {
  workspace.querySelectorAll("[data-query-date-time-range]").forEach((root) => {
    const trigger = root.querySelector("[data-range-trigger]");
    const popup = root.querySelector("[data-range-popup]");
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = popup.hidden;
      workspace.querySelectorAll("[data-query-date-time-range]").forEach((candidate) => closeQueryDateTimeRange(candidate));
      if (!willOpen) return;
      root.dataset.draftStart = root.dataset.start || "";
      root.dataset.draftEnd = root.dataset.end || "";
      root.dataset.calendarCursor = monthCursorFromRange({ start: root.dataset.draftStart, end: root.dataset.draftEnd });
      refreshQueryDateRangePopup(root);
      trigger.setAttribute("aria-expanded", "true");
    });
    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !popup.hidden) {
        event.preventDefault();
        closeQueryDateTimeRange(root, true);
      }
    });
  });
}

function bindQueryDropdowns() {
  workspace.querySelectorAll("[data-query-dropdown]").forEach((dropdown) => {
    const trigger = dropdown.querySelector("[data-dropdown-trigger]");
    const menu = dropdown.querySelector("[data-dropdown-menu]");
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = menu.hidden;
      workspace.querySelectorAll("[data-dropdown-menu]").forEach((candidate) => { candidate.hidden = true; });
      workspace.querySelectorAll("[data-dropdown-trigger]").forEach((candidate) => candidate.setAttribute("aria-expanded", "false"));
      menu.hidden = !willOpen;
      trigger.setAttribute("aria-expanded", String(willOpen));
    });
    dropdown.querySelectorAll("[data-dropdown-option]").forEach((option) => {
      option.addEventListener("click", () => {
        const value = option.dataset.value || "全部";
        trigger.dataset.value = value;
        trigger.querySelector("[data-dropdown-label]").textContent = value;
        trigger.setAttribute("aria-expanded", "false");
        dropdown.classList.toggle("filled", value !== "全部");
        dropdown.querySelectorAll("[data-dropdown-option]").forEach((candidate) => candidate.setAttribute("aria-selected", String(candidate === option)));
        menu.hidden = true;
        trigger.focus();
      });
    });
  });
}

function submitOrderQuery() {
  const storeInput = workspace.querySelector('[data-order-query-input="store"]');
  const readRange = (key) => {
    const root = workspace.querySelector(`[data-query-date-time-range="${key}"]`);
    return {
      start: root?.dataset.start || "",
      end: root?.dataset.end || "",
    };
  };
  const syncTimeRange = readRange("syncTimeRange");
  const salesTimeRange = readRange("salesTimeRange");
  const ranges = [
    ["syncTimeRange", syncTimeRange],
    ["salesTimeRange", salesTimeRange],
  ];
  for (const [key, range] of ranges) {
    const error = validateOrderDateRange(range);
    const root = workspace.querySelector(`[data-query-date-time-range="${key}"]`);
    setQueryDateRangeFieldError(root, error);
    if (error) {
      root?.querySelector("[data-range-trigger]")?.focus();
      return;
    }
  }

  state.orderQuery = {
    orderNo: workspace.querySelector('[data-order-query-input="orderNo"]')?.value.trim() || "",
    salesNo: workspace.querySelector('[data-order-query-input="salesNo"]')?.value.trim() || "",
    store: storeInput?.value.trim() || "",
    storeId: storeInput?.dataset.selectedStoreId || "",
    businessTag: workspace.querySelector('[data-order-query-input="businessTag"]')?.value.trim() || "",
    returnStatus: workspace.querySelector('[data-query-dropdown="returnStatus"] [data-dropdown-trigger]')?.dataset.value || "全部",
    invoiceStatus: workspace.querySelector('[data-query-dropdown="invoiceStatus"] [data-dropdown-trigger]')?.dataset.value || "全部",
    syncTimeRange,
    salesTimeRange,
  };
  state.orderPage = 1;
  renderOrders();
}

function clearOrderQuery() {
  state.orderQuery = defaultOrderQuery();
  state.orderPage = 1;
  renderOrders();
}

function bindOrderPagination() {
  workspace.querySelectorAll("[data-order-page]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      state.orderPage = Number(button.dataset.orderPage) || 1;
      renderOrders();
    });
  });
  workspace.querySelector("[data-order-page-size]")?.addEventListener("change", (event) => {
    state.orderPageSize = Number(event.target.value) || 10;
    state.orderPage = 1;
    renderOrders();
  });
}

function bindOrderToolbarActions(filteredOrders) {
  workspace.querySelector("[data-order-export]")?.addEventListener("click", () => exportOrders(filteredOrders));
  const columnSettings = workspace.querySelector("[data-order-column-settings]");
  const columnButton = columnSettings?.querySelector("[data-order-columns]");
  const columnPanel = columnSettings?.querySelector("[data-order-column-panel]");
  columnButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    const expanded = columnPanel.hidden;
    columnPanel.hidden = !expanded;
    columnButton.setAttribute("aria-expanded", String(expanded));
  });
  columnPanel?.addEventListener("click", (event) => event.stopPropagation());
  columnSettings?.querySelectorAll("[data-order-column-toggle]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const selectedColumns = [...columnSettings.querySelectorAll("[data-order-column-toggle]:checked")]
        .map((item) => item.value);
      state.visibleOrderColumns = orderListColumns
        .filter((column) => column.required || selectedColumns.includes(column.key))
        .map((column) => column.key);
      renderOrders();
    });
  });
}

function exportOrders(orderList) {
  const rows = [
    ["订单销售时间", "商家订单号", "业务订单号", "订单金额", "销售门店名称", "门店号", "退换货状态", "开票状态", "业务标识", "同步时间"],
    ...orderList.map((order) => [
      order.salesTimeText,
      order.orderSn,
      order.salesSn,
      order.amount,
      order.storeName,
      order.storeSn,
      order.returnStatus,
      order.invoiceStatus,
      orderBusinessIdentifier(order),
      order.syncedAtText || "-",
    ]),
  ];
  downloadTextFile(`零售订单-${currentBrand()?.number || "brand"}.csv`, `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`, "text/csv;charset=utf-8");
}

function currentBrandApplicationEntries() {
  const entryByApplicationId = new Map();
  currentBrandVisibleOrders().forEach((order) => {
    materializeOrderApplications(order).forEach((application) => {
      const applicationId = application.id;
      if (!applicationId) return;
      let entry = entryByApplicationId.get(applicationId);
      if (!entry) {
        entry = {
          application,
          order,
          merchantOrderNos: new Set(),
        };
        entryByApplicationId.set(applicationId, entry);
      }
      entry.merchantOrderNos.add(order.orderSn);
      (application.relatedOrderIds || []).forEach((orderId) => entry.merchantOrderNos.add(relatedOrderReferenceId(orderId)));
      (application.relatedOrders || []).forEach((reference) => entry.merchantOrderNos.add(relatedOrderReferenceId(reference)));
    });
  });

  const availableOrderNos = new Set(currentBrandVisibleOrders().map((order) => order.orderSn));
  return [...entryByApplicationId.values()]
    .map((entry) => ({
      ...entry,
      merchantOrderNos: [...entry.merchantOrderNos].filter((orderNo) => orderNo && availableOrderNos.has(orderNo)),
    }))
    .sort((a, b) => String(b.application.appliedAt || "").localeCompare(String(a.application.appliedAt || "")));
}

function filteredCurrentBrandApplicationEntries(entries = currentBrandApplicationEntries()) {
  const query = state.applicationQuery;
  const exactMatch = (value, keyword) => String(value || "").trim().toLowerCase() === String(keyword || "").trim().toLowerCase();
  return entries.filter((entry) => {
    const { application, merchantOrderNos } = entry;
    const applicationNoMatched = !query.applicationNo || exactMatch(application.applyNo, query.applicationNo);
    const merchantOrderNoMatched = !query.merchantOrderNo
      || merchantOrderNos.some((orderNo) => exactMatch(orderNo, query.merchantOrderNo));
    const storeKeyword = String(query.store || "").trim().toLowerCase();
    const storeMatched = query.storeId
      ? entry.order?.storeId === query.storeId
      : !storeKeyword || `${entry.order?.storeName || ""} ${entry.order?.storeSn || ""} ${entry.order?.storeId || ""}`.toLowerCase().includes(storeKeyword);
    const buyerNameMatched = !query.buyerName
      || String(application.buyerName || "").toLowerCase().includes(query.buyerName.toLowerCase());
    const buyerTaxNoMatched = !query.buyerTaxNo || exactMatch(application.buyerTaxNo, query.buyerTaxNo);
    const sourceMatched = query.source === "全部" || application.source === query.source;
    const statusMatched = query.status === "全部" || application.status === query.status;
    const timeMatched = dateTimeInDateRange(application.appliedAt, query.applicationTimeRange);
    return applicationNoMatched
      && merchantOrderNoMatched
      && storeMatched
      && buyerNameMatched
      && buyerTaxNoMatched
      && sourceMatched
      && statusMatched
      && timeMatched;
  });
}

function visibleApplicationColumnDefinitions() {
  return applicationListColumns.filter((column) => state.visibleApplicationColumns.includes(column.key));
}

function applicationColumnClassName(column) {
  return [
    column.align === "right" ? "align-right" : "",
    column.sticky ? "sticky-col" : "",
  ].filter(Boolean).join(" ");
}

function applicationColumnSettingsMarkup() {
  return `
    <div class="column-settings" data-order-column-settings data-application-column-settings>
      <button class="btn secondary" type="button" data-order-columns data-application-columns aria-label="列设置" aria-haspopup="true" aria-expanded="false"><span class="settings-icon" aria-hidden="true">⚙</span> 列设置</button>
      <div class="column-settings-panel" data-order-column-panel data-application-column-panel hidden>
        <strong>显示列</strong>
        ${applicationListColumns.map((column) => `
          <label>
            <input type="checkbox" data-application-column-toggle value="${column.key}" ${state.visibleApplicationColumns.includes(column.key) ? "checked" : ""} ${column.required ? "disabled" : ""} />
            <span>${column.label}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function applicationListSourceOptions() {
  return ["全部", ...applicationSources];
}

function applicationListAmountMarkup(entry) {
  const relatedOrderCount = Math.max(1, entry.merchantOrderNos.length);
  return applicationAmountMarkup({ ...entry.application, relatedOrderCount });
}

function applicationListMerchantOrderMarkup(entry) {
  return escapeHtml(applicationListMerchantOrderText(entry));
}

function applicationListMerchantOrderText(entry) {
  return entry.order?.orderSn || entry.merchantOrderNos[0] || "-";
}

function applicationListStoreText(entry, key, fallbackKey) {
  return entry.order?.[key] || entry.order?.[fallbackKey] || "-";
}

function applicationListSellerText(entry, invoiceIndex, orderKey) {
  const values = [...new Set((entry.application.invoices || [])
    .map((invoice) => String(invoice?.[invoiceIndex] || "").trim())
    .filter((value) => value && value !== "-"))];
  return values.length ? values.join("、") : entry.order?.[orderKey] || "-";
}

function applicationListRow(entry) {
  const { application } = entry;
  const cells = {
    applicationTime: `<span class="order-sales-time">${escapeHtml(application.appliedAt)}</span>`,
    applicationNo: escapeHtml(application.applyNo),
    source: escapeHtml(application.source),
    invoiceType: escapeHtml(application.invoiceType || "-"),
    merchantOrderNo: applicationListMerchantOrderMarkup(entry),
    storeName: escapeHtml(applicationListStoreText(entry, "storeName", "salesStore")),
    storeNo: escapeHtml(applicationListStoreText(entry, "storeSn", "storeNo")),
    sellerName: escapeHtml(applicationListSellerText(entry, 6, "subject")),
    sellerTaxNo: escapeHtml(applicationListSellerText(entry, 7, "subjectTax")),
    buyerName: escapeHtml(application.buyerName || "-"),
    buyerTaxNo: escapeHtml(application.buyerTaxNo || "-"),
    amount: applicationListAmountMarkup(entry),
    status: renderStatus(application.status, applicationStatusTone(application.status)),
    statusDescription: escapeHtml(application.statusDescription || "-"),
    actions: renderApplicationTableActions(application),
  };
  return `
    <tr>
      ${visibleApplicationColumnDefinitions().map((column) => `<td data-application-column="${column.key}" class="${applicationColumnClassName(column)}">${cells[column.key]}</td>`).join("")}
    </tr>
  `;
}

function renderApplicationListRows(demoState, visibleEntries) {
  const columnCount = visibleApplicationColumnDefinitions().length;
  const stateMessages = {
    loading: "开票申请数据加载中…",
    empty: "暂无数据",
    permission: "当前身份暂无开票申请查看权限",
  };
  if (demoState === "error") {
    return `<tr data-demo-state="error"><td colspan="${columnCount}" class="table-empty">开票申请数据加载失败，请稍后重试。 <button class="btn secondary" type="button" data-application-retry>重试</button></td></tr>`;
  }
  if (demoState !== "data") {
    return `<tr data-demo-state="${demoState}"><td colspan="${columnCount}" class="table-empty">${stateMessages[demoState]}</td></tr>`;
  }
  if (visibleEntries.length) return visibleEntries.map(applicationListRow).join("");
  return `<tr data-demo-state="empty"><td colspan="${columnCount}" class="table-empty">未找到符合条件的数据 <button class="btn query-reset" type="button" data-application-empty-clear>清空条件</button></td></tr>`;
}

function renderApplicationPagination(demoState, total, totalPages) {
  if (demoState !== "data") return "";
  const pageButtons = Array.from({ length: totalPages }, (_, index) => index + 1)
    .map((page) => `<button class="btn ${page === state.applicationPage ? "" : "secondary"}" type="button" data-application-page="${page}" aria-current="${page === state.applicationPage ? "page" : "false"}">${page}</button>`)
    .join("");
  return `
    <div class="pagination" data-application-pagination>
      <span class="pagination-summary">共 ${total} 条，第 ${state.applicationPage} / ${totalPages} 页</span>
      <label>每页
        <select data-application-page-size aria-label="每页条数">
          ${[10, 20, 50, 100].map((size) => `<option value="${size}" ${size === state.applicationPageSize ? "selected" : ""}>${size} 条</option>`).join("")}
        </select>
      </label>
      <div class="btn-row">
        <button class="btn secondary" type="button" data-application-page="${Math.max(1, state.applicationPage - 1)}" ${state.applicationPage === 1 ? "disabled" : ""}>上一页</button>
        ${pageButtons}
        <button class="btn secondary" type="button" data-application-page="${Math.min(totalPages, state.applicationPage + 1)}" ${state.applicationPage === totalPages ? "disabled" : ""}>下一页</button>
      </div>
    </div>
  `;
}

function renderApplicationList() {
  const demoState = currentBrand() ? orderDemoState() : "permission";
  const allEntries = currentBrandApplicationEntries();
  const filteredEntries = demoState === "empty" ? [] : filteredCurrentBrandApplicationEntries(allEntries);
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / state.applicationPageSize));
  state.applicationPage = Math.min(Math.max(1, state.applicationPage), totalPages);
  const pageStart = (state.applicationPage - 1) * state.applicationPageSize;
  const visibleEntries = filteredEntries.slice(pageStart, pageStart + state.applicationPageSize);
  const visibleColumns = visibleApplicationColumnDefinitions();
  const tableMinWidth = Math.max(1180, visibleColumns.reduce((total, column) => total + (column.width || 120), 0));
  workspace.innerHTML = `
    ${renderBrandScope()}
    <section class="list-surface application-list-surface">
      <div class="page-title-region"><h1>开票申请管理</h1></div>
      <div class="toolbar order-toolbar query-region" data-application-query>
        <div class="query-item query-item-normal">${field("申请号", `<input id="applicationNoSearch" data-application-query-input="applicationNo" value="${escapeAttribute(state.applicationQuery.applicationNo)}" placeholder="请输入完整申请号" />`)}</div>
        <div class="query-item query-item-normal">${field("商家订单号", `<input id="applicationOrderNoSearch" data-application-query-input="merchantOrderNo" value="${escapeAttribute(state.applicationQuery.merchantOrderNo)}" placeholder="请输入完整商家订单号" />`)}</div>
        <div class="query-item query-item-normal">${field("门店", storeSuggestMarkup(state.applicationQuery))}</div>
        <div class="query-item query-item-normal">${field("购方名称", `<input id="applicationBuyerNameSearch" data-application-query-input="buyerName" value="${escapeAttribute(state.applicationQuery.buyerName)}" placeholder="请输入购方名称" />`)}</div>
        <div class="query-item query-item-normal">${field("购方税号", `<input id="applicationBuyerTaxNoSearch" data-application-query-input="buyerTaxNo" value="${escapeAttribute(state.applicationQuery.buyerTaxNo)}" placeholder="请输入完整购方税号" />`)}</div>
        <div class="query-item query-item-normal">${field("申请来源", queryDropdown("applicationSource", state.applicationQuery.source, applicationListSourceOptions(allEntries)))}</div>
        <div class="query-item query-item-normal">${field("申请状态", queryDropdown("applicationStatus", state.applicationQuery.status, ["全部", ...applicationStatuses]))}</div>
        <div class="query-item query-item-time">${queryDateTimeRangeMarkup("applicationTimeRange", "申请时间", state.applicationQuery.applicationTimeRange)}</div>
        <div class="btn-row query-actions">
          <button class="btn query-reset" type="button" data-application-clear>清空条件</button>
          <button class="btn" type="button" data-application-search>搜索</button>
        </div>
      </div>
      <div class="list-toolbar">
        <span></span>
        <div class="btn-row">
          <button class="btn secondary" type="button" data-application-export ${demoState === "data" ? "" : "disabled"}>导出</button>
          ${applicationColumnSettingsMarkup()}
        </div>
      </div>
      <div class="table-scroll">
        <table class="data-table application-list-table" style="min-width:${tableMinWidth}px">
          <colgroup>${visibleColumns.map((column) => `<col style="width:${column.width || 120}px" />`).join("")}</colgroup>
          <thead>
            <tr>${visibleColumns.map((column) => `<th data-application-column="${column.key}" class="${applicationColumnClassName(column)}">${column.label}</th>`).join("")}</tr>
          </thead>
          <tbody>${renderApplicationListRows(demoState, visibleEntries)}</tbody>
        </table>
      </div>
      ${renderApplicationPagination(demoState, filteredEntries.length, totalPages)}
    </section>
  `;

  bindBrandScope();
  bindApplicationQueryActions();
  bindApplicationPagination();
  bindApplicationToolbarActions(filteredEntries);
  bindApplicationListActions(allEntries);
  workspace.querySelector("[data-application-retry]")?.addEventListener("click", clearApplicationDemoState);
  workspace.querySelector("[data-application-empty-clear]")?.addEventListener("click", clearApplicationQuery);
}

function readApplicationTimeRange() {
  const root = workspace.querySelector('[data-query-date-time-range="applicationTimeRange"]');
  return {
    start: root?.dataset.start || "",
    end: root?.dataset.end || "",
  };
}

function submitApplicationQuery() {
  const applicationTimeRange = readApplicationTimeRange();
  const error = validateOrderDateRange(applicationTimeRange);
  const rangeRoot = workspace.querySelector('[data-query-date-time-range="applicationTimeRange"]');
  setQueryDateRangeFieldError(rangeRoot, error);
  if (error) {
    rangeRoot?.querySelector("[data-range-trigger]")?.focus();
    return;
  }
  const value = (key) => workspace.querySelector(`[data-application-query-input="${key}"]`)?.value.trim() || "";
  const storeInput = workspace.querySelector("[data-store-suggest-input]");
  state.applicationQuery = {
    applicationNo: value("applicationNo"),
    merchantOrderNo: value("merchantOrderNo"),
    store: storeInput?.value.trim() || "",
    storeId: storeInput?.dataset.selectedStoreId || "",
    buyerName: value("buyerName"),
    buyerTaxNo: value("buyerTaxNo"),
    source: workspace.querySelector('[data-query-dropdown="applicationSource"] [data-dropdown-trigger]')?.dataset.value || "全部",
    status: workspace.querySelector('[data-query-dropdown="applicationStatus"] [data-dropdown-trigger]')?.dataset.value || "全部",
    applicationTimeRange,
  };
  state.applicationPage = 1;
  renderApplicationList();
  resetViewScroll();
}

function clearApplicationQuery() {
  state.applicationQuery = defaultApplicationQuery();
  state.applicationPage = 1;
  renderApplicationList();
  resetViewScroll();
}

function bindApplicationQueryActions() {
  bindQueryDropdowns();
  bindQueryDateTimeRanges();
  bindStoreSuggest(submitApplicationQuery);
  workspace.querySelector("[data-application-search]")?.addEventListener("click", submitApplicationQuery);
  workspace.querySelector("[data-application-clear]")?.addEventListener("click", clearApplicationQuery);
  workspace.querySelectorAll("[data-application-query-input]").forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      submitApplicationQuery();
    });
  });
}

function bindApplicationPagination() {
  workspace.querySelectorAll("[data-application-page]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      state.applicationPage = Number(button.dataset.applicationPage) || 1;
      renderApplicationList();
      resetViewScroll();
    });
  });
  workspace.querySelector("[data-application-page-size]")?.addEventListener("change", (event) => {
    state.applicationPageSize = Number(event.target.value) || 10;
    state.applicationPage = 1;
    renderApplicationList();
    resetViewScroll();
  });
}

function bindApplicationToolbarActions(filteredEntries) {
  workspace.querySelector("[data-application-export]")?.addEventListener("click", () => exportApplications(filteredEntries));
  const settings = workspace.querySelector("[data-application-column-settings]");
  const button = settings?.querySelector("[data-application-columns]");
  const panel = settings?.querySelector("[data-application-column-panel]");
  button?.addEventListener("click", (event) => {
    event.stopPropagation();
    const expanded = panel.hidden;
    panel.hidden = !expanded;
    button.setAttribute("aria-expanded", String(expanded));
  });
  panel?.addEventListener("click", (event) => event.stopPropagation());
  settings?.querySelectorAll("[data-application-column-toggle]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const selectedColumns = [...settings.querySelectorAll("[data-application-column-toggle]:checked")]
        .map((item) => item.value);
      state.visibleApplicationColumns = applicationListColumns
        .filter((column) => column.required || selectedColumns.includes(column.key))
        .map((column) => column.key);
      renderApplicationList();
    });
  });
}

function bindApplicationListActions(entries) {
  workspace.querySelectorAll("[data-application-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const application = entries.map((entry) => entry.application)
        .find((item) => item.id === button.dataset.applicationId);
      const entry = entries.find((item) => item.application === application);
      if (!entry) return;
      const order = entry.order;
      if (button.dataset.applicationAction === "detail") {
        state.applicationDetailOrigin = "applicationList";
        captureApplicationListScroll();
      }
      executeApplicationAction(button.dataset.applicationAction, order, application);
    });
  });
}

function exportApplications(entries) {
  const rows = [
    ["申请时间", "申请来源", "发票类型", "商家订单号", "销售门店名称", "门店号", "销售方名称", "销售方税号", "购方名称", "购方税号", "开票金额", "申请状态", "状态说明", "申请号"],
    ...entries.map((entry) => [
      entry.application.appliedAt,
      entry.application.source,
      entry.application.invoiceType,
      applicationListMerchantOrderText(entry),
      applicationListStoreText(entry, "storeName", "salesStore"),
      applicationListStoreText(entry, "storeSn", "storeNo"),
      applicationListSellerText(entry, 6, "subject"),
      applicationListSellerText(entry, 7, "subjectTax"),
      entry.application.buyerName,
      entry.application.buyerTaxNo,
      entry.application.amount,
      entry.application.status,
      entry.application.statusDescription,
      entry.application.applyNo,
    ]),
  ];
  downloadTextFile(`开票申请-${currentBrand()?.number || "brand"}.csv`, `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`, "text/csv;charset=utf-8");
}

function clearApplicationDemoState() {
  const url = new URL(window.location.href);
  url.searchParams.delete("demoState");
  window.history.replaceState({}, "", url);
  renderApplicationList();
}

function clearOrderDemoState() {
  const url = new URL(window.location.href);
  url.searchParams.delete("demoState");
  window.history.replaceState({}, "", url);
  renderOrders();
}

function renderOrderBasicTab(order) {
  return `
    <section class="panel order-basic-info-panel">
      <div class="description-grid order-info-grid">
        ${kv("商家订单号", order.orderSn)}
        ${kv("业务订单号", order.salesSn)}
        ${kv("业务标识", orderBusinessIdentifier(order))}
        ${kv("订单金额", order.amount)}
        ${kv("同步时间", orderSyncTimeText(order))}
        ${kv("订单销售时间", order.salesTimeText)}
        ${kv("品牌名称", order.brandName)}
        ${kv("品牌编号", brandNumberForCode(order.brandCode))}
        ${kv("销售门店名称", order.storeName)}
        ${kv("门店号", order.storeSn)}
        ${kv("收银机编号", order.workstationSn)}
      </div>
    </section>
    <section class="panel">
      <div class="section-head in-panel"><h2>商品信息</h2></div>
      ${simpleTable(["商品编号", "商品名称", "商品大类", "规格", "单位", "数量", "单价", "原始金额", "实际金额", "赠品标识"], orderItemRows(order.items))}
    </section>
    <section class="panel">
      <div class="section-head in-panel"><h2>支付信息</h2></div>
      ${simpleTable(["交易时间", "交易方式名称", "交易方式编号", "交易金额", "实收金额", "实付金额", "渠道流水号", "商家流水号"], tenderRows(originalOrderTenders(order)))}
    </section>
  `;
}

function renderOrderFollowupsTab(order) {
  return order.followups.length
    ? simpleTable(["商家订单号", "业务订单号", "门店名称", "门店号", "订单金额", "业务发生时间", "同步时间", "操作"], followupRows(order))
    : `<div class="empty">无后续订单</div>`;
}

function renderOrderApplicationsTab(order, applications) {
  return applications.length
    ? simpleTable(
      [
        "申请号",
        "申请来源",
        "发票类型",
        "申请时间",
        "购方名称",
        "购方税号",
        "申请开票金额",
        "申请状态",
        "状态说明",
        "操作",
      ],
      invoiceApplicationRows(order),
      "invoice-application-table",
    )
    : `<div class="empty">暂无开票申请</div>`;
}

function renderOrderDetailTabs(order, applications) {
  const tabs = [
    ["basic", "订单基本信息"],
    ["followups", "后续订单"],
    ["applications", "开票申请"],
  ];
  return `
    <section class="order-detail-tab-section">
      <div class="order-detail-tabs" role="tablist" aria-label="订单详情内容">
        ${tabs.map(([key, label]) => `
          <button
            id="orderDetailTab-${key}"
            class="order-detail-tab ${state.orderDetailTab === key ? "active" : ""}"
            type="button"
            role="tab"
            aria-selected="${state.orderDetailTab === key}"
            aria-controls="orderDetailPanel-${key}"
            tabindex="${state.orderDetailTab === key ? "0" : "-1"}"
            data-order-detail-tab="${key}"
          >${label}</button>
        `).join("")}
      </div>
      <div id="orderDetailPanel-basic" class="order-detail-tab-panel" role="tabpanel" aria-labelledby="orderDetailTab-basic" ${state.orderDetailTab === "basic" ? "" : "hidden"}>
        ${renderOrderBasicTab(order)}
      </div>
      <div id="orderDetailPanel-followups" class="order-detail-tab-panel" role="tabpanel" aria-labelledby="orderDetailTab-followups" ${state.orderDetailTab === "followups" ? "" : "hidden"}>
        ${renderOrderFollowupsTab(order)}
      </div>
      <div id="orderDetailPanel-applications" class="order-detail-tab-panel" role="tabpanel" aria-labelledby="orderDetailTab-applications" ${state.orderDetailTab === "applications" ? "" : "hidden"}>
        ${renderOrderApplicationsTab(order, applications)}
      </div>
    </section>
  `;
}

function bindOrderDetailTabs() {
  const buttons = [...workspace.querySelectorAll("[data-order-detail-tab]")];
  const activate = (button, shouldFocus = false) => {
    state.orderDetailTab = button.dataset.orderDetailTab || "basic";
    buttons.forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle("active", active);
      candidate.setAttribute("aria-selected", String(active));
      candidate.tabIndex = active ? 0 : -1;
      const panel = workspace.querySelector(`#${candidate.getAttribute("aria-controls")}`);
      if (panel) panel.hidden = !active;
    });
    if (shouldFocus) button.focus();
  };
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => activate(button));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      activate(buttons[nextIndex], true);
    });
  });
}

function renderOrderDetail() {
  ensureSelectedOrderInCurrentBrand();
  const order = currentBrandOrders().find((item) => item.orderSn === state.selectedOrder);
  if (!order) {
    workspace.innerHTML = renderDetailPermissionState("订单详情");
    bindBreadcrumbActions();
    return;
  }
  const lifecycleEvents = orderLifecycleEvents(order);
  const applications = normalizeOrderApplications(order);

  workspace.innerHTML = `
    <div class="detail-page" aria-labelledby="orderDetailTitle">
      <nav class="breadcrumb" aria-label="当前位置">
        <span>场景功能</span>
        <span>零售订单开票</span>
        <button type="button" data-breadcrumb-view="orders">零售订单管理</button>
        <strong>订单详情</strong>
      </nav>
      <h1 id="orderDetailTitle" class="visually-hidden">订单详情</h1>
      <section class="detail-summary">
        <div class="section-head in-panel detail-summary-head">
          <h2>订单摘要</h2>
          ${renderOrderInvoiceAvailabilityFact(order)}
          <div class="summary-actions">${renderOrderActions(order)}</div>
        </div>
        <div class="summary-grid order-summary-grid">
          ${fact("商家订单号", order.orderSn)}
          ${fact("订单金额", order.amount)}
          ${fact("订单开票状态", renderOrderInvoiceStatusSummary(order))}
          ${fact("退换货状态", renderStatus(order.returnStatus, returnStatusTone(order.returnStatus)))}
          ${renderManualInvoiceMarkFact(order)}
        </div>
      </section>

      <section class="lifecycle-strip ${state.lifecycleExpanded ? "" : "is-collapsed"}">
        <div class="section-head in-panel">
          <h2 id="orderLifecycleHeading">订单动态</h2>
          <button
            class="btn link lifecycle-toggle"
            type="button"
            data-lifecycle-toggle
            aria-expanded="${state.lifecycleExpanded}"
            aria-controls="orderLifecycleTimeline"
          >
            <span data-lifecycle-toggle-label>${state.lifecycleExpanded ? "收起" : "展开"}</span>
            <span class="lifecycle-toggle-chevron" aria-hidden="true"></span>
          </button>
        </div>
        <ol
          id="orderLifecycleTimeline"
          class="lifecycle-timeline"
          aria-labelledby="orderLifecycleHeading"
          ${state.lifecycleExpanded ? "" : "hidden"}
        >
          ${lifecycleEvents.map(renderLifecycleStep).join("")}
        </ol>
      </section>

      ${renderOrderDetailTabs(order, applications)}
    </div>
  `;

  bindBreadcrumbActions();
  bindFollowupActions(order);
  bindLifecycleToggle();
  bindOrderDetailTabs();
  bindApplicationActions(order);
  bindOrderActions(order);
}

function openManualInvoice(order) {
  if (!canManualInvoiceOrder(order)) return;
  state.manualInvoiceOrderIds = [order.orderSn];
  state.manualInvoiceDraft = createDefaultManualInvoiceDraft([order]);
  setView("manualInvoice");
}

function manualInvoiceOrders() {
  const selectedIds = new Set(state.manualInvoiceOrderIds || []);
  return currentBrandOrders().filter((order) => selectedIds.has(order.orderSn));
}

function createDefaultManualInvoiceDraft(orderList) {
  const firstOrder = orderList[0] || {};
  return {
    invoiceType: "normal",
    buyerType: "enterprise",
    buyerName: firstOrder.customer || "",
    buyerTaxNo: firstOrder.taxId || "",
    buyerAddress: "",
    buyerPhone: "",
    buyerBank: "",
    buyerAccount: "",
    remark: "",
    deliveryEmail: firstOrder.receiverEmail || "",
  };
}

function manualInvoiceTaxpayer(order, storeSn) {
  return manualInvoiceTaxpayerByStore[`${order.brandCode}|${storeSn}`] || {
    name: order.subject,
    taxNo: order.subjectTax,
  };
}

function normalizeManualInvoiceItem(item, originalAmount = item?.[5]) {
  const actualAmount = Math.abs(parseMoney(item?.[5]));
  const quantity = Number(item?.[4]) || 1;
  const originalLineAmount = Math.abs(parseMoney(originalAmount));
  return {
    code: item?.[0] || "-",
    name: item?.[1] || "-",
    category: item?.[2] || "-",
    unit: item?.[3] || "件",
    quantity: String(quantity),
    originalUnitPrice: originalLineAmount / quantity,
    originalAmount: formatMoney(originalLineAmount),
    actualAmount: formatMoney(actualAmount),
    invoiceableAmount: formatMoney(actualAmount),
    invoiceAmount: formatMoney(actualAmount),
  };
}

function subtractManualInvoiceItemAmount(items, deductionAmount) {
  let remaining = Math.round(Math.abs(deductionAmount) * 100);
  if (!remaining) return;
  const exactIndex = items.findIndex((item) => Math.round(parseMoney(item.actualAmount) * 100) === remaining);
  const orderedIndexes = exactIndex >= 0
    ? [exactIndex]
    : items.map((_, index) => index).sort((a, b) => parseMoney(items[b].actualAmount) - parseMoney(items[a].actualAmount));

  orderedIndexes.forEach((index) => {
    if (!remaining) return;
    const itemCents = Math.round(parseMoney(items[index].actualAmount) * 100);
    const deducted = Math.min(itemCents, remaining);
    items[index].actualAmount = formatMoney((itemCents - deducted) / 100);
    remaining -= deducted;
  });
}

function allocateManualInvoiceItemAmounts(items, targetInvoiceCents) {
  const activeItems = items.filter((item) => parseMoney(item.actualAmount) > 0);
  const originalPriceQuantityWeight = (item) => {
    const quantity = Number(item.quantity) || 1;
    const originalUnitPrice = Number(item.originalUnitPrice) || 0;
    return Math.round(Math.abs(originalUnitPrice * quantity) * 100)
      || Math.round(Math.abs(parseMoney(item.actualAmount)) * 100);
  };
  const weightCents = activeItems.reduce((sum, item) => sum + originalPriceQuantityWeight(item), 0);
  if (!activeItems.length) return [];

  const totalTargetCents = Math.max(0, Math.round(targetInvoiceCents));
  let allocatedCents = 0;
  activeItems.forEach((item, index) => {
    const remainingCents = Math.max(0, totalTargetCents - allocatedCents);
    const itemInvoiceCents = index === activeItems.length - 1
      ? remainingCents
      : Math.min(
        remainingCents,
        Math.round(totalTargetCents * originalPriceQuantityWeight(item) / Math.max(1, weightCents))
      );
    item.invoiceableAmount = formatMoney(itemInvoiceCents / 100);
    item.invoiceAmount = formatMoney(itemInvoiceCents / 100);
    allocatedCents += itemInvoiceCents;
  });
  return activeItems;
}

function stablePreInvoiceRequestId(order, contentIndex, explicitId = "") {
  return explicitId || `PRE-${order.orderSn}-${String(contentIndex + 1).padStart(2, "0")}`;
}

function manualInvoiceAllocationRatioText(groupGoodsCents, totalGoodsCents) {
  if (!totalGoodsCents) return "0%";
  const percentage = groupGoodsCents * 100 / totalGoodsCents;
  return `${percentage.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}%`;
}

function manualInvoiceApplicationPaymentSummary(orderList) {
  const nonInvoiceablePayments = new Map();
  const summary = orderList.reduce((resultSummary, order) => {
    const result = currentInvoiceableResult(order);
    resultSummary.invoiceableCents += Math.round(Math.max(0, result.invoiceableAmount) * 100);
    resultSummary.excludedReceivedCents += Math.round(Math.max(0, result.excludedReceived) * 100);
    resultSummary.netReceivedCents += Math.round(result.netReceived * 100);
    result.entries
      .filter((entry) => entry.effective && entry.nonInvoiceable && entry.appliedReceivedAmount)
      .forEach((entry) => {
        const code = entry.originalPaymentCode || entry.code;
        const name = entry.originalPaymentName || entry.name || code;
        const current = nonInvoiceablePayments.get(code) || { code, name, amountCents: 0 };
        current.amountCents += Math.round(entry.appliedReceivedAmount * 100);
        nonInvoiceablePayments.set(code, current);
      });
    return resultSummary;
  }, { invoiceableCents: 0, excludedReceivedCents: 0, netReceivedCents: 0 });
  summary.nonInvoiceablePayments = [...nonInvoiceablePayments.values()]
    .filter((payment) => payment.amountCents > 0)
    .map((payment) => ({
      ...payment,
      displayName: String(payment.name).replace(/支付$/, "") || payment.name,
    }));
  return summary;
}

function allocateManualInvoiceGroupAmounts(preparedGroups, applicationInvoiceCents) {
  const totalGoodsCents = preparedGroups.reduce((sum, group) => sum + group.goodsActualCents, 0);
  let allocatedInvoiceCents = 0;
  return preparedGroups.map((group, index) => {
    const remainingInvoiceCents = Math.max(0, applicationInvoiceCents - allocatedInvoiceCents);
    const groupInvoiceCents = index === preparedGroups.length - 1
      ? remainingInvoiceCents
      : Math.min(
        remainingInvoiceCents,
        Math.round(applicationInvoiceCents * group.goodsActualCents / Math.max(1, totalGoodsCents))
      );
    allocatedInvoiceCents += groupInvoiceCents;
    allocateManualInvoiceItemAmounts(group.items, groupInvoiceCents);

    return {
      ...group,
      goodsActualAmount: formatMoney(group.goodsActualCents / 100),
      allocationRatio: manualInvoiceAllocationRatioText(group.goodsActualCents, totalGoodsCents),
      invoiceAmount: formatMoney(groupInvoiceCents / 100),
      invoiceableAmount: formatMoney(groupInvoiceCents / 100),
    };
  });
}

function buildManualInvoiceContentGroups(orderList) {
  const groups = new Map();
  const applicationPayment = manualInvoiceApplicationPaymentSummary(orderList);

  orderList.forEach((order) => {
    const invoiceableResult = currentInvoiceableResult(order);
    if (invoiceableResult.amount <= 0) return;
    const subject = order.subject;
    const subjectTax = order.subjectTax;
    const orderContentEntries = [];

    if (Array.isArray(order.effectiveInvoiceContents) && order.effectiveInvoiceContents.length) {
      order.effectiveInvoiceContents.forEach((content, contentIndex) => {
        const storeName = content.storeName || order.storeName;
        const storeSn = content.storeSn || order.storeSn;
        const seller = manualInvoiceTaxpayer(order, storeSn);
        orderContentEntries.push({
          preInvoiceRequestId: stablePreInvoiceRequestId(
            order,
            contentIndex,
            content.preInvoiceRequestId || content.pre_invoice_request_id
          ),
          preInvoiceRequestSequence: Number(content.preInvoiceRequestSequence ?? content.sequence) || contentIndex + 1,
          storeName,
          storeSn,
          relatedOrderNos: Array.isArray(content.relatedOrderNos) && content.relatedOrderNos.length
            ? content.relatedOrderNos
            : [order.orderSn],
          taxpayer: {
            name: seller.name || subject,
            taxNo: seller.taxNo || subjectTax,
          },
          items: (content.items || []).map((item) => normalizeManualInvoiceItem(item)),
        });
      });
    } else {
      const originalItems = (order.items || []).map((item) => normalizeManualInvoiceItem(item));
      const deductionFollowups = (order.followups || []).filter(([type]) => (
        type.includes("退货") || (type.includes("换货") && !type.includes("换货新销售"))
      ));
      deductionFollowups.forEach((followup) => subtractManualInvoiceItemAmount(originalItems, parseMoney(followup[5])));

      const remainingOriginalItems = originalItems.filter((item) => parseMoney(item.actualAmount) > 0);
      if (remainingOriginalItems.length) {
        const seller = manualInvoiceTaxpayer(order, order.storeSn);
        orderContentEntries.push({
          preInvoiceRequestId: stablePreInvoiceRequestId(order, orderContentEntries.length),
          preInvoiceRequestSequence: orderContentEntries.length + 1,
          storeName: order.storeName,
          storeSn: order.storeSn,
          relatedOrderNos: [order.orderSn],
          taxpayer: {
            name: seller.name || subject,
            taxNo: seller.taxNo || subjectTax,
          },
          items: remainingOriginalItems,
        });
      }

      (order.followups || [])
        .filter(([type]) => type.includes("换货新销售"))
        .forEach((followup) => {
          const [, followupSn, , storeLabel] = followup;
          const [storeName, storeSn] = splitStoreLabel(storeLabel);
          const seller = manualInvoiceTaxpayer(order, storeSn);
          const followupItems = buildFollowupItems(order, followup).map((item) => {
            const normalized = normalizeManualInvoiceItem(item);
            normalized.code = normalized.code.replace(`-${followupSn}`, "");
            normalized.name = normalized.name.replace(/^换入商品：/, "");
            return normalized;
          });
          orderContentEntries.push({
            preInvoiceRequestId: stablePreInvoiceRequestId(order, orderContentEntries.length),
            preInvoiceRequestSequence: orderContentEntries.length + 1,
            storeName,
            storeSn,
            relatedOrderNos: [followupSn],
            taxpayer: {
              name: seller.name || subject,
              taxNo: seller.taxNo || subjectTax,
            },
            items: followupItems,
          });
        });
    }

    orderContentEntries.forEach((entry) => {
      const activeItems = entry.items.filter((item) => parseMoney(item.actualAmount) > 0);
      if (!activeItems.length) return;
      const key = entry.preInvoiceRequestId;
      if (!groups.has(key)) {
        groups.set(key, {
          id: `manual-invoice-content-${groups.size + 1}`,
          preInvoiceRequestId: entry.preInvoiceRequestId,
          preInvoiceRequestSequence: entry.preInvoiceRequestSequence,
          storeName: entry.storeName,
          storeSn: entry.storeSn,
          taxpayerName: entry.taxpayer.name,
          taxpayerTaxNo: entry.taxpayer.taxNo,
          relatedSalesOrderNos: new Set(),
          items: [],
        });
      }
      const group = groups.get(key);
      (entry.relatedOrderNos || [order.orderSn]).forEach((orderNo) => group.relatedSalesOrderNos.add(orderNo));
      group.items.push(...activeItems);
    });
  });

  const preparedGroups = [...groups.values()]
    .map((group) => ({
      ...group,
      relatedSalesOrderNos: [...group.relatedSalesOrderNos],
      goodsActualCents: group.items.reduce(
        (sum, item) => sum + Math.round(Math.abs(parseMoney(item.actualAmount)) * 100),
        0
      ),
    }))
    .filter((group) => group.goodsActualCents > 0)
    .sort((left, right) => (
      left.preInvoiceRequestSequence - right.preInvoiceRequestSequence
      || left.preInvoiceRequestId.localeCompare(right.preInvoiceRequestId)
    ));
  return allocateManualInvoiceGroupAmounts(preparedGroups, applicationPayment.invoiceableCents)
    .filter((group) => parseMoney(group.invoiceAmount) > 0);
}

function manualInvoiceTable(headers, rows, className) {
  return `
    <div class="table-scroll">
      <table class="data-table detail-table ${className}">
        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function manualInvoiceOrderRows(orderList) {
  return orderList.map((order) => [
    escapeHtml(order.orderSn),
    escapeHtml(order.salesSn),
    escapeHtml(order.storeName),
    escapeHtml(order.storeSn),
    escapeHtml(order.amount),
    renderStatus(order.returnStatus, returnStatusTone(order.returnStatus)),
    escapeHtml(order.salesTimeText),
  ]);
}

function manualInvoiceProductRows(items) {
  return items.map((item) => {
    const quantity = Number(item.quantity) || 1;
    const actualAmount = parseMoney(item.actualAmount);
    return [
      item.code,
      item.name,
      item.category,
      inferSpec(item.code, item.category),
      item.unit,
      item.quantity,
      formatMoney(actualAmount / quantity),
      item.originalAmount,
      item.actualAmount,
      actualAmount === 0 ? "是" : "否",
    ].map(escapeHtml);
  });
}

function renderManualInvoiceContentGroup(group, index, groups) {
  return `
    <article class="manual-invoice-content-group" data-pre-invoice-request-id="${escapeAttribute(group.preInvoiceRequestId)}" aria-label="第 ${index + 1} 组开票内容，共 ${groups.length} 组">
      <div class="manual-invoice-content-head">
        <div class="manual-invoice-content-meta is-taxpayer-only">
          <div class="manual-invoice-meta-item"><span class="label">纳税人名称</span><strong class="value">${escapeHtml(group.taxpayerName)}</strong></div>
          <div class="manual-invoice-meta-item"><span class="label">税号</span><strong class="value">${escapeHtml(group.taxpayerTaxNo)}</strong></div>
        </div>
      </div>
      ${manualInvoiceTable(
        ["商品编号", "商品名称", "商品大类", "规格", "单位", "数量", "单价", "原始金额", "实际金额", "赠品标识"],
        manualInvoiceProductRows(group.items),
        "manual-invoice-product-table"
      )}
      <div class="manual-invoice-amount-summary" aria-label="本组金额信息">
        <div class="manual-invoice-group-amounts">
          <span class="manual-invoice-amount-item"><span class="label">轧差后商品成交额</span><strong class="value">${escapeHtml(group.goodsActualAmount)}</strong></span>
          <span class="manual-invoice-amount-item is-total"><span class="label">本组预计开票金额</span><strong class="value">${escapeHtml(group.invoiceAmount)}</strong></span>
        </div>
      </div>
    </article>
  `;
}

function renderManualInvoice() {
  const orderList = manualInvoiceOrders();
  if (!orderList.length) {
    workspace.innerHTML = renderDetailEmptyState("手动开票", "未找到可开票订单，请返回订单详情后重试。");
    bindBreadcrumbActions();
    return;
  }
  const groups = buildManualInvoiceContentGroups(orderList);
  const applicationPayment = manualInvoiceApplicationPaymentSummary(orderList);
  const draft = state.manualInvoiceDraft || createDefaultManualInvoiceDraft(orderList);
  const buyerIsEnterprise = draft.buyerType !== "personal";
  state.manualInvoiceDraft = draft;

  workspace.innerHTML = `
    <div class="detail-page manual-invoice-page" aria-labelledby="manualInvoicePageTitle">
      <nav class="breadcrumb" aria-label="当前位置">
        <span>场景功能</span>
        <span>零售订单开票</span>
        <button type="button" data-breadcrumb-view="orders">零售订单管理</button>
        <button type="button" data-manual-invoice-back>订单详情</button>
        <strong>手动开票</strong>
      </nav>
      <h1 id="manualInvoicePageTitle" class="visually-hidden">手动开票</h1>

      <section class="manual-invoice-section" aria-labelledby="manualInvoiceOrdersHeading">
        <div class="manual-invoice-section-head"><h2 id="manualInvoiceOrdersHeading">开票订单信息</h2></div>
        <div class="manual-invoice-section-body">
          ${manualInvoiceTable(
            manualInvoiceOrderColumns.map((column) => column.label),
            manualInvoiceOrderRows(orderList),
            "manual-invoice-order-table"
          )}
        </div>
      </section>

      <section class="manual-invoice-section" aria-labelledby="manualInvoiceContentHeading">
        <div class="manual-invoice-section-head"><h2 id="manualInvoiceContentHeading">开票内容信息</h2></div>
        <div class="manual-invoice-section-body">
          ${applicationPayment.nonInvoiceablePayments.length
            ? `<div class="manual-invoice-application-note" role="note">${applicationPayment.nonInvoiceablePayments.map((payment) => `
                <div class="manual-invoice-application-note-item">
                  <span>已剔除不可开票支付方式【${escapeHtml(payment.displayName)}】<strong>${escapeHtml(formatMoney(payment.amountCents / 100))}</strong>，该金额不参与开票。</span>
                </div>
              `).join("")}</div>`
            : ""}
          ${groups.length
            ? `<div class="manual-invoice-content-groups">${groups.map(renderManualInvoiceContentGroup).join("")}</div>`
            : `<div class="empty">当前订单没有可开票商品</div>`}
        </div>
      </section>

      <section class="manual-invoice-section" aria-labelledby="manualInvoiceApplicationHeading">
        <div class="manual-invoice-section-head"><h2 id="manualInvoiceApplicationHeading">开票申请信息</h2></div>
        <div class="manual-invoice-section-body">
          <form class="manual-invoice-form" data-manual-invoice-form novalidate>
            <div class="manual-invoice-form-group">
              <h3 class="manual-invoice-form-group-title">发票类型</h3>
              <div class="manual-invoice-radio-group" role="radiogroup" aria-label="发票类型">
                <label class="manual-invoice-radio-option"><input id="manualInvoiceTypeNormal" type="radio" name="invoiceType" value="normal" ${draft.invoiceType === "normal" ? "checked" : ""} />增值税普通发票</label>
                <label class="manual-invoice-radio-option"><input id="manualInvoiceTypeSpecial" type="radio" name="invoiceType" value="special" ${draft.invoiceType === "special" ? "checked" : ""} />增值税专用发票</label>
              </div>
            </div>

            <div class="manual-invoice-form-group">
              <h3 class="manual-invoice-form-group-title">购买方信息</h3>
              <div class="manual-invoice-buyer-grid">
                <div class="manual-invoice-field full-width manual-invoice-buyer-type-field">
                  <span id="buyerTypeLabel" class="manual-invoice-field-label">购方类型</span>
                  <div class="manual-invoice-radio-group" role="radiogroup" aria-labelledby="buyerTypeLabel" aria-required="true">
                    <label class="manual-invoice-radio-option"><input id="buyerTypePersonal" type="radio" name="buyerType" value="personal" ${draft.buyerType === "personal" ? "checked" : ""} />个人</label>
                    <label class="manual-invoice-radio-option"><input id="buyerTypeEnterprise" type="radio" name="buyerType" value="enterprise" ${buyerIsEnterprise ? "checked" : ""} />企业</label>
                  </div>
                </div>
                <div class="manual-invoice-field" data-manual-invoice-field="buyerName">
                  <label for="buyerName">购买方名称<span class="required" aria-hidden="true">*</span></label>
                  <input id="buyerName" name="buyerName" type="text" value="${escapeAttribute(draft.buyerName)}" maxlength="100" required aria-required="true" />
                  <p class="field-error" id="buyerNameError" role="alert" hidden></p>
                </div>
                <div class="manual-invoice-field span-2" data-manual-invoice-field="buyerTaxNo">
                  <label for="buyerTaxNo">统一社会信用代码/纳税人识别号<span class="required" data-buyer-tax-required aria-hidden="true" ${buyerIsEnterprise ? "" : "hidden"}>*</span></label>
                  <input id="buyerTaxNo" name="buyerTaxNo" type="text" value="${escapeAttribute(draft.buyerTaxNo)}" maxlength="30" ${buyerIsEnterprise ? "required" : ""} aria-required="${buyerIsEnterprise ? "true" : "false"}" />
                  <p class="field-error" id="buyerTaxNoError" role="alert" hidden></p>
                </div>
                <div class="manual-invoice-field" data-manual-invoice-field="buyerAddress">
                  <label for="buyerAddress">地址</label>
                  <input id="buyerAddress" name="buyerAddress" type="text" value="${escapeAttribute(draft.buyerAddress)}" placeholder="请输入购买方地址" maxlength="100" />
                  <p class="field-error" id="buyerAddressError" role="alert" hidden></p>
                </div>
                <div class="manual-invoice-field" data-manual-invoice-field="buyerPhone">
                  <label for="buyerPhone">电话</label>
                  <input id="buyerPhone" name="buyerPhone" type="tel" value="${escapeAttribute(draft.buyerPhone)}" placeholder="请输入购买方电话" maxlength="30" />
                  <p class="field-error" id="buyerPhoneError" role="alert" hidden></p>
                </div>
                <div class="manual-invoice-field" data-manual-invoice-field="buyerBank">
                  <label for="buyerBank">开户银行</label>
                  <input id="buyerBank" name="buyerBank" type="text" value="${escapeAttribute(draft.buyerBank)}" placeholder="请输入开户银行" maxlength="100" />
                  <p class="field-error" id="buyerBankError" role="alert" hidden></p>
                </div>
                <div class="manual-invoice-field" data-manual-invoice-field="buyerAccount">
                  <label for="buyerAccount">银行账号</label>
                  <input id="buyerAccount" name="buyerAccount" type="text" value="${escapeAttribute(draft.buyerAccount)}" placeholder="请输入银行账号" maxlength="50" />
                  <p class="field-error" id="buyerAccountError" role="alert" hidden></p>
                </div>
              </div>
            </div>

            <div class="manual-invoice-form-group">
              <h3 class="manual-invoice-form-group-title">发票备注</h3>
              <div class="manual-invoice-field full-width" data-manual-invoice-field="invoiceRemark">
                <label for="invoiceRemark">备注信息</label>
                <textarea id="invoiceRemark" name="invoiceRemark" rows="4" maxlength="1000" placeholder="请输入发票备注">${escapeHtml(draft.remark)}</textarea>
                <p class="field-error" id="invoiceRemarkError" role="alert" hidden></p>
              </div>
            </div>

            <div class="manual-invoice-form-group">
              <h3 class="manual-invoice-form-group-title">发票交付信息</h3>
              <div class="manual-invoice-buyer-grid">
                <div class="manual-invoice-field span-2" data-manual-invoice-field="deliveryEmail">
                  <label for="deliveryEmail">接收邮箱<span class="required" aria-hidden="true">*</span></label>
                  <input id="deliveryEmail" name="deliveryEmail" type="email" value="${escapeAttribute(draft.deliveryEmail)}" placeholder="请输入接收邮箱" maxlength="100" required />
                  <p class="field-error" id="deliveryEmailError" role="alert" hidden></p>
                </div>
              </div>
            </div>

            <p class="field-error" data-manual-invoice-form-error role="alert" hidden></p>
            <div class="manual-invoice-footer-actions">
              <button class="btn secondary" type="button" data-action="cancel-manual-invoice">取消</button>
              <button class="btn" type="submit" data-action="submit-manual-invoice" ${groups.length ? "" : "disabled"}>确认开票</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  `;

  bindManualInvoiceActions(orderList, groups);
}

function readManualInvoiceDraft() {
  const form = workspace.querySelector("[data-manual-invoice-form]");
  if (!form) return state.manualInvoiceDraft || createDefaultManualInvoiceDraft(manualInvoiceOrders());
  return {
    invoiceType: form.querySelector('[name="invoiceType"]:checked')?.value || "normal",
    buyerType: form.querySelector('[name="buyerType"]:checked')?.value || "enterprise",
    buyerName: form.querySelector("#buyerName")?.value.trim() || "",
    buyerTaxNo: form.querySelector("#buyerTaxNo")?.value.trim() || "",
    buyerAddress: form.querySelector("#buyerAddress")?.value.trim() || "",
    buyerPhone: form.querySelector("#buyerPhone")?.value.trim() || "",
    buyerBank: form.querySelector("#buyerBank")?.value.trim() || "",
    buyerAccount: form.querySelector("#buyerAccount")?.value.trim() || "",
    remark: form.querySelector("#invoiceRemark")?.value.trim() || "",
    deliveryEmail: form.querySelector("#deliveryEmail")?.value.trim() || "",
  };
}

function clearManualInvoiceErrors() {
  workspace.querySelectorAll("[data-manual-invoice-field]").forEach((fieldRoot) => fieldRoot.classList.remove("is-invalid"));
  workspace.querySelectorAll(".manual-invoice-field input, .manual-invoice-field textarea").forEach((control) => {
    control.classList.remove("is-invalid");
    control.removeAttribute("aria-invalid");
  });
  workspace.querySelectorAll(".manual-invoice-field .field-error").forEach((error) => {
    error.textContent = "";
    error.hidden = true;
  });
  const formError = workspace.querySelector("[data-manual-invoice-form-error]");
  if (formError) {
    formError.textContent = "";
    formError.hidden = true;
  }
}

function setManualInvoiceFieldError(id, message) {
  const control = workspace.querySelector(`#${id}`);
  const fieldRoot = workspace.querySelector(`[data-manual-invoice-field="${id}"]`);
  const error = workspace.querySelector(`#${id}Error`);
  control?.classList.add("is-invalid");
  control?.setAttribute("aria-invalid", "true");
  fieldRoot?.classList.add("is-invalid");
  if (error) {
    error.textContent = message;
    error.hidden = false;
  }
  return control;
}

function clearManualInvoiceFieldError(id) {
  const control = workspace.querySelector(`#${id}`);
  const fieldRoot = workspace.querySelector(`[data-manual-invoice-field="${id}"]`);
  const error = workspace.querySelector(`#${id}Error`);
  control?.classList.remove("is-invalid");
  control?.removeAttribute("aria-invalid");
  fieldRoot?.classList.remove("is-invalid");
  if (error) {
    error.textContent = "";
    error.hidden = true;
  }
}

function syncManualInvoiceBuyerType(form, buyerType) {
  const buyerIsEnterprise = buyerType !== "personal";
  const buyerName = form.querySelector("#buyerName");
  const buyerTaxNo = form.querySelector("#buyerTaxNo");
  const buyerTaxRequired = form.querySelector("[data-buyer-tax-required]");
  if (buyerName) {
    buyerName.required = true;
    buyerName.setAttribute("aria-required", "true");
  }
  if (buyerTaxNo) {
    buyerTaxNo.required = buyerIsEnterprise;
    buyerTaxNo.setAttribute("aria-required", buyerIsEnterprise ? "true" : "false");
  }
  if (buyerTaxRequired) buyerTaxRequired.hidden = !buyerIsEnterprise;
  if (!buyerIsEnterprise) clearManualInvoiceFieldError("buyerTaxNo");
}

function validateManualInvoiceDraft(draft, groups) {
  const errors = [];
  const buyerType = draft.buyerType === "personal" ? "personal" : "enterprise";
  if (!draft.buyerName) errors.push(["buyerName", "请输入购买方名称"]);
  if (buyerType === "enterprise" && !draft.buyerTaxNo) {
    errors.push(["buyerTaxNo", "请输入统一社会信用代码或纳税人识别号"]);
  }
  if (!draft.deliveryEmail) {
    errors.push(["deliveryEmail", "请输入接收邮箱"]);
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.deliveryEmail)) {
    errors.push(["deliveryEmail", "请输入有效的接收邮箱"]);
  }
  if (!groups.length) errors.push(["", "当前订单没有可开票商品"]);
  return errors;
}

function cancelManualInvoice() {
  state.manualInvoiceOrderIds = [];
  state.manualInvoiceDraft = null;
  setView("orderDetail");
}

function submitManualInvoice(orderList = manualInvoiceOrders(), groups = buildManualInvoiceContentGroups(orderList), providedDraft) {
  const draft = providedDraft || readManualInvoiceDraft();
  const errors = validateManualInvoiceDraft(draft, groups);
  clearManualInvoiceErrors();
  if (errors.length) {
    errors.forEach(([id, message]) => {
      if (id) setManualInvoiceFieldError(id, message);
    });
    const firstControl = errors.map(([id]) => id && workspace.querySelector(`#${id}`)).find(Boolean);
    if (firstControl) firstControl.focus();
    const formError = workspace.querySelector("[data-manual-invoice-form-error]");
    if (formError && errors.some(([id]) => !id)) {
      formError.textContent = errors.find(([id]) => !id)?.[1] || "请检查开票信息";
      formError.hidden = false;
    }
    return false;
  }

  const applyNo = `APPLY-META-${Date.now()}`;
  const appliedAt = currentDateTimeText();
  const totalAmount = formatMoney(groups.reduce((sum, group) => sum + parseMoney(group.invoiceAmount), 0));
  const applicationItems = groups.flatMap((group) => group.items.map((item) => [
    item.code,
    item.name,
    item.category,
    item.unit,
    item.quantity,
    item.invoiceableAmount,
    item.category === "服务" ? 0.06 : 0.13,
  ]));
  const preInvoiceRequests = groups.map((group) => ({
    preInvoiceRequestId: group.preInvoiceRequestId,
    preInvoiceRequestSequence: group.preInvoiceRequestSequence,
    storeName: group.storeName,
    storeSn: group.storeSn,
    taxpayerName: group.taxpayerName,
    taxpayerTaxNo: group.taxpayerTaxNo,
    goodsActualAmount: group.goodsActualAmount,
    allocationRatio: group.allocationRatio,
    invoiceAmount: group.invoiceAmount,
    items: group.items.map((item) => ({
      code: item.code,
      quantity: item.quantity,
      originalAmount: item.originalAmount,
      actualAmount: item.actualAmount,
      invoiceAmount: item.invoiceAmount,
    })),
  }));

  orderList.forEach((order) => {
    const applications = materializeOrderApplications(order);
    const invoiceableResult = currentInvoiceableResult(order);
    applications.push(normalizeApplicationRecord({
      id: `${orderList.map((item) => item.orderSn).join("+")}-${applyNo}`,
      applyNo,
      source: "订单手动开票",
      appliedAt,
      invoiceType: draft.invoiceType === "special" ? "电子专票" : "电子普票",
      buyerType: draft.buyerType,
      buyerName: draft.buyerName,
      buyerTaxNo: draft.buyerTaxNo,
      buyerAddress: draft.buyerAddress,
      buyerPhone: draft.buyerPhone,
      buyerBank: draft.buyerBank,
      buyerAccount: draft.buyerAccount,
      deliveryEmail: draft.deliveryEmail,
      remark: draft.remark,
      amount: totalAmount,
      status: "开票中",
      statusDescription: "",
      invoices: [],
      items: applicationItems,
      relatedOrderIds: orderList.map((relatedOrder) => relatedOrder.orderSn),
      relatedOrderCount: orderList.length,
      currentOrderAmount: invoiceableResult.formattedAmount,
      preInvoiceRequests,
      invoiceableCalculationSnapshot: {
        invoiceableAmount: invoiceableResult.invoiceableAmount,
        eligibleReceived: invoiceableResult.eligibleReceived,
        excludedReceived: invoiceableResult.excludedReceived,
        netReceived: invoiceableResult.netReceived,
        entries: invoiceableResult.entries,
        evaluatedAt: invoiceableResult.evaluatedAt,
        configVersion: invoiceableResult.configVersion,
        allocationBasis: "post_offset_goods_amount",
        itemAllocationBasis: "original_unit_price_times_quantity",
        roundingPolicy: "last_pre_invoice_request_and_last_item_take_remainder",
        preInvoiceRequests,
      },
    }, order, applications.length));
    order.invoiceStatus = "开票中";
  });

  state.selectedOrder = orderList[0].orderSn;
  state.manualInvoiceOrderIds = [];
  state.manualInvoiceDraft = null;
  setView("orderDetail");
  return true;
}

function bindManualInvoiceActions(orderList, groups) {
  workspace.querySelector("[data-manual-invoice-back]")?.addEventListener("click", cancelManualInvoice);
  workspace.querySelector('[data-action="cancel-manual-invoice"]')?.addEventListener("click", cancelManualInvoice);
  const form = workspace.querySelector("[data-manual-invoice-form]");
  if (!form) return;
  syncManualInvoiceBuyerType(form, readManualInvoiceDraft().buyerType);
  form.addEventListener("input", (event) => {
    state.manualInvoiceDraft = readManualInvoiceDraft();
    const fieldRoot = event.target.closest?.("[data-manual-invoice-field]");
    if (fieldRoot) {
      const id = fieldRoot.dataset.manualInvoiceField;
      const error = workspace.querySelector(`#${id}Error`);
      fieldRoot.classList.remove("is-invalid");
      event.target.classList.remove("is-invalid");
      event.target.removeAttribute("aria-invalid");
      if (error) {
        error.textContent = "";
        error.hidden = true;
      }
    }
  });
  form.addEventListener("change", (event) => {
    if (event.target.matches?.('[name="buyerType"]')) {
      syncManualInvoiceBuyerType(form, event.target.value);
    }
    state.manualInvoiceDraft = readManualInvoiceDraft();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitManualInvoice(orderList, groups);
  });
}

function applicationInvoiceTypeText(order, application) {
  return normalizeApplicationInvoiceType(
    application.invoiceType
      || application.invoices.find((invoice) => invoice?.[1])?.[1]
      || order.invoiceOptions,
  );
}

function renderApplicationDetailActions(application) {
  const actions = applicationActionDefinitions(application).filter(({ key }) => key !== "detail");
  if (!actions.length) return "";
  return `
    <div class="detail-top-actions application-detail-title-actions">
      ${actions.map(({ key, label }) => `
        <button class="btn secondary" type="button" data-application-action="${key}" data-application-id="${escapeAttribute(application.id)}">${label}</button>
      `).join("")}
    </div>
  `;
}

function relatedOrderReferenceId(reference) {
  if (typeof reference === "string") return reference;
  return reference?.orderSn
    || reference?.merchantOrderNo
    || reference?.merchantOrderSn
    || reference?.orderId
    || "";
}

function applicationRelatedOrders(application, currentOrder) {
  const references = application.relatedOrders?.length
    ? application.relatedOrders
    : application.relatedOrderIds?.length
      ? application.relatedOrderIds
      : [];
  if (!references.length) return [currentOrder];

  const availableOrders = currentBrandOrders();
  const seen = new Set();
  const relatedOrders = references.map((reference) => {
    const referenceId = relatedOrderReferenceId(reference);
    return availableOrders.find((order) => order.orderSn === referenceId || order.salesSn === referenceId)
      || (
        typeof reference === "object"
        && reference
        && (!reference.brandCode || reference.brandCode === currentOrder.brandCode)
          ? reference
          : null
      );
  }).filter((order) => {
    if (!order) return false;
    const orderId = relatedOrderReferenceId(order) || order.salesSn || JSON.stringify(order);
    if (seen.has(orderId)) return false;
    seen.add(orderId);
    return true;
  });
  return relatedOrders;
}

function applicationRelatedOrderRows(application, currentOrder) {
  return applicationRelatedOrders(application, currentOrder).map((order) => {
    const orderSn = order.orderSn || order.merchantOrderNo || order.merchantOrderSn || order.orderId || "";
    const salesSn = order.salesSn || order.businessOrderNo || order.businessOrderSn || "-";
    const storeName = order.storeName || order.salesStore || "-";
    const storeSn = order.storeSn || order.storeNo || "-";
    const amount = order.amount || order.orderAmount || "-";
    const returnStatus = order.returnStatus || order.afterSalesStatus || "-";
    const salesTime = order.salesTimeText || order.salesTime || "-";
    return [
      escapeHtml(orderSn || "-"),
      escapeHtml(salesSn),
      escapeHtml(storeName),
      escapeHtml(storeSn),
      escapeHtml(amount),
      returnStatus === "-" ? "-" : renderStatus(returnStatus, returnStatusTone(returnStatus)),
      escapeHtml(salesTime),
      orderSn
        ? `<button class="btn link" type="button" data-application-related-order="${escapeAttribute(orderSn)}">查看订单</button>`
        : "-",
    ];
  });
}

function applicationInvoiceRows(application, order) {
  return application.invoices.map((invoice, index) => {
    const ticket = invoiceTicketFromRow(invoice, invoiceItemSnapshot(order, application, invoice));
    const invoiceNo = ticket.invoiceNo === "-" ? "" : ticket.invoiceNo;
    const identity = invoiceIdentity(application, invoice, index);
    const action = String(ticket.status).includes("失败")
      ? `<button class="btn link" type="button" data-application-invoice-failure-index="${index}">失败原因</button>`
      : `<button class="btn link" type="button" data-application-invoice-index="${index}" data-application-invoice-identity="${escapeAttribute(identity)}" data-application-invoice-no="${escapeAttribute(invoiceNo)}">查看详情</button>`;
    return [
      escapeHtml(ticket.sellerName),
      escapeHtml(ticket.sellerTaxNo),
      escapeHtml(ticket.totalAmount),
      escapeHtml(ticket.invoiceNo),
      renderStatus(ticket.status, invoiceStatusTone(ticket.status)),
      escapeHtml(ticket.issueDate),
      action,
    ];
  });
}

function invoiceFailureReason(order, application, invoice) {
  const invoiceNo = invoice?.[9];
  const matchingEvent = [...(order.invoiceEvents || [])]
    .reverse()
    .find((event) => (
      String(event.status || "").includes("失败")
      && (!invoiceNo || invoiceNo === "-" || !event.invoiceNo || event.invoiceNo === invoiceNo)
    ));
  const description = String(application.statusDescription || "").replace(/^(?:异常原因|失败原因)：/, "");
  return matchingEvent?.reason || description || "开票处理失败，请稍后重试。";
}

function openInvoiceFailureReason(order, application, invoiceIndex) {
  const invoice = application.invoices[invoiceIndex];
  if (!invoice || !String(invoice[8] || "").includes("失败")) return;
  openOrderActionModal("invoice-failure-reason", order, application, {
    message: invoiceFailureReason(order, application, invoice),
  });
}

function openInvoiceApplicationDetail(order, applicationId, origin) {
  const authorizedOrder = currentBrandOrders().find((item) => item.orderSn === order?.orderSn);
  if (!authorizedOrder) return;
  const application = findExactOrderApplication(authorizedOrder, applicationId);
  if (!application) return;
  state.applicationDetailOrigin = origin || (state.view === "applicationList" ? "applicationList" : "orders");
  state.selectedOrder = authorizedOrder.orderSn;
  state.selectedApplicationId = application.id;
  state.selectedInvoiceIndex = 0;
  state.selectedInvoiceNo = "";
  state.selectedInvoiceIdentity = "";
  setView("applicationDetail");
}

function bindInvoiceApplicationDetailActions(order) {
  bindApplicationActions(order);
  workspace.querySelectorAll("[data-application-related-order]").forEach((button) => {
    button.addEventListener("click", () => openOrderDetail(button.dataset.applicationRelatedOrder));
  });
  workspace.querySelectorAll("[data-application-invoice-index]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedInvoiceIndex = Number(button.dataset.applicationInvoiceIndex || 0);
      state.selectedInvoiceNo = button.dataset.applicationInvoiceNo || "";
      state.selectedInvoiceIdentity = button.dataset.applicationInvoiceIdentity || "";
      setView("invoiceDetail");
    });
  });
  workspace.querySelectorAll("[data-application-invoice-failure-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const application = findExactOrderApplication(order, state.selectedApplicationId);
      if (!application) return;
      openInvoiceFailureReason(order, application, Number(button.dataset.applicationInvoiceFailureIndex || 0));
    });
  });
}

function renderInvoiceApplicationDetail() {
  const context = findCurrentBrandApplicationContext(state.selectedApplicationId, state.selectedOrder);
  if (!context) {
    const applicationListOrigin = state.applicationDetailOrigin === "applicationList";
    const permissionState = applicationListOrigin
      ? renderDetailPermissionState("开票申请详情", { rootView: "applicationList" })
      : renderDetailPermissionState("开票申请详情");
    const emptyState = applicationListOrigin
      ? renderDetailEmptyState("开票申请详情", "未找到对应的开票申请。", { rootView: "applicationList" })
      : renderDetailEmptyState("开票申请详情", "未找到对应的开票申请。");
    workspace.innerHTML = applicationExistsOutsideCurrentBrand(state.selectedApplicationId)
      ? permissionState
      : emptyState;
    bindBreadcrumbActions();
    return;
  }
  const { order, application } = context;
  state.selectedOrder = order.orderSn;
  state.selectedApplicationId = application.id;
  const statusDescription = String(application.statusDescription || "").trim();
  const buyerType = application.buyerType === "personal" ? "个人" : "企业";
  const applicationListOrigin = state.applicationDetailOrigin === "applicationList";

  workspace.innerHTML = `
    <div class="detail-page application-detail-page" aria-labelledby="applicationDetailTitle">
      <nav class="breadcrumb" aria-label="当前位置">
        <span>场景功能</span>
        <span>零售订单开票</span>
        ${applicationListOrigin ? `
          <button type="button" data-breadcrumb-view="applicationList">开票申请管理</button>
        ` : `
          <button type="button" data-breadcrumb-view="orders">零售订单管理</button>
          <button type="button" data-breadcrumb-view="orderDetail">订单详情</button>
        `}
        <strong>开票申请详情</strong>
      </nav>
      <div class="page-title-region">
        <h1 id="applicationDetailTitle">开票申请详情</h1>
        ${renderApplicationDetailActions(application)}
      </div>
      <div class="detail-main-stack">
        <section class="panel application-detail-section">
          <div class="section-head in-panel"><h2>申请基本信息</h2></div>
          <div class="description-grid order-info-grid application-detail-info-grid">
            ${kv("申请号", application.applyNo)}
            ${kv("申请来源", application.source)}
            ${kv("申请时间", application.appliedAt)}
            ${kv("发票类型", applicationInvoiceTypeText(order, application))}
            ${kv("开票金额", applicationAmountMarkup(application))}
            ${kv("申请状态", renderStatus(application.status, applicationStatusTone(application.status)))}
            ${statusDescription && statusDescription !== "-" ? kv("状态说明", statusDescription) : ""}
          </div>
        </section>

        <section class="panel application-detail-section">
          <div class="section-head in-panel"><h2>关联订单</h2></div>
          ${detailEmbeddedTable(
            [
              { label: "商家订单号" },
              { label: "业务订单号" },
              { label: "销售门店" },
              { label: "门店号" },
              { label: "订单金额", align: "right" },
              { label: "退换货状态" },
              { label: "订单销售时间" },
              { label: "操作", align: "right", fixed: "right" },
            ],
            applicationRelatedOrderRows(application, order),
            "暂无关联订单",
            "application-detail-related-orders-table"
          )}
        </section>

        <section class="panel application-detail-section">
          <div class="section-head in-panel"><h2>发票信息</h2></div>
          ${detailEmbeddedTable(
            [
              { label: "销售方名称" },
              { label: "税号" },
              { label: "价税合计", align: "right" },
              { label: "发票号码" },
              { label: "发票状态" },
              { label: "开票时间" },
              { label: "操作", align: "right", fixed: "right" },
            ],
            applicationInvoiceRows(application, order),
            "当前尚未生成发票",
            "application-detail-invoices-table"
          )}
        </section>

        <section class="panel application-detail-section application-detail-buyer-section">
          <div class="section-head in-panel"><h2>购买方信息</h2></div>
          <div class="description-grid order-info-grid application-detail-info-grid">
            ${kv("购方类型", buyerType)}
            ${kv("购方名称", application.buyerName || "-")}
            ${kv("购方税号", application.buyerTaxNo || "-")}
            ${kv("地址", application.buyerAddress || "-")}
            ${kv("电话", application.buyerPhone || "-")}
            ${kv("开户银行", application.buyerBank || "-")}
            ${kv("银行账号", application.buyerAccount || "-")}
          </div>
          <div class="application-detail-delivery-subsection">
            <div class="section-head in-panel"><h3>发票交付信息</h3></div>
            <div class="description-grid order-info-grid application-detail-delivery-grid">
              ${kv("接收邮箱", application.deliveryEmail || "-")}
            </div>
          </div>
        </section>
      </div>
    </div>
  `;

  bindBreadcrumbActions();
  bindInvoiceApplicationDetailActions(order);
}

function renderInvoiceDetail() {
  ensureSelectedOrderInCurrentBrand();
  const order = currentBrandOrders().find((item) => item.orderSn === state.selectedOrder);
  if (!order) {
    workspace.innerHTML = renderDetailPermissionState("发票详情", { rootView: state.applicationDetailOrigin === "applicationList" ? "applicationList" : "orders" });
    bindBreadcrumbActions();
    return;
  }
  const application = findExactOrderApplication(order, state.selectedApplicationId);
  if (!application) {
    workspace.innerHTML = renderDetailEmptyState("发票详情", "未找到对应的开票申请。", { rootView: state.applicationDetailOrigin === "applicationList" ? "applicationList" : "orders" });
    bindBreadcrumbActions();
    return;
  }
  const invoice = invoiceTicket(order, state.selectedInvoiceIndex);
  if (!invoice) {
    workspace.innerHTML = renderDetailEmptyState("发票详情", "当前开票申请暂无可查看发票。", { rootView: state.applicationDetailOrigin === "applicationList" ? "applicationList" : "orders" });
    bindBreadcrumbActions();
    return;
  }
  const invoiceDisplayTone = invoiceTone(invoice);
  const applicationListOrigin = state.applicationDetailOrigin === "applicationList";
  const relatedInvoice = relatedInvoiceContext(order, application, state.selectedInvoiceIndex);
  const canDownload = invoice.invoiceNo !== "-" && invoice.status.includes("成功");

  workspace.innerHTML = `
    <div class="detail-page invoice-detail-page">
      <nav class="breadcrumb" aria-label="当前位置">
        <span>场景功能</span>
        <span>零售订单开票</span>
        ${applicationListOrigin ? `
          <button type="button" data-breadcrumb-view="applicationList">开票申请管理</button>
        ` : `
          <button type="button" data-breadcrumb-view="orders">零售订单管理</button>
          <button type="button" data-breadcrumb-view="orderDetail">订单详情</button>
        `}
        <button type="button" data-breadcrumb-view="applicationDetail">开票申请详情</button>
        <strong>发票详情</strong>
      </nav>
      <section class="invoice-detail-panel">
        <div class="invoice-detail-panel-title"><h1>发票详情</h1></div>
        <div class="invoice-detail-overview">
          <div class="invoice-detail-overview-main">
            <div class="invoice-detail-number-row">
              <span class="invoice-detail-number-label">发票号码：</span>
              <strong class="invoice-detail-number">${escapeHtml(invoice.invoiceNo)}</strong>
              ${renderInvoiceDetailStatusTag(invoice.status)}
            </div>
            <div class="invoice-detail-amount-row">
              <span>价税合计：<strong>${escapeHtml(invoice.totalAmount)}</strong></span>
              <span>不含税金额：<strong>${escapeHtml(invoice.netAmount)}</strong></span>
              <span>税额：<strong>${escapeHtml(invoice.taxAmount)}</strong></span>
            </div>
            <div class="invoice-detail-time-row"><span>开票时间：</span><strong>${escapeHtml(invoice.issueDate)}</strong></div>
          </div>
          <div class="invoice-detail-actions">
            ${relatedInvoice ? `<button class="btn secondary" type="button" data-invoice-related>查看关联发票</button>` : ""}
            <button class="btn" type="button" data-invoice-download-detail ${canDownload ? "" : "disabled"}>下载</button>
          </div>
        </div>
        <section class="invoice-preview" aria-label="电子发票" data-invoice-tone="${invoiceDisplayTone}">
          <article class="invoice-sheet" data-invoice-tone="${invoiceDisplayTone}">
            ${invoiceDisplayTone === "red" ? `<div class="invoice-watermark" aria-label="红字发票">红字发票</div>` : ""}
            <header>
              <h2>电子发票（${escapeHtml(invoiceTitleType(invoice.ticketType))}）</h2>
              <div><span>发票号码：${escapeHtml(invoice.invoiceNo)}</span><span>开票日期：${escapeHtml(invoice.issueDate)}</span></div>
            </header>
            <div class="invoice-sheet-parties">
              <div>${kv("购方名称", invoice.buyerName)}${kv("购方税号", invoice.buyerTaxNo)}</div>
              <div>${kv("销方名称", invoice.sellerName)}${kv("销方税号", invoice.sellerTaxNo)}</div>
            </div>
            ${invoiceGoodsTable(invoice.items, invoice.totalAmount)}
            <div class="invoice-sheet-total">
              <span>发票类型：${escapeHtml(invoice.invoiceType)}</span>
              <strong>价税合计：${escapeHtml(invoice.totalAmount)}</strong>
            </div>
          </article>
        </section>
      </section>
    </div>
  `;

  bindBreadcrumbActions();
  workspace.querySelector("[data-invoice-related]")?.addEventListener("click", () => {
    state.selectedApplicationId = relatedInvoice.application.id;
    state.selectedInvoiceIndex = relatedInvoice.index;
    state.selectedInvoiceNo = relatedInvoice.invoice[9] || "";
    state.selectedInvoiceIdentity = invoiceIdentity(relatedInvoice.application, relatedInvoice.invoice, relatedInvoice.index);
    renderInvoiceDetail();
    resetViewScroll();
  });
  workspace.querySelector("[data-invoice-download-detail]")?.addEventListener("click", () => downloadInvoiceTicket(invoice, application));
}

function followupRows(order) {
  return order.followups.map((followup, index) => {
    const [, followupSn, businessOrderSn, store, time, , , , , syncedAt] = followup;
    const [storeName, storeSn] = splitStoreLabel(store);
    return [
      followupSn,
      businessOrderSn,
      storeName,
      storeSn,
      followupDisplayAmount(followup),
      time,
      syncedAt || time,
      `<button class="btn link" type="button" data-followup-index="${index}">查看详情</button>`,
    ];
  });
}

function bindFollowupActions(order) {
  workspace.querySelectorAll("[data-followup-index]").forEach((button) => {
    button.addEventListener("click", () => {
      openFollowupDetail(order, Number(button.dataset.followupIndex));
    });
  });
}

function openFollowupDetail(order, followupIndex) {
  const detail = buildFollowupDetail(order, followupIndex);
  if (!detail) return;

  drawerEyebrow.textContent = "后续订单";
  drawerTitle.textContent = `${detail.type}订单详情`;
  drawerBody.innerHTML = `
    <section class="drawer-section">
      <h3>订单信息</h3>
      <div class="description-grid drawer-detail-grid">
        ${kv("商家订单号", detail.followupSn)}
        ${kv("业务订单号", detail.originalOrderSn)}
        ${kv("业务标识", detail.type)}
        ${kv("业务发生时间", detail.time)}
        ${kv("订单金额", detail.amount)}
        ${kv("品牌名称 / 编号", `${order.brandName} / ${brandNumberForCode(order.brandCode)}`)}
        ${kv("门店名称 / 编号", `${detail.storeName} / ${detail.storeSn}`)}
        ${kv("关联主订单号", order.orderSn)}
      </div>
    </section>
    <section class="drawer-section">
      <h3>商品信息</h3>
      ${simpleTable(["商品编号", "商品名称", "商品大类", "规格", "单位", "数量", "单价", "原始金额", "实际金额", "赠品标识"], orderItemRows(detail.items))}
    </section>
    <section class="drawer-section">
      <h3>支付信息</h3>
      ${simpleTable(["交易时间", "交易方式名称", "交易方式编号", "交易金额", "实收金额", "实付金额", "渠道流水号", "商家流水号"], tenderRows(detail.tenders))}
    </section>
  `;
  openDrawer();
}

function buildFollowupDetail(order, followupIndex) {
  const followup = order.followups[followupIndex];
  if (!followup) return null;

  const [type, followupSn, originalOrderSn, storeLabel, time] = followup;
  const [storeName, storeSn] = splitStoreLabel(storeLabel);
  return {
    type,
    followupSn,
    originalOrderSn,
    storeName,
    storeSn,
    time,
    amount: followupDisplayAmount(followup),
    items: buildFollowupItems(order, followup),
    tenders: buildFollowupTenders(order, followup),
  };
}

function followupDisplayAmount(followup) {
  const [type, , , , , amount] = followup || [];
  return String(type || "").includes("退货")
    ? `-${formatMoney(Math.abs(parseMoney(amount)))}`
    : amount || "-";
}

function splitStoreLabel(storeLabel) {
  const [storeName, storeSn] = String(storeLabel).split(" / ");
  return [storeName || "-", storeSn || "-"];
}

function buildFollowupItems(order, followup) {
  const [type, followupSn, , , , amount] = followup;
  const targetAmount = Math.abs(parseMoney(amount));
  const matchedItem = order.items.find((item) => Math.abs(parseMoney(item[5])) === targetAmount) || order.items[0];
  const [code, desc, category, unit] = matchedItem || [`${followupSn}-ITEM`, "后续订单商品", "按原订单商品", "件"];
  const normalizedDesc = type.includes("换货新销售") ? desc.replace(/A$/, "B") : desc;
  const prefix = type.includes("退货") ? "退货商品" : type.includes("换货新销售") ? "换入商品" : "换出商品";
  return [[`${code}-${followupSn}`, `${prefix}：${normalizedDesc}`, category, unit, "1", formatMoney(targetAmount)]];
}

function buildFollowupTenders(order, followup) {
  const [, followupSn] = followup;
  const tenders = currentOrderTenders(order).filter((tender) => (
    tender.relatedOrderNo === followupSn || tenderCoversFollowup(tender, followup)
  ));
  return tenders.length ? tenders : [syntheticFollowupTender(followup)];
}

function renderLifecycleStep(event) {
  const isApplication = event.category === "开票申请";
  const tone = isApplication ? applicationStatusTone(event.application.status) : "default";
  const timeLabel = event.timeLabel || (isApplication ? "申请时间" : "同步时间");
  return `
    <li class="lifecycle-timeline-item lifecycle-timeline-item-${tone} ${isApplication ? "application-step" : "order-step"}" data-event-id="${escapeAttribute(event.id)}">
      <span class="lifecycle-timeline-tail" aria-hidden="true"></span>
      <span class="lifecycle-timeline-head" aria-hidden="true"></span>
      <div class="lifecycle-timeline-time">
        <span>${escapeHtml(timeLabel)}</span>
        <time datetime="${escapeAttribute(String(event.time || "").replace(" ", "T"))}">${escapeHtml(event.time || "-")}</time>
      </div>
      <div class="lifecycle-timeline-content">
        ${isApplication ? renderLifecycleApplicationContent(event.application) : `
          <div class="lifecycle-timeline-heading">
            <strong class="lifecycle-event-name">${escapeHtml(event.displayName || event.name)}</strong>
          </div>
          ${renderLifecycleExtra(event)}
        `}
      </div>
    </li>
  `;
}

function renderLifecycleExtra(event) {
  if (event.category !== "订单事件") return "";
  const items = [
    event.amount ? `<span>订单金额：${escapeHtml(event.amount)}</span>` : "",
    event.remark ? `<span>备注：${escapeHtml(event.remark)}</span>` : "",
    event.orderNo ? `<span>订单号：${escapeHtml(event.orderNo)}</span>` : "",
  ].filter(Boolean);
  return items.length ? `<div class="lifecycle-timeline-meta">${items.join("")}</div>` : "";
}

function renderLifecycleApplicationContent(application) {
  const tone = applicationStatusTone(application.status);
  return `
    <div class="lifecycle-application-content" data-lifecycle-application="${escapeAttribute(application.id)}">
      <div class="lifecycle-timeline-heading">
        <strong class="lifecycle-event-name">开票申请</strong>
        <span class="lifecycle-current-status ${tone}">${escapeHtml(application.status)}</span>
      </div>
      <div class="lifecycle-timeline-meta lifecycle-application-primary-meta">
        <span>申请来源：${escapeHtml(application.source)}</span>
        <span>开票金额：${applicationAmountMarkup(application)}</span>
        <span>申请号：${escapeHtml(application.applyNo)}</span>
      </div>
      <div class="lifecycle-timeline-meta lifecycle-application-buyer-meta">
        <span>购方名称：${escapeHtml(application.buyerName || "-")}</span>
        <span>购方税号：${escapeHtml(application.buyerTaxNo || "-")}</span>
      </div>
      ${shouldShowApplicationStatusDescription(application) ? `
        <div class="lifecycle-timeline-meta lifecycle-application-status-meta">
          <span class="lifecycle-status-description">状态说明：${escapeHtml(application.statusDescription)}</span>
        </div>
      ` : ""}
      ${renderTimelineAction(application)}
    </div>
  `;
}

function shouldShowApplicationStatusDescription(application) {
  return Boolean(application.statusDescription)
    && ["异常待处理", "待重试", "红冲中"].includes(application.status);
}

function renderTimelineAction(application) {
  const actions = applicationActionDefinitions(application);
  return `
    <div class="lifecycle-node-action">
      ${actions.map(({ key, label }) => `
        <button class="btn secondary lifecycle-quick-action" type="button" data-application-action="${key}" data-application-id="${escapeAttribute(application.id)}">${label}</button>
      `).join("")}
    </div>
  `;
}

function applicationHasDeliverableInvoices(application) {
  return application.invoices.some((invoice) => {
    const status = String(invoice[8] || "");
    return status.includes("开票成功")
      && !status.includes("红冲")
      && invoice[9]
      && invoice[9] !== "-";
  });
}

function applicationActionDefinitions(application) {
  const actions = [];
  if (["开票中", "红冲中"].includes(application.status)) {
    actions.push({ key: "refresh", label: "刷新" });
  } else if (["异常待处理", "待重试"].includes(application.status)) {
    actions.push({ key: "retry", label: "重试" });
  } else if (application.status === "开票成功" && applicationHasDeliverableInvoices(application)) {
    actions.push(
      { key: "red-flush", label: "红冲" },
      { key: "resend-email", label: "重发邮件" },
    );
  }
  actions.push({ key: "detail", label: "详情" });
  return actions.slice(0, 3);
}

function renderApplicationTableActions(application) {
  return `
    <div class="table-actions">
      ${applicationActionDefinitions(application).map(({ key, label }) => `
        <button class="btn link" type="button" data-application-action="${key}" data-application-id="${escapeAttribute(application.id)}">${label}</button>
      `).join("")}
    </div>
  `;
}

function retryApplicationTargetStatus(application) {
  const signals = [application.statusDescription, ...application.invoices.map((invoice) => invoice[8])].join(" ");
  return signals.includes("红冲") ? "红冲中" : "开票中";
}

function invoiceRequiresRedConfirmation(invoice) {
  return Boolean(invoice?.requiresRedConfirmation || invoice?.[15]?.requiresRedConfirmation);
}

function isRedFlushInvoice(invoice) {
  const status = String(invoice?.[8] || "");
  return invoiceRequiresRedConfirmation(invoice)
    || status === RED_CONFIRMATION_PENDING_STATUS
    || status.includes("红冲");
}

function advanceRedFlushInvoice(invoice) {
  const status = String(invoice?.[8] || "");
  if (status === RED_CONFIRMATION_PENDING_STATUS) {
    invoice[8] = "红冲成功";
    return;
  }
  if (status.includes("红冲中") || status.includes("处理中")) {
    invoice[8] = invoiceRequiresRedConfirmation(invoice)
      ? RED_CONFIRMATION_PENDING_STATUS
      : "红冲成功";
  }
}

function refreshApplicationResult(order, application) {
  const isRedFlush = application.status === "红冲中";
  if (isRedFlush) {
    const redFlushInvoices = application.invoices.filter(isRedFlushInvoice);
    redFlushInvoices.forEach(advanceRedFlushInvoice);
    const allRedFlushInvoicesSucceeded = redFlushInvoices.length > 0
      && redFlushInvoices.every((invoice) => String(invoice[8] || "") === "红冲成功");
    application.status = allRedFlushInvoicesSucceeded ? "红冲成功" : "红冲中";
    application.statusDescription = applicationStatusDescription(application.status, order, application.invoices);
    application.completedAt = allRedFlushInvoicesSucceeded ? currentDateTimeText() : "-";
    return;
  }

  application.status = "开票成功";
  application.invoices.forEach((invoice, index) => {
    const invoiceStatus = String(invoice[8] || "");
    if (!invoiceStatus.includes("红冲")) invoice[8] = "开票成功";
    if (!invoice[9] || invoice[9] === "-") invoice[9] = `DEMO${Date.now()}${index + 1}`;
  });
  application.statusDescription = applicationStatusDescription(application.status, order, application.invoices);
  application.completedAt = currentDateTimeText();
  order.invoiceStatus = "已开票";
}

function executeApplicationAction(action, order, application) {
  if (action === "detail") {
    openInvoiceApplicationDetail(order, application.id);
    return;
  }
  if (action === "red-flush") {
    openOrderActionModal("red-flush", order, application);
    return;
  }
  if (action === "resend-email") {
    openOrderActionModal("resend-email", order, application);
    return;
  }
  if (action === "retry") {
    application.status = retryApplicationTargetStatus(application);
    application.statusDescription = application.status === "红冲中"
      ? application.redFlushTrigger === "manual" ? "" : redFlushStatusDescription(order)
      : "";
    application.completedAt = "-";
    application.invoices.forEach((invoice) => {
      const invoiceStatus = String(invoice[8] || "");
      if (application.status === "红冲中" && invoiceStatus.includes("红冲失败")) {
        invoice[8] = "红冲中";
      }
      if (application.status === "开票中" && invoiceStatus.includes("开票失败")) {
        invoice[8] = "开票中";
      }
    });
    if (application.status === "开票中") order.invoiceStatus = "开票中";
    synchronizeRelatedApplicationCopies(order, application);
    render();
    return;
  }
  if (action === "refresh") {
    refreshApplicationResult(order, application);
    synchronizeRelatedApplicationCopies(order, application);
    render();
  }
}

function bindApplicationActions(order) {
  workspace.querySelectorAll("[data-application-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const application = materializeOrderApplications(order)
        .find((item) => item.id === button.dataset.applicationId);
      if (!application) return;
      executeApplicationAction(button.dataset.applicationAction, order, application);
    });
  });
}

function bindLifecycleToggle() {
  const button = workspace.querySelector("[data-lifecycle-toggle]");
  const timeline = workspace.querySelector("#orderLifecycleTimeline");
  const section = workspace.querySelector(".lifecycle-strip");
  if (!button || !timeline || !section) return;
  button.addEventListener("click", () => {
    state.lifecycleExpanded = !state.lifecycleExpanded;
    timeline.hidden = !state.lifecycleExpanded;
    section.classList.toggle("is-collapsed", !state.lifecycleExpanded);
    button.setAttribute("aria-expanded", String(state.lifecycleExpanded));
    const label = button.querySelector("[data-lifecycle-toggle-label]");
    if (label) label.textContent = state.lifecycleExpanded ? "收起" : "展开";
  });
}

function overflowTooltip() {
  let tooltip = document.querySelector("#tableOverflowTooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "tableOverflowTooltip";
    tooltip.className = "overflow-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function isOverflowTooltipCell(cell) {
  if (!cell || cell.classList.contains("table-empty") || cell.hasAttribute("colspan")) return false;
  if (cell.querySelector("button, a, input, select, textarea, [role='button']")) return false;
  const text = (cell.innerText || cell.textContent || "").trim();
  if (!text || text === "-") return false;
  return cell.scrollWidth > cell.clientWidth + 1;
}

function showOverflowTooltip(cell) {
  if (!isOverflowTooltipCell(cell)) {
    hideOverflowTooltip();
    return;
  }
  const tooltip = overflowTooltip();
  const text = (cell.innerText || cell.textContent || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  tooltip.textContent = text;
  tooltip.hidden = false;
  tooltip.classList.remove("below");
  activeOverflowTooltipCell = cell;
  cell.setAttribute("aria-describedby", tooltip.id);

  const cellRect = cell.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const gap = 8;
  const viewportPadding = 8;
  let left = cellRect.left + cellRect.width / 2 - tooltipRect.width / 2;
  left = Math.max(viewportPadding, Math.min(left, window.innerWidth - tooltipRect.width - viewportPadding));
  let top = cellRect.top - tooltipRect.height - gap;
  if (top < viewportPadding) {
    top = cellRect.bottom + gap;
    tooltip.classList.add("below");
  }
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${Math.min(top, window.innerHeight - tooltipRect.height - viewportPadding)}px`;
  const arrowLeft = Math.max(12, Math.min(cellRect.left + cellRect.width / 2 - left, tooltipRect.width - 12));
  tooltip.style.setProperty("--overflow-tooltip-arrow-left", `${arrowLeft}px`);
}

function hideOverflowTooltip() {
  const tooltip = document.querySelector("#tableOverflowTooltip");
  if (activeOverflowTooltipCell) activeOverflowTooltipCell.removeAttribute("aria-describedby");
  activeOverflowTooltipCell = null;
  if (tooltip) tooltip.hidden = true;
}

function overflowTooltipCellFromTarget(target) {
  return target instanceof Element ? target.closest(".data-table th, .data-table td") : null;
}

function bindOverflowTooltipEvents() {
  if (overflowTooltipEventsBound) return;
  document.addEventListener("mouseover", (event) => {
    const cell = overflowTooltipCellFromTarget(event.target);
    if (!cell || cell.contains(event.relatedTarget)) return;
    showOverflowTooltip(cell);
  });
  document.addEventListener("mouseout", (event) => {
    const cell = overflowTooltipCellFromTarget(event.target);
    if (!cell || cell !== activeOverflowTooltipCell || cell.contains(event.relatedTarget)) return;
    hideOverflowTooltip();
  });
  document.addEventListener("focusin", (event) => {
    const cell = overflowTooltipCellFromTarget(event.target);
    if (cell) showOverflowTooltip(cell);
  });
  document.addEventListener("focusout", (event) => {
    const cell = overflowTooltipCellFromTarget(event.target);
    if (cell === activeOverflowTooltipCell) hideOverflowTooltip();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideOverflowTooltip();
  });
  window.addEventListener("resize", hideOverflowTooltip);
  window.addEventListener("scroll", hideOverflowTooltip, true);
  overflowTooltipEventsBound = true;
}

function reasonTooltip() {
  let tooltip = document.querySelector("#reasonTooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "reasonTooltip";
    tooltip.className = "reason-tooltip";
    tooltip.hidden = true;
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function showReasonTooltip(button, reason) {
  const tooltip = reasonTooltip();
  if (!tooltip.hidden && tooltip.dataset.anchor === button.dataset.reasonToggle) {
    hideReasonTooltip();
    return;
  }

  tooltip.textContent = reason || "原因待确认";
  tooltip.dataset.anchor = button.dataset.reasonToggle || "";
  tooltip.hidden = false;
  tooltip.classList.remove("top");

  const rect = button.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const gap = 8;
  const viewportPadding = 12;
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
  left = Math.max(viewportPadding, Math.min(left, window.innerWidth - tooltipRect.width - viewportPadding));
  let top = rect.bottom + gap;

  if (top + tooltipRect.height + viewportPadding > window.innerHeight) {
    top = rect.top - tooltipRect.height - gap;
    tooltip.classList.add("top");
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${Math.max(viewportPadding, top)}px`;
  tooltip.style.setProperty("--tooltip-arrow-left", `${rect.left + rect.width / 2 - left}px`);
}

function hideReasonTooltip() {
  const tooltip = document.querySelector("#reasonTooltip");
  if (!tooltip) return;
  tooltip.hidden = true;
  tooltip.dataset.anchor = "";
}

function bindReasonTooltipClose() {
  if (document.body.dataset.reasonTooltipBound === "true") return;
  document.addEventListener("click", hideReasonTooltip);
  window.addEventListener("resize", hideReasonTooltip);
  window.addEventListener("scroll", hideReasonTooltip, true);
  document.body.dataset.reasonTooltipBound = "true";
}

function openLifecycleInvoiceDetail(event) {
  drawerEyebrow.textContent = "订单生命周期";
  drawerTitle.textContent = event.displayName || "发票详情";
  drawerBody.innerHTML = `
    <div class="drawer-form">
      ${field("事件名称", `<input value="${event.displayName || event.name}" readonly />`)}
      ${field("处理状态", `<input value="${event.status || "-"}" readonly />`)}
      ${field("开票申请时间", `<input value="${event.time}" readonly />`)}
      ${field(event.completionLabel || "完成时间", `<input value="${event.completedAt || "-"}" readonly />`)}
      ${event.applicationType ? field("申请类型", `<input value="${event.applicationType}" readonly />`) : ""}
      ${event.invoiceResult ? field("申请结果", `<input value="${event.invoiceResult}" readonly />`) : ""}
      ${event.invoiceNo ? field("发票号码", `<input value="${event.invoiceNo}" readonly />`) : ""}
      ${event.originalInvoiceNo ? field("原发票号码", `<input value="${event.originalInvoiceNo}" readonly />`) : ""}
    </div>
    <div class="empty">暂无更多发票明细</div>
  `;
  openDrawer();
}

function getOrderActions(order) {
  if (order.invoiceStatus !== "未开票" || manualInvoiceEligibility(order)) return { actions: [] };
  return {
    actions: [
      ...(canManualInvoiceOrder(order) ? [["direct-invoice", "去开票", "primary"]] : []),
      ...(canMarkInvoiced() ? [["mark-invoiced", "标记已开票", "secondary"]] : []),
    ],
  };
}

function canDirectInvoice() {
  return userContext.role.includes("财务");
}

function canManualInvoiceOrder(order) {
  return Boolean(
    order
      && canDirectInvoice()
      && order.invoiceStatus === "未开票"
      && order.returnStatus !== "已全额退货"
      && currentInvoiceableResult(order).amount > 0
  );
}

function manualInvoiceEligibility(order) {
  if (!order || order.invoiceStatus !== "未开票") return null;
  if (order.returnStatus === "已全额退货") {
    return { status: "不可开票", reason: "订单已全额退货" };
  }
  if (currentInvoiceableResult(order).amount > 0) return null;
  return {
    status: "不可开票",
    reason: "无可开票金额",
  };
}

function canMarkInvoiced() {
  return /(?:财务|客服)/.test(userContext.role);
}

function renderOrderActions(order) {
  const config = getOrderActions(order);
  if (!config.actions.length) return "";
  return `
    <div class="order-action-box">
      <div class="detail-top-actions">
        ${config.actions.map(([key, label, type]) => `<button class="btn ${type === "primary" ? "" : type}" type="button" data-order-action="${key}">${label}</button>`).join("")}
      </div>
    </div>
  `;
}

function openOrderActionModal(action, order, application = null, details = {}) {
  activeOrderActionContext = { action, order, application, details };
  orderActionReturnFocus = document.activeElement;
  orderActionModalTitle.textContent = action === "resend-email"
    ? "重发邮件"
    : action === "red-flush"
      ? "确认红冲"
      : action === "invoice-failure-reason"
        ? "失败原因"
        : "标记已开票";
  orderActionModalConfirm.textContent = action === "resend-email"
    ? "确认发送"
    : action === "red-flush"
      ? "确认红冲"
      : action === "invoice-failure-reason"
        ? "关闭"
        : "保存";
  orderActionModalConfirm.className = action === "red-flush" ? "btn danger" : "btn";
  orderActionModalCancel.hidden = action === "invoice-failure-reason";
  orderActionModalCancel.style.display = action === "invoice-failure-reason" ? "none" : "";

  if (action === "resend-email") {
    orderActionModalPanel.removeAttribute("aria-describedby");
    const originalEmail = application?.deliveryEmail || order.receiverEmail || "";
    orderActionModalBody.innerHTML = `
      <div class="action-modal-field">
        <label for="resendEmail">接收邮箱 <span aria-hidden="true">*</span></label>
        <input id="resendEmail" name="email" type="email" value="${escapeAttribute(originalEmail)}" autocomplete="email" maxlength="100" required />
      </div>
      <p class="action-modal-error" role="alert" data-order-action-error hidden></p>
    `;
  } else if (action === "red-flush") {
    orderActionModalPanel.setAttribute("aria-describedby", "orderActionModalDescription");
    orderActionModalBody.innerHTML = `
      <p class="action-modal-help" id="orderActionModalDescription">确认后，将对该申请下已开具成功的发票发起整张红冲。</p>
    `;
  } else if (action === "invoice-failure-reason") {
    orderActionModalPanel.setAttribute("aria-describedby", "orderActionModalDescription");
    orderActionModalBody.innerHTML = `
      <p class="action-modal-help" id="orderActionModalDescription">${escapeHtml(details.message || "开票处理失败，请稍后重试。")}</p>
    `;
  } else {
    orderActionModalPanel.setAttribute("aria-describedby", "orderActionModalDescription");
    orderActionModalBody.innerHTML = `
      <p class="action-modal-help" id="orderActionModalDescription">保存后订单开票状态将改为“已开票”，不会生成开票申请或发票文件。</p>
      <div class="action-modal-field">
        <label for="markInvoiceRemark">备注信息 <span aria-hidden="true">*</span></label>
        <textarea id="markInvoiceRemark" name="remark" maxlength="200" rows="4" placeholder="请输入标记原因或外部发票说明" required></textarea>
      </div>
      <p class="action-modal-error" role="alert" data-order-action-error hidden></p>
    `;
  }

  orderActionModalBody.querySelector("input, textarea")?.addEventListener("input", () => setOrderActionModalError(""));
  orderActionModal.classList.add("open");
  orderActionModal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    const firstControl = orderActionModalBody.querySelector("input, textarea");
    if (firstControl) firstControl.focus();
    else orderActionModalConfirm.focus();
  });
}

function setOrderActionModalError(message) {
  const error = orderActionModalBody.querySelector("[data-order-action-error]");
  const control = orderActionModalBody.querySelector("input, textarea");
  if (!error || !control) return;
  error.textContent = message;
  error.hidden = !message;
  control.setAttribute("aria-invalid", String(Boolean(message)));
}

function closeOrderActionModal(options = {}) {
  const shouldRestoreFocus = options?.restoreFocus !== false;
  orderActionModal.classList.remove("open");
  orderActionModal.setAttribute("aria-hidden", "true");
  activeOrderActionContext = null;
  orderActionModalBody.innerHTML = "";
  orderActionModalCancel.hidden = false;
  orderActionModalCancel.style.display = "";
  if (shouldRestoreFocus && orderActionReturnFocus?.isConnected) orderActionReturnFocus.focus();
  orderActionReturnFocus = null;
}

function submitOrderActionModal(event) {
  event.preventDefault();
  if (!activeOrderActionContext) return;
  const { action, order, application } = activeOrderActionContext;

  if (action === "invoice-failure-reason") {
    closeOrderActionModal();
    return;
  }

  if (action === "resend-email") {
    const emailInput = orderActionModalBody.querySelector("#resendEmail");
    const email = emailInput?.value.trim() || "";
    if (!email || !emailInput.checkValidity()) {
      setOrderActionModalError("请输入有效的接收邮箱");
      emailInput?.focus();
      return;
    }
    const deliveryRecord = {
      applicationId: application?.id || "",
      email,
      sentAt: currentDateTimeText(),
    };
    order.lastEmailDelivery = deliveryRecord;
    if (application) {
      application.lastEmailDelivery = deliveryRecord;
      synchronizeRelatedApplicationCopies(order, application);
    }
    closeOrderActionModal({ restoreFocus: false });
    workspace.querySelectorAll('[data-application-action="resend-email"], [data-invoice-resend]').forEach((button) => {
      if (button.dataset.applicationId && button.dataset.applicationId !== application?.id) return;
      button.textContent = "邮件已发送";
      button.disabled = true;
    });
    return;
  }

  if (action === "red-flush") {
    startApplicationRedFlush(order, application);
    closeOrderActionModal({ restoreFocus: false });
    render();
    return;
  }

  const remarkInput = orderActionModalBody.querySelector("#markInvoiceRemark");
  const remark = remarkInput?.value.trim() || "";
  if (!remark) {
    setOrderActionModalError("请填写备注信息");
    remarkInput?.focus();
    return;
  }
  order.manualInvoiceMark = {
    remark,
    markedAt: currentDateTimeText(),
    markedBy: userContext.role,
    source: "Meta 平台",
  };
  order.invoiceStatus = "已开票";
  closeOrderActionModal({ restoreFocus: false });
  renderOrderDetail();
}

function startApplicationRedFlush(order, application) {
  if (!order || !application || application.status !== "开票成功") return false;
  const successfulInvoices = application.invoices.filter((invoice) => {
    const status = String(invoice?.[8] || "");
    return status.includes("开票成功") && !status.includes("红冲");
  });
  if (!successfulInvoices.length) return false;

  successfulInvoices.forEach((invoice) => {
    invoice[8] = "红冲中";
  });
  application.status = "红冲中";
  application.statusDescription = "";
  application.redFlushTrigger = "manual";
  application.completedAt = "-";
  synchronizeRelatedApplicationCopies(order, application);
  return true;
}

function bindOrderActions(order) {
  workspace.querySelectorAll("[data-order-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.orderAction;
      if (action === "mark-invoiced") {
        openOrderActionModal(action, order);
        return;
      }
      if (action === "direct-invoice" && canDirectInvoice()) {
        openManualInvoice(order);
        return;
      }
    });
  });
}

function orderItemRows(items) {
  return items.map(([code, desc, category, unit, quantity, amount]) => {
    const qty = Number(quantity) || 1;
    const saleAmount = parseMoney(amount);
    const unitPrice = saleAmount / qty;
    return [code, desc, category, inferSpec(code, category), unit, quantity, formatMoney(unitPrice), amount, amount, saleAmount === 0 ? "是" : "否"];
  });
}

function inferSpec(code, category) {
  if (category === "服务" || code.includes("SVC")) return "标准服务";
  if (code.includes("BAG") || code.includes("SCARF")) return "均码";
  if (code.includes("SHOE")) return "标准码";
  return "标准款";
}

function originalOrderTenders(order) {
  const tenders = currentOrderTenders(order);
  const sameTimeTenders = tenders.filter((tender) => (
    tender.time === order.salesTimeText
      && tender.direction === "in"
      && (!tender.relatedOrderNo || tender.relatedOrderNo === order.orderSn)
  ));
  if (sameTimeTenders.length) return sameTimeTenders;
  return tenders.filter((tender) => (
    tender.direction === "in"
      && (!tender.relatedOrderNo || tender.relatedOrderNo === order.orderSn)
  ));
}

function tenderRows(tenders) {
  return tenders.map((tender, index) => {
    const normalized = normalizeTenderRecord(tender, index);
    return [
      normalized.time,
      normalized.name,
      normalized.code,
      signedTenderAmountText(normalized.transactionAmount, normalized.direction),
      signedTenderAmountText(normalized.receivedAmount, normalized.direction),
      signedTenderAmountText(normalized.paidAmount, normalized.direction),
      normalized.channelTrace,
      normalized.merchantTrace,
    ];
  });
}

function orderLifecycleEvents(order) {
  const events = [
    {
      category: "订单事件",
      groupLabel: "订单同步事件",
      name: "销售订单同步",
      displayName: "销售订单同步",
      time: orderSyncTimeText(order),
      timeLabel: "同步时间",
      orderNo: order.orderSn,
      amount: order.amount,
    },
  ];

  order.followups.forEach((followup) => {
    const [, followupSn, , , time, , , , , syncedAt] = followup;
    const eventName = "退换货订单同步";
    events.push({
      category: "订单事件",
      groupLabel: "订单同步事件",
      name: eventName,
      displayName: eventName,
      time: syncedAt || time,
      timeLabel: "同步时间",
      orderNo: followupSn,
      amount: followupDisplayAmount(followup),
    });
  });

  normalizeOrderApplications(order).forEach((application) => {
    events.push({
      category: "开票申请",
      groupLabel: "开票申请",
      name: "开票申请",
      displayName: "开票申请",
      time: application.appliedAt,
      timeLabel: "申请时间",
      application,
      id: application.id,
    });
  });

  if (order.manualInvoiceMark) {
    events.push({
      category: "订单事件",
      groupLabel: "人工操作事件",
      name: "标记已开票",
      displayName: "标记已开票",
      time: order.manualInvoiceMark.markedAt,
      timeLabel: "操作时间",
      orderNo: order.orderSn,
      remark: order.manualInvoiceMark.remark,
    });
  }

  return events
    .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")))
    .map((event, index) => ({
      ...event,
      id: event.id || `${order.orderSn}-order-${index}`,
    }));
}

function invoiceApplicationRows(order) {
  return normalizeOrderApplications(order).map((application) => [
    application.applyNo,
    application.source,
    application.invoiceType,
    application.appliedAt,
    application.buyerName,
    application.buyerTaxNo,
    applicationAmountMarkup(application),
    renderStatus(application.status, applicationStatusTone(application.status)),
    application.statusDescription || "-",
    renderApplicationTableActions(application),
  ]);
}

function applicationAmountMarkup(application) {
  const mergeTag = application.relatedOrderCount > 1
    ? `<span class="tag neutral application-merge-tag">合并开票</span>`
    : "";
  return `<span class="application-amount">${escapeHtml(application.amount)}</span>${mergeTag}`;
}

function hasInvoiceApplication(order) {
  const applyNo = order.applyInfo?.[0];
  return Boolean(order.applications?.length || (applyNo && applyNo !== "-") || order.invoices.length || order.invoiceEvents?.length);
}

function applicationInvoiceType(order) {
  const types = [...new Set(order.invoices.map((invoice) => invoice[1]).filter((type) => type && type !== "-"))];
  if (types.length) return types.join(" / ");
  return (order.invoiceOptions || "-").replace(/电子/g, "");
}

function applicationSource(order) {
  if (!hasInvoiceApplication(order)) return "-";
  if (order.applicationSource) return order.applicationSource;
  if ((order.invoiceRemark || "").includes("手动")) return "订单手动开票";
  if (order.invoiceUrl && order.invoiceUrl !== "-") return "顾客自助开票-微信";
  return "接口开票";
}

function applicationStatus(order) {
  const errorCode = order.applyInfo?.[3];
  if (errorCode && errorCode !== "-" && !order.invoices.length) return "开票失败";
  const latestInvoice = order.invoices.at(-1);
  if (latestInvoice?.[8]) return latestInvoice[8];
  if (order.invoiceStatus === "开票中") return "处理中";
  if (order.invoiceStatus === "已开票") return "开票成功";
  return order.invoiceStatus || "-";
}

function invoiceIdentity(application, invoice, index) {
  const stableInvoiceId = String(invoice?.invoiceId || invoice?.[14] || "").trim();
  if (stableInvoiceId) return `invoice-id:${stableInvoiceId}`;
  const invoiceNo = String(invoice?.[9] || "").trim();
  if (invoiceNo && invoiceNo !== "-") return `invoice-no:${invoiceNo}`;
  return `${application?.id || application?.applyNo || "application"}:invoice-index:${index}`;
}

function invoiceTicket(order, index) {
  const application = findExactOrderApplication(order, state.selectedApplicationId);
  const row = selectedInvoiceRow(application, index);
  return row ? invoiceTicketFromRow(row, invoiceItemSnapshot(order, application, row)) : null;
}

function selectedInvoiceRow(application, index) {
  const applicationInvoices = application?.invoices || [];
  return applicationInvoices.find((invoice, invoiceIndex) => (
    state.selectedInvoiceIdentity
      && invoiceIdentity(application, invoice, invoiceIndex) === state.selectedInvoiceIdentity
  ))
    || applicationInvoices.find((invoice) => state.selectedInvoiceNo && invoice[9] === state.selectedInvoiceNo)
    || applicationInvoices[index];
}

function relatedInvoiceContext(order, application, index) {
  const currentInvoice = selectedInvoiceRow(application, index);
  if (!currentInvoice) return null;
  const applications = materializeOrderApplications(order);
  const relatedCandidates = applications.flatMap((candidateApplication) => (
    candidateApplication.invoices.map((invoice, invoiceIndex) => ({
      application: candidateApplication,
      invoice,
      index: invoiceIndex,
    }))
  ));
  return relatedCandidates.find((candidate) => (
    candidate.application.id !== application.id
    && candidate.invoice[9]
    && candidate.invoice[9] !== "-"
  )) || null;
}

function invoiceItemSnapshot(order, application, invoice) {
  const invoiceNo = invoice?.[9];
  const explicitItems = invoice?.items || (Array.isArray(invoice?.[13]) ? invoice[13] : []);
  if (explicitItems.length) return normalizeInvoiceItems(explicitItems);
  if (invoiceItemSnapshotFixtures[invoiceNo]?.length) {
    return normalizeInvoiceItems(invoiceItemSnapshotFixtures[invoiceNo]);
  }
  const invoiceAmount = invoice?.[3] || application?.amount || currentInvoiceableAmountText(order);
  const applicationItems = normalizeInvoiceItems(application?.items || []);
  const applicationItemsTotal = applicationItems.reduce((total, item) => total + Math.abs(parseMoney(item[5])), 0);
  if (applicationItems.length && Math.abs(applicationItemsTotal - Math.abs(parseMoney(invoiceAmount))) < 0.01) {
    return applicationItems;
  }
  return inferFrozenItemsFromAmount(order.items || [], invoiceAmount);
}

function invoiceLineAmounts(items, totalAmount) {
  const normalizedItems = normalizeInvoiceItems(items);
  const sourceGrossCents = normalizedItems.reduce((total, item) => total + Math.round(Math.abs(parseMoney(item[5])) * 100), 0);
  const requestedGrossCents = Math.round(Math.abs(parseMoney(totalAmount)) * 100);
  const targetGrossCents = requestedGrossCents || sourceGrossCents;
  let allocatedGrossCents = 0;
  return normalizedItems.map((item, index) => {
    const sourceItemCents = Math.round(Math.abs(parseMoney(item[5])) * 100);
    const grossCents = index === normalizedItems.length - 1
      ? targetGrossCents - allocatedGrossCents
      : Math.round(targetGrossCents * (sourceGrossCents ? sourceItemCents / sourceGrossCents : 0));
    allocatedGrossCents += grossCents;
    const rate = Number(item[6]) || 0;
    const taxCents = rate ? Math.round(grossCents * rate / (1 + rate)) : 0;
    const netCents = grossCents - taxCents;
    return {
      item,
      grossAmount: grossCents / 100,
      netAmount: netCents / 100,
      taxAmount: taxCents / 100,
      rate,
    };
  });
}

function summarizeInvoiceAmounts(items, totalAmount) {
  const lines = invoiceLineAmounts(items, totalAmount);
  const taxAmount = lines.reduce((total, line) => total + line.taxAmount, 0);
  const netAmount = lines.reduce((total, line) => total + line.netAmount, 0);
  return { taxAmount: formatMoney(taxAmount), netAmount: formatMoney(netAmount) };
}

function invoiceGoodsTable(items = [], totalAmount = "-") {
  if (!items.length) return `<div class="empty">暂无商品行</div>`;
  const lines = invoiceLineAmounts(items, totalAmount);
  return `
    <div class="invoice-goods-table-wrap">
      <table class="invoice-goods-table">
        <thead>
          <tr><th>项目名称</th><th>规格型号</th><th>单位</th><th>数量</th><th>单价</th><th>金额</th><th>税率 / 征收率</th><th>税额</th></tr>
        </thead>
        <tbody>
          ${lines.map(({ item, netAmount, taxAmount, rate }) => {
            const [code, name, category, unit, quantity] = item;
            const count = Number(quantity) || 1;
            return `
              <tr>
                <td>${escapeHtml(name)}<small>${escapeHtml(code)}</small></td>
                <td>${escapeHtml(inferSpec(code, category))}</td>
                <td>${escapeHtml(unit)}</td>
                <td>${escapeHtml(quantity)}</td>
                <td>${escapeHtml(formatMoney(netAmount / count))}</td>
                <td>${escapeHtml(formatMoney(netAmount))}</td>
                <td>${escapeHtml(formatInvoiceTaxRate(rate))}</td>
                <td>${escapeHtml(formatMoney(taxAmount))}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function formatInvoiceTaxRate(rate) {
  return `${Number((rate * 100).toFixed(4))}%`;
}

function invoiceTitleType(ticketType) {
  return String(ticketType || "").includes("专") ? "增值税专用发票" : "增值税普通发票";
}

function invoiceTone(invoice) {
  const invoiceNature = [invoice.invoiceType, invoice.ticketType].join(" ");
  return /红字|红票/.test(invoiceNature) ? "red" : "blue";
}

function invoiceTicketFromRow(invoice, items = []) {
  const frozenItems = normalizeInvoiceItems(items);
  const computedAmounts = summarizeInvoiceAmounts(frozenItems, invoice[3]);
  const taxAmount = frozenItems.length ? computedAmounts.taxAmount : invoice[11] || "-";
  const netAmount = frozenItems.length ? computedAmounts.netAmount : invoice[12] || "-";
  return {
    issueDate: invoice[0] || "-",
    ticketType: invoice[1] || "-",
    invoiceType: invoice[2] || "-",
    totalAmount: invoice[3] || "-",
    buyerName: invoice[4] || "-",
    buyerTaxNo: invoice[5] || "-",
    sellerName: invoice[6] || "-",
    sellerTaxNo: invoice[7] || "-",
    status: invoice[8] || "-",
    invoiceNo: invoice[9] || "-",
    taxAmount,
    netAmount,
    items: frozenItems,
  };
}

function invoiceStatusTone(status) {
  const value = String(status || "");
  if (value === "未开票") return "default";
  if (value === "红字确认单待确认") return "warning";
  if (value === "开票中" || value.includes("处理中") || value.includes("红冲中")) return "processing";
  if (value === "已开票" || value.includes("成功")) return "success";
  if (value.includes("失败") || value.includes("待重试")) return "warning";
  return "default";
}

function renderInvoiceDetailStatusTag(status) {
  const value = String(status || "-");
  const tone = value.includes("待确认") || value.includes("失败")
    ? "warning"
    : value.includes("红冲") || value.includes("红字")
      ? "red"
      : value.includes("成功")
        ? "success"
        : "processing";
  return `<span class="invoice-detail-status-tag ${tone}">${escapeHtml(value)}</span>`;
}

function returnStatusTone(status) {
  return status === "无退换货" ? "default" : "warning";
}

function applicationStatusTone(status) {
  if (["开票中", "红冲中"].includes(status)) return "processing";
  if (status === "异常待处理") return "error";
  if (status === "待重试") return "warning";
  return "success";
}

function renderStatus(text, tone) {
  return `<span class="status ${tone}">${escapeHtml(text)}</span>`;
}

function isManuallyMarkedInvoiced(order) {
  return order?.invoiceStatus === "已开票" && Boolean(order?.manualInvoiceMark);
}

function renderOrderInvoiceStatusSummary(order) {
  return `
    <span class="order-invoice-status-summary">
      ${renderStatus(order.invoiceStatus, invoiceStatusTone(order.invoiceStatus))}
      ${isManuallyMarkedInvoiced(order) ? `<span class="tag regular">手动标记</span>` : ""}
    </span>
  `;
}

function renderManualInvoiceMarkFact(order) {
  if (!isManuallyMarkedInvoiced(order)) return "";
  const remark = String(order.manualInvoiceMark.remark || "-");
  return `
    <div class="fact manual-invoice-mark-fact">
      <span>手动标记说明</span>
      <strong title="${escapeAttribute(remark)}">${escapeHtml(remark)}</strong>
    </div>
  `;
}

function renderOrderInvoiceAvailabilityFact(order) {
  const eligibility = manualInvoiceEligibility(order);
  if (!eligibility) return "";
  return `
    <div class="summary-invoice-availability" role="status" aria-live="polite">
      <span class="reason">${escapeHtml(eligibility.reason)}</span>
      ${renderStatus(eligibility.status, "warning")}
    </div>
  `;
}

function renderTextOnlyStatus(text) {
  return `<strong class="status text-only ${invoiceStatusTone(text)}">${escapeHtml(text)}</strong>`;
}

function renderSettings() {
  const brand = currentBrand();
  const settings = currentSettings();
  const previewOrder = currentBrandOrders()[0] || orders[0];
  workspace.innerHTML = `
    ${renderBrandScope()}
    <div class="settings-layout">
      <div class="settings-stack">
        <section class="panel settings-card">
          <div class="setting-head">
            <div>
              <p class="eyebrow">设置 1</p>
              <h3>开票申请页样式与页面元素</h3>
            </div>
            <div class="btn-row">
              <button class="btn secondary">预览申请页</button>
              <button class="btn">保存样式</button>
            </div>
          </div>
          <div class="setting-meta">
            <span>当前品牌配置</span>
            <span>保存后仅影响当前品牌</span>
          </div>
          <div class="detail-grid">
            ${field("页面标题", `<input id="settingTitle" value="${settings.title}" />`)}
            ${field("客服电话", `<input id="settingPhone" value="${settings.phone}" />`)}
          </div>
          <div style="height:14px"></div>
          ${field("提示文案", `<textarea id="settingHint">${settings.hint}</textarea>`)}
          <div class="setting-subtitle">页面元素</div>
          <div class="element-list">
            <label><input type="checkbox" checked /> 订单金额</label>
            <label><input type="checkbox" checked /> 门店名称</label>
            <label><input type="checkbox" checked /> 可申请票种</label>
            <label><input type="checkbox" /> 商品明细</label>
            <label><input type="checkbox" /> 开票说明</label>
            <label><input type="checkbox" /> 品牌客服电话</label>
          </div>
          <div style="height:14px"></div>
          <div class="field">
            <label>品牌色</label>
            <div class="color-options">
              ${["#1f2329", "#8b1e3f", "#0f766e", "#1d4ed8"].map((color) => `<button class="swatch ${color === state.color ? "active" : ""}" style="background:${color}" data-color="${color}" title="${color}"></button>`).join("")}
            </div>
          </div>
        </section>

        <section class="panel settings-card">
          <div class="setting-head">
            <div>
              <p class="eyebrow">设置 2</p>
              <h3>开票二维码有效期</h3>
            </div>
            <div class="btn-row">
              <button class="btn">保存有效期</button>
            </div>
          </div>
          <div class="setting-meta">
            <span>当前小票二维码有效期：${settings.validity} 天</span>
            <span>保存后仅影响当前品牌</span>
          </div>
          <div class="detail-grid">
            ${field("小票二维码有效期", `<input id="settingValidity" value="${settings.validity} 天" />`)}
            ${field("专票申请二维码有效期", `<input value="7 天" />`)}
            ${field("起算时间", `<select><option>二维码生成时间</option><option>订单销售时间</option><option>待确认</option></select>`)}
            ${field("过期后处理", `<select><option>提示入口已过期</option><option>允许门店重新生成</option><option>待确认</option></select>`)}
          </div>
          <div class="placeholder-box">有效期是否区分普票入口、专票入口，以及过期后是否允许商家重新生成，具体规则待确认。</div>
        </section>

        <section class="panel settings-card">
          <div class="setting-head">
            <div>
              <p class="eyebrow">设置 3</p>
              <h3>订单中不可开票的支付方式</h3>
            </div>
            <div class="btn-row">
              <button class="btn secondary">批量导入</button>
              <button class="btn secondary">新增支付方式</button>
              <button class="btn">保存规则</button>
            </div>
          </div>
          <div class="setting-meta">
            <span>已配置 ${settings.blockedPayments.length} 个不可开票支付方式</span>
            <span>保存后仅影响当前品牌</span>
          </div>
          <div class="placeholder-box">用于计算订单可开票金额。命中这些支付方式的金额不进入开票金额；退款、折扣、组合支付等细分处理口径待确认。</div>
          ${simpleTable(["支付方式编码", "支付方式", "处理方式", "说明", "状态", "操作"], settings.blockedPayments)}
        </section>
      </div>

      <aside class="panel preview-panel">
        <div class="setting-head">
          <div>
            <p class="eyebrow">实时预览</p>
            <h3>消费者申请页</h3>
          </div>
          <span class="status green">示意</span>
        </div>
        <div class="phone-preview">
          <div class="phone-head" style="--preview-color:${state.color}">
            <div class="phone-logo">B</div>
            <div class="phone-title" id="previewTitle">${settings.title}</div>
          </div>
          <div class="phone-card">
            <div class="phone-line"><span>订单金额</span><strong>${previewOrder.amount}</strong></div>
            <div class="phone-line"><span>门店</span><strong>${previewOrder.storeName}</strong></div>
            <div class="phone-line"><span>可申请票种</span><strong>${previewOrder.invoiceOptions.replace(/电子/g, "")}</strong></div>
            <div class="phone-line"><span>入口有效期</span><strong id="previewValidity">${settings.validity} 天</strong></div>
          </div>
          <div class="phone-card">
            <p id="previewHint">${settings.hint}</p>
            <button class="btn" style="width:100%; margin-top:10px">提交开票申请</button>
          </div>
          <div class="phone-card">
            <div class="phone-line"><span>客服热线</span><strong id="previewPhone">${settings.phone}</strong></div>
          </div>
        </div>
      </aside>
    </div>
  `;

  bindBrandScope();
  workspace.querySelectorAll("[data-color]").forEach((button) => {
    button.addEventListener("click", () => {
      state.color = button.dataset.color;
      renderSettings();
    });
  });

  bindPreviewInput("settingTitle", "previewTitle");
  bindPreviewInput("settingPhone", "previewPhone");
  bindPreviewInput("settingValidity", "previewValidity");
  bindPreviewInput("settingHint", "previewHint");
}

function openBrandModal() {
  state.pendingBrandCode = state.currentBrandCode;
  renderBrandModal();
  brandModal.classList.add("open");
  brandModal.setAttribute("aria-hidden", "false");
}

function renderBrandModal() {
  brandModalBody.innerHTML = `
    <div class="brand-option-grid">
      ${accessibleBrands()
        .map(
          (brand) => `
        <button class="brand-option ${brand.code === state.pendingBrandCode ? "selected" : ""}" data-brand-option="${brand.code}">
          <span class="brand-avatar">${brand.logo}</span>
          <span>
            <strong>${brand.name}</strong>
          </span>
        </button>`
        )
        .join("")}
    </div>
  `;

  brandModalBody.querySelectorAll("[data-brand-option]").forEach((button) => {
    button.addEventListener("click", () => {
      state.pendingBrandCode = button.dataset.brandOption;
      renderBrandModal();
    });
  });
}

function confirmBrandSwitch() {
  const nextBrand = accessibleBrands().find((brand) => brand.code === state.pendingBrandCode);
  if (!nextBrand) {
    closeBrandModal();
    return;
  }
  state.currentBrandCode = nextBrand.code;
  state.color = currentSettings().color;
  state.orderQuery = defaultOrderQuery();
  state.orderPage = 1;
  state.applicationQuery = defaultApplicationQuery();
  state.applicationPage = 1;
  state.applicationListScrollTop = 0;
  state.applicationListTableScrollLeft = 0;
  ensureSelectedOrderInCurrentBrand();
  closeBrandModal();
  updatePageTitle();
  render();
}

function closeBrandModal() {
  brandModal.classList.remove("open");
  brandModal.setAttribute("aria-hidden", "true");
}

function orderRow(order) {
  const cells = {
    salesTime: `<span class="order-sales-time">${escapeHtml(order.salesTimeText)}</span>`,
    merchantOrderNo: order.orderSn,
    businessOrderNo: order.salesSn,
    amount: order.amount,
    storeName: order.storeName,
    storeNo: order.storeSn,
    returnStatus: renderStatus(order.returnStatus, returnStatusTone(order.returnStatus)),
    invoiceStatus: renderStatus(order.invoiceStatus, invoiceStatusTone(order.invoiceStatus)),
    businessTag: escapeHtml(orderBusinessIdentifier(order)),
    syncTime: `<span class="order-sync-time">${escapeHtml(order.syncedAtText || "-")}</span>`,
    actions: `<button class="btn link" type="button" data-order="${order.orderSn}">查看详情</button>`,
  };
  return `
    <tr>
      ${visibleOrderColumnDefinitions().map((column) => `<td data-order-column="${column.key}" class="${column.sticky ? "sticky-col" : ""}">${cells[column.key]}</td>`).join("")}
    </tr>
  `;
}

function openOrderDetail(orderSn) {
  const order = currentBrandOrders().find((item) => item.orderSn === orderSn);
  if (!order) {
    state.view = "orderDetail";
    workspace.innerHTML = renderDetailPermissionState("订单详情");
    bindBreadcrumbActions();
    resetViewScroll();
    return;
  }
  state.selectedOrder = orderSn;
  state.selectedApplicationId = "";
  state.selectedInvoiceIndex = 0;
  state.selectedInvoiceNo = "";
  state.selectedInvoiceIdentity = "";
  state.lifecycleExpanded = true;
  state.orderDetailTab = "basic";
  setView("orderDetail");
}

function openRule(ruleId, scope = state.view === "groupRules" ? "group" : "brand") {
  const brand = currentBrand();
  const rule = rules.find((item) => item.id === ruleId) || {
    id: "新规则",
    scope: scope === "group" ? "集团" : "品牌",
    group: "博柏利集团",
    brand: scope === "group" ? "-" : brand.name,
    brandCode: scope === "group" ? "" : brand.code,
    category: "",
    alias: "",
    taxCode: "",
    taxName: "",
    rate: "13%",
    policy: "无",
    status: "启用",
  };
  const taxShortName = taxCategoryShortNames[rule.taxCode] || rule.taxName || "";
  drawerEyebrow.textContent = scope === "group" ? "集团开票规则管理" : "品牌开票规则管理";
  drawerTitle.textContent = rule.id === "新规则" ? "新增规则" : "编辑规则";
  drawerBody.innerHTML = `
    <div class="drawer-form">
      ${field("商品大类", `<input value="${rule.category}" />`)}
      ${field("商品别名", `<input value="${rule.alias}" />`)}
      ${field("税收分类编码", `<input id="taxCodeInput" value="${rule.taxCode}" placeholder="填写后自动带出简称" />`)}
      ${field("税收分类简称", `<input id="taxShortName" value="${taxShortName}" readonly />`)}
      ${field("税率", `<select>${taxRateOptionsMarkup(rule.rate)}</select>`)}
      ${field("优惠政策", `<select>${policyOptionsMarkup(rule.policy)}</select>`)}
    </div>
    <div class="btn-row">
      <button class="btn secondary">取消</button>
      <button class="btn">保存</button>
    </div>
  `;
  const taxCodeInput = drawerBody.querySelector("#taxCodeInput");
  const taxShortNameInput = drawerBody.querySelector("#taxShortName");
  taxCodeInput.addEventListener("input", () => {
    taxShortNameInput.value = taxCategoryShortNames[taxCodeInput.value.trim()] || "待识别";
  });
  openDrawer();
}

function openItemNameSetting(scope) {
  const brand = currentBrand();
  const setting = scope === "group" ? invoiceItemNameSettings.group : invoiceItemNameSettings.brand[brand.code];
  drawerEyebrow.textContent = "商品开票规则管理";
  drawerTitle.textContent = "发票明细开票项目名称设置";
  drawerBody.innerHTML = `
    <div class="drawer-form">
      ${field(
        "发票明细开票项目名称取值",
        `<select>
          <option value="item_desc" ${setting.itemName === "item_desc" ? "selected" : ""}>取订单中的商品描述字段</option>
          <option value="商品别名" ${setting.itemName === "商品别名" ? "selected" : ""}>取命中商品开票规则的商品别名字段</option>
        </select>`
      )}
    </div>
    <div class="btn-row">
      <button class="btn secondary">取消</button>
      <button class="btn">保存</button>
    </div>
  `;
  openDrawer();
}

function bindPreviewInput(inputId, previewId) {
  const input = workspace.querySelector(`#${inputId}`);
  const preview = workspace.querySelector(`#${previewId}`);
  input.addEventListener("input", () => {
    preview.textContent = input.value;
  });
}

function field(label, control) {
  return `<div class="field"><label>${label}</label>${control}</div>`;
}

function metric(label, value, note) {
  return `<div class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></div>`;
}

function fact(label, value) {
  return `<div class="fact"><span>${label}</span><strong>${value}</strong></div>`;
}

function kv(label, value) {
  return `<div class="kv"><span>${label}</span><strong>${value}</strong></div>`;
}

function bindBreadcrumbActions() {
  workspace.querySelectorAll("[data-breadcrumb-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.breadcrumbView));
  });
}

function detailEmbeddedTable(columns, rows, emptyText, className = "") {
  const columnClassName = (column) => [
    column.align === "right" ? "align-right" : "",
    column.fixed === "right" ? "sticky-col" : "",
  ].filter(Boolean).join(" ");
  return `
    <div class="table-scroll">
      <table class="data-table detail-table ${escapeAttribute(className)}">
        <thead>
          <tr>${columns.map((column) => `<th class="${columnClassName(column)}">${escapeHtml(column.label)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.length
            ? rows.map((row) => `<tr>${row.map((cell, index) => `<td class="${columnClassName(columns[index] || {})}">${cell}</td>`).join("")}</tr>`).join("")
            : `<tr><td class="table-empty" colspan="${columns.length}">${escapeHtml(emptyText)}</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function simpleTable(headers, rows, className = "") {
  return `
    <div class="table-scroll">
      <table class="data-table detail-table ${escapeAttribute(className)}">
        <thead><tr>${headers.map((head) => `<th>${head}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderDetailPermissionState(title, options = {}) {
  const rootView = options.rootView === "applicationList" ? "applicationList" : "orders";
  const rootLabel = rootView === "applicationList" ? "开票申请管理" : "零售订单管理";
  return `
    <div class="detail-page" data-demo-state="permission">
      <nav class="breadcrumb" aria-label="当前位置">
        <span>场景功能</span><span>零售订单开票</span>
        <button type="button" data-breadcrumb-view="${rootView}">${rootLabel}</button><strong>${escapeHtml(title)}</strong>
      </nav>
      <div class="page-title-region"><h1>${escapeHtml(title)}</h1></div>
      <section class="empty permission-state">当前身份无权访问该数据，请联系管理员授权。</section>
    </div>
  `;
}

function renderDetailEmptyState(title, message, options = {}) {
  const rootView = options.rootView === "applicationList" ? "applicationList" : "orders";
  const rootLabel = rootView === "applicationList" ? "开票申请管理" : "零售订单管理";
  return `
    <div class="detail-page" data-demo-state="empty">
      <nav class="breadcrumb" aria-label="当前位置">
        <span>场景功能</span><span>零售订单开票</span>
        <button type="button" data-breadcrumb-view="${rootView}">${rootLabel}</button>
        ${rootView === "orders" ? `<button type="button" data-breadcrumb-view="orderDetail">订单详情</button>` : ""}<strong>${escapeHtml(title)}</strong>
      </nav>
      <div class="page-title-region"><h1>${escapeHtml(title)}</h1></div>
      <section class="empty">${escapeHtml(message)}</section>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadTextFile(filename, content, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadInvoiceTicket(invoice, application) {
  downloadTextFile(`${invoice.invoiceNo || "发票"}.txt`, [
    `开票申请号：${application?.applyNo || "-"}`,
    `发票号码：${invoice.invoiceNo}`,
    `开票日期：${invoice.issueDate}`,
    `购方：${invoice.buyerName} / ${invoice.buyerTaxNo}`,
    `销方：${invoice.sellerName} / ${invoice.sellerTaxNo}`,
    `价税合计：${invoice.totalAmount}`,
    `状态：${invoice.status}`,
  ].join("\n"));
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch (error) {
      // file:// 或无剪贴板权限时走下方的本地回退。
    }
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function currentDateTimeText() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function openDrawer() {
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
}

render();
