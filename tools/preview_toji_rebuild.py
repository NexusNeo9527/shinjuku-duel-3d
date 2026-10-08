"""Save a Blender Eevee cel workshop without changing exportable source materials."""
import bpy, importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'art/toji-anime-rebuild'
scene=bpy.data.scenes['Toji / continuous high-model workshop'];bpy.context.window.scene=scene
root=bpy.data.objects['toji_hero'];converted={}
for obj in [root,*root.children_recursive]:
    if obj.type!='MESH':continue
    for i,source in enumerate(obj.data.materials):
        if source not in converted:
            mat=source.copy();mat.name=source.name+' / cel workshop'
            nodes=mat.node_tree.nodes;links=mat.node_tree.links
            bsdf=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
            output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
            emission=nodes.new('ShaderNodeEmission');links.new(emission.outputs[0],output.inputs['Surface'])
            if bsdf.inputs['Base Color'].is_linked:
                links.new(bsdf.inputs['Base Color'].links[0].from_socket,emission.inputs['Color'])
                if source.name=='Toji / reference painted skin':
                    geo=nodes.new('ShaderNodeNewGeometry');xyz=nodes.new('ShaderNodeSeparateXYZ');links.new(geo.outputs['Position'],xyz.inputs[0])
                    absolute=nodes.new('ShaderNodeMath');absolute.operation='ABSOLUTE';links.new(xyz.outputs['X'],absolute.inputs[0])
                    def fade(socket,a,b):
                        n=nodes.new('ShaderNodeMapRange');n.interpolation_type='SMOOTHSTEP';n.clamp=True
                        links.new(socket,n.inputs['Value']);n.inputs['From Min'].default_value=a;n.inputs['From Max'].default_value=b
                        return n.outputs['Result']
                    fades=[fade(absolute.outputs[0],.052,.080),fade(xyz.outputs['Z'],1.775,1.755),fade(xyz.outputs['Z'],1.670,1.690)]
                    mask=fades[0]
                    for part in fades[1:]:
                        mult=nodes.new('ShaderNodeMath');mult.operation='MULTIPLY';links.new(mask,mult.inputs[0]);links.new(part,mult.inputs[1]);mask=mult.outputs[0]
                    mix=nodes.new('ShaderNodeMixRGB');links.new(mask,mix.inputs[0]);links.new(bsdf.inputs['Base Color'].links[0].from_socket,mix.inputs[1]);mix.inputs[2].default_value=(.87137,.65837,.49693,1)
                    links.new(mix.outputs[0],emission.inputs['Color'])
            else:
                color=tuple(bsdf.inputs['Base Color'].default_value)
                geo=nodes.new('ShaderNodeNewGeometry');dot=nodes.new('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT'
                links.new(geo.outputs['Normal'],dot.inputs[0]);dot.inputs[1].default_value=(-.45,-.65,.70)
                ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.interpolation='CONSTANT'
                ramp.color_ramp.elements[0].position=0;ramp.color_ramp.elements[0].color=tuple(v*.50 for v in color[:3])+(1,)
                ramp.color_ramp.elements[1].position=.38;ramp.color_ramp.elements[1].color=color
                middle=ramp.color_ramp.elements.new(.1);middle.color=tuple(v*.75 for v in color[:3])+(1,)
                links.new(dot.outputs['Value'],ramp.inputs[0]);links.new(ramp.outputs[0],emission.inputs['Color'])
            converted[source]=mat
        obj.data.materials[i]=converted[source]
scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
camera=scene.camera
for label,pos,target,scale in [('face-cel',(0,-5,1.78),(0,0,1.78),.40),('three-cel',(3,-5,1.78),(0,0,1.78),.40),('front-cel',(0,-5,1.03),(0,0,1.03),2.15)]:
    from mathutils import Vector
    camera.location=pos;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
    scene.render.filepath=str(OUT/(label+'.png'));bpy.ops.render.render(write_still=True)
camera.location=(0,-5,1.03);camera.rotation_euler=(Vector((0,0,1.03))-camera.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'toji-anime-workshop.blend'))
