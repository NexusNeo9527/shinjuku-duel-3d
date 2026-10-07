import assert from 'node:assert/strict';
import { Game3D } from '../src/Game3D.js';
import { CHARACTERS } from '../src/config3d.js';

for (const stage of [null, 'borrowed', 'yuta']) {
  const g = new Game3D();
  if (stage) g.setStory(stage, 'ally');
  g.start(stage ? 'story' : 'single', 'normal');
  if (stage === 'borrowed') { g.storyTimer = 0;g.domains = [];g.syncDomainCaptives(); }
  const p = g.player(), e = g.entities.find(x => x !== p);
  Object.assign(p, { x: -44, z: -44 }); Object.assign(e, { x: 44, z: 44, y: 30 });
  const original = g.entities.map(x => [x.x, x.y, x.z]);
  g.castDomain(p, CHARACTERS[p.charId].abilities.find(a => a.type === 'domain') || CHARACTERS.gojo.abilities[3]);
  const d = g.closedDomain(); assert.ok(d);
  for (const entity of g.entities) {
    assert.ok(entity.domainReturnPosition);
    assert.ok(Math.hypot(entity.x - d.x, entity.y + 1 - d.y, entity.z - d.z) < d.radius);
    Object.assign(entity, { vx: 999, vz: 999, dashTimer: 1 });
    g.resolveWorldMovement(entity, entity.x, entity.z, 1000, -1000);
    assert.ok(Math.hypot(entity.x - d.x, entity.y + 1 - d.y, entity.z - d.z) <= d.radius - 1.99);
    assert.equal(entity.dashTimer, 0);
  }
  g.updateDomains(10);
  assert.deepEqual(g.entities.map(x => [x.x, x.y, x.z]), original);
  assert.ok(g.entities.every(x => !x.domainReturnPosition));
}
const g = new Game3D();g.start('single','normal');
const [p,e] = g.entities;
g.setWorldObstacles([{minX:2,maxX:4,minZ:-10,maxZ:10,minY:0,maxY:20}]);
Object.assign(p,{x:0,y:0,z:0});
g.castDomain(p,CHARACTERS.gojo.abilities[3]);
g.resolveWorldMovement(p,0,0,6,0);assert.equal(p.x,6,'void must not retain invisible buildings');
g.castSummon(e,CHARACTERS.sukuna.abilities.find(a=>a.type==='summon'));
const summon=g.entities.find(x=>x.summon);g.syncDomainCaptives();assert.ok(summon.domainReturnPosition);
g.castDomain(e,CHARACTERS.sukuna.abilities[3]);assert.ok(g.closedDomain(),'closed barrier initially survives equal open-domain contention');
g.updateDomains(3.3);assert.equal(g.closedDomain(),undefined);
assert.ok(g.entities.every(x=>!x.domainReturnPosition));
g.castDomain(e,CHARACTERS.sukuna.abilities[3]);assert.equal(g.closedDomain(),undefined,'Shrine remains open');
console.log('Closed domain capture, 3 characters, dash containment, release, summons and open Shrine verified.');
