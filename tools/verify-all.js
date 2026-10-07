import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const directory=new URL('./',import.meta.url);
const scripts=readdirSync(directory).filter(name=>/^verify-.*\.(?:mjs|js)$/.test(name)&&name!=='verify-all.js').sort();
const required=['audio-controls','borrowed','closed-domains','domain-breaks','domain-dynamics','fighters','hidden-inventory','latest-arenas','open-domain','simple-domain','story-rules','story','yuji-mahito'].map(name=>`verify-${name}.mjs`).concat(['verify-gameplay.js','verify-mobile-ui.js']);
const missing=required.filter(name=>!scripts.includes(name));
if(missing.length)throw new Error(`Missing required verification suites: ${missing.join(', ')}`);
const failures=[];
for(const script of scripts){
  const result=spawnSync(process.execPath,[fileURLToPath(new URL(script,directory))],{encoding:'utf8',timeout:120000});
  if(result.status!==0){
    failures.push(script);
    console.error(`FAIL ${script}\n${result.stdout||''}${result.stderr||''}${result.error?.message||''}`);
  }else console.log(`PASS ${script}`);
}
console.log(`${scripts.length-failures.length}/${scripts.length} verification suites passed.`);
if(failures.length)process.exitCode=1;
