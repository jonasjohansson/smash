// The sequence as an MP4, made in the browser when it is asked for: one whole
// loop, each frame drawn at its exact time (not recorded off the screen, so
// none is dropped and it runs faster than real time), encoded as H.264 by the
// browser (WebCodecs) at a constant quality (so even the first frames are
// sharp), with the loop's sound rendered offline from the same moves and
// encoded as AAC (or Opus where AAC is not offered), put together in an MP4 by
// mp4-muxer. Loaded only when the download button is pressed.
//
// The file can open anywhere in the loop (`start`): picture and sound are both
// turned round by the same amount, so it still loops without a seam. The AAC
// encoder puts 2112 samples of silence in front of the sound (its priming),
// which mp4-muxer has no way to mark as skipped, so the sound is fed that much
// ahead, and lands on its picture to the sample.

const MUXER = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/+esm';
const AAC_PRIMING = 2112; // samples, Chrome's AAC encoder (AudioToolbox, 48 kHz)

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
 * One loop as an MP4 Blob, from `start` seconds into it. `svgAt(t)` gives the
 * whole frame at time t as an SVG string (its own viewBox, no ground);
 * `sound()` the loop's sound as an AudioBuffer. onProgress(0 to 1) as it goes.
 */
export async function renderVideo({ period, start = 0, svgAt, sound, ink, paper, width = 1600, height = 1200, fps = 60, onProgress = () => {} }) {
  if (!('VideoEncoder' in window)) throw new Error('this browser cannot encode video (no WebCodecs)');
  const { Muxer, ArrayBufferTarget } = await import(MUXER);
  const base = { width, height, framerate: fps };
  const video = await supported(VideoEncoder, [
    { ...base, codec: 'avc1.640033', bitrateMode: 'quantizer' }, // High, level 5.1, constant quality
    { ...base, codec: 'avc1.64002A', bitrateMode: 'quantizer' },
    { ...base, codec: 'avc1.640033', bitrate: 16e6 },
    { ...base, codec: 'avc1.64002A', bitrate: 12e6 },
    { ...base, codec: 'avc1.4D002A', bitrate: 12e6 },
    { ...base, codec: 'avc1.42002A', bitrate: 12e6 },
  ]);
  if (!video) throw new Error('this browser cannot encode H.264 at this size');
  const buffer = await sound();
  const rate = buffer.sampleRate, channels = buffer.numberOfChannels;
  const audio = 'AudioEncoder' in window ? await supported(AudioEncoder, [
    { codec: 'mp4a.40.2', sampleRate: rate, numberOfChannels: channels, bitrate: 256000 },
    { codec: 'opus', sampleRate: rate, numberOfChannels: channels, bitrate: 192000 },
  ]) : null;

  const frames = Math.round(period * fps);
  const endUs = (frames / fps) * 1e6; // where the picture ends: the sound ends there too
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height, frameRate: fps },
    ...(audio ? { audio: { codec: audio.codec === 'opus' ? 'opus' : 'aac', numberOfChannels: channels, sampleRate: rate } } : {}),
    fastStart: 'in-memory',
  });
  let failed = null;
  const venc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { failed = e; } });
  venc.configure(video);

  // The sound first: the loop turned round to the file's start, and ahead by the encoder's priming.
  if (audio) {
    const aenc = new AudioEncoder({ output: (chunk, meta) => { if (chunk.timestamp < endUs - 1) muxer.addAudioChunk(chunk, meta); }, error: (e) => { failed = e; } });
    aenc.configure(audio);
    const n = buffer.length;
    const priming = audio.codec.startsWith('mp4a') ? AAC_PRIMING : 0;
    const shift = Math.round(start * rate) + priming;
    const chans = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
    const block = 4096;
    const feed = Math.min(n, Math.round((frames / fps) * rate)) - priming; // with the priming, exactly the picture's length
    for (let i = 0; i < feed; i += block) {
      const m = Math.min(block, feed - i);
      const data = new Float32Array(m * channels);
      chans.forEach((ch, c) => { for (let j = 0; j < m; j++) data[c * m + j] = ch[(((i + j + shift) % n) + n) % n]; });
      aenc.encode(new AudioData({ format: 'f32-planar', sampleRate: rate, numberOfFrames: m, numberOfChannels: channels, timestamp: Math.round((i / rate) * 1e6), data }));
    }
    await aenc.flush();
    aenc.close();
  }

  // Then every frame: the SVG drawn onto a canvas over the ground.
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  // Each frame drawn at twice the size and scaled down, so edges are smoothed once, evenly, wherever they fall.
  const big = new OffscreenCanvas(width * 2, height * 2);
  const bctx = big.getContext('2d');
  const constant = video.bitrateMode === 'quantizer';
  for (let i = 0; i < frames; i++) {
    if (failed) throw failed;
    const svg = svgAt(start + i / fps).replace('<svg ', `<svg width="${width * 2}" height="${height * 2}" color="${ink}" `);
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    bctx.fillStyle = paper;
    bctx.fillRect(0, 0, width * 2, height * 2);
    bctx.drawImage(img, 0, 0, width * 2, height * 2);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(big, 0, 0, width, height);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i / fps) * 1e6), duration: Math.round(1e6 / fps) });
    venc.encode(frame, { keyFrame: i % (fps * 2) === 0, ...(constant ? { avc: { quantizer: 10 } } : {}) });
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
