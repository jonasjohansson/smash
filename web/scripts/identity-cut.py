"""Business cards with the wordmark cut through them, rendered for a template's photograph (Blender).

  /Applications/Blender.app/Contents/MacOS/Blender -b --python web/scripts/identity-cut.py -- <shot.json> [--quick]

Run by web/scripts/identity-cutshot.py, which makes the plate this lies on and lays the render into the photograph.

The card is a stencil: the five letters are cut out of a plain stock, one colour, nothing printed, and what the
card lies on shows through them (Jonas, 2026-10-14). "cut": "slots" cuts the ten slots instead, the letters staying
card (the mark is the letters left standing when ten slots are cut from a block). The first card's four corners and its size give the camera (the lens
is the one that makes its corners square, unless the shot names one); every other card is put on the same plane
where its corners say. Each card lies on a shadow catcher its own size, so the render carries what the card does to
the surface under it, its shadow and the sun through its slots, and nothing else. A stack (depth > 0.6 mm) is cut
all the way down.

  {"plate": "...jpg", "render": "...png", "render_cards": "...png", "size": [85, 55], "mark": 40, "lens": null,
   "depth": 0.6,
   "cards": [{"corners": {"tl": [x, y], "tr": ..., "br": ..., "bl": ...}, "face": "...jpg or null", "stock": [r, g, b],
              "side": "front", "under": 0}],
   "sun": {"azimuth": 135, "elevation": 35, "strength": 4, "angle": 0.6, "color": [1, 1, 1]}, "ambient": 0.6,
   "ambient_color": [1, 1, 1], "exposure": 1.0, "samples": 256}

"cutter" names an SVG of what is cut (black), "mark_size" [w, h] its size on the card, centred
unless "mark_offset" [x, y] mm (y up) moves it (identity-stencil.mjs
draws the site's wide mark this way). A card also takes "metallic" (0..1: anodised metal 1) and "coat" (true: a powder coat; with either the edges
wear the face's finish, no scorch, and the paper tooth is gone), "face_gain" [r, g, b] (multiplies a printed face's colours), "face_lift" [r, g, b] (screens them
up: c + lift * (1 - c), for a channel the face has none of), "clear" [top, right, bottom, left]
(mm more of catcher on a side), "roughness" (default 0.6 for black stock, else 0.85), "char" (the laser's scorch on the cut walls,
0..1) and "grow" (mm: its shadow catcher reaches that far past it). identity-cutshot.py adds "camera" (fitted to
every card's corners) and each card's "place" [x, y, turn] on the first card's plane.

Corners are fractions of the picture. The sun's azimuth is in the first card's plane, from its long edge (tl to tr),
counterclockwise seen from above. A card with "side": "back" lies face down, so its slots are mirrored; "under": 1 lies under
another, a card lower.
"""

import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parent.parent.parent
WORDMARK = ROOT / 'identity' / '00-original' / 'wordmark.svg'
MM = 1.0  # one Blender unit a millimetre: the exact boolean loses a 0.6 mm card's faces when modelled in metres

argv = sys.argv[sys.argv.index('--') + 1:]
shot = json.loads(Path(argv[0]).read_text())
MARK_H = shot.get('mark', 40.0)  # the wordmark's height on the card, mm (the kit's printed front has it at 31)
MARK_W = MARK_H * 552 / 472
quick = '--quick' in argv
CW, CH = shot.get('size', [85.0, 55.0])  # mm: the template's card, which some shops make 88 or 90 wide
CT = 0.6
KEYS = ('tl', 'tr', 'br', 'bl')
RECT = np.array([[-CW / 2, CH / 2], [CW / 2, CH / 2], [CW / 2, -CH / 2], [-CW / 2, -CH / 2]])


def homography(src, dst):
    a = []
    for (X, Y), (u, v) in zip(src, dst):
        a.append([X, Y, 1, 0, 0, 0, -u * X, -u * Y, -u])
        a.append([0, 0, 0, X, Y, 1, -v * X, -v * Y, -v])
    return np.linalg.svd(np.array(a))[2][-1].reshape(3, 3)


def centred(corners, w, h):
    return np.array([[corners[k][0] * w - w / 2, corners[k][1] * h - h / 2] for k in KEYS])


def solve_camera(corners, w, h):
    """The lens and pose from a known rectangle's four image corners (the principal point at the centre)."""
    H = homography(RECT, centred(corners, w, h))
    h1, h2 = H[:, 0], H[:, 1]
    f2 = []
    if abs(h1[2] * h2[2]) > 1e-12:
        f2.append(-(h1[0] * h2[0] + h1[1] * h2[1]) / (h1[2] * h2[2]))
    if abs(h2[2] ** 2 - h1[2] ** 2) > 1e-12:
        f2.append((h1[0] ** 2 + h1[1] ** 2 - h2[0] ** 2 - h2[1] ** 2) / (h2[2] ** 2 - h1[2] ** 2))
    f2 = [x for x in f2 if x > 0]
    f = math.sqrt(np.median(f2)) if f2 else 1.5 * max(w, h)
    f = min(max(f, 0.5 * max(w, h)), 6 * max(w, h))
    if shot.get('lens'):  # a single rectangle fixes the lens only loosely
        f = shot['lens'] * w / 36
    Kinv = np.diag([1 / f, 1 / f, 1])
    r1, r2, t = Kinv @ H[:, 0], Kinv @ H[:, 1], Kinv @ H[:, 2]
    lam = 2 / (np.linalg.norm(r1) + np.linalg.norm(r2))
    if t[2] * lam < 0:
        lam = -lam
    r1, r2, t = r1 * lam, r2 * lam, t * lam
    R = np.column_stack([r1, r2, np.cross(r1, r2)])
    U, _, Vt = np.linalg.svd(R)
    R = U @ Vt
    return f, R, -R.T @ t, H


def camera(f, R, C, w):
    cam = bpy.data.cameras.new('cam')
    cam.sensor_fit = 'HORIZONTAL'
    cam.sensor_width = 36
    cam.clip_start, cam.clip_end = 1, 100000
    cam.lens = f * 36 / w
    obj = bpy.data.objects.new('cam', cam)
    bpy.context.scene.collection.objects.link(obj)
    Rcw = R.T  # camera axes in the world: x right, y down, z forward (computer vision) -> Blender's x, -y, -z
    rot = Matrix([[Rcw[i][0], -Rcw[i][1], -Rcw[i][2]] for i in range(3)])
    obj.matrix_world = Matrix.Translation(Vector(C * MM)) @ rot.to_4x4()
    bpy.context.scene.camera = obj


def placement(corners, H, w, h):
    """Where a card lies on the first card's plane: its centre (mm) and turn, from its corners in the picture."""
    Hi = np.linalg.inv(H)
    pts = []
    for u, v in centred(corners, w, h):
        p = Hi @ np.array([u, v, 1])
        pts.append(p[:2] / p[2])
    pts = np.array(pts)
    c = pts.mean(0)
    d = (pts[1] - pts[0]) + (pts[2] - pts[3])
    return c, math.atan2(d[1], d[0])


def box(name, sx, sy, sz, z):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, z))
    o = bpy.context.object
    o.name = name
    o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    return o


def outward(o):
    """Every face of a solid facing out (a solidified curve can come out inside out, and the exact boolean then
    takes the solid for its complement)."""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()


def slots(depth):
    """What is cut out, as a solid through the whole stack: the five letters (shot "cut": "letters", the default),
    so the card is a stencil of the wordmark, or the ten slots ("cut": "slots": the block less the letters).

    Cut as letters, one piece of card would fall out: the A's closed counter. A stencil bridge holds it, a strip
    of card `bridge` mm wide (default 0.7) from the counter's top up out of the letter."""
    bpy.ops.import_curve.svg(filepath=str(shot.get('cutter', WORDMARK)))
    curves = [o for o in bpy.context.scene.objects if o.type == 'CURVE']
    for c in curves:
        c.data.dimensions = '2D'
        c.data.fill_mode = 'BOTH'
        c.data.resolution_u = 24
    bpy.ops.object.select_all(action='DESELECT')
    for c in curves:
        c.select_set(True)
    bpy.context.view_layer.objects.active = curves[0]
    bpy.ops.object.join()
    letters = bpy.context.object
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    d = letters.dimensions
    letters.location = (0, 0, 0)
    mw, mh = shot.get('mark_size', [MARK_W, MARK_H])
    letters.scale = (mw * MM / d.x, mh * MM / d.y, 1)
    ox, oy = shot.get('mark_offset', [0, 0])  # mm from the card's centre, y up
    letters.location = (ox * MM, oy * MM, 0)
    bpy.ops.object.transform_apply(location=True, scale=True)
    bm = bmesh.new()  # where two letters meet at a point the outline pinches: merge it shut (now in mm)
    bm.from_mesh(letters.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.01 * MM)
    bm.to_mesh(letters.data)
    bm.free()
    # the letters' outline, filled, made a solid by extruding it straight up (cleaner than a solidify, whose
    # caps overlap where an outline pinches and leave the boolean scraps of floor under a letter)
    bm = bmesh.new()
    bm.from_mesh(letters.data)
    bmesh.ops.dissolve_degenerate(bm, dist=0.001 * MM, edges=bm.edges)
    tall = (depth + 4) * MM
    ext = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
    up = [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=up, vec=(0, 0, tall))
    bmesh.ops.translate(bm, verts=bm.verts[:], vec=(0, 0, -tall / 2))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(letters.data)
    bm.free()
    if shot.get('cut', 'letters') == 'letters' and shot.get('cutter'):  # a drawn cutter has its bridge already
        letters.name = 'letters'
        letters.hide_render = letters.hide_viewport = True
        return letters
    if shot.get('cut', 'letters') == 'letters':
        k = MARK_H / 472  # mm per unit of the wordmark's drawing (552 x 472, y down)
        bw = shot.get('bridge', 0.7)
        # the A's counter: x 292-312, its round top at y 32; the bridge from above the block down into it
        bridge = box('bridge', bw * MM, 60 * k * MM, (depth + 6) * MM, -depth / 2 * MM)
        bridge.location = ((302 - 276) * k * MM, (236 - 10) * k * MM, -depth / 2 * MM)
        bpy.context.view_layer.objects.active = bridge
        bpy.ops.object.select_all(action='DESELECT')
        bridge.select_set(True)
        bpy.ops.object.transform_apply(location=True)
        b = letters.modifiers.new('bridge', 'BOOLEAN')
        b.operation, b.object, b.solver = 'DIFFERENCE', bridge, 'EXACT'
        bpy.context.view_layer.objects.active = letters
        bpy.ops.object.modifier_apply(modifier='bridge')
        bpy.data.objects.remove(bridge)
        outward(letters)
        letters.name = 'letters'
        letters.hide_render = letters.hide_viewport = True
        return letters
    # the block, a hair inside the letters' outline so no face is shared; less the letters
    eps = 0.002
    block = box('slots', (MARK_W - eps) * MM, (MARK_H - eps) * MM, (depth + 2) * MM, -depth / 2 * MM)
    b = block.modifiers.new('less', 'BOOLEAN')
    b.operation, b.object, b.solver = 'DIFFERENCE', letters, 'EXACT'
    bpy.context.view_layer.objects.active = block
    bpy.ops.object.modifier_apply(modifier='less')
    bpy.data.objects.remove(letters)
    outward(block)
    block.hide_render = block.hide_viewport = True
    return block


def paper(name, rgb, face=None, tooth=0.12, roughness=0.85, mottle=0.02, gain=(1, 1, 1), lift=(0, 0, 0), metallic=0.0,
          brushed=0.0):
    """Uncoated board: little shine, a tooth (a bump at two scales) and a faint mottle in its colour. `brushed`
    (0-1): bare steel brushed along the card's length, its highlight drawn out across the grain, the grain in streaks."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Specular IOR Level'].default_value = 0.3
    bsdf.inputs['Metallic'].default_value = metallic  # anodised aluminium: 1; a powder coat: 0
    if brushed:
        bsdf.inputs['Anisotropic'].default_value = brushed
        tan = nt.nodes.new('ShaderNodeTangent')
        tan.direction_type, tan.uv_map = 'UV_MAP', 'uv'
        nt.links.new(tan.outputs['Tangent'], bsdf.inputs['Tangent'])
        co = nt.nodes.new('ShaderNodeTexCoord')
        mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (0.15 / MM, 14 / MM, 1)  # streaks long along x, fine across
        streak = nt.nodes.new('ShaderNodeTexNoise')
        streak.inputs['Detail'].default_value = 6
        nt.links.new(co.outputs['Object'], mp.inputs['Vector'])
        nt.links.new(mp.outputs['Vector'], streak.inputs['Vector'])
        rr = nt.nodes.new('ShaderNodeMapRange')
        rr.inputs['To Min'].default_value = roughness * 0.7
        rr.inputs['To Max'].default_value = roughness * 1.3
        nt.links.new(streak.outputs['Fac'], rr.inputs['Value'])
        nt.links.new(rr.outputs['Result'], bsdf.inputs['Roughness'])
    fine = nt.nodes.new('ShaderNodeTexNoise')
    fine.inputs['Scale'].default_value = 2.5 / MM
    fine.inputs['Detail'].default_value = 8
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = tooth
    bump.inputs['Distance'].default_value = 0.03 * MM
    nt.links.new(fine.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    if face:
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(face)
        tex.interpolation = 'Cubic'
        tex.extension = 'EXTEND'
        colour = tex.outputs['Color']
        if gain != (1, 1, 1):  # the printed stock's colour matched to the photograph's light
            g = nt.nodes.new('ShaderNodeMix')
            g.data_type, g.blend_type = 'RGBA', 'MULTIPLY'
            g.inputs['Factor'].default_value = 1
            g.inputs['B'].default_value = (*gain, 1)
            nt.links.new(colour, g.inputs['A'])
            colour = g.outputs['Result']
        if lift != (0, 0, 0):  # a channel the face has none of (acid's blue) lifted: c + lift * (1 - c)
            sc_ = nt.nodes.new('ShaderNodeMix')
            sc_.data_type, sc_.blend_type = 'RGBA', 'SCREEN'
            sc_.inputs['Factor'].default_value = 1
            sc_.inputs['B'].default_value = (*lift, 1)
            nt.links.new(colour, sc_.inputs['A'])
            colour = sc_.outputs['Result']
    else:
        rgbn = nt.nodes.new('ShaderNodeRGB')
        rgbn.outputs[0].default_value = (*rgb, 1)
        colour = rgbn.outputs[0]
    cloud = nt.nodes.new('ShaderNodeTexNoise')  # the mottle: a few per cent over a few millimetres
    cloud.inputs['Scale'].default_value = 0.25 / MM
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type, mix.blend_type = 'RGBA', 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1
    ramp = nt.nodes.new('ShaderNodeMapRange')
    ramp.inputs['To Min'].default_value = 1 - mottle
    ramp.inputs['To Max'].default_value = 1 + mottle
    nt.links.new(cloud.outputs['Fac'], ramp.inputs['Value'])
    nt.links.new(colour, mix.inputs['A'])
    nt.links.new(ramp.outputs['Result'], mix.inputs['B'])
    nt.links.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
    return m


def cut_card(i, spec, depth, cut):
    """A card (or a stack of them) cut through, lying with its top at z = 0, centred on the origin."""
    o = box(f'card{i}', CW * MM, CH * MM, depth * MM, -depth / 2 * MM)
    r = shot.get('radius', 0)  # the corners rounded, mm (the metal card's 2.5)
    if r:
        bm = bmesh.new()
        bm.from_mesh(o.data)
        upright = [e for e in bm.edges if abs((e.verts[0].co - e.verts[1].co).normalized().z) > 0.99]
        bmesh.ops.bevel(bm, geom=upright, offset=r * MM, segments=12, profile=0.5, affect='EDGES')
        bm.to_mesh(o.data)
        bm.free()
    b = o.modifiers.new('slots', 'BOOLEAN')
    b.operation, b.object, b.solver = 'DIFFERENCE', cut, 'EXACT'
    bev = o.modifiers.new('bevel', 'BEVEL')  # after the cut, so the slots' edges are softened too
    bev.width, bev.segments, bev.limit_method = 0.12 * MM, 2, 'ANGLE'
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    # the exact boolean can keep scraps of the cutter (a cap of the letters' solid, under a letter where the
    # outline overlaps itself): a flat face below the card, seen through the hole as a dark floor. A card has
    # no flat faces but its top and its bottom, so any other goes.
    bm = bmesh.new()
    bm.from_mesh(o.data)
    stray = [f for f in bm.faces if abs(f.normal.z) > 0.99 and
             not (abs(f.calc_center_median().z) < 0.01 * MM or abs(f.calc_center_median().z + depth * MM) < 0.01 * MM)]
    stray += [f for f in bm.faces if f not in stray and
              (f.calc_center_median().z < -(depth + 0.05) * MM or f.calc_center_median().z > 0.05 * MM)]
    bmesh.ops.delete(bm, geom=stray, context='FACES')
    bm.to_mesh(o.data)
    bm.free()
    me = o.data
    for layer in list(me.uv_layers):
        me.uv_layers.remove(layer)
    uv = me.uv_layers.new(name='uv')
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (co.x / (CW * MM) + 0.5, co.y / (CH * MM) + 0.5)
    stock = spec.get('stock', [0.02, 0.02, 0.02])
    rough = spec.get('roughness', 0.6 if max(stock) < 0.1 else 0.85)  # black stock keeps a faint sheen
    char = spec.get('char', 0.3)  # the laser's scorch on the cut walls and edges: darker and warmer
    wall = [x * 0.8 * (1 - char) + char * k for x, k in zip(stock, (0.10, 0.065, 0.035))]
    metal = spec.get('metallic', 0.0)
    tooth = shot.get('tooth', 0.12) * (0.3 if metal or spec.get('coat') else 1)  # metal and coats have no paper tooth
    me.materials.append(paper(f'face{i}', stock, spec.get('face'), tooth, rough,
                              gain=tuple(spec.get('face_gain', (1, 1, 1))), lift=tuple(spec.get('face_lift', (0, 0, 0))),
                              metallic=metal, brushed=spec.get('brushed', 0.0)))
    if metal or spec.get('coat'):  # finished after cutting: the edges wear the same finish, no scorch
        wall = stock
    me.materials.append(paper(f'side{i}', wall, None, tooth * 2, rough if (metal or spec.get('coat')) else 0.9,
                              metallic=metal, brushed=spec.get('brushed', 0.0)))
    for poly in me.polygons:
        poly.material_index = 0 if poly.normal.z > 0.99 and poly.center.z > -0.01 * MM else 1
    return o


def main():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    sc = bpy.context.scene
    plate = bpy.data.images.load(shot['plate'])
    w, h = plate.size
    cards = shot['cards']
    if 'camera' in shot:  # fitted to every card's corners by identity-cutshot.py
        f, R, C = shot['camera']['f'], np.array(shot['camera']['R']), np.array(shot['camera']['C'])
        H = None
    else:
        f, R, C, H = solve_camera(cards[0]['corners'], w, h)
    print(f'lens {f * 36 / w:.1f} mm, camera at {np.round(C, 1)} mm')
    camera(f, R, C, w)

    depth = max(shot.get('depth', CT), CT)
    cut = slots(depth)
    mirrored = None
    for i, spec in enumerate(cards):
        if 'place' in spec:
            c, turn = np.array(spec['place'][:2]), spec['place'][2]
        else:
            c, turn = (np.zeros(2), 0.0) if i == 0 else placement(spec['corners'], H, w, h)
        use = cut
        if spec.get('side') == 'back':  # face down: the slots seen from behind
            if mirrored is None:
                mirrored = cut.copy()
                mirrored.data = cut.data.copy()
                sc.collection.objects.link(mirrored)
                mirrored.scale.x = -1
                bpy.context.view_layer.objects.active = mirrored
                bpy.ops.object.select_all(action='DESELECT')
                mirrored.select_set(True)
                bpy.ops.object.transform_apply(scale=True)
                outward(mirrored)
            use = mirrored
        o = cut_card(i, spec, depth, use)
        place = Matrix.Translation((c[0] * MM, c[1] * MM, 0)) @ Matrix.Rotation(turn, 4, 'Z')
        place = Matrix.Translation((0, 0, -spec.get('under', 0) * depth * MM)) @ place  # a card under another
        o.matrix_world = place
        # what the card does to the surface it lies on: under it, and as far round it as the plate was filled over
        # (identity-cutshot.py's grow), where the template card's own shadow went with it
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0))
        fl = bpy.context.object
        fl.name = f'catcher{i}'
        m = spec.get('grow', 1.0)
        t, r, b, l = [m + x for x in spec.get('clear', [0, 0, 0, 0])]  # top, right, bottom, left (mm)
        fl.scale = ((CW + l + r) * MM, (CH + t + b) * MM, 1)
        bpy.ops.object.transform_apply(scale=True)
        # the card's top edge is +y (tl, tr), its left -x
        fl.matrix_world = place @ Matrix.Translation(((r - l) / 2 * MM, (t - b) / 2 * MM, -(depth + 0.01) * MM))
        fl.is_shadow_catcher = True
        fl.hide_render = shot.get('catcher') is False

    s = shot.get('sun', {})
    az, el = math.radians(s.get('azimuth', 135)), math.radians(s.get('elevation', 35))
    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = s.get('strength', 4)
    sun.color = s.get('color', (1, 1, 1))
    sun.angle = math.radians(s.get('angle', 0.6))
    so = bpy.data.objects.new('sun', sun)
    sc.collection.objects.link(so)
    toward = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
    so.rotation_euler = toward.to_track_quat('Z', 'Y').to_euler()
    world = bpy.data.worlds.new('world')
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (*shot.get('ambient_color', (1, 1, 1)), 1)
    bg.inputs['Strength'].default_value = shot.get('ambient', 0.6)
    sc.world = world

    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'GPU'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    try:
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
    except Exception as e:
        print('GPU:', e)
    sc.cycles.samples = 32 if quick else shot.get('samples', 256)
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.exposure = math.log2(shot.get('exposure', 1.0))  # before the view's clip, not after
    sc.cycles.filter_width = 1.0
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '16'
    sc.render.filepath = shot['render']
    if '--debug' in argv:
        for o in bpy.data.objects:
            if o.type == 'MESH':
                me = o.data
                ups = [p for p in me.polygons if p.normal.z > 0.99]
                print('MESH', o.name, len(me.polygons), [round(x / MM, 2) for x in o.matrix_world.translation],
                      'up', len(ups), round(sum(p.area for p in ups) / MM / MM, 1), 'mm2',
                      'down', round(sum(p.area for p in me.polygons if p.normal.z < -0.99) / MM / MM, 1),
                      'hide', o.hide_render, [m.name for m in me.materials],
                      'top-flipped', round(sum(p.area for p in me.polygons if p.normal.z < -0.99 and p.center.z > -0.05 * MM) / MM / MM, 1),
                      'top-side-mat', round(sum(p.area for p in me.polygons if p.normal.z > 0.99 and p.material_index == 1) / MM / MM, 1),
                      'zs', sorted({round(p.center.z / MM, 3) for p in me.polygons if p.normal.z > 0.99 and p.material_index == 1})[:8],
                      'mid', round(sum(p.area for p in me.polygons if abs(p.normal.z) > 0.99 and -0.55 * MM < p.center.z < -0.05 * MM) / MM / MM, 1))
        return
    if '--top' in argv:  # debug: hand the scene to a script instead of rendering
        exec(Path(argv[argv.index('--top') + 1]).read_text(), {'__name__': 'top'})
        return
    bpy.ops.render.render(write_still=True)
    if shot.get('render_cards'):  # again, the cards alone: what the catchers add is then the shadow on its own
        for o in bpy.data.objects:
            if o.name.startswith('catcher'):
                o.hide_render = True
        sc.render.filepath = shot['render_cards']
        bpy.ops.render.render(write_still=True)


main()
