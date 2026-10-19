(function(){
 'use strict';
 var D=window.DemoData,P=window.DemoPreissued,clone=function(x){return JSON.parse(JSON.stringify(x));},now=function(){return new Date().toLocaleString('sv-SE').slice(0,19);};
 function latest(b){return (b.workflowTasks||[]).slice(-1)[0];}
 function find(b,id){return (b.workflowTasks||[]).find(function(t){return t.id===id;});}
 function canRetry(b,t){return !!(t&&t.status==='failed'&&latest(b)?.id===t.id&&D.canIssue(b)&&b.invoiceAmount===t.amount);}
 function preState(b){
  var c=P.settlementReversalState(b.id),active=(b.workflowTasks||[]).find(function(t){return t.id===b.activeWorkflow&&t.status==='processing';}),completed=(b.workflowTasks||[]).slice().reverse().find(function(t){return t.preCompletedAt;});
  var status=!c.total&&!c.issuing?'none':!c.pending&&!c.failed&&!c.issuing?'done':c.failed&&!(active&&['preparing','waiting_preissued'].includes(active.stage))?'failed':active||c.reversing||c.issuing?'processing':'pending';
  return{status:status,summary:c,completedAt:completed&&completed.preCompletedAt||''};
 }
 function scope(b){return JSON.stringify([b.invoiceAmount,b.seller,b.buyerSnapshot,b.item,b.taxCode,b.taxRate,b.invoiceType,b.segments]);}
 function start(bid,values){
  var b=D.refreshBill(bid);if(!D.canIssue(b))throw Error('当前结算单不能启动开票');if(b.invoiceAmount!==values.amount||!Number.isSafeInteger(values.amount)||values.amount<=0)throw Error('应开票金额已变化，请重新确认');
  values=Object.assign({},values,{remarkOptions:[],issueBuyerSnapshot:clone(values.issueBuyerSnapshot||D.invoiceDefaults(b).buyer)});if(values.issueBuyerSnapshot.tax!==(b.buyerSnapshot||D.getBuyer(D.getProject(b.project))).tax)throw Error('购买方已变化，请重新确认');
  var emails=D.invoiceRecipients({recipients:values.emails||[]});if(emails.some(function(v){return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);}))throw Error('接收邮箱无效');
  b.workflowTasks=b.workflowTasks||[];var pre=preState(b),preComplete=['done','none'].includes(pre.status);var t={id:'LC'+bid.replace(/-/g,'').toUpperCase()+'-'+(b.workflowTasks.length+1),formalBefore:D.formalStatus(b),process:true,preflight:true,type:'blue',status:'processing',stage:preComplete?'issuing':'preparing',preCompletedAt:preComplete?(pre.completedAt||now()):'',amount:b.invoiceAmount,createdAt:now(),scope:scope(b),batchId:values.batchId||'',retryOf:values.retryOf||'',values:clone(values),preInvoiceSummary:P.settlementReversalState(bid)};
  b.workflowTasks.push(t);b.activeWorkflow=t.id;b.status='processing';b.invoiceRemark=values.remark||'';b.invoiceRemarkOptions=values.remarkOptions||[];b.recipients=emails;D.save();return t;
 }
 function validate(ids,pid,month,amounts){if(!ids.length||new Set(ids).size!==ids.length)throw Error('请选择结算单，且勿重复选择');return ids.map(function(id){var b=D.refreshBill(id);if((D.getPartner(pid)?D.partnerId(b)!==pid:b.project!==pid)||b.month!==month)throw Error('只能提交当前合作伙伴月份的结算单');if(!D.canIssue(b))throw Error('结算单状态已变化，请重新选择');if(!Number.isSafeInteger(b.invoiceAmount)||b.invoiceAmount<=0||amounts&&amounts[id]!==b.invoiceAmount)throw Error('应开票金额已变化，请重新确认');if(D.invoiceRecipients(b).some(function(v){return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);}))throw Error('结算单接收邮箱无效');return b;});}
 function submit(ids,pid,m,amounts){var bills=validate(ids,pid,m,amounts),batch='PL'+Date.now();return bills.map(function(b){var defaults=D.invoiceDefaults(b);var t=start(b.id,{issueBuyerSnapshot:defaults.buyer,batchId:batch,retryOf:latest(b)?.status==='failed'?latest(b).id:'',amount:b.invoiceAmount,remark:'',remarkOptions:defaults.remarkOptions,emails:D.invoiceRecipients(b)});return{billId:b.id,applicationId:t.id};});}
 function retry(bid,id){var b=D.refreshBill(bid),t=find(b,id);if(!canRetry(b,t))throw Error('当前流程不能重试，请核对结算单状态和金额');return start(bid,Object.assign({},clone(t.values),{batchId:'',retryOf:t.id,amount:t.amount}));}
 function stageLabel(t){if(!t)return '';if(t.status==='issued')return '正式开票成功';if(t.status==='failed')return(t.failureStage||t.stage)==='issuing'?'正式开票失败':'预票红冲失败';return t.stage==='waiting_preissued'?'等待预开结果':t.stage==='issuing'?(t.formalId?'正式开票中':'准备正式开票'):'预票处理中';}
 function fail(b,t,error){t.failureStage=t.stage;t.status='failed';t.error=error;t.completedAt=now();t.preInvoiceSummary=P.settlementReversalState(b.id);if(t.formalId){var a=b.applications.find(function(x){return x.id===t.formalId;});if(a&&a.status==='processing')D.completeRequest(b.id,a.id,{status:'failed',error:error});}b.status='failed';delete b.activeWorkflow;D.save();return{done:true,error:error};}
 function advance(bid,id,result){
  var b=D.refreshBill(bid),t=find(b,id);if(!t){var a=b.applications.find(function(x){return x.id===id;});if(!a||a.status!=='processing')return{done:true};return{done:true,invoice:D.completeRequest(bid,id,result===undefined?true:result)};}
  if(t.status!=='processing'||b.activeWorkflow!==id)return{done:true};
  try{
   if(t.scope&&t.scope!==scope(b))throw Error('结算范围或开票信息已变化，请核对后重新提交');
   var c=P.settlementReversalState(bid);t.preInvoiceSummary=c;
   if(c.issuing){t.stage='waiting_preissued';D.save();return{done:false};}
   if(['preparing','waiting_preissued'].includes(t.stage)){if(c.pending||c.failed)P.prepareSettlementReversal(bid,id);t.stage='pre_reversing';t.preStartedAt=t.preStartedAt||now();c=P.settlementReversalState(bid);t.preInvoiceSummary=c;}
   if(c.failed){t.stage='pre_reversing';return fail(b,t,'关联预票红冲失败 '+c.failed+' 张，请查看原因后重试');}
   if(c.pending){P.prepareSettlementReversal(bid,id);t.stage='pre_reversing';D.save();return{done:false};}
   t.preCompletedAt=t.preCompletedAt||now();
   if(!t.formalId){t.stage='issuing';t.formalStartedAt=now();D.save();var formal=D.startInvoice(bid,Object.assign({},t.values,{preflight:true,workflowId:t.id,amount:t.amount}));t.formalId=formal.id;D.save();return{done:false,stage:'issuing'};}
   t.stage='issuing';var a=b.applications.find(function(x){return x.id===t.formalId;});
   var invoice=a.status==='issued'?b.invoices.find(function(x){return x.id===a.invoiceId;}):D.completeRequest(bid,a.id,result===undefined?true:result);
   if(a.status==='failed')return fail(b,t,a.error);
   if(invoice){t.status='issued';t.stage='complete';t.completedAt=now();t.invoiceId=invoice.id;delete b.activeWorkflow;D.save();return{done:true,invoice:invoice};}
   D.save();return{done:false};
  }catch(error){return fail(b,t,error.message);}
 }
 // Move premature application records into settlement processes; keep actual formal attempts and invoices.
 function migrate(){var changed=false;Object.values(D.db.months).forEach(function(m){m.bills.forEach(function(b){if(!b.workflowTasks&&!b.applications.some(function(a){return a.preflight;}))return;b.workflowTasks=b.workflowTasks||[];b.applications=b.applications.filter(function(a){if(!a.preflight||a.workflowId)return true;var t=clone(a);t.process=true;t.values={amount:a.amount,remark:a.manualRemark||'',remarkOptions:a.remarkOptions||[],emails:D.invoiceRecipients(a)};t.scope=scope(b);var formal=!!(a.invoiceId||a.formalStartedAt||a.stage==='issuing'||a.failureStage==='issuing');if(formal){t.formalId=a.id;a.workflowId=t.id;a.stage='issuing';}if(!find(b,t.id))b.workflowTasks.push(t);if(a.status==='processing'){b.activeWorkflow=t.id;if(!formal)delete b.activeRequest;}changed=true;return formal;});});});if(changed)D.save();}
 window.DemoSettlementWorkflow={preState:preState,start:start,latest:latest,find:find,validate:validate,submit:submit,retry:retry,canRetry:canRetry,stageLabel:stageLabel,advance:advance,migrate:migrate};migrate();
})();
