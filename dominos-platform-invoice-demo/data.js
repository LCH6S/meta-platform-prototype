(function () {
  'use strict';
  var KEY='dominos-tob-demo-v1', TODAY='2026-09', previous='2026-08';
  var taxCatalog=window.DemoTaxCatalog||{entries:[],rates:[]};
  var taxCodeIndex=new Map(taxCatalog.entries.map(function(row){return[row[0],{code:row[0],shortName:row[1],sourceRow:row[2]}];}));
  function lookupTaxCode(code){return taxCodeIndex.get(String(code||'').trim())||null;}
  function legacyTaxCode(item){return item==='餐饮服务'?'3070401000000000000':item==='信息技术服务'?'3040200000000000000':'';}
  // item is the invoice item name; taxShortName is the catalog classification label.
  function invoiceItemLabel(config){
    var name=String(config.item||'').trim(),shortName=String(config.taxShortName||'').trim();
    return shortName&&name?'*'+shortName+'*'+name:name||shortName||'—';
  }
  function invoiceRecipients(record){
    return Array.from(new Set((Array.isArray(record.recipients)?record.recipients:record.recipient?[record.recipient]:[]).map(function(email){return String(email).trim();}).filter(Boolean)));
  }
  function composeInvoiceRemark(manual,options,buyer,seller){
    var groups=[['buyerContact','购买方地址、电话',[buyer.address,buyer.phone]],['buyerBank','购买方银行账户、开户银行',[buyer.bankAccount,buyer.bank]],['sellerContact','销售方地址、电话',[seller.address,seller.phone]],['sellerBank','销售方银行账户、开户银行',[seller.bankAccount,seller.bank]]];
    return [String(manual||'')].concat(groups.filter(function(g){return(options||[]).includes(g[0]);}).map(function(g){var values=g[2].filter(Boolean);return values.length?g[1]+'：'+values.join('，'):'';})).filter(Boolean).join('\n');
  }
  function fillTaxSnapshot(target,base){
    var code=target.taxCode||base&&base.taxCode||legacyTaxCode(target.item),entry=lookupTaxCode(code);
    if(target.item==null)target.item=base&&base.item||'';
    if(target.taxCode==null)target.taxCode=code;
    if(target.taxShortName==null)target.taxShortName=entry?entry.shortName:target.item||'';
    if(target.taxRate==null)target.taxRate=base&&base.taxRate!=null?base.taxRate:6;
  }
  var sellers=[
    {id:'sh',name:'华东餐饮经营有限公司',tax:'91310000DEMO00001A'},
    {id:'bj',name:'华北餐饮经营有限公司',tax:'91110000DEMO00002B'},
    {id:'gz',name:'华南餐饮经营有限公司',tax:'91440000DEMO00003C'},
    {id:'it',name:'餐饮数字科技有限公司',tax:'91310000DEMO00004D'}
  ];
  var stores=[
    {id:'SH001',name:'上海徐家汇店',region:'华东',seller:'sh'},
    {id:'SH002',name:'上海五角场店',region:'华东',seller:'sh'},
    {id:'HZ001',name:'杭州武林店',region:'华东',seller:'sh'},
    {id:'BJ001',name:'北京西直门店',region:'华北',seller:'bj'},
    {id:'BJ002',name:'北京国贸店',region:'华北',seller:'bj'},
    {id:'GZ001',name:'广州天河店',region:'华南',seller:'gz'}
  ];
  var sources=[
    {code:'ALI001',name:'支付宝银行券',type:'银行优惠'},
    {code:'ALI002',name:'支付宝支付立减',type:'支付优惠'},
    {code:'ALI003',name:'支付宝联合活动补贴',type:'平台补贴'},
    {code:'MT001',name:'美团平台满减',type:'平台满减'},
    {code:'MT002',name:'美团配送补贴',type:'配送补贴'},
    {code:'UP001',name:'云闪付银行券',type:'银行优惠'},
    {code:'DY001',name:'抖音团购券',type:'商品券'},
    {code:'BK001',name:'联名卡专享优惠',type:'银行优惠'},
    {code:'ALI099',name:'支付宝新客优惠',type:'支付优惠'}
  ];
  // Business explanations for the existing demo recognition catalog; identifiers stay unchanged.
  var fundingItemDescriptions={
    '支付宝银行券':'订单使用支付宝相关银行券时，按达美乐提供的券信息识别的合作方出资部分，不包含用户购券实付金额。',
    '支付宝支付立减':'订单通过支付宝支付时，由平台承担的支付立减金额，不包含商家自行承担的优惠。',
    '支付宝联合活动补贴':'订单参与支付宝联合活动时，按达美乐提供的活动数据识别的合作方出资金额。',
    '美团平台满减':'美团订单满减活动中由平台承担的金额，不包含同一活动中商家承担的优惠。',
    '美团配送补贴':'美团订单配送费优惠中由平台承担的金额，不包含商家承担的配送优惠。',
    '云闪付银行券':'订单使用云闪付相关银行券时，按达美乐提供的券信息识别的合作方出资部分。',
    '抖音团购券':'订单核销抖音商品券时，按达美乐提供的券数据识别的平台补贴，不包含用户购券实付金额。',
    '联名卡专享优惠':'订单使用联名卡合作优惠时，由合作方承担的出资金额，不包含商家自行承担的优惠。',
    '支付宝新客优惠':'订单享受支付宝新客优惠时，由平台承担的优惠金额。',
    '美团门店满减券':'订单使用美团门店满减券时，按达美乐提供的优惠数据识别的平台出资部分。',
    '美团品牌活动券':'订单使用美团品牌活动券时，按达美乐提供的优惠数据识别的平台出资部分。'
  };
  function fundingItems(){return sources.map(function(s){return{code:s.code,name:s.name,description:s.description||fundingItemDescriptions[s.name]||'暂无描述'};});}
  function buyer(id,name,tax){return{id:id,name:name,tax:tax,email:'invoice@'+id+'.example',bank:'',bankAccount:'',phone:'',address:''};}
  var partners=[
    {id:'ali',name:'支付宝',code:'KH001',alias:'支付宝',category:'支付平台',remark:'',buyers:[buyer('ali-a','支付宝合作结算主体 A','91330000DEMO00001A'),buyer('ali-b','支付宝合作结算主体 B','91330000DEMO00002B')]},
    {id:'mt',name:'美团',code:'KH002',alias:'美团',category:'外卖平台',remark:'',buyers:[buyer('mt-a','美团合作结算主体','91110000DEMO00003C')]},
    {id:'up',name:'银联',code:'KH003',alias:'云闪付',category:'支付平台',remark:'',buyers:[buyer('up-a','银联合作结算主体','91310000DEMO00004D')]},
    {id:'dy',name:'抖音',code:'KH004',alias:'抖音生活服务',category:'内容平台',remark:'',buyers:[buyer('dy-a','抖音合作结算主体','91110000DEMO00005E')]},
    {id:'bank',name:'招商银行',code:'KH005',alias:'招行',category:'银行',remark:'',buyers:[buyer('bank-a','联名活动合作结算主体','91440000DEMO00006F')]}
  ];
  function policy(id,name,source,mode,seller,item){return{id:id,name:name,sources:[source],sellerMode:mode,sellerId:seller||'',item:item||'餐饮服务'};}
  var projects=[
    {id:'p1',code:'HZ2026001',name:'支付宝优惠合作',partner:'ali',buyer:'ali-a',invoiceType:'增值税专用发票',cycle:'自然月',remark:'',policies:[policy('a1','银行券补贴','ALI001','order'),policy('a2','支付立减合作','ALI002','fixed','it','信息技术服务')]},
    {id:'p2',code:'HZ2026002',name:'支付宝联合活动合作',partner:'ali',buyer:'ali-b',invoiceType:'增值税普通发票',cycle:'自然月',remark:'',policies:[policy('b1','联合活动补贴','ALI003','order')]},
    {id:'p3',code:'HZ2026003',name:'美团平台营销补贴',partner:'mt',buyer:'mt-a',invoiceType:'增值税专用发票',cycle:'自然月',remark:'',policies:[policy('m1','平台满减补贴','MT001','order'),policy('m2','配送费用补贴','MT002','order')]},
    {id:'p4',code:'HZ2026004',name:'云闪付银行券合作',partner:'up',buyer:'up-a',invoiceType:'增值税专用发票',cycle:'自然月',remark:'',policies:[policy('u1','银行券活动','UP001','order')]},
    {id:'p5',code:'HZ2026005',name:'抖音团购券补贴',partner:'dy',buyer:'dy-a',invoiceType:'增值税普通发票',cycle:'自然月',remark:'',policies:[policy('d1','团购券活动','DY001','order')]},
    {id:'p6',code:'HZ2026006',name:'联名卡专享优惠合作',partner:'bank',buyer:'bank-a',invoiceType:'增值税专用发票',cycle:'自然月',remark:'',policies:[policy('k1','联名卡优惠','BK001','fixed','sh')]}
  ];
  var seed={partners:partners,projects:projects,months:{},exports:[],categories:['支付平台','外卖平台','内容平台','银行'],smallRetried:false};
  var db;
  try{if(new URLSearchParams(location.search).get('reset')==='1')localStorage.removeItem(KEY);db=JSON.parse(localStorage.getItem(KEY))||seed;}catch(e){db=seed;}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(db));}catch(e){}}
  function prevMonth(m){var a=m.split('-').map(Number);return new Date(Date.UTC(a[0],a[1]-2,1)).toISOString().slice(0,7);}
  function nextMonth(m){var a=m.split('-').map(Number);return new Date(Date.UTC(a[0],a[1],1)).toISOString().slice(0,7);}
  function sum(a,fn){return a.reduce(function(v,x){return v+fn(x);},0);}
  function getProject(id){return db.projects.find(function(p){return p.id===id;});}
  function getPartner(id){return db.partners.find(function(p){return p.id===id;});}
  function getBuyer(p){var partner=getPartner(p.partner);return partner&&partner.buyers.find(function(b){return b.id===p.buyer;})||{name:'未设置',tax:'-',email:''};}
  function invoiceDefaults(b){
    var p=getProject(b.project),snapshot=clone(b.buyerSnapshot||getBuyer(p)),partner=getPartner(b.partner||p.partner),current=partner&&partner.buyers.find(function(x){return snapshot.tax&&snapshot.tax!=='-'?x.tax===snapshot.tax:x.id===snapshot.id;});
    var buyer=clone(snapshot);if(current)['address','phone','bank','bankAccount'].forEach(function(k){buyer[k]=current[k]||'';});
    var source=current||snapshot,remarkOptions=[];
    return{buyer:buyer,remarkOptions:remarkOptions.slice(),invoiceType:source.defaultType||b.invoiceType||p.invoiceType};
  }
  function getSeller(id){return sellers.find(function(s){return s.id===id;});}
  function getStore(id){return stores.find(function(s){return s.id===id;});}
  function getPolicy(p,id){return p.policies.find(function(x){return x.id===id;});}
  function policySellerId(policy,storeId){return policy.sellerMode==='fixed'?policy.sellerId:(getStore(storeId)||{}).seller||'';}
  function matchingPolicies(source){var matched=[];db.projects.forEach(function(p){p.policies.forEach(function(pol){if(pol.sources.includes(source))matched.push({p:p,pol:pol});});});return matched;}
  function clone(x){return JSON.parse(JSON.stringify(x));}
  function settlementNet(b){return sum(b.segments,function(s){return s.count*s.cents;});}
  function activeInvoice(b){return b.invoices.find(function(i){return i.amount>0&&!i.reversedBy;});}
  function issuedAmount(b){var inv=activeInvoice(b);return inv?inv.amount:0;}
  function normalizeBill(b){
    if(b.modelVersion===2)return b;
    fillTaxSnapshot(b);
    b.adjustments=b.adjustments||[];b.applications=b.applications||[];
    var net=settlementNet(b),oldIssued=b.issued||0;
    b.invoiceAmount=b.invoiceAmount==null?net:b.invoiceAmount;
    if(b.status==='partial'){
      b.status=oldIssued?'issued':'failed';b.invoiceAmount=oldIssued||net;
      if(oldIssued&&oldIssued!==net)b.adjustments.push({from:net,to:oldIssued,reason:'历史演示数据迁移：保留已开金额',date:'2026-09-29 09:00',operator:'系统迁移'});
    }
    var positives=b.invoices.filter(function(i){return i.amount>0;});
    if(positives.length>1&&!b.invoices.some(function(i){return i.amount<0;})){
      b.legacyInvoiceRecords=clone(b.invoices);var kept=clone(positives[0]);kept.amount=oldIssued;
      b.invoices=[kept];b.invoiceAmount=oldIssued;
    }
    b.invoices.forEach(function(inv,ix){
      inv.tone=inv.amount<0?'red':'blue';inv.buyer=inv.buyer||clone(b.buyerSnapshot||getBuyer(getProject(b.project)));inv.seller=inv.seller||clone(getSeller(b.seller));
      inv.item=inv.item||b.item;inv.invoiceType=inv.invoiceType||b.invoiceType;inv.taxRate=inv.taxRate==null?b.taxRate:inv.taxRate;inv.remark=inv.remark||'';
      fillTaxSnapshot(inv,b);
      inv.applicationId=inv.applicationId||'SQ'+b.id.replace(/-/g,'').toUpperCase()+'-'+(ix+1);
      if(!b.applications.some(function(a){return a.id===inv.applicationId;}))b.applications.push({id:inv.applicationId,type:inv.tone,amount:inv.amount,status:'issued',createdAt:inv.date,invoiceId:inv.id,remark:inv.remark,buyer:clone(inv.buyer),seller:clone(inv.seller),item:inv.item,invoiceType:inv.invoiceType,taxRate:inv.taxRate,recipient:inv.recipient||b.recipient});
    });
    if(b.status==='failed'&&!b.applications.length)b.applications.push({id:'SQ'+b.id.replace(/-/g,'').toUpperCase()+'-1',type:'blue',amount:b.invoiceAmount,status:'failed',createdAt:nextMonth(b.month)+'-20 10:30',buyer:clone(b.buyerSnapshot),seller:clone(getSeller(b.seller)),item:b.item,invoiceType:b.invoiceType,taxRate:b.taxRate,remark:'',recipient:b.recipient});
    if(b.status==='processing'&&!b.activeRequest){
      var pending={id:'SQ'+b.id.replace(/-/g,'').toUpperCase()+'-'+(b.applications.length+1),type:'blue',amount:b.invoiceAmount,status:'processing',createdAt:b.appliedAt||nextMonth(b.month)+'-20 10:30',buyer:clone(b.buyerSnapshot),seller:clone(getSeller(b.seller)),item:b.item,invoiceType:b.invoiceType,taxRate:b.taxRate,remark:b.invoiceRemark||'',recipient:b.recipient};
      if(b.invoices.length){b.legacyInvoiceRecords=clone(b.invoices);b.invoices=[];b.applications=[];}b.applications.push(pending);b.activeRequest=pending.id;
    }
    b.applications.forEach(function(a){fillTaxSnapshot(a,b);});
    b.issued=issuedAmount(b);b.modelVersion=2;return b;
  }
  function migrateCustomers(){
    if(db.customerModelVersion===2)return;
    db.partners.slice().forEach(function(partner){
      var buyers=partner.buyers||[];
      buyers.slice(1).forEach(function(buyer,index){
        var id=partner.id+'-'+buyer.id;
        if(!getPartner(id)){var other=clone(partner);other.id=id;other.name=buyer.name;other.code=partner.code+'-'+(index+2);other.buyers=[clone(buyer)];db.partners.push(other);}
        db.projects.filter(function(p){return p.partner===partner.id&&p.buyer===buyer.id;}).forEach(function(p){p.orderPartner=p.orderPartner||p.partner;p.partner=id;});
      });
      partner.buyers=buyers.slice(0,1);
    });
    db.customerModelVersion=2;
  }
  migrateCustomers();Object.values(db.months).forEach(function(m){m.bills.forEach(normalizeBill);});save();
  function normalizeCustomerFields(){
    if(!db.customerCategories)db.customerCategories=db.categories.map(function(name,i){return{id:'cat'+(i+1),name:name,code:'FL'+String(i+1).padStart(3,'0'),remark:'',createdAt:'2026-07-01 10:00:00'};});
    db.partners.forEach(function(p,i){
      p.customerId=p.customerId||String(1682477327500+i);p.createdAt=p.createdAt||'2026-07-01 10:'+String(i).padStart(2,'0')+':00';
      if(p.remark1==null)p.remark1=p.remark||'';if(p.remark2==null)p.remark2='';
      p.buyers.forEach(function(b){if(!b.emails)b.emails=b.email?[b.email]:[];b.defaultType=b.defaultType||'增值税普通发票';b.remarkOptions=b.remarkOptions||[];});
    });save();
  }
  normalizeCustomerFields();
  function migrateTaxpayerRouting(){
    if(db.taxpayerRoutingVersion===1)return;
    db.legacyStoreRouting=db.projects.map(function(p){return{project:p.id,policies:clone(p.policies)};});
    var remap=false;
    db.projects.forEach(function(p){
      if(p.id==='p1'&&p.name==='支付宝华东优惠合作')p.name='支付宝优惠合作';
      if(p.id==='p2'&&p.name==='支付宝华北优惠合作')p.name='支付宝联合活动合作';
      p.policies.forEach(function(pol){
        if(p.id==='p2'&&pol.id==='b1'&&pol.sources.length===1&&pol.sources[0]==='ALI001'){
          pol.sources=['ALI003'];if(pol.name==='银行券补贴')pol.name='联合活动补贴';remap=true;
        }
        delete pol.stores;delete pol.storeScope;
      });
    });
    if(remap)Object.values(db.months).forEach(function(m){m.bills.filter(function(b){return b.project==='p2';}).forEach(function(b){
      b.segments.forEach(function(s){if(s.policy==='b1'&&s.source==='ALI001'){s.legacyDemoSource=s.source;s.source='ALI003';}});
    });});
    db.taxpayerRoutingVersion=1;save();
  }
  migrateTaxpayerRouting();
  function migrateTaxConfiguration(){
    db.projects.forEach(function(p){
      if(p.remark&&!p.legacyProjectRemark)p.legacyProjectRemark=p.remark;
      delete p.remark;
      p.policies.forEach(function(pol){fillTaxSnapshot(pol);});
    });
    Object.values(db.months).forEach(function(m){m.bills.forEach(function(b){
      fillTaxSnapshot(b);
      (b.policySnapshot||[]).forEach(function(pol){fillTaxSnapshot(pol);});
      b.invoices.forEach(function(inv){fillTaxSnapshot(inv,b);});
      (b.applications||[]).forEach(function(a){fillTaxSnapshot(a,b);});
    });});save();
  }
  migrateTaxConfiguration();
  function normalizeRefundMonth(model){
    if(model.refundModelVersion===2)return model;
    // Fold the former September carry-forward fixture into September once.
    if(model.id===TODAY){
      var target=model.bills.find(function(b){return b.project==='p1'&&b.segments.some(function(s){return s.kind==='positive'&&s.policy==='a1'&&s.store==='SH001';});});
      if(target&&!target.segments.some(function(s){return s.refundBatch==='sep27';})){
        var oldNet=settlementNet(target);
        target.segments.push({policy:'a1',store:'SH001',source:'ALI001',count:233,cents:-800,kind:'refund',refundBatch:'sep27',originalMonth:TODAY,orderIndexOffset:1000,refundDay:27});
        if(target.invoiceAmount===oldNet)target.invoiceAmount=settlementNet(target);
      }
    }
    delete model.pendingRefund;model.refundModelVersion=2;return model;
  }
  Object.values(db.months).forEach(normalizeRefundMonth);save();
  function settlementGroupKey(m,p,seller,pol,buyer){
    return JSON.stringify([p.id,m,seller,buyer.tax||buyer.id||'',p.invoiceType,pol.item,pol.taxCode,pol.taxRate]);
  }
  function groupedSettlement(groups,m,p,seller,pol,allocateId){
    var buyer=getBuyer(p),key=settlementGroupKey(m,p,seller,pol,buyer);
    if(!groups[key])groups[key]={id:allocateId(),month:m,project:p.id,seller:seller,item:pol.item,taxCode:pol.taxCode,taxShortName:pol.taxShortName,taxRate:pol.taxRate,segments:[],status:'ready',issued:0,invoices:[],attempts:0,recipient:buyer.email,buyerSnapshot:clone(buyer),invoiceType:p.invoiceType,policySnapshot:clone(p.policies)};
    return groups[key];
  }
  function appendGroupingExample(model){
    var fixture=db.groupingExample;
    if(!fixture||model.id!==fixture.month||!fixture.pendingBills)return model;
    fixture.pendingBills.forEach(function(b){if(!model.bills.some(function(x){return x.id===b.id;}))model.bills.push(b);});
    delete fixture.pendingBills;save();return model;
  }
  function ensureGroupingExample(){
    if(db.groupingExample){
      (db.groupingExample.sources||[]).forEach(function(source){if(!sources.some(function(x){return x.code===source.code;}))sources.push(clone(source));});
      if(db.months[db.groupingExample.month])appendGroupingExample(db.months[db.groupingExample.month]);
      return;
    }
    var partner=getPartner('mt');if(!partner||!partner.buyers.length)return;
    var seq=7;while(getProject('p'+seq)||db.projects.some(function(p){return p.code==='HZ2026'+String(seq).padStart(3,'0');}))seq++;
    var used=new Set(sources.map(function(s){return s.code;}));db.projects.forEach(function(p){p.policies.forEach(function(pol){pol.sources.forEach(function(code){used.add(code);});});});
    var nextCode=101,exampleSources=['美团门店满减券','美团品牌活动券'].map(function(name){while(used.has('MT'+nextCode))nextCode++;var code='MT'+nextCode++;used.add(code);return{code:code,name:name,type:'平台补贴'};});
    exampleSources.forEach(function(source){sources.push(source);});
    var pid='p'+seq,p={id:pid,code:'HZ2026'+String(seq).padStart(3,'0'),name:'美团联合优惠合作',partner:partner.id,buyer:partner.buyers[0].id,invoiceType:'增值税专用发票',cycle:'自然月',orderPartner:'mtjoint'+seq,demoCreated:true,demoFixture:'settlement-grouping-v1',policies:[]};
    p.policies=[{id:pid+'-store',name:'门店满减补贴',sources:[exampleSources[0].code],sellerMode:'order',sellerId:'',item:'餐费',taxCode:'3070401000000000000',taxRate:6},{id:pid+'-brand',name:'品牌活动补贴',sources:[exampleSources[1].code],sellerMode:'fixed',sellerId:'sh',item:'餐费',taxCode:'3070401000000000000',taxRate:6}];
    p.policies.forEach(function(pol){fillTaxSnapshot(pol);});db.projects.push(p);
    var counts={SH001:[10,1],SH002:[20,2],HZ001:[10,0],BJ001:[15,1],BJ002:[5,0],GZ001:[10,1]},groups={},index=1;
    p.policies.forEach(function(pol,qi){stores.forEach(function(store){
      var countsForStore=counts[store.id];if(!countsForStore)return;
      var b=groupedSettlement(groups,previous,p,policySellerId(pol,store.id),pol,function(){return previous+'-'+pid+'-'+index++;}),cents=qi?500:1000;
      b.segments.push({policy:pol.id,store:store.id,source:pol.sources[0],count:countsForStore[0],cents:cents,kind:'positive'});
      if(countsForStore[1])b.segments.push({policy:pol.id,store:store.id,source:pol.sources[0],count:countsForStore[1],cents:-cents,kind:'refund'});
    });});
    var bills=Object.values(groups).map(normalizeBill);
    db.groupingExample={version:1,projectId:pid,month:previous,sources:clone(exampleSources),billIds:bills.map(function(b){return b.id;}),pendingBills:bills};
    if(db.months[previous])appendGroupingExample(db.months[previous]);save();
  }
  ensureGroupingExample();
  function month(m){
    if(db.months[m])return appendGroupingExample(normalizeRefundMonth(db.months[m]));
    var future=m>TODAY, current=m===TODAY, n=Number(m.slice(-2)), year=Number(m.slice(0,4));
    var bills=[],nextIndex=1;
    if(!future)db.projects.forEach(function(p,pi){
      if(p.demoCreated)return;
      var groups={};
      p.policies.forEach(function(pol,qi){
        stores.filter(function(store){return !store.demoOnly;}).forEach(function(store,si){
          var sid=store.id,seller=policySellerId(pol,sid);
          var b=groupedSettlement(groups,m,p,seller,pol,function(){return m+'-'+p.id+'-'+(nextIndex++);});
          var count=(1050+pi*185+qi*90+si*31+n*17)*4;
          if(current)count=Math.round(count*.89);
          if(year===2025)count=Math.round(count*.78);
          var cents=([800,500,1200,600,1000][(pi+qi+si)%5]);
          b.segments.push({policy:pol.id,store:sid,source:pol.sources[0],count:count,cents:cents,kind:'positive'});
          b.segments.push({policy:pol.id,store:sid,source:pol.sources[0],count:Math.round(count*.009),cents:-cents,kind:'refund'});
        });
      });
      Object.values(groups).forEach(function(b){
        var ix=bills.length;
        b.status=current?'collecting':m<previous?'issued':['issued','ready','issued','failed','ready','issued','ready','ready','issued','issued','ready','issued','ready'][ix%13];
        var net=sum(b.segments,function(s){return s.count*s.cents;});
        b.issued=b.status==='issued'?net:0;
        if(b.issued>0)b.invoices.push({id:'FP'+m.replace('-','')+String(ix+1).padStart(5,'0'),amount:b.issued,date:nextMonth(m)+'-20 10:30',recipient:b.recipient,sent:false,taxCode:b.taxCode,taxShortName:b.taxShortName,taxRate:b.taxRate});
        bills.push(normalizeBill(b));
      });
    });
    var unmatched=(m===TODAY||m===previous)?{count:m===TODAY?36:12,cents:500,store:'SH001',source:'ALI099'}:null;
    var model=normalizeRefundMonth({id:m,bills:bills,unmatched:unmatched,future:future,current:current});
    db.months[m]=model;appendGroupingExample(model);save();return model;
  }
  function bill(id){var m=id.slice(0,7);return month(m).bills.find(function(b){return b.id===id;});}
  function totals(bills){
    var positive=0,negative=0,count=0,issued=0,expected=0,processing=0,failed=0,readyCount=0,done=0,billCount=0;
    var projects=new Set();
    bills.forEach(function(b){
      b.segments.forEach(function(s){if(s.cents>0)positive+=s.cents*s.count;else negative+=s.cents*s.count;count+=s.count;if(s.count)projects.add(b.project);});
      // Current-month groups are funding accumulations, not generated settlements.
      if(b.month>=TODAY)return;
      billCount++;issued+=issuedAmount(b);expected+=b.invoiceAmount==null?settlementNet(b):b.invoiceAmount;
      if(b.status==='processing'||b.status==='reversing')processing++;
      if(b.status==='failed'||b.status==='reverse_failed')failed++;
      if(b.status==='ready'||b.status==='revoked')readyCount++;
      if(b.status==='issued'&&activeInvoice(b))done++;
    });
    var net=positive+negative;
    return{positive:positive,negative:negative,net:net,count:count,issued:issued,expected:expected,adjustment:billCount?expected-net:0,unissued:expected-issued,progress:billCount>0?Math.round(done/billCount*100):null,failed:failed,processing:processing,readyCount:readyCount,done:done,billCount:billCount,pendingCount:billCount-done,projectCount:projects.size};
  }
  function monthTotal(m){return totals(month(m).bills);}
  function projectBills(m,p){return month(m).bills.filter(function(b){return b.project===p;});}
  // The existing Demo exposes 2025 and 2026. Enumerate that history independently of visited pages.
  function historyMonths(){
    var months=new Set(Object.keys(db.months).filter(function(m){return /^\d{4}-\d{2}$/.test(m)&&m<TODAY;}));
    for(var m='2025-01';m<TODAY;m=nextMonth(m))months.add(m);
    return Array.from(months).sort();
  }
  function projectHistory(pid){
    return historyMonths().flatMap(function(m){return month(m).bills.filter(function(b){return b.month<TODAY&&(!pid||b.project===pid);});}).sort(function(a,b){return b.month.localeCompare(a.month)||a.id.localeCompare(b.id);});
  }
  function monthProjects(m){var ids=new Set(month(m).bills.filter(function(b){return b.segments.some(function(s){return s.count>0;});}).map(function(b){return b.project;}));return db.projects.filter(function(p){return ids.has(p.id);});}
  function policySummaries(bills){
    var groups={};
    bills.forEach(function(b){b.segments.forEach(function(s){
      var pol=(b.policySnapshot||[]).find(function(p){return p.id===s.policy;});
      var g=groups[s.policy]||(groups[s.policy]={id:s.policy,name:pol?pol.name:'历史政策',positive:0,negative:0,count:0,sources:new Set(),configs:new Map()});
      g[s.cents>0?'positive':'negative']+=s.cents*s.count;g.count+=s.count;
      (s.legacyDemoSource?[s.source]:pol&&pol.sources||[s.source]).forEach(function(code){g.sources.add(code);});
      var config={sellerMode:pol?pol.sellerMode:null,sellerId:pol?pol.sellerId:null,item:b.item,taxCode:b.taxCode,taxShortName:b.taxShortName||b.item,taxRate:b.taxRate};
      g.configs.set(JSON.stringify(config),config);
    });});
    return Object.values(groups).map(function(g){g.net=g.positive+g.negative;g.sources=Array.from(g.sources);g.configs=Array.from(g.configs.values());return g;});
  }
  function findSegments(m,p,filters){
    var arr=[];
    if(p==='unassigned'){var u=month(m).unmatched;if(u)arr.push({bill:null,segment:{policy:'unassigned',store:u.store,source:u.source,count:u.count,cents:u.cents,kind:'positive'},si:0,project:'unassigned'});}
    else month(m).bills.filter(function(b){return !p||b.project===p;}).forEach(function(b){b.segments.forEach(function(s,si){arr.push({bill:b,segment:s,si:si,project:b.project});});});
    filters=filters||{};
    return arr.filter(function(x){var s=x.segment;return(!filters.policy||s.policy===filters.policy)&&(!filters.store||s.store===filters.store)&&(!filters.kind||s.kind===filters.kind)&&(!filters.bill||x.bill&&x.bill.id===filters.bill);});
  }
  function record(x,index,m){
    var s=x.segment,b=x.bill,p=getProject(x.project),orderIndex=index+(s.orderIndexOffset||0),isRefund=s.kind==='refund';
    var when=isRefund?(s.originalMonth||[m,prevMonth(m),prevMonth(prevMonth(m))][index%3]):m;
    var order='DM'+when.replace('-','')+(p?(p.orderPartner||p.partner).toUpperCase():'ALI')+(s.source==='ALI099'?'NEW':'')+s.store+String(orderIndex+1).padStart(6,'0');
    if(s.orderPrefix)order=s.orderPrefix+String(orderIndex+1).padStart(6,'0');
    var orderDay=1+orderIndex%27,orderOccurred=when+'-'+String(orderDay).padStart(2,'0')+' 12:'+String(orderIndex%60).padStart(2,'0');
    if(s.orderOccurred)orderOccurred=s.orderOccurred;
    var refundOccurred=isRefund?m+'-'+String(s.refundDay||Math.max(orderDay,15+index%13)).padStart(2,'0')+' 15:'+String(index%60).padStart(2,'0'):null;
    return{demoOrder:!!s.demoOrder,id:(b?b.id:m+'-unassigned')+'~'+x.si+'~'+index,order:order,month:m,occurred:refundOccurred||orderOccurred,orderOccurred:orderOccurred,refundOccurred:refundOccurred,store:s.store,source:s.source,policy:s.policy,project:x.project,seller:b?b.seller:'',item:b?b.item:'',amount:s.cents,kind:s.kind,bill:b?b.id:null,index:index,orderIndex:orderIndex};
  }
  function records(m,p,filters,page,size){
    var segs=findSegments(m,p,filters),total=sum(segs,function(x){return x.segment.count;}),start=(page-1)*size,end=start+size,offset=0,rows=[];
    segs.forEach(function(x){var c=x.segment.count,lo=Math.max(0,start-offset),hi=Math.min(c,end-offset);for(var i=lo;i<hi;i++)rows.push(record(x,i,m));offset+=c;});
    return{rows:rows,total:total,amount:sum(segs,function(x){return x.segment.count*x.segment.cents;})};
  }
  function getRecord(id){
    var a=id.split('~'),bid=a[0],m=bid.slice(0,7),b=bill(bid);
    if(!b){var u=month(m).unmatched;if(!u)return null;return record({bill:null,segment:{policy:'unassigned',store:u.store,source:u.source,count:u.count,cents:u.cents,kind:'positive'},si:0,project:'unassigned'},Number(a[2]),m);}
    var si=Number(a[1]);return b.segments[si]?record({bill:b,segment:b.segments[si],si:si,project:b.project},Number(a[2]),m):null;
  }
  function orderParts(r){
    if(r.project==='unassigned')return[r];
    var p=getProject(r.project),rows=[];
    findSegments(r.month,null,{store:r.store,kind:r.kind}).forEach(function(x){
      var localIndex=r.orderIndex-(x.segment.orderIndexOffset||0);
      if((!r.demoOrder&&getProject(x.project).partner!==p.partner)||localIndex<0||localIndex>=x.segment.count)return;
      var candidate=record(x,localIndex,r.month);if(candidate.order===r.order)rows.push(candidate);
    });return rows;
  }
  function now(){return new Date().toLocaleString('sv-SE').slice(0,16);}
  function formalStatus(b){
    var rows=b.applications||[],active=rows.find(function(a){return a.id===b.activeRequest;}),last=rows[rows.length-1];
    if(active&&['processing','retry_pending','red_pending'].includes(active.status))return active.type==='red'?'reversing':'processing';
    if(last&&last.type==='red'&&last.status==='failed'&&activeInvoice(b))return 'reverse_failed';
    if(activeInvoice(b))return 'issued';
    if(last&&last.type==='red'&&last.status==='issued')return 'revoked';
    if(last&&last.type==='blue'&&last.status==='failed')return 'failed';
    return 'ready';
  }
  function canIssue(b){return b&&b.month<TODAY&&['ready','failed','revoked'].includes(b.status)&&!b.activeRequest&&!b.activeWorkflow&&!activeInvoice(b);}
  function validateAmount(amount){if(!Number.isSafeInteger(amount)||amount<=0)throw new Error('请填写大于 0 且最多两位小数的金额');}
  function adjustAmount(b,amount,reason){
    if(!canIssue(b))throw new Error('当前状态不能调整应开票金额');validateAmount(amount);
    if(amount===b.invoiceAmount)return;
    if(!String(reason||'').trim())throw new Error('请填写金额调整说明');
    b.adjustments.push({from:b.invoiceAmount,to:amount,reason:reason.trim(),date:now(),operator:'集团财务'});b.invoiceAmount=amount;
  }
  function nextApplicationId(b){var prefix='SQ'+b.id.replace(/-/g,'').toUpperCase()+'-',n=b.applications.length+1;while(b.applications.some(function(x){return x.id===prefix+n;})||(b.workflowTasks||[]).some(function(x){return x.id===prefix+n;}))n++;return prefix+n;}
  function startInvoice(bid,values){
    var b=bill(bid),task=(b.workflowTasks||[]).find(function(t){return t.id===values.workflowId;}),fromWorkflow=!!(task&&task.status==='processing'&&task.preCompletedAt&&b.activeWorkflow===task.id&&!task.formalId);if(!canIssue(b)&&!fromWorkflow)throw new Error('当前结算单不能发起开票');if(fromWorkflow){var check=window.DemoPreissued.settlementReversalState(bid);if(check.pending||check.failed||check.issuing)throw new Error('预票红冲尚未全部成功，不能创建正式开票申请');}
    validateAmount(b.invoiceAmount);
    if(values.amount!==b.invoiceAmount)throw new Error('应开票金额与结算单不一致，请返回结算单详情核对');
    var recipients=invoiceRecipients({recipients:Array.isArray(values.emails)?values.emails:values.email?[values.email]:[]});
    if(recipients.some(function(email){return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);}))throw new Error('请填写有效的接收邮箱');
    var p=getProject(b.project),buyer=clone(values.issueBuyerSnapshot||invoiceDefaults(b).buyer),seller=clone(getSeller(b.seller));
    var manualRemark=String(values.remark||''),remarkOptions=[];
    var a={workflowId:values.workflowId||'',retryOf:values.retryOf||'',batchId:values.batchId||'',preflight:!!values.preflight,stage:values.workflowId?'issuing':values.preflight?'preparing':'issuing',id:nextApplicationId(b),type:'blue',amount:b.invoiceAmount,status:'processing',createdAt:now(),remark:composeInvoiceRemark(manualRemark,remarkOptions,buyer,seller),manualRemark:manualRemark,remarkOptions:remarkOptions,buyer:buyer,seller:seller,item:b.item,invoiceType:b.invoiceType||p.invoiceType,taxCode:b.taxCode,taxShortName:b.taxShortName,taxRate:b.taxRate,recipient:recipients[0]||'',recipients:recipients};
    b.applications.push(a);b.activeRequest=a.id;b.status='processing';b.recipient=a.recipient;b.recipients=recipients.slice();b.invoiceRemark=manualRemark;b.invoiceRemarkOptions=remarkOptions.slice();b.attempts++;save();return a;
  }
  function startReversal(bid,reason){
    var b=bill(bid),blue=b&&activeInvoice(b);
    if(!blue||!['issued','reverse_failed'].includes(b.status))throw new Error('当前结算单不能撤销开票');
    if(!String(reason||'').trim())throw new Error('请填写撤销原因');
    var a={id:nextApplicationId(b),type:'red',amount:-blue.amount,status:'processing',createdAt:now(),reason:reason.trim(),remark:blue.remark||'',manualRemark:blue.manualRemark==null?blue.remark||'':blue.manualRemark,remarkOptions:clone(blue.remarkOptions||[]),originalId:blue.id,buyer:clone(blue.buyer),seller:clone(blue.seller),item:blue.item,invoiceType:blue.invoiceType,taxCode:blue.taxCode,taxShortName:blue.taxShortName,taxRate:blue.taxRate,recipient:blue.recipient,recipients:invoiceRecipients(blue)};
    b.applications.push(a);b.activeRequest=a.id;b.status='reversing';save();return a;
  }
  function retryRequest(bid,aid){
    var b=bill(bid),a=b&&b.applications.find(function(x){return x.id===aid;});
    if(!a||a.status!=='retry_pending'||b.activeRequest!==aid)throw new Error('当前申请不能重试');
    if(a.type==='blue'&&activeInvoice(b))throw new Error('当前结算单已有有效发票');
    if(a.type==='red'&&!b.invoices.some(function(inv){return inv.id===a.originalId&&!inv.reversedBy;}))throw new Error('原蓝票已不可红冲');
    a.retryHistory=a.retryHistory||[];a.retryHistory.push({date:now(),error:a.error||''});
    a.retryCount=(a.retryCount||0)+1;a.status='processing';delete a.completedAt;delete a.error;
    b.status=a.type==='red'?'reversing':'processing';save();return a;
  }
  function refreshBill(bid){
    var b=bill(bid);if(!b)throw new Error('结算单不存在');
    var stored=JSON.parse(localStorage.getItem(KEY)||'null'),m=stored&&stored.months[b.month],latest=m&&m.bills.find(function(x){return x.id===bid;});
    if(latest){Object.keys(b).forEach(function(k){delete b[k];});Object.assign(b,clone(latest));}return b;
  }
  function refreshRequest(bid,aid){
    var b=refreshBill(bid),a=b.applications.find(function(x){return x.id===aid;});if(!a)throw new Error('开票申请不存在');return a;
  }
  function completeRequest(bid,aid,result){
    var b=bill(bid),a=b&&b.applications.find(function(x){return x.id===aid;});
    if(!a||!['processing','red_pending'].includes(a.status)||b.activeRequest!==aid)return;
    var update=typeof result==='boolean'?{status:result?'issued':'failed'}:result||{},outcome=update.status;
    if(!['processing','issued','failed','retry_pending','red_pending'].includes(outcome))throw new Error('不支持的申请状态');
    if(outcome==='red_pending'&&a.type!=='red')throw new Error('仅红票申请可等待红字确认单确认');
    if(a.status==='red_pending'&&!['red_pending','failed'].includes(outcome)&&!update.redConfirmed)return;
    if(outcome==='processing'||outcome==='retry_pending'||outcome==='red_pending'){
      a.status=outcome;delete a.completedAt;
      if(outcome==='retry_pending')a.error=String(update.error||'未返回失败原因');
      b.status=a.type==='red'?'reversing':'processing';save();return;
    }
    if(outcome==='failed'){
      if(a.preflight&&a.type==='blue')a.failureStage=update.failureStage||a.stage;
      a.status='failed';a.error=String(update.error||'未返回失败原因');a.completedAt=update.completedAt||now();
      b.status=a.type==='red'?'reverse_failed':'failed';delete b.activeRequest;save();return;
    }
    if(a.type==='blue'&&a.preflight){var pre=window.DemoPreissued;if(!pre)throw new Error('预开发票服务不可用');var check=pre.settlementReversalState(bid);if(check.pending||check.failed||check.issuing)throw new Error('关联预票尚未全部红冲成功');}
    var completedAt=update.completedAt||now();
    var invoicePrefix='FP'+bid.replace(/-/g,'').toUpperCase()+'-',invoiceNo=b.applications.length;while(b.invoices.some(function(x){return x.id===invoicePrefix+invoiceNo;}))invoiceNo++;
    var inv={id:invoicePrefix+invoiceNo,amount:a.amount,tone:a.type,date:completedAt,recipient:a.recipient,recipients:invoiceRecipients(a),sent:false,applicationId:a.id,originalId:a.originalId||null,buyer:clone(a.buyer),seller:clone(a.seller),item:a.item,invoiceType:a.invoiceType,taxCode:a.taxCode,taxShortName:a.taxShortName,taxRate:a.taxRate,remark:a.remark,manualRemark:a.manualRemark==null?a.remark:a.manualRemark,remarkOptions:clone(a.remarkOptions||[]),reason:a.reason||''};
    if(a.type==='red'){var blue=b.invoices.find(function(x){return x.id===a.originalId;});if(!blue||blue.reversedBy)return;blue.reversedBy=inv.id;}
    else if(activeInvoice(b))return;
    b.invoices.push(inv);a.invoiceId=inv.id;a.status='issued';a.stage='complete';a.completedAt=completedAt;delete a.error;
    b.status=a.type==='red'?'revoked':'issued';b.issued=issuedAmount(b);delete b.activeRequest;save();if(a.type==='blue'&&window.DemoPreissued)window.DemoPreissued.onSettlementSuccess(b,inv);return inv;
  }
  window.DemoData={invoiceDefaults:invoiceDefaults,formalStatus:formalStatus,fundingItems:fundingItems,refreshBill:refreshBill,retryRequest:retryRequest,refreshRequest:refreshRequest,invoiceRecipients:invoiceRecipients,composeInvoiceRemark:composeInvoiceRemark,invoiceItemLabel:invoiceItemLabel,historyMonths:historyMonths,projectHistory:projectHistory,issuedAmount:issuedAmount,monthProjects:monthProjects,policySummaries:policySummaries,DATA_UPDATED_AT:'2026-09-28 23:59',db:db,save:save,month:month,bill:bill,totals:totals,monthTotal:monthTotal,projectBills:projectBills,records:records,getRecord:getRecord,orderParts:orderParts,findSegments:findSegments,record:record,getProject:getProject,getPartner:getPartner,getBuyer:getBuyer,getSeller:getSeller,getStore:getStore,getPolicy:getPolicy,lookupTaxCode:lookupTaxCode,taxRates:taxCatalog.rates,taxCatalog:taxCatalog,policySellerId:policySellerId,matchingPolicies:matchingPolicies,stores:stores,sellers:sellers,sources:sources,TODAY:TODAY,PREVIOUS:previous,KEY:KEY,sum:sum,normalizeBill:normalizeBill,settlementNet:settlementNet,activeInvoice:activeInvoice,canIssue:canIssue,adjustAmount:adjustAmount,startInvoice:startInvoice,startReversal:startReversal,completeRequest:completeRequest};
})();
