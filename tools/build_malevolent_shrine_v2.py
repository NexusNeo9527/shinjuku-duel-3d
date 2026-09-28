"""Classic manga-inspired shrine; Blender -Y is front. Preserves existing scenes."""
from pathlib import Path
from collections import defaultdict
import math
import random
import bpy
import bmesh
from mathutils import Vector, Euler, noise

ROOT=Path(__file__).resolve().parents[1]
TAU=math.tau
rng=random.Random(119)
scene=bpy.data.scenes.new('Sukuna / Malevolent Shrine v2')
bpy.context.window.scene=scene
scene['assetRevision']=2
scene['reference']='Classic shrine, manga chapters 8 and 119; inferred rear, adapted game scale.'
collection=bpy.data.collections.new('Malevolent Shrine v2 / geometry')
scene.collection.children.link(collection)
batches=defaultdict(lambda:([],[]))
materials={}
palette={'wood':((.19,.056,.033),.87),'wood_edge':((.29,.13,.072),.82),
 'wood_grain':((.075,.025,.017),.96),'tile':((.052,.070,.080),.70),
 'tile_edge':((.12,.155,.165),.72),'bone':((.66,.60,.47),.91),
 'bone_light':((.78,.72,.60),.83),'horn':((.34,.29,.22),.89),
 'socket':((.009,.006,.005),1),'gum':((.21,.073,.047),.88),
 'rope':((.26,.20,.12),1),'stone':((.12,.13,.12),.98)}
for name,(color,roughness) in palette.items():
    mat=bpy.data.materials.new('Shrine v2 / '+name)
    mat.diffuse_color=(*color,1); mat.use_nodes=True
    shader=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value=(*color,1)
    shader.inputs['Roughness'].default_value=roughness
    materials[name]=mat

def mesh(name,verts,faces,material,smooth=False):
    vs,fs=batches[(name,material,smooth)]; offset=len(vs)
    vs.extend(tuple(v) for v in verts)
    fs.extend(tuple(offset+i for i in face) for face in faces)

def box(name,at,size,material,rotation=(0,0,0)):
    r=Euler(rotation).to_matrix()
    points=[(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]
    mesh(name,[Vector(at)+r@Vector((x*size[0]/2,y*size[1]/2,z*size[2]/2)) for x,y,z in points],
      [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)],material)

def tube(name,points,radii,material,sides=9):
    ps=[Vector(p) for p in points]
    if isinstance(radii,(float,int)): radii=[radii]*len(ps)
    vs,fs=[],[]
    for i,p in enumerate(ps):
        tangent=(ps[min(i+1,len(ps)-1)]-ps[max(i-1,0)]).normalized()
        ref=Vector((0,1,0)) if abs(tangent.y)<.9 else Vector((0,0,1))
        u=tangent.cross(ref).normalized(); v=tangent.cross(u).normalized()
        for j in range(sides): vs.append(p+radii[i]*(math.cos(j*TAU/sides)*u+math.sin(j*TAU/sides)*v))
        if i:
            for j in range(sides): fs.append(((i-1)*sides+j,(i-1)*sides+(j+1)%sides,i*sides+(j+1)%sides,i*sides+j))
    fs += [tuple(range(sides-1,-1,-1)),tuple((len(ps)-1)*sides+j for j in range(sides))]
    mesh(name,vs,fs,material,True)

def bezier(points,count=16):
    a,b,c,d=map(Vector,points)
    return [(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d for t in [i/(count-1) for i in range(count)]]

def ellipsoid(name,at,scale,material,transform=None,sides=14,rings=10):
    vs,fs=[],[]
    for i in range(rings+1):
        t=math.pi*i/rings
        for j in range(sides):
            p=TAU*j/sides
            v=Vector(at)+Vector((scale[0]*math.sin(t)*math.cos(p),scale[1]*math.sin(t)*math.sin(p),scale[2]*math.cos(t)))
            vs.append(transform(v) if transform else v)
    for i in range(rings):
        for j in range(sides): fs.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    mesh(name,vs,fs,material,True)

def skull(at,size=1,angle=0,human=False,tilt=0):
    r=Euler((tilt,0,angle)).to_matrix()
    def tr(v): return Vector(at)+r@(Vector(v)*size)
    def ball(name,p,s,m): ellipsoid(name,p,s,m,tr,sides=10 if human else 8,rings=6 if human else 5)
    def line(name,pts,rs,mat): tube(name,[tr(p) for p in pts],[v*size for v in rs],mat,6 if name=='horn_growth_ridges' else 8)
    if human:
        ball('hanging_human_crania',(0,0,.1),(.38,.29,.43),'bone')
        ball('human_jaw',(0,-.04,-.31),(.24,.24,.15),'bone_light')
        for side in [-1,1]:
            ball('human_eye_cavities',(side*.16,-.269,.035),(.128,.052,.135),'socket')
            line('human_brow',[(side*.04,-.31,.18),(side*.18,-.31,.20),(side*.31,-.24,.11)],[.048,.054,.025],'bone_light')
        ball('human_nasal_cavity',(0,-.30,-.16),(.062,.035,.09),'socket')
        for x in [-.15,-.09,-.03,.03,.09,.15]: ball('human_teeth',(x,-.245,-.32),(.026,.055,.07),'bone_light')
        return
    sections=[(.68,.30,.16,.07),(.46,.48,.23,.01),(.12,.57,.26,-.01),
      (-.16,.41,.21,-.06),(-.48,.25,.15,-.17),(-.88,.18,.14,-.24),(-1.01,.12,.10,-.24)]
    vs=[]; sides=12
    for z,w,d,y in sections:
        for j in range(sides):
            t=TAU*j/sides; vs.append(tr((math.cos(t)*w,y+math.sin(t)*d,z)))
    fs=[tuple(range(sides-1,-1,-1))]
    for i in range(len(sections)-1):
        for j in range(sides): fs.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    fs.append(tuple((len(sections)-1)*sides+j for j in range(sides)))
    mesh('cattle_skull_shells',vs,fs,'bone',True)
    for side in [-1,1]:
        # Angular recessed sockets, with a heavy brow rather than circular eye rims.
        orbit=[(side*(.36+dx),-.287,.10+dz) for dx,dz in [(-.14,.10),(-.05,.19),(.12,.15),(.18,.01),(.08,-.15),(-.09,-.14)]]
        eye=[tr(p) for p in orbit]+[tr((side*.36,-.269,.11))]
        mesh('cattle_eye_cavities',eye,[(i,(i+1)%6,6) for i in range(6)],'socket')
        line('cattle_orbit_brows',orbit[:4],[.032,.046,.055,.025],'bone_light')
        line('cattle_cheek_bones',[(side*.48,-.08,-.13),(side*.48,-.24,-.38),(side*.23,-.32,-.61)],[.06,.048,.02],'bone_light')
        line('nasal_bones',[(side*.18,-.20,-.25),(side*.10,-.38,-.65),(side*.095,-.38,-.96)],[.07,.043,.025],'bone_light')
        ball('cattle_nasal_cavities',(side*.075,-.373,-.79),(.048,.023,.15),'socket')
        ps=bezier([(side*.42,.02,.36),(side*1.15,-.01,.31),(side*1.55,.04,.97),(side*.99,.11,1.52)],20)
        line('sweeping_buffalo_horns',ps,[.17*(1-i/19)**1.25+.004 for i in range(20)],'horn')
        for i in [3,7,11]:
            p=ps[i]; tangent=(ps[i+1]-ps[i-1]).normalized()
            u=tangent.cross(Vector((0,1,0))).normalized(); v=tangent.cross(u)
            radius=.17*(1-i/19)**1.25+.006
            ring=[p+radius*(math.cos(t)*u+math.sin(t)*v) for t in [TAU*j/9 for j in range(10)]]
            line('horn_growth_ridges',ring,[.009*(1-i/22)]*10,'wood_grain')
        line('bone_forehead_ridges',[(side*.30,-.15,.46),(side*.13,-.24,.19),(side*.08,-.23,-.2)],[.045,.035,.018],'bone_light')
    line('skull_sutures',[(0,-.174,.62),(.025,-.241,.36),(-.012,-.265,.21),(.011,-.255,.08)],[.008]*4,'wood_grain')
    for side in [-1,1]:
        line('skull_cracks',[(side*.28,-.195,.43),(side*.24,-.24,.32),(side*.16,-.255,.31),(side*.12,-.254,.21)],[.006,.007,.006,.003],'wood_grain')
    line('cattle_jaw_bones',[(-.26,-.09,-.48),(-.22,-.23,-1.03),(0,-.34,-1.10),(.22,-.23,-1.03),(.26,-.09,-.48)],[.05,.065,.065,.065,.05],'bone')
    for side in [-1,1]:
        for k in range(4): ball('cattle_molars',(side*(.12+k*.015),-.30,-.90+k*.08),(.032,.045,.051),'bone_light')

box('buried_plinth',(0,0,.2),(7.7,6.6,.4),'stone')
box('dark_inner_sanctum',(0,0,3),(4.6,4.6,4.65),'socket')
for x in [-2.65,2.65]:
    for y in [-2.65,2.65]:
        box('pillars',(x,y,3),(.49,.49,4.65),'wood')
        box('pillar_foot',(x,y,.91),(.76,.76,.44),'wood_edge')
        box('pillar_capitals',(x,y,5.12),(.82,.82,.36),'wood_edge')
        for k in range(4): tube('pillar_grain',[(x-.15+k*.1,y-.25,1),(x-.13+k*.1,y-.25,2.8),(x-.17+k*.1,y-.25,4.9)],.009,'wood_grain',5)
for side in range(4):
    angle=side*math.pi/2; r=Euler((0,0,angle)).to_matrix()
    def tr(p): return r@Vector(p)
    def facebox(name,p,size,mat): box(name,tr(p),size,mat,(0,0,angle))
    facebox('lintels',(0,-2.65,5.12),(5.9,.62,.35),'wood_edge')
    facebox('lower_cross_beams',(0,-2.65,1.03),(5.5,.50,.22),'wood')
    rim=[tr((1.93*math.sin(t),-2.59,3.06+1.88*math.cos(t))) for t in [TAU*i/64 for i in range(65)]]
    tube('organic_mouth_rims',rim,[.19+.04*math.cos(i*TAU/64) for i in range(65)],'gum',10)
    for upper in [True,False]:
        for j in range(13):
            u=(j-6)/6; x=u*1.69
            z=3.06+(1 if upper else -1)*1.71*math.sqrt(max(.05,1-(x/1.9)**2))
            length=(.42+.22*(1-abs(u))) if upper else (.30+.13*(1-abs(u)))
            if j in [1,11]: length*=1.50
            direction=-1 if upper else 1
            points=[tr((x,-2.63,z)),tr((x*.98,-2.80,z+direction*length*.45)),tr((x*.96,-2.79,z+direction*length))]
            tube('natural_mouth_teeth',points,[.155 if j not in [1,11] else .14,.147,.025 if j in [1,11] else .095],'bone_light',10)
    # Splintered, pale wear follows the long grain on the exposed timber.
    for x in [-2.65,2.65]:
        for k in range(42):
            xx=x+rng.uniform(-.20,.20); z=rng.uniform(1.3,4.8); h=rng.uniform(.05,.44)
            mesh('weathered_pillar_streaks',[tr((xx,-2.902,z)),tr((xx+.009,-2.904,z+h)),tr((xx+rng.uniform(.013,.036),-2.903,z+h*.62))],[(0,1,2)],'wood_edge')
    for k in range(60):
        x=rng.uniform(-2.82,2.55); z=5.12+rng.uniform(-.13,.13); w=rng.uniform(.05,.40)
        mesh('weathered_beam_streaks',[tr((x,-2.963,z)),tr((x+w,-2.965,z+.012)),tr((x+w*.65,-2.964,z+.027))],[(0,1,2)],'wood_edge')
    for j in range(15): facebox('eave_rafter_ends',(-3.55+j*.507,-3.07,5.42),(.16,.85,.19),'wood_edge')
    for x in [-2.65,0,2.65]:
        facebox('bracket_lower',(x,-2.78,5.27),(.90,.70,.16),'wood')
        facebox('bracket_upper',(x,-2.94,5.52),(1.16,.98,.14),'wood_edge')
    for x in [-2.3,2.3]:
        ellipsoid('corner_mouths',(x,-2.98,4.93),(.23,.08,.12),'socket',tr)
        for dx in [-.12,0,.12]: tube('corner_fangs',[tr((x+dx,-3.04,5.04)),tr((x+dx,-3.06,4.91))],[.038,.003],'bone_light',6)

# One continuous hip-and-gable roof.
wx,wy,ix,iy=4.35,3.65,2.85,2.10
def skirt(u,t,side):
    w=ix*(1-t)+wx*t; d=iy*(1-t)+wy*t
    z=6.58-1.12*t+.22*t**5+.21*abs(u)**6*t
    return (u*w,-d,z) if side==0 else ((w,u*d,z) if side==1 else ((-u*w,d,z) if side==2 else (-w,-u*d,z)))
for side in range(4):
    vs=[skirt(-1+2*j/32,i/12,side) for i in range(13) for j in range(33)]
    fs=[(i*33+j,i*33+j+1,(i+1)*33+j+1,(i+1)*33+j) for i in range(12) for j in range(32)]
    mesh('hip_roof_surface',vs,fs,'tile',True)
    for j in range(33):
        u=-1+2*j/32
        tube('roof_tile_rolls',[Vector(skirt(u,i/12,side))+Vector((0,0,.043)) for i in range(13)],.047,'tile_edge',7)
        p=Vector(skirt(u,1,side)); outward=Vector((p.x,p.y,0)).normalized()
        tube('round_tile_endcaps',[p-outward*.05,p+outward*.12],.083,'tile_edge',12)
    for t in [.2,.4,.6,.8]: tube('tile_courses',[Vector(skirt(-1+2*j/32,t,side))+Vector((0,0,.012)) for j in range(33)],.013,'tile_edge',5)
    tube('sweeping_eave_fascia',[Vector(skirt(-1+2*j/24,1,side))-Vector((0,0,.10)) for j in range(25)],.115,'wood_edge',8)
def upper(x,y): return 8.17-1.59*(abs(x)/ix)**.70+.10*(abs(y)/iy)**5
for side in [-1,1]:
    vs=[(side*ix*i/18,-iy+2*iy*j/24,upper(side*ix*i/18,-iy+2*iy*j/24)) for i in range(19) for j in range(25)]
    fs=[(i*25+j,i*25+j+1,(i+1)*25+j+1,(i+1)*25+j) for i in range(18) for j in range(24)]
    mesh('gable_roof_surface',vs,fs,'tile',True)
    for j in range(25):
        y=-iy+2*iy*j/24
        tube('upper_tile_rolls',[(side*ix*i/18,y,upper(side*ix*i/18,y)+.038) for i in range(19)],.048,'tile_edge',7)
for side in [-1,1]:
    y=side*(iy+.012)
    mesh('triangular_gable_panels',[(-ix,y,6.57),(ix,y,6.57),(0,y,8.25)],[(0,1,2)],'wood')
    tube('gable_bargeboards',[(x,y,upper(x,y)+.06) for x in [-ix+2*ix*j/36 for j in range(37)]],.09,'wood_edge',8)
    rr=Euler((0,0,0 if side==-1 else math.pi)).to_matrix()
    def gt(p): return rr@Vector(p)
    ellipsoid('gable_mouth_void',(0,-iy-.055,7.10),(.72,.055,.39),'socket',gt)
    gum=[gt((.75*math.cos(t),-iy-.08,7.1+.42*math.sin(t))) for t in [TAU*i/32 for i in range(33)]]
    tube('gable_gums',gum,.075,'gum',8)
    for x in [-.52,-.34,-.17,0,.17,.34,.52]:
        for sign in [-1,1]:
            z=7.1+sign*.30
            tube('gable_teeth',[gt((x,-iy-.14,z)),gt((x,-iy-.17,z-sign*.20))],[.07,.012],'bone_light',8)
tube('ridge_cap',[(0,-2.36,8.33),(0,0,8.26),(0,2.36,8.33)],.115,'wood_edge',10)
skull((0,-2.02,8.76),.62)
for side in [-1,1]:
    for y in [-1.58,0,1.58]:
        ps=bezier([(side*2.97,y,6.39),(side*3.80,y,6.22),(side*4.23,y,7.11),(side*3.85,y,7.82)],18)
        tube('roof_horns',ps,[.23*(1-i/17)**1.3+.004 for i in range(18)],'horn',10)
for x in [-3.92,3.92]:
    for y in [-3.22,3.22]:
        tube('hanging_skull_cords',[(x,y,5.70),(x,y,4.98),(x+.025,y,4.70)],.024,'rope',6)
        skull((x,y,4.49),.49,0 if y<0 else math.pi,True)
for i in range(18):
    angle=TAU*i/18+rng.uniform(-.07,.07)
    skull((4.0*math.sin(angle),-3.64*math.cos(angle),.98+rng.uniform(-.12,.24)),rng.uniform(.88,1.14),angle+rng.uniform(-.30,.30),False,rng.uniform(-.55,-.16))
for i in range(13):
    angle=TAU*(i+.35)/13
    skull((3.36*math.sin(angle),-2.90*math.cos(angle),1.73+rng.uniform(-.12,.27)),rng.uniform(.63,.86),angle+rng.uniform(-.36,.36),False,rng.uniform(-.45,.15))
for i in range(30):
    t=TAU*i/30; x=4.1*math.sin(t); y=3.55*math.cos(t)
    tube('scattered_long_bones',[(x-.31,y-.20,.32),(x,y,.36),(x+.40,y+.19,.29)],[.078,.047,.080],'bone',7)
for sx in [-1,1]:
    for sy in [-1,1]:
        x=sx*3.55; y=sy*2.95
        tube('gnarled_stumps',[(x,y,.4),(x+.13*sx,y,1.5),(x+.02*sx,y+.16*sy,2.5),(x+.3*sx,y,3.01)],[.20,.18,.12,.025],'wood_grain',9)
        for branch in [-1,1]:
            ps=bezier([(x,y,1.65),(x+branch*.45,y,2.1),(x+branch*.82,y+.14,2.05),(x+branch*.88,y+.1,2.65)],12)
            tube('twisted_branches',ps,[.105*(1-j/11)+.008 for j in range(12)],'wood_grain',7)

for (name,material,smooth),(verts,faces) in batches.items():
    data=bpy.data.meshes.new(name); data.from_pydata(verts,[],faces)
    bm=bmesh.new(); bm.from_mesh(data); bmesh.ops.recalc_face_normals(bm,faces=bm.faces); bm.to_mesh(data); bm.free(); data.update()
    for poly in data.polygons: poly.use_smooth=smooth
    obj=bpy.data.objects.new(name,data); collection.objects.link(obj)
    data.materials.append(materials[material]); obj['shrinePart']=name
    # Portable vertex color variation survives glTF and keeps fine bones from looking plastic.
    colors=data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
    for vertex,color in zip(data.vertices,colors.data):
        p=vertex.co
        n=noise.noise_vector(p*3.6).x
        modulation=.79+.21*n
        if material in ['tile','tile_edge']: modulation=.75+.22*noise.noise_vector(p*7).x
        if material in ['bone','bone_light','horn']: modulation=.74+.25*noise.noise_vector(p*9).x
        color.color=(*(channel*modulation for channel in palette[material][0]),1)
    data.color_attributes.active_color=colors
    # Render the same modulation in Blender and in the GLB.
    mat=materials[material]
    if not any(n.type=='VERTEX_COLOR' for n in mat.node_tree.nodes):
        nodes=mat.node_tree.nodes; shader=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
        vc=nodes.new('ShaderNodeVertexColor'); vc.layer_name='Color'
        mat.node_tree.links.new(vc.outputs['Color'],shader.inputs['Base Color'])

# Export one mesh per material (12 draw calls) while retaining editable parts in Blender.
export_scene=bpy.data.scenes.new('Shrine export staging')
bpy.context.window.scene=export_scene
for material in materials.values():
    sources=[o for o in collection.objects if o.data.materials[0]==material]
    if not sources: continue
    verts=[]; faces=[]; colors=[]; smoothing=[]
    for ob in sources:
        offset=len(verts)
        verts.extend(tuple(v.co) for v in ob.data.vertices)
        faces.extend(tuple(offset+i for i in p.vertices) for p in ob.data.polygons)
        smoothing.extend(p.use_smooth for p in ob.data.polygons)
        colors.extend(tuple(c.color) for c in ob.data.color_attributes['Color'].data)
    data=bpy.data.meshes.new(material.name+' export'); data.from_pydata(verts,[],faces); data.update()
    for p,smooth in zip(data.polygons,smoothing): p.use_smooth=smooth
    attr=data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
    for c,rgba in zip(attr.data,colors): c.color=rgba
    data.color_attributes.active_color=attr
    data.materials.append(material)
    ob=bpy.data.objects.new(material.name+' export',data); export_scene.collection.objects.link(ob)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public'/'models'/'malevolent-shrine.glb'),use_active_scene=True,
    export_cameras=False,export_lights=False,export_extras=True,export_vertex_color='ACTIVE')
bpy.context.window.scene=scene
for ob in list(export_scene.objects):
    data=ob.data; bpy.data.objects.remove(ob,do_unlink=True); bpy.data.meshes.remove(data)
bpy.data.scenes.remove(export_scene)

# Studio objects are added after game export.
world=bpy.data.worlds.new('Shrine neutral studio'); world.use_nodes=True
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND')
bg.inputs[0].default_value=(.20,.23,.27,1); bg.inputs[1].default_value=.65; scene.world=world
for name,loc,power,size in [('Key',(-7,-10,14),2100,7),('Fill',(8,-4,8),1300,6),('Rim',(1,8,12),2600,5)]:
    ld=bpy.data.lights.new('Shrine '+name,'AREA'); ld.energy=power; ld.size=size
    ob=bpy.data.objects.new(ld.name,ld); scene.collection.objects.link(ob); ob.location=loc
    ob.rotation_euler=(Vector((0,0,4))-ob.location).to_track_quat('-Z','Y').to_euler()
cd=bpy.data.cameras.new('Shrine review camera'); camera=bpy.data.objects.new(cd.name,cd); scene.collection.objects.link(camera)
camera.location=(13,-22,13); camera.rotation_euler=(Vector((0,0,4.5))-camera.location).to_track_quat('-Z','Y').to_euler()
cd.type='ORTHO'; cd.ortho_scale=14.5; scene.camera=camera
scene.render.resolution_x=1200; scene.render.resolution_y=1200; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.filepath=str(ROOT/'art'/'malevolent-shrine-v2-preview.png')
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.overlay.show_extras=False
        rv=area.spaces.active.region_3d; rv.view_location=(0,0,4.4); rv.view_distance=19
        rv.view_rotation=camera.rotation_euler.to_quaternion(); area.tag_redraw()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art'/'malevolent-shrine-v2.blend'))
print('SHRINE_V2',len(collection.objects),'meshes',sum(len(o.data.polygons) for o in collection.objects),'polygons')
