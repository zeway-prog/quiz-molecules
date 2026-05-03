// Unified script implementing parts/stages logic and avoiding duplicate declarations

// Data sources
const ADULTS = [
  "Acétylsalicylique (acide)", "Alprazolam", "Amiodarone", "Amoxicilline", "Bromazépam",
  "Buprénorphine", "Carbamazépine", "Codéine", "Colchicine", "Diazépam", "Dompéridone",
  "Ergocalciférol", "Fentanyl", "Fluconazole", "Gabapentine", "Ibuprofène", "Isotrétinoïne",
  "Kétoprofène", "Metformine", "Méthotrexate", "Méthylphénidate", "Métoclopramide",
  "Morphine", "Néfopam", "Oxycodone", "Paracétamol", "Prednisolone / prednisone",
  "Prégabaline", "Racécadotril", "Thiocolchicoside", "Tramadol", "Warfarine", "Zolpidem", "Zopiclone"
];

const CHILD = [
  "Acétylsalicylique (acide)", "Amoxicilline", "Bétaméthasone", "Céfixime", "Cefpodoxime",
  "Céfuroxime", "Cétirizine", "Desloratadine", "Ergocalciférol", "Esoméprazole", "Ibuprofène",
  "Lopéramide", "Métopimazine", "Paracétamol", "Prednisolone", "Prednisone", "Racécadotril", "Tramadol"
];

// Storage key
const STORAGE_KEY = 'medoc_name_state_v1';

// Runtime state
let availableAdults = [];
let availableChild = [];
let stageItems = []; // items currently in the stage pool: {name, origin}
let current = null; // {name, origin, index}
let stageNumber = 1; // 1-based
let trueCount = 0; // cumulative 'Vrai' confirmations across stages

// DOM elements
const originEl = document.getElementById('origin');
const molEl = document.getElementById('mol');
const startBtn = document.getElementById('start');
const trueBtn = document.getElementById('true');
const falseBtn = document.getElementById('false');
const hardResetBtn = document.getElementById('hard-reset');
const exportBtn = document.getElementById('export');
const countAdultEl = document.getElementById('count-adult');
const countChildEl = document.getElementById('count-child');
const listAdultEl = document.getElementById('list-adult');
const listChildEl = document.getElementById('list-child');
const toggleLists = document.getElementById('toggle-lists');
const listsWrapper = document.querySelector('.lists');
let advanceBtn = document.getElementById('advance');

// Create stage info element if not present
let stageEl = document.getElementById('stage-info');
if(!stageEl){ stageEl = document.createElement('div'); stageEl.id = 'stage-info'; const card = document.getElementById('card'); if(card) document.querySelector('main').insertBefore(stageEl, card); }

// Persistence
function saveState(){
  try{
    const payload = {availableAdults, availableChild, stageItems, stageNumber, trueCount};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }catch(e){ console.warn('save failed', e); }
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const p = JSON.parse(raw);
      availableAdults = Array.isArray(p.availableAdults) ? p.availableAdults.slice() : [...ADULTS];
      availableChild = Array.isArray(p.availableChild) ? p.availableChild.slice() : [...CHILD];
      stageItems = Array.isArray(p.stageItems) ? p.stageItems.slice() : [];
      stageNumber = typeof p.stageNumber === 'number' ? p.stageNumber : 1;
      trueCount = typeof p.trueCount === 'number' ? p.trueCount : 0;
      return;
    }
  }catch(e){ console.warn('load failed', e); }
  // default
  availableAdults = [...ADULTS];
  availableChild = [...CHILD];
  stageItems = [];
  stageNumber = 1;
  trueCount = 0;
}

// UI helpers
function updateUI(){
  if(countAdultEl) countAdultEl.textContent = availableAdults.length;
  if(countChildEl) countChildEl.textContent = availableChild.length;
  if(listAdultEl) listAdultEl.innerHTML = availableAdults.map(n=>`<li>${n}</li>`).join('');
  if(listChildEl) listChildEl.innerHTML = availableChild.map(n=>`<li>${n}</li>`).join('');
  if(stageEl) stageEl.innerHTML = `<p>Part ${stageNumber} — Vrai total: ${trueCount} / ${stageNumber*5}</p>`;
  if(advanceBtn) advanceBtn.disabled = !(trueCount >= stageNumber*5);
  // block True/False when the stage target is reached or no items available
  if(trueBtn) trueBtn.disabled = (trueCount >= stageNumber*5) || (stageItems.length===0 && (availableAdults.length+availableChild.length)===0);
  if(falseBtn) falseBtn.disabled = (trueCount >= stageNumber*5) || stageItems.length===0;
  if(exportBtn) exportBtn.disabled = (availableAdults.length + availableChild.length + stageItems.length)===0;
}

// Simplified behavior: no pediatric modal/OCR — 'Faux' simply picks next item
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// When user presses 'Faux' just pick the next item in the stage (or reshuffle)
function confirmFalse(){
  // show another molecule from the stage pool — ensure a different one is chosen
  try{
    if(!current){ showRandom(); return; }
    if(stageItems.length <= 1){
      // nothing else to pick: try to refill stage or just reshuffle
      ensureStageItems();
      showRandom();
      return;
    }
    // pick a random index different from current.index
    let idx = Math.floor(Math.random()*stageItems.length);
    if(idx === current.index) idx = (idx + 1) % stageItems.length;
    const next = stageItems[idx];
    current = { name: next.name, origin: next.origin, index: idx };
    if(originEl) originEl.textContent = current.origin;
    if(molEl) molEl.textContent = current.name;
    updateUI();
    console.debug('confirmFalse: switched to', current.name);
  }catch(e){ console.warn('confirmFalse error', e); }
}

if(falseBtn){
  falseBtn.removeEventListener && falseBtn.removeEventListener('click', confirmFalse);
  falseBtn.addEventListener('click', confirmFalse);
}

// Selection logic
function pickFromAvailable(){
  const total = availableAdults.length + availableChild.length;
  if(total===0) return null;
  const r = Math.floor(Math.random()*total);
  if(r < availableAdults.length) return {name: availableAdults.splice(r,1)[0], origin:'Adulte'};
  const idx = r - availableAdults.length;
  return {name: availableChild.splice(idx,1)[0], origin:'Enfant'};
}

function ensureStageItems(){
  // Only add the number of new items required to reach the stage target
  const needed = stageNumber*5 - trueCount;
  if(needed <= 0){
    // nothing to add for this stage
    stageItems = [];
    return;
  }
  while(stageItems.length < needed){
    const item = pickFromAvailable();
    if(!item) break;
    stageItems.push(item);
  }
}

function pickRandomFromStage(excludeIndex = -1){
  if(stageItems.length===0) return null;
  if(stageItems.length===1) return {name: stageItems[0].name, origin: stageItems[0].origin, index:0};
  let idx = Math.floor(Math.random()*stageItems.length);
  if(idx === excludeIndex){ // try once to get a different one
    idx = (idx + 1) % stageItems.length;
  }
  return {name: stageItems[idx].name, origin: stageItems[idx].origin, index: idx};
}

function showRandom(){
  if(stageItems.length===0) ensureStageItems();
  const picked = pickRandomFromStage();
  if(!picked){
    if(originEl) originEl.textContent = '-';
    if(molEl) molEl.textContent = 'Plus de molécules';
    if(startBtn) startBtn.disabled = true;
    if(trueBtn) trueBtn.disabled = true;
    if(falseBtn) falseBtn.disabled = true;
    updateUI();
    return;
  }
  current = picked;
  if(originEl) originEl.textContent = picked.origin;
  if(molEl) molEl.textContent = picked.name;
  if(startBtn) startBtn.disabled = true;
  if(trueBtn) trueBtn.disabled = false;
  if(falseBtn) falseBtn.disabled = false;
  updateUI();
}

function confirmTrue(){
  if(!current) return;
  // if we've already reached the stage limit, ignore further confirmations
  if(trueCount >= stageNumber*5) return;
  // remove selected index from stageItems
  stageItems.splice(current.index,1);
  trueCount = Math.min(trueCount + 1, stageNumber*5);
  current = null;
  saveState();
  // If we've met the stage target, block further confirms until advance
  if(trueCount >= stageNumber*5){
    if(originEl) originEl.textContent = '-';
    if(molEl) molEl.textContent = 'Part terminée';
    if(trueBtn) trueBtn.disabled = true;
    if(falseBtn) falseBtn.disabled = true;
  } else if(stageItems.length>0){
    showRandom();
  } else {
    // still no items available to show
    if(originEl) originEl.textContent = '-';
    if(molEl) molEl.textContent = 'Plus de molécules';
  if(startBtn) startBtn.disabled = true;
  if(trueBtn) trueBtn.disabled = true;
  if(falseBtn) falseBtn.disabled = true;
  }
  updateUI();
}

function pickNextFromStage(){
  if(!current) return;
  if(stageItems.length<=1) return; // nothing else to pick
  const next = pickRandomFromStage(current.index);
  if(next){ current = next; if(originEl) originEl.textContent = next.origin; if(molEl) molEl.textContent = next.name; }
}

function advanceStage(){
  if(trueCount < stageNumber*5) return;
  stageNumber += 1;
  ensureStageItems();
  saveState();
  updateUI();
  showRandom();
}

function resetAll(){
  availableAdults = [...ADULTS];
  availableChild = [...CHILD];
  stageItems = [];
  current = null;
  stageNumber = 1;
  trueCount = 0;
  if(originEl) originEl.textContent = '---';
  if(molEl) molEl.textContent = 'Appuie sur "Début"';
  if(startBtn) startBtn.disabled = false;
  if(trueBtn) trueBtn.disabled = true;
  if(falseBtn) falseBtn.disabled = true;
  saveState(); updateUI();
}

function hardReset(){
  try{ localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(STORAGE_KEY + '_prefs'); }catch(e){}
  resetAll();
  if(toggleLists){ toggleLists.checked = false; if(listsWrapper) listsWrapper.classList.add('hidden'); }
}

function exportCSV(){
  const rows = ['origin,name'];
  stageItems.forEach(i=>rows.push(`${i.origin},"${i.name.replace(/"/g,'""')}"`));
  availableAdults.forEach(n=>rows.push(`Adulte,"${n.replace(/"/g,'""')}"`));
  availableChild.forEach(n=>rows.push(`Enfant,"${n.replace(/"/g,'""')}"`));
  const csv = rows.join('\n');
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'medoc_remaining.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// init
loadState();
// toggle prefs
try{ const prefRaw = localStorage.getItem(STORAGE_KEY + '_prefs'); const pref = prefRaw ? JSON.parse(prefRaw) : null; if(pref && pref.showLists){ if(toggleLists) toggleLists.checked = true; if(listsWrapper) listsWrapper.classList.remove('hidden'); } else { if(toggleLists) toggleLists.checked = false; if(listsWrapper) listsWrapper.classList.add('hidden'); } }catch(e){ if(listsWrapper) listsWrapper.classList.add('hidden'); }

// events
if(startBtn) startBtn.addEventListener('click', showRandom);
if(trueBtn) trueBtn.addEventListener('click', confirmTrue);
if(falseBtn) falseBtn.addEventListener('click', confirmFalse);
if(hardResetBtn) hardResetBtn.addEventListener('click', hardReset);
if(advanceBtn) advanceBtn.addEventListener('click', advanceStage);
if(toggleLists){ toggleLists.addEventListener('change', ()=>{ if(toggleLists.checked) listsWrapper.classList.remove('hidden'); else listsWrapper.classList.add('hidden'); try{ localStorage.setItem(STORAGE_KEY + '_prefs', JSON.stringify({showLists: !!toggleLists.checked})); }catch(e){} }); }
if(exportBtn) exportBtn.addEventListener('click', exportCSV);

updateUI();
