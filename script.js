// Unified script - Logic: Cumulative Learning (5 new + all previous)

// Data sources (Updated from provided table)
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
  "Céfuroxime", "Cétirizine", "Desloratadine", "Ergocalciférol", "Ésoméprazole", "Ibuprofène",
  "Lopéramide", "Métopimazine", "Paracétamol", "Prednisolone", "Prednisone", "Racécadotril", "Tramadol"
];

const STORAGE_KEY = 'medoc_name_state_v2';

// Runtime state
let availableAdults = [];
let availableChild = [];
let stageItems = [];       // Molécules à trouver dans le tour actuel
let masteredItems = [];    // Molécules déjà réussies (à réinjecter au prochain palier)
let current = null;        // {name, origin, index}
let stageNumber = 1; 
let trueCount = 0;         // Score cumulé

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

let stageEl = document.getElementById('stage-info');
if(!stageEl){ 
    stageEl = document.createElement('div'); 
    stageEl.id = 'stage-info'; 
    const card = document.getElementById('card'); 
    if(card) document.querySelector('main').insertBefore(stageEl, card); 
}

// Persistence
function saveState(){
  try {
    const payload = {availableAdults, availableChild, stageItems, masteredItems, stageNumber, trueCount};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch(e){ console.warn('save failed', e); }
}

function loadState(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const p = JSON.parse(raw);
      availableAdults = p.availableAdults || [...ADULTS];
      availableChild = p.availableChild || [...CHILD];
      stageItems = p.stageItems || [];
      masteredItems = p.masteredItems || [];
      stageNumber = p.stageNumber || 1;
      trueCount = p.trueCount || 0;
      return;
    }
  } catch(e){ console.warn('load failed', e); }
  resetAll();
}

// UI updates
function updateUI(){
  if(countAdultEl) countAdultEl.textContent = availableAdults.length;
  if(countChildEl) countChildEl.textContent = availableChild.length;
  if(listAdultEl) listAdultEl.innerHTML = availableAdults.map(n=>`<li>${n}</li>`).join('');
  if(listChildEl) listChildEl.innerHTML = availableChild.map(n=>`<li>${n}</li>`).join('');
  
  const target = stageNumber * 5;
  if(stageEl) stageEl.innerHTML = `<h3>Partie ${stageNumber} — Vrai total: ${trueCount} / ${target}</h3>`;
  
  if(advanceBtn) advanceBtn.disabled = (trueCount < target);
  if(trueBtn) trueBtn.disabled = (trueCount >= target) || (stageItems.length === 0 && (availableAdults.length + availableChild.length) === 0);
  if(falseBtn) falseBtn.disabled = (trueCount >= target) || (stageItems.length === 0 && !current);
}

// Selection logic
function pickFromAvailable(){
  const total = availableAdults.length + availableChild.length;
  if(total === 0) return null;
  const r = Math.floor(Math.random() * total);
  if(r < availableAdults.length) return {name: availableAdults.splice(r,1)[0], origin:'Adulte'};
  const idx = r - availableAdults.length;
  return {name: availableChild.splice(idx,1)[0], origin:'Enfant'};
}

function ensureInitialStage(){
  if(stageItems.length === 0 && trueCount === 0 && masteredItems.length === 0){
    for(let i=0; i<5; i++){
      const item = pickFromAvailable();
      if(item) stageItems.push(item);
    }
  }
}

function showRandom(){
  ensureInitialStage();
  if(stageItems.length === 0) return;
  
  const idx = Math.floor(Math.random() * stageItems.length);
  current = { ...stageItems[idx], index: idx };
  
  if(originEl) originEl.textContent = current.origin;
  if(molEl) molEl.textContent = current.name;
  if(startBtn) startBtn.disabled = true;
  updateUI();
}

function confirmTrue(){
  if(!current) return;
  
  const item = stageItems.splice(current.index, 1)[0];
  masteredItems.push(item);
  
  trueCount++;
  current = null;
  saveState();

  if(trueCount >= stageNumber * 5){
    if(originEl) originEl.textContent = "-";
    if(molEl) molEl.textContent = "Partie terminée !";
  } else {
    showRandom();
  }
  updateUI();
}

function confirmFalse(){
  showRandom();
}

function advanceStage(){
  const target = stageNumber * 5;
  if(trueCount < target) return;

  stageNumber++;
  
  // Reprendre les molécules précédentes + ajouter 5 nouvelles
  stageItems = [...masteredItems];
  masteredItems = []; 
  
  for(let i=0; i<5; i++){
    const item = pickFromAvailable();
    if(item) stageItems.push(item);
  }

  saveState();
  updateUI();
  showRandom();
}

function resetAll(){
  availableAdults = [...ADULTS];
  availableChild = [...CHILD];
  stageItems = [];
  masteredItems = [];
  current = null;
  stageNumber = 1;
  trueCount = 0;
  if(originEl) originEl.textContent = '---';
  if(molEl) molEl.textContent = 'Appuie sur "Début"';
  if(startBtn) startBtn.disabled = false;
  saveState(); 
  updateUI();
}

function hardReset(){
  localStorage.removeItem(STORAGE_KEY);
  resetAll();
}

// Events
if(startBtn) startBtn.addEventListener('click', showRandom);
if(trueBtn) trueBtn.addEventListener('click', confirmTrue);
if(falseBtn) falseBtn.addEventListener('click', confirmFalse);
if(hardResetBtn) hardResetBtn.addEventListener('click', hardReset);
if(advanceBtn) advanceBtn.addEventListener('click', advanceStage);

if(toggleLists){
  toggleLists.addEventListener('change', () => {
    listsWrapper.classList.toggle('hidden', !toggleLists.checked);
  });
}

// Init
loadState();
updateUI();