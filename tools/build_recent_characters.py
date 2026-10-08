"""Period-specific editable cast. Execute setup/build_one/export_one in live Blender.

Original-work design anchors and adaptation boundaries: docs/recent-character-models.md.
Preserves the user's existing scenes. Shared surface helpers are authored in this repo.
"""
import bpy
import os
import math
import json
import importlib.util
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('cast', os.path.join(HERE, 'build_story_characters.py'))
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
ART = os.path.join(c.ROOT, 'art', 'recent-characters')
IDS = ['gojoTeen', 'gojoAwakened', 'toji', 'tojiRematch', 'yujiShibuya',
       'mahito', 'mahitoFinal', 'todoShibuya', 'todoInjured',
       'kashimo', 'higuruma', 'yujiRaid', 'sukunaRaid', 'yujiCulling', 'higurumaCulling']
REPORT = {}

def setup():
    c.setup()
    c.scene.name = 'Canon recent cast / editable atelier'
    os.makedirs(ART, exist_ok=True)
    for key, color in [
        ('skin', (.63,.40,.29)), ('pale', (.77,.57,.45)),
        ('skinShade', (.36,.21,.18)), ('pink', (.65,.34,.32)),
        ('silver', (.87,.90,.93)), ('cyanHair', (.30,.56,.56)),
        ('cyanShade', (.13,.30,.32)), ('mahitoHair', (.37,.46,.54)),
        ('mahitoPale', (.70,.65,.57)), ('patch', (.40,.40,.45)),
        ('olive', (.17,.22,.15)), ('hood', (.48,.035,.055)),
        ('armor', (.21,.29,.29)), ('armorEdge', (.37,.44,.40)),
        ('amber', (.23,.77,.82)), ('tie', (.24,.20,.13)),
        ('cursePurple', (.38,.22,.37)),
        ('shirtBlack', (.012,.025,.020))]:
        if key in c.M:
            m = c.M[key]
            m.diffuse_color = (*color,1)
            next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'].default_value = (*color,1)
        else:
            c.M[key] = c.material('Recent / '+key, color)
    print('Ready, existing scenes preserved')

def tube(name, points, radii, mat, parent, n=12):
    return c.tube(name, points, radii, mat, parent, n=n)

def line(name, points, radius, mat, parent):
    return c.line(name, points, radius, mat, parent)

def patch(name, points, mat, parent):
    return c.patch(name, points, mat, parent)

def torus(name, pos, major, minor, mat, parent, rotation=(0,0,0)):
    v=[]; f=[]; n=24; k=8
    for i in range(n):
        a=math.tau*i/n
        for j in range(k):
            b=math.tau*j/k
            v.append(((major+minor*math.cos(b))*math.cos(a), (major+minor*math.cos(b))*math.sin(a), minor*math.sin(b)))
    for i in range(n):
        for j in range(k):
            f.append((i*k+j,((i+1)%n)*k+j,((i+1)%n)*k+(j+1)%k,i*k+(j+1)%k))
    o=c.mesh(name,v,f,mat,parent);o.location=pos;o.rotation_euler=rotation
    return o

def arm(torso,s,label,cloth=None,muscular=False,injured=False):
    w=.087 if muscular else .060
    a=c.node('arm'+label,torso,(s*(.265 if muscular else .205),0,.47))
    a.rotation_euler.y=-s*.18
    upper=cloth or 'skin'
    c.loft('shaped upper sleeve' if cloth else 'deltoid and upper arm',
           [(-.285,w*.70,w*.73,0),(-.23,w*.90,w*.85,0),(-.10,w*1.12,w,0),(.025,w*.88,w*.85,0)],upper,a,n=24)
    if muscular:
        c.ell('deltoid',(0,0,-.028),(w*1.20,w*1.06,.091),'skin',a,n=20,rings=12)
        c.fuse_skin(a,['deltoid and upper arm','deltoid'],'continuous upper arm anatomy',voxel=.009)
        line('bicep contour',[(s*w*.65,-w*.77,-.10),(s*w*.79,-w*.72,-.17),(s*w*.48,-w*.76,-.22)],.0028,'skinShade',a)
    f=c.node('fore'+label,a,(0,0,-.28))
    c.loft('tapered forearm sleeve' if cloth else 'forearm anatomy',
           [(-.25,.042,.040,0),(-.21,w*.74,w*.70,0),(-.09,w*.95,w*.88,0),(.015,w*.74,w*.72,0)],upper,f,n=24)
    c.ell('overlapping elbow',(0,0,0),(w*.77,w*.74,.048),upper,f,n=16,rings=10)
    if cloth:
        c.loft('cuff seam',[(-.245,.043,.041,0),(-.22,.046,.043,0)],'black',f,n=24)
    if injured:
        c.loft('severed left wrist dressing',[(-.258,.044,.043,0),(-.21,.051,.048,0)],'white',f,n=24)
        for z in [-.25,-.235,-.22]:
            torus('bandage winding',(0,0,z),.045,.003,'fold',f)
        f['missing_hand']=True
    else:
        c.hand(f,'skin' if muscular else 'pale',s)
    return a,f

def torso_shape(torso,cloth,width=.19):
    return c.loft('tailored torso',[
        (-.19,width*.83,.109,0),(-.16,width*.84,.110,0),(-.035,width*.86,.110,0),(.14,width,.115,0),
        (.32,width*1.05,.125,0),(.47,width*1.04,.105,0),(.52,width*.59,.083,0)],cloth,torso,n=32)

def tailored_waist(hips,mat,wide=False):
    # A continuous waist hides the rounded pelvis seam, including during locomotion.
    w=.194 if wide else .161
    c.loft('continuous trouser waistband',[(-.20,w*.82,.104,0),(-.13,w,.112,0),
        (-.035,w,.111,0),(.035,w*.88,.105,0)],mat,hips,n=32)

def collar(torso,mat):
    c.loft('standing collar',[(.48,.078,.072,0),(.56,.071,.062,0)],mat,torso,n=28)
    for z in [.16,.31,.45]:c.ell('uniform brass button',(.025,-.124,z),(.009,.004,.009),'gold',torso,n=10,rings=8)
    line('offset uniform placket',[(.025,-.112,-.08),(.025,-.128,.3),(.025,-.109,.48)],.002,'black',torso)

def muscles(torso,width=.25):
    c.loft('athletic torso',[(-.12,.16,.104,0),(0,.18,.115,0),(.18,.19,.126,0),(.32,width,.14,0),(.46,width*1.04,.13,0),(.54,.10,.071,0)],'skin',torso,n=32)
    for s in [-1,1]:
        c.ell('pectoral volume',(s*width*.48,-.092,.36),(width*.55,.061,.102),'skin',torso,n=20,rings=12)
        for j in range(3):
            c.ell('abdominal volume',(s*.060,-.113,.23-j*.075),(.062,.024,.033),'skin',torso,n=16,rings=10)
        line('clavicle',[(s*.035,-.073,.49),(s*.12,-.109,.48),(s*.20,-.079,.46)],.003,'skinShade',torso)
    line('sternum groove',[(0,-.128,.45),(0,-.141,.35),(0,-.129,.26)],.0025,'skinShade',torso)
    c.fuse_skin(torso,['athletic torso','pectoral volume','abdominal volume'],'continuous athletic torso',voxel=.010)

def hair(head,kind):
    mat={'gojo':'silver','yuji':'pink','toji':'hair','todo':'hair','mahito':'mahitoHair','kashimo':'cyanHair','higuruma':'hair'}[kind]
    c.hair_cap(head,mat)
    if kind in ['gojo','yuji']:
        for layer in range(3):
            for i in range(11):
                a=math.tau*i/11+layer*.18
                r=.10-layer*.024
                z=.09+layer*.037
                reach=.045 if kind=='yuji' else .073
                c.strand('tapered '+kind+' hair clump',
                    (math.cos(a)*r,math.sin(a)*r*.8,z),
                    (math.cos(a)*(r+reach),math.sin(a)*(r+reach)*.85,z+.061),
                    (math.cos(a)*(r+reach*1.1),math.sin(a)*(r+reach)*.9,z+.078),.021,mat,head)
        if kind=='yuji':
            for s in [-1,1]:
                c.loft('dark shaved temple',[(-.037,.011,.038,0),(.04,.014,.038,0),(.082,.012,.028,0)],'hair',head,n=16).location=(s*.12,.006,0)
        else:
            for i in range(6):
                x=(i-2.5)*.031
                c.strand('uneven white fringe',(x,.01,.176),(x-.023,-.106,.16),(x-.030,-.117,.07+abs(x)*.3),.021,mat,head)
    elif kind in ['toji','higuruma']:
        for i in range(7):
            x=(i-3)*.028
            c.strand('side parted fringe',(.07-i*.012,.01,.177),(x+.01,-.124,.13),(x-.015,-.109,.017+abs(i-3)*.019),.025,mat,head)
        for s in [-1,1]:
            for j in range(5):
                c.strand('short nape locks',(s*.067,.025,.15),(s*.126,.05+j*.011,.07),(s*.105,.08+j*.011,-.055),.021,mat,head)
    elif kind=='todo':
        c.ell('tied topknot',(0,.06,.206),(.060,.062,.069),'hair',head,n=20,rings=12)
        torus('topknot tie',(0,.065,.158),.032,.005,'navy',head)
        for s in [-1,1]:
            for j in range(5):
                line('slicked back hair ridge',[(s*(.035+j*.018),-.045,.138),(s*(.04+j*.013),.04,.172),(s*.025,.085,.178)],.0025,'hairEdge',head)
    elif kind=='mahito':
        for i in range(13):
            a=math.pi*i/12
            x=.117*math.cos(a);y=.095*math.sin(a)+.012
            c.strand('long layered ash hair',(x,y,.14),(x*1.22,y*1.19,-.05),(x*1.13,y*1.10,-.30-abs(math.sin(a))*.07),.029,mat,head)
        for i in range(6):
            x=(i-2.5)*.033
            c.strand('center parted gray bangs',(x*.45,-.018,.173),(x,-.137,.13),(x*1.12,-.096,.011+abs(x)*.4),.024,mat,head)
    else:
        for s in [-1,1]:
            c.ell('side tied hair bun',(s*.128,.044,.122),(.046,.047,.051),mat,head,n=20,rings=12)
            torus('bun wrap',(s*.125,.041,.124),.039,.003,'cyanShade',head,rotation=(0,math.pi/2,0))
            c.strand('long temple strand',(s*.102,-.011,.123),(s*.147,-.083,.012),(s*.121,-.061,-.157),.016,mat,head)
        for i in range(5):
            x=(i-2)*.031
            c.strand('kashimo separated fringe',(x*.5,.01,.17),(x,-.125,.125),(x,-.104,.054),.024,mat,head)

def scar(head,points,name='facial scar'):
    line(name,points,.0032,'scar',head)

def uniform(torso,kind):
    torso_shape(torso,'navy')
    if kind=='gojo':collar(torso,'navy')
    else:
        # Separate open-center red hood drapes around the neck instead of a red box.
        c.loft('red hood outer rim',[(.43,.097,.084,.025),(.50,.102,.083,.024),(.55,.080,.068,.018)],'hood',torso,n=32)
        c.ell('hood folded behind neck',(0,.08,.45),(.137,.058,.070),'hood',torso,n=24,rings=14)
        for s in [-1,1]:line('hood fold',[(s*.070,-.057,.50),(s*.099,-.055,.465),(s*.11,.02,.436)],.0035,'scar',torso)
        c.ell('uniform side button',(.116,-.098,.43),(.009,.004,.009),'gold',torso,n=10,rings=8)

def toji_equipment(torso,fore,rematch):
    # Continuous coiled storage curse, with raised rings and its own face.
    points=[]
    for i in range(33):
        a=-.7+i/32*math.tau*.92
        points.append((.244*math.cos(a),.095+.08*math.sin(a),.285+.204*math.sin(a)))
    tube('continuous inventory curse',points,.041,'cursePurple',torso,n=16)
    for i in range(2,31,2):
        p=points[i];o=torus('storage curse body ridge',p,.042,.003,'patch',torso)
        o.rotation_euler=(Vector(points[i+1])-Vector(points[i-1])).to_track_quat('Z','Y').to_euler()
    curse=c.node('inventory_curse_head',torso,(-.223,-.013,.48))
    c.ell('storage curse face',(0,0,0),(.062,.052,.077),'cursePurple',curse)
    for x in [-.025,.025]:c.ell('curse tiny eye',(x,-.049,.014),(.006,.004,.006),'ink',curse,n=10,rings=8)
    c.ell('curse pout',(0,-.050,-.027),(.027,.009,.012),'mouth',curse,n=16,rings=10)
    spear=c.node('inverted_spear_of_heaven',fore,(.012,-.031,-.30));spear.rotation_euler.y=.55
    tube('wrapped spear grip',[(0,0,-.125),(0,0,.01)],.014,'wrap',spear)
    for z in [-.10,-.08,-.06,-.04,-.02]:torus('grip winding',(0,0,z),.014,.003,'black',spear)
    patch('inverted spear tapered blade',[(-.018,-.007,.012),(-.017,-.007,.19),(0,-.007,.25),(.017,-.007,.18),(.017,-.007,.012)],'steel',spear)
    tube('blade spine',[(0,0,.01),(0,0,.19),(0,0,.245)],[.012,.009,.001],'steel',spear,n=4)
    for s in [-1,1]:
        tube('unequal hooked spear prong',[(s*.009,0,.025),(s*.052,0,.027),(s*.050,0,.11),(s*.035,0,.14 if s==1 else .10)],[.010,.009,.007,.001],'steel',spear,n=4)
    chain=c.node('thousand_mile_chain',spear)
    for i in range(22):
        torus('alternating chain link',(math.sin(i*.24)*.027,.016,-.13-i*.018),.011,.0027,'steel',chain,rotation=(math.pi/2 if i%2 else 0,0,0))
    chain['rematch_only']=True
    knife=c.node('toji_knife',fore,(.012,-.031,-.30));knife.rotation_euler.y=.55
    tube('knife grip',[(0,0,-.10),(0,0,0)],.013,'black',knife)
    tube('knife blade',[(0,0,.01),(0,0,.19),(0,0,.23)],[.019,.013,.0005],'steel',knife,n=4)
    knife['runtime_hidden']=True
    chain['runtime_hidden']=not rematch

def stitched(head):
    for points in [[(-.108,-.060,.087),(-.062,-.099,.058),(.014,-.114,.051),(.097,-.071,.023)],
                   [(-.080,-.078,-.060),(-.039,-.107,-.070),(.020,-.106,-.079),(.094,-.065,-.081)]]:
        line('face stitched seam',points,.0025,'ink',head)
        for i in range(len(points)-1):
            a=Vector(points[i]);b=Vector(points[i+1])
            for t in [.20,.50,.80]:
                p=a.lerp(b,t)
                line('individual stitch',[(p.x-.002,p.y-.002,p.z-.009),(p.x+.002,p.y-.002,p.z+.009)],.0018,'ink',head)

def higuruma(torso,head,fore):
    torso_shape(torso,'navy',.19)
    patch('ivory shirt inset',[(-.083,-.106,.50),(0,-.130,.22),(.083,-.106,.50)],'white',torso)
    for s in [-1,1]:
        patch('notched suit lapel',[(s*.074,-.11,.51),(s*.143,-.119,.43),(s*.113,-.132,.34),(s*.067,-.127,.25),(s*.018,-.139,.23)],'black',torso)
        patch('white shirt collar',[(s*.004,-.120,.51),(s*.071,-.109,.51),(s*.039,-.132,.434)],'white',torso)
    patch('narrow lawyer tie',[(-.013,-.138,.473),(.013,-.138,.473),(.020,-.145,.25),(0,-.145,.221),(-.020,-.145,.25)],'tie',torso)
    for z in [.06,.17]:c.ell('suit button',(.014,-.120,z),(.009,.005,.009),'black',torso,n=10,rings=8)
    line('jacket welt pocket',[(-.157,-.095,.35),(-.080,-.123,.35)],.0028,'black',torso)
    # Longer bridge, hollow cheeks and tired eyes distinguish an adult face.
    for s in [-1,1]:line('nasolabial crease',[(s*.019,-.109,-.050),(s*.037,-.098,-.079)],.0014,'skinShade',head)
    g=c.node('gavel_weapon',fore,(.015,-.02,-.31))
    tube('polished gavel handle',[(0,0,.04),(0,0,-.22)],.013,'wrap',g)
    tube('barrel gavel head',[(-.085,0,-.22),(-.063,0,-.22),(.063,0,-.22),(.085,0,-.22)],[.040,.034,.034,.040],'wrap',g,n=24)
    for x in [-.06,.06]:
        o=torus('gavel metal band',(x,0,-.22),.035,.0035,'gold',g);o.rotation_euler.y=math.pi/2
    sword=c.node('executioner_weapon',fore,(.015,-.02,-.31))
    tube('executioner luminous blade',[(0,0,.025),(0,0,-.56),(0,0,-.60)],[.022,.020,.001],'gold',sword,n=4)
    tube('executioner cross guard',[(-.085,0,-.02),(.085,0,-.02)],.011,'gold',sword,n=8)
    sword['runtime_hidden']=True

def build_one(ident):
    if ident=='sukunaRaid':
        root=c.build_sukuna();c.roots.pop('sukuna_shinjuku');c.roots[ident]=root
        root.name=ident;root['character_id']=ident
        fore=next(o for o in root.children_recursive if o.name.split('.')[0]=='foreR')
        w=c.node('kamutoke_weapon',fore,(.012,-.03,-.30))
        tube('vajra handle',[(0,0,-.13),(0,0,.045)],.017,'gold',w)
        for s in [-1,1]:
            for x in [-1,0,1]:
                tube('vajra curved prong',[(x*.012,0,s*.040),(x*.050,0,s*.078),(x*.031,0,s*.13),(0,0,s*.15)],[.010,.009,.007,.003],'gold',w)
        torus('vajra central collar',(0,0,0),.025,.005,'gold',w)
        root.location=(0,0,0)
        return root
    root=c.begin(ident)
    kind='gojo' if ident.startswith('gojo') else 'toji' if ident.startswith('toji') else 'yuji' if ident.startswith('yuji') else 'todo' if ident.startswith('todo') else 'mahito' if ident.startswith('mahito') else 'higuruma' if ident.startswith('higuruma') else ident
    muscular=kind in ['toji','todo'] or ident=='mahitoFinal'
    hips=c.node('hips',root,(0,0,.93 if muscular else .91))
    torso=c.node('torso',hips,(0,0,.12))
    if kind=='todo':muscles(torso,.255)
    elif kind=='toji':torso_shape(torso,'shirtBlack',.25)
    elif kind in ['gojo','yuji']:uniform(torso,'gojo' if kind=='gojo' else 'yuji')
    elif kind=='mahito':torso_shape(torso,'armor' if ident=='mahitoFinal' else 'navy',.23 if ident=='mahitoFinal' else .19)
    elif kind=='kashimo':
        torso_shape(torso,'white',.20)
        patch('overlapping sleeveless robe',[(-.16,-.105,.49),(.17,-.112,.36),(.14,-.123,-.07),(-.15,-.112,-.07)],'white',torso)
        line('robe diagonal edge',[(-.16,-.112,.49),(.04,-.132,.33),(.13,-.131,.13)],.003,'fold',torso)
        c.loft('dark waist sash',[(-.13,.17,.11,0),(-.055,.172,.113,0)],'navy',torso,n=32)
    else:torso_shape(torso,'navy')
    c.loft('neck',[(.46,.055,.056,0),(.61,.047,.046,0)],'skin' if muscular else 'pale',torso,n=24)
    head=c.head_form(torso,'skin' if muscular else 'mahitoPale' if kind=='mahito' else 'pale',1.10 if muscular else 1)
    head.location.z=.69
    c.eyes(head,'blue' if kind=='gojo' else 'iris',kind=='higuruma','silver' if kind=='gojo' else 'hair')
    hair(head,kind)
    if kind=='gojo' and ident=='gojoTeen':
        for s in [-1,1]:
            c.ell('round dark sunglass lens',(s*.054,-.122,.026),(.041,.007,.039),'black',head,n=24,rings=12)
            torus('fine round glasses frame',(s*.054,-.125,.026),.041,.002,'steel',head,(math.pi/2,0,0))
            line('sunglass temple',[(s*.093,-.117,.026),(s*.131,-.027,.025)],.002,'steel',head)
        line('glasses bridge',[(-.015,-.13,.026),(.015,-.13,.026)],.002,'steel',head)
    if ident=='gojoAwakened':
        scar(head,[(.088,-.070,.095),(.075,-.093,.055),(.080,-.082,-.031)],'dried forehead blood')
        patch('torn shirt white lining',[(-.08,-.117,.43),(-.05,-.134,.32),(-.073,-.131,.18),(-.10,-.119,.23)],'white',torso)
        line('ragged uniform edge',[(-.08,-.122,.43),(-.095,-.125,.35),(-.05,-.139,.32),(-.073,-.136,.18)],.003,'black',torso)
    if kind=='toji':scar(head,[(.031,-.097,-.094),(.047,-.091,-.102),(.058,-.084,-.113)],'mouth corner scar')
    if kind=='yuji':
        scar(head,[(.018,-.108,.093),(.028,-.113,.032),(.019,-.110,-.032)],'forehead scar')
        scar(head,[(-.051,-.104,-.034),(-.072,-.092,-.067)],'cheek wound')
    if kind=='todo':scar(head,[(-.092,-.077,.106),(-.066,-.107,.039),(-.055,-.102,-.064)],'left facial scar')
    if kind=='mahito' and ident!='mahitoFinal':
        stitched(head)
        for s in [-1,1]:
            patch('patchwork garment panel',[(s*.035,-.130,.34),(s*.162,-.10,.36),(s*.15,-.109,.03),(s*.035,-.118,.03)],'patch',torso)
            for z in [.06,.11,.16,.21,.26,.31]:line('garment stitch',[(s*.031,-.135,z),(s*.044,-.135,z+.007)],.0018,'ink',torso)
    forearms={}
    for s,label in [(-1,'L'),(1,'R')]:
        cloth='navy' if kind in ['gojo','yuji','higuruma'] else 'navy' if kind=='mahito' and ident!='mahitoFinal' else None
        a,f=arm(torso,s,label,cloth,muscular,ident=='todoInjured' and label=='L');forearms[label]=f
        if kind=='toji':
            c.loft('fitted short sleeve',[(-.095,.094,.086,0),(-.01,.093,.085,0),(.025,.082,.077,0)],'shirtBlack',a,n=24)
        if kind=='kashimo':
            for z in [-.06,-.10,-.14]:torus('forearm wrap',(0,0,z),.058,.004,'white',f)
        if ident=='yujiRaid':
            c.loft('red hardened combat forearm',[(-.265,.047,.045,0),(-.19,.069,.062,0),(-.08,.071,.058,0)],'hood',f,n=24)
            for j in range(3):
                c.strand('adapted forearm ridge',(s*.025,.043,-.09-j*.043),(s*.065,.063,-.12-j*.043),(s*.047,.041,-.16-j*.043),.013,'tooth',f)
        if ident=='mahitoFinal':
            c.loft('armored forearm',[(-.23,.059,.052,0),(-.10,.095,.076,0),(.025,.086,.067,0)],'armor',f,n=24)
            tube('long elbow blade',[(s*.062,.028,-.02),(s*.145,.055,.14),(s*.118,.049,.39)],[.035,.028,.0005],'armorEdge',f,n=4)
    trouser='white' if kind in ['toji','kashimo'] else 'armor' if ident=='mahitoFinal' else 'navy'
    c.legs(hips,trouser,muscular,bare=ident=='higurumaCulling')
    tailored_waist(hips,trouser,muscular)
    if kind=='toji':
        for o in list(root.children_recursive):
            if o.name.startswith('shoe cuff'):bpy.data.objects.remove(o,do_unlink=True)
    if kind=='toji':toji_equipment(torso,forearms['R'],ident=='tojiRematch')
    if kind=='higuruma':
        for o in list(torso.children):
            if o.type=='MESH' and o.name.startswith('tailored torso'):bpy.data.objects.remove(o,do_unlink=True)
        higuruma(torso,head,forearms['R'])
    if kind=='kashimo':
        for s in [-1,1]:line('lightning eye marking',[(s*.049,-.112,.008),(s*.045,-.113,-.019),(s*.060,-.105,-.032),(s*.056,-.099,-.056)],.0035,'cyanShade',head)
        amber=c.node('amber_transformation',head)
        amber['runtime_hidden']=True
        c.ell('amber third eye',(0,-.115,.103),(.021,.006,.013),'amber',amber,n=16,rings=10)
        for s in [-1,1]:
            tube('amber facial current',[(s*.032,-.115,.115),(s*.024,-.125,.07),(s*.029,-.125,.035)],[.003,.004,.002],'amber',amber,n=8)
    if ident=='mahitoFinal':
        # A smooth eyeless face shell, elongated crown and back tail, not a human in a helmet.
        c.loft('eyeless spirit face shell',[(-.12,.055,.052,-.048),(-.055,.105,.068,-.064),(.048,.112,.070,-.061),(.13,.080,.048,-.029),(.22,.031,.025,.016),(.29,.004,.005,.037)],'armor',head,n=32)
        for s in [-1,1]:
            c.strand('swept armored crown',(s*.090,.014,.109),(s*.156,.048,.218),(s*.143,.11,.307),.028,'armorEdge',head)
            for z in [.1,.2,.3,.4]:line('segmented chest plate',[(s*.018,-.132,z),(s*.12,-.137,z+.015),(s*.216,-.087,z+.024)],.009,'armorEdge',torso)
        tube('segmented spirit tail',[(0,.10,-.08),(0,.23,-.29),(.07,.39,-.52),(.13,.42,-.65),(.17,.40,-.69)],[.057,.050,.037,.022,.001],'armor',hips,n=16)
        for o in list(head.children):
            if o.type=='MESH' and not o.name.startswith(('eyeless spirit face shell','swept armored crown')):bpy.data.objects.remove(o,do_unlink=True)
        for o in root.children_recursive:
            if o.type=='MESH':
                for i,mat in enumerate(o.data.materials):
                    if mat in [c.M['skin'],c.M['pale']]:o.data.materials[i]=c.M['armor']
    root['identity_features']=kind+'; period-specific face, garment, hair and equipment'
    root['model_revision']='canon-recent-2026-10-08'
    print('Built '+ident)
    return root

def export_one(ident):
    # Reuse joint/material batching, preserving separately addressed equipment empties.
    original_roots=c.roots; original_art=c.ART
    c.roots={ident:original_roots[ident]};c.ART=ART
    c.export_all()
    with open(os.path.join(ART,'asset-report.json'),encoding='utf-8') as f:REPORT.update(json.load(f))
    c.roots=original_roots;c.ART=original_art
    print('Exported '+ident)

def finish():
    with open(os.path.join(ART,'asset-report.json'),'w',encoding='utf-8') as f:json.dump(REPORT,f,indent=2)
    c.col=bpy.data.collections.new('Recent cast studio');c.scene.collection.children.link(c.col)
    for name,pos,power,size in [('key',(-3,-6,7),1500,7),('fill',(7,-3,5),1000,6),('rim',(0,5,6),1600,5)]:
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.size=size
        o=bpy.data.objects.new(name,data);c.col.objects.link(o);o.location=pos;c.aim(o,(0,0,1))
    for i,ident in enumerate(IDS):
        c.roots[ident].location=((i%5-2)*1.45,(i//5)*2.65,0)
        for o in c.roots[ident].children_recursive:
            if o.get('runtime_hidden'):o.hide_render=True
    data=bpy.data.cameras.new('Recent cast review');camera=bpy.data.objects.new('Recent cast review',data)
    c.col.objects.link(camera);camera.location=(7,-18,12);c.aim(camera,(0,2.65,1));data.type='ORTHO';data.ortho_scale=11.7;c.scene.camera=camera
    c.scene.render.resolution_x=1800;c.scene.render.resolution_y=1000;c.scene.render.resolution_percentage=100
    c.scene.render.image_settings.file_format='PNG';c.scene.render.filepath=os.path.join(ART,'lineup.png')
    c.scene.view_settings.view_transform='AgX'
    for area in bpy.context.screen.areas:
        if area.type=='VIEW_3D':
            v=area.spaces.active.region_3d;v.view_perspective='ORTHO';v.view_rotation=camera.rotation_euler.to_quaternion();v.view_location=(0,1.35,1);v.view_distance=11
            area.spaces.active.shading.color_type='MATERIAL';area.spaces.active.overlay.show_overlays=False
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ART,'canon-recent-cast.blend'))
    print('Saved atelier and report')

if __name__=='__main__':
    setup()
    for ident in IDS:build_one(ident);export_one(ident)
    finish()
