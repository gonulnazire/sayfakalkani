// Remotion'un çıkardığı JPEG karelerini ve müziği tek bir MP4 dosyasında birleştirir.
//
// Neden ayrı bir betik: Windows'ta Akıllı Uygulama Denetimi (Smart App Control) açıkken
// Remotion'un imzasız FFmpeg dosyaları engellenir ve `remotion render` MP4 üretemez.
// Bu betik kodlamayı Remotion'un zaten kullandığı Chrome'un içinde, WebCodecs ile yapar
// (H.264 video + AAC ses). FFmpeg gerekmez.
//
// Kullanım: npm run render:browser  (önce kareleri çıkarır, sonra bu betiği çalıştırır)
import {spawn} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ensureBrowser} from '@remotion/renderer';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const timing = JSON.parse(readFileSync(join(root, 'src', 'timing.json'), 'utf8'));
const FRAMES_DIR = join(root, 'out', 'frames');
const OUTPUT = join(root, 'out', 'video.mp4');
const TIMEOUT_MS = 20 * 60 * 1000;

const frameNumber = (name) => Number(name.match(/(\d+)\.jpe?g$/)[1]);
const frames = readdirSync(FRAMES_DIR)
  .filter((name) => /\d+\.jpe?g$/.test(name))
  .sort((a, b) => frameNumber(a) - frameNumber(b));

const expected = timing.durationInSeconds * timing.fps;
if (frames.length !== expected) {
  console.error(`out/frames içinde ${frames.length} kare var, ${expected} bekleniyordu. Önce "npm run frames" çalıştırın.`);
  process.exit(1);
}

const HTML = `<!doctype html>
<script type="importmap">
  {"imports": {"mediabunny": "/lib/mediabunny.mjs", "@mediabunny/aac-encoder": "/lib/aac-encoder.mjs"}}
</script>
<script type="module" src="/encoder-page.js"></script>`;

const STATIC = {
  '/encoder-page.js': join(root, 'scripts', 'encoder-page.js'),
  '/lib/mediabunny.mjs': join(root, 'node_modules', 'mediabunny', 'dist', 'bundles', 'mediabunny.mjs'),
  '/lib/aac-encoder.mjs': join(
    root,
    'node_modules',
    '@mediabunny',
    'aac-encoder',
    'dist',
    'bundles',
    'mediabunny-aac-encoder.mjs',
  ),
  '/audio.wav': join(root, 'public', 'music.wav'),
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

let chrome;
let profileDir;

const finish = (code) => {
  chrome?.kill();
  server.close();
  // Chrome profil klasörünü hemen bırakmayabilir; silinemezse geçici klasörde kalır.
  setTimeout(() => {
    try {
      rmSync(profileDir, {recursive: true, force: true});
    } catch {}
    process.exit(code);
  }, 500);
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, {'content-type': 'text/html'}).end(HTML);
    } else if (req.method === 'GET' && url.pathname === '/config') {
      res
        .writeHead(200, {'content-type': 'application/json'})
        .end(JSON.stringify({fps: timing.fps, frameCount: frames.length}));
    } else if (req.method === 'GET' && url.pathname.startsWith('/frames/')) {
      const index = Number(url.pathname.slice('/frames/'.length));
      res.writeHead(200, {'content-type': 'image/jpeg'}).end(readFileSync(join(FRAMES_DIR, frames[index])));
    } else if (req.method === 'GET' && STATIC[url.pathname]) {
      const type = url.pathname.endsWith('.wav') ? 'audio/wav' : 'text/javascript';
      res.writeHead(200, {'content-type': type}).end(readFileSync(STATIC[url.pathname]));
    } else if (req.method === 'POST' && url.pathname === '/progress') {
      process.stdout.write(`\rKodlanıyor: ${(await readBody(req)).toString()}   `);
      res.writeHead(204).end();
    } else if (req.method === 'POST' && url.pathname === '/done') {
      const mp4 = await readBody(req);
      mkdirSync(dirname(OUTPUT), {recursive: true});
      writeFileSync(OUTPUT, mp4);
      res.writeHead(204).end();
      console.log(`\nout/video.mp4 yazıldı (${(mp4.length / 1e6).toFixed(1)} MB).`);
      finish(0);
    } else if (req.method === 'POST' && url.pathname === '/fail') {
      const message = (await readBody(req)).toString();
      res.writeHead(204).end();
      console.error(`\nKodlama başarısız oldu:\n${message}`);
      finish(1);
    } else {
      res.writeHead(404).end();
    }
  } catch (err) {
    res.writeHead(500).end(String(err));
  }
});

server.listen(0, '127.0.0.1', async () => {
  const {port} = server.address();
  const browser = await ensureBrowser();
  if (!('path' in browser)) {
    console.error('Chrome bulunamadı. Bir kez "npx remotion browser ensure" çalıştırın.');
    finish(1);
    return;
  }
  profileDir = mkdtempSync(join(tmpdir(), 'sozlesme-encode-'));
  chrome = spawn(
    browser.path,
    ['--headless', '--no-first-run', `--user-data-dir=${profileDir}`, `http://127.0.0.1:${port}/`],
    {stdio: 'ignore'},
  );
  console.log(`${frames.length} kare Chrome içinde kodlanıyor...`);
  setTimeout(() => {
    console.error('\nKodlama zaman aşımına uğradı.');
    finish(1);
  }, TIMEOUT_MS).unref();
});
