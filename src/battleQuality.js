import { CHARACTERS, ARENA } from './config3d.js';
import { sphereContactTime } from './combatCollision.js';

export function guardFactor(entity, physical, domainHit) {
  if (domainHit || !(entity.guardTimer > 0)) return 1;
  if (entity.guardKind === 'higurumaAmplification') return .4;
  if (physical && ['bodyGuard', 'yujiGuard', 'mahitoGuard'].includes(entity.guardKind)) return .5;
  return 1;
}

function blockedSegment(a, b, box, padding = .9) {
  let lo = 0, hi = 1;
  for (const axis of ['x', 'z']) {
    const d = b[axis] - a[axis], min = box[axis === 'x' ? 'minX' : 'minZ'] - padding;
    const max = box[axis === 'x' ? 'maxX' : 'maxZ'] + padding;
    if (Math.abs(d) < 1e-8) { if (a[axis] < min || a[axis] > max) return false; }
    else { const t1 = (min-a[axis])/d, t2 = (max-a[axis])/d; lo = Math.max(lo, Math.min(t1,t2)); hi = Math.min(hi, Math.max(t1,t2)); }
    if (lo > hi) return false;
  }
  return true;
}

// A small, cached navigation grid only runs when a direct chase is obstructed.
// Physics still uses the existing collision boxes; this only chooses movement.
export function chaseDirection(game, entity, target, dt) {
  const boxes = game.closedDomain()?.type === 'void' ? [] : game.worldObstacles.filter(b => entity.y < b.maxY && entity.y + 2 > b.minY);
  const direct = () => { const dx=target.x-entity.x,dz=target.z-entity.z,l=Math.hypot(dx,dz)||1;return {x:dx/l,z:dz/l}; };
  if (!boxes.some(b => blockedSegment(entity,target,b))) { entity.navPath = null; return direct(); }
  entity.navWait = Math.max(0,(entity.navWait || 0)-dt);
  const key = `${Math.round(target.x/2)},${Math.round(target.z/2)},${Math.floor(entity.y/2)}`;
  if (!entity.navPath || entity.navKey !== key || entity.navWait <= 0) {
    entity.navKey=key; entity.navWait=.8;
    const half=ARENA.half, step=2, width=half+1;
    const cell = p => [Math.max(0,Math.min(width-1,Math.round((p.x+half)/step))),Math.max(0,Math.min(width-1,Math.round((p.z+half)/step)))];
    const id = (x,z) => z*width+x, point = i => ({x:(i%width)*step-half,z:Math.floor(i/width)*step-half});
    const blocked = new Set();
    for (const b of boxes) {
      for(let x=Math.max(0,Math.ceil((b.minX-.9+half)/step));x<=Math.min(width-1,Math.floor((b.maxX+.9+half)/step));x++)
        for(let z=Math.max(0,Math.ceil((b.minZ-.9+half)/step));z<=Math.min(width-1,Math.floor((b.maxZ+.9+half)/step));z++) blocked.add(id(x,z));
    }
    const nearest = p => {
      const [x,z]=cell(p);let best=null,d=Infinity;
      for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
        const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=width||zz>=width)continue;
        const i=id(xx,zz),q=point(i),dist=Math.hypot(q.x-p.x,q.z-p.z);
        if(!blocked.has(i)&&dist<d&&!boxes.some(b=>blockedSegment(p,q,b,.68))){best=i;d=dist;}
      }return best;
    };
    const start=nearest(entity),end=nearest(target),open=[],cost=new Map(),parent=new Map(),done=new Set();
    const heuristic = i => Math.hypot(point(i).x-point(end).x,point(i).z-point(end).z);
    if(start!==null&&end!==null){open.push(start);cost.set(start,0);}
    let found=false;
    for(let limit=0;open.length&&limit<3000;limit++){
      let best=0;for(let j=1;j<open.length;j++)if(cost.get(open[j])+heuristic(open[j])<cost.get(open[best])+heuristic(open[best]))best=j;
      const current=open.splice(best,1)[0];if(current===end){found=true;break;}done.add(current);
      const x=current%width,z=Math.floor(current/width);
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=width||zz>=width)continue;
        const next=id(xx,zz);if(blocked.has(next)||done.has(next)||boxes.some(b=>blockedSegment(point(current),point(next),b,.72)))continue;
        const nextCost=cost.get(current)+step;
        if(nextCost<(cost.get(next)??Infinity)){cost.set(next,nextCost);parent.set(next,current);if(!open.includes(next))open.push(next);}
      }
    }
    const path=[];if(found){for(let i=end;i!==start;i=parent.get(i))path.unshift(point(i));path.unshift(point(start));}
    entity.navPath=path;
  }
  while(entity.navPath.length&&Math.hypot(entity.navPath[0].x-entity.x,entity.navPath[0].z-entity.z)<.65)entity.navPath.shift();
  const p=entity.navPath[0];if(!p)return {x:0,z:0};
  const dx=p.x-entity.x,dz=p.z-entity.z,l=Math.hypot(dx,dz)||1;return {x:dx/l,z:dz/l};
}

export function reactToThreat(game, entity, target, dt) {
  entity.defenseWait=Math.max(0,(entity.defenseWait||0)-dt);
  if(entity.defenseWait>0||entity.meleeAttack||entity.pendingCast||entity.raidCast||entity.stun>0)return false;
  const distance=Math.hypot(target.x-entity.x,target.y-entity.y,target.z-entity.z);
  const windup=target.raidCast?.remaining||target.pendingCast?.remaining||target.meleeAttack?.remaining;
  const profile=game.getDifficultyProfile();
  const horizon=profile.reactionMin+.4;
  const projectile=game.projectiles.find(p=>p.alive&&!p.visualOnly&&p.team!==entity.team&&sphereContactTime(p,
    {x:p.x+p.vx*horizon,y:p.y+(p.vy||0)*horizon,z:p.z+p.vz*horizon},
    {x:entity.x,y:entity.y+1,z:entity.z},p.radius+1.2)!==null);
  if (entity.defenseProjectile !== projectile) {
    entity.defenseProjectile = projectile;
    entity.defenseSeenAt = game.elapsed;
  }
  if(!projectile&&!(windup>0&&distance<12))return false;
  const reaction=target.meleeAttack ? Math.min(.18,profile.reactionMin*.25) : profile.reactionMin;
  const projectileReady=projectile&&game.elapsed-entity.defenseSeenAt>=profile.reactionMin;
  const windupReady=windup>0&&distance<12&&game.elapsed-(target.attackStartedAt??game.elapsed)>=reaction;
  if(!projectileReady&&!windupReady)return false;
  const dx=projectileReady?projectile.vx:target.x-entity.x,dz=projectileReady?projectile.vz:target.z-entity.z,l=Math.hypot(dx,dz)||1;
  entity.defenseWait=profile.reactionMin+.5;
  if(entity.dashCooldown<=0&&game.tryDash(entity,-dz/l,0,dx/l))return true;
  const index=CHARACTERS[entity.charId].abilities.findIndex(a=>a.type==='guard'&&game.aiAbilityReady(entity,CHARACTERS[entity.charId].abilities.indexOf(a)));
  if(index>=0)return game.tryCast(entity,index);
  return false;
}

export function battleHint(game, player) {
  if(!player)return '';
  const enemy=game.enemyList(player).find(e=>e.alive&&!e.summon);
  if(enemy?.raidCast?.ability.type==='execution')return '处刑剑蓄势 · 侧向闪避或攻击打断';
  if(enemy?.raidCast||enemy?.pendingCast)return '对手正在蓄势 · 侧向闪避，抓住收招机会';
  if(player.blackFlashUntil>game.elapsed)return `黑闪机会 ${(player.blackFlashUntil-game.elapsed).toFixed(1)}秒 · 近身按奥义`;
  if(player.stun>0)return '受击中 · 等待恢复';
  if(player.burnout>0)return '术式熔断 · 使用体术或简易领域';
  if(player.meleeRecovery>0)return '收招中 · 可提前输入下一招，或冲刺取消';
  if(player.guardTimer>0&&['bodyGuard','yujiGuard','mahitoGuard'].includes(player.guardKind))return '防守中 · 减轻体术伤害，无法抵消领域必中';
  if(game.groundDuel)return '地面对战 · 双方禁用升降';
  return '';
}
