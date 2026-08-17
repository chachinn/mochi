/* Mochi — direct Excel (.xlsx) import for Genshin trackers */
(function(){
'use strict';

const GENSHIN_FIELDS=['Element','Rarity','Weapon','Role','Nation','Constellation','Level'];
const isXlsx=file=>!!file&&/\.xlsx$/i.test(file.name||'');
const currentGenshin=()=>{const c=collectionFor(state.collectionId);return c?.template==='genshin'?c:null};
const entriesFor=c=>state.items.filter(i=>i.collectionId===c.id&&!i.archived);

function excelResult(c,workbook,sheetName){
  const sheet=workbook.Sheets[sheetName];
  if(!sheet)throw new Error('That worksheet could not be opened.');
  const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false,blankrows:false});
  const characters=window.MochiGenshin.rowsToCharacters(rows);
  return {characters,unknown:window.MochiGenshin.findUnknowns(characters,c),sheetName};
}

async function performExcelImport(c,characters,duplicateMode='update'){
  let added=0,updated=0,skipped=0;
  for(const ch of characters){
    let existing=entriesFor(c).find(i=>String(i.name||i.character||'').trim().toLowerCase()===String(ch.name||'').trim().toLowerCase());
    if(existing&&duplicateMode==='skip'){skipped++;continue}
    if(existing&&duplicateMode==='add')existing=null;
    const fields=c.customFieldLabels?.length?c.customFieldLabels:GENSHIN_FIELDS;
    const customFields={...(existing?.customFields||{})};
    fields.forEach(k=>{if(ch[k]!==undefined&&ch[k]!==null&&ch[k]!=='')customFields[k]=String(ch[k]);else if(customFields[k]===undefined)customFields[k]=''});
    const rec={
      ...(existing||{}),id:existing?.id||uid('item'),name:String(ch.name||'').trim(),character:String(ch.name||'').trim(),
      collectionId:c.id,isGameEntry:true,status:'Owned',quantity:1,customFields,
      photos:existing?.photos||[],coverPhotoIndex:existing?.coverPhotoIndex||0,notes:existing?.notes||'',
      createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),archived:false
    };
    await storePut(STORES.items,rec);
    if(existing)updated++;else added++;
  }
  await storePut(STORES.collections,c);
  await loadData();render();
  showToast(`Excel import: ${added} added · ${updated} updated${skipped?` · ${skipped} skipped`:''} ♡`,'success');
}

function reviewExcelImport(c,result,fileName){
  const unique=[],seen=new Set();
  (result.unknown||[]).forEach(x=>{const key=`${x.field}\u0000${x.value}`;if(!seen.has(key)){seen.add(key);unique.push({field:x.field,value:x.value})}});
  const preview=result.characters.slice(0,8).map(x=>esc(x.name)).join(' · ');
  openModal(`${modalHead('✨ Review Excel Import')}<form id="genshinExcelReview" class="form-grid">
    <div class="genshin-warning"><b>${result.characters.length} characters found.</b><br>${preview}${result.characters.length>8?' · …':''}<br><br><span class="tiny">${esc(fileName)} · sheet: ${esc(result.sheetName)}</span></div>
    <div class="field"><label>If a character already exists</label><select name="duplicateMode"><option value="update">Update the existing character</option><option value="skip">Skip duplicate names</option><option value="add">Add another entry</option></select></div>
    ${unique.length?`<section class="panel"><h3>Values not in your dropdowns</h3><p class="tiny muted">Choose how Mochi should handle each value. Nothing is changed silently.</p>${unique.map((u,idx)=>{const opts=window.MochiGenshin.options(c,u.field),role=u.field==='Role';return `<div class="genshin-map-row"><span><b>${esc(u.field)}</b><small>${esc(u.value)}</small></span><select name="map_${idx}" ${role?'required':''}>${role?'<option value="">Choose mapping…</option>':''}<option value="__add__">Keep & add as custom option</option>${opts.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select></div>`}).join('')}</section>`:''}
    <div class="form-actions"><button class="soft-btn" type="button" data-close-modal>Cancel</button><button class="soft-btn primary">Import characters</button></div>
  </form>`);
  $('#genshinExcelReview').onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget),mapping=new Map();
    for(let idx=0;idx<unique.length;idx++){
      const u=unique[idx],choice=String(fd.get(`map_${idx}`)||'');
      if(!choice)return showToast(`Choose how to handle ${u.field}: ${u.value}.`,'error');
      if(choice==='__add__'){window.MochiGenshin.addOption(c,u.field,u.value);mapping.set(`${u.field}\u0000${u.value}`,u.value)}
      else mapping.set(`${u.field}\u0000${u.value}`,choice);
    }
    const characters=result.characters.map(ch=>{
      const copy={...ch};
      unique.forEach(u=>{if(copy[u.field]===u.value)copy[u.field]=mapping.get(`${u.field}\u0000${u.value}`)||copy[u.field]});
      return copy;
    });
    closeModal();
    await performExcelImport(c,characters,fd.get('duplicateMode')||'update');
  };
}

function chooseWorkbookSheet(c,workbook,file){
  const names=workbook.SheetNames||[];
  if(!names.length)throw new Error('The workbook has no worksheets.');
  if(names.length===1){const result=excelResult(c,workbook,names[0]);if(!result.characters.length)throw new Error('No Genshin characters were found in that worksheet.');return reviewExcelImport(c,result,file.name)}
  openModal(`${modalHead('📑 Choose Excel Sheet')}<p class="validation-note">This workbook has ${names.length} worksheets. Choose the sheet containing your Genshin character table.</p><div class="game-sheet-list">${names.map(n=>`<button class="game-library-card" type="button" data-xlsx-sheet="${esc(n)}"><span class="game-library-icon">▦</span><span><b>${esc(n)}</b><small>Use this worksheet</small></span><span>›</span></button>`).join('')}</div>`);
  $$('[data-xlsx-sheet]').forEach(btn=>btn.onclick=()=>{try{const result=excelResult(c,workbook,btn.dataset.xlsxSheet);if(!result.characters.length)return showToast('No Genshin characters found in that worksheet.','error');reviewExcelImport(c,result,file.name)}catch(err){console.error(err);showToast(err.message||'Could not read that worksheet.','error')}});
}

async function importXlsx(file,c){
  if(!window.XLSX)return showToast('Excel reader is not available yet. Connect to the internet once, refresh Mochi, then try again.','error');
  if(!window.MochiGenshin)return showToast('Genshin importer is unavailable.','error');
  if(file.size>25*1024*1024)return showToast('That Excel file is larger than 25 MB.','error');
  try{
    const data=await file.arrayBuffer();
    const workbook=XLSX.read(data,{type:'array',cellDates:false,cellFormula:false,cellHTML:false});
    chooseWorkbookSheet(c,workbook,file);
  }catch(err){
    console.error(err);
    showToast(err?.message?`Excel import failed: ${err.message}`:'Could not read that Excel workbook.','error');
  }
}

/* Capture .xlsx changes before the existing CSV-only target listener sees them. */
document.addEventListener('change',e=>{
  const input=e.target;
  if(input?.id!=='genshinImportInput')return;
  const file=input.files?.[0];
  if(!isXlsx(file))return;
  e.preventDefault();e.stopImmediatePropagation();
  const c=currentGenshin();
  if(!c){input.value='';return showToast('Open your Genshin tracker before importing.','error')}
  importXlsx(file,c).finally(()=>{input.value=''});
},true);

/* Keep the visible action accurate after every render. */
const relabel=()=>{const b=$('#genshinImportBtn');if(b)b.textContent='⇩ Import Excel / CSV'};
document.addEventListener('DOMContentLoaded',()=>{
  relabel();
  new MutationObserver(relabel).observe($('#app')||document.body,{subtree:true,childList:true});
});

window.MochiExcelImport={importXlsx,excelResult};
})();