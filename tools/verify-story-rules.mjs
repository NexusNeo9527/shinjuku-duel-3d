import assert from 'node:assert/strict';
import { Game3D } from '../src/Game3D.js';
import { CHARACTERS, STORY_STAGES } from '../src/config3d.js';
import { updateRaid } from '../src/shinjukuRaid.js';

const difficulties = ['easy', 'normal', 'shura', 'abyss'];
function duel(stage, difficulty = 'normal', side = 'ally') {
  const game = new Game3D(); game.modeFamily = 'story';
  game.setStory(stage, side); game.start('story', difficulty); game.finishStoryTransition();
  game.timeStop = game.hitStop = 0;
  if (game.raid?.trial > 0) { updateRaid(game, 10); updateRaid(game, 10); }
  return { game, player: game.player(), enemy: game.entities.find(e => !e.isPlayer && !e.summon) };
}
function ordinaryHit(game, target, source, amount) {
  target.invuln = 0;
  source.amplification = true;
  const id = CHARACTERS[source.charId].abilities.find(a => ['melee', 'attraction', 'orb'].includes(a.type))?.id;
  game.damage(target, amount, source, id);
}

const originalRandom = Math.random;
try {
  Math.random = () => .99; // Keep random Black Flash out of numeric comparisons.
  for (const stage of Object.keys(STORY_STAGES)) {
    const measurements = [];
    for (const difficulty of difficulties) {
      for (const side of STORY_STAGES[stage].shibuya ? ['ally'] : ['ally', 'enemy']) {
        const { game, player, enemy } = duel(stage, difficulty, side);
        for (let hits = 0; hits < 200 && game.state === 'playing'; hits++) ordinaryHit(game, enemy, player, 10);
        assert.equal(enemy.hp, 0, `${stage}/${difficulty}/${side}: ordinary attacks can defeat enemy`);
        assert.equal(enemy.alive, false);
        assert.equal(game.state, 'ended');
        assert.equal(game.winner, player);
        assert.equal(game.domains.length, 0, 'results clear domains');
        ordinaryHit(game, player, enemy, 10000);
        game.update(10);
        assert.equal(game.winner, player, 'late damage and timeout cannot overwrite victory');

        const losing = duel(stage, difficulty, side);
        ordinaryHit(losing.game, losing.player, losing.enemy, 10000);
        assert.equal(losing.game.state, 'ended', 'defeat settles immediately');
        assert.equal(losing.game.winner, losing.enemy);
      }
      const { game, player, enemy } = duel(stage, difficulty);
      const profile = game.getDifficultyProfile();
      const hp = enemy.maxHp;
      ordinaryHit(game, player, enemy, 20);
      const damage = player.maxHp - player.hp;
      Object.assign(enemy, { x: 0, y: 0, z: 0, stun: 0, recovery: 0, dashTimer: 0, vx: 0, vy: 0, vz: 0, sprinting: false, moveInput: { x: 1, y: 0, z: 0 } });
      game.updateEntity(enemy, .1);
      const movement = enemy.x;
      measurements.push({ hp, damage, movement, resistance: profile.damageTakenMultiplier, reaction: (profile.reactionMin + profile.reactionMax) / 2 });
    }
    for (let i = 1; i < measurements.length; i++) {
      const prev = measurements[i - 1], next = measurements[i];
      assert(next.hp > prev.hp, `${stage}: higher difficulty raises enemy health`);
      assert(next.damage > prev.damage, `${stage}: higher difficulty raises actual damage`);
      assert(next.movement > prev.movement, `${stage}: higher difficulty raises actual movement speed`);
      assert(next.resistance <= prev.resistance, `${stage}: defense never weakens`);
      assert(next.reaction < prev.reaction, `${stage}: reactions get faster`);
    }
    console.log(stage, 'ordinary win/loss across four difficulties; increasing health, damage, defense, movement and reaction');
  }
} finally { Math.random = originalRandom; }

assert.deepEqual(CHARACTERS.gojoTeen.abilities.map(a => a.id), ['blue', 'blueMax', 'infinity', 'fallingBlossom']);
assert(!CHARACTERS.yujiShibuya.abilities.some(a => a.type === 'domain' || a.type === 'heal'));
assert(!CHARACTERS.mahitoFinal.abilities.some(a => a.type === 'soulDomain'));
assert(CHARACTERS.toji.cursedEnergy === 0 && CHARACTERS.toji.grounded);
const { game, player } = duel('hiddenInventoryRematch');
player.charge = 99; assert.equal(game.tryCast(player, 2), false, 'Purple still needs charge');
player.charge = 100; assert.equal(game.tryCast(player, 2), true, 'Purple needs no scripted Red prerequisite');
console.log('Chapter loadouts and normal skill resources retained.');
