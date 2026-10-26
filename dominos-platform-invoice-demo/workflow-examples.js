(function(){
 'use strict';
 var D=window.DemoData,P=window.DemoPreissued,db=D.db,m=D.PREVIOUS,clone=function(x){return JSON.parse(JSON.stringify(x));};
 function seedOriginalStages(){
 if(db.stageExamplesVersion)return;
 [{id:m+'-stage-red',source:'MT001',stage:'pre_reversing'},{id:m+'-stage-formal',source:'ALI002',stage:'issuing'}].forEach(function(sample){
  if(D.bill(sample.id))return;
  var template=D.month(m).bills.find(function(b){return b.segments.some(function(s){return s.source===sample.source;});});if(!template)return;
  var b=clone(template),segment=template.segments.find(function(s){return s.source===sample.source&&s.cents>0;});
  Object.assign(b,{id:sample.id,status:'ready',invoiceAmount:2000,issued:0,invoices:[],applications:[],workflowTasks:[],adjustments:[],attempts:0,modelVersion:2,workflowExample:true});delete b.activeRequest;delete b.activeWorkflow;
  b.segments=[Object.assign({},clone(segment),{count:4,cents:500,kind:'positive',orderPrefix:'YH'+m.replace('-','')+(sample.stage==='issuing'?'FORMAL':'RED'),orderOccurred:m+'-28 12:00'})];
  db.months[m].bills.push(b);D.save();
  for(var i=0;i<3;i++)P.registerIssuedInvoice(b.id+'~0~'+i,{number:'YK-STAGE-'+(sample.stage==='issuing'?'F':'R')+'-'+i,amount:500,date:m+'-28 12:00',orderInvoiceRequestId:'ORDER-STAGE-'+sample.id+'-'+i});
  var a=D.startInvoice(b.id,{preflight:true,amount:2000,remark:'',emails:[]});a.createdAt='2026-09-02 10:00';a.stage=sample.stage;a.preStartedAt='2026-09-02 10:00';if(sample.stage==='issuing'){a.preCompletedAt='2026-09-02 10:01';a.formalStartedAt='2026-09-02 10:01';}
  var store=JSON.parse(localStorage.getItem(P.KEY));store.jobs[b.id]={billId:b.id,invoiceId:'',beforeSettlement:true,status:'reversed',createdAt:'2026-09-02 10:00',completedAt:'2026-09-02 10:01',applicationId:a.id};
  for(var i=0;i<3;i++){var ov=store.overrides[b.id+'~0~'+i];ov.status=sample.stage==='pre_reversing'&&i===2?'failed':'reversed';ov.requestedAt='2026-09-02 10:00';ov.completedAt='2026-09-02 10:01';if(ov.status==='failed')ov.error='红冲服务响应超时，请重试。';else ov.redNumber='HY-STAGE-'+(sample.stage==='issuing'?'F':'R')+'-'+i;}
  localStorage.setItem(P.KEY,JSON.stringify(store));a.preInvoiceSummary=P.settlementReversalState(b.id);
  D.completeRequest(b.id,a.id,{status:'failed',failureStage:sample.stage,error:sample.stage==='issuing'?'开票服务响应超时，请重试。':'关联预票红冲失败 1 张，请查看原因后重试',completedAt:'2026-09-02 10:02'});
 });db.stageExamplesVersion=1;D.save();
 }
 function seedReversalFailures(){
  if(db.reversalFailureExamplesVersion)return;
  var samples=[
   {key:'all',source:'MT001',details:3,pre:3,failed:[0,1,2],cents:800},
   {key:'partial',source:'ALI001',details:5,pre:4,failed:[3],cents:1000},
   {key:'multiple',source:'UP001',details:7,pre:6,failed:[1,3,5],cents:1000},
   {key:'paged',source:'DY001',details:14,pre:12,failed:[10,11],cents:1000}
  ],complete=true,stamp=new Date(Date.UTC(Number(m.slice(0,4)),Number(m.slice(5)),2)).toISOString().slice(0,10),created=stamp+' 10:00',finished=stamp+' 10:02';
  samples.forEach(function(sample){
   var id=m+'-red-'+sample.key;if(D.bill(id))return;
   var template=D.month(m).bills.find(function(b){return !b.workflowExample&&b.segments.some(function(s){return s.source===sample.source&&s.kind==='positive';});});
   if(!template){complete=false;return;}
   var b=clone(template),segment=template.segments.find(function(s){return s.source===sample.source&&s.kind==='positive';});
   Object.assign(b,{id:id,status:'ready',invoiceAmount:sample.details*sample.cents,issued:0,invoices:[],applications:[],workflowTasks:[],adjustments:[],attempts:0,modelVersion:2,workflowExample:true,reversalFailureExample:sample.key,invoiceRemark:'',invoiceRemarkOptions:[],recipients:[],recipient:''});
   delete b.activeRequest;delete b.activeWorkflow;
   b.segments=[Object.assign({},clone(segment),{count:sample.details,cents:sample.cents,kind:'positive',demoOrder:true,orderIndexOffset:0,orderPrefix:'HK'+m.replace('-','')+sample.key.toUpperCase(),orderOccurred:m+'-28 12:00'})];
   db.months[m].bills.push(b);D.save();
   for(var i=0;i<sample.pre;i++){
    var fundingId=id+'~0~'+i,record=D.getRecord(fundingId);
    P.applyOrderInvoiceResult({order:record.order,requestId:'C-RED-'+sample.key.toUpperCase()+'-'+i,createdAt:m+'-28 12:00',consumer:{status:'issued',amount:9000},platformInvoices:[{fundingId:fundingId,number:'YK-RED-'+sample.key.toUpperCase()+'-'+String(i+1).padStart(3,'0'),status:'issued',amount:sample.cents,date:m+'-28 12:00'}]});
   }
   var task=window.DemoSettlementWorkflow.start(id,{amount:b.invoiceAmount,remark:'',emails:[]});task.stage='pre_reversing';task.createdAt=created;task.preStartedAt=created;D.save();
   var pre=JSON.parse(localStorage.getItem(P.KEY));
   pre.jobs[id]={billId:id,invoiceId:'',beforeSettlement:true,status:'failed',createdAt:created,completedAt:finished,applicationId:task.id,fixture:'reversal-failures-v1'};
   for(var i=0;i<sample.pre;i++){
    var ov=pre.overrides[id+'~0~'+i],failed=sample.failed.includes(i);ov.status=failed?'failed':'reversed';ov.requestedAt=created;ov.completedAt=finished;
    if(failed){ov.error=i%2?'红冲渠道服务异常，本次申请已终止，请重试。':'红字确认单生成失败，本次申请已终止，请重试。';delete ov.redNumber;}
    else{ov.redNumber='HY-RED-'+sample.key.toUpperCase()+'-'+String(i+1).padStart(3,'0');delete ov.error;}
   }
   localStorage.setItem(P.KEY,JSON.stringify(pre));
   window.DemoSettlementWorkflow.advance(id,task.id);
   var failedTask=window.DemoSettlementWorkflow.latest(b);failedTask.createdAt=created;failedTask.preStartedAt=created;failedTask.completedAt=finished;D.save();
  });
  if(complete){db.reversalFailureExamplesVersion=1;D.save();}
 }

 seedOriginalStages();seedReversalFailures();window.DemoSettlementWorkflow.migrate();
})();
