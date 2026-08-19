/* Mochi — optional cards/table view + sorting for game trackers */
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
function rawValue(i,key){return key==='__name__'?nameOf(i):(i.customFields?.[key]??'')}
function numericValue(value,key){
  const s=String(value??'').trim();
  if(!s)return null;
  if(/level|rarity|constellation|height|click|position/i.test(key)){
    const n=Number((s.match(/-?\d+(?:\.\d+)?/)||[])[0]);
    return Number.isFinite(n)?n:null;
  }
  return null;
}
function compareValues(a,b,key,dir){
  const an=numericValue(a,key),bn=numericValue(b,key),mult=dir==='desc'?-1:1;
  if(an!==null&&bn!==null)return (an-bn)*mult;
  if(an!==null&&bn===null)return -1;
  if(an===null&&bn!==null)return 1;
  return String(a||'').localeCompare(String(b||''),undefined,{numeric:true,sensitivity:'base'})*mult;
}
function sortData(c,data){
  const cfg=c.gameSort&&typeof c.gameSort==='object'?c.gameSort:{key:'__name__',dir:'asc'};
  const key=cfg.key||'__name__',dir=cfg.dir==='desc'?'desc':'asc';
  return data.map((item,index)=>({item,index})).sort((x,y)=>{
    const cmp=compareValues(rawValue(x.item,key),rawValue(y.item,key),key,dir);
    return cmp||x.index-y.index;
  }).map(x=>x.item);
}
function sortLabel(key,dir,c){
  const label=key==='__name__'?(c.template==='genshin'?'Character':'Name'):key;
  return `${label} ${dir==='desc'?'↓':'↑'}`;
}
function sortOptions(c){
  const fields=fieldsForTable(c),nameLabel=c.template==='genshin'?'Character':'Name';
  const choices=[['__name__','asc',`${nameLabel} A–Z`],['__name__','desc',`${nameLabel} Z–A`]];
  fields.forEach(f=>{
    const numeric=/level|rarity|constellation|height|click|position/i.test(f);
    if(numeric){choices.push([f,'desc',`${f} high → low`],[f,'asc',`${f} low → high`]);}
    else{choices.push([f,'asc',`${f} A–Z`],[f,'desc',`${f} Z–A`]);}
  });
  return choices;
}

/* One search controller for BOTH cards and table rows. */
function applySearch(root){
  const input=root.querySelector('#gameEntrySearch')||$('#gameEntrySearch');
  const q=String(input?.value||'').trim().toLowerCase();
  state.query=q;
  let cardMatches=0,tableMatches=0;
  root.querySelectorAll('[data-game-entry]').forEach(card=>{
    const show=!q||String(card.dataset.gameSearch||'').toLowerCase().includes(q);
    card.hidden=!show;
    if(show)cardMatches++;
  });
  root.querySelectorAll('[data-game-table-row]').forEach(row=>{
    const show=!q||String(row.dataset.gameSearch||'').toLowerCase().includes(q);
    row.hidden=!show;
    if(show)tableMatches++;
  });
  const empty=root.querySelector('#gameSearchEmpty');
  const mode=root.dataset.gameViewMode==='table'?'table':'cards';
  const visible=mode==='table'?tableMatches:cardMatches;
  if(empty){
    empty.classList.toggle('hidden',!q||visible>0);
    if(q&&visible===0)empty.textContent=`No matches for “${input.value.trim()}”.`;
  }
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
  applySearch(root);
}

function reorderCards(root,sorted){
  const list=root.querySelector('.game-entry-list');
  if(!list)return;
  const byId=new Map([...list.querySelectorAll('[data-game-entry]')].map(el=>[el.dataset.gameEntry,el]));
  sorted.forEach(i=>{const el=byId.get(i.id);if(el)list.appendChild(el)});
}
function redrawTableBody(c,root,sorted){
  const tbody=root.querySelector('.game-data-table tbody');
  if(!tbody)return;
  const fields=fieldsForTable(c);
  tbody.innerHTML=sorted.map(i=>`<tr data-game-table-row="${i.id}" data-game-search="${esc(searchText(i))}"><td class="game-table-name">${esc(nameOf(i))}</td>${fields.map(f=>`<td>${esc(i.customFields?.[f]??'')}</td>`).join('')}</tr>`).join('');
  tbody.querySelectorAll('[data-game-table-row]').forEach(row=>row.onclick=()=>{
    const card=root.querySelector(`[data-game-entry="${CSS.escape(row.dataset.gameTableRow)}"]`);
    if(card)card.click();
  });
  applySearch(root);
}
async function applySort(c,root,key,dir){
  c.gameSort={key,dir};
  c.updatedAt=new Date().toISOString();
  try{await storePut(STORES.collections,c)}catch(e){console.warn('Could not save game sort preference',e)}
  const sorted=sortData(c,entries(c));
  reorderCards(root,sorted);
  redrawTableBody(c,root,sorted);
  const select=root.querySelector('#gameSortSelect');
  if(select)select.value=`${key}|||${dir}`;
  const badge=root.querySelector('.game-sort-current');
  if(badge)badge.textContent=sortLabel(key,dir,c);
  applySearch(root);
}

function buildTable(c,root){
  if(root.dataset.tableEnhanced==='1')return;
  const list=root.querySelector('.game-entry-list');
  if(!list)return;
  root.dataset.tableEnhanced='1';

  const cfg=c.gameSort&&typeof c.gameSort==='object'?c.gameSort:{key:'__name__',dir:'asc'};
  const toolbar=document.createElement('div');
  toolbar.className='game-view-toolbar';
  toolbar.innerHTML=`<div class="game-view-switch"><button type="button" data-game-view="cards">▤ Cards</button><button type="button" data-game-view="table">▦ Table</button></div><label class="game-sort-control"><span>⇅ Sort</span><select id="gameSortSelect">${sortOptions(c).map(([key,dir,label])=>`<option value="${esc(key)}|||${dir}" ${cfg.key===key&&cfg.dir===dir?'selected':''}>${esc(label)}</option>`).join('')}</select></label>`;
  list.parentNode.insertBefore(toolbar,list);

  const fields=fieldsForTable(c),data=sortData(c,entries(c));
  reorderCards(root,data);
  const wrap=document.createElement('div');
  wrap.className='game-table-wrap';
  wrap.innerHTML=`<div class="game-table-scroll"><table class="game-data-table"><thead><tr><th>${c.template==='genshin'?'Character':'Name'}</th>${fields.map(f=>`<th>${esc(f)}</th>`).join('')}</tr></thead><tbody>${data.map(i=>`<tr data-game-table-row="${i.id}" data-game-search="${esc(searchText(i))}"><td class="game-table-name">${esc(nameOf(i))}</td>${fields.map(f=>`<td>${esc(i.customFields?.[f]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="game-table-footer"><span>Swipe sideways to see all columns · tap a row for details</span><span class="game-sort-current">${esc(sortLabel(cfg.key,cfg.dir,c))}</span></div>`;
  list.parentNode.insertBefore(wrap,list.nextSibling);

  wrap.querySelectorAll('[data-game-table-row]').forEach(row=>row.onclick=()=>{
    const card=root.querySelector(`[data-game-entry="${CSS.escape(row.dataset.gameTableRow)}"]`);
    if(card)card.click();
  });
  toolbar.querySelectorAll('[data-game-view]').forEach(btn=>btn.onclick=()=>setMode(c,btn.dataset.gameView,root));
  const sort=toolbar.querySelector('#gameSortSelect');
  if(sort)sort.onchange=()=>{const [key,dir]=sort.value.split('|||');applySort(c,root,key,dir)};

  /* Own the input handler here so search cannot be split between older and newer game UI modules. */
  const input=root.querySelector('#gameEntrySearch')||$('#gameEntrySearch');
  if(input){
    input.oninput=()=>applySearch(root);
    input.onsearch=()=>applySearch(root);
  }

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