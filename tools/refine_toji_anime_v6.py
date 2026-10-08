"""Secondary form and clothing pass over the preserved v5 export source."""
import bpy, math, importlib.util
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'art/toji-anime-v6';OUT.mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes['Toji / continuous high-model workshop'];bpy.context.window.scene=scene
root=bpy.data.objects['toji_hero'];rig=next(o for o in scene.objects if o.type=='ARMATURE')
body=next(o for o in scene.objects if o.get('topology_role')=='continuous-body');col=body.users_collection[0]
shirt=next(o for o in col.objects if o.get('topology_role')=='continuous-shirt')
pants=next(o for o in col.objects if o.get('topology_role')=='continuous-pants')
spec=importlib.util.spec_from_file_location('anime6_helpers',ROOT/'tools/build_story_characters.py')
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c);c.col=col
c.M['clothInk']=c.material('Toji / cloth ink',(.012,.014,.018),1)
c.M['pantsInk']=c.material('Toji / pants fold ink',(.09,.10,.125),1)
c.M['ear']=c.material('Toji / ear skin',(.86,.66,.49),1)
c.M['earInk']=c.material('Toji / ear concha ink',(.18,.10,.075),1)
def bind(o,bone='head'):
    vg=o.vertex_groups.new(name=bone);vg.add(list(range(len(o.data.vertices))),1,'REPLACE')
    world=o.matrix_world.copy();o.parent=rig;o.matrix_world=world
    mod=o.modifiers.new('Anatomical skin','ARMATURE');mod.object=rig
    return o
for o in list(col.objects):
    if o.name.startswith('Toji shaped ear'):bpy.data.objects.remove(o,do_unlink=True)
for side in (-1,1):
    verts=[];faces=[];N=40
    # Concha, antihelix and helix are one continuous ear surface.
    for radius,depth in [(0,.003),(.30,.002),(.53,.007),(.72,.005),(.88,.012),(1,.004)]:
        for i in range(N):
            a=math.tau*i/N;z=1.750+radius*.025*math.cos(a)
            y=-.032+radius*.013*math.sin(a)+.004*math.cos(a)
            verts.append((side*(.095+depth),y,z))
    for j in range(5):
        for i in range(N):k=j*N+i;l=j*N+(i+1)%N;faces.append((k,l,l+N,k+N) if side>0 else (k+N,l+N,l,k))
    ear=bind(c.mesh('Toji sculpted ear '+str(side),verts,faces,'ear',root))
    sub=ear.modifiers.new('Ear surface smoothing','SUBSURF');sub.levels=1;sub.render_levels=1
    points=[]
    for i in range(18):
        a=-.7+i/17*3.8;points.append((side*.104,-.032+.007*math.sin(a),1.750+.014*math.cos(a)))
    bind(c.line('Toji ear concha ink',points,.00065,'earInk',root))
for v in body.data.vertices:
    p=v.co
    if 1.672<p.z<1.745:
        p.x*=1-.065*math.sin(math.pi*(p.z-1.672)/.073)
        if p.y>0:p.y*=1-.58*math.exp(-((p.z-1.695)/.035)**2)
    if p.y<-.1 and 1.74<p.z<1.81:
        p.y-=.016*math.exp(-(p.x/.018)**2-((p.z-1.758)/.014)**2)
body.data.update()
# Tuck the irregular cut hem into the waistband; preserve existing garment weights.
for v in shirt.data.vertices:
    if v.co.z<1.095:v.co.z=1.064+(v.co.z-1.055)*.22
shirt.data.update()
# Give trousers diagonal tension folds and an ankle gathering, not a straight tube.
for v in pants.data.vertices:
    p=v.co;z=p.z
    if not .18<z<.92:continue
    side=1 if p.x>=0 else -1;center=side*(.12+(.90-z)/.82*.086)
    dx=p.x-center;dy=p.y+.015;a=math.atan2(dy,dx)
    front=max(0,-math.sin(a))**3
    diagonal=.009*math.sin((z+.20*dx*side)*36)*math.exp(-((z-.58)/.28)**4)*front
    gather=.006*math.sin(a*7+z*38)*math.exp(-((z-.235)/.06)**2)
    p.x+=math.cos(a)*(diagonal+gather);p.y+=math.sin(a)*(diagonal+gather)
pants.data.update();bpy.context.view_layer.update()
def garment_line(name,points,target,mat,width=.0008):
    evaluated=target.evaluated_get(bpy.context.evaluated_depsgraph_get())
    projected=[]
    for a,b in zip(points,points[1:]):
        for j in range(10):
            t=j/10;x=a[0]*(1-t)+b[0]*t;z=a[1]*(1-t)+b[1]*t
            hit,p,normal,_=evaluated.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
            if hit:projected.append((x,p.y-.001,z))
    if len(projected)<3:return
    o=c.line(name,projected,width,mat,root)
    kd=KDTree(len(target.data.vertices))
    for v in target.data.vertices:kd.insert(v.co,v.index)
    kd.balance()
    groups={g.index:o.vertex_groups.new(name=g.name) for g in target.vertex_groups}
    for v in o.data.vertices:
        nearby=kd.find_n(v.co,4);weighted={};total=sum(1/max(d,.0001) for _,_,d in nearby)
        for _,idx,d in nearby:
            blend=1/max(d,.0001)/total
            for g in target.data.vertices[idx].groups:weighted[g.group]=weighted.get(g.group,0)+g.weight*blend
        for group,weight in weighted.items():groups[group].add([v.index],weight,'REPLACE')
    world=o.matrix_world.copy();o.parent=rig;o.matrix_world=world
    modifier=o.modifiers.new('Follow garment bones','ARMATURE');modifier.object=rig
    o['garment_detail']=True
for side in (-1,1):
    def pts(values):return [(x*side,z) for x,z in values]
    for path in [[(.028,1.55),(.09,1.57),(.16,1.565)],[(.026,1.54),(.083,1.545)],
                 [(.014,1.50),(.007,1.47),(.009,1.425)],[(.023,1.383),(.10,1.389),(.186,1.410)],
                 [(.16,1.344),(.15,1.30),(.158,1.27)],[(.11,1.255),(.125,1.22),(.15,1.205)],
                 [(.045,1.12),(.082,1.13),(.105,1.16)]]:
        garment_line('Toji shirt tension ink',pts(path),shirt,'clothInk')
    for path in [[(.025,1.00),(.09,.96),(.18,.94)],[(.08,.91),(.18,.83),(.23,.81)],
                 [(.09,.67),(.16,.65),(.25,.655)],[(.12,.39),(.22,.35),(.28,.37)],
                 [(.15,.25),(.20,.22),(.26,.24)]]:
        garment_line('Toji trousers fold ink',pts(path),pants,'pantsInk',.0008)
root['model_revision']='toji-anime-v6'
for p in rig.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0)
bpy.context.view_layer.update();bpy.ops.object.select_all(action='DESELECT')
for o in {root,rig,*root.children_recursive}:
    if o.name in scene.objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
chain=next(o for o in root.children_recursive if o.name.startswith('thousand_mile_chain'))
for cid in ('toji','tojiRematch'):
    root['character_id']=cid;chain['runtime_hidden']=cid!='tojiRematch'
    bpy.ops.export_scene.gltf(filepath=str(OUT/(cid+'.glb')),export_format='GLB',use_selection=True,
        export_apply=True,export_extras=True,export_animations=False,export_yup=True,use_active_scene=True)
root['character_id']='toji';chain['runtime_hidden']=True
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'toji-anime-v6.blend'))
# The same cel workshop conversion is reused, with a separate output directory.
preview=(ROOT/'tools/preview_toji_rebuild.py').read_text(encoding='utf-8')
preview=preview.replace("OUT=ROOT/'art/toji-anime-rebuild'","OUT=ROOT/'art/toji-anime-v6'")
exec(compile(preview,str(ROOT/'tools/preview_toji_rebuild.py'),'exec'))
