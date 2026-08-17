/* Mochi Games Hub — dedicated game-tracker experience */
(function(){
'use strict';

const groups={
  'Character & Gacha':['Genshin Impact','Honkai: Star Rail','Zenless Zone Zero','Wuthering Waves','Honkai Impact 3rd','Arknights','Arknights: Endfield','Fate/Grand Order','Blue Archive','Goddess of Victory: NIKKE',"Girls' Frontline","Girls' Frontline 2: Exilium",'Reverse: 1999','Love and Deepspace','Infinity Nikki','Punishing: Gray Raven','Azur Lane','Epic Seven','Guardian Tales','Path to Nowhere','Limbus Company','Brown Dust 2','AFK Journey','AFK Arena','Eversoul','Tower of Fantasy','Aether Gazer','Granblue Fantasy','Fire Emblem Heroes','Pokémon Masters EX','Pokémon TCG Pocket','Persona 5: The Phantom X','CookieRun: Kingdom','Dislyte','Summoners War','Sword of Convallaria','Another Eden','Last Cloudia','Octopath Traveler: Champions of the Continent','Dragon Ball Legends','Dragon Ball Z Dokkan Battle','One Piece Treasure Cruise','The Seven Deadly Sins: Grand Cross','Bleach: Brave Souls','Yu-Gi-Oh! Master Duel'],
  'Life, Cozy & Roster':['Tomodachi Life: Living the Dream','Tomodachi Life','Animal Crossing: New Horizons','Disney Dreamlight Valley','Stardew Valley','The Sims 4','The Sims 3','Fields of Mistria','Coral Island','Palia','Story of Seasons','Harvest Moon','Rune Factory','My Time at Sandrock','My Time at Portia','Cozy Grove','Hello Kitty Island Adventure','Disney Magical World','Miitopia','Fantasy Life','Pokémon Pokopia','Ooblets','Dinkum','Spiritfarer'],
  'Creatures & Pokédex':['Pokémon Scarlet & Violet','Pokémon Legends: Z-A','Pokémon Legends: Arceus','Pokémon Sword & Shield','Pokémon Brilliant Diamond & Shining Pearl',"Pokémon Let's Go Pikachu/Eevee",'Pokémon HOME','Pokémon GO','Pokémon TCG Live','Palworld','Digimon Story: Cyber Sleuth','Digimon Survive','Monster Hunter Stories','Monster Hunter Stories 2','Temtem'],
  'RPG, Party & Completion':['Persona 3 Reload','Persona 4 Golden','Persona 5 Royal','Metaphor: ReFantazio','Final Fantasy VII Remake','Final Fantasy VII Rebirth','Final Fantasy XIV','Final Fantasy XVI','Xenoblade Chronicles','Xenoblade Chronicles 2','Xenoblade Chronicles 3','Fire Emblem: Three Houses','Fire Emblem Engage','Dragon Quest XI','Octopath Traveler','Octopath Traveler II','NieR: Automata','Kingdom Hearts','Baldur’s Gate 3','Elden Ring','The Legend of Zelda: Tears of the Kingdom','The Legend of Zelda: Breath of the Wild','Monster Hunter Wilds','Monster Hunter Rise','Monster Hunter World'],
  'Competitive, Cards & Live Service':['Marvel Rivals','Overwatch 2','Valorant','League of Legends','Teamfight Tactics','Fortnite','Apex Legends','Hearthstone','Magic: The Gathering Arena','Marvel Snap','Pokémon UNITE','Splatoon 3','Super Smash Bros. Ultimate']
};
const presets=[];
Object.entries(groups).forEach(([category,names])=>names.forEach(name=>presets.push({name,category})));

function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function typeFor(name){
  if(name==='Genshin Impact')return'genshin';
  if(name==='Tomodachi Life: Living the Dream')return'tomodachi-living-the-dream';
  if(/pokémon|palworld|digimon|temtem/i.test(name))return'creature';
  if(/animal crossing|stardew|sims|dreamlight|mii|tomodachi|cozy|palia|story of seasons|harvest moon/i.test(name))return'roster';
  if(/honkai|zenless|wuthering|arknights|fate|blue archive|nikke|azur|epic seven|granblue|fire emblem heroes/i.test(name))return'character';
  return'custom-game';
}
const fieldSets={
  character:['Character','Rarity','Role','Level','Status'],
  creature:['Name','Species','Form','Level','Status'],
  roster:['Name','Type','Personality','Status'],
  'custom-game':['Name','Category','Status']
};
function fieldsFor(name){
  const t=typeFor(name);
  if(t==='genshin')return['Element','Rarity','Weapon','Role','Nation','Constellation','Level'];
  if(t==='tomodachi-living-the-dream')return['Source Character','Source Series / Anime / Game','Island Personality','Canon Height (cm)'];
  return fieldSets[t]||fieldSets['custom-game'];
}
function templateFor(name){if(name==='Genshin Impact')return'genshin';if(name==='Tomodachi Life: Living the Dream')return'tomodachi';return'custom'}
function emojiFor(type){return type==='genshin'?'✨':type==='tomodachi-living-the-dream'?'🏝️':type==='creature'?'🐾':type==='roster'?'🏡':type==='character'?'⭐':'🎮'}
function isGame(c){return !!c&&(c.isGame||c.template==='genshin'||c.template==='tomodachi')}
function gameCollections(){return state.collections.filter(isGame)}
function physicalCollections(){return state.collections.filter(c=>!isGame(c))}
function gameLabel(c){return c.gamePreset||c.name}
function gameEntries(c){return state.items.filter(i=>i.collectionId===c.id&&!i.archived)}
function isGameEntry(i){return !!i&&isGame(collectionFor(i.collectionId))}
function physicalItems(){return state.items.filter(i=>!isGameEntry(i))}

function withPhysicalState(fn){
  const allCollections=state.collections,allItems=state.items;
  state.collections=physicalCollections();
  state.items=allItems.filter(i=>!isGame(allCollections.find(c=>c.id===i.collectionId)));
  try{return fn()}finally{state.collections=allCollections;state.items=allItems}
}

function renderGameCard(c){
  const count=gameEntries(c).length;
  return `<button class="game-library-card" data-game-collection="${c.id}"><span class="game-library-icon">${esc(c.emoji||'🎮')}</span><span><b>${esc(gameLabel(c))}</b><small>${count} tracked entr${count===1?'y':'ies'} · ${esc(String(c.gameType||'custom game').replaceAll('-',' '))}</small></span><span>›</span></button>`;
}
function renderGames(){
  const mine=gameCollections();
  return `<div class="games-page"><div class="page-title-row"><div><div class="eyebrow">GAME TRACKERS</div><h2 class="page-title">Games</h2></div><button class="soft-btn primary" id="addGameBtn">+ Add Game</button></div><section class="games-hero"><h2>Your game library</h2><p>Each game gets its own tracker. Physical inventory stays in Collections; characters, rosters, creatures and game progress live here.</p></section>${mine.length?`<div class="game-library-list">${mine.map(renderGameCard).join('')}</div>`:`<div class="game-empty panel"><div class="game-empty-icon">🎮</div><h3>No games added yet</h3><p>Choose a game preset or create a custom tracker. Nothing is pre-populated.</p><button class="soft-btn primary" id="emptyAddGameBtn">Choose a game</button></div>`}</div>`;
}
function drawPresetPicker(){
  const root=$('#gamePresetResults'),q=String($('#gamePresetSearch')?.value||'').trim().toLowerCase();
  if(!root)return;
  root.innerHTML=Object.entries(groups).map(([cat,names])=>{
    const matches=names.filter(n=>!q||n.toLowerCase().includes(q)||cat.toLowerCase().includes(q));
    if(!matches.length)return'';
    return `<div class="game-category">${esc(cat)}</div><div class="game-preset-grid">${matches.map(n=>`<button class="game-preset" data-game-preset="${esc(n)}"><b>${esc(n)}</b><small>${esc(typeFor(n).replaceAll('-',' '))}</small></button>`).join('')}</div>`;
  }).join('')||'<div class="game-empty"><p>No matching preset. You can still make a Custom Game.</p></div>';
  $$('[data-game-preset]',root).forEach(b=>b.onclick=()=>createGameCollection(b.dataset.gamePreset));
}
function openGamePicker(){
  openModal(`${modalHead('🎮 Add Game')}<p class="validation-note">Choose a preset for useful starting fields, or create a completely custom tracker. Nothing is pre-added.</p><input id="gamePresetSearch" class="game-search" placeholder="Search 100+ games…"><button id="customGameBtn" class="soft-btn" style="width:100%;margin-bottom:10px">＋ Custom Game</button><div id="gamePresetResults"></div>`);
  $('#gamePresetSearch').oninput=drawPresetPicker;
  $('#customGameBtn').onclick=openCustomGameForm;
  drawPresetPicker();
}
async function createGameCollection(name){
  if(gameCollections().some(c=>gameLabel(c).toLowerCase()===String(name).toLowerCase()))return showToast(`${name} is already in your Games.`,'error');
  const type=typeFor(name),rec={
    id:uid('col'),name,gamePreset:name,isGame:true,gameType:type,emoji:emojiFor(type),template:templateFor(name),
    color:COLORS[state.collections.length%COLORS.length],cover:'',description:`${name} game tracker`,parentId:'',
    setTotal:'',setMembers:[],customFieldLabels:fieldsFor(name),order:state.collections.length,
    createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),archived:false
  };
  if(name==='Genshin Impact'&&window.MochiGenshin)window.MochiGenshin.ensure(rec);
  if(name==='Tomodachi Life: Living the Dream'&&window.MochiTomodachi){
    rec.heightMinCm=window.MochiTomodachi.DEFAULT_MIN;
    rec.heightMaxCm=window.MochiTomodachi.DEFAULT_MAX;
    rec.heightSliderMaxPosition=window.MochiTomodachi.DEFAULT_POSITIONS;
    rec.heightSliderZeroEnd='right';
  }
  await storePut(STORES.collections,rec);
  await loadData();
  closeModal();
  setRoute('game',{collectionId:rec.id});
  showToast(`${name} added to Games ♡`,'success');
}
function openCustomGameForm(){
  openModal(`${modalHead('🎮 Custom Game')}<form id="customGameForm" class="form-grid"><div class="field"><label>Game name *</label><input name="name" maxlength="80" required placeholder="e.g. My favorite game"></div><div class="field"><label>Starting fields</label><input name="fields" placeholder="Name, Type, Level, Status"></div><div class="field"><label>Icon</label><input name="emoji" maxlength="4" value="🎮"></div><div class="form-actions"><button class="soft-btn" type="button" data-close-modal>Cancel</button><button class="soft-btn primary">Create game</button></div></form>`);
  $('#customGameForm').onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget),name=String(fd.get('name')||'').trim();
    if(!name)return;
    if(gameCollections().some(c=>c.name.toLowerCase()===name.toLowerCase()))return showToast('That game is already in your Games.','error');
    const fields=String(fd.get('fields')||'').split(',').map(x=>x.trim()).filter(Boolean),rec={
      id:uid('col'),name,gamePreset:'',isGame:true,gameType:'custom-game',emoji:String(fd.get('emoji')||'🎮').trim()||'🎮',
      template:'custom',color:COLORS[state.collections.length%COLORS.length],cover:'',description:'Custom game tracker',
      parentId:'',setTotal:'',setMembers:[],customFieldLabels:fields.length?fields:[...fieldSets['custom-game']],
      order:state.collections.length,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),archived:false
    };
    await storePut(STORES.collections,rec);await loadData();closeModal();setRoute('game',{collectionId:rec.id});showToast(`${name} added to Games ♡`,'success');
  };
}

function entryName(i,c){return i.name||i.character||i.customFields?.Character||i.customFields?.Name||'Untitled entry'}
function displayFields(c,i){
  const fields=c.customFieldLabels||fieldsFor(gameLabel(c)),cf=i.customFields||{};
  return fields.map(k=>[k,cf[k]??'']).filter(([,v])=>v!==''&&v!=null);
}
function gameSearchText(c,i){return [entryName(i,c),...Object.values(i.customFields||{}),i.notes||''].join(' ').toLowerCase()}
function gameEntryCard(c,i){
  const fields=displayFields(c,i).slice(0,4);
  return `<button class="game-entry-card" data-game-entry="${i.id}" data-game-search="${esc(gameSearchText(c,i))}">${coverOf(i)?`<img loading="lazy" decoding="async" src="${coverOf(i)}" alt="">`:`<span class="game-entry-avatar">${esc(c.emoji||'🎮')}</span>`}<span class="game-entry-copy"><b>${esc(entryName(i,c))}</b><small>${fields.map(([k,v])=>`${esc(k)}: ${esc(v)}`).join(' · ')||'Tap to add details'}</small></span><span class="game-entry-arrow">›</span></button>`;
}
function gameSummary(c,entries){
  if(c.template==='genshin'){
    const el=new Set(entries.map(i=>i.customFields?.Element).filter(Boolean)).size,maxed=entries.filter(i=>Number(i.customFields?.Level)>=90).length;
    return `<div class="game-summary-grid"><div><b>${entries.length}</b><span>characters</span></div><div><b>${el}</b><span>elements</span></div><div><b>${maxed}</b><span>Lv. 90</span></div></div>`;
  }
  if(c.template==='tomodachi'){
    const pers=new Set(entries.map(i=>i.customFields?.['Island Personality']).filter(Boolean)).size;
    return `<div class="game-summary-grid"><div><b>${entries.length}</b><span>Miis</span></div><div><b>${pers}</b><span>personalities</span></div><div><b>${entries.filter(i=>i.customFields?.['Canon Height (cm)']).length}</b><span>heights set</span></div></div>`;
  }
  return `<div class="game-summary-grid"><div><b>${entries.length}</b><span>entries</span></div><div><b>${c.customFieldLabels?.length||0}</b><span>fields</span></div><div><b>✓</b><span>customizable</span></div></div>`;
}
function renderGameTracker(){
  const c=collectionFor(state.collectionId);
  if(!c||!isGame(c)){state.route='games';return renderGames()}
  const entries=gameEntries(c);
  return `<div class="game-tracker-page"><div class="game-back-row"><button class="link-btn" data-game-back>‹ Games</button><button class="icon-btn" id="gameToolsBtn">•••</button></div><section class="game-tracker-hero"><div class="game-tracker-icon">${esc(c.emoji||'🎮')}</div><div><div class="eyebrow">${esc(c.template==='genshin'?'CHARACTER DATABASE':c.template==='tomodachi'?'ISLAND ROSTER':'GAME TRACKER')}</div><h2>${esc(gameLabel(c))}</h2><p>${esc(c.template==='genshin'?'Track your characters, builds and progression.':c.template==='tomodachi'?'Track your island characters and setup references.':'A flexible tracker for this game.')}</p></div></section>${gameSummary(c,entries)}<div class="game-tracker-toolbar"><div class="searchbar"><span>⌕</span><input id="gameEntrySearch" placeholder="Search ${c.template==='genshin'?'characters':c.template==='tomodachi'?'Miis':'entries'}" value="${esc(state.query||'')}"></div><button class="soft-btn primary" id="addGameEntryBtn">+ ${c.template==='genshin'?'Character':c.template==='tomodachi'?'Mii':'Entry'}</button></div>${c.template==='genshin'?`<div class="game-quick-tools"><button class="soft-btn" id="genshinImportBtn">⇩ Import CSV</button><button class="soft-btn" id="manageGameFieldsBtn">⚙︎ Fields & options</button></div>`:c.template==='tomodachi'?`<div class="game-quick-tools"><button class="soft-btn" id="tomodachiPersonalityBtn">🧠 Personality guide</button><button class="soft-btn" id="tomodachiHeightBtn">📏 Height setup</button></div>`:`<div class="game-quick-tools"><button class="soft-btn" id="manageGameFieldsBtn">⚙︎ Customize fields</button></div>`}<div id="gameSearchEmpty" class="game-search-empty hidden">No matching entries.</div>${entries.length?`<div class="game-entry-list">${entries.map(i=>gameEntryCard(c,i)).join('')}</div>`:`<div class="game-empty panel"><div class="game-empty-icon">${esc(c.emoji||'🎮')}</div><h3>No ${c.template==='genshin'?'characters':c.template==='tomodachi'?'Miis':'entries'} yet</h3><p>Add your first one. Mochi starts empty and only stores what you enter.</p><button class="soft-btn primary" id="emptyGameEntryBtn">+ Add first ${c.template==='genshin'?'character':c.template==='tomodachi'?'Mii':'entry'}</button></div>`}</div>`;
}

function fieldOptions(c,key){
  if(c.template==='genshin'&&window.MochiGenshin)return window.MochiGenshin.options(c,key);
  if(c.template==='tomodachi'&&key==='Island Personality'&&window.MochiTomodachi)return window.MochiTomodachi.PERSONALITIES.map(p=>p.name);
  return[];
}
function fieldInput(c,key,value=''){
  const opts=fieldOptions(c,key);
  if(opts.length)return `<select name="gf_${esc(key)}"><option value="">Choose…</option>${opts.map(v=>`<option ${String(v)===String(value)?'selected':''}>${esc(v)}</option>`).join('')}</select>`;
  const numeric=/level|height/i.test(key);
  return `<input name="gf_${esc(key)}" ${numeric?'type="number" step="0.01" inputmode="decimal"':''} value="${esc(value)}" placeholder="${esc(key)}">`;
}
function calcTomodachi(c,height){
  if(!window.MochiTomodachi||height==='')return null;
  const rows=window.MochiTomodachi.buildHeightRows(c),target=Number(height),cfg=window.MochiTomodachi.getHeightConfig(c);
  if(!Number.isFinite(target)||!rows.length)return null;
  let best=rows[0];
  for(const r of rows)if(Math.abs(r.height-target)<Math.abs(best.height-target))best=r;
  const fromZero=Math.max(0,best.position),fromOther=Math.max(0,cfg.maxPosition-best.position);
  const zeroLabel=cfg.zeroEnd==='right'?'RIGHT':'LEFT',otherLabel=cfg.zeroEnd==='right'?'LEFT':'RIGHT';
  const recommended=fromZero<=fromOther?{clicks:fromZero,direction:zeroLabel}:{clicks:fromOther,direction:otherLabel};
  return {position:best.position,height:best.height,diff:best.height-target,max:cfg.maxPosition,fromZero,fromOther,zeroLabel,otherLabel,...recommended};
}
function tomodachiPersonalityInline(name){
  const p=window.MochiTomodachi?.PERSONALITIES?.find(x=>x.name===name);
  if(!p)return '<span>Choose an island personality to see the five slider settings.</span>';
  return `<b>${esc(p.name)}</b><span>${esc(p.group)}</span><div class="personality-inline-grid">${[['Movement',p.movement],['Speech',p.speech],['Energy',p.energy],['Attitude',p.attitude],['Overall',p.overall]].map(([k,v])=>`<span><small>${k}</small><strong>${v}/8</strong></span>`).join('')}</div>`;
}
function openGameEntryForm(c,existing=null){
  const i=existing||{customFields:{},photos:[]},fields=c.customFieldLabels||fieldsFor(gameLabel(c)),cf=i.customFields||{};
  openModal(`${modalHead(existing?'Edit game entry':`Add ${c.template==='genshin'?'Character':c.template==='tomodachi'?'Mii':'Entry'}`)}<form id="gameEntryForm" class="form-grid"><div class="field"><label>${c.template==='genshin'?'Character name':c.template==='tomodachi'?'Mii / Character name':'Entry name'} *</label><input name="entryName" required maxlength="100" value="${esc(entryName(i,c)==='Untitled entry'?'':entryName(i,c))}"></div>${fields.map(k=>`<div class="field"><label>${esc(k)}</label>${fieldInput(c,k,cf[k]||'')}</div>`).join('')}${c.template==='tomodachi'?'<div id="tomodachiPersonalityInline" class="game-calc-card"></div><div id="tomodachiLiveCalc" class="game-calc-card"></div>':''}<div class="field"><label>Notes</label><textarea name="notes">${esc(i.notes||'')}</textarea></div><div class="form-actions"><button type="button" class="soft-btn" data-close-modal>Cancel</button><button class="soft-btn primary">Save</button></div></form>`);
  const heightField=$('[name="gf_Canon Height (cm)"]');
  const calc=()=>{
    if(!heightField)return;
    const r=calcTomodachi(c,heightField.value),box=$('#tomodachiLiveCalc');
    if(!box)return;
    box.innerHTML=r?`<b>${r.clicks} click${r.clicks===1?'':'s'} from ${r.direction}</b><span>Closest slider height ${r.height.toFixed(2)} cm · position ${r.position}/${r.max} · ${r.diff>=0?'+':''}${r.diff.toFixed(2)} cm</span>`:'<span>Enter a canon height to calculate the closest slider position.</span>';
  };
  heightField?.addEventListener('input',calc);calc();
  const personalityField=$('[name="gf_Island Personality"]');
  const drawPersonality=()=>{const box=$('#tomodachiPersonalityInline');if(box)box.innerHTML=tomodachiPersonalityInline(personalityField?.value||'')};
  personalityField?.addEventListener('change',drawPersonality);drawPersonality();

  $('#gameEntryForm').onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget),name=String(fd.get('entryName')||'').trim();
    if(!name)return;
    const customFields={};
    fields.forEach(k=>customFields[k]=String(fd.get(`gf_${k}`)||'').trim());
    if(c.template==='tomodachi'){
      const r=calcTomodachi(c,customFields['Canon Height (cm)']);
      if(r){
        customFields['Slider Height (cm)']=r.height.toFixed(2);
        customFields['Slider Position']=String(r.position);
        customFields['Slider Clicks']=String(r.clicks);
        customFields['Slider Direction']=r.direction;
        customFields['Height Difference']=`${r.diff>=0?'+':''}${r.diff.toFixed(2)} cm`;
      }
    }
    const rec={...(existing||{}),id:existing?.id||uid('item'),name,collectionId:c.id,isGameEntry:true,status:'Owned',series:'',character:name,quantity:1,pricePaid:'',estimatedValue:'',targetPrice:'',dateAcquired:'',store:'',condition:'',tags:existing?.tags||[],priority:'Medium',photos:existing?.photos||[],coverPhotoIndex:existing?.coverPhotoIndex||0,mysteryPull:false,mysterySeries:'',setSlot:'',purchaseUrl:'',customFields,notes:String(fd.get('notes')||'').trim(),favorite:existing?.favorite||false,createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),archived:false};
    await storePut(STORES.items,rec);await loadData();closeModal();render();showToast(existing?'Game entry updated ♡':'Added to game tracker ♡','success');
  };
}
function openGameEntryDetail(c,i){
  const fields=displayFields(c,i),cf=i.customFields||{};
  let special='';
  if(c.template==='tomodachi'){
    const height=calcTomodachi(c,cf['Canon Height (cm)']);
    const personality=window.MochiTomodachi?.PERSONALITIES?.find(p=>p.name===cf['Island Personality']);
    special=`${height?`<section class="panel game-native-panel"><h3>📏 Height Slider</h3><div class="game-native-main"><b>${height.clicks} click${height.clicks===1?'':'s'} from ${height.direction}</b><span>Closest ${height.height.toFixed(2)} cm · position ${height.position}/${height.max} · ${height.diff>=0?'+':''}${height.diff.toFixed(2)} cm</span></div></section>`:''}${personality?`<section class="panel game-native-panel"><h3>🧠 Personality Setup</h3>${tomodachiPersonalityInline(personality.name)}</section>`:''}`;
  }
  openModal(`${modalHead(esc(entryName(i,c)))}<div class="game-detail-icon">${coverOf(i)?`<img loading="lazy" decoding="async" src="${coverOf(i)}" alt="">`:esc(c.emoji||'🎮')}</div><div class="game-detail-fields">${fields.map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')||'<div><span>No extra fields yet</span><b>Use Edit to add details.</b></div>'}</div>${special}${i.notes?`<section class="panel"><h3>Notes</h3><p class="game-note">${esc(i.notes)}</p></section>`:''}<div class="detail-actions"><button class="soft-btn" id="editGameEntry">Edit</button><button class="soft-btn danger" id="deleteGameEntry">Delete</button></div>`);
  $('#editGameEntry').onclick=()=>openGameEntryForm(c,i);
  $('#deleteGameEntry').onclick=async()=>{
    if(!confirm(`Delete ${entryName(i,c)}?`))return;
    await storeDelete(STORES.items,i.id);await loadData();closeModal();render();showToast('Game entry deleted','success');
  };
}

function openGenshinOptions(c){
  if(!window.MochiGenshin)return showToast('Genshin options are unavailable.','error');
  window.MochiGenshin.ensure(c);
  const keys=Object.keys(window.MochiGenshin.DEFAULTS);
  openModal(`${modalHead('✨ Genshin Dropdown Options')}<form id="genshinOptionsForm" class="form-grid"><p class="validation-note">These choices apply only to this Genshin tracker. The default Role list is Main DPS, Sub-DPS, Support, Healer and Shielder; you can customize it whenever you need to.</p>${keys.map(k=>`<div class="field"><label>${esc(k)}</label><textarea name="go_${esc(k)}" rows="3" placeholder="One option per line">${esc(window.MochiGenshin.options(c,k).join('\n'))}</textarea></div>`).join('')}<div class="form-actions"><button class="soft-btn" type="button" data-close-modal>Cancel</button><button class="soft-btn primary">Save options</button></div></form>`);
  $('#genshinOptionsForm').onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    keys.forEach(k=>{
      const values=String(fd.get(`go_${k}`)||'').split(/\n|,/).map(x=>x.trim()).filter(Boolean);
      c.genshinOptions[k]=[...new Set(values)];
    });
    c.updatedAt=new Date().toISOString();
    await storePut(STORES.collections,c);await loadData();closeModal();render();showToast('Genshin options updated ♡','success');
  };
}
function openManageGameFields(c){
  openModal(`${modalHead('⚙︎ Tracker Fields')}<form id="gameFieldsForm" class="form-grid"><p class="validation-note">These fields apply only to ${esc(gameLabel(c))}. You can add, remove or reorder them without changing other games.</p><div class="field"><label>Fields</label><textarea name="fields" rows="8">${esc((c.customFieldLabels||[]).join('\n'))}</textarea></div>${c.template==='genshin'?'<button class="soft-btn" id="editGenshinOptions" type="button">Edit Genshin dropdown options</button>':''}<div class="form-actions"><button class="soft-btn" type="button" data-close-modal>Cancel</button><button class="soft-btn primary">Save fields</button></div></form>`);
  $('#editGenshinOptions')?.addEventListener('click',()=>openGenshinOptions(c));
  $('#gameFieldsForm').onsubmit=async e=>{
    e.preventDefault();
    c.customFieldLabels=[...new Set(String(new FormData(e.currentTarget).get('fields')||'').split(/\n|,/).map(x=>x.trim()).filter(Boolean))];
    c.updatedAt=new Date().toISOString();
    await storePut(STORES.collections,c);await loadData();closeModal();render();showToast('Game fields updated ♡','success');
  };
}
function openTomodachiTools(c){
  openModal(`${modalHead('🏝️ Tomodachi Tools')}<div class="tool-grid"><button class="tool-card" id="tomodachiToolsPersonality"><strong>🧠 Personality Guide</strong><small>16 personalities and exact five-slider settings.</small></button><button class="tool-card" id="tomodachiToolsHeight"><strong>📏 Height Slider Setup</strong><small>Configure the range used by this island.</small></button></div>`);
  $('#tomodachiToolsPersonality')?.addEventListener('click',()=>window.MochiTomodachi?.openPersonalityGuide?.());
  $('#tomodachiToolsHeight')?.addEventListener('click',()=>openTomodachiHeightTable(c));
}
function exportGameCSV(c){
  const fields=c.customFieldLabels||fieldsFor(gameLabel(c)),headers=['Name',...fields,'Notes'],rows=gameEntries(c).map(i=>[entryName(i,c),...fields.map(k=>i.customFields?.[k]??''),i.notes||'']);
  const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadBlob(csv,`${slug(gameLabel(c))||'mochi-game'}-tracker.csv`,'text/csv;charset=utf-8');
}
function openGameTools(c){
  openModal(`${modalHead(esc(gameLabel(c)))}<div class="tool-grid"><button class="tool-card" id="editGameFields"><strong>⚙︎ Customize tracker</strong><small>Change fields used by this game only.</small></button><button class="tool-card" id="exportGameCSV"><strong>⇩ Export CSV</strong><small>Export this game tracker with all configured fields.</small></button>${c.template==='tomodachi'?'<button class="tool-card" id="nativeGameTools"><strong>🏝️ Tomodachi tools</strong><small>Height setup and personality references.</small></button>':''}${c.template==='genshin'?'<button class="tool-card" id="genshinOptionsTool"><strong>✨ Genshin options</strong><small>Customize dropdown choices for this tracker.</small></button>':''}</div><button class="soft-btn danger" id="deleteGameTracker" style="width:100%;margin-top:12px">Remove game tracker</button>`);
  $('#editGameFields').onclick=()=>openManageGameFields(c);
  $('#exportGameCSV').onclick=()=>exportGameCSV(c);
  $('#nativeGameTools')?.addEventListener('click',()=>openTomodachiTools(c));
  $('#genshinOptionsTool')?.addEventListener('click',()=>openGenshinOptions(c));
  $('#deleteGameTracker').onclick=async()=>{
    if(!confirm(`Remove ${gameLabel(c)} and all of its tracked entries?`))return;
    for(const i of gameEntries(c))await storeDelete(STORES.items,i.id);
    await storeDelete(STORES.collections,c.id);await loadData();closeModal();setRoute('games');showToast('Game tracker removed','success');
  };
}

async function performGenshinImport(c,characters,duplicateMode='update'){
  let added=0,updated=0,skipped=0;
  for(const ch of characters){
    let existing=gameEntries(c).find(i=>entryName(i,c).toLowerCase()===String(ch.name).toLowerCase());
    if(existing&&duplicateMode==='skip'){skipped++;continue}
    if(existing&&duplicateMode==='add')existing=null;
    const customFields={};
    (c.customFieldLabels||fieldsFor('Genshin Impact')).forEach(k=>customFields[k]=ch[k]??existing?.customFields?.[k]??'');
    const rec={...(existing||{}),id:existing?.id||uid('item'),name:ch.name,character:ch.name,collectionId:c.id,isGameEntry:true,status:'Owned',quantity:1,customFields,photos:existing?.photos||[],coverPhotoIndex:existing?.coverPhotoIndex||0,notes:existing?.notes||'',createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),archived:false};
    await storePut(STORES.items,rec);
    if(existing)updated++;else added++;
  }
  await storePut(STORES.collections,c);await loadData();render();
  showToast(`Genshin import: ${added} added · ${updated} updated${skipped?` · ${skipped} skipped`:''} ♡`,'success');
}
function reviewGenshinImport(c,result){
  const unique=[];
  const seen=new Set();
  (result.unknown||[]).forEach(x=>{const key=`${x.field}\u0000${x.value}`;if(!seen.has(key)){seen.add(key);unique.push({field:x.field,value:x.value})}});
  const preview=result.characters.slice(0,6).map(x=>esc(x.name)).join(' · ');
  openModal(`${modalHead('✨ Review Genshin Import')}<form id="genshinImportReview" class="form-grid"><div class="genshin-warning"><b>${result.characters.length} characters found.</b><br>${preview}${result.characters.length>6?' · …':''}<br><br>Export a Google Sheet as <b>Comma-separated values (.csv)</b> before importing.</div><div class="field"><label>If a character already exists</label><select name="duplicateMode"><option value="update">Update the existing character</option><option value="skip">Skip duplicate names</option><option value="add">Add another entry</option></select></div>${unique.length?`<section class="panel"><h3>Values not in your dropdowns</h3><p class="tiny muted">Choose how Mochi should handle each one. Nothing is changed silently.</p>${unique.map((u,idx)=>{const opts=window.MochiGenshin.options(c,u.field);const role=u.field==='Role';return `<div class="genshin-map-row"><span><b>${esc(u.field)}</b><small>${esc(u.value)}</small></span><select name="map_${idx}" ${role?'required':''}>${role?'<option value="">Choose mapping…</option>':''}<option value="__add__">Keep & add as custom option</option>${opts.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select></div>`}).join('')}</section>`:''}<div class="form-actions"><button class="soft-btn" type="button" data-close-modal>Cancel</button><button class="soft-btn primary">Import characters</button></div></form>`);
  $('#genshinImportReview').onsubmit=async e=>{
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
    await performGenshinImport(c,characters,fd.get('duplicateMode')||'update');
  };
}
async function importGenshin(c,file){
  if(!window.MochiGenshin)return showToast('Genshin importer is unavailable.','error');
  try{
    if(!file||!/\.csv$/i.test(file.name||''))return showToast('Please choose a .csv file exported from Google Sheets.','error');
    if(file.size>10*1024*1024)return showToast('That CSV is larger than 10 MB.','error');
    const result=await window.MochiGenshin.importCSV(file,c);
    if(!result.characters.length)return showToast('No characters found. Check that the first row contains your column headers.','error');
    reviewGenshinImport(c,result);
  }catch(err){
    console.error(err);
    showToast('Could not read that Genshin CSV.','error');
  }
}

/* Keep physical Collections and game trackers from leaking into each other's counts and tools. */
const baseRenderHome=renderHome;
renderHome=function(){return withPhysicalState(()=>baseRenderHome())};
const baseRenderMe=renderMe;
renderMe=function(){return withPhysicalState(()=>baseRenderMe()).replace(/♡ Build \d+(?:\.\d+)?/g,'♡ Mochi v1')};
const baseRenderWishlist=renderWishlist;
renderWishlist=function(){return withPhysicalState(()=>baseRenderWishlist())};
const baseCollections=renderCollections;
renderCollections=function(){return withPhysicalState(()=>baseCollections())};
const baseTemplateCards=templateCards;
templateCards=function(selected){
  const savedG=TEMPLATES.genshin,savedT=TEMPLATES.tomodachi;
  try{delete TEMPLATES.genshin;delete TEMPLATES.tomodachi;return baseTemplateCards(selected)}
  finally{if(savedG)TEMPLATES.genshin=savedG;if(savedT)TEMPLATES.tomodachi=savedT}
};
itemCollectionOptions=function(selected=''){
  return `<option value="">Choose collection</option>${physicalCollections().map(c=>`<option value="${c.id}" ${selected===c.id?'selected':''}>${esc(c.emoji||'🍡')} ${esc(c.name)}</option>`).join('')}`;
};
const baseQuickAdd=openQuickAdd;
openQuickAdd=function(){return withPhysicalState(()=>baseQuickAdd())};

function wrapPhysical(name,fn){
  return function(...args){return withPhysicalState(()=>fn.apply(this,args))};
}
const physicalFns=[
  'openInventoryOverview','openCatalogAudit','openLocations','openLocationItems','openAssignLocation','openAssignLocationForItem',
  'openTagsExplorer','openLoans','openNewLoan','openCareReminders','openNewCare','openCollectionGoals','openNewGoal',
  'openActivityLog','openBatchTools','openStats','openDuplicateSummary','openMysterySummary','randomTreasure',
  'openMemories','openWrapped','openSmartCollection','openPassport','exportCSV'
];
physicalFns.forEach(name=>{
  try{
    const original=window[name];
    if(typeof original==='function')window[name]=wrapPhysical(name,original);
  }catch{}
});

/* Route and render integration. */
const baseRender=render;
render=function(){
  if(state.route==='games'){
    updateGreeting();$('#mainContent').innerHTML=renderGames();
    $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.route==='games'));
    bindDynamicEvents();
    $('#addGameBtn')?.addEventListener('click',openGamePicker);
    $('#emptyAddGameBtn')?.addEventListener('click',openGamePicker);
    $$('[data-game-collection]').forEach(b=>b.onclick=()=>setRoute('game',{collectionId:b.dataset.gameCollection}));
    return;
  }
  if(state.route==='game'){
    updateGreeting();$('#mainContent').innerHTML=renderGameTracker();
    $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.route==='games'));
    bindGameTrackerEvents();
    return;
  }
  return baseRender();
};
function applyGameSearch(q=''){
  state.query=q;
  const needle=String(q).trim().toLowerCase(),cards=$$('[data-game-entry]'),empty=$('#gameSearchEmpty');
  let visible=0;
  cards.forEach(card=>{
    const show=!needle||String(card.dataset.gameSearch||'').includes(needle);
    card.hidden=!show;if(show)visible++;
  });
  if(empty)empty.classList.toggle('hidden',!needle||visible>0);
}
function bindGameTrackerEvents(){
  const c=collectionFor(state.collectionId);if(!c)return;
  $('[data-game-back]')?.addEventListener('click',()=>{state.query='';setRoute('games')});
  $('#gameToolsBtn')?.addEventListener('click',()=>openGameTools(c));
  $('#addGameEntryBtn')?.addEventListener('click',()=>openGameEntryForm(c));
  $('#emptyGameEntryBtn')?.addEventListener('click',()=>openGameEntryForm(c));
  $('#manageGameFieldsBtn')?.addEventListener('click',()=>openManageGameFields(c));
  $('#tomodachiHeightBtn')?.addEventListener('click',()=>openTomodachiHeightTable(c));
  $('#tomodachiPersonalityBtn')?.addEventListener('click',()=>window.MochiTomodachi?.openPersonalityGuide?.());
  $('#genshinImportBtn')?.addEventListener('click',()=>$('#genshinImportInput')?.click());
  const search=$('#gameEntrySearch');
  if(search)search.oninput=e=>applyGameSearch(e.target.value);
  $$('[data-game-entry]').forEach(b=>b.onclick=()=>{const i=state.items.find(x=>x.id===b.dataset.gameEntry);if(i)openGameEntryDetail(c,i)});
  if(state.query)applyGameSearch(state.query);
}
const baseSetRoute=setRoute;
setRoute=function(route,extra={}){
  if(route==='collection'&&isGame(collectionFor(extra.collectionId)))route='game';
  return baseSetRoute(route,extra);
};

const baseOpenItemDetail=openItemDetail;
openItemDetail=function(id){
  const item=state.items.find(x=>x.id===id),c=collectionFor(item?.collectionId);
  if(item&&isGame(c)){state.collectionId=c.id;state.route='game';render();openGameEntryDetail(c,item);return}
  return baseOpenItemDetail(id);
};

const baseHandleAction=handleAction;
handleAction=async function(action,el){
  if(action==='about-build')return showToast('Mochi v1 • local-first collection tracker ♡','success');
  return baseHandleAction(action,el);
};

$('#genshinImportInput')?.addEventListener('change',async e=>{
  const file=e.target.files?.[0],c=collectionFor(state.collectionId);
  if(file&&c?.template==='genshin')await importGenshin(c,file);
  e.target.value='';
});

document.addEventListener('DOMContentLoaded',()=>{
  const plus=$('#quickAddBtn');
  if(plus)plus.onclick=()=>{
    if(state.route==='games')return openGamePicker();
    if(state.route==='game'){
      const c=collectionFor(state.collectionId);
      if(c&&isGame(c))return openGameEntryForm(c);
    }
    return openQuickAdd();
  };
  /* Improve large-list scrolling without changing existing stored data. */
  const lazyImages=()=>$$('img:not([loading])').forEach(img=>{img.loading='lazy';img.decoding='async'});
  lazyImages();
  new MutationObserver(lazyImages).observe($('#app')||document.body,{childList:true,subtree:true});
});

window.MochiGames={
  groups,presets,slug,typeFor,fieldsFor,isGame,
  getPreset:name=>presets.find(p=>p.name===name),
  makeGame:name=>({name:name||'Custom Game',gameType:typeFor(name||''),fields:fieldsFor(name||''),customizable:true})
};
})();