# Fase B del estilo cine (ALV_PLAN_LEGO_CINE.md): bisela las piezas base de la minifigura en Blender, sin ventana.
# Uso: blender -b --factory-startup --python tools/biseles/biselar.py -- <carpeta con .obj> <carpeta de salida> [ancho_LDU]
# Entrada y salida en coordenadas LDraw (LDU): el origen y los ejes no cambian, así cada pieza sigue encajando
# con todo lo demás (estampados, objetos, pelo, articulaciones).
import bpy, bmesh, os, sys, math

args = sys.argv[sys.argv.index("--") + 1:]
entrada, salida = args[0], args[1]
ANCHO = float(args[2]) if len(args) > 2 else 0.6   # 0.6 LDU = 0.24 mm, como el redondeo de una pieza real
os.makedirs(salida, exist_ok=True)
# Ángulos por pieza: (suavizado, límite del bisel) en grados. La cabeza, el pelo y los cascos no pasan por aquí:
# la escena arma la cabeza girando su perfil (cabezaTorno) y suaviza pelo y cascos (suavizar), en tools/minifig/escena.js.
ANGULOS = {}
POR_DEFECTO = (35, 40)

def limpiar():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)

def coser(bm, tol=0.03):
    # Uniones en «T»: LDraw junta primitivas de distinta resolución (en la cabeza, cilindro de 48 lados con barbilla de 16),
    # así que un vértice cae a media arista de la otra pieza sin compartirla. Para Blender eso es un borde abierto y la
    # luz se corta ahí (la línea bajo la cara). Se parte cada arista abierta donde cae un vértice abierto y se unen.
    hechas = 0
    for _ in range(4):
        bm.edges.ensure_lookup_table()
        abiertas = [e for e in bm.edges if e.is_boundary]
        sueltos = set(v for e in abiertas for v in e.verts)
        cortes = []
        for e in abiertas:
            a, b = e.verts[0].co, e.verts[1].co
            d = b - a; L2 = d.length_squared
            if L2 < 1e-9: continue
            for v in sueltos:
                if v in e.verts: continue
                t = (v.co - a).dot(d) / L2
                if 0.02 < t < 0.98 and ((a + d * t) - v.co).length < tol:
                    cortes.append((e, t, v)); break
        if not cortes: break
        vistos = set()
        for e, t, v in cortes:
            if e in vistos or not e.is_valid: continue
            vistos.add(e)
            nueva, vn = bmesh.utils.edge_split(e, e.verts[0], t)
            vn.co = v.co.copy(); hechas += 1
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.005)
    return hechas

for nombre in sorted(f for f in os.listdir(entrada) if f.endswith(".obj")):
    limpiar()
    bpy.ops.wm.obj_import(filepath=os.path.join(entrada, nombre), forward_axis="NEGATIVE_Z", up_axis="Y")
    obj = bpy.context.selected_objects[0]
    bpy.context.view_layer.objects.active = obj
    antes = len(obj.data.polygons)
    # LDraw arma cada pieza con primitivas sueltas: se unen los vértices repetidos para que el bisel siga las aristas.
    bm = bmesh.new(); bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.02)
    cosidas = coser(bm)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.001)
    bm.to_mesh(obj.data); bm.free()
    # Sombreado suave en las curvas (cabeza, brazos, cadera) y aristas vivas marcadas: sin esto la pieza sale facetada.
    pid = nombre[:-4]
    suave, limite = ANGULOS.get(pid, POR_DEFECTO)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(suave), keep_sharp_edges=True)
    # Bisel solo en aristas vivas (más de 40°, o lo que diga ANGULOS): las curvas de la cabeza o la mano no se tocan.
    b = obj.modifiers.new("bisel", "BEVEL")
    b.width = ANCHO; b.segments = 3; b.limit_method = "ANGLE"; b.angle_limit = math.radians(limite)
    b.use_clamp_overlap = True; b.harden_normals = True; b.miter_outer = "MITER_ARC"
    # Normales «ponderadas»: las caras grandes quedan planas y la luz se curva solo en el bisel.
    w = obj.modifiers.new("normales", "WEIGHTED_NORMAL"); w.keep_sharp = True; w.weight = 50
    bpy.ops.object.modifier_apply(modifier="bisel")
    bpy.ops.object.modifier_apply(modifier="normales")
    bpy.ops.wm.obj_export(filepath=os.path.join(salida, nombre), export_selected_objects=True, forward_axis="NEGATIVE_Z", up_axis="Y",
                          export_normals=True, export_uv=False, export_materials=False, export_triangulated_mesh=True, apply_modifiers=True)
    print("BISEL", nombre, "caras", antes, "->", len(obj.data.polygons), "uniones cosidas", cosidas)
