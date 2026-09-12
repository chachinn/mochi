/* Mochi — contextual CSV exports for physical collections and game trackers */
(function(){
'use strict';

function isGameCollection(c){return !!c&&(c.isGame||c.template==='genshin'||c.template==='tomodachi')}
function activeEntries(c){return state.items.filter(i=>i.collectionId===c.id&&!i.archived)}
function fileSlug(value,fallback){const slug=String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');return slug||fallback}
function csvCell(value){return `"${String(value??'').replace(/"/g,'""')}"`}
function customFieldKeys(c,items){
  const keys=[];
  const seen=new Set();
  const add=key=>{key=String(key||'').trim();if(key&&!seen.has(key)){seen.add(key);keys.push(key)}};
  (Array.isArray(c.customFieldLabels)?c.customFieldLabels:[]).forEach(add);
  items.forEach(item=>Object.keys(item.customFields||{}).forEach(add));
  return keys;
}
function makeCSV(headers,rows){return '\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\n')}

function exportCollectionCSV(c){
  const items=activeEntries(c);if(!items.length)return;
  const custom=customFieldKeys(c,items);
  const headers=['Name','Collection','Status','Quantity','Series','Character','Price Paid','Estimated Value','Target Price','Date Acquired','Store','Condition','Priority','Tags','Set Slot','Mystery Series','Storage Location','Purchase URL','Favorite',...custom,'Notes'];
  const rows=items.map(i=>[
    i.name||'',c.name||'',i.status||'',qty(i),i.series||'',i.character||'',i.pricePaid||'',i.estimatedValue||'',i.targetPrice||'',i.dateAcquired||'',i.store||'',i.condition||'',i.priority||'',tagsOf(i).join('|'),i.setSlot||'',i.mysterySeries||'',i.location||'',i.purchaseUrl||'',i.favorite?'Yes':'',...custom.map(key=>i.customFields?.[key]??''),i.notes||''
  ]);
  downloadBlob(makeCSV(headers,rows),`${fileSlug(c.name,'mochi-collection')}-collection.csv`,'text/csv;charset=utf-8');
}

function exportGameTrackerCSV(c){
  const items=activeEntries(c);if(!items.length)return;
  const fields=customFieldKeys(c,items);
  const nameHeader=c.template==='genshin'?'Character':'Name';
  const headers=[nameHeader,...fields,'Notes'];
  const rows=items.map(i=>[i.name||i.character||i.customFields?.Character||i.customFields?.Name||'Untitled entry',...fields.map(key=>i.customFields?.[key]??''),i.notes||'']);
  downloadBlob(makeCSV(headers,rows),`${fileSlug(c.gamePreset||c.name,'mochi-game')}-tracker.csv`,'text/csv;charset=utf-8');
}

function enhanceCollectionExport(){
  if(state.route!=='collection')return;
  const c=collectionFor(state.collectionId);if(!c||isGameCollection(c)||!activeEntries(c).length)return;
  const row=document.querySelector('#mainContent .page-title-row');
  const menu=row?.querySelector('[data-action="collection-menu"]');
  if(!row||!menu||row.querySelector('#exportCollectionCSVBtn'))return;
  const button=document.createElement('button');
  button.type='button';button.id='exportCollectionCSVBtn';button.className='soft-btn';button.textContent='⇩ Export CSV';
  button.onclick=e=>{e.preventDefault();e.stopPropagation();exportCollectionCSV(c)};
  menu.before(button);
}

function enhanceGameExport(){
  if(state.route!=='game')return;
  const c=collectionFor(state.collectionId);if(!isGameCollection(c)||!activeEntries(c).length)return;
  const tools=document.querySelector('#mainContent .game-quick-tools');if(!tools||tools.querySelector('#exportGameCSVBtn'))return;
  const button=document.createElement('button');
  button.type='button';button.id='exportGameCSVBtn';button.className='soft-btn';button.textContent='⇩ Export CSV';
  button.onclick=e=>{e.preventDefault();e.stopPropagation();exportGameTrackerCSV(c)};
  const importButton=tools.querySelector('#genshinImportBtn');
  if(importButton)importButton.after(button);else tools.prepend(button);
}

function enhanceExports(){enhanceCollectionExport();enhanceGameExport()}

const baseRender=render;
render=function(...args){const result=baseRender.apply(this,args);enhanceExports();return result};

/* Keep the existing game-tools export consistent and hide it for empty trackers. */
document.addEventListener('click',e=>{
  if(!e.target?.closest?.('#gameToolsBtn'))return;
  queueMicrotask(()=>{
    const c=collectionFor(state.collectionId),button=document.querySelector('#exportGameCSV');
    if(!button||!isGameCollection(c))return;
    if(!activeEntries(c).length){button.remove();return}
    button.onclick=()=>exportGameTrackerCSV(c);
  });
});

window.MochiExports={exportCollectionCSV,exportGameTrackerCSV};
})();
