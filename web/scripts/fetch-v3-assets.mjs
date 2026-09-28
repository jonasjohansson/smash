/**
 * Fetch the v3 labyrinth's textures and skies from Poly Haven (all CC0) into
 * src/v3/. Committed, so the site never depends on Poly Haven at runtime.
 *
 *   node scripts/fetch-v3-assets.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('src/v3');
const TEXTURES = {
  cobblestone_floor_04: '1k', // S: cobbles
  forest_ground_04: '1k', // M: forest floor
  ganges_river_pebbles: '1k', // A: under the water
  coast_sand_01: '1k', // S: sand
  terrazzo_tiles: '1k', // H: polished stone
  concrete_layers_02: '1k', // the walls
  sparse_grass: '1k', // outside the block (day)
  asphalt_02: '1k', // rain: wet asphalt
  metal_grate_rusty: '1k', // rain: grating
  dirty_tiles: '1k', // rain: grimy tiles
  road_damaged: '1k', // rain: outside the block
};
const MAPS = { Diffuse: 'diff', nor_gl: 'nor', arm: 'arm' }; // arm: ambient occlusion, roughness, metalness
const HDRIS = { kloofendal_48d_partly_cloudy_puresky: '1k', belfast_sunset_puresky: '1k', overcast_soil_puresky: '1k', moonlit_golf: '1k', rogland_clear_night: '2k' };

async function get(url, file) {
  if (fs.existsSync(file)) return;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  console.log('  ', path.relative(OUT, file));
}

for (const [id, res] of Object.entries(TEXTURES)) {
  const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
  for (const [key, short] of Object.entries(MAPS)) {
    await get(files[key][res].jpg.url, path.join(OUT, 'tex', `${id}_${short}.jpg`));
  }
}
for (const [id, res] of Object.entries(HDRIS)) {
  const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
  await get(files.hdri[res].hdr.url, path.join(OUT, 'sky', `${id}.hdr`));
}
console.log('done');
