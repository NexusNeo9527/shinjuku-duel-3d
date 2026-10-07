"""Canon-informed theater, post-Gojo Shinjuku and Deadly Sentencing. Run in Blender."""
import bpy, math, random, runpy
from pathlib import Path
H=runpy.run_path(str(Path(__file__).with_name('build_latest_arenas.py')),run_name='helpers')
Builder=H['Builder']; mat=H['mat']; ROOT=H['ROOT']; rng=random.Random(237)
concrete=mat('Fractured concrete',(.31,.32,.32)); edge=mat('Exposed aggregate',(.48,.47,.43))
steel=mat('Rebar',(.15,.12,.10)); glass=mat('Broken windows',(.08,.13,.16),.3)
velvet=mat('Burgundy velvet',(.20,.018,.024)); wood=mat('Theater walnut',(.18,.095,.055))
gold=mat('Aged brass',(.48,.33,.14),.35); white=mat('Porcelain mask',(.83,.81,.74))
black=mat('Judgeman shroud',(.008,.009,.012)); ink=mat('Eye sutures',(.025,.019,.018))
floor=mat('Court ash',(.18,.18,.17)); blade=mat('Guillotine steel',(.38,.40,.39),.3)
lamp=mat('Warm practical lights',(.75,.48,.20),.4,2)

def arc(b,name,m,x,y,z,r,start,end,width=.08):
    pts=[(x+r*math.cos(a),y+r*math.sin(a),z) for a in [start+(end-start)*i/32 for i in range(33)]]
    b.tube(name,m,pts,[width]*len(pts),8)

def court():
    b=Builder('09 • Deadly Sentencing — Chapter 164')
    b.box('court_floor',floor,(0,0,-.22),(44,44,.4))
    b.ellipsoid('domain_shell',black,(0,0,7),(23,23,20),seg=48,rings=24)
    # Two circular witness docks: gameplay places the participants at x +/-2, z +2.
    for x in [-2,2]:
        b.tube('circular witness plinth',wood,[(x,-2,-.1),(x,-2,.04)],[1.75,1.75],48)
        for z in [.24,1.12]:arc(b,'curved courtroom rail',wood,x,-2,z,1.65,0,math.pi,.10)
        for i in range(17):
            a=math.pi*i/16; xx=x+1.65*math.cos(a); yy=-2+1.65*math.sin(a)
            b.tube('turned balusters',wood,[(xx,yy,.24),(xx,yy,.45),(xx,yy,.65),(xx,yy,.92),(xx,yy,1.12)],[.065,.09,.055,.08,.055],8)
    # Black three-point shroud, face toward the foreground (Blender -Y).
    b.ellipsoid('judgeman dome',black,(0,6,6.8),(1.55,.55,1.45),seg=28,rings=16)
    v=[]
    for z,w,d in [(6.7,1.4,.43),(5.5,.85,.30),(4.7,.025,.025)]:
        for i in range(24):
            a=math.tau*i/24;v.append((w*math.cos(a),6+d*math.sin(a),z))
    b.mesh('judgeman lower point',black,v,[(j*24+i,j*24+(i+1)%24,(j+1)*24+(i+1)%24,(j+1)*24+i) for j in range(2) for i in range(24)])
    for s in [-1,1]:
        b.tube('judgeman arm',black,[(s*.8,6,6.8),(s*2.1,6,6.35),(s*2.65,6,5.85)],[.72,.45,.035],16)
        px=s*2.65
        for a in [0,math.tau/3,math.tau*2/3]:
            b.tube('scale suspension',gold,[(px,6,5.85),(px+.65*math.cos(a),6+.65*math.sin(a),4.0)],[.025,.025],6)
        b.tube('scales pan',gold,[(px,6,3.85),(px,6,4.03)],[.35,.72],24)
    b.ellipsoid('white face',white,(0,5.43,6.65),(.59,.10,.86),seg=28,rings=20)
    for s in [-1,1]:
        b.tube('closed eyes',ink,[(s*.08,5.315,6.91),(s*.26,5.31,6.87),(s*.43,5.34,6.91)],[.026]*3,7)
        for i in range(3):
            x=s*(.15+i*.10);b.tube('three stitches per eye',ink,[(x-.025,5.30,6.80),(x+.025,5.30,6.99)],[.017,.017],6)
    b.tube('mask mouth',ink,[(-.17,5.33,6.27),(0,5.31,6.21),(.17,5.33,6.27)],[.024]*3,8)
    # Repeating execution frames surround the docks, slanted metal blades above.
    for i in range(14):
        a=math.tau*i/14; x=14*math.cos(a);y=14*math.sin(a); rot=a-math.pi/2
        c=math.cos(rot);s=math.sin(rot)
        def p(u,v,z):return (x+u*c-v*s,y+u*s+v*c,z)
        for u in [-1.15,1.15]:b.box('guillotine posts',wood,p(u,0,4),( .30,.45,8),rot)
        for z in [1.1,7.8]:b.box('guillotine crossbar',wood,p(0,0,z),(2.8,.55,.4),rot)
        vs=[p(-.94,-.08,6.5),p(.94,-.08,6.5),p(.94,-.08,5.25),p(-.94,-.08,5.85)]
        b.mesh('slanted execution blades',blade,vs,[(0,1,2,3)])
        b.box('stocks',wood,p(0,0,1.7),(2.15,.35,.8),rot)
    for i in range(100):
        a=rng.random()*math.tau;r=10+rng.random()*10
        b.box('ash rubble',concrete,(r*math.cos(a),r*math.sin(a),rng.uniform(.1,.4)),(rng.uniform(.3,1),rng.uniform(.3,1),rng.uniform(.2,.6)),a)
    sc=b.finish('deadly-sentencing',(0,-12,5),(0,3,3.7),True)
    next(o for o in sc.objects if o.name.startswith('domain_shell')).hide_render=True
    for o in sc.objects:
        if o.type=='LIGHT':o.data.color=(1,.9,.75);o.data.energy*=2
    return sc

def theater():
    b=Builder('06 • Tokyo No.1 Colony — Theater')
    b.box('theater_floor',wood,(0,0,-.36),(98,116,.7))
    b.box('theater ceiling',wood,(0,0,14),(98,116,.4))
    for y in range(-50,51,10):b.box('ceiling coffers',gold,(0,y,13.5),(96,.3,.4))
    for x in [-47,47]:b.box('theater_wall',wood,(x,0,7),(2,116,14),collider=True)
    for y in [-57,57]:b.box('theater_end_wall',wood,(0,y,7),(96,2,14),collider=True)
    b.box('stage_platform',wood,(0,47,.45),(76,17,.9),collider=True)
    for z,d in [(.15,3),(.30,2),(.45,1)]:b.box('stage steps',wood,(0,37+d/2,z),(16,d,z*2))
    b.box('stage back',black,(0,55,7),(74,.4,13))
    for x in [-29,29]:
        for k in range(24):
            xx=x+(k-12)*.48;b.tube('pleated curtain',velvet,[(xx,52,1),(xx,52,12)],[.34,.34],10)
    b.box('proscenium',gold,(0,50,12.5),(83,1.3,1.1))
    for x in [-40,40]:b.box('proscenium pillar',gold,(x,50,6),(1.2,1.3,12))
    for row in range(8):
        y=26-row*8
        for side in [-1,1]:
            for seat in range(7):
                x=side*(12+seat*4)
                name=f'breakable_seat_{row}_{side}_{seat}'
                b.box(name,velvet,(x,y,.8),(2.7,2.7,.35))
                b.box(name,velvet,(x,y-1.1,1.7),(2.7,.35,2.0))
                for sx in [-1.3,1.3]:b.box(name,velvet,(x+sx,y,1.1),(.18,2,.23))
                b.box(name,velvet,(x,y,.4),(.35,1.6,.8))
                b.batches[(name,velvet,True)]=b.batches.pop((name,velvet,False))
    for y in range(-48,49,12):
        for x in [-45,45]:
            b.box('wall pilasters',gold,(x,y,6),(.3,1,12))
            b.box('wall sconces',lamp,(x*.99,y,6),( .25,.6,1))
    # Hollow bathtub in which Higuruma is first encountered, at the side of the stage.
    b.box('bathtub bottom',white,(25,47,1.03),(4.3,1.8,.22))
    for y in [46,48]:b.box('bathtub long sides',white,(25,y,1.6),(4.5,.2,1.25))
    for x in [22.8,27.2]:b.box('bathtub ends',white,(x,47,1.6),(.2,2.1,1.25))
    for x in [23.5,26.5]:
        for y in [46.4,47.6]:b.ellipsoid('bathtub feet',gold,(x,y,.98),(.18,.18,.20))
    return b.finish('culling-theater',(0,-32,5),(0,45,5),True)

def ruins(trial=False):
    name='shinjuku-trial-ruins' if trial else 'shinjuku-lightning-ruins'
    b=Builder('08 • Shinjuku — Trial Raid' if trial else '07 • Shinjuku — Kashimo')
    b.box('crater_floor',concrete,(0,0,-.45),(180,180,.8))
    # Destroyed facades with interrupted slabs: rubble stays outside the fighting centre.
    for i in range(18):
        a=i*math.tau/18;r=52+(i%3)*9;x=r*math.cos(a);y=r*math.sin(a);w=rng.uniform(9,15);d=rng.uniform(9,15);h=rng.uniform(14,38)
        b.box('ruined_building_core',concrete,(x,y,h*.38),(w*.38,d*.42,h*.76),a,True)
        def p(u,v,z):return (x+u*math.cos(a)-v*math.sin(a),y+u*math.sin(a)+v*math.cos(a),z)
        for u in [-w*.45,w*.45]:
            for v in [-d*.45,d*.45]:
                hh=h*rng.uniform(.40,.92)
                b.box('fractured structural columns',edge,p(u,v,hh/2),(.55,.55,hh),a)
        for z in range(3,int(h*.74)+1,4):
            span=w*rng.uniform(.45,.95)
            b.box('broken floor plates',edge,p(rng.uniform(-1,1),0,z),(span,d*rng.uniform(.5,1),.30),a)
            # Surviving fragments carry their window panes; no floating glass grid.
            if z<h*.7:
                for u in [-w*.36,w*.36]:
                    if rng.random()<.6:
                        b.box('remaining facade fragments',concrete,p(u,-d*.45,z+1.4),(w*.23,.45,2.8),a)
                        b.box('fractured window strips',glass,p(u,-d*.45-.24,z+1.4),(w*.13,.06,1.9),a)
        b.box('fallen facade',edge,(x*.83,y*.83,1.1),(w*.9,3,2.2),a+.4,True)
        for k in range(6):
            xx=x+(k-2.5)*.7
            top=h*.76
            b.tube('exposed bent rebar',steel,[(xx,y,top),(xx+.2,y,top+1.8),(xx+.8,y+.4,top+2.4)],[.045]*3,6)
    for i in range(85):
        a=rng.random()*math.tau;r=25+rng.random()*25
        b.box('breakable_rubble_'+str(i),edge if i%3==0 else concrete,(r*math.cos(a),r*math.sin(a),.5),(rng.uniform(.8,3),rng.uniform(.8,3),rng.uniform(.5,1.5)),a,True)
    for i in range(16):
        a=rng.random()*math.tau
        pts=[(r*math.cos(a+.03*math.sin(r)),r*math.sin(a+.03*math.sin(r)),.015) for r in [4,9,14,19,24,30]]
        b.tube('slash fissures',black,pts,[.012,.018,.024,.032,.045,.06],5)
    # Continuous central lane is intentionally clear; no invented shrine or electrical machinery.
    return b.finish(name,(35,-48,24),(0,15,7),False)

if __name__=='__main__':
    scenes=[theater(),ruins(),ruins(True),court()]
    bpy.context.window.scene=scenes[-1]
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/canon-trial-arenas.blend'))
    print('Saved editable scenes and four GLBs')
