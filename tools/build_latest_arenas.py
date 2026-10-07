"""Editable Blender environments and game GLBs. Run inside Blender via MCP."""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models'
ART = ROOT / 'art'
OUT.mkdir(exist_ok=True); ART.mkdir(exist_ok=True)
rng = random.Random(206)
MATS = {}
def mat(name, rgb, rough=.8, glow=0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Emission Color'].default_value = (*rgb, 1)
    p.inputs['Emission Strength'].default_value = glow
    m.diffuse_color = (*rgb, 1); MATS[name] = m
    return name
stone=mat('Warm limestone',(.43,.42,.36)); pale=mat('Ivory plaster',(.72,.69,.59))
dark=mat('Charcoal concrete',(.095,.12,.15)); road=mat('Asphalt',(.045,.055,.07))
wood=mat('Aged cedar',(.19,.085,.045)); tile=mat('Blue slate',(.075,.13,.15))
leaf=mat('Cypress green',(.055,.16,.095)); leaf2=mat('Sunlit foliage',(.14,.26,.12))
glass=mat('Smoked glass',(.055,.14,.18),.28); metal=mat('Oxidized steel',(.19,.23,.25),.42)
paint=mat('Worn road paint',(.65,.62,.48)); cyan=mat('Cyan signage',(.07,.55,.62),.5,.7)
red=mat('Red signage',(.65,.12,.08),.6,.5); amber=mat('Amber signage',(.85,.48,.12),.6,.7)
flesh=mat('Ashen soul hands',(.29,.23,.27),.62,.12); flesh2=mat('Pale soul hands',(.49,.40,.40),.65,.12)
crease=mat('Palm creases',(.065,.028,.042)); void=mat('Domain black',(.003,.002,.007))
vein=mat('Soul violet',(.28,.12,.36),.7,1.6)

class Builder:
    def __init__(self, name):
        self.scene=bpy.data.scenes.new(name); bpy.context.window.scene=self.scene
        self.batches={}; self.serial=0
    def mesh(self, name, material, vertices, faces, collider=False):
        # Merge static decor per material; preserve independent collision/destruction meshes.
        if collider:
            self.serial+=1
            name=name+'_'+str(self.serial)
        key=(name if collider or name.startswith('breakable_') or name in ('shibuya_asphalt','crater_floor','domain_shell') else material,material,collider)
        v,f=self.batches.setdefault(key,([],[])); n=len(v)
        v.extend(vertices); f.extend(tuple(n+i for i in face) for face in faces)
    def box(self,name,m,pos,size,angle=0,collider=False):
        x,y,z=pos; w,d,h=(v/2 for v in size); c,s=math.cos(angle),math.sin(angle)
        v=[(x+a*c-b*s,y+a*s+b*c,z+t) for a,b,t in [(-w,-d,-h),(w,-d,-h),(w,d,-h),(-w,d,-h),(-w,-d,h),(w,-d,h),(w,d,h),(-w,d,h)]]
        self.mesh(name,m,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],collider)
    def tube(self,name,m,points,radii,sides=9):
        v=[]; f=[]
        for j,pt in enumerate(points):
            p=Vector(pt); tangent=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(0,j-1)])
            q=tangent.to_track_quat('Z','Y')
            for i in range(sides):
                a=i*math.tau/sides; v.append(tuple(p+q@Vector((radii[j]*math.cos(a),radii[j]*math.sin(a),0))))
        for j in range(len(points)-1):
            for i in range(sides):
                a=j*sides+i; b=j*sides+(i+1)%sides; f.append((a,b,b+sides,a+sides))
        f.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+i for i in range(sides))])
        self.mesh(name,m,v,f)
    def ellipsoid(self,name,m,pos,size,transform=None,seg=12,rings=8):
        v=[];f=[]
        for j in range(rings+1):
            p=math.pi*j/rings
            for i in range(seg):
                a=math.tau*i/seg; q=Vector((pos[0]+size[0]*math.sin(p)*math.cos(a),pos[1]+size[1]*math.sin(p)*math.sin(a),pos[2]+size[2]*math.cos(p)))
                v.append(tuple(transform@q if transform else q))
        for j in range(rings):
            for i in range(seg):
                a=j*seg+i;b=j*seg+(i+1)%seg;f.append((a,a+seg,b+seg,b))
        self.mesh(name,m,v,f)
    def finish(self,filename,eye,target,night=False):
        for (name,m,col),(v,f) in self.batches.items():
            center=Vector(tuple((min(p[k] for p in v)+max(p[k] for p in v))/2 for k in range(3)))
            me=bpy.data.meshes.new(name);me.from_pydata([tuple(Vector(p)-center) for p in v],[],f);me.update()
            ob=bpy.data.objects.new(name,me);self.scene.collection.objects.link(ob);me.materials.append(MATS[m]);ob.location=center
            if col: ob['arenaCollider']=True
            if 'hands' in m.lower():
                for p in me.polygons:p.use_smooth=True
        bpy.ops.export_scene.gltf(filepath=str(OUT/(filename+'.glb')),use_active_scene=True,export_cameras=False,export_lights=False,export_extras=True)
        sc=self.scene; world=bpy.data.worlds.new(filename+' atmosphere');world.use_nodes=True
        bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=((.015,.02,.04,1) if night else (.36,.46,.53,1));bg.inputs[1].default_value=.35 if night else .6;sc.world=world
        def light(name,loc,power,color,size):
            d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size
            o=bpy.data.objects.new(name,d);sc.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
        light('Key',(-5,-5,10) if filename=='mahito-domain' else (-12,-15,26),3500 if night else 17000,(.65,.72,1) if night else (1,.86,.65),8 if filename=='mahito-domain' else 20)
        light('Rim',(10,24,18),4200 if night else 11000,(.53,.25,.65) if night else (.68,.8,1),18)
        if filename.startswith('shibuya'):
            bg.inputs[0].default_value=(.12,.16,.24,1);bg.inputs[1].default_value=.7
            d=bpy.data.lights.new('Moonlight','SUN');d.energy=.85;d.color=(.62,.73,1)
            o=bpy.data.objects.new('Moonlight',d);sc.collection.objects.link(o);o.rotation_euler=(.4,-.3,-.5)
        if not night:
            d=bpy.data.lights.new('Afternoon sun','SUN');d.energy=2;d.angle=.12;o=bpy.data.objects.new(d.name,d);sc.collection.objects.link(o);o.rotation_euler=(.45,-.4,-.5)
        d=bpy.data.cameras.new(filename+' camera');o=bpy.data.objects.new(d.name,d);sc.collection.objects.link(o);o.location=eye;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=28;sc.camera=o
        sc.render.resolution_x=1440;sc.render.resolution_y=900;sc.render.resolution_percentage=75
        sc.render.filepath=str(ART/(filename+'-preview.png'))
        print(filename, 'meshes',len(self.batches),'triangles',sum(len(f)-2 for _,fs in self.batches.values() for f in fs))
        return sc

def hand(b,origin,scale,rotation,m):
    # A palm, opposable thumb and four articulated fingers, with recessed palm folds.
    T=Matrix.Translation(Vector(origin))@rotation.to_matrix().to_4x4()@Matrix.Diagonal((scale,scale,scale,1))
    b.ellipsoid('hands',m,(0,0,0),(.82,.31,1.03),T)
    def tube(pts,rs,material=m):b.tube('hands',material,[tuple(T@Vector(p)) for p in pts],[r*scale for r in rs],9)
    tube([(0,0,-.65),(.05,.08,-1.8),(.2,.18,-3.7)],[.55,.40,.60])
    for k,(x,length) in enumerate([(-.59,1.58),(-.2,1.95),(.22,1.8),(.59,1.4)]):
        bend=.24+(k%3)*.13
        pts=[(x,0,.6),(x*1.18,-.03,.98),(x*1.3,-bend,1+length*.6),(x*1.21,-bend-.28,1+length)]
        tube(pts,[.21,.20,.16,.09])
        b.ellipsoid('knuckle',m,pts[2],(.17,.18,.19),T,8,6)
    tube([(-.57,0,-.38),(-1.03,-.05,.02),(-1.3,-.25,.52),(-1.12,-.43,.95)],[.29,.25,.19,.1])
    for pts in [[(-.55,-.30,.30),(0,-.325,.12),(.53,-.26,.32)],[(-.45,-.30,-.52),(-.24,-.325,-.10),(-.40,-.29,.20)]]:tube(pts,[.014]*len(pts),crease)

def domain():
    b=Builder('01 • Mahito — Self Embodiment')
    b.ellipsoid('domain_shell',void,(0,0,5),(19,19,18),seg=48,rings=24)
    b.box('soul_floor',void,(0,0,-.2),(36,36,.35))
    for row in range(3):
        for i in range(18):
            a=math.tau*(i+row*.38)/18;r=13.2+row*.6
            p=(r*math.cos(a),r*math.sin(a),1+row*4.4)
            # Palm faces the centre; vary lean and curl silhouette.
            direction=Vector((-math.cos(a),-math.sin(a),.3))
            q=direction.to_track_quat('-Y','Z') @ Matrix.Rotation(.35*math.sin(i*2.1+row),4,'Y').to_quaternion()
            hand(b,p,1.25+row*.12,q,flesh2 if i%4==0 else flesh)
    for i in range(12):
        a=i*math.tau/12
        hand(b,(8*math.cos(a),8*math.sin(a),14),1.25,Vector((-math.cos(a),-math.sin(a),-1.8)).to_track_quat('Z','Y'),flesh)
    for i in range(18):
        a=i*math.tau/18
        pts=[(r*math.cos(a+.06*math.sin(r)),r*math.sin(a+.06*math.sin(r)),.015) for r in [5,7,9,11,13,15]]
        b.tube('soul floor sutures',vein,pts,[.025]*6,5)
    return b.finish('mahito-domain',(0,-9,4),(0,8,6),True)

def roof(b,x,y,z,w,d):
    # Gabled, curved-eave roof, with visible ridge and repeated tile ribs.
    for side in [-1,1]:
        verts=[];faces=[]
        for i in range(9):
            t=i/8;yy=y+side*d*.5*t;zz=z+3*(1-t)**1.5+.4*t**8
            verts.extend([(x-w/2,yy,zz),(x+w/2,yy,zz)])
        for i in range(8):faces.append((i*2,i*2+1,i*2+3,i*2+2))
        b.mesh('swept tiled roof',tile,verts,faces)
        for j in range(int(w/1.0)+1):
            xx=x-w/2+j
            b.tube('roof tile ribs',tile,[(xx,y+side*d*.5*t,z+3*(1-t)**1.5+.4*t**8+.04) for t in [k/8 for k in range(9)]],[.08]*9,6)
    b.box('ridge cap',tile,(x,y,z+3.08),(w+.8,.4,.4))

def tree(b,x,y,h):
    b.tube('cedar trunk',wood,[(x,y,0),(x,y,h*.7),(x+.4,y,h)],[.65,.4,.1])
    for j in range(4):
        z=h*.45+j*h*.14
        b.ellipsoid('cedar canopy',leaf if j%2 else leaf2,(x,y,z),(h*.23*(1-j*.15),h*.22*(1-j*.15),h*.18),seg=10,rings=5)

def hidden(initial):
    name='hidden-inventory' if initial else 'hidden-inventory-rematch';b=Builder('02 • Jujutsu High' if initial else '03 • Association Courtyard')
    b.box('ground',leaf if initial else stone,(0,0,-.38),(220,220,.7))
    b.box('court foundation',stone,(0,0,-.12),(77,100,.2))
    for x in range(-36,37,4):
        for y in range(-48,49,4):
            if rng.random()>.035:b.box('paving',pale if rng.random()<.16 else stone,(x,y,-.035),(3.92,3.92,.07))
    if initial:
        for x in [-11,11]:b.box('school_gate_pillar',wood,(x,43,5),(1.9,2,10),collider=True)
        for z in [7.8,9.6]:b.box('gate lintel',wood,(0,43,z),(27,1.5,1.1))
        roof(b,0,43,10,32,12)
        for x in [-37,37]:
            b.box('school_hall',pale,(x,52,4.5),(27,17,9),collider=True);roof(b,x,52,9,31,21)
            for xx in range(-12,13,3):
                b.box('cedar posts',wood,(x+xx,43.4,4.5),(.24,.3,9))
                b.box('shoji windows',glass,(x+xx,43.2,5),(2.4,.12,3))
            b.box('veranda',wood,(x,41.5,.4),(29,3,.8))
        for y in range(-32,37,17):
            for x in [-23,23]:
                b.box('lantern plinth',stone,(x,y,.3),(2,2,.6));b.box('lantern stem',stone,(x,y,1.5),(.7,.7,2))
                b.box('lantern chamber',pale,(x,y,2.8),(1.4,1.4,1));roof(b,x,y,3.3,2.4,2.3)
        for i in range(60):
            a=i*2.39996;r=58+(i%4)*8;x=r*math.cos(a);y=r*math.sin(a)
            tree(b,x,y,12+rng.random()*9)
        for x in [-46,46]:b.box('perimeter wall',pale,(x,0,2),(1.2,72,4),collider=True)
    else:
        b.box('association_main_building',pale,(0,57,10),(78,23,20),collider=True)
        for z in [1,9,18,20]:b.box('facade cornice',stone,(0,44.8,z),(81,1.1,.7))
        b.box('entrance recess',dark,(0,44.7,7),(20,.2,12))
        for x in [-34,-25,-15,15,25,34]:
            b.box('facade pilaster',stone,(x,43.7,9),(1.2,1.7,18))
            if abs(x)>15:b.box('association_window',glass,(x+3.5,44.6,11),(4.6,.25,9))
        for x in [-6,-2,2,6]:b.box('bronze entrance doors',wood,(x,44.4,5),(3.7,.3,9))
        for i in range(7):b.box('entrance_steps',stone,(0,39+i*.8,.12+i*.14),(32,1.7,.24+i*.28))
        for x in [-45,45]:
            b.box('boundary_wall',pale,(x,0,2.5),(1.5,86,5),collider=True)
            b.box('wall coping',stone,(x,0,5.15),(2,86,.35))
            for y in [-29,-12,8,28]:
                b.box('planter',stone,(x*.8,y,.7),(8,6,1.4),collider=True);tree(b,x*.8,y,8)
        # Purple's path is a scar outside the spawn corridor.
        for i in range(20):
            b.box('purple blast scar',dark,(21+i*.55,-36+i*3,.012),(4+rng.random()*3,3,.025),.2)
        for i in range(24):
            b.box('breakable_courtyard_stone_'+str(i),stone,(rng.choice([-1,1])*rng.uniform(25,39),rng.uniform(-38,32),.2),(rng.uniform(.5,1.8),.8,.4),rng.random()*6)
    return b.finish(name,(65,-76,44),(0,21,4))

def city(final):
    name='shibuya-final' if final else 'shibuya-clash';b=Builder('05 • Shibuya Final Impact' if final else '04 • Shibuya Crossroads')
    b.box('shibuya_asphalt',road,(0,0,-.38),(240,240,.7))
    for x in [-40,40]:b.box('raised sidewalks',stone,(x,0,.05),(13,152,.15))
    for y in [-31,30]:
        for x in range(-26,27,4):b.box('crosswalk',paint,(x,y,.015),(2.1,10,.03))
    for y in range(-76,77,10):
        for x in [-13,13]:b.box('lane paint',paint,(x,y,.016),(.25,5,.03))
    for side in [-1,1]:
        for j in range(6):
            x=side*(53+(j%2)*3);y=-65+j*26;h=(18+(j*13)%29)*(0.63 if final else 1)
            b.box('building_collider_'+str(side)+'_'+str(j),dark if j%2 else stone,(x,y,h/2),(20,22,h),collider=True)
            facade=x-side*10.1
            for z in range(3,int(h),4):
                b.box('floor bands',metal,(facade,y,z),(.3,22,.22))
                for yy in range(-9,10,3):
                    if rng.random()>(.48 if final else .17):b.box('window grid',glass,(facade-side*.08,y+yy,z+1.5),(.16,2.6,2.5))
            for yy in [-10,-4,4,10]:b.box('facade mullions',metal,(facade-side*.16,y+yy,h/2),(.25,.18,h))
            b.box('storefront shutter',metal,(facade-side*.2,y,2),(.3,15,3.5))
            signmat=[red,cyan,amber][j%3]
            b.box('shop lightbox',signmat,(facade-side*.5,y,4.5),(.6,16,1.2))
            for t in range(9):b.box('lightbox lettering',pale,(facade-side*.83,y-6+t*1.5,4.5),(.03,.5,.65))
            if j%2:
                b.box('vertical sign',signmat,(facade-side, y-8,h*.63),(1,2.3,8))
                for t in range(5):b.box('sign glyph',pale,(facade-side*1.55,y-8,h*.63-3+t*1.4),(.08,1.2,.7))
            # Broken roof slab and exposed rebars.
            b.box('fractured roof',stone,(x,y,h+.2),(22,23,.5),.04*(j-2))
            for i in range(8):
                xx=x+rng.uniform(-9,9);yy=y+rng.uniform(-9,9)
                b.tube('roof rebars',metal,[(xx,yy,h),(xx,yy,h+2),(xx+.8,yy,h+2.6)],[.06,.06,.04],5)
        for j in range(8):
            x=side*(87+(j%3)*17);y=-98+j*28;h=rng.uniform(24,63)
            b.box('distant skyline',dark,(x,y,h/2),(21,23,h))
        for y in [-47,10,56]:
            x=side*31;b.tube('streetlight',metal,[(x,y,0),(x,y,8),(x-side*3,y,8.5)],[.16,.12,.1],7)
            b.box('lamp',amber,(x-side*3,y,8.4),(1.3,.6,.15))
    # Station stairwell and shelter at the edge of the playable lane.
    b.box('station entrance',dark,(-37,-16,.2),(7,12,.4),collider=True)
    for x in [-41,-33]:b.box('station sidewall',stone,(x,-16,1.1),(.5,13,2.2))
    b.box('station sign',cyan,(-37,-10,3.8),(9,.5,1.3))
    for i in range(8):b.box('station stairs',stone,(-37,-20+i, .1+i*.08),(7,.85,.16))
    for i in range(85 if final else 42):
        a=i*2.39996;r=rng.uniform(25,45);x=r*math.cos(a);y=r*math.sin(a)
        b.box('breakable_shibuya_rubble_'+str(i),stone,(x,y,rng.uniform(.15,.5)),(rng.uniform(.6,3.8),rng.uniform(.6,2),rng.uniform(.3,1)),a)
    if final:
        b.ellipsoid('crater_floor',dark,(0,0,-.58),(20,18,.62),seg=64,rings=8)
        for i in range(36):
            a=i*math.tau/36;r=19+rng.uniform(-1,1)
            b.box('impact rim slabs',stone,(r*math.cos(a),r*math.sin(a),.2),(rng.uniform(2,4),1.4,.45),a)
            pts=[(rr*math.cos(a+.06*k),rr*math.sin(a+.06*k),.025) for k,rr in enumerate([7,13,19,25,30])]
            b.tube('radial asphalt fractures',void,pts,[.045,.08,.14,.09,.02],5)
        for side in [-1,1]:
            for i in range(4):b.box('collapsed floor plates',stone,(side*(35+i*2),23+i*3,1+i*.9),(12,5,.6),side*.25)
    return b.finish(name,(23,-77,35),(0,14,5),True)

def build_all():
    scenes=[domain(),hidden(True),hidden(False),city(False),city(True)]
    bpy.context.window.scene=scenes[0]
    for area in bpy.context.screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
            area.spaces.active.shading.type='MATERIAL'
    bpy.ops.wm.save_as_mainfile(filepath=str(ART/'latest-arenas.blend'))
    print('LATEST_ARENAS_COMPLETE')

if __name__=='__main__':build_all()
