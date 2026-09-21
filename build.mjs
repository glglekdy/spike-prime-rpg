/* ============================================================
 *  build.mjs — index.dev.html 의 스크립트/CSS를 전부 인라인해서
 *  dist/spike-prime-rpg.html (단일 파일 배포본)을 만든다.
 *
 *    node build.mjs
 * ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(ROOT, 'dist');
const OUT = join(OUT_DIR, 'spike-prime-rpg.html');   // 부스 배포본 (더블클릭용 이름)
const OUT_INDEX = join(OUT_DIR, 'index.html');       // 웹 배포용 (Vercel 이 / 로 서빙)

const html = readFileSync(join(ROOT, 'index.dev.html'), 'utf8');

/* </script> 가 문자열 안에 있어도 HTML 파서가 끊지 않도록 */
const escapeScript = (s) => s.replace(/<\/script>/gi, '<\\/script>');

let total = 0;
const inlined = [];

let out = html
  /* 텍스트 JSON 인라인 — data-src 를 읽어 태그 안에 넣는다.
     file:// 에서는 fetch 가 막히므로 배포본에는 반드시 인라인돼야 한다. */
  .replace(/<script\s+type="application\/json"([^>]*?)data-src="([^"]+)"\s*><\/script>/gi,
    (_m, attrs, src) => {
      const raw = readFileSync(join(ROOT, src), 'utf8');
      JSON.parse(raw);                                   // 깨진 JSON을 빌드에서 잡는다
      total += Buffer.byteLength(raw);
      inlined.push(src);
      const safe = raw.replace(/<\//g, '<\/');
      const keep = attrs.replace(/\s*data-src="[^"]*"/, '').trim();
      return `<script type="application/json" ${keep}>
${safe}
</script>`;
    })
  .replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*>/gi, (_m, href) => {
    let css = readFileSync(join(ROOT, href), 'utf8');
    /* @font-face 의 url(...) 을 base64 data URI 로 바꾼다.
       file:// 에서는 상대경로 폰트를 못 읽으므로 반드시 구워 넣어야 한다. */
    const cssDir = dirname(join(ROOT, href));
    css = css.replace(/url\(['"]?([^'")]+\.woff2)['"]?\)\s*format\(['"]woff2['"]\)/gi,
      (_u, fp) => {
        const buf = readFileSync(join(cssDir, fp));
        total += buf.length;
        inlined.push(fp);
        return `url(data:font/woff2;base64,${buf.toString('base64')}) format('woff2')`;
      });
    total += Buffer.byteLength(css);
    inlined.push(href);
    return `<style>\n${css}\n</style>`;
  })
  .replace(/<script\s+src="([^"]+)"\s*><\/script>/gi, (_m, src) => {
    const js = readFileSync(join(ROOT, src), 'utf8');
    total += Buffer.byteLength(js);
    inlined.push(src);
    return `<script>\n/* ==== ${src} ==== */\n${escapeScript(js)}\n</script>`;
  });

out = out
  .replace('<title>SPIKE 마스터 ~잠든 허브 왕~ (개발용)</title>',
           '<title>SPIKE 마스터 ~잠든 허브 왕~</title>')
  .replace('<!doctype html>',
    `<!doctype html>\n<!--\n  SPIKE 마스터 ~잠든 허브 왕~\n  중학생 학과체험용 SPIKE Prime 안내 RPG\n  단일 파일 배포본 — 인터넷 없이 더블클릭으로 실행됩니다.\n  빌드: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}\n-->`);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, out, 'utf8');
/* 같은 내용을 index.html 로도 쓴다. 정적 호스팅은 / 요청에 index.html 을 찾는다.
   (git 에는 안 올린다 — .gitignore) */
writeFileSync(OUT_INDEX, out, 'utf8');

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log(`\n  파일 ${inlined.length}개 인라인 (소스 ${kb(total)})`);
console.log(`  → ${OUT}`);
console.log(`  → ${OUT_INDEX}  (웹 배포용)`);
console.log(`  최종 크기 ${kb(statSync(OUT).size)}\n`);
