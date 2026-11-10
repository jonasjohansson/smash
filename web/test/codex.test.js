// The Codex feed read as data.md is read: the shape readProjects() makes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toBlock, toProject } from '../scripts/codex.js';

const feedProject = {
  slug: 'reitan-visuals-artbox',
  title: 'Reitan visuals Artbox',
  caption: 'Liwlig',
  category: 'experience-design',
  date: '2026-09-11',
  year: 2026,
  featured: 2,
  thumb: 'm_b',
  color: '#e73fff',
  tags: [],
  blocks: [
    { type: 'text', content: 'A box of light.' },
    { type: 'image', id: 'm_a', src: 'https://x.public.blob.vercel-storage.com/a.jpg', width: 2400, height: 1600, alt: 'A' },
    { type: 'image', id: 'm_b', src: 'https://x.public.blob.vercel-storage.com/b.jpg', width: 1600, height: 2400, alt: 'B', size: 'half-left' },
    { type: 'video', id: 'm_v', playbackId: 'pb', poster: 'https://image.mux.com/pb/thumbnail.jpg', mp4: 'https://stream.mux.com/pb/highest.mp4', width: 1920, height: 1080 },
    { type: 'credits', credits: ['Client — Reitan'] },
  ],
};

test('a project keeps its fields, its cover is its first picture, its card the one named', () => {
  const p = toProject(feedProject);
  assert.equal(p.slug, 'reitan-visuals-artbox');
  assert.equal(p.category, 'experience-design');
  assert.equal(p.year, 2026);
  assert.equal(p.featured, 2);
  assert.equal(p.cover.id, 'm_a');
  assert.equal(p.thumb.id, 'm_b');
  assert.equal(p.color, '#e73fff');
});

test('pictures carry their aspect ratio, as readProjects() measures it', () => {
  const [, a, b] = toProject(feedProject).blocks;
  assert.equal(a.ar, 1.5);
  assert.equal(b.ar, 2 / 3);
  assert.equal(b.size, 'half-left');
});

test('a film plays its MP4, with its poster frame', () => {
  const v = toBlock(feedProject.blocks[3]);
  assert.equal(v.src, 'https://stream.mux.com/pb/highest.mp4');
  assert.equal(v.poster, 'https://image.mux.com/pb/thumbnail.jpg');
  assert.equal(v.ar, 16 / 9);
});

test('without a card picture, or with one that is not on the page, the cover is the card', () => {
  assert.equal(toProject({ ...feedProject, thumb: null }).thumb.id, 'm_a');
  assert.equal(toProject({ ...feedProject, thumb: 'm_gone' }).thumb.id, 'm_a');
});

test('a project with no pictures has no cover', () => {
  const p = toProject({ ...feedProject, blocks: [{ type: 'text', content: 'Words.' }] });
  assert.equal(p.cover, null);
  assert.equal(p.thumb, null);
});
