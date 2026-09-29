(function(){
  'use strict';
  var D=window.DemoData, P=window.DemoPreissued, db=D.db, $=function(s,root){return(root||document).querySelector(s);}, $$=function(s,root){return Array.from((root||document).querySelectorAll(s));};
  var state={sizes:{},invoiceDraft:null,year:'2026',query:{},pages:{},tabs:{},selects:{},layer:null,draft:null,dirty:false,nav:'',route:'',scrolls:{},lastFocus:null,selectOpen:null};
  var main=$('#main'),overlayRoot=$('#overlay-root');
  function e(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function money(c){return Number(c/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function count(n){return Number(n).toLocaleString('zh-CN');}
  function ym(m){return m.slice(0,4)+' 年 '+Number(m.slice(5))+' 月';}
  function nextMonth(m){var a=m.split('-').map(Number);return new Date(Date.UTC(a[0],a[1],1)).toISOString().slice(0,7);}
  function route(){var a=(location.hash.slice(1)||'/overview').split('?');return{parts:a[0].split('/').filter(Boolean),params:new URLSearchParams(a[1]||''),path:a[0]};}
  function isProjectScope(){var r=route();return r.params.get('source')==='project'||r.parts[0]==='project-config'||r.parts[0]==='project'&&!r.parts[2];}
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
  function billBreadcrumb(b,page){
    var p=D.getProject(b.project),items=isProjectScope()?[{name:'合作项目',path:'/projects'},{name:p.name,path:'/project/'+p.id+'?tab=months'},{name:ym(b.month),path:contextualPath(projectLink(p,b.month)+'?tab=settlements')}]:[{name:ym(b.month),path:'/month/'+b.month},{name:p.name,path:projectLink(p,b.month)}];
    if(page!=='结算单详情')items.push({name:'结算单详情',path:contextualPath('/settlement/'+b.id)});
    items.push({name:page});return isProjectScope()?customBreadcrumb(items):breadcrumb(items);
  }
  function kpis(items,cls){return'<div class="kpis '+(cls||'')+'">'+items.map(function(x){return'<div class="kpi"><div class="label">'+e(x[0])+(x[5]||'')+'</div><div class="value num '+(x[3]||'')+'">'+(x[4]?e(x[1]):'¥ '+money(x[1]))+'</div>'+(x[2]?'<small>'+e(x[2])+'</small>':'')+'</div>';}).join('')+'</div>';}
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
    return'<div class="table-wrap"><table'+(minWidth?' style="min-width:'+minWidth+'px"':'')+'><colgroup>'+cols.map(function(c){return'<col'+(c.width?' style="width:'+c.width+'px"':'')+'>';}).join('')+'</colgroup><thead><tr>'+cols.map(function(c){return'<th class="'+(c.numeric?'numeric ':'')+(c.action?'operation':'')+'" scope="col">'+e(c.label)+'</th>';}).join('')+'</tr></thead><tbody>'+(rows.length?rows.map(function(row){return'<tr>'+cols.map(function(c,i){return'<td class="'+(c.numeric?'numeric ':'')+(c.action?'operation':'')+'"'+(row[i]&&row[i].title?' title="'+e(row[i].title)+'"':'')+'>'+(row[i]&&row[i].html!==undefined?row[i].html:row[i]===0?'0':row[i]||'-')+'</td>';}).join('')+'</tr>';}).join(''):'<tr><td colspan="'+cols.length+'" class="table-empty">'+e(empty||'暂无数据')+'</td></tr>')+'</tbody>'+footer+'</table></div>';
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
  function projectLink(p,m){return'/project/'+p.id+'/'+m;}
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
  function summaryProgress(t,withCounts){return'<div class="summary-progress'+(withCounts?'':' progress-only')+'">'+(withCounts?'<div class="processing-counts"><span>结算单共 '+t.billCount+' 张</span><span>已处理 '+t.done+' 张</span><span>待处理 '+t.pendingCount+' 张（其中异常 '+t.failed+' 张）</span></div>':'')+progressBar(t)+'</div>';}
  function periodHeader(label,t,m,meta,actions){return'<div class="summary-top period-header"><div><div class="period-title"><h1>'+e(label)+'</h1>'+summaryStatus(t,m)+'</div>'+(meta.length?'<div class="summary-sub">'+meta.map(function(x){return'<span>'+e(x)+'</span>';}).join('')+'</div>':'')+'</div><div class="actions">'+(actions||'')+'</div></div>';}
  function financialTable(cols,rows,emptyText,minWidth,totalRow){return table(cols,rows,emptyText,minWidth,totalRow);}
  function taxCell(config){return'<div class="table-identity"><span>'+e(D.invoiceItemLabel(config))+' · '+rateText(config.taxRate)+'</span><small>'+e(config.taxCode||'-')+'</small></div>';}
  function projectIdentity(p,m){return link(p.name,projectLink(p,m));}
  function projectProcessing(t){return'<div class="table-identity">'+summaryStatus(t,D.PREVIOUS)+(t.failed?'<small class="error-text">异常 '+t.failed+' 张</small>':'')+'</div>';}
  function filteredMonthlyProjects(m){
    var q=state.query['month-'+m]||{};
    return D.monthProjects(m).filter(function(p){
      var t=D.totals(D.projectBills(m,p.id));
      return(!q.name||(p.name+p.code).includes(q.name))&&(!q.partner||p.partner===q.partner)&&(m>=D.TODAY||!q.status||(q.status==='pending'&&t.pendingCount>0)||(q.status==='errors'&&t.failed>0)||(q.status==='done'&&t.billCount>0&&!t.pendingCount));
    }).sort(function(a,b){var at=D.totals(D.projectBills(m,a.id)),bt=D.totals(D.projectBills(m,b.id));return m===D.TODAY?bt.net-at.net:bt.unissued-at.unissued;});
  }
  function overview(){
    var recent=[D.PREVIOUS,D.TODAY].map(function(m,i){
      var t=D.monthTotal(m),current=m===D.TODAY;
      var stats=current?'<div class="recent-stats funding-stats"><div><div class="amount-label">平台出资金额</div><div class="mini-value num">'+money(t.positive)+'</div></div><div><div class="amount-label">平台出资退款金额</div><div class="mini-value num negative">'+money(t.negative)+'</div></div></div>':'<div class="recent-stats"><div><div class="amount-label">应开票金额</div><div class="mini-value num">'+money(t.expected)+'</div>'+(t.adjustment?'<small class="amount-adjustment">'+e(adjustmentNote(t))+'</small>':'')+'</div><div><div class="amount-label">已开票金额</div><div class="mini-value num">'+money(t.issued)+'</div></div><div><div class="amount-label">待开票金额</div><div class="mini-value num">'+money(t.unissued)+'</div></div></div>';
      return'<article class="recent-card" data-period="'+m+'"><div class="recent-head"><div class="month-title">'+e(ym(m))+'<span class="month-relative">'+(i?'本月':'上月')+'</span></div>'+monthStatus(m)+'</div><div><div class="amount-label">平台出资净额（元）</div><div class="primary-amount num">'+money(t.net)+'</div></div>'+stats+(current?'<div class="collection-meta"><span>合作项目 '+t.projectCount+' 个</span><span>数据更新时间 '+e(D.DATA_UPDATED_AT)+'</span></div>':progressBar(t))+'<div class="recent-footer">'+(current?'<span class="hint-count">本月结算单未生成</span>':pendingSummary(t,'/month/'+m))+link('查看月份','/month/'+m)+'</div></article>';
    }).join('');
    var months=Array.from({length:12},function(_,i){
      var m=state.year+'-'+String(i+1).padStart(2,'0'),t=D.monthTotal(m),current=m===D.TODAY,future=m>D.TODAY;
      var amounts=!current&&!future?'<div class="tile-invoice-amounts"><div><span>已开票金额</span><strong class="num">'+money(t.issued)+'</strong></div><div><span>待开票金额</span><strong class="num">'+money(t.unissued)+'</strong></div></div>':'';
      var meta=future?'<span>暂无业务数据</span>':current?'<span>结算单未生成</span>':'<span>开票进度</span><span class="num">'+(t.progress==null?'—':t.progress+'%')+'</span>';
      return'<button class="month-tile'+(current?' current':'')+(future?' future':'')+'" data-action="open-month" data-id="'+m+'" aria-label="查看 '+ym(m)+'"><div class="tile-head"><span class="tile-number">'+(i+1)+' 月</span>'+monthStatus(m)+'</div><div><div class="amount-label">平台出资净额</div><div class="tile-amount num">'+(future?'—':'¥ '+money(t.net))+'</div></div>'+amounts+'<div class="tile-meta">'+meta+'</div></button>';
    }).join('');
    return'<section class="panel">'+title('月度总览')+'<div class="recent-grid">'+recent+'</div></section><section class="panel">'+title('年度月份',select('overview-year',state.year,['2026','2025'],'年份','year',true))+'<div class="month-grid">'+months+'</div></section>';
  }
  function monthly(m){
    var mod=D.month(m),t=D.monthTotal(m),key='month-'+m,current=mod.current;
    var meta=current?['数据更新时间 '+D.DATA_UPDATED_AT]:[];
    var upper=breadcrumb([{name:ym(m)}])+'<section class="panel">'+periodHeader(ym(m),t,m,meta,mod.future?'':btn('导出月度汇总','export-month',m));
    if(mod.future)return upper+'</section><section class="panel">'+title('合作项目')+empty('本月尚未开始','开始归集后，可在这里查看各合作项目的月度数据。')+'</section>';
    upper+=metricRows(t,current)+(current?'':summaryProgress(t,true))+'</section>';
    var ps=filteredMonthlyProjects(m);
    var page=Math.min(state.pages[key]||1,Math.max(1,Math.ceil(ps.length/10)));state.pages[key]=page;
    var cols=[{label:'合作项目',width:230},{label:'合作伙伴',width:160},{label:'平台出资金额',numeric:true,width:150},{label:'平台出资退款金额',numeric:true,width:170},{label:'平台出资净额',numeric:true,width:150}];
    if(!current)cols=cols.concat([{label:'应开票金额',numeric:true,width:180},{label:'已开票金额',numeric:true,width:145},{label:'待开票金额',numeric:true,width:145},{label:'结算单数',numeric:true,width:100},{label:'处理状态',width:125}]);
    cols.push({label:'项目编号',systemId:true,width:145},{label:'操作',action:true,width:80});
    var rows=ps.slice((page-1)*10,page*10).map(function(p){var ts=D.totals(D.projectBills(m,p.id)),row=[projectIdentity(p,m),textcell(D.getPartner(p.partner).name),moneycell(ts.positive),moneycell(ts.negative),moneycell(ts.net)];if(!current)row=row.concat([expectedCell(ts),moneycell(ts.issued),moneycell(ts.unissued),count(ts.billCount),projectProcessing(ts)]);return row.concat([e(p.code),link('查看',projectLink(p,m))]);});
    var fields=[{key:'name',label:'项目名称或编号'},{key:'partner',label:'合作伙伴',options:db.partners.map(function(p){return{value:p.id,label:p.name};})}];
    if(!current)fields.push({key:'status',label:'处理状态',options:[{value:'pending',label:'有待处理'},{value:'errors',label:'有异常'},{value:'done',label:'已完成'}]});
    return upper+'<section class="panel">'+title('合作项目')+query(key,fields)+'<div class="toolbar"><span class="secondary">共 '+ps.length+' 个合作项目</span></div>'+table(cols,rows,'未找到符合条件的合作项目',current?1085:1805)+(ps.length>10?pagination(key,ps.length,10):'<div class="table-bottom-space"></div>')+'</section>';
  }
  function filteredSettlements(pid,m){
    var q=state.query['bills-'+pid+'-'+m]||{};
    return D.projectBills(m,pid).filter(function(b){var seller=D.getSeller(b.seller);return(!q.name||seller.name.includes(q.name))&&(!q.tax||seller.tax===q.tax)&&(!q.status||(q.status==='pending'&&b.status!=='issued')||(q.status==='errors'&&['failed','reverse_failed'].includes(b.status))||q.status===b.status);});
  }
  function billStatusCell(b){
    var failed=['failed','reverse_failed'].includes(b.status),last=(b.applications||[]).slice().reverse().find(function(a){return a.status==='failed';});
    return'<div class="table-identity">'+status(b.status)+(failed?'<small class="error-text">'+e(last&&last.error|| (b.status==='reverse_failed'?'撤销未完成，原票仍有效':'开票未成功，请重新发起'))+'</small>':'')+'</div>';
  }
  function tableInsideBillGroups(bills){
    var cols=[{label:'结算单号',systemId:true,width:170},{label:'销方主体',width:240},{label:'购方主体',width:240},{label:'结算金额',numeric:true,width:130},{label:'应开票金额',numeric:true,width:180},{label:'已开票金额',numeric:true,width:130},{label:'待开票金额',numeric:true,width:130},{label:'开票状态',width:200},{label:'开票内容',width:210},{label:'发票类型',width:100},{label:'操作',action:true,width:80}];
    var rows=bills.map(function(b){var t=D.totals([b]);return[link('JS'+b.id.replace(/-/g,'').toUpperCase(),'/settlement/'+b.id),party(D.getSeller(b.seller)),party(b.buyerSnapshot||D.getBuyer(D.getProject(b.project))),moneycell(t.net),expectedCell(t),moneycell(t.issued),moneycell(t.unissued),billStatusCell(b),taxCell(b),e((b.invoiceType||D.getProject(b.project).invoiceType||'').includes('专用')?'专票':'普票'),link('查看','/settlement/'+b.id)];});
    return table(cols,rows,'未找到符合条件的结算单',1850);
  }
  function policySourceCell(g){return'<div class="table-lines">'+g.sources.map(function(code){var source=D.sources.find(function(s){return s.code===code;});return'<div>'+e(source?source.name:code)+'<small>'+e(code)+'</small></div>';}).join('')+'</div>';}
  function policySellerCell(g){
    var modes=new Map();g.configs.forEach(function(c){var key=c.sellerMode+'|'+c.sellerId;if(!modes.has(key))modes.set(key,c);});
    return'<div class="table-lines">'+Array.from(modes.values()).map(function(c){return c.sellerMode==='order'?'门店所属纳税人':c.sellerMode==='fixed'?'<span>指定纳税人</span>'+party(D.getSeller(c.sellerId)):'历史开票方配置未记录';}).join('<br>')+'</div>';
  }
  function policyTable(groups,m,pid){
    var cols=[{label:'优惠政策',width:180},{label:'平台出资金额',numeric:true,width:150},{label:'平台出资退款金额',numeric:true,width:170},{label:'平台出资净额',numeric:true,width:150},{label:'出资明细数',numeric:true,width:110},{label:'适用优惠',width:210},{label:'开票方规则',width:260},{label:'开票内容',width:220},{label:'操作',action:true,width:110}];
    var rows=groups.map(function(g){var configs=new Map();g.configs.forEach(function(c){configs.set(JSON.stringify([c.taxCode,c.taxRate,c.item]),c);});return[textcell(g.name),moneycell(g.positive),moneycell(g.negative),moneycell(g.net),count(g.count),policySourceCell(g),policySellerCell(g),Array.from(configs.values()).map(taxCell).join(''),link('查看出资明细','/funding/'+m+'/'+pid+'?policy='+encodeURIComponent(g.id))];});
    return table(cols,rows,'本期暂无出资数据',1560);
  }
  function monthlyProject(pid,m){
    var p=D.getProject(pid);if(!p)return notFound();
    var bills=D.projectBills(m,pid),t=D.totals(bills),mod=D.month(m),groups=D.policySummaries(bills),tab=state.tabs['project-'+pid+'-'+m]||'settlements';
    if(!['settlements','policies'].includes(tab))tab='policies';
    var current=mod.current,meta=[ym(m)];
    if(current)meta.push('数据更新时间 '+D.DATA_UPDATED_AT);
    var buyer=bills[0]&&bills[0].buyerSnapshot||D.getBuyer(p),invoiceType=bills[0]&&bills[0].invoiceType||p.invoiceType;
    var summary=(isProjectScope()?customBreadcrumb([{name:'合作项目',path:'/projects'},{name:p.name,path:'/project/'+pid+'?tab=months'},{name:ym(m)}]):breadcrumb([{name:ym(m),path:'/month/'+m},{name:p.name}]))+'<section class="panel">'+periodHeader(p.name,t,m,meta,link('查看项目配置','/project-config/'+pid)+btn('导出项目月度汇总','export-project',pid+'|'+m))+'<div class="section" style="padding-top:0">'+info([['合作伙伴',e(D.getPartner(p.partner).name)],['购买方',party(buyer)],['发票种类',e(invoiceType)]])+'</div>';
    if(!mod.future)summary+=metricRows(t,current)+(current?'':summaryProgress(t,false));
    summary+='</section>';
    var tabs='<div class="tabs" role="tablist" aria-label="项目月度数据">'+[['settlements','结算单'],['policies','优惠政策汇总']].map(function(x){return'<button role="tab" aria-selected="'+(tab===x[0])+'" data-tab="project-'+pid+'-'+m+'|'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>',body='';
    if(tab==='settlements'){
      if(current||mod.future)body=empty(current?'本月结算单未生成':'本期结算单未生成');
      else{
        var key='bills-'+pid+'-'+m,shown=filteredSettlements(pid,m);
        body=query(key,[{key:'name',label:'销方名称'},{key:'tax',label:'销方税号'},{key:'status',label:'开票状态',options:[{value:'pending',label:'全部待处理'},{value:'errors',label:'全部异常'}].concat(['ready','processing','issued','failed','reversing','reverse_failed','revoked'].map(function(k){return{value:k,label:statusMap[k][0]};}))}])+'<div class="toolbar actions-only">'+btn('导出结算单','export-settlements',pid+'|'+m)+'</div>'+tableInsideBillGroups(shown)+'<div class="table-bottom-space"></div>';
      }
    }else body='<div class="toolbar actions-only">'+btn('导出政策汇总','export-policies',pid+'|'+m)+'</div>'+policyTable(groups,m,pid)+'<div class="table-bottom-space"></div>';
    return summary+'<section class="panel">'+tabs+body+'</section>';
  }
  function settlement(bid){
    var b=D.bill(bid);if(!b||b.month>=D.TODAY)return notFound();var p=D.getProject(b.project),t=D.totals([b]),buyer=b.buyerSnapshot||D.getBuyer(p),seller=D.getSeller(b.seller),editable=canIssue(b);
    var nav=billBreadcrumb(b,'结算单详情');
    var actions=editable?link(b.status==='failed'?'重新发起开票':'发起开票','/invoice-issue/'+bid,'btn primary'):b.status==='issued'||b.status==='reverse_failed'?btn('撤销开票','cancel-invoice',bid):btn(b.status==='reversing'?'撤销中':'开票中','',null,true,true);
    var data='<section class="panel">'+title('结算单详情','<div class="settlement-heading-actions">'+status(b.status)+actions+'</div>')+'<div class="section" style="padding-top:0">'+info([['结算单号',e('JS'+bid.replace(/-/g,'').toUpperCase())],['合作项目',link(p.name,isProjectScope()?'/project/'+p.id:projectLink(p,b.month))],['结算月份',e(ym(b.month))],['销售方',party(seller)],['生成时间',e(nextMonth(b.month)+'-01 08:00')],['出资明细数',count(t.count)+' 条']])+'</div>'+metricRows(t,false,true,editable?'<button class="link metric-adjust" type="button" data-action="adjust-amount" data-id="'+bid+'" aria-label="调整应开票金额">调整</button>':'')+'</section>';
    if(b.status==='failed')data+='<section class="panel"><div class="notice error inline-notice">开票未成功，未生成发票。请核对开票信息后重新发起。</div></section>';
    if(b.status==='reverse_failed')data+='<section class="panel"><div class="notice error inline-notice">撤销未完成，原发票仍有效。请重新发起撤销。</div></section>';
    if(b.status==='processing'||b.status==='reversing')data+='<section class="panel"><div class="notice inline-notice"><span class="spinner"></span>'+(b.status==='reversing'?'正在撤销开票，完成后可重新发起开票。':'开票申请处理中。')+link('查看申请详情','/application/'+bid)+'</div></section>';
    data+='<section class="panel">'+title('开票信息')+'<div class="section" style="padding-top:0">'+info([['销售方',party(seller)],['购买方',party(buyer)],['发票种类',e(b.invoiceType||p.invoiceType)],['开票项目名称',e(b.item||'-')],['税收分类编码',e(b.taxCode||'-')],['税收分类简称',e(b.taxShortName||b.item)],['税率',rateText(b.taxRate)]])+'</div></section>';
    data+='<section class="panel">'+title('开票记录')+applicationRecordsTable(b)+'<div class="table-bottom-space"></div></section>';
    var groups=D.policySummaries([b]);
    var rows=groups.map(function(g){return[textcell(g.name),count(g.count),moneycell(g.positive),moneycell(g.negative),moneycell(g.net),link('查看明细','/funding/'+b.month+'/'+p.id+'?bill='+bid+'&policy='+g.id)];});
    data+='<section class="panel">'+title('优惠政策汇总',btn('导出出资明细','export-funding',bid))+financialTable([{label:'优惠政策',width:240},{label:'出资明细数',numeric:true,width:120},{label:'平台出资金额',numeric:true,width:160},{label:'平台出资退款金额',numeric:true,width:180},{label:'平台出资净额',numeric:true,width:160},{label:'操作',width:100,action:true}],rows,'暂无出资明细',1000,['合计',count(t.count),moneycell(t.positive),moneycell(t.negative),moneycell(t.net),''])+'<div class="table-bottom-space"></div></section>';
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
  function applicationRecordActions(b,a){
    var id=b.id+'|'+a.id,inv=(b.invoices||[]).find(function(x){return x.id===a.invoiceId||x.applicationId===a.id;});
    if(a.status==='processing'||a.status==='red_pending'&&a.type==='red')return action('刷新','refresh-request',id);
    if(a.status==='issued')return inv?action('下载发票','download-invoice',b.id+'|'+inv.id):'—';
    if(a.status==='failed')return action('查看失败原因','request-failure',id);
    if(a.status==='retry_pending')return'<div class="row-actions">'+action('重试','retry-request',id)+action('查看失败原因','request-failure',id)+'</div>';
    return'—';
  }
  function applicationRecordsTable(b){
    var cols=[{label:'申请时间',width:175},{label:'销售方',width:235},{label:'购买方',width:235},{label:'申请类型',width:100},{label:'发票类型',width:100},{label:'价税合计',numeric:true,width:135},{label:'不含税金额',numeric:true,width:140},{label:'税额',numeric:true,width:120},{label:'申请状态',width:215},{label:'发票号码',width:235},{label:'完成时间',width:175},{label:'操作',action:true,width:195}];
    var rows=applicationRecords(b).map(function(a){
      var inv=(b.invoices||[]).find(function(x){return x.id===a.invoiceId||x.applicationId===a.id;}),totals=invoiceLineAmounts({amount:a.amount,taxRate:a.taxRate==null?inv&&inv.taxRate!=null?inv.taxRate:b.taxRate:a.taxRate});
      var seller=a.seller||inv&&inv.seller||D.getSeller(b.seller),buyer=a.buyer||inv&&inv.buyer||b.buyerSnapshot||D.getBuyer(D.getProject(b.project)),type=a.invoiceType||inv&&inv.invoiceType||b.invoiceType;
      return[e(a.createdAt||'—'),party(seller),party(buyer),a.type==='red'?pill('红票','red'):pill('蓝票','blue'),e(type?(type.includes('专用')?'专票':'普票'):'—'),moneycell(a.amount),moneycell(totals.net),moneycell(totals.tax),applicationStatus(a),inv?link(inv.id,'/invoice/'+b.id+'/'+inv.id):'—',e(a.completedAt||a.status==='issued'&&inv&&inv.date||'—'),applicationRecordActions(b,a)];
    });
    return table(cols,rows,'暂无开票申请记录',2160);
  }
  function showRequestFailure(bid,aid){
    var b=D.bill(bid),a=b&&b.applications.find(function(x){return x.id===aid;});if(!a||!['failed','retry_pending'].includes(a.status))return;
    var reason=typeof a.error==='string'?a.error:a.error&&a.error.message||a.failureReason||'未记录失败原因';
    showLayer({title:'失败原因',readonly:true,size:'standard',body:'<p class="secondary">申请时间：'+e(a.createdAt||'—')+' · '+(a.type==='red'?'红票':'蓝票')+'</p><p class="request-failure-message">'+e(reason)+'</p>'});
  }
  function refreshApplication(bid,aid){try{D.refreshRequest(bid,aid);render(true);toast('已刷新申请状态');}catch(err){toast(err.message);}}
  function retryApplication(bid,aid){try{var a=D.retryRequest(bid,aid);render(true);toast('已提交重试');finishIssue(bid,a.id);}catch(err){toast(err.message);}}
  function invoiceTable(b){
    var rows=b.invoices.slice().reverse().map(function(inv){return[link(inv.id,'/invoice/'+b.id+'/'+inv.id),inv.amount<0?pill('红票','red'):pill('蓝票','blue'),'<span class="'+(inv.amount<0?'negative':'')+'">'+signedMoney(inv.amount)+'</span>',status(inv.reversedBy?'revoked':'issued',inv.reversedBy?'已红冲':'已开票'),inv.originalId?link(inv.originalId,'/invoice/'+b.id+'/'+inv.originalId):inv.reversedBy?link(inv.reversedBy,'/invoice/'+b.id+'/'+inv.reversedBy):'-',e(inv.date),'<div class="row-actions">'+link('查看','/invoice/'+b.id+'/'+inv.id)+action('下载','download-invoice',b.id+'|'+inv.id)+'</div>'];});
    return table([{label:'发票号码',width:245},{label:'票据方向',width:95},{label:'开票金额',numeric:true,width:145},{label:'发票状态',width:110},{label:'关联发票',width:245},{label:'开票时间',width:175},{label:'操作',width:115,action:true}],rows,'暂无开票记录',1130);
  }
  function application(bid,aid){
    var b=D.bill(bid);if(!b||b.month>=D.TODAY)return notFound();var a=aid?b.applications.find(function(x){return x.id===aid;}):b.applications[b.applications.length-1];if(!a)return notFound();var p=D.getProject(b.project),buyer=a.buyer||b.buyerSnapshot,seller=a.seller||D.getSeller(b.seller),result=(applicationStatusMap[a.status]||['状态未知'])[0],resultIcon=a.status==='issued'?'处理完成':['failed','retry_pending'].includes(a.status)?'处理失败':'处理中';
    var inv=b.invoices.find(function(i){return i.id===a.invoiceId;});
    return billBreadcrumb(b,'开票申请详情')+'<section class="panel">'+title('开票申请详情',applicationRecordActions(b,a))+'<div class="task-summary">'+info([['申请任务号',e(a.id)],['申请金额',moneycell(a.amount)],['申请类型',a.type==='red'?'红票':'蓝票'],['关联结算单',link('JS'+bid.replace(/-/g,'').toUpperCase(),'/settlement/'+bid)],['申请时间',e(a.createdAt)],['发票种类',e(a.invoiceType||b.invoiceType)]])+'<div class="task-result"><img src="assets/meta/status/'+resultIcon+'.svg" alt=""><strong>'+result+'</strong></div></div></section><section class="panel">'+title('开票信息')+'<div class="section" style="padding-top:0">'+info([['销售方',party(seller)],['购买方',party(buyer)],['开票项目名称',e(a.item||b.item||'-')],['税收分类编码',e(a.taxCode||b.taxCode||'-')],['税收分类简称',e(a.taxShortName||a.item||b.item)],['税率',rateText(a.taxRate)],['接收邮箱',recipientText(a,b)],['发票备注',e(a.remark||'-')],['撤销原因',e(a.reason||'-')]])+'</div>'+title('发票结果')+invoiceTable({id:b.id,invoices:inv?[inv]:[]})+'<div style="height:20px"></div></section>';
  }
  function fundingScope(m,pid,params){
    var p=D.getProject(pid);if(!p)return null;
    var billId=params.get('bill')||'',policyId=params.get('policy')||'',b=null;
    if(billId){if(billId.slice(0,7)!==m)return null;b=D.bill(billId);if(!b||b.project!==pid||b.month!==m)return null;}
    var groups=D.policySummaries(b?[b]:D.projectBills(m,pid)),policy=groups.find(function(g){return g.id===policyId;});
    if(policyId&&!policy)return null;
    var search=new URLSearchParams();if(billId)search.set('bill',billId);if(policyId)search.set('policy',policyId);
    return{project:p,bill:b,billId:billId,policy:policy,policyId:policyId,key:'fund-'+m+'-'+pid+'--'+(billId||'all')+'--'+(policyId||'all'),url:'/funding/'+m+'/'+pid+(search.toString()?'?'+search.toString():'')};
  }
  function fundingFilters(scope,params){
    var q=state.query[scope.key]||{};
    return{bill:scope.billId,policy:scope.policyId,store:q.store==null?params.get('store')||'':q.store,kind:q.kind==null?params.get('kind')||'':q.kind};
  }
  function fundingTrail(m,scope){
    var p=scope.project,items=isProjectScope()?[{name:'合作项目',path:'/projects'},{name:p.name,path:'/project/'+p.id+'?tab=months'},{name:ym(m),path:contextualPath(projectLink(p,m)+'?tab=policies')}]:[{name:ym(m),path:'/month/'+m},{name:p.name,path:projectLink(p,m)}];
    if(scope.bill)items.push({name:'结算单详情',path:contextualPath('/settlement/'+scope.billId)});
    return items;
  }
  function fundingOrderPath(r,scope){
    var params=new URLSearchParams({from:'funding'});if(scope.billId)params.set('bill',scope.billId);if(scope.policyId)params.set('policy',scope.policyId);
    return'/order/'+r.id+'?'+params.toString();
  }
  function resetQueryFilters(key){
    state.query[key]={};state.pages[key]=1;
    var r=route();
    if(r.parts[0]==='funding'&&(r.params.has('store')||r.params.has('kind'))){
      r.params.delete('store');r.params.delete('kind');var search=r.params.toString();location.hash=contextualPath(r.path+(search?'?'+search:''));return;
    }
    render(true);
  }
  function exportFilteredFunding(m,pid){
    var params=route().params,scope=fundingScope(m,pid,params);if(!scope){toast('未找到对应的出资明细');return;}
    exportFunding(m,pid,fundingFilters(scope,params));
  }
  function funding(m,pid,params){
    var scope=fundingScope(m,pid,params);if(!scope)return notFound();
    var p=scope.project,key=scope.key,f=fundingFilters(scope,params);
    state.query[key]={store:f.store,kind:f.kind};
    var showSeller=!scope.bill,showSettlement=showSeller&&m<D.TODAY;
    var cols=[{label:'订单号',width:270},{label:'门店',width:160}];
    if(showSeller)cols.push({label:'实际销方',width:240});
    cols=cols.concat([{label:'优惠名称',width:150},{label:'优惠编码',width:90},{label:'明细类型',width:100},{label:'出资金额',numeric:true,width:110},{label:'原订单时间',width:170},{label:'出资发生时间',width:170},{label:'归属月份',width:125},{label:'优惠政策',width:160}]);
    if(showSettlement)cols.push({label:'所属结算单',systemId:true,width:190});
    cols.push({label:'操作',width:100,action:true});
    var page=state.pages[key]||1,data=D.records(m,pid,f,page,10),rows=data.rows.map(function(r){
      var b=r.bill&&D.bill(r.bill),policy=b&&(b.policySnapshot||[]).find(function(pol){return pol.id===r.policy;}),store=D.getStore(r.store),seller=D.getSeller(r.seller),path=fundingOrderPath(r,scope),row=[link(r.order,path),textcell(store.name)];
      if(showSeller)row.push(seller?party(seller):'—');
      row=row.concat([textcell((D.sources.find(function(s){return s.code===r.source;})||{name:r.source}).name),e(r.source),r.kind==='refund'?'<span class="negative">平台出资退款</span>':'平台出资',moneycell(r.amount),e(r.orderOccurred),e(r.occurred),e(ym(r.month)),e(policy?policy.name:'历史政策')]);
      if(showSettlement)row.push(link('JS'+r.bill.replace(/-/g,'').toUpperCase(),'/settlement/'+r.bill));
      row.push(link('查看订单',path));return row;
    });
    var trail=fundingTrail(m,scope).concat([{name:'订单出资明细'}]);
    var html=(isProjectScope()?customBreadcrumb(trail):breadcrumb(trail))+'<section class="panel">'+title('订单出资明细',btn('导出明细','export-filtered',m+'|'+pid),ym(m));
    if(scope.bill||scope.policy)html+='<div class="funding-scope">'+(scope.bill?'<span>结算单：'+link('JS'+scope.billId.replace(/-/g,'').toUpperCase(),'/settlement/'+scope.billId)+'</span>':'')+(scope.policy?'<span>优惠政策：'+e(scope.policy.name)+'</span>':'')+'</div>';
    html+=query(key,[{key:'store',label:'门店',options:D.stores.map(function(s){return{value:s.id,label:s.name};})},{key:'kind',label:'明细类型',options:[{value:'positive',label:'平台出资'},{value:'refund',label:'平台出资退款'}]}])+'<div class="toolbar"><span class="secondary">平台出资净额 <span class="money">¥ '+money(data.amount)+'</span></span><span class="muted">'+e(p.name)+'</span></div>'+table(cols,rows,'未找到符合条件的出资明细',1620+(showSeller?240:0)+(showSettlement?190:0))+pagination(key,data.total,10)+'</section>';
    return html;
  }
  function refunds(m){
    var key='refunds-'+m,q=state.query[key]||{},page=state.pages[key]||1,filters={kind:'refund',store:q.store||''},data=D.records(m,q.project||null,filters,page,10);
    var segs=D.findSegments(m,q.project||null,filters),projectCount=new Set(segs.map(function(x){return x.project;})).size;
    var rows=data.rows.map(function(r){var p=D.getProject(r.project),pol=D.getPolicy(p,r.policy);return[link(r.order,'/order/'+r.id),e(r.orderOccurred),e(r.refundOccurred),e(ym(r.month)),moneycell(r.amount),textcell(p.name),textcell(pol?pol.name:'历史政策'),textcell(D.getStore(r.store).name),link('查看订单','/order/'+r.id)];});
    return breadcrumb([{name:ym(m),path:'/month/'+m},{name:'退款出资明细'}])+'<section class="panel">'+title('退款出资明细',btn('导出明细','export-refunds',m),ym(m))+kpis([['平台出资退款金额',data.amount,null,'negative'],['退款明细',count(data.total)+' 笔',null,'',true],['归属月份',ym(m),null,'',true],['涉及合作项目',String(projectCount)+' 个',null,'',true]])+'</section><section class="panel">'+title('本月退款明细')+query(key,[{key:'project',label:'合作项目',options:db.projects.map(function(p){return{value:p.id,label:p.name};})},{key:'store',label:'门店',options:D.stores.map(function(st){return{value:st.id,label:st.name};})}])+'<div style="height:20px"></div>'+table([{label:'原订单号',width:270},{label:'原交易时间',width:170},{label:'退款发生时间',width:170},{label:'归属月份',width:125},{label:'平台出资退款金额',numeric:true,width:140},{label:'合作项目',width:210},{label:'优惠政策',width:165},{label:'门店',width:160},{label:'操作',action:true,width:100}],rows,'本月暂无符合条件的退款明细',1510)+pagination(key,data.total,10)+'</section>';
  }
  function legacyOrderAction(text){return'<span class="legacy-order-action">'+e(text)+'</span>';}
  function orderDetail(id){
    var o=window.DemoOrderData.get(id);if(!o)return notFound();var r=o.fundingRecord,source=route().params.get('source');
    var crumbs=!r||source==='orders'?customBreadcrumb([{name:'订单管理',path:'/orders'},{name:'订单详情'}]):source==='project'?customBreadcrumb([{name:'合作项目',path:'/projects'},{name:D.getProject(r.project).name,path:'/project/'+r.project+'?tab=months'},{name:ym(r.month),path:contextualPath(projectLink(D.getProject(r.project),r.month)+'?tab=policies')},{name:'出资明细',path:contextualPath('/funding/'+r.month+'/'+r.project)},{name:'订单详情'}]):['preissued','small'].includes(source)?customBreadcrumb([{name:'预开平台发票',path:'/preissued'}].concat(route().params.get('preinvoice')?[{name:'申请详情',path:'/preinvoice/'+route().params.get('preinvoice')}]:[]).concat([{name:'订单详情'}])):breadcrumb([{name:ym(r.month),path:'/month/'+r.month},{name:'出资明细',path:'/funding/'+r.month+'/'+r.project},{name:'订单详情'}]);
    if(r&&route().params.get('from')==='funding'){
      var scope=fundingScope(r.month,r.project,route().params);if(!scope||scope.billId&&scope.billId!==r.bill||scope.policyId&&scope.policyId!==r.policy)return notFound();
      var trail=fundingTrail(r.month,scope).concat([{name:'出资明细',path:contextualPath(scope.url)},{name:'订单详情'}]);crumbs=isProjectScope()?customBreadcrumb(trail):breadcrumb(trail);
    }
    var fields=[['订单号',e(o.number)],['下单渠道',e(o.channel)],['退货状态',o.returned?'已退货':'未退货'],['订餐人手机号',e(o.buyerPhone||'-')],['收餐人手机号',e(o.recipientPhone||'-')],['门店名',e(o.store)],['省份',e(o.province)],['城市',e(o.city)],['订单原价',moneycell(o.original)],['订单折扣',moneycell(o.discount)],['应收金额',moneycell(o.amount)],['订单创建时间',e(o.createdAt)],['订单完成时间',e(o.completedAt)],['业务场景',e(o.scene)]];
    if(r&&r.kind==='refund')fields.push(['退款发生时间',e(r.refundOccurred)],['负向出资归属月份',e(ym(r.month))]);
    function panel(name,body){return'<section class="panel order-section">'+title(name)+body+'<div class="table-bottom-space"></div></section>';}
    var html=crumbs+'<section class="panel order-section">'+title('订单信息')+'<div class="section order-info">'+info(fields)+'</div></section>';
    html+=panel('销售信息',table([{label:'商品名称'},{label:'单位',width:180},{label:'数量',width:180},{label:'总金额',numeric:true,width:220}],[['餐饮','次','1',moneycell(o.amount)]]));
    html+=panel('支付信息',table([{label:'支付通道'},{label:'编码',width:170},{label:'金额',numeric:true,width:210},{label:'可开票金额',numeric:true,width:230}],[[e(o.paymentChannel),e(o.paymentCode),moneycell(o.paid),moneycell(o.paid)]]));
    if(r){var parts=D.orderParts(r),rows=parts.map(function(x){var p=D.getProject(x.project),pol=p&&D.getPolicy(p,x.policy);return[e((D.sources.find(function(s){return s.code===x.source;})||{name:x.source}).name),moneycell(Math.abs(x.amount)),p?e(D.getPartner(p.partner).name):'-',p?link(p.name,projectLink(p,x.month)):'-',e(pol?pol.name:'-'),x.seller?party(D.getSeller(x.seller)):'-',e(x.item||'-')];});html+=panel('平台出资明细',table([{label:'优惠名称',width:160},{label:'出资金额',numeric:true,width:120},{label:'合作伙伴',width:120},{label:'合作项目',width:200},{label:'优惠政策',width:160},{label:'实际销方',width:230},{label:'开票项目',width:160}],rows,'暂无平台出资明细',1150));}
    var applications=o.applications.map(function(a){return[e(a.id),moneycell(a.amount),e(a.phone||'-'),e(a.status),e(a.origin),e(a.invoiceType),e(a.appliedAt),'<div class="reference-order-actions">'+legacyOrderAction('查看')+legacyOrderAction('撤销申请')+legacyOrderAction('重新发送电子发票')+'</div>'];});
    html+=panel('申请记录',table([{label:'申请任务号',systemId:true,width:210},{label:'开票金额',numeric:true,width:130},{label:'开票人手机号',width:150},{label:'开票申请状态',width:130},{label:'开票发起方式',width:130},{label:'发票种类',width:210},{label:'申请开票时间',width:180},{label:'操作',action:true,width:190}],applications,'暂无申请记录',1330));
    return html;
  }
  function ordersQuery(q,key,fields){
    key=key||'orders';fields=fields||[{key:'order',label:'订单号'},{key:'channel',label:'订单渠道',options:window.DemoOrderData.channels},{key:'store',label:'门店名或门店号'},{key:'invoice',label:'开票状态',options:[{value:'unissued',label:'未开票'},{value:'issued',label:'已开票'}]},{key:'returned',label:'退货状态',options:[{value:'not-returned',label:'未退货'},{value:'returned',label:'已退货'}]},{key:'created',label:'订单创建时间',range:true},{key:'phone',label:'用户手机号'}];
    return'<form class="query orders-query" id="orders-query" data-query="'+key+'">'+fields.map(function(f){
      if(f.range)return'<div class="qfield order-date-field'+(q.createdFrom||q.createdTo?' filled':'')+'"><label for="orders-date">'+e(f.label)+'</label><button type="button" class="order-date-trigger" id="orders-date" data-action="orders-date" aria-label="'+e(f.label)+'" aria-haspopup="dialog" aria-expanded="false"><span class="orders-date-start">'+e(q.createdFrom||'开始日期')+'</span><span class="orders-date-end">'+e(q.createdTo||'结束日期')+'</span><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="1"/><path d="M5 1v4m6-4v4M2 7h12"/></svg></button><input type="hidden" name="createdFrom" value="'+e(q.createdFrom||'')+'"><input type="hidden" name="createdTo" value="'+e(q.createdTo||'')+'"></div>';
      var v=q[f.key]||'';return'<div class="qfield'+(v?' filled':'')+'"><label for="'+key+'-'+f.key+'">'+f.label+'</label>'+(f.options?select(key+'-'+f.key,v,[{value:'',label:'全部'}].concat(options(f.options)),f.label,'query'):'<input id="'+key+'-'+f.key+'" name="'+f.key+'" aria-label="'+f.label+'" value="'+e(v)+'" autocomplete="off">')+'</div>';
    }).join('')+'<div class="query-actions"><button class="query-reset" type="button" data-action="reset-query" data-id="'+key+'">清空条件</button><button class="btn primary" type="submit">搜索</button></div></form>';
  }
  function orders(){
    var O=window.DemoOrderData,key='orders';if(!state.query[key])state.query[key]={createdFrom:O.defaultDate,createdTo:O.defaultDate};
    var q=state.query[key],invalid=q.createdFrom&&q.createdTo&&q.createdFrom>q.createdTo,items=invalid?[]:O.filter(q),size=state.sizes[key]||10,page=Math.min(state.pages[key]||1,Math.max(1,Math.ceil(items.length/size)));state.pages[key]=page;
    var rows=items.slice((page-1)*size,page*size).map(function(o){return[textcell(o.number),e(o.province),e(o.city),'<div class="order-store">'+e(o.store)+'</div>',moneycell(o.amount),e(o.buyerPhone||'-'),e(o.recipientPhone||'-'),e(o.channel),o.returned?'已退货':'未退货',o.invoiced?'已开票':'未开票',e(o.createdAt),'<div class="row-actions">'+link('查看','/order/'+o.id+'?source=orders')+(!o.returned?legacyOrderAction('标记退货'):'')+(!o.invoiced&&!o.returned?legacyOrderAction('开票'):'')+'</div>'];});
    return'<section class="panel order-list">'+title('订单管理')+ordersQuery(q)+(invalid?'<div class="notice error">开始日期不能晚于结束日期</div>':'')+'<div class="toolbar actions-only">'+legacyOrderAction('合并开票')+'</div>'+table([{label:'订单号',width:230},{label:'省份',width:125},{label:'城市',width:125},{label:'门店名',width:220},{label:'订单金额',numeric:true,width:140},{label:'订餐人手机号',width:160},{label:'收餐人手机号',width:160},{label:'订单渠道',width:140},{label:'退货状态',width:115},{label:'开票状态',width:115},{label:'订单创建时间',width:190},{label:'操作',action:true,width:205}],rows,invalid?'请调整订单创建时间':'未找到符合条件的订单',1925)+customerPager(key,items.length)+'</section>';
  }
  function filteredCooperationProjects(){
    var q=state.query.projects||{};
    return db.projects.filter(function(p){return(!q.name||(p.name+p.code).includes(q.name))&&(!q.partner||p.partner===q.partner);});
  }
  function projectList(){
    var key='projects',items=filteredCooperationProjects(),page=Math.min(state.pages[key]||1,Math.max(1,Math.ceil(items.length/10)));state.pages[key]=page;
    var rows=items.slice((page-1)*10,page*10).map(function(p){return[link(p.name,'/project/'+p.id+'?tab=months'),textcell(D.getPartner(p.partner).name),party(D.getBuyer(p)),e(p.invoiceType.replace('增值税','')),e(p.cycle),count(p.policies.length),e(p.code),'<div class="row-actions">'+link('查看','/project/'+p.id+'?tab=months')+link('编辑','/project-edit/'+p.id)+'</div>'];});
    var cols=[{label:'项目名称',width:220},{label:'合作伙伴',width:160},{label:'购方主体',width:250},{label:'发票种类',width:140},{label:'结算周期',width:100},{label:'政策数',numeric:true,width:85},{label:'项目编号',systemId:true,width:145},{label:'操作',action:true,width:115}];
    return'<section class="panel">'+title('合作项目')+query(key,[{key:'name',label:'项目名称或编号'},{key:'partner',label:'合作伙伴',options:db.partners.map(function(p){return{value:p.id,label:p.name};})}])+'<div class="toolbar"><span class="secondary">共 '+items.length+' 个合作项目</span><div class="actions">'+btn('导出项目资料','export-projects')+link('新增合作项目','/project-edit/new','btn primary md')+'</div></div>'+table(cols,rows,'未找到符合条件的合作项目',1215)+(items.length>10?pagination(key,items.length,10):'<div class="table-bottom-space"></div>')+'</section>';
  }
  function projectMonthSummaries(pid){
    var groups=new Map();D.projectHistory(pid).forEach(function(b){if(!groups.has(b.month))groups.set(b.month,[]);groups.get(b.month).push(b);});
    return Array.from(groups.entries()).map(function(entry){return{month:entry[0],totals:D.totals(entry[1])};}).sort(function(a,b){return b.month.localeCompare(a.month);});
  }
  function filteredProjectMonths(pid){
    var q=state.query['project-months-'+pid]||{};
    return projectMonthSummaries(pid).filter(function(x){var t=x.totals;return(!q.year||x.month.startsWith(q.year+'-'))&&(!q.status||(q.status==='pending'&&t.pendingCount>0)||(q.status==='errors'&&t.failed>0)||(q.status==='done'&&!t.pendingCount));});
  }
  function monthProcessingCell(x){
    var t=x.totals;
    return'<div class="table-identity">'+summaryStatus(t,x.month)+'<small>开票进度 '+(t.progress==null?'—':t.progress+'%')+'</small>'+(t.pendingCount?'<small>待处理 '+t.pendingCount+' 张'+(t.failed?' · 异常 '+t.failed+' 张':'')+'</small>':'')+'</div>';
  }
  function projectMonthsTable(pid,months){
    var p=D.getProject(pid),cols=[{label:'月份',width:145},{label:'平台出资净额',numeric:true,width:150},{label:'应开票金额',numeric:true,width:180},{label:'已开票金额',numeric:true,width:145},{label:'待开票金额',numeric:true,width:145},{label:'结算单数',numeric:true,width:110},{label:'处理状态',width:180},{label:'操作',action:true,width:110}];
    var rows=months.map(function(x){var t=x.totals,url=projectLink(p,x.month)+'?tab=settlements';return[link(ym(x.month),url),moneycell(t.net),expectedCell(t),moneycell(t.issued),moneycell(t.unissued),count(t.billCount),monthProcessingCell(x),link('查看月份',url)];});
    return table(cols,rows,projectMonthSummaries(pid).length?'未找到符合条件的月份':'暂无已结算月份',1165);
  }
  function cooperationProject(pid){
    var p=D.getProject(pid);if(!p)return notFound();
    var key='project-home-'+pid,tab=state.tabs[key]||'months';
    if(!['months','config'].includes(tab))tab='months';
    var tabs='<div class="tabs" role="tablist" aria-label="合作项目详情">'+[['months','月度汇总'],['config','项目配置']].map(function(x){return'<button role="tab" aria-selected="'+(tab===x[0])+'" data-tab="'+key+'|'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>';
    var html=customBreadcrumb([{name:'合作项目',path:'/projects'},{name:p.name}])+'<section class="panel"><div class="summary-top"><div><div class="period-title"><h1>'+e(p.name)+'</h1></div><div class="summary-sub"><span>合作伙伴：'+e(D.getPartner(p.partner).name)+'</span><span>项目编号：'+e(p.code)+'</span></div></div></div>'+tabs;
    if(tab==='config')return html+'</section>'+projectConfigContent(pid);
    var allMonths=projectMonthSummaries(pid);html+='</section>';
    var current=D.totals(D.projectBills(D.TODAY,pid));
    html+='<section class="panel project-current-panel">'+title('本月归集',link('查看本月归集',projectLink(p,D.TODAY)+'?tab=policies'),ym(D.TODAY)+' · 结算单未生成')+metricRows(current,true)+'</section>';
    var listKey='project-months-'+pid,q=state.query[listKey]||{},filtered=!!(q.year||q.status),shown=filteredProjectMonths(pid),years=Array.from(new Set(allMonths.map(function(x){return x.month.slice(0,4);}))).map(function(y){return{value:y,label:y+' 年'};});
    html+='<section class="panel">'+title('月度汇总')+query(listKey,[{key:'year',label:'年份',options:years},{key:'status',label:'处理状态',options:[{value:'pending',label:'有待处理'},{value:'errors',label:'有异常'},{value:'done',label:'已完成'}]}])+'<div class="toolbar"><span class="secondary">'+(filtered?'筛选结果':'已结算月份')+' · 共 '+shown.length+' 个月</span>'+btn('导出月度汇总','export-project-months',pid)+'</div>'+projectMonthsTable(pid,shown)+'<div class="table-bottom-space"></div></section>';
    return html;
  }
  function projectConfigContent(pid){
    var p=D.getProject(pid);if(!p)return notFound();
    var rows=p.policies.map(function(pol){var sourceNames=pol.sources.map(function(code){return(D.sources.find(function(s){return s.code===code;})||{name:code}).name;}).join('、');return[e(pol.name),textcell(sourceNames),pol.sellerMode==='order'?'门店所属纳税人':'<span>指定纳税人</span>'+party(D.getSeller(pol.sellerId)),e(pol.item||'-'),e(pol.taxCode||'-'),e(pol.taxShortName||'-'),rateText(pol.taxRate)];});
    return'<section class="panel">'+title('项目基本信息',link('编辑','/project-edit/'+pid))+'<div class="section" style="padding-top:0">'+info([['项目名称',e(p.name)],['项目编号',e(p.code)],['合作伙伴',link(D.getPartner(p.partner).name,'/partner/'+p.partner)],['购买方',party(D.getBuyer(p))],['发票种类',e(p.invoiceType)],['结算周期',e(p.cycle)]])+'</div></section><section class="panel">'+title('优惠政策')+table([{label:'政策名称',width:180},{label:'优惠范围',width:220},{label:'开票方',width:300},{label:'开票项目名称',width:180},{label:'税收分类编码',width:205},{label:'税收分类简称',width:160},{label:'税率',width:90}],rows,null,1335)+'<div style="height:20px"></div></section>';
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
  var preissuedStatusMap={processing:['处理中','processing'],completed:['已完成','success'],revoking:['撤销中','processing'],revoked:['已撤销','default'],failed:['申请失败','error']};
  var preissuedTimer=null;
  function preissuedStatus(a){var v=preissuedStatusMap[a.applicationStatus];return'<span class="status '+v[1]+'">'+v[0]+'</span>';}
  function preissuedBillLink(text,bid,invoiceId){var path=invoiceId?'/invoice/'+bid+'/'+invoiceId:'/settlement/'+bid;return link(text,path+'?source=project').replace(' data-route=',' data-refresh-bill="'+e(bid)+'" data-route=');}
  function preissuedActions(a,detail){
    var html=detail?'':link('查看','/preinvoice/'+a.id);
    if(a.applicationStatus==='failed')html+=action('失败原因','pre-failure',a.id)+action('重试','pre-retry',a.id);
    else if(['processing','revoking'].includes(a.applicationStatus))html+=action('刷新','pre-refresh',a.id);
    return'<div class="row-actions">'+html+'</div>';
  }
  function preissuedOverview(){
    if(!P)return notFound();P.refresh();processPreissued();var key='preissued';if(!state.query[key])state.query[key]={createdFrom:D.TODAY+'-01',createdTo:D.TODAY+'-30'};
    var q=state.query[key],size=10,page=state.pages[key]||1,invalid=q.createdFrom&&q.createdTo&&q.createdFrom>q.createdTo,result=invalid?{rows:[],total:0}:P.applications(q,page,size),maxPage=Math.max(1,Math.ceil(result.total/size));
    if(page>maxPage){page=maxPage;state.pages[key]=page;result=P.applications(q,page,size);}
    var fields=[{key:'request',label:'申请任务号'},{key:'order',label:'订单号'},{key:'status',label:'开票申请状态',options:Object.keys(preissuedStatusMap).map(function(k){return{value:k,label:preissuedStatusMap[k][0]};})},{key:'store',label:'门店名或门店号'},{key:'seller',label:'销方纳税人名称/税号'},{key:'created',label:'申请开票时间',range:true}];
    var rows=result.rows.map(function(a){return[link(a.requestNumber,'/preinvoice/'+a.id),moneycell(a.amount),preissuedStatus(a),e(a.origin),e(a.invoiceType),e(a.appliedAt),preissuedActions(a)];});
    return'<section class="panel">'+title('预开平台发票')+ordersQuery(q,key,fields)+(invalid?'<div class="notice error">开始日期不能晚于结束日期</div>':'')+'<div class="toolbar">'+btn('导出','pre-export')+'<div class="grow"></div>'+action('批量重试','pre-retry-all')+'</div>'+table([{label:'申请任务号',width:180},{label:'开票金额',numeric:true,width:85},{label:'开票申请状态',width:110},{label:'开票发起方式',width:110},{label:'发票种类',width:145},{label:'申请开票时间',width:160},{label:'操作',action:true,width:170}],rows,'未找到符合条件的开票申请',960)+(result.total?pagination(key,result.total,size):'<div class="table-bottom-space"></div>')+'</section>';
  }
  function preinvoiceView(id,params){
    var a=P&&P.application(id);if(!a)return notFound();var tab=params.get('tab'),preview=tab==='original'||tab==='red',red=tab==='red',snapshot=preview&&P.invoiceSnapshot(id,red);
    var crumbs=[{name:'预开平台发票',path:'/preissued'},{name:'申请详情',path:'/preinvoice/'+id}];
    if(preview){if(!snapshot)return notFound();crumbs.push({name:red?'红字发票':'蓝字发票'});return customBreadcrumb(crumbs)+'<section class="panel">'+title(red?'红字发票':'蓝字发票',btn('下载','pre-download',id+'|'+tab))+invoicePaper(snapshot)+'</section>';}
    function card(name,body,actions){return'<section class="panel preapplication-card">'+title(name,actions)+body+'</section>';}
    var fields=[['申请时间',e(a.appliedAt)],['申请任务号',e(a.requestNumber)],['开票申请状态',preissuedStatus(a)],['开票发起方式',e(a.origin)],['发票种类',e(a.invoiceType)],['开票金额',moneycell(a.amount)]];
    if(a.billId)fields.push(['关联结算单',preissuedBillLink('JS'+a.billId.replace(/-/g,'').toUpperCase(),a.billId)]);
    if(a.triggerInvoice)fields.push(['撤销原因','关联结算单已开票'],['撤销完成时间',e(a.completedAt&&a.applicationStatus==='revoked'?a.completedAt:'—')]);
    var html=customBreadcrumb(crumbs)+card('开票申请信息','<div class="section">'+info(fields)+'</div>',preissuedActions(a,true));
    html+=card('购买方信息','<div class="section">'+info([['购买方名称',e(P.BUYER)],['纳税人识别号','—'],['开票项目',e(P.ITEM)]])+'</div>');
    var rows=[];
    if(a.hasInvoice){rows.push([link(a.number,'/preinvoice/'+id+'?tab=original'),'蓝票',moneycell(a.amount),a.applicationStatus==='revoked'?'已红冲':'已开票',textcell(a.seller.name),e(a.seller.tax),e(a.date),action('下载','pre-download',id+'|original')]);
      if(a.redNumber)rows.push([link(a.redNumber,'/preinvoice/'+id+'?tab=red'),'红票',moneycell(-a.amount),'已开票',textcell(a.seller.name),e(a.seller.tax),e(a.completedAt),action('下载','pre-download',id+'|red')]);
    }
    html+=card('关联发票信息',table([{label:'发票号码',width:225},{label:'票据方向',width:80},{label:'开票金额',numeric:true,width:100},{label:'开票状态',width:100},{label:'纳税人名称',width:210},{label:'税号',width:195},{label:'生成时间',width:175},{label:'操作',action:true,width:90}],rows,'暂无关联发票',1200));
    var o=window.DemoOrderData.get(a.fundingId);
    html+=card('关联订单信息',table([{label:'订单号',width:270},{label:'门店名',width:180},{label:'订单金额',numeric:true,width:130},{label:'本次开票金额',numeric:true,width:140},{label:'订单渠道',width:120},{label:'操作',action:true,width:90}],o?[[e(o.number),textcell(o.store),moneycell(o.amount),moneycell(a.amount),e(o.channel),link('查看','/order/'+a.fundingId+'?source=preissued&preinvoice='+encodeURIComponent(id))]]:[],'暂无关联订单',940));return html;
  }
  function canRefreshPreissuedView(){return !state.dirty&&!state.layer&&!state.selectOpen&&!(document.activeElement&&document.activeElement.closest('.query'))&&['preissued','preinvoice','small','small-task'].includes(route().parts[0]);}
  function processPreissued(){
    if(!P||preissuedTimer)return;if(!P.startPending())return;
    preissuedTimer=setTimeout(function(){preissuedTimer=null;var changed=P.finishPending();if(changed&&canRefreshPreissuedView())render(true);processPreissued();},900);
  }
  function refreshPreissued(id){P.refresh();if(id)P.refreshApplication(id);processPreissued();render(true);toast('已刷新申请状态');}
  function retryPreissued(id){try{P.retryApplication(id);processPreissued();render(true);toast('已重新提交申请');}catch(err){toast(err.message);}}
  function showPreissuedFailure(id){var a=P.application(id);if(!a||a.applicationStatus!=='failed')return;showLayer({title:'申请失败原因',size:'standard',readonly:true,body:'<p class="secondary">'+e(a.failureStage)+'失败 · '+e(a.requestNumber)+'</p><p class="request-failure-message">'+e(a.error||'未记录失败原因')+'</p>'});}
  function downloadPreissued(id,tone){var inv=P.invoiceSnapshot(id,tone==='red');if(!inv)return;download(inv.id+'-样票.svg',invoiceSvg(inv),'image/svg+xml;charset=utf-8');toast('发票样票已下载');}
  function exportPreissued(){var rows=[['申请任务号','开票金额','开票申请状态','开票发起方式','发票种类','申请开票时间']];P.applications(state.query.preissued||{},1,Number.MAX_SAFE_INTEGER).rows.forEach(function(a){rows.push([a.requestNumber,money(a.amount),preissuedStatusMap[a.applicationStatus][0],a.origin,a.invoiceType,a.appliedAt]);});download('预开平台发票-开票申请.csv',csv(rows));toast('开票申请已导出');}
  function retryAllPreissued(){var q=state.query.preissued||{};if(q.status&&q.status!=='failed'){toast('当前筛选结果中没有可重试的申请');return;}var rows=P.applications(Object.assign({},q,{status:'failed'}),1,Number.MAX_SAFE_INTEGER).rows;if(!rows.length){toast('当前筛选结果中没有可重试的申请');return;}rows.forEach(function(a){P.retryApplication(a.id);});processPreissued();render(true);toast('已重新提交 '+rows.length+' 笔申请');}
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
  function syncProjectDraft(){
    var form=$('#project-form');if(!form||!state.draft)return;
    var data=new FormData(form),p=state.draft;
    p.name=String(data.get('project-name')||'');p.partner=String(data.get('project-partner')||'');p.buyer=(D.getPartner(p.partner)?.buyers[0]||{}).id||'';p.invoiceType=String(data.get('project-type')||'');p.cycle='自然月';
    p.policies.forEach(function(pol,i){
      pol.name=String(data.get('pol-name-'+i)||'');pol.sources=data.getAll('pol-sources-'+i);delete pol.stores;delete pol.storeScope;
      pol.sellerMode=String(data.get('pol-mode-'+i)||'order');if(data.has('pol-seller-'+i))pol.sellerId=String(data.get('pol-seller-'+i)||'');
      var code=String(data.get('pol-tax-code-'+i)||'').trim(),changed=code!==pol.taxCode,entry=D.lookupTaxCode(code),rate=data.get('pol-tax-rate-'+i);
      pol.taxCode=code;pol.taxShortName=entry?entry.shortName:'';pol.item=String(data.get('pol-item-'+i)||'').trim();
      pol.taxRate=changed||!entry||!entry.shortName||rate==null||rate===''?null:Number(rate);
    });
  }
  function rateText(rate){return rate==null?'未选择':String(rate)+'%';}
  function policyTaxResult(pol,i){
    var entry=D.lookupTaxCode(pol.taxCode),enabled=entry&&entry.shortName;
    var rate=select('pol-tax-rate-'+i,pol.taxRate==null?'':String(pol.taxRate),D.taxRates.map(function(n){return{value:String(n),label:n+'%'};}),'税率 '+(i+1));
    if(!enabled)rate=rate.replace('<button ','<button disabled ');
    return field('税收分类简称','<output id="pol-tax-short-'+i+'" class="readonly-text" aria-label="税收分类简称 '+(i+1)+'">'+e(enabled?entry.shortName:'—')+'</output>')+field('税率',rate,true);
  }
  function policyTaxFields(pol,i){
    var body=input('pol-tax-code-'+i,pol.taxCode||'','税收分类编码 '+(i+1),true).replace('autocomplete="off"','autocomplete="off" inputmode="numeric" maxlength="64" placeholder="请输入税收分类编码"');
    return '<div class="policy-invoice-item"><h4>开票项目</h4>'+field('开票项目名称',input('pol-item-'+i,pol.item||'','开票项目名称 '+(i+1),true),true,'票面格式：*税收分类简称*开票项目名称')+field('税收分类编码',body+'<div id="tax-code-feedback-'+i+'" class="tax-code-feedback" aria-live="polite"></div>',true)+'<div id="policy-tax-result-'+i+'">'+policyTaxResult(pol,i)+'</div></div>';
  }
  function updatePolicyTaxInput(i){
    syncProjectDraft();var pol=state.draft.policies[i],entry=D.lookupTaxCode(pol.taxCode),feedback=$('#tax-code-feedback-'+i),control=$('#pol-tax-code-'+i);
    var error=entry&&!entry.shortName?'该编码的税收分类简称未配置':pol.taxCode.length>=19&&!entry?'未查询到该税收分类编码，请核对输入':'';
    if(feedback)feedback.textContent=error;$("#project-errors").innerHTML="";if(control){$$(".field-error",control.parentElement).forEach(function(n){n.remove();});control.removeAttribute("aria-describedby");if(error)control.setAttribute('aria-invalid','true');else control.removeAttribute('aria-invalid');}
    closeSelect();$('#policy-tax-result-'+i).innerHTML=policyTaxResult(pol,i);
  }
  function projectEdit(id){
    if(!state.draft||state.draft._editing!==id){
      var existing=D.getProject(id);
      state.draft=existing?JSON.parse(JSON.stringify(existing)):{id:'p'+Date.now(),code:'HZ2026'+String(db.projects.length+1).padStart(3,'0'),name:'',partner:db.partners[0].id,buyer:(db.partners[0].buyers[0]||{}).id||'',invoiceType:'增值税专用发票',cycle:'自然月',policies:[{id:'pl'+Date.now(),name:'',sources:[],sellerMode:'order',sellerId:'',taxCode:'',taxShortName:'',taxRate:null,item:''}]};
      state.draft._editing=id;state.dirty=false;
    }
    var p=state.draft,partner=D.getPartner(p.partner),buyers=partner?partner.buyers:[];
    var pols=p.policies.map(function(pol,i){
      var modes='<div class="radio-group" role="radiogroup" aria-label="开票方">'+[['order','门店所属纳税人'],['fixed','指定纳税人']].map(function(x){return'<label class="radio-row"><input type="radio" name="pol-mode-'+i+'" value="'+x[0]+'"'+(pol.sellerMode===x[0]?' checked':'')+'><span>'+x[1]+'</span></label>';}).join('')+'</div>';
      return'<div class="policy-edit"><div class="policy-edit-head"><h3>优惠政策 '+(i+1)+'</h3>'+(p.policies.length>1?action('移除此政策','remove-policy',String(i)):'')+'</div>'+field('政策名称',input('pol-name-'+i,pol.name,'政策名称 '+(i+1),true),true)+field('适用优惠',checkList('pol-sources-'+i,pol.sources,D.sources.map(function(s){return{value:s.code,label:s.name+' · '+s.code};})),true)+field('开票方',modes,true)+(pol.sellerMode==='fixed'?field('开票纳税人',select('pol-seller-'+i,pol.sellerId,D.sellers.map(function(s){return{value:s.id,label:s.name+' · '+s.tax};}),'开票纳税人 '+(i+1)),true):'')+policyTaxFields(pol,i)+'</div>';
    }).join('');
    return customBreadcrumb([{name:'合作项目',path:'/projects'},{name:id==='new'?'新增合作项目':'编辑合作项目'}])+'<section class="panel form-card">'+title(id==='new'?'新增合作项目':'编辑合作项目')+'<form id="project-form" novalidate><div class="form-inner"><div id="project-errors"></div><div class="form-group"><h3>项目基本信息</h3>'+field('项目名称',input('project-name',p.name,'项目名称',true),true)+field('合作伙伴',select('project-partner',p.partner,db.partners.map(function(x){return{value:x.id,label:x.name};}),'合作伙伴'),true)+field('购方主体',buyers.length?party(buyers[0]):'<span class="error-text">该客户尚未设置发票抬头</span>')+field('发票种类',select('project-type',p.invoiceType,['增值税专用发票','增值税普通发票'],'发票种类'),true)+field('结算周期','<div style="padding-top:7px">自然月</div>')+'</div><div class="form-group"><h3>优惠政策</h3>'+pols+'<div style="margin-top:24px">'+btn('添加优惠政策','add-policy')+'</div></div></div><div class="form-actions">'+btn('取消','cancel-project')+'<button class="btn primary" type="submit">确定</button></div></form></section>';
  }
  function validateProject(){
    syncProjectDraft();var p=state.draft,errors=[];
    if(!p.name.trim())errors.push({name:'project-name',message:'请填写项目名称'});
    if(!p.partner)errors.push({name:'project-partner',message:'请选择合作伙伴'});
    if(!p.buyer)errors.push({name:'project-partner',message:'请先为所选客户设置发票抬头'});
    var scopes={};
    db.projects.filter(function(x){return x.id!==p.id;}).forEach(function(x){x.policies.forEach(function(pol){pol.sources.forEach(function(source){scopes[source]=x.name+' / '+pol.name;});});});
    p.policies.forEach(function(pol,i){
      if(!pol.name.trim())errors.push({name:'pol-name-'+i,message:'请填写第 '+(i+1)+' 项政策名称'});
      if(!pol.sources.length)errors.push({name:'pol-sources-'+i,message:'请选择第 '+(i+1)+' 项政策的适用优惠'});
      if(pol.sellerMode==='fixed'&&!pol.sellerId)errors.push({name:'pol-seller-'+i,message:'请选择第 '+(i+1)+' 项政策的开票纳税人'});
      if(!pol.item)errors.push({name:'pol-item-'+i,message:'请填写第 '+(i+1)+' 项政策的开票项目名称'});
      var taxEntry=D.lookupTaxCode(pol.taxCode);
      if(!pol.taxCode)errors.push({name:'pol-tax-code-'+i,message:'请填写第 '+(i+1)+' 项政策的税收分类编码'});
      else if(!taxEntry)errors.push({name:'pol-tax-code-'+i,message:'未查询到该税收分类编码，请核对输入'});
      else if(!taxEntry.shortName)errors.push({name:'pol-tax-code-'+i,message:'该编码的税收分类简称未配置'});
      if(taxEntry&&taxEntry.shortName&&(pol.taxRate==null||!D.taxRates.includes(pol.taxRate)))errors.push({name:'pol-tax-rate-'+i,message:'请选择第 '+(i+1)+' 项政策的税率'});
      pol.sources.forEach(function(source){if(scopes[source])errors.push({name:'pol-name-'+i,message:source+' 已用于 '+scopes[source]});else scopes[source]=p.name+' / '+pol.name;});
    });
    $$('[aria-invalid=true]',$('#project-form')).forEach(function(n){n.removeAttribute('aria-invalid');n.removeAttribute('aria-describedby');});
    $$('.field-error',$('#project-form')).forEach(function(n){n.remove();});
    if(errors.length){
      $('#project-errors').innerHTML='<div class="notice error" style="margin:0 0 24px">'+errors.slice(0,3).map(function(x){return e(x.message);}).join('<br>')+'</div>';
      errors.forEach(function(x){var node=$('[name="'+x.name+'"]',$('#project-form'));if(node){node.setAttribute('aria-invalid','true');if(node.type==='hidden')document.getElementById(x.name)?.setAttribute('aria-invalid','true');var host=node.closest('.form-row')?.lastElementChild;var codeFeedback=host&&host.querySelector('.tax-code-feedback');if(codeFeedback){codeFeedback.textContent=x.message;node.setAttribute('aria-describedby',codeFeedback.id);return;}if(host&&!host.querySelector('.field-error')){var note=document.createElement('div');note.className='field-error';note.id='error-'+x.name;note.textContent=x.message;host.appendChild(note);node.setAttribute('aria-describedby',note.id);}}});
      var first=$('[name="'+errors[0].name+'"]',$('#project-form'));if(first&&first.type!=='hidden'){first.focus();first.scrollIntoView({block:'center'});}else{var trigger=document.getElementById(errors[0].name);if(trigger)trigger.focus();$('#project-errors').scrollIntoView({block:'center'});}
      return false;
    }
    return true;
  }
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
    draft.email=draft.emails[0]||'';draft.remarkOptions=fd.getAll('invoice-remark-options');
  }
  function draftPreview(b,draft){return{amount:draft.amount,tone:'blue',buyer:b.buyerSnapshot||D.getBuyer(D.getProject(b.project)),seller:D.getSeller(b.seller),item:b.item,invoiceType:b.invoiceType,taxCode:b.taxCode,taxShortName:b.taxShortName,taxRate:b.taxRate,remark:draft.remark};}
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
    var inv=draftPreview(b,draft),extra=D.composeInvoiceRemark('',draft.remarkOptions,inv.buyer,inv.seller),note=$('#invoice-generated-remark');
    $('#invoice-remark-count').textContent=draft.remark.length+' / 500';
    if(note){note.hidden=!draft.remarkOptions.length;note.textContent=extra?'附加备注：'+extra:'所选项目暂无已配置内容。';}
  }
  function invoiceIssue(bid){
    var b=D.bill(bid);if(!b||!canIssue(b))return notFound();var p=D.getProject(b.project),buyer=b.buyerSnapshot||D.getBuyer(p);
    if(!state.invoiceDraft||state.invoiceDraft.bid!==bid){var emails=D.invoiceRecipients(b);state.invoiceDraft={bid:bid,amount:amountOf(b),remark:b.invoiceRemark||'',email:emails[0]||'',emails:emails,remarkOptions:(b.invoiceRemarkOptions||buyer.remarkOptions||[]).slice()};state.dirty=false;}
    var draft=state.invoiceDraft,inv=draftPreview(b,draft),extra=D.composeInvoiceRemark('',draft.remarkOptions,inv.buyer,inv.seller);
    var summary=info([['结算月份',e(ym(b.month))],['合作项目',e(p.name)],['结算单号',link('JS'+bid.replace(/-/g,'').toUpperCase(),'/settlement/'+bid)],['结算金额',moneycell(D.settlementNet(b))],['应开票金额',moneycell(draft.amount)],['调整差额',signedMoney(draft.amount-D.settlementNet(b))]]);
    var options=invoiceRemarkOptions.map(function(option){return'<label class="check-row"><input type="checkbox" name="invoice-remark-options" value="'+option.value+'"'+(draft.remarkOptions.includes(option.value)?' checked':'')+'><span>显示'+option.label+'</span></label>';}).join('');
    return billBreadcrumb(b,'发起开票')+'<section class="panel">'+title('结算单信息')+'<div class="section issue-settlement-info">'+summary+'</div></section><section class="panel invoice-compose"><div class="issue-invoice-heading"><h1>发票信息</h1><span>'+e(b.invoiceType||p.invoiceType)+'</span></div><form id="invoice-form" novalidate><div id="invoice-errors"></div><div class="issue-invoice-frame"><div class="issue-parties">'+invoicePartyDetails(inv.buyer,'购买方')+invoicePartyDetails(inv.seller,'销售方')+'</div><section class="issue-goods"><h2>商品信息</h2>'+invoiceGoods(inv)+'</section></div><section class="issue-extra-section"><h2 id="invoice-remark-label">备注信息</h2><textarea class="textarea" id="invoice-remark" name="invoice-remark" aria-label="发票备注" aria-describedby="invoice-remark-count" maxlength="500" placeholder="请输入备注信息">'+e(draft.remark)+'</textarea><div class="issue-remark-counter"><output id="invoice-remark-count">'+draft.remark.length+' / 500</output></div><div class="issue-remark-options">'+options+'</div><div id="invoice-generated-remark" class="issue-generated-remark"'+(draft.remarkOptions.length?'':' hidden')+'>'+e(extra?'附加备注：'+extra:'所选项目暂无已配置内容。')+'</div></section><section class="issue-extra-section issue-delivery"><h2>发票交付</h2><div id="issue-email-rows">'+invoiceEmailRows(draft)+'</div><button class="dashed-add" type="button" data-action="issue-email-add"><span>＋</span>添加接收邮箱</button></section></form><div class="issue-submit">'+btn('取消','cancel-issue',bid)+'<button class="btn primary" type="submit" form="invoice-form">确认开票</button></div></section>';
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
    try{var a=D.startInvoice(b.id,{amount:amount,remark:draft.remark,remarkOptions:draft.remarkOptions,emails:draft.emails});state.dirty=false;state.invoiceDraft=null;navigate('/settlement/'+b.id,true);toast('开票申请已提交');finishIssue(b.id,a.id);}catch(err){button.disabled=false;button.removeAttribute('aria-busy');invoiceError(err.message);}
  }
  function adjustInvoiceAmount(bid){
    var b=D.bill(bid);if(!canIssue(b))return;
    showLayer({title:'调整应开票金额',size:'standard',values:{amount:(amountOf(b)/100).toFixed(2),reason:''},submitLabel:'保存',body:function(v){return'<p class="amount-context">结算金额：<span class="money">¥ '+money(D.settlementNet(b))+'</span></p>'+field('应开票金额',input('amount',v.amount,'应开票金额',true),true)+field('调整说明','<textarea class="textarea" name="reason" aria-label="调整说明">'+e(v.reason)+'</textarea>',true);},submit:function(v){var amount=parseAmount(v.amount);if(amount===null)return layerError('请填写大于 0 且最多两位小数的金额','amount');if(amount!==amountOf(b)&&!v.reason.trim())return layerError('请填写调整说明','reason');try{D.adjustAmount(b,amount,v.reason);D.save();closeLayer(true);render(true);toast('应开票金额已更新');}catch(err){layerError(err.message,'amount');}}});
  }
  function cancelInvoice(bid){
    var b=D.bill(bid),inv=b&&D.activeInvoice(b);if(!inv||!['issued','reverse_failed'].includes(b.status))return;
    showLayer({title:'撤销已开具的发票？',confirm:true,values:{reason:''},submitLabel:'确认撤销',body:function(v){return'<p>将整张红冲当前蓝票。撤销完成后，可调整应开票金额并重新开票。</p><dl class="confirm-list"><div><dt>蓝票号码</dt><dd>'+e(inv.id)+'</dd></div><div><dt>撤销金额</dt><dd>¥ '+money(inv.amount)+'</dd></div></dl><div class="cancel-reason">'+field('撤销原因','<textarea class="textarea" name="reason" aria-label="撤销原因">'+e(v.reason)+'</textarea>',true)+'</div>';},submit:function(v){if(!v.reason.trim())return layerError('请填写撤销原因','reason');try{var a=D.startReversal(bid,v.reason);closeLayer(true);render(true);toast('撤销申请已提交');finishIssue(bid,a.id);}catch(err){layerError(err.message,'reason');}}});
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
    var name=r.parts[0]||'overview',management=['partners','partner','customer-category'].includes(name);
    var active=management?'partners':['projects','project-config','project-edit'].includes(name)||isProjectScope()?'projects':['preissued','preinvoice','small','small-task'].includes(name)?'preissued':name==='order'&&['preissued','small'].includes(r.params.get('source'))?'preissued':name==='orders'||name==='order'&&r.params.get('source')==='orders'?'orders':'overview';
    state.nav=active;
    $('#topbar').innerHTML='<img class="brand-logo" src="assets/meta/logo-shouqianba-yellow.png" alt="收钱吧"><nav class="top-nav" aria-label="业务模块"><a href="#/overview" data-route="/overview"'+(!management?' aria-current="page"':'')+'>电子发票</a><a href="#/partners" data-route="/partners"'+(management?' aria-current="page"':'')+'>管理功能</a></nav><div class="top-actions"><button class="top-tool" data-action="exports" aria-label="导出记录"><img src="assets/meta/topbar/export-record.svg" alt=""></button><span class="top-divider"></span><div class="account"><img src="assets/meta/identity/default-organization.svg" alt=""><div><strong>达美乐</strong><small>集团财务</small></div></div></div>';
    function navItem(text,path,id){return'<a class="side-link child" href="#'+path+'" data-route="'+path+'"'+(active===id?' aria-current="page"':'')+'><span>'+text+'</span></a>';}
    function referenceItem(text,icon,expandable,child){
      return'<div class="reference-menu-item'+(child?' child':'')+'">'+(child?'':menuIcon(icon))+'<span>'+text+'</span>'+(expandable?'<img class="chevron down" src="assets/meta/pagination-chevron-right.svg" alt="" aria-hidden="true">':'')+'</div>';
    }
    function group(text,id,icon,content,hot){
      var expanded=state.tabs['nav-'+id]!==false;
      return'<div class="side-group"><button class="group-title with-icon'+(hot?' active':'')+'" data-action="toggle-nav" data-id="'+id+'" aria-expanded="'+expanded+'" aria-controls="nav-'+id+'"><span class="menu-label">'+menuIcon(icon)+'<span>'+text+'</span></span><img class="chevron '+(expanded?'up':'down')+'" src="assets/meta/pagination-chevron-right.svg" alt=""></button><div id="nav-'+id+'"'+(!expanded?' class="hidden"':'')+'>'+content+'</div></div>';
    }
    var partnerMenu=group('合作伙伴管理','partners','partners',navItem('客户管理','/partners','partners'),true);
    var invoiceMenu=group('开票管理','invoice','invoice',referenceItem('开票记录',null,false,true)+navItem('开票订单列表','/orders','orders')+referenceItem('开票人列表',null,false,true)+referenceItem('红冲失败的发票',null,false,true)+referenceItem('历史订单查询',null,false,true),active==='orders');
    var platformMenu=group('平台开票管理','tob','platform',navItem('月度总览','/overview','overview')+navItem('合作项目','/projects','projects')+navItem('预开平台发票','/preissued','preissued'),['overview','projects','preissued'].includes(active));
    $('#sidebar').innerHTML=management?'<nav class="side-menu screenshot-menu" aria-label="管理功能">'+referenceItem('用户管理','user')+referenceItem('角色管理','roles')+referenceItem('组织管理','organization',true)+partnerMenu+'</nav>':'<nav class="side-menu screenshot-menu" aria-label="电子发票">'+referenceItem('纳税人管理','taxpayer',true)+invoiceMenu+platformMenu+referenceItem('报表管理','report',true)+referenceItem('系统配置','settings',true)+referenceItem('开票规则配置','rules',true)+'</nav><div class="side-foot">本软件由上海收钱吧互联网科技股份有限公司开发运营<br>非税务机关的官方软件</div>';
  }
  function render(keepScroll){
    var scroll=window.scrollY,r=route();if(r.parts[0]==='applications'){location.replace('#/orders');return;}state.selects={};closeOrdersDate();closeSelect();paintShell(r);var p=r.parts,html='';
    if(state.route!==location.hash&&r.params.has('tab')&&p[0]==='project')state.tabs[p[2]?'project-'+p[1]+'-'+p[2]:'project-home-'+p[1]]=r.params.get('tab');
    if(state.route!==location.hash&&p[0]==='project-config')state.tabs['project-home-'+p[1]]='config';
    if(state.route!==location.hash&&p[0]==='partners'&&r.params.has('tab'))state.tabs.partners=r.params.get('tab');
    if(state.route!==location.hash&&r.params.has('status')){
      if(p[0]==='month')state.query['month-'+p[1]]={status:r.params.get('status')};
      if(p[0]==='project'){var queryKey=p[2]?'bills-'+p[1]+'-'+p[2]:'project-months-'+p[1],tabKey=p[2]?'project-'+p[1]+'-'+p[2]:'project-home-'+p[1];state.query[queryKey]={status:r.params.get('status')};state.tabs[tabKey]=p[2]?'settlements':'months';}
    }
    state.route=location.hash;
    switch(p[0]){
      case'overview':html=overview();break;
      case'month':html=monthly(p[1]);break;
      case'project':html=p[2]?monthlyProject(p[1],p[2]):cooperationProject(p[1]);break;
      case'settlement':html=settlement(p[1]);break;
      case'application':html=application(p[1],p[2]);break;
      case'invoice-issue':html=invoiceIssue(p[1]);break;
      case'invoice':html=invoiceView(p[1],p[2]);break;
      case'funding':html=funding(p[1],p[2],r.params);break;
      case'pending-refunds':
      case'refunds':html=refunds(p[1]);break;
      case'order':html=orderDetail(p[1]);break;
      case'projects':html=projectList();break;
      case'project-config':html=cooperationProject(p[1]);break;
      case'project-edit':html=projectEdit(p[1]);break;
      case'partners':html=partnerList();break;
      case'partner':html=partnerDetail(p[1]);break;
      case'customer-category':html=categoryDetail(p[1]);break;
      case'small':
      case'small-task':
      case'preissued':html=preissuedOverview();break;
      case'preinvoice':html=preinvoiceView(p[1],r.params);break;
      case'orders':html=orders();break;
      default:html=notFound();
    }
    main.innerHTML=html;main.dataset.page=p[0];document.title=(p[0]==='invoice-issue'?'发起开票':$('h1',main)?.textContent||'平台开票管理')+' · 达美乐';
    $$('.table-wrap',main).forEach(function(w){function sync(){w.classList.toggle('scrolled',w.scrollWidth>w.clientWidth+1&&w.scrollLeft+w.clientWidth<w.scrollWidth-1);}w.addEventListener('scroll',sync);sync();});
    if(keepScroll)window.scrollTo(0,scroll);else window.scrollTo(0,state.scrolls[location.hash]||0);
  }
  function navigate(path,force){
    path=contextualPath(path);
    if(state.dirty&&(state.draft||state.invoiceDraft)&&!force){
      syncProjectDraft();syncInvoiceDraft();openConfirm('放弃尚未保存的修改？','当前信息尚未保存，离开后修改将丢失。','放弃修改',function(){state.draft=null;state.invoiceDraft=null;state.dirty=false;closeLayer(true);navigate(path,true);});return;
    }
    if(location.hash==='#'+path)return;
    state.scrolls[location.hash]=window.scrollY;
    if(!path.startsWith('/project-edit/'))state.draft=null;
    if(!path.startsWith('/invoice-issue/'))state.invoiceDraft=null;
    if(!state.draft&&!state.invoiceDraft)state.dirty=false;
    location.hash=path;
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
    var rect=button.getBoundingClientRect(),menu=document.createElement('div');menu.className='select-menu';menu.id=id+'-menu';menu.setAttribute('role','listbox');menu.setAttribute('aria-label',def.label);menu.style.width=rect.width+'px';menu.style.left=rect.left+'px';
    var height=Math.min(256,def.options.length*32+2),top=rect.bottom+4;if(top+height>window.innerHeight-8)top=Math.max(8,rect.top-height-4);menu.style.top=top+'px';
    menu.innerHTML=def.options.map(function(o){return'<button type="button" class="select-option" role="option" aria-selected="'+(String(o.value)===def.value)+'" data-option="'+e(id)+'" data-value="'+e(o.value)+'" title="'+e(o.label)+'">'+e(o.label)+'</button>';}).join('');
    document.body.appendChild(menu);var selected=$('[aria-selected=true]',menu)||$('.select-option',menu);if(selected)selected.focus({preventScroll:true});
  }
  function setSelect(id,value){
    var def=state.selects[id],button=document.getElementById(id),inputEl=$('input[name="'+id+'"]');if(!def||!button)return;var op=def.options.find(function(o){return String(o.value)===value;});
    def.value=value;if(inputEl)inputEl.value=value;$('span',button).textContent=op?op.label:'请选择';button.closest('.qfield')?.classList.toggle('filled',!!value);closeSelect();button.focus({preventScroll:true});
    if(def.scope==='year'){state.year=value;render(true);return;}
    if(def.scope==='page-size'){var key=id.slice(5);state.sizes[key]=Number(value);state.pages[key]=1;render(true);return;}
    if(def.scope==='form'){
      if(state.layer){state.layer.dirty=true;state.layer.values[id]=value;}
      if($('#project-form')){
        syncProjectDraft();state.dirty=true;
        if(id==='project-partner'){var p=D.getPartner(value);state.draft.buyer=p&&p.buyers.length?p.buyers[0].id:'';render(true);document.getElementById(id)?.focus({preventScroll:true});}
      }
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
    setTimeout(function(){if(state.layer!==l)return;var target=l.confirm?$('[data-cancel]',overlayRoot):$('input:not([type=hidden]),textarea,[role=combobox],button', $('.overlay-body',overlayRoot));(target||$('.icon-close',overlayRoot))?.focus();},0);
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
  function invoiceFields(v){
    var type='<div class="radio-group" role="radiogroup" aria-label="默认发票类型">'+[['增值税普通发票','普票'],['增值税专用发票','专票']].map(function(x){return'<label class="radio-row"><input type="radio" name="defaultType" value="'+x[0]+'"'+(v.defaultType===x[0]?' checked':'')+'><span>'+x[1]+'</span></label>';}).join('')+'</div>';
    var emails=Array.from({length:v.emailCount||1},function(_,i){return field(i?'':'接收邮箱','<div class="email-control">'+customerInput('customer-email-'+i,v['customer-email-'+i],'接收邮箱 '+(i+1),false,'请输入接收邮箱')+(i?'<button class="remove-email" type="button" aria-label="移除接收邮箱 '+(i+1)+'" data-action="customer-email-remove" data-id="'+i+'">×</button>':'')+'</div>');}).join('');
    return'<div class="invoice-form-section"><h3>发票抬头</h3>'+field('发票抬头名称',customerInput('name',v.name,'发票抬头名称',true),true)+field('税号',customerInput('tax',v.tax,'税号',true),true)+field('开户银行',customerInput('bank',v.bank,'开户银行'))+field('银行账号',customerInput('bankAccount',v.bankAccount,'银行账号'))+field('地址',customerNote('address',v.address,'地址'))+field('电话',customerInput('phone',v.phone,'电话'))+'</div><div class="invoice-form-section"><h3>发票类型</h3>'+field('默认发票类型',type,true)+'</div><div class="invoice-form-section"><h3>发票接收方式</h3>'+emails+field('', '<button type="button" class="dashed-add" data-action="customer-email-add"><span>＋</span>添加接收邮箱</button>')+'</div><div class="invoice-form-section"><h3>发票备注</h3><div class="invoice-remark-settings"><p>向此客户开票时，发票备注中默认填写以下信息</p>'+invoiceRemarkOptions.map(function(x){return'<label class="check-row"><input type="checkbox" name="invoice-remark-options" value="'+x.value+'"'+((v['invoice-remark-options']||[]).includes(x.value)?' checked':'')+'><span>'+x.label+'</span></label>';}).join('')+'</div></div>';
  }
  function buyerFromValues(v,bid){
    if(!String(v.name||'').trim()){layerError('请填写发票抬头名称','name');return null;}
    if(!String(v.tax||'').trim()){layerError('请填写税号','tax');return null;}
    var emails=[];for(var i=0;i<(v.emailCount||1);i++){var email=String(v['customer-email-'+i]||'').trim();if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){layerError('请填写有效的接收邮箱','customer-email-'+i);return null;}if(email&&!emails.includes(email))emails.push(email);}
    return{id:bid||'buyer'+Date.now(),name:v.name.trim(),tax:v.tax.trim(),bank:v.bank||'',bankAccount:v.bankAccount||'',address:v.address||'',phone:v.phone||'',email:emails[0]||'',emails:emails,defaultType:v.defaultType||'增值税普通发票',remarkOptions:v['invoice-remark-options']||[]};
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
  function editBuyer(pid){
    var p=D.getPartner(pid);if(!p)return;var b=p.buyers[0];
    showLayer({drawer:true,customer:true,title:b?'编辑发票信息':'添加发票信息',submitLabel:'确定',values:invoiceValues(b),body:function(v){return'<form novalidate>'+invoiceFields(v)+'</form>';},submit:function(v){var updated=buyerFromValues(v,b&&b.id);if(!updated)return;p.buyers=[updated];db.projects.filter(function(x){return x.partner===pid;}).forEach(function(x){x.buyer=updated.id;});D.save();closeLayer(true);render(true);toast('发票信息已保存');}});
  }
  function issue(bid){if(canIssue(D.bill(bid)))navigate('/invoice-issue/'+bid);}
  function finishIssue(bid,aid){setTimeout(function(){var b=D.bill(bid);if(!b)return;var id=aid||b.activeRequest,inv=D.completeRequest(bid,id,true);if(!inv)return;if(inv.tone==='blue')processPreissued();if(!state.layer&&!state.dirty)render(true);toast(inv.tone==='red'?'开票已撤销，红票已生成':'平台发票已开具');},1000);}
  function download(name,content,type){
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff',content],{type:type||'text/csv;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
    db.exports.unshift({name:name,time:'2026-09-28 14:35',status:'已完成'});D.save();
  }
  function csv(rows){
    if(!rows.length)return '';
    var ids=['客户ID','客户 ID','项目编号','结算单号','所属结算单','申请任务号','任务号'];
    var order=columnOrder(rows[0].map(function(label){return{systemId:ids.includes(label)};}));
    return rows.map(function(row){return order.map(function(i){var x=row[i];return'"'+String(x==null?'':x).replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');
  }
  function exportMonth(m,pid){
    var current=m>=D.TODAY,projects=pid?[D.getProject(pid)]:filteredMonthlyProjects(m);
    var head=['月份','合作项目','项目编号','合作伙伴','平台出资金额','平台出资退款金额','平台出资净额'];
    if(!current)head=head.concat(['调整差额','应开票金额','已开票金额','待开票金额','结算单数','待处理结算单数','异常结算单数']);
    var rows=[head];
    projects.forEach(function(p){var t=D.totals(D.projectBills(m,p.id)),row=[m,p.name,p.code,D.getPartner(p.partner).name,moneyPlain(t.positive),moneyPlain(t.negative),moneyPlain(t.net)];if(!current)row=row.concat([moneyPlain(t.adjustment),moneyPlain(t.expected),moneyPlain(t.issued),moneyPlain(t.unissued),t.billCount,t.pendingCount,t.failed]);rows.push(row);});
    var t=D.totals(projects.flatMap(function(p){return D.projectBills(m,p.id);})),total=[m,'合计','','',moneyPlain(t.positive),moneyPlain(t.negative),moneyPlain(t.net)];
    if(!current)total=total.concat([moneyPlain(t.adjustment),moneyPlain(t.expected),moneyPlain(t.issued),moneyPlain(t.unissued),t.billCount,t.pendingCount,t.failed]);rows.push(total);
    download(m+'-'+(pid?D.getProject(pid).name:'合作项目')+'-月度汇总.csv',csv(rows));toast('汇总已导出');
  }
  function moneyPlain(value){return(value/100).toFixed(2);}
  function exportSettlementRows(bills,name){
    var rows=[['月份','结算单号','销方名称','销方税号','购方名称','购方税号','开票项目名称','税收分类编码','税收分类简称','税率','发票类型','结算金额','调整差额','应开票金额','已开票金额','待开票金额','开票状态']];
    bills.forEach(function(b){var t=D.totals([b]),seller=D.getSeller(b.seller),buyer=b.buyerSnapshot||D.getBuyer(D.getProject(b.project));rows.push([b.month,'JS'+b.id.replace(/-/g,'').toUpperCase(),seller.name,seller.tax,buyer.name,buyer.tax,b.item,b.taxCode,b.taxShortName||b.item,rateText(b.taxRate),b.invoiceType||D.getProject(b.project).invoiceType,moneyPlain(t.net),moneyPlain(t.adjustment),moneyPlain(t.expected),moneyPlain(t.issued),moneyPlain(t.unissued),statusMap[b.status][0]]);});
    var t=D.totals(bills);rows.push(['','','合计','','','','','','','','',moneyPlain(t.net),moneyPlain(t.adjustment),moneyPlain(t.expected),moneyPlain(t.issued),moneyPlain(t.unissued),'']);
    download(name+'.csv',csv(rows));toast('结算单已导出');
  }
  function exportSettlements(pid,m){if(m<D.TODAY)exportSettlementRows(filteredSettlements(pid,m),m+'-'+D.getProject(pid).name+'-结算单');}
  function exportProjectMonths(pid){
    var p=D.getProject(pid),months=filteredProjectMonths(pid),rows=[['月份','合作项目','平台出资金额','平台出资退款金额','平台出资净额','调整差额','应开票金额','已开票金额','待开票金额','结算单数','待处理结算单数','异常结算单数','开票进度','处理状态','项目编号']];
    months.forEach(function(x){var t=x.totals;rows.push([x.month,p.name,moneyPlain(t.positive),moneyPlain(t.negative),moneyPlain(t.net),moneyPlain(t.adjustment),moneyPlain(t.expected),moneyPlain(t.issued),moneyPlain(t.unissued),t.billCount,t.pendingCount,t.failed,t.progress==null?'':t.progress+'%',t.pendingCount?'有待处理':'已完成',p.code]);});
    download(p.name+'-月度汇总.csv',csv(rows));toast('月度汇总已导出');
  }
  function exportCooperationProjects(){
    var rows=[['项目名称','合作伙伴','购方名称','购方税号','发票种类','结算周期','政策数','项目编号']];
    filteredCooperationProjects().forEach(function(p){var buyer=D.getBuyer(p);rows.push([p.name,D.getPartner(p.partner).name,buyer.name,buyer.tax,p.invoiceType,p.cycle,p.policies.length,p.code]);});
    download('合作项目-项目资料.csv',csv(rows));toast('项目资料已导出');
  }
  function exportPolicies(pid,m){
    var groups=D.policySummaries(D.projectBills(m,pid)),rows=[['月份','优惠政策','适用优惠编码','开票方规则','指定纳税人名称','指定纳税人税号','开票项目名称','税收分类编码','税收分类简称','税率','平台出资金额','平台出资退款金额','平台出资净额','出资明细数']];
    groups.forEach(function(g){function unique(fn){return Array.from(new Set(g.configs.map(fn).filter(Boolean))).join('；');}rows.push([m,g.name,g.sources.join('；'),unique(function(c){return c.sellerMode==='order'?'门店所属纳税人':c.sellerMode==='fixed'?'指定纳税人':'历史配置未记录';}),unique(function(c){return c.sellerMode==='fixed'?D.getSeller(c.sellerId).name:'';}),unique(function(c){return c.sellerMode==='fixed'?D.getSeller(c.sellerId).tax:'';}),unique(function(c){return c.item;}),unique(function(c){return c.taxCode;}),unique(function(c){return c.taxShortName;}),unique(function(c){return rateText(c.taxRate);}),moneyPlain(g.positive),moneyPlain(g.negative),moneyPlain(g.net),g.count]);});
    var t=D.totals(D.projectBills(m,pid));rows.push([m,'合计','','','','','','','','',moneyPlain(t.positive),moneyPlain(t.negative),moneyPlain(t.net),t.count]);
    download(m+'-'+D.getProject(pid).name+'-政策汇总.csv',csv(rows));toast('政策汇总已导出');
  }
  function exportFunding(m,pid,filters){
    var segments=D.findSegments(m,pid,filters||{}),closed=m<D.TODAY,headers=['原订单号','门店','优惠编码','明细类型','出资金额','原交易时间','出资发生时间','归属月份','实际销方','销售方税号'];
    if(closed)headers.push('所属结算单');var rows=[headers];
    segments.forEach(function(x){for(var i=0;i<x.segment.count;i++){var r=D.record(x,i,m),seller=D.getSeller(r.seller),row=[r.order,D.getStore(r.store).name,r.source,r.kind==='refund'?'平台出资退款':'平台出资',r.amount/100,r.orderOccurred,r.occurred,r.month,seller?seller.name:'',seller?seller.tax:''];if(closed)row.push(r.bill?'JS'+r.bill.replace(/-/g,'').toUpperCase():'');rows.push(row);}});
    download(m+'-出资明细.csv',csv(rows));toast('出资明细已导出');
  }
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
  document.addEventListener('click',function(ev){
    if(state.orderDate&&!ev.target.closest('.order-date-popover')&&!ev.target.closest('[data-action="orders-date"]'))closeOrdersDate();
    var option=ev.target.closest('[data-option]');if(option){setSelect(option.dataset.option,option.dataset.value);return;}
    var sl=ev.target.closest('[data-select]');if(sl){openSelect(sl.dataset.select);return;}
    if(!ev.target.closest('.select-menu'))closeSelect();
    var anchor=ev.target.closest('a[data-route]');if(anchor){ev.preventDefault();if(anchor.dataset.refreshBill)D.refreshBill(anchor.dataset.refreshBill);navigate(anchor.dataset.route);return;}
    var page=ev.target.closest('button[data-page]');if(page&&!page.disabled){var pd=page.dataset.page.split('|');state.pages[pd[0]]=Number(pd[1]);render(true);return;}
    var tab=ev.target.closest('[data-tab]');if(tab){var td=tab.dataset.tab.split('|');if(td[0].startsWith('preinvoice-')){navigate('/preinvoice/'+td[0].slice('preinvoice-'.length)+'?tab='+td[1]);return;}if(td[0].startsWith('project-home-')){navigate('/project/'+td[0].slice('project-home-'.length)+'?tab='+td[1]);return;}state.tabs[td[0]]=td[1];render(true);return;}
    var el=ev.target.closest('[data-action]');if(!el||el.disabled){if(ev.target.classList.contains('overlay')&&state.layer&&!state.layer.confirm&&!state.layer.dirty)closeLayer();return;}
    var a=el.dataset.action,id=el.dataset.id||'';
    switch(a){
      case'orders-date':openOrdersDate();break;
      case'orders-date-cancel':closeOrdersDate(true);break;
      case'orders-date-page':state.orderDate.month=shiftDateMonth(state.orderDate.month,Number(id));paintOrdersDate();break;
      case'orders-date-day':var dr=state.orderDate;if(dr.selecting==='from'||!dr.from||id<dr.from){dr.from=id;dr.to='';dr.selecting='to';}else{dr.to=id;dr.selecting='from';}paintOrdersDate();break;
      case'orders-date-preset':presetOrdersDate(id);break;
      case'orders-date-apply':if(validOrderDateRange(state.orderDate))applyOrdersDate(state.orderDate.from,state.orderDate.to);break;
      case'open-month':navigate('/month/'+id);break;
      case'toggle-nav':state.tabs['nav-'+id]=state.tabs['nav-'+id]===false;paintShell(route());$('[data-action="toggle-nav"][data-id="'+id+'"]', $('#sidebar')).focus({preventScroll:true});break;
      case'reset-query':resetQueryFilters(id);break;
      case'close-layer':closeLayer();break;
      case'layer-submit':if(state.layer){syncLayer();state.layer.submit(state.layer.values);}break;
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
      case'add-policy':syncProjectDraft();state.draft.policies.push({id:'pl'+Date.now(),name:'',sources:[],sellerMode:'order',sellerId:'',taxCode:'',taxShortName:'',taxRate:null,item:''});state.dirty=true;render(true);break;
      case'remove-policy':syncProjectDraft();state.draft.policies.splice(Number(id),1);state.dirty=true;render(true);break;
      case'cancel-project':navigate(state.draft&&state.draft._editing!=='new'?'/project/'+state.draft.id+'?tab=config':'/projects');break;
      case'issue':issue(id);break;
      case'pre-refresh':refreshPreissued(id);break;
      case'pre-export':exportPreissued();break;
      case'pre-retry-all':retryAllPreissued();break;
      case'pre-retry':retryPreissued(id);break;
      case'pre-failure':showPreissuedFailure(id);break;
      case'pre-download':var preDoc=id.split('|');downloadPreissued(preDoc[0],preDoc[1]);break;
      case'refresh-request':var rqf=id.split('|');refreshApplication(rqf[0],rqf[1]);break;
      case'retry-request':var rqt=id.split('|');retryApplication(rqt[0],rqt[1]);break;
      case'request-failure':var rqe=id.split('|');showRequestFailure(rqe[0],rqe[1]);break;
      case'adjust-amount':adjustInvoiceAmount(id);break;
      case'cancel-invoice':cancelInvoice(id);break;
      case'issue-email-add':syncInvoiceDraft();state.invoiceDraft.emails.push('');state.dirty=true;paintInvoiceEmails(state.invoiceDraft.emails.length-1);break;
      case'issue-email-remove':syncInvoiceDraft();state.invoiceDraft.emails.splice(Number(id),1);state.dirty=true;paintInvoiceEmails();break;
      case'cancel-issue':navigate('/settlement/'+id);break;
      case'export-projects':exportCooperationProjects();break;
      case'export-project-months':exportProjectMonths(id);break;
      case'export-month':exportMonth(id);break;
      case'export-project':var xp=id.split('|');exportMonth(xp[1],xp[0]);break;
      case'export-settlements':var xs=id.split('|');exportSettlements(xs[0],xs[1]);break;
      case'export-policies':var xpol=id.split('|');exportPolicies(xpol[0],xpol[1]);break;
      case'export-funding':var xb=D.bill(id);exportFunding(xb.month,xb.project,{bill:id});break;
      case'export-filtered':var fx=id.split('|');exportFilteredFunding(fx[0],fx[1]);break;
      case'download-invoice':var inv=id.split('|');invoiceDownload(inv[0],inv[1]);break;
      case'email-invoice':var mail=id.split('|');sendInvoice(mail[0],mail[1]);break;
      case'export-refunds':var rq=state.query['refunds-'+id]||{};exportFunding(id,rq.project||null,{kind:'refund',store:rq.store||''});break;
      case'exports':showLayer({drawer:true,title:'导出记录',readonly:true,body:db.exports.length?db.exports.map(function(x){return'<div style="margin-bottom:20px"><strong>'+e(x.name)+'</strong><p class="muted">'+e(x.time)+' · '+e(x.status)+'</p></div>';}).join(''):empty('暂无导出记录','可在月份或结算单中导出业务数据。')});break;

    }
  });
  document.addEventListener('input',function(ev){
    if(state.orderDate&&ev.target.closest('.order-date-popover')){state.orderDate.from=$('#order-date-from').value;state.orderDate.to=$('#order-date-to').value;$('.date-calendars').innerHTML=dateCalendar(state.orderDate.month)+dateCalendar(shiftDateMonth(state.orderDate.month,1));$('[data-action="orders-date-apply"]').disabled=!validOrderDateRange(state.orderDate);}

    if(ev.target.closest('#project-form')){
      state.dirty=true;
      if(ev.target.name.startsWith('pol-tax-code-'))updatePolicyTaxInput(Number(ev.target.name.slice(13)));
      if(ev.target.name.startsWith('pol-item-')&&ev.target.value.trim()){
        ev.target.removeAttribute('aria-invalid');ev.target.removeAttribute('aria-describedby');
        $$('.field-error',ev.target.closest('.form-row')).forEach(function(node){node.remove();});$('#project-errors').innerHTML='';
      }
    }
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
    if(ev.target.closest('#project-form')){state.dirty=true;syncProjectDraft();if(ev.target.name.startsWith('pol-mode-'))render(true);}
  });
  document.addEventListener('submit',function(ev){
    ev.preventDefault();
    if(ev.target.id==='invoice-form'){submitInvoice();return;}
    if(ev.target.id==='project-form'){
      if(!validateProject())return;
      var p=JSON.parse(JSON.stringify(state.draft));delete p._editing;var ix=db.projects.findIndex(function(x){return x.id===p.id;});if(ix>=0)db.projects[ix]=p;else{p.demoCreated=true;db.projects.push(p);}
      D.save();state.dirty=false;state.draft=null;navigate('/project/'+p.id+'?tab=config',true);toast('合作项目已保存');return;
    }
    if(ev.target.dataset.query){var key=ev.target.dataset.query,fd=new FormData(ev.target),q={};fd.forEach(function(v,k){q[k.startsWith(key+'-')?k.slice(key.length+1):k]=String(v);});state.query[key]=q;state.pages[key]=1;render(true);return;}
    if(state.layer){syncLayer();state.layer.submit(state.layer.values);}
  });
  document.addEventListener('keydown',function(ev){
    if(state.orderDate&&ev.key==='Escape'){ev.preventDefault();closeOrdersDate(true);return;}
    if(state.selectOpen){
      var menu=document.getElementById(state.selectOpen+'-menu'),opts=menu?$$('[role=option]',menu):[],i=opts.indexOf(document.activeElement);
      if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){ev.preventDefault();opts[(i+(ev.key==='ArrowDown'?1:-1)+opts.length)%opts.length]?.focus();return;}
      if(ev.key==='Escape'){ev.preventDefault();var trigger=document.getElementById(state.selectOpen);closeSelect();trigger?.focus();return;}
      if(ev.key==='Tab')closeSelect();
    }else if(ev.target.matches('[data-select]')&&(ev.key==='ArrowDown'||ev.key==='ArrowUp')){ev.preventDefault();openSelect(ev.target.dataset.select);return;}
    if(state.layer){
      if(ev.key==='Escape'){ev.preventDefault();closeLayer();return;}
      if(ev.key==='Tab'){var nodes=$$('button:not([disabled]),a[href],input:not([type=hidden]):not([disabled]),textarea:not([disabled]),[tabindex="0"]',overlayRoot).filter(function(n){return n.getClientRects().length;});var first=nodes[0],last=nodes[nodes.length-1];if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last?.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first?.focus();}}
    }
  });
  window.addEventListener('hashchange',function(){if(state.layer)closeLayer(true);render();});
  window.addEventListener('resize',function(){closeSelect();closeOrdersDate();});
  window.addEventListener('scroll',function(){if(!state.selectOpen)return;var trigger=document.getElementById(state.selectOpen),menu=document.getElementById(state.selectOpen+'-menu');if(!trigger||!menu)return;var rect=trigger.getBoundingClientRect();menu.style.left=rect.left+'px';menu.style.top=Math.max(8,Math.min(rect.bottom+4,window.innerHeight-menu.offsetHeight-8))+'px';},{passive:true});
  window.addEventListener('storage',function(ev){if(P&&(ev.key===P.KEY||ev.key===D.KEY)){P.refresh();processPreissued();if(canRefreshPreissuedView())render(true);}});
  window.addEventListener('beforeunload',function(ev){if(state.dirty){ev.preventDefault();ev.returnValue='';}});
  Object.values(db.months).forEach(function(m){m.bills.forEach(function(b){if(b.status==='processing'||b.status==='reversing')finishIssue(b.id,b.activeRequest);});});
  if(P){P.refresh();processPreissued();}
  if(!location.hash)location.hash='/overview';else render();
})();
