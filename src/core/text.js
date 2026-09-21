/* ============================================================
 *  SPIKE.Text — 외부 JSON 텍스트 리소스
 *
 *  대사와 UI 텍스트를 코드에서 분리해 JSON으로 관리한다.
 *    content/ui.ko.json        UI 텍스트 (버튼·라벨·가이드 문구·폰트 설정)
 *    content/dialogue.ko.json  대사 (NPC·장인·전투·엔딩)
 *
 *  키는 영어 점 표기법.  S.T('common.next')  S.D('village.gran.intro')
 *
 *  불러오는 경로 3가지 — 앞에서부터 우선한다
 *    1) <script type="application/json" id="spike-ui"> 인라인  (배포본)
 *    2) fetch(data-src)                                        (개발 서버)
 *    3) 없으면 빈 채로 두고 코드의 fallback 사용                (안전망)
 *
 *  부스 현장에서 재빌드 없이 고치는 법:
 *    JSON 파일을 게임 화면에 드래그&드롭 하거나 F4 → 파일 선택.
 *    (file:// 에서도 동작한다. FileReader 는 CORS 를 타지 않는다)
 * ============================================================ */
(function (S) {
  'use strict';

  var Text = S.Text = {
    ui: {},
    dialogue: {},
    missing: {},        // 참조됐지만 JSON에 없는 키 (스모크 테스트가 검사한다)
    loaded: { ui: false, dialogue: false },
    onChange: null,     // 런타임 교체 시 호출 (캐시 비우기 등)

    /* ---------------- 조회 ---------------- */

    /* 'a.b.c' 경로로 중첩 객체를 판다 */
    _dig: function (root, key) {
      var parts = String(key).split('.');
      var cur = root;
      for (var i = 0; i < parts.length; i++) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = cur[parts[i]];
      }
      return cur;
    },

    _get: function (root, key, fallback) {
      var v = this._dig(root, key);
      if (v === undefined || v === null) {
        this.missing[key] = true;
        return fallback !== undefined ? fallback : '[' + key + ']';
      }
      return v;
    },

    /* UI 텍스트 */
    t: function (key, fallback) { return this._get(this.ui, key, fallback); },

    /* 대사 */
    d: function (key, fallback) { return this._get(this.dialogue, key, fallback); },

    /* 배열(여러 줄 대사)을 반드시 배열로 받는다 */
    list: function (root, key) {
      var v = this._get(root === 'ui' ? this.ui : this.dialogue, key, null);
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

    apply: function (kind, obj) {
      if (!obj || typeof obj !== 'object') return false;
      this[kind] = obj;
      this.loaded[kind] = true;
      if (kind === 'ui') this._applyFont(obj.font);
      return true;
    },

    /* ui.json 의 font 설정을 반영 (폰트 교체용 훅) */
    _applyFont: function (f) {
      if (!f || !S.Font) return;
      if (f.family) S.Font.family = f.family;
      if (typeof f.threshold === 'number') S.Font.threshold = f.threshold;
      if (typeof f.binarize === 'boolean') S.Font.binarize = f.binarize;
      S.Font.cache.clear();
    },

    /* ---------------- 부팅 로드 ---------------- */

    /* 인라인 <script type="application/json"> 또는 fetch(data-src) */
    _loadOne: function (kind, elId) {
      var self = this;
      var el = document.getElementById(elId);
      if (!el) return Promise.resolve(false);

      var inline = (el.textContent || '').trim();
      if (inline) {
        try { return Promise.resolve(self.apply(kind, JSON.parse(inline))); }
        catch (e) { console.error('[Text] 인라인 JSON 파싱 실패:', elId, e); return Promise.resolve(false); }
      }

      var src = el.getAttribute('data-src');
      if (!src || typeof fetch !== 'function') return Promise.resolve(false);

      return fetch(src)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { return j ? self.apply(kind, j) : false; })
        .catch(function () {
          // file:// 에서는 fetch 가 막힌다 — 코드 fallback 으로 간다
          console.warn('[Text] ' + src + ' 을 읽지 못했습니다. 내장 기본값을 씁니다.');
          return false;
        });
    },

    boot: function () {
      var self = this;
      return Promise.all([
        this._loadOne('ui', 'spike-ui'),
        this._loadOne('dialogue', 'spike-dialogue')
      ]).then(function () {
        self._installDropLoader();
        return self;
      });
    },

    /* ---------------- 런타임 교체 (재빌드 없이) ---------------- */

    /* 파일 이름으로 종류를 추측한다: *ui*.json → ui, 그 외 → dialogue */
    kindOf: function (filename) {
      return /ui/i.test(filename) ? 'ui' : 'dialogue';
    },

    loadFile: function (file) {
      var self = this;
      return new Promise(function (resolve) {
        var fr = new FileReader();
        fr.onload = function () {
          try {
            var obj = JSON.parse(fr.result);
            var kind = (obj.meta && obj.meta.kind) || self.kindOf(file.name);
            self.apply(kind, obj);
            if (self.onChange) self.onChange(kind);
            self.toast = kind + ' 텍스트를 교체했습니다: ' + file.name;
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

    /* 교체 결과를 화면 위에 잠깐 띄운다 */
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

    /* F4 — 파일 선택 대화상자 */
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
  S.TL = function (key) { return Text.list('ui', key); };        // UI 배열
  S.DL = function (key) { return Text.list('dialogue', key); };  // 대사 배열
})(SPIKE);
