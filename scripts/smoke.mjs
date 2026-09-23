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

/* ---------------- 텍스트 JSON 적용 ----------------
 * index.dev.html 의 data-src 를 그대로 읽어 넣는다.
 * 이렇게 해야 아래 씬 구동에서 "없는 키"가 실제로 걸린다.
 * 언어별로 전부 넣고, 마지막에 각 언어로 한 번씩 돌려 검사한다. */
const TEXT_RE = /<script\s+type="application\/json"[^>]*?data-kind="([a-z]+)"[^>]*?data-lang="([a-z]+)"[^>]*?data-src="([^"]+)"/g;
const LANGS = [];
for (const [, kind, lang, src] of html.matchAll(TEXT_RE)) {
  let raw;
  try { raw = readFileSync(join(ROOT, src), "utf8"); }
  catch { console.error("  텍스트 파일 없음: " + src); process.exit(1); }
  try { S.Text.apply(kind, JSON.parse(raw), lang); }
  catch (e) {
    console.error("  JSON 파싱 실패: " + src + " - " + e.message);
    process.exit(1);
  }
  if (!LANGS.includes(lang)) LANGS.push(lang);
}
for (const lang of LANGS) {
  for (const kind of S.Text.KINDS) {
    if (!S.Text.loaded(kind, lang)) {
      console.error("  " + kind + "." + lang + " JSON 을 불러오지 못했습니다");
      process.exit(1);
    }
  }
}
S.Text.lang = LANGS[0];
S.rebuildParts(); S.rebuildQuiz();
S.Text.missing = {};   // 로드 이전의 조회는 검사 대상이 아니다

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

/* 보스전은 strict 모드 — 오답이면 같은 문제를 다시 내고, 정답이면 해체 카드를
   1.5초 띄운다. 카드 대기 때문에 일반 전투보다 프레임이 많이 든다. */
scene('퀴즈 배틀 — 보스 (strict)', () => {
  S.Game.change('battle', {
    enemy: 'e_cable', enemyName: '혼선 케이블', quizSet: 'boss', bgm: 'boss',
    strict: true,
    back: { map: 'hubroom', at: { x: 11, y: 11, dir: 'up' } }, onWin: () => {}
  });
  frames(1400, { ok: 14 });
});

/* 해체의 방: 보스에게 부딪혀 전투가 걸리고, 쓰러뜨리면 제단까지 길이 열린다 */
scene('해체의 방 — 보스 조우 → 제단', () => {
  S.State.reset();
  S.State.chapter = 3;
  S.State.flags.gatePassed = true;
  S.State.flags.missionDone = true;
  S.Game.change('field', { map: 'hubroom' });
  frames(60, { dir: 'up' });                       // 보스에 부딪힘
  if (!S.Game.scene.mw.active && S.Game.sceneName === 'field') {
    throw new Error('보스에 부딪혔는데 아무 일도 없다');
  }
  frames(200, { ok: 12 });                          // 대사 넘기고 전투 진입
  if (S.Game.sceneName !== 'battle') throw new Error('보스전이 시작되지 않았다: ' + S.Game.sceneName);

  // 전부 정답으로 밀어 격파
  const B = S.Game.scene;
  for (let i = 0; i < 3000 && S.Game.sceneName === 'battle'; i++) {
    if (B.phase === 1) B.sel = B.qs[B.qi].ans;
    frames(1, { ok: 1 });
  }
  if (!S.State.flags.bossDone) throw new Error('bossDone 이 서지 않았다');
  const boss = S.obj('hubroom', 'boss');
  if (!boss.hidden) throw new Error('쓰러뜨린 보스가 안 사라졌다');

  frames(200, { ok: 12 });                          // 승리 대사 → 방으로 복귀
  if (S.Game.sceneName !== 'field') throw new Error('방으로 안 돌아왔다: ' + S.Game.sceneName);
  if (!S.Game.scene.passable(11, 10)) throw new Error('보스가 사라졌는데 길이 막혀 있다');
});

/* 실습은 장인에게 말을 걸어야 시작된다 — 그 전까지 패널은 안내 화면이다 */
scene('필드 — 조립 공방 (분할)', () => {
  S.State.reset();
  S.State.chapter = 2;
  S.State.flags.gatePassed = true;
  S.Game.change('field', { map: 'workshop' });

  frames(30);                                       // 대기 화면이 그려지는지
  if (S.Mission.started()) throw new Error('말도 안 걸었는데 실습이 시작됐다');
  frames(60, { ok: 10 });                           // Z 를 눌러도 안 넘어가야 한다
  if (S.State.missionStep !== 0) throw new Error('시작 전에 페이지가 넘어갔다');

  S.Dialogue.talk('workshop', 'maker', S.Game.scene);
  if (!S.Mission.started()) throw new Error('말을 걸었는데 시작되지 않았다');
  frames(300, { ok: 12 });                          // 시작 대사 넘기기
  frames(40, { dir: 'up' });
  frames(60, { ok: 15 });
});

scene('필드 — 해체의 방', () => {
  S.Game.change('field', { map: 'hubroom' });
  frames(40, { dir: 'up' });
  frames(40, { ok: 15 });
});

scene('엔딩', () => { S.Game.change('ending'); frames(200, { ok: 40 }); });

/* 체력이 0 이 되면 게임오버 (DESIGN.md §0 의 "게임오버 없음"은 운영 요청으로 뒤집혔다).
   비보스 문제는 관문 + 케이블, 체력도 그 수와 같게 잡혀 있어(S.ASK / State.maxHp)
   전부 틀리면 마지막 문제에서 0 이 된다. 5분판에서는 2 + 1 = 3 개다. */
scene('게임오버 — 체력 소진', () => {
  S.State.reset();
  const nonBoss = S.ASK.gate + S.ASK.mission;
  if (S.State.maxHp !== nonBoss) {
    throw new Error(`체력(${S.State.maxHp})이 비보스 문제 수(${nonBoss})와 다르다 — 전부 틀려도 게임오버가 안 나거나 너무 일찍 난다`);
  }
  const allWrong = (set, back) => {
    S.Game._pending = null; S.Game._fade = 0; S.Game._fadeDir = 0;
    S.Game.change('battle', { enemy: 'e_pin', enemyName: 'T', quizSet: set, back, onWin: () => {} });
    const B = S.Game.scene;
    for (let i = 0; i < 3000 && S.Game.sceneName === 'battle'; i++) {
      if (B.phase === 1) B.sel = (B.qs[B.qi].ans + 1) % B.qs[B.qi].choices.length;
      frames(1, { ok: 1 });
    }
  };
  allWrong('gate', { map: 'village' });
  if (S.State.hp !== S.ASK.mission) {
    throw new Error(`관문 ${S.ASK.gate}문제 오답 후 체력이 ${S.ASK.mission} 이 아니다: ` + S.State.hp);
  }
  allWrong('mission', { map: 'workshop' });
  if (S.State.hp !== 0) throw new Error('체력이 0 이 아니다: ' + S.State.hp);
  if (S.Game.sceneName !== 'gameover') throw new Error('게임오버로 안 갔다: ' + S.Game.sceneName);
  // 게임오버 화면은 1초 뒤에야 입력을 받는다. 한 번만 누르고 페이드가 끝나길 기다린다
  // (계속 누르면 타이틀에서 또 먹혀 오프닝까지 가 버린다)
  frames(80);
  frames(1, { ok: 1 });
  for (let i = 0; i < 200 && S.Game.sceneName === 'gameover'; i++) frames(1);
  if (S.Game.sceneName !== 'attract') throw new Error('게임오버 → 타이틀로 안 갔다: ' + S.Game.sceneName);
});

/* 5분판 예산 — 숫자가 슬금슬금 늘어나면 부스 회전이 무너진다 (DESIGN.md §4-1) */
scene('5분 예산 검사', () => {
  if (S.TOTAL_SECONDS !== 300) throw new Error('TOTAL_SECONDS 가 300 이 아니다: ' + S.TOTAL_SECONDS);
  const guide = S.GUIDE_PAGES.reduce((n, p) => n + p.budget, 0);
  if (guide > 160) throw new Error('가이드 예산 합계가 160초를 넘는다: ' + guide);
  const asked = S.ASK.gate + S.ASK.mission + S.ASK.boss;
  if (asked > 7) throw new Error('출제 수가 7문제를 넘는다: ' + asked);
  if (S.ASK.boss !== S.QUIZ.boss.length) throw new Error('보스 문제는 줄일 수 없다 (해체 4단계)');
  for (const set of Object.keys(S.ASK)) {
    const got = S.pickQuiz(set);
    if (got.length !== S.ASK[set]) throw new Error(set + ' 출제 수 불일치: ' + got.length);
  }
  process.stdout.write(`       타이머 ${S.TOTAL_SECONDS}초 · 가이드 ${guide}초 · 출제 ${asked}문제
`);
});

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
  if (!g || g.tx !== 11 || g.ty !== 16) throw new Error('맵 원상복구 실패: 문지기 위치 ' + (g && g.tx + ',' + g.ty));
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

/* ---------------- 텍스트 검사 ----------------
 * (1) 전 씬을 돌리는 동안 조회됐는데 JSON 에 없던 키
 * (2) 언어끼리 키 구조가 어긋나지 않는가
 *     번역 파일에서 키를 빠뜨리면 그 자리에 [key] 가 뜬다.
 *     기준 언어와 키 트리를 비교해 미리 잡는다. */
scene('텍스트 키 전수 검사', () => {
  const miss = Object.keys(S.Text.missing);
  if (miss.length) {
    throw new Error("JSON 에 없는 키 " + miss.length + "개:\n       " + miss.join("\n       "));
  }
  const count = (o, n = 0) => {
    for (const k in o) n += (typeof o[k] === "object" && o[k]) ? count(o[k]) : 1;
    return n;
  };
  let total = 0;
  for (const kind of S.Text.KINDS) total += count(S.Text.store[LANGS[0]][kind]);
  process.stdout.write("       " + LANGS[0] + " 기준 " + total + "개 항목 · " +
    S.Text.KINDS.join("/") + "\n");
});

scene('언어 간 키 일치 검사', () => {
  /* meta 와 note 류는 언어마다 달라도 된다 */
  const SKIP = new Set(["meta", "_note", "font"]);
  const keysOf = (o, pre = "", out = []) => {
    for (const k in o) {
      if (!pre && SKIP.has(k)) continue;
      const path = pre ? pre + "." + k : k;
      const v = o[k];
      if (v && typeof v === "object" && !Array.isArray(v)) keysOf(v, path, out);
      else out.push(path);
    }
    return out;
  };
  const base = LANGS[0];
  const problems = [];
  for (const kind of S.Text.KINDS) {
    const a = new Set(keysOf(S.Text.store[base][kind]));
    for (const lang of LANGS.slice(1)) {
      const b = new Set(keysOf(S.Text.store[lang][kind]));
      for (const k of a) if (!b.has(k)) problems.push(lang + " 에 없음: " + kind + "." + k);
      for (const k of b) if (!a.has(k)) problems.push(base + " 에 없음: " + kind + "." + k);
    }
  }
  if (problems.length) {
    throw new Error(problems.length + "건 어긋남:\n       " + problems.join("\n       "));
  }
  process.stdout.write("       언어 " + LANGS.join(", ") + " 키 구조 일치\n");
});

/* ---------------- 결과 ---------------- */
console.log('');
if (fails.length) {
  console.log(`  실패 ${fails.length}건: ${fails.join(', ')}\n`);
  process.exit(1);
}
console.log(`  소스 ${loaded}개 로드, 전 씬 통과\n`);
process.exit(0);
