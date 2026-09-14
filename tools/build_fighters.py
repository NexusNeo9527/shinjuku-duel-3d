"""Deterministic Blender character source. Run inside Blender; exports game GLBs."""
import bpy, math, random, os
from mathutils import Vector

OUT = r'D:\新宿决战\public\models'
SOURCE = r'D:\新宿决战\art'
os.makedirs(OUT, exist_ok=True)
os.makedirs(SOURCE, exist_ok=True)
# Work in a separate scene to preserve the user's existing scene.
scene = bpy.data.scenes.new('Shinjuku_Character_Studio')
bpy.context.window.scene = scene
random.seed(23)

def mat(name, color, metal=0, rough=.6):
    m = bpy.data.materials.new(name); m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p=next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal
    p.inputs['Roughness'].default_value=rough
    return m

skin=mat('warm porcelain',(.72,.48,.37)); ivory=mat('divine ivory',(.66,.70,.59))
navy=mat('ink blue uniform',(.025,.035,.07)); black=mat('black leather',(.009,.012,.018),0,.34)
white=mat('silver white hair',(.84,.90,.96)); pink=mat('rose hair',(.55,.17,.22))
cloth=mat('warm white cloth',(.78,.74,.66)); red=mat('oxblood sash',(.19,.013,.027))
gold=mat('antique gold',(.62,.37,.09),.72,.3); ink=mat('curse ink',(.017,.009,.015))
eye=mat('crimson iris',(.7,.025,.045),.1,.25); steel=mat('sword silver',(.67,.77,.79),.8,.22)

def node(name, parent=None, pos=(0,0,0)):
    o=bpy.data.objects.new(name,None); scene.collection.objects.link(o)
    o.parent=parent; o.location=pos; return o

def finish(o,name,parent,material):
    o.name=name; o.parent=parent; o.data.materials.append(material)
    for p in o.data.polygons: p.use_smooth=True
    return o

def ell(name,p,s,m,parent):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=(0,0,0))
    o=finish(bpy.context.object,name,parent,m); o.location=p; o.scale=s; return o

def loft(name,rings,m,parent,n=24):
    # Elliptic sections: z, width, depth, front/back center. Sculpted silhouettes.
    v=[]; f=[]
    for z,w,d,y in rings:
        for i in range(n):
            a=2*math.pi*i/n; v.append((w*math.cos(a),y+d*math.sin(a),z))
    for j in range(len(rings)-1):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n; f.append((a,b,b+n,a+n))
    f.extend([tuple(reversed(range(n))),tuple((len(rings)-1)*n+i for i in range(n))])
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(v,[],f);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o)
    return finish(o,name,parent,m)

def line(name,points,r,m,parent):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=2
    c.bevel_depth=r;c.bevel_resolution=2
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,co in zip(s.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.parent=parent;c.materials.append(m)
    bpy.context.view_layer.objects.active=o;o.select_set(True)
    bpy.ops.object.convert(target='MESH');o.select_set(False)
    return o

def spike(name,a,b,r,m,parent):
    delta=Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cone_add(vertices=9,radius1=r,radius2=.002,depth=delta.length)
    o=finish(bpy.context.object,name,parent,m);o.location=(Vector(a)+Vector(b))/2
    o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return o

roots=[]
for ident in ['gojo','sukuna','mahoraga']:
    maha=ident=='mahoraga'; suk=ident=='sukuna'; bodymat=ivory if maha else skin
    root=node(ident);roots.append(root)
    hips=node('hips',root,(0,0,.91));torso=node('torso',hips,(0,0,.12))
    width=.29 if maha else .22
    loft('tailored torso' if not maha else 'tapered muscular trunk',[(0,.15,.105,0),(.12,width*.83,.12,0),(.30,width,.135,0),(.41,width,.12,.012),(.46,.12,.08,0)],bodymat if maha else (cloth if suk else navy),torso)
    ell('pelvis',(0,0,0),(.175,.12,.15),cloth if (maha or suk) else navy,hips)
    loft('high collar',[(.39,.102,.085,0),(.49,.092,.082,0)],navy if not suk else cloth,torso) if not maha else None
    ell('neck',(0,0,.47),(.07,.068,.11),bodymat,torso)
    head=node('head',torso,(0,0,.60))
    loft('sculpted jaw and cranium',[(-.14,.055,.065,-.012),(-.105,.085,.079,-.014),(-.045,.112,.092,0),(.04,.12,.1,0),(.115,.095,.085,.007),(.14,.025,.03,.01)],bodymat,head)
    ell('nose',(0,-.099,-.018),(.022,.031,.035),bodymat,head)
    for s in [-1,1]:ell('ear',(s*.115,0,-.018),(.021,.027,.039),bodymat,head)
    line('mouth',[(-.038,-.087,-.073),(0,-.097,-.078),(.038,-.087,-.073)],.0035,ink,head)
    if not maha:
        # Dozens of individually directed tapered locks, avoiding spherical helmet hair.
        hair= pink if suk else white
        for j in range(3):
            for i in range(13):
                a=i*2*math.pi/13+j*.23
                radius=.092*(1-j*.22); z=.062+j*.036
                start=(math.cos(a)*radius,math.sin(a)*radius,z)
                end=(math.cos(a)*(radius+.045),math.sin(a)*(radius+.045)+(.035 if suk else 0),z+.075+random.random()*.055)
                spike('layered hair lock',start,end,.035,hair,head)
        if not suk:
            loft('fitted blindfold',[(-.015,.117,.102,0),(.041,.122,.105,0)],black,head)
            for s in [-1,1]:line('blindfold tie',[(0,.09,.01),(s*.065,.17,-.01),(s*.085,.2,-.10)],.014,black,head)
        else:
            for s in [-1,1]:
                ell('eye white',(s*.047,-.093,.013),(.027,.009,.011),cloth,head)
                ell('red iris',(s*.046,-.103,.013),(.008,.004,.009),eye,head)
                line('brow',[(s*.022,-.098,.036),(s*.067,-.087,.045)],.006,ink,head)
                for z in [-.023,-.043]:line('cheek curse',[(s*.043,-.091,z),(s*.083,-.076,z-.015),(s*.094,-.06,z+.005)],.004,ink,head)
            line('forehead curse',[(-.024,-.084,.085),(0,-.103,.065),(.024,-.084,.085)],.005,ink,head)
            line('chin curse',[(0,-.09,-.063),(0,-.083,-.108)],.005,ink,head)
    else:
        for s in [-1,1]:
            for i in range(3):
                spike('facial wing',(s*.09,0,.025-i*.018),(s*(.25-i*.018),.05,.11-i*.035),.028,ivory,head)
        loft('brow carapace',[(.005,.12,.103,0),(.047,.137,.11,0),(.081,.09,.088,0)],ivory,head)
        for s in [-1,1]:
            ell('pectoral',(s*.137,-.095,.305),(.143,.075,.095),ivory,torso)
            for z in [.10,.18]:ell('abdominal',(s*.065,-.11,z),(.064,.038,.048),ivory,torso)
    if suk:
        for s in [-1,1]:
            line('crossed lapel',[(s*.09,-.09,.44),(0,-.143,.20),(s*.11,-.12,.015)],.019,black,torso)
    if maha or suk:
        loft('waist sash',[(-.07,.18,.124,0),(.055,.177,.123,0)],red if suk else gold,hips)
        for s in [-1,1]:
            flap=loft('overlapping skirt panel',[(-.31,.14,.10,0),(-.18,.16,.11,0),(0,.115,.09,0)],cloth,hips)
            flap.location=(s*.07,-.035,-.03)
            for x in [-.06,0,.06]:line('cloth pleat',[(s*.07+x,-.148,-.07),(s*.07+x*1.3,-.145,-.31)],.0035,gold if maha else white,hips)
    for s,label in [(-1,'L'),(1,'R')]:
        arm=node('arm'+label,torso,(s*(width+.025),0,.38))
        arm.rotation_euler.y=s*-.12
        sleeve=bodymat if maha else (cloth if suk else navy)
        ell('deltoid',(0,0,-.035),(.107 if maha else .071,.079,.105),sleeve,arm)
        loft('upper arm',[(-.25,.052,.055,0),(-.15,.081 if maha else .06,.061,0),(-.02,.073,.064,0)],sleeve,arm)
        fore=node('fore'+label,arm,(0,0,-.25))
        loft('forearm',[(-.24,.036,.034,0),(-.17,.045,.045,0),(-.06,.067 if maha else .054,.054,0),(0,.05,.048,0)],bodymat if (maha or suk) else navy,fore)
        ell('palm',(0,-.008,-.26),(.048,.034,.062),bodymat,fore)
        for i in range(4):ell('finger',((i-1.5)*.020,-.015,-.307),(.011,.018,.033),bodymat,fore)
        ell('thumb',(s*.044,-.013,-.255),(.020,.023,.036),bodymat,fore)
        if suk:
            for z in [-.05,-.085]:loft('arm curse band',[(z-.008,.057,.057,0),(z+.008,.057,.057,0)],ink,fore)
        if maha and s==1:
            line('blade mount',[(0,0,-.13),(.10,0,-.15)],.04,gold,fore)
            blade=loft('Sword of Extermination',[(-.69,.001,.005,0),(-.55,.064,.014,0),(-.13,.056,.016,0),(-.07,.018,.01,0)],steel,fore,n=4);blade.location.x=.11
        leg=node('leg'+label,hips,(s*.095,0,-.08))
        loft('trouser thigh',[(-.37,.060,.066,0),(-.20,.085,.085,0),(0,.086,.092,0)],cloth if maha or suk else navy,leg)
        shin=node('shin'+label,leg,(0,0,-.37))
        loft('lower leg',[(-.34,.043,.045,0),(-.22,.055,.06,0),(-.08,.068,.066,0),(0,.06,.061,0)],ivory if maha else (cloth if suk else navy),shin)
        ell('foot',(0,-.045,-.37),(.069,.125,.053),bodymat if maha else black,shin)
        if not maha:loft('boot cuff',[(-.33,.052,.055,0),(-.24,.052,.055,0)],black,shin)
    if maha:
        wheel=node('wheel',root,(0,.025,2.02))
        bpy.ops.mesh.primitive_torus_add(major_radius=.25,minor_radius=.016,major_segments=48,minor_segments=8)
        o=finish(bpy.context.object,'eight handled wheel',wheel,gold);o.location=(0,0,0);o.rotation_euler.x=math.pi/2
        ell('wheel hub',(0,0,0),(.045,.025,.045),gold,wheel)
        for i in range(8):
            a=i*math.pi/4;x=math.sin(a);z=math.cos(a)
            line('wheel spoke',[(x*.035,0,z*.035),(x*.29,0,z*.29)],.011,gold,wheel)
            ell('wheel handle',(x*.30,0,z*.30),(.035,.026,.035),gold,wheel)
    # Merge static surfaces per articulated node/material to keep game draw calls low.
    for parent in [root]+[o for o in root.children_recursive if o.type=='EMPTY']:
        meshes=[o for o in parent.children if o.type=='MESH']
        if not meshes:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in meshes:o.select_set(True)
        bpy.context.view_layer.objects.active=meshes[0]
        bpy.ops.object.join()
    bpy.ops.object.select_all(action='DESELECT')
    for o in [root]+list(root.children_recursive):o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,ident+'.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)

# The saved studio lays the three editable models out side by side.
for i,root in enumerate(roots):root.location.x=(i-1)*1.2
scene.world=bpy.data.worlds.new('Studio world');scene.world.use_nodes=True
next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND').inputs[0].default_value=(.045,.055,.08,1)
next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND').inputs[1].default_value=.45
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for pos,power,size in [((1,-4,5),700,5),((-4,-1,3),500,3),((2,3,4),900,3)]:
    bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,1))
bpy.ops.object.camera_add(location=(3,-8,3.1));cam=bpy.context.object;aim(cam,(0,0,1.05));cam.data.type='ORTHO';cam.data.ortho_scale=4.8;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1500;scene.render.resolution_y=950;scene.render.resolution_percentage=100
scene.render.filepath=os.path.join(SOURCE,'fighters-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE,'shinjuku-fighters.blend'))
print('Exported three articulated fighters to '+OUT)


