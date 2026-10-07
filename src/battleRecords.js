const KEY = 'sd3d.battle-records.v1';
export function saveBattleRecord(game, stats, storage) {
  if (game.practice || game.mode === 'dual' || !stats.won) return null;
  if(game.challenge && !stats.challengeComplete)return null;
  const player=game.player(),enemy=game.entities.find(e=>!e.isPlayer&&!e.summon);
  if (!player || !Number.isFinite(stats.seconds) || stats.seconds < 0) return null;
  const key=[game.modeFamily || 'classic',game.mode,game.mode==='story'?game.storyStage:'free',player.charId,enemy?.charId,game.difficulty,player.initialMaxHp ?? player.maxHp,game.groundDuel?'ground':'air',game.challenge||'none'].join(':');
  try {
    storage ||= globalThis.localStorage;
    if(!storage)return null;
    let records;
    try { records=JSON.parse(storage.getItem(KEY)||'{}'); } catch { records={}; }
    if (!records || typeof records !== 'object' || Array.isArray(records)) records={};
    const old=records[key];
    const seconds=Number.isFinite(old?.seconds) && old.seconds >= 0 ? old.seconds : Infinity;
    const wins=Number.isSafeInteger(old?.wins) && old.wins >= 0 ? old.wins : 0;
    const best=stats.seconds<seconds;
    records[key]={seconds:Math.min(seconds,stats.seconds),wins:wins+1};
    storage.setItem(KEY,JSON.stringify(records));
    return { best, seconds:records[key].seconds, wins:records[key].wins };
  } catch { return null; }
}
