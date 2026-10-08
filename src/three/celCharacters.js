import * as THREE from 'three';

// Material.clone() omits shader callbacks. Combat clones materials to isolate
// hit flashes; carry these hooks too so the arena retains the reviewed style.
export function cloneCharacterMaterial(material) {
  const copy = material.clone();
  copy.onBeforeCompile = material.onBeforeCompile;
  copy.customProgramCacheKey = material.customProgramCacheKey;
  return copy;
}

// Authored against r169's meshtoon shader. Keep the GLB's albedo, alpha, normals
// and emissive response; use a stable key for readable anime bands in bright arenas.
export function applyCharacterCelStyle(root) {
  const meshes = [];
  root.traverse(o => { if (o.isMesh) meshes.push(o); });
  const materials = new Map();
  for (const mesh of meshes) {
    const original = mesh.material;
    if (Array.isArray(original) || !original.color) continue;
    if (!materials.has(original)) {
      const mat = new THREE.MeshToonMaterial({
        color: original.color, map: original.map, normalMap: original.normalMap,
        transparent: original.transparent, opacity: original.opacity,
        alphaTest: original.alphaTest, side: original.side,
        emissive: original.emissive ?? 0x000000,
        emissiveIntensity: original.emissiveIntensity ?? 0,
        fog: original.fog, toneMapped: false,
      });
      mat.name = original.name;
      mat.userData = { ...original.userData, characterCel: true };
      const referencePaint = original.name === 'Toji / reference painted skin';
      const animationFace = original.name === 'Animation / skin' || referencePaint;
      mat.userData.animationFace = animationFace;
      mat.onBeforeCompile = shader => {
        if (animationFace) {
          // Authored GLB coordinates are Y-up. Keep this mask in rest space so
          // head motion carries the simplified face treatment with the skin.
          shader.vertexShader = 'varying vec3 vAnimeRestPosition;\n' + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
            '#include <begin_vertex>\nvAnimeRestPosition = position;');
          shader.fragmentShader = 'varying vec3 vAnimeRestPosition;\n' + shader.fragmentShader;
        }
        shader.fragmentShader = shader.fragmentShader.replace(
          'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',
          `vec3 celNormal = inverseTransformDirection(normal, viewMatrix);
           float celLight = dot(celNormal, normalize(vec3(-0.45, 0.70, 0.65)));
           vec3 celBand = celLight < -0.10 ? vec3(0.43, 0.45, 0.59)
             : celLight < 0.38 ? vec3(0.70, 0.72, 0.82) : vec3(1.0);
           ${animationFace ? `float faceMask = step(1.655, vAnimeRestPosition.y)
             * step(vAnimeRestPosition.y, 1.810) * step(0.080, vAnimeRestPosition.z);
           vec3 faceBand = ${referencePaint ? 'false' : 'celLight < 0.15 && abs(vAnimeRestPosition.x) > 0.052'}
             ? vec3(0.77, 0.66, 0.57) : vec3(1.0);
           celBand = mix(celBand, faceBand, faceMask);` : ''}
           ${referencePaint ? `float cheekBlend = smoothstep(0.052, 0.080, abs(vAnimeRestPosition.x))
             * (1.0 - smoothstep(1.755, 1.775, vAnimeRestPosition.y))
             * smoothstep(1.670, 1.690, vAnimeRestPosition.y);
           diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.87137, 0.65837, 0.49693), cheekBlend);` : ''}
           vec3 outgoingLight = diffuseColor.rgb * celBand + totalEmissiveRadiance;`
        );
      };
      mat.customProgramCacheKey = () => referencePaint ? 'toji-reference-face-r169-v6' : animationFace ? 'toji-animation-face-r169-v4' : 'character-cel-r169-v1';
      materials.set(original, mat);
    }
    mesh.material = materials.get(original);
    // Single-sided solid surfaces only. Tiny face decals, teeth and chain links
    // use their own ink geometry; outlining them creates noisy black knots.
    if (mesh.geometry.attributes.position.count < 250 ||
        /ink|eye|iris|pupil|scar|steel|gold|tooth|mouth|fold|shade/i.test(original.name)) continue;
    const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x171e2d,
      side: THREE.BackSide, toneMapped: false, depthWrite: false, fog: true });
    outlineMaterial.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
        'vec3 transformed = vec3(position) + normalize(normal) * 0.0010;');
    };
    outlineMaterial.customProgramCacheKey = () => 'character-outline-r169-v1';
    const outline = mesh.isSkinnedMesh ? new THREE.SkinnedMesh(mesh.geometry, outlineMaterial)
      : new THREE.Mesh(mesh.geometry, outlineMaterial);
    if (mesh.isSkinnedMesh) {
      outline.bindMode = mesh.bindMode;
      outline.bind(mesh.skeleton, mesh.bindMatrix);
      outline.frustumCulled = false;
    }
    outline.name = 'cel_outline';
    outline.userData.isCharacterOutline = true;
    outline.renderOrder = -1;
    mesh.add(outline);
  }
  root.userData.characterCel = true;
}
