"""Editable manga-informed Shinjuku cast. Run in Blender, without clearing other scenes.

Live workflow: setup(); build_yuta(); build_sukuna(); build_borrowed(); build_rika();
finish_studio(); export_all(). Source faces, garments, markings and hair remain editable.
"""
import bpy
import math
import os
import json
import random
from mathutils import Vector, Quaternion
from mathutils.geometry import tessellate_polygon

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'models')
ART = os.path.join(ROOT, 'art', 'story-characters')
scene = None
roots = {}
M = {}
col = None

def material(name, color, rough=.65, metal=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    return m

def setup():
    global scene, M
    os.makedirs(ART, exist_ok=True)
    scene = bpy.data.scenes.new('Shinjuku Story Character Atelier')
    bpy.context.window.scene = scene
    random.seed(249)
    for key, color, rough, metal in [
        ('skin',(.46,.255,.18),.7,0), ('pale',(.64,.43,.32),.65,0),
        ('skinShade',(.24,.12,.105),.8,0), ('scar',(.27,.08,.085),.8,0),
        ('white',(.76,.75,.68),.8,0), ('fold',(.38,.40,.43),.85,0),
        ('navy',(.025,.032,.045),.83,0), ('black',(.009,.012,.018),.62,0),
        ('hair',(.013,.019,.024),.52,0), ('hairEdge',(.038,.047,.057),.56,0),
        ('silver',(.83,.86,.89),.55,0), ('silverShade',(.39,.45,.51),.7,0),
        ('pink',(.42,.21,.22),.72,0), ('pinkEdge',(.57,.33,.30),.7,0),
        ('ink',(.008,.004,.009),.85,0), ('eyeWhite',(.86,.87,.80),.38,0),
        ('iris',(.11,.16,.22),.38,0), ('blue',(.04,.52,.80),.28,.1),
        ('redEye',(.45,.025,.035),.35,0), ('tooth',(.72,.69,.54),.6,0),
        ('bone',(.57,.58,.51),.78,0), ('boneShade',(.28,.31,.29),.85,0),
        ('mouth',(.022,.007,.020),.8,0), ('steel',(.52,.62,.68),.23,.8),
        ('gold',(.49,.31,.10),.34,.65), ('wrap',(.16,.10,.065),.84,0),
    ]:
        M[key] = material('Story / '+key, color, rough, metal)
    scene.world = bpy.data.worlds.new('Character studio world')
    scene.world.use_nodes = True
    bg = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs[0].default_value = (.055,.065,.09,1)
    bg.inputs[1].default_value = .5
    print('Atelier ready; existing scenes preserved')

def begin(ident):
    global col
    col = bpy.data.collections.new(ident+' / editable surfaces')
    scene.collection.children.link(col)
    root = node(ident)
    root['character_id'] = ident
    root['source_design'] = 'Jujutsu Kaisen Shinjuku showdown; stylized game reconstruction'
    roots[ident] = root
    return root

def node(name, parent=None, pos=(0,0,0)):
    o = bpy.data.objects.new(name, None)
    col.objects.link(o)
    o.parent = parent
    o.location = pos
    return o

def mesh(name, verts, faces, mat, parent=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    o = bpy.data.objects.new(name, data)
    col.objects.link(o)
    o.parent = parent
    data.materials.append(M[mat] if isinstance(mat,str) else mat)
    for p in data.polygons: p.use_smooth = True
    return o

def ell(name, p, s, mat, parent, n=24, rings=16):
    v=[]; f=[]
    for j in range(rings+1):
        a=math.pi*j/rings
        for i in range(n):
            b=math.tau*i/n
            v.append((p[0]+s[0]*math.sin(a)*math.cos(b),p[1]+s[1]*math.sin(a)*math.sin(b),p[2]+s[2]*math.cos(a)))
    for j in range(rings):
        for i in range(n):
            a=j*n+i; b=j*n+(i+1)%n
            f.append((a,a+n,b+n,b))
    return mesh(name,v,f,mat,parent)

def loft(name, sections, mat, parent, n=32, pleat=0):
    # z, half width, half depth, center y. Tailored volume, not stacked primitives.
    v=[];f=[]
    for j,(z,w,d,cy) in enumerate(sections):
        for i in range(n):
            a=math.tau*i/n
            r=1+pleat*math.cos(8*a+.25*j)
            v.append((w*math.cos(a)*r,cy+d*math.sin(a)*r,z))
    for j in range(len(sections)-1):
        for i in range(n):
            a=j*n+i; b=j*n+(i+1)%n
            f.append((a,b,b+n,a+n))
    f.extend([tuple(reversed(range(n))),tuple((len(sections)-1)*n+i for i in range(n))])
    o=mesh(name,v,f,mat,parent)
    if name in {'short white uniform jacket','loose white upper sleeve','white cuff sleeve','trouser thigh','trouser calf','face / jaw cheekbones and forehead','muscular upper arm','muscular forearm','fitted black short sleeve shirt','short shirt sleeve','exposed upper arm','bare forearm','elongated cranial shield'}:
        modifier=o.modifiers.new('smooth tailored surface','SUBSURF')
        modifier.levels=1;modifier.render_levels=1
    return o

def fuse_skin(parent, names, result_name, voxel=.012):
    items=[o for o in parent.children if o.type=='MESH' and any(o.name.startswith(n) for n in names)]
    bpy.ops.object.select_all(action='DESELECT')
    for o in items:o.select_set(True)
    o=items[0];bpy.context.view_layer.objects.active=o
    bpy.ops.object.join();o.name=result_name
    modifier=o.modifiers.new('continuous sculpt volume','REMESH');modifier.mode='VOXEL';modifier.voxel_size=voxel
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    modifier=o.modifiers.new('relax sculpted anatomy','SMOOTH');modifier.factor=.8;modifier.iterations=4
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    modifier=o.modifiers.new('game mesh density','DECIMATE');modifier.ratio=.5
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    for p in o.data.polygons:p.use_smooth=True
    return o

def tube(name, points, radii, mat, parent, n=10, flatten=1):
    v=[];f=[]
    for j,point in enumerate(points):
        p=Vector(point)
        tangent=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(j-1,0)])
        tangent.normalize()
        ref=Vector((0,1,0)) if abs(tangent.y)<.9 else Vector((1,0,0))
        u=tangent.cross(ref).normalized(); w=tangent.cross(u).normalized()
        r=radii[j] if isinstance(radii,(list,tuple)) else radii
        for i in range(n):
            a=math.tau*i/n
            v.append(p+u*(math.cos(a)*r)+w*(math.sin(a)*r*flatten))
    for j in range(len(points)-1):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;f.append((a,b,b+n,a+n))
    f.extend([tuple(reversed(range(n))),tuple((len(points)-1)*n+i for i in range(n))])
    return mesh(name,v,f,mat,parent)

def strand(name,a,b,c,width,mat,parent):
    points=[];radii=[]
    for j in range(11):
        t=j/10
        points.append((1-t)**2*Vector(a)+2*t*(1-t)*Vector(b)+t*t*Vector(c))
        radii.append(max(.0003,width*(.6+.65*math.sin(math.pi*t))*(1-t)))
    return tube(name,points,radii,mat,parent,n=8,flatten=.35)

def line(name,points,r,mat,parent):
    return tube(name,points,r,mat,parent,n=6)

def patch(name,points,mat,parent,surface=None):
    if surface is not None:
        # Project dense graphic triangles onto the sculpt instead of burying ink
        # inside its pectoral relief or leaving it floating above the skin.
        verts=[];faces=[]
        def project(p):
            hit,loc,normal,index=surface.ray_cast(Vector((p.x,-2,p.z)),Vector((0,1,0)))
            return (p.x,loc.y-.002 if hit else p.y,p.z)
        polygon=[Vector(p) for p in points]
        for triangle in tessellate_polygon([polygon]):
            a,b,c=[polygon[i] if isinstance(i,int) else i for i in triangle]
            def split(a,b,c,depth):
                if depth:
                    ab=(a+b)/2;bc=(b+c)/2;ca=(c+a)/2
                    for tri in [(a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca)]:split(*tri,depth-1)
                else:
                    start=len(verts);verts.extend([project(a),project(b),project(c)])
                    face=(start,start+1,start+2)
                    if (Vector(verts[-2])-Vector(verts[-3])).cross(Vector(verts[-1])-Vector(verts[-3])).y>0:face=tuple(reversed(face))
                    faces.append(face)
            split(a,b,c,2)
        return mesh(name,verts,faces,mat,parent)
    return mesh(name,points,[tuple(range(len(points)))],mat,parent)

def head_form(parent, skin='pale', wide=1):
    head=node('head',parent,(0,0,.64))
    o=loft('face / jaw cheekbones and forehead',[
        (-.155,.039,.048,-.025),(-.135,.065,.068,-.023),(-.098,.093,.080,-.014),
        (-.054,.110,.088,-.004),(-.016,.118,.096,.004),(.026,.120,.103,.008),
        (.064,.121,.108,.010),(.105,.110,.104,.014),(.143,.078,.078,.018),(.160,.024,.035,.02)
    ],skin,head,40)
    o.scale.x=wide
    # angular nose and lips sit flush against the face.
    mesh('nose bridge',[(0,-.095,.048),(-.014,-.101,-.034),(0,-.129,-.050),(.014,-.101,-.034),(0,-.108,-.071)],[(0,1,2),(0,2,3),(1,4,2),(2,4,3)],skin,head)
    line('mouth line',[(-.031,-.091,-.096),(0,-.103,-.100),(.031,-.091,-.096)],.0022,'skinShade',head)
    for s in [-1,1]:
        ell('ear',(s*.120,0,-.015),(.023,.023,.043),skin,head,n=16,rings=12)
        line('ear inner fold',[(s*.127,-.017,.01),(s*.132,-.020,-.016),(s*.126,-.018,-.04)],.003,'skinShade',head)
    return head

def eyes(head, iris='iris', tired=False, mat='hair', x=.053, z=.018):
    for s in [-1,1]:
        outline=[(s*.022,-.100,z),(s*.037,-.104,z+.009),(s*.060,-.101,z+.011),(s*.085,-.084,z+.005),(s*.067,-.097,z-.008),(s*.042,-.105,z-.009)]
        vertices=[(s*x,-.108,z)]+outline
        faces=[(0,i+1,(i+1)%6+1) for i in range(6)]
        if s<0:faces=[tuple(reversed(f)) for f in faces]
        mesh('sclera',vertices,faces,'eyeWhite',head)
        ell('iris',(s*x,-.109,z),(.009,.0015,.010),iris,head,n=20,rings=12)
        ell('pupil',(s*x,-.111,z),(.0035,.001,.0075),'ink',head,n=12,rings=8)
        ell('eye glint',(s*x-.003,-.112,z+.003),(.0018,.0006,.0018),'eyeWhite',head,n=8,rings=6)
        line('upper eyelid',outline[:4],.0025,'ink',head)
        line('lower eyelid',[outline[3],outline[4],outline[5],outline[0]],.0013,'skinShade',head)
        line('brow',[(s*.025,-.103,z+.026),(s*.053,-.101,z+.035),(s*.086,-.081,z+.029)],.0035,mat,head)
        if tired:
            line('eye bag hatch',[(s*.032,-.101,z-.019),(s*.051,-.103,z-.023),(s*.077,-.088,z-.016)],.0018,'skinShade',head)

def hair_cap(head,mat):
    v=[];f=[];n=40
    for j,(z,w,d,cy) in enumerate([(.07,.124,.110,.014),(.143,.112,.097,.015),(.176,.065,.060,.018),(.185,.002,.003,.02)]):
        for i in range(n):
            a=math.tau*i/n
            rim=(.060*max(0,-math.sin(a))-.015*max(0,math.sin(a))) if j==0 else 0
            v.append((w*math.cos(a),cy+d*math.sin(a),z+rim))
    for j in range(3):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;f.append((a,b,b+n,a+n))
    mesh('scalp with exposed front hairline',v,f,mat,head)

def yuta_hair(head):
    hair_cap(head,'hair')
    # Low, side-parted sweep, long uneven fringe; no JJK0 upright spikes.
    for i in range(6):
        x=-.108+i*.027
        strand('side parted bang',(.055-i*.006,-.025,.18),(x+.005,-.133,.146),(x-.008,-.105,.043+abs(x)*.28),.028,'hair',head)
    for i in range(3):
        strand('right part sweep',(.065,-.02,.17),(.119,-.067,.15),(.117-i*.008,-.081,.069+i*.017),.023,'hair',head)
    for s in [-1,1]:
        for j in range(8):
            a=j*math.pi/8
            strand('side and nape hair',(s*.02,.025,.18),(s*(.12+.008*math.sin(a)),.01+math.sin(a)*.07,.11),(s*.126,.035+math.sin(a)*.07,-.041+j*.006),.025,'hair',head)
        strand('temple lock',(s*.105,-.026,.105),(s*.136,-.042,.04),(s*.122,-.029,-.048),.016,'hair',head)
    for i in range(3):
        x=-.080+i*.035
        strand('subtle black hair ridge',(.053,-.043,.172),(x+.01,-.129,.141),(x-.005,-.111,.087),.002,'hairEdge',head)

def swept_hair(head, mat, highlight, spiky=False):
    hair_cap(head,mat)
    for j in range(3):
        for i in range(13):
            a=math.tau*i/13+.13*j
            x=math.cos(a);y=math.sin(a);r=.108-j*.025
            strand('layered swept lock',(x*r,y*r*.8,.09+j*.026),(x*(r+.055),y*(r+.055)+.026,.15+j*.028),(x*(r+.075),y*(r+.06)+.05,.14+j*.025),.027,mat,head)
    if not spiky:
        for i in range(6):
            x=(i-2.5)*.028
            strand('white fringe',(x+.02,-.06,.175),(x+.015,-.128,.132),(x-.014,-.114,.083+abs(x)*.14),.024,mat,head)
    for i in range(5):
        x=(i-2)*.04
        strand('crown accent',(x,.005,.188),(x+.02,.04,.211),(x+.04,.075,.197),.005,highlight,head)

def hand(parent,skin='pale',s=1,claw=False):
    ell('palm',(0,-.006,-.285),(.046,.03,.06),skin,parent)
    for i in range(4):
        x=(i-1.5)*.020
        end=-.375+abs(i-1.4)*.009
        tube('finger',[(x,-.011,-.315),(x,-.017,-.346),(x,-.029,end)],[.010,.010,.006],skin,parent,n=8)
        ell('fingernail',(x,-.034,end+.013),(.007,.003,.011),'ink' if claw else 'white',parent,n=8,rings=6)
    tube('thumb',[(s*.034,-.008,-.27),(s*.06,-.02,-.302),(s*.061,-.035,-.323)],[.017,.013,.009],skin,parent,n=8)

def legs(hips,trousers='navy',wide=False,bare=False):
    ell('continuous trouser pelvis',(0,0,-.14),(.185 if wide else .156,.105,.12),trousers,hips)
    for s,label in [(-1,'L'),(1,'R')]:
        leg=node('leg'+label,hips,(s*(.119 if wide else .095),0,-.065))
        w=.12 if wide else .078
        loft('trouser thigh',[(-.39,w*.66,.068,0),(-.33,w*.85,.079,-.01),(-.19,w,.097,0),(-.04,w,.093,0),(.025,w*.8,.073,0)],trousers,leg,32,.025)
        shin=node('shin'+label,leg,(0,0,-.39))
        ell('covered knee',(0,0,0),(w*.66,.065,.065),trousers,shin)
        loft('trouser calf',[(-.345,w*.55,.050,0),(-.29,w*.63,.06,0),(-.15,w*.78,.072,0),(0,w*.67,.066,0)],trousers,shin,32,.05)
        for k in [-1,1]:
            line('fold at knee',[(k*w*.55,-.060,-.04),(0,-.074,-.075),(-k*w*.35,-.059,-.13)],.0025,'fold' if wide else 'black',shin)
        ell('foot',(0,-.057,-.397),(.064,.13,.051),'skin' if bare else 'black',shin)
        if not bare:
            loft('shoe cuff',[(-.35,.051,.056,0),(-.265,.055,.055,0)],'black',shin)
            line('sole edge',[(-.054,-.16,-.42),(.054,-.16,-.42),(.060,.03,-.42)],.006,'hairEdge',shin)
        else:
            for j in range(5):ell('toe',((j-2)*.022,-.158,-.405),(.014,.031,.023),'skin',shin,n=10,rings=8)

def katana(fore):
    sword=node('katana',fore,(.015,-.040,-.32))
    sword.rotation_euler.x=.10
    sword.rotation_euler.y=1.05
    loft('wrapped katana hilt',[(-.16,.017,.022,0),(.035,.017,.022,0)],'black',sword,n=12)
    for j in range(8):
        z=-.145+j*.022
        line('hilt binding',[(-.015,-.020,z),(.015,-.020,z+.018)],.004,'white',sword)
    loft('oval guard',[(.032,.06,.043,0),(.042,.06,.043,0)],'gold',sword,n=24)
    loft('blade collar',[(.043,.021,.009,0),(.075,.021,.009,0)],'gold',sword,n=4)
    loft('curved katana steel',[(.074,.019,.005,0),(.35,.019,.005,.007),(.69,.017,.004,.025),(.84,.013,.003,.044),(.90,.0004,.001,.057)],'steel',sword,n=4)
    line('bright cutting edge',[(.019,0,.08),(.019,.007,.35),(.017,.025,.69),(.0004,.057,.90)],.0016,'eyeWhite',sword)

def build_yuta():
    root=begin('yuta')
    hips=node('hips',root,(0,0,.94)); torso=node('torso',hips,(0,0,.12))
    loft('short white uniform jacket',[(-.16,.17,.107,0),(-.10,.172,.112,0),(.02,.151,.105,0),(.18,.184,.119,0),(.35,.216,.117,0),(.43,.205,.101,.007),(.48,.099,.073,0)],'white',torso,40,.014)
    ell('neck',(0,0,.49),(.066,.067,.08),'pale',torso)
    loft('raised asymmetrical collar',[(.423,.105,.08,0),(.52,.098,.078,0)],'white',torso)
    line('collar edge',[(-.07,-.063,.52),(0,-.079,.514),(.087,-.042,.52)],.003,'fold',torso)
    line('diagonal uniform closure',[(.084,-.047,.511),(.092,-.087,.435),(.055,-.116,.32),(.047,-.119,.15),(.038,-.111,-.145)],.0028,'fold',torso)
    for z in [.42,.24,.065]:ell('brass uniform button',(.064,-.12 if z<.4 else -.099,z),(.010,.005,.010),'gold',torso,n=12,rings=8)
    for s in [-1,1]:
        for j in range(3):
            z=-.09+j*.13
            line('jacket tension fold',[(s*.145,-.06,z),(s*.10,-.099,z+.025),(s*.051,-.109,z+.011)],.0022,'fold',torso)
    head=head_form(torso);eyes(head,tired=True);yuta_hair(head)
    for s,label in [(-1,'L'),(1,'R')]:
        arm=node('arm'+label,torso,(s*.213,0,.397));arm.rotation_euler.y=-s*.13
        ell('rounded uniform shoulder',(0,0,-.012),(.077,.071,.073),'white',arm)
        loft('loose white upper sleeve',[(-.25,.058,.061,0),(-.19,.074,.070,0),(-.04,.078,.071,0),(.035,.061,.06,0)],'white',arm,32,.025)
        fore=node('fore'+label,arm,(0,0,-.25))
        ell('sleeve elbow overlap',(0,0,0),(.056,.057,.055),'white',fore)
        loft('white cuff sleeve',[(-.238,.043,.042,0),(-.21,.054,.052,0),(-.075,.066,.06,0),(0,.058,.060,0)],'white',fore,32,.022)
        for z in [-.20,-.18]:line('cuff crease',[(-.03,-.035,z),(0,-.050,z-.007),(.034,-.033,z)],.0022,'fold',fore)
        hand(fore,s=s)
        if label=='R':katana(fore)
        else:
            # The ring is visible on the left ring finger.
            pts=[(-.01+math.cos(a)*.012,-.017+math.sin(a)*.012,-.334) for a in [i*math.tau/16 for i in range(17)]]
            line('promise ring',pts,.0028,'steel',fore)
    legs(hips)
    # Sheath is an independent accessory, attached at the belt on the back.
    tube('katana sheath',[(-.14,.11,.85),(-.17,.12,.40),(-.20,.10,.16)],[.024,.024,.018],'black',root,n=12)
    root['identity_features']='side parted black hair; tired eyes; short white high collar uniform; katana; ring'
    root.location.x=-3.4
    return root

def muscle_torso(torso):
    loft('continuous four arm torso',[(-.20,.205,.12,0),(-.11,.20,.14,0),(.07,.22,.17,0),(.20,.26,.18,0),(.37,.31,.175,0),(.51,.325,.147,.012),(.59,.20,.118,.015),(.65,.105,.091,0)],'skin',torso,48)
    for s in [-1,1]:
        ell('pectoralis',(s*.143,-.124,.445),(.17,.082,.116),'skin',torso)
        ell('trapezius',(s*.105,.015,.57),(.133,.11,.088),'skin',torso)
        for j in range(2):ell('upper abdominals',(s*.067,-.151,.28-j*.095),(.071,.035,.043),'skin',torso,n=20,rings=12)
    body=fuse_skin(torso,['continuous four arm torso','pectoralis','trapezius','upper abdominals'],'sculpted continuous Sukuna torso')
    for s in [-1,1]:
        # Flat graphic curse markings follow the chest instead of raised tubes.
        patch('shoulder curse emblem',[(s*.18,-.144,.585),(s*.265,-.148,.539),(s*.25,-.188,.426),(s*.196,-.199,.401),(s*.210,-.201,.491),(s*.143,-.164,.541)],'ink',torso,body)
        patch('pectoral curse chevron',[(s*.12,-.197,.477),(s*.082,-.206,.432),(s*.103,-.200,.400),(s*.17,-.195,.412),(s*.14,-.206,.437)],'ink',torso,body)
        patch('side rib curse',[(s*.23,-.13,.34),(s*.20,-.16,.29),(s*.15,-.16,.285),(s*.185,-.15,.25),(s*.218,-.14,.26)],'ink',torso,body)
        line('clavicle accent',[(s*.04,-.100,.56),(s*.14,-.119,.56),(s*.24,-.092,.53)],.005,'skinShade',torso)
    ell('abdomen mouth cavity',(0,-.167,-.040),(.176,.021,.093),'mouth',torso)
    for s in [-1,1]:
        line('abdomen lip',[(s*.171,-.171,-.03),(s*.12,-.191,.03),(0,-.198,.048)],.011,'skinShade',torso)
        line('abdomen lower lip',[(s*.166,-.171,-.053),(s*.10,-.186,-.103),(0,-.182,-.11)],.012,'skinShade',torso)
    for j in range(10):
        x=(j-4.5)*.029
        for row in [-1,1]:
            z=.025 if row==1 else -.087
            loft('abdominal tooth',[(z,.012,.008,0),(z-row*.023,.01,.007,0)],'tooth',torso,n=8).location=(x,-.197,0)

def curse_arm(torso,s,label,lower=False):
    arm=node(('armLower' if lower else 'arm')+label,torso,(s*(.267 if lower else .337),.043 if lower else 0,.23 if lower else .51))
    arm.rotation_euler.y=-s*(.52 if lower else .27)
    arm.rotation_euler.x=.10 if lower else -.03
    loft('muscular upper arm',[(-.30,.065,.067,0),(-.24,.09,.09,0),(-.12,.112,.099,0),(-.02,.105,.099,0),(.045,.067,.065,0)],'skin',arm,32)
    ell('deltoid cap',(0,0,-.025),(.112,.103,.111),'skin',arm)
    fore=node(('foreLower' if lower else 'fore')+label,arm,(0,0,-.30))
    ell('elbow joint',(0,0,0),(.065,.063,.065),'skin',fore)
    loft('muscular forearm',[(-.25,.045,.043,0),(-.19,.064,.058,0),(-.08,.085,.08,0),(0,.066,.068,0)],'skin',fore,32)
    hand(fore,'skin',s,True)
    for z in [-.13,-.17]:
        # Complete wraparound black bands are separate conformal surfaces.
        loft('curse arm band',[(z,.109 if z==-.13 else .10,.101 if z==-.13 else .097,0),(z+.022,.11 if z==-.13 else .103,.102 if z==-.13 else .099,0)],'ink',arm,32)
    for z in [-.19,-.22]:loft('curse wrist band',[(z,.064 if z==-.19 else .054,.059 if z==-.19 else .051,0),(z+.012,.067 if z==-.19 else .058,.062 if z==-.19 else .055,0)],'ink',fore,32)
    line('hand curse', [(-.03,-.031,-.28),(0,-.038,-.29),(.03,-.031,-.28)],.006,'ink',fore)

def build_sukuna():
    root=begin('sukuna_shinjuku')
    hips=node('hips',root,(0,0,1.05)); torso=node('torso',hips,(0,0,.15))
    muscle_torso(torso)
    loft('dark tied waist sash',[(-.12,.217,.145,0),(-.025,.214,.153,0)],'navy',hips,40,.025)
    head=head_form(torso,'skin',1.10)
    head.location.z=.81
    eyes(head,'redEye',False,'pink',x=.053,z=.01)
    swept_hair(head,'pink','pinkEdge',True)
    # Asymmetric right facial plate with a vertically paired additional eye.
    ell('right facial plate',(-.086,-.076,.035),(.074,.043,.133),'skinShade',head)
    for z in [.079,-.019]:
        ell('extra eye white',(-.102,-.120,z),(.032,.008,.020),'tooth',head)
        ell('extra crimson iris',(-.102,-.129,z),(.011,.004,.014),'redEye',head,n=16,rings=10)
        ell('extra eye pupil',(-.102,-.134,z),(.004,.001,.009),'ink',head,n=10,rings=8)
    ell('lower left eye slit',(.072,-.09,-.045),(.023,.006,.009),'eyeWhite',head,n=16,rings=10)
    ell('lower left eye iris',(.072,-.096,-.045),(.006,.002,.007),'redEye',head,n=12,rings=8)
    for x in [-.14,-.11,-.08]:line('facial plate rib',[(x,-.10,.125),(x-.005,-.128,.048),(x+.002,-.111,-.064)],.004,'pink',head)
    for s in [-1,1]:
        line('cheek curse slash',[(s*.030,-.104,-.045),(s*.072,-.089,-.055),(s*.107,-.061,-.035)],.0065,'ink',head)
        line('jaw curse',[(s*.106,-.056,-.055),(s*.088,-.067,-.093),(s*.063,-.068,-.126)],.006,'ink',head)
        line('chin curse',[(s*.012,-.093,-.114),(s*.012,-.073,-.139)],.0045,'ink',head)
    patch('forehead curse',[(.007,-.103,.11),(.02,-.11,.083),(.014,-.113,.057),(.03,-.106,.08)],'ink',head)
    for s,label in [(-1,'L'),(1,'R')]:
        curse_arm(torso,s,label)
        curse_arm(torso,s,label,True)
    legs(hips,'white',True,True)
    root['identity_features']='four arms; abdominal mouth; four eyes; asymmetric facial plate; black body markings; pale trousers'
    root.location.x=1.15
    return root

def build_borrowed():
    root=begin('yuta_gojo')
    hips=node('hips',root,(0,0,1.01));torso=node('torso',hips,(0,0,.14))
    loft('fitted black short sleeve shirt',[(-.17,.17,.105,0),(-.02,.154,.108,0),(.18,.197,.130,0),(.33,.24,.134,0),(.46,.238,.114,0),(.51,.106,.079,0)],'black',torso,40)
    ell('neck',(0,0,.54),(.072,.071,.085),'pale',torso)
    loft('black shirt neck',[(.467,.105,.079,0),(.535,.097,.079,0)],'black',torso)
    for s in [-1,1]:
        line('shirt chest fold',[(s*.04,-.132,.30),(s*.14,-.126,.32),(s*.21,-.073,.28)],.003,'hairEdge',torso)
    head=head_form(torso);head.location.z=.68
    eyes(head,'blue',False,'silverShade');swept_hair(head,'silver','silverShade')
    line('transplant forehead seam',[(-.111,-.052,.087),(-.080,-.089,.080),(-.035,-.108,.077),(.018,-.110,.079),(.064,-.096,.085),(.112,-.052,.094)],.0025,'scar',head)
    for i in range(8):
        x=-.094+i*.026
        y=-.112+abs(x)**2*4.8
        z=.079+abs(x)*.08
        line('forehead stitch',[(x-.002,y,z-.014),(x+.002,y-.002,z+.013)],.0018,'ink',head)
    for s,label in [(-1,'L'),(1,'R')]:
        arm=node('arm'+label,torso,(s*.25,0,.435));arm.rotation_euler.y=-s*.16
        ell('rounded short sleeve shoulder',(0,0,0),(.078,.075,.071),'black',arm)
        loft('short shirt sleeve',[(-.14,.077,.076,0),(-.06,.089,.082,0),(.03,.070,.066,0)],'black',arm,32)
        loft('exposed upper arm',[(-.27,.051,.05,0),(-.19,.067,.060,0),(-.12,.073,.070,0)],'pale',arm,32)
        fore=node('fore'+label,arm,(0,0,-.27))
        ell('elbow',(0,0,0),(.05,.05,.05),'pale',fore)
        loft('bare forearm',[(-.24,.035,.035,0),(-.14,.046,.047,0),(-.04,.061,.059,0),(0,.049,.052,0)],'pale',fore,32)
        hand(fore,'pale',s)
    loft('black waist wrap',[(-.10,.175,.117,0),(.012,.17,.117,0)],'black',hips,32)
    legs(hips,'white',True)
    root['identity_features']='Gojo body; white hair; blue eyes; stitched forehead; black fitted shirt; white wide trousers'
    root.location.x=3.05
    return root

def build_rika():
    root=begin('rika')
    hips=node('hips',root,(0,0,.82));torso=node('torso',hips,(0,0,.10))
    loft('tapered cursed trunk',[(-.65,.016,.028,.13),(-.45,.16,.11,.1),(-.20,.21,.145,.04),(.08,.24,.18,.02),(.37,.37,.19,0),(.64,.44,.22,.02),(.80,.34,.18,.04),(.89,.15,.13,.02)],'bone',torso,40)
    for s in [-1,1]:
        ell('heavy shoulder',(s*.34,.02,.68),(.235,.24,.21),'bone',torso)
    fuse_skin(torso,['tapered cursed trunk','heavy shoulder'],'organic Rika torso and shoulders',.015)
    for s in [-1,1]:
        for j in range(4):
            z=.17+j*.12
            line('rib carapace',[(s*.05,-.17,z),(s*.20,-.193,z+.02),(s*.32,-.12,z+.06)],[.025,.038,.014][0],'bone',torso)
    head=node('head',torso,(0,-.055,1.01))
    # Flared, one-eyed cranial shield, tapered into a muzzle and a long jaw.
    loft('elongated cranial shield',[(-.18,.15,.125,-.09),(-.06,.24,.19,-.03),(.09,.34,.245,.03),(.29,.38,.225,.055),(.46,.29,.195,.09),(.56,.16,.13,.12),(.61,.045,.045,.13)],'bone',head,48)
    ell('single recessed eye socket',(0,-.204,.29),(.129,.025,.094),'boneShade',head)
    ell('single eye',(0,-.227,.29),(.084,.010,.058),'tooth',head)
    ell('vertical pupil',(0,-.238,.29),(.025,.006,.052),'ink',head)
    line('central skull ridge',[(0,-.06,.56),(0,-.19,.43),(0,-.221,.39)],.014,'boneShade',head)
    for s in [-1,1]:
        line('sweeping face ridge',[(s*.12,-.10,.50),(s*.22,-.155,.37),(s*.15,-.207,.11),(s*.095,-.209,-.095)],.009,'boneShade',head)
        tube('rear head tendril',[(s*.24,.10,.43),(s*.43,.16,.50),(s*.58,.29,.40),(s*.57,.35,.23)],[.11,.076,.039,.002],'bone',head,n=16)
        tube('side crest',[(s*.28,.025,.20),(s*.48,.06,.30),(s*.58,.17,.24)],[.075,.04,.002],'bone',head,n=14)
    ell('deep open maw',(0,-.158,-.232),(.223,.104,.143),'mouth',head)
    for s in [-1,1]:
        tube('long jaw hinge',[(s*.23,-.10,-.075),(s*.23,-.15,-.25),(s*.12,-.17,-.39),(0,-.18,-.42)],[.067,.059,.051,.04],'bone',head,n=16)
    for j in range(9):
        x=(j-4)*.043
        for row in [-1,1]:
            a=(x,-.236+.20*x*x,-.125 if row==1 else -.354)
            b=(x,-.251,-.223 if row==1 else -.268)
            tube('interlocking fang',[a,b],[.025,.012],'tooth',head,n=10)
    for s,label in [(-1,'L'),(1,'R')]:
        arm=node('arm'+label,torso,(s*.47,0,.70));arm.rotation_euler.y=-s*.24
        tube('long upper arm',[(0,0,.02),(s*.05,.008,-.25),(s*.10,-.02,-.50)],[.15,.118,.081],'bone',arm,n=24)
        fore=node('fore'+label,arm,(s*.10,-.02,-.50))
        ell('Rika elbow',(0,0,0),(.082,.08,.08),'bone',fore)
        tube('elongated forearm',[(0,0,0),(s*.03,-.026,-.20),(s*.05,-.08,-.53)],[.086,.12,.06],'bone',fore,n=24)
        line('forearm tendon',[(0,-.08,-.03),(s*.015,-.125,-.23),(s*.04,-.13,-.49)],.014,'boneShade',fore)
        ell('clawed palm',(s*.05,-.08,-.59),(.12,.077,.13),'bone',fore)
        for j in range(4):
            x=s*.05+(j-1.5)*.061
            tube('long clawed finger',[(x,-.09,-.64),(x*1.1,-.13,-.80),(x*1.13,-.23,-.94),(x*1.05,-.28,-.96)],[.033,.026,.018,.001],'bone',fore,n=12)
            tube('dark claw tip',[(x*1.13,-.23,-.92),(x*1.05,-.28,-.975)],[.019,.001],'ink',fore,n=10)
        tube('opposing thumb',[(s*.14,-.08,-.55),(s*.22,-.12,-.65),(s*.19,-.22,-.75)],[.039,.028,.003],'bone',fore,n=12)
    for i in range(5):
        a=i*math.tau/5
        tube('lower smoke tendril',[(math.cos(a)*.17,math.sin(a)*.13,-.20),(math.cos(a)*.32,.13+math.sin(a)*.16,-.45),(math.cos(a)*.27,.2+math.sin(a)*.2,-.69)],[.08,.045,.001],'boneShade',torso,n=14)
    root['identity_features']='single eye cranial shield; wide toothy jaw; long arms and fingers; ribbed trunk; tapering lower body'
    root.location.x=-1.20
    return root

def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()

def finish_studio():
    global col
    col=bpy.data.collections.new('Studio lighting and cameras');scene.collection.children.link(col)
    for name,p,power,size in [('key',(-3,-5,6),600,5),('fill',(4,-3,3.5),320,4),('rim',(0,3,5),800,3)]:
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.size=size
        o=bpy.data.objects.new(name,data);col.objects.link(o);o.location=p;aim(o,(0,0,1.2))
    camera=bpy.data.cameras.new('Character lineup camera')
    o=bpy.data.objects.new('Character lineup camera',camera);col.objects.link(o)
    o.location=(4,-16,5);aim(o,(0,0,1.2));camera.type='ORTHO';camera.ortho_scale=8.7;scene.camera=o
    scene.render.resolution_x=1800;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.filepath=os.path.join(ART,'lineup.png')
    # Save model silhouettes without a floor intersecting Rika's floating tail.
    for area in bpy.context.screen.areas:
        if area.type=='VIEW_3D':
            view=area.spaces.active.region_3d
            view.view_perspective='ORTHO'
            view.view_rotation=scene.camera.rotation_euler.to_quaternion()
            view.view_location=(0,0,1.25)
            view.view_distance=7.2
            area.spaces.active.overlay.show_overlays=False
            area.spaces.active.shading.color_type='MATERIAL'
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ART,'shinjuku-story-characters.blend'))
    print('Saved editable atelier')

def export_all():
    report={}
    deps=bpy.context.evaluated_depsgraph_get()
    for ident,root in roots.items():
        # Export copies: merge by articulated parent/material; source stays editable.
        export_col=bpy.data.collections.new('Temporary export '+ident);scene.collection.children.link(export_col)
        mapping={}
        for original in [root]+list(root.children_recursive):
            duplicate=original.copy()
            if original.type=='MESH':
                duplicate.data=bpy.data.meshes.new_from_object(original.evaluated_get(deps))
                duplicate.modifiers.clear()
            export_col.objects.link(duplicate);mapping[original]=duplicate
        for original,duplicate in mapping.items():
            duplicate.parent=mapping.get(original.parent)
            if original==root:duplicate.location=(0,0,0)
        bpy.context.view_layer.update()
        for parent in [o for o in export_col.objects if o.type=='EMPTY']:
            groups={}
            for child in parent.children:
                if child.type=='MESH':groups.setdefault(child.data.materials[0].name,[]).append(child)
            for children in groups.values():
                if len(children)>1:
                    bpy.ops.object.select_all(action='DESELECT')
                    for child in children:child.select_set(True)
                    bpy.context.view_layer.objects.active=children[0];bpy.ops.object.join()
        bpy.ops.object.select_all(action='DESELECT')
        for obj in export_col.objects:obj.select_set(True)
        tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in export_col.objects if o.type=='MESH')
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,ident+'.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_animations=False,export_extras=True)
        report[ident]={'triangles':tris,'meshes':sum(o.type=='MESH' for o in export_col.objects),'bytes':os.path.getsize(os.path.join(OUT,ident+'.glb'))}
        for obj in list(export_col.objects):bpy.data.objects.remove(obj,do_unlink=True)
        bpy.data.collections.remove(export_col)
    with open(os.path.join(ART,'asset-report.json'),'w',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2)
    print(json.dumps(report))

if __name__=='__main__':
    setup()
    build_yuta();build_sukuna();build_borrowed();build_rika()
    finish_studio();export_all()
