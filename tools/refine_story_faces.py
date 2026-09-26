"""Refine an existing atelier and save a separate copy, preserving the original."""
import bpy
import importlib.util
import os
import re
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('cast', os.path.join(HERE, 'build_story_characters.py'))
cast = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cast)
cast.scene = bpy.context.scene
cast.roots = {o['character_id']: o for o in cast.scene.objects if o.get('character_id')}
def base(name):
    return re.sub(r'\.\d+$', '', name)
for obj in cast.scene.objects:
    if obj.type == 'MESH':
        for mat in obj.data.materials:
            if mat:
                cast.M[base(mat.name).removeprefix('Story / ')] = mat
eye_names = {'eye socket', 'sclera', 'iris', 'pupil', 'eye glint', 'upper eyelid', 'lower eyelid', 'brow', 'dark under eye shadow', 'eye bag hatch'}
for ident in ['yuta', 'sukuna_shinjuku', 'yuta_gojo']:
    root = cast.roots[ident]
    head = next(o for o in root.children_recursive if base(o.name) == 'head')
    cast.col = root.users_collection[0]
    for obj in list(head.children):
        if base(obj.name) in eye_names:
            bpy.data.objects.remove(obj, do_unlink=True)
    if ident == 'yuta':
        cast.eyes(head, tired=True)
    elif ident == 'sukuna_shinjuku':
        cast.eyes(head, 'redEye', mat='pink', z=.01)
    else:
        cast.eyes(head, 'blue', mat='silverShade')
    for obj in head.children:
        if obj.type == 'MESH' and base(obj.name) in {'side parted bang', 'right part sweep', 'white fringe'}:
            for i, vert in enumerate(obj.data.vertices):
                if i < 16:
                    vert.co.z -= .012 if i < 8 else .006
scene = cast.scene
camera = scene.camera
camera.location = (4, -16, 5)
cast.aim(camera, (0, 0, 1.2))
camera.data.ortho_scale = 8.7
scene.render.resolution_x = 1800
scene.render.resolution_y = 1000
scene.render.filepath = os.path.join(cast.ART, 'lineup-refined.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(cast.ART, 'shinjuku-story-characters-refined.blend'))
cast.export_all()
bpy.ops.render.render(write_still=True)
