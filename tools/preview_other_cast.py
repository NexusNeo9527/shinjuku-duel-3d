"""Create a cel-shaded editable workshop from the exportable cast source."""
import bpy
from pathlib import Path
from mathutils import Vector

OUT=Path(__file__).resolve().parents[1]/'art/cast-polish'
scene=next(s for s in bpy.data.scenes if any(o.get('anatomical_rig') for o in s.objects))
bpy.context.window.scene=scene
roots=[o for o in scene.objects if o.get('anatomical_rig')]
visible={o for root in roots for o in [root,*root.children_recursive]}
for obj in scene.objects:
    if obj.type=='MESH' and obj not in visible:obj.hide_render=True
converted={}
for obj in visible:
    if obj.type!='MESH':continue
    for i,source in enumerate(obj.data.materials):
        if source not in converted:
            mat=source.copy();mat.name=source.name+' / cel workshop'
            nodes=mat.node_tree.nodes;links=mat.node_tree.links
            bsdf=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
            color=tuple(bsdf.inputs['Base Color'].default_value)
            output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
            geo=nodes.new('ShaderNodeNewGeometry')
            dot=nodes.new('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT'
            links.new(geo.outputs['Normal'],dot.inputs[0]);dot.inputs[1].default_value=(-.45,-.65,.70)
            ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.interpolation='CONSTANT'
            ramp.color_ramp.elements[0].position=0;ramp.color_ramp.elements[0].color=tuple(v*.50 for v in color[:3])+(1,)
            ramp.color_ramp.elements[1].position=.38;ramp.color_ramp.elements[1].color=color
            middle=ramp.color_ramp.elements.new(.1);middle.color=tuple(v*.75 for v in color[:3])+(1,)
            emission=nodes.new('ShaderNodeEmission')
            links.new(dot.outputs['Value'],ramp.inputs[0]);links.new(ramp.outputs[0],emission.inputs['Color']);links.new(emission.outputs[0],output.inputs['Surface'])
            converted[source]=mat
        obj.data.materials[i]=converted[source]
for index,root in enumerate(roots):root.location=((index%5)*1.2,0,-(index//5)*2.1)
camera_data=bpy.data.cameras.new('Cast review camera');camera=bpy.data.objects.new('Cast review camera',camera_data);scene.collection.objects.link(camera)
camera.location=(2.4,-15,-1.2);camera.rotation_euler=(Vector((2.4,0,-1.2))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=8.3;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=8
scene.render.resolution_x=1400;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'other-cast-workshop.blend'))
scene.render.filepath=str(OUT/'cast-lineup.png');bpy.ops.render.render(write_still=True)
