"""Slot-cut business cards laid into a template's photograph: the plate, the render (identity-cut.py) and the mix.

  python3 web/scripts/identity-cutshot.py <shot.json> [--quick]

shot.json is identity-cut.py's (see there) plus:

  "out": "...jpg",                 the finished picture
  "cards": [{..., "fill": [dx, dy] or "auto", "grow": 1.0, "clear": [top, right, bottom, left], "gain_reach": 15,
              "stroke": 1.5, "ink": "dark", "light": 1.0, "remove": false, "face_gain": [1, 1, 1],
              "from_plate": false}],   (from_plate: copy from the plate as filled so far, past an earlier card)
  "light": 1.0, "tooth": 0.03, "grain": "auto", "blur": 0.4, "edge": 0.7, "shadow": 1.0 (how dark the cards' shadow
  on the surface, 1 as rendered)

0. The camera. One camera is fitted to every card's corners at once (least squares: the lens, unless "lens" fixes
   it; the first card's plane; each other card's place and turn on it), and every card's corners are taken back
   from it, so the fill, the light and the render agree.
1. The plate. The template's own card is in the photograph where ours will lie, and through our slots the surface
   under it has to show. So every card's footprint, and `grow` mm round it (more on any side `clear` names, for a
   stack's visible edge), is filled with the surface `fill` mm away along the card's own edges (dx along its long
   edge, dy along its short one, down from its top edge): the same plane, so the grain and perspective carry on.
   The copy is brought to the brightness and colour of the ring round it and feathered in.
2. The render: our cards, and on the surface only what they do to it (their shadow, the sun through the slots).
3. The light. The photograph's own light on its card (a window's bars, a glass's caustic and its colour) is read
   off that card, its printing found (see light_map: thin strokes, darker or lighter than the paper as `ink` says)
   and filled over from the paper round it, and divided by the lit paper's colour. It is laid over our card where our card shows, and over
   the surface seen through its slots, by multiply; it can lighten as well as darken. A card's `light` scales it.
4. The paper's tooth, the photograph's softness (`blur` on the colour, `edge` on the outline) and its grain
   (measured off the template card's paper unless `grain` gives a % of noise), then the render over the plate.
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.optimize import least_squares
from scipy.spatial.transform import Rotation

ROOT = Path(__file__).resolve().parent.parent.parent
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
KEYS = ('tl', 'tr', 'br', 'bl')
CT = 0.6


def homography(src, dst):
    a = []
    for (X, Y), (u, v) in zip(src, dst):
        a.append([X, Y, 1, 0, 0, 0, -u * X, -u * Y, -u])
        a.append([0, 0, 0, X, Y, 1, -v * X, -v * Y, -v])
    return np.linalg.svd(np.array(a))[2][-1].reshape(3, 3)


def apply(H, pts):
    p = np.c_[pts, np.ones(len(pts))] @ H.T
    return p[:, :2] / p[:, 2:3]


def sample(img, xy):
    """img (h, w, c) at pixel coordinates xy (n, 2), bilinear."""
    return np.stack([ndimage.map_coordinates(img[..., k], [xy[:, 1], xy[:, 0]], order=1, mode='nearest')
                     for k in range(img.shape[2])], -1)


def region(H, w, h, cw, ch, out=(0, 0, 0, 0)):
    """The pixels on a card or within `out` mm of it (top, right, bottom, left), each with where it lies on the
    card (mm from its top-left corner) and how far outside the card it is (mm, 0 inside)."""
    t, r, b, l = out
    quad = apply(H, np.array([[-l, -t], [cw + r, -t], [cw + r, ch + b], [-l, ch + b]]))
    x0, y0 = np.floor(quad.min(0)).astype(int).clip(0)
    x1, y1 = np.ceil(quad.max(0)).astype(int) + 1
    x1, y1 = min(x1, w), min(y1, h)
    if x1 <= x0 or y1 <= y0:
        return np.zeros((0, 2), int), np.zeros((0, 2)), np.zeros(0)
    ys, xs = np.mgrid[y0:y1, x0:x1]
    pix = np.c_[xs.ravel(), ys.ravel()].astype(float)
    uv = apply(np.linalg.inv(H), pix)
    inside = (uv[:, 0] > -l) & (uv[:, 0] < cw + r) & (uv[:, 1] > -t) & (uv[:, 1] < ch + b)
    pix, uv = pix[inside].astype(int), uv[inside]
    dx = np.maximum(np.maximum(-uv[:, 0], uv[:, 0] - cw), 0)
    dy = np.maximum(np.maximum(-uv[:, 1], uv[:, 1] - ch), 0)
    return pix, uv, np.hypot(dx, dy)


# 0. the camera -------------------------------------------------------------------------------------------------

def fit_camera(cards, w, h, cw, ch, lens=None):
    """One camera for every card: the lens, the first card's plane, each other card's place and turn on it."""
    rect = lambda: np.array([[-cw / 2, ch / 2], [cw / 2, ch / 2], [cw / 2, -ch / 2], [-cw / 2, -ch / 2]])
    img = [np.array([[c['corners'][k][0] * w - w / 2, c['corners'][k][1] * h - h / 2] for k in KEYS]) for c in cards]
    # a start from the first card alone (its homography's two constraints on the lens)
    H = homography(rect(), img[0])
    h1, h2 = H[:, 0], H[:, 1]
    f2 = [x for x in [-(h1[0] * h2[0] + h1[1] * h2[1]) / (h1[2] * h2[2] or 1e-12),
                      (h1[0] ** 2 + h1[1] ** 2 - h2[0] ** 2 - h2[1] ** 2) / ((h2[2] ** 2 - h1[2] ** 2) or 1e-12)] if x > 0]
    f0 = lens * w / 36 if lens else float(np.clip(np.sqrt(np.median(f2)) if f2 else 1.5 * max(w, h), 0.5 * max(w, h), 6 * max(w, h)))
    K = np.diag([1 / f0, 1 / f0, 1])
    r1, r2, t = K @ H[:, 0], K @ H[:, 1], K @ H[:, 2]
    lam = 2 / (np.linalg.norm(r1) + np.linalg.norm(r2)) * (1 if t[2] > 0 else -1)
    R = np.column_stack([r1 * lam, r2 * lam, np.cross(r1 * lam, r2 * lam)])
    U, _, Vt = np.linalg.svd(R)
    R, t = U @ Vt, t * lam
    Hi = np.linalg.inv(H)
    starts = []
    for im in img[1:]:
        p = apply(Hi, im)
        d = (p[1] - p[0]) + (p[2] - p[3])
        starts += [*p.mean(0), np.arctan2(d[1], d[0])]

    def project(x):
        f = lens * w / 36 if lens else x[0]
        Rm = Rotation.from_rotvec(x[1:4]).as_matrix()
        tv = x[4:7]
        out = []
        for i, c in enumerate(cards):
            if i == 0:
                cx, cy, th = 0.0, 0.0, 0.0
            else:
                cx, cy, th = x[7 + 3 * (i - 1): 10 + 3 * (i - 1)]
            co, si = np.cos(th), np.sin(th)
            p = rect() @ np.array([[co, si], [-si, co]]) + [cx, cy]
            z = -c.get('under', 0) * CT
            P = np.c_[p, np.full(4, z)] @ Rm.T + tv
            out.append(f * P[:, :2] / P[:, 2:3])
        return out

    x0 = np.r_[f0, Rotation.from_matrix(R).as_rotvec(), t, starts]
    fit = least_squares(lambda x: np.concatenate([(p - im).ravel() for p, im in zip(project(x), img)]), x0,
                        x_scale='jac')
    x = fit.x
    f = lens * w / 36 if lens else x[0]
    Rm = Rotation.from_rotvec(x[1:4]).as_matrix()
    err = np.sqrt(np.mean(fit.fun ** 2))
    corners = [{k: [(q[j][0] + w / 2) / w, (q[j][1] + h / 2) / h] for j, k in enumerate(KEYS)} for q in project(x)]
    places = [[0.0, 0.0, 0.0]] + [list(x[7 + 3 * i: 10 + 3 * i]) for i in range(len(cards) - 1)]
    return {'f': float(f), 'R': Rm.tolist(), 'C': (-Rm.T @ x[4:7]).tolist()}, corners, places, err


def auto_fill(src, H, w, h, cw, ch, others, step=3.0):
    """Where to copy a card's surface from: the offset (mm, in the card's frame) whose patch lies wholly in the
    picture, clear of every other card, and is most like the surface right round the card (its mean and its
    texture)."""
    gu, gv = np.meshgrid(np.linspace(-1.5, cw + 1.5, 28), np.linspace(-1.5, ch + 1.5, 18))
    grid = np.c_[gu.ravel(), gv.ravel()]
    # the surface round the card: a ring 3 to 8 mm out
    ring = np.concatenate([np.c_[np.linspace(-8, cw + 8, 40), np.full(40, y)] for y in (-5.5, ch + 5.5)] +
                          [np.c_[np.full(25, x), np.linspace(-8, ch + 8, 25)] for x in (-5.5, cw + 5.5)])
    rxy = apply(H, ring)
    ok = (rxy >= 0).all(1) & (rxy[:, 0] < w - 1) & (rxy[:, 1] < h - 1)
    rl = sample(src, rxy[ok]) if ok.any() else src.reshape(-1, 3)
    # the ring's typical colour: its median, so a strip of something else (the floor past a block's edge) doesn't
    # set it, and its texture
    target = (np.median(rl, 0), (rl @ [0.2126, 0.7152, 0.0722]).std())
    invs = [np.linalg.inv(Ho) for Ho in others]
    best, pick = np.inf, np.array([0.0, -(ch + 4)])
    span = 1.6 * (cw + ch)
    for dx in np.arange(-span, span + 0.1, step):
        for dy in np.arange(-span, span + 0.1, step):
            if abs(dx) < cw + 2 and abs(dy) < ch + 2:
                continue  # onto the card itself
            xy = apply(H, grid + [dx, dy])
            if (xy < 0).any() or (xy[:, 0] > w - 1).any() or (xy[:, 1] > h - 1).any():
                continue
            hit = False
            for Hi in invs:
                o = apply(Hi, xy)
                if ((o[:, 0] > -2) & (o[:, 0] < cw + 2) & (o[:, 1] > -2) & (o[:, 1] < ch + 2)).any():
                    hit = True
                    break
            if hit:
                continue
            v = sample(src, xy)
            # every point of the patch like the ring (a patch half concrete, half floor is unlike it), its texture
            # like the ring's, and near rather than far
            cost = (np.abs(v - target[0]).sum(1).mean() + 0.5 * abs((v @ [0.2126, 0.7152, 0.0722]).std() - target[1])
                    + 0.002 * np.hypot(dx, dy) / 10)
            if cost < best:
                best, pick = cost, np.array([dx, dy])
    print(f'  fill: auto {pick.round(1).tolist()}')
    return pick


# 1. the plate --------------------------------------------------------------------------------------------------

def fill(plate, src, H, w, h, cw, ch, c, others=()):
    """A card's footprint, and round it, filled with the surface `fill` mm away, matched and feathered in."""
    g = c.get('grow', 1.0)
    clear = c.get('clear', [0, 0, 0, 0])
    out = [g + x for x in clear]
    pix, uv, d = region(H, w, h, cw, ch, [o + 1.5 for o in out])  # 1.5 mm more to feather into
    if not len(pix):
        return
    off = np.array(auto_fill(src, H, w, h, cw, ch, others) if c.get('fill') == 'auto' else c.get('fill', [0, -(ch + 4)]), float)
    srcxy = apply(H, uv + off)
    outside = ((srcxy < 0) | (srcxy > [w - 1, h - 1])).any(1).mean()
    if outside > 0.02:
        print(f'  warning: {outside:.0%} of a fill comes from outside the picture')
    base = plate.copy() if c.get('from_plate') else src  # from the plate already filled over: past another card
    copy = sample(base, srcxy)
    # brightness and colour: the ring just outside, as it is against as the copy would put it, side by side: a
    # gain at points round the ring, spread over the footprint by distance (a card across a shadow's edge)
    ring, ruv, rd = region(H, w, h, cw, ch, [o + 4 for o in out])
    band = (rd > max(out) + 1.5) & (rd < max(out) + 4)
    if band.sum() > 30:
        rp, bu = ring[band], ruv[band]
        # no other card's pixels in the ring: they'd set the gain to their colour
        clean = np.ones(len(rp), bool)
        for Ho in others:
            o = apply(np.linalg.inv(Ho), rp.astype(float))
            clean &= ~((o[:, 0] > -1.5) & (o[:, 0] < cw + 1.5) & (o[:, 1] > -1.5) & (o[:, 1] < ch + 1.5))
        rp, bu = rp[clean], bu[clean]
        here = src[rp[:, 1], rp[:, 0]] if len(rp) else np.ones((1, 3))
        there = sample(base, apply(H, bu + off)) if len(rp) else np.ones((1, 3))
        bu = bu if len(rp) else np.zeros((1, 2))
        # pool the ring into patches of ~6 mm so texture averages out
        cell = np.floor(bu / 6).astype(int)
        keys, inv = np.unique(cell, axis=0, return_inverse=True)
        inv = inv.ravel()
        cnt = np.bincount(inv)
        pu = np.stack([np.bincount(inv, bu[:, q]) / cnt for q in range(2)], -1)
        ph = np.stack([np.bincount(inv, here[:, q]) / cnt for q in range(3)], -1)
        pt = np.stack([np.bincount(inv, there[:, q]) / cnt for q in range(3)], -1)
        gain = np.clip(ph / np.maximum(pt, 1e-3), 0.1, 3.0)
        reach = c.get('gain_reach', 15.0)  # mm: how far a ring patch's gain carries in
        acc, wsum = np.zeros((len(uv), 3)), np.zeros((len(uv), 1))
        for a0 in range(0, len(uv), 20000):
            d2 = ((uv[a0:a0 + 20000, None, :] - pu[None]) ** 2).sum(-1)
            d2 -= d2.min(1, keepdims=True)  # relative to the nearest patch: far from every patch is not black
            wgt = np.exp(-d2 / (2 * reach ** 2)) * cnt[None]
            acc[a0:a0 + 20000] = wgt @ gain
            wsum[a0:a0 + 20000] = wgt.sum(1, keepdims=True)
        copy *= acc / np.maximum(wsum, 1e-9)
    # how far each pixel is past the filled area, side by side (the clear margins differ by side)
    t, r, b, l = out
    past = np.maximum.reduce([-uv[:, 1] - t, uv[:, 0] - cw - r, uv[:, 1] - ch - b, -uv[:, 0] - l, np.zeros(len(uv))])
    a = np.clip(1 - past / 1.5, 0, 1)[:, None]
    plate[pix[:, 1], pix[:, 0]] = plate[pix[:, 1], pix[:, 0]] * (1 - a) + copy * a


# 3. the light --------------------------------------------------------------------------------------------------

def light_map(img, H, cw, ch, stroke=1.5, ink='dark', others=(), n=(510, 330)):
    """The light on the template's card (RGB), its printing taken out, over its lit paper's colour.

    Printing is what is THIN: a stroke narrower than `stroke` mm that stands off the paper round it (darker for
    ink 'dark', lighter for 'light', either for 'both'), found by a top-hat transform. Wide shapes, a window's bars
    or a bottle's shadow, are never thin, so they are kept with their edges; a caustic's thin bright rays survive
    unless ink is 'light' or 'both'."""
    inset = 0.5  # mm: the template card's very edge, and the surface just past it, kept out
    gu, gv = np.meshgrid(inset + (np.arange(n[0]) + 0.5) * (cw - 2 * inset) / n[0],
                         inset + (np.arange(n[1]) + 0.5) * (ch - 2 * inset) / n[1])
    rgb = sample(img, apply(H, np.c_[gu.ravel(), gv.ravel()])).reshape(n[1], n[0], 3)
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722])
    px = n[0] / cw  # pixels of the map per mm
    k = int(2 * stroke * px) | 1
    printing = np.zeros(lum.shape, bool)
    if ink in ('dark', 'both'):
        closed = ndimage.grey_closing(lum, size=(k, k))
        printing |= (closed - lum) > 0.015 + 0.15 * closed  # relative: dark print on paper in shadow too
    if ink in ('light', 'both'):
        opened = ndimage.grey_opening(lum, size=(k, k))
        printing |= (lum - opened) > 0.015 + 0.15 * opened
    printing = ndimage.binary_dilation(printing, iterations=max(1, int(0.25 * stroke * px)))
    xy = apply(H, np.c_[gu.ravel(), gv.ravel()])
    for Ho in others:  # another template card lying over this one is not this card's light
        o = apply(np.linalg.inv(Ho), xy)
        printing |= ((o[:, 0] > -1) & (o[:, 0] < cw + 1) & (o[:, 1] > -1) & (o[:, 1] < ch + 1)).reshape(lum.shape)
    keep = (~printing).astype(float)
    # the printing filled from the paper round it (normalised convolution)
    s = max(1.0, 0.5 * stroke * px)  # the fill's reach, half the detection's, so a glyph isn't a blotch
    num = ndimage.gaussian_filter(rgb * keep[..., None], (s, s, 0))
    den = ndimage.gaussian_filter(keep, s)[..., None]
    filled = np.where(printing[..., None], num / np.maximum(den, 1e-3), rgb)
    filled = ndimage.gaussian_filter(filled, (n[0] / 400, n[0] / 400, 0))
    flum = filled @ np.array([0.2126, 0.7152, 0.0722])
    paper = flum[~printing] if (~printing).any() else flum
    lo, hi = np.percentile(paper, [55, 75])  # the lit paper: the middle of its upper half, not a caustic's ray
    lit = filled[(flum >= lo) & (flum <= hi)].mean(0)
    return np.clip(filled / np.maximum(lit, 1e-3), 0, 2.5), rgb, printing, (~printing).mean()


def main():
    path = Path(sys.argv[1])
    shot = json.loads(path.read_text())
    quick = '--quick' in sys.argv
    work = path.with_suffix('')
    work.mkdir(exist_ok=True)
    src = np.asarray(Image.open(shot['plate']).convert('RGB'), float) / 255
    h, w, _ = src.shape
    cw, ch = shot.get('size', [85, 55])
    rect = np.array([[0, 0], [cw, 0], [cw, ch], [0, ch]], float)
    cards = shot['cards']
    keep = [i for i, c in enumerate(cards) if not c.get('remove')]  # "remove": the template's, filled over only

    # 0. one camera for every kept card
    cam, fitted, places, err = fit_camera([cards[i] for i in keep], w, h, cw, ch, shot.get('lens'))
    print(f'lens {cam["f"] * 36 / w:.1f} mm, corners fitted to {err:.1f} px rms')
    corners = [c['corners'] for c in cards]
    for j, i in enumerate(keep):
        corners[i] = fitted[j]
    homs = [homography(rect, np.array([[q[k][0] * w, q[k][1] * h] for k in KEYS])) for q in corners]

    # 1. the plate
    plate = src.copy()
    for i, (c, H) in enumerate(zip(cards, homs)):
        fill(plate, src, H, w, h, cw, ch, c, [homs[j] for j in range(len(cards)) if j != i])
    Image.fromarray((np.clip(plate, 0, 1) * 255).astype(np.uint8)).save(work / 'plate.png')

    # 2. the render
    blend = dict(shot, render=str(work / 'render.png'), render_cards=str(work / 'cards.png'), camera=cam,
                 cards=[dict(cards[i], corners=corners[i], place=places[j]) for j, i in enumerate(keep)])
    (work / 'blend.json').write_text(json.dumps(blend))
    args = [BLENDER, '-b', '--python', str(ROOT / 'web' / 'scripts' / 'identity-cut.py'), '--', str(work / 'blend.json')]
    run = subprocess.run(args + (['--quick'] if quick else []), capture_output=True, text=True)
    if not (work / 'render.png').exists() or 'Error' in run.stdout:
        print(run.stdout[-3000:], run.stderr[-2000:])
        sys.exit(1)
    def load(name):
        r = np.asarray(Image.open(work / name))
        return r.astype(float) / np.iinfo(r.dtype).max
    whole, alone = load('render.png'), load('cards.png')
    rgb, a = alone[..., :3], alone[..., 3:4]
    # what the cards do to the surface: the darkening the catchers add, beyond the cards themselves; `shadow`
    # scales it (1 as rendered)
    dark = np.clip((whole[..., 3:4] - a) / np.maximum(1 - a, 1e-4), 0, 1) * shot.get('shadow', 1.0)

    # premultiplied, the render over the plate, before the light (the light falls on both)
    pre = rgb * a
    blur, edge = shot.get('blur', 0.4), shot.get('edge', 0.7)
    if blur:
        pre = ndimage.gaussian_filter(pre, (blur, blur, 0))
    if edge:
        a = ndimage.gaussian_filter(a, (edge, edge, 0))
        pre = ndimage.gaussian_filter(pre, (edge, edge, 0))
        dark = ndimage.gaussian_filter(dark, (edge, edge, 0))
    # the paper's tooth, in each card's plane so it foreshortens with it
    tooth = shot.get('tooth', 0.03)
    if tooth:
        rng = np.random.default_rng(7)
        g = 0.12
        field = ndimage.gaussian_filter(rng.normal(0, 1, (int(ch / g), int(cw / g))), 1.2)
        field += 0.5 * ndimage.gaussian_filter(rng.normal(0, 1, field.shape), 4)
        field /= field.std()
        for i in keep:
            pix, uv, _ = region(homs[i], w, h, cw, ch)
            m = ndimage.map_coordinates(field, [uv[:, 1] / g, uv[:, 0] / g], order=1, mode='wrap')
            pre[pix[:, 1], pix[:, 0]] *= (1 + tooth * m)[:, None]
    out = pre + plate * (1 - a) * (1 - dark)

    # 3. the photograph's light, where each card shows (not under a card above it), on it and through its slots
    noise = []
    for i in keep:
        c = cards[i]
        on_top = [homs[j] for j in range(len(cards)) if j != i and cards[j].get('under', 0) < c.get('under', 0)]
        L, raw, printing, paper = light_map(src, homs[i], cw, ch, c.get('stroke', 1.5), c.get('ink', 'dark'), on_top)
        k = c.get('light', shot.get('light', 1.0))
        pix, uv, _ = region(homs[i], w, h, cw, ch)
        above = np.zeros(len(pix), bool)
        for j in keep:
            if cards[j].get('under', 0) < c.get('under', 0):
                ruv = apply(np.linalg.inv(homs[j]), pix.astype(float))
                above |= (ruv[:, 0] > 0) & (ruv[:, 0] < cw) & (ruv[:, 1] > 0) & (ruv[:, 1] < ch)
        pix, uv = pix[~above], uv[~above]
        rows, cols = uv[:, 1] / ch * L.shape[0] - 0.5, uv[:, 0] / cw * L.shape[1] - 0.5
        lv = np.stack([ndimage.map_coordinates(L[..., q], [rows, cols], order=1, mode='nearest') for q in range(3)], -1)
        out[pix[:, 1], pix[:, 0]] *= 1 - k + k * lv
        # the photograph's grain, off the template card's paper
        hp = raw - ndimage.gaussian_filter(raw, (1.0, 1.0, 0))
        if (~printing).sum() > 500:  # robust (median absolute deviation), so light edges don't count as grain
            v = hp[~printing]
            noise.append(1.4826 * np.median(np.abs(v - np.median(v, 0)), 0))
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(work / 'mix.png')

    # 4. grain where the render is
    grain = shot.get('grain', 'auto')
    sd = (np.clip(np.median(noise, 0), 0.004, 0.012) if noise else np.full(3, 0.006)) if grain == 'auto' else np.full(3, grain / 100)
    rng = np.random.default_rng(1)
    out = out + rng.normal(0, 1, out.shape) * sd * a
    Image.fromarray((np.clip(out, 0, 1) * 255).round().astype(np.uint8)).save(shot['out'], quality=93)
    print(shot['out'], f'grain {np.round(sd * 255, 1)}')


if __name__ == '__main__':
    main()
