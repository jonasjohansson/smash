// The sculpture's shading, shared by the object and the room.
//
// - The cut: each extrusion throws away what lies outside the other drawing
//   (a distance field). In the picture the edge is anti-aliased by alpha to
//   coverage (a hard discard gets no multisampling); in the shadow maps it is
//   a hard cut, so each shadow is exactly its drawing.
// - Occlusion: slots and folds darken inside, read from the long-range fields.
// - Light: each of the two lights is a stage beam, brightest on its axis. The
//   walls take it as a pool; the object as a hot centre, so a flat face still
//   shades from crown to chest.
//
// Everything the object is cut and shaded by is in its own frame (vCut, from
// uCutLocal): each extrusion's local space, before its depth is scaled.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

/** The two lights' directions of travel (front, then side: the order they are added to the scene), shared by every beam. */
export function beamLights() {
  return { uBeamDir: { value: [new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0)] } };
}

/** A beam's shape: centre (a point on its axis), radii across and up, and (where the fall-off starts, how dark its rim). */
export function beamShape(c, r, k) {
  return {
    uBeamC: { value: new THREE.Vector3(...c) },
    uBeamR: { value: new THREE.Vector2(...r) },
    uBeamK: { value: new THREE.Vector2(...k) },
  };
}

export const BEAM_PARS = /* glsl */ `
uniform vec3 uBeamDir[2];
uniform vec3 uBeamC;
uniform vec2 uBeamR;
uniform vec2 uBeamK;
float beam(vec3 d) {
  vec3 rel = vRoom - uBeamC;
  rel -= d * dot(rel, d);
  vec3 h = normalize(cross(d, vec3(0.0, 1.0, 0.0)));
  vec3 v = cross(h, d);
  float r = length(vec2(dot(rel, h), dot(rel, v)) / uBeamR);
  return mix(uBeamK.y, 1.0, 1.0 - smoothstep(uBeamK.x, 1.0, r));
}
`;

/** The light loop with each directional light shaped by its beam. */
export const BEAM_LIGHTS = THREE.ShaderChunk.lights_fragment_begin.replace(
  'getDirectionalLightInfo( directionalLight, directLight );',
  'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= beam( uBeamDir[ i ] );',
);

/**
 * On the object, each light's highlight comes from its lamp, standing where the light does
 * (uLampView, in view space), while its diffuse light stays exactly parallel. A directional light
 * is a point at infinity: its highlight is the same over a whole flat face, so a camera square on
 * to one (which here is always on a light's axis) sees the face flare in one flat fill. From the
 * lamp, a polished face shows a hot spot with a fall-off. uDirectRough softens it (at least);
 * uLampSpec scales it (a mirror of so bright a lamp would otherwise blind the whole face).
 */
const DIR_START = '#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )';
const OBJECT_LIGHTS = BEAM_LIGHTS.slice(0, BEAM_LIGHTS.indexOf(DIR_START)) + BEAM_LIGHTS.slice(BEAM_LIGHTS.indexOf(DIR_START)).replace(
  'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
  `{
\t\t\tPhysicalMaterial matte = material;
\t\t\tmatte.specularColor = vec3( 0.0 );
\t\t\tmatte.specularF90 = 0.0;
\t\t\t#ifdef USE_CLEARCOAT
\t\t\t\tmatte.clearcoatF0 = vec3( 0.0 );
\t\t\t\tmatte.clearcoatF90 = 0.0;
\t\t\t#endif
\t\t\tRE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, matte, reflectedLight );
\t\t\tIncidentLight glint = directLight;
\t\t\tglint.direction = normalize( uLampView[ i ] - geometryPosition );
\t\t\tglint.color *= uLampSpec;
\t\t\tPhysicalMaterial gloss = material;
\t\t\tgloss.diffuseColor = vec3( 0.0 );
\t\t\tgloss.roughness = max( material.roughness, uDirectRough );
\t\t\t#ifdef USE_CLEARCOAT
\t\t\t\tgloss.clearcoatRoughness = max( material.clearcoatRoughness, uDirectRough );
\t\t\t#endif
\t\t\tRE_Direct( glint, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, gloss, reflectedLight );
\t\t}`,
);

/** The room position, for the beams: added to a material's vertex shader. */
export const ROOM_VERT = (vs) => vs
  .replace('#include <common>', '#include <common>\nvarying vec3 vRoom;')
  .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoom = (modelMatrix * vec4(transformed, 1.0)).xyz;');

/**
 * One extrusion's cut: the other drawing's fields (near for the edge, far for
 * how deep a slot runs), its own far field (what lies across a slot or fold),
 * and where the extrusion sits in the object.
 * axis 1: cut by the side (read at z, y), its own drawing the mark (x, y). axis 0: the reverse.
 */
export function cutUniforms(axis) {
  return {
    uCutMask: { value: null },
    uCutFar: { value: null },
    uCutXf: { value: new THREE.Vector4() },
    uOwnFar: { value: null },
    uOwnXf: { value: new THREE.Vector4() },
    uFarBand: { value: 0.3 },
    uCutAxis: { value: axis },
    uCutOn: { value: 1 },
    uCutDilate: { value: 0.5 },
    uCutLocal: { value: new THREE.Matrix4() },
    uCutNScale: { value: new THREE.Vector3(1, 1, 1) },
  };
}

const CUT_VERT_DEPTH = (vs) => vs
  .replace('#include <common>', '#include <common>\nuniform mat4 uCutLocal;\nvarying vec3 vCut;')
  .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCut = (uCutLocal * vec4(transformed, 1.0)).xyz;');

const CUT_VERT = (vs) => ROOM_VERT(vs)
  .replace('#include <common>', '#include <common>\nuniform mat4 uCutLocal;\nuniform vec3 uCutNScale;\nvarying vec3 vCut;\nvarying vec3 vCutN;')
  .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCut = (uCutLocal * vec4(transformed, 1.0)).xyz;\nvCutN = normalize(objectNormal * uCutNScale);');

const CUT_PARS = /* glsl */ `
varying vec3 vCut;
uniform sampler2D uCutMask;
uniform sampler2D uCutFar;
uniform vec4 uCutXf;
uniform float uCutAxis;
uniform float uCutOn;
uniform float uCutDilate;
vec2 cutQ() { return mix(vCut.xy, vCut.zy, uCutAxis); }
float cutField() { return texture2D(uCutMask, cutQ() * uCutXf.xy + uCutXf.zw).r - 0.50196; }
`;

const SHADE_PARS = /* glsl */ `
varying vec3 vCutN;
varying vec3 vRoom;
uniform sampler2D uOwnFar;
uniform vec4 uOwnXf;
uniform float uFarBand;
uniform float uAo;
uniform float uDirectRough;
uniform vec3 uLampView[2];
uniform float uLampSpec;
uniform float uGrain;
uniform float uGrainScale;
uniform float uSpeck;
float farAt(sampler2D t, vec4 xf, vec2 q) { return (texture2D(t, q * xf.xy + xf.zw).r - 0.50196) * 2.0 * uFarBand; }
// How shut in this point is: how far across its slot or fold the material starts again (marched out
// along the normal, in its own drawing), the more so the deeper it lies inside the other drawing
// (a slot is open at its ends).
float cavity() {
  vec2 n = mix(vCutN.zy, vCutN.xy, uCutAxis);
  float ln = length(n);
  if (ln < 0.2) return 1.0; // a cap, facing along the sweep: nothing lies across it
  n /= ln;
  vec2 p = mix(vCut.zy, vCut.xy, uCutAxis);
  float gap = 0.14;
  for (int k = 6; k >= 1; k--) {
    float s = 0.14 * float(k * k) / 36.0; // 0.004 ... 0.14, finer near the wall
    if (farAt(uOwnFar, uOwnXf, p + n * s) > 0.0) gap = s;
  }
  float occ = 1.0 - smoothstep(0.012, 0.13, gap);
  float deep = (uCutAxis > 0.5 && uCutOn > 0.5) ? smoothstep(0.0, 0.3, farAt(uCutFar, uCutXf, cutQ())) : 1.0;
  return 1.0 - uAo * occ * mix(0.2, 1.0, deep);
}
float gHash(vec3 p) { p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float gNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(gHash(i), gHash(i + vec3(1, 0, 0)), f.x), mix(gHash(i + vec3(0, 1, 0)), gHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(gHash(i + vec3(0, 0, 1)), gHash(i + vec3(1, 0, 1)), f.x), mix(gHash(i + vec3(0, 1, 1)), gHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
`;

/**
 * The object's material. U: this extrusion's cutUniforms; G: the surface
 * (grain, speck, occlusion, the lights' highlight), shared; B: the beams (beamLights plus a beamShape).
 * The fade of the cut edge sits just outside the drawing (uCutDilate, in
 * pixels), so where two surfaces meet at a crease both are whole and nothing
 * shows between them.
 */
export function cutMaterial(U, G, B) {
  const m = new THREE.MeshPhysicalMaterial({ color: '#ffffff', dithering: true, clearcoat: 0.001, clearcoatRoughness: 1 });
  m.alphaToCoverage = true;
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U, G, B);
    s.vertexShader = CUT_VERT(s.vertexShader);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\n${CUT_PARS}${SHADE_PARS}${BEAM_PARS}`)
      .replace('#include <alphatest_fragment>', /* glsl */ `
        float cutS = cutField();
        float cover = uCutOn > 0.5 ? clamp(0.5 + cutS / max(fwidth(cutS), 1e-5) + uCutDilate, 0.0, 1.0) : 1.0;
        if (cover < 0.004) discard;
        diffuseColor.a = cover;
        {
          vec3 gp = vCut * uGrainScale;
          float g = 0.62 * gNoise(gp) + 0.38 * gNoise(gp * 0.23 + 7.0);
          float speck = smoothstep(0.78, 0.9, gNoise(gp * 2.7 + 3.0)) - smoothstep(0.8, 0.92, gNoise(gp * 3.3 + 9.0));
          diffuseColor.rgb *= 1.0 + uGrain * (g - 0.5) * 2.0 + uSpeck * 0.22 * speck;
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor * (1.0 + 1.5 * uGrain * (gNoise(vCut * uGrainScale * 0.5 + 11.0) - 0.5)), 0.04, 1.0);`)
      .replace('#include <lights_fragment_begin>', OBJECT_LIGHTS)
      .replace('#include <aomap_fragment>', /* glsl */ `#include <aomap_fragment>
        {
          float ao = cavity();
          reflectedLight.indirectDiffuse *= ao;
          reflectedLight.directDiffuse *= mix(1.0, ao, 0.4);
          #if defined( USE_CLEARCOAT )
            clearcoatSpecularIndirect *= ao;
          #endif
          reflectedLight.indirectSpecular *= computeSpecularOcclusion(saturate(dot(geometryNormal, geometryViewDir)), ao, material.roughness);
        }`);
  };
  m.customProgramCacheKey = () => 'smash-sculpture-cut-6';
  return m;
}

/** The same cut for the shadow maps, hard, so each shadow is exactly its drawing. */
export function cutDepth(U) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = CUT_VERT_DEPTH(s.vertexShader);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\n${CUT_PARS}`)
      .replace('void main() {', 'void main() {\n\tif (uCutOn > 0.5 && cutField() < 0.0) discard;');
  };
  m.customProgramCacheKey = () => 'smash-sculpture-cut-depth-2';
  return m;
}
