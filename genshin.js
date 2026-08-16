/* Mochi — Genshin Impact collection template + import helper */
(function(){
const DEFAULTS={
 Element:['Anemo','Geo','Electro','Dendro','Hydro','Pyro','Cryo','Varies'],
 Rarity:['4★','5★'],Weapon:['Sword','Claymore','Polearm','Bow','Catalyst'],
 Role:['Main DPS','Sub-DPS','Support','Healer','Shielder'],
 Nation:['Mondstadt','Liyue','Inazuma','Sumeru','Fontaine','Natlan','Nod Krai','Snezhnaya',"Khaenri'ah",'Celestia','Wonderland'],
 Constellation:['C0','C1','C2','C3','C4','C5','C6']
};
if(window.TEMPLATES) TEMPLATES.genshin={label:'Genshin Impact',emoji:'✨',fields:['Element','Rarity','Weapon','Role','Nation','Constellation','Level']};
function options(c,key){const custom=c?.genshinOptions?.[key];return Array.isArray(custom)&&custom.length?custom:DEFAULTS[key]||[]}
function ensure(c){c.genshinOptions=c.genshinOptions||JSON.parse(JSON.stringify(DEFAULTS));Object.keys(DEFAULTS).forEach(k=>{if(!Array.isArray(c.genshinOptions[k]))c.genshinOptions[k]=[...DEFAULTS[k]]});return c.genshinOptions}
window.MochiGenshin={DEFAULTS,options,ensure,isCollection:c=>!!c&&c.template==='genshin'};

function parseCSV(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<String(text).length;i++){const ch=text[i],n=text[i+1];if(ch==='"'){if(q&&n==='"'){cell+='"';i++}else q=!q}else if(ch===','&&!q){row.push(cell);cell=''}else if((ch==='\n'||ch==='\r')&&!q){if(ch==='\r'&&n==='\n')i++;row.push(cell);if(row.some(x=>String(x).trim()))rows.push(row);row=[];cell=''}else cell+=ch}row.push(cell);if(row.some(x=>String(x).trim()))rows.push(row);return rows}
function normalizeHeader(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'')}
const MAP={character:'name',name:'name',element:'Element',rarity:'Rarity',weapon:'Weapon',role:'Role',nation:'Nation',constellation:'Constellation',level:'Level'};
function rowsToCharacters(rows){if(!rows.length)return[];const headers=rows[0].map(normalizeHeader);return rows.slice(1).map(r=>{const out={};headers.forEach((h,i)=>{if(MAP[h])out[MAP[h]]=String(r[i]??'').trim()});return out}).filter(x=>x.name)}
function unknowns(chars,c){ensure(c);const bad=[];chars.forEach((x,i)=>Object.keys(DEFAULTS).forEach(k=>{const v=x[k];if(v&&!options(c,k).includes(v))bad.push({row:i+2,name:x.name,field:k,value:v})}));return bad}
window.MochiGenshin.parseCSV=parseCSV;window.MochiGenshin.rowsToCharacters=rowsToCharacters;window.MochiGenshin.findUnknowns=unknowns;

/* Lightweight UI hooks that work with Mochi's existing modal/storage helpers when present. */
window.MochiGenshin.importCSV=async function(file,collection){const text=await file.text();const chars=rowsToCharacters(parseCSV(text));return{characters:chars,unknown:unknowns(chars,collection)}};
window.MochiGenshin.addOption=function(collection,field,value){ensure(collection);value=String(value||'').trim();if(value&&!collection.genshinOptions[field].includes(value))collection.genshinOptions[field].push(value);return collection.genshinOptions[field]};
window.MochiGenshin.removeOption=function(collection,field,value){ensure(collection);collection.genshinOptions[field]=collection.genshinOptions[field].filter(x=>x!==value);return collection.genshinOptions[field]};
})();