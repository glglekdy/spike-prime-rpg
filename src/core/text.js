/* ============================================================
 *  SPIKE.Text — 외부 JSON 텍스트 리소스 + 언어 전환
 *
 *  게임에 나오는 모든 글자를 코드에서 분리해 JSON 으로 관리한다.
 *    content/ui.<lang>.json        UI (버튼·라벨·가이드 문구·폰트 설정)
 *    content/dialogue.<lang>.json  대사 (NPC·장인·전투·엔딩)
 *    content/parts.<lang>.json     부품 도감
 *    content/quiz.<lang>.json      퀴즈 문제·해설
 *
 *  키는 영어 점 표기법.  S.T('common.next')   S.D('village.gran.intro')
 *
 *  불러오는 경로 3가지 — 앞에서부터 우선한다
 *    1) <script type="application/json" id="spike-<kind>-<lang>"> 인라인  (배포본)
 *    2) fetch(data-src)                                                  (개발 서버)
 *    3) 없으면 코드의 fallback                                            (안전망)
 *
 *  언어 전환: 타이틀 화면의 버튼 또는 S.Text.setLang('en').
 *  부스에서 강사가 한 번 정하면 학생이 바뀌어도 유지된다 (State.reset 과 무관).
 *
 *  재빌드 없이 문구 고치기: JSON 을 화면에 드래그&드롭 하거나 F4.
 *  (file:// 에서도 된다 — FileReader 는 CORS 를 타지 않는다)
 * ============================================================ */
(function (S) {
  'use strict';

  var KINDS = ['ui', 'dialogue', 'parts', 'quiz'];

  var Text = S.Text = {
    KINDS: KINDS,

    lang: 'ko',
    langs: ['ko'],          // 실제로 불러온 언어들 (토글 순서)
    store: {},              // store[lang][kind] = 객체
    missing: {},            // 참조됐지만 없는 키 (스모크 테스트가 검사한다)
    onChange: null,         // 언어·내용이 바뀔 때 (도감/퀴즈 재구성용)

    /* ---------------- 조회 ---------------- */

    ns: function (kind) {
      var l = this.store[this.lang];
      return (l && l[kind]) || {};
    },

    _dig: function (root, key) {
      var parts = String(key).split('.');
      var cur = root;
      for (var i = 0; i < parts.length; i++) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = cur[parts[i]];
      }
      return cur;
    },

    get: function (kind, key, fallback) {
      var v = this._dig(this.ns(kind), key);
      if (v === undefined || v === null) {
        this.missing[kind + ':' + key] = true;
        return fallback !== undefined ? fallback : '[' + key + ']';
      }
      return v;
    },

    t: function (key, fb) { return this.get('ui', key, fb); },
    d: function (key, fb) { return this.get('dialogue', key, fb); },

    /* 반드시 배열로 */
    list: function (kind, key) {
      var v = this.get(kind, key, null);
      if (v == null) return [];
      return Array.isArray(v) ? v : [v];
    },

    /* {name} 치환 */
    fmt: function (str, vars) {
      if (!vars) return str;
      return String(str).replace(/\{(\w+)\}/g, function (m, k) {
        return vars[k] !== undefined ? vars[k] : m;
      });
    },

    /* ---------------- 적용 ---------------- */

    apply: function (kind, obj, lang) {
      if (!obj || typeof obj !== 'object') return false;
      lang = lang || (obj.meta && obj.meta.lang) || this.lang;
      if (!this.store[lang]) this.store[lang] = {};
      this.store[lang][kind] = obj;
      if (this.langs.indexOf(lang) < 0) this.langs.push(lang);
      if (kind === 'ui' && lang === this.lang) this._applyFont(obj.font);
      return true;
    },

    /* ui.json 의 font 설정을 반영 (폰트 교체용 훅) */
    _applyFont: function (f) {
      if (!f || !S.Font) return;
      if (Array.isArray(f.ladder) && f.ladder.length) S.Font.ladder = f.ladder;
      if (f.fallback) S.Font.fallback = f.fallback;
      if (typeof f.threshold === 'number') S.Font.threshold = f.threshold;
      if (typeof f.binarize === 'boolean') S.Font.binarize = f.binarize;
      S.Font.clear();
    },

    /* ---------------- 언어 ---------------- */

    has: function (lang) { return !!this.store[lang]; },

    setLang: function (lang) {
      if (!this.has(lang) || lang === this.lang) return false;
      this.lang = lang;
      this._applyFont(this.ns('ui').font);
      S.Font.clear();
      this._refresh();
      return true;
    },

    /* 다음 언어로 (타이틀 버튼) */
    cycleLang: function () {
      if (this.langs.length < 2) return false;
      var i = this.langs.indexOf(this.lang);
      return this.setLang(this.langs[(i + 1) % this.langs.length]);
    },

    /* 현재 언어의 표시 이름 */
    langName: function (lang) {
      var l = this.store[lang || this.lang];
      return (l && l.ui && l.ui.meta && l.ui.meta.short) || (lang || this.lang).toUpperCase();
    },

    /* 도감·퀴즈처럼 JSON 에서 만들어지는 자료구조를 다시 세운다 */
    _refresh: function () {
      if (S.rebuildParts) S.rebuildParts();
      if (S.rebuildQuiz) S.rebuildQuiz();
      if (this.onChange) this.onChange(this.lang);
    },

    /* ---------------- 부팅 로드 ---------------- */

    _loadEl: function (el) {
      var self = this;
      var kind = el.getAttribute('data-kind');
      var lang = el.getAttribute('data-lang');

      var inline = (el.textContent || '').trim();
      if (inline) {
        try { return Promise.resolve(self.apply(kind, JSON.parse(inline), lang)); }
        catch (e) {
          console.error('[Text] 인라인 JSON 파싱 실패:', el.id, e);
          return Promise.resolve(false);
        }
      }

      var src = el.getAttribute('data-src');
      if (!src || typeof fetch !== 'function') return Promise.resolve(false);

      return fetch(src)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { return j ? self.apply(kind, j, lang) : false; })
        .catch(function () {
          console.warn('[Text] ' + src + ' 을 읽지 못했습니다. 내장 기본값을 씁니다.');
          return false;
        });
    },

    boot: function () {
      var self = this;
      var els = [];
      if (typeof document !== 'undefined' && document.querySelectorAll) {
        els = [].slice.call(document.querySelectorAll('script[data-kind]'));
      }
      return Promise.all(els.map(function (el) { return self._loadEl(el); }))
        .then(function () {
          // 기본 언어가 안 실려 있으면 실린 것 중 첫 번째로
          if (!self.has(self.lang) && self.langs.length) self.lang = self.langs[0];
          self.langs.sort();                       // ko, en 순서 고정
          self._applyFont(self.ns('ui').font);
          // JSON 이 실리기 전(스크립트 로드 시점)의 조회는 당연히 빗나간다.
          // 여기서 지워야 missing 이 '플레이 중 진짜 빠진 키'만 담는다.
          self.missing = {};
          self._refresh();
          self._installDropLoader();
          return self;
        });
    },

    loaded: function (kind, lang) {
      var l = this.store[lang || this.lang];
      return !!(l && l[kind]);
    },

    /* ---------------- 런타임 교체 (재빌드 없이) ---------------- */

    /* 파일 이름에서 종류와 언어를 짐작한다: ui.en.json → ui / en */
    guess: function (filename) {
      var m = String(filename).match(/([a-z]+)\.([a-z]{2})\.json$/i);
      if (m && KINDS.indexOf(m[1].toLowerCase()) >= 0) {
        return { kind: m[1].toLowerCase(), lang: m[2].toLowerCase() };
      }
      for (var i = 0; i < KINDS.length; i++) {
        if (new RegExp(KINDS[i], 'i').test(filename)) return { kind: KINDS[i], lang: null };
      }
      return { kind: 'ui', lang: null };
    },

    loadFile: function (file) {
      var self = this;
      return new Promise(function (resolve) {
        var fr = new FileReader();
        fr.onload = function () {
          try {
            var obj = JSON.parse(fr.result);
            var g = self.guess(file.name);
            var kind = (obj.meta && obj.meta.kind) || g.kind;
            var lang = (obj.meta && obj.meta.lang) || g.lang || self.lang;
            self.apply(kind, obj, lang);
            if (lang === self.lang) { S.Font.clear(); self._refresh(); }
            self.toast = kind + ' (' + lang + ') 교체: ' + file.name;
            self.toastT = 2.5;
            resolve(kind);
          } catch (e) {
            self.toast = 'JSON 오류: ' + e.message;
            self.toastT = 4;
            resolve(null);
          }
        };
        fr.onerror = function () { resolve(null); };
        fr.readAsText(file, 'utf-8');
      });
    },

    toast: '', toastT: 0,

    tick: function (dt) { if (this.toastT > 0) this.toastT -= dt; },

    draw: function (r) {
      if (this.toastT <= 0 || !this.toast) return;
      var w = Math.min(S.W - 16, r.textWidth(this.toast, 11) + 20);
      r.window((S.W - w) / 2, 6, w, 24, { alpha: 0.95 });
      r.text(this.toast, S.W / 2, 13, { size: 11, color: S.C.textHi, align: 'center' });
    },

    _installDropLoader: function () {
      var self = this;
      if (this._dropReady || typeof window === 'undefined') return;
      this._dropReady = true;

      window.addEventListener('dragover', function (e) { e.preventDefault(); });
      window.addEventListener('drop', function (e) {
        e.preventDefault();
        var fs = e.dataTransfer && e.dataTransfer.files;
        if (!fs) return;
        for (var i = 0; i < fs.length; i++) {
          if (/\.json$/i.test(fs[i].name)) self.loadFile(fs[i]);
        }
      });
    },

    /* F4 — 파일 선택 */
    pickFile: function () {
      var self = this;
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.json,application/json';
      inp.multiple = true;
      inp.onchange = function () {
        for (var i = 0; i < inp.files.length; i++) self.loadFile(inp.files[i]);
      };
      inp.click();
    }
  };

  /* 짧은 별칭 — 코드에서 이걸 쓴다 */
  S.T = function (key, fallback) { return Text.t(key, fallback); };
  S.D = function (key, fallback) { return Text.d(key, fallback); };
  S.TL = function (key) { return Text.list('ui', key); };
  S.DL = function (key) { return Text.list('dialogue', key); };
})(SPIKE);
