(function(){
 'use strict';
 var D=window.DemoData,P=window.DemoPreissued,db=D.db,m=D.PREVIOUS,clone=function(x){return JSON.parse(JSON.stringify(x));};
 if(db.stageExamplesVersion){window.DemoSettlementWorkflow.migrate();return;}
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
 });db.stageExamplesVersion=1;D.save();window.DemoSettlementWorkflow.migrate();
})();
