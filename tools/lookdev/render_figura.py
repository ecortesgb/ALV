# Render de referencia (Cycles) de la figura de prueba sobre la Plataforma ALV, misma cámara que la escena 3D.
import bpy, math, sys, os
args = sys.argv[sys.argv.index("--") + 1:]
glb, salida = args[0], args[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=glb)
for m in bpy.data.materials:
    if not m.use_nodes: continue
    b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if not b: continue
    # Solo las calcomanías (con imagen) son transparentes; las piezas de plástico son sólidas.
    con_imagen = b.inputs["Base Color"].is_linked
    if not con_imagen:
        for l in list(m.node_tree.links):
            if l.to_socket == b.inputs["Alpha"]: m.node_tree.links.remove(l)
        b.inputs["Alpha"].default_value = 1.0
        try: m.surface_render_method = "DITHERED"
        except Exception: pass
    c = b.inputs["Base Color"].default_value
    metal = b.inputs["Metallic"].default_value
    oro = c[0] > 0.5 and c[1] > 0.25 and c[2] < 0.15 and not b.inputs["Base Color"].is_linked
    if oro:
        b.inputs["Metallic"].default_value = 0.9; b.inputs["Roughness"].default_value = 0.26
    elif metal > 0.3:
        b.inputs["Roughness"].default_value = 0.3
    else:
        b.inputs["Roughness"].default_value = 0.3
        b.inputs["Coat Weight"].default_value = 0.35
        b.inputs["Coat Roughness"].default_value = 0.12
        b.inputs["Specular IOR Level"].default_value = 0.5
# Mundo: luz de estudio suave
w = bpy.data.worlds.new("estudio"); sc.world = w; w.use_nodes = True
nt = w.node_tree; env = nt.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(r"C:\Program Files\Blender Foundation\Blender 5.3\5.3\datafiles\studiolights\world\studio.exr")
bg = nt.nodes["Background"]; bg.inputs["Strength"].default_value = 0.3
nt.links.new(env.outputs["Color"], bg.inputs["Color"])
def luz(nombre, pos, color, potencia, tam):
    d = bpy.data.lights.new(nombre, "AREA"); d.color = color; d.energy = potencia; d.size = tam
    o = bpy.data.objects.new(nombre, d); o.location = pos; sc.collection.objects.link(o)
    t = o.constraints.new("TRACK_TO"); t.target = objetivo; t.track_axis = "TRACK_NEGATIVE_Z"; t.up_axis = "UP_Y"
objetivo = bpy.data.objects.new("objetivo", None); objetivo.location = (0, 0, 1.0); sc.collection.objects.link(objetivo)
# three (x, y, z) -> Blender (x, -z, y)
luz("clave", (-3.5, -5, 6), (1, .9, .78), 1400, 3)
luz("contra", (4.5, 5.5, 4.8), (.55, .95, 1), 1300, 2.5)
luz("relleno", (5, -4, 1.2), (1, .82, .66), 260, 3)
# Piso que solo recibe sombra (se ve el fondo de la página detrás)
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -0.72)); bpy.context.active_object.is_shadow_catcher = True
# Cámara: 30° vertical, como encuadrar() del modo azotea (alto 4.9)
alto, PISO = 4.9, -0.72
d = (alto / 2) / math.tan(math.radians(15)); centro = PISO - 0.22 + alto / 2
cd = bpy.data.cameras.new("cam"); cd.sensor_fit = "VERTICAL"; cd.angle = math.radians(30)
cam = bpy.data.objects.new("cam", cd); cam.location = (0, -d, centro - 0.12); sc.collection.objects.link(cam); sc.camera = cam
mira = bpy.data.objects.new("mira", None); mira.location = (0, 0, centro); sc.collection.objects.link(mira)
t = cam.constraints.new("TRACK_TO"); t.target = mira; t.track_axis = "TRACK_NEGATIVE_Z"; t.up_axis = "UP_Y"
r = sc.render; r.engine = "CYCLES"; r.resolution_x, r.resolution_y = int(args[2]), int(args[3]); r.film_transparent = True
sc.cycles.samples = 160; sc.cycles.use_denoising = True; sc.cycles.device = "CPU"
r.filepath = salida; bpy.ops.render.render(write_still=True)
print("listo", salida)
