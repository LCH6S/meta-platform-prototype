(function(){
  'use strict';
  var D=window.DemoData,db=D.db,storeId='DEMO001',storeName='优惠演示门店';
  if(!D.getStore(storeId))D.stores.push({id:storeId,name:storeName,region:'华东',seller:'sh',demoOnly:true});
  var sourceDefs=[
    ['EX-PAY','支付宝支付立减','支付方式','订单通过支付宝支付时，由平台承担的立减金额。'],
    ['EX-BANK','银行券出资','券信息','按达美乐提供的银行券信息识别的合作方出资金额。'],
    ['EX-COUPON','抖音商品券补贴','券信息','订单核销抖音商品券时，由平台承担的补贴金额。'],
    ['EX-MT','美团满减出资','3PP订单','美团订单活动明细中由平台承担的满减金额。'],
    ['EX-DELIVERY','美团配送出资','3PP订单','美团订单活动明细中由平台承担的配送优惠。'],
    ['EX-B2B','企业福利支付','支付方式','企业福利支付方式对应金额全部向合作方开票，消费者部分为零。']
  ];
  sourceDefs.forEach(function(s){if(!D.sources.some(function(x){return x.code===s[0];}))D.sources.push({code:s[0],name:s[1],type:s[2],description:s[3]});});
  function clone(x){return JSON.parse(JSON.stringify(x));}
  function makePolicy(id,source,seller){return{id:id,name:D.sources.find(function(s){return s.code===source;}).name,sources:[source],sellerMode:seller?'fixed':'order',sellerId:seller||'',item:'餐饮',taxCode:'3070401000000000000',taxShortName:'餐饮服务',taxRate:6};}
  if(!db.orderExamples){
    var partnerId='demo-welfare',suffix=1;while(D.getPartner(partnerId))partnerId='demo-welfare-'+suffix++;
    db.partners.push({id:partnerId,name:'企业福利合作方',code:'KH-EX-WELFARE',alias:'企业福利',category:'支付平台',remark:'',buyers:[{id:partnerId+'-buyer',name:'企业福利结算主体',tax:'91310000DEMO00008X',email:'',bank:'',bankAccount:'',phone:'',address:''}]});
    var plans=[['ali','支付宝优惠演示合作',[makePolicy('ex-pay','EX-PAY'),makePolicy('ex-bank','EX-BANK','it')]],['dy','抖音优惠演示合作',[makePolicy('ex-coupon','EX-COUPON')]],['mt','美团优惠演示合作',[makePolicy('ex-mt','EX-MT'),makePolicy('ex-delivery','EX-DELIVERY')]], [partnerId,'企业福利优惠演示合作',[makePolicy('ex-b2b','EX-B2B')]]];
    var projects=plans.map(function(plan){var seq=8;while(D.getProject('p'+seq))seq++;var p={id:'p'+seq,code:'HZ-EX-'+seq,name:plan[1],partner:plan[0],buyer:D.getPartner(plan[0]).buyers[0].id,invoiceType:'增值税普通发票',cycle:'自然月',remark:'',demoCreated:true,demoFixture:'discount-store-v1',policies:plan[2]};db.projects.push(p);return p;});
    // Each case is an explicitly supplied sample order/result, never inferred from synchronization.
    var cases=[
      ['01','支付优惠未开票','2026-09',9000,'none',[['EX-PAY',1000,'none']],'支付宝小程序'],
      ['02','银行券已开票','2026-09',8000,'issued',[['EX-BANK',2000,'issued']],'newPOS'],
      ['03','商品券已开票','2026-09',7500,'issued',[['EX-COUPON',2500,'issued']],'微信小程序'],
      ['04','3PP多笔出资','2026-09',7000,'issued',[['EX-MT',2000,'issued'],['EX-DELIVERY',1000,'issued']],'美团外卖'],
      ['05','同单跨来源跨项目','2026-09',6000,'issued',[['EX-PAY',1000,'issued'],['EX-BANK',1000,'issued'],['EX-COUPON',2000,'issued']],'支付宝小程序'],
      ['06','支付方式全额ToB','2026-09',0,'none',[['EX-B2B',10000,'issued']],'newPOS'],
      ['07','消费者成功平台失败','2026-09',9000,'issued',[['EX-PAY',1000,'failed']],'支付宝小程序'],
      ['08','消费者失败平台成功','2026-09',8000,'failed',[['EX-BANK',2000,'issued']],'微信小程序'],
      ['09','多张平台票部分失败','2026-09',7500,'issued',[['EX-MT',2000,'issued'],['EX-DELIVERY',500,'failed']],'美团外卖'],
      ['10','订单开票处理中','2026-09',9000,'processing',[['EX-PAY',1000,'processing']],'支付宝小程序'],
      ['11','预票已撤销正式票成功','2026-08',8000,'issued',[['EX-BANK',2000,'reversed']],'newPOS'],
      ['12','预票撤销失败','2026-08',8500,'issued',[['EX-PAY',1500,'reverse_failed']],'支付宝小程序']
    ];
    var grouped={},orders=[];
    cases.forEach(function(c,ci){var month=c[2],prefix='YH'+month.replace('-',''),number=prefix+String(ci+1).padStart(6,'0'),createdAt=month+'-28 12:'+String(59-ci).padStart(2,'0'),fundingIds=[],preStates=[];
      c[5].forEach(function(part){var p=projects.find(function(p){return p.policies.some(function(pol){return pol.sources.includes(part[0]);});}),pol=p.policies.find(function(pol){return pol.sources.includes(part[0]);}),seller=pol.sellerMode==='fixed'?pol.sellerId:'sh',key=[month,p.id,seller,pol.item].join('|'),b=grouped[key];
        if(!b){var model=D.month(month),id=month+'-'+p.id+'-EX'+(Object.keys(grouped).length+1);b={id:id,month:month,project:p.id,seller:seller,item:pol.item,taxCode:pol.taxCode,taxShortName:pol.taxShortName,taxRate:6,segments:[],status:month===D.TODAY?'collecting':'ready',issued:0,invoices:[],applications:[],attempts:0,adjustments:[],invoiceType:p.invoiceType,buyerSnapshot:clone(D.getBuyer(p)),policySnapshot:clone(p.policies),recipient:'',modelVersion:2};grouped[key]=b;model.bills.push(b);}
        var si=b.segments.length;b.segments.push({policy:pol.id,store:storeId,source:part[0],count:1,cents:part[1],kind:'positive',orderIndexOffset:ci,orderPrefix:prefix,orderOccurred:createdAt,demoOrder:true});fundingIds.push(b.id+'~'+si+'~0');preStates.push(part[2]);
        if(part[2]==='reversed')b.exampleIssued=true;
      });
      var platform=c[5].reduce(function(s,p){return s+p[1];},0),amount=c[3]+platform;
      orders.push({id:fundingIds[0],number:number,province:'上海市',city:'上海市',store:storeName,storeCode:storeId,amount:amount,paid:c[3],original:amount+1000,discount:1000,buyerPhone:'13800004000',recipientPhone:'13800004000',channel:c[6],createdAt:createdAt,completedAt:createdAt,scene:'堂食',paymentChannel:c[6]==='美团外卖'?'美团支付':c[3]===0?'企业福利支付':c[6]==='支付宝小程序'?'线上支付宝支付':'线上微信支付',paymentCode:c[6]==='美团外卖'?'PM012':c[3]===0?'PM039':c[6]==='支付宝小程序'?'PM003':'PM004',returned:false,consumerState:c[4],fundingIds:fundingIds,preStates:preStates,scenario:c[1],demoOrder:true});
    });
    Object.values(grouped).forEach(function(b){b.invoiceAmount=D.settlementNet(b);if(b.exampleIssued){b.status='issued';b.issued=b.invoiceAmount;b.invoices.push({id:'FP-EX-'+b.id,amount:b.invoiceAmount,tone:'blue',date:'2026-09-01 10:10',buyer:clone(b.buyerSnapshot),seller:clone(D.getSeller(b.seller)),item:b.item,taxCode:b.taxCode,taxShortName:b.taxShortName,taxRate:b.taxRate,invoiceType:b.invoiceType,applicationId:'SQ-EX-'+b.id,remark:'',recipients:[]});b.applications.push({id:'SQ-EX-'+b.id,type:'blue',amount:b.invoiceAmount,status:'issued',createdAt:'2026-09-01 10:09',completedAt:'2026-09-01 10:10',invoiceId:b.invoices[0].id,buyer:clone(b.buyerSnapshot),seller:clone(D.getSeller(b.seller)),item:b.item,invoiceType:b.invoiceType,taxRate:b.taxRate});}});
    db.orderExamples={version:1,storeId:storeId,orders:orders,projectIds:projects.map(function(p){return p.id;}),billIds:Object.values(grouped).map(function(b){return b.id;})};D.save();
  }
  window.DemoOrderExamples={storeId:storeId,storeName:storeName,orders:db.orderExamples.orders};
})();
