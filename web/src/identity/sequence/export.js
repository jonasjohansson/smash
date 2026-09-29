// The sequence as an MP4, made in the browser when it is asked for: one whole
// loop, each frame drawn at its exact time (not recorded off the screen, so
// none is dropped and it runs faster than real time), encoded as H.264 by the
// browser (WebCodecs), with the loop's sound rendered offline from the same
// moves and encoded as AAC (or Opus where AAC is not offered), put together in
// an MP4 by mp4-muxer. Loaded only when the download button is pressed.

const MUXER = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/+esm';

/** The first of these configurations the browser can encode, or null. */
async function supported(Encoder, configs) {
  for (const c of configs) {
    try { if ((await Encoder.isConfigSupported(c)).supported) return c; } catch {}
  }
  return null;
}

/** Wait while an encoder has more than n frames queued. */
const drain = (enc, n) => new Promise((r) => { const go = () => (enc.encodeQueueSize > n ? setTimeout(go, 1) : r()); go(); });

/**
 * One loop as an MP4 Blob. `svgAt(t)` gives the whole frame at time t as an
 * SVG string (its own viewBox, no ground); `sound()` the loop's sound as an
 * AudioBuffer. onProgress(0 to 1) as it goes.
 */
export async function renderVideo({ period, svgAt, sound, ink, paper, width = 1920, height = 1080, fps = 60, onProgress = () => {} }) {
  if (!('VideoEncoder' in window)) throw new Error('this browser cannot encode video (no WebCodecs)');
  const { Muxer, ArrayBufferTarget } = await import(MUXER);
  const video = await supported(VideoEncoder, [
    { codec: 'avc1.64002A', width, height, bitrate: 12e6, framerate: fps }, // High, level 4.2: 1080p at 60
    { codec: 'avc1.4D002A', width, height, bitrate: 12e6, framerate: fps },
    { codec: 'avc1.42002A', width, height, bitrate: 12e6, framerate: fps },
  ]);
  if (!video) throw new Error('this browser cannot encode H.264 at this size');
  const buffer = await sound();
  const rate = buffer.sampleRate, channels = buffer.numberOfChannels;
  const audio = 'AudioEncoder' in window ? await supported(AudioEncoder, [
    { codec: 'mp4a.40.2', sampleRate: rate, numberOfChannels: channels, bitrate: 192000 },
    { codec: 'opus', sampleRate: rate, numberOfChannels: channels, bitrate: 160000 },
  ]) : null;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height, frameRate: fps },
    ...(audio ? { audio: { codec: audio.codec === 'opus' ? 'opus' : 'aac', numberOfChannels: channels, sampleRate: rate } } : {}),
    fastStart: 'in-memory',
  });
  let failed = null;
  const venc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { failed = e; } });
  venc.configure(video);

  // The sound first: short, and done at once.
  if (audio) {
    const aenc = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: (e) => { failed = e; } });
    aenc.configure(audio);
    const block = 4096;
    const chans = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
    for (let i = 0; i < buffer.length; i += block) {
      const n = Math.min(block, buffer.length - i);
      const data = new Float32Array(n * channels);
      chans.forEach((ch, c) => data.set(ch.subarray(i, i + n), c * n));
      aenc.encode(new AudioData({ format: 'f32-planar', sampleRate: rate, numberOfFrames: n, numberOfChannels: channels, timestamp: Math.round((i / rate) * 1e6), data }));
    }
    await aenc.flush();
    aenc.close();
  }

  // Then every frame: the SVG drawn onto a canvas over the ground.
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const frames = Math.round(period * fps);
  for (let i = 0; i < frames; i++) {
    if (failed) throw failed;
    const svg = svgAt(i / fps).replace('<svg ', `<svg width="${width}" height="${height}" color="${ink}" `);
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i / fps) * 1e6), duration: Math.round(1e6 / fps) });
    venc.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();
    await drain(venc, 8);
    if (i % 10 === 0) onProgress(i / frames);
  }
  await venc.flush();
  venc.close();
  if (failed) throw failed;
  muxer.finalize();
  onProgress(1);
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}
