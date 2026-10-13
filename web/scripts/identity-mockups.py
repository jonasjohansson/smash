"""The kit's business cards as photographs: Blender scenes built from the print files.

  /Applications/Blender.app/Contents/MacOS/Blender -b --python web/scripts/identity-mockups.py -- \\
      <textures> <out> [shot ...] [--quick]

<textures> holds each card side as a picture trimmed to 85 x 55 mm at 40 px a mm, named
<person>-<treatment>-0.png (front) and -1.png (back), made from identity/kit/'s PDFs:

  magick -density 1016 <pdf> -alpha remove -crop 3400x2200+120+120 +repage <textures>/<name>-%d.png

SMASH_HDRI=<file.hdr> lights the world with a studio (dimly: what the paper reflects). Every card is real: 85 x 55 x 0.6 mm, its edges rounded a tenth of a millimetre, uncoated paper (rough, with a
fibre's bump), its printed sides the pictures, its core paper. Cycles on the GPU, one large soft light, an 85 mm
lens focused on the top card. Each shot writes <out>/<shot>.jpg.
"""

import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
QUICK = '--quick' in ARGS
ARGS = [a for a in ARGS if not a.startswith('--')]
TEX, OUT = ARGS[0], ARGS[1]
SHOTS = ARGS[2:] or ['stack', 'flat', 'fan', 'edge']

W, H, T = 0.085, 0.055, 0.0006  # m


def srgb(hexs):
    """A hex colour as linear RGBA, as Blender's colour inputs take it."""
    c = [int(hexs[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c] + [1]


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    s.cycles.device = 'GPU'
    s.cycles.samples = 64 if QUICK else 512
    s.cycles.use_denoising = True
    s.render.resolution_x, s.render.resolution_y = 2400, 1600
    s.render.resolution_percentage = 50 if QUICK else 100
    s.view_settings.view_transform = 'Standard'  # the palette's colours as they are (AgX dulls them)
    s.render.image_settings.file_format = 'JPEG'
    s.render.image_settings.quality = 92
    world = bpy.data.worlds.new('World')
    s.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    hdri = os.environ.get('SMASH_HDRI')
    if hdri:  # a studio, for what the paper reflects: dim, the lights below do the lighting
        env = world.node_tree.nodes.new('ShaderNodeTexEnvironment')
        env.image = bpy.data.images.load(hdri, check_existing=True)
        world.node_tree.links.new(env.outputs['Color'], bg.inputs['Color'])
        bg.inputs['Strength'].default_value = 0.12
    else:
        bg.inputs['Color'].default_value = (0.02, 0.02, 0.02, 1)
    return s


def paper(name, image=None, colour='#ffffff', rough=0.82, bump=0.04):
    """Uncoated paper: the printed picture (or a colour), rough, a fine fibre's bump."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    bsdf = next(x for x in n if x.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Sheen Weight'].default_value = 0.08
    if image:
        tex = n.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(image, check_existing=True)
        tex.interpolation = 'Cubic'
        l.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    else:
        bsdf.inputs['Base Color'].default_value = srgb(colour)
    noise = n.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 2400
    noise.inputs['Detail'].default_value = 8
    bmp = n.new('ShaderNodeBump')
    bmp.inputs['Strength'].default_value = bump
    bmp.inputs['Distance'].default_value = 0.00005
    l.new(noise.outputs['Fac'], bmp.inputs['Height'])
    l.new(bmp.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def card(front, back, core='#f4f2ee', name='card'):
    """A card, its front up: a box whose top face is the front picture, its bottom the back (read from below
    once the card is turned over about its long side), its four sides the paper's core."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    xs, ys = (-W / 2, W / 2), (-H / 2, H / 2)
    v = {(i, j, k): bm.verts.new((xs[i], ys[j], (k - 0.5) * T)) for i in (0, 1) for j in (0, 1) for k in (0, 1)}
    faces = [
        ([(0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)], 0, lambda p: (p[0] / W + 0.5, p[1] / H + 0.5)),  # front
        ([(0, 1, 0), (1, 1, 0), (1, 0, 0), (0, 0, 0)], 1, lambda p: (p[0] / W + 0.5, 0.5 - p[1] / H)),  # back
        ([(0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)], 2, None),
        ([(1, 1, 0), (0, 1, 0), (0, 1, 1), (1, 1, 1)], 2, None),
        ([(0, 1, 0), (0, 0, 0), (0, 0, 1), (0, 1, 1)], 2, None),
        ([(1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1)], 2, None),
    ]
    for keys, mat, f in faces:
        face = bm.faces.new([v[k] for k in keys])
        face.material_index = mat
        for loop in face.loops:
            loop[uv].uv = f(loop.vert.co) if f else (0.5, 0.5)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    for m in (front, back, core):
        me.materials.append(m if isinstance(m, bpy.types.Material) else paper(f'{name}-core', colour=m, rough=0.9))
    bev = ob.modifiers.new('round', 'BEVEL')
    bev.width = 0.0001
    bev.segments = 3
    bev.limit_method = 'NONE'
    return ob


def place(ob, x=0.0, y=0.0, z=0.0, turn=0.0, over=False, tilt=(0.0, 0.0)):
    """Lay a card down: at (x, y), lifted z, turned about the vertical by `turn` degrees, face down if over,
    tilted a little (degrees about x and y) where it rests on another."""
    ob.rotation_mode = 'XYZ'
    ob.rotation_euler = (math.radians(tilt[0]) + (math.pi if over else 0), math.radians(tilt[1]), math.radians(turn))
    ob.location = (x, y, z + T / 2)


def ground(colour, rough=0.9, bump=0.08, size=2.0):
    bpy.ops.mesh.primitive_plane_add(size=size)
    g = bpy.context.object
    g.name = 'ground'
    g.data.materials.append(paper('ground', colour=colour, rough=rough, bump=bump))
    return g


def light(where, power, size, aim=(0, 0, 0), colour=(1, 1, 1)):
    d = bpy.data.lights.new('soft', 'AREA')
    d.energy, d.size, d.color = power, size, colour
    ob = bpy.data.objects.new('soft', d)
    bpy.context.collection.objects.link(ob)
    ob.location = where
    ob.rotation_euler = (Vector(aim) - Vector(where)).to_track_quat('-Z', 'Y').to_euler()
    return ob


def camera(where, aim, lens=85, fstop=2.8):
    c = bpy.data.cameras.new('cam')
    c.lens = lens
    c.dof.use_dof = True
    c.dof.aperture_fstop = fstop
    ob = bpy.data.objects.new('cam', c)
    bpy.context.collection.objects.link(ob)
    ob.location = where
    ob.rotation_euler = (Vector(aim) - Vector(where)).to_track_quat('-Z', 'Y').to_euler()
    c.dof.focus_distance = (Vector(aim) - Vector(where)).length
    bpy.context.scene.camera = ob
    return ob


def tex(person, treat, side):
    return os.path.join(TEX, f'{person}-{treat}-{side}.png')


def sides(person, treat):
    return paper(f'{person}-{treat}-front', tex(person, treat, 0)), paper(f'{person}-{treat}-back', tex(person, treat, 1))


def jitter(i, a, b):
    """A small, repeatable wobble for the i-th card of a stack."""
    return a * math.sin(i * 1.7 + b) + 0.5 * a * math.sin(i * 3.1 + 2 * b)


def stack(front, back, core, n, x=0.0, y=0.0, turn=0.0, name='stack'):
    """n cards squared up, face up, each a fraction of a millimetre and a degree off the one under it."""
    for i in range(n):
        place(card(front, back, core, f'{name}-{i}'), x=x + jitter(i, 0.0004, 0), y=y + jitter(i, 0.0003, 1), z=i * T,
              turn=turn + jitter(i, 0.35, 2))
    return n * T


def shot_stack():
    """A stack of cards face up on the earth ground, one of the team's turned over on it, another beside."""
    reset()
    ground('#241c17')
    core = paper('core', colour='#f4f2ee', rough=0.9)
    front, back = sides('ashley-reed', 'black-and-white')
    top = stack(front, back, core, 40, turn=-8)
    ef, eb = sides('emile-pascoe', 'black-and-white')
    place(card(ef, eb, core, 'emile'), x=0.034, y=0.014, z=top + 0.0003, turn=-24, over=True, tilt=(0, -1.0))
    vf, vb = sides('veronica-reed', 'black-and-white')
    place(card(vf, vb, core, 'veronica'), x=0.085, y=0.06, turn=-6, over=True)
    light((-0.45, -0.1, 0.42), 4.5, 0.5)  # a window to the left, low: shadows long and soft
    light((0.4, 0.35, 0.5), 0.4, 1.2)     # what the room sends back
    camera((0.10, -0.36, 0.25), (0.035, 0.012, top * 0.7), lens=85, fstop=4)


def shot_flat():
    """Straight down: the front and Veronica's back in yellow, side by side, on the type's pale paper."""
    reset()
    ground('#e9e3d9', bump=0.05)
    core = paper('core', colour='#f4f2ee', rough=0.9)
    front, back = sides('veronica-reed', 'yellow')
    place(card(front, back, core, 'front'), x=-0.048, y=0.002, turn=-2)
    place(card(front, back, core, 'back'), x=0.048, y=-0.002, turn=1.5, over=True)
    light((-0.9, 0.3, 0.45), 14, 0.6)     # raking, from the left, far: every card lifts off the paper
    light((0.3, -0.3, 0.8), 0.6, 1.5)
    cam = camera((0, 0, 0.66), (0, 0, 0), lens=85, fstop=11)
    cam.rotation_euler = (0, 0, 0)


def shot_fan():
    """The palette fanned out: a card in each of four treatments, fronts up, overlapping, on the ground."""
    reset()
    ground('#241c17')
    core = paper('core', colour='#f4f2ee', rough=0.9)
    for i, treat in enumerate(['black-and-white', 'acid', 'yellow', 'red', 'sky']):
        f, b = sides('ashley-reed', treat)
        place(card(f, b, core, f'fan-{treat}'), x=-0.06 + i * 0.03, y=0.012 * math.sin(i * 1.1), z=i * 0.0002 * 0 + i * T,
              turn=-28 + i * 13, tilt=(0, 0))
    light((-0.3, -0.35, 0.5), 6, 0.6)
    light((0.4, 0.4, 0.4), 0.4, 1.2)
    camera((0.0, -0.26, 0.30), (0.0, 0.0, 0.0), lens=70, fstop=4)


def shot_edge():
    """Down at the table, close: the stack's edge, the front's wordmark across the top card."""
    reset()
    ground('#241c17')
    core = paper('core', colour='#f4f2ee', rough=0.9)
    front, back = sides('emile-pascoe', 'black-and-white')
    top = stack(front, back, core, 60, turn=22)
    light((-0.25, -0.45, 0.22), 5, 0.5)   # from the front and left: the edge of every card lit
    light((0.3, 0.4, 0.4), 0.4, 1.2)
    edge = Vector((0.0, -0.022, top * 0.6))  # the stack's near edge, where the focus is
    cam = camera((0.10, -0.32, 0.12), edge, lens=85, fstop=5.6)
    cam.data.dof.focus_distance = (edge - cam.location).length


SHOT = {'stack': shot_stack, 'flat': shot_flat, 'fan': shot_fan, 'edge': shot_edge}

for name in SHOTS:
    SHOT[name]()
    os.makedirs(OUT, exist_ok=True)
    bpy.context.scene.render.filepath = os.path.join(OUT, f'{name}.jpg')
    bpy.ops.render.render(write_still=True)
    print('wrote', bpy.context.scene.render.filepath)
