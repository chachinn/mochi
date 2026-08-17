/* Mochi QA runtime guards — loaded last */
(function(){
'use strict';

function qaIsGame(c){return !!c&&(c.isGame||c.template==='genshin'||c.template==='tomodachi')}

/* The legacy collection template means boxed/cartridge ownership, not the Games tracker hub. */
if(typeof TEMPLATES!=='undefined'&&TEMPLATES.games){
  TEMPLATES.games.label='Physical Games';
  TEMPLATES.games.emoji='🎮';
}

/*
 * app.js starts IndexedDB asynchronously and may assign quickAddBtn.onclick after
 * deferred modules have loaded. Capture the tap first so Games always keeps its
 * own add behavior regardless of startup timing.
 */
document.addEventListener('click',e=>{
  const plus=e.target?.closest?.('#quickAddBtn');
  if(!plus)return;
  if(state.route==='games'){
    e.preventDefault();e.stopImmediatePropagation();
    const add=$('#addGameBtn')||$('#emptyAddGameBtn');
    if(add)return add.click();
  }
  if(state.route==='game'){
    const c=collectionFor(state.collectionId);
    if(!qaIsGame(c))return;
    e.preventDefault();e.stopImmediatePropagation();
    const add=$('#addGameEntryBtn')||$('#emptyGameEntryBtn');
    if(add)return add.click();
  }
},true);

/* Never leave a stale physical filter/search active when entering Games. */
document.addEventListener('click',e=>{
  const nav=e.target?.closest?.('.nav-btn[data-route="games"]');
  if(nav){state.query='';state.filterStatus='All';}
},true);

/* Lightweight diagnostic marker for future App Health checks. */
window.MochiQA={
  version:'build6-v5',
  gameCollectionCount:()=>state.collections.filter(qaIsGame).length,
  physicalCollectionCount:()=>state.collections.filter(c=>!qaIsGame(c)).length,
  orphanCount:()=>state.items.filter(i=>!collectionFor(i.collectionId)).length
};
})();