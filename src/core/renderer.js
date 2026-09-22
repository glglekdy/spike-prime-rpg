/* ============================================================
 *  SPIKE.Renderer — 384x288 논리 캔버스 + 정수배 업스케일
 * ============================================================ */
(function (S) {
  'use strict';

  function Renderer(canvas) {
    this.canvas = canvas;
    canvas.width = S.W;
    canvas.height = S.H;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.scale = 1;
    this._grad = {};   // 세로 그라데이션 캐시 (아래 vgradient 참고)
    this.fit();
    window.addEventListener('resize', this.fit.bind(this));
  }

  /* 창 크기에 맞는 최대 정수 배율 */
  Renderer.prototype.fit = function () {
    var pad = 16;
    var sx = Math.floor((window.innerWidth - pad) / S.W);
    var sy = Math.floor((window.innerHeight - pad) / S.H);
    var s = Math.max(1, Math.min(sx, sy));
    this.scale = s;
    this.canvas.style.width = (S.W * s) + 'px';
    this.canvas.style.height = (S.H * s) + 'px';
  };

  /* 화면(클라이언트) 좌표 → 논리 좌표 */
  Renderer.prototype.toLogical = function (clientX, clientY) {
    var r = this.canvas.getBoundingClientRect();
    return {
      x: Math.floor((clientX - r.left) / this.scale),
      y: Math.floor((clientY - r.top) / this.scale)
    };
  };

  /* ---------- 기본 도형 ---------- */

  Renderer.prototype.clear = function (color) {
    var c = this.ctx;
    c.fillStyle = color || '#000';
    c.fillRect(0, 0, S.W, S.H);
  };

  Renderer.prototype.rect = function (x, y, w, h, color) {
    var c = this.ctx;
    c.fillStyle = color;
    c.fillRect(x | 0, y | 0, w | 0, h | 0);
  };

  Renderer.prototype.frame = function (x, y, w, h, color, thick) {
    var t = thick || 1;
    this.rect(x, y, w, t, color);
    this.rect(x, y + h - t, w, t, color);
    this.rect(x, y, t, h, color);
    this.rect(x + w - t, y, t, h, color);
  };

  /* 세로 그라데이션.
   * 창을 하나 그릴 때마다 CanvasGradient 를 새로 만들고 있었다 (프레임당 2~5개).
   * 창 위치와 높이는 사실상 정해져 있으므로 y·높이·색으로 캐시한다.
   * 그라데이션 좌표는 절대값이라 y 도 키에 들어가야 한다. */
  Renderer.prototype.vgradient = function (x, y, w, h, top, bottom) {
    var c = this.ctx;
    var key = (y | 0) + '|' + (h | 0) + '|' + top + '|' + bottom;
    var g = this._grad[key];
    if (!g) {
      g = c.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, top);
      g.addColorStop(1, bottom);
      // 위치가 계속 변하는 연출이 생겨도 무한정 쌓이지 않게 한다
      if (this._gradN > 200) { this._grad = {}; this._gradN = 0; }
      this._grad[key] = g;
      this._gradN = (this._gradN || 0) + 1;
    }
    c.fillStyle = g;
    c.fillRect(x | 0, y | 0, w | 0, h | 0);
  };

  /* ---------- 쯔꾸르풍 윈도우 ----------
   * 파란 세로 그라데이션 + 흰 바깥선 + 연파랑 안쪽선 + 모서리 깎임
   */
  Renderer.prototype.window = function (x, y, w, h, opt) {
    opt = opt || {};
    var C = S.C;
    x |= 0; y |= 0; w |= 0; h |= 0;

    // 반투명 본체
    this.ctx.globalAlpha = opt.alpha == null ? 0.92 : opt.alpha;
    this.vgradient(x + 2, y + 2, w - 4, h - 4, opt.top || C.winTop, opt.bottom || C.winBot);
    this.ctx.globalAlpha = 1;

    // 바깥 흰 테두리 (모서리 1px 비움)
    var e = opt.edge || C.winEdge;
    this.rect(x + 1, y, w - 2, 1, e);
    this.rect(x + 1, y + h - 1, w - 2, 1, e);
    this.rect(x, y + 1, 1, h - 2, e);
    this.rect(x + w - 1, y + 1, 1, h - 2, e);

    // 안쪽 연파랑 선
    var e2 = opt.edge2 || C.winEdge2;
    this.frame(x + 2, y + 2, w - 4, h - 4, e2, 1);
  };

  /* ---------- 텍스트 ---------- */

  Renderer.prototype.text = function (str, x, y, opt) {
    opt = opt || {};
    var size = opt.size || 12;
    var color = opt.color || S.C.text;
    var cv = S.Font.get(String(str), size, color, opt.shadow !== false);
    var dx = x | 0, dy = y | 0;
    if (opt.align === 'center') dx -= Math.floor(cv._tw / 2);
    else if (opt.align === 'right') dx -= cv._tw;
    this.ctx.drawImage(cv, dx - cv._ox, dy - cv._oy);
    return cv._tw;
  };

  Renderer.prototype.textWidth = function (str, size) {
    return S.Font.measure(String(str), size || 12);
  };

  /* ---------- 스프라이트 (문자열 픽셀맵) ---------- */

  Renderer.prototype.sprite = function (name, x, y, opt) {
    var sp = S.Sprites.get(name);
    if (!sp) return;
    opt = opt || {};
    var sc = opt.scale || 1;
    this.ctx.save();
    if (opt.flipX) {
      this.ctx.translate((x | 0) + sp.width * sc, y | 0);
      this.ctx.scale(-sc, sc);
      this.ctx.drawImage(sp, 0, 0);
    } else {
      this.ctx.drawImage(sp, x | 0, y | 0, sp.width * sc, sp.height * sc);
    }
    this.ctx.restore();
  };

  /* ---------- 연출 ---------- */

  Renderer.prototype.fade = function (alpha, color) {
    if (alpha <= 0) return;
    this.ctx.globalAlpha = Math.min(1, alpha);
    this.rect(0, 0, S.W, S.H, color || '#000');
    this.ctx.globalAlpha = 1;
  };

  S.Renderer = Renderer;
})(SPIKE);
