/* Mochi — optional table view for game trackers */
(function(){
'use strict';

function isGame(c){return !!c&&(c.isGame||c.template==='genshin'||c.template==='tomodachi')}
function entries(c){return state.items.filter(i=>i.collectionId===c.id&&!i.archived)}
function nameOf(i){return i.name||i.character||i.customFields?.Character||i.customFields?.Name||'Untitled entry'}
function fieldsForTable(c){
  if(c.template==='genshin')return ['Element','Rarity','Weapon','Role','Nation','Constellation','Level'];
  return Array.isArray(c.customFieldLabels)?c.customFieldLabels:[];
}
function searchText(i){return [nameOf(i),...Object.values(i.customFields||{}),i.notes||''].join(' ').toLowerCase()}

function applySearch(root){
  const input=$('#gameEntrySearch'),q=String(input?.value||'').trim().toLowerCase();
  root.querySelectorAll('[data-game-table-row]').forEach(row=>{row.hidden=!!q&&!String(row.dataset.gameSearch||'').includes(q)});
}

async function setMode(c,mode,root){
  c.gameViewMode=mode;
  c.updatedAt=new Date().toISOString();
  try{await storePut(STORES.collections,c)}catch(e){console.warn('Could not save game view preference',e)}
  root.dataset.gameViewMode=mode;
  root.querySelectorAll('[data-game-view]').forEach(b=>b.classList.toggle('active',b.dataset.gameView===mode));
  const cards=root.querySelector('.game-entry-list'),table=root.querySelector('.game-table-wrap');
  if(cards)cards.hidden=mode==='table';
  if(table)table.hidden=mode!=='table';
}

function buildTable(c,root){
  if(root.dataset.tableEnhanced==='1')return;
  const list=root.querySelector('.game-entry-list');
  if(!list)return;
  root.dataset.tableEnhanced='1';

  const toolbar=document.createElement('div');
  toolbar.className='game-view-switch';
  toolbar.innerHTML='<button type="button" data-game-view="cards">▤ Cards</button><button type="button" data-game-view="table">▦ Table</button>';
  list.parentNode.insertBefore(toolbar,list);

  const fields=fieldsForTable(c),data=entries(c);
  const wrap=document.createElement('div');
  wrap.className='game-table-wrap';
  wrap.innerHTML=`<div class="game-table-scroll"><table class="game-data-table"><thead><tr><th>${c.template==='genshin'?'Character':'Name'}</th>${fields.map(f=>`<th>${esc(f)}</th>`).join('')}</tr></thead><tbody>${data.map(i=>`<tr data-game-table-row="${i.id}" data-game-search="${esc(searchText(i))}"><td class="game-table-name">${esc(nameOf(i))}</td>${fields.map(f=>`<td>${esc(i.customFields?.[f]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="game-table-hint">Swipe sideways to see all columns · tap a row for details</div>`;
  list.parentNode.insertBefore(wrap,list.nextSibling);

  wrap.querySelectorAll('[data-game-table-row]').forEach(row=>row.onclick=()=>{
    const card=root.querySelector(`[data-game-entry="${CSS.escape(row.dataset.gameTableRow)}"]`);
    if(card)card.click();
  });
  toolbar.querySelectorAll('[data-game-view]').forEach(btn=>btn.onclick=()=>setMode(c,btn.dataset.gameView,root));
  const input=$('#gameEntrySearch');
  if(input)input.addEventListener('input',()=>applySearch(root));

  setMode(c,c.gameViewMode==='table'?'table':'cards',root);
  applySearch(root);
}

let scheduled=false;
function enhance(){
  scheduled=false;
  if(state.route!=='game')return;
  const c=collectionFor(state.collectionId);if(!isGame(c))return;
  const root=document.querySelector('.game-tracker-page');if(root)buildTable(c,root);
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(enhance)}
document.addEventListener('DOMContentLoaded',()=>{
  schedule();
  new MutationObserver(schedule).observe($('#mainContent')||document.body,{childList:true,subtree:true});
});
})();