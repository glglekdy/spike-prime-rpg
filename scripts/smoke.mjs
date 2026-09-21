/* ============================================================
 *  scripts/smoke.mjs — 헤드리스 스모크 테스트
 *  캔버스/DOM을 흉내 내서 모든 씬을 실제로 돌려보고
 *  런타임 예외를 잡아낸다.  node scripts/smoke.mjs
 * ============================================================ */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------------- 캔버스/DOM 스텁 ---------------- */
function makeCtx(cv) {
  const noop = () => {};
  return {
    canvas: cv,
    fillStyle: '#000', strokeStyle: '#000', font: '12px sans',
    textBaseline: 'top', globalAlpha: 1, imageSmoothingEnabled: false,
    globalCompositeOperation: 'source-over',
    fillRect: noop, strokeRect: noop, clearRect: noop, fillText: noop,
    save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
    beginPath: noop, closePath: noop, rect: noop, clip: noop, stroke: noop, fill: noop,
    drawImage(img) {
      if (!img) throw new Error('drawImage(null) — 스프라이트가 없습니다');
      if (img.width === undefined) throw new Error('drawImage: 잘못된 이미지');
    },
    measureText: (t) => ({ width: String(t).length * 7 }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
    putImageData: noop,
    createLinearGradient: () => ({ addColorStop: noop })
  };
}

function makeCanvas() {
  const cv = { width: 300, height: 150, style: {}, _isCanvas: true };
  cv.getContext = () => (cv._ctx || (cv._ctx = makeCtx(cv)));
  cv.getBoundingClientRect = () => ({ left: 0, top: 0, width: cv.width, height: cv.height });
  cv.addEventListener = () => {};
  cv.remove = () => {};
  return cv;
}

const listeners = {};
const gameCanvas = makeCanvas();

const win = {
  innerWidth: 1280, innerHeight: 1024,
  addEventListener: (k, f) => { (listeners[k] ||= []).push(f); },
  removeEventListener: () => {},
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 0,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Math, Date, JSON, console, Object, Array, String, Number, Boolean, Error,
  Uint8ClampedArray, Map, Set
};
win.window = win;
win.globalThis = win;

const doc = {
  readyState: 'complete',
  createElement: (tag) => (tag === 'canvas' ? makeCanvas() : { style: {}, remove() {}, appendChild() {} }),
  getElementById: (id) => (id === 'game' ? gameCanvas : null),
  addEventListener: () => {}
};
win.document = doc;

const sandbox = vm.createContext(win);
Object.assign(sandbox, {
  performance: win.performance,
  requestAnimationFrame: win.requestAnimationFrame,
  setTimeout, clearTimeout, setInterval, clearInterval, console
});

/* ---------------- 소스 로드 ---------------- */
const html = readFileSync(join(ROOT, 'index.dev.html'), 'utf8');
const files = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1]);

let loaded = 0;
for (const f of files) {
  if (f.endsWith('main.js')) continue;         // 부팅은 직접 제어
  try {
    vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), sandbox, { filename: f });
    loaded++;
  } catch (e) {
    console.error(`\n  ✗ 로드 실패  ${f}\n    ${e.message}\n`);
    process.exit(1);
  }
}

const S = sandbox.SPIKE;
if (!S) { console.error('SPIKE 전역이 만들어지지 않았습니다'); process.exit(1); }

/* ---------------- 구동 ---------------- */
let now = 0;
win.performance.now = () => now;

S.Game.renderer = new S.Renderer(gameCanvas);
S.Input.renderer = S.Game.renderer;
S.Input.lastActivity = 0;
S.Sprites.init();

const fails = [];

function frames(n, { ok = 0, dir = null, mouse = 0 } = {}) {
  for (let i = 0; i < n; i++) {
    now += 16;
    S.Input.pressed = {};
    S.Input.released = {};
    S.Input.mouse.pressed = false;
    if (ok && i % ok === 0) S.Input.pressed.ok = true;
    if (mouse && i % mouse === 0) S.Input.mouse.pressed = true;
    if (dir) S.Input.down[dir] = true;
    S.Input.lastActivity = now;
    S.Game._loop(now);
  }
  if (dir) S.Input.down[dir] = false;
}

function scene(label, fn) {
  try { fn(); process.stdout.write(`  OK   ${label}\n`); }
  catch (e) {
    fails.push(label);
    process.stdout.write(`  FAIL ${label}\n       ${e.message}\n`);
    if (process.env.SMOKE_TRACE) console.log(e.stack);
  }
}

S.State.reset();

scene('타이틀 (attract)', () => { S.Game.change('attract'); frames(90); });
scene('오프닝 (opening)', () => { S.Game.change('opening'); frames(200, { ok: 20 }); });

scene('필드 — 허브 마을', () => {
  S.Game.change('field', { map: 'village' });
  frames(40, { dir: 'up' });
  frames(40, { dir: 'left' });
  frames(40, { dir: 'down' });
  frames(60, { ok: 15 });
});

scene('부품 카드 (cards)', () => {
  S.Game.change('field', { map: 'village' });
  S.Game.push('cards', { title: '테스트', ids: ['hub', 'motorL', 'dist', 'pinBlack'], onDone: () => {} });
  frames(140, { ok: 12 });
});

scene('도감 (dex)', () => {
  S.Game.change('field', { map: 'village' });
  S.PARTS.forEach((p) => S.State.learn(p.id));
  S.Game.push('dex');
  frames(30, { dir: 'down' });
  frames(30, { dir: 'up' });
  frames(10);
});

scene('퀴즈 배틀 — 관문', () => {
  S.Game.change('battle', {
    enemy: 'e_pin', enemyName: '핀 도둑', quizSet: 'gate',
    back: { map: 'village', at: { x: 11, y: 11, dir: 'down' } },
    onWin: () => {}
  });
  frames(420, { ok: 14 });
});

scene('퀴즈 배틀 — 보스', () => {
  S.Game.change('battle', {
    enemy: 'e_cable', enemyName: '혼선 케이블', quizSet: 'boss', bgm: 'boss',
    back: { map: 'hubroom' }, onWin: () => {}
  });
  frames(520, { ok: 14 });
});

scene('필드 — 조립 공방 (분할)', () => {
  S.State.flags.gatePassed = true;
  S.Game.change('field', { map: 'workshop' });
  frames(40, { dir: 'up' });
  frames(60, { ok: 15 });
});

scene('필드 — 해체의 방', () => {
  S.Game.change('field', { map: 'hubroom' });
  frames(40, { dir: 'up' });
  frames(40, { ok: 15 });
});

scene('엔딩', () => { S.Game.change('ending'); frames(200, { ok: 40 }); });

scene('무인 자동복귀 (Idle)', () => {
  S.Game.change('field', { map: 'village' });
  S.Input.lastActivity = now - 95000;
  now += 16; S.Game._loop(now);
  S.Input.lastActivity = now - 105000;
  now += 16; S.Game._loop(now);
});

scene('강사 단축키', () => {
  S.Game.change('field', { map: 'village' });
  S.Hotkeys.handle({ code: 'F1', preventDefault() {} });
  frames(3);
  S.Hotkeys.handle({ code: 'F1', preventDefault() {} });
  S.Hotkeys.handle({ code: 'F2', preventDefault() {} });
  frames(3);
  S.Hotkeys.handle({ code: 'Digit2', preventDefault() {} });
  frames(30);
  S.Hotkeys.handle({ code: 'F3', preventDefault() {} });
  S.Hotkeys.handle({ code: 'KeyM', preventDefault() {} });
  S.Hotkeys.handle({ code: 'KeyR', ctrlKey: true, preventDefault() {} });
  frames(30);
});

scene('전체 재시작 (다음 학생)', () => {
  S.State.reset();
  const g = S.npc('village', 'guard');
  if (!g || g.tx !== 11 || g.ty !== 12) throw new Error('맵 원상복구 실패: 문지기 위치 ' + (g && g.tx + ',' + g.ty));
  if (S.State.dexCount() !== 0) throw new Error('도감이 초기화되지 않음');
  S.Game.change('attract'); frames(30);
});

/* ---------------- 스프라이트 누락 검사 ---------------- */
scene('스프라이트 전수 검사', () => {
  const need = new Set();
  S.PARTS.forEach((p) => need.add(p.icon));
  Object.values(S.MAPS).forEach((m) => {
    (m.objects || []).forEach((o) => need.add(o.sprite));
    (m.npcs || []).forEach((n) => {
      ['down', 'up', 'side'].forEach((d) => [0, 1, 2].forEach((f) => need.add(`${n.char}_${d}_${f}`)));
    });
  });
  ['down', 'up', 'side'].forEach((d) => [0, 1, 2].forEach((f) => need.add(`hero_${d}_${f}`)));
  Object.values(S.TERRAIN).forEach((t) => need.add(t));
  ['e_cable', 'e_pin', 'o_excl', 'o_altar'].forEach((x) => need.add(x));
  Object.values(S.QUIZ).flat().forEach((q) => q.icon && need.add(q.icon));

  const missing = [...need].filter((id) => !S.Sprites.get(id));
  if (missing.length) throw new Error('누락된 스프라이트: ' + missing.join(', '));
  process.stdout.write(`       스프라이트 ${need.size}종 확인\n`);
});

/* ---------------- 결과 ---------------- */
console.log('');
if (fails.length) {
  console.log(`  실패 ${fails.length}건: ${fails.join(', ')}\n`);
  process.exit(1);
}
console.log(`  소스 ${loaded}개 로드, 전 씬 통과\n`);
process.exit(0);
