"""Build expanded Yuta arenas without touching character assets or existing scenes.

Run with Blender --background --python tools/build_yuta_arenas.py.
Reference: JJK 249-251 (Authentic Mutual Love), 261-263 (borrowed body).
Architecture, colour and navigable distances are original gameplay adaptations.
"""
import bpy
import math
import random
import sys
from pathlib import Path
from mathutils import Vector, Euler

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'models'
ART = ROOT / 'art'
TAU = math.tau


class Arena:
    def __init__(self, stage):
        self.stage = stage
        self.rng = random.Random(249 if stage == 'yuta' else 262)
        self.scene = bpy.data.scenes.new('Yuta / ' + stage)
        bpy.context.window.scene = self.scene
        self.batches = {}
        self.materials = {}
        for name, color, metal in [
            ('road', (.075,.086,.092), 0), ('ash', (.28,.29,.28), 0),
            ('stone', (.40,.39,.35), 0), ('cut', (.56,.53,.46), 0),
            ('dark', (.065,.072,.077), 0), ('glass', (.08,.17,.19), .5),
            ('steel', (.16,.18,.18), .65), ('paint', (.54,.53,.46), 0),
            ('rust', (.23,.10,.055), .3), ('sand', (.43,.42,.36), 0),
            ('blade', (.56,.65,.67), .8), ('edge', (.85,.87,.84), .75),
            ('grip', (.028,.034,.042), 0), ('binding', (.48,.42,.31), .15),
            ('cord', (.34,.085,.047), 0), ('cord_light', (.56,.19,.09), 0),
        ]:
            mat = bpy.data.materials.new(stage + ' / ' + name)
            mat.diffuse_color = (*color,1)
            mat.use_nodes = True
            shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
            shader.inputs['Base Color'].default_value = (*color,1)
            shader.inputs['Metallic'].default_value = metal
            shader.inputs['Roughness'].default_value = .82 if metal == 0 else .35
            self.materials[name] = mat

    def mesh(self, name, verts, faces, mat, layer='exterior', collider=False):
        vs, fs = self.batches.setdefault((name, mat, layer, collider), ([], []))
        offset = len(vs)
        vs.extend(verts)
        fs.extend(tuple(offset+i for i in face) for face in faces)

    def box(self, name, at, size, mat, layer='exterior', rot=(0,0,0), collider=False):
        rotation = Euler(rot).to_matrix()
        verts = [tuple(Vector(at) + rotation @ Vector((x*size[0]/2,y*size[1]/2,z*size[2]/2)))
                 for x,y,z in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
        self.mesh(name, verts, [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)],mat,layer,collider)

    def shard(self, name, x,y,z, radius, height, mat='stone', layer='exterior'):
        n=5; angle=self.rng.uniform(0,TAU)
        ring=[(math.cos(angle+i*TAU/n)*radius*self.rng.uniform(.7,1.2),
               math.sin(angle+i*TAU/n)*radius*self.rng.uniform(.65,1.1)) for i in range(n)]
        verts=[(x+a,y+b,z) for a,b in ring]+[(x+a*.7,y+b*.7,z+height*self.rng.uniform(.6,1.2)) for a,b in ring]
        self.mesh(name,verts,[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat,layer)

    def tube(self,name,points,radius,mat,layer='exterior',sides=6):
        verts=[]; faces=[]
        for i,p in enumerate(points):
            tangent=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized()
            ref=Vector((0,0,1)) if abs(tangent.z)<.9 else Vector((1,0,0))
            u=tangent.cross(ref).normalized(); v=tangent.cross(u).normalized()
            for j in range(sides):
                verts.append(tuple(Vector(p)+radius*(math.cos(j*TAU/sides)*u+math.sin(j*TAU/sides)*v)))
            if i:
                for j in range(sides):
                    faces.append(((i-1)*sides+j,(i-1)*sides+(j+1)%sides,i*sides+(j+1)%sides,i*sides+j))
        self.mesh(name,verts,faces,mat,layer)

    def ruins(self):
        rng=self.rng; late=self.stage=='borrowed'
        self.box('district_ground',(0,0,-.24),(240,240,.48),'ash' if late else 'road')
        # Broken road fragments and seam lines, leaving the central duel route flat.
        for side in [-1,1]:
            for y in range(-65,70,6):
                self.box('buried_lane_paint',(side*9,y,.006),(.14,2.5,.012),'paint')
        for i in range(12):
            self.box('surviving_crosswalk',(-11+i*2,-8,.008),(1,3.3,.016),'paint')
        for i in range(100):
            x,y=rng.uniform(-65,65),rng.uniform(-65,65)
            if late or abs(x)>12:
                self.box('asphalt_scars',(x,y,.009),(rng.uniform(1,6),rng.uniform(.03,.13),.016),'dark',rot=(0,0,rng.uniform(0,TAU)))
        # Varied stepped shells with exposed slabs and reinforcement.
        for i in range(14):
            side=-1 if i%2 else 1
            x=side*(30+(i%3)*6); y=(i//2-3)*20
            w=10+(i%3)*2; d=12; h=(12+(i*11)%34)*( .60 if late else 1)
            self.box(f'tower_{i}_core',(x,y,h*.5),(w*.48,d,h),'dark',collider=True)
            for j in range(3):
                hj=h*(.52+j*.16)
                self.box(f'tower_{i}_wing_{j}',(x+side*(w*.18+j*1.5),y,hj/2),(2,d,hj),'stone',collider=True)
            for floor in range(1,int(h/3)):
                z=floor*3
                self.box('exposed_floor_plates',(x,y,z),(w+1,d+1,.3),'cut')
                for yy in [-d/2,d/2]:
                    for xx in [-w*.45,0,w*.45]:
                        if rng.random()>.23:
                            self.box('skeletal_columns',(x+xx,y+yy,z-1.4),(.35,.38,2.8),'stone')
                        if rng.random()>.50:
                            self.box('broken_window_panels',(x+xx+1,y+yy-.06,z-1.1),(1.3,.1,1.8),'glass')
                if floor%2==0:
                    self.box('hanging_floor_slabs',(x-side*w*.55,y-d/2-.7,z-.3),(3,2,.25),'stone',rot=(.2,side*.18,.1))
            for j in range(8):
                xx=x+rng.uniform(-w/2,w/2)
                self.tube('exposed_rebar',[(xx,y-6,h*.55),(xx,y-6.5,h*.55+1),(xx+.4,y-6.8,h*.55+1.5)],.035,'rust')
            for j in range(12):
                self.shard('facade_rubble',x+rng.uniform(-9,9),y+rng.uniform(-8,8),0,rng.uniform(.3,1.5),rng.uniform(.2,.8))
        # Distant shattered city encircles the arena rather than ending at the road.
        for i in range(22):
            a=i*TAU/22; r=rng.uniform(83,105); h=rng.uniform(15,52)*( .7 if late else 1)
            x,y=math.cos(a)*r,math.sin(a)*r
            self.box('outer_ruin_silhouettes',(x,y,h/2),(rng.uniform(8,14),12,h),'dark')
            for z in range(4,int(h),4): self.box('outer_ruin_ribs',(x,y-6.05,z),(9,.12,.25),'stone')
        for i in range(24):
            a=i*TAU/24; r=rng.uniform(20,28)
            x,y=math.cos(a)*r,math.sin(a)*r
            if abs(x)<7: continue
            self.shard(f'breakable_slab_{i}',x,y,.03,1.3,.6)
        for side in [-1,1]:
            for y in [-28,25]:
                x=side*17
                self.tube('bent_streetlights',[(x,y,0),(x,y,3.5),(x+side*.6,y,5.1),(x+side*2,y,5.3)],.09,'steel')
                self.box('dead_lamp_heads',(x+side*2,y,5.3),(1,.45,.15),'dark')
                self.box('broken_barriers',(side*18,y-6,.8),(.13,5,.15),'steel',rot=(.15,0,0))
        if late:
            # Fuga aftermath: shallow scorched basin, elevated broken rim outside the fighting floor.
            for ring in range(3):
                for i in range(42):
                    a=i*TAU/42+rng.uniform(-.04,.04); r=26+ring*6+rng.uniform(-1,1)
                    self.shard('crater_rim',math.cos(a)*r,math.sin(a)*r,0,2+ring*.35,.5+ring*.45,'dark' if ring==0 else 'stone')
            for i in range(36):
                a=i*TAU/36; r=rng.uniform(5,22)
                self.box('radial_scorch_seams',(math.cos(a)*r,math.sin(a)*r,.01),(rng.uniform(4,9),.13,.02),'dark',rot=(0,0,a))
            for x,y in [(-19,13),(22,-12),(-25,-20)]:
                self.box('collapsed_girders',(x,y,1.1),(9,.5,.6),'steel',rot=(0,.12,.7))
        else:
            for x,y in [(-19,-15),(21,19)]:
                self.box('abandoned_shop_fascia',(x,y,1.1),(6,.3,1.2),'rust',rot=(0,.17,.1))

    def domain(self):
        layer='authenticLove'; rng=self.rng
        self.box('domain_ground',(0,0,-.23),(260,260,.46),'sand',layer)
        # Large crosses frame the fighting floor and continue into the horizon.
        for i in range(46):
            a=i*2.399963; r=53+(i%4)*17+rng.uniform(-3,3)
            x,y=math.cos(a)*r,math.sin(a)*r; h=rng.uniform(7,24); w=rng.uniform(1.6,3.5)
            near=max(abs(x),abs(y))<55
            self.box(f'domain_cross_{i}_stem' if near else 'domain_cross_stems',(x,y,h/2),(w,w*.85,h),'stone',layer,collider=near)
            self.box(f'domain_cross_{i}_arm' if near else 'domain_cross_arms',(x,y,h*.72),(w*4.4,w*.9,w*.95),'cut',layer,rot=(0,.04*(i%3-1),a*.15),collider=near)
            self.shard('domain_cross_broken_tops',x,y,h,w*.7,.7,'cut',layer)
            for j in range(2): self.shard('domain_cross_debris',x+rng.uniform(-5,5),y+rng.uniform(-4,4),0,rng.uniform(.6,2.4),rng.uniform(.4,1.3),'stone',layer)
        # Embedded katana have points down, guards above the blades, wrapped grips.
        for i in range(230):
            a=rng.uniform(0,TAU); r=rng.uniform(8,92)
            x,y=math.cos(a)*r,math.sin(a)*r
            if abs(x)<3.5 and abs(y)<24: continue
            tilt=Euler((rng.uniform(-.22,.22),rng.uniform(-.24,.24),a)).to_matrix()
            base=Vector((x,y,0)); scale=rng.uniform(.9,1.35)
            def sword_box(name,at,size,mat):
                verts=[tuple(base+tilt @ Vector(((at[0]+xx*size[0]/2)*scale,(at[1]+yy*size[1]/2)*scale,(at[2]+zz*size[2]/2)*scale)))
                    for xx,yy,zz in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
                self.mesh(name,verts,[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)],mat,layer)
            sword_box('domain_sword_blades',(0,0,.59),(.085,.028,1.16),'blade')
            sword_box('domain_sword_edges',(.037,0,.59),(.018,.03,1.16),'edge')
            sword_box('domain_sword_guards',(0,0,1.20),(.27,.13,.055),'binding')
            sword_box('domain_sword_grips',(0,0,1.42),(.075,.065,.38),'grip')
            for j in range(5): sword_box('domain_sword_wraps',(0,0,1.26+j*.069),(.085,.07,.023),'binding')
        # Braided loop knots: the reference motif, rendered as original 3D cord paths.
        for k,(cx,cy,cz,yaw,scale) in enumerate([(0,55,29,0,1),(-61,5,24,math.pi/2,.85),(60,-16,30,-math.pi/2,1.1),(4,-76,31,math.pi,.8)]):
            orient=Euler((0,0,yaw)).to_matrix()
            for strand in range(3):
                points=[]
                for j in range(241):
                    t=j*TAU/240
                    local=Vector((12*math.sin(t),1.1*math.cos(3*t),7*math.sin(2*t)))
                    local+=Vector((.12*math.cos(t*34+strand*TAU/3),.12*math.sin(t*34+strand*TAU/3),0))
                    points.append(tuple(Vector((cx,cy,cz))+orient @ (local*scale)))
                self.tube('domain_braided_knots',points,.12*scale,'cord_light' if strand==0 else 'cord',layer,sides=5)
            for sign in [-1,1]:
                points=[tuple(Vector((cx,cy,cz))+orient @ Vector((sign*(j*.95),.5*math.sin(j*.14),-3-2*math.sin(j*.065)))) for j in range(66)]
                self.tube('domain_suspended_cords',points,.20,'cord',layer,sides=6)
        for i in range(180):
            a=rng.uniform(0,TAU); r=rng.uniform(4,105)
            self.shard('domain_small_stones',math.cos(a)*r,math.sin(a)*r,-.025,rng.uniform(.12,.65),rng.uniform(.08,.27),'cut',layer)
        for i in range(80):
            x,y=rng.uniform(-75,75),rng.uniform(-75,75)
            self.box('domain_ground_fissures',(x,y,.006),(rng.uniform(.7,4),.026,.009),'stone',layer,rot=(0,0,rng.uniform(0,TAU)))

    def finish(self, filename=None):
        layers={}
        for layer in ['exterior','authenticLove']:
            collection=bpy.data.collections.new(self.stage+' / '+layer)
            self.scene.collection.children.link(collection); layers[layer]=collection
        for (name,mat,layer,collider),(verts,faces) in self.batches.items():
            # Real object origins allow existing impact effects to locate breakable props.
            center=sum((Vector(v) for v in verts),Vector())/len(verts)
            mesh=bpy.data.meshes.new(name)
            mesh.from_pydata([Vector(v)-center for v in verts],[],faces); mesh.update()
            obj=bpy.data.objects.new(name,mesh); layers[layer].objects.link(obj)
            obj.location=center; mesh.materials.append(self.materials[mat])
            obj['arenaLayer']=layer
            if collider: obj['arenaCollider']=True
        self.scene['reference']='JJK 249-251 and 261-263; original reconstruction for gameplay, not exact panel geometry.'
        self.scene['arenaVersion']=2
        bpy.ops.export_scene.gltf(filepath=str(OUT/(filename or f'story_{self.stage}.glb')),use_active_scene=True,
            export_cameras=False,export_lights=False,export_extras=True)
        print('ARENA',self.stage,'meshes',len(self.scene.objects),'faces',sum(len(o.data.polygons) for o in self.scene.objects))

    def preview(self, love=False):
        scene=self.scene; bpy.context.window.scene=scene
        for obj in scene.objects:
            obj.hide_render=(obj.get('arenaLayer')=='authenticLove') != love
        world=bpy.data.worlds.new('Story daylight'); world.use_nodes=True
        bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND')
        bg.inputs[0].default_value=(.51,.53,.53,1) if love else (.36,.43,.49,1)
        bg.inputs[1].default_value=.6; scene.world=world
        data=bpy.data.lights.new('Story sun','SUN'); data.energy=2.2; data.angle=.18
        obj=bpy.data.objects.new('Story sun',data); scene.collection.objects.link(obj)
        obj.rotation_euler=(.45,-.55,-.4)
        data=bpy.data.cameras.new('Arena review'); cam=bpy.data.objects.new('Arena review',data)
        scene.collection.objects.link(cam); cam.location=(12,-40,10) if love else (14,-47,19)
        target=Vector((0,30,12) if love else (0,9,4))
        cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
        data.lens=26; scene.camera=cam
        try: scene.render.engine='CYCLES'
        except TypeError: pass
        scene.cycles.samples=24; scene.cycles.use_denoising=True
        scene.render.resolution_x=1440; scene.render.resolution_y=900; scene.render.resolution_percentage=100
        scene.render.filepath=str(ART/f'{self.stage}-{"domain" if love else "ruins"}-preview.png')
        bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(cam,do_unlink=True); bpy.data.objects.remove(obj,do_unlink=True)


arenas=[]
for stage in ['yuta','borrowed']:
    arena=Arena(stage); arena.ruins()
    if stage=='yuta': arena.domain()
    arena.finish(); arenas.append(arena)
if '--render' in sys.argv:
    arenas[0].preview(False); arenas[0].preview(True); arenas[1].preview(False)
for arena in arenas:
    bpy.context.window.scene=arena.scene
    for obj in arena.scene.objects:
        obj.hide_render=obj.get('arenaLayer')=='authenticLove'
        obj.hide_set(obj.hide_render)
bpy.context.window.scene=arenas[0].scene
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'yuta-expanded-arenas.blend'))
