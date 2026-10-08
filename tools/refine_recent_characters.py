"""Reference-driven correction of the editable recent cast, using live Blender MCP.

Run after build_recent_characters. Keeps the rejected .blend on disk; export PBR
albedo for the game's cel shader, then save a separate toon-preview source file.
"""
import bpy, math, re, os
import recent
c = recent.c
def base(o): return re.sub(r'\.\d+$', '', o.name)
def remove(parent, prefixes):
    for o in list(parent.children):
        if o.type == 'MESH' and base(o).startswith(tuple(prefixes)):
            bpy.data.objects.remove(o, do_unlink=True)
def joint(root, name):
    return next(o for o in root.children_recursive if base(o)==name and o.type=='EMPTY')
def surface(name, sections, mat, parent, pleat=0):
    o=c.loft(name, sections, mat, parent, n=40, pleat=pleat)
    # Subdivision at a capped joint pulled the old trousers into separate beads.
    o.modifiers.clear()
    return o
def lock(head, name, p0, p1, p2, width, mat):
    # Broad tapered ribbon with convex cross section, rather than radial tubes.
    from mathutils import Vector
    verts=[]; faces=[]; steps=12; sides=8
    p0,p1,p2=map(Vector,(p0,p1,p2))
    for i in range(steps+1):
        t=i/steps
        p=(1-t)**2*p0+2*(1-t)*t*p1+t*t*p2
        w=width*(.58+.65*math.sin(math.pi*t))*(1-t)**.62+.0005
        for j in range(sides):
            a=math.tau*j/sides
            verts.append(tuple(p+Vector((math.cos(a)*w,math.sin(a)*w*.26,0))))
    for i in range(steps):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(reversed(range(sides))),tuple(range(steps*sides,(steps+1)*sides))])
    return c.mesh(name,verts,faces,mat,head)
def dark_cap(head):
    remove(head,['scalp with exposed front hairline','continuous dark hair foundation'])
    verts=[];faces=[];n=48
    rings=[(.127,.112,.012,0),(.128,.114,.013,.11),(.10,.091,.02,.17),(.045,.043,.02,.19),(.001,.001,.02,.193)]
    for k,(w,d,cy,z) in enumerate(rings):
        for i in range(n):
            a=math.tau*i/n
            rim=(-.035-.045*max(0,math.sin(a))+.14*max(0,-math.sin(a))**2) if k==0 else z
            verts.append((w*math.cos(a),cy+d*math.sin(a),rim))
    for k in range(len(rings)-1):
        for i in range(n):
            a=k*n+i;b=k*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    c.mesh('continuous dark hair foundation',verts,faces,'hair',head)
def refine(cid):
    root=c.roots[cid]
    if root.get('toon_refined'): return
    c.col=root.users_collection[0]
    head=joint(root,'head');hips=joint(root,'hips');torso=joint(root,'torso')
    kind='gojo' if cid.startswith('gojo') else 'toji' if cid.startswith('toji') else 'other'
    # Preserve scars, extra eyes and supernatural shells, but restore adult head/body ratio.
    head.scale *= .80 if cid!='mahitoFinal' else .90
    head.location.z -= .025
    if cid!='mahitoFinal' and cid!='sukunaRaid':
        face=next(o for o in head.children if base(o).startswith('face /'))
        face.modifiers.clear()
        # Sharper jaw/cheek transition. Avoid the featureless spherical doll contour.
        for v in face.data.vertices:
            if v.co.z<-.055: v.co.x*=.92
        smooth=face.modifiers.new('Smooth cheek and jaw surface','SUBSURF');smooth.levels=1
        nose=next(o for o in head.children if base(o)=='nose bridge')
        for v in nose.data.vertices:
            if v.co.y<-.115: v.co.y=-.119
        for o in head.children:
            if base(o).startswith(('sclera','iris','pupil','eye glint','upper eyelid','lower eyelid')):
                for v in o.data.vertices: v.co.z=.018+(v.co.z-.018)*.82
    if kind=='gojo':
        remove(head,['tapered gojo hair clump','uneven white fringe'])
        # Uneven upward sweep with a clear directional silhouette and dangling fringe.
        for i in range(11):
            x=(i-5)*.027
            lock(head,'sculpted white crown', (x,.012,.125),
                 (x*1.27-.02,.026,.225+(.018 if i%3==0 else 0)),
                 (x*1.38-.027,.02,.24+.020*math.sin(i*1.8)),.031,'silver')
        for i in range(7):
            x=(i-3)*.034
            lock(head,'layered white forehead lock',(x,.012,.158),
                 (x-.016,-.125,.134),(x-.027,-.121,.051+(.030 if i%2 else 0)),.029,'silver')
        for s in [-1,1]:
            for j in range(4):
                lock(head,'white side sweep',(s*.067,.025+j*.025,.14),
                     (s*.146,.037+j*.023,.13),(s*.149,.042+j*.023,.048+j*.014),.029,'silver')
        remove(torso,['uniform brass button','offset uniform placket'])
        c.ell('single upper left uniform button',(.096,-.111,.425),(.009,.004,.009),'gold',torso,n=12,rings=8)
        c.line('slanted high collar closure',[(.05,-.067,.537),(.075,-.098,.472),(.106,-.121,.378),(.106,-.12,.04)],.0017,'black',torso)
    if kind=='toji':
        dark_cap(head)
        remove(head,['side parted fringe','short nape locks'])
        for s in [-1,1]:
            for i in range(4):
                x=s*(.018+i*.027)
                lock(head,'loose parted black fringe',(s*.008,.003,.18),
                     (x*.85,-.125,.126),(x,-.108,.043-i*.009),.031,'hair')
            for i in range(5):
                lock(head,'dark side and nape layer',(s*.065,.025+i*.019,.13),
                     (s*.138,.042+i*.020,.055),(s*.122,.065+i*.018,-.075+i*.008),.029,'hair')
        for label in ['L','R']:
            arm=joint(root,'arm'+label)
            remove(arm,['fitted short sleeve'])
            for o in arm.children:
                if o.type=='MESH' and o.data.materials[0]==c.M['skin']:
                    for v in o.data.vertices:
                        if v.co.z>-.16:
                            v.co.x*=.70;v.co.y*=.70
                            v.co.z=min(v.co.z,.008)
            surface('fitted tee short sleeve',[(-.145,.087,.078,0),(-.12,.093,.083,0),(-.03,.107,.09,0),(.018,.096,.084,0)],'shirtBlack',arm)
        surface('tied navy waistband',[(-.14,.208,.12,0),(-.088,.208,.121,0),(-.068,.19,.115,0)],'navy',hips,.014)
        for s in [-1,1]:
            c.tube('hanging fabric sash end',[(s*.026,-.132,-.095),(s*.039,-.139,-.18),(s*.073,-.123,-.29)], [.032,.030,.020],'navy',hips,n=12,flatten=.18)
    if cid!='mahitoFinal':
        trouser='white' if cid.startswith(('toji','kashimo','sukuna')) else 'navy'
        wide=cid.startswith(('toji','todo','sukuna'))
        remove(hips,['continuous trouser pelvis','continuous trouser waistband'])
        w=.196 if wide else .160
        surface('fitted trouser seat',[(-.20,w*.76,.103,0),(-.14,w,.11,0),(-.025,w,.108,0),(.025,w*.93,.107,0)],trouser,hips)
        for label in ['L','R']:
            leg=joint(root,'leg'+label);shin=joint(root,'shin'+label)
            remove(leg,['trouser thigh']);remove(shin,['trouser calf','covered knee','fold at knee','shoe cuff'])
            w=.121 if wide else .087
            surface('draped trouser upper leg',[(-.414,w*.81,.080,0),(-.36,w*.93,.087,0),(-.27,w,.095,0),(-.13,w*1.06,.102,0),(-.045,w,.094,0),(.016,w*.9,.083,0)],trouser,leg,.025)
            surface('draped trouser lower leg',[(-.345,w*.54,.053,0),(-.31,w*.61,.061,0),(-.25,w*.80,.074,0),(-.14,w*.90,.086,0),(-.035,w*.84,.083,0),(.027,w*.81,.080,0)],trouser,shin,.035)
            for s in [-1,1]:
                c.line('ankle gathered cloth crease',[(s*w*.32,-.063,-.315),(s*w*.54,-.078,-.24),(s*w*.45,-.081,-.19)],.0013,'fold' if trouser=='white' else 'black',shin)
            if kind=='toji':
                surface('exposed ankle',[(-.40,.045,.047,0),(-.329,.049,.048,0)],'skin',shin)
                foot=next(o for o in shin.children if base(o)=='foot')
                for v in foot.data.vertices: v.co.z=-.417+(v.co.z+.417)*.60
    # Unify the elbow sleeve radius with the upper-arm endpoint, removing ball joints.
    for o in root.children_recursive:
        if o.type=='MESH' and base(o)=='overlapping elbow' and o.data.materials[0]==c.M['navy']:
            for v in o.data.vertices: v.co.z*=.55
    root['toon_refined']=True
    root['model_revision']='canon-cel-reference-2026-10-08'
    print('Refined',cid)

def source_toon():
    """EEVEE preview only. Game exports must happen before this shader swap."""
    originals={}
    for root in c.roots.values():
        for o in root.children_recursive:
            if o.type!='MESH':continue
            for idx,mat in enumerate(o.data.materials):
                if mat not in originals:
                    toon=mat.copy();toon.name=mat.name+' / cel preview'
                    ns=toon.node_tree.nodes;links=toon.node_tree.links
                    bs=next(n for n in ns if n.type=='BSDF_PRINCIPLED')
                    color=tuple(bs.inputs['Base Color'].default_value)
                    out=next(n for n in ns if n.type=='OUTPUT_MATERIAL')
                    diffuse=ns.new('ShaderNodeBsdfDiffuse');diffuse.inputs['Color'].default_value=(1,1,1,1)
                    rgb=ns.new('ShaderNodeShaderToRGB');ramp=ns.new('ShaderNodeValToRGB')
                    ramp.color_ramp.interpolation='CONSTANT'
                    els=ramp.color_ramp.elements;els[0].position=.18;els[0].color=(*[v*.44 for v in color[:3]],1)
                    els[1].position=.62;els[1].color=color
                    mid=els.new(.40);mid.color=(*[v*.73 for v in color[:3]],1)
                    emission=ns.new('ShaderNodeEmission')
                    links.new(diffuse.outputs[0],rgb.inputs[0]);links.new(rgb.outputs[0],ramp.inputs[0])
                    links.new(ramp.outputs[0],emission.inputs['Color']);links.new(emission.outputs[0],out.inputs['Surface'])
                    originals[mat]=toon
                o.data.materials[idx]=originals[mat]
    c.scene.view_settings.view_transform='Standard'
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(recent.ART,'canon-recent-cast-cel.blend'))
