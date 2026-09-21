/* ============================================================
 *  SPIKE.Font — 도트 한글 텍스트
 *
 *  폰트 파일을 임베드하지 않고 "진짜 도트"를 얻는 방법:
 *    1) 시스템 폰트로 오프스크린 캔버스에 1배 크기로 그린다
 *    2) 알파값을 이진화(threshold)해서 안티에일리어싱 회색을 날린다
 *    3) 남은 픽셀을 지정 색으로 칠하고, 1px 검정 그림자를 깐다
 *    4) 결과 캔버스를 문자열 단위로 캐시
 *  이 캔버스가 다시 화면 전체 정수배(×3) 확대를 타면서
 *  1픽셀이 3×3 블록이 되어 쯔꾸르 감성이 나온다.
 * ============================================================ */
(function (S) {
  'use strict';

  /* ------------------------------------------------------------
   *  크기 사다리
   *
   *  Mona 는 비트맵 폰트라 **설계 크기와 그 정수배에서만** 선명하다.
   *  11px·13px 로 그리면 브라우저가 외곽선을 보간해 뭉개진다 (실측 확인).
   *  그래서 코드가 요청한 크기를 가장 가까운 "선명한 크기"로 스냅한다.
   *
   *    9~11  → Mona10 @10      12~17 → Mona12 @12
   *    18~25 → Mona10 @20      26~33 → Mona12 @24
   *    34~45 → Mona10 @40      46~   → Mona12 @48
   *
   *  ui.ko.json 의 font.ladder 로 통째로 갈아끼울 수 있다.
   * ---------------------------------------------------------- */
  var LADDER = [
    { max: 11,   family: 'Mona10', px: 10 },
    { max: 17,   family: 'Mona12', px: 12 },
    { max: 25,   family: 'Mona10', px: 20 },
    { max: 33,   family: 'Mona12', px: 24 },
    { max: 45,   family: 'Mona10', px: 40 },
    { max: 9999, family: 'Mona12', px: 48 }
  ];
  var FALLBACK = "Dotum,'돋움',monospace";

  var Font = S.Font = {
    ladder: LADDER,
    fallback: FALLBACK,
    threshold: 96,      // binarize 가 켜졌을 때만 쓰인다
    binarize: false,    // 진짜 픽셀 폰트라 이진화하면 오히려 획이 깨진다 (실측)
                        //   ui.ko.json 의 font.{ladder,fallback,threshold,binarize} 로 바꾼다
    cache: new Map(),
    _measureCtx: null,

    /* ------------------------------------------------------------
     *  웹폰트 선로딩
     *
     *  canvas 의 ctx.font 는 웹폰트 로드를 유발하지 않는다. 그래서 아무 처리 없이
     *  게임을 띄우면 첫 화면이 fallback(돋움)으로 그려지고, 그 결과가 글자 캐시에
     *  영구히 박힌다. 실제로 배포본에서 타이틀이 깨진 채 굳는 것을 확인했다.
     *
     *  그래서 사다리에 등장하는 폰트를 명시적으로 로드하고, 끝나면 캐시를 비운다.
     *  폰트가 없거나 느려도 부스가 멈추면 안 되므로 3초 뒤에는 그냥 진행한다.
     * ---------------------------------------------------------- */
    preload: function () {
      var self = this;
      if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) {
        return Promise.resolve();
      }
      var want = {};
      this.ladder.forEach(function (L) { want[L.family] = L.px; });

      var jobs = Object.keys(want).map(function (fam) {
        return document.fonts.load(want[fam] + 'px "' + fam + '"')
          .catch(function () { /* 폰트가 없으면 fallback 으로 간다 */ });
      });

      var loaded = Promise.all(jobs)
        .then(function () { return document.fonts.ready; })
        .then(function () { self.cache.clear(); });

      var timeout = new Promise(function (res) { setTimeout(res, 3000); });
      return Promise.race([loaded, timeout]).then(function () { self.cache.clear(); });
    },

    /* 요청 크기 → { css, px } */
    snap: function (size) {
      var L = this.ladder;
      for (var i = 0; i < L.length; i++) {
        if (size <= L[i].max) {
          return { css: "'" + L[i].family + "'," + this.fallback, px: L[i].px };
        }
      }
      var last = L[L.length - 1];
      return { css: "'" + last.family + "'," + this.fallback, px: last.px };
    },

    /* 문자열 픽셀 폭 (그림자 1px 포함). 스냅된 실제 크기로 잰다 */
    measure: function (text, size) {
      if (!this._measureCtx) {
        var c = document.createElement('canvas');
        this._measureCtx = c.getContext('2d');
      }
      var f = this.snap(size);
      var ctx = this._measureCtx;
      ctx.font = f.px + 'px ' + f.css;
      return Math.ceil(ctx.measureText(text).width) + 1;
    },

    lineHeight: function (size) { return size + 4; },

    /* 캐시된 도트 텍스트 캔버스 얻기 */
    get: function (text, size, color, shadow) {
      var key = size + '|' + color + '|' + (shadow ? 1 : 0) + '|' + text;
      var hit = this.cache.get(key);
      if (hit) return hit;
      var made = this._render(text, size, color, shadow);
      // 캐시가 너무 커지면 앞쪽부터 버린다 (순환형이라 문자열 종류는 유한)
      if (this.cache.size > 1200) {
        var firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(key, made);
      return made;
    },

    _render: function (text, size, color, shadow) {
      var pad = 2;
      var f = this.snap(size);
      var w = this.measure(text, size) + pad * 2;
      var h = f.px + pad * 2 + 4;

      // --- 1) 흰색으로 글자만 그린다 ---
      var src = document.createElement('canvas');
      src.width = w; src.height = h;
      var sctx = src.getContext('2d', { willReadFrequently: true });
      sctx.font = f.px + 'px ' + f.css;
      sctx.textBaseline = 'top';
      sctx.fillStyle = '#ffffff';
      sctx.fillText(text, pad, pad);

      // --- 2) 알파 이진화 (픽셀 폰트를 쓸 때는 건너뛴다) ---
      if (this.binarize !== false) {
        var img = sctx.getImageData(0, 0, w, h);
        var d = img.data, th = this.threshold;
        for (var i = 0; i < d.length; i += 4) {
          d[i + 3] = d[i + 3] >= th ? 255 : 0;
        }
        sctx.putImageData(img, 0, 0);
      }

      // --- 3) 그림자 + 색 입히기 ---
      var out = document.createElement('canvas');
      out.width = w + 1; out.height = h + 1;
      var octx = out.getContext('2d');
      octx.imageSmoothingEnabled = false;

      if (shadow !== false) {
        octx.drawImage(src, 1, 1);
        octx.globalCompositeOperation = 'source-in';
        octx.fillStyle = '#000000';
        octx.fillRect(0, 0, out.width, out.height);
        octx.globalCompositeOperation = 'source-over';
      }

      // 본문은 별도 캔버스에서 색칠한 뒤 합성 (그림자를 덮어쓰지 않도록)
      var body = document.createElement('canvas');
      body.width = w; body.height = h;
      var bctx = body.getContext('2d');
      bctx.imageSmoothingEnabled = false;
      bctx.drawImage(src, 0, 0);
      bctx.globalCompositeOperation = 'source-in';
      bctx.fillStyle = color || '#ffffff';
      bctx.fillRect(0, 0, w, h);

      octx.drawImage(body, 0, 0);

      out._ox = pad;              // 실제 글자 시작 오프셋
      out._oy = pad;
      out._tw = w - pad * 2;      // 정렬 계산용 순수 글자 폭
      return out;
    },

    /* 줄바꿈: 우선 공백에서 끊고, 한 덩어리가 너무 길면 글자 단위로 끊는다 */
    wrap: function (text, size, maxWidth) {
      var lines = [];
      var paragraphs = String(text).split('\n');
      for (var p = 0; p < paragraphs.length; p++) {
        var words = paragraphs[p].split(' ');
        var line = '';
        for (var i = 0; i < words.length; i++) {
          var test = line ? line + ' ' + words[i] : words[i];
          if (this.measure(test, size) <= maxWidth) { line = test; continue; }
          if (line) { lines.push(line); line = ''; }
          // 단어 자체가 넘치면 글자 단위 분할
          var chunk = words[i];
          while (this.measure(chunk, size) > maxWidth) {
            var cut = chunk.length;
            while (cut > 1 && this.measure(chunk.slice(0, cut), size) > maxWidth) cut--;
            lines.push(chunk.slice(0, cut));
            chunk = chunk.slice(cut);
          }
          line = chunk;
        }
        lines.push(line);
      }
      return lines;
    }
  };
})(SPIKE);
