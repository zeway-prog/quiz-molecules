const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');

const ROOT = '/home/realzeway/Bureau';
const OUT = path.join(__dirname, 'pediatric_info.parsed.json');

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

function walk(dir){
  const results = [];
  const list = fs.readdirSync(dir, {withFileTypes:true});
  for(const ent of list){
    const full = path.join(dir, ent.name);
    if(ent.isDirectory()){
      // skip node_modules and hidden .venv etc to speed up
      if(ent.name === 'node_modules' || ent.name === '.venv' || ent.name === 'venv' || ent.name.startsWith('.')) continue;
      try{ results.push(...walk(full)); }catch(e){}
    } else if(ent.isFile()){
      const lname = ent.name.toLowerCase();
      if(/\.(png|jpe?g|tif{1,2}|bmp|webp|gif)$/.test(lname)){
        if(/ordo|pedi|pédi|tableau|dose/.test(lname)) results.push(full);
      }
    }
  }
  return results;
}

function detectMolecules(text){
  const found = {};
  if(!text) return found;
  const pool = Array.from(new Set([...ADULTS, ...CHILD]));
  const low = text.toLowerCase();
  pool.forEach(name=>{ if(name && low.indexOf(name.toLowerCase()) !== -1){ found[name] = { raw: text }; } });
  return found;
}

(async ()=>{
  console.log('Scanning for candidate images under', ROOT);
  let files = [];
  try{ files = walk(ROOT); }catch(e){ console.error('walk error', e); process.exit(1); }
  if(files.length===0){ console.log('No candidate image files found.'); process.exit(0); }
  console.log('Found', files.length, 'candidate images');

  const worker = createWorker({ logger: m => { /* console.log(m); */ } });
  await worker.load();
  // try French
  try{ await worker.loadLanguage('fra'); await worker.initialize('fra'); }catch(e){ console.warn('Could not initialize french traineddata, proceeding with default'); }

  const aggregated = {};

  for(const f of files){
    console.log('OCR:', f);
    try{
      const { data: { text } } = await worker.recognize(f);
      const detected = detectMolecules(text);
      const keys = Object.keys(detected);
      if(keys.length>0){
        keys.forEach(k=>{
          aggregated[k] = aggregated[k] || { denomination: k, voie:'', doses_usuelles:'', doses_maximales:'', remarques:'', exemple:'', classe:'', autres:'', sources: [] };
          aggregated[k].remarques = aggregated[k].remarques || text;
          aggregated[k].sources.push(f);
        });
      } else {
        // write to a misc bucket for later review
        aggregated.__unmatched = aggregated.__unmatched || [];
        aggregated.__unmatched.push({file: f, text: text.slice(0,400)});
      }
    }catch(err){ console.error('OCR failed for', f, err.message || err); }
  }

  await worker.terminate();

  try{
    fs.writeFileSync(OUT, JSON.stringify(aggregated, null, 2), 'utf8');
    console.log('Wrote parsed JSON to', OUT);
  }catch(e){ console.error('Failed to write output JSON', e); process.exit(1); }

  console.log('Done.');
})();
