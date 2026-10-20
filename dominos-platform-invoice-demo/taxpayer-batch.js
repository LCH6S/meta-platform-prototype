(function(){
  'use strict';
  var D=window.DemoData,db=D.db,HEADERS=['税号','交易即开票设置'];
  function store(){if(!db.taxpayerBatch)db.taxpayerBatch={tasks:{},settings:{}};return db.taxpayerBatch;}
  function save(){D.save();}
  function create(){var id='TX'+Date.now()+Math.random().toString(36).slice(2,6),t={id:id,state:'empty',createdAt:new Date().toLocaleString('sv-SE'),version:0};store().tasks[id]=t;save();return t;}
  function get(id){return store().tasks[id];}
  function tasks(){return Object.values(store().tasks).sort(function(a,b){return b.createdAt.localeCompare(a.createdAt);});}
  function enabled(tax){return store().settings[tax]===true;}
  function xml(s){return new DOMParser().parseFromString(s,'application/xml');}
  function elements(doc,name){return Array.from(doc.getElementsByTagNameNS('*',name));}
  async function readXlsx(buffer){
    var z=await JSZip.loadAsync(buffer);if(!z.file('xl/workbook.xml')||!z.file('xl/_rels/workbook.xml.rels'))throw Error('文件不是有效的 XLSX 工作簿');
    var wb=xml(await z.file('xl/workbook.xml').async('string')),sheets=elements(wb,'sheet');if(sheets.length!==1)throw Error('请使用仅包含一个工作表的导入模板');
    var rels=xml(await z.file('xl/_rels/workbook.xml.rels').async('string')),rid=sheets[0].getAttribute('r:id'),rel=elements(rels,'Relationship').find(function(n){return n.getAttribute('Id')===rid;});
    if(!rel)throw Error('无法读取工作表');var target=rel.getAttribute('Target'),path=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');if(!z.file(path))throw Error('无法读取工作表');
    var shared=z.file('xl/sharedStrings.xml')?elements(xml(await z.file('xl/sharedStrings.xml').async('string')),'si').map(function(n){return elements(n,'t').map(function(t){return t.textContent;}).join('');}):[];
    var sheet=xml(await z.file(path).async('string'));if(elements(sheet,'parsererror').length)throw Error('工作表内容损坏');
    return elements(sheet,'row').map(function(row){var values=[];elements(row,'c').forEach(function(cell){var letters=(cell.getAttribute('r')||'A').replace(/[0-9]/g,''),col=0;for(var i=0;i<letters.length;i++)col=col*26+letters.charCodeAt(i)-64;var raw=elements(cell,'v')[0]?.textContent||'',type=cell.getAttribute('t');values[col-1]=elements(cell,'f').length?'[公式不支持]':type==='s'?shared[Number(raw)]||'':type==='inlineStr'?elements(cell,'t').map(function(t){return t.textContent;}).join(''):raw;});return{line:Number(row.getAttribute('r')),values:values};});
  }
  async function upload(id,file){var t=get(id);if(!t||['executing','execute-succeeded'].includes(t.state))return;if(!/\.xlsx$/i.test(file.name))throw Error('仅支持 XLSX 文件');
    var version=++t.version;t.state='uploading';t.file={name:file.name,size:file.size};delete t.report;delete t.rows;delete t.error;save();
    try{var rows=await readXlsx(await file.arrayBuffer());if(t.version!==version)return;t.rows=rows;t.state='uploaded';save();}catch(err){if(t.version!==version)return;t.state='upload-failed';t.error=err.message||'文件读取失败，请重新上传';save();}
  }
  function inspect(rows){var nonempty=rows.filter(function(r){return r.values.some(function(v){return String(v||'').trim();});}),header=nonempty.shift(),errors=[];
    if(!header||header.values.map(function(v){return String(v||'').trim();}).join('|')!==HEADERS.join('|'))errors.push('表头必须依次为“税号”“交易即开票设置”，且只包含这两列');
    var seen=new Map(),records=nonempty.map(function(r){var tax=String(r.values[0]||'').trim(),setting=String(r.values[1]||'').trim(),causes=[];if(!tax)causes.push('税号不能为空');else if(!D.sellers.some(function(s){return s.tax===tax;}))causes.push('税号不存在于当前纳税人配置');if(!['开启','关闭'].includes(setting))causes.push('交易即开票设置只能填写“开启”或“关闭”');if(r.values.slice(2).some(function(v){return String(v||'').trim();}))causes.push('只能包含两列数据');seen.set(tax,(seen.get(tax)||0)+1);return{line:r.line,tax:tax,setting:setting,causes:causes};});
    records.forEach(function(r){if(r.tax&&seen.get(r.tax)>1)r.causes.push('税号重复，请每个税号只保留一行');});
    if(!records.length)errors.push('文件没有可识别的数据，请填写后重新上传');var invalid=records.filter(function(r){return r.causes.length;}).length;
    return{total:records.length,valid:errors.length?0:records.length-invalid,invalid:errors.length?records.length:invalid,errors:errors,records:records,passed:!errors.length&&!invalid&&records.length>0};
  }
  function check(id){var t=get(id);if(!t||!['uploaded','checking'].includes(t.state))return;t.state='checking';save();t.report=inspect(t.rows||[]);t.checkedVersion=t.version;t.state=t.report.passed?'check-passed':'check-failed';save();return t;}
  function reset(id){var t=get(id);if(!t||['executing','execute-succeeded'].includes(t.state))return;t.version++;t.state='empty';delete t.file;delete t.rows;delete t.report;delete t.error;delete t.checkedVersion;save();}
  function execute(id){var t=get(id);if(!t||t.state==='execute-succeeded')return t;if(!['check-passed','executing'].includes(t.state)||t.checkedVersion!==t.version)throw Error('请先完成当前文件检查');
    var report=inspect(t.rows||[]);if(!report.passed){t.report=report;t.state='check-failed';save();return t;}t.state='executing';save();
    var settings=Object.assign({},store().settings);report.records.forEach(function(r){settings[r.tax]=r.setting==='开启';});store().settings=settings;t.state='execute-succeeded';t.completedAt=new Date().toLocaleString('sv-SE');save();return t;
  }
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c];});}
  async function workbook(rows,options){options=options||{};var z=new JSZip(),ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    z.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
    z.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    z.file('xl/workbook.xml','<workbook xmlns="'+ns+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="'+esc(options.sheetName||'交易即开票设置')+'" sheetId="1" r:id="rId1"/></sheets></workbook>');
    z.file('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
    z.file('xl/worksheets/sheet1.xml','<worksheet xmlns="'+ns+'"><cols>'+(options.columnWidths||[30,24]).map(function(width,i){return'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+Number(width)+'" customWidth="1"/>';}).join('')+'</cols><sheetData>'+rows.map(function(row,i){return '<row r="'+(i+1)+'">'+row.map(function(v,j){return'<c r="'+String.fromCharCode(65+j)+(i+1)+'" t="inlineStr"><is><t>'+esc(v)+'</t></is></c>';}).join('')+'</row>';}).join('')+'</sheetData>'+(options.validation===false?'':'<dataValidations count="1"><dataValidation type="list" allowBlank="0" showErrorMessage="1" errorTitle="设置值无效" error="请填写开启或关闭" sqref="B2:B1048576"><formula1>"开启,关闭"</formula1></dataValidation></dataValidations>')+'</worksheet>');return z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  tasks().forEach(function(t){if(t.state==='uploading'){t.state='upload-failed';t.error='文件读取中断，请重新选择文件';save();}});
  window.DemoTaxpayerBatch={create:create,get:get,tasks:tasks,enabled:enabled,upload:upload,inspect:inspect,check:check,reset:reset,execute:execute,workbook:workbook,readXlsx:readXlsx,headers:HEADERS};
})();
