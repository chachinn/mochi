/* ========================================================================== */
/* Mochi Build 5.2 — Tomodachi Life: Living the Dream game tools              */
/* ========================================================================== */
TEMPLATES.tomodachi={
  label:'Tomodachi Life: Living the Dream',
  emoji:'🏝️',
  fields:['Source Character','Source Series / Anime / Game','Island Personality']
};

function isTomodachiCollection(c){return !!c&&c.template==='tomodachi'}
function tomodachiHeightTable(c){return Array.isArray(c?.heightSliderTable)?c.heightSliderTable.filter(r=>Number.isFinite(Number(r.position))&&Number.isFinite(Number(r.height))).map(r=>({position:Number(r.position),height:Number(r.height)})).sort((a,b)=>a.position-b.position):[]}
function parseHeightSliderText(text){
  const out=[];
  String(text||'').split(/\r?\n/).forEach(line=>{
    const nums=(line.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
    for(let i=0;i+1<nums.length;i+=2){
      const position=nums[i],height=nums[i+1];
      if(Number.isFinite(position)&&Number.isFinite(height))out.push({position,height});
    }
  });
  const unique=new Map();out.forEach(r=>unique.set(r.position,r));
  return [...unique.values()].sort((a,b)=>a.position-b.position);
}
function tomodachiHeightResult(c,canonHeight){
  const rows=tomodachiHeightTable(c),target=Number(canonHeight);
  if(!rows.length||!Number.isFinite(target))return null;
  let best=rows[0];
  for(const r of rows){
    const d=Math.abs(r.height-target),bd=Math.abs(best.height-target);
    if(d<bd||(d===bd&&r.position<best.position))best=r;
  }
  const max=Number.isFinite(Number(c.heightSliderMaxPosition))?Number(c.heightSliderMaxPosition):Math.max(...rows.map(r=>r.position));
  const zeroEnd=c.heightSliderZeroEnd==='right'?'right':'left';
  const fromZero=Math.max(0,best.position),fromOther=Math.max(0,max-best.position);
  const zeroLabel=zeroEnd==='left'?'LEFT':'RIGHT',otherLabel=zeroEnd==='left'?'RIGHT':'LEFT';
  const recommended=fromZero<=fromOther?{clicks:fromZero,direction:zeroLabel}:{clicks:fromOther,direction:otherLabel};
  return {canon:target,matchedHeight:best.height,position:best.position,max,difference:best.height-target,fromZero,fromOther,zeroLabel,otherLabel,...recommended};
}
function formatHeightDiff(n){const v=Number(n||0);return `${v>0?'+':''}${v.toFixed(2)} cm`}
function openTomodachiHeightTable(c=collectionFor(state.collectionId)){
  if(!isTomodachiCollection(c))return showToast('Height Slider is only available for Tomodachi Life collections.','error');
  const rows=tomodachiHeightTable(c),text=rows.map(r=>`${r.position}, ${r.height}`).join('\n'),max=Number.isFinite(Number(c.heightSliderMaxPosition))?Number(c.heightSliderMaxPosition):(rows.length?Math.max(...rows.map(r=>r.position)):'');
  openModal(`${modalHead('📏 Height Slider Reference')}<p class="validation-note">Paste or type your Tomodachi height table here. Mochi accepts <b>Click, Height</b> pairs — even two pairs on the same line like your current spreadsheet. Nothing is pre-filled.</p><form id="heightSliderForm" class="form-grid"><div class="field-row"><div class="field"><label>Highest slider position</label><input name="maxPosition" type="number" min="0" step="1" value="${esc(max)}" placeholder="e.g. 128"></div><div class="field"><label>Position 0 starts from</label><select name="zeroEnd"><option value="left" ${c.heightSliderZeroEnd!=='right'?'selected':''}>Left end</option><option value="right" ${c.heightSliderZeroEnd==='right'?'selected':''}>Right end</option></select></div></div><div class="field"><label>Reference table</label><textarea name="table" id="heightSliderText" rows="12" placeholder="0, 198.00\n1, 197.22\n2, 196.45\n...\n64, 148.37">${esc(text)}</textarea><div class="tiny muted">Tip: You can paste rows like “0 198.00 64 148.37” and Mochi will read both pairs.</div></div><section id="heightTablePreview" class="panel" style="margin:0"></section><div class="form-actions"><button type="button" class="soft-btn" data-close-modal>Cancel</button><button class="soft-btn primary">Save reference</button></div></form>`);
  const preview=()=>{const parsed=parseHeightSliderText($('#heightSliderText').value);$('#heightTablePreview').innerHTML=parsed.length?`<div class="row-between"><b>${parsed.length} slider positions detected</b><span class="tiny muted">${parsed[0].height.toFixed(2)}–${parsed[parsed.length-1].height.toFixed(2)} cm</span></div><div class="height-preview-list">${parsed.slice(0,6).map(r=>`<span>${r.position} → ${r.height.toFixed(2)} cm</span>`).join('')}${parsed.length>6?`<span>… ${parsed.length-6} more</span>`:''}</div>`:`<div class="tiny muted">Paste your height data to preview it here.</div>`};
  $('#heightSliderText').addEventListener('input',preview);preview();
  $('#heightSliderForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),parsed=parseHeightSliderText(fd.get('table'));if(parsed.length<2)return showToast('Add at least two valid Click / Height rows.','error');const providedMax=Number(fd.get('maxPosition'));const tableMax=Math.max(...parsed.map(r=>r.position));c.heightSliderTable=parsed;c.heightSliderMaxPosition=Number.isFinite(providedMax)&&providedMax>=tableMax?providedMax:tableMax;c.heightSliderZeroEnd=fd.get('zeroEnd')==='right'?'right':'left';c.updatedAt=new Date().toISOString();await storePut(STORES.collections,c);await loadData();closeModal();render();showToast(`Height slider saved · ${parsed.length} positions ♡`,'success')};
}

const openCollectionMenuBeforeTomodachi=openCollectionMenu;
openCollectionMenu=function(){
  const c=collectionFor(state.collectionId);openCollectionMenuBeforeTomodachi();
  if(!isTomodachiCollection(c))return;
  const grid=$('.modal .tool-grid');if(!grid)return;
  const rows=tomodachiHeightTable(c);
  const b=document.createElement('button');b.className='tool-card tomodachi-tool-card';b.id='tomodachiHeightTool';b.innerHTML=`<strong>📏 Height Slider Reference</strong><small>${rows.length?`${rows.length} positions saved · auto-calculate canon heights`:'Add your click-to-height table for automatic setup'}</small>`;grid.appendChild(b);b.onclick=()=>openTomodachiHeightTable(c);
};

function ensureTomodachiHiddenCustomFields(root,values={}){
  const box=$('#customFields',root||document);if(!box)return;
  const keys=['Canon Height (cm)','Slider Height (cm)','Slider Position','Slider Clicks','Slider Direction','Height Difference'];
  const current={};$$('.custom-field-row',box).forEach(r=>{const k=$('.cf-key',r)?.value;if(k)current[k]=r});
  keys.forEach(k=>{if(current[k]){current[k].classList.add('tomodachi-hidden-field');return}box.insertAdjacentHTML('beforeend',`<div class="custom-field-row tomodachi-hidden-field"><input class="cf-key" value="${esc(k)}"><input class="cf-value" value="${esc(values[k]||'')}"><button type="button" data-remove-cf>×</button></div>`)})
}
function setTomodachiCustomValue(key,value){$$('.custom-field-row').forEach(r=>{if($('.cf-key',r)?.value===key){$('.cf-value',r).value=value??''}})}
function getTomodachiExistingHeight(i){return Number(i?.customFields?.['Canon Height (cm)']||'')||''}
function renderTomodachiHeightPanel(c,i){
  const rows=tomodachiHeightTable(c),canon=getTomodachiExistingHeight(i);
  return `<section id="tomodachiHeightPanel" class="panel tomodachi-height-panel"><div class="row-between"><div><div class="eyebrow">Tomodachi Life tool</div><h3>📏 Canon Height Setup</h3></div><button type="button" class="soft-btn" id="editHeightReference">${rows.length?'Edit table':'Add table'}</button></div>${rows.length?`<div class="field" style="margin-top:10px"><label>Canon height (cm)</label><input id="canonHeightInput" inputmode="decimal" type="number" min="1" max="300" step="0.01" value="${esc(canon)}" placeholder="e.g. 175"></div><div id="heightAutoResult" class="height-auto-result"></div>`:`<div class="empty-inline"><b>No height slider reference yet.</b><span>Add your height table once, then every character can calculate the shortest setup automatically.</span></div>`}</section>`;
}
function attachTomodachiHeightPanel(i={}){
  const form=$('#itemForm');if(!form)return;const select=$('#itemCollection');
  const refresh=()=>{
    $('#tomodachiHeightPanel')?.remove();
    const c=collectionFor(select.value);if(!isTomodachiCollection(c))return;
    const customFieldContainer=$('#customFields')?.closest('.field');
    if(customFieldContainer)customFieldContainer.insertAdjacentHTML('beforebegin',renderTomodachiHeightPanel(c,i));
    ensureTomodachiHiddenCustomFields(form,i.customFields||{});
    const edit=$('#editHeightReference');if(edit)edit.onclick=()=>openTomodachiHeightTable(c);
    const input=$('#canonHeightInput'),out=$('#heightAutoResult');
    const calc=()=>{if(!input||!out)return;const r=tomodachiHeightResult(c,input.value);if(!r){out.innerHTML='<div class="tiny muted">Enter a canon height to calculate the slider.</div>';return}out.innerHTML=`<div class="height-result-main"><span class="height-direction">${r.direction==='LEFT'?'↤':'↦'}</span><span><b>${r.clicks} click${r.clicks===1?'':'s'} from ${r.direction}</b><small>closest in-game height: ${r.matchedHeight.toFixed(2)} cm</small></span></div><div class="height-result-meta"><span>Position ${r.position} / ${r.max}</span><span>Difference ${formatHeightDiff(r.difference)}</span><span>${r.fromZero} from ${r.zeroLabel} · ${r.fromOther} from ${r.otherLabel}</span></div>`;setTomodachiCustomValue('Canon Height (cm)',Number(r.canon).toFixed(2));setTomodachiCustomValue('Slider Height (cm)',r.matchedHeight.toFixed(2));setTomodachiCustomValue('Slider Position',String(r.position));setTomodachiCustomValue('Slider Clicks',String(r.clicks));setTomodachiCustomValue('Slider Direction',r.direction);setTomodachiCustomValue('Height Difference',formatHeightDiff(r.difference));};
    if(input){input.addEventListener('input',calc);calc()}
  };
  const old=select.onchange;select.onchange=e=>{if(old)old.call(select,e);refresh()};refresh();
}
const openItemFormBeforeTomodachi=openItemForm;
openItemForm=function(existing=null,defaultCollection='',forcedStatus='',forcedSlot=''){openItemFormBeforeTomodachi(existing,defaultCollection,forcedStatus,forcedSlot);attachTomodachiHeightPanel(existing||{});};

const openItemDetailBeforeTomodachi=openItemDetail;
openItemDetail=function(id){openItemDetailBeforeTomodachi(id);const i=state.items.find(x=>x.id===id),c=collectionFor(i?.collectionId);if(!i||!isTomodachiCollection(c))return;const cf=i.customFields||{},canon=cf['Canon Height (cm)'];if(!canon)return;const r=tomodachiHeightResult(c,canon);const target=$('.modal .detail-actions')||$('.modal .panel');if(!target)return;const panel=document.createElement('section');panel.className='panel tomodachi-detail-height';panel.innerHTML=`<div class="eyebrow">Tomodachi Life setup</div><div class="row-between"><div><h3>📏 Height Slider</h3><div class="tiny muted">Canon ${Number(canon).toFixed(2)} cm</div></div>${r?`<div class="height-detail-badge">${r.clicks} from ${r.direction}</div>`:''}</div>${r?`<div class="height-result-meta"><span>Closest ${r.matchedHeight.toFixed(2)} cm</span><span>Position ${r.position}/${r.max}</span><span>${formatHeightDiff(r.difference)}</span></div>`:'<div class="tiny muted">Height reference table needs to be restored for calculation.</div>'}`;target.parentNode.insertBefore(panel,target);
};
