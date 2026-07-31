"""
Astra Valkyries - procedural shmup asset renderer.

Generates every gameplay sprite from script. No source images, no manual
modeling - change a number here and re-render the whole set.

Usage:
    blender --background --python tools/blender/render_shmup.py -- <outdir>

Default outdir is rhythm-jet-squadron/public/assets/shmup/

Palette is taken from the original SVG placeholders so renders drop into the
existing art direction. Ships face +Y (up on screen); the canvas rotates them
itself, so no pre-baked rotation frames are needed.

Backgrounds MUST tile seamlessly in Y - ShmupPlayScreen draws them stacked
vertically for the scroll. That is handled by sampling noise along a circle
in the Y axis, which makes the pattern exactly periodic.
"""
import bpy
import math
import os
import random
import sys

TAU = math.pi * 2

# --------------------------------------------------------------- palette
P = {
    # player hull family (from player_ship.svg)
    "hull_lit":  "#F8FBFF",
    "hull_mid":  "#C7D3E8",
    "hull_low":  "#6C7C98",
    "hull_dark": "#1E2738",
    "canopy":    "#7FD4FF",
    "thrust":    "#6FE0FF",
    # lancer accent (offensive frame)
    "lance":     "#FF9A5A",
    "lance_hot": "#FFD9A0",
    # seraph accent (guard frame)
    "seraph":    "#8FF3E0",
    # drifter (enemy_drifter.svg)
    "d_core":    "#FF76AF",
    "d_hot":     "#FFD4E6",
    "d_panel":   "#3B0D1D",
    "d_shell":   "#1B0A13",
    "d_deep":    "#5D102C",
    # sine (enemy_sine.svg)
    "s_core":    "#9B73FF",
    "s_hot":     "#E8DBFF",
    "s_panel":   "#3D1A73",
    "s_shell":   "#160922",
    "s_deep":    "#26104E",
    # boss (boss_dreadnought.svg)
    "b_lit":     "#FFE9D9",
    "b_mid":     "#FFB076",
    "b_low":     "#88452A",
    "b_dark":    "#24161B",
    # space
    "void":      "#050912",
    "neb_mid":   "#132048",
    "neb_hi":    "#3A2E7A",
    "star":      "#EEF6FF",
    "star_cool": "#B9D9FF",
}


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def C(key, alpha=1.0):
    h = P.get(key, key).lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), alpha)


# --------------------------------------------------------------- scene
_MIRROR_ORIGIN = None


def new_scene():
    global _MIRROR_ORIGIN
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _MIRROR_ORIGIN = None
    s = bpy.context.scene
    for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            s.render.engine = eng
            break
        except TypeError:
            continue
    try:
        s.eevee.taa_render_samples = 96
    except AttributeError:
        pass
    return s


def mat(name, base, metallic=0.85, rough=0.3, emit=None, emit_str=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = C(base)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    if emit is not None:
        for key in ("Emission Color", "Emission"):
            if key in b.inputs:
                b.inputs[key].default_value = C(emit)
                break
        b.inputs["Emission Strength"].default_value = emit_str
    return m


def bevel(ob, width=0.02, segments=2):
    m = ob.modifiers.new("Bevel", "BEVEL")
    m.width = width
    m.segments = segments
    m.limit_method = "ANGLE"
    m.angle_limit = math.radians(50)


def mirror_origin():
    """Mirror needs an explicit world-origin target, otherwise it flips
    about each part's own origin and just duplicates it in place."""
    global _MIRROR_ORIGIN
    if _MIRROR_ORIGIN is None:
        bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
        _MIRROR_ORIGIN = bpy.context.object
        _MIRROR_ORIGIN.name = "MirrorOrigin"
    return _MIRROR_ORIGIN


def mx(ob):
    m = ob.modifiers.new("Mirror", "MIRROR")
    m.use_axis[0] = True
    m.mirror_object = mirror_origin()
    return ob


def box(loc, scale, material, rot=(0, 0, 0), bev=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = scale
    o.data.materials.append(material)
    if bev:
        bevel(o, bev)
    return o


def cyl(loc, radius, depth, material, rot=(0, 0, 0), verts=16, bev=0.015):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius,
                                        depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.data.materials.append(material)
    if bev:
        bevel(o, bev)
    return o


def cone(loc, r1, r2, depth, material, rot=(0, 0, 0), verts=16):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2,
                                    depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.data.materials.append(material)
    return o


def sphere(loc, scale, material, subd=3):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subd, radius=1.0, location=loc)
    o = bpy.context.object
    o.scale = scale
    o.data.materials.append(material)
    return o


FWD = (math.radians(90), 0, 0)   # axis along Y; cone apex points BACK (-Y)
NOSE = (math.radians(-90), 0, 0)  # cone apex points FORWARD (+Y)


def exhaust(x, y_rear, material, radius=0.19, length=0.55, hot=0.12, z=0.0):
    """Top-down-visible thruster: a flattened plume trailing backward plus a
    hot disc facing the camera.

    A backward-facing exhaust cap is edge-on to an overhead camera and
    renders as essentially nothing, which is why engines looked dead.
    """
    p = cone((x, y_rear - length / 2, z), radius, 0.02, length, material,
             rot=FWD, verts=14)
    p.scale = (1.0, 0.30, 1.0)  # local Y is world Z after the rotation
    mx(p)
    d = cyl((x, y_rear - 0.06, z + 0.15), hot, 0.05, material, verts=12, bev=0)
    mx(d)


# --------------------------------------------------------------- render
def glare(scene, threshold=0.65, size=7, mix=-0.28):
    scene.use_nodes = True
    t = scene.node_tree
    t.nodes.clear()
    rl = t.nodes.new("CompositorNodeRLayers")
    gl = t.nodes.new("CompositorNodeGlare")
    for gtype in ("BLOOM", "FOG_GLOW"):
        try:
            gl.glare_type = gtype
            break
        except TypeError:
            continue
    gl.quality = "HIGH"
    try:
        gl.size = size
    except AttributeError:
        pass
    gl.mix = mix
    gl.threshold = threshold
    co = t.nodes.new("CompositorNodeComposite")
    t.links.new(rl.outputs["Image"], gl.inputs["Image"])
    t.links.new(gl.outputs["Image"], co.inputs["Image"])


def camera(scene, ortho_scale, z=16):
    bpy.ops.object.camera_add(location=(0, 0, z))
    c = bpy.context.object
    c.data.type = "ORTHO"
    c.data.ortho_scale = ortho_scale
    c.rotation_euler = (0, 0, 0)
    scene.camera = c
    return c


def lights(tint=(0.85, 0.92, 1.0), power=1.0):
    """Key upper-left, cool fill lower-right, rim from below."""
    rig = ((-7, 6, 11, 3000), (8, -4, 9, 1100), (0, -8, 6, 2000))
    for x, y, z, e in rig:
        bpy.ops.object.light_add(type="AREA", location=(x, y, z))
        L = bpy.context.object
        L.data.energy = e * power
        L.data.size = 11.0
        L.data.color = tint
        d = math.hypot(x, y)
        L.rotation_euler = (math.atan2(d, z), 0, math.atan2(y, x) + math.pi / 2)


def render(scene, outdir, name, rx, ry, transparent=True):
    scene.render.resolution_x = rx
    scene.render.resolution_y = ry
    scene.render.film_transparent = transparent
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.filepath = os.path.join(outdir, name)
    bpy.ops.render.render(write_still=True)
    print("WROTE", name)


# --------------------------------------------------------------- ships
def astra_interceptor(outdir):
    """Fast-response frame: narrow, sharp, minimal cross-section."""
    s = new_scene()
    lit = mat("lit", "hull_mid", 0.92, 0.20)
    low = mat("low", "hull_low", 0.95, 0.18)
    drk = mat("drk", "hull_dark", 0.88, 0.34)
    cnp = mat("cnp", "#243048", 0.4, 0.10, emit="canopy", emit_str=2.2)
    thr = mat("thr", "#0A1626", 0.2, 0.4, emit="thrust", emit_str=9.0)

    box((0, 0.10, 0), (0.46, 2.6, 0.30), lit, bev=0.05)          # spine
    cone((0, 1.92, 0), 0.24, 0.02, 1.1, lit, rot=NOSE, verts=14)  # nose
    box((0, 1.30, 0.12), (0.20, 1.0, 0.10), low, bev=0.025)       # dorsal strake
    sphere((0, 0.60, 0.20), (0.24, 0.58, 0.17), cnp)              # canopy

    w = box((0.92, -0.30, -0.01), (1.5, 1.15, 0.085), lit,
            rot=(0, 0, math.radians(-21)), bev=0.03)
    mx(w)
    t = box((0.98, 0.20, 0.035), (1.2, 0.16, 0.055), low,
            rot=(0, 0, math.radians(-21)), bev=0.018)
    mx(t)
    p = box((1.58, -0.62, 0.0), (0.13, 0.9, 0.12), drk, bev=0.025)
    mx(p)

    n = cyl((0.42, -1.38, 0), 0.24, 1.45, low, rot=FWD, verts=14)
    mx(n)
    ns = box((0.42, -1.38, 0.22), (0.16, 1.2, 0.06), drk, bev=0.015)  # top strip
    mx(ns)
    exhaust(0.42, -2.10, thr, radius=0.19, length=0.55)
    f = box((0.26, -1.98, 0.20), (0.085, 0.58, 0.40), low,
            rot=(math.radians(15), 0, 0), bev=0.018)
    mx(f)

    camera(s, 5.6)
    lights()
    glare(s)
    render(s, outdir, "ships/astra_interceptor_sprite_3d", 256, 256)


def valkyrie_lancer(outdir):
    """Offensive spearhead: forward lance, forward-swept wings, gun pods."""
    s = new_scene()
    lit = mat("lit", "hull_mid", 0.92, 0.22)
    low = mat("low", "hull_low", 0.95, 0.20)
    drk = mat("drk", "hull_dark", 0.88, 0.34)
    acc = mat("acc", "lance", 0.85, 0.25, emit="lance", emit_str=0.5)
    cnp = mat("cnp", "#243048", 0.4, 0.10, emit="canopy", emit_str=2.0)
    thr = mat("thr", "#180A04", 0.2, 0.4, emit="lance_hot", emit_str=9.0)

    box((0, -0.05, 0), (0.60, 2.5, 0.36), lit, bev=0.055)          # spine
    box((0, 1.15, 0.06), (0.42, 1.3, 0.30), low, bev=0.04)         # forward deck
    cone((0, 2.35, 0.02), 0.13, 0.01, 1.5, acc, rot=NOSE, verts=12)  # the lance
    cyl((0, 1.70, 0.02), 0.19, 0.55, drk, rot=FWD, verts=12)        # lance collar
    sphere((0, 0.45, 0.24), (0.26, 0.52, 0.18), cnp)

    # forward-swept wings
    w = box((1.00, -0.15, -0.01), (1.55, 1.30, 0.10), lit,
            rot=(0, 0, math.radians(16)), bev=0.032)
    mx(w)
    st = box((1.05, -0.62, 0.05), (1.25, 0.18, 0.07), acc,
             rot=(0, 0, math.radians(16)), bev=0.02)
    mx(st)

    # underslung gun pods
    g = cyl((1.30, 0.62, -0.02), 0.20, 1.5, low, rot=FWD, verts=12)
    mx(g)
    gm = cone((1.30, 1.46, -0.02), 0.115, 0.02, 0.28, acc, rot=NOSE, verts=12)
    mx(gm)

    n = cyl((0.52, -1.42, 0), 0.29, 1.55, low, rot=FWD, verts=14)
    mx(n)
    ns = box((0.52, -1.42, 0.26), (0.18, 1.25, 0.06), drk, bev=0.015)
    mx(ns)
    exhaust(0.52, -2.20, thr, radius=0.23, length=0.60)
    f = box((0.30, -2.00, 0.24), (0.10, 0.62, 0.46), acc,
            rot=(math.radians(17), 0, 0), bev=0.02)
    mx(f)

    camera(s, 6.0)
    lights(tint=(1.0, 0.93, 0.86))
    glare(s)
    render(s, outdir, "ships/valkyrie_lancer_sprite_3d", 256, 256)


def seraph_guard(outdir):
    """Heavy command frame: broad shielding wings, four engines, armored."""
    s = new_scene()
    lit = mat("lit", "hull_mid", 0.90, 0.24)
    low = mat("low", "hull_low", 0.94, 0.22)
    drk = mat("drk", "hull_dark", 0.88, 0.34)
    acc = mat("acc", "seraph", 0.80, 0.22, emit="seraph", emit_str=0.9)
    cnp = mat("cnp", "#243048", 0.4, 0.10, emit="seraph", emit_str=2.4)
    thr = mat("thr", "#04201C", 0.2, 0.4, emit="seraph", emit_str=8.0)

    box((0, 0.0, 0), (0.86, 2.45, 0.44), lit, bev=0.07)            # broad hull
    box((0, 1.30, 0.16), (0.62, 1.05, 0.34), low, bev=0.05)
    cone((0, 2.05, 0.04), 0.30, 0.06, 0.95, lit, rot=NOSE, verts=14)
    sphere((0, 0.50, 0.30), (0.32, 0.55, 0.20), cnp)
    # shoulder armor
    sh = box((0.80, 0.85, 0.10), (0.55, 1.5, 0.34), low, bev=0.045)
    mx(sh)

    # wide shielding wings, layered
    w = box((1.35, -0.35, -0.02), (2.05, 1.75, 0.13), lit,
            rot=(0, 0, math.radians(-9)), bev=0.04)
    mx(w)
    w2 = box((1.45, 0.15, 0.08), (1.6, 0.55, 0.11), acc,
             rot=(0, 0, math.radians(-9)), bev=0.028)
    mx(w2)
    edge = box((2.28, -0.75, 0.0), (0.20, 1.35, 0.20), drk, bev=0.035)
    mx(edge)

    # four engines
    for x in (0.42, 1.05):
        n = cyl((x, -1.42, 0), 0.26, 1.45, low, rot=FWD, verts=14)
        mx(n)
        ns = box((x, -1.42, 0.24), (0.17, 1.15, 0.06), drk, bev=0.015)
        mx(ns)
        exhaust(x, -2.14, thr, radius=0.20, length=0.52, hot=0.11)
    f = box((0.24, -1.95, 0.26), (0.10, 0.60, 0.48), acc,
            rot=(math.radians(15), 0, 0), bev=0.02)
    mx(f)

    camera(s, 6.4)
    lights(tint=(0.86, 1.0, 0.98))
    glare(s)
    render(s, outdir, "ships/seraph_guard_sprite_3d", 256, 256)


# --------------------------------------------------------------- enemies
def _hex_enemy(outdir, name, shell_k, panel_k, deep_k, core_k, hot_k, tint):
    """Shared hex-core enemy chassis; palette swap gives a related family."""
    s = new_scene()
    panel = mat("panel", panel_k, 0.85, 0.34)
    shell = mat("shell", shell_k, 0.90, 0.30)
    core = mat("core", deep_k, 0.30, 0.25, emit=core_k, emit_str=7.0)
    edge = mat("edge", core_k, 0.90, 0.20, emit=hot_k, emit_str=0.35)

    body = cyl((0, 0, 0), 1.32, 0.44, panel, verts=6, bev=0.06)
    body.rotation_euler = (0, 0, math.radians(30))
    inner = cyl((0, 0, 0.20), 0.92, 0.26, shell, verts=6, bev=0.04)
    inner.rotation_euler = (0, 0, math.radians(30))
    sphere((0, 0, 0.28), (0.46, 0.46, 0.30), core, subd=3)

    pr = box((0.88, 0.94, 0.0), (0.22, 1.15, 0.22), shell,
             rot=(0, 0, math.radians(28)), bev=0.03)
    mx(pr)
    tip = box((1.14, 1.48, 0.0), (0.11, 0.40, 0.11), edge,
              rot=(0, 0, math.radians(28)), bev=0.02)
    mx(tip)
    rs = box((0.62, -1.06, 0.0), (0.20, 0.44, 0.20), shell, bev=0.03)
    mx(rs)

    for a in range(6):
        ang = math.radians(60 * a + 30)
        box((math.cos(ang) * 1.06, math.sin(ang) * 1.06, 0.16),
            (0.10, 0.30, 0.11), edge, rot=(0, 0, ang + math.pi / 2), bev=0.015)

    camera(s, 4.0)
    lights(tint=tint)
    glare(s)
    render(s, outdir, name, 192, 192)


def enemy_drifter(outdir):
    _hex_enemy(outdir, "enemy_drifter", "d_shell", "d_panel", "d_deep",
               "d_core", "d_hot", (1.0, 0.78, 0.89))


def enemy_sine(outdir):
    _hex_enemy(outdir, "enemy_sine", "s_shell", "s_panel", "s_deep",
               "s_core", "s_hot", (0.82, 0.76, 1.0))


# --------------------------------------------------------------- boss
def boss(outdir):
    s = new_scene()
    lit = mat("lit", "b_mid", 0.92, 0.24)
    low = mat("low", "b_low", 0.90, 0.30)
    drk = mat("drk", "b_dark", 0.86, 0.38)
    core = mat("core", "#3A1E14", 0.30, 0.20, emit="b_mid", emit_str=8.0)
    glow = mat("glow", "b_dark", 0.40, 0.30, emit="b_lit", emit_str=5.0)

    box((0, 0, 0), (1.5, 4.4, 0.78), low, bev=0.09)
    box((0, 1.95, 0.34), (1.05, 1.45, 0.52), lit, bev=0.06)
    box((0, -1.60, 0.28), (1.25, 1.45, 0.56), drk, bev=0.06)

    a1 = box((2.05, 0.55, -0.04), (2.5, 3.0, 0.54), low,
             rot=(0, 0, math.radians(-8)), bev=0.07)
    mx(a1)
    a2 = box((2.45, 1.25, 0.26), (1.7, 1.45, 0.28), lit,
             rot=(0, 0, math.radians(-8)), bev=0.045)
    mx(a2)
    a3 = box((3.28, -0.78, 0.02), (1.0, 2.3, 0.44), drk,
             rot=(0, 0, math.radians(6)), bev=0.05)
    mx(a3)

    g = cyl((2.15, 2.35, 0.16), 0.42, 1.7, drk, rot=FWD, verts=14)
    mx(g)
    gm = cyl((2.15, 3.14, 0.16), 0.20, 0.28, glow, rot=FWD, verts=12, bev=0)
    mx(gm)

    cyl((0, 0.10, 0.52), 1.0, 0.46, core, verts=8, bev=0.03)
    cyl((0, 0.10, 0.40), 1.28, 0.26, lit, verts=8, bev=0.04)

    for x in (-1.5, -0.5, 0.5, 1.5):
        cyl((x, -2.48, 0), 0.34, 0.9, drk, rot=FWD, verts=12)
        cyl((x, -2.95, 0), 0.26, 0.15, glow, rot=FWD, verts=12, bev=0)

    # greebles - small panels that sell scale at sprite size
    random.seed(7)
    for _ in range(52):
        gx = random.uniform(0.18, 3.10)
        gy = random.uniform(-2.2, 2.4)
        gz = 0.42 if gx < 0.72 else 0.26
        gg = box((gx, gy, gz), (random.uniform(0.10, 0.30),
                                random.uniform(0.12, 0.44),
                                random.uniform(0.05, 0.10)),
                 drk if random.random() < 0.6 else lit, bev=0.010)
        mx(gg)

    camera(s, 11.0)
    lights(tint=(1.0, 0.90, 0.80), power=1.7)
    glare(s)
    render(s, outdir, "boss_dreadnought", 512, 384)


# --------------------------------------------------------------- background
def set_blended(m):
    """EEVEE Next defaults to dithered alpha, which erases sparse 1px stars."""
    if hasattr(m, "surface_render_method"):
        m.surface_render_method = "BLENDED"
    elif hasattr(m, "blend_method"):
        m.blend_method = "BLEND"


def _tileable_vector(nt, coord, y_radius=0.60, x_scale=None):
    """Map Y onto a circle so 3D noise is exactly periodic in Y.

    Without this the scrolling background shows a hard seam every loop.

    x_scale defaults to the circle's circumference so features stay
    isotropic - otherwise Y gets ~6x more noise variation than X and the
    nebula comes out visibly stretched sideways.
    """
    if x_scale is None:
        x_scale = TAU * y_radius
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord, sep.inputs["Vector"])

    ang = nt.nodes.new("ShaderNodeMath")
    ang.operation = "MULTIPLY"
    ang.inputs[1].default_value = TAU
    nt.links.new(sep.outputs["Y"], ang.inputs[0])

    sn = nt.nodes.new("ShaderNodeMath")
    sn.operation = "SINE"
    nt.links.new(ang.outputs[0], sn.inputs[0])
    sr = nt.nodes.new("ShaderNodeMath")
    sr.operation = "MULTIPLY"
    sr.inputs[1].default_value = y_radius
    nt.links.new(sn.outputs[0], sr.inputs[0])

    cs = nt.nodes.new("ShaderNodeMath")
    cs.operation = "COSINE"
    nt.links.new(ang.outputs[0], cs.inputs[0])
    cr = nt.nodes.new("ShaderNodeMath")
    cr.operation = "MULTIPLY"
    cr.inputs[1].default_value = y_radius
    nt.links.new(cs.outputs[0], cr.inputs[0])

    xs = nt.nodes.new("ShaderNodeMath")
    xs.operation = "MULTIPLY"
    xs.inputs[1].default_value = x_scale
    nt.links.new(sep.outputs["X"], xs.inputs[0])

    comb = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(xs.outputs[0], comb.inputs["X"])
    nt.links.new(sr.outputs[0], comb.inputs["Y"])
    nt.links.new(cr.outputs[0], comb.inputs["Z"])
    return comb.outputs["Vector"]


def _star_layer(nt, vec, scale, threshold, color_key):
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = 2.0
    nt.links.new(vec, n.inputs["Vector"])
    r = nt.nodes.new("ShaderNodeValToRGB")
    r.color_ramp.interpolation = "CONSTANT"
    r.color_ramp.elements[0].position = 0.0
    r.color_ramp.elements[0].color = (0, 0, 0, 0)
    r.color_ramp.elements[1].position = threshold
    r.color_ramp.elements[1].color = C(color_key)
    nt.links.new(n.outputs["Fac"], r.inputs["Fac"])
    return r


def background_far(outdir):
    """Opaque nebula + dense fine stars. Tiles seamlessly in Y."""
    s = new_scene()
    bpy.ops.mesh.primitive_plane_add(size=12)
    pl = bpy.context.object
    m = bpy.data.materials.new("nebula")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emis = nt.nodes.new("ShaderNodeEmission")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    vec = _tileable_vector(nt, tc.outputs["Generated"])

    neb = nt.nodes.new("ShaderNodeTexNoise")
    neb.inputs["Scale"].default_value = 1.1
    neb.inputs["Detail"].default_value = 9.0
    neb.inputs["Roughness"].default_value = 0.62
    nt.links.new(vec, neb.inputs["Vector"])

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "EASE"
    ramp.color_ramp.elements[0].position = 0.30
    ramp.color_ramp.elements[0].color = C("void")
    ramp.color_ramp.elements[1].position = 0.74
    ramp.color_ramp.elements[1].color = C("neb_hi")
    ramp.color_ramp.elements.new(0.54).color = C("neb_mid")
    nt.links.new(neb.outputs["Fac"], ramp.inputs["Fac"])

    stars = _star_layer(nt, vec, 30.0, 0.76, "star")
    faint = _star_layer(nt, vec, 52.0, 0.79, "star_cool")

    a1 = nt.nodes.new("ShaderNodeMixRGB")
    a1.blend_type = "ADD"
    a1.inputs["Fac"].default_value = 1.0
    nt.links.new(ramp.outputs["Color"], a1.inputs["Color1"])
    nt.links.new(stars.outputs["Color"], a1.inputs["Color2"])

    a2 = nt.nodes.new("ShaderNodeMixRGB")
    a2.blend_type = "ADD"
    a2.inputs["Fac"].default_value = 0.55
    nt.links.new(a1.outputs["Color"], a2.inputs["Color1"])
    nt.links.new(faint.outputs["Color"], a2.inputs["Color2"])

    nt.links.new(a2.outputs["Color"], emis.inputs["Color"])
    nt.links.new(emis.outputs["Emission"], out.inputs["Surface"])
    pl.data.materials.append(m)

    camera(s, 12.0)
    glare(s, threshold=0.8, size=6, mix=-0.4)
    render(s, outdir, "background_far", 512, 512, transparent=False)


def background_near(outdir):
    """Transparent parallax layer: sparse bright stars only."""
    s = new_scene()
    bpy.ops.mesh.primitive_plane_add(size=12)
    pl = bpy.context.object
    m = bpy.data.materials.new("nearstars")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emis = nt.nodes.new("ShaderNodeEmission")
    emis.inputs["Strength"].default_value = 1.6
    trans = nt.nodes.new("ShaderNodeBsdfTransparent")
    mixs = nt.nodes.new("ShaderNodeMixShader")

    tc = nt.nodes.new("ShaderNodeTexCoord")
    vec = _tileable_vector(nt, tc.outputs["Generated"])
    big = _star_layer(nt, vec, 13.0, 0.74, "star")

    # alpha follows the star mask so the layer stays transparent between stars
    lum = nt.nodes.new("ShaderNodeRGBToBW")
    nt.links.new(big.outputs["Color"], lum.inputs["Color"])
    nt.links.new(big.outputs["Color"], emis.inputs["Color"])
    nt.links.new(trans.outputs["BSDF"], mixs.inputs[1])
    nt.links.new(emis.outputs["Emission"], mixs.inputs[2])
    nt.links.new(lum.outputs["Val"], mixs.inputs["Fac"])
    nt.links.new(mixs.outputs["Shader"], out.inputs["Surface"])
    set_blended(m)
    pl.data.materials.append(m)

    camera(s, 12.0)
    glare(s, threshold=0.75, size=5, mix=-0.35)
    render(s, outdir, "background_near", 512, 512, transparent=True)


# --------------------------------------------------------------- main
TARGETS = (
    astra_interceptor, valkyrie_lancer, seraph_guard,
    enemy_drifter, enemy_sine, boss,
    background_far, background_near,
)

if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    default = os.path.join(here, "rhythm-jet-squadron", "public", "assets", "shmup")
    outdir = argv[0] if argv else default
    os.makedirs(os.path.join(outdir, "ships"), exist_ok=True)
    print("OUTDIR", outdir)
    for fn in TARGETS:
        fn(outdir)
    print("ALL DONE")
