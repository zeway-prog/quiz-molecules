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
  "Céfuroxime", "Cétirizine", "Desloratadine", "Ergocalciférol", "Ésoméprazole", "Ibuprofène",
  "Lopéramide", "Métopimazine", "Paracétamol", "Prednisolone", "Prednisone", "Racécadotril", "Tramadol"
];

const STORAGE_KEY = 'medoc_name_state_v3';

// State
let availableAdults = [];
let availableChild = [];
let stageItems = [];       
let masteredItems = [];    
let current = null;        
let stageNumber = 1; 
let trueCount = 0;         
let medData = {}; 

// Elements
const originEl = document.getElementById('origin');
const molEl = document.getElementById('mol');
const startBtn = document.getElementById('start');
const trueBtn = document.getElementById('true');
const falseBtn = document.getElementById('false');
const advanceBtn = document.getElementById('advance');
const hardResetBtn = document.getElementById('hard-reset');
const countAdultEl = document.getElementById('count-adult');
const countChildEl = document.getElementById('count-child');
const stageEl = document.getElementById('stage-info');
const modal = document.getElementById('correction-modal');
const modalBody = document.getElementById('modal-body');
const closeModal = document.getElementById('close-modal');

// Load JSON
fetch('pediatric_info.json')
  .then(res => res.json())
  .then(data => { medData = data; })
  .catch(err => console.error("Erreur JSON:", err));

function updateUI(){
  if(countAdultEl) countAdultEl.textContent = availableAdults.length;
  if(countChildEl) countChildEl.textContent = availableChild.length;
  const target = stageNumber * 5;
  if(stageEl) stageEl.innerHTML = `<h3>Partie ${stageNumber} — Score : ${trueCount} / ${target}</h3>`;
  if(advanceBtn) advanceBtn.disabled = (trueCount < target);
  if(trueBtn) trueBtn.disabled = (trueCount >= target) || (stageItems.length === 0 && (availableAdults.length + availableChild.length) === 0);
  if(falseBtn) falseBtn.disabled = (trueCount >= target) || (stageItems.length === 0 && !current);
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({availableAdults, availableChild, stageItems, masteredItems, stageNumber, trueCount}));
}

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw){
    const p = JSON.parse(raw);
    availableAdults = p.availableAdults || [...ADULTS];
    availableChild = p.availableChild || [...CHILD];
    stageItems = p.stageItems || [];
    masteredItems = p.masteredItems || [];
    stageNumber = p.stageNumber || 1;
    trueCount = p.trueCount || 0;
  } else {
    resetAll();
  }
}

function pickFromAvailable(){
  const total = availableAdults.length + availableChild.length;
  if(total === 0) return null;
  const r = Math.floor(Math.random() * total);
  if(r < availableAdults.length) return {name: availableAdults.splice(r,1)[0], origin:'Adulte'};
  const idx = r - availableAdults.length;
  return {name: availableChild.splice(idx,1)[0], origin:'Enfant'};
}

function showRandom(){
  if(stageItems.length === 0 && trueCount === 0 && masteredItems.length === 0){
    for(let i=0; i<5; i++){
      const item = pickFromAvailable();
      if(item) stageItems.push(item);
    }
  }
  if(stageItems.length === 0) return;
  const idx = Math.floor(Math.random() * stageItems.length);
  current = { ...stageItems[idx], index: idx };
  originEl.textContent = current.origin;
  molEl.textContent = current.name;
  startBtn.disabled = true;
  updateUI();
}

function confirmTrue(){
  if(!current) return;
  const item = stageItems.splice(current.index, 1)[0];
  masteredItems.push(item);
  trueCount++;
  current = null;
  saveState();
  if(trueCount >= stageNumber * 5) molEl.textContent = "Partie terminée !";
  else showRandom();
  updateUI();
}

function confirmFalse(){
    if (!current) return;
    const info = medData[current.name];
    if (info) {
        modalBody.innerHTML = `
            <table class="info-table">
                <tr><td class="label">Molécule</td><td>${current.name}</td></tr>
                <tr><td class="label">Classe</td><td>${info.classe || '-'}</td></tr>
                <tr><td class="label">Doses Usuelles</td><td>${info.doses_usuelles || '-'}</td></tr>
                <tr><td class="label">Doses Max</td><td>${info.doses_maximales || '-'}</td></tr>
                <tr><td class="label">Remarques</td><td>${info.remarques || '-'}</td></tr>
                <tr><td class="label">Spécialité</td><td>${info.exemple || '-'}</td></tr>
            </table>`;
    } else {
        modalBody.innerHTML = `<p>Fiche non trouvée pour ${current.name}</p>`;
    }
    modal.classList.remove('hidden');
}

if(closeModal) {
    closeModal.onclick = () => { modal.classList.add('hidden'); showRandom(); };
}

function advanceStage(){
  if(trueCount < stageNumber * 5) return;
  stageNumber++;
  stageItems = [...masteredItems];
  masteredItems = []; 
  for(let i=0; i<5; i++){
    const item = pickFromAvailable();
    if(item) stageItems.push(item);
  }
  saveState(); updateUI(); showRandom();
}

function resetAll(){
  availableAdults = [...ADULTS]; availableChild = [...CHILD];
  stageItems = []; masteredItems = []; current = null; stageNumber = 1; trueCount = 0;
  originEl.textContent = '---'; molEl.textContent = 'Appuie sur "Début"';
  startBtn.disabled = false; saveState(); updateUI();
}

startBtn.addEventListener('click', showRandom);
trueBtn.addEventListener('click', confirmTrue);
falseBtn.addEventListener('click', confirmFalse);
advanceBtn.addEventListener('click', advanceStage);
hardResetBtn.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); resetAll(); });

loadState();
updateUI();