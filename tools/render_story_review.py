"""Render saved Blender characters for review. Does not save or modify the source file."""
import bpy
import os
import re
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'art', 'story-characters')
scene = bpy.context.scene
camera = scene.camera
scene.render.resolution_x = 850
scene.render.resolution_y = 850
scene.render.resolution_percentage = 100

for ident in ['yuta', 'sukuna_shinjuku', 'yuta_gojo', 'rika']:
    root = next(o for o in scene.objects if o.get('character_id') == ident)
    head = next(o for o in root.children_recursive if re.sub(r'[_.]?\d+$', '', o.name) == 'head')
    target = head.matrix_world.translation + Vector((0, -.02, .02 if ident != 'rika' else .08))
    camera.location = target + Vector((.20, -3.0, .11))
    camera.rotation_euler = (target-camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.ortho_scale = 1.4 if ident == 'rika' else .65
    scene.render.filepath = os.path.join(OUT, ident+'-face.png')
    bpy.ops.render.render(write_still=True)
    print('REVIEW_RENDER '+scene.render.filepath, flush=True)
