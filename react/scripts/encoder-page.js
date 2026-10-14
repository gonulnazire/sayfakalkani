// Bu dosya Node'da değil, encode-video.mjs'in açtığı Chrome sayfasında çalışır.
// Kareleri ve müziği sunucudan çeker, WebCodecs ile MP4'e kodlar ve sonucu geri gönderir.
import {
  AudioSample,
  AudioSampleSource,
  BufferTarget,
  Mp4OutputFormat,
  Output,
  VideoSample,
  VideoSampleSource,
  canEncodeAudio,
  canEncodeVideo,
} from 'mediabunny';
import {registerAacEncoder} from '@mediabunny/aac-encoder';

const post = (path, body) => fetch(path, {method: 'POST', body});
const fetchFrame = async (i) => createImageBitmap(await (await fetch(`/frames/${i}`)).blob());

// 16-bit PCM WAV dosyasını düzlemsel (kanal kanal) float örneklere çevirir.
const decodeWav = (buffer) => {
  const view = new DataView(buffer);
  const tag = (offset) => String.fromCharCode(...new Uint8Array(buffer, offset, 4));
  let channels = 0;
  let sampleRate = 0;
  let offset = 12;
  while (offset < view.byteLength) {
    const id = tag(offset);
    const size = view.getUint32(offset + 4, true);
    if (id === 'fmt ') {
      channels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
    } else if (id === 'data') {
      const count = size / (2 * channels);
      const planar = new Float32Array(count * channels);
      for (let i = 0; i < count; i++) {
        for (let ch = 0; ch < channels; ch++) {
          planar[ch * count + i] = view.getInt16(offset + 8 + (i * channels + ch) * 2, true) / 32768;
        }
      }
      return {planar, channels, sampleRate};
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error('WAV dosyasında ses verisi bulunamadı.');
};

try {
  const {fps, frameCount} = await (await fetch('/config')).json();
  let bitmap = await fetchFrame(0);
  const {width, height} = bitmap;

  if (!(await canEncodeVideo('avc', {width, height}))) {
    throw new Error('Bu Chrome sürümü H.264 video kodlayamıyor.');
  }
  // Chrome'da yerleşik AAC kodlayıcı yoksa WebAssembly ile çalışan kodlayıcıyı kullan.
  if (!(await canEncodeAudio('aac'))) {
    registerAacEncoder();
  }

  const output = new Output({
    format: new Mp4OutputFormat({fastStart: 'in-memory'}),
    target: new BufferTarget(),
  });
  const video = new VideoSampleSource({codec: 'avc', bitrate: 12_000_000, keyFrameInterval: 2});
  const audio = new AudioSampleSource({codec: 'aac', bitrate: 192_000});
  output.addVideoTrack(video, {frameRate: fps});
  output.addAudioTrack(audio);
  await output.start();

  const wav = decodeWav(await (await fetch('/audio.wav')).arrayBuffer());
  const audioSample = new AudioSample({
    data: wav.planar,
    format: 'f32-planar',
    numberOfChannels: wav.channels,
    sampleRate: wav.sampleRate,
    timestamp: 0,
  });
  await audio.add(audioSample);
  audioSample.close();
  audio.close();

  for (let i = 0; i < frameCount; i++) {
    // Bir sonraki kareyi, bu kare kodlanırken indir.
    const next = i + 1 < frameCount ? fetchFrame(i + 1) : null;
    const sample = new VideoSample(bitmap, {timestamp: i / fps, duration: 1 / fps});
    await video.add(sample);
    sample.close();
    bitmap.close();
    if (i % 30 === 0) post('/progress', `${i}/${frameCount} kare`);
    if (next) bitmap = await next;
  }
  video.close();

  await output.finalize();
  await post('/done', output.target.buffer);
} catch (err) {
  await post('/fail', String(err?.stack ?? err));
}
