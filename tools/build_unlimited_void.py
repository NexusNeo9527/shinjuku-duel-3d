"""Build an editable Unlimited Void environment in the live Blender window."""
import bpy, math, random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
rng = random.Random(719)
scene = bpy.data.scenes.new('Gojo - Unlimited Void')
bpy.context.window.scene = scene

def material(name, color, strength=1):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    p = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Emission Color'].default_value = (*color, 1)
    p.inputs['Emission Strength'].default_value = strength
    p.inputs['Roughness'].default_value = 1
    return m

dark = material('UV - event horizon', (.0001,.0002,.0006), 0)
white = material('UV - white light', (.8,.92,1), 3)
blue = material('UV - pale blue', (.13,.35,.7), 2)
violet = material('UV - distant violet', (.15,.09,.33), 1)

def mesh(name, verts, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces); data.update()
    ob = bpy.data.objects.new(name, data)
    scene.collection.objects.link(ob); data.materials.append(mat)
    return ob

# Inward-facing dark sphere, no default cube or studio objects in game export.
verts=[]; faces=[]
for j in range(33):
    phi=math.pi*j/32
    for i in range(96):
        a=math.tau*i/96
        verts.append((100*math.sin(phi)*math.cos(a),100*math.sin(phi)*math.sin(a),100*math.cos(phi)))
for j in range(32):
    for i in range(96):
        a=j*96+i; b=j*96+(i+1)%96
        faces.append((a,b,b+96,a+96))
mesh('void_shell',verts,faces,dark)

# A dark disc and fine, broken concentric filaments. Front is negative Blender Y.
verts=[(0,67,13)]+[(29*math.cos(math.tau*i/128),67,13+29*math.sin(math.tau*i/128)) for i in range(128)]
mesh('event_horizon',verts,[(0,1+i,1+(i+1)%128) for i in range(128)],dark)
for name,mat,count in [('corona_white',white,42),('corona_blue',blue,44),('corona_violet',violet,32)]:
    verts=[];faces=[]
    for k in range(count):
        radius=rng.uniform(29.1,47); start=rng.uniform(0,math.tau)
        arc=rng.uniform(.35,4.8); width=rng.uniform(.025,.16)
        depth=65-rng.uniform(0,4); offset=len(verts)
        for i in range(81):
            t=i/80; a=start+arc*t
            r=radius+.35*math.sin(a*5+k)
            w=width*math.sin(math.pi*t)**.4
            for edge in [-1,1]:
                verts.append(((r+edge*w)*math.cos(a),depth,13+(r+edge*w)*math.sin(a)))
        faces.extend((offset+i*2,offset+i*2+1,offset+i*2+3,offset+i*2+2) for i in range(80))
    mesh(name,verts,faces,mat)

for name,mat,count in [('stars_near',white,720),('stars_far',blue,1100),('galaxy_dust',violet,1700)]:
    verts=[];faces=[]
    for k in range(count):
        a=rng.uniform(0,math.tau); z=rng.uniform(-.96,.96)
        radius=rng.uniform(78,97); q=math.sqrt(1-z*z)
        pos=Vector((radius*q*math.cos(a),radius*q*math.sin(a),radius*z))
        size=rng.uniform(.025,.18) if name!='galaxy_dust' else rng.uniform(.06,.25)
        right=pos.cross(Vector((0,0,1))).normalized()*size
        up=pos.normalized().cross(right).normalized()*size
        n=len(verts); verts.extend(tuple(pos+v) for v in [right,up,-right,-up])
        faces.append((n,n+1,n+2,n+3))
    mesh(name,verts,faces,mat)

# Long, sparse information streams avoid filling the combat centre with clutter.
verts=[];faces=[]
for k in range(130):
    a=rng.uniform(0,math.tau); radius=rng.uniform(42,68); n=len(verts)
    for i in range(25):
        t=i/24; y=-70+130*t; r=radius*(1-.32*t)
        x=r*math.cos(a); z=13+r*math.sin(a); w=.035*math.sin(math.pi*t)
        verts.extend([(x-w,y,z),(x+w,y,z)])
    faces.extend((n+i*2,n+i*2+1,n+i*2+3,n+i*2+2) for i in range(24))
mesh('information_streams',verts,faces,blue)

bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/unlimited-void.glb'),use_active_scene=True,export_cameras=False,export_lights=False,export_extras=True)
world=bpy.data.worlds.new('Unlimited Void black'); world.use_nodes=True
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND'); bg.inputs[0].default_value=(0,0,0,1)
scene.world=world
cd=bpy.data.cameras.new('Void review camera'); camera=bpy.data.objects.new(cd.name,cd);scene.collection.objects.link(camera)
camera.location=(0,-29,8); camera.rotation_euler=(Vector((0,65,13))-camera.location).to_track_quat('-Z','Y').to_euler()
cd.lens=24;scene.camera=camera
scene.render.resolution_x=1400;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ROOT/'art/unlimited-void-preview.png')
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.shading.type='MATERIAL'
        area.spaces.active.overlay.show_extras=False
        rv=area.spaces.active.region_3d
        rv.view_rotation=camera.rotation_euler.to_quaternion();rv.view_location=(0,30,13);rv.view_distance=60
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/unlimited-void.blend'))
print('UNLIMITED_VOID',len([o for o in scene.objects if o.type=='MESH']),'mesh batches')
