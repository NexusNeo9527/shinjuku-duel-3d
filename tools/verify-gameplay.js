import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { Game3D } from '../src/Game3D.js';
import { CHARACTERS, FREE_BATTLE_CHARACTERS, STORY_STAGES } from '../src/config3d.js';
import { BINDINGS, loadInputSettings } from '../src/inputSettings.js';
import { saveBattleRecord } from '../src/battleRecords.js';
import { mediaPreloadTasks } from '../src/preloadMedia.js';
import { BGM_TRACKS } from '../src/audio.js';
import * as THREE from 'three';
import { Renderer3D } from '../src/three/Renderer3D.js';

const fixture = (p='yuta',e='sukuna',mode='dual') => {
  const g=new Game3D();g.modeFamily='free';g.freePlayerChar=p;g.freeEnemyChar=e;g.start(mode);
  g.timeStop=g.hitStop=0;return g;
};
// Both players can independently select a summon without changing the other's aim.
{
  const g=fixture('yuta','yuta'),[p1,p2]=g.entities;
  g.castSummon(p1,CHARACTERS.yuta.abilities.find(a=>a.type==='summon'));
  g.castSummon(p2,CHARACTERS.yuta.abilities.find(a=>a.type==='summon'));
  const a=g.entities.find(e=>e.summon&&e.ownerId===p1.id),b=g.entities.find(e=>e.summon&&e.ownerId===p2.id);
  assert.equal(g.cycleLock(p1),b);assert.equal(g.cycleLock(p2),a);
  assert.equal(g.lockEntity(p1),b);assert.equal(g.lockEntity(p2),a);
  assert(g.cycleCopy(p2));assert.equal(p1.copyIndex,0);assert.equal(p2.copyIndex,1);
}
{
  const saved=Object.fromEntries(BINDINGS.filter(b=>!['p2.copy','p2.lock'].includes(b.id)).map(b=>[b.id,b.defaultCode]));
  saved['p1.descend']='Comma';saved['p2.descend']='Slash';
  globalThis.localStorage={getItem:()=>JSON.stringify({bindings:saved})};
  const loaded=loadInputSettings();delete globalThis.localStorage;
  assert.equal(loaded.bindings['p1.descend'],'Comma');assert.equal(loaded.bindings['p2.descend'],'Slash');
  assert.equal(new Set(Object.values(loaded.bindings)).size,BINDINGS.length);
}
{
  let value='null';const storage={getItem:()=>value,setItem:(_key,next)=>{value=next;}};
  const g=fixture('yujiShibuya','mahito','single'),p=g.player();
  const stats={won:true,seconds:20};
  assert.equal(saveBattleRecord(g,stats,storage).wins,1,'invalid record roots recover');
  p.maxHp=60;assert.equal(saveBattleRecord(g,{...stats,seconds:25},storage).wins,2,'soul damage cannot change starting-HP record category');
  g.modeFamily='classic';assert.equal(saveBattleRecord(g,stats,storage).wins,1,'classic and free categories remain separate');
  value='{broken';assert.equal(saveBattleRecord(g,stats,storage).wins,1,'malformed JSON recovers');
  assert.equal(saveBattleRecord(g,{won:true,seconds:NaN},storage),null);
}
{
  const g=fixture('gojo','sukuna','single');g.difficulty='shura';g.challenge='noHeal';
  g.player().hp=50;g.entities[1].dummy=true;g.update(.1);
  assert(g.player().hp>50);g.winner=g.player();g.finishEnd();assert.equal(g.resultStats.challengeComplete,false);
  g.blackFlashCount=8;g.hitPulse=1;g.events.push({type:'old'});g.start('single');
  assert.equal(g.blackFlashCount,0);assert.equal(g.hitPulse,0);assert(!g.events.some(e=>e.type==='old'));
}
// Every listed boot image/music file exists and is nonempty.
const tasks=mediaPreloadTasks({preloadTrack(){}});
for(const track of BGM_TRACKS) assert(statSync(new URL(`../public${track.src}`,import.meta.url)).size>0,track.id);
{
  const renderer=Object.create(Renderer3D.prototype);
  renderer.scene=new THREE.Scene();renderer.projectiles=new Map();
  const group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.SphereGeometry(),new THREE.MeshBasicMaterial());
  group.add(mesh);const ribbon=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial());
  const p={alive:true};renderer.scene.add(group,ribbon);renderer.projectiles.set(p,{group,ribbon:{mesh:ribbon}});
  let disposed=0;for(const resource of [mesh.geometry,mesh.material,ribbon.geometry,ribbon.material])resource.addEventListener('dispose',()=>disposed++);
  renderer.syncProjectiles({projectiles:[]});
  assert.equal(renderer.projectiles.size,0);assert.equal(renderer.scene.children.length,0);assert.equal(disposed,4,'cleared live projectiles release GPU resources');
}
for (const task of tasks) {
  const file=task.label.startsWith('图片')?task.label.split(' · ')[1]:null;
  if (file) assert(statSync(new URL(`../public/assets/${file}`,import.meta.url)).size>0,file);
}
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'DOM ids are unique');
assert.match(html,/data-story-stage="opening"/,'Gojo versus Sukuna is selectable in story');
assert.equal(STORY_STAGES.opening.next,'kashimoDuel');
for(const side of ['ally','enemy'])for(const mode of ['story','dual']){
  const g=new Game3D();g.modeFamily='story';g.setStory('opening',side);g.start(mode);
  assert.deepEqual(g.entities.slice(0,2).map(e=>e.charId),side==='ally'?['gojo','sukuna']:['sukuna','gojo']);
  assert.equal(g.entities[1].isPlayer,mode==='dual');
  assert.equal(g.borrowedBattle,null,'original fighters do not enter borrowed-body mechanics');
}
for(const [stage,config] of Object.entries(STORY_STAGES)){
  assert(CHARACTERS[config.ally]&&CHARACTERS[config.enemy],stage);
  if(config.next)assert(STORY_STAGES[config.next],stage+' next chapter');
}

const originalRandom=Math.random;let seed=701;
Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let finished=0,total=0,quiet=0;
try {
  for(const player of FREE_BATTLE_CHARACTERS)for(const enemy of FREE_BATTLE_CHARACTERS){
    const g=fixture(player,enemy,'single'),p=g.player();total++;
    for(let frame=0;frame<1800&&g.state==='playing';frame++){
      const dt=1/30;
      g.timeStop=Math.max(0,g.timeStop-dt);if(g.cutIn){g.cutIn.life-=dt;if(g.cutIn.life<=0)g.cutIn=null;}
      if(g.timeStop>0)continue;
      const target=g.lockEntity(p);
      if(target){
        const dx=target.x-p.x,dz=target.z-p.z,l=Math.hypot(dx,dz)||1;
        const melee=CHARACTERS[p.charId].abilities[0]?.type==='melee';
        g.setMove(p,l>(melee?2.7:12)?dx/l:0,l>(melee?2.7:12)?dz/l:0,Math.sign(target.y-p.y));
        g.setAim(p,target.x,target.z);
        if(frame%3===0){
          const index=g.pickAiAbility(p,Math.hypot(dx,dz,target.y-p.y));
          if(index>=0)g.tryCast(p,index);
          else if(l<3.2)g.tryBasicAttack(p);
        }
      }
      g.update(dt);
      // The renderer consumes these transient events; do the same headlessly.
      g.drainEvents();g.particles=[];g.sceneHits=[];
      if(frame%30===0)for(const e of g.entities){
        assert([e.x,e.y,e.z,e.hp,e.maxHp,e.charge,e.domainCharge].every(Number.isFinite),`${player}/${enemy}: finite state`);
        assert(e.hp>=0&&e.hp<=e.maxHp+1e-8,`${player}/${enemy}: bounded HP`);
        assert(e.charge>=0&&e.charge<=100&&e.domainCharge>=0&&e.domainCharge<=100,`${player}/${enemy}: bounded resources`);
      }
    }
    if(g.state==='ended')finished++;
    if(!g.entities.some(e=>e.battleStats?.damage>0))quiet++;
  }
}finally{Math.random=originalRandom;}
assert.equal(quiet,0,'every matchup produces effective damage with the scripted controller');
console.log(`Full gameplay: ${total} ordered character pairs, ${finished} results within 60 simulated seconds; finite states, independent P2 controls, storage isolation/recovery, passive healing, restart reset and ${tasks.length} media tasks verified.`);
