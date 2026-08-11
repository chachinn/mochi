/* Mochi Build 1 — offline-first vanilla PWA */
'use strict';

const DB_NAME = 'mochi-db';
const DB_VERSION = 1;
const STORES = { collections: 'collections', items: 'items', settings: 'settings' };
const STATUS = ['Owned', 'Ordered', 'Wishlist', 'Sold'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const EMOJIS = ['🍡','🧸','🎴','📚','🎮','🌸','✨','🧁','🎀','🪄','💿','🧸','🃏','🛍️','🎁','🧋'];

const state = {
  route: 'home',
  collections: [],
  items: [],
  settings: { displayName: '', monthlyBudget: 0, currency: '₱', huntMode: false },
  collectionId: null,
  query: '',
  filterStatus: 'All',
  sort: 'newest'
};

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const money = n => `${state.settings.currency || '₱'}${Number(n || 0).toLocaleString(undefined,{maximumFractionDigits:2})}`;
const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const uid = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const fmtDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : '—';
const todayISO = () => new Date().toISOString().slice(0,10);

function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORES.collections)) db.createObjectStore(STORES.collections,{keyPath:'id'});
      if(!db.objectStoreNames.contains(STORES.items)) db.createObjectStore(STORES.items,{keyPath:'id'});
      if(!db.objectStoreNames.contains(STORES.settings)) db.createObjectStore(STORES.settings,{keyPath:'key'});
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeGetAll(name){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const req = db.transaction(name,'readonly').objectStore(name).getAll();
    req.onsuccess=()=>resolve(req.result||[]); req.onerror=()=>reject(req.error);
  });
}
async function storePut(name,value){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(name,'readwrite').objectStore(name).put(value);
    req.onsuccess=()=>resolve(value); req.onerror=()=>reject(req.error);
  });
}
async function storeDelete(name,key){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(name,'readwrite').objectStore(name).delete(key);
    req.onsuccess=()=>resolve(); req.onerror=()=>reject(req.error);
  });
}
async function storeClear(name){
  const db=await openDB();
  return new Promise((resolve,reject)=>{ const req=db.transaction(name,'readwrite').objectStore(name).clear(); req.onsuccess=resolve; req.onerror=()=>reject(req.error); });
}

async function loadData(){
  state.collections = (await storeGetAll(STORES.collections)).filter(x=>!x.archived).sort((a,b)=>(a.order||0)-(b.order||0));
  state.items = (await storeGetAll(STORES.items)).filter(x=>!x.archived);
  const settingsRows = await storeGetAll(STORES.settings);
  settingsRows.forEach(r => state.settings[r.key]=r.value);
}
async function saveSetting(key,value){ state.settings[key]=value; await storePut(STORES.settings,{key,value}); }

function collectionFor(id){ return state.collections.find(c=>c.id===id); }
function itemsForCollection(id){ return state.items.filter(i=>i.collectionId===id); }
function collectionCount(id){ return itemsForCollection(id).filter(i=>i.status!=='Sold').length; }
function ownedItems(){ return state.items.filter(i=>i.status==='Owned'); }
function wishlistItems(){ return state.items.filter(i=>i.status==='Wishlist'||i.status==='Ordered'); }
function totalSpent(items=state.items){ return items.filter(i=>i.status==='Owned'||i.status==='Sold').reduce((a,i)=>a+Number(i.pricePaid||0),0); }
function monthSpent(){ const m=new Date().toISOString().slice(0,7); return state.items.filter(i=>(i.dateAcquired||'').startsWith(m)).reduce((a,i)=>a+Number(i.pricePaid||0),0); }

function updateGreeting(){
  const h=new Date().getHours();
  const period=h<12?'good morning':h<18?'good afternoon':'good evening';
  $('#greeting').textContent = state.settings.displayName ? `${period}, ${state.settings.displayName} ♡` : `${period} ♡`;
}

function setRoute(route, extra={}){
  state.route=route;
  if(extra.collectionId !== undefined) state.collectionId=extra.collectionId;
  $$('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.route===route || (route==='collection'&&b.dataset.route==='collections')));
  window.scrollTo({top:0,behavior:'instant'});
  render();
}

function render(){
  updateGreeting();
  const root=$('#mainContent');
  if(state.route==='home') root.innerHTML=renderHome();
  else if(state.route==='collections') root.innerHTML=renderCollections();
  else if(state.route==='collection') root.innerHTML=renderCollectionDetail();
  else if(state.route==='wishlist') root.innerHTML=renderWishlist();
  else if(state.route==='me') root.innerHTML=renderMe();
  else root.innerHTML=renderHome();
  bindDynamicEvents();
}

function renderHome(){
  const owned=ownedItems();
  const recent=[...state.items].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,10);
  const hunted=state.items.filter(i=>i.status==='Wishlist').slice(0,8);
  return `
    <section class="stat-grid">
      <div class="stat-card"><div class="stat-icon">🎁</div><div><div class="stat-number">${owned.length}</div><div class="stat-label">items</div></div></div>
      <div class="stat-card"><div class="stat-icon">▣</div><div><div class="stat-number">${state.collections.length}</div><div class="stat-label">collections</div></div></div>
    </section>

    <section class="section">
      <div class="section-head"><h2 class="section-title">My Shelf</h2><button class="link-btn" data-route-link="collections">view all</button></div>
      ${state.items.length ? renderShelf(recent) : `<div class="empty"><div class="empty-art">🍡</div><h3>Your shelf is waiting</h3><p>Add your first collectible and Mochi will start building your little digital shelf.</p><button class="soft-btn primary" data-action="add-item">+ Add first item</button></div>`}
    </section>

    <section class="section">
      <div class="section-head"><h2 class="section-title">My Collections</h2><button class="link-btn" data-action="add-collection">+ add</button></div>
      ${state.collections.length ? `<div class="collection-grid">${state.collections.slice(0,6).map(renderCollectionCard).join('')}</div>` : `<div class="empty"><div class="empty-art">🧺</div><h3>No collections yet</h3><p>Create categories like Manga, Plushies, Photocards, Games, Japan Finds, or anything you love.</p><button class="soft-btn primary" data-action="add-collection">Create collection</button></div>`}
    </section>

    <section class="section">
      <div class="section-head"><h2 class="section-title">Currently Hunting 👀</h2><button class="link-btn" data-route-link="wishlist">view all</button></div>
      <div class="h-scroll">
        ${hunted.length ? hunted.map(renderMiniItem).join('') : `<button class="item-mini" data-action="add-item" style="border:0;background:transparent;text-align:left"><div class="item-mini-empty">＋</div><div class="item-mini-name">Add wishlist item</div><div class="item-mini-sub">start your hunt</div></button>`}
      </div>
    </section>
    ${budgetPanel()}
  `;
}

function renderShelf(items){
  const visible=items.slice(0,10);
  const row1=visible.slice(0,5), row2=visible.slice(5,10);
  const obj=i=>`<button class="shelf-object" data-item-id="${i.id}" style="border:0;background:transparent;padding:0;cursor:pointer">${i.photo?`<img src="${i.photo}" alt="${esc(i.name)}">`:`<div class="shelf-placeholder">${esc(collectionFor(i.collectionId)?.emoji||'🍡')}</div>`}</button>`;
  return `<div class="shelf"><div class="shelf-row">${row1.map(obj).join('')}</div>${row2.length?`<div class="shelf-row">${row2.map(obj).join('')}</div>`:''}</div>`;
}

function renderCollectionCard(c){
  return `<button class="collection-card" data-collection-id="${c.id}" type="button"><span class="collection-emoji">${esc(c.emoji||'🍡')}</span><span class="collection-meta"><span class="collection-name">${esc(c.name)}</span><span class="collection-count">${collectionCount(c.id)} items</span></span><span class="chev">›</span></button>`;
}

function renderMiniItem(i){
  return `<button class="item-mini" data-item-id="${i.id}" type="button" style="border:0;background:transparent;padding:0;text-align:left;cursor:pointer">
    ${i.photo?`<img class="item-mini-photo" src="${i.photo}" alt="${esc(i.name)}">`:`<div class="item-mini-empty">${esc(collectionFor(i.collectionId)?.emoji||'🍡')}</div>`}
    <span class="heart-dot">♡</span><div class="item-mini-name">${esc(i.name)}</div><div class="item-mini-sub">${money(i.targetPrice||i.pricePaid||0)}</div>
  </button>`;
}

function renderCollections(){
  return `<div class="page-title-row"><h2 class="page-title">Collections</h2><button class="soft-btn primary" data-action="add-collection">+ New</button></div>
    <div class="toolbar"><div class="searchbar"><span>⌕</span><input id="collectionSearch" placeholder="Search collections" value="${esc(state.query)}"></div></div>
    ${filteredCollections().length?`<div class="collection-grid">${filteredCollections().map(renderCollectionCard).join('')}</div>`:`<div class="empty"><div class="empty-art">🧺</div><h3>Nothing here yet</h3><p>Create your first collection and start cataloging.</p><button class="soft-btn primary" data-action="add-collection">Create collection</button></div>`}`;
}
function filteredCollections(){ const q=state.query.trim().toLowerCase(); return !q?state.collections:state.collections.filter(c=>`${c.name} ${c.description||''}`.toLowerCase().includes(q)); }

function renderCollectionDetail(){
  const c=collectionFor(state.collectionId);
  if(!c){ state.route='collections'; return renderCollections(); }
  let items=itemsForCollection(c.id);
  if(state.query.trim()){ const q=state.query.toLowerCase(); items=items.filter(i=>`${i.name} ${i.series||''} ${i.character||''} ${i.tags||''}`.toLowerCase().includes(q)); }
  if(state.filterStatus!=='All') items=items.filter(i=>i.status===state.filterStatus);
  items=sortItems(items);
  const completion = c.setTotal ? Math.min(100,Math.round((items.filter(i=>i.status==='Owned').length/Number(c.setTotal))*100)) : null;
  return `<div class="page-title-row"><div><button class="link-btn" data-route-link="collections">‹ Collections</button><h2 class="page-title">${esc(c.emoji||'🍡')} ${esc(c.name)}</h2><div class="tiny muted">${itemsForCollection(c.id).length} items</div></div><button class="icon-btn" data-action="collection-menu" aria-label="Collection menu">•••</button></div>
    ${c.description?`<p class="muted" style="font-size:13px">${esc(c.description)}</p>`:''}
    ${completion!==null?`<div class="panel"><div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:8px"><strong>Set Completion</strong><span class="tiny muted">${itemsForCollection(c.id).filter(i=>i.status==='Owned').length}/${Number(c.setTotal)}</span></div><div class="progress-track"><div class="progress-bar" style="width:${completion}%"></div></div><div class="tiny muted" style="margin-top:6px">${completion}% complete</div></div>`:''}
    <div class="toolbar"><div class="searchbar"><span>⌕</span><input id="itemSearch" placeholder="Search this collection" value="${esc(state.query)}"></div></div>
    <div class="toolbar">${['All',...STATUS].map(s=>`<button class="chip ${state.filterStatus===s?'active':''}" data-status-filter="${s}">${s}</button>`).join('')}<select id="sortSelect" class="soft-btn"><option value="newest" ${state.sort==='newest'?'selected':''}>Newest</option><option value="oldest" ${state.sort==='oldest'?'selected':''}>Oldest</option><option value="name" ${state.sort==='name'?'selected':''}>Name A–Z</option><option value="priceHigh" ${state.sort==='priceHigh'?'selected':''}>Price high</option><option value="priceLow" ${state.sort==='priceLow'?'selected':''}>Price low</option></select></div>
    ${items.length?`<div class="item-grid">${items.map(renderItemCard).join('')}</div>`:`<div class="empty"><div class="empty-art">✨</div><h3>No matching items</h3><p>Add something to ${esc(c.name)} or change your filters.</p><button class="soft-btn primary" data-action="add-item" data-default-collection="${c.id}">+ Add item</button></div>`}`;
}

function sortItems(items){
  const arr=[...items];
  if(state.sort==='oldest') return arr.sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));
  if(state.sort==='name') return arr.sort((a,b)=>a.name.localeCompare(b.name));
  if(state.sort==='priceHigh') return arr.sort((a,b)=>Number(b.pricePaid||b.targetPrice||0)-Number(a.pricePaid||a.targetPrice||0));
  if(state.sort==='priceLow') return arr.sort((a,b)=>Number(a.pricePaid||a.targetPrice||0)-Number(b.pricePaid||b.targetPrice||0));
  return arr.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
}

function renderItemCard(i){
  return `<button class="item-card" data-item-id="${i.id}" type="button" style="padding:0;text-align:left">
    ${i.photo?`<img class="item-photo" src="${i.photo}" alt="${esc(i.name)}">`:`<div class="item-photo-placeholder">${esc(collectionFor(i.collectionId)?.emoji||'🍡')}</div>`}
    <div class="item-card-body"><div class="item-name">${esc(i.name)}</div><div class="item-sub">${esc(i.series||collectionFor(i.collectionId)?.name||'')}</div><div class="badge ${i.status.toLowerCase()}">${esc(i.status)}</div></div>
  </button>`;
}

function renderWishlist(){
  let items=wishlistItems();
  if(state.filterStatus==='Wishlist') items=items.filter(i=>i.status==='Wishlist');
  if(state.filterStatus==='Ordered') items=items.filter(i=>i.status==='Ordered');
  items=sortItems(items);
  return `<div class="page-title-row"><h2 class="page-title">🛍️ Wishlist</h2><button class="soft-btn primary" data-action="add-wishlist">+ Add</button></div>
    <div class="toolbar">${['All','Wishlist','Ordered'].map(s=>`<button class="chip ${state.filterStatus===s?'active':''}" data-status-filter="${s}">${s}</button>`).join('')}<button class="chip ${state.settings.huntMode?'active':''}" data-action="toggle-hunt">🎯 Hunt Mode</button></div>
    ${state.settings.huntMode?`<div class="panel"><h3>🎯 Hunt Mode is on</h3><div class="tiny muted">Fast shopping view: priority, reference photo, target price, and collection only.</div></div>`:''}
    ${items.length?items.map(i=>`<button class="list-card" data-item-id="${i.id}" type="button" style="width:100%;text-align:left;cursor:pointer">${i.photo?`<img class="list-thumb" src="${i.photo}" alt="">`:`<span class="list-thumb placeholder">${esc(collectionFor(i.collectionId)?.emoji||'🍡')}</span>`}<span class="list-info"><span class="list-title">${esc(i.name)}</span><span class="list-sub">${esc(i.series||collectionFor(i.collectionId)?.name||'')}</span><span class="list-price">${money(i.targetPrice||i.pricePaid||0)}</span></span><span class="priority-pill">${esc(i.priority||'Medium')}</span></button>`).join(''):`<div class="empty"><div class="empty-art">👀</div><h3>Your hunt list is empty</h3><p>Add items you’re looking for so you can pull them up quickly while shopping.</p><button class="soft-btn primary" data-action="add-wishlist">Add wishlist item</button></div>`}`;
}

function renderMe(){
  const owned=ownedItems();
  const spent=totalSpent();
  const byCollection=[...state.collections].map(c=>({c,n:itemsForCollection(c.id).filter(i=>i.status==='Owned').length})).sort((a,b)=>b.n-a.n)[0];
  return `<div class="page-title-row"><h2 class="page-title">My Mochi</h2><button class="icon-btn" data-action="settings">⚙︎</button></div>
    <section class="panel" style="margin-top:14px;background:linear-gradient(145deg,#fff0ed,#fff8f1)"><h3>🍡 Your Collection</h3><div class="stats-list"><div class="stats-chip"><b>${owned.length}</b><span>items collected</span></div><div class="stats-chip"><b>${money(spent)}</b><span>total spent</span></div><div class="stats-chip"><b>${state.collections.length}</b><span>collections</span></div><div class="stats-chip"><b>${wishlistItems().length}</b><span>currently hunting</span></div></div></section>
    ${byCollection&&byCollection.n?`<section class="panel"><h3>🏅 Most Collected</h3><div class="list-card" style="margin:0"><span class="collection-emoji">${esc(byCollection.c.emoji||'🍡')}</span><span class="list-info"><span class="list-title">${esc(byCollection.c.name)}</span><span class="list-sub">${byCollection.n} owned items</span></span></div></section>`:''}
    ${budgetPanel(true)}
    <section class="panel"><h3>Little Mochi Tools</h3><div class="tool-grid">
      <button class="tool-card" data-action="random-treasure"><strong>🎲 Random Treasure</strong><small>Resurface one item from your collection.</small></button>
      <button class="tool-card" data-action="mystery-summary"><strong>🎁 Mystery Pulls</strong><small>See items marked as blind-box or gachapon pulls.</small></button>
      <button class="tool-card" data-action="export-json"><strong>↗ Backup JSON</strong><small>Save a complete portable Mochi backup.</small></button>
      <button class="tool-card" data-action="export-csv"><strong>▤ Export CSV</strong><small>Export your item catalog as a spreadsheet-friendly file.</small></button>
      <button class="tool-card" data-action="import-json"><strong>↙ Import Backup</strong><small>Restore a Mochi JSON backup on this device.</small></button>
      <button class="tool-card" data-action="about-build"><strong>♡ Build 1</strong><small>Offline-first personal collection tracker.</small></button>
    </div></section>`;
}

function budgetPanel(full=false){
  const budget=Number(state.settings.monthlyBudget||0); if(!budget&&!full) return '';
  const spent=monthSpent(); const pct=budget?Math.min(100,Math.round(spent/budget*100)):0;
  return `<section class="section ${full?'panel':''}"><div class="section-head"><h2 class="section-title">Monthly Collection Budget</h2>${full?`<button class="link-btn" data-action="settings">edit</button>`:''}</div>${budget?`<div class="progress-track"><div class="progress-bar" style="width:${pct}%"></div></div><div style="display:flex;justify-content:space-between;margin-top:7px" class="tiny muted"><span>${money(spent)} spent</span><span>${money(budget)} budget</span></div>`:`<div class="tiny muted">Set a monthly budget in Settings if you want Mochi to keep an eye on your collecting spend.</div>`}</section>`;
}

function bindDynamicEvents(){
  $$('[data-route-link]').forEach(b=>b.onclick=()=>{ state.query=''; state.filterStatus='All'; setRoute(b.dataset.routeLink); });
  $$('[data-collection-id]').forEach(b=>b.onclick=()=>{ state.query=''; state.filterStatus='All'; setRoute('collection',{collectionId:b.dataset.collectionId}); });
  $$('[data-item-id]').forEach(b=>b.onclick=()=>openItemDetail(b.dataset.itemId));
  $$('[data-action]').forEach(b=>b.onclick=()=>handleAction(b.dataset.action,b));
  $$('[data-status-filter]').forEach(b=>b.onclick=()=>{state.filterStatus=b.dataset.statusFilter;render();});
  const cs=$('#collectionSearch'); if(cs) cs.oninput=e=>{state.query=e.target.value; render();};
  const is=$('#itemSearch'); if(is) is.oninput=e=>{state.query=e.target.value; render();};
  const sort=$('#sortSelect'); if(sort) sort.onchange=e=>{state.sort=e.target.value;render();};
}

function handleAction(action, el){
  if(action==='add-collection') openCollectionForm();
  if(action==='add-item') openItemForm(null, el?.dataset.defaultCollection || state.collectionId || '');
  if(action==='add-wishlist') openItemForm(null,'','Wishlist');
  if(action==='collection-menu') openCollectionMenu();
  if(action==='toggle-hunt'){ saveSetting('huntMode',!state.settings.huntMode).then(render); }
  if(action==='settings') openSettings();
  if(action==='random-treasure') randomTreasure();
  if(action==='mystery-summary') openMysterySummary();
  if(action==='export-json') exportJSON();
  if(action==='export-csv') exportCSV();
  if(action==='import-json') $('#importInput').click();
  if(action==='about-build') showToast('Mochi Build 1 • local-first • no account required ♡','success');
}

function openModal(html){
  $('#modalRoot').innerHTML=`<div class="modal-backdrop" id="modalBackdrop"><section class="modal"><div class="modal-handle"></div>${html}</section></div>`;
  $('#modalBackdrop').addEventListener('click',e=>{ if(e.target.id==='modalBackdrop') closeModal(); });
  $$('[data-close-modal]').forEach(b=>b.onclick=closeModal);
}
function closeModal(){ $('#modalRoot').innerHTML=''; }
function modalHead(title){ return `<div class="modal-head"><h2 class="modal-title">${title}</h2><button class="close-btn" data-close-modal type="button">×</button></div>`; }

function openCollectionForm(existing=null){
  const c=existing||{name:'',emoji:'🍡',description:'',setTotal:''};
  openModal(`${modalHead(existing?'Edit Collection':'New Collection')}<form id="collectionForm" class="form-grid">
    <div class="field"><label>Name *</label><input name="name" maxlength="60" required value="${esc(c.name)}" placeholder="e.g. Photocards"></div>
    <div class="field-row"><div class="field"><label>Icon</label><select name="emoji">${EMOJIS.map(e=>`<option ${e===c.emoji?'selected':''}>${e}</option>`).join('')}</select></div><div class="field"><label>Set total (optional)</label><input name="setTotal" type="number" min="0" step="1" value="${esc(c.setTotal||'')}" placeholder="e.g. 12"></div></div>
    <div class="field"><label>Description</label><textarea name="description" maxlength="280" placeholder="What lives in this collection?">${esc(c.description||'')}</textarea></div>
    <div class="form-actions"><button type="button" class="soft-btn" data-close-modal>Cancel</button><button class="soft-btn primary" type="submit">Save collection</button></div>
  </form>`);
  $('#collectionForm').onsubmit=async e=>{
    e.preventDefault(); const fd=new FormData(e.currentTarget); const name=fd.get('name').trim();
    if(!name) return;
    const duplicate=state.collections.find(x=>x.name.toLowerCase()===name.toLowerCase()&&x.id!==existing?.id);
    if(duplicate){ showToast('You already have a collection with that name.','error'); return; }
    const record={...(existing||{}),id:existing?.id||uid('col'),name,emoji:fd.get('emoji'),description:fd.get('description').trim(),setTotal:Number(fd.get('setTotal')||0)||'',order:existing?.order??state.collections.length,createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),archived:false};
    await storePut(STORES.collections,record); await loadData(); closeModal(); render(); showToast(existing?'Collection updated ♡':'Collection created ♡','success');
  };
}

function itemCollectionOptions(selected=''){ return `<option value="">Choose collection</option>${state.collections.map(c=>`<option value="${c.id}" ${selected===c.id?'selected':''}>${esc(c.emoji||'🍡')} ${esc(c.name)}</option>`).join('')}`; }

function openItemForm(existing=null, defaultCollection='', forcedStatus=''){
  if(!state.collections.length){ showToast('Create a collection first so Mochi knows where to put the item.','error'); openCollectionForm(); return; }
  const i=existing||{name:'',collectionId:defaultCollection,status:forcedStatus||'Owned',series:'',character:'',pricePaid:'',targetPrice:'',dateAcquired:todayISO(),store:'',condition:'',notes:'',tags:'',priority:'Medium',photo:'',mysteryPull:false,custom1Label:'',custom1Value:''};
  openModal(`${modalHead(existing?'Edit Item':'Add Item')}<form id="itemForm" class="form-grid">
    <label class="photo-picker"><input id="photoInput" type="file" accept="image/*"><div id="photoPreview">${i.photo?`<img src="${i.photo}" alt="Preview">`:`<div class="photo-copy"><b>＋</b>Add a photo<br><span class="tiny">stored locally on this device</span></div>`}</div></label>
    <div class="field"><label>Item name *</label><input name="name" maxlength="100" required value="${esc(i.name)}" placeholder="e.g. Gojo Satoru Nendoroid"></div>
    <div class="field-row"><div class="field"><label>Collection *</label><select name="collectionId" required>${itemCollectionOptions(i.collectionId)}</select></div><div class="field"><label>Status</label><select name="status">${STATUS.map(s=>`<option ${s===i.status?'selected':''}>${s}</option>`).join('')}</select></div></div>
    <div class="field-row"><div class="field"><label>Series / Franchise</label><input name="series" value="${esc(i.series||'')}" placeholder="Jujutsu Kaisen"></div><div class="field"><label>Character / Subject</label><input name="character" value="${esc(i.character||'')}" placeholder="Gojo Satoru"></div></div>
    <div class="field-row"><div class="field"><label>Price paid</label><input name="pricePaid" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(i.pricePaid||'')}"></div><div class="field"><label>Target price</label><input name="targetPrice" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(i.targetPrice||'')}"></div></div>
    <div class="field-row"><div class="field"><label>Date acquired</label><input name="dateAcquired" type="date" value="${esc(i.dateAcquired||'')}"></div><div class="field"><label>Priority</label><select name="priority">${PRIORITIES.map(p=>`<option ${p===i.priority?'selected':''}>${p}</option>`).join('')}</select></div></div>
    <div class="field-row"><div class="field"><label>Store / Source</label><input name="store" value="${esc(i.store||'')}" placeholder="AmiAmi"></div><div class="field"><label>Condition</label><input name="condition" value="${esc(i.condition||'')}" placeholder="Like New"></div></div>
    <div class="field"><label>Tags</label><input name="tags" value="${esc(i.tags||'')}" placeholder="figure, japan, limited"></div>
    <div class="field-row"><div class="field"><label>Custom field label</label><input name="custom1Label" value="${esc(i.custom1Label||'')}" placeholder="e.g. Scale"></div><div class="field"><label>Custom field value</label><input name="custom1Value" value="${esc(i.custom1Value||'')}" placeholder="e.g. 1/7"></div></div>
    <div class="field"><label>Memory / Notes</label><textarea name="notes" placeholder="Where you found it, why you love it, little memories…">${esc(i.notes||'')}</textarea></div>
    <label class="field" style="grid-template-columns:auto 1fr;align-items:center"><input name="mysteryPull" type="checkbox" ${i.mysteryPull?'checked':''} style="width:18px;height:18px"><span><b style="font-size:12px">Mystery Pull</b><span class="tiny muted" style="display:block">Blind box, gachapon, card pull, etc.</span></span></label>
    <div class="form-actions"><button type="button" class="soft-btn" data-close-modal>Cancel</button><button class="soft-btn primary" type="submit">Save item</button></div>
  </form>`);
  let newPhoto=i.photo||'';
  $('#photoInput').onchange=async e=>{ const f=e.target.files?.[0]; if(!f)return; try{ newPhoto=await resizeImage(f,1100,.82); $('#photoPreview').innerHTML=`<img src="${newPhoto}" alt="Preview">`; }catch{ showToast('That photo could not be read.','error'); } };
  $('#itemForm').onsubmit=async e=>{
    e.preventDefault(); const fd=new FormData(e.currentTarget); const name=fd.get('name').trim(); const collectionId=fd.get('collectionId');
    const duplicate=state.items.find(x=>x.name.toLowerCase()===name.toLowerCase()&&x.collectionId===collectionId&&x.id!==existing?.id);
    if(duplicate && !confirm(`Mochi found a possible duplicate: “${duplicate.name}”. Add it anyway?`)) return;
    const record={...(existing||{}),id:existing?.id||uid('item'),name,collectionId,status:fd.get('status'),series:fd.get('series').trim(),character:fd.get('character').trim(),pricePaid:Number(fd.get('pricePaid')||0),targetPrice:Number(fd.get('targetPrice')||0),dateAcquired:fd.get('dateAcquired'),store:fd.get('store').trim(),condition:fd.get('condition').trim(),tags:fd.get('tags').trim(),priority:fd.get('priority'),notes:fd.get('notes').trim(),custom1Label:fd.get('custom1Label').trim(),custom1Value:fd.get('custom1Value').trim(),mysteryPull:fd.get('mysteryPull')==='on',photo:newPhoto,createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),archived:false};
    await storePut(STORES.items,record); await loadData(); closeModal(); render(); showToast(existing?'Item updated ♡':'Item added to Mochi ♡','success');
  };
}

function resizeImage(file,max=1100,quality=.82){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader(); reader.onerror=reject; reader.onload=()=>{
      const img=new Image(); img.onerror=reject; img.onload=()=>{
        const scale=Math.min(1,max/Math.max(img.width,img.height)); const w=Math.round(img.width*scale),h=Math.round(img.height*scale);
        const canvas=document.createElement('canvas'); canvas.width=w;canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
        resolve(canvas.toDataURL('image/jpeg',quality));
      }; img.src=reader.result;
    }; reader.readAsDataURL(file);
  });
}

function openItemDetail(id){
  const i=state.items.find(x=>x.id===id); if(!i)return;
  const c=collectionFor(i.collectionId);
  openModal(`${modalHead('Item Details')}${i.photo?`<img class="detail-photo" src="${i.photo}" alt="${esc(i.name)}">`:`<div class="detail-photo item-photo-placeholder">${esc(c?.emoji||'🍡')}</div>`}<h2 style="font-size:20px;margin:14px 0 2px">${esc(i.name)}</h2><div class="muted tiny">${esc(i.series||c?.name||'')}</div>
    <div class="detail-grid">
      ${detailRow('Status',i.status)}${detailRow('Collection',c?.name||'—')}${detailRow('Character',i.character||'—')}${detailRow('Price Paid',money(i.pricePaid||0))}${detailRow('Target Price',money(i.targetPrice||0))}${detailRow('Date Acquired',fmtDate(i.dateAcquired))}${detailRow('Store',i.store||'—')}${detailRow('Condition',i.condition||'—')}${i.custom1Label?detailRow(i.custom1Label,i.custom1Value||'—'):''}${detailRow('Priority',i.priority||'Medium')}${i.mysteryPull?detailRow('Mystery Pull','Yes 🎁'):''}
    </div>${i.notes?`<div class="panel" style="margin-top:13px"><h3>♡ Memory / Notes</h3><div class="muted" style="font-size:12px;line-height:1.55;white-space:pre-wrap">${esc(i.notes)}</div></div>`:''}
    <div class="detail-actions"><button class="mini-btn" id="editItemBtn">Edit</button><button class="mini-btn" id="duplicateItemBtn">Duplicate</button><button class="mini-btn danger" id="deleteItemBtn">Delete</button></div>`);
  $('#editItemBtn').onclick=()=>{closeModal();openItemForm(i)};
  $('#duplicateItemBtn').onclick=async()=>{ const copy={...i,id:uid('item'),name:`${i.name} Copy`,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; await storePut(STORES.items,copy); await loadData(); closeModal(); render(); showToast('Item duplicated ♡','success'); };
  $('#deleteItemBtn').onclick=async()=>{ if(!confirm(`Delete “${i.name}”? This cannot be undone.`))return; await storeDelete(STORES.items,i.id); await loadData(); closeModal(); render(); showToast('Item deleted.'); };
}
function detailRow(label,value){ return `<div class="detail-row"><span>${esc(label)}</span><span>${esc(value)}</span></div>`; }

function openCollectionMenu(){
  const c=collectionFor(state.collectionId); if(!c)return;
  openModal(`${modalHead(esc(c.name))}<div class="form-grid"><button class="soft-btn" id="editCollection">✎ Edit collection</button><button class="soft-btn" id="addCollectionItem">＋ Add item</button><button class="soft-btn danger" id="archiveCollection">Archive collection</button><button class="soft-btn danger" id="deleteCollection">Delete collection & its items</button></div>`);
  $('#editCollection').onclick=()=>{closeModal();openCollectionForm(c)};
  $('#addCollectionItem').onclick=()=>{closeModal();openItemForm(null,c.id)};
  $('#archiveCollection').onclick=async()=>{ if(!confirm(`Archive “${c.name}”? Its items will be hidden too.`))return; await storePut(STORES.collections,{...c,archived:true}); for(const i of itemsForCollection(c.id)) await storePut(STORES.items,{...i,archived:true}); await loadData(); closeModal(); setRoute('collections'); showToast('Collection archived.'); };
  $('#deleteCollection').onclick=async()=>{ if(!confirm(`Permanently delete “${c.name}” and all its items?`))return; for(const i of itemsForCollection(c.id)) await storeDelete(STORES.items,i.id); await storeDelete(STORES.collections,c.id); await loadData(); closeModal(); setRoute('collections'); showToast('Collection deleted.'); };
}

function openSettings(){
  openModal(`${modalHead('Settings')}<form id="settingsForm" class="form-grid"><div class="field"><label>Your name (optional)</label><input name="displayName" maxlength="40" value="${esc(state.settings.displayName||'')}" placeholder="Used only for the greeting"></div><div class="field-row"><div class="field"><label>Currency symbol</label><input name="currency" maxlength="4" value="${esc(state.settings.currency||'₱')}"></div><div class="field"><label>Monthly budget</label><input name="monthlyBudget" type="number" min="0" step="0.01" value="${esc(state.settings.monthlyBudget||'')}"></div></div><div class="form-actions"><button type="button" class="soft-btn" data-close-modal>Cancel</button><button class="soft-btn primary" type="submit">Save</button></div></form><div class="panel" style="margin-top:18px"><h3>Data</h3><button class="soft-btn danger" id="eraseAllBtn" style="width:100%">Erase all Mochi data</button><div class="tiny muted" style="margin-top:8px">Mochi Build 1 stores your collections locally in this browser/device. Use Backup JSON before clearing browser data or moving devices.</div></div>`);
  $('#settingsForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await saveSetting('displayName',fd.get('displayName').trim());await saveSetting('currency',fd.get('currency').trim()||'₱');await saveSetting('monthlyBudget',Number(fd.get('monthlyBudget')||0));closeModal();render();showToast('Settings saved ♡','success');};
  $('#eraseAllBtn').onclick=async()=>{if(!confirm('Erase every collection, item, and setting from Mochi on this device?'))return; if(!confirm('Final check: this cannot be undone unless you have a backup.'))return; await Promise.all([storeClear(STORES.collections),storeClear(STORES.items),storeClear(STORES.settings)]); state.settings={displayName:'',monthlyBudget:0,currency:'₱',huntMode:false}; await loadData();closeModal();setRoute('home');showToast('Mochi has been reset.');};
}

function randomTreasure(){
  const pool=ownedItems(); if(!pool.length){showToast('Add an owned item first, then Mochi can surprise you.','error');return;} const i=pool[Math.floor(Math.random()*pool.length)]; openItemDetail(i.id);
}
function openMysterySummary(){
  const pulls=state.items.filter(i=>i.mysteryPull);
  openModal(`${modalHead('🎁 Mystery Pull Tracker')}${pulls.length?`<div class="panel"><h3>${pulls.length} pulls logged</h3><div class="tiny muted">Mark an item as “Mystery Pull” when adding or editing it.</div></div>${pulls.map(i=>`<button class="list-card mystery-open" data-id="${i.id}" style="width:100%;text-align:left"><span class="list-thumb placeholder">${esc(collectionFor(i.collectionId)?.emoji||'🎁')}</span><span class="list-info"><span class="list-title">${esc(i.name)}</span><span class="list-sub">${esc(collectionFor(i.collectionId)?.name||'')}</span></span></button>`).join('')}`:`<div class="empty"><div class="empty-art">🎁</div><h3>No mystery pulls yet</h3><p>Edit or add an item and turn on “Mystery Pull” for blind boxes, gachapon, cards, or random merch.</p></div>`}`);
  $$('.mystery-open').forEach(b=>b.onclick=()=>{closeModal();openItemDetail(b.dataset.id)});
}

function downloadBlob(filename,content,type){ const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),800); }
function exportJSON(){
  const payload={app:'Mochi',version:1,exportedAt:new Date().toISOString(),collections:state.collections,items:state.items,settings:state.settings}; downloadBlob(`mochi-backup-${todayISO()}.json`,JSON.stringify(payload,null,2),'application/json'); showToast('Backup downloaded ♡','success');
}
function csvCell(v){ const s=String(v??''); return `"${s.replace(/"/g,'""')}"`; }
function exportCSV(){
  const headers=['Name','Collection','Status','Series','Character','Price Paid','Target Price','Date Acquired','Store','Condition','Priority','Tags','Notes','Mystery Pull'];
  const rows=state.items.map(i=>[i.name,collectionFor(i.collectionId)?.name||'',i.status,i.series,i.character,i.pricePaid,i.targetPrice,i.dateAcquired,i.store,i.condition,i.priority,i.tags,i.notes,i.mysteryPull?'Yes':'No']);
  const csv=[headers,...rows].map(r=>r.map(csvCell).join(',')).join('\r\n'); downloadBlob(`mochi-items-${todayISO()}.csv`,`\uFEFF${csv}`,'text/csv;charset=utf-8'); showToast('CSV exported ♡','success');
}

async function importJSONFile(file){
  try{
    const parsed=JSON.parse(await file.text()); if(parsed.app!=='Mochi'||!Array.isArray(parsed.collections)||!Array.isArray(parsed.items)) throw new Error('Invalid backup');
    if(!confirm(`Import ${parsed.collections.length} collections and ${parsed.items.length} items? Existing records with the same IDs will be replaced.`))return;
    for(const c of parsed.collections) await storePut(STORES.collections,c);
    for(const i of parsed.items) await storePut(STORES.items,i);
    for(const [key,value] of Object.entries(parsed.settings||{})) await storePut(STORES.settings,{key,value});
    await loadData(); render(); showToast('Backup restored ♡','success');
  }catch(err){ console.error(err); showToast('That file is not a valid Mochi backup.','error'); }
}

function showToast(msg,type=''){
  const t=document.createElement('div');t.className=`toast ${type}`;t.textContent=msg;$('#toastRoot').appendChild(t);setTimeout(()=>t.remove(),2600);
}

function globalSearch(){
  openModal(`${modalHead('Search Mochi')}<div class="searchbar" style="margin-top:15px"><span>⌕</span><input id="globalSearchInput" autofocus placeholder="Search items, series, characters, tags…"></div><div id="globalSearchResults" style="margin-top:12px"></div>`);
  const input=$('#globalSearchInput'), results=$('#globalSearchResults');
  const run=()=>{const q=input.value.trim().toLowerCase();if(!q){results.innerHTML='<div class="tiny muted" style="padding:10px">Start typing to search your whole collection.</div>';return;} const matches=state.items.filter(i=>`${i.name} ${i.series||''} ${i.character||''} ${i.tags||''} ${collectionFor(i.collectionId)?.name||''}`.toLowerCase().includes(q)).slice(0,30);results.innerHTML=matches.length?matches.map(i=>`<button class="list-card search-result" data-id="${i.id}" style="width:100%;text-align:left"><span class="list-thumb placeholder">${esc(collectionFor(i.collectionId)?.emoji||'🍡')}</span><span class="list-info"><span class="list-title">${esc(i.name)}</span><span class="list-sub">${esc(collectionFor(i.collectionId)?.name||'')}</span></span></button>`).join(''):'<div class="empty"><div class="empty-art">⌕</div><h3>No matches</h3><p>Try another name, character, series, tag, or collection.</p></div>'; $$('.search-result').forEach(b=>b.onclick=()=>{closeModal();openItemDetail(b.dataset.id)});};
  input.oninput=run;run();setTimeout(()=>input.focus(),80);
}

async function init(){
  await loadData();
  updateGreeting(); render();
  $$('.nav-btn').forEach(b=>b.onclick=()=>{state.query='';state.filterStatus='All';setRoute(b.dataset.route)});
  $('#quickAddBtn').onclick=()=>openItemForm(null,state.collectionId||'');
  $('#openSearchBtn').onclick=globalSearch;
  $('#importInput').onchange=e=>{const f=e.target.files?.[0];if(f)importJSONFile(f);e.target.value='';};
  if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.error)); }
}

document.addEventListener('DOMContentLoaded',()=>init().catch(err=>{console.error(err);document.body.innerHTML='<main style="padding:24px;font-family:sans-serif"><h1>Mochi could not start</h1><p>Please refresh the page. If the problem continues, clear this site’s storage and try again.</p></main>';}));
