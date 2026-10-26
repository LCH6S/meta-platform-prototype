(function(){
  'use strict';
  var D=window.DemoData, P=window.DemoPreissued, db=D.db, $=function(s,root){return(root||document).querySelector(s);}, $$=function(s,root){return Array.from((root||document).querySelectorAll(s));};
  var state={billBatchModes:{},billSelections:{},sizes:{},invoiceDraft:null,year:'2026',query:{},pages:{},tabs:{},selects:{},layer:null,draft:null,dirty:false,nav:'',route:'',scrolls:{},lastFocus:null,selectOpen:null};
  var main=$('#main'),overlayRoot=$('#overlay-root');
  function e(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function money(c){return Number(c/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function count(n){return Number(n).toLocaleString('zh-CN');}
  function ym(m){return m.slice(0,4)+' 年 '+Number(m.slice(5))+' 月';}
  function nextMonth(m){var a=m.split('-').map(Number);return new Date(Date.UTC(a[0],a[1],1)).toISOString().slice(0,7);}
  function route(){var a=(location.hash.slice(1)||'/overview').split('?');return{parts:a[0].split('/').filter(Boolean),params:new URLSearchParams(a[1]||''),path:a[0]};}
  function isProjectScope(){return false;}
  function contextualPath(path){
    if(!isProjectScope()||!/^\/(settlement|application|invoice-issue|invoice|funding|order)\//.test(path)&&!/^\/project\/[^/]+\/\d{4}-\d{2}/.test(path))return path;
    var parts=path.split('?'),params=new URLSearchParams(parts[1]||'');
    if(params.has('source')&&params.get('source')!=='project')return path;
    params.set('source','project');return parts[0]+'?'+params.toString();
  }
  function link(text,path,cls){path=contextualPath(path);return'<a class="'+(cls||'link')+'" href="#'+e(path)+'" data-route="'+e(path)+'">'+e(text)+'</a>';}
  function btn(text,action,data,primary,disabled){return'<button type="button" class="btn'+(primary?' primary':'')+'" data-action="'+action+'"'+(data?' data-id="'+e(data)+'"':'')+(disabled?' disabled':'')+'>'+e(text)+'</button>';}
  function action(text,name,id){return'<button type="button" class="link" data-action="'+name+'" data-id="'+e(id||'')+'">'+e(text)+'</button>';}
  function pill(text,color){return'<span class="tag '+(color||'')+'">'+e(text)+'</span>';}
  var statusMap={issued:['已开票','success'],ready:['待开票','processing'],collecting:['累计中','processing'],processing:['开票中','processing'],failed:['开票失败','error'],attention:['有待处理','warning'],revoked:['已撤销开票','default'],reversing:['撤销中','processing'],reverse_failed:['撤销失败','error'],future:['未开始','default']};
  function status(k,text){var s=statusMap[k]||[text||k,'default'];return'<span class="status '+s[1]+'">'+e(text||s[0])+'</span>';}
  function title(t,actions,sub){return'<div class="page-title"><h1>'+e(t)+'</h1>'+(sub?'<span class="title-detail">'+e(sub)+'</span>':'')+'<div class="grow"></div>'+(actions?'<div class="actions">'+actions+'</div>':'')+'</div>';}
  function sectionTitle(t,actions){return'<div class="section-title"><h2>'+e(t)+'</h2>'+(actions?'<div class="actions">'+actions+'</div>':'')+'</div>';}
  function breadcrumb(items){
    var rows=[{name:'月度总览',path:'/overview'}].concat(items||[]);
    if(rows.length>4)rows=[rows[0],{name:'…',collapsed:true},rows[rows.length-2],rows[rows.length-1]];
    return'<nav class="breadcrumb" aria-label="面包屑"><ol><li><a href="#/overview" data-route="/overview" aria-label="首页"><img src="assets/meta/breadcrumb-home.svg" alt=""></a></li>'+rows.map(function(x,i){return'<li><span class="sep" aria-hidden="true">/</span>'+(x.collapsed?'<span class="muted" aria-label="已折叠路径">…</span>':i===rows.length-1?'<span aria-current="page" title="'+e(x.name)+'">'+e(x.name)+'</span>':'<a title="'+e(x.name)+'" href="#'+e(x.path)+'" data-route="'+e(x.path)+'">'+e(x.name)+'</a>')+'</li>';}).join('')+'</ol></nav>';
  }
  function customBreadcrumb(items){
    return'<nav class="breadcrumb" aria-label="面包屑"><ol><li><a href="#/overview" data-route="/overview" aria-label="首页"><img src="assets/meta/breadcrumb-home.svg" alt=""></a></li>'+items.map(function(x,i){return'<li><span class="sep" aria-hidden="true">/</span>'+(i===items.length-1?'<span aria-current="page">'+e(x.name)+'</span>':link(x.name,x.path))+'</li>';}).join('')+'</ol></nav>';
  }
  function billBreadcrumb(b,page){var p=D.getPartner(D.partnerId(b)),items=[{name:ym(b.month),path:'/month/'+b.month},{name:p.name,path:partnerMonthPath(p.id,b.month)}];if(page!=='结算单详情')items.push({name:'结算单详情',path:'/settlement/'+b.id});items.push({name:page});return breadcrumb(items);
  }  function kpis(items,cls){return'<div class="kpis '+(cls||'')+'">'+items.map(function(x){return'<div class="kpi"><div class="label">'+e(x[0])+(x[5]||'')+'</div><div class="value num '+(x[3]||'')+'">'+(x[4]?e(x[1]):'¥ '+money(x[1]))+'</div>'+(x[2]?'<small>'+e(x[2])+'</small>':'')+'</div>';}).join('')+'</div>';}
  function info(fields){return'<dl class="info-grid">'+fields.map(function(f){return'<div'+(f[2]?' class="'+f[2]+'"':'')+'><dt>'+e(f[0])+'</dt><dd>'+f[1]+'</dd></div>';}).join('')+'</dl>';}
  function options(values){return values.map(function(x){return typeof x==='string'?{value:x,label:x}:x;});}
  function select(id,value,opts,label,scope,small){
    opts=options(opts);state.selects[id]={id:id,value:String(value||''),options:opts,label:label,scope:scope||'form'};
    var chosen=opts.find(function(x){return String(x.value)===String(value);});
    if(scope==='query'&&!value)chosen={label:''};
    return'<div class="select-shell"><button type="button" id="'+e(id)+'" class="select-trigger" role="combobox" aria-label="'+e(label)+'" aria-haspopup="listbox" aria-expanded="false" aria-controls="'+e(id)+'-menu" data-select="'+e(id)+'"'+(small?' style="height:32px"':'')+'><span'+(!chosen?' class="muted"':'')+'>'+e(chosen?chosen.label:'请选择')+'</span><img class="chevron" src="assets/meta/pagination-chevron-right.svg" alt=""></button><input type="hidden" name="'+e(id)+'" value="'+e(value||'')+'"></div>';
  }
  function query(key,fields){
    var q=state.query[key]||{};
    return'<form class="query" data-query="'+e(key)+'">'+fields.map(function(f){
      var v=q[f.key]||'';
      return'<div class="qfield'+(v?' filled':'')+'"><label for="'+key+'-'+f.key+'">'+e(f.label)+'</label>'+(f.options?select(key+'-'+f.key,v,[{value:'',label:'全部'}].concat(options(f.options)),f.label,'query'):'<input id="'+key+'-'+f.key+'" name="'+e(f.key)+'" aria-label="'+e(f.label)+'" value="'+e(v)+'" autocomplete="off">')+'</div>';
    }).join('')+'<div class="query-actions"><button class="query-reset" type="button" data-action="reset-query" data-id="'+e(key)+'">清空条件</button><button class="btn primary" type="submit">搜索</button></div></form>';
  }
  function columnOrder(cols){
    var business=[],identifiers=[],actions=[];
    cols.forEach(function(c,i){(c.action?actions:c.systemId?identifiers:business).push(i);});
    return business.concat(identifiers,actions);
  }
  function table(cols,rows,empty,minWidth,totalRow){
    var order=columnOrder(cols);
    if(totalRow){
      totalRow=totalRow.slice();
      // Aggregate labels belong at the leading edge, not in an identifier column.
      if(cols[0].systemId){var label=totalRow[0];totalRow[0]='';totalRow[order[0]]=label;}
      totalRow=order.map(function(i){return totalRow[i];});
    }
    rows=rows.map(function(row){return order.map(function(i){return row[i];});});
    cols=order.map(function(i){return cols[i];});
    var footer=totalRow?'<tfoot><tr>'+cols.map(function(c,i){return'<td class="'+(c.numeric?'numeric ':'')+(c.action?'operation':'')+'">'+(totalRow[i]===0?'0':totalRow[i]||'')+'</td>';}).join('')+'</tr></tfoot>':'';
    return'<div class="table-wrap"><table'+(minWidth?' style="min-width:'+minWidth+'px"':'')+'><colgroup>'+cols.map(function(c){return'<col'+(c.width?' style="width:'+c.width+'px"':'')+'>';}).join('')+'</colgroup><thead><tr>'+cols.map(function(c){return'<th class="'+(c.numeric?'numeric ':'')+(c.action?'operation':'')+'" scope="col">'+(c.headerHtml||e(c.label))+'</th>';}).join('')+'</tr></thead><tbody>'+(rows.length?rows.map(function(row){return'<tr>'+cols.map(function(c,i){return'<td class="'+(c.numeric?'numeric ':'')+(c.action?'operation':'')+'"'+(row[i]&&row[i].title?' title="'+e(row[i].title)+'"':'')+'>'+(row[i]&&row[i].html!==undefined?row[i].html:row[i]===0?'0':row[i]||'-')+'</td>';}).join('')+'</tr>';}).join(''):'<tr><td colspan="'+cols.length+'" class="table-empty">'+e(empty||'暂无数据')+'</td></tr>')+'</tbody>'+footer+'</table></div>';
  }
  function textcell(v){return{html:e(v),title:v};}
  function party(v){return '<div class="party-value"><span>'+e(v.name)+'</span><small>税号：'+e(v.tax||'未设置')+'</small></div>'; }
  function signedMoney(v){return (v>0?'+':'')+money(v);}
  function canIssue(b){return D.canIssue(b);}
  function amountOf(b){return b.invoiceAmount==null?D.settlementNet(b):b.invoiceAmount;}
  function stamp(){return new Date().toLocaleString('sv-SE').slice(0,16);}
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function moneycell(v){return'<span class="'+(v<0?'negative':'')+'">'+money(v)+'</span>';}
  function pagination(key,total,size){
    if(!total)return'';
    size=size||10;var page=state.pages[key]||1,pages=Math.ceil(total/size),nums=[];
    for(var i=1;i<=pages;i++){if(pages<=7||i===1||i===pages||Math.abs(i-page)<=1)nums.push(i);else if(nums[nums.length-1]!==0)nums.push(0);}
    return'<nav class="pagination" aria-label="分页"><span class="total">共'+count(total)+'条</span><button class="page-button prev" data-page="'+key+'|'+(page-1)+'" aria-label="上一页"'+(page===1?' disabled':'')+'><img src="assets/meta/pagination-chevron-right.svg" alt=""></button>'+nums.map(function(i){return i?'<button class="page-button" data-page="'+key+'|'+i+'" aria-label="第 '+i+' 页"'+(i===page?' aria-current="page"':'')+'>'+i+'</button>':'<span class="page-button" aria-hidden="true">…</span>';}).join('')+'<button class="page-button" data-page="'+key+'|'+(page+1)+'" aria-label="下一页"'+(page>=pages?' disabled':'')+'><img src="assets/meta/pagination-chevron-right.svg" alt=""></button></nav>';
  }
  function empty(titleText,desc){return'<div class="empty-box"><img src="assets/meta/workbench/empty-todos.svg" alt=""><h3>'+e(titleText)+'</h3><p>'+e(desc||'')+'</p></div>';}
  function projectLink(p,m){return partnerMonthPath(p.partner,m);}
  function adjustmentNote(t){return t.adjustment?'调整差额 '+signedMoney(t.adjustment)+' 元':'';}
  function expectedCell(t){return'<div class="financial-cell">'+moneycell(t.expected)+(t.adjustment?'<small>'+e(adjustmentNote(t))+'</small>':'')+'</div>';}
  function progressBar(t){return'<div class="progress-row"><span>开票进度</span><div class="progress" role="progressbar" aria-label="开票进度" aria-valuemin="0" aria-valuemax="100"'+(t.progress==null?'':' aria-valuenow="'+Math.max(0,Math.min(100,t.progress))+'"')+'><span style="width:'+(t.progress==null?0:Math.max(0,Math.min(100,t.progress)))+'%"></span></div><span class="num">'+(t.progress==null?'—':t.progress+'%')+'</span></div>';}
  function summaryStatus(t,m){return m>D.TODAY?status('future'):m===D.TODAY?status('collecting'):!t.billCount?status('future','暂无数据'):t.pendingCount?status('attention','有待处理'):status('issued','已完成');}
  function monthStatus(m){return summaryStatus(D.monthTotal(m),m);}
  function metricRows(t,current,settlementView,adjustAction){
    var first=[['平台出资金额',t.positive],['平台出资退款金额',t.negative,null,t.negative<0?'negative':''],[settlementView?'结算金额':'平台出资净额',t.net]];
    var html=kpis(first,'finance-kpis');
    if(!current)html+=kpis([['应开票金额',t.expected,adjustmentNote(t),null,null,adjustAction],['已开票金额',t.issued],['待开票金额',t.unissued]],'finance-kpis invoice-metrics');
    return html;
  }
  function pendingSummary(t,path){
    var pending=path?link('待处理结算单 '+t.pendingCount+' 张',path+'?status=pending'):'待处理结算单 '+t.pendingCount+' 张';
    var failed=t.failed?(path?link('其中异常 '+t.failed+' 张',path+'?status=errors'):'其中异常 '+t.failed+' 张'):'';
    return'<div class="processing-counts"><span>'+pending+'</span>'+(failed?'<span>'+failed+'</span>':'')+'</div>';
  }
  function summaryProgress(t,withCounts){return withCounts?'<div class="summary-progress"><div class="processing-counts"><span>结算单共 '+t.billCount+' 张</span><span>已处理 '+t.done+' 张</span><span>待处理 '+t.pendingCount+' 张（其中异常 '+t.failed+' 张）</span></div></div>':'';}

  function periodHeader(label,t,m,meta,actions){return'<div class="summary-top period-header"><div><div class="period-title"><h1>'+e(label)+'</h1>'+summaryStatus(t,m)+'</div>'+(meta.length?'<div class="summary-sub">'+meta.map(function(x){return'<span>'+e(x)+'</span>';}).join('')+'</div>':'')+'</div><div class="actions">'+(actions||'')+'</div></div>';}
  function financialTable(cols,rows,emptyText,minWidth,totalRow){return table(cols,rows,emptyText,minWidth,totalRow);}
  function taxCell(config){return'<div class="table-identity"><span>'+e(D.invoiceItemLabel(config))+' · '+rateText(config.taxRate)+'</span><small>'+e(config.taxCode||'-')+'</small></div>';}

  function projectProcessing(t){return'<div class="table-identity">'+summaryStatus(t,D.PREVIOUS)+(t.failed?'<small class="error-text">异常 '+t.failed+' 张</small>':'')+'</div>';}
  function overview(){
    var recent=[D.PREVIOUS,D.TODAY].map(function(m,i){
      var t=D.monthTotal(m),current=m===D.TODAY;
      var stats=current?'<div class="recent-stats funding-stats"><div><div class="amount-label">平台出资金额</div><div class="mini-value num">'+money(t.positive)+'</div></div><div><div class="amount-label">平台出资退款金额</div><div class="mini-value num negative">'+money(t.negative)+'</div></div></div>':'<div class="recent-stats"><div><div class="amount-label">应开票金额</div><div class="mini-value num">'+money(t.expected)+'</div>'+(t.adjustment?'<small class="amount-adjustment">'+e(adjustmentNote(t))+'</small>':'')+'</div><div><div class="amount-label">已开票金额</div><div class="mini-value num">'+money(t.issued)+'</div></div><div><div class="amount-label">待开票金额</div><div class="mini-value num">'+money(t.unissued)+'</div></div></div>';
      return'<article class="recent-card" data-period="'+m+'"><div class="recent-head"><div class="month-title">'+e(ym(m))+'<span class="month-relative">'+(i?'本月':'上月')+'</span></div>'+monthStatus(m)+'</div><div><div class="amount-label">平台出资净额（元）</div><div class="primary-amount num">'+money(t.net)+'</div></div>'+stats+(current?'':progressBar(t))+'<div class="recent-footer">'+(current?'<span class="hint-count">本月结算单未生成</span>':pendingSummary(t))+link('查看月份','/month/'+m)+'</div></article>';
    }).join('');
    var months=Array.from({length:12},function(_,i){
      var m=state.year+'-'+String(i+1).padStart(2,'0'),t=D.monthTotal(m),current=m===D.TODAY,future=m>D.TODAY;
      var amounts=!current&&!future?'<div class="tile-invoice-amounts"><div><span>已开票金额</span><strong class="num">'+money(t.issued)+'</strong></div><div><span>待开票金额</span><strong class="num">'+money(t.unissued)+'</strong></div></div>':'';
      var meta=future?'<span>暂无业务数据</span>':current?'<span>结算单未生成</span>':'<span>开票进度</span><span class="num">'+(t.progress==null?'—':t.progress+'%')+'</span>';
      return'<button class="month-tile'+(current?' current':'')+(future?' future':'')+'" data-action="open-month" data-id="'+m+'" aria-label="查看 '+ym(m)+'"><div class="tile-head"><span class="tile-number">'+(i+1)+' 月</span>'+monthStatus(m)+'</div><div><div class="amount-label">平台出资净额</div><div class="tile-amount num">'+(future?'—':'¥ '+money(t.net))+'</div></div>'+amounts+'<div class="tile-meta">'+meta+'</div></button>';
    }).join('');
    return'<section class="panel">'+title('月度总览')+'<div class="recent-grid">'+recent+'</div></section><section class="panel">'+title('年度月份',select('overview-year',state.year,['2026','2025'],'年份','year',true))+'<div class="month-grid">'+months+'</div></section>';
  }
  var preProcessMap={none:['无需处理','default'],pending:['待处理','default'],processing:['处理中','processing'],failed:['处理失败','error'],done:['已完成','success']};
  var formalStateMap={ready:['待开票','default'],processing:['开票中','processing'],issued:['开票成功','success'],failed:['开票失败','error'],reversing:['撤销中','processing'],reverse_failed:['撤销失败','error'],revoked:['已撤销','default']};
  function stateBadge(meta){return '<span class="status '+meta[1]+'">'+meta[0]+'</span>';}
  function preStateCell(b){return stateBadge(preProcessMap[window.DemoSettlementWorkflow.preState(b).status]);}
  function formalStateCell(b){return stateBadge(formalStateMap[D.formalStatus(b)]);}
  function retryLabel(b){return window.DemoSettlementWorkflow.preState(b).status==='failed'?'重试预票处理':D.formalStatus(b)==='ready'?'发起开票':D.formalStatus(b)==='revoked'?'重新开票':'重试开票';}
  function filteredSettlements(pid,m){var q=state.query['bills-'+pid+'-'+m]||{};return(D.getPartner(pid)?D.partnerBills(m,pid):D.projectBills(m,pid)).filter(function(b){var seller=D.getSeller(b.seller),formal=D.formalStatus(b),pre=window.DemoSettlementWorkflow.preState(b).status;return(!q.name||seller.name.includes(q.name))&&(!q.tax||seller.tax===q.tax)&&(!q.preStatus||q.preStatus===pre)&&(!q.formalStatus||q.formalStatus===formal)&&(!q.status||q.status===formal||q.status==='pending'&&formal!=='issued'||q.status==='errors'&&(pre==='failed'||['failed','reverse_failed'].includes(formal)));});}
  function billStatusCell(b){return '<div class="settlement-state-pair"><span>预票处理：'+preStateCell(b)+'</span><span>正式开票：'+formalStateCell(b)+'</span></div>';}
  function settlementActions(b){var a=window.DemoSettlementWorkflow.latest(b),out=link('查看','/settlement/'+b.id);if(a&&a.preflight){if(a.status==='processing')out+=' '+action('刷新','refresh-process',b.id+'|'+a.id);else if(window.DemoSettlementWorkflow.canRetry(b,a))out+=' '+action(retryLabel(b),'retry-stage',b.id+'|'+a.id);}return '<div class="row-actions">'+out+'</div>';}
  function tableInsideBillGroups(bills,selectionKey){
    var cols=[{label:'结算单号',systemId:true,width:170},{label:'销方主体',width:240},{label:'购方主体',width:240},{label:'结算金额',numeric:true,width:130},{label:'应开票金额',numeric:true,width:180},{label:'已开票金额',numeric:true,width:130},{label:'待开票金额',numeric:true,width:130},{label:'预票处理状态',width:145},{label:'正式开票状态',width:145},{label:'开票内容',width:210},{label:'发票类型',width:100},{label:'操作',action:true,width:180}];
    var rows=bills.map(function(b){var t=D.totals([b]);return[e('JS'+b.id.replace(/-/g,'').toUpperCase()),party(D.getSeller(b.seller)),party(b.buyerSnapshot||D.getBuyer(D.getProject(b.project))),moneycell(t.net),expectedCell(t),moneycell(t.issued),moneycell(t.unissued),preStateCell(b),formalStateCell(b),taxCell(b),e((b.invoiceType||D.getProject(b.project).invoiceType||'').includes('专用')?'专票':'普票'),settlementActions(b)];});
    if(selectionKey){
      var selected=state.billSelections[selectionKey]||[],eligible=bills.filter(canIssue),all=eligible.length>0&&eligible.every(function(b){return selected.includes(b.id);}),mixed=selected.length>0&&!all;
      cols.unshift({label:'选择',width:46,headerHtml:'<input type="checkbox" data-bill-all="'+e(selectionKey)+'" aria-label="选择当前筛选下可开票结算单"'+(all?' checked':'')+(mixed?' data-mixed="true" aria-checked="mixed"':'')+(!eligible.length?' disabled':'')+'>'});
      rows.forEach(function(row,i){var b=bills[i],allowed=canIssue(b);row.unshift('<input type="checkbox" data-bill-select="'+e(selectionKey)+'" value="'+e(b.id)+'" aria-label="选择结算单 JS'+e(b.id.replace(/-/g,'').toUpperCase())+'"'+(selected.includes(b.id)?' checked':'')+(!allowed?' disabled title="仅待开票、开票失败、已撤销的结算单可选"':'')+'>');});
    }
    return table(cols,rows,'未找到符合条件的结算单',selectionKey?2046:2000);
  }
  function syncBillSelection(key,bills){
    var selected=state.billSelections[key]||[];state.billSelections[key]=selected.filter(function(id){return bills.some(function(b){return b.id===id&&canIssue(b);});});return state.billSelections[key];
  }
  function billBatchToolbar(pid,m,selected,amount){
    var scope=pid+'|'+m,key='bills-'+pid+'-'+m;
    if(!state.billBatchModes[key])return '<div class="toolbar actions-only">'+btn('导出结算单','export-settlements',scope)+btn('批量提交开票','batch-enter',scope,true)+'</div>';
    return '<div class="batch-selection-area" role="region" aria-label="批量开票操作"><div class="batch-selection-summary"><span>已选择 <strong>'+selected.length+'</strong> 张</span><span>应开票金额合计 <strong class="money">¥ '+money(amount)+'</strong></span><button type="button" class="link" data-action="batch-all" data-id="'+scope+'">选中全部</button><button type="button" class="link" data-action="batch-clear" data-id="'+scope+'">取消全部</button></div><div class="actions">'+btn('退出批量','batch-exit',scope)+btn('提交开票','batch-issue',scope,true,!selected.length)+'</div></div>';
  }
  function changeBillBatch(action,pid,m){
    var key='bills-'+pid+'-'+m;
    if(action==='batch-enter'){state.billBatchModes[key]=true;state.billSelections[key]=[];}
    else if(action==='batch-exit'){state.billBatchModes[key]=false;state.billSelections[key]=[];}
    else if(state.billBatchModes[key])state.billSelections[key]=action==='batch-all'?filteredSettlements(pid,m).filter(canIssue).map(function(b){return b.id;}):[];
  }
  function submitSelectedBills(pid,m){
    var key='bills-'+pid+'-'+m,ids=syncBillSelection(key,filteredSettlements(pid,m)).slice();if(!ids.length)return;
    var bills=ids.map(D.bill),amounts={};bills.forEach(function(b){amounts[b.id]=b.invoiceAmount;});
    showLayer({title:'确认开票',confirm:true,submitLabel:'确认开票',body:'<p>已选择 <strong>'+ids.length+'</strong> 张结算单，是否确认开票？</p>',submit:function(){
      var button=$('[data-action="layer-submit"]',overlayRoot);button.disabled=true;
      try{var items=window.DemoSettlementWorkflow.submit(ids,pid,m,amounts);state.billSelections[key]=[];state.billBatchModes[key]=false;closeLayer(true);render(true);toast('已提交 '+items.length+' 张结算单');items.forEach(function(item){finishIssue(item.billId,item.applicationId);});}
      catch(error){button.disabled=false;layerError(error.message);}
    }});
  }

  function historicalSettlementContext(b){
    var a=applicationRecords(b).find(function(x){return x.type==='blue';});if(!a)return null;
    // A read-only view of existing formal history, never a fabricated workflow or an execution request.
    return{process:true,historical:true,id:a.id,formalId:a.id,amount:a.amount,status:a.status,createdAt:a.createdAt,completedAt:a.completedAt,error:a.error||''};
  }
  function settlement(bid){
    var b=D.bill(bid);if(!b||b.month>=D.TODAY)return notFound();var p=D.getProject(b.project),t=D.totals([b]),buyer=b.buyerSnapshot||D.getBuyer(p),seller=D.getSeller(b.seller),editable=canIssue(b);
    var nav=billBreadcrumb(b,'结算单详情');
    var lastRequest=window.DemoSettlementWorkflow.latest(b)||historicalSettlementContext(b);var actions=window.DemoSettlementWorkflow.canRetry(b,lastRequest)||lastRequest?.historical&&D.formalStatus(b)==='failed'?'':editable?link(D.formalStatus(b)==='revoked'?'重新开票':D.formalStatus(b)==='failed'?'重试开票':'发起开票','/invoice-issue/'+bid,'btn primary'):b.status==='issued'||b.status==='reverse_failed'?'':btn(b.status==='reversing'?'撤销中':'开票中','',null,true,true);
    var data='<section class="panel">'+title('结算单详情','<div class="settlement-heading-actions">'+billStatusCell(b)+actions+'</div>')+'<div class="section" style="padding-top:0">'+info([['结算单号',e('JS'+bid.replace(/-/g,'').toUpperCase())],['合作伙伴',link(D.getPartner(D.partnerId(b)).name,partnerMonthPath(D.partnerId(b),b.month))],['结算月份',e(ym(b.month))],['生成时间',e(nextMonth(b.month)+'-01 08:00')],['出资明细数',count(t.count)+' 条']])+'</div>'+metricRows(t,false,true,editable?'<button class="link metric-adjust" type="button" data-action="adjust-amount" data-id="'+bid+'" aria-label="调整应开票金额">调整</button>':'')+'</section>';
    if(b.status==='failed')data+='<section class="panel"><div class="notice error inline-notice">'+(lastRequest&&!lastRequest.formalId?'预票红冲未完成，正式开票尚未开始。请查看失败原因后重试。':'正式开票未成功，请查看失败原因后重试。')+'</div></section>';
    if(b.status==='reverse_failed')data+='<section class="panel"><div class="notice error inline-notice">撤销未完成，原发票仍有效。请重新发起撤销。</div></section>';
    if(b.status==='processing'||b.status==='reversing')data+='<section class="panel"><div class="notice inline-notice"><span class="spinner"></span>'+(b.status==='reversing'?'正在撤销开票，完成后可重新发起开票。':'结算单正在处理：'+window.DemoSettlementWorkflow.stageLabel(lastRequest)+'。')+'</div></section>';
    if(lastRequest)data+=applicationWorkflow(b,lastRequest);
    data+='<section class="panel">'+title('开票信息')+'<div class="section" style="padding-top:0">'+info([['销售方',party(seller)],['购买方',party(buyer)],['发票种类',e(b.invoiceType||p.invoiceType)],['开票项目名称',e(b.item||'-')],['税收分类编码',e(b.taxCode||'-')],['税收分类简称',e(b.taxShortName||b.item)],['税率',rateText(b.taxRate)]])+'</div></section>';
    data+='<section class="panel">'+title('正式开票记录')+applicationRecordsTable(b)+'<div class="table-bottom-space"></div></section>';
    data+='<section class="panel">'+title('平台出资项汇总')+fundingItemsSummary([b],D.partnerId(b),b.month,b.id)+'</section>';
    if(b.adjustments.length)data+='<section class="panel">'+title('应开票金额调整记录')+table([{label:'调整时间',width:180},{label:'调整前',numeric:true,width:140},{label:'调整后',numeric:true,width:140},{label:'本次调整差额',numeric:true,width:140},{label:'调整说明'},{label:'操作人',width:110}],b.adjustments.slice().reverse().map(function(a){return[e(a.date),moneycell(a.from),moneycell(a.to),'<span class="'+(a.to<a.from?'negative':'')+'">'+signedMoney(a.to-a.from)+'</span>',textcell(a.reason||'-'),e(a.operator)];}),null,960)+'<div class="table-bottom-space"></div></section>';
    return nav+data;
  }
  var applicationStatusMap={processing:['申请中','processing'],issued:['申请成功','success'],failed:['申请失败','error'],retry_pending:['待重试','warning'],red_pending:['红字确认单待确认','warning']};
  function applicationStatus(a){var meta=applicationStatusMap[a.status]||['状态未知','default'];return'<span class="status '+meta[1]+' application-record-status">'+e(meta[0])+'</span>';}
  function applicationRecords(b){
    var records=(b.applications||[]).slice();
    // Keep legacy invoice-only records visible without fabricating an application time.
    (b.invoices||[]).forEach(function(inv){if(!records.some(function(a){return a.invoiceId===inv.id||a.id===inv.applicationId;}))records.push({id:inv.applicationId||'legacy-'+inv.id,type:inv.tone||(inv.amount<0?'red':'blue'),amount:inv.amount,status:'issued',createdAt:null,completedAt:inv.date,invoiceId:inv.id,buyer:inv.buyer,seller:inv.seller,invoiceType:inv.invoiceType,taxRate:inv.taxRate});});
    return records.map(function(a,i){return{a:a,index:i};}).sort(function(x,y){return String(y.a.createdAt||y.a.completedAt||'').localeCompare(String(x.a.createdAt||x.a.completedAt||''))||y.index-x.index;}).map(function(x){return x.a;});
  }
  function applicationRecordActions(b,a,detail){
    var id=b.id+'|'+a.id,inv=(b.invoices||[]).find(function(x){return x.id===a.invoiceId||x.applicationId===a.id;});
    if(a.status==='processing'||a.status==='red_pending'&&a.type==='red')return action('刷新','refresh-request',id);
    if(a.status==='issued'){var active=D.activeInvoice(b),canCancel=!detail&&inv&&active&&active.id===inv.id&&['issued','reverse_failed'].includes(b.status);return inv?'<div class="row-actions">'+(canCancel?action('撤销开票','cancel-invoice',b.id+'|'+inv.id)+' ':'')+action('下载发票','download-invoice',b.id+'|'+inv.id)+'</div>':'—';}
    if(a.status==='failed')return (window.DemoSettlementWorkflow&&window.DemoSettlementWorkflow.canRetry(b,a)?action('重试','retry-stage',id)+' ':'')+action('查看失败原因','request-failure',id);
    if(a.status==='retry_pending')return'<div class="row-actions">'+action('重试','retry-request',id)+action('查看失败原因','request-failure',id)+'</div>';
    return'—';
  }
  function applicationRecordsTable(b){
    var cols=[{label:'申请时间',width:175},{label:'销售方',width:235},{label:'购买方',width:235},{label:'申请类型',width:100},{label:'发票类型',width:100},{label:'价税合计',numeric:true,width:135},{label:'不含税金额',numeric:true,width:140},{label:'税额',numeric:true,width:120},{label:'申请状态',width:215},{label:'发票号码',width:235},{label:'完成时间',width:175},{label:'操作',action:true,width:195}];
    var rows=applicationRecords(b).map(function(a){
      var inv=(b.invoices||[]).find(function(x){return x.id===a.invoiceId||x.applicationId===a.id;}),totals=invoiceLineAmounts({amount:a.amount,taxRate:a.taxRate==null?inv&&inv.taxRate!=null?inv.taxRate:b.taxRate:a.taxRate});
      var seller=a.seller||inv&&inv.seller||D.getSeller(b.seller),buyer=a.buyer||inv&&inv.buyer||b.buyerSnapshot||D.getBuyer(D.getProject(b.project)),type=a.invoiceType||inv&&inv.invoiceType||b.invoiceType;
      return[e(a.createdAt||'—'),party(seller),party(buyer),a.type==='red'?pill('红票','red'):pill('蓝票','blue'),e(type?(type.includes('专用')?'专票':'普票'):'—'),moneycell(a.amount),moneycell(totals.net),moneycell(totals.tax),applicationStatus(a),inv?e(inv.id):'—',e(a.completedAt||a.status==='issued'&&inv&&inv.date||'—'),applicationRecordActions(b,a)];
    });
    return table(cols,rows,'暂无开票申请记录',2160);
  }
  function showRequestFailure(bid,aid){
    var b=D.bill(bid),a=b&&b.applications.find(function(x){return x.id===aid;});if(!a||!['failed','retry_pending'].includes(a.status))return;
    var reason=typeof a.error==='string'?a.error:a.error&&a.error.message||a.failureReason||'未记录失败原因';
    showLayer({title:'失败原因',readonly:true,size:'standard',body:'<p class="secondary">申请时间：'+e(a.createdAt||'—')+' · '+(a.type==='red'?'红票':'蓝票')+'</p><p class="request-failure-message">'+e(reason)+'</p>'});
  }
  function refreshApplication(bid,aid){try{var a=D.refreshRequest(bid,aid);if(a.preflight&&a.status==='processing'){finishIssue(bid,a.workflowId||aid);processPreissued();}render(true);toast('已刷新申请状态');}catch(err){toast(err.message);}}
  function retryApplication(bid,aid){try{var a=D.retryRequest(bid,aid);render(true);toast('已提交重试');finishIssue(bid,a.id);}catch(err){toast(err.message);}}
  function invoiceTable(b){
    var rows=b.invoices.slice().reverse().map(function(inv){return[link(inv.id,'/invoice/'+b.id+'/'+inv.id),inv.amount<0?pill('红票','red'):pill('蓝票','blue'),'<span class="'+(inv.amount<0?'negative':'')+'">'+signedMoney(inv.amount)+'</span>',status(inv.reversedBy?'revoked':'issued',inv.reversedBy?'已红冲':'已开票'),inv.originalId?link(inv.originalId,'/invoice/'+b.id+'/'+inv.originalId):inv.reversedBy?link(inv.reversedBy,'/invoice/'+b.id+'/'+inv.reversedBy):'-',e(inv.date),'<div class="row-actions">'+link('查看','/invoice/'+b.id+'/'+inv.id)+action('下载','download-invoice',b.id+'|'+inv.id)+'</div>'];});
    return table([{label:'发票号码',width:245},{label:'票据方向',width:95},{label:'开票金额',numeric:true,width:145},{label:'发票状态',width:110},{label:'关联发票',width:245},{label:'开票时间',width:175},{label:'操作',width:115,action:true}],rows,'暂无开票记录',1130);
  }
  function applicationWorkflow(b,a){
    if(!a.process)return '';
    var current=!!a.historical||window.DemoSettlementWorkflow.latest(b)?.id===a.id,pre=window.DemoSettlementWorkflow.preState(b),live=a.status==='processing',c=current?pre.summary:a.preInvoiceSummary||pre.summary;
    var preCode=current?pre.status:!c.total?'none':a.preCompletedAt?'done':a.status==='failed'&&a.failureStage!=='issuing'?'failed':'processing';
    var formalCode=current?D.formalStatus(b):a.status==='issued'?'issued':a.formalId?(a.status==='failed'?'failed':'processing'):(a.formalBefore||'ready');
    var preDone=['done','none'].includes(preCode),preFail=preCode==='failed',formalFail=formalCode==='failed',preText=preProcessMap[preCode][0],formalText=formalStateMap[formalCode][0];
    var preInfo=c.issuing?'<p>仍有 '+c.issuing+' 笔预开申请处理中，结果明确后继续。</p>':'<div class="reversal-counts"><p><span>需红冲 '+count(c.total)+' 张</span><span>已成功 '+count(c.reversed)+' 张</span></p><p><span>正在红冲 '+count(c.reversing||0)+' 张</span><span>待红冲 '+count(c.waiting==null?c.pending:c.waiting)+' 张</span><span>失败 '+count(c.failed)+' 张</span></p></div>';
    var preRetry=current&&preFail&&window.DemoSettlementWorkflow.canRetry(b,a)?action('重试预票处理','retry-stage',b.id+'|'+a.id):'';
    var formalRetry=current&&formalFail?(window.DemoSettlementWorkflow.canRetry(b,a)?action('重试开票','retry-stage',b.id+'|'+a.id):a.historical&&D.canIssue(b)?link('重试开票','/invoice-issue/'+b.id):''):'';
    var html='<section class="panel">'+title('结算单开票处理',a.status==='processing'?action('刷新','refresh-process',b.id+'|'+a.id):'')+'<div class="workflow-phases"><div class="workflow-phase"><div class="workflow-phase-heading"><h2>1. 预票处理 <span class="status '+preProcessMap[preCode][1]+'">'+preText+'</span></h2>'+'<div class="actions">'+link('查看明细',settlementPreissuedPath(b.id))+preRetry+'</div></div>'+preInfo+(c.total?'<div class="red-progress" role="progressbar" aria-label="预票红冲进度" aria-valuemin="0" aria-valuemax="'+c.total+'" aria-valuenow="'+c.reversed+'"><span style="width:'+Math.round(c.reversed/c.total*100)+'%"></span></div>':'')+(preFail?'<p class="error-text">'+e(a.error)+'</p>':'')+'</div><div class="workflow-phase"><div class="workflow-phase-heading"><h2>2. 正式开票 <span class="status '+formalStateMap[formalCode][1]+'">'+formalText+'</span></h2>'+formalRetry+'</div><p>开票金额 ¥ '+money(a.amount)+'</p>'+(!a.formalId?'<p class="secondary">红冲全部成功后发起正式开票</p>':'')+(formalFail?'<p class="error-text">'+e(a.error)+'</p>':'')+'</div></div>';
    if(a.status==='failed')html+='<div class="section secondary" style="padding-top:0">以上为本次处理结束时的结果。</div>';
    return html+'</section>';
  }
  function settlementPreissuedPath(bid,q,page){var params=new URLSearchParams();['order','status'].forEach(function(k){if(q&&q[k])params.set(k,q[k]);});if(page>1)params.set('page',page);return '/settlement-preissued/'+bid+(params.toString()?'?'+params.toString():'');}
  function settlementPreissuedPage(bid){
    var b=D.bill(bid);if(!b||b.month>=D.TODAY)return notFound();var params=route().params,key='pre-reversal-'+bid,q={order:params.get('order')||'',status:params.get('status')||''},page=Math.max(1,parseInt(params.get('page'),10)||1),summary=P.settlementReversalState(bid),data=P.list({bill:bid,order:q.order,status:q.status},page,10),last=Math.max(1,Math.ceil(data.total/10));
    if(page>last){page=last;data=P.list({bill:bid,order:q.order,status:q.status},page,10);}state.query[key]=q;state.pages[key]=page;
    var states={waiting:['待红冲','default'],queued:['待红冲','default'],reversing:['红冲中','processing'],reversed:['红冲成功','success'],failed:['红冲失败','error']},back=settlementPreissuedPath(bid,q,page),rows=data.rows.map(function(a){var st=states[a.status]||['待红冲','default'];return[e(a.order),e(a.storeName),e(a.store),e(D.fundingItem(a.source)?.name||a.source),'<span class="status '+st[1]+'">'+st[0]+'</span>'+(a.error?'<div class="error-text">'+e(a.error)+'</div>':''),moneycell(a.amount),e(a.number),e(a.completedAt||'—'),link('查看',fundingDetailPath(a.fundingId,back))];});
    return billBreadcrumb(b,'需红冲出资明细')+'<section class="panel">'+title('需红冲出资明细')+'<div class="section secondary" style="padding-top:0">结算单 JS'+e(bid.replace(/-/g,'').toUpperCase())+'</div>'+query(key,[{key:'order',label:'订单号'},{key:'status',label:'红冲状态',options:[{value:'pending',label:'待红冲'},{value:'reversing',label:'红冲中'},{value:'reversed',label:'红冲成功'},{value:'failed',label:'红冲失败'}]}])+'<div class="toolbar"><span>需红冲 '+count(summary.total)+' 张　已成功 '+count(summary.reversed)+' 张　正在红冲 '+count(summary.reversing)+' 张　待红冲 '+count(summary.waiting)+' 张　失败 '+count(summary.failed)+' 张</span></div>'+table([{label:'订单号',width:220},{label:'门店名',width:150},{label:'门店号',width:100},{label:'平台出资项',width:170},{label:'红冲状态',width:160},{label:'出资金额',numeric:true,width:110},{label:'蓝票号码',width:240},{label:'处理完成时间',width:170},{label:'操作',action:true,width:80}],rows,'暂无符合条件的需红冲出资明细',1400)+pagination(key,data.total,10)+'</section>';
  }
  function settlementProgress(bid,id){return settlement(bid);}
  function application(bid,aid){
    var b=D.bill(bid);if(!b||b.month>=D.TODAY)return notFound();var a=aid?b.applications.find(function(x){return x.id===aid;}):b.applications[b.applications.length-1];if(!a){var t=window.DemoSettlementWorkflow.find(b,aid)||window.DemoSettlementWorkflow.latest(b);return t?settlementProgress(bid,t.id):notFound();}var p=D.getProject(b.project),buyer=a.buyer||b.buyerSnapshot,seller=a.seller||D.getSeller(b.seller),result=(applicationStatusMap[a.status]||['状态未知'])[0],resultIcon=a.status==='issued'?'处理完成':['failed','retry_pending'].includes(a.status)?'处理失败':'处理中';
    var inv=b.invoices.find(function(i){return i.id===a.invoiceId;});
    return billBreadcrumb(b,'开票申请详情')+'<section class="panel">'+title('开票申请详情',(a.workflowId?link('查看结算单处理','/settlement/'+bid)+' ':'')+applicationRecordActions(b,a,true))+'<div class="task-summary">'+info([['申请任务号',e(a.id)],['申请金额',moneycell(a.amount)],['申请类型',a.type==='red'?'红票':'蓝票'],['关联结算单',link('JS'+bid.replace(/-/g,'').toUpperCase(),'/settlement/'+bid)],['申请时间',e(a.createdAt)],['发票种类',e(a.invoiceType||b.invoiceType)]])+'<div class="task-result"><img src="assets/meta/status/'+resultIcon+'.svg" alt=""><strong>'+result+'</strong></div></div></section>'+'<section class="panel">'+title('开票信息')+'<div class="section" style="padding-top:0">'+info([['销售方',party(seller)],['购买方',party(buyer)],['开票项目名称',e(a.item||b.item||'-')],['税收分类编码',e(a.taxCode||b.taxCode||'-')],['税收分类简称',e(a.taxShortName||a.item||b.item)],['税率',rateText(a.taxRate)],['接收邮箱',recipientText(a,b)],['发票备注',e(a.remark||'-')],['撤销原因',e(a.reason||'-')]])+'</div>'+title('发票结果')+invoiceTable({id:b.id,invoices:inv?[inv]:[]})+'<div style="height:20px"></div></section>';
  }
  function resetQueryFilters(key){
    if(key.startsWith('pre-reversal-')){navigate(settlementPreissuedPath(key.slice(13)));return;}if(key==='funding-details'){applyFundingQuery({},1);return;}
    state.query[key]={};state.pages[key]=1;
    var r=route();
    if(r.parts[0]==='funding'&&(r.params.has('store')||r.params.has('kind'))){
      r.params.delete('store');r.params.delete('kind');var search=r.params.toString();location.hash=contextualPath(r.path+(search?'?'+search:''));return;
    }
    render(true);
  }
  function legacyOrderAction(text){return'<span class="legacy-order-action">'+e(text)+'</span>';}
  function orderDetail(id){
    var o=window.DemoOrderData.get(id);if(!o)return notFound();var r=o.fundingRecord,source=route().params.get('source');
    var crumbs=customBreadcrumb([{name:'订单管理',path:'/orders'},{name:'订单详情'}]),op=route().params,returnTo=op.get('returnTo');
    if(op.get('from')==='funding-details'&&returnTo&&/^\/funding-details(?:\?|$)/.test(returnTo))crumbs=customBreadcrumb([{name:'平台出资明细',path:returnTo},{name:'订单详情'}]);
    else if(op.get('from')==='funding-detail'&&returnTo&&/^\/funding-detail\/[^?]+(?:\?|$)/.test(returnTo))crumbs=customBreadcrumb([{name:'出资明细详情',path:returnTo},{name:'订单详情'}]);
    else if(r&&['partner-funding','funding'].includes(op.get('from')))crumbs=customBreadcrumb([{name:'平台出资明细',path:fundingDetailsPath({month:r.month,partner:D.partnerForRecord(r),bill:op.get('bill'),item:op.get('item')})},{name:'订单详情'}]);
    var fields=[['订单号',e(o.number)],['下单渠道',e(o.channel)],['退货状态',o.returned?'已退货':'未退货'],['订餐人手机号',e(o.buyerPhone||'-')],['收餐人手机号',e(o.recipientPhone||'-')],['门店名',e(o.store)],['省份',e(o.province)],['城市',e(o.city)],['订单原价',moneycell(o.original)],['订单折扣',moneycell(o.discount)],['应收金额',moneycell(o.amount)],['订单创建时间',e(o.createdAt)],['订单完成时间',e(o.completedAt)],['业务场景',e(o.scene)]];
    if(o.demoOrder)fields.push(['消费者实付金额',moneycell(o.paid)],['平台出资金额',moneycell(o.amount-o.paid)]);
    if(r&&r.kind==='refund')fields.push(['退款发生时间',e(r.refundOccurred)],['负向出资归属月份',e(ym(r.month))]);
    function panel(name,body){return'<section class="panel order-section">'+title(name)+body+'<div class="table-bottom-space"></div></section>';}
    var html=crumbs+'<section class="panel order-section">'+title('订单信息')+'<div class="section order-info">'+info(fields)+'</div></section>';
    html+=panel('销售信息',table([{label:'商品名称'},{label:'单位',width:180},{label:'数量',width:180},{label:'总金额',numeric:true,width:220}],[['餐饮','次','1',moneycell(o.amount)]]));
    html+=panel('支付信息',table([{label:'支付通道'},{label:'编码',width:170},{label:'金额',numeric:true,width:210},{label:'可开票金额',numeric:true,width:230}],[[e(o.paymentChannel),e(o.paymentCode),moneycell(o.demoOrder&&o.paid===0?o.amount:o.paid),moneycell(o.demoOrder&&o.paid===0?o.amount:o.paid)]]));
    if(r){var parts=D.orderParts(r),rows=parts.map(function(x){
      var p=D.getProject(x.project),pol=p&&D.getPolicy(p,x.policy),item=D.fundingItem(x.source),a=P&&P.application(x.id);
      return['<div>'+e(item?item.name:x.source)+'<small class="funding-item-code">'+e(x.source)+'</small></div>',moneycell(x.amount),D.getPartner(D.partnerForRecord(x))?link(D.getPartner(D.partnerForRecord(x)).name,partnerMonthPath(D.partnerForRecord(x),x.month)):'未配置',link('查看',fundingDetailPath(x.id,location.hash.slice(1)))];
    });html+=panel('平台出资明细',table([{label:'平台出资项',width:185},{label:'出资金额',numeric:true,width:115},{label:'合作伙伴',width:200},{label:'操作',action:true,width:100}],rows,'暂无平台出资明细',800));}
    var applications=o.applications.map(function(a){return[e(a.id),moneycell(a.amount),e(a.phone||'-'),e(a.status),e(a.origin),e(a.invoiceType),e(a.appliedAt),'<div class="reference-order-actions">'+(a.reissueOf?action('查看','order-reissue-view',id+'|'+a.id):legacyOrderAction('查看'))+(window.DemoOrderData.canReissue(o,a)?action('换开','order-reissue',id+'|'+a.id):'')+legacyOrderAction('撤销申请')+legacyOrderAction('重新发送电子发票')+'</div>'];});
    html+=panel('申请记录',table([{label:'申请任务号',systemId:true,width:210},{label:'开票金额',numeric:true,width:130},{label:'开票人手机号',width:150},{label:'开票申请状态',width:130},{label:'开票发起方式',width:180},{label:'发票种类',width:210},{label:'申请开票时间',width:180},{label:'操作',action:true,width:230}],applications,'暂无申请记录',1330));
    return html;
  }
  var orderReissueTimer=null;
  function processOrderReissues(){
    var O=window.DemoOrderData;if(orderReissueTimer||!O.hasPendingReissues())return;
    orderReissueTimer=setTimeout(function(){orderReissueTimer=null;var changed=O.completeReissues();if(changed&&['order','orders'].includes(route().parts[0])){if(!state.layer&&!state.dirty)render(true);else state.orderReissueNeedsRender=true;}processOrderReissues();},600);
  }
  function orderReissue(id,aid){
    var O=window.DemoOrderData,o=O.get(id),a=o&&o.applications.find(function(x){return x.id===aid;});if(!O.canReissue(o,a))return toast('该申请当前不可换开');
    var buyer=a.buyer||{};
    showLayer({title:'换开',size:'standard',values:{buyerType:buyer.type||'company',name:buyer.name||'',tax:buyer.tax||'',address:buyer.address||'',phone:buyer.phone||'',bank:buyer.bank||'',bankAccount:buyer.bankAccount||'',email:a.email||''},submitLabel:'提交换开',body:function(v){
      var type='<div class="radio-group" role="radiogroup" aria-label="抬头类型">'+[['company','企业'],['personal','个人']].map(function(x){return'<label class="radio-row"><input type="radio" name="buyerType" value="'+x[0]+'"'+(v.buyerType===x[0]?' checked':'')+'><span>'+x[1]+'</span></label>';}).join('')+'</div>';
      return'<form id="order-reissue-form" novalidate>'+field('抬头类型',type,true)+field('购买方名称',customerInput('name',v.name,'购买方名称',true),true)+(v.buyerType==='company'?field('购买方税号',customerInput('tax',v.tax,'购买方税号',true),true)+field('地址',customerInput('address',v.address,'地址'))+field('电话',customerInput('phone',v.phone,'电话'))+field('开户银行',customerInput('bank',v.bank,'开户银行'))+field('银行账号',customerInput('bankAccount',v.bankAccount,'银行账号')):'')+field('接收邮箱',customerInput('email',v.email,'接收邮箱',true),true)+'</form>';
    },submit:function(v){
      if(state.layer.busy)return;
      try{O.startReissue(id,aid,v);closeLayer(true);render(true);processOrderReissues();toast('换开申请已提交');}catch(err){layerError(err.message,err.field||'name');}
    }});
  }
  function viewOrderReissue(id,aid){var o=window.DemoOrderData.get(id),a=o&&o.applications.find(function(x){return x.id===aid;});if(!a||!a.reissueOf)return;showLayer({title:'换开申请详情',size:'standard',readonly:true,body:info([['申请任务号',e(a.id)],['开票申请状态',e(a.status)],['开票发起方式',e(a.origin)],['开票金额',moneycell(a.amount)],['购买方名称',e(a.buyer.name)],['购买方税号',e(a.buyer.tax||'—')]].concat(a.buyer.type==='company'?[['地址',e(a.buyer.address||'—')],['电话',e(a.buyer.phone||'—')],['开户银行',e(a.buyer.bank||'—')],['银行账号',e(a.buyer.bankAccount||'—')]]:[]).concat([['接收邮箱',e(a.email)],['原申请任务号',e(a.reissueOf)]]))});}
  function ordersQuery(q,key,fields){
    key=key||'orders';fields=fields||[{key:'order',label:'订单号'},{key:'channel',label:'订单渠道',options:window.DemoOrderData.channels},{key:'store',label:'门店名或门店号'},{key:'invoice',label:'开票状态',options:[{value:'unissued',label:'未开票'},{value:'issued',label:'已开票'},{value:'partial',label:'部分开票'},{value:'processing',label:'开票中'},{value:'failed',label:'开票失败'}]},{key:'returned',label:'退货状态',options:[{value:'not-returned',label:'未退货'},{value:'returned',label:'已退货'}]},{key:'created',label:'订单创建时间',range:true},{key:'phone',label:'用户手机号'}];
    return'<form class="query orders-query" id="orders-query" data-query="'+key+'">'+fields.map(function(f){
      if(f.range)return'<div class="qfield order-date-field'+(q.createdFrom||q.createdTo?' filled':'')+'"><label for="orders-date">'+e(f.label)+'</label><button type="button" class="order-date-trigger" id="orders-date" data-action="orders-date" aria-label="'+e(f.label)+'" aria-haspopup="dialog" aria-expanded="false"><span class="orders-date-start">'+e(q.createdFrom||'开始日期')+'</span><span class="orders-date-end">'+e(q.createdTo||'结束日期')+'</span><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="1"/><path d="M5 1v4m6-4v4M2 7h12"/></svg></button><input type="hidden" name="createdFrom" value="'+e(q.createdFrom||'')+'"><input type="hidden" name="createdTo" value="'+e(q.createdTo||'')+'"></div>';
      var v=q[f.key]||'';return'<div class="qfield'+(v?' filled':'')+'"><label for="'+key+'-'+f.key+'">'+f.label+'</label>'+(f.options?select(key+'-'+f.key,v,[{value:'',label:'全部'}].concat(options(f.options)),f.label,'query'):'<input id="'+key+'-'+f.key+'" name="'+f.key+'" aria-label="'+f.label+'" value="'+e(v)+'" autocomplete="off">')+'</div>';
    }).join('')+'<div class="query-actions"><button class="query-reset" type="button" data-action="reset-query" data-id="'+key+'">清空条件</button><button class="btn primary" type="submit">搜索</button></div></form>';
  }
  function orders(){
    var O=window.DemoOrderData,key='orders';if(!state.query[key])state.query[key]={createdFrom:O.defaultDate,createdTo:O.defaultDate};
    var q=state.query[key],invalid=q.createdFrom&&q.createdTo&&q.createdFrom>q.createdTo,items=invalid?[]:O.filter(q),size=state.sizes[key]||10,page=Math.min(state.pages[key]||1,Math.max(1,Math.ceil(items.length/size)));state.pages[key]=page;
    var rows=items.slice((page-1)*size,page*size).map(function(o){return[textcell(o.number),e(o.province),e(o.city),'<div class="order-store">'+e(o.store)+'</div>',moneycell(o.amount),e(o.buyerPhone||'-'),e(o.recipientPhone||'-'),e(o.channel),o.returned?'已退货':'未退货',e(({issued:'已开票',unissued:'未开票',partial:'部分开票',processing:'开票中',failed:'开票失败'})[O.invoiceState(o)]),e(o.createdAt),'<div class="row-actions">'+link('查看','/order/'+o.id+'?source=orders')+(!o.returned?legacyOrderAction('标记退货'):'')+(!o.invoiced&&!o.returned?legacyOrderAction('开票'):'')+'</div>'];});
    return'<section class="panel order-list">'+title('订单管理',action('查看优惠演示门店','show-demo-store'))+ordersQuery(q)+(invalid?'<div class="notice error">开始日期不能晚于结束日期</div>':'')+'<div class="toolbar actions-only">'+legacyOrderAction('合并开票')+'</div>'+table([{label:'订单号',width:230},{label:'省份',width:125},{label:'城市',width:125},{label:'门店名',width:220},{label:'订单金额',numeric:true,width:140},{label:'订餐人手机号',width:160},{label:'收餐人手机号',width:160},{label:'订单渠道',width:140},{label:'退货状态',width:115},{label:'开票状态',width:115},{label:'订单创建时间',width:190},{label:'操作',action:true,width:205}],rows,invalid?'请调整订单创建时间':'未找到符合条件的订单',1925)+customerPager(key,items.length)+'</section>';
  }
  function monthProcessingCell(x){
    var t=x.totals;
    return'<div class="table-identity">'+summaryStatus(t,x.month)+(t.pendingCount?'<small>待处理 '+t.pendingCount+' 张'+(t.failed?' · 异常 '+t.failed+' 张':'')+'</small>':'')+'</div>';
  }
  function customerPager(key,total){
    var size=state.sizes[key]||10,html=pagination(key,total,size);if(!html)return '';
    return html.replace('</nav>',select('size-'+key,String(size),[10,20,50].map(function(n){return{value:String(n),label:n+' 条/页'};}),'每页条数','page-size',true)+'</nav>');
  }
  function customerFields(){return[{key:'name',label:'客户名称'},{key:'code',label:'客户编号'},{key:'alias',label:'客户别称'}];}
  function filteredCustomers(key,category){var q=state.query[key]||{};return db.partners.filter(function(p){return(!category||p.category===category)&&(!q.name||p.name.includes(q.name))&&(!q.code||p.code.includes(q.code))&&(!q.alias||(p.alias||'').includes(q.alias))&&(!q.category||p.category===q.category);});}
  function customerTable(ps,key,withCategory){
    var size=state.sizes[key]||10,start=((state.pages[key]||1)-1)*size;
    var cols=[{label:'创建时间',width:174},{label:'客户ID',systemId:true,width:145},{label:'客户编号',width:112},{label:'客户名称',width:180},{label:'客户别称',width:150}];
    if(withCategory)cols.push({label:'客户分类',width:112});cols.push({label:'备注1',width:135},{label:'备注2',width:135},{label:'操作',width:80,action:true});
    var rows=ps.slice(start,start+size).map(function(p){var r=[e(p.createdAt),e(p.customerId),textcell(p.code),textcell(p.name),textcell(p.alias||'-')];if(withCategory)r.push(pill(p.category,'blue'));return r.concat([textcell(p.remark1||'-'),textcell(p.remark2||'-'),link('查看','/partner/'+p.id)]);});
    return table(cols,rows,'未找到符合条件的客户',withCategory?1210:1110)+customerPager(key,ps.length);
  }
  function partnerList(){
    var tab=state.tabs.partners||'list',key=tab==='categories'?'categories':'partners',q=state.query[key]||{};
    var tabs='<div class="tabs" role="tablist" aria-label="客户管理"><button role="tab" aria-selected="'+(tab==='list')+'" data-tab="partners|list">客户管理</button><button role="tab" aria-selected="'+(tab==='categories')+'" data-tab="partners|categories">客户分类管理</button></div>';
    if(tab==='categories'){
      var cs=db.customerCategories.filter(function(c){return(!q.code||c.code.includes(q.code))&&(!q.name||c.name.includes(q.name));}),size=state.sizes[key]||10,page=state.pages[key]||1;
      return'<section class="panel customer-surface">'+tabs+query(key,[{key:'code',label:'客户分类编号'},{key:'name',label:'客户分类名称'}])+'<div class="toolbar customer-toolbar">'+btn('新增客户分类','category-new','',true)+'</div>'+table([{label:'创建时间',width:260},{label:'客户分类编号',width:190},{label:'客户分类名称',width:200},{label:'备注'},{label:'操作',width:90,action:true}],cs.slice((page-1)*size,page*size).map(function(c){return[e(c.createdAt),e(c.code),e(c.name),textcell(c.remark||'-'),link('查看','/customer-category/'+c.id)];}),'未找到符合条件的分类',1000)+customerPager(key,cs.length)+'</section>';
    }
    return'<section class="panel customer-surface">'+tabs+query(key,customerFields().concat([{key:'category',label:'客户分类',options:db.categories}]))+'<div class="toolbar customer-toolbar">'+btn('新增客户','partner-new','',true)+'</div>'+customerTable(filteredCustomers(key),key,true)+'</section>';
  }
  function categoryDetail(id){
    var c=db.customerCategories.find(function(x){return x.id===id;});if(!c)return notFound();var key='category-customers-'+id;
    return customBreadcrumb([{name:'客户管理',path:'/partners?tab=categories'},{name:'客户分类详情'}])+'<section class="panel customer-surface">'+title('客户分类信息',btn('编辑','category-edit',id,true))+'<div class="section customer-info">'+info([['创建时间',e(c.createdAt)],['客户分类编号',e(c.code)],['客户分类名称',e(c.name)],['备注',e(c.remark||'-')]])+'</div></section><section class="panel customer-surface">'+title('客户信息')+query(key,customerFields())+'<div class="customer-table-gap"></div>'+customerTable(filteredCustomers(key,c.name),key,false)+'</section>';
  }
  function partnerDetail(id){
    var p=D.getPartner(id);if(!p)return notFound();var b=p.buyers[0];
    var tabs='<div class="tabs" role="tablist" aria-label="客户详情"><button role="tab" aria-selected="true">基础资料</button></div>';
    var content='';
    {
      content=title('客户详情',btn('编辑','partner-edit',id,true))+'<div class="section customer-info">'+info([['创建时间',e(p.createdAt)],['客户ID',e(p.customerId)],['客户编号',e(p.code)],['客户名称',e(p.name)],['客户分类',e(p.category)],['客户别称',e(p.alias||'-')],['备注1',e(p.remark1||'-')],['备注2',e(p.remark2||'-')]])+'</div>'+title('发票信息',btn(b?'编辑':'添加',b?'buyer-edit':'buyer-new',b?id+'|'+b.id:id,true));
      if(!b)content+='<div class="section customer-empty-invoice"><span class="info-circle">i</span>暂未设置发票信息</div>';
      else content+='<div class="section customer-invoice-detail"><h2>发票抬头</h2>'+info([['发票抬头名称',e(b.name)],['税号',e(b.tax)],['开户银行',e(b.bank||'-')],['银行账号',e(b.bankAccount||'-')],['电话',e(b.phone||'-')],['地址',e(b.address||'-')]])+'<div class="invoice-detail-options"><div><h2>发票类型</h2>'+info([['默认发票类型',b.defaultType==='增值税专用发票'?'专票':'普票']])+'</div><div><h2>发票备注</h2>'+info([['发票备注',e((b.remarkOptions||[]).map(function(k){return invoiceRemarkOptions.find(function(x){return x.value===k;})?.label||k;}).join('；')||'-')]])+'</div></div><h2>发票接收方式</h2>'+info([['接收邮箱',(b.emails||[]).map(e).join('<br>')||'-']])+'</div>';
    }
    return customBreadcrumb([{name:'客户管理',path:'/partners'},{name:'客户详情'}])+'<section class="panel customer-surface">'+tabs+content+'</section>';
  }
  var preissuedStatusMap={processing:['处理中','processing'],completed:['已完成','success'],revoking:['撤销中','processing'],reverse_failed:['撤销失败','error'],revoked:['已撤销','default'],failed:['申请失败','error']};
  var preissuedTimer=null;
  function preissuedStatus(a){var v=preissuedStatusMap[a.applicationStatus];return'<span class="status '+v[1]+'">'+v[0]+'</span>';}
  function preissuedBillLink(text,bid,invoiceId){var path=invoiceId?'/invoice/'+bid+'/'+invoiceId:'/settlement/'+bid;return link(text,path+'?source=project').replace(' data-route=',' data-refresh-bill="'+e(bid)+'" data-route=');}
  function preissuedActions(a,detail){
    var html=detail?'':link('查看',preinvoicePath(a.id));
    if(['failed','reverse_failed'].includes(a.applicationStatus))html+=action('失败原因','pre-failure',a.id)+action('重试','pre-retry',a.id);
    else if(['processing','revoking'].includes(a.applicationStatus))html+=action('刷新','pre-refresh',a.id);
    return'<div class="row-actions">'+html+'</div>';
  }
  function preissuedScopedQuery(){var q=Object.assign({},state.query.preissued||{}),r=route();if(r.parts[0]==='preissued'&&r.params.get('bill')){q.bill=r.params.get('bill');q.failureStage='reversal';q.status='reverse_failed';}return q;}
  function preinvoicePath(id){var r=route(),bid=r.params.get('bill')||r.params.get('settlement');return '/preinvoice/'+id+(bid?'?settlement='+encodeURIComponent(bid)+'&failureStage=reversal':'');}
  function preissuedOverview(){
    if(!P)return notFound();P.refresh();processPreissued();var key='preissued';if(!state.query[key])state.query[key]=route().params.get('bill')?{}:{createdFrom:D.TODAY+'-01',createdTo:D.TODAY+'-30'};
    var q=preissuedScopedQuery(),size=10,page=state.pages[key]||1,invalid=q.createdFrom&&q.createdTo&&q.createdFrom>q.createdTo,result=invalid?{rows:[],total:0}:P.applications(q,page,size),maxPage=Math.max(1,Math.ceil(result.total/size));
    if(page>maxPage){page=maxPage;state.pages[key]=page;result=P.applications(q,page,size);}
    var fields=[{key:'request',label:'申请任务号'},{key:'order',label:'订单号'},{key:'status',label:'开票申请状态',options:Object.keys(preissuedStatusMap).map(function(k){return{value:k,label:preissuedStatusMap[k][0]};})},{key:'store',label:'门店名或门店号'},{key:'seller',label:'销方纳税人名称/税号'},{key:'created',label:'申请开票时间',range:true}];
    var rows=result.rows.map(function(a){var o=window.DemoOrderData.get(a.fundingId);return[link(o?o.number:a.order,'/order/'+a.fundingId+'?source=preissued&preinvoice='+encodeURIComponent(a.id)),o?moneycell(o.amount):'—',moneycell(a.amount),preissuedStatus(a),textcell(o?o.store:a.storeName),e(o?o.storeCode:a.store),e(a.appliedAt),e(a.requestNumber),preissuedActions(a)];});
    if(q.bill&&!D.bill(q.bill))return notFound();if(q.bill)fields=fields.filter(function(f){return f.key!=='status';});
    var scope=q.bill?'<div class="preissued-scope"><span>当前范围：'+link('结算单 JS'+q.bill.replace(/-/g,'').toUpperCase(),'/settlement/'+q.bill)+' · 红冲失败</span>'+link('查看全部预开平台发票','/preissued')+'</div>':'';
    return'<section class="panel">'+title('预开平台发票')+scope+ordersQuery(q,key,fields)+(invalid?'<div class="notice error">开始日期不能晚于结束日期</div>':'')+'<div class="toolbar">'+btn('导出','pre-export')+'<div class="grow"></div>'+action('批量重试','pre-retry-all')+'</div>'+table([{label:'订单号',width:210},{label:'订单金额',numeric:true,width:100},{label:'预开票金额',numeric:true,width:115},{label:'开票申请状态',width:125},{label:'门店名',width:140},{label:'门店号',width:110},{label:'申请开票时间',width:170},{label:'申请任务号',systemId:true,width:215},{label:'操作',action:true,width:165}],rows,'未找到符合条件的开票申请',1350)+(result.total?pagination(key,result.total,size):'<div class="table-bottom-space"></div>')+'</section>';
  }
  function preinvoiceDownloadMenu(a){var id='pre-download-menu',opts=[{value:'original',label:'下载蓝票'}];if(a.redNumber)opts.push({value:'red',label:'下载红票'});state.selects[id]={id:id,value:'',options:opts,label:'下载发票',scope:'pre-download',invoiceId:a.id};return '<button type="button" class="link" id="'+id+'" data-select="'+id+'" aria-label="下载发票" aria-expanded="false" aria-haspopup="listbox"><span>下载</span> <span aria-hidden="true">⌄</span></button>';}
  function preinvoiceView(id,params){
    var a=P&&P.application(id);if(!a)return notFound();var tab=params.get('tab'),preview=tab==='original'||tab==='red',red=tab==='red',snapshot=preview&&P.invoiceSnapshot(id,red);
    var scopedBill=params.get('settlement'),crumbs=[{name:'平台出资明细',path:fundingDetailsPath({bill:scopedBill||'',order:a.order})},{name:'开票记录',path:preinvoicePath(id)}];
    if(preview){if(!snapshot)return notFound();var previewBack=params.get('returnTo');if(previewBack&&/^\/funding-detail\/[^?]+(?:\?|$)/.test(previewBack))crumbs=[{name:'出资明细详情',path:previewBack}];crumbs.push({name:red?'红字发票':'蓝字发票'});return customBreadcrumb(crumbs)+'<section class="panel">'+title(red?'红字发票':'蓝字发票',btn('下载','pre-download',id+'|'+tab))+invoicePaper(snapshot)+'</section>';}
    function card(name,body,actions){return'<section class="panel preapplication-card">'+title(name,actions)+body+'</section>';}
    var fields=[['申请时间',e(a.appliedAt)],['申请任务号',e(a.requestNumber)],['开票申请状态',preissuedStatus(a)],['发票种类',e(a.invoiceType)],['开票金额',moneycell(a.amount)]];
    if(a.billId)fields.push(['关联结算单',preissuedBillLink('JS'+a.billId.replace(/-/g,'').toUpperCase(),a.billId)]);
    if(a.triggerInvoice)fields.push(['撤销原因',a.demoOrder||a.beforeSettlement?'结算开票前撤销预票':'关联结算单已开票'],['撤销完成时间',e(a.completedAt&&a.applicationStatus==='revoked'?a.completedAt:'—')]);
    var html=customBreadcrumb(crumbs)+card('开票申请信息','<div class="section">'+info(fields)+'</div>',preissuedActions(a,true));
    var rows=[];
    if(a.hasInvoice)rows.push([e(a.number),moneycell(a.amount),a.applicationStatus==='revoked'?'已红冲':'已开票',textcell(a.seller.name),e(a.seller.tax),e(a.date),preinvoiceDownloadMenu(a)]);
    html+=card('关联发票信息',table([{label:'蓝票号码',width:210},{label:'开票金额',numeric:true,width:100},{label:'开票状态',width:110},{label:'纳税人名称',width:200},{label:'税号',width:200},{label:'生成时间',width:175},{label:'操作',action:true,width:90}],rows,'暂无关联发票',1080));
    var o=window.DemoOrderData.get(a.fundingId);
    html+=card('关联订单信息',table([{label:'订单号',width:270},{label:'门店名',width:180},{label:'订单金额',numeric:true,width:130},{label:'本次开票金额',numeric:true,width:140},{label:'订单渠道',width:120},{label:'操作',action:true,width:90}],o?[[e(o.number),textcell(o.store),moneycell(o.amount),moneycell(a.amount),e(o.channel),link('查看','/order/'+a.fundingId+'?source=preissued&preinvoice='+encodeURIComponent(id))]]:[],'暂无关联订单',940));return html;
  }
  function canRefreshPreissuedView(){return !state.dirty&&!state.layer&&!state.selectOpen&&!(document.activeElement&&document.activeElement.closest('.query'))&&['funding-detail','funding-details','settlement-preissued','preissued','preinvoice','small','small-task'].includes(route().parts[0]);}
  function processPreissued(){
    if(!P||preissuedTimer)return;if(!P.startPending())return;
    preissuedTimer=setTimeout(function(){preissuedTimer=null;var changed=P.finishPending();if(changed&&canRefreshPreissuedView())render(true);processPreissued();},1800);
  }
  function refreshPreissued(id){P.refresh();if(id)P.refreshApplication(id);processPreissued();render(true);toast('已刷新处理状态');}
  function retryPreissued(id){try{var a=P.retryApplication(id);processPreissued();render(true);toast(a.hasInvoice?'已重新提交撤销':'已重新提交开票申请');}catch(err){toast(err.message);}}
  function showPreissuedFailure(id){var a=P.application(id);if(!a||!['failed','reverse_failed'].includes(a.applicationStatus))return;showLayer({title:a.applicationStatus==='reverse_failed'?'撤销失败原因':'开票失败原因',size:'standard',readonly:true,body:'<p class="secondary">'+e(a.failureStage)+'失败 · '+e(a.requestNumber)+'</p><p class="request-failure-message">'+e(a.error||'未记录失败原因')+'</p>'});}
  function downloadPreissued(id,tone){var inv=P.invoiceSnapshot(id,tone==='red');if(!inv)return;download(inv.id+'-样票.svg',invoiceSvg(inv),'image/svg+xml;charset=utf-8');toast('发票样票已下载');}
  function exportPreissued(){
    var rows=[['订单号','订单金额','预开票金额','开票申请状态','门店名','门店号','申请开票时间','申请任务号']],orderCache=new Map();
    P.applications(preissuedScopedQuery(),1,Number.MAX_SAFE_INTEGER).rows.forEach(function(a){
      if(!orderCache.has(a.order))orderCache.set(a.order,window.DemoOrderData.get(a.fundingId));var o=orderCache.get(a.order);
      rows.push([o?o.number:a.order,o?money(o.amount):'—',money(a.amount),preissuedStatusMap[a.applicationStatus][0],o?o.store:a.storeName,o?o.storeCode:a.store,a.appliedAt,a.requestNumber]);
    });download('预开平台发票-开票申请.csv',csv(rows));toast('开票申请已导出');
  }

  function retryAllPreissued(){var q=preissuedScopedQuery();if(q.status&&!['failed','reverse_failed'].includes(q.status)){toast('当前筛选结果中没有可重试的记录');return;}var states=q.status?[q.status]:['failed','reverse_failed'],rows=states.flatMap(function(status){return P.applications(Object.assign({},q,{status:status}),1,Number.MAX_SAFE_INTEGER).rows;});if(!rows.length){toast('当前筛选结果中没有可重试的记录');return;}rows.forEach(function(a){P.retryApplication(a.id);});processPreissued();render(true);toast('已重新提交 '+rows.length+' 笔失败记录');}
  function orderDateToday(){return new Date().toLocaleDateString('sv-SE');}
  function shiftDateMonth(month,step){var v=month.split('-').map(Number);return new Date(Date.UTC(v[0],v[1]-1+step,1)).toISOString().slice(0,7);}
  function validOrderDateRange(v){return /^\d{4}-\d{2}-\d{2}$/.test(v.from||'')&&/^\d{4}-\d{2}-\d{2}$/.test(v.to||'')&&v.from<=v.to;}
  function dateCalendar(month){
    var v=month.split('-').map(Number),first=new Date(Date.UTC(v[0],v[1]-1,1)),offset=(first.getUTCDay()+6)%7,days=new Date(Date.UTC(v[0],v[1],0)).getUTCDate(),d=state.orderDate;
    return'<div class="date-calendar"><h3>'+e(ym(month))+'</h3><div class="date-week">'+['一','二','三','四','五','六','日'].map(function(day){return'<span>'+day+'</span>';}).join('')+'</div><div class="date-days">'+Array.from({length:42},function(_,i){var day=i-offset+1;if(day<1||day>days)return'<span></span>';var date=month+'-'+String(day).padStart(2,'0'),selected=date===d.from||date===d.to,inRange=d.from&&d.to&&date>d.from&&date<d.to;return'<button type="button" class="'+(selected?'selected ':inRange?'in-range ':'')+'" data-action="orders-date-day" data-id="'+date+'" aria-label="'+date+'" aria-pressed="'+selected+'">'+day+'</button>';}).join('')+'</div></div>';
  }
  function closeOrdersDate(restore){var pop=$('#orders-date-popover');if(pop)pop.remove();state.orderDate=null;var trigger=$('#orders-date');if(trigger){trigger.setAttribute('aria-expanded','false');if(restore)trigger.focus({preventScroll:true});}}
  function paintOrdersDate(){
    var d=state.orderDate;if(!d)return;var pop=$('#orders-date-popover');if(!pop){pop=document.createElement('div');pop.id='orders-date-popover';pop.className='order-date-popover';pop.setAttribute('role','dialog');pop.setAttribute('aria-label','选择'+$('#orders-date').getAttribute('aria-label'));document.body.appendChild(pop);}
    var rect=$('#orders-date').getBoundingClientRect();pop.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-665))+'px';pop.style.top=Math.max(8,Math.min(rect.top,window.innerHeight-430))+'px';
    pop.innerHTML='<div class="date-shortcuts">'+[['today','今天'],['week','本周'],['month','本月'],['three','三个月'],['half','半年']].map(function(x){return'<button type="button" data-action="orders-date-preset" data-id="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div><div class="date-picker-body"><div class="date-inputs"><label>开始日期<input type="date" id="order-date-from" aria-label="开始日期" value="'+e(d.from)+'"></label><span>—</span><label>结束日期<input type="date" id="order-date-to" aria-label="结束日期" value="'+e(d.to)+'"></label></div><div class="date-page-actions"><button type="button" class="link" data-action="orders-date-page" data-id="-1" aria-label="上个月">‹</button><button type="button" class="link" data-action="orders-date-page" data-id="1" aria-label="下个月">›</button></div><div class="date-calendars">'+dateCalendar(d.month)+dateCalendar(shiftDateMonth(d.month,1))+'</div><div class="date-picker-footer">'+btn('取消','orders-date-cancel')+btn('确定','orders-date-apply','',true,!validOrderDateRange(d))+'</div></div>';
  }
  function openOrdersDate(){
    if(state.orderDate){closeOrdersDate(true);return;}closeSelect();var form=$('#orders-query'),from=$('[name="createdFrom"]',form).value,to=$('[name="createdTo"]',form).value;
    state.orderDate={from:from,to:to,month:(from||to||orderDateToday()).slice(0,7),selecting:'from'};$('#orders-date').setAttribute('aria-expanded','true');paintOrdersDate();$('#order-date-from').focus({preventScroll:true});
  }
  function applyOrdersDate(from,to){
    var form=$('#orders-query');$('[name="createdFrom"]',form).value=from;$('[name="createdTo"]',form).value=to;$('.orders-date-start',form).textContent=from;$('.orders-date-end',form).textContent=to;$('.order-date-field',form).classList.add('filled');closeOrdersDate(true);
  }
  function presetOrdersDate(kind){var today=orderDateToday(),n=new Date(today+'T00:00:00Z'),start=new Date(n);if(kind==='week')start.setUTCDate(n.getUTCDate()-(n.getUTCDay()+6)%7);if(kind==='month')start.setUTCDate(1);if(kind==='three'||kind==='half'){start=new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth()-(kind==='three'?2:5),1));}applyOrdersDate(start.toISOString().slice(0,10),today);}
  function notFound(){return'<section class="panel">'+title('记录不存在')+empty('未找到这条记录','请返回所属列表重新选择。')+'</section>';}
  function field(label,body,required,help){var match=body.match(/id="([^"]+)"/);return'<div class="form-row"><label'+(match?' for="'+match[1]+'"':'')+' class="'+(required?'required':'')+'">'+e(label)+'</label><div>'+body+(help?'<div class="field-help">'+e(help)+'</div>':'')+'</div></div>';}
  function input(name,value,label,required,type){return'<input class="input" id="'+e(name)+'" name="'+e(name)+'" value="'+e(value||'')+'" aria-label="'+e(label)+'" autocomplete="off"'+(type?' type="'+type+'"':'')+(required?' required':'')+'>';}
  function checkList(name,values,items){return'<div class="scope-box">'+items.map(function(x){return'<label class="check-row"><input type="checkbox" name="'+e(name)+'" value="'+e(x.value)+'"'+(values.includes(x.value)?' checked':'')+'><span>'+e(x.label)+'</span></label>';}).join('')+'</div>';}
  function rateText(rate){return rate==null?'未选择':String(rate)+'%';}
  function upperMoney(cents){
    var negative=cents<0;cents=Math.abs(cents);var digits='零壹贰叁肆伍陆柒捌玖',integer=Math.floor(cents/100),fraction=cents%100;
    function section(n){var out='',zero=false,units=['','拾','佰','仟'];for(var i=3;i>=0;i--){var d=Math.floor(n/Math.pow(10,i))%10;if(d){if(zero)out+='零';out+=digits[d]+units[i];zero=false;}else if(out)zero=true;}return out;}
    var groups=[],n=integer;while(n){groups.push(n%10000);n=Math.floor(n/10000);}var text='',pending=false;
    for(var i=groups.length-1;i>=0;i--){if(groups[i]){if(text&&(pending||groups[i]<1000))text+='零';text+=section(groups[i])+['','万','亿','万亿'][i];pending=false;}else if(text)pending=true;}
    text=(text||'零')+'元';if(!fraction)text+='整';else{if(Math.floor(fraction/10))text+=digits[Math.floor(fraction/10)]+'角';else if(integer)text+='零';if(fraction%10)text+=digits[fraction%10]+'分';}return(negative?'负':'')+text;
  }
  function invoiceLineAmounts(inv){
    var amount=inv.amount,valid=Number.isSafeInteger(amount),taxRate=inv.taxRate==null?6:inv.taxRate;
    var net=valid?(amount<0?-1:1)*Math.round(Math.abs(amount)/(1+taxRate/100)):0;
    return{amount:amount,valid:valid,taxRate:taxRate,net:net,tax:valid?amount-net:0};
  }
  function invoicePaper(inv){
    var totals=invoiceLineAmounts(inv),amount=totals.amount,valid=totals.valid,taxRate=totals.taxRate,net=totals.net,tax=totals.tax,buyer=inv.buyer,seller=inv.seller;
    function value(n){return valid?money(n):'—';}
    function details(subject,label){return'<div><strong>'+label+'</strong><p>名称：'+e(subject.name)+'</p><p>纳税人识别号：'+e(subject.tax||'-')+'</p><p>地址、电话：'+e([subject.address,subject.phone].filter(Boolean).join('　')||'-')+'</p><p>开户行及账号：'+e([subject.bank,subject.bankAccount].filter(Boolean).join('　')||'-')+'</p></div>';}
    return'<div class="invoice-paper"><div class="invoice-heading">电子发票（'+e(inv.invoiceType||'增值税专用发票')+'）</div><div class="invoice-meta"><span>发票号码：'+e(inv.id||'开具后生成')+'</span><span>开票日期：'+e(inv.date||'开具时生成')+'</span></div><div class="invoice-parties">'+details(buyer,'购买方')+details(seller,'销售方')+'</div><div class="invoice-lines"><table class="invoice-native"><colgroup><col style="width:25%"><col style="width:9%"><col style="width:6%"><col style="width:6%"><col style="width:15%"><col style="width:16%"><col style="width:7%"><col style="width:16%"></colgroup><thead><tr><th>项目名称</th><th>规格型号</th><th>单位</th><th>数量</th><th class="numeric">单价</th><th class="numeric">金额</th><th class="numeric">税率</th><th class="numeric">税额</th></tr></thead><tbody><tr><td>'+e(D.invoiceItemLabel(inv))+'</td><td>-</td><td>次</td><td>'+(amount<0?'-1':'1')+'</td><td class="numeric">'+value(Math.abs(net))+'</td><td class="numeric">'+value(net)+'</td><td class="numeric">'+taxRate+'%</td><td class="numeric">'+value(tax)+'</td></tr><tr class="invoice-blank"><td colspan="8">'+(inv.tone==='red'?'<span class="red-invoice-watermark">红字发票</span>':'')+'</td></tr><tr><td colspan="5">合计</td><td class="numeric">¥ '+value(net)+'</td><td></td><td class="numeric">¥ '+value(tax)+'</td></tr></tbody></table></div><div class="invoice-total"><span>价税合计（大写） <strong>'+e(valid?upperMoney(amount):'—')+'</strong></span><span>（小写）¥ '+value(amount)+'</span></div><div class="invoice-remark"><span>备注</span><div>'+e(inv.remark||'-').replace(/\n/g,'<br>')+(inv.originalId?'<br>对应蓝票号码：'+e(inv.originalId):'')+'</div></div><div class="invoice-meta"><span>开票人：集团财务</span><span>'+e(inv.invoiceType||'')+'</span></div></div>';
  }
  function recipientText(record,fallback){var emails=D.invoiceRecipients(record);if(!emails.length&&!Array.isArray(record.recipients)&&fallback)emails=D.invoiceRecipients(fallback);return emails.map(e).join('<br>')||'-';}
  function invoiceView(bid,iid){
    var b=D.bill(bid),inv=b&&b.invoices.find(function(x){return x.id===iid;});if(!inv)return notFound();
    return billBreadcrumb(b,'发票详情')+'<section class="panel">'+title('发票详情')+'<div class="section" style="padding-top:0">'+info([['发票号码',e(inv.id)],['发票状态',status(inv.reversedBy?'revoked':'issued',inv.reversedBy?'已红冲':'已开票')],['票据方向',inv.tone==='red'?'红票':'蓝票'],['销售方',party(inv.seller)],['购买方',party(inv.buyer)],['开票金额',moneycell(inv.amount)],['关联结算单',link('JS'+bid.replace(/-/g,'').toUpperCase(),'/settlement/'+bid)],['关联发票',inv.originalId?link(inv.originalId,'/invoice/'+bid+'/'+inv.originalId):inv.reversedBy?link(inv.reversedBy,'/invoice/'+bid+'/'+inv.reversedBy):'-'],['开票项目名称',e(inv.item||'-')],['税收分类编码',e(inv.taxCode||'-')],['税收分类简称',e(inv.taxShortName||inv.item)],['税率',rateText(inv.taxRate)],['开票申请',link(inv.applicationId,'/application/'+bid+'/'+inv.applicationId)]])+'</div></section><section class="panel">'+invoicePaper(inv)+title('发票交付',btn('下载','download-invoice',bid+'|'+iid)+btn('发送邮件','email-invoice',bid+'|'+iid,true))+'<div class="section" style="padding-top:0">'+info([['接收邮箱',recipientText(inv)],['发送状态',inv.sent?'已发送':'未发送']])+'</div></section>';
  }
  function parseAmount(v){var text=String(v).trim();if(!/^\d+(\.\d{1,2})?$/.test(text))return null;var a=text.split('.'),c=Number(a[0])*100+Number((a[1]||'').padEnd(2,'0'));return Number.isSafeInteger(c)&&c>0?c:null;}
  function syncInvoiceDraft(){
    var form=$('#invoice-form'),draft=state.invoiceDraft;if(!form||!draft)return;
    var fd=new FormData(form);draft.remark=String(fd.get('invoice-remark')||'');
    draft.emails=(draft.emails||[]).map(function(_,i){return String(fd.get('invoice-email-'+i)||'');});
    draft.email=draft.emails[0]||'';draft.remarkOptions=[];
  }
  function draftPreview(b,draft){return{amount:draft.amount,tone:'blue',buyer:draft.issueBuyerSnapshot||D.invoiceDefaults(b).buyer,seller:D.getSeller(b.seller),item:b.item,invoiceType:b.invoiceType,taxCode:b.taxCode,taxShortName:b.taxShortName,taxRate:b.taxRate,remark:draft.remark};}
  function invoicePartyDetails(subject,label){
    var rows=[['名称',subject.name],['统一社会信用代码 / 纳税人识别号',subject.tax],['地址',subject.address],['电话',subject.phone],['开户银行',subject.bank],['银行账号',subject.bankAccount]];
    return'<details class="issue-party" open><summary><h2>'+label+'信息</h2><span class="issue-party-toggle" aria-hidden="true"></span></summary><dl>'+rows.map(function(row){return'<div><dt>'+row[0]+'：</dt><dd>'+e(row[1]||'—')+'</dd></div>';}).join('')+'</dl></details>';
  }
  function invoiceGoods(inv){
    var totals=invoiceLineAmounts(inv),qty=totals.amount<0?-1:1;
    function value(n){return totals.valid?'¥ '+money(n):'—';}
    return'<div class="issue-goods-paper"><div class="issue-goods-scroll"><table class="invoice-native issue-goods-table" aria-label="商品信息"><colgroup><col style="width:25%"><col style="width:10%"><col style="width:6%"><col style="width:6%"><col style="width:14%"><col style="width:15%"><col style="width:9%"><col style="width:15%"></colgroup><thead><tr><th>项目名称</th><th>规格型号</th><th>单位</th><th>数量</th><th class="numeric">单价</th><th class="numeric">金额</th><th class="numeric">税率/征收率</th><th class="numeric">税额</th></tr></thead><tbody><tr><td>'+e(D.invoiceItemLabel(inv))+'</td><td>—</td><td>次</td><td>'+qty+'</td><td class="numeric">'+value(Math.abs(totals.net))+'</td><td class="numeric">'+value(totals.net)+'</td><td class="numeric">'+rateText(totals.taxRate)+'</td><td class="numeric">'+value(totals.tax)+'</td></tr></tbody><tfoot><tr><td colspan="3">合计</td><td>'+qty+'</td><td></td><td class="numeric">'+value(totals.net)+'</td><td></td><td class="numeric">'+value(totals.tax)+'</td></tr></tfoot></table></div><div class="issue-goods-total"><span>价税合计（大写）</span><strong>'+e(totals.valid?upperMoney(totals.amount):'—')+'</strong><div><span>（小写）</span><output id="invoice-amount-display" class="money" aria-label="应开票金额">'+value(totals.amount)+'</output></div></div></div>';
  }
  function invoiceEmailRows(draft){return(draft.emails||[]).map(function(email,i){return'<div class="issue-email-row"><div>'+input('invoice-email-'+i,email,'接收邮箱 '+(i+1),false,'email').replace('autocomplete="off"','autocomplete="off" placeholder="请输入接收邮箱"')+'</div><button class="remove-email" type="button" aria-label="移除接收邮箱 '+(i+1)+'" data-action="issue-email-remove" data-id="'+i+'">×</button></div>';}).join('');}
  function paintInvoiceEmails(focus){$('#issue-email-rows').innerHTML=invoiceEmailRows(state.invoiceDraft);$('#invoice-errors').innerHTML='';if(focus!=null)$('#invoice-email-'+focus)?.focus();}
  function updateInvoiceRemark(){
    var draft=state.invoiceDraft,b=draft&&D.bill(draft.bid);if(!b)return;
    $('#invoice-remark-count').textContent=draft.remark.length+' / 500';
  }
  function invoiceIssue(bid){
    var b=D.bill(bid);if(!b||!canIssue(b))return notFound();var p=D.getProject(b.project),buyer=b.buyerSnapshot||D.getBuyer(p);
    if(!state.invoiceDraft||state.invoiceDraft.bid!==bid){var emails=D.invoiceRecipients(b),defaults=D.invoiceDefaults(b);state.invoiceDraft={issueBuyerSnapshot:defaults.buyer,bid:bid,amount:amountOf(b),remark:b.invoiceRemark||'',email:emails[0]||'',emails:emails,remarkOptions:defaults.remarkOptions.slice()};state.dirty=false;}
    var draft=state.invoiceDraft,inv=draftPreview(b,draft);
    var summary=info([['结算月份',e(ym(b.month))],['合作伙伴',e(D.getPartner(D.partnerId(b)).name)],['结算单号',link('JS'+bid.replace(/-/g,'').toUpperCase(),'/settlement/'+bid)],['结算金额',moneycell(D.settlementNet(b))],['应开票金额',moneycell(draft.amount)],['调整差额',signedMoney(draft.amount-D.settlementNet(b))]]);
    return billBreadcrumb(b,'发起开票')+'<section class="panel">'+title('结算单信息')+'<div class="section issue-settlement-info">'+summary+'</div></section><section class="panel invoice-compose"><div class="issue-invoice-heading"><h1>发票信息</h1><span>'+e(b.invoiceType||p.invoiceType)+'</span></div><form id="invoice-form" novalidate><div id="invoice-errors"></div><div class="issue-invoice-frame"><div class="issue-parties">'+invoicePartyDetails(inv.buyer,'购买方')+invoicePartyDetails(inv.seller,'销售方')+'</div><section class="issue-goods"><h2>商品信息</h2>'+invoiceGoods(inv)+'</section></div><section class="issue-extra-section"><h2 id="invoice-remark-label">备注信息</h2><textarea class="textarea" id="invoice-remark" name="invoice-remark" aria-label="发票备注" aria-describedby="invoice-remark-count" maxlength="500" placeholder="请输入备注信息">'+e(draft.remark)+'</textarea><div class="issue-remark-counter"><output id="invoice-remark-count">'+draft.remark.length+' / 500</output></div></section><section class="issue-extra-section issue-delivery"><h2>发票交付</h2><div id="issue-email-rows">'+invoiceEmailRows(draft)+'</div><button class="dashed-add" type="button" data-action="issue-email-add"><span>＋</span>添加接收邮箱</button></section></form><div class="issue-submit">'+btn('取消','cancel-issue',bid)+'<button class="btn primary" type="submit" form="invoice-form">确认开票</button></div></section>';
  }
  function invoiceError(message,name){
    var form=$('#invoice-form'),inp=$('[name="'+name+'"]',form);$('#invoice-errors').innerHTML='<div class="notice error inline-notice">'+e(message)+'</div>';
    if(inp){inp.setAttribute('aria-invalid','true');var note=document.createElement('div');note.className='field-error';note.id='error-'+name;note.textContent=message;inp.parentElement.appendChild(note);inp.setAttribute('aria-describedby',note.id);inp.focus();inp.scrollIntoView({block:'center'});}
  }
  function submitInvoice(){
    syncInvoiceDraft();var draft=state.invoiceDraft,b=draft&&D.bill(draft.bid);if(!b||!canIssue(b))return;
    var amount=draft.amount;$$('[aria-invalid]', $('#invoice-form')).forEach(function(n){n.removeAttribute('aria-invalid');n.removeAttribute('aria-describedby');});$$('.field-error', $('#invoice-form')).forEach(function(n){n.remove();});
    if(amount!==amountOf(b))return invoiceError('结算单应开票金额已更新，请返回结算单重新确认。');
    var invalidEmail=draft.emails.findIndex(function(email){return email.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());});
    if(invalidEmail>=0)return invoiceError('请填写有效的接收邮箱','invoice-email-'+invalidEmail);
    var button=$('button[form="invoice-form"]');button.disabled=true;button.setAttribute('aria-busy','true');
    try{var a=window.DemoSettlementWorkflow.start(b.id,{issueBuyerSnapshot:draft.issueBuyerSnapshot,amount:amount,remark:draft.remark,remarkOptions:draft.remarkOptions,emails:draft.emails});state.dirty=false;state.invoiceDraft=null;navigate('/settlement/'+b.id,true);toast('已启动结算单开票');finishIssue(b.id,a.id);}catch(err){button.disabled=false;button.removeAttribute('aria-busy');invoiceError(err.message);}
  }
  function adjustInvoiceAmount(bid){
    var b=D.bill(bid);if(!canIssue(b))return;
    showLayer({title:'调整应开票金额',size:'standard',values:{amount:(amountOf(b)/100).toFixed(2),reason:''},submitLabel:'保存',body:function(v){return'<p class="amount-context">结算金额：<span class="money">¥ '+money(D.settlementNet(b))+'</span></p>'+field('应开票金额',input('amount',v.amount,'应开票金额',true),true)+field('调整说明','<textarea class="textarea" name="reason" aria-label="调整说明">'+e(v.reason)+'</textarea>',true);},submit:function(v){var amount=parseAmount(v.amount);if(amount===null)return layerError('请填写大于 0 且最多两位小数的金额','amount');if(amount!==amountOf(b)&&!v.reason.trim())return layerError('请填写调整说明','reason');try{D.adjustAmount(b,amount,v.reason);D.save();closeLayer(true);render(true);toast('应开票金额已更新');}catch(err){layerError(err.message,'amount');}}});
  }
  function cancelInvoice(bid,iid){
    var b=D.bill(bid),inv=b&&D.activeInvoice(b);if(!inv||iid&&inv.id!==iid||!['issued','reverse_failed'].includes(b.status))return;
    showLayer({title:'撤销已开具的发票？',confirm:true,values:{reason:''},submitLabel:'确认撤销',body:function(v){return'<p>将整张红冲当前蓝票。撤销完成后，可调整应开票金额并重新开票。</p><dl class="confirm-list"><div><dt>蓝票号码</dt><dd>'+e(inv.id)+'</dd></div><div><dt>撤销金额</dt><dd>¥ '+money(inv.amount)+'</dd></div></dl><div class="cancel-reason">'+field('撤销原因','<textarea class="textarea" name="reason" aria-label="撤销原因">'+e(v.reason)+'</textarea>',true)+'</div>';},submit:function(v){if(!v.reason.trim())return layerError('请填写撤销原因','reason');try{if(D.activeInvoice(b)?.id!==inv.id)throw new Error('当前有效发票已变化，请刷新后重新操作');var a=D.startReversal(bid,v.reason);closeLayer(true);render(true);toast('撤销申请已提交');finishIssue(bid,a.id);}catch(err){layerError(err.message,'reason');}}});
  }
  function menuIcon(kind){
    var paths={
      user:'<circle cx="12" cy="7" r="3.2"/><path d="M5 20v-2.5a7 7 0 0 1 14 0V20Z"/>',
      roles:'<circle cx="9" cy="7" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3ZM16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2"/>',
      organization:'<circle cx="6" cy="4" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="20" r="2"/><path d="M6 6v12m0-7c6 0 12-1 12-3"/>',
      taxpayer:'<circle cx="9" cy="6" r="3.4"/><path d="M3 19c0-4 2-7 5-7m7 2 5 5m0-5-5 5m2.5-7v9m-4.5-4.5h9"/>',
      invoice:'<path d="M6 3h12v4M6 3v18h10M9 3v3m6-3v3M9 10h5m-5 4h3m4 1h6m-3-3 3 3-3 3"/>',
      platform:'<path d="M8 3h12v15M4 7h12v14H4ZM7 11h6m-6 4h6m-6 3h4"/>',
      report:'<path d="M5 3h10l4 4v5M5 3v18h7M15 3v5h4M8 11h5m-5 4h2"/><circle cx="17" cy="17" r="4"/><path d="M17 13v4h4"/>',
      settings:'<path d="m10 3-1 3-3 1-2 3 1 3-1 3 3 2 2 3h4l1-3 3-1 2-3-1-3 1-3-3-2-2-3Z"/><circle cx="11" cy="12" r="3"/><path d="M18 18h4m-5 3h5"/>',
      rules:'<path d="M3 4h18v5H3ZM5 9v12h14V9m-10 5h6"/>',
      partners:'<circle cx="7" cy="6" r="3"/><circle cx="17" cy="6" r="3"/><path d="M2 20v-3a5 5 0 0 1 5-5h2m6 0h2a5 5 0 0 1 5 5v3M8 17l3 3 5-5"/>'
    };
    return'<svg class="side-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[kind]+'</svg>';
  }
  function paintShell(r){
    var name=r.parts[0]||'overview',management=name==='management';
    var active=['taxpayers','taxpayer-batch','taxpayer-imports'].includes(name)?'taxpayers':name==='reissue-config'?'reissue-config':(['funding-detail','funding-details','preinvoice','preissued','small','small-task'].includes(name)||name==='order'&&(['funding-detail','funding-details','partner-funding','funding'].includes(r.params.get('from'))||['preissued','small'].includes(r.params.get('source'))))?'funding-details':['funding-items','funding-item','funding-item-edit','funding-seller-batch'].includes(name)?'funding-items':['cooperators','cooperator'].includes(name)?'cooperators':management?'partners':['projects','project-config','project-edit'].includes(name)||isProjectScope()?'projects':['preissued','preinvoice','small','small-task'].includes(name)?'preissued':name==='order'&&['preissued','small'].includes(r.params.get('source'))?'preissued':name==='orders'||name==='order'&&r.params.get('source')==='orders'?'orders':'overview';
    state.nav=active;
    $('#topbar').innerHTML='<img class="brand-logo" src="assets/meta/logo-shouqianba-yellow.png" alt="收钱吧"><nav class="top-nav" aria-label="业务模块"><a href="#/overview" data-route="/overview"'+(!management?' aria-current="page"':'')+'>电子发票</a><a href="#/management" data-route="/management"'+(management?' aria-current="page"':'')+'>管理功能</a></nav><div class="top-actions"><button class="top-tool" data-action="exports" aria-label="导出记录"><img src="assets/meta/topbar/export-record.svg" alt=""></button><span class="top-divider"></span><div class="account"><img src="assets/meta/identity/default-organization.svg" alt=""><div><strong>达美乐</strong><small>集团财务</small></div></div></div>';
    function navItem(text,path,id){return'<a class="side-link child" href="#'+path+'" data-route="'+path+'"'+(active===id?' aria-current="page"':'')+'><span>'+text+'</span></a>';}
    function referenceItem(text,icon,expandable,child){
      return'<div class="reference-menu-item'+(child?' child':'')+'">'+(child?'':menuIcon(icon))+'<span>'+text+'</span>'+(expandable?'<img class="chevron down" src="assets/meta/pagination-chevron-right.svg" alt="" aria-hidden="true">':'')+'</div>';
    }
    function group(text,id,icon,content,hot){
      var expanded=state.tabs['nav-'+id]!==false;
      return'<div class="side-group"><button class="group-title with-icon'+(hot?' active':'')+'" data-action="toggle-nav" data-id="'+id+'" aria-expanded="'+expanded+'" aria-controls="nav-'+id+'"><span class="menu-label">'+menuIcon(icon)+'<span>'+text+'</span></span><img class="chevron '+(expanded?'up':'down')+'" src="assets/meta/pagination-chevron-right.svg" alt=""></button><div id="nav-'+id+'"'+(!expanded?' class="hidden"':'')+'>'+content+'</div></div>';
    }
    var invoiceMenu=group('开票管理','invoice','invoice',referenceItem('开票记录',null,false,true)+navItem('开票订单列表','/orders','orders')+referenceItem('开票人列表',null,false,true)+referenceItem('红冲失败的发票',null,false,true)+referenceItem('历史订单查询',null,false,true),active==='orders');
    var platformMenu=group('平台开票管理','tob','platform',navItem('月度总览','/overview','overview')+navItem('合作伙伴','/cooperators','cooperators')+navItem('平台出资明细',fundingDetailsPath({month:D.TODAY}),'funding-details')+navItem('平台出资项','/funding-items','funding-items'),['overview','cooperators','funding-details','funding-items'].includes(active));
    $('#sidebar').innerHTML=management?'<nav class="side-menu screenshot-menu" aria-label="管理功能">'+referenceItem('用户管理','user')+referenceItem('角色管理','roles')+referenceItem('组织管理','organization',true)+'</nav>':'<nav class="side-menu screenshot-menu" aria-label="电子发票">'+group('纳税人管理','taxpayer','taxpayer',navItem('纳税人配置','/taxpayers','taxpayers')+referenceItem('门店开票配置',null,false,true),active==='taxpayers')+invoiceMenu+platformMenu+referenceItem('报表管理','report',true)+referenceItem('系统配置','settings',true)+group('开票规则配置','rules','rules',referenceItem('支付方式配置',null,false,true)+referenceItem('交易即开票配置',null,false,true)+navItem('换开功能配置','/reissue-config','reissue-config'),active==='reissue-config')+'</nav><div class="side-foot">本软件由上海收钱吧互联网科技股份有限公司开发运营<br>非税务机关的官方软件</div>';
  }
  function render(keepScroll){
    var scroll=window.scrollY,r=route();if(r.parts[0]==='applications'){location.replace('#/orders');return;}if(r.parts[0]==='partners'){location.replace('#/cooperators');return;}if(r.parts[0]==='partner'){location.replace('#/cooperator/'+r.parts[1]);return;}if(r.parts[0]==='customer-category'){location.replace('#/management');return;}state.selects={};closeOrdersDate();closeSelect();paintShell(r);var p=r.parts,html='';
    if(state.route!==location.hash&&r.params.has('tab')&&p[0]==='project')state.tabs[p[2]?'project-'+p[1]+'-'+p[2]:'project-home-'+p[1]]=r.params.get('tab');
    if(state.route!==location.hash&&p[0]==='project-config')state.tabs['project-home-'+p[1]]='config';
    if(state.route!==location.hash&&p[0]==='partners'&&r.params.has('tab'))state.tabs.partners=r.params.get('tab');
    if(state.route!==location.hash&&r.params.has('status')){
      if(p[0]==='month')state.query['month-'+p[1]]={status:r.params.get('status')};
      if(p[0]==='project'){var queryKey=p[2]?'bills-'+p[1]+'-'+p[2]:'project-months-'+p[1],tabKey=p[2]?'project-'+p[1]+'-'+p[2]:'project-home-'+p[1];state.query[queryKey]={status:r.params.get('status')};state.tabs[tabKey]=p[2]?'settlements':'months';}
    }
    if(state.route!==location.hash&&p[0]==='orders'&&r.params.get('store')){state.query.orders={store:r.params.get('store')==='DEMO001'?'优惠演示门店':r.params.get('store')};state.pages.orders=1;if(r.params.get('store')==='DEMO001')state.sizes.orders=20;}
    if(state.route!==location.hash&&p[0]==='preissued'){var before=new URLSearchParams((state.route||'').split('?')[1]||'');if(r.params.get('bill')||before.get('bill')){state.query.preissued=r.params.get('bill')?{}:{createdFrom:D.TODAY+'-01',createdTo:D.TODAY+'-30'};state.pages.preissued=1;}}
    if(state.route!==location.hash&&p[0]==='funding-details'){var fq={};['order','partner','month','dateFrom','dateTo','bill','item','store','preStatus','kind'].forEach(function(k){if(r.params.get(k))fq[k]=r.params.get(k);});fq=D.normalizeFundingQuery(fq);if(r.params.has('month')){location.replace('#'+fundingDetailsPath(fq,parseInt(r.params.get('page'),10)||1));return;}state.query['funding-details']=fq;state.pages['funding-details']=Math.max(1,parseInt(r.params.get('page'),10)||1);}
    state.route=location.hash;
    switch(p[0]){
      case'overview':html=overview();break;
      case'management':html='<section class="panel">'+title('管理功能')+'</section>';break;
      case'taxpayers':html=taxpayerConfig();break;
      case'taxpayer-imports':html=taxpayerImports();break;
      case'taxpayer-batch':if(!p[1]){location.replace('#/taxpayer-batch/'+TB.create().id);return;}var task=TB.get(p[1]);if(task&&task.state==='checking'&&!state.taxRunning)TB.check(task.id);if(task&&task.state==='executing'&&!state.taxRunning)TB.execute(task.id);html=taxpayerBatchPage(p[1]);break;
      case'reissue-config':html=reissueConfigPage();break;
      case'month':html=monthly(p[1]);break;
      case'project':var oldProject=D.getProject(p[1]);if(oldProject){location.replace('#'+(p[2]?partnerMonthPath(oldProject.partner,p[2]):'/cooperator/'+oldProject.partner));return;}html=notFound();break;
      case'partner-month':html=partnerMonthly(p[1],p[2]);break;
      case'cooperators':html=cooperatorList();break;
      case'cooperator':html=cooperatorDetail(p[1]);break;
      case'partner-funding':location.replace('#'+fundingDetailsPath({partner:p[2],month:p[1],bill:r.params.get('bill'),item:r.params.get('item'),store:r.params.get('store'),kind:r.params.get('kind')}));return;
      case'funding-details':html=fundingDetailsPage();break;
      case'funding-detail':html=fundingDetailPage(p[1]);break;
      case'funding-item':html=fundingItemDetail(p[1]);break;
      case'funding-item-edit':location.replace('#/funding-item/'+p[1]);return;
      case'funding-seller-batch':if(!D.fundingItem(p[1])){html=notFound();break;}if(!p[2]){location.replace('#/funding-seller-batch/'+p[1]+'/'+SB.create(p[1]).id);return;}var sellerTask=SB.get(p[2]);if(!sellerTask||sellerTask.item!==p[1]){html=notFound();break;}if(sellerTask.state==='checking'&&!state.sellerBatchRunning)SB.check(p[2]);if(sellerTask.state==='executing'&&!state.sellerBatchRunning)SB.execute(p[2]);html=fundingSellerBatchPage(p[1],p[2]);break;
      case'settlement':html=settlement(p[1]);break;
      case'settlement-preissued':html=settlementPreissuedPage(p[1]);break;
      case'settlement-progress':location.replace('#'+contextualPath('/settlement/'+p[1]));return;
      case'application':html=application(p[1],p[2]);break;
      case'invoice-issue':html=invoiceIssue(p[1]);break;
      case'invoice':html=invoiceView(p[1],p[2]);break;
      case'funding':var legacy=D.getProject(p[2]);if(legacy){var pol=legacy.policies.find(function(x){return x.id===r.params.get('policy');});location.replace('#'+fundingDetailsPath({partner:legacy.partner,month:p[1],bill:r.params.get('bill'),item:pol?pol.sources.join(','):r.params.get('policy')||'',store:r.params.get('store'),kind:r.params.get('kind')}));return;}html=notFound();break;
      case'pending-refunds':
      case'refunds':location.replace('#'+fundingDetailsPath({month:p[1],kind:'refund'}));return;
      case'order':html=orderDetail(p[1]);break;
      case'projects':location.replace('#/cooperators');return;
      case'funding-items':html=fundingItemList();break;
      case'project-config':location.replace('#/funding-items');return;
      case'project-edit':location.replace('#/funding-items');return;
      case'partners':html=partnerList();break;
      case'partner':html=partnerDetail(p[1]);break;
      case'customer-category':html=categoryDetail(p[1]);break;
      case'small':
      case'small-task':
      case'preissued':location.replace('#'+fundingDetailsPath({month:r.params.get('bill')?'':r.params.get('month')||D.TODAY,bill:r.params.get('bill'),preStatus:r.params.get('failureStage')==='reversal'?'reverse_failed':r.params.get('status')||''}));return;
      case'preinvoice':if(r.params.get('tab')){html=preinvoiceView(p[1],r.params);break;}var legacyFunding=D.getRecord(p[1]);if(!legacyFunding){html=notFound();break;}location.replace('#'+fundingDetailsPath({month:legacyFunding.month,partner:D.partnerForRecord(legacyFunding),order:legacyFunding.order})+'&detail='+encodeURIComponent(p[1]));return;
      case'orders':html=orders();break;
      default:html=notFound();
    }
    main.innerHTML=html;$$('input[data-mixed]',main).forEach(function(x){x.indeterminate=true;});main.dataset.page=p[0];document.title=(p[0]==='invoice-issue'?'发起开票':$('h1',main)?.textContent||'平台开票管理')+' · 达美乐';
    $$('.table-wrap',main).forEach(function(w){function sync(){w.classList.toggle('scrolled',w.scrollWidth>w.clientWidth+1&&w.scrollLeft+w.clientWidth<w.scrollWidth-1);}w.addEventListener('scroll',sync);sync();});
    if(p[0]==='funding-details'&&r.params.get('detail')){location.replace('#'+fundingDetailPath(r.params.get('detail'),fundingDetailsPath(state.query['funding-details'],state.pages['funding-details'])));return;}
    if(keepScroll)window.scrollTo(0,scroll);else window.scrollTo(0,state.scrolls[location.hash]||0);
  }
  function navigate(path,force){
    path=contextualPath(path);
    if(state.dirty&&(state.draft||state.invoiceDraft)&&!force){
      syncInvoiceDraft();syncReissueConfig();openConfirm('放弃尚未保存的修改？','当前信息尚未保存，离开后修改将丢失。','放弃修改',function(){state.draft=null;state.invoiceDraft=null;state.dirty=false;closeLayer(true);navigate(path,true);});return;
    }
    if(location.hash==='#'+path)return;
    state.scrolls[location.hash]=window.scrollY;
    if(!path.startsWith('/project-edit/')&&!path.startsWith('/funding-item-edit/')&&path!=='/reissue-config')state.draft=null;
    if(!path.startsWith('/invoice-issue/'))state.invoiceDraft=null;
    if(!state.draft&&!state.invoiceDraft)state.dirty=false;
    location.hash=path;
  }
  function searchableSelect(id,value,opts,label){
    var html=select(id,value,opts,label);state.selects[id].searchable=true;return html.replace('aria-controls="'+e(id)+'-menu"','aria-controls="'+e(id)+'-options"');
  }
  function matchingSelectOptions(def,query){
    var key=String(query||'').trim().toLocaleLowerCase();
    return def.options.filter(function(o){return !o.value||!key||String(o.label).toLocaleLowerCase().includes(key);});
  }
  function selectOptionsHtml(def,opts){
    return opts.map(function(o){return '<button type="button" class="select-option" role="option" aria-selected="'+(String(o.value)===def.value)+'" data-option="'+e(def.id)+'" data-value="'+e(o.value)+'" title="'+e(o.label)+'">'+e(o.label)+'</button>';}).join('');
  }
  function filterSelect(id,query){
    var def=state.selects[id],menu=document.getElementById(id+'-menu');if(!def||!def.searchable||!menu)return;
    var opts=matchingSelectOptions(def,query);
    $('.select-options',menu).innerHTML=selectOptionsHtml(def,opts)+(String(query||'').trim()&&!opts.some(function(o){return !!o.value;})?'<div class="select-empty" role="status">未找到匹配的纳税人</div>':'');
  }
  function closeSelect(){
    if(state.selectOpen){var b=document.getElementById(state.selectOpen);if(b)b.setAttribute('aria-expanded','false');}
    $$('.select-menu').forEach(function(n){n.remove();});state.selectOpen=null;
  }
  function openSelect(id){
    closeOrdersDate();
    if(state.selectOpen===id){closeSelect();return;}
    closeSelect();var def=state.selects[id],button=document.getElementById(id);if(!def||!button)return;
    state.selectOpen=id;button.setAttribute('aria-expanded','true');
    var rect=button.getBoundingClientRect(),menu=document.createElement('div');menu.className='select-menu';menu.id=id+'-menu';menu.setAttribute('role','listbox');menu.setAttribute('aria-label',def.label);var menuWidth=def.scope==='pre-download'?Math.max(120,rect.width):rect.width;menu.style.width=menuWidth+'px';menu.style.left=(def.scope==='pre-download'?Math.min(rect.left,window.innerWidth-menuWidth-8):rect.left)+'px';
    var height=Math.min(256,def.options.length*32+2+(def.searchable?53:0)),top=rect.bottom+4;if(top+height>window.innerHeight-8)top=Math.max(8,rect.top-height-4);menu.style.top=top+'px';
    if(def.searchable){
      menu.classList.add('searchable-select-menu');menu.removeAttribute('role');menu.removeAttribute('aria-label');
      menu.innerHTML='<div class="select-search"><input class="input" type="search" autocomplete="off" aria-label="搜索税号或纳税人名称" placeholder="输入税号或纳税人名称" data-select-search="'+e(id)+'" aria-controls="'+e(id)+'-options"></div><div class="select-options" id="'+e(id)+'-options" role="listbox" aria-label="'+e(def.label)+'">'+selectOptionsHtml(def,def.options)+'</div>';
    }else menu.innerHTML=selectOptionsHtml(def,def.options);
    document.body.appendChild(menu);var selected=def.searchable?$('[data-select-search]',menu):($('[aria-selected=true]',menu)||$('.select-option',menu));if(selected)selected.focus({preventScroll:true});
  }
  function setSelect(id,value){
    var def=state.selects[id],button=document.getElementById(id),inputEl=$('input[name="'+id+'"]');if(!def||!button)return;var op=def.options.find(function(o){return String(o.value)===value;});
    if(def.scope==='pre-download'){closeSelect();downloadPreissued(def.invoiceId,value);button.focus({preventScroll:true});return;}
    def.value=value;if(inputEl)inputEl.value=value;$('span',button).textContent=op?op.label:'请选择';button.closest('.qfield')?.classList.toggle('filled',!!value);closeSelect();button.focus({preventScroll:true});
    if(def.scope==='year'){state.year=value;render(true);return;}
    if(def.scope==='page-size'){var key=id.slice(5);state.sizes[key]=Number(value);state.pages[key]=1;render(true);return;}
    if(def.scope==='form'){
      if(state.layer){state.layer.dirty=true;state.layer.values[id]=value;if(state.layer.fundingStoreSeller&&id==='seller')clearFundingStoreSellerError();if(state.layer.fundingPartner&&id==='partner')paintLayer();}

    }
  }
  function toast(text,error){
    var node=document.createElement('div');node.className='toast'+(error?' error':'');node.textContent=text;$('#message-root').appendChild(node);setTimeout(function(){node.remove();},3200);
  }
  function showLayer(spec){
    state.lastFocus=document.activeElement;state.layer=spec;
    state.layer.values=spec.values||{};state.layer.dirty=false;
    paintLayer();
  }
  function paintLayer(){
    var l=state.layer;if(!l)return;
    closeSelect();$('#shell').inert=true;document.body.style.overflow='hidden';
    var body=typeof l.body==='function'?l.body(l.values):l.body;
    overlayRoot.innerHTML='<div class="overlay" data-overlay="true"><section class="'+(l.drawer?'drawer'+(l.customer?' customer-drawer':''):'modal '+(l.size||''))+'" role="'+(l.confirm?'alertdialog':'dialog')+'" aria-modal="true" aria-labelledby="layer-title"><header class="overlay-header"><h2 id="layer-title">'+e(l.title)+'</h2><button class="icon-close" aria-label="关闭" data-action="close-layer">×</button></header><div class="overlay-body"><div id="layer-error"></div>'+body+'</div><footer class="overlay-footer">'+(l.readonly?'<button class="btn" data-action="close-layer">关闭</button>':'<button class="btn" data-action="close-layer" data-cancel>取消</button><button class="btn primary" data-action="layer-submit">'+e(l.submitLabel||'保存')+'</button>')+'</footer></section></div>';
    setTimeout(function(){if(state.layer!==l)return;var target=l.confirm?$('[data-cancel]',overlayRoot):l.fundingStoreSeller?$('input[name="sellerMode"]:checked',overlayRoot):$('input:not([type=hidden]),textarea,[role=combobox],button', $('.overlay-body',overlayRoot));(target||$('.icon-close',overlayRoot))?.focus();},0);
  }
  function syncLayer(){
    if(!state.layer)return;var v=state.layer.values,checks={};
    $$('input[name],textarea[name]',overlayRoot).forEach(function(x){if(x.type==='checkbox'){if(!checks[x.name])checks[x.name]=[];if(x.checked)checks[x.name].push(x.value);}else if(x.type==='radio'){if(x.checked)v[x.name]=x.value;}else v[x.name]=x.value;});Object.assign(v,checks);
  }
  function closeLayer(force){
    var l=state.layer;if(!l)return;
    if(l.busy)return;
    if(l.dirty&&!force){
      syncLayer();var saved=l;
      state.layer={title:'放弃尚未保存的修改？',body:'当前资料尚未保存，关闭后修改将丢失。',confirm:true,values:{},submitLabel:'放弃修改',submit:function(){state.layer=saved;state.layer.dirty=false;if(saved.afterDiscard)saved.afterDiscard();else closeLayer(true);},cancel:function(){state.layer=saved;paintLayer();}};
      paintLayer();return;
    }
    if(l.cancel&&!force){l.cancel();return;}
    overlayRoot.innerHTML='';state.layer=null;$('#shell').inert=false;document.body.style.overflow='';closeSelect();
    if(state.orderReissueNeedsRender){state.orderReissueNeedsRender=false;render(true);}
    var f=state.lastFocus;if(f&&f.isConnected)f.focus({preventScroll:true});else main.focus({preventScroll:true});
  }
  function openConfirm(titleText,body,label,callback){showLayer({title:titleText,body:body,confirm:true,submitLabel:label,submit:callback});}
  function layerError(message,name){
    $('#layer-error').innerHTML='<div class="notice error" style="margin:0 0 20px">'+e(message)+'</div>';
    $$('.field-error',overlayRoot).forEach(function(x){x.remove();});
    var inp=$('[name="'+name+'"]',overlayRoot);if(inp){inp.setAttribute('aria-invalid','true');var note=document.createElement('div');note.className='field-error';note.id='field-error-'+name;note.textContent=message;(inp.closest('.form-row')?.lastElementChild||inp.parentElement).appendChild(note);inp.setAttribute('aria-describedby',note.id);if(inp.type==='hidden')document.getElementById(name)?.focus();else inp.focus();}
  }
  var invoiceRemarkOptions=[{value:'buyerContact',label:'购买方地址、电话'},{value:'buyerBank',label:'购买方银行账户、开户银行'},{value:'sellerContact',label:'销售方地址、电话'},{value:'sellerBank',label:'销售方银行账户、开户银行'}];
  function customerInput(name,value,label,required,placeholder){return input(name,value,label,required).replace('autocomplete="off"','autocomplete="off" placeholder="'+e(placeholder||'请输入'+label)+'"');}
  function customerNote(name,value,label){return'<textarea class="textarea" id="'+e(name)+'" name="'+e(name)+'" aria-label="'+e(label)+'" placeholder="请输入'+e(label==='地址'?'地址':'备注')+'">'+e(value||'')+'</textarea>';}
  function invoiceValues(b){
    var v=clone(b||{name:'',tax:'',bank:'',bankAccount:'',phone:'',address:'',defaultType:'增值税普通发票',remarkOptions:[]});var emails=b?(b.emails||[b.email||'']):[''];if(!emails.length)emails=[''];v.emailCount=emails.length;emails.forEach(function(mail,i){v['customer-email-'+i]=mail;});v.defaultType=v.defaultType||'增值税普通发票';v['invoice-remark-options']=v.remarkOptions||[];return v;
  }
  function invoiceFields(v,target){
    var type='<div class="radio-group" role="radiogroup" aria-label="默认发票类型">'+[['增值税普通发票','普票'],['增值税专用发票','专票']].map(function(x){return'<label class="radio-row"><input type="radio" name="defaultType" value="'+x[0]+'"'+(v.defaultType===x[0]?' checked':'')+'><span>'+x[1]+'</span></label>';}).join('')+'</div>';
    var emails=Array.from({length:v.emailCount||1},function(_,i){return field(i?'':'接收邮箱','<div class="email-control">'+customerInput('customer-email-'+i,v['customer-email-'+i],'接收邮箱 '+(i+1),false,'请输入接收邮箱')+(i?'<button class="remove-email" type="button" aria-label="移除接收邮箱 '+(i+1)+'" data-action="customer-email-remove" data-id="'+i+'">×</button>':'')+'</div>');}).join('');
    return'<div class="invoice-form-section"><h3>发票抬头</h3>'+field('发票抬头名称',customerInput('name',v.name,'发票抬头名称',true),true)+field('税号',customerInput('tax',v.tax,'税号',true),true)+field('开户银行',customerInput('bank',v.bank,'开户银行'))+field('银行账号',customerInput('bankAccount',v.bankAccount,'银行账号'))+field('地址',customerNote('address',v.address,'地址'))+field('电话',customerInput('phone',v.phone,'电话'))+'</div><div class="invoice-form-section"><h3>发票类型</h3>'+field('默认发票类型',type,true)+'</div><div class="invoice-form-section"><h3>发票接收方式</h3>'+emails+field('', '<button type="button" class="dashed-add" data-action="customer-email-add"><span>＋</span>添加接收邮箱</button>')+'</div>';
  }
  function buyerFromValues(v,bid){
    if(!String(v.name||'').trim()){layerError('请填写发票抬头名称','name');return null;}
    if(!String(v.tax||'').trim()){layerError('请填写税号','tax');return null;}
    var emails=[];for(var i=0;i<(v.emailCount||1);i++){var email=String(v['customer-email-'+i]||'').trim();if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){layerError('请填写有效的接收邮箱','customer-email-'+i);return null;}if(email&&!emails.includes(email))emails.push(email);}
    return{id:bid||'buyer'+Date.now(),name:v.name.trim(),tax:v.tax.trim(),bank:v.bank||'',bankAccount:v.bankAccount||'',address:v.address||'',phone:v.phone||'',email:emails[0]||'',emails:emails,defaultType:v.defaultType||'增值税普通发票',remarkOptions:bid?(v['invoice-remark-options']||[]):[]};
  }
  function editPartner(id){
    var p=id?D.getPartner(id):{id:'partner'+Date.now(),name:'',code:'',alias:'',category:'',remark1:'',remark2:'',buyers:[]};
    var values=Object.assign(invoiceValues(),{'partner-name':p.name,'partner-code':p.code,'partner-alias':p.alias,'partner-category':p.category,'partner-remark1':p.remark1||'','partner-remark2':p.remark2||'',invoiceEnabled:false});
    showLayer({drawer:true,customer:true,title:id?'编辑客户信息':'创建客户',submitLabel:'确定',values:values,body:function(v){return'<form id="partner-form" novalidate><div class="form-group">'+(!id?'<h3>基础信息</h3>':'')+field('客户名称',customerInput('partner-name',v['partner-name'],'客户名称',true),true)+field('客户编号','<div class="customer-code-control">'+customerInput('partner-code',v['partner-code'],'客户编号',true,'请输入自定义客户编号')+'<span class="help-icon" title="用于识别客户的自定义编号，不可重复" tabindex="0" aria-label="客户编号说明">?</span></div>',true)+field('客户别称',customerInput('partner-alias',v['partner-alias'],'客户别称'))+field('客户分类','<div class="category-control">'+select('partner-category',v['partner-category'],db.categories,'客户分类').replace('>请选择<','>请选择客户分类<')+(!id?'<button type="button" class="link" data-action="category-from-customer">新增客户分类</button>':'')+'</div>',true)+field('备注1',customerNote('partner-remark1',v['partner-remark1'],'备注1'))+field('备注2',customerNote('partner-remark2',v['partner-remark2'],'备注2'))+'</div>'+(!id?'<div class="form-group"><div class="customer-group-head"><h3>发票信息 <small>向此客户开票时的购方信息</small></h3>'+(v.invoiceEnabled?'<button class="query-reset" type="button" data-action="customer-invoice-remove">取消</button>':'')+'</div>'+(v.invoiceEnabled?invoiceFields(v):'<button type="button" class="dashed-add" data-action="customer-invoice-add"><span>＋</span>添加发票信息</button>')+'</div>':'')+'</form>';},submit:function(v){
      if(!v['partner-name'].trim())return layerError('请填写客户名称','partner-name');
      if(!v['partner-code'].trim())return layerError('请填写客户编号','partner-code');
      if(!v['partner-category'])return layerError('请选择客户分类','partner-category');
      if(db.partners.some(function(x){return x.id!==p.id&&x.code===v['partner-code'].trim();}))return layerError('客户编号已存在','partner-code');
      var b;if(!id&&v.invoiceEnabled){b=buyerFromValues(v);if(!b)return;}
      p.name=v['partner-name'].trim();p.code=v['partner-code'].trim();p.alias=v['partner-alias'].trim();p.category=v['partner-category'];p.remark1=v['partner-remark1'];p.remark2=v['partner-remark2'];p.remark=p.remark1;
      if(!id){p.customerId=String(Date.now());p.createdAt=stamp()+':00';if(b)p.buyers=[b];db.partners.unshift(p);}D.save();closeLayer(true);render(true);toast('客户信息已保存');
    }});
  }
  function editCategory(id,fromCustomer){
    var c=id?db.customerCategories.find(function(x){return x.id===id;}):{id:'cat'+Date.now(),name:'',code:'',remark:'',createdAt:''},parent=null,parentFocus=null;
    if(fromCustomer){syncLayer();parent=state.layer;parentFocus=state.lastFocus;}
    function restore(){state.layer=parent;state.lastFocus=parentFocus;paintLayer();}
    showLayer({drawer:true,customer:true,title:id?'编辑客户分类':'创建客户分类',submitLabel:'确定',values:{'category-name':c.name,'category-code':c.code,'category-remark':c.remark},cancel:parent?restore:undefined,afterDiscard:parent?restore:undefined,body:function(v){return'<form novalidate>'+field('客户分类名称',customerInput('category-name',v['category-name'],'客户分类名称',true),true)+field('客户分类编号',customerInput('category-code',v['category-code'],'客户分类编号',true),true)+field('备注',customerNote('category-remark',v['category-remark'],'备注'))+'</form>';},submit:function(v){
      var name=v['category-name'].trim(),code=v['category-code'].trim();if(!name)return layerError('请填写客户分类名称','category-name');if(!code)return layerError('请填写客户分类编号','category-code');
      if(db.customerCategories.some(function(x){return x.id!==c.id&&x.name===name;}))return layerError('客户分类名称已存在','category-name');if(db.customerCategories.some(function(x){return x.id!==c.id&&x.code===code;}))return layerError('客户分类编号已存在','category-code');
      var oldName=c.name;c.name=name;c.code=code;c.remark=v['category-remark'];if(!id){c.createdAt=stamp()+':00';db.customerCategories.push(c);}else db.partners.filter(function(p){return p.category===oldName;}).forEach(function(p){p.category=name;});db.categories=db.customerCategories.map(function(x){return x.name;});D.save();
      if(parent){parent.values['partner-category']=name;parent.dirty=true;restore();}else{closeLayer(true);render(true);}toast('客户分类已保存');
    }});
  }
  function editBuyer(pid,cooperator){
    var p=D.getPartner(pid);if(!p)return;var b=p.buyers[0];
    showLayer({drawer:true,customer:true,title:b?'编辑发票信息':'添加发票信息',submitLabel:'确定',values:invoiceValues(b),body:function(v){return'<form novalidate>'+invoiceFields(v,cooperator?'合作伙伴':undefined)+'</form>';},submit:function(v){var updated=buyerFromValues(v,b&&b.id);if(!updated)return;if(cooperator)updated=Object.assign({},b||{},updated);p.buyers=[updated];db.projects.filter(function(x){return x.partner===pid;}).forEach(function(x){x.buyer=updated.id;});D.save();closeLayer(true);render(true);toast('发票信息已保存');}});
  }
  function issue(bid){if(canIssue(D.bill(bid)))navigate('/invoice-issue/'+bid);}
  var issueTimers=new Set();
  function finishIssue(bid,aid){
    var key=bid+'|'+aid;if(issueTimers.has(key))return;issueTimers.add(key);
    setTimeout(function(){issueTimers.delete(key);var b=D.bill(bid);if(!b)return;var id=aid||b.activeWorkflow||b.activeRequest,a=window.DemoSettlementWorkflow.find(b,id)||b.applications.find(function(x){return x.id===id;});if(!a)return;
      var result=window.DemoSettlementWorkflow?window.DemoSettlementWorkflow.advance(bid,id):{done:true,invoice:D.completeRequest(bid,id,true)};
      processPreissued();if(!state.layer&&!state.dirty)render(true);
      if(!result.done){finishIssue(bid,id);return;}
      if(a.batchId){var records=Object.values(db.months).flatMap(function(m){return m.bills.flatMap(function(b){return (b.workflowTasks||[]).filter(function(x){return x.batchId===a.batchId;});});});if(records.every(function(x){return x.status!=='processing';}))toast('批量处理结束：成功 '+records.filter(function(x){return x.status==='issued';}).length+' 张，失败 '+records.filter(function(x){return x.status==='failed';}).length+' 张');}
      else if(result.error)toast(result.error);else if(result.invoice)toast(result.invoice.tone==='red'?'开票已撤销，红票已生成':'平台发票已开具');
    },1000);
  }

  function download(name,content,type){
    var a=document.createElement('a');a.href=URL.createObjectURL(content instanceof Blob?content:new Blob(['\ufeff',content],{type:type||'text/csv;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
    db.exports.unshift({name:name,time:'2026-09-28 14:35',status:'已完成'});D.save();
  }
  function csv(rows){
    if(!rows.length)return '';
    var ids=['客户ID','客户 ID','项目编号','结算单号','所属结算单','申请任务号','任务号'];
    var order=columnOrder(rows[0].map(function(label){return{systemId:ids.includes(label)};}));
    return rows.map(function(row){return order.map(function(i){var x=row[i];return'"'+String(x==null?'':x).replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');
  }
  function moneyPlain(value){return(value/100).toFixed(2);}
  function exportSettlementRows(bills,name){
    var rows=[['月份','结算单号','销方名称','销方税号','购方名称','购方税号','开票项目名称','税收分类编码','税收分类简称','税率','发票类型','结算金额','调整差额','应开票金额','已开票金额','待开票金额','预票处理状态','正式开票状态']];
    bills.forEach(function(b){var t=D.totals([b]),seller=D.getSeller(b.seller),buyer=b.buyerSnapshot||D.getBuyer(D.getProject(b.project));rows.push([b.month,'JS'+b.id.replace(/-/g,'').toUpperCase(),seller.name,seller.tax,buyer.name,buyer.tax,b.item,b.taxCode,b.taxShortName||b.item,rateText(b.taxRate),b.invoiceType||D.getProject(b.project).invoiceType,moneyPlain(t.net),moneyPlain(t.adjustment),moneyPlain(t.expected),moneyPlain(t.issued),moneyPlain(t.unissued),preProcessMap[window.DemoSettlementWorkflow.preState(b).status][0],formalStateMap[D.formalStatus(b)][0]]);});
    var t=D.totals(bills);rows.push(['','','合计','','','','','','','','',moneyPlain(t.net),moneyPlain(t.adjustment),moneyPlain(t.expected),moneyPlain(t.issued),moneyPlain(t.unissued),'','']);
    download(name+'.csv',csv(rows));toast('结算单已导出');
  }
  function exportSettlements(pid,m){if(m<D.TODAY)exportSettlementRows(filteredSettlements(pid,m),m+'-'+(D.getPartner(pid)||D.getProject(pid)).name+'-结算单');}
  function invoiceSvg(inv){
    var buyer=inv.buyer,seller=inv.seller;
    var svg='<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="650" viewBox="0 0 1120 650"><rect width="1120" height="650" fill="white"/><g fill="#c92a2a" font-family="sans-serif"><text x="560" y="65" font-size="28" text-anchor="middle">电子发票样票</text><rect x="36" y="105" width="1048" height="455" fill="none" stroke="#c92a2a"/><text x="60" y="142" font-size="16">发票号码：'+e(inv.id)+'</text><text x="60" y="204" font-size="18">购买方：'+e(buyer.name)+'</text><text x="60" y="246" font-size="16">纳税人识别号：'+e(buyer.tax)+'</text><text x="60" y="312" font-size="18">销售方：'+e(seller.name)+'</text><text x="60" y="354" font-size="16">纳税人识别号：'+e(seller.tax)+'</text><text x="60" y="430" font-size="20">项目：'+e(D.invoiceItemLabel(inv))+'</text><text x="60" y="495" font-size="24">价税合计：¥ '+money(inv.amount)+'</text><text x="60" y="535" font-size="14">备注：'+e(inv.remark||'-')+'</text>'+(inv.tone==='red'?'<text x="760" y="440" font-size="36" opacity=".3">红字发票</text>':'')+'<text x="560" y="610" font-size="16" text-anchor="middle">样票 · 不作为真实税务凭证</text></g></svg>';
    return svg;
  }
  function invoiceDownload(bid,iid){
    var b=D.bill(bid),inv=b&&b.invoices.find(function(x){return x.id===iid;});if(!inv)return;
    download(inv.id+'-样票.svg',invoiceSvg(inv),'image/svg+xml;charset=utf-8');toast('发票样票已下载');
  }
  function sendInvoice(bid,iid){
    var b=D.bill(bid),inv=b.invoices.find(function(x){return x.id===iid;});
    showLayer({title:'发送电子发票',size:'standard',values:{email:inv.recipient||b.recipient},submitLabel:'发送',body:function(v){return field('接收邮箱',input('email',v.email,'接收邮箱',true,'email'),true);},submit:function(v){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))return layerError('请填写有效邮箱','email');inv.recipient=v.email;inv.recipients=[v.email];inv.sent=true;D.save();closeLayer(true);render(true);toast('电子发票已发送');}});
  }
  function monthly(m){
    var mod=D.month(m),t=D.monthTotal(m),key='month-'+m,current=mod.current,q=state.query[key]||{};
    var upper=breadcrumb([{name:ym(m)}])+'<section class="panel">'+periodHeader(ym(m),t,m,[],mod.future?'':btn('导出月度汇总','export-month',m));
    if(mod.future)return upper+'</section><section class="panel">'+title('合作伙伴')+empty('本月尚未开始')+'</section>';
    var missing=D.unassignedFunding(m);upper+=metricRows(t,current)+(current?'':summaryProgress(t,true))+(missing.count?'<div class="section secondary">未关联合作伙伴：'+count(missing.count)+' 条，出资净额 ¥ '+money(missing.amount)+'　'+link('查看明细',fundingDetailsPath({month:m,partner:'unassigned'}))+'</div>':'')+'</section>';
    var ps=monthPartners(m).filter(function(p){var t=D.totals(D.partnerBills(m,p.id));return(!q.name||(p.name+p.code).includes(q.name))&&(!q.status||q.status==='pending'&&t.pendingCount>0||q.status==='errors'&&t.failed>0||q.status==='done'&&t.pendingCount===0);});
    var cols=[{label:'合作伙伴',width:180},{label:'平台出资金额',numeric:true,width:150},{label:'平台出资退款金额',numeric:true,width:170},{label:'平台出资净额',numeric:true,width:150}];
    if(!current)cols=cols.concat([{label:'应开票金额',numeric:true,width:180},{label:'已开票金额',numeric:true,width:145},{label:'待开票金额',numeric:true,width:145},{label:'结算单数',numeric:true,width:100},{label:'处理状态',width:125}]);cols.push({label:'操作',action:true,width:80});
    var rows=ps.map(function(p){var t=D.totals(D.partnerBills(m,p.id)),row=[link(p.name,partnerMonthPath(p.id,m)),moneycell(t.positive),moneycell(t.negative),moneycell(t.net)];if(!current)row=row.concat([expectedCell(t),moneycell(t.issued),moneycell(t.unissued),count(t.billCount),projectProcessing(t)]);return row.concat([link('查看',partnerMonthPath(p.id,m))]);});
    var fields=[{key:'name',label:'合作伙伴名称或编号'}];if(!current)fields.push({key:'status',label:'处理状态',options:[{value:'pending',label:'有待处理'},{value:'errors',label:'有异常'},{value:'done',label:'已完成'}]});
    return upper+'<section class="panel">'+title('合作伙伴')+query(key,fields)+table(cols,rows,'未找到符合条件的合作伙伴',current?850:1450)+'<div class="table-bottom-space"></div></section>';
  }
  function monthPartners(m){var ids=new Set(m>=D.TODAY?D.findSegments(m,null,{}).map(function(x){return D.fundingItem(x.segment.source)?.partner;}):D.month(m).bills.map(D.partnerId));return db.partners.filter(function(p){return ids.has(p.id);});}
  function partnerMonthPath(pid,m){return '/partner-month/'+pid+'/'+m;}
  function partnerMonthly(pid,m){
    var p=D.getPartner(pid);if(!p)return notFound();var bills=D.partnerBills(m,pid),t=D.totals(bills),current=m>=D.TODAY,key='bills-'+pid+'-'+m,tabKey='partner-month-'+pid+'-'+m,tab=state.tabs[tabKey]||'bills';
    var html=breadcrumb([{name:ym(m),path:'/month/'+m},{name:p.name}])+'<section class="panel">'+periodHeader(p.name,t,m,[ym(m)],link('查看合作伙伴','/cooperator/'+pid)+btn('导出月度汇总','export-partner-month',pid+'|'+m))+metricRows(t,current)+'</section>';
    html+='<section class="panel"><div class="tabs" role="tablist" aria-label="合作伙伴月度汇总">'+[['bills','结算单'],['items','平台出资项汇总']].map(function(x){return'<button role="tab" aria-selected="'+(tab===x[0])+'" data-tab="'+tabKey+'|'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>';
    if(tab==='items')return html+fundingItemsSummary(bills,pid,m)+'</section>';
    if(current)return html+empty('本月结算单未生成')+'</section>';
    var shown=filteredSettlements(pid,m),selected=syncBillSelection(key,shown),amount=D.sum(shown.filter(function(b){return selected.includes(b.id);}),function(b){return b.invoiceAmount;});
    return html+query(key,[{key:'name',label:'销方名称'},{key:'tax',label:'销方税号'},{key:'preStatus',label:'预票处理状态',options:Object.keys(preProcessMap).map(function(k){return{value:k,label:preProcessMap[k][0]};})},{key:'formalStatus',label:'正式开票状态',options:Object.keys(formalStateMap).map(function(k){return{value:k,label:formalStateMap[k][0]};})}])+billBatchToolbar(pid,m,selected,amount)+tableInsideBillGroups(shown,state.billBatchModes[key]?key:null)+'<div class="table-bottom-space"></div></section>';
  }
  function fundingItemsSummary(bills,pid,m,bid){
    var groups=D.fundingSummaries(bills),rows=groups.map(function(g){return[link(g.name,'/funding-item/'+g.id),e(g.id),count(g.count),moneycell(g.positive),moneycell(g.negative),moneycell(g.net),link('查看明细',fundingDetailsPath({partner:pid,month:m,item:g.id,bill:bid||''}))];});
    return (bid?'':'<div class="toolbar actions-only">'+btn('导出出资明细','export-partner-funding',pid+'|'+m+'|')+'</div>')+table([{label:'平台出资项',width:200},{label:'编号',width:130},{label:'出资明细数',numeric:true,width:120},{label:'平台出资金额',numeric:true,width:155},{label:'平台出资退款金额',numeric:true,width:175},{label:'平台出资净额',numeric:true,width:155},{label:'操作',action:true,width:100}],rows,'暂无出资明细',1035)+'<div class="table-bottom-space"></div>';
  }
  function saveCooperator(id,v){
    var p=id?D.getPartner(id):null;if(id&&!p)throw Error('合作伙伴不存在');
    var name=String(v['cooperator-name']||'').trim(),code=String(v['cooperator-code']||'').trim();
    if(!name)throw Error('请填写合作伙伴名称');if(!code)throw Error('请填写合作伙伴编号');
    if(db.partners.some(function(x){return x.id!==id&&x.code===code;}))throw Error('合作伙伴编号已存在');
    var initialBuyer;if(!id){initialBuyer=buyerFromValues(v);if(!initialBuyer)return null;}
    if(!p)p={id:'partner'+Date.now(),createdAt:stamp()+':00',buyers:[initialBuyer]};
    p.name=name;p.code=code;p.alias=String(v['cooperator-alias']||'').trim();p.category=p.category||'';p.remark1=String(v['cooperator-remark1']||'');p.remark2=String(v['cooperator-remark2']||'');p.remark=p.remark1;
    if(!id)db.partners.unshift(p);D.save();return p;
  }
  function editCooperator(id){var p=id?D.getPartner(id):{name:'',code:'',alias:'',category:'',remark1:'',remark2:''};if(!p)return;
    var values=Object.assign(id?{}:invoiceValues(),{'cooperator-name':p.name,'cooperator-code':p.code,'cooperator-alias':p.alias||'','cooperator-remark1':p.remark1||'','cooperator-remark2':p.remark2||''});
    showLayer({drawer:true,customer:true,title:id?'编辑合作伙伴':'新增合作伙伴',submitLabel:'确定',values:values,body:function(v){return '<form id="cooperator-form" novalidate><div class="form-group">'+(!id?'<h3>基础信息</h3>':'')+field('合作伙伴名称',customerInput('cooperator-name',v['cooperator-name'],'合作伙伴名称',true),true)+field('合作伙伴编号',customerInput('cooperator-code',v['cooperator-code'],'合作伙伴编号',true),true)+field('别称',customerInput('cooperator-alias',v['cooperator-alias'],'别称'))+field('备注1',customerNote('cooperator-remark1',v['cooperator-remark1'],'备注1'))+field('备注2',customerNote('cooperator-remark2',v['cooperator-remark2'],'备注2'))+'</div>'+(!id?'<div class="form-group"><h3>发票信息</h3>'+invoiceFields(v,'合作伙伴')+'</div>':'')+'</form>';},submit:function(v){try{var saved=saveCooperator(id,v);if(!saved)return;closeLayer(true);if(!id){state.tabs['cooperator-'+saved.id]='info';navigate('/cooperator/'+saved.id);}else render(true);toast('合作伙伴资料已保存');}catch(err){layerError(err.message,err.message.includes('名称')?'cooperator-name':'cooperator-code');}}});
  }
  function cooperatorInformation(p){var b=p.buyers[0];
    var html=title('合作伙伴资料',action('编辑','cooperator-edit',p.id))+'<div class="section">'+info([['名称',e(p.name)],['编号',e(p.code)],['别称',e(p.alias||'—')],['备注1',e(p.remark1||'—')],['备注2',e(p.remark2||'—')]])+'</div>'+title('发票信息',action(b?'编辑':'添加','cooperator-invoice',p.id));
    if(!b)return html+'<div class="section secondary">尚未维护购方发票信息</div>';
    return html+'<div class="section cooperator-invoice-info">'+info([['发票抬头名称',e(b.name)],['税号',e(b.tax)],['默认发票类型',e(b.defaultType||'—')],['地址',e(b.address||'—')],['电话',e(b.phone||'—')],['开户银行',e(b.bank||'—')],['银行账号',e(b.bankAccount||'—')],['接收邮箱',e((b.emails||[b.email]).filter(Boolean).join('、')||'—')]])+'</div>';
  }
  function cooperatorList(){
    var key='cooperators',q=state.query[key]||{},items=db.partners.filter(function(p){return!q.name||(p.name+p.code).includes(q.name);});
    return '<section class="panel">'+title('合作伙伴')+query(key,[{key:'name',label:'合作伙伴名称或编号'}])+'<div class="toolbar actions-only">'+btn('新增合作伙伴','cooperator-new','',true)+'</div>'+table([{label:'合作伙伴',width:220},{label:'编号',width:140},{label:'平台出资项数',numeric:true,width:140},{label:'操作',action:true,width:100}],items.map(function(p){return[link(p.name,'/cooperator/'+p.id),e(p.code),String(D.partnerFundingItems().filter(function(x){return x.partner===p.id;}).length),link('查看','/cooperator/'+p.id)+' '+action('编辑','cooperator-edit',p.id)];}),'暂无合作伙伴',840)+'<div class="table-bottom-space"></div></section>';
  }
  function cooperatorDetail(pid){
    var p=D.getPartner(pid);if(!p)return notFound();var key='cooperator-'+pid,tab=state.tabs[key]||'months',tabs='<div class="tabs" role="tablist" aria-label="合作伙伴详情">'+[['months','月度汇总'],['items','平台出资项'],['info','基础资料']].map(function(x){return'<button role="tab" aria-selected="'+(tab===x[0])+'" data-tab="'+key+'|'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>';
    var html=customBreadcrumb([{name:'合作伙伴',path:'/cooperators'},{name:p.name}])+'<section class="panel">'+title(p.name,'',p.code)+tabs+'</section><section class="panel">';
    if(tab==='info')return html+cooperatorInformation(p)+'</section>';
    if(tab==='items')return html+title('平台出资项')+fundingItemTable(D.partnerFundingItems().filter(function(x){return x.partner===pid;}))+'<div class="table-bottom-space"></div></section>';
    var months=[D.TODAY].concat(D.historyMonths().reverse()).filter(function(m){return D.partnerBills(m,pid).length;});
    return html+title('月度汇总')+table([{label:'月份',width:160},{label:'平台出资净额',numeric:true,width:180},{label:'应开票金额',numeric:true,width:180},{label:'已开票金额',numeric:true,width:180},{label:'待开票金额',numeric:true,width:180},{label:'处理状态',width:150},{label:'操作',action:true,width:100}],months.map(function(m){var t=D.totals(D.partnerBills(m,pid));return[link(ym(m),partnerMonthPath(pid,m)),moneycell(t.net),m>=D.TODAY?'—':expectedCell(t),m>=D.TODAY?'—':moneycell(t.issued),m>=D.TODAY?'—':moneycell(t.unissued),summaryStatus(t,m),link('查看月份',partnerMonthPath(pid,m))];}),'暂无月度数据',1130)+'<div class="table-bottom-space"></div></section>';
  }
  function fundingItemTable(items){return table([{label:'编号',width:130},{label:'名称',width:210},{label:'描述',width:350},{label:'合作伙伴',width:160},{label:'开票规则',width:120},{label:'操作',action:true,width:130}],items.map(function(x){var p=D.getPartner(x.partner);return[e(x.code),link(x.name,'/funding-item/'+x.code),e(x.description),p?link(p.name,'/cooperator/'+p.id):'未配置',D.itemRuleReady(x)&&p&&p.buyers[0]?.tax?'已配置':'待配置',link('查看','/funding-item/'+x.code)+' '];}),'未找到符合条件的平台出资项',1100);}
  function fundingItemList(){var key='funding-items',q=state.query[key]||{},items=D.partnerFundingItems().filter(function(x){return(!q.code||x.code.includes(q.code))&&(!q.name||x.name.includes(q.name))&&(!q.partner||(q.partner==='unassigned'?!x.partner:x.partner===q.partner));}),page=state.pages[key]||1;return'<section class="panel">'+title('平台出资项')+query(key,[{key:'code',label:'编号'},{key:'name',label:'名称'},{key:'partner',label:'合作伙伴',options:[{value:'unassigned',label:'未关联合作伙伴'}].concat(db.partners.map(function(p){return{value:p.id,label:p.name};}))}])+fundingItemTable(items.slice((page-1)*10,page*10))+(items.length?pagination(key,items.length,10):'<div class="table-bottom-space"></div>')+'</section>';}
  function fundingStoresSection(code){var key='funding-stores-'+code,q=state.query[key]||{},page=state.pages[key]||1,data=D.fundingStoreRows(code,q,page,10);if(page>Math.max(1,Math.ceil(data.total/10))){page=1;state.pages[key]=1;data=D.fundingStoreRows(code,q,page,10);}
    return '<section class="panel">'+title('门店销方',link('Excel 批量设置','/funding-seller-batch/'+code,'btn'))+query(key,[{key:'name',label:'门店名称'},{key:'code',label:'门店号'},{key:'sellerMode',label:'销售方取值',options:[{value:'store',label:'同门店开票'},{value:'fixed',label:'指定销售方'}]}])+table([{label:'门店号',width:120},{label:'门店名称',width:210},{label:'销售方取值',width:140},{label:'开票销售方',width:350},{label:'操作',action:true,width:90}],data.rows.map(function(row){return[e(row.store.id),e(row.store.name),row.override?'指定销售方':'同门店开票',row.seller?party(row.seller):'未设置',action('修改','funding-store-seller',code+'|'+row.store.id)];}),'未找到符合条件的门店',910)+pagination(key,data.total,10)+'</section>';
  }
  function fundingItemDetail(code){var x=D.fundingItem(code);if(!x)return notFound();var p=D.getPartner(x.partner),r=x.rule||{},buyer=p&&p.buyers[0];return customBreadcrumb([{name:'平台出资项',path:'/funding-items'},{name:x.name}])+'<section class="panel">'+title('平台出资项',action('编辑','funding-basic',code))+'<div class="section">'+info([['编号',e(code)],['名称',e(x.name)],['描述',e(x.description)]])+'</div></section><section class="panel">'+title('合作伙伴',action('编辑','funding-partner',code))+'<div class="section">'+info([['合作伙伴',p?link(p.name,'/cooperator/'+p.id):'未关联'],['购买方',buyer?party(buyer):'未设置']])+'</div></section><section class="panel">'+title('开票规则',action('编辑','funding-rule',code))+'<div class="section">'+info([['开票项目名称',e(r.item||'未设置')],['税收分类编码',e(r.taxCode||'未设置')],['税收分类简称',e(r.taxShortName||'未设置')],['税率',r.taxRate==null?'未设置':rateText(r.taxRate)],['发票种类',e(r.invoiceType||'未设置')],['结算周期','自然月']])+'</div></section>'+fundingStoresSection(code);}
  function applyItemBuyerDefaults(v){var p=D.getPartner(v.partner),buyer=p&&p.buyers[0];v.rule.buyer=buyer?buyer.id:'';if(buyer)v.rule.invoiceType=buyer.defaultType||'';}
  function itemBuyerInformation(v){var p=D.getPartner(v.partner),b=p&&p.buyers[0];if(!b)return '';var values=[['地址',b.address],['电话',b.phone],['开户银行',b.bank],['银行账号',b.bankAccount]];values=values.filter(function(x){return !!x[1];});return values.length?'<div class="buyer-default-info">'+info(values.map(function(x){return[x[0],e(x[1])];}))+'</div>':'';}
  function editFundingBasic(code){var item=D.fundingItem(code);if(!item)return;showLayer({title:'编辑基本信息',size:'standard',values:{name:item.name,description:item.description||''},submitLabel:'保存',body:function(v){return field('编号',e(code))+field('名称',input('name',v.name,'名称',true),true)+field('描述','<textarea class="textarea" name="description" aria-label="描述">'+e(v.description)+'</textarea>');},submit:function(v){try{D.saveFundingItemBasic(code,v);closeLayer(true);render(true);toast('基本信息已保存');}catch(err){layerError(err.message,'name');}}});}
  function editFundingRule(code){var item=D.fundingItem(code);if(!item)return;var r=item.rule||{},p=D.getPartner(item.partner),buyer=p&&p.buyers[0];showLayer({title:'编辑开票规则',size:'standard',values:{item:r.item||'',taxCode:r.taxCode||'',taxRate:r.taxRate==null?'':String(r.taxRate),invoiceType:r.invoiceType||buyer&&buyer.defaultType||''},submitLabel:'保存',body:function(v){return '<form id="funding-rule-form" novalidate>'+field('开票项目名称',input('item',v.item,'开票项目名称'))+field('税收分类编码',input('taxCode',v.taxCode,'税收分类编码'))+field('税收分类简称','<output id="funding-rule-short">'+e(D.lookupTaxCode(v.taxCode)?.shortName||'—')+'</output>')+field('税率',select('taxRate',v.taxRate,D.taxRates.map(function(n){return{value:String(n),label:n+'%'};}),'税率'))+field('发票种类',select('invoiceType',v.invoiceType,['增值税普通发票','增值税专用发票'],'发票种类'))+field('结算周期','自然月')+'</form>';},submit:function(v){try{D.saveFundingItemRule(code,v);closeLayer(true);render(true);toast('开票规则已保存');}catch(err){layerError(err.message,err.message.includes('编码')?'taxCode':null);}}});}
  function editFundingPartner(code){var x=D.fundingItem(code);if(!x)return;showLayer({title:'编辑合作伙伴',fundingPartner:true,size:'standard',values:{partner:x.partner||''},submitLabel:'保存',body:function(v){var p=D.getPartner(v.partner),buyer=p&&p.buyers[0];return field('合作伙伴',select('partner',v.partner,[{value:'',label:'暂不设置'}].concat(db.partners.map(function(p){return{value:p.id,label:p.name};})),'合作伙伴'))+field('购买方',buyer?party(buyer):'未设置');},submit:function(v){try{D.saveFundingItemPartner(code,v.partner||'');closeLayer(true);render(true);toast('合作伙伴已保存');}catch(err){layerError(err.message);}}});}
  function clearFundingStoreSellerError(){
    $('#layer-error').innerHTML='';$$('.field-error',overlayRoot).forEach(function(n){n.remove();});$$('[aria-invalid]',overlayRoot).forEach(function(n){n.removeAttribute('aria-invalid');n.removeAttribute('aria-describedby');});
  }
  function fundingStoreSellerValue(v,sid){
    var st=D.getStore(sid),seller=st&&D.getSeller(st.seller);
    return v.sellerMode==='fixed'?field('开票销售方',searchableSelect('seller',v.seller,D.sellers.map(function(s){return{value:s.id,label:s.name+' · '+s.tax};}),'销售方'),true):field('开票销售方',seller?party(seller):'未设置');
  }
  function editFundingStoreSeller(code,sid){
    var item=D.fundingItem(code),st=D.getStore(sid);if(!item||!st)return;
    var current=(item.storeSellers||{})[sid]||'';
    showLayer({title:'修改门店销方',size:'standard',fundingStoreSeller:sid,values:{sellerMode:current?'fixed':'store',seller:current},submitLabel:'保存',body:function(v){
      var modes='<div class="radio-group" role="radiogroup" aria-label="销售方取值">'+[['store','同门店开票'],['fixed','指定销售方']].map(function(x){return '<label class="radio-row"><input type="radio" name="sellerMode" value="'+x[0]+'"'+(v.sellerMode===x[0]?' checked':'')+'><span>'+x[1]+'</span></label>';}).join('')+'</div>';
      return '<form id="funding-store-seller-form" novalidate>'+field('门店',e(st.name+' · '+st.id))+field('销售方',modes)+'<div id="funding-store-seller-value">'+fundingStoreSellerValue(v,sid)+'</div></form>';
    },submit:function(v){try{
      if(v.sellerMode==='fixed'&&!v.seller){layerError('请选择销售方','seller');return;}
      D.setFundingStoreSellers(code,[{store:sid,seller:v.sellerMode==='fixed'?v.seller:''}]);closeLayer(true);render(true);toast('门店销方已保存');
    }catch(err){layerError(err.message,'seller');}}});
  }
  function fundingItemEdit(code){return fundingItemDetail(code);}
  function fundingDetailsPath(q,page){q=D.normalizeFundingQuery(q);var params=new URLSearchParams();['order','partner','dateFrom','dateTo','bill','item','store','preStatus','kind'].forEach(function(k){var v=String(q&&q[k]||'').trim();if(v){if(k==='bill'&&/^\d{4}-\d{2}-/.test(v))v='JS'+v.replace(/-/g,'').toUpperCase();params.set(k,v);}});if(page>1)params.set('page',String(page));return '/funding-details'+(params.toString()?'?'+params.toString():'');}
  function applyFundingQuery(q,page){q=D.normalizeFundingQuery(q);var path=fundingDetailsPath(q,page),clean={};new URLSearchParams(path.split('?')[1]||'').forEach(function(v,k){if(k!=='page')clean[k]=v;});state.query['funding-details']=clean;state.pages['funding-details']=page||1;if(location.hash==='#'+path)render(true);else navigate(path);}
  function fundingOrderLink(r,q,page){var params=new URLSearchParams({from:'funding-details',returnTo:fundingDetailsPath(q,page)});return '/order/'+r.id+'?'+params.toString();}
  var fundingPreMap={none:['未申请','default'],processing:['开票中','processing'],failed:['开票失败','error'],completed:['已开票','success'],revoking:['撤销中','processing'],reverse_failed:['撤销失败','error'],revoked:['已撤销','default']};
  function fundingPreStatus(r){if(r.kind!=='positive')return 'na';return P.application(r.id)?.applicationStatus||'none';}
  function fundingPreBadge(r){var key=fundingPreStatus(r);return key==='na'?'<span class="secondary">—</span>':stateBadge(fundingPreMap[key]);}
  function fundingRowActions(r){var result=link('查看',fundingDetailPath(r.id,fundingDetailsPath(state.query['funding-details']||{},state.pages['funding-details']||1))),s=fundingPreStatus(r);if(['failed','reverse_failed'].includes(s))result+=' '+action('失败原因','pre-failure',r.id)+' '+action(s==='failed'?'重试开票':'重试撤销','pre-retry',r.id);else if(['processing','revoking'].includes(s))result+=' '+action('刷新','pre-refresh',r.id);return '<div class="row-actions">'+result+'</div>';}
  var TB=window.DemoTaxpayerBatch,SB=window.DemoFundingSellerBatch;
  function filteredTaxpayers(){var q=state.query.taxpayers||{};return D.sellers.filter(function(s){return(!q.name||s.name.includes(q.name))&&(!q.tax||s.tax.includes(q.tax))&&(!q.instant||(TB.enabled(s.tax)?'on':'off')===q.instant);});}
  function exportTaxpayers(){download('纳税人配置.csv',csv([['纳税人名称','税号','纳税人状态','交易即开票']].concat(filteredTaxpayers().map(function(s){return[s.name,s.tax,'启用',TB.enabled(s.tax)?'已开启':'未开启'];}))));toast('纳税人配置已导出');}
  function taxpayerConfig(){var key='taxpayers',rows=filteredTaxpayers().map(function(s){return[e(s.name),e(s.tax),'启用',TB.enabled(s.tax)?'已开启':'未开启'];});
    return '<section class="panel">'+title('纳税人配置')+query(key,[{key:'name',label:'纳税人名称'},{key:'tax',label:'税号'},{key:'jurisdiction',label:'属地',options:['广东省税务局','陕西省税务局','深圳市税务局','河南省税务局','大连市税务局','内蒙古自治区税务局']},{key:'warning',label:'预警状态',options:['正常','预警']},{key:'taxpayerStatus',label:'纳税人状态',options:['启用','停用']},{key:'instant',label:'交易即开票',options:[{value:'on',label:'已开启'},{value:'off',label:'未开启'}]},{key:'store',label:'门店名或门店号'}])+'<div class="toolbar"><div class="actions"><button class="btn primary" disabled>新增纳税人</button><button class="btn primary" disabled>通知邮箱设置</button>'+link('批量设置交易即开票','/taxpayer-batch','btn primary')+'</div><div class="grow"></div>'+btn('导出','tax-export')+'</div>'+table([{label:'纳税人名称',width:320},{label:'税号',width:260},{label:'纳税人状态',width:160},{label:'交易即开票',width:180}],rows,'未找到符合条件的纳税人',920)+'</section>';
  }
  var taxpayerTaskLabels={empty:'待上传',uploading:'上传中',uploaded:'待检查','upload-failed':'上传失败',checking:'检查中','check-passed':'待执行','check-failed':'检查未通过',executing:'执行中','execute-succeeded':'执行成功','execute-failed':'执行失败'};
  function taxpayerImports(){return customBreadcrumb([{name:'纳税人配置',path:'/taxpayers'},{name:'导入记录'}])+'<section class="panel">'+title('导入记录',link('批量设置交易即开票','/taxpayer-batch','btn primary'))+table([{label:'创建时间',width:200},{label:'文件名称',width:330},{label:'状态',width:150},{label:'数据条数',numeric:true,width:120},{label:'操作',action:true,width:100}],TB.tasks().filter(function(t){return t.file;}).map(function(t){return[e(t.createdAt),e(t.file.name),e(taxpayerTaskLabels[t.state]),t.report?String(t.report.total):'—',link('查看','/taxpayer-batch/'+t.id)];}),'暂无导入记录',920)+'</section>';}
  function taxpayerBatchSteps(t){var n=['empty','uploading','uploaded','upload-failed'].includes(t.state)?0:['checking','check-passed','check-failed'].includes(t.state)?1:2;return '<nav class="tax-batch-steps" aria-label="批量设置步骤">'+['上传文件','检查文件','执行'].map(function(name,i){var status=t.state==='execute-succeeded'||i<n?'finish':i===n?'process':'wait';if(i===2&&t.state==='execute-failed')status='error';return(i?'<img class="step-arrow '+(i<=n?'complete':'')+'" src="assets/meta/steps-right.svg" alt="">':'')+'<div class="tax-batch-step '+status+'"'+(i===n?' aria-current="step"':'')+'><span class="step-circle">'+(status==='finish'?'<img src="assets/meta/steps-check.svg" alt="已完成">':status==='error'?'!':i+1)+'</span><span>'+name+'</span></div>';}).join('')+'</nav>';}
  function taxpayerBatchFile(t){return '<div class="tax-batch-file"><img src="assets/meta/import/file-xlsx.svg" alt="XLSX 文件"><p>'+e(t.file?.name||'')+'</p><p class="secondary">'+((t.file?.size||0)/1024).toFixed(1)+' KB</p></div>';}
  function fundingSellerBatchPage(code,id){var t=SB.get(id);if(!t)return notFound();var body='',buttons='',first=['empty','uploading','uploaded','upload-failed'].includes(t.state);
    if(first){body='<div class="tax-batch-box"><h2>1. 下载导入模板，根据模板提示完善内容</h2><button class="btn tax-template" data-action="seller-template"><img src="assets/meta/import/file-text.svg" alt="">下载模板</button><p class="secondary">填写出资项编号、门店号、销售方税号三列；出资项编号需与当前出资项一致。</p></div><div class="tax-batch-box"><h2>2. 上传完善后的内容，支持扩展名：xlsx</h2><div class="tax-upload-zone" data-seller-drop="'+e(id)+'">'+(t.file?taxpayerBatchFile(t):'<img class="upload-icon" src="assets/meta/import/upload-file.svg" alt=""><p>选择或拖拽文件到此处</p>')+'<input id="seller-batch-file" type="file" accept=".xlsx" hidden data-task="'+e(id)+'"><button class="btn" data-action="seller-file"'+(t.state==='uploading'?' disabled':'')+'>'+(t.file?'重新选择':'选择文件')+'</button></div>'+(t.state==='uploading'||t.state==='uploaded'?'<div class="tax-upload-progress '+(t.state==='uploading'?'loading':'done')+'" aria-label="'+(t.state==='uploading'?'文件读取中':'文件已就绪')+'"></div>':'')+(t.error?'<p class="error-text" role="alert">'+e(t.error)+'</p>':'')+'</div>';buttons='<button class="btn primary" data-action="seller-check" data-id="'+id+'"'+(t.state!=='uploaded'?' disabled':'')+'>开始导入</button>';}
    else if(['checking','executing'].includes(t.state)){body='<div class="tax-batch-box">'+taxpayerBatchFile(t)+'</div><div class="tax-batch-loading" role="status" aria-live="polite" aria-busy="true"><span class="tax-spinner"></span><span class="sr-only">'+(t.state==='checking'?'文件检查中，请稍候':'执行中，请稍候')+'</span></div>';}
    else if(['check-passed','check-failed'].includes(t.state)){var report=t.report;body='<div class="tax-batch-box">'+taxpayerBatchFile(t)+'<div class="tax-check-result"><h2>'+(report.passed?'请确认文件检查结果':'<img src="assets/meta/status/处理失败.svg" alt="">检查未通过')+'</h2><p>文件可识别数据 '+report.total+' 条，'+report.valid+' 条可执行'+(report.invalid?'，'+report.invalid+' 条不可执行':'')+'。</p>'+(report.errors.length||report.invalid?'<ul>'+report.errors.map(function(x){return '<li>'+e(x)+'</li>';}).join('')+report.records.filter(function(r){return r.causes.length;}).map(function(r){return '<li>第 '+r.line+' 行：'+e(r.causes.join('；'))+'</li>';}).join('')+'</ul>':'<p class="secondary">请确认后执行，设置将按文件内容更新。</p>')+btn('下载检查报告','seller-report',id)+'</div></div>';buttons=btn('重新上传','seller-reset',id,!report.passed)+(report.passed?btn('立即执行','seller-execute',id,true):'');}
    else{body='<div class="tax-batch-box tax-batch-result"><img src="assets/meta/status/'+(t.state==='execute-succeeded'?'处理完成':'处理失败')+'.svg" alt=""><h2>'+e(taxpayerTaskLabels[t.state])+'</h2><p>'+e(t.state==='execute-succeeded'?'已完成 '+t.report.total+' 家门店的销方设置。':t.error||'设置失败，请查看原因后重试')+'</p></div>';buttons=link('返回出资项','/funding-item/'+code,'btn primary');}
    return customBreadcrumb([{name:'平台出资项',path:'/funding-items'},{name:D.fundingItem(code).name,path:'/funding-item/'+code},{name:'批量设置门店销方'}])+'<section class="panel tax-batch-panel">'+title('批量设置门店销方')+'<div class="section secondary" style="padding-top:0">'+e(D.fundingItem(code).name)+' · '+e(code)+'</div>'+taxpayerBatchSteps(t)+'<div class="tax-batch-body">'+body+'<div class="tax-batch-actions">'+buttons+'</div></div></section>';
  }
  async function fundingSellerSelectFile(id,files){if(!files||!files.length)return;if(files.length!==1){toast('每次只能上传一个 XLSX 文件');return;}try{var pending=SB.upload(id,files[0]);render(true);await pending;if(route().parts[0]==='funding-seller-batch'&&route().parts[2]===id)render(true);}catch(err){toast(err.message);}}
  async function fundingSellerTemplate(){var b=$('[data-action="seller-template"]');if(b)b.disabled=true;try{download('门店销方设置模板.xlsx',await SB.workbook(),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');}catch(err){toast('模板下载失败，请重试');}finally{if(b)b.disabled=false;}}
  function fundingSellerRun(id,execute){var t=SB.get(id);if(!t||t.state!==(execute?'check-passed':'uploaded'))return;t.state=execute?'executing':'checking';state.sellerBatchRunning=true;D.save();render(true);setTimeout(function(){try{execute?SB.execute(id):SB.check(id);state.sellerBatchRunning=false;if(route().parts[2]===id){if(t.state==='execute-succeeded'){navigate('/funding-item/'+t.item);toast('已完成 '+t.report.total+' 家门店的销方设置');}else render(true);}}catch(err){state.sellerBatchRunning=false;t.state='execute-failed';t.error=err.message;D.save();render(true);}},0);}
  function taxpayerBatchPage(id){var t=TB.get(id);if(!t)return notFound();var body='',buttons='',first=['empty','uploading','uploaded','upload-failed'].includes(t.state);
    if(first){body='<div class="tax-batch-box"><h2>1. 下载导入模板，根据模板提示完善内容</h2><button class="btn tax-template" data-action="tax-template"><img src="assets/meta/import/file-text.svg" alt="">下载模板</button><p class="secondary">仅填写税号、交易即开票设置两列；设置值填写“开启”或“关闭”。</p></div><div class="tax-batch-box"><h2>2. 上传完善后的内容，支持扩展名：xlsx</h2><div class="tax-upload-zone" data-tax-drop="'+e(id)+'">'+(t.file?taxpayerBatchFile(t):'<img class="upload-icon" src="assets/meta/import/upload-file.svg" alt=""><p>选择或拖拽文件到此处</p>')+'<input id="tax-batch-file" type="file" accept=".xlsx" hidden data-task="'+e(id)+'"><button class="btn" data-action="tax-file"'+(t.state==='uploading'?' disabled':'')+'>'+(t.file?'重新选择':'选择文件')+'</button></div>'+(t.state==='uploading'||t.state==='uploaded'?'<div class="tax-upload-progress '+(t.state==='uploading'?'loading':'done')+'" aria-label="'+(t.state==='uploading'?'文件读取中':'文件已就绪')+'"></div>':'')+(t.error?'<p class="error-text" role="alert">'+e(t.error)+'</p>':'')+'</div>';buttons='<button class="btn primary" data-action="tax-check" data-id="'+id+'"'+(t.state!=='uploaded'?' disabled':'')+'>开始导入</button>';}
    else if(['checking','executing'].includes(t.state)){body='<div class="tax-batch-box">'+taxpayerBatchFile(t)+'</div><div class="tax-batch-loading" role="status" aria-live="polite" aria-busy="true"><span class="tax-spinner"></span><span class="sr-only">'+(t.state==='checking'?'文件检查中，请稍候':'执行中，请稍候')+'</span></div>';if(t.state==='executing')buttons=link('查看导入记录','/taxpayer-imports','btn');}
    else if(['check-passed','check-failed'].includes(t.state)){var report=t.report;body='<div class="tax-batch-box">'+taxpayerBatchFile(t)+'<div class="tax-check-result"><h2>'+(report.passed?'请确认文件检查结果':'<img src="assets/meta/status/处理失败.svg" alt="">检查未通过')+'</h2><p>文件可识别数据 '+report.total+' 条，'+report.valid+' 条可执行'+(report.invalid?'，'+report.invalid+' 条不可执行':'')+'。</p>'+(report.errors.length||report.invalid?'<ul>'+report.errors.map(function(x){return '<li>'+e(x)+'</li>';}).join('')+report.records.filter(function(r){return r.causes.length;}).map(function(r){return '<li>第 '+r.line+' 行：'+e(r.causes.join('；'))+'</li>';}).join('')+'</ul>':'<p class="secondary">请确认后执行，设置将按文件内容更新。</p>')+btn('下载检查报告','tax-report',id)+'</div></div>';buttons=btn('重新上传','tax-reset',id,!report.passed)+(report.passed?btn('立即执行','tax-execute',id,true):'');}
    else{body='<div class="tax-batch-box tax-batch-result"><img src="assets/meta/status/'+(t.state==='execute-succeeded'?'处理完成':'处理失败')+'.svg" alt=""><h2>'+e(taxpayerTaskLabels[t.state])+'</h2><p>'+e(t.state==='execute-succeeded'?'已完成 '+t.report.total+' 个纳税人的交易即开票设置。':t.error||'设置失败，请查看导入记录')+'</p></div>';buttons=link('返回纳税人配置','/taxpayers','btn primary')+link('查看导入记录','/taxpayer-imports','btn');}
    return customBreadcrumb([{name:'纳税人配置',path:'/taxpayers'},{name:'批量设置交易即开票'}])+'<section class="panel tax-batch-panel">'+title('批量设置交易即开票',link('导入记录','/taxpayer-imports'))+taxpayerBatchSteps(t)+'<div class="tax-batch-body">'+body+'<div class="tax-batch-actions">'+buttons+'</div></div></section>';
  }
  async function taxpayerSelectFile(id,files){if(!files||!files.length)return;if(files.length!==1){toast('每次只能上传一个 XLSX 文件');return;}try{state.taxUploading=true;var pending=TB.upload(id,files[0]);render(true);await pending;state.taxUploading=false;if(route().parts[0]==='taxpayer-batch'&&route().parts[1]===id)render(true);}catch(err){state.taxUploading=false;toast(err.message);}}
  async function taxpayerTemplate(){var button=$('[data-action="tax-template"]');if(button)button.disabled=true;try{var blob=await TB.workbook([TB.headers]);download('批量设置交易即开票模板.xlsx',blob,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');}catch(err){toast('模板下载失败，请重试');}finally{if(button)button.disabled=false;}}
  function taxpayerRun(id,execute){var t=TB.get(id);if(!t||t.state!==(execute?'check-passed':'uploaded'))return;t.state=execute?'executing':'checking';state.taxRunning=true;D.save();render(true);setTimeout(function(){try{execute?TB.execute(id):TB.check(id);state.taxRunning=false;if(route().parts[0]==='taxpayer-batch'&&route().parts[1]===id){if(t.state==='execute-succeeded'){navigate('/taxpayers');toast('已完成 '+t.report.total+' 个纳税人的交易即开票设置');}else render(true);}}catch(err){state.taxRunning=false;t.state=execute?'execute-failed':'check-failed';t.report={passed:false,total:0,valid:0,invalid:0,errors:[err.message],records:[]};t.error=err.message;D.save();if(route().parts[1]===id)render(true);}},0);}
  function reissueConfigValues(){return Object.assign({maxCount:2,consumerDays:180,systemDays:180},db.reissueConfig||{});}
  function validateReissueConfig(v){
    var errors={};['maxCount','consumerDays','systemDays'].forEach(function(k){var raw=String(v[k]??'').trim(),n=Number(raw);if(!/^\d+$/.test(raw)||!Number.isSafeInteger(n)||n<1)errors[k]='请输入大于 0 的整数';else if(k!=='maxCount'&&n>365)errors[k]='最长可设置 365 天';});return errors;
  }
  function reissueConfigPage(){
    if(!state.draft||!state.draft._reissue)state.draft=Object.assign({_reissue:true},reissueConfigValues());
    var v=state.draft;
    function control(k,label,unit){return '<div class="reissue-number">'+input('reissue-'+k,v[k],label,true).replace(' autocomplete=', ' inputmode="numeric" autocomplete=')+'<span>'+unit+'</span></div><div class="field-error" id="reissue-error-'+k+'" role="alert"></div>';}
    return customBreadcrumb([{name:'换开功能配置'}])+'<section class="panel reissue-config">'+title('换开功能配置')+'<form id="reissue-config-form" novalidate><div class="form-inner"><div class="form-group"><h3>可换开次数</h3>'+field('可换开次数',control('maxCount','可换开次数','次'),true)+'</div><div class="form-group"><h3>可换开时间范围</h3>'+field('首次由消费者申请开票',control('consumerDays','首次由消费者申请开票的可换开天数','天'),true)+field('首次由系统自动开票',control('systemDays','首次由系统自动开票的可换开天数','天'),true)+'</div><div class="reissue-actions"><button class="btn primary" type="submit">保存</button></div></div></form></section>';
  }
  function syncReissueConfig(){var form=$('#reissue-config-form');if(!form||!state.draft?._reissue)return;var data=new FormData(form);['maxCount','consumerDays','systemDays'].forEach(function(k){state.draft[k]=String(data.get('reissue-'+k)||'');});}
  function saveReissueConfig(){syncReissueConfig();var v=state.draft,errors=validateReissueConfig(v),keys=['maxCount','consumerDays','systemDays'];keys.forEach(function(k){var node=$('#reissue-'+k);node.setAttribute('aria-invalid',errors[k]?'true':'false');node.setAttribute('aria-describedby','reissue-error-'+k);$('#reissue-error-'+k).textContent=errors[k]||'';});if(Object.keys(errors).length){$('#reissue-'+Object.keys(errors)[0]).focus();return;}db.reissueConfig={maxCount:Number(v.maxCount),consumerDays:Number(v.consumerDays),systemDays:Number(v.systemDays)};D.save();state.dirty=false;toast('换开功能配置已保存');}
  function fundingDetailPath(id,returnTo){return '/funding-detail/'+id+(returnTo?'?returnTo='+encodeURIComponent(returnTo):'');}
  function fundingDetailPage(id){
    var r=D.getRecord(id);if(!r)return notFound();
    var back=route().params.get('returnTo')||'',fromOrder=/^\/order\/[^?]+(?:\?|$)/.test(back);
    if(!fromOrder&&!/^\/funding-details(?:\?|$)/.test(back)&&!/^\/settlement-preissued\/[^?]+(?:\?|$)/.test(back))back=fundingDetailsPath({month:r.month});
    var a=P.application(id),pid=D.partnerForRecord(r),s=fundingPreStatus(r),self=fundingDetailPath(id,back);
    var html=customBreadcrumb([{name:fromOrder?'订单详情':back.startsWith('/settlement-preissued/')?'需红冲出资明细':'平台出资明细',path:back},{name:'出资明细详情'}]);
    html+='<section class="panel">'+title('出资明细详情',link('返回',back,'btn'))+'<div class="section">'+info([['订单号',link(r.order,'/order/'+id+'?from=funding-detail&returnTo='+encodeURIComponent(self))],['门店名',e(D.getStore(r.store)?.name||r.store)],['门店号',e(r.store)],['平台出资项',e(D.fundingItem(r.source)?.name||r.source)],['出资项编号',e(r.source)],['出资金额',moneycell(r.amount)],['明细类型',r.kind==='refund'?'平台出资退款':'平台出资'],['合作伙伴',e(D.getPartner(pid)?.name||'未配置')],['出资发生时间',e(r.occurred)],['结算单号',r.month<D.TODAY?e('JS'+r.bill.replace(/-/g,'').toUpperCase()):'尚未生成']])+'</div></section>';
    var invoiceActions=a&&a.hasInvoice?link('查看发票','/preinvoice/'+id+'?tab=original&returnTo='+encodeURIComponent(self)):'';
    var invoiceFields=[['开票状态',fundingPreBadge(r)]];
    if(a)invoiceFields.push(['申请任务号',e(a.requestNumber)],['申请时间',e(a.appliedAt)],['蓝票号码',e(a.number||'—')],['撤销完成时间',e(a.status==='reversed'?a.completedAt:'—')]);
    html+='<section class="panel">'+title('预开票处理',invoiceActions)+'<div class="section">'+info(invoiceFields);
    if(['failed','reverse_failed'].includes(s))html+='<p class="error-text">'+e(a.error||'未记录失败原因')+'</p>'+action(s==='failed'?'重试开票':'重试撤销','pre-retry',id);else if(['processing','revoking'].includes(s))html+=' '+action('刷新','pre-refresh',id);else if(s==='none')html+='<p class="secondary">该笔出资尚未触发预开票申请。</p>';
    return html+'</div></section>';
  }
  function retryFundingFailures(){var q=Object.assign({},state.query['funding-details']||{});if(!['failed','reverse_failed'].includes(q.preStatus))return;var ids=[];D.eachFunding(q,function(r){ids.push(r.id);});if(!ids.length){toast('当前筛选结果中没有可重试的记录');return;}openConfirm('确认批量重试','当前筛选下共 '+ids.length+' 笔失败记录，是否确认重试？','确认重试',function(){var applied=0;ids.forEach(function(id){var a=P.application(id);if(a&&a.applicationStatus===q.preStatus){P.retryApplication(id);applied++;}});closeLayer(true);processPreissued();render(true);toast('已提交 '+applied+' 笔重试');});}
  function fundingDetailsPage(){var key='funding-details',q=state.query[key]||{},page=state.pages[key]||1,data=D.queryFunding(q,page,10),last=Math.max(1,Math.ceil(data.total/10));if(page>last){page=last;state.pages[key]=page;data=D.queryFunding(q,page,10);}
    var itemOptions=D.partnerFundingItems().map(function(x){return{value:x.code,label:x.name+' · '+x.code};});if(q.item&&q.item.includes(','))itemOptions.push({value:q.item,label:q.item.split(',').map(function(code){return D.fundingItem(code)?.name||code;}).join('、')});
    var fields=[{key:'order',label:'订单号'},{key:'partner',label:'合作伙伴',options:[{value:'unassigned',label:'未关联合作伙伴'}].concat(db.partners.map(function(p){return{value:p.id,label:p.name};}))},{key:'occurred',label:'出资发生日期',range:true},{key:'bill',label:'结算单号'},{key:'item',label:'平台出资项',options:itemOptions},{key:'store',label:'门店',options:D.stores.map(function(x){return{value:x.id,label:x.name};})},{key:'preStatus',label:'预开票状态',options:Object.keys(fundingPreMap).map(function(k){return{value:k,label:fundingPreMap[k][0]};})},{key:'kind',label:'明细类型',options:[{value:'positive',label:'平台出资'},{value:'refund',label:'平台出资退款'}]}];
    var rows=data.rows.map(function(r){var pid=D.partnerForRecord(r);return[e(r.order),e(D.getStore(r.store)?.name||r.store),e(r.store),e(D.fundingItem(r.source)?.name||r.source),moneycell(r.amount),fundingPreBadge(r),e(D.getPartner(pid)?.name||'未配置'),e(r.month<D.TODAY?'JS'+r.bill.replace(/-/g,'').toUpperCase():'尚未生成'),r.kind==='refund'?'平台出资退款':'平台出资',e(r.occurred),e(r.source),fundingRowActions(r)];});
    return customBreadcrumb([{name:'平台出资明细'}])+'<section class="panel">'+title('平台出资明细')+ordersQuery(Object.assign({},q,{createdFrom:q.dateFrom||'',createdTo:q.dateTo||''}),key,fields)+(!D.validFundingDates(q)?'<div class="notice error">请选择有效的出资发生日期范围，开始日期不能晚于结束日期。</div>':'')+'<div class="toolbar actions-only">'+(['failed','reverse_failed'].includes(q.preStatus)?action('批量重试','funding-retry-all'):'')+btn('导出明细','export-funding-details')+'</div>'+table([{label:'订单号',width:210},{label:'门店名',width:140},{label:'门店号',width:110},{label:'平台出资项',width:165},{label:'出资金额',numeric:true,width:100},{label:'预开票状态',width:115},{label:'合作伙伴',width:160},{label:'结算单号',width:190},{label:'明细类型',width:120},{label:'出资发生时间',width:180},{label:'出资项编号',width:130},{label:'操作',action:true,width:180}],rows,'未找到符合条件的平台出资明细',1800)+pagination(key,data.total,10)+'</section>';
  }
  function exportFundingQuery(q){q=D.normalizeFundingQuery(q);if(!D.validFundingDates(q)){toast('请选择有效的出资发生日期范围');return;}var rows=[['订单号','门店名','门店号','平台出资项','出资金额','预开票状态','合作伙伴','结算单号','明细类型','出资发生时间','出资项编号']];D.eachFunding(q,function(r){var s=fundingPreStatus(r);rows.push([r.order,D.getStore(r.store)?.name||r.store,r.store,D.fundingItem(r.source)?.name||r.source,moneyPlain(r.amount),s==='na'?'—':fundingPreMap[s][0],D.getPartner(D.partnerForRecord(r))?.name||'未配置',r.month<D.TODAY?'JS'+r.bill.replace(/-/g,'').toUpperCase():'',r.kind==='refund'?'平台出资退款':'平台出资',r.occurred,r.source]);});download('平台出资明细.csv',csv(rows));toast('明细已导出');}
  function exportPartnerFunding(pid,m,bid,source){exportFundingQuery({partner:pid,month:m,bill:bid||'',item:source||''});}
  function exportMonth(m,pid){var q=state.query['month-'+m]||{},ps=pid?[D.getPartner(pid)||D.getPartner(D.getProject(pid)?.partner)]:monthPartners(m).filter(function(p){var t=D.totals(D.partnerBills(m,p.id));return(!q.name||(p.name+p.code).includes(q.name))&&(!q.status||q.status==='pending'&&t.pendingCount>0||q.status==='errors'&&t.failed>0||q.status==='done'&&t.pendingCount===0);}),rows=[['月份','合作伙伴','平台出资金额','平台出资退款金额','平台出资净额','应开票金额','已开票金额','待开票金额','结算单数']];ps.filter(Boolean).forEach(function(p){var t=D.totals(D.partnerBills(m,p.id));rows.push([m,p.name,moneyPlain(t.positive),moneyPlain(t.negative),moneyPlain(t.net),m>=D.TODAY?'':moneyPlain(t.expected),m>=D.TODAY?'':moneyPlain(t.issued),m>=D.TODAY?'':moneyPlain(t.unissued),m>=D.TODAY?'':t.billCount]);});download(m+'-合作伙伴月度汇总.csv',csv(rows));toast('汇总已导出');}

  document.addEventListener('click',function(ev){
    if(state.orderDate&&!ev.target.closest('.order-date-popover')&&!ev.target.closest('[data-action="orders-date"]'))closeOrdersDate();
    var option=ev.target.closest('[data-option]');if(option){setSelect(option.dataset.option,option.dataset.value);return;}
    var sl=ev.target.closest('[data-select]');if(sl){openSelect(sl.dataset.select);return;}
    if(!ev.target.closest('.select-menu'))closeSelect();
    var anchor=ev.target.closest('a[data-route]');if(anchor){ev.preventDefault();if(anchor.dataset.refreshBill)D.refreshBill(anchor.dataset.refreshBill);navigate(anchor.dataset.route);return;}
    var page=ev.target.closest('button[data-page]');if(page&&!page.disabled){var pd=page.dataset.page.split('|');if(pd[0].startsWith('pre-reversal-')){navigate(settlementPreissuedPath(pd[0].slice(13),state.query[pd[0]],Number(pd[1])));return;}if(pd[0]==='funding-details'){applyFundingQuery(state.query['funding-details']||{},Number(pd[1]));return;}state.pages[pd[0]]=Number(pd[1]);render(true);return;}
    var tab=ev.target.closest('[data-tab]');if(tab){var td=tab.dataset.tab.split('|');if(td[0].startsWith('preinvoice-')){navigate('/preinvoice/'+td[0].slice('preinvoice-'.length)+'?tab='+td[1]);return;}if(td[0].startsWith('project-home-')){navigate('/project/'+td[0].slice('project-home-'.length)+'?tab='+td[1]);return;}state.tabs[td[0]]=td[1];render(true);return;}
    var el=ev.target.closest('[data-action]');if(!el||el.disabled){if(ev.target.classList.contains('overlay')&&state.layer&&!state.layer.confirm&&!state.layer.dirty)closeLayer();return;}
    var a=el.dataset.action,id=el.dataset.id||'';
    switch(a){
      case'show-demo-store':state.scrolls['#/orders?store=DEMO001']=0;state.query.orders={store:'优惠演示门店'};state.pages.orders=1;state.sizes.orders=20;if(location.hash==='#/orders?store=DEMO001')render();else navigate('/orders?store=DEMO001');break;
      case'order-reissue':var orr=id.split('|');orderReissue(orr[0],orr[1]);break;
      case'order-reissue-view':var orv=id.split('|');viewOrderReissue(orv[0],orv[1]);break;
      case'orders-date':openOrdersDate();break;
      case'orders-date-cancel':closeOrdersDate(true);break;
      case'orders-date-page':state.orderDate.month=shiftDateMonth(state.orderDate.month,Number(id));paintOrdersDate();break;
      case'orders-date-day':var dr=state.orderDate;if(dr.selecting==='from'||!dr.from||id<dr.from){dr.from=id;dr.to='';dr.selecting='to';}else{dr.to=id;dr.selecting='from';}paintOrdersDate();break;
      case'orders-date-preset':presetOrdersDate(id);break;
      case'orders-date-apply':if(validOrderDateRange(state.orderDate))applyOrdersDate(state.orderDate.from,state.orderDate.to);break;
      case'batch-enter':case'batch-exit':case'batch-all':case'batch-clear':var batchTarget=id.split('|');changeBillBatch(a,batchTarget[0],batchTarget[1]);render(true);break;
      case'batch-issue':var batchScope=id.split('|');submitSelectedBills(batchScope[0],batchScope[1]);break;
      case'open-month':navigate('/month/'+id);break;
      case'toggle-nav':state.tabs['nav-'+id]=state.tabs['nav-'+id]===false;paintShell(route());$('[data-action="toggle-nav"][data-id="'+id+'"]', $('#sidebar')).focus({preventScroll:true});break;
      case'reset-query':resetQueryFilters(id);break;
      case'close-layer':closeLayer();break;
      case'layer-submit':if(state.layer){syncLayer();state.layer.submit(state.layer.values);}break;
      case'cooperator-new':editCooperator();break;
      case'cooperator-edit':editCooperator(id);break;
      case'cooperator-invoice':editBuyer(id,true);break;
      case'partner-new':editPartner();break;
      case'partner-edit':editPartner(id);break;
      case'buyer-new':editBuyer(id);break;
      case'buyer-edit':var by=id.split('|');editBuyer(by[0],by[1]);break;
      case'category-new':editCategory();break;
      case'category-edit':editCategory(id);break;
      case'category-from-customer':editCategory(null,true);break;
      case'customer-invoice-add':syncLayer();state.layer.values.invoiceEnabled=true;state.layer.dirty=true;paintLayer();break;
      case'customer-invoice-remove':syncLayer();state.layer.values.invoiceEnabled=false;state.layer.dirty=true;paintLayer();break;
      case'customer-email-add':syncLayer();var v=state.layer.values;v['customer-email-'+v.emailCount]='';v.emailCount++;state.layer.dirty=true;paintLayer();setTimeout(function(){$('[name="customer-email-'+(v.emailCount-1)+'"]',overlayRoot)?.focus();},0);break;
      case'customer-email-remove':syncLayer();var v=state.layer.values;for(var i=Number(id);i<v.emailCount-1;i++)v['customer-email-'+i]=v['customer-email-'+(i+1)];delete v['customer-email-'+(v.emailCount-1)];v.emailCount--;state.layer.dirty=true;paintLayer();break;
      case'issue':issue(id);break;
      case'funding-retry-all':retryFundingFailures();break;
      case'pre-refresh':refreshPreissued(id);break;
      case'pre-export':exportPreissued();break;
      case'pre-retry-all':retryAllPreissued();break;
      case'pre-retry':retryPreissued(id);break;
      case'pre-failure':showPreissuedFailure(id);break;
      case'pre-download':var preDoc=id.split('|');downloadPreissued(preDoc[0],preDoc[1]);break;
      case'refresh-process':var fp=id.split('|');D.refreshBill(fp[0]);render(true);finishIssue(fp[0],fp[1]);processPreissued();toast('已刷新处理进度');break;
      case'refresh-request':var rqf=id.split('|');refreshApplication(rqf[0],rqf[1]);break;
      case'retry-stage':var st=id.split('|');openConfirm(retryLabel(D.bill(st[0])),'将继续处理尚未成功的部分，是否确认重试？','确认重试',function(){try{var next=window.DemoSettlementWorkflow.retry(st[0],st[1]);closeLayer(true);if(route().path==='/settlement/'+st[0])render(true);else navigate('/settlement/'+st[0],true);toast('已提交重试');finishIssue(st[0],next.id);}catch(error){layerError(error.message);}});break;
      case'retry-request':var rqt=id.split('|');retryApplication(rqt[0],rqt[1]);break;
      case'request-failure':var rqe=id.split('|');showRequestFailure(rqe[0],rqe[1]);break;
      case'adjust-amount':adjustInvoiceAmount(id);break;
      case'cancel-invoice':var cancellation=id.split('|');cancelInvoice(cancellation[0],cancellation[1]);break;
      case'issue-email-add':syncInvoiceDraft();state.invoiceDraft.emails.push('');state.dirty=true;paintInvoiceEmails(state.invoiceDraft.emails.length-1);break;
      case'issue-email-remove':syncInvoiceDraft();state.invoiceDraft.emails.splice(Number(id),1);state.dirty=true;paintInvoiceEmails();break;
      case'cancel-issue':navigate('/settlement/'+id);break;
      case'export-month':exportMonth(id);break;
      case'cancel-item':navigate('/funding-item/'+id);break;
      case'export-partner-month':var pm=id.split('|');exportMonth(pm[1],pm[0]);break;
      case'export-funding-details':exportFundingQuery(state.query['funding-details']||{});break;
      case'export-partner-funding':var pf=id.split('|');exportPartnerFunding(pf[0],pf[1],pf[2],pf[3]);break;
      case'export-settlements':var xs=id.split('|');exportSettlements(xs[0],xs[1]);break;
      case'download-invoice':var inv=id.split('|');invoiceDownload(inv[0],inv[1]);break;
      case'email-invoice':var mail=id.split('|');sendInvoice(mail[0],mail[1]);break;
      case'funding-basic':editFundingBasic(id);break;
      case'funding-rule':editFundingRule(id);break;
      case'funding-partner':editFundingPartner(id);break;
      case'funding-store-seller':var ss=id.split('|');editFundingStoreSeller(ss[0],ss[1]);break;
      case'seller-file':$('#seller-batch-file').click();break;
      case'seller-template':fundingSellerTemplate();break;
      case'seller-check':fundingSellerRun(id,false);break;
      case'seller-execute':fundingSellerRun(id,true);break;
      case'seller-reset':SB.reset(id);render(true);break;
      case'seller-report':var sr=SB.get(id)?.report;if(sr)download('门店销方检查报告.csv',csv([['文件行号','出资项编号','门店号','销售方税号','检查结果']].concat(sr.errors.map(function(x){return['','','','',x];}),sr.records.map(function(r){return[r.line,r.item,r.store,r.tax,r.causes.join('；')||'通过'];}))));break;
      case'tax-export':exportTaxpayers();break;
      case'tax-template':taxpayerTemplate();break;
      case'tax-file':$('#tax-batch-file').click();break;
      case'tax-check':taxpayerRun(id,false);break;
      case'tax-execute':taxpayerRun(id,true);break;
      case'tax-reset':openConfirm('重新上传','重新上传后，当前文件的检查结果将失效，需要重新上传文件并检查。是否继续？','确认重新上传',function(){TB.reset(id);closeLayer(true);render(true);$('[data-action="tax-file"]')?.focus();});break;
      case'tax-report':var report=TB.get(id)?.report;if(report)download('交易即开票设置检查报告.csv',csv([['文件行号','税号','交易即开票设置','检查结果']].concat(report.errors.map(function(x){return['','','',x];}),report.records.map(function(r){return[r.line,r.tax,r.setting,r.causes.join('；')||'通过'];}))));break;
      case'exports':showLayer({drawer:true,title:'导出记录',readonly:true,body:db.exports.length?db.exports.map(function(x){return'<div style="margin-bottom:20px"><strong>'+e(x.name)+'</strong><p class="muted">'+e(x.time)+' · '+e(x.status)+'</p></div>';}).join(''):empty('暂无导出记录','可在月份或结算单中导出业务数据。')});break;

    }
  });
  document.addEventListener('dragover',function(ev){if(ev.target.closest('[data-tax-drop],[data-seller-drop]'))ev.preventDefault();});
  document.addEventListener('drop',function(ev){var sz=ev.target.closest('[data-seller-drop]');if(sz){ev.preventDefault();fundingSellerSelectFile(sz.dataset.sellerDrop,ev.dataTransfer.files);return;}var zone=ev.target.closest('[data-tax-drop]');if(zone){ev.preventDefault();taxpayerSelectFile(zone.dataset.taxDrop,ev.dataTransfer.files);}});
  document.addEventListener('input',function(ev){
    if(ev.target.matches('[data-select-search]')){filterSelect(ev.target.dataset.selectSearch,ev.target.value);return;}
    if(ev.target.closest('#funding-rule-form')){if(ev.target.name==='taxCode')$('#funding-rule-short').textContent=D.lookupTaxCode(ev.target.value.trim())?.shortName||'—';if(state.layer)state.layer.dirty=true;return;}
    if(ev.target.closest('#reissue-config-form')){syncReissueConfig();state.dirty=true;return;}
    if(state.orderDate&&ev.target.closest('.order-date-popover')){state.orderDate.from=$('#order-date-from').value;state.orderDate.to=$('#order-date-to').value;$('.date-calendars').innerHTML=dateCalendar(state.orderDate.month)+dateCalendar(shiftDateMonth(state.orderDate.month,1));$('[data-action="orders-date-apply"]').disabled=!validOrderDateRange(state.orderDate);}


    if(ev.target.closest('#invoice-form')){
      state.dirty=true;syncInvoiceDraft();updateInvoiceRemark();
      if(ev.target.name.startsWith('invoice-email-')&&(!ev.target.value.trim()||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ev.target.value.trim()))){
        ev.target.removeAttribute('aria-invalid');ev.target.removeAttribute('aria-describedby');
        $$('.field-error',ev.target.parentElement).forEach(function(node){node.remove();});$('#invoice-errors').innerHTML='';
      }
    }
    if(ev.target.closest('.overlay-body')&&state.layer)state.layer.dirty=true;
    if(ev.target.closest('.qfield'))ev.target.closest('.qfield').classList.toggle('filled',!!ev.target.value);
  });
  document.addEventListener('change',function(ev){
    if(ev.target.name==='sellerMode'&&ev.target.closest('#funding-store-seller-form')&&state.layer){syncLayer();state.layer.dirty=true;closeSelect();$('#funding-store-seller-value').innerHTML=fundingStoreSellerValue(state.layer.values,state.layer.fundingStoreSeller);clearFundingStoreSellerError();return;}
    if(ev.target.name==='buyerType'&&ev.target.closest('#order-reissue-form')&&state.layer){syncLayer();state.layer.dirty=true;paintLayer();return;}
    if(ev.target.id==='seller-batch-file'){fundingSellerSelectFile(ev.target.dataset.task,ev.target.files);return;}
    if(ev.target.id==='tax-batch-file'){taxpayerSelectFile(ev.target.dataset.task,ev.target.files);return;}
    if(ev.target.matches('[data-bill-select],[data-bill-all]')){var r=route(),key='bills-'+r.parts[1]+'-'+r.parts[2],bills=filteredSettlements(r.parts[1],r.parts[2]),selected=syncBillSelection(key,bills);if(ev.target.hasAttribute('data-bill-all'))state.billSelections[key]=ev.target.checked?bills.filter(canIssue).map(function(b){return b.id;}):[];else{var id=ev.target.value;if(!bills.some(function(b){return b.id===id&&canIssue(b);}))return;state.billSelections[key]=ev.target.checked?Array.from(new Set(selected.concat([id]))):selected.filter(function(x){return x!==id;});}render(true);return;}

  });
  document.addEventListener('submit',function(ev){
    ev.preventDefault();
    if(ev.target.id==='reissue-config-form'){saveReissueConfig();return;}
    if(ev.target.id==='invoice-form'){submitInvoice();return;}
    if(ev.target.dataset.query){var key=ev.target.dataset.query,fd=new FormData(ev.target),q={};fd.forEach(function(v,k){q[k.startsWith(key+'-')?k.slice(key.length+1):k]=String(v);});if(key.startsWith('pre-reversal-')){navigate(settlementPreissuedPath(key.slice(13),q,1));return;}if(key==='funding-details'){applyFundingQuery(q,1);return;}state.query[key]=q;state.pages[key]=1;render(true);return;}
    if(state.layer){syncLayer();state.layer.submit(state.layer.values);}
  });
  document.addEventListener('keydown',function(ev){
    if(state.orderDate&&ev.key==='Escape'){ev.preventDefault();closeOrdersDate(true);return;}
    if(state.selectOpen){
      var menu=document.getElementById(state.selectOpen+'-menu'),opts=menu?$$('[role=option]',menu):[],i=opts.indexOf(document.activeElement);
      if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){ev.preventDefault();opts[i<0?(ev.key==='ArrowDown'?0:opts.length-1):(i+(ev.key==='ArrowDown'?1:-1)+opts.length)%opts.length]?.focus();return;}
      if(ev.key==='Enter'&&ev.target.matches('[data-select-search]')){ev.preventDefault();var match=ev.target.value.trim()?opts.find(function(o){return o.dataset.value;}):(opts.find(function(o){return o.getAttribute('aria-selected')==='true';})||opts[0]);if(match)setSelect(state.selectOpen,match.dataset.value);return;}
      if(ev.key==='Escape'){ev.preventDefault();var trigger=document.getElementById(state.selectOpen);closeSelect();trigger?.focus();return;}
      if(ev.key==='Tab'){var owner=document.getElementById(state.selectOpen);closeSelect();owner?.focus({preventScroll:true});}
    }else if(ev.target.matches('[data-select]')&&(ev.key==='ArrowDown'||ev.key==='ArrowUp')){ev.preventDefault();openSelect(ev.target.dataset.select);return;}
    if(state.layer){
      if(ev.key==='Escape'){ev.preventDefault();closeLayer();return;}
      if(ev.key==='Tab'){var nodes=$$('button:not([disabled]),a[href],input:not([type=hidden]):not([disabled]),textarea:not([disabled]),[tabindex="0"]',overlayRoot).filter(function(n){return n.getClientRects().length;});var first=nodes[0],last=nodes[nodes.length-1];if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last?.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first?.focus();}}
    }
  });
  window.addEventListener('hashchange',function(){state.billBatchModes={};state.billSelections={};if(state.layer)closeLayer(true);render();});
  window.addEventListener('resize',function(){closeSelect();closeOrdersDate();});
  window.addEventListener('scroll',function(){if(!state.selectOpen)return;var trigger=document.getElementById(state.selectOpen),menu=document.getElementById(state.selectOpen+'-menu');if(!trigger||!menu)return;var rect=trigger.getBoundingClientRect();menu.style.left=rect.left+'px';menu.style.top=Math.max(8,Math.min(rect.bottom+4,window.innerHeight-menu.offsetHeight-8))+'px';},{passive:true});
  window.addEventListener('storage',function(ev){if(P&&(ev.key===P.KEY||ev.key===D.KEY)){P.refresh();processPreissued();if(canRefreshPreissuedView())render(true);}});
  window.addEventListener('beforeunload',function(ev){if(state.dirty){ev.preventDefault();ev.returnValue='';}});
  Object.values(db.months).forEach(function(m){m.bills.forEach(function(b){if(b.status==='processing'||b.status==='reversing')finishIssue(b.id,b.activeWorkflow||b.activeRequest);});});
  if(P){P.refresh();processPreissued();}
  window.DemoOrderData.completeReissues();processOrderReissues();
  if(!location.hash)location.hash='/overview';else render();
})();
