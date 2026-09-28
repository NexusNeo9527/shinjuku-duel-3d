# Malevolent Shrine visual reference

The v2 mesh uses the classic architectural shrine shown in manga chapters 8 and 119. It does not depict the altered form from chapter 258.

Visual sources:
- Shonen Jump's chapter 119 panel: https://x.com/shonenjump/status/1300103996548542465
- Full-height manga detail: https://pbs.twimg.com/media/GAaX8RqbQAESaN3.jpg
- Appearance cross-check: https://jujutsu-kaisen.fandom.com/wiki/Malevolent_Shrine

`malevolent-shrine-three-view.png` is an AI-generated modeling reference, not an official turnaround. Its side has some perspective; the rear is inferred. Dimensions and colors are adaptations for the game.

## Model revision 2

- Build by executing `tools/build_malevolent_shrine_v2.py` in the live Blender instance, as done through Blender MCP. The script expects a window and a screen for scene selection and viewport framing.
- Source: `art/malevolent-shrine-v2.blend`. Previous source: `art/malevolent-shrine.blend`.
- Runtime: `public/models/malevolent-shrine.glb`; the existing domain loader uses this filename.
- One connected hip-and-gable roof replaces the stacked roofs. Added ceramic rolls/endcaps, gable mouths, curved roof horns and structural brackets.
- Arched entrances use rounded incisors and longer corner fangs. Base cattle skulls use long nasal bones, angular sockets, horn ridges and an irregular two-layer pile. Eave ornaments use human skulls.
- Editable source has 54 component meshes. Game export combines components into 12 material meshes, with portable vertex colors, about 178k triangles and a 4.27 MB GLB.
- This remains a stylized game reconstruction; the generated illustration's painted surface detail is not a baked texture in the model.
- Validation: story verifier and Vite build passed. Browser inspection confirmed all 12 runtime meshes retain vertex colors, and the model hides on domain end, other domain types, and reset. The browser reported no errors or warnings.

Built-in image generation was used. Prompt:

Create a precise three-view 3D modeling reference sheet of Ryomen Sukuna's classic Malevolent Shrine / 伏魔御厨子 from the Jujutsu Kaisen manga. Use the two latest manga screenshots as authoritative reference images for the architectural and skeletal forms. This is a new reference-sheet illustration, not a recoloring of a manga panel. Landscape canvas, three separated orthographic elevations on warm pale grey: FRONT, RIGHT SIDE, BACK, same scale, ground baseline, complete uncropped silhouette. Front gets 40% width, side/back 30% each. No characters or dialogue or effects. Extremely consistent design across all views; back is a restrained inferred continuation of the same structure, no invented new ornaments. Draw polished ink-and-muted-color concept art with crisp readable geometry and subtle flat shading, NOT an isometric perspective render. Classic design: one Japanese hip-and-gable (irimoya) ceramic-tiled roof with sweeping flared eaves, large exposed triangular gable end, detailed tile rows and round tile endcaps, small fanged mouths in the gables, a small elongated bovine skull at the ridge and several pairs of long tapered curved horns growing from the roof. Roof should be a single coherent roof, not two stacked pagoda storeys. Beneath is one stout square weathered wooden shrine with four pillars, deep black mouth-shaped entrance on every face, huge curved fleshy jaws integrated into the architecture and natural individually sculpted teeth/canines, not block teeth. Thick beams and closely spaced brackets under eaves. Four small HUMAN skulls hanging by slender cords from the eave corners. A dense irregular mound/ring of much larger BUFFALO/CATTLE skulls around the base, angular elongated muzzles, deep hollow sockets, sweeping tapering horns, weathered cracks and visible nasal openings, densely overlapping bones rather than a few cartoon skulls on stairs. Four short twisted bare tree stumps around corners. Bone ivory, worn dark muted red-brown wood, charcoal grey tiles, black voids. Sole labels FRONT / RIGHT SIDE / BACK and a small title MALEVOLENT SHRINE. Emphasize fidelity to reference anatomy, roof mass and ominous proportions. Avoid simplistic cubes, cartoon faces, gold decorative fantasy temple, extra roof storeys, human figures, photorealism, text bubbles, gore.
