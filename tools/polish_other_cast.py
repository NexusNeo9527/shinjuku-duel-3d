"""Character-specific face work and continuous, skinned limbs for the other cast.

Input: preserved canon-recent-cast-cel.blend. Never exports Toji variants.
Outputs remain candidates in art/cast-polish until runtime review.
"""
import bpy, bmesh, math, re, json, shutil, importlib.util
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'art/cast-polish';OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('cast_polish_helpers',ROOT/'tools/build_story_characters.py')
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
scene=next(s for s in bpy.data.scenes if any(o.get('character_id')=='gojoTeen' for o in s.objects));bpy.context.window.scene=scene;c.scene=scene
roots={o['character_id']:o for o in scene.objects if o.get('character_id') and o.type=='EMPTY'}
roots={cid:o for cid,o in roots.items() if not cid.startswith('toji')}
JOINT=re.compile(r'^(hips|torso|head|arm[LR]|fore[LR]|leg[LR]|shin[LR]|armLower[LR]|foreLower[LR])$')
def base(o):return re.sub(r'\.\d+$','',o.name)
def joint(root,name):return next(o for o in root.children_recursive if o.type=='EMPTY' and base(o)==name)
def remove(parent,prefixes):
    for o in list(parent.children):
        if o.type=='MESH' and base(o).startswith(tuple(prefixes)):bpy.data.objects.remove(o,do_unlink=True)
def material(key,color):
    m=c.material('Cast polish / '+key,color,1);c.M[key]=m;return m
material('ink',(.009,.010,.016));material('eye',(.88,.86,.80));material('skin',(.78,.57,.43))
material('shade',(.35,.23,.20));material('blue',(.025,.38,.75));material('brown',(.19,.10,.06))
material('hair',(.014,.018,.022));material('pink',(.49,.24,.24));material('silver',(.83,.88,.92))
material('ash',(.29,.38,.43));material('mint',(.26,.55,.52));material('red',(.45,.018,.025))
# Restore exportable surface outputs while retaining the saved basic color values.
for mat in bpy.data.materials:
    if not mat.use_nodes:continue
    bs=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    out=next((n for n in mat.node_tree.nodes if n.type=='OUTPUT_MATERIAL'),None)
    if bs and out:mat.node_tree.links.new(bs.outputs[0],out.inputs['Surface'])
def strand(parent,name,p0,p1,p2,width,mat):
    verts=[];faces=[];A,B,C=map(Vector,(p0,p1,p2));N=14;K=8
    for j in range(N+1):
        t=j/N;p=A*(1-t)**2+B*2*t*(1-t)+C*t*t
        w=width*(.65+.5*math.sin(math.pi*t))*max(.006,(1-t)**.65)
        for k in range(K):
            a=math.tau*k/K;verts.append(p+Vector((w*math.cos(a),w*.24*math.sin(a),0)))
    for j in range(N):
        for k in range(K):a=j*K+k;b=j*K+(k+1)%K;faces.append((a,b,b+K,a+K))
    return c.mesh(name,verts,faces,mat,parent)
def face(cid,root):
    if cid=='mahitoFinal':return
    head=joint(root,'head');kind='gojo' if cid.startswith('gojo') else 'yuji' if cid.startswith('yuji') else 'todo' if cid.startswith('todo') else 'higuruma' if cid.startswith('higuruma') else cid
    if kind=='sukunaRaid':
        # Preserve all extra eyes and the asymmetric plate; only refine the lower face.
        for o in head.children:
            if o.type=='MESH' and base(o).startswith('face /'):
                for v in o.data.vertices:
                    if v.co.z<-.055:v.co.x*=.93
        return
    oldface=next(o for o in head.children if base(o).startswith('face /'))
    skin=oldface.data.materials[0]
    remove(head,['face /','nose bridge','mouth line','sclera','iris','pupil','eye glint','upper eyelid','lower eyelid','brow','eye bag hatch','nasolabial crease'])
    widths={'gojo':(.96,.94),'yuji':(1.00,1.00),'todo':(1.10,1.10),'higuruma':(.92,.88),'mahito':(.95,.94),'kashimo':(.95,.94)}
    cheek,jaw=widths.get(kind,(1,1));verts=[];faces=[];N=64
    rows=[(-.155,.030*jaw,-.083,.025),(-.135,.060*jaw,-.103,.040),(-.102,.087*jaw,-.109,.065),
          (-.060,.108*cheek,-.110,.084),(-.015,.116*cheek,-.108,.093),(.025,.118*cheek,-.107,.100),
          (.064,.116*cheek,-.103,.106),(.110,.102*cheek,-.096,.100),(.145,.072,-.065,.072),(.165,.016,-.014,.028)]
    for z,w,front,back in rows:
        for i in range(N):
            a=math.tau*i/N;x=w*math.sin(a);ct=math.cos(a)
            y=front+(-front)*abs(math.sin(a))**3.4 if ct>=0 else back*(-ct)
            if ct>0:y-= (.022 if kind=='higuruma' else .016)*math.exp(-(x/.015)**2)*max(0,1-abs(z+.037)/.079)
            verts.append((x,y,z))
    for j in range(len(rows)-1):
        for i in range(N):a=j*N+i;b=j*N+(i+1)%N;faces.append((a,b,b+N,a+N))
    faces.extend([tuple(reversed(range(N))),tuple(range((len(rows)-1)*N,len(rows)*N))])
    faceobj=c.mesh('Polished anime face',verts,faces,skin,head)
    sub=faceobj.modifiers.new('Smooth facial planes','SUBSURF');sub.levels=1;sub.render_levels=1
    bpy.context.view_layer.update();evalface=faceobj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    def surface(x,z,offset=.0013):
        hit,p,_,_=evalface.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
        return Vector((x,p.y-offset if hit else -.112,z))
    def line(name,points,r,mat):return c.line(name,[surface(x,z) for x,z in points],r,mat,head)
    tilt={'gojo':.004,'yuji':.002,'todo':.006,'higuruma':-.003,'mahito':.004,'kashimo':.003}.get(kind,0)
    height=.007 if kind=='higuruma' else .010 if kind=='gojo' else .013 if kind=='yuji' else .009
    for s in (-1,1):
        x=s*.052;z=.016
        outline=[(s*.022,z),(s*.040,z+height),(s*.065,z+height+tilt),(s*.087,z+tilt),
                 (s*.066,z-height*.55),(s*.041,z-height*.65)]
        center=surface(x,z);v=[center]+[surface(a,b) for a,b in outline]
        f=[(0,i+1,(i+1)%6+1) for i in range(6)]
        if s>0:f=[tuple(reversed(p)) for p in f]
        c.mesh('Anime sclera',v,f,'eye',head)
        iris='blue' if kind=='gojo' else 'brown' if kind in ('yuji','higuruma','todo') else 'blue' if kind=='mahito' and s<0 else 'shade'
        p=surface(x,z,.0025);c.ell('Anime iris',p,(.0075,.0008,height*.82),iris,head,n=20,rings=10)
        c.ell('Anime pupil',surface(x,z,.0034),(.003,.0005,height*.7),'ink',head,n=12,rings=8)
        c.ell('Eye highlight',surface(x-.002,z+.003,.004),(.0015,.0004,.0015),'eye',head,n=8,rings=6)
        line('Anime upper eyelid',outline[:4],.0017,'ink');line('Anime lower eyelid',[outline[3],outline[4],outline[5]],.00065,'shade')
        line('Character brow',[(s*.024,.041),(s*.052,.047+tilt),(s*.087,.040+tilt)],.0022,'silver' if kind=='gojo' else 'hair')
        if kind=='higuruma':line('Lawyer tired eye crease',[(s*.032,-.003),(s*.055,-.009),(s*.079,-.005)],.001,'shade')
    smile=.005 if kind in ('gojo','mahito') else 0
    line('Character lip',[(-.030,-.098+smile),(0,-.101),(.030,-.098+smile)],.0012,'shade')
    line('Nose contour',[(.004,.002),(.009,-.034),(.002,-.045)],.00065,'shade')
    # Existing story scars and stitches now conform to the replacement face.
    for o in head.children:
        if o.type=='MESH' and any(word in base(o) for word in ('scar','wound','blood','stitched','stitch','lightning eye')):
            for v in o.data.vertices:
                if v.co.y<-.05:v.co.y=surface(v.co.x,v.co.z,.002).y
    if kind=='higuruma':
        remove(head,['side parted fringe','short nape locks'])
        for i in range(8):
            x=-.10+i*.028
            strand(head,'Lawyer side-parted lock',(.07-i*.006,.015,.164),(x+.028,-.104,.148),(x,-.108,.045+.03*abs(i-2)/6),.024,'hair')
    elif kind=='yuji':
        remove(head,['tapered yuji hair clump'])
        for j in range(3):
            for i in range(10):
                a=math.tau*i/10+j*.19;r=.085-j*.021
                strand(head,'Short directional pink clump',(math.cos(a)*r,math.sin(a)*r*.9,.105+j*.024),
                    (math.cos(a)*(r+.023),math.sin(a)*(r+.018),.157+j*.023),
                    (math.cos(a)*(r+.037),math.sin(a)*(r+.034),.180+j*.023),.026,'pink')
    elif kind=='mahito':
        remove(head,['long layered ash hair','center parted gray bangs'])
        for i in range(15):
            a=math.pi*i/14;x=.12*math.cos(a);y=.018+.105*math.sin(a)
            strand(head,'Layered shoulder-length ash hair',(x*.75,y*.8,.143),(x*1.23,y*1.12,-.11),(x*1.22,y,-.33-.045*math.sin(a)),.026,'ash')
        for i in range(7):
            x=(i-3)*.029;strand(head,'Parted ash fringe',(x*.6,-.015,.164),(x,-.130,.105),(x*1.12,-.108,.025+abs(x)*.25),.021,'ash')
    elif kind=='kashimo':
        remove(head,['kashimo separated fringe'])
        for i in range(6):
            x=(i-2.5)*.032;strand(head,'Uneven mint fringe',(x*.55,.010,.170),(x,-.125,.11),(x,-.108,.026+(.020 if i%2 else 0)),.023,'mint')
    elif kind=='gojo':
        for o in head.children:
            if base(o).startswith('sculpted white crown'):
                for v in o.data.vertices:v.co.z=.14+(v.co.z-.14)*.88;v.co.x*=1.04

def continuous_limb(root,upper,lower,wide=False,arm=True):
    u=joint(root,upper);l=joint(root,lower)
    prefixes=['shaped upper sleeve','tapered forearm sleeve','overlapping elbow','deltoid and upper arm','continuous upper arm anatomy','forearm anatomy','muscular upper arm','muscular forearm','deltoid cap','elbow joint'] if arm else ['draped trouser upper leg','draped trouser lower leg','trouser thigh','trouser calf','covered knee']
    candidates=[o for p in (u,l) for o in p.children if o.type=='MESH' and base(o).startswith(tuple(prefixes))]
    if not candidates:return
    mat=candidates[0].data.materials[0];remove(u,prefixes);remove(l,prefixes)
    pivot=l.location.z
    w=(.086 if wide else .061) if arm else (.118 if wide else .089)
    if arm:
        stations=[(.022,.86),(-.035,1.12),(-.105,1.06),(pivot+.07,.86),(pivot+.025,.76),(pivot,.74),(pivot-.03,.78),(pivot-.09,.93),(pivot-.16,.78),(pivot-.235,.60),(pivot-.25,.60)]
    else:
        stations=[(.025,.64),(-.05,.90),(-.14,1.06),(-.27,.98),(pivot+.04,.85),(pivot,.82),(pivot-.035,.84),(pivot-.13,.86),(pivot-.24,.73),(pivot-.30,.62),(pivot-.345,.56)]
    verts=[];faces=[];N=40
    for j,(z,radius) in enumerate(stations):
        for i in range(N):
            a=math.tau*i/N;fold=(.012 if arm else .025)*math.sin(a*5+j*.8)
            verts.append((w*radius*math.cos(a)*(1+fold),w*radius*.91*math.sin(a)*(1+fold),z))
    for j in range(len(stations)-1):
        for i in range(N):a=j*N+i;b=j*N+(i+1)%N;faces.append((a,b,b+N,a+N))
    faces.extend([tuple(reversed(range(N))),tuple(range((len(stations)-1)*N,len(stations)*N))])
    o=c.mesh('Continuous '+upper+' '+lower,verts,faces,mat,u);o['continuous_limb']=True
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    o['blend_upper']=upper;o['blend_lower']=lower;o['blend_pivot']=pivot
    sub=o.modifiers.new('Continuous limb smoothing','SUBSURF');sub.levels=1;sub.render_levels=1

def skeletonize(cid,root):
    bpy.context.view_layer.update();inv=root.matrix_world.inverted()
    nodes={base(o):o for o in root.children_recursive if o.type=='EMPTY' and JOINT.fullmatch(base(o))}
    matrices={n:inv@o.matrix_world for n,o in nodes.items()}
    originals=list(root.children_recursive)
    data=bpy.data.armatures.new(cid+' anatomical rig');rig=bpy.data.objects.new(cid+' anatomical rig',data);c.col.objects.link(rig);rig.parent=root
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
    for name,o in nodes.items():
        m=matrices[name];b=data.edit_bones.new(name);b.head=m.translation;b.tail=b.head+(m.to_3x3()@Vector((0,.10,0)));b.align_roll(m.to_3x3()@Vector((0,0,1)))
    for name,o in nodes.items():
        if base(o.parent) in nodes:data.edit_bones[name].parent=data.edit_bones[base(o.parent)]
    bpy.ops.object.mode_set(mode='OBJECT')
    for name,o in nodes.items():
        for key in o.keys():data.bones[name][key]=o[key]
    def ancestor(obj):
        p=obj.parent
        while p and p!=root:
            if p in nodes.values():return base(p)
            p=p.parent
        return 'hips'
    accessories=[o for o in originals if o.type=='EMPTY' and o not in nodes.values() and o.parent in nodes.values()]
    accessory_meshes=set(child for a in accessories for child in a.children_recursive)
    deps=bpy.context.evaluated_depsgraph_get();groups={}
    for o in originals:
        if o.type!='MESH' or o in accessory_meshes:continue
        parent_name=ancestor(o);localmatrix=inv@o.matrix_world
        data_mesh=bpy.data.meshes.new_from_object(o.evaluated_get(deps));localcoords=[v.co.copy() for v in data_mesh.vertices]
        data_mesh.transform(localmatrix);o.data=data_mesh;o.modifiers.clear();o.parent=rig;o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_basis=Matrix.Identity(4)
        if o.get('continuous_limb'):
            upper=o['blend_upper'];lower=o['blend_lower'];pivot=o['blend_pivot'];a=o.vertex_groups.new(name=upper);b=o.vertex_groups.new(name=lower)
            for i,p in enumerate(localcoords):
                t=max(0,min(1,(pivot+.075-p.z)/.15));t=t*t*(3-2*t)
                if t<1:a.add([i],1-t,'REPLACE')
                if t>0:b.add([i],t,'REPLACE')
        else:
            g=o.vertex_groups.new(name=parent_name);g.add(list(range(len(data_mesh.vertices))),1,'REPLACE')
        modifier=o.modifiers.new('Anatomical deformation','ARMATURE');modifier.object=rig;modifier.use_deform_preserve_volume=False
        groups.setdefault(o.data.materials[0].name,[]).append(o)
    for a in accessories:
        world=a.matrix_world.copy();name=ancestor(a);a.parent=rig;a.parent_type='BONE';a.parent_bone=name;bpy.context.view_layer.update();a.matrix_world=world
    for o in nodes.values():bpy.data.objects.remove(o,do_unlink=True)
    # Batch by material after weighting; this keeps draw calls bounded.
    for meshes in groups.values():
        if len(meshes)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in meshes:o.select_set(True)
        bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join()
    root['model_revision']='other-cast-polish-v1';root['anatomical_rig']=True
    return rig

REPORT={}
for cid,root in roots.items():
    c.col=root.users_collection[0];before=OUT/'before';before.mkdir(exist_ok=True)
    if not (before/(cid+'.glb')).exists():shutil.copy2(ROOT/'public/models'/(cid+'.glb'),before/(cid+'.glb'))
    face(cid,root)
    torso=joint(root,'torso');torso_surface=next((o for o in torso.children if base(o)=='tailored torso'),None)
    if torso_surface:
        bpy.context.view_layer.update();surface=torso_surface.evaluated_get(bpy.context.evaluated_depsgraph_get())
        panels=['ivory shirt inset','notched suit lapel','white shirt collar','narrow lawyer tie','patchwork garment panel','overlapping sleeveless robe','torn shirt white lining']
        for o in list(torso.children):
            if o.type!='MESH' or base(o) not in panels:continue
            points=[v.co.copy() for v in o.data.vertices];name=base(o);mat=o.data.materials[0]
            new=c.patch(name+' fitted',points,mat,torso,surface=surface)
            offset=.002 if 'lapel' in name else .004 if 'collar' in name or 'tie' in name else 0
            for v in new.data.vertices:v.co.y-=offset
            bpy.data.objects.remove(o,do_unlink=True)
    wide=cid.startswith(('todo','sukuna')) or cid=='mahitoFinal'
    for side in ('L','R'):
        continuous_limb(root,'arm'+side,'fore'+side,wide,True)
        continuous_limb(root,'leg'+side,'shin'+side,wide,False)
        if cid=='sukunaRaid':continuous_limb(root,'armLower'+side,'foreLower'+side,True,True)
    rig=skeletonize(cid,root)
    location=root.location.copy();root.location=(0,0,0);bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    for o in [root,*root.children_recursive]:o.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(OUT/(cid+'.glb')),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_extras=True,export_animations=False)
    REPORT[cid]={'bones':len(rig.data.bones),'bytes':(OUT/(cid+'.glb')).stat().st_size}
    root.location=location
    print('POLISHED',cid,REPORT[cid],flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'other-cast-polished.blend'))
(OUT/'report.json').write_text(json.dumps(REPORT,indent=2),encoding='utf-8')
print('CAST_POLISH_COMPLETE',len(REPORT),flush=True)
