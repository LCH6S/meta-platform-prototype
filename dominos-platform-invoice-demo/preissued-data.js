(function(){
  'use strict';
  var D=window.DemoData,O=window.DemoOrderData,KEY='dominos-platform-preissued-v1',store;
  var BUYER='个人',ITEM='餐饮',RATE=6,CODE='3070401000000000000';
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function now(){return new Date().toLocaleString('sv-SE').slice(0,16);}
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){return null;}}
  function save(){localStorage.setItem(KEY,JSON.stringify(store));}
  function fresh(){var latest=read();if(latest)store=latest;return store;}
  function ledger(){try{return JSON.parse(localStorage.getItem(D.KEY)||'null')||D.db;}catch(e){return D.db;}}
  function invoiceId(g,index){return'YK'+g.code+'-'+String(index+1).padStart(6,'0');}
  function recordId(g,index){return g.id+'~'+index;}
  function baseIndex(g,index){return g.count>0&&index>=g.first&&(index-g.first)%g.step===0&&(index-g.first)/g.step<g.count;}
  function included(g,index){return baseIndex(g,index)||(g.extra||[]).includes(index);}
  function groupFor(id){var parts=String(id).split('~');if(parts.length!==3||!/^\d+$/.test(parts[2]))return null;var g=store.groups[parts[0]+'~'+parts[1]],index=Number(parts[2]);return g&&index<g.rawCount&&included(g,index)?{g:g,index:index}:null;}
  function makeGroup(b,si,seed){
    var s=b.segments[si],r=D.record({bill:b,segment:s,si:si,project:b.project},0,b.month),p=D.getProject(b.project),st=D.getStore(s.store),pol=(b.policySnapshot||[]).find(function(x){return x.id===s.policy;}),offset=s.orderIndexOffset||0,issued=O.fixtureInvoiceRange(s),first=issued.first;
    return{demoOrder:!!s.demoOrder,id:b.id+'~'+si,code:b.id.replace(/-/g,'').toUpperCase()+'S'+si,billId:b.id,month:b.month,project:p.id,projectName:p.name,policy:s.policy,policyName:pol?pol.name:'历史政策',store:s.store,storeName:st.name,source:s.source,rawCount:s.count,first:first,step:issued.step,count:seed?issued.count:0,extra:[],offset:offset,orderPrefix:r.order.slice(0,-6),amount:s.cents,seller:clone(D.getSeller(st.seller)),invoiceType:'增值税普通发票',taxCode:CODE,taxShortName:D.lookupTaxCode(CODE).shortName,taxRate:RATE};
  }
  function queueForSuccess(b,inv,persist){
    if(!b||b.month>=D.TODAY||!inv||inv.amount<=0)return false;
    var groups=Object.values(store.groups).filter(function(g){return g.billId===b.id&&(g.count||g.extra.length);});if(!groups.length)return false;
    var changed=false,job=store.jobs[b.id];
    if(!job){store.jobs[b.id]={billId:b.id,invoiceId:inv.id,invoiceDate:inv.date,status:'queued',createdAt:now()};job=store.jobs[b.id];changed=true;}
    if(job.beforeSettlement&&!job.invoiceId){job.invoiceId=inv.id;job.invoiceDate=inv.date;changed=true;}
    groups.forEach(function(g){(g.extra||[]).forEach(function(index){var ov=store.overrides[recordId(g,index)];if(ov&&ov.status==='waiting'){ov.status='queued';ov.createdAt=now();ov.triggerInvoiceId=inv.id;changed=true;}});});
    if(changed&&persist!==false)save();return changed;
  }
  function reconcile(){
    fresh();var l=ledger(),changed=false;
    Object.values(l.months||{}).forEach(function(m){if(m.id>=D.TODAY)return;m.bills.forEach(function(b){var blue=D.activeInvoice(b);if(blue)changed=queueForSuccess(b,blue,false)||changed;});});
    if(changed)save();return changed;
  }
  function importOrderInvoiceFixtures(){
    var changed=false;
    Object.keys(D.db.months).filter(function(m){return m<=D.TODAY;}).forEach(function(m){D.findSegments(m,null,{kind:'positive'}).forEach(function(x){
      var key=x.bill.id+'~'+x.si;if(store.groups[key])return;
      var g=makeGroup(x.bill,x.si,true);if(g.count&&O.fixtureInvoiceEvent(D.record(x,g.first,m))){store.groups[key]=g;changed=true;}
    });});if(changed)save();return changed;
  }
  function captureOrderFixtureRanges(){
    store.orderFixtureRanges={};Object.values(store.groups).forEach(function(g){if(g.count)store.orderFixtureRanges[g.id]={orderPrefix:g.orderPrefix,month:g.month,offset:g.offset,first:g.first,step:g.step,count:g.count};});
  }
  function orderInvoiceEvent(order){
    if(store.orderEvents[order])return store.orderEvents[order];
    var ranges=Object.values(store.orderFixtureRanges||{});
    for(var i=0;i<ranges.length;i++){var range=ranges[i];if(!order.startsWith(range.orderPrefix))continue;var suffix=order.slice(range.orderPrefix.length);if(!/^\d+$/.test(suffix))continue;var ordinal=Number(suffix)-1,index=ordinal-range.offset;
      if(index>=range.first&&(index-range.first)%range.step===0&&(index-range.first)/range.step<range.count)return{id:'C'+order,createdAt:range.month+'-'+String(1+ordinal%27).padStart(2,'0')+' 12:'+String(ordinal%60).padStart(2,'0'),amount:9000,status:'issued'};
    }return null;
  }
  function seedHistoricalReversalFixtures(){
    // New demo datasets import a coherent historical snapshot; this never repairs live user records.
    if(!D.isFreshDemo)return;
    Object.values(D.db.months).filter(function(m){return m.id<D.TODAY;}).forEach(function(m){m.bills.forEach(function(b){
      var a=(b.applications||[]).filter(function(x){return x.type==='blue'&&['issued','failed','processing'].includes(x.status);}).slice(-1)[0];if(!a)return;
      var groups=Object.values(store.groups).filter(function(g){return g.billId===b.id;});if(!groups.length)return;
      var time=a.completedAt||a.createdAt,inv=b.invoices.find(function(x){return x.id===a.invoiceId;});
      store.jobs[b.id]={billId:b.id,applicationId:a.id,invoiceId:inv&&inv.id||'',invoiceDate:inv&&inv.date||'',beforeSettlement:true,status:'reversed',createdAt:time,completedAt:time,fixtureBaseline:2};
    });});
  }
  function retireLegacyFailureFixture(){
    if(store.legacyFailureFixtureRetired)return;
    // The retired fixture overwrote completed originals with exactly these three synthetic fields.
    // Restore only when its provenance and the prior completed job are both present.
    (store.fixtureFailureIds||[]).forEach(function(id){
      var ov=store.overrides[id],job=store.jobs[id.split('~')[0]],found=groupFor(id);
      if(!store.fixtureFailuresApplied||!found||!baseIndex(found.g,found.index)||!job||job.beforeSettlement||job.status!=='reversed'||!job.completedAt||!ov||ov.status!=='failed'||ov.error!=='开票服务响应超时，请稍后重试。'||Object.keys(ov).some(function(k){return !['status','error','completedAt'].includes(k);}))return;
      store.retiredFixtureFailures=store.retiredFixtureFailures||[];store.retiredFixtureFailures.push({id:id,override:clone(ov),job:clone(job),retiredAt:now(),reason:'retired synthetic failure after completed reversal'});delete store.overrides[id];
    });
    store.legacyFailureFixtureRetired=1;save();
  }
  function init(){
    if(new URLSearchParams(location.search).get('reset')==='1')localStorage.removeItem(KEY);
    store=read();if(store){retireLegacyFailureFixture();if(!store.orderFixtureRanges){captureOrderFixtureRanges();save();}initApplications();return;}
    store={version:1,groups:{},jobs:{},overrides:{},orderEvents:{},fixtureFailureIds:[],fixtureFailuresApplied:true,legacyFailureFixtureRetired:1};
    // These are imported sample results of the order-invoicing flow, not a funding-sync trigger.
    D.month(D.PREVIOUS);D.month(D.TODAY);importOrderInvoiceFixtures();captureOrderFixtureRanges();
    seedHistoricalReversalFixtures();save();reconcile();initApplications();
  }
  function get(id){
    var found=groupFor(id);if(!found)return null;var g=found.g,index=found.index,ov=store.overrides[id]||{},job=store.jobs[g.billId],orderIndex=index+g.offset;
    var number=ov.number||invoiceId(g,index),date=ov.date||g.month+'-'+String(1+orderIndex%27).padStart(2,'0')+' 12:'+String(orderIndex%60).padStart(2,'0'),status=ov.status||(job&&baseIndex(g,index)&&job.progress&&((index-g.first)/g.step)<(job.progress[g.id]||0)?'reversed':job&&job.status)||'waiting';
    return{settlementApplication:job&&job.applicationId||'',beforeSettlement:!!(job&&job.beforeSettlement),demoOrder:!!g.demoOrder,id:id,number:number,fundingId:id,month:g.month,project:g.project,projectName:g.projectName,policy:g.policy,policyName:g.policyName,store:g.store,storeName:g.storeName,source:g.source,order:g.orderPrefix+String(orderIndex+1).padStart(6,'0'),date:date,amount:ov.amount==null?g.amount:ov.amount,buyerName:BUYER,item:ITEM,seller:clone(ov.seller||g.seller),invoiceType:ov.invoiceType||g.invoiceType,taxCode:ov.taxCode||g.taxCode,taxShortName:ov.taxShortName||g.taxShortName,taxRate:ov.taxRate==null?g.taxRate:ov.taxRate,status:status,billId:g.month<D.TODAY?g.billId:'',triggerInvoice:status==='waiting'?'':ov.triggerInvoiceId||job&&job.invoiceId||'',requestedAt:status==='waiting'?'':ov.requestedAt||ov.createdAt||job&&job.startedAt||job&&job.createdAt||'',completedAt:['reversed','failed'].includes(status)?ov.completedAt||(!ov.status&&job&&(job.completedAt||job.lastProgressAt))||'':'',error:ov.error||'',redNumber:status==='reversed'?(ov.redNumber||'HY'+g.code+'-'+String(index+1).padStart(6,'0')):'',retryCount:ov.retryCount||0};
  }
  function runs(g){
    var job=store.jobs[g.billId],baseStatus=job?job.status:'waiting',special=[];
    Object.keys(store.overrides).forEach(function(id){if(!id.startsWith(g.id+'~'))return;var index=Number(id.split('~')[2]);if(baseIndex(g,index))special.push(index);});special.sort(function(a,b){return a-b;});
    var result=[],cursor=0;
    function add(start,step,count,status,amount){if(count)result.push({start:start,step:step,count:count,status:status,amount:amount});}
    function addBase(start,step,count){var done=job&&job.progress&&job.progress[g.id]||0,ordinal=(start-g.first)/g.step,completed=Math.max(0,Math.min(count,done-ordinal));add(start,step,completed,'reversed',g.amount);add(start+completed*step,step,count-completed,baseStatus,g.amount);}
    special.forEach(function(index){var ordinal=(index-g.first)/g.step,ov=store.overrides[recordId(g,index)];addBase(g.first+cursor*g.step,g.step,ordinal-cursor);add(index,1,1,ov.status||baseStatus,ov.amount==null?g.amount:ov.amount);cursor=ordinal+1;});
    addBase(g.first+cursor*g.step,g.step,g.count-cursor);
    (g.extra||[]).slice().sort(function(a,b){return a-b;}).forEach(function(index){var ov=store.overrides[recordId(g,index)]||{};add(index,1,1,ov.status||baseStatus,ov.amount==null?g.amount:ov.amount);});
    return result;
  }
  // Compact membership runs: filtering funding never materializes every pre-invoice.
  function fundingStatusRuns(bid,si,total,kind,wanted){
    if(kind!=='positive')return [];
    var gid=bid+'~'+si,g=store.groups[gid],out=[];
    if(wanted!=='none'){
      if(g)runs(g).forEach(function(run){if(applicationStatus({status:run.status})===wanted)out.push({start:run.start,step:run.step,count:Math.max(0,Math.min(run.count,Math.ceil((total-run.start)/run.step)))});});
      Object.keys(store.applications||{}).forEach(function(id){if(!id.startsWith(gid+'~')||get(id))return;var index=Number(id.split('~')[2]);if(index>=0&&index<total&&store.applications[id].status===wanted)out.push({start:index,step:1,count:1});});
      return out.filter(function(r){return r.count>0;}).sort(function(a,b){return a.start-b.start;});
    }
    var base=[];function add(start,step,count){if(count>0)base.push({start:start,step:step,count:count});}
    if(g&&g.count){var last=Math.min(total-1,g.first+(g.count-1)*g.step);add(0,1,Math.min(total,g.first));for(var rem=1;rem<g.step;rem++){var start=g.first+rem;add(start,g.step,Math.floor((last-start)/g.step)+1);}add(last+1,1,total-last-1);}else add(0,1,total);
    var excluded=new Set(g?g.extra||[]:[]);Object.keys(store.applications||{}).forEach(function(id){if(id.startsWith(gid+'~'))excluded.add(Number(id.split('~')[2]));});
    var points=Array.from(excluded).sort(function(a,b){return a-b;});base.forEach(function(run){var cursor=0;points.forEach(function(index){var ordinal=(index-run.start)/run.step;if(!Number.isInteger(ordinal)||ordinal<cursor||ordinal>=run.count)return;if(ordinal>cursor)out.push({start:run.start+cursor*run.step,step:run.step,count:ordinal-cursor});cursor=ordinal+1;});if(cursor<run.count)out.push({start:run.start+cursor*run.step,step:run.step,count:run.count-cursor});});return out.sort(function(a,b){return a.start-b.start;});
  }
  function list(q,page,size){
    q=Object.assign({},q||{});q.number=String(q.number||'').trim();q.order=String(q.order||'').trim();page=page||1;size=size||10;var total=0,amount=0,rows=[],skip=(page-1)*size,counts={waiting:0,queued:0,reversing:0,failed:0,reversed:0};
    Object.values(store.groups).sort(function(a,b){return b.month.localeCompare(a.month)||a.code.localeCompare(b.code);}).forEach(function(g){
      if(q.bill&&g.billId!==q.bill||q.month&&g.month!==q.month||q.project&&g.project!==q.project||q.store&&g.store!==q.store)return;
      runs(g).forEach(function(run){
        if(q.status&&!(q.status==='pending'?['waiting','queued'].includes(run.status):q.status===run.status))return;
        if(!q.number&&!q.order){
          var from=Math.max(0,skip-total),to=Math.min(run.count,skip+size-total);for(var j=from;j<to;j++)rows.push(get(recordId(g,run.start+j*run.step)));
          total+=run.count;amount+=run.count*run.amount;counts[run.status]+=run.count;return;
        }
        for(var j=0;j<run.count;j++){
          var index=run.start+j*run.step,id=recordId(g,index),ov=store.overrides[id]||{},number=ov.number||invoiceId(g,index),order=g.orderPrefix+String(index+g.offset+1).padStart(6,'0');
          if(q.number&&!number.toLowerCase().includes(q.number.toLowerCase())||q.order&&!order.toLowerCase().includes(q.order.toLowerCase()))continue;
          if(total>=skip&&total<skip+size)rows.push(get(id));total++;amount+=run.amount;counts[run.status]++;
        }
      });
    });return{rows:rows,total:total,amount:amount,counts:counts};
  }
  function startPending(){
    fresh();var changed=false;
    Object.values(store.jobs).forEach(function(job){if(job.status==='queued'){job.status='reversing';job.startedAt=now();changed=true;}});
    Object.values(store.overrides).forEach(function(ov){if(ov.status==='queued'){ov.status='reversing';ov.requestedAt=now();changed=true;}});
    if(changed)save();return Object.values(store.jobs).some(function(j){return j.status==='reversing';})||Object.values(store.overrides).some(function(o){return o.status==='reversing';})||Object.keys(store.applications||{}).some(function(id){var a=store.applications[id];return a.status==='processing'&&a.run&&!get(id);});
  }
  function finishPending(){
    var changed=finishApplications();fresh();var time=now();
    Object.values(store.jobs).forEach(function(job){
      if(!job.beforeSettlement){if(job.status==='reversing'){job.status='reversed';job.completedAt=time;changed=true;}return;}
      var groups=Object.values(store.groups).filter(function(g){return g.billId===job.billId;}),overrides=Object.keys(store.overrides).filter(function(id){return id.startsWith(job.billId+'~')&&store.overrides[id].status==='reversing';});
      if(job.status!=='reversing'&&!overrides.length)return;
      job.progress=job.progress||{};var remaining=0;
      if(job.status==='reversing')groups.forEach(function(g){var done=job.progress[g.id]||0;job.progress[g.id]=Math.min(g.count,done+Math.max(1,Math.ceil(g.count/6)));remaining+=g.count-job.progress[g.id];});
      var limit=Math.max(1,Math.ceil(overrides.length/6));overrides.slice(0,limit).forEach(function(id){var ov=store.overrides[id];ov.status='reversed';ov.completedAt=time;delete ov.error;});
      if(!remaining&&overrides.length<=limit){job.status='reversed';job.completedAt=time;}job.lastProgressAt=time;changed=true;
    });
    Object.keys(store.overrides).forEach(function(id){var ov=store.overrides[id],job=store.jobs[id.split('~')[0]];if(ov.status==='reversing'&&!(job&&job.beforeSettlement)){ov.status='reversed';ov.completedAt=time;delete ov.error;changed=true;}});
    if(changed)save();return changed;
  }
  function retry(id){
    fresh();var inv=get(id);if(!inv||inv.status!=='failed')throw new Error('当前预开发票不能重试红冲');
    var ov=store.overrides[id]||{};ov.history=ov.history||[];ov.history.push({error:ov.error,date:ov.completedAt});ov.status='queued';ov.retryCount=(ov.retryCount||0)+1;delete ov.completedAt;delete ov.error;store.overrides[id]=ov;save();return get(id);
  }
  // Register an actual successful pre-invoice result from the order-invoicing flow.
  // Settlement success never calls this function and cannot create a missing pre-invoice.
  function hasInvoiceNumber(number){
    if(Object.keys(store.overrides).some(function(id){return store.overrides[id].number===number&&get(id);}))return true;
    return Object.values(store.groups).some(function(g){var prefix='YK'+g.code+'-';if(!number.startsWith(prefix))return false;var suffix=number.slice(prefix.length);if(!/^\d+$/.test(suffix))return false;var index=Number(suffix)-1,record=included(g,index)&&get(recordId(g,index));return record&&record.number===number;});
  }
  function registerIssuedInvoice(fundingId,doc){
    fresh();var existing=get(fundingId);if(existing){if(doc.number&&doc.number!==existing.number)throw new Error('该出资明细已有关联预开发票');return existing;}
    if(doc.number&&hasInvoiceNumber(doc.number))throw new Error('该预开发票已关联其他出资明细');
    var r=D.getRecord(fundingId);if(!r||r.kind!=='positive'||!doc.number||!doc.orderInvoiceRequestId||!Number.isSafeInteger(doc.amount)||doc.amount<=0)throw new Error('缺少有效的订单开票结果或预开发票信息');
    var parts=fundingId.split('~'),b=D.bill(parts[0]),si=Number(parts[1]),index=Number(parts[2]),g=store.groups[b.id+'~'+si];
    if(!Number.isSafeInteger(index)||index<0||index>=b.segments[si].count)throw new Error('出资明细不存在');
    if(!g){g=makeGroup(b,si,false);store.groups[g.id]=g;}g.rawCount=Math.max(g.rawCount,b.segments[si].count);
    g.extra.push(index);store.overrides[fundingId]={number:doc.number,date:doc.date||now(),amount:doc.amount,status:'waiting',seller:clone(doc.seller||g.seller),invoiceType:doc.invoiceType||g.invoiceType,taxCode:doc.taxCode||g.taxCode,taxShortName:doc.taxShortName||g.taxShortName,taxRate:doc.taxRate==null?g.taxRate:doc.taxRate};
    var l=ledger(),model=l.months[b.month],latest=model&&model.bills.find(function(x){return x.id===b.id;}),blue=latest&&D.activeInvoice(latest);if(blue)queueForSuccess(latest,blue,false);
    save();O.invalidate();return get(fundingId);
  }
  function applyOrderInvoiceResult(result){
    if(!result||!result.order||!result.requestId)throw new Error('缺少订单开票结果来源');
    var documents=(result.platformInvoices||[]).filter(function(doc){return ['issued','processing','failed'].includes(doc.status);});
    documents.forEach(function(doc){var r=D.getRecord(doc.fundingId);if(!r||r.order!==result.order||r.kind!=='positive')throw new Error('预开发票与订单出资明细不匹配');});
    fresh();
    // Consumer and platform outcomes are recorded independently from the same order flow.
    if(result.consumer&&['issued','processing','failed'].includes(result.consumer.status)){
      store.orderEvents[result.order]={id:result.requestId,createdAt:result.createdAt||now(),amount:result.consumer.amount,status:result.consumer.status};save();
    }
    var invoices=documents.map(function(doc){var source=Object.assign({},doc,{createdAt:result.createdAt||now(),orderInvoiceRequestId:result.requestId});return doc.status==='issued'?registerIssuedInvoice(doc.fundingId,source):registerApplication(doc.fundingId,source);});
    O.invalidate();return invoices;
  }
  function requestNumber(id){return 'YKSQ'+id.replace(/-/g,'').replace(/~/g,'-').toUpperCase();}
  function applicationStatus(inv){return {waiting:'completed',queued:'revoking',reversing:'revoking',failed:'reverse_failed',reversed:'revoked'}[inv.status];}
  function application(id){
    var inv=get(id),a=(store.applications||{})[id];
    if(inv)return Object.assign({},inv,{requestNumber:a&&a.requestNumber||requestNumber(id),appliedAt:a&&a.createdAt||inv.date,applicationStatus:applicationStatus(inv),failureStage:inv.status==='failed'?'撤销':'',origin:'随订单开票',hasInvoice:true});
    if(!a)return null;
    var r=D.getRecord(id);if(!r)return null;var st=D.getStore(r.store),b=D.bill(id.split('~')[0]),p=D.getProject(r.project),pol=(b.policySnapshot||[]).find(function(x){return x.id===r.policy;});
    return {id:id,fundingId:id,requestNumber:a.requestNumber,appliedAt:a.createdAt,applicationStatus:a.status,origin:'随订单开票',hasInvoice:false,number:'',date:'',amount:a.amount,buyerName:BUYER,item:ITEM,seller:clone(a.seller||D.getSeller(st.seller)),invoiceType:a.invoiceType||'增值税普通发票',order:r.order,store:r.store,storeName:st.name,month:r.month,project:r.project,projectName:p.name,policyName:pol?pol.name:'—',billId:r.month<D.TODAY?b.id:'',error:a.error||'',failureStage:a.status==='failed'?'开票':'',status:a.status};
  }
  function registerApplication(fundingId,doc){
    fresh();var r=D.getRecord(fundingId);if(!r||r.kind!=='positive'||!doc.orderInvoiceRequestId)throw new Error('缺少有效的订单开票申请');
    store.applications=store.applications||{};var existing=store.applications[fundingId];
    if(get(fundingId))return application(fundingId);
    if(existing&&existing.orderInvoiceRequestId!==doc.orderInvoiceRequestId)throw new Error('该出资明细已有关联开票申请');
    var a=existing||{requestNumber:requestNumber(fundingId),orderInvoiceRequestId:doc.orderInvoiceRequestId,createdAt:doc.createdAt||now(),amount:doc.amount==null?r.amount:doc.amount,retryCount:0};
    if(!Number.isSafeInteger(a.amount)||a.amount<=0)throw new Error('申请金额无效');
    a.status=doc.status==='failed'?'failed':'processing';a.error=doc.error||'';a.seller=clone(doc.seller||D.getSeller(D.getStore(r.store).seller));a.invoiceType=doc.invoiceType||'增值税普通发票';delete a.run;
    store.applications[fundingId]=a;save();return application(fundingId);
  }
  function initApplications(){
    if(store.applicationFixturesVersion)return;
    store.applications=store.applications||{};var added=0;
    // Two explicitly imported sample order-invoicing requests, separate from funding sync.
    Object.values(store.groups).filter(function(g){return g.month===D.TODAY;}).some(function(g){
      for(var index=g.rawCount-1;index>=0&&index>g.rawCount-6;index--){var id=recordId(g,index);if(included(g,index)||store.applications[id])continue;
        store.applications[id]={requestNumber:requestNumber(id),orderInvoiceRequestId:'C'+g.orderPrefix+String(index+g.offset+1).padStart(6,'0'),createdAt:D.TODAY+'-30 10:0'+added,amount:g.amount,status:added?'failed':'processing',error:added?'开票服务响应超时，请稍后重试。':'',retryCount:0};
        added++;if(added===2)return true;
      }return false;
    });store.applicationFixturesVersion=1;save();
  }
  function applications(q,page,size){
    q=q||{};page=page||1;size=size||10;var chunks=[],total=0;
    function matchText(v,w){return !w||String(v).toLowerCase().includes(String(w).trim().toLowerCase());}
    function add(g,index,step,count,date,status){
      var id=recordId(g,index),a=store.applications[id],ov=store.overrides[id]||{},seller=ov.seller||a&&a.seller||g.seller;date=a&&a.createdAt||date;
      if(q.status&&status!==q.status||q.createdFrom&&date.slice(0,10)<q.createdFrom||q.createdTo&&date.slice(0,10)>q.createdTo||!matchText(g.storeName+' '+g.store,q.store)||!matchText(seller.name+' '+seller.tax,q.seller))return;
      if(q.request||q.order){
        for(var k=0;k<count;k++){var i=index+k*step,rid=recordId(g,i),saved=store.applications[rid],req=saved&&saved.requestNumber||requestNumber(rid),order=g.orderPrefix+String(i+g.offset+1).padStart(6,'0');if(!matchText(req,q.request)||!matchText(order,q.order))continue;chunks.push({g:g,start:i,step:1,count:1,date:date});total++;}return;
      }
      chunks.push({g:g,start:index,step:step,count:count,date:date});total+=count;
    }
    Object.values(store.groups).forEach(function(g){
      if(q.bill&&g.billId!==q.bill||!matchText(g.storeName+' '+g.store,q.store))return;
      runs(g).forEach(function(run){
        if(q.failureStage==='reversal'&&run.status!=='failed')return;var status=applicationStatus({status:run.status});if(q.status&&q.status!==status)return;
        var firstId=recordId(g,run.start),customDate=store.applications[firstId]&&store.applications[firstId].createdAt||store.overrides[firstId]&&store.overrides[firstId].date;
        if(customDate){add(g,run.start,run.step,run.count,customDate,status);return;}
        if(q.createdFrom&&g.month<q.createdFrom.slice(0,7)||q.createdTo&&g.month>q.createdTo.slice(0,7))return;
        // Fixture dates repeat every 540 records (27 days × 60 minutes, least common multiple).
        // Keep those as compact sorted runs instead of materializing all invoice records.
        var a=540,b=run.step;while(b){var t=a%b;a=b;b=t;}var period=540/a;
        for(var j=0;j<Math.min(run.count,period);j++){var index=run.start+j*run.step,ordinal=index+g.offset,date=g.month+'-'+String(1+ordinal%27).padStart(2,'0')+' 12:'+String(ordinal%60).padStart(2,'0');add(g,index,run.step*period,Math.ceil((run.count-j)/period),date,status);}
      });
    });
    Object.keys(store.applications||{}).forEach(function(id){if(q.failureStage==='reversal'||q.bill&&!id.startsWith(q.bill+'~')||get(id))return;var a=application(id);if(!a)return;var parts=id.split('~'),b=D.bill(parts[0]),g=store.groups[parts[0]+'~'+parts[1]]||makeGroup(b,Number(parts[1]),false);add(g,Number(parts[2]),1,1,a.appliedAt,a.applicationStatus);});
    chunks.sort(function(a,b){return b.date.localeCompare(a.date)||a.g.id.localeCompare(b.g.id)||a.start-b.start;});
    var skip=(page-1)*size,rows=[];chunks.forEach(function(c){if(skip>=c.count){skip-=c.count;return;}if(rows.length>=size)return;var take=Math.min(c.count-skip,size-rows.length);for(var i=0;i<take;i++)rows.push(application(recordId(c.g,c.start+(skip+i)*c.step)));skip=0;});return{total:total,rows:rows};
  }
  function retryApplication(id){
    fresh();var a=application(id);if(!a||!['failed','reverse_failed'].includes(a.applicationStatus))throw new Error('当前申请不能重试');
    if(a.hasInvoice){retry(id);return application(id);}
    var saved=store.applications[id];saved.history=saved.history||[];saved.history.push({error:saved.error,date:now()});saved.status='processing';saved.retryCount++;saved.error='';saved.run=true;save();return application(id);
  }
  function refreshApplication(id){fresh();var a=store.applications[id];if(a&&a.status==='processing'&&!get(id)){a.run=true;save();}return application(id);}
  function finishApplications(){
    fresh();var ids=Object.keys(store.applications||{}).filter(function(id){var a=store.applications[id];return a.status==='processing'&&a.run&&!get(id);});
    ids.forEach(function(id){var a=store.applications[id];registerIssuedInvoice(id,{number:'YK'+id.replace(/-/g,'').replace(/~/g,'-').toUpperCase(),orderInvoiceRequestId:a.orderInvoiceRequestId,amount:a.amount,date:now(),seller:a.seller,invoiceType:a.invoiceType});});return !!ids.length;
  }
  function initOrderExamples(){
    if(!window.DemoOrderExamples||store.demoOrderExamplesVersion)return;
    window.DemoOrderExamples.orders.forEach(function(o){
      var documents=o.fundingIds.map(function(id,i){var state=o.preStates[i];if(state==='none')return null;return{fundingId:id,number:'YK-EX-'+o.number+'-'+(i+1),date:o.createdAt,amount:D.getRecord(id).amount,status:['reversed','reverse_failed'].includes(state)?'issued':state,error:state==='failed'?'开票额度不足，请处理后重试。':''};}).filter(Boolean);
      var result={order:o.number,requestId:'C-EX-'+o.number,createdAt:o.createdAt,platformInvoices:documents};if(o.consumerState!=='none')result.consumer={status:o.consumerState,amount:o.paid};applyOrderInvoiceResult(result);
      o.fundingIds.forEach(function(id,i){var state=o.preStates[i];if(!['reversed','reverse_failed'].includes(state))return;
        var ov=store.overrides[id],bid=id.split('~')[0];ov.status=state==='reversed'?'reversed':'failed';ov.requestedAt='2026-09-01 10:00';ov.completedAt='2026-09-01 10:05';
        if(state==='reversed'){ov.redNumber='HY-EX-'+o.number+'-'+(i+1);if(store.jobs[bid]){store.jobs[bid].status='reversed';store.jobs[bid].completedAt=ov.completedAt;}}
        else ov.error='红冲服务响应超时，请稍后重试。';save();
      });
    });store.demoOrderExamplesVersion=1;save();O.invalidate();
  }
  function settlementReversalState(bid){
    fresh();var summary={total:0,reversed:0,pending:0,waiting:0,reversing:0,failed:0,issuing:0};
    Object.values(store.groups).filter(function(g){return g.billId===bid;}).forEach(function(g){runs(g).forEach(function(run){summary.total+=run.count;if(run.status==='reversed')summary.reversed+=run.count;else if(run.status==='failed')summary.failed+=run.count;else{summary.pending+=run.count;if(run.status==='reversing')summary.reversing+=run.count;else summary.waiting+=run.count;}});});
    Object.keys(store.applications||{}).forEach(function(id){var a=store.applications[id];if(id.startsWith(bid+'~')&&a.status==='processing'&&!get(id))summary.issuing++;});return summary;
  }
  function pendingSettlementApplications(bid){fresh();return Object.keys(store.applications||{}).filter(function(id){return id.startsWith(bid+'~')&&store.applications[id].status==='processing'&&!get(id);}).map(application);}
  function prepareSettlementReversal(bid,applicationId){
    fresh();var b=D.bill(bid);if(!b||b.month>=D.TODAY||b.activeRequest!==applicationId&&b.activeWorkflow!==applicationId)throw new Error('结算开票申请已变化');
    var groups=Object.values(store.groups).filter(function(g){return g.billId===bid;});
    if(!groups.length)return settlementReversalState(bid);
    var check=settlementReversalState(bid);if(check.issuing)throw new Error('存在处理中的预开申请，请处理后重新提交');
    if(!check.pending&&!check.failed)return check;
    var job=store.jobs[bid];
    if(!job){job=store.jobs[bid]={billId:bid,invoiceId:'',beforeSettlement:true,status:'queued',createdAt:now(),applicationId:applicationId};}
    else{job.beforeSettlement=true;job.applicationId=applicationId;if(!['reversed','reversing'].includes(job.status)){job.status='queued';job.createdAt=now();}}
    groups.forEach(function(g){Object.keys(store.overrides).filter(function(id){return id.startsWith(g.id+'~');}).forEach(function(id){var ov=store.overrides[id];if(['waiting','failed'].includes(ov.status)){if(ov.status==='failed'){ov.history=ov.history||[];ov.history.push({error:ov.error,date:ov.completedAt});ov.retryCount=(ov.retryCount||0)+1;}ov.status='queued';ov.requestedAt=now();delete ov.error;delete ov.completedAt;}});});
    save();return settlementReversalState(bid);
  }
  function invoiceSnapshot(id,red){
    var p=get(id);if(!p||red&&p.status!=='reversed')return null;
    return{id:red?p.redNumber:p.number,amount:red?-p.amount:p.amount,tone:red?'red':'blue',date:red?p.completedAt:p.date,buyer:{name:BUYER,tax:'',address:'',phone:'',bank:'',bankAccount:''},seller:p.seller,item:ITEM,taxCode:p.taxCode,taxShortName:p.taxShortName,taxRate:p.taxRate,invoiceType:p.invoiceType,remark:'',originalId:red?p.number:null};
  }
  init();initOrderExamples();
  window.DemoPreissued={beginFundingQuery:fresh,fundingStatusRuns:fundingStatusRuns,pendingSettlementApplications:pendingSettlementApplications,settlementReversalState:settlementReversalState,prepareSettlementReversal:prepareSettlementReversal,application:application,applications:applications,registerApplication:registerApplication,retryApplication:retryApplication,refreshApplication:refreshApplication,KEY:KEY,BUYER:BUYER,ITEM:ITEM,get:get,list:list,reconcile:reconcile,refresh:function(){fresh();reconcile();O.invalidate();},onSettlementSuccess:function(b,inv){fresh();return queueForSuccess(b,inv);},startPending:startPending,finishPending:finishPending,retry:retry,registerIssuedInvoice:registerIssuedInvoice,applyOrderInvoiceResult:applyOrderInvoiceResult,invoiceSnapshot:invoiceSnapshot,orderInvoiceEvent:orderInvoiceEvent,months:function(){return Array.from(new Set(Object.values(store.groups).map(function(g){return g.month;}))).sort().reverse();}};
})();
