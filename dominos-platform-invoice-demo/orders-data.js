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
    if(!r||r.orderIndex%3!==0)return null;
    return{id:'C'+r.order,createdAt:r.orderOccurred,amount:9000,status:'issued'};
  }
  function fixtureInvoiceRange(segment){
    var first=(3-(segment.orderIndexOffset||0)%3)%3;
    return{first:first,step:3,count:segment.count>first?Math.ceil((segment.count-first)/3):0};
  }
  function invoiceEvent(r){return window.DemoPreissued?window.DemoPreissued.orderInvoiceEvent(r.order,r):fixtureInvoiceEvent(r);}
  function fromRecord(r){
    if(!r)return null;var store=D.getStore(r.store),parts=D.orderParts(r),platform=D.sum(parts,function(x){return Math.abs(x.amount);}),paid=9000,amount=paid+platform,region=cities[r.store]||['-','-'],event=invoiceEvent(r);
    return{id:r.id,number:r.order,province:region[0],city:region[1],store:store.name,storeCode:store.id,amount:amount,buyerPhone:'13800003000',recipientPhone:'13800003000',channel:'微信小程序',createdAt:r.orderOccurred,completedAt:r.orderOccurred,scene:'堂食',paymentChannel:'线上微信支付',paymentCode:'PM004',original:amount+1500,discount:1500,paid:paid,returned:r.kind==='refund',invoiced:!!event&&event.status==='issued',applications:event?[{id:event.id,amount:paid,phone:'',status:event.status==='issued'?'已完成':event.status==='failed'?'开票失败':'处理中',origin:'用户发起',invoiceType:'增值税电子普通发票',appliedAt:event.createdAt}]:[],fundingRecord:r};
  }
  var cached=null;
  function list(){
    if(!cached){var unique=new Map(samples.map(function(o){return[o.number,o];}));
      D.findSegments(D.TODAY,null,{kind:'positive'}).forEach(function(x){[0,12,26].forEach(function(i){if(i<x.segment.count){var o=fromRecord(D.record(x,i,D.TODAY));if(!unique.has(o.number))unique.set(o.number,o);}});});
      var refund=D.findSegments(D.TODAY,null,{kind:'refund'})[0];if(refund){var o=fromRecord(D.record(refund,0,D.TODAY));unique.set(o.number,o);}
      cached=Array.from(unique.values()).sort(function(a,b){return b.createdAt.localeCompare(a.createdAt);});
    }return cached;
  }
  function get(id){var sample=samples.find(function(o){return o.id===id;});if(sample)return sample;return /^\d{4}-\d{2}-.+~\d+~\d+$/.test(id)?fromRecord(D.getRecord(id)):null;}
  function filter(q){return list().filter(function(o){return(!q.order||o.number.includes(q.order))&&(!q.channel||o.channel===q.channel)&&(!q.store||(o.store+' '+o.storeCode).toLowerCase().includes(q.store.toLowerCase()))&&(!q.invoice||(q.invoice==='issued')===o.invoiced)&&(!q.returned||(q.returned==='returned')===o.returned)&&(!q.phone||[o.buyerPhone,o.recipientPhone].some(function(v){return v.includes(q.phone);}))&&(!q.createdFrom||o.createdAt.slice(0,10)>=q.createdFrom)&&(!q.createdTo||o.createdAt.slice(0,10)<=q.createdTo);});}
  window.DemoOrderData={fixtureInvoiceRange:fixtureInvoiceRange,fixtureInvoiceEvent:fixtureInvoiceEvent,invoiceEvent:invoiceEvent,invalidate:function(){cached=null;},list:list,get:get,filter:filter,fromRecord:fromRecord,defaultDate:'2026-09-28',channels:['newPOS','微信小程序','抖音','美团秒提']};
})();
