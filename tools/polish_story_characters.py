"""Polish the refined atelier; always start from the saved refined source.

Run with Blender --background --python tools/polish_story_characters.py.
Keeps previous ateliers intact and exports the four production character GLBs.
"""
import bpy
import importlib.util
import math
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('cast', os.path.join(HERE, 'build_story_characters.py'))
cast = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cast)
bpy.ops.wm.open_mainfile(filepath=os.path.join(cast.ART, 'shinjuku-story-characters-refined.blend'))
cast.scene = bpy.context.scene
cast.roots = {o['character_id']: o for o in cast.scene.objects if o.get('character_id')}

def base(name):
    return re.sub(r'\.\d+$', '', name)

for obj in cast.scene.objects:
    if obj.type == 'MESH':
        for material in obj.data.materials:
            if material:
                cast.M[base(material.name).removeprefix('Story / ')] = material

def remove_named(parent, names):
    for obj in list(parent.children):
        if base(obj.name) in names:
            bpy.data.objects.remove(obj, do_unlink=True)

def unite(parent, names, result):
    # Bake subdivision before sculpting the union. Keep each animated joint separate.
    items = [o for o in parent.children if base(o.name) in names]
    if len(items) < 2:
        return
    for obj in items:
        bpy.context.view_layer.objects.active = obj
        for modifier in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    cast.fuse_skin(parent, names, result, voxel=.011)

for ident, root in cast.roots.items():
    cast.col = root.users_collection[0]
    for parent in [o for o in root.children_recursive if o.type == 'EMPTY']:
        unite(parent, ['rounded uniform shoulder', 'loose white upper sleeve'], 'continuous jacket sleeve')
        unite(parent, ['sleeve elbow overlap', 'white cuff sleeve'], 'continuous cuff sleeve')
        unite(parent, ['rounded short sleeve shoulder', 'short shirt sleeve'], 'tailored short sleeve')
        unite(parent, ['deltoid cap', 'muscular upper arm'], 'sculpted deltoid and biceps')
        unite(parent, ['elbow joint', 'muscular forearm'], 'sculpted elbow and forearm')
        unite(parent, ['elbow', 'bare forearm'], 'continuous bare forearm')
        unite(parent, ['Rika elbow', 'elongated forearm'], 'continuous cursed forearm')

        name = base(parent.name)
        if name in {'legL', 'legR'}:
            wide = ident != 'yuta'
            w = .115 if wide else .080
            mat = 'white' if wide else 'navy'
            remove_named(parent, {'trouser thigh'})
            # Dense silhouette rings preserve the hem without subdivision shrinking it.
            cast.loft('tailored trouser thigh', [
                (-.425,w*.77,.069,0),(-.395,w*.80,.073,0),
                (-.33,w*.88,.083,-.004),(-.23,w,.096,0),
                (-.12,w*1.04,.100,0),(-.015,w*.97,.095,0),(.04,w*.86,.08,0)
            ], mat, parent, n=32)
        if name in {'shinL', 'shinR'}:
            wide = ident != 'yuta'
            w = .115 if wide else .080
            mat = 'white' if wide else 'navy'
            remove_named(parent, {'trouser calf', 'covered knee', 'fold at knee'})
            cast.loft('draped trouser calf', [
                (-.35,w*.61,.053,0),(-.327,w*.70,.060,-.002),
                (-.28,w*.73,.064,0),(-.18,w*.79,.076,0),
                (-.085,w*.80,.075,0),(-.015,w*.79,.072,0),(.04,w*.72,.061,0)
            ], mat, parent, n=32)
            # A rounded overlapping knee prevents a black gap when the shin bends.
            cast.ell('soft fabric knee', (0,0,0), (w*.76,.069,.062), mat, parent, n=20, rings=12)
            for side in [-1,1]:
                cast.strand('raised ankle cloth fold',
                    (side*w*.40,-.045,-.32), (side*w*.46,-.065,-.24),
                    (side*w*.29,-.070,-.12), .006, mat, parent)

    head = next(o for o in root.children_recursive if base(o.name) == 'head')
    locks = [o for o in head.children if base(o.name) == 'layered swept lock']
    for index, obj in enumerate(locks):
        # Break the identical rows of hair into interleaved, tapered clumps.
        for vertex in obj.data.vertices:
            p = vertex.co
            t = max(0, min(1, (p.z-.08)/.14))
            p.z += t*(.012*math.sin(index*2.4)+(.012 if ident == 'yuta_gojo' else .02))
            p.x += t*.008*math.sin(index*1.7)
    if ident == 'yuta':
        for i in range(4):
            cast.strand('loose asymmetric fringe', (.04-i*.026,-.04,.169),
                        (-.065-i*.012,-.118,.126),(-.06-i*.014,-.104,.040+i*.005),
                        .012, 'hair', head)
    if ident == 'rika':
        for obj in head.children:
            if base(obj.name) == 'interlocking fang':
                # Give the tooth row a curved bite, with longer canines.
                for v in obj.data.vertices:
                    x = abs(v.co.x)
                    v.co.y += .18*x*x
                    if .10 < x < .16:
                        v.co.z += -.015 if v.co.z > -.24 else .012

# Distinguish skin, matte cloth and slightly reflective hair in the game lighting.
for key, roughness in [('white',.88),('navy',.84),('black',.80),('skin',.64),
                       ('pale',.64),('hair',.43),('silver',.48),('pink',.52)]:
    material = cast.M[key]
    bsdf = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = roughness

scene = cast.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 1800
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.filepath = os.path.join(cast.ART, 'lineup-polished.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(cast.ART, 'shinjuku-story-characters-polished.blend'))
cast.export_all()
bpy.ops.render.render(write_still=True)
