"""Build editable Shinjuku story fighters and arena sets with Blender."""
import bpy
import math
import os
import random

ROOT = r"D:\新宿决战"
OUT = os.path.join(ROOT, "public", "models")
ART = os.path.join(ROOT, "art")
random.seed(251)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def mat(name, color, metallic=0.0, roughness=0.75, emission=None):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = 1.3
    return m

ink = mat("deep blue uniform", (.025,.032,.065))
cloth = mat("ivory coat", (.7,.69,.7))
skin = mat("warm skin", (.66,.47,.43))
hair = mat("black hair", (.012,.015,.027))
steel = mat("sword steel", (.54,.64,.75), .72, .24)
violet = mat("cursed violet", (.48,.34,.86), .2, .3, (.25,.13,.7))
rikaSkin = mat("rika pale shell", (.76,.76,.73))
rikaShade = mat("rika shadow", (.16,.13,.23))
rikaEye = mat("rika eye glow", (.93,.33,.43), .1, .3, (.8,.12,.22))
asphalt = mat("broken asphalt", (.075,.08,.095))
road = mat("road cracks", (.035,.04,.055))
concrete = mat("cold concrete", (.11,.13,.16))
broken = mat("fractured concrete", (.08,.09,.12))
glass = mat("dark glass", (.025,.045,.075), .35, .24)
glass2 = mat("shattered glass", (.07,.13,.18), .2, .18)
red = mat("warning red", (.42,.055,.085), .1, .4)
gold = mat("domain blade brass", (.55,.39,.17), .58, .3)
white = mat("painted line", (.23,.25,.27))
neonBlue = mat("electric blue signage", (.02,.25,.46), .1, .3, (.01,.14,.36))
neonPink = mat("pink signage", (.34,.025,.16), .1, .3, (.22,.01,.1))

def apply_material(obj, material):
    obj.data.materials.append(material)
    return obj

def cube(name, loc, scale, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, material)
    if bevel:
        mod = obj.modifiers.new("soft worn edges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        obj.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
    return obj

def sphere(name, loc, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_material(obj, material)
    return obj

def cone(name, loc, radius, depth, material, vertices=10):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=0, depth=depth, location=loc)
    return apply_material(bpy.context.object, material)

def cylinder(name, loc, radius, depth, material, vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    obj = bpy.context.object
    obj.name = name
    return apply_material(obj, material)

def begin_collection(name):
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col

def move_to(obj, collection):
    for col in list(obj.users_collection): col.objects.unlink(obj)
    collection.objects.link(obj)
    return obj

def export_collection(collection, filename):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in collection.objects: obj.select_set(True)
    bpy.context.view_layer.objects.active = next(iter(collection.objects))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, filename), export_format="GLB", use_selection=True, export_yup=True, export_animations=False)

def fighter_yuta():
    col = begin_collection("01 Yuta Okkotsu · editable")
    parts = [
        cube("long white coat torso", (0,0,1.25), (.62,.35,.82), cloth, .08),
        cube("coat left hem", (-.2,0,.69), (.34,.4,.55), cloth, .04),
        cube("coat right hem", (.2,0,.69), (.34,.4,.55), cloth, .04),
        cube("navy inner shirt", (0,-.19,1.31), (.32,.05,.66), ink),
        sphere("face", (0,-.01,1.78), (.24,.22,.29), skin),
        sphere("hair crown", (0,.02,1.98), (.26,.24,.19), hair),
        cube("fringe left", (-.11,-.19,1.93), (.16,.09,.2), hair),
        cube("fringe right", (.12,-.17,1.94), (.17,.1,.18), hair),
        cube("left sleeve", (-.43,0,1.22), (.25,.32,.72), cloth, .05),
        cube("right sleeve", (.43,0,1.22), (.25,.32,.72), cloth, .05),
        cube("left trousers", (-.17,0,.36), (.25,.29,.7), ink, .035),
        cube("right trousers", (.17,0,.36), (.25,.29,.7), ink, .035),
        cube("left boot", (-.17,-.09,.1), (.29,.44,.2), hair),
        cube("right boot", (.17,-.09,.1), (.29,.44,.2), hair),
        cube("katana grip", (.69,-.18,.74), (.07,.08,.5), hair),
        cube("katana blade", (.69,-.18,1.28), (.05,.045,.75), steel),
        cube("katana guard", (.69,-.18,.95), (.2,.16,.04), gold),
        cube("cursed aura ribbon", (-.42,.23,.88), (.05,.04,.77), violet)
    ]
    for x in (-.09,.09): parts.append(sphere("blue shadow eye", (x,-.205,1.8), (.027,.01,.018), hair))
    for obj in parts: move_to(obj, col)
    export_collection(col, "yuta.glb")
    return col

def fighter_rika():
    col = begin_collection("02 Rika · editable")
    parts = [
        sphere("floating torso", (0,0,1.28), (.43,.35,.63), rikaSkin),
        sphere("huge head", (0,-.05,1.95), (.4,.34,.34), rikaSkin),
        sphere("left arm", (-.55,0,1.2), (.23,.23,.58), rikaShade),
        sphere("right arm", (.55,0,1.2), (.23,.23,.58), rikaShade),
        sphere("lower wisp", (0,.02,.55), (.27,.27,.54), rikaShade),
        cube("dark maw", (0,-.367,1.85), (.46,.04,.23), rikaShade),
    ]
    for x in (-.18,.18):
        parts += [sphere("red eye", (x,-.362,2.06), (.08,.03,.07), rikaEye),
                  cone("claw", (x*3.1,-.09,.52), .09, .38, rikaSkin)]
    for i in range(7):
        x = (i-3)*.07
        parts.append(cone("maw tooth", (x,-.405,1.81), .025, .13, rikaSkin, 6))
    for obj in parts: move_to(obj, col)
    export_collection(col, "rika.glb")
    return col

def tower(parts, index, x, y, w, depth, height, stage):
    core = move_to(cube(f"tower_{index}_core", (x,y,height/2), (w,depth,height), broken, .12), parts)
    core.rotation_euler.z = (index % 3 - 1) * .08
    for floor in range(1, int(height//3)):
        z = floor*3
        for side in (-1,1):
            panel = cube(f"facade_{index}_{floor}_{side}", (x+side*w*.26,y-depth*.51,z), (w*.35,.07,1.7), glass2 if floor%4==0 else glass)
            move_to(panel, parts)
    for j in range(3):
        chunk = cube(f"breakable_{index}_{j}", (x+(j-1)*w*.25,y-depth*.57,1+j*.8), (w*.23,.32,1.1), concrete, .06)
        move_to(chunk, parts)
    if stage == "borrowed":
        for j in range(2):
            slab = cube(f"tower_{index}_fracture_{j}", (x+(j-.5)*w*.3,y-depth*.55,height*.6+j*1.3), (w*.55,.42,.32), concrete)
            slab.rotation_euler.z = .12 * (j+1)
            move_to(slab, parts)

def scene_stage(stage):
    col = begin_collection("03 Shinjuku streets" if stage == "yuta" else "04 Shinjuku crater")
    def add(obj): return move_to(obj, col)
    add(cube("district_ground", (0,0,-.18), (112,112,.35), asphalt))
    add(cube("main_avenue", (0,0,.015), (20,105,.04), road))
    add(cube("cross_street", (0,0,.018), (104,16,.04), road))
    for i in range(-5,6):
        add(cube(f"lane_mark_{i}", (0,i*8,.044), (.18,3,.015), white))
        add(cube(f"crosswalk_{i}", (i*1.5,-3,.052), (.9,5,.02), white))
    for i in range(12):
        side = -1 if i%2 else 1
        x = side*(20+(i%3)*8)
        y = (i//2-3)*15
        height = 14 + (i*7)%25
        tower(col, i, x, y, 8+(i%3)*2, 8, height, stage)
        for j in range(3):
            rubble = cube(f"rubble_{i}_{j}", (x+random.uniform(-5,5),y+random.uniform(-5,5),.25), (random.uniform(.6,2),random.uniform(.5,1.8),random.uniform(.2,.8)), broken)
            rubble.rotation_euler.z = random.random()*math.pi
            add(rubble)
        sign = cube(f"tower_{i}_lit_sign", (x,y-4.12,3.7), (3.8,.15,1.25), neonBlue if i%2 else neonPink, .05)
        add(sign)
        for k in range(3):
            add(cube(f"tower_{i}_sign_stroke_{k}", (x-1.1+k*1.05,y-4.22,3.7), (.16,.04,.7), white))
    for i in range(12):
        side = -1 if i%2 else 1
        x = side*10.9
        y = (i//2-3)*15
        add(cylinder(f"streetlamp_pole_{i}", (x,y,2.4), .075,4.8,steel,8))
        add(cube(f"streetlamp_arm_{i}", (x-side*.75,y,4.7), (1.5,.09,.09),steel))
        add(cube(f"streetlamp_light_{i}", (x-side*1.4,y,4.58), (.32,.42,.09),neonBlue))
    for i in range(12):
        x = (-1 if i%2 else 1)*(6+(i%3)*1.5)
        y = (i//2-3)*9
        add(cube(f"breakable_barrier_{i}", (x,y,.72), (1.6,.48,1.4), concrete, .05))
    if stage == "yuta":
        for i in range(38):
            a = i*math.tau/38
            r = 18 + (i%4)*.6
            x,y = math.cos(a)*r, math.sin(a)*r
            blade = cube(f"domain_sword_{i}", (x,y,.7), (.08,.18,1.3), steel)
            blade.rotation_euler.z = a
            add(blade)
            add(cube(f"domain_sword_grip_{i}", (x,y,.09), (.14,.16,.2), gold))
        for i in range(6):
            a = i*math.tau/6
            add(cylinder(f"domain_marker_{i}", (math.cos(a)*17,math.sin(a)*17,.04), .7,.08,violet))
    else:
        add(cylinder("crater_inner", (0,0,-.03), 15,.08,broken,48))
        for i in range(24):
            a = i*math.tau/24
            r = 17+(i%3)
            slab = cube(f"breakable_crater_{i}", (math.cos(a)*r,math.sin(a)*r,.33), (2.2,1.1,.58), concrete)
            slab.rotation_euler.z = a+.24
            add(slab)
        for i in range(12):
            a = i*math.tau/12
            x,y = math.cos(a)*23,math.sin(a)*23
            add(cube(f"collapsed_beam_{i}", (x,y,1.7), (.35,.35,3.4), steel))
    export_collection(col, f"story_{stage}.glb")
    return col

# Character exports are authored by build_story_characters.py. Regenerating
# arenas must not overwrite the revised character assets with the old blockout.
scene_stage("yuta")
scene_stage("borrowed")
for index, col in enumerate(bpy.data.collections):
    if index > 0:
        for obj in col.objects: obj.hide_set(True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ART, "story-assets.blend"))
print("Story fighters and two arena sets exported")
