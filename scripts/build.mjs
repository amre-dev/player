import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/fonts', { recursive: true });

await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'esm', target: ['es2020', 'chrome90'], outfile: 'dist/app.js', legalComments: 'none' });

// الخطوط محلية (تعمل بدون إنترنت داخل التطبيق)
let fontCss = '';
const fdir = 'node_modules/@fontsource/tajawal/files';
if (existsSync(fdir)) {
  for (const w of [400, 700, 900]) {
    const f = `tajawal-arabic-${w}-normal.woff2`;
    if (readdirSync(fdir).includes(f)) {
      cpSync(`${fdir}/${f}`, `dist/fonts/${f}`);
      fontCss += `@font-face{font-family:'Tajawal';font-weight:${w};font-display:swap;src:url(fonts/${f}) format('woff2')}\n`;
    }
  }
}
writeFileSync('dist/app.css', fontCss + readFileSync('src/style.css', 'utf8'));
cpSync('public', 'dist', { recursive: true });
cpSync('index.html', 'dist/index.html');
const sw = readFileSync('dist/sw.js', 'utf8').replace('__BUILD__', String(Date.now()));
writeFileSync('dist/sw.js', sw);
console.log('built -> dist');
