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

  var FAMILY = '"DungGeunMo","NeoDunggeunmo","Galmuri11","Galmuri9",' +
               'Dotum,"돋움","Malgun Gothic","맑은 고딕",monospace';

  var Font = S.Font = {
    family: FAMILY,
    threshold: 96,      // 이 값보다 진한 픽셀만 살린다 (낮을수록 획이 두꺼워짐)
    binarize: true,     // 진짜 픽셀 폰트를 넣었다면 false — 이진화가 오히려 획을 망친다
                        //   ui.ko.json 의 font.{family,threshold,binarize} 로 바꾼다
    cache: new Map(),
    _measureCtx: null,

    /* 문자열 픽셀 폭 (그림자 1px 포함) */
    measure: function (text, size) {
      if (!this._measureCtx) {
        var c = document.createElement('canvas');
        this._measureCtx = c.getContext('2d');
      }
      var ctx = this._measureCtx;
      ctx.font = size + 'px ' + this.family;
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
      var w = this.measure(text, size) + pad * 2;
      var h = size + pad * 2 + 4;

      // --- 1) 흰색으로 글자만 그린다 ---
      var src = document.createElement('canvas');
      src.width = w; src.height = h;
      var sctx = src.getContext('2d', { willReadFrequently: true });
      sctx.font = size + 'px ' + this.family;
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
