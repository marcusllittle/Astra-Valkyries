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
    # bosses - palettes match each map's bossPrimary/bossSecondary in
    # shmupWaves.ts so the sprite sits inside the zone's color language
    # Aegis Dreadnought (nebula-runway): violet fortress, pink/orange power
    "a_hull":    "#3A2A5E",
    "a_deck":    "#55407F",
    "a_dark":    "#140C2E",
    "a_prime":   "#FF6B9D",
    "a_second":  "#FF922B",
    "a_hot":     "#FFF4E6",
    # Helios Tyrant (solar-rift): scorched platform, solar gold/red
    "t_hull":    "#5E1F10",
    "t_deck":    "#8A3A1C",
    "t_dark":    "#1E0906",
    "t_prime":   "#FF6B6B",
    "t_second":  "#FFA94D",
    "t_hot":     "#FFD166",
    # Cryo Leviathan (abyss-crown): biomech ice, cyan power
    "l_body":    "#22405E",
    "l_plate":   "#3A6690",
    "l_dark":    "#081422",
    "l_prime":   "#4DABF7",
    "l_second":  "#74C0FC",
    "l_hot":     "#D0EBFF",
    # power chip (power_chip.svg)
    "chip_gold": "#FFD43B",
    "chip_hot":  "#FFF7C2",
    "chip_deep": "#9A6400",
    # Enemy roster. Hues match ENEMY_COLORS/ENEMY_CORE_DARK in
    # ShmupPlayScreen so rendered sprites agree with the procedural
    # fallbacks, glow tints and bullet colors already in the game.
    "z_hot":     "#FFC078",   # zigzag  #ff922b
    "z_core":    "#FF922B",
    "z_deep":    "#B06010",
    "z_shell":   "#2A1606",
    "o_hot":     "#D0EBFF",   # orbiter #74c0fc
    "o_core":    "#74C0FC",
    "o_deep":    "#3070A0",
    "o_shell":   "#0A1E2E",
    "c_hot":     "#FFC9C9",   # charger #ff6b6b
    "c_core":    "#FF6B6B",
    "c_deep":    "#A03030",
    "c_shell":   "#2A0E0E",
    "p_hot":     "#B2F2BB",   # splitter #69db7c
    "p_core":    "#69DB7C",
    "p_deep":    "#2B8A3E",
    "p_shell":   "#0B2412",
    "m_hot":     "#FFE8CC",   # bomber  #ffa94d
    "m_core":    "#FFA94D",
    "m_deep":    "#B06010",
    "m_shell":   "#2A1A08",
    "n_hot":     "#FF8787",   # sniper  #ff0000
    "n_core":    "#FF2222",
    "n_deep":    "#800000",
    "n_shell":   "#240404",
    "w_hot":     "#E9ECEF",   # swarm   #adb5bd
    "w_core":    "#ADB5BD",
    "w_deep":    "#495057",
    "w_shell":   "#16191C",
    "r_hot":     "#FFD8A8",   # dreadnought - elite capital escort
    "r_core":    "#FF922B",
    "r_deep":    "#7A3E12",
    "r_shell":   "#1A1014",
    "r_plate":   "#4A3550",
    # tank fortress miniboss - matches the game's tank enemy cyan #66d9ef
    "k_hull":    "#33454F",
    "k_deck":    "#4A616E",
    "k_dark":    "#101B21",
    "k_glow":    "#66D9EF",
    "k_hot":     "#D4F6FF",
    # zone background palettes (solar-rift / abyss-crown from shmupWaves)
    "sol_void":  "#120402",
    "sol_mid":   "#3B1007",
    "sol_hi":    "#8A3A1C",
    "sol_star":  "#FFE9D9",
    "sol_star2": "#FFA94D",
    "aby_void":  "#02060D",
    "aby_mid":   "#0A1C33",
    "aby_hi":    "#1E4A73",
    "aby_star":  "#D0EBFF",
    "aby_star2": "#74C0FC",
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


def camera(scene, ortho_scale, z=16, cy=0.0):
    """cy re-centers the frame on the subject; long hulls are not centered
    on the origin, so without it the prow or engines fall off the edge."""
    bpy.ops.object.camera_add(location=(0, cy, z))
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

    box((0, 0.10, 0), (0.62, 2.6, 0.40), lit, bev=0.06)          # spine
    cone((0, 1.92, 0), 0.31, 0.03, 1.1, lit, rot=NOSE, verts=14)  # nose
    box((0, 1.30, 0.16), (0.28, 1.0, 0.12), low, bev=0.03)        # dorsal strake
    sphere((0, 0.60, 0.26), (0.30, 0.64, 0.20), cnp)              # canopy

    w = box((0.98, -0.30, -0.01), (1.6, 1.4, 0.14), lit,
            rot=(0, 0, math.radians(-21)), bev=0.04)
    mx(w)
    t = box((1.04, 0.28, 0.07), (1.3, 0.22, 0.08), low,
            rot=(0, 0, math.radians(-21)), bev=0.02)
    mx(t)
    p = box((1.68, -0.62, 0.0), (0.19, 1.05, 0.17), drk, bev=0.03)
    mx(p)

    n = cyl((0.50, -1.38, 0), 0.30, 1.45, low, rot=FWD, verts=14)
    mx(n)
    ns = box((0.50, -1.38, 0.27), (0.20, 1.2, 0.07), drk, bev=0.015)  # top strip
    mx(ns)
    exhaust(0.50, -2.10, thr, radius=0.24, length=0.60)
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

    box((0, -0.05, 0), (0.78, 2.5, 0.46), lit, bev=0.065)          # spine
    box((0, 1.15, 0.08), (0.56, 1.3, 0.38), low, bev=0.05)         # forward deck
    cone((0, 2.35, 0.02), 0.16, 0.01, 1.5, acc, rot=NOSE, verts=12)  # the lance
    cyl((0, 1.70, 0.02), 0.24, 0.55, drk, rot=FWD, verts=12)        # lance collar
    sphere((0, 0.45, 0.30), (0.32, 0.58, 0.21), cnp)

    # forward-swept wings
    w = box((1.06, -0.15, -0.01), (1.65, 1.55, 0.16), lit,
            rot=(0, 0, math.radians(16)), bev=0.045)
    mx(w)
    st = box((1.11, -0.66, 0.09), (1.35, 0.24, 0.09), acc,
             rot=(0, 0, math.radians(16)), bev=0.022)
    mx(st)

    # underslung gun pods
    g = cyl((1.38, 0.62, -0.02), 0.26, 1.5, low, rot=FWD, verts=12)
    mx(g)
    gm = cone((1.38, 1.48, -0.02), 0.15, 0.02, 0.30, acc, rot=NOSE, verts=12)
    mx(gm)

    n = cyl((0.60, -1.42, 0), 0.35, 1.55, low, rot=FWD, verts=14)
    mx(n)
    ns = box((0.60, -1.42, 0.31), (0.22, 1.25, 0.07), drk, bev=0.015)
    mx(ns)
    exhaust(0.60, -2.22, thr, radius=0.28, length=0.65)
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

    box((0, 0.0, 0), (1.02, 2.45, 0.54), lit, bev=0.08)            # broad hull
    box((0, 1.30, 0.20), (0.76, 1.05, 0.42), low, bev=0.06)
    cone((0, 2.05, 0.05), 0.38, 0.08, 0.95, lit, rot=NOSE, verts=14)
    sphere((0, 0.50, 0.38), (0.38, 0.60, 0.23), cnp)
    # shoulder armor
    sh = box((0.92, 0.85, 0.14), (0.66, 1.5, 0.42), low, bev=0.055)
    mx(sh)

    # wide shielding wings, layered
    w = box((1.45, -0.35, -0.02), (2.15, 1.95, 0.20), lit,
            rot=(0, 0, math.radians(-9)), bev=0.05)
    mx(w)
    w2 = box((1.55, 0.20, 0.13), (1.7, 0.65, 0.14), acc,
             rot=(0, 0, math.radians(-9)), bev=0.032)
    mx(w2)
    edge = box((2.42, -0.80, 0.0), (0.26, 1.5, 0.26), drk, bev=0.04)
    mx(edge)

    # four engines
    for x in (0.48, 1.16):
        n = cyl((x, -1.42, 0), 0.31, 1.45, low, rot=FWD, verts=14)
        mx(n)
        ns = box((x, -1.42, 0.28), (0.20, 1.15, 0.07), drk, bev=0.015)
        mx(ns)
        exhaust(x, -2.16, thr, radius=0.24, length=0.56, hot=0.13)
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


# --------------------------------------------------------------- bosses
# All bosses hang at the top of the screen facing the player, so weapons
# point -Y (down) and engines point +Y - the opposite of player ships.

def boss_aegis(outdir):
    """Aegis Dreadnought - armored patrol fortress, layered shields.

    Lore: 'massive capital ship bristling with weapons... layered shield
    system'. Violet fortress hull, pink reactor, orange gun glow.
    """
    s = new_scene()
    lit = mat("lit", "a_deck", 0.92, 0.26)
    low = mat("low", "a_hull", 0.90, 0.32)
    drk = mat("drk", "a_dark", 0.86, 0.38)
    core = mat("core", "a_dark", 0.30, 0.20, emit="a_prime", emit_str=9.0)
    guns = mat("guns", "a_dark", 0.40, 0.30, emit="a_second", emit_str=6.0)
    shld = mat("shld", "a_dark", 0.40, 0.25, emit="a_prime", emit_str=3.0)

    # central spine, prow toward the player (-Y) - long capital-ship keel
    box((0, 0.2, 0), (1.6, 7.4, 0.92), low, bev=0.10)
    box((0, -2.85, 0.30), (1.15, 2.4, 0.60), lit, bev=0.07)    # forward deck
    box((0, -4.15, 0.16), (0.82, 1.5, 0.44), drk, bev=0.05)    # prow shoulder
    cone((0, -5.35, 0.10), 0.62, 0.16, 1.5, drk, rot=FWD, verts=8)  # ram prow
    box((0, 2.95, 0.36), (1.3, 2.3, 0.58), drk, bev=0.07)      # aft castle
    sphere((0, 1.9, 0.72), (0.52, 0.60, 0.38), lit)            # command dome
    # dorsal spine rail running the length of the keel
    box((0, 0.1, 0.54), (0.34, 6.2, 0.20), drk, bev=0.03)

    # layered armor shoulders, stretched along the hull
    a1 = box((2.15, 0.35, -0.04), (2.6, 5.0, 0.58), low,
             rot=(0, 0, math.radians(5)), bev=0.08)
    mx(a1)
    a2 = box((2.55, -1.25, 0.28), (1.8, 2.3, 0.30), lit,
             rot=(0, 0, math.radians(5)), bev=0.05)
    mx(a2)
    a3 = box((3.45, 1.15, 0.02), (1.05, 3.6, 0.48), drk,
             rot=(0, 0, math.radians(-4)), bev=0.05)
    mx(a3)
    # sponson fins breaking up the flank silhouette
    for fy in (-1.8, 0.4, 2.4):
        fs = box((3.05, fy, 0.24), (1.5, 0.42, 0.22), lit,
                 rot=(0, 0, math.radians(-4)), bev=0.03)
        mx(fs)

    # quad turret batteries, barrels toward player
    for tx, ty in ((1.35, -2.4), (2.5, -0.9), (1.35, 1.1)):
        tb = cyl((tx, ty, 0.45), 0.44, 0.4, drk, verts=10)
        mx(tb)
        for bx in (-0.16, 0.16):
            br = cyl((tx + bx, ty - 0.75, 0.5), 0.09, 1.1, lit, rot=FWD,
                     verts=8, bev=0)
            mx(br)
        mz = cyl((tx, ty - 1.32, 0.5), 0.15, 0.14, guns, verts=8, bev=0)
        mx(mz)

    # pink reactor octagon amidships
    cyl((0, 0.10, 0.56), 1.05, 0.48, core, verts=8, bev=0.03)
    cyl((0, 0.10, 0.44), 1.35, 0.26, lit, verts=8, bev=0.04)

    # shield emitter posts along the leading edge - the 'layered shields'
    for ex in (0.55, 1.35, 2.15):
        em = cyl((ex, -3.45 + ex * 0.28, 0.42), 0.13, 0.5, shld, verts=8, bev=0)
        mx(em)

    # engine bank aft (+Y), tucked against the stern castle
    for x in (-1.6, -0.55, 0.55, 1.6):
        cyl((x, 4.15, 0), 0.36, 1.0, drk, rot=FWD, verts=12)
        cyl((x, 4.70, 0), 0.27, 0.15, guns, rot=FWD, verts=12, bev=0)

    # greebles constrained to actual hull decks so none float in space
    random.seed(11)
    for _ in range(88):
        gx = random.uniform(0.2, 2.95)
        if gx < 0.78:
            gy, gz = random.uniform(-3.4, 3.2), 0.48      # spine deck
        else:
            gy, gz = random.uniform(-2.4, 2.8), 0.28      # armor wing
        gg = box((gx, gy, gz), (random.uniform(0.10, 0.30),
                                random.uniform(0.12, 0.42),
                                random.uniform(0.05, 0.10)),
                 drk if random.random() < 0.6 else lit, bev=0.010)
        mx(gg)

    # Portrait frame: this is a long capital ship bearing down on the player,
    # so the sprite is taller than wide and the game reads its natural aspect.
    camera(s, 12.4, cy=-0.5)
    lights(tint=(1.0, 0.82, 0.92), power=1.8)
    glare(s)
    render(s, outdir, "boss_aegis_dreadnought", 592, 832)


def boss_tyrant(outdir):
    """Helios Tyrant - radial solar weapons platform.

    Lore: 'harnesses solar energy to power devastating beam weapons'.
    Radial collector vanes around a molten core, twin beam cannons.
    """
    s = new_scene()
    lit = mat("lit", "t_deck", 0.92, 0.28)
    low = mat("low", "t_hull", 0.90, 0.32)
    drk = mat("drk", "t_dark", 0.86, 0.38)
    core = mat("core", "t_dark", 0.30, 0.20, emit="t_hot", emit_str=5.0)
    beam = mat("beam", "t_dark", 0.40, 0.30, emit="t_prime", emit_str=8.0)
    vane = mat("vane", "t_hull", 0.85, 0.30, emit="t_second", emit_str=0.35)

    # ring hull around the core, with dark armor wedges for contrast
    cyl((0, 0, 0), 2.35, 0.5, low, verts=16, bev=0.07)
    cyl((0, 0, 0.18), 1.75, 0.42, drk, verts=16, bev=0.05)
    for a in range(8):
        ang = math.radians(45 * a)
        box((math.cos(ang) * 2.0, math.sin(ang) * 2.0, 0.30),
            (0.72, 0.55, 0.14), drk, rot=(0, 0, ang), bev=0.03)

    # molten solar core
    sphere((0, 0, 0.42), (0.85, 0.85, 0.48), core)
    cyl((0, 0, 0.30), 1.30, 0.24, lit, verts=8, bev=0.04)

    # 8 radial collector vanes, alternating long and short
    for a in range(8):
        ang = math.radians(45 * a + 22.5)
        length = 2.3 if a % 2 == 0 else 1.5
        d = 2.1 + length / 2
        box((math.cos(ang) * d, math.sin(ang) * d, 0.05),
            (length, 0.62, 0.18), vane,
            rot=(0, 0, ang), bev=0.035)
        tip = 2.1 + length + 0.02
        box((math.cos(ang) * tip, math.sin(ang) * tip, 0.05),
            (0.30, 0.34, 0.22), lit, rot=(0, 0, ang), bev=0.02)

    # twin heavy beam cannons toward the player - long barrels for reach
    g = cyl((1.2, -2.9, 0.2), 0.40, 4.1, drk, rot=FWD, verts=12)
    mx(g)
    gs = box((1.2, -2.9, 0.42), (0.30, 3.6, 0.14), lit, bev=0.02)
    mx(gs)
    gm = cone((1.2, -5.2, 0.2), 0.36, 0.16, 0.6, beam, rot=FWD, verts=12)
    mx(gm)
    # cannon yokes
    yk = box((1.2, -1.15, 0.3), (0.68, 0.95, 0.5), lit, bev=0.05)
    mx(yk)

    # aft stabilizer fins (+Y)
    fn = box((0.8, 2.75, 0.1), (0.5, 1.5, 0.2), low,
             rot=(0, 0, math.radians(18)), bev=0.03)
    mx(fn)

    random.seed(23)
    for _ in range(36):
        ang = random.uniform(0, TAU)
        d = random.uniform(1.15, 2.2)
        box((math.cos(ang) * d, math.sin(ang) * d, 0.34),
            (random.uniform(0.10, 0.28), random.uniform(0.10, 0.28),
             random.uniform(0.04, 0.09)),
            drk if random.random() < 0.5 else lit, bev=0.008)

    camera(s, 10.2, cy=-1.0)
    lights(tint=(1.0, 0.74, 0.55), power=1.4)
    glare(s, threshold=0.72, size=8, mix=-0.3)
    render(s, outdir, "boss_helios_tyrant", 736, 768)


def boss_leviathan(outdir):
    """Cryo Leviathan - biomechanical horror, crystalline armor.

    Lore: 'biomechanical horror... crystalline armor regenerates from
    ambient cold energy'. Central skull with twin serpentine necks arcing
    outward, ice-crystal shards, cyan power veins.
    """
    s = new_scene()
    body = mat("body", "l_body", 0.75, 0.35)
    plate = mat("plate", "l_plate", 0.85, 0.28)
    drk = mat("drk", "l_dark", 0.80, 0.40)
    # emission kept moderate so the cyan HUE survives bloom instead of
    # washing out to white
    vein = mat("vein", "l_dark", 0.30, 0.20, emit="l_prime", emit_str=3.2)
    ice = mat("ice", "l_second", 0.35, 0.12, emit="l_second", emit_str=0.6)
    eye = mat("eye", "l_dark", 0.30, 0.20, emit="l_prime", emit_str=9.0)

    # shoulder mass joining the necks - angled pauldrons, not a slab
    box((0, 0.55, 0), (1.9, 1.15, 0.55), body, bev=0.14)
    pd = box((0.85, 0.72, 0.30), (0.85, 0.75, 0.30), plate,
             rot=(0, 0, math.radians(24)), bev=0.06)
    mx(pd)
    nape = cyl((0, 0.85, 0.30), 0.52, 0.22, plate, verts=6, bev=0.04)
    nape.rotation_euler = (0, 0, math.radians(90))
    nape.scale = (1.0, 0.78, 1.0)
    # cyan chest core between shoulders and skull
    sphere((0, -0.12, 0.36), (0.32, 0.32, 0.24), vein, subd=3)

    # central skull facing the player
    sphere((0, -0.85, 0), (0.98, 1.05, 0.62), body)
    box((0, -0.72, 0.36), (0.78, 0.68, 0.24), drk, bev=0.05)   # crown plate
    box((0, -1.18, 0.32), (0.80, 0.26, 0.15), drk, bev=0.03)   # brow ridge
    # mandible tusks flanking the mouth, clearly forward of the skull
    jw = box((0.44, -1.82, 0.18), (0.22, 0.95, 0.18), plate,
             rot=(0, 0, math.radians(-20)), bev=0.03)
    mx(jw)
    # horns sweeping wide out and back
    hn = cone((0.85, -0.35, 0.35), 0.21, 0.02, 1.45, ice,
              rot=(math.radians(55), 0, math.radians(-52)), verts=8)
    mx(hn)
    # eyes under the brow
    ey = sphere((0.38, -1.42, 0.34), (0.17, 0.16, 0.14), eye, subd=2)
    mx(ey)
    # breath charge in the mouth
    cone((0, -1.95, 0.05), 0.30, 0.06, 0.55, vein, rot=FWD, verts=10)

    # twin serpentine necks arcing up and outward (mirrored)
    n_seg = 9
    pts = []
    for i in range(n_seg):
        t = i / (n_seg - 1)
        sx = 0.55 + 2.35 * t
        sy = 0.75 + 2.6 * t * (1.35 - t)
        r = 0.55 - 0.24 * t
        pts.append((sx, sy, r))
        # alternate armor banding along the neck
        sg = sphere((sx, sy, 0.05), (r, r * 0.92, r * 0.7),
                    plate if i % 2 else body, subd=3)
        mx(sg)
        if i % 2 == 1:
            # dorsal ice shard on every other segment
            sh = cone((sx, sy, 0.7 * r + 0.30), r * 0.42, 0.02, 1.0, ice,
                      rot=(math.radians(-14 + 26 * t), math.radians(20), 0),
                      verts=8)
            mx(sh)
    # cyan power veins riding the top of the neck joints
    for i in range(1, n_seg):
        (x0, y0, r0), (x1, y1, r1) = pts[i - 1], pts[i]
        vx, vy = (x0 + x1) / 2, (y0 + y1) / 2
        vr = (r0 + r1) / 2
        vn = sphere((vx, vy, vr * 0.55), (vr * 0.34,) * 3, vein, subd=2)
        mx(vn)

    # neck-tip claws: three talons pointing out and down
    tipx, tipy = pts[-1][0], pts[-1][1]
    for k, (dx, dy) in enumerate(((-0.10, 0.42), (0.30, 0.28), (0.10, -0.10))):
        cl = cone((tipx + dx, tipy + dy, 0.12), 0.16, 0.01, 0.95, ice,
                  rot=(math.radians(-115), 0, math.radians(-30 + k * 30)),
                  verts=8)
        mx(cl)

    # Armored abdomen trailing aft. Overlapping wide-and-flat segments, not
    # a bead stack - from overhead a chain of spheres reads as a totem pole.
    for i in range(4):
        t = i / 3
        ty = 1.45 + t * 2.5
        w = 1.55 - 0.72 * t
        sphere((0, ty, 0.0), (w, 0.85 - 0.26 * t, 0.42 - 0.14 * t), body, subd=3)
        # dorsal carapace: a hex disc reads as shell, a box reads as cargo
        cp = cyl((0, ty - 0.12, 0.26 - 0.07 * t), w * 0.62, 0.18, plate,
                 verts=6, bev=0.04)
        cp.rotation_euler = (0, 0, math.radians(90))
        cp.scale = (1.0, 0.72, 1.0)
        sphere((0, ty + 0.35, 0.22), (0.20 - 0.04 * t,) * 3, vein, subd=2)
        # flank spines
        sp = cone((w * 0.85, ty, 0.05), 0.16 - 0.03 * t, 0.01, 0.85, ice,
                  rot=(math.radians(90), 0, math.radians(-70 - 12 * t)), verts=8)
        mx(sp)
    # tail fluke
    tf = box((0.55, 4.35, 0.02), (0.55, 1.05, 0.14), plate,
             rot=(0, 0, math.radians(-34)), bev=0.03)
    mx(tf)

    camera(s, 10.2, cy=1.05)
    lights(tint=(0.68, 0.86, 1.0), power=1.5)
    glare(s, threshold=0.55, size=8, mix=-0.25)
    render(s, outdir, "boss_cryo_leviathan", 768, 736)


# --------------------------------------------------------------- roster
# Every enemy's silhouette telegraphs its behaviour. Nine of these patterns
# previously shared one sprite, so a sniper and a bomber looked identical
# and the player had no way to read the threat before it acted.

def enemy_zigzag(outdir):
    """Erratic fast dart - swept chevron wings, nose-heavy."""
    s = new_scene()
    shell = mat("shell", "z_shell", 0.88, 0.32)
    deep = mat("deep", "z_deep", 0.90, 0.28)
    core = mat("core", "z_deep", 0.30, 0.22, emit="z_core", emit_str=6.5)
    edge = mat("edge", "z_core", 0.90, 0.22, emit="z_hot", emit_str=0.5)

    box((0, 0.1, 0), (0.52, 1.9, 0.34), deep, bev=0.06)
    cone((0, 1.35, 0), 0.30, 0.02, 1.0, shell, rot=NOSE, verts=10)
    sphere((0, 0.25, 0.22), (0.30, 0.42, 0.20), core)
    # hard chevron wings, sharply swept back
    w = box((0.95, -0.30, 0), (1.5, 0.42, 0.16), shell,
            rot=(0, 0, math.radians(-38)), bev=0.03)
    mx(w)
    w2 = box((0.72, -0.85, 0.04), (1.0, 0.30, 0.12), edge,
             rot=(0, 0, math.radians(-38)), bev=0.02)
    mx(w2)
    t = box((0.30, -1.05, 0.10), (0.16, 0.60, 0.36), deep,
            rot=(math.radians(18), 0, 0), bev=0.02)
    mx(t)
    exhaust(0.30, -1.05, core, radius=0.16, length=0.42, hot=0.09)

    camera(s, 3.9)
    lights(tint=(1.0, 0.88, 0.7))
    glare(s)
    render(s, outdir, "enemy_zigzag", 192, 192)


def enemy_orbiter(outdir):
    """Circles the player - a spinning ring of vanes around a bright eye."""
    s = new_scene()
    shell = mat("shell", "o_shell", 0.88, 0.30)
    deep = mat("deep", "o_deep", 0.90, 0.26)
    core = mat("core", "o_shell", 0.30, 0.20, emit="o_core", emit_str=8.0)
    edge = mat("edge", "o_core", 0.88, 0.22, emit="o_hot", emit_str=0.6)

    cyl((0, 0, 0), 0.72, 0.42, deep, verts=12, bev=0.05)
    sphere((0, 0, 0.24), (0.44, 0.44, 0.30), core)
    # orbital vane ring - reads as rotation even when still
    for a in range(6):
        ang = math.radians(60 * a)
        box((math.cos(ang) * 1.12, math.sin(ang) * 1.12, 0.02),
            (0.78, 0.24, 0.13), shell,
            rot=(0, 0, ang + math.radians(34)), bev=0.03)
        box((math.cos(ang) * 1.46, math.sin(ang) * 1.46, 0.02),
            (0.24, 0.20, 0.16), edge,
            rot=(0, 0, ang + math.radians(34)), bev=0.02)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.95, minor_radius=0.06,
                                     location=(0, 0, 0.04))
    bpy.context.object.data.materials.append(edge)

    camera(s, 3.9)
    lights(tint=(0.78, 0.9, 1.0))
    glare(s)
    render(s, outdir, "enemy_orbiter", 192, 192)


def enemy_charger(outdir):
    """Rams the player - heavy armoured wedge with a forward ram spike."""
    s = new_scene()
    shell = mat("shell", "c_shell", 0.88, 0.34)
    deep = mat("deep", "c_deep", 0.90, 0.28)
    core = mat("core", "c_shell", 0.30, 0.20, emit="c_core", emit_str=7.0)
    edge = mat("edge", "c_core", 0.90, 0.22, emit="c_hot", emit_str=0.25)

    # Blunt armoured prow: a battering ram reads as mass, so the nose stays
    # wide and truncated. A sharp spire just reads as a roofline.
    # Armour is the LIGHT value and the hull behind it is dark, so the ram
    # face catches the key light and reads as the business end.
    box((0, -0.15, 0), (1.15, 1.25, 0.46), shell, bev=0.09)
    cone((0, 0.82, 0), 0.88, 0.50, 0.95, deep, rot=NOSE, verts=8)
    cyl((0, 1.36, 0), 0.38, 0.34, deep, rot=FWD, verts=8, bev=0.06)
    cone((0, 1.72, 0), 0.30, 0.06, 0.48, edge, rot=NOSE, verts=8)  # ram tip
    # flank armour swept back off the shoulders
    br = box((0.74, 0.22, 0.10), (0.32, 1.20, 0.34), deep,
             rot=(0, 0, math.radians(13)), bev=0.04)
    mx(br)
    sphere((0, -0.30, 0.28), (0.34, 0.34, 0.22), core)
    fl = box((0.92, -0.55, 0.02), (0.30, 0.95, 0.30), deep, bev=0.04)
    mx(fl)
    exhaust(0.48, -0.85, core, radius=0.22, length=0.48, hot=0.11)

    camera(s, 4.1)
    lights(tint=(1.0, 0.8, 0.8))
    glare(s)
    render(s, outdir, "enemy_charger", 192, 192)


def enemy_splitter(outdir):
    """Breaks into halves when killed - a visible seam splits the hull."""
    s = new_scene()
    shell = mat("shell", "p_shell", 0.88, 0.32)
    deep = mat("deep", "p_deep", 0.90, 0.26)
    core = mat("core", "p_shell", 0.30, 0.20, emit="p_core", emit_str=7.5)
    edge = mat("edge", "p_core", 0.88, 0.22, emit="p_hot", emit_str=0.5)

    # two mirrored half-shells with a lit gap down the middle
    h = cyl((0.46, 0, 0), 0.92, 0.46, deep, verts=8, bev=0.06)
    h.scale = (0.92, 1.0, 1.0)
    mx(h)
    hp = box((0.62, 0.15, 0.26), (0.62, 0.95, 0.20), shell,
             rot=(0, 0, math.radians(-8)), bev=0.04)
    mx(hp)
    # the seam: exposed core running the full length
    box((0, 0, 0.06), (0.20, 1.85, 0.40), core, bev=0.03)
    sphere((0, 0.05, 0.30), (0.26, 0.40, 0.22), core)
    # split-line indicator clamps
    for gy in (-0.62, 0.0, 0.62):
        cl = box((0.30, gy, 0.30), (0.34, 0.16, 0.18), edge, bev=0.02)
        mx(cl)
    exhaust(0.52, -0.98, core, radius=0.18, length=0.40, hot=0.09)

    camera(s, 4.2)
    lights(tint=(0.82, 1.0, 0.85))
    glare(s)
    render(s, outdir, "enemy_splitter", 192, 192)


def enemy_bomber(outdir):
    """Drops payloads - fat body with visible bomb pods slung underneath."""
    s = new_scene()
    shell = mat("shell", "m_shell", 0.88, 0.34)
    deep = mat("deep", "m_deep", 0.90, 0.28)
    core = mat("core", "m_shell", 0.30, 0.20, emit="m_core", emit_str=7.0)
    edge = mat("edge", "m_core", 0.88, 0.22, emit="m_hot", emit_str=0.5)

    # bulbous fuselage
    sphere((0, 0, 0), (0.95, 1.30, 0.52), deep)
    box((0, 0.35, 0.30), (0.85, 0.90, 0.26), shell, bev=0.06)
    cone((0, 1.18, 0.05), 0.48, 0.12, 0.70, shell, rot=NOSE, verts=10)
    # Payload pods flank the hull rather than hang below it - slung
    # underneath they are invisible to an overhead camera, killing the tell.
    for px in (0.66, 1.12):
        pod = sphere((px, -0.28, 0.12), (0.30, 0.52, 0.30), shell)
        mx(pod)
        lamp = sphere((px, -0.72, 0.16), (0.17, 0.17, 0.15), core, subd=2)
        mx(lamp)
    # stubby wings
    w = box((1.10, 0.15, 0.02), (0.85, 0.62, 0.16), deep,
            rot=(0, 0, math.radians(-8)), bev=0.04)
    mx(w)
    st = box((1.15, 0.42, 0.12), (0.70, 0.20, 0.10), edge,
             rot=(0, 0, math.radians(-8)), bev=0.02)
    mx(st)
    sphere((0, 0.30, 0.44), (0.24, 0.32, 0.16), core)
    exhaust(0.40, -1.15, core, radius=0.22, length=0.46, hot=0.11)

    camera(s, 4.5)
    lights(tint=(1.0, 0.9, 0.74))
    glare(s)
    render(s, outdir, "enemy_bomber", 192, 192)


def enemy_sniper(outdir):
    """Long-range shot - thin body dominated by one oversized barrel."""
    s = new_scene()
    shell = mat("shell", "n_shell", 0.88, 0.32)
    deep = mat("deep", "n_deep", 0.90, 0.28)
    core = mat("core", "n_shell", 0.30, 0.18, emit="n_core", emit_str=9.0)
    edge = mat("edge", "n_core", 0.88, 0.20, emit="n_hot", emit_str=0.6)

    # slim spine
    box((0, -0.35, 0), (0.42, 1.35, 0.30), deep, bev=0.05)
    # the barrel - unmistakably a long gun
    cyl((0, 0.95, 0.04), 0.17, 2.15, shell, rot=FWD, verts=10)
    box((0, 0.95, 0.22), (0.13, 1.85, 0.07), deep, bev=0.02)
    cone((0, 2.12, 0.04), 0.20, 0.09, 0.34, edge, rot=NOSE, verts=10)
    # targeting optic - single hot eye
    sphere((0, -0.05, 0.28), (0.24, 0.30, 0.18), core)
    # recoil braces
    br = box((0.42, 0.30, 0.02), (0.20, 0.95, 0.22), shell,
             rot=(0, 0, math.radians(6)), bev=0.03)
    mx(br)
    fn = box((0.38, -0.90, 0.06), (0.44, 0.50, 0.24), deep,
             rot=(0, 0, math.radians(24)), bev=0.03)
    mx(fn)
    exhaust(0.26, -1.02, core, radius=0.14, length=0.34, hot=0.08)

    camera(s, 4.6)
    lights(tint=(1.0, 0.78, 0.78))
    glare(s)
    render(s, outdir, "enemy_sniper", 192, 192)


def enemy_swarm(outdir):
    """Cheap and numerous - a tiny single-eye drone, read at a glance."""
    s = new_scene()
    shell = mat("shell", "w_shell", 0.88, 0.34)
    deep = mat("deep", "w_deep", 0.90, 0.28)
    core = mat("core", "w_shell", 0.30, 0.20, emit="w_core", emit_str=7.0)

    body = cyl((0, 0, 0), 0.78, 0.36, deep, verts=6, bev=0.06)
    body.rotation_euler = (0, 0, math.radians(30))
    sphere((0, 0, 0.22), (0.34, 0.34, 0.24), core)
    for a in range(3):
        ang = math.radians(120 * a + 90)
        box((math.cos(ang) * 0.86, math.sin(ang) * 0.86, 0.0),
            (0.44, 0.18, 0.12), shell, rot=(0, 0, ang), bev=0.02)

    camera(s, 2.6)
    lights(tint=(0.92, 0.94, 1.0))
    glare(s)
    render(s, outdir, "enemy_swarm", 128, 128)


def enemy_dreadnought(outdir):
    """Anchors and sweeps with beams - a compact capital escort.

    Deliberately echoes the Aegis boss hull so it reads as the same navy,
    at a fraction of the size.
    """
    s = new_scene()
    plate = mat("plate", "r_plate", 0.90, 0.28)
    shell = mat("shell", "r_shell", 0.88, 0.34)
    deep = mat("deep", "r_deep", 0.90, 0.28)
    core = mat("core", "r_shell", 0.30, 0.20, emit="r_core", emit_str=8.0)
    edge = mat("edge", "r_core", 0.88, 0.22, emit="r_hot", emit_str=0.55)

    box((0, 0.1, 0), (1.0, 3.3, 0.60), plate, bev=0.08)
    box((0, 1.25, 0.24), (0.72, 1.05, 0.44), shell, bev=0.06)
    cone((0, 2.25, 0.04), 0.42, 0.10, 0.95, deep, rot=NOSE, verts=8)
    box((0, -1.25, 0.26), (0.85, 1.0, 0.40), shell, bev=0.06)
    # broadside armour
    a1 = box((1.30, 0.30, -0.02), (1.35, 2.3, 0.40), plate,
             rot=(0, 0, math.radians(-6)), bev=0.06)
    mx(a1)
    a2 = box((1.45, 0.85, 0.22), (0.95, 0.95, 0.20), deep,
             rot=(0, 0, math.radians(-6)), bev=0.04)
    mx(a2)
    # beam emitter - the thing that sweeps sectors
    cyl((0, 0.15, 0.48), 0.52, 0.34, deep, verts=8, bev=0.03)
    sphere((0, 0.15, 0.66), (0.34, 0.34, 0.24), core)
    for bx in (-0.22, 0.22):
        cyl((bx, 1.35, 0.52), 0.09, 1.2, shell, rot=FWD, verts=8, bev=0)
        cyl((bx, 1.98, 0.52), 0.12, 0.12, edge, verts=8, bev=0)
    # engines aft
    for x in (-0.55, 0.55):
        cyl((x, -2.05, 0), 0.24, 0.7, deep, rot=FWD, verts=10)
        cyl((x, -2.45, 0), 0.18, 0.12, core, rot=FWD, verts=10, bev=0)
    random.seed(41)
    for _ in range(22):
        gx = random.uniform(0.15, 1.85)
        gy = random.uniform(-1.5, 1.6)
        gg = box((gx, gy, 0.34), (random.uniform(0.09, 0.22),
                                  random.uniform(0.10, 0.30),
                                  random.uniform(0.04, 0.08)),
                 deep if random.random() < 0.6 else shell, bev=0.008)
        mx(gg)

    camera(s, 6.4)
    lights(tint=(1.0, 0.88, 0.82), power=1.2)
    glare(s)
    render(s, outdir, "enemy_dreadnought", 256, 256)


# --------------------------------------------------------------- miniboss
def enemy_tank(outdir):
    """Tank Fortress - the lore's 'heavily armored mobile platform with
    regenerating shield generators'. Serves the tank and miniboss wave
    patterns. Cyan shield tech on dark gunmetal, guns toward the player.
    """
    s = new_scene()
    hull = mat("hull", "k_hull", 0.88, 0.32)
    deck = mat("deck", "k_deck", 0.90, 0.26)
    drk = mat("drk", "k_dark", 0.85, 0.40)
    shld = mat("shld", "k_dark", 0.35, 0.20, emit="k_glow", emit_str=5.0)
    glow = mat("glow", "k_dark", 0.35, 0.20, emit="k_hot", emit_str=8.0)

    # octagonal armored platform
    body = cyl((0, 0, 0), 1.55, 0.55, hull, verts=8, bev=0.07)
    body.rotation_euler = (0, 0, math.radians(22.5))
    inner = cyl((0, 0, 0.24), 1.10, 0.38, deck, verts=8, bev=0.05)
    inner.rotation_euler = (0, 0, math.radians(22.5))

    # four shield generator pylons on the diagonals - the regen system
    for a in range(4):
        ang = math.radians(90 * a + 45)
        px, py = math.cos(ang) * 1.28, math.sin(ang) * 1.28
        cyl((px, py, 0.42), 0.20, 0.55, drk, verts=8)
        cyl((px, py, 0.74), 0.13, 0.18, shld, verts=8, bev=0)

    # central turret with twin cannons toward the player
    cyl((0, 0, 0.52), 0.52, 0.35, drk, verts=10)
    for bx in (-0.2, 0.2):
        cyl((bx, -0.95, 0.55), 0.10, 1.1, deck, rot=FWD, verts=8, bev=0)
        cyl((bx, -1.52, 0.55), 0.14, 0.12, glow, verts=8, bev=0)

    # front armor chevron
    ch = box((0.62, -1.32, 0.10), (0.55, 0.38, 0.30), hull,
             rot=(0, 0, math.radians(35)), bev=0.05)
    mx(ch)
    # rear thruster blocks
    rt = box((0.55, 1.42, 0.05), (0.42, 0.5, 0.32), drk, bev=0.05)
    mx(rt)
    cyl((0, 1.55, 0.1), 0.16, 0.2, shld, rot=FWD, verts=8, bev=0)

    # deck greebles
    random.seed(31)
    for _ in range(18):
        ang = random.uniform(0, TAU)
        d = random.uniform(0.55, 1.25)
        box((math.cos(ang) * d, math.sin(ang) * d, 0.46),
            (random.uniform(0.08, 0.2), random.uniform(0.08, 0.22),
             random.uniform(0.04, 0.08)),
            drk if random.random() < 0.5 else deck, bev=0.008)

    camera(s, 4.6)
    lights(tint=(0.75, 0.95, 1.0), power=1.2)
    glare(s)
    render(s, outdir, "enemy_tank_fortress", 256, 256)


# --------------------------------------------------------------- power-up
def power_chip(outdir):
    """Gold energy cell pickup - replaces the flat yellow chicklet."""
    s = new_scene()
    shell = mat("shell", "chip_gold", 0.95, 0.22, emit="chip_gold", emit_str=0.25)
    deep = mat("deep", "chip_deep", 0.90, 0.30)
    core = mat("core", "chip_deep", 0.30, 0.15, emit="chip_hot", emit_str=5.5)
    ringm = mat("ringm", "chip_deep", 0.30, 0.15, emit="chip_gold", emit_str=3.0)

    # tilted hex cell so the top face and edge both read
    hx = cyl((0, 0, 0), 0.85, 0.40, shell, rot=(math.radians(38), 0, 0),
             verts=6, bev=0.05)
    hx.rotation_euler.z = math.radians(12)
    cyl((0, 0.02, 0.10), 0.58, 0.34, deep, rot=(math.radians(38), 0, 0),
        verts=6, bev=0.03)
    # blazing core
    sphere((0, 0.02, 0.16), (0.34, 0.34, 0.30), core)
    # orbit ring
    bpy.ops.mesh.primitive_torus_add(major_radius=1.1, minor_radius=0.055,
                                     location=(0, 0, 0.05),
                                     rotation=(math.radians(64), 0,
                                               math.radians(-18)))
    ring = bpy.context.object
    ring.data.materials.append(ringm)

    camera(s, 3.2)
    lights(tint=(1.0, 0.88, 0.6), power=0.65)
    glare(s, threshold=0.75, size=7, mix=-0.3)
    render(s, outdir, "power_chip", 128, 128)


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


def _nebula_bg(outdir, name, void_k, mid_k, hi_k, star_k, star2_k, seed_off=0.0):
    """Opaque nebula + dense fine stars. Tiles seamlessly in Y.

    Parameterized per zone so each map gets its own sky in its own
    palette; seed_off shifts the noise so zones don't share cloud shapes.
    """
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
    neb.noise_dimensions = "4D"  # must switch before the W input exists
    neb.inputs["W"].default_value = seed_off
    nt.links.new(vec, neb.inputs["Vector"])

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "EASE"
    ramp.color_ramp.elements[0].position = 0.30
    ramp.color_ramp.elements[0].color = C(void_k)
    ramp.color_ramp.elements[1].position = 0.74
    ramp.color_ramp.elements[1].color = C(hi_k)
    ramp.color_ramp.elements.new(0.54).color = C(mid_k)
    nt.links.new(neb.outputs["Fac"], ramp.inputs["Fac"])

    stars = _star_layer(nt, vec, 30.0, 0.76, star_k)
    faint = _star_layer(nt, vec, 52.0, 0.79, star2_k)

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
    render(s, outdir, name, 512, 512, transparent=False)


def background_far(outdir):
    """Nebula Runway - the default blue-violet sky."""
    _nebula_bg(outdir, "background_far", "void", "neb_mid", "neb_hi",
               "star", "star_cool")


def background_far_solar(outdir):
    """Solar Rift - ember nebula near the binary star."""
    _nebula_bg(outdir, "background_far_solar", "sol_void", "sol_mid",
               "sol_hi", "sol_star", "sol_star2", seed_off=7.3)


def background_far_abyss(outdir):
    """Abyss Crown - near-black deep void, sparse icy stars."""
    _nebula_bg(outdir, "background_far_abyss", "aby_void", "aby_mid",
               "aby_hi", "aby_star", "aby_star2", seed_off=13.9)


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
    enemy_drifter, enemy_sine, enemy_tank,
    enemy_zigzag, enemy_orbiter, enemy_charger, enemy_splitter,
    enemy_bomber, enemy_sniper, enemy_swarm, enemy_dreadnought,
    boss_aegis, boss_tyrant, boss_leviathan,
    power_chip,
    background_far, background_far_solar, background_far_abyss,
    background_near,
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
