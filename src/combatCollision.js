// First contact of a moving point with a sphere, as a fraction of the step.
export function sphereContactTime(start, end, center, radius) {
  const x = start.x - center.x, y = start.y - center.y, z = start.z - center.z;
  const dx = end.x - start.x, dy = end.y - start.y, dz = end.z - start.z;
  const c = x*x + y*y + z*z - radius*radius;
  if (c <= 0) return 0;
  const a = dx*dx + dy*dy + dz*dz;
  if (a < 1e-12) return null;
  const b = x*dx + y*dy + z*dz, discriminant = b*b - a*c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / a;
  return t >= 0 && t <= 1 ? t : null;
}

export function projectileStart(p) {
  return { x: p.prevX ?? p.x, y: p.prevY ?? p.y, z: p.prevZ ?? p.z };
}

export function projectileClashTime(a, b) {
  const a0 = projectileStart(a), b0 = projectileStart(b);
  return sphereContactTime(
    { x: a0.x-b0.x, y: a0.y-b0.y, z: a0.z-b0.z },
    { x: a.x-b.x, y: a.y-b.y, z: a.z-b.z },
    { x: 0, y: 0, z: 0 }, (a.radius+b.radius)*1.35);
}
