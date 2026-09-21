/* ============================================================
 *  SPIKE.MessageWindow — 쯔꾸르풍 하단 대화창
 *   · 한 글자씩 타이핑 (진행 중 확인키 = 전체 즉시 표시)
 *   · 이름 박스, 선택지, 얼굴 자리(부품 아이콘) 지원
 * ============================================================ */
(function (S) {
  'use strict';

  var FONT = 12;
  var LINE = 16;

  function MessageWindow(opt) {
    opt = opt || {};
    this.x = opt.x == null ? 8 : opt.x;
    this.w = opt.w == null ? S.W - 16 : opt.w;
    this.h = opt.h == null ? 74 : opt.h;
    this.y = opt.y == null ? S.H - this.h - 8 : opt.y;
    this.speed = opt.speed == null ? 42 : opt.speed;  // 글자/초

    this.queue = [];
    this.cur = null;
    this.lines = [];
    this.pages = null;      // 창 높이에 맞춰 쪼갠 페이지들
    this.pageIdx = 0;
    this.shown = 0;
    this.total = 0;
    this.active = false;
    this.done = false;
    this.blink = 0;
    this.onDone = null;

    this.choiceList = null;
    this.choiceIndex = 0;
    this.onChoice = null;
  }

  /* ------------------------------------------------------------
   *  이 창에 몇 줄이 들어가는가
   *    첫 줄 기준선 = y + 9, 줄 간격 = LINE, 글자 높이 ≈ FONT + 2
   *    마지막 줄 바닥이 y + h - 6 을 넘으면 안 된다.
   *  폰트를 바꾸면 글자가 커질 수 있으므로 상수로 박지 않고 계산한다.
   * ---------------------------------------------------------- */
  MessageWindow.prototype.maxLines = function () {
    return Math.max(1, Math.floor((this.h - 29) / LINE) + 1);
  };

  /* msgs: 문자열 | {name, text, icon, color} | 배열 */
  MessageWindow.prototype.show = function (msgs, onDone) {
    if (!Array.isArray(msgs)) msgs = [msgs];
    this.queue = msgs.map(function (m) {
      return typeof m === 'string' ? { text: m } : m;
    });
    this.onDone = onDone || null;
    this.active = true;
    this._next();
    return this;
  };

  MessageWindow.prototype.ask = function (msg, choices, onChoice) {
    this.show(msg);
    this.choiceList = choices;
    this.choiceIndex = 0;
    this.onChoice = onChoice;
    return this;
  };

  MessageWindow.prototype.close = function () {
    this.active = false;
    this.cur = null;
    this.queue.length = 0;
    this.choiceList = null;
    this.pages = null;
    this.pageIdx = 0;
  };

  MessageWindow.prototype._next = function () {
    // 같은 메시지에 남은 페이지가 있으면 먼저 넘긴다
    if (this.pages && this.pageIdx < this.pages.length - 1) {
      this.pageIdx++;
      this._showPage();
      return;
    }
    if (!this.queue.length) {
      if (this.choiceList) { this.done = true; return; }  // 선택지 대기
      this.active = false;
      this.cur = null;
      var cb = this.onDone; this.onDone = null;
      if (cb) cb();
      return;
    }
    this.cur = this.queue.shift();
    var innerW = this.w - 20 - (this.cur.icon ? 40 : 0);
    var all = S.Font.wrap(this.cur.text, FONT, innerW);

    // 창에 안 들어가면 페이지로 쪼갠다 (▼ 로 넘긴다)
    var m = this.maxLines();
    this.pages = [];
    for (var i = 0; i < all.length; i += m) this.pages.push(all.slice(i, i + m));
    if (!this.pages.length) this.pages = [['']];
    this.pageIdx = 0;
    this._showPage();
  };

  MessageWindow.prototype._showPage = function () {
    this.lines = this.pages[this.pageIdx];
    this.total = this.lines.join('').length;
    this.shown = 0;
    this.done = false;
  };

  MessageWindow.prototype.update = function (dt) {
    if (!this.active) return;
    this.blink += dt;

    // --- 선택지 조작 ---
    if (this.choiceList && this.done) {
      var I = S.Input;
      if (I.pressed.up) { this.choiceIndex = (this.choiceIndex + this.choiceList.length - 1) % this.choiceList.length; S.Audio.se('cursor'); }
      if (I.pressed.down) { this.choiceIndex = (this.choiceIndex + 1) % this.choiceList.length; S.Audio.se('cursor'); }
      // 마우스
      for (var i = 0; i < this.choiceList.length; i++) {
        var cy = this._choiceY(i);
        if (I.hover(this.x + 10, cy, this.w - 20, LINE)) this.choiceIndex = i;
        if (I.clicked(this.x + 10, cy, this.w - 20, LINE)) { this._pick(); return; }
      }
      if (I.pressed.ok) this._pick();
      return;
    }

    // --- 타이핑 ---
    if (this.shown < this.total) {
      var before = Math.floor(this.shown);
      this.shown = Math.min(this.total, this.shown + this.speed * dt);
      if (Math.floor(this.shown) > before && Math.floor(this.shown) % 2 === 0) S.Audio.se('text');
      if (S.Input.pressed.ok || S.Input.mouse.pressed) { this.shown = this.total; }
      if (this.shown >= this.total) this.done = true;
      return;
    }

    this.done = true;
    if (S.Input.pressed.ok || S.Input.mouse.pressed) {
      S.Audio.se('cursor');
      this._next();
    }
  };

  MessageWindow.prototype._pick = function () {
    S.Audio.se('ok');
    var cb = this.onChoice, idx = this.choiceIndex;
    this.choiceList = null; this.onChoice = null;
    this.active = false; this.cur = null;
    if (cb) cb(idx);
  };

  MessageWindow.prototype._choiceY = function (i) {
    var n = this.choiceList.length;
    var boxH = n * LINE + 12;
    var boxY = this.y - boxH - 4;
    return boxY + 6 + i * LINE;
  };

  MessageWindow.prototype.draw = function (r) {
    if (!this.active || !this.cur) return;
    var C = S.C;

    r.window(this.x, this.y, this.w, this.h);

    var tx = this.x + 10;
    var ty = this.y + 9;

    // 아이콘(부품 그림) 자리
    if (this.cur.icon && S.Sprites.has(this.cur.icon)) {
      r.rect(this.x + 6, this.y + 6, 36, this.h - 12, '#0a1230');
      r.frame(this.x + 6, this.y + 6, 36, this.h - 12, C.winEdge2, 1);
      var sp = S.Sprites.get(this.cur.icon);
      r.sprite(this.cur.icon,
        this.x + 6 + (36 - sp.width) / 2 | 0,
        this.y + 6 + (this.h - 12 - sp.height) / 2 | 0);
      tx += 40;
    }

    // 이름 박스
    if (this.cur.name) {
      var nw = r.textWidth(this.cur.name, FONT) + 14;
      r.window(this.x + 4, this.y - 19, nw, 21, { alpha: 0.95 });
      r.text(this.cur.name, this.x + 11, this.y - 13, { size: FONT, color: this.cur.color || C.textHi });
    }

    // 본문 (타이핑 중이면 잘라서)
    var left = Math.floor(this.shown);
    for (var i = 0; i < this.lines.length; i++) {
      var ln = this.lines[i];
      var part = ln;
      if (left < ln.length) part = ln.slice(0, Math.max(0, left));
      if (part) r.text(part, tx, ty + i * LINE, { size: FONT, color: C.text });
      left -= ln.length;
      if (left <= 0) break;
    }

    // ▼ 커서
    if (this.done && !this.choiceList && (this.blink % 0.9) < 0.55) {
      var cxp = this.x + this.w - 14, cyp = this.y + this.h - 12;
      r.rect(cxp, cyp, 7, 1, C.white);
      r.rect(cxp + 1, cyp + 1, 5, 1, C.white);
      r.rect(cxp + 2, cyp + 2, 3, 1, C.white);
      r.rect(cxp + 3, cyp + 3, 1, 1, C.white);
    }

    // 선택지
    if (this.choiceList && this.done) {
      var n = this.choiceList.length;
      var boxH = n * LINE + 12;
      var boxW = 0;
      for (var k = 0; k < n; k++) boxW = Math.max(boxW, r.textWidth(this.choiceList[k], FONT));
      boxW += 34;
      var boxX = this.x + this.w - boxW - 4;
      var boxY = this.y - boxH - 4;
      r.window(boxX, boxY, boxW, boxH);
      for (var j = 0; j < n; j++) {
        var yy = boxY + 6 + j * LINE;
        var sel = j === this.choiceIndex;
        if (sel) {
          r.rect(boxX + 4, yy - 1, boxW - 8, LINE, '#ffffff22');
          r.text('→', boxX + 6, yy + 1, { size: FONT, color: C.textHi });
        }
        r.text(this.choiceList[j], boxX + 20, yy + 1,
          { size: FONT, color: sel ? C.textHi : C.text });
      }
    }
  };

  S.MessageWindow = MessageWindow;
})(SPIKE);
