# Iconos de prueba en Blender: moneda (placa redonda de piezas, dorada) y trofeo, con contorno de tinta (Freestyle).
import bpy, math, sys
salida = sys.argv[sys.argv.index("--") + 1]
def limpiar():
    bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(nombre, color, metal=0.0, rug=0.3, coat=0.4):
    m = bpy.data.materials.new(nombre); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rug
    b.inputs["Coat Weight"].default_value = coat; b.inputs["Coat Roughness"].default_value = 0.1; return m
def biselar(o, ancho=0.04, seg=4):
    md = o.modifiers.new("bisel", "BEVEL"); md.width = ancho; md.segments = seg; md.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = o; bpy.ops.object.shade_smooth()
def cil(r, h, z, m, v=64):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(0, 0, z), vertices=v); o = bpy.context.active_object; o.data.materials.append(m); biselar(o, min(0.05, h * 0.2)); return o
def escena(nombre, objetivo_z, dist, elev):
    sc = bpy.context.scene
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; nt = w.node_tree
    env = nt.nodes.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(r"C:\Program Files\Blender Foundation\Blender 5.3\5.3\datafiles\studiolights\world\studio.exr")
    nt.links.new(env.outputs["Color"], nt.nodes["Background"].inputs["Color"]); nt.nodes["Background"].inputs["Strength"].default_value = 1.2
    mira = bpy.data.objects.new("mira", None); mira.location = (0, 0, objetivo_z); sc.collection.objects.link(mira)
    def luz(n, pos, col, e, s):
        d = bpy.data.lights.new(n, "AREA"); d.color = col; d.energy = e; d.size = s; o = bpy.data.objects.new(n, d); o.location = pos; sc.collection.objects.link(o)
        t = o.constraints.new("TRACK_TO"); t.target = mira; t.track_axis = "TRACK_NEGATIVE_Z"; t.up_axis = "UP_Y"
    luz("clave", (-4, -5, 6), (1, .95, .85), 900, 3); luz("contra", (4, 5, 4), (.7, .9, 1), 700, 2.5)
    cd = bpy.data.cameras.new("c"); cd.angle = math.radians(26); cam = bpy.data.objects.new("c", cd)
    a = math.radians(elev); cam.location = (dist * 0.35, -dist * math.cos(a), objetivo_z + dist * math.sin(a)); sc.collection.objects.link(cam); sc.camera = cam
    t = cam.constraints.new("TRACK_TO"); t.target = mira; t.track_axis = "TRACK_NEGATIVE_Z"; t.up_axis = "UP_Y"
    r = sc.render; r.engine = "CYCLES"; r.resolution_x = r.resolution_y = 512; r.film_transparent = True
    sc.cycles.samples = 96; sc.cycles.use_denoising = True
    r.use_freestyle = True; r.line_thickness_mode = "ABSOLUTE"; r.line_thickness = 3.2
    ls = sc.view_layers[0].freestyle_settings.linesets.new("tinta"); ls.select_by_visibility = True
    ls.select_silhouette = True; ls.select_border = True; ls.select_crease = False
    ls.linestyle.color = (0.04, 0.06, 0.19); ls.linestyle.thickness = 3.2
    r.filepath = salida + nombre + ".png"; bpy.ops.render.render(write_still=True); print("listo", nombre)

# Moneda: placa redonda 2x2 de piezas, dorada, con un stud grande con estrella
limpiar()
oro = mat("oro", (1.0, 0.72, 0.22), metal=0.9, rug=0.16, coat=0.5)
cil(1.0, 0.36, 0.18, oro); cil(0.62, 0.22, 0.47, oro)
bpy.ops.mesh.primitive_cylinder_add(radius=0.32, depth=0.06, location=(0, 0, 0.6), vertices=5); s = bpy.context.active_object
s.data.materials.append(mat("brillo", (1, 0.9, 0.55), metal=0.9, rug=0.15))
escena("moneda", 0.25, 6.2, 32)

# Trofeo: copa por torno, asas, pie y base de piezas azul
limpiar()
oro = mat("oro", (1.0, 0.72, 0.22), metal=0.9, rug=0.16, coat=0.5); azul = mat("azul", (0.08, 0.2, 0.7), rug=0.3, coat=0.5)
perfil = [(0.0, 1.0), (0.38, 1.0), (0.42, 1.05), (0.46, 1.5), (0.6, 2.3), (0.66, 2.75), (0.7, 2.8), (0.64, 2.78), (0.5, 2.3), (0.36, 1.6), (0.0, 1.35)]
cu = bpy.data.curves.new("perfil", "CURVE"); cu.dimensions = "3D"; sp = cu.splines.new("POLY"); sp.points.add(len(perfil) - 1)
for i, (x, z) in enumerate(perfil): sp.points[i].co = (x, 0, z, 1)
copa = bpy.data.objects.new("copa", cu); bpy.context.scene.collection.objects.link(copa)
sc_ = copa.modifiers.new("torno", "SCREW"); sc_.steps = 64; sc_.render_steps = 64; sc_.use_merge_vertices = True
bpy.context.view_layer.objects.active = copa; copa.select_set(True); bpy.ops.object.convert(target="MESH"); copa.data.materials.append(oro)
sol = copa.modifiers.new("grosor", "SOLIDIFY"); sol.thickness = 0.06; biselar(copa, 0.02, 2)
for lado in (-1, 1):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.32, minor_radius=0.07, location=(lado * 0.72, 0, 2.15), rotation=(math.pi / 2, 0, 0)); t = bpy.context.active_object; t.data.materials.append(oro); bpy.ops.object.shade_smooth()
cil(0.16, 0.5, 0.78, oro, 32); cil(0.5, 0.14, 0.52, oro)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.22)); b = bpy.context.active_object; b.scale = (1.3, 1.3, 0.44); bpy.ops.object.transform_apply(scale=True); b.data.materials.append(azul); biselar(b, 0.06, 3)
for x in (-0.33, 0.33):
    for y in (-0.33, 0.33):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.17, depth=0.12, location=(x, y, 0.5), vertices=32); s = bpy.context.active_object; s.data.materials.append(azul); biselar(s, 0.02, 2)
escena("trofeo", 1.45, 9.5, 18)
