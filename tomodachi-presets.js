/* Tomodachi Life: Living the Dream — built-in height scale + personality guide */
(function(){
'use strict';

const DEFAULT_MIN=99.50,DEFAULT_MAX=198.00,DEFAULT_POSITIONS=127;
const PERSONALITIES=[
{group:'Easy-going (Considerate)',name:'Softie (Sweetie)',description:'Sensitive, emotional, and in tune with the feelings of those around them. Empathetic and sentimental.',movement:1,speech:1,energy:8,attitude:8,overall:8},
{group:'Easy-going (Considerate)',name:'Carer (Buddy)',description:'Trustworthy and considerate. Puts their friends first and works hard to make sure everyone gets along.',movement:2,speech:3,energy:4,attitude:5,overall:6},
{group:'Easy-going (Considerate)',name:'Optimist (Cheerleader)',description:'Positive, enthusiastic, and always smiling. Smiles not only for their own sake, but to help others smile too.',movement:3,speech:4,energy:7,attitude:6,overall:5},
{group:'Easy-going (Considerate)',name:'Dreamer (Daydreamer)',description:'Idealistic and romantic. Often has their heads in the clouds, but finds a lot of great ideas up there.',movement:3,speech:4,energy:5,attitude:6,overall:7},
{group:'Energetic (Outgoing)',name:'Charmer',description:'Radiant and always on form. Their effortless style is admired by all. Easily adapts to new situations.',movement:4,speech:5,energy:6,attitude:7,overall:8},
{group:'Energetic (Outgoing)',name:'Adventurer (Go-Getter)',description:'Bold and captivating. Their wit and charm lights up a room. It’s never a dull moment when they’re around!',movement:8,speech:8,energy:8,attitude:8,overall:8},
{group:'Energetic (Outgoing)',name:'Bubbly (Merrymaker)',description:'Outgoing and pleasant to be around. Makes friends easily, and finds the silver lining to any bad situation.',movement:6,speech:6,energy:6,attitude:6,overall:6},
{group:'Energetic (Outgoing)',name:'Hot-Blooded (Dynamo)',description:'Assertive and highly regarded. Trusts their instincts, and easily commands the respect of others.',movement:8,speech:7,energy:6,attitude:5,overall:4},
{group:'Reserved',name:'Patient (Strategist)',description:'Unique, carefree and creative. Always thinks way outside the box, without worrying what others think.',movement:1,speech:2,energy:3,attitude:4,overall:5},
{group:'Reserved',name:'Perfectionist',description:'Imaginative and inspired. Happiest when creating something. Finds beauty in even the smallest details.',movement:3,speech:3,energy:3,attitude:3,overall:3},
{group:'Reserved',name:'Introvert (Observer)',description:'Self-sufficient and highly individual. Doesn’t let their emotions show, but has a lot going on deep down.',movement:1,speech:1,energy:1,attitude:1,overall:1},
{group:'Reserved',name:'Thinker',description:'Thoughtful and introspective. Great at thinking things through and analysing from every angle.',movement:5,speech:4,energy:3,attitude:2,overall:1},
{group:'Confident (Ambitious)',name:'Busy Bee (Achiever)',description:'Diligent, productive, and highly efficient. An excellent planner who always follows through.',movement:6,speech:5,energy:4,attitude:3,overall:2},
{group:'Confident (Ambitious)',name:'Leader (Visionary)',description:'Ambitious and takes risks. Full of energy and does things on a whim. A force to be reckoned with.',movement:7,speech:6,energy:5,attitude:4,overall:3},
{group:'Confident (Ambitious)',name:'Individualist (Rouge)',description:'Intelligent and not afraid to show it. Knowledgeable in a wide range of subjects. Speaks with confidence.',movement:6,speech:5,energy:2,attitude:3,overall:4},
{group:'Confident (Ambitious)',name:'Headstrong (Maverick)',description:'A determined self-starter. Cuts their own path, letting nothing stand in their way. Quick to execute plans.',movement:8,speech:8,energy:1,attitude:1,overall:1}
];

function getHeightConfig(c){
  return{
    min:Number.isFinite(Number(c?.heightMinCm))?Number(c.heightMinCm):DEFAULT_MIN,
    max:Number.isFinite(Number(c?.heightMaxCm))?Number(c.heightMaxCm):DEFAULT_MAX,
    maxPosition:Number.isFinite(Number(c?.heightSliderMaxPosition))?Number(c.heightSliderMaxPosition):DEFAULT_POSITIONS,
    /* In the user's reference, click 0 at the tall end starts from the RIGHT. */
    zeroEnd:c?.heightSliderZeroEnd==='left'?'left':'right'
  };
}
function buildHeightRows(c){
  const cfg=getHeightConfig(c),rows=[];
  for(let p=0;p<=cfg.maxPosition;p++){
    const ratio=cfg.maxPosition?p/cfg.maxPosition:0;
    const h=cfg.max+(cfg.min-cfg.max)*ratio;
    rows.push({position:p,height:Number(h.toFixed(2))});
  }
  return rows;
}
if(typeof tomodachiHeightTable==='function')tomodachiHeightTable=function(c){return buildHeightRows(c)};

if(typeof openTomodachiHeightTable==='function')openTomodachiHeightTable=function(c=collectionFor(state.collectionId)){
  if(!isTomodachiCollection(c))return showToast('Height Slider is only available for Tomodachi Life collections.','error');
  const cfg=getHeightConfig(c);
  openModal(`${modalHead('📏 Height Slider Setup')}<form id="heightSliderForm" class="form-grid"><p class="height-config-note">Mochi stores the slider as a range instead of a visible 128-row table. Your current Tomodachi setup defaults to <b>99.50–198.00 cm across positions 0–127</b>.</p><div class="field-row"><div class="field"><label>Minimum height (cm)</label><input name="min" type="number" step="0.01" value="${cfg.min}"></div><div class="field"><label>Maximum height (cm)</label><input name="max" type="number" step="0.01" value="${cfg.max}"></div></div><div class="field-row"><div class="field"><label>Highest slider position</label><input name="maxPosition" type="number" min="1" step="1" value="${cfg.maxPosition}"></div><div class="field"><label>Position 0 starts from</label><select name="zeroEnd"><option value="left" ${cfg.zeroEnd==='left'?'selected':''}>Left end</option><option value="right" ${cfg.zeroEnd==='right'?'selected':''}>Right end</option></select></div></div><div class="height-config-preview">Mochi calculates the nearest achievable height and recommends the shorter number of clicks from either end. Position 0 is the maximum-height endpoint in this reference.</div><div class="form-actions"><button type="button" class="soft-btn" data-close-modal>Cancel</button><button class="soft-btn primary">Save setup</button></div></form>`);
  $('#heightSliderForm').onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget),min=Number(fd.get('min')),max=Number(fd.get('max')),mp=Number(fd.get('maxPosition'));
    if(!Number.isFinite(min)||!Number.isFinite(max)||max<=min||!Number.isInteger(mp)||mp<1)return showToast('Check the height range and slider positions.','error');
    c.heightMinCm=min;c.heightMaxCm=max;c.heightSliderMaxPosition=mp;c.heightSliderZeroEnd=fd.get('zeroEnd')==='left'?'left':'right';
    delete c.heightSliderTable;
    c.updatedAt=new Date().toISOString();
    await storePut(STORES.collections,c);await loadData();closeModal();render();showToast('Height slider setup saved ♡','success');
  };
};

function sliderTrack(v){
  return `<span class="personality-slider-track">${Array.from({length:8},(_,i)=>`<i class="${i+1===v?'on':''}"></i>`).join('')}</span>`;
}
function personalityDetail(p){
  return `<div class="personality-group-chip">${esc(p.group)}</div><h3>${esc(p.name)}</h3><p class="tiny muted">${esc(p.description)}</p><div class="personality-sliders">${[['Movement',p.movement],['Speech',p.speech],['Energy',p.energy],['Attitude',p.attitude],['Overall',p.overall]].map(([k,v])=>`<div class="personality-slider-row"><span>${k}</span>${sliderTrack(v)}<b>${v}/8</b></div>`).join('')}</div>`;
}
function openPersonalityGuide(){
  openModal(`${modalHead('🧠 Personality Guide')}<p class="validation-note">Built into Mochi for Tomodachi Life: Living the Dream. The guide is stored as native data, not as an embedded picture.</p><input id="personalitySearch" class="game-search" placeholder="Search personality…"><div id="personalityGuideGrid" class="personality-guide-grid"></div>`);
  const grid=$('#personalityGuideGrid'),search=$('#personalitySearch');
  const draw=()=>{
    const q=String(search.value||'').toLowerCase();
    const results=PERSONALITIES.filter(p=>`${p.name} ${p.group} ${p.description}`.toLowerCase().includes(q));
    grid.innerHTML=results.map(p=>`<button class="personality-card" data-pidx="${PERSONALITIES.indexOf(p)}"><b>${esc(p.name)}</b><small>${esc(p.group)}</small></button>`).join('')||'<div class="tiny muted">No matches.</div>';
    $$('[data-pidx]',grid).forEach(b=>b.onclick=()=>{
      const p=PERSONALITIES[Number(b.dataset.pidx)];
      openModal(`${modalHead('🧠 Personality Setup')}${personalityDetail(p)}<div class="form-actions"><button class="soft-btn" data-close-modal>Close</button></div>`);
    });
  };
  search.oninput=draw;draw();
}

const prevMenu=openCollectionMenu;
openCollectionMenu=function(){
  const c=collectionFor(state.collectionId);
  prevMenu();
  if(!isTomodachiCollection(c))return;
  const grid=$('.modal .tool-grid');if(!grid)return;
  const existing=$('#tomodachiHeightTool');
  if(existing){
    const cfg=getHeightConfig(c);
    existing.querySelector('strong').textContent='📏 Height Slider Setup';
    existing.querySelector('small').textContent=`${cfg.min.toFixed(2)}–${cfg.max.toFixed(2)} cm · 0–${cfg.maxPosition}`;
    existing.onclick=()=>openTomodachiHeightTable(c);
  }
  if(![...grid.querySelectorAll('.tool-card')].some(x=>x.textContent.includes('Personality Guide'))){
    const b=document.createElement('button');
    b.className='tool-card tomodachi-tool-card';
    b.innerHTML='<strong>🧠 Personality Guide</strong><small>16 personalities · exact 5-slider setup</small>';
    grid.appendChild(b);
    b.onclick=openPersonalityGuide;
  }
};

window.MochiTomodachi={
  DEFAULT_MIN,DEFAULT_MAX,DEFAULT_POSITIONS,PERSONALITIES,
  getHeightConfig,buildHeightRows,openPersonalityGuide,
  getPersonality:name=>PERSONALITIES.find(p=>p.name===name)||null
};
})();