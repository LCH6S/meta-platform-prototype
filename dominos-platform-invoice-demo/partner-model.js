(function(){
 'use strict';
 var D=window.DemoData,db=D.db,clone=function(x){return JSON.parse(JSON.stringify(x));};
 // Keep historical statement and invoice snapshots intact. Legacy IDs remain lookup keys only.
 db.fundingItemConfigs=db.fundingItemConfigs||{};
 D.fundingItems().forEach(function(item){
  if(db.fundingItemConfigs[item.code])return;
  var matches=D.matchingPolicies(item.code),variants=new Map();
  matches.forEach(function(x){var r={partner:x.p.partner,buyer:x.p.buyer,sellerMode:x.pol.sellerMode,sellerId:x.pol.sellerId||'',item:x.pol.item,taxCode:x.pol.taxCode,taxShortName:x.pol.taxShortName,taxRate:x.pol.taxRate,invoiceType:x.p.invoiceType};variants.set(JSON.stringify(r),r);});
  db.fundingItemConfigs[item.code]=Object.assign({code:item.code,name:item.name,description:item.description,partner:'',rule:null},variants.size===1?{partner:matches[0].p.partner,rule:clone(Array.from(variants.values())[0])}:{});
 });
 function partnerId(b){return b&&(b.partner||D.getProject(b.project)?.partner)||'';}
 function bills(m,pid){
  if(m<D.TODAY)return D.month(m).bills.filter(function(b){return partnerId(b)===pid;});
  var raw=D.findSegments(m,null,{}).map(function(x){return{source:x.segment.source,store:x.segment.store,amount:x.segment.cents,count:x.segment.count,kind:x.segment.kind,originBill:x.bill.id,originSegment:x.si};}),result=groupFunding(raw,m),groups=result.groups.map(function(g,i){return{id:m+'-partner-'+g.partner+'-'+i,month:m,partner:g.partner,status:'collecting',segments:g.members.map(function(r){return{source:r.source,store:r.store,cents:r.amount,count:r.count,kind:r.kind};}),invoices:[],applications:[],invoiceAmount:g.amount,seller:g.seller,item:g.item,taxCode:g.taxCode,taxShortName:g.taxShortName,taxRate:g.taxRate,invoiceType:g.invoiceType,buyerSnapshot:g.buyerSnapshot};});
  result.unconfigured.forEach(function(row){var owner=getItem(row.source)?.partner;if(owner)groups.push({month:m,partner:owner,status:'collecting',segments:[{source:row.source,cents:row.amount,count:row.count,kind:row.kind}],invoices:[],applications:[]});});return groups.filter(function(b){return b.partner===pid;});
 }
 function items(){return D.sources.map(function(s){return db.fundingItemConfigs[s.code];}).filter(Boolean);}
 function getItem(code){return db.fundingItemConfigs[code];}
 function saveItem(code,value){
  var old=getItem(code);if(!old)throw Error('平台出资项不存在');var v=clone(value),r=v.rule,p=D.getPartner(v.partner);
  if(!v.name.trim())throw Error('请填写名称');if(!p)throw Error('请选择合作伙伴');if(!r||!p.buyers[0]||!p.buyers[0].name||!p.buyers[0].tax)throw Error('请先在合作伙伴的发票信息中维护抬头和税号');r.buyer=p.buyers[0].id;
  if(!['order','fixed'].includes(r.sellerMode)||r.sellerMode==='fixed'&&!D.getSeller(r.sellerId))throw Error('请选择开票方');
  var tax=D.lookupTaxCode(r.taxCode);if(!tax||!tax.shortName)throw Error('请填写有效的税收分类编码');if(!r.item.trim())throw Error('请填写开票项目名称');
  if(r.taxRate==null||!D.taxRates.includes(Number(r.taxRate)))throw Error('请选择税率');if(!['增值税普通发票','增值税专用发票'].includes(r.invoiceType))throw Error('请选择发票种类');
  r.partner=p.id;r.taxShortName=tax.shortName;r.taxRate=Number(r.taxRate);v.code=code;delete v._item;v.updatedAt=new Date().toISOString();db.fundingItemConfigs[code]=v;D.save();return v;
 }
 function summary(rows){var groups={};rows.forEach(function(b){b.segments.forEach(function(s){var item=getItem(s.source)||{name:s.source};var g=groups[s.source]||(groups[s.source]={id:s.source,name:item.name,positive:0,negative:0,count:0});g[s.cents>=0?'positive':'negative']+=s.cents*s.count;g.count+=s.count;});});return Object.values(groups).map(function(g){g.net=g.positive+g.negative;return g;});}
 function segments(m,pid,f){f=f||{};return D.findSegments(m,null,{bill:f.bill,store:f.store,kind:f.kind}).filter(function(x){return(!pid||(m>=D.TODAY?getItem(x.segment.source)?.partner:partnerId(x.bill))===pid)&&(!f.source||x.segment.source===f.source);});}
 function records(m,pid,f,page,size){var ss=segments(m,pid,f),offset=0,start=(page-1)*size,end=start+size,rows=[];ss.forEach(function(x){var c=x.segment.count;for(var i=Math.max(0,start-offset);i<Math.min(c,end-offset);i++)rows.push(D.record(x,i,m));offset+=c;});return{rows:rows,total:offset,amount:D.sum(ss,function(x){return x.segment.count*x.segment.cents;})};}
 function monthDateRange(m){if(!/^\d{4}-\d{2}$/.test(m||''))return {};var a=m.split('-').map(Number);return{dateFrom:m+'-01',dateTo:new Date(Date.UTC(a[0],a[1],0)).toISOString().slice(0,10)};}
 function normalizeFundingQuery(q){var v=Object.assign({},q||{});if(v.month&&!v.dateFrom&&!v.dateTo)Object.assign(v,monthDateRange(v.month));if(v.createdFrom!==undefined)v.dateFrom=v.createdFrom;if(v.createdTo!==undefined)v.dateTo=v.createdTo;delete v.month;delete v.createdFrom;delete v.createdTo;return v;}
 function validFundingDates(q){return [q.dateFrom,q.dateTo].every(function(v){return !v||/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;})&&(!q.dateFrom||!q.dateTo||q.dateFrom<=q.dateTo);}
 D.monthDateRange=monthDateRange;D.normalizeFundingQuery=normalizeFundingQuery;D.validFundingDates=validFundingDates;
 function fundingSegments(q){q=q||{};var available=[D.TODAY].concat(D.historyMonths()).sort().reverse(),months=available.filter(function(m){return(!q.dateFrom||m>=q.dateFrom.slice(0,7))&&(!q.dateTo||m<=q.dateTo.slice(0,7));}),needle=String(q.bill||'').replace(/^JS/i,'').replace(/[^a-z0-9]/gi,'').toUpperCase(),codes=q.item?String(q.item).split(','):[];if(q.bill&&!needle)return [];
  return months.flatMap(function(m){return segments(m,q.partner||'',{store:q.store,kind:q.kind}).filter(function(x){return(!codes.length||codes.includes(x.segment.source))&&(!needle||m<D.TODAY&&x.bill.id.replace(/[^a-z0-9]/gi,'').toUpperCase().includes(needle));}).map(function(x){return Object.assign({month:m},x);});});
 }
 function fundingChunks(q){q=normalizeFundingQuery(q);if(!validFundingDates(q))return [];var P=window.DemoPreissued;if(P)P.beginFundingQuery();var result=[];
  function match(x,range){var needle=String(q.order).trim().toUpperCase(),first=D.record(x,range.start,x.month),prefix=first.order.slice(0,-String(range.start+(x.segment.orderIndexOffset||0)+1).padStart(6,'0').length).toUpperCase();if(prefix.includes(needle)){result.push({x:x,range:range});return;}
    if(needle.startsWith(prefix)&&/^\d{6,}$/.test(needle.slice(prefix.length))){var index=Number(needle.slice(prefix.length))-1-(x.segment.orderIndexOffset||0),ord=(index-range.start)/range.step;if(Number.isInteger(ord)&&ord>=0&&ord<range.count&&D.record(x,index,x.month).order.toUpperCase()===needle)result.push({x:x,range:{start:index,step:1,count:1}});return;}
    for(var j=0;j<range.count;j++){var index=range.start+j*range.step,order=prefix+String(index+(x.segment.orderIndexOffset||0)+1).padStart(6,'0');if(order.includes(needle))result.push({x:x,range:{start:index,step:1,count:1}});}
  }
  function dateRanges(x,range){
    if(!q.dateFrom&&!q.dateTo)return [range];
    var s=x.segment,fixed=s.kind==='positive'?s.orderOccurred:s.refundDay;
    if(fixed){var day=D.record(x,range.start,x.month).occurred.slice(0,10);return(!q.dateFrom||day>=q.dateFrom)&&(!q.dateTo||day<=q.dateTo)?[range]:[];}
    var limits=monthDateRange(x.month);if((!q.dateFrom||q.dateFrom<=limits.dateFrom)&&(!q.dateTo||q.dateTo>=limits.dateTo))return [range];
    var period=s.kind==='refund'?351:27,a=period,b=range.step;while(b){var t=a%b;a=b;b=t;}var samples=period/a,out=[];
    for(var j=0;j<Math.min(range.count,samples);j++){var start=range.start+j*range.step,day=D.record(x,start,x.month).occurred.slice(0,10);if((!q.dateFrom||day>=q.dateFrom)&&(!q.dateTo||day<=q.dateTo))out.push({start:start,step:range.step*samples,count:Math.ceil((range.count-j)/samples)});}return out;
  }
  fundingSegments(q).forEach(function(x){var ranges=q.preStatus?(P?P.fundingStatusRuns(x.bill.id,x.si,x.segment.count,x.segment.kind,q.preStatus):[]):[{start:0,step:1,count:x.segment.count}];
    ranges=ranges.flatMap(function(range){return dateRanges(x,range);});ranges.forEach(function(range){if(!q.order){result.push({x:x,range:range});return;}var period=x.segment.kind==='refund'&&!x.segment.originalMonth&&range.step%3?3:1;for(var j=0;j<Math.min(period,range.count);j++)match(x,{start:range.start+j*range.step,step:range.step*period,count:Math.ceil((range.count-j)/period)});});
  });return result;
 }
 function queryFunding(q,page,size){var chunks=fundingChunks(q),offset=0,start=(page-1)*size,end=start+size,rows=[],amount=0;chunks.forEach(function(c){var n=c.range.count;for(var i=Math.max(0,start-offset);i<Math.min(n,end-offset);i++)rows.push(D.record(c.x,c.range.start+i*c.range.step,c.x.month));offset+=n;amount+=n*c.x.segment.cents;});return{rows:rows,total:offset,amount:amount};}
 function eachFunding(q,callback){fundingChunks(q).forEach(function(c){for(var i=0;i<c.range.count;i++)callback(D.record(c.x,c.range.start+i*c.range.step,c.x.month));});}
 D.queryFunding=queryFunding;D.eachFunding=eachFunding;
 // Group new funding by actual invoicing conditions, never by legacy project/policy or source code.
 function groupFunding(rows,m){var groups={},unconfigured=[];
  rows.forEach(function(row){var item=getItem(row.source),r=item&&item.rule,p=item&&D.getPartner(item.partner),buyer=p&&r&&p.buyers[0],seller=r&&(r.sellerMode==='fixed'?r.sellerId:D.getStore(row.store)?.seller);
   if(!r||!buyer||!seller){unconfigured.push(row);return;}
   var key=JSON.stringify([m,p.id,seller,buyer.tax,r.item,r.taxCode,Number(r.taxRate),r.invoiceType]);
   var g=groups[key]||(groups[key]={key:key,month:m,partner:p.id,seller:seller,buyerSnapshot:clone(buyer),item:r.item,taxCode:r.taxCode,taxShortName:r.taxShortName,taxRate:r.taxRate,invoiceType:r.invoiceType,amount:0,count:0,sources:[],members:[]});
   g.amount+=row.amount*(row.count||1);g.count+=row.count||1;if(!g.sources.includes(row.source))g.sources.push(row.source);g.members.push(clone(row));
  });return{groups:Object.values(groups),unconfigured:unconfigured};
 }
 D.partnerId=partnerId;D.partnerBills=bills;D.partnerFundingItems=items;D.fundingItem=getItem;D.saveFundingItem=saveItem;D.fundingSummaries=summary;D.partnerRecords=records;D.partnerSegments=segments;D.groupPartnerFunding=groupFunding;
 D.partnerForRecord=function(r){return r.month>=D.TODAY?getItem(r.source)?.partner||'':partnerId(D.bill(r.bill));};
 db.partnerStructureVersion=1;D.save();
})();
