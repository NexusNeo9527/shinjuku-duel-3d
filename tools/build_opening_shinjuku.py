"""Original editable environment inspired by JJK 223-224; run inside Blender.
Creates a separate scene and preserves the user's existing scene.
"""
import bpy
import math
import random
from pathlib import Path
from mathutils import Vector

ROOT = Path(r'D:\新宿决战')
rng = random.Random(224)
scene = bpy.data.scenes.new('Shinjuku • Opening confrontation')
bpy.context.window.scene = scene
buckets = {}
materials = {}

def material(name, color, metallic=0, roughness=.7):
    m = bpy.data.materials.new('Opening / ' + name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metallic
    bs.inputs['Roughness'].default_value = roughness
    materials[name] = m
    return name

material('asphalt', (.075,.087,.10))
material('pavement', (.43,.44,.43))
material('concrete', (.48,.49,.47))
material('ivory', (.69,.67,.60))
material('dark stone', (.20,.23,.25))
material('glass', (.12,.23,.29), .55, .24)
material('glass light', (.29,.40,.44), .45, .28)
material('steel', (.19,.23,.25), .65, .35)
material('white', (.82,.80,.70))
material('red', (.52,.065,.045))
material('blue', (.035,.18,.32))
material('yellow', (.78,.53,.13))
material('rubble', (.33,.31,.28))
material('black', (.014,.02,.023))
material('green', (.04,.32,.21))

def box(name, loc, size, mat, angle=0):
    # Batch disconnected parts into semantic meshes, keeping draw calls low.
    verts, faces = buckets.setdefault((name,mat), ([],[]))
    k=len(verts); c=math.cos(angle); s=math.sin(angle)
    for x,y,z in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]:
        x*=size[0]/2; y*=size[1]/2; z*=size[2]/2
        verts.append((loc[0]+x*c-y*s,loc[1]+x*s+y*c,loc[2]+z))
    faces.extend(tuple(k+i for i in f) for f in [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)])

def label(body, loc, size, mat, rotation=(math.pi/2,0,0)):
    curve=bpy.data.curves.new(body,'FONT'); curve.body=body; curve.size=size
    curve.extrude=.006
    obj=bpy.data.objects.new(body,curve); scene.collection.objects.link(obj)
    obj.location=loc; obj.rotation_euler=rotation; curve.materials.append(materials[mat])

# Broad junction and a north-south street canyon, in metres.
box('Road foundation',(0,12,-.22),(112,154,.4),'asphalt')
for side in [-1,1]:
    for cy,depth in [(-29,32),(47,74)]:
        box('Raised sidewalks',(side*29,cy,.08),(34,depth,.22),'pavement')
        box('Stone curb',(side*12.15,cy,.13),(.3,depth,.30),'ivory')
for y in range(-60,88,7):
    if abs(y)>10: box('Lane dashes',(0,y,.006),(.15,3,.015),'white')
for x in [-8.5,8.5]:
    box('Road edge paint',(x,45,.008),(.12,68,.016),'white')
for y in [-10,10]:
    for x in range(-10,11,2): box('Zebra crossings',(x,y,.015),(1.05,4,.025),'white')
for x in [-15,15]:
    for y in range(-6,7,2): box('Zebra crossings',(x,y,.015),(4,1,.025),'white')
for side in [-1,1]:
    for y in [-15,15,33,54]:
        box('Storm drains',(side*11.7,y,.025),(.55,1.5,.04),'steel')
        for j in range(7): box('Drain slots',(side*11.7,y-.6+j*.2,.05),(.42,.045,.01),'black')
    for y in [-13,13]:
        box('Tactile paving',(side*15,y,.205),(5,.6,.06),'yellow')

def building(side, y, width, depth, height, index):
    x=side*(14+width/2); front=side*14
    name='Block %s-%02d'%(('E' if side>0 else 'W'),index)
    base=['concrete','ivory','dark stone'][index%3]
    box(name+' structure',(x,y,height/2+.2),(width,depth,height),base)
    # Street-facing recessed blue glazing, interrupted by piers and floor slabs.
    for z in range(5,int(height)-1,3):
        for yy in range(int(y-depth/2)+1,int(y+depth/2)-1,2):
            if side==1 and index==1 and z<14 and yy<y: continue
            box(name+' windows',(front-side*.025,yy,z),(.07,1.55,2.2),'glass light' if rng.random()<.20 else 'glass')
        box(name+' floors',(front-side*.16,y,z-1.35),(.32,depth,.18),base)
    for yy in range(int(y-depth/2),int(y+depth/2)+1,4):
        box(name+' piers',(front-side*.15,yy,height/2),(.30,.22,height),base)
    # South elevation visible from the main camera.
    for z in range(5,int(height)-1,3):
        for xx in range(int(x-width/2)+1,int(x+width/2),2):
            box(name+' south windows',(xx,y-depth/2-.035,z),(1.55,.08,2.15),'glass')
    box(name+' cornice',(x,y,height+.35),(width+.45,depth+.45,.65),base)
    for yy in [-depth/2,depth/2]: box(name+' parapet',(x,y+yy,height+1),(width,.2,1.1),'concrete')
    for n in range(3):
        box(name+' roof plant',(x-3+n*3,y,height+1.2),(2.2,3,1.5),'steel')
    for yy in range(int(y-depth/2)+2,int(y+depth/2)-1,4):
        box(name+' shop glazing',(front-side*.05,yy,1.9),(.12,3.3,3.2),'glass')
        box(name+' shop header',(front-side*.22,yy,3.8),(.35,3.7,.55),'blue' if index%2 else 'white')
    # Sign tower facing down the street; invented shop branding.
    box(name+' sign',(x,y-depth/2-.23,7),(width*.76,.3,1.8),'blue' if index%2 else 'red')
    label(['SHINJUKU','KIN / BOOKS','CENTRAL','COFFEE'][index%4],(x-width*.34,y-depth/2-.40,6.6),.65,'white')

for side in [-1,1]:
    for idx,(y,w,d,h) in enumerate([(24,15,19,35),(46,18,21,49),(70,20,23,62),(-30,17,26,29)]):
        building(side,y,w,d,h,idx)
for x,y,h in [(-40,83,85),(39,86,72),(-43,47,58),(43,57,78),(-21,104,78),(10,115,94)]:
    box('Distant towers',(x,y,h/2),(17,20,h),'dark stone')
    for z in range(4,h,4): box('Distant tower ribbons',(x,y-10.05,z),(16,.1,2),'glass light')

# Broken cladding localized to one block, before the later widespread destruction.
for z in [4.4,7.4,10.4,13.4]:
    box('Exposed floors',(16.2,42,z),(4.4,10,.35),'rubble')
for i in range(95):
    x=rng.uniform(10,17); y=rng.uniform(32,49); a=rng.uniform(.12,.7)
    box('Fallen masonry',(x,y,.15+a*.25),(a,a*rng.uniform(.5,1.7),a*.5),'rubble',rng.uniform(0,math.pi))
for side in [-1,1]:
    for y in [-15,15,39,63]:
        x=side*12.8
        box('Streetlight poles',(x,y,4.4),(.15,.15,8.6),'steel')
        box('Streetlight arms',(x-side*1.1,y,8.6),(2.3,.12,.15),'steel')
        box('Streetlight housings',(x-side*2.15,y,8.5),(.75,.35,.14),'ivory')
    for y in [-12,12]:
        x=side*13
        box('Signal poles',(x,y,2.7),(.17,.17,5.3),'steel')
        box('Traffic signal cases',(x-side*.5,y,5.1),(1.35,.35,.5),'black')
        for i,m in enumerate(['red','yellow','green']): box('Traffic lenses',(x-side*.5-.4+i*.4,y-.19,5.1),(.24,.05,.24),m)
    for y in [20,29,54]:
        box('Guard rails',(side*12.6,y,1.05),(.08,5,.09),'steel')
        for yy in [-2,2]: box('Rail posts',(side*12.6,y+yy,.6),(.1,.1,1.2),'steel')
    box('Vending machine',(side*16,17,1.15),(1,.8,2.1),'red')
    box('Vending display',(side*16,16.58,1.45),(.8,.04,.9),'glass light')
    for i in range(4): box('Drink labels',(side*16-.3+i*.2,16.54,1.4),(.1,.025,.35),'white')

for (name,mat),(verts,faces) in buckets.items():
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); scene.collection.objects.link(obj)
    mesh.materials.append(materials[mat])
    if name.startswith('Block ') and name.endswith(' structure'):
        obj['arenaCollider']=True

world=bpy.data.worlds.new('Opening / cool daylight'); world.use_nodes=True
next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs[0].default_value=(.48,.60,.74,1)
next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs[1].default_value=.55
scene.world=world
sun=bpy.data.lights.new('Late morning sun','SUN'); sun.energy=2.4; sun.angle=.14
obj=bpy.data.objects.new('Late morning sun',sun); scene.collection.objects.link(obj)
obj.rotation_euler=(math.radians(28),math.radians(-24),math.radians(-32))
cam=bpy.data.cameras.new('Street confrontation camera'); obj=bpy.data.objects.new('Street confrontation camera',cam)
scene.collection.objects.link(obj); obj.location=(6,-37,8)
obj.rotation_euler=(Vector((0,31,17))-obj.location).to_track_quat('-Z','Y').to_euler(); cam.lens=27
scene.camera=obj
try: scene.render.engine='CYCLES'
except TypeError: pass
if hasattr(scene,'cycles'): scene.cycles.samples=24; scene.cycles.use_denoising=True
scene.render.resolution_x=1440; scene.render.resolution_y=1080; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(ROOT/'art'/'shinjuku-opening-preview.png')
scene['reference']='Jujutsu Kaisen chapters 223-224. Original interpretive environment, not a panel-exact reconstruction.'
scene['scale']='metres; Z-up; main street runs along Y; open duel area at origin'
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art'/'shinjuku-opening.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public'/'models'/'shinjuku-opening.glb'),
    use_active_scene=True, export_cameras=False, export_lights=False, export_extras=True)
print('CREATED',len(scene.objects),'objects',sum(len(o.data.polygons) for o in scene.objects if o.type=='MESH'),'polygons')
