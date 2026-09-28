"""Original low-poly Malevolent Shrine set piece; front is Blender -Y."""
from pathlib import Path
import bpy
import math
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'tools'/'build_yuta_arenas.py'
ns={'__file__':str(source)}
exec(compile(source.read_text(encoding='utf-8').split('\narenas=[]')[0],str(source),'exec'),ns)
a=ns['Arena']('shrine')
a.scene.name='Sukuna / Malevolent Shrine'

def sphere(name,at,size,mat):
    verts=[]; faces=[]; rings=8; sides=12
    for i in range(rings+1):
        t=math.pi*i/rings
        for j in range(sides):
            p=j*math.tau/sides
            verts.append((at[0]+size[0]*math.sin(t)*math.cos(p),at[1]+size[1]*math.sin(t)*math.sin(p),at[2]+size[2]*math.cos(t)))
    for i in range(rings):
        for j in range(sides): faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    a.mesh(name,verts,faces,mat)

for z,w,d in [(.2,9,7),(.55,8.3,6.3),(.9,7.6,5.6)]:
    a.box('stone_steps',(0,0,z),(w,d,.4),'stone')
a.box('dark_sanctum',(0,.2,3.1),(5.3,4.2,4.2),'dark')
for x in [-2.9,2.9]:
    for y in [-2.3,2.3]:
        a.box('red_pillars',(x,y,3.2),(.52,.52,4.5),'rust')
        a.box('pillar_caps',(x,y,5.25),(.9,.9,.35),'binding')
# Four fanged entrance mouths, facing outward.
for side in range(4):
    angle=side*math.pi/2
    def point(x,y,z): return (x*math.cos(angle)-y*math.sin(angle),x*math.sin(angle)+y*math.cos(angle),z)
    a.box('mouth_frames',point(0,-2.4,4.65),(4.7,.48,.45),'rust',rot=(0,0,angle))
    for j in range(11):
        x=-2+j*.4
        for upper in [False,True]:
            z=4.35 if upper else 1.4
            a.box('ivory_fangs',point(x,-2.68,z),(.23,.27,.55 if j%2 else .8),'cut',rot=(0,.12*(j%3-1),angle))
    for x in [-2.3,2.3]: sphere('mouth_joints',point(x,-2.5,3.8),(.38,.35,.6),'rust')
# Two gently sweeping roofs, dark tiles, gold-bone fascias, raised eaves.
for base,w,d in [(5.2,8.3,6.4),(6.8,6.6,5.1)]:
    for side in [-1,1]:
        verts=[]
        for row in range(9):
            t=row/8; y=side*d*.5*t; z=base+1.55*(1-t)**2+.38*t**5
            for x in [-w/2,w/2]: verts.append((x,y,z+.2*(abs(x)/(w/2))**3))
        a.mesh('swept_roof_tiles',verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(8)],'dark')
        for j in range(23):
            x=-w/2+j*w/22
            points=[(x,side*d*.5*t,base+1.55*(1-t)**2+.38*t**5+.2*(abs(x)/(w/2))**3+.025) for t in [k/10 for k in range(11)]]
            a.tube('roof_tile_ribs',points,.035,'steel')
        a.tube('bone_eaves',[(-w/2,side*d/2,base+.58),(0,side*d/2,base+.38),(w/2,side*d/2,base+.58)],.13,'binding')
    a.tube('ridge_beam',[(-w*.55,0,base+1.9),(0,0,base+1.6),(w*.55,0,base+1.9)],.16,'rust')

def skull(x,y,z,s):
    sphere('bovine_skulls',(x,y,z),(.55*s,.32*s,.6*s),'cut')
    sphere('long_jaws',(x,y-.12*s,z-.46*s),(.3*s,.29*s,.43*s),'cut')
    for side in [-1,1]:
        sphere('empty_eye_sockets',(x+side*.23*s,y-.29*s,z+.02*s),(.16*s,.07*s,.18*s),'dark')
        a.tube('curved_horns',[(x+side*.4*s,y,z+.25*s),(x+side*.85*s,y,z+.55*s),(x+side*1.05*s,y+.1*s,z+1.05*s),(x+side*.88*s,y+.1*s,z+1.4*s)],.09*s,'binding')
    sphere('nasal_cavity',(x,y-.36*s,z-.39*s),(.12*s,.045*s,.18*s),'dark')

skull(0,-.25,8.9,1.25)
for x in [-3.6,3.6]:
    for y in [-2.9,2.9]:
        a.tube('hanging_roof_cords',[(x,y,5.7),(x,y,4.75)],.045,'rust')
        skull(x,y,4.55,.57)
for x in [-3,-1.5,0,1.5,3]: skull(x,-3.25,.8,.52)
for x in [-4.3,4.3]:
    for y in [-2.8,2.8]:
        a.tube('gnarled_trunks',[(x,y,.2),(x*.98,y,1.4),(x*1.08,y,2.7)],.2,'dark')
        for side in [-1,1]: a.tube('gnarled_branches',[(x,y,1.5),(x+side*.6,y+.3,2),(x+side*.8,y+.4,2.7)],.075,'dark')
a.finish('malevolent-shrine.glb')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            rv=area.spaces.active.region_3d; rv.view_location=(0,0,4); rv.view_distance=19
            rv.view_rotation=(Vector((0,0,4))-Vector((13,-22,12))).to_track_quat('-Z','Y')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art'/'malevolent-shrine.blend'))
