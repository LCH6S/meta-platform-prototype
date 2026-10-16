(function(){
  'use strict';
  var D=window.DemoData;
  var samples=[
    ['20260928NP11236','浙江省','杭州市','普大福地商业中心店','HZ018',1950,'13800001001','','newPOS','13:53'],
    ['20260928NP11251','广东省','佛山市','佛山南海里水里广路店（数电）','FS012',3300,'','','newPOS','13:37'],
    ['20260928NP11249','上海市','上海市','莲花南路店','SH029',5900,'13800001003','','newPOS','13:36'],
    ['20260928NP11210','北京市','北京市','顺义后沙峪店','BJ028',9750,'13800001004','','newPOS','13:33'],
    ['20260928DY15028','安徽省','合肥市','临泉路店','HF008',8930,'13800001005','13800002005','抖音','13:30'],
    ['20260928PW20584','广东省','广州市','云城西路店','GZ025',7800,'13800001006','13800002006','微信小程序','13:30'],
    ['503503-2848096-119799','陕西省','西安市','益田假日店','XA006',7900,'13800001007','','美团秒提','13:29'],
    ['20260928PW20601','吉林省','长春市','绿园吾悦广场店','CC012',10800,'13800001008','13800002008','微信小程序','13:29'],
    ['503503-2847995-083257','湖北省','武汉市','群星城店','WH009',7900,'13800001009','','美团秒提','13:27'],
    ['20260928PW20602','辽宁省','沈阳市','铁西万象汇店','SY004',16500,'13800001010','13800002010','微信小程序','13:27'],
    ['20260928PW18151','北京市','北京市','宣武门外大街店','BJ011',14300,'13800001011','13800001011','微信小程序','12:40']
  ].map(function(a,i){return{id:'legacy-'+a[0],number:a[0],province:a[1],city:a[2],store:a[3],storeCode:a[4],amount:a[5],buyerPhone:a[6],recipientPhone:a[7],channel:a[8],createdAt:'2026-09-28 '+a[9],completedAt:'2026-09-28 '+(i===10?'12:51':a[9]),scene:'堂食',paymentChannel:a[8]==='微信小程序'?'线上微信支付':'-',paymentCode:a[8]==='微信小程序'?'PM004':'-',original:i===10?20600:a[5],discount:i===10?6300:0,paid:a[5],returned:false,invoiced:i===10,applications:i===10?[{id:'178249288817',amount:14300,phone:'',status:'已完成',origin:'用户发起',invoiceType:'增值税电子普通发票',appliedAt:'2026-09-28 13:31'}]:[],fundingRecord:null};});
  var cities={SH001:['上海市','上海市'],SH002:['上海市','上海市'],HZ001:['浙江省','杭州市'],BJ001:['北京市','北京市'],BJ002:['北京市','北京市'],GZ001:['广东省','广州市']};
  // Synthetic order-invoicing outcomes; funding generation itself does not issue invoices.
  function fixtureInvoiceEvent(r){
    if(!r||r.demoOrder||r.orderIndex%3!==0)return null;
    return{id:'C'+r.order,createdAt:r.orderOccurred,amount:9000,status:'issued'};
  }
  function fixtureInvoiceRange(segment){
    if(segment.demoOrder)return{first:0,step:1,count:0};
    var first=(3-(segment.orderIndexOffset||0)%3)%3;
    return{first:first,step:3,count:segment.count>first?Math.ceil((segment.count-first)/3):0};
  }
  function invoiceEvent(r){return window.DemoPreissued?window.DemoPreissued.orderInvoiceEvent(r.order,r):fixtureInvoiceEvent(r);}
  function fromRecord(r){
    if(!r)return null;var store=D.getStore(r.store),parts=D.orderParts(r),platform=D.sum(parts,function(x){return Math.abs(x.amount);}),paid=9000,amount=paid+platform,region=cities[r.store]||['-','-'],event=invoiceEvent(r);
    return{id:r.id,number:r.order,province:region[0],city:region[1],store:store.name,storeCode:store.id,amount:amount,buyerPhone:'13800003000',recipientPhone:'13800003000',channel:'微信小程序',createdAt:r.orderOccurred,completedAt:r.orderOccurred,scene:'堂食',paymentChannel:'线上微信支付',paymentCode:'PM004',original:amount+1500,discount:1500,paid:paid,returned:r.kind==='refund',invoiced:!!event&&event.status==='issued',applications:event?[{id:event.id,amount:paid,phone:'',status:event.status==='issued'?'已完成':event.status==='failed'?'开票失败':'处理中',origin:'用户发起',invoiceType:'增值税电子普通发票',appliedAt:event.createdAt}]:[],fundingRecord:r};
  }
  function exampleOrder(sample,id){
    var o=Object.assign({},sample),P=window.DemoPreissued,event=P&&P.orderInvoiceEvent(o.number),consumer=event?event.status:'none';
    if(o.channel==='美团外卖')o.paymentCode='PM012';
    o.id=id||sample.id;o.fundingRecord=D.getRecord(o.id);
    o.applications=consumer==='none'?[]:[{id:event.id,amount:o.paid,phone:'',status:consumer==='issued'?'已完成':consumer==='failed'?'申请失败':'处理中',origin:'用户发起',invoiceType:'增值税普通发票',appliedAt:event.createdAt}];
    var states=o.fundingIds.map(function(fid){var a=P&&P.application(fid);return !a?'none':a.hasInvoice?'issued':a.applicationStatus;});if(o.paid>0)states.push(consumer);
    o.invoiceState=states.every(function(s){return s==='issued';})?'issued':states.some(function(s){return s==='issued';})?'partial':states.some(function(s){return s==='processing';})?'processing':states.some(function(s){return s==='failed';})?'failed':'unissued';
    o.invoiced=o.invoiceState==='issued';return o;
  }
  function invoiceState(o){return o.invoiceState||(o.invoiced?'issued':'unissued');}
  var cached=null;
  function list(){
    if(!cached){var unique=new Map(samples.map(function(o){return[o.number,o];}));
      (window.DemoOrderExamples?window.DemoOrderExamples.orders:[]).forEach(function(o){var item=exampleOrder(o);unique.set(item.number,item);});
      D.findSegments(D.TODAY,null,{kind:'positive'}).filter(function(x){return !x.segment.demoOrder;}).forEach(function(x){[0,12,26].forEach(function(i){if(i<x.segment.count){var o=fromRecord(D.record(x,i,D.TODAY));if(!unique.has(o.number))unique.set(o.number,o);}});});
      var refund=D.findSegments(D.TODAY,null,{kind:'refund'})[0];if(refund){var o=fromRecord(D.record(refund,0,D.TODAY));unique.set(o.number,o);}
      cached=Array.from(unique.values()).sort(function(a,b){return b.createdAt.localeCompare(a.createdAt);});
    }return cached;
  }
  function baseGet(id){var example=window.DemoOrderExamples&&window.DemoOrderExamples.orders.find(function(o){return o.fundingIds.includes(id);});if(example)return exampleOrder(example,id);var sample=samples.find(function(o){return o.id===id;});if(sample)return sample;return /^\d{4}-\d{2}-.+~\d+~\d+$/.test(id)?fromRecord(D.getRecord(id)):null;}
  function filter(q){return list().map(withReissues).filter(function(o){return(!q.order||o.number.includes(q.order))&&(!q.channel||o.channel===q.channel)&&(!q.store||(o.store+' '+o.storeCode).toLowerCase().includes(q.store.toLowerCase()))&&(!q.invoice||q.invoice===invoiceState(o))&&(!q.returned||(q.returned==='returned')===o.returned)&&(!q.phone||[o.buyerPhone,o.recipientPhone].some(function(v){return v.includes(q.phone);}))&&(!q.createdFrom||o.createdAt.slice(0,10)>=q.createdFrom)&&(!q.createdTo||o.createdAt.slice(0,10)<=q.createdTo);});}
  // Consumer reissues are stored separately; funding/preinvoice events remain untouched.
  function reissues(number){return (D.db.consumerReissues||{})[number]||[];}
  function withReissues(base){
    if(!base)return null;var rows=reissues(base.number);if(!rows.length)return base;
    var o=Object.assign({},base),apps=base.applications.concat(rows).map(function(a){return Object.assign({},a);});
    rows.forEach(function(r){var source=apps.find(function(a){return a.id===r.reissueOf;});if(source)source.status=r.status==='已完成'?'已换开':'换开中';});
    o.applications=apps;if(rows.some(function(a){return a.status==='处理中';})){o.invoiceState='processing';o.invoiced=false;}return o;
  }
  function get(id){return withReissues(baseGet(id));}
  // Backend reissue eligibility only checks invoice/order state, never consumer quota or expiry.
  function canReissue(o,a){return !!o&&!o.returned&&!!a&&a.status==='已完成'&&!o.applications.some(function(x){return x.status==='处理中'||x.status==='换开中';});}
  function startReissue(id,applicationId,values){
    var o=get(id),a=o&&o.applications.find(function(x){return x.id===applicationId;});
    if(!canReissue(o,a))throw new Error('该申请当前不可换开，请刷新后重试');
    var buyerType=values.buyerType==='personal'?'personal':'company',name=String(values.name||'').trim(),tax=String(values.tax||'').trim().toUpperCase(),email=String(values.email||'').trim();
    function invalid(message,field){var err=new Error(message);err.field=field;throw err;}
    if(!name)invalid('请填写购买方名称','name');
    if(buyerType==='company'&&!/^[A-Z0-9]{15,20}$/.test(tax))invalid('请填写 15–20 位字母或数字的购买方税号','tax');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))invalid('请填写有效的接收邮箱','email');
    var now=Date.now(),time=new Date(now),stamp=time.getFullYear()+'-'+String(time.getMonth()+1).padStart(2,'0')+'-'+String(time.getDate()).padStart(2,'0')+' '+String(time.getHours()).padStart(2,'0')+':'+String(time.getMinutes()).padStart(2,'0');
    var request={id:'HK'+now+'-'+reissues(o.number).length,amount:a.amount,phone:a.phone||'',status:'处理中',origin:'后台发起（换开）',countsTowardConsumerLimit:false,invoiceType:a.invoiceType,appliedAt:stamp,reissueOf:a.id,buyer:{type:buyerType,name:name,tax:buyerType==='company'?tax:'',address:buyerType==='company'?String(values.address||'').trim():'',phone:buyerType==='company'?String(values.phone||'').trim():'',bank:buyerType==='company'?String(values.bank||'').trim():'',bankAccount:buyerType==='company'?String(values.bankAccount||'').trim():''},email:email,orderId:id,readyAt:now+2200};
    if(!D.db.consumerReissues)D.db.consumerReissues={};if(!D.db.consumerReissues[o.number])D.db.consumerReissues[o.number]=[];
    D.db.consumerReissues[o.number].push(request);D.save();cached=null;return request;
  }
  function completeReissues(now){var changed=false;Object.values(D.db.consumerReissues||{}).forEach(function(rows){rows.forEach(function(a){if(a.status==='处理中'&&a.readyAt<=(now==null?Date.now():now)){a.status='已完成';a.completedAt=new Date(now==null?Date.now():now).toISOString();changed=true;}});});if(changed){D.save();cached=null;}return changed;}
  function hasPendingReissues(){return Object.values(D.db.consumerReissues||{}).some(function(rows){return rows.some(function(a){return a.status==='处理中';});});}
  window.DemoOrderData={canReissue:canReissue,startReissue:startReissue,completeReissues:completeReissues,hasPendingReissues:hasPendingReissues,invoiceState:invoiceState,fixtureInvoiceRange:fixtureInvoiceRange,fixtureInvoiceEvent:fixtureInvoiceEvent,invoiceEvent:invoiceEvent,invalidate:function(){cached=null;},list:list,get:get,filter:filter,fromRecord:fromRecord,defaultDate:'2026-09-28',channels:['newPOS','微信小程序','支付宝小程序','抖音','美团秒提','美团外卖']};
})();
