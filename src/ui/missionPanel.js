/* ============================================================
 *  SPIKE.MissionPanel — MAP2 우측 조립 가이드 뷰어 (DESIGN.md §7-1, §8)
 *
 *  읽기 전용이다. 체크박스도 판정도 없다.
 *  조작은 「← 이전」 / 「다음 →」 뿐 — 마우스 클릭, Q/E, Enter.
 *
 *  ⚠ 이 파일에 한국어 문자열을 넣지 말 것.
 *    모든 텍스트는 content/ui.ko.json 의 guide.* / code.* / common.* 에서 온다.
 *    (fallback 은 JSON 이 통째로 없을 때만 쓰인다)
 *
 *  레이아웃 (패널 192 x 288, x0 = 192)
 *    0   ~  22   헤더   n/6 + 제목 + 진행 점
 *    22  ~ 162   조립도 (full 페이지는 244까지)
 *    162 ~ 244   설명 2~3줄 + ⚠주의
 *    244 ~ 288   ← 이전 · 타이머 · 다음 →
 * ============================================================ */
(function (S) {
  'use strict';

  var PW = 192;
  var HEAD_H = 22;
  var DIAG_Y = 22, DIAG_H = 140;
  var BODY_Y = 162, BODY_H = 82;
  var FOOT_Y = 244;

  /* 조립도 안의 라벨은 guide.<pageId>.<key> 에서 가져온다 */
  function L(p, key, fb) { return S.pageText.label(p, key, fb); }

  /* ------------------------------------------------------------
   *  그리기 헬퍼
   * ---------------------------------------------------------- */

  function arrow(r, x, y, len, dir, color) {
    var c = color || '#ffffff', o = '#000000', i;
    if (dir === 'down' || dir === 'up') {
      r.rect(x - 2, y - 1, 5, len + 2, o);
      r.rect(x - 1, y, 3, len, c);
      for (i = 0; i < 5; i++) {
        var hy = (dir === 'down') ? y + len + i : y - 1 - i;
        r.rect(x - 1 - (4 - i), hy, 2 * (5 - i) - 1, 1, c);
      }
    } else {
      r.rect(x - 1, y - 2, len + 2, 5, o);
      r.rect(x, y - 1, len, 3, c);
      for (i = 0; i < 5; i++) {
        var hx = (dir === 'right') ? x + len + i : x - 1 - i;
        r.rect(hx, y - 1 - (4 - i), 1, 2 * (5 - i) - 1, c);
      }
    }
  }

  function blink(r, x, y, w, h, t, color) {
    if ((t % 1.0) > 0.55) return;
    r.frame(x - 1, y - 1, w + 2, h + 2, color || S.C.textHi, 1);
  }

  /* ------------------------------------------------------------
   *  조립도 6종 — 애니메이션은 t(페이지 진입 후 초)만 보고 그린다.
   *  상태가 없으므로 페이지 재진입 시 항상 처음부터 재생된다.
   * ---------------------------------------------------------- */

  /* 라벨 키는 ui.json 의 guide.parts.* */
  var PARTS_ROW = [
    { sp: 'p_hub',       key: 'hub',       qty: 1 },
    { sp: 'p_motor_m',   key: 'motor',     qty: 1 },
    { sp: 'p_cable',     key: 'cable',     qty: 1 },
    { sp: 'p_beam',      key: 'beam',      qty: 1 },
    { sp: 'p_connector', key: 'connector', qty: 1 },
    { sp: 'p_pin_black', key: 'pin',       qty: 2 },
    { sp: 'p_flag',      key: 'flag',      qty: 1 }
  ];

  var DIAGRAMS = {

    /* 1. 부품 7종 — 4 + 3 배치, 순서대로 하나씩 밝아진다 */
    d_parts: function (r, x, y, w, h, t) {
      var cell = 42, cols = 4;
      var startX = x + (w - cols * cell) / 2 + 5;
      for (var i = 0; i < PARTS_ROW.length; i++) {
        var q = PARTS_ROW[i];
        var c = i % cols, row = (i / cols) | 0;
        var ix = startX + c * cell;
        var iy = y + 8 + row * 56;
        var on = (Math.floor(t * 1.6) % PARTS_ROW.length) === i;
        if (on) r.frame(ix - 2, iy - 2, 36, 36, S.C.textHi, 1);
        r.sprite(q.sp, ix, iy);
        if (q.qty > 1) {
          r.rect(ix + 22, iy + 22, 12, 11, '#000000cc');
          r.text('x' + q.qty, ix + 28, iy + 23, { size: 9, color: S.C.textHi, align: 'center' });
        }
        r.text(S.T('guide.parts.' + q.key, q.key), ix + 16, iy + 35,
          { size: 10, color: on ? S.C.textHi : S.C.text, align: 'center' });
      }
    },

    /* 2. 모터 + 커넥터 — 커넥터가 위에서 내려온다 */
    d_motor: function (r, x, y, w, h, t, p) {
      var cx = x + w / 2;
      var bob = Math.round(Math.abs(Math.sin(t * 2.2)) * 6);

      r.sprite('p_connector', cx - 16, y + 4 + bob);
      r.text(L(p, 'labelConnector', ''), cx + 26, y + 14, { size: 10, color: S.C.text });

      arrow(r, cx, y + 42, 12, 'down', '#ffffff');

      var mx = cx - 32, my = y + 62;
      r.sprite('p_motor_m', mx, my, { scale: 2 });
      r.text(L(p, 'labelMotor', ''), cx, my + 66, { size: 10, color: S.C.text, align: 'center' });

      // 출력축(노랑 십자) 강조 — 원본 22,14 크기 3x4 → 2배
      blink(r, mx + 44, my + 28, 6, 8, t, S.C.textHi);
      if ((t % 1.0) <= 0.55) {
        r.text(L(p, 'labelAxle', ''), mx + 68, my + 24, { size: 10, color: S.C.textHi });
      }
    },

    /* 3. 빔 + 검정핀 2개 — 핀이 좌우에서 박힌다 */
    d_beam: function (r, x, y, w, h, t, p) {
      var cx = x + w / 2;
      var push = Math.round(Math.abs(Math.sin(t * 2.0)) * 5);

      var bx = cx - 32, by = y + 12;
      r.sprite('p_beam', bx, by, { scale: 2 });
      r.text(L(p, 'labelBeam', ''), cx, by + 52, { size: 10, color: S.C.text, align: 'center' });

      r.sprite('p_pin_black', cx - 52 + push, by + 4);
      r.sprite('p_pin_black', cx + 20 - push, by + 4);
      arrow(r, cx - 56 + push, by + 20, 8, 'right', S.C.textNg);
      arrow(r, cx + 56 - push, by + 20, 8, 'left', S.C.textNg);

      r.sprite('p_connector', cx - 16, y + 80);
      r.text(L(p, 'labelConnector', ''), cx + 22, y + 90, { size: 10, color: S.C.text });

      r.text(L(p, 'caption', ''), cx, y + 118,
        { size: 10, color: (t % 1.0) <= 0.55 ? S.C.textNg : S.C.textDim, align: 'center' });
    },

    /* 4. 완성체 — 깃발 위치 점멸 */
    d_flag: function (r, x, y, w, h, t, p) {
      var cx = x + w / 2;
      var wave = Math.sin(t * 3) * 3;

      r.sprite('p_flag', cx - 16 + wave, y + 2);
      blink(r, cx - 16 + wave, y + 2, 32, 32, t, S.C.textHi);

      r.sprite('p_beam', cx - 16, y + 34);
      r.sprite('p_connector', cx - 16, y + 56);
      r.sprite('p_motor_m', cx - 16, y + 80);
      r.sprite('p_hub', cx - 16, y + 104);

      r.text(L(p, 'labelHere', ''), cx + 20 + wave, y + 10, { size: 10, color: S.C.textHi });
      r.text(L(p, 'labelDone', ''), x + 8, y + 116, { size: 11, color: S.C.textOk });
    },

    /* 5. 모터 — 케이블 — 허브(A 포트 점멸) */
    d_cable: function (r, x, y, w, h, t, p) {
      var my = y + 30;

      r.sprite('p_motor_m', x + 10, my);
      r.text(L(p, 'labelMotor', ''), x + 26, my + 34, { size: 10, color: S.C.text, align: 'center' });

      r.sprite('p_cable', x + 50, my);

      var hx = x + 92, hy = my - 14;
      r.sprite('p_hub', hx, hy, { scale: 2 });
      r.text(L(p, 'labelHub', ''), hx + 32, hy + 66, { size: 10, color: S.C.text, align: 'center' });

      // A 포트 — 허브 왼쪽 첫 포트 (원본 1,5 크기 3x5 → 2배)
      var ax = hx + 2, ay = hy + 10;
      if ((t % 0.9) <= 0.5) {
        r.rect(ax, ay, 6, 10, S.C.textHi);
        r.text('A', ax - 10, ay - 2, { size: 11, color: S.C.textHi });
      }
      blink(r, ax - 1, ay - 1, 8, 12, t, S.C.textHi);

      r.text(L(p, 'caption', ''), x + w / 2, y + 112,
        { size: 10, color: S.C.textHi, align: 'center' });
    },

    /* 6. 주문서 카드 (§8-2) — full 페이지라 세로를 다 쓴다 */
    d_code: function (r, x, y, w, h, t) {
      var G = S.CODE_GUIDE;
      if (!G) return;

      r.text(S.T('code.cardTitle', ''), x + w / 2, y + 2,
        { size: 11, color: S.C.textHi, align: 'center' });

      /* --- 실행 순서 애니메이션 (3초 루프) --- */
      var cyc = t % 3.0;
      var hot = -1, rep = 0;
      if (cyc < 0.4) hot = 0;
      else if (cyc < 0.8) { hot = 1; rep = 1; }
      else if (cyc < 2.8) {
        var k = Math.floor((cyc - 0.8) / 0.25);
        hot = G.loopFrom + (k % 2);
        rep = Math.min(G.loopCount, Math.floor(k / 2) + 1);
      }

      /* --- 블록 4줄 --- */
      var by = y + 18, bh = 20, gap = 4;
      for (var i = 0; i < G.lines.length; i++) {
        var Ln = G.lines[i];
        var bx = x + 8 + (Ln.indent ? 14 : 0);
        var bw = w - 16 - (Ln.indent ? 14 : 0);
        var yy = by + i * (bh + gap);
        var col = S.blockColor(Ln.cat);

        // 반복 블록의 ㄴ자 감싸기 (안에 들어 있다는 걸 눈으로)
        if (Ln.wrap) {
          var wrapH = (bh + gap) * 2 + 4;
          r.rect(bx, yy + bh, 6, wrapH, col);
          r.rect(bx, yy + bh + wrapH, 22, 5, col);
        }

        r.rect(bx, yy, bw, bh, '#000000');
        r.rect(bx + 1, yy + 1, bw - 2, bh - 2, col);
        r.rect(bx + 1, yy + 1, bw - 2, 2, '#ffffff44');
        r.rect(bx + 5, yy + bh - 1, 6, 2, col);

        var dark = (Ln.cat === 'event' || Ln.cat === 'ctrl' || Ln.cat === 'motor');
        r.text(G.lineText(Ln), bx + 8, yy + 5,
          { size: 10, color: dark ? '#1a1a22' : '#ffffff', shadow: false });

        if (i === hot) r.frame(bx - 1, yy - 1, bw + 2, bh + 2, '#ffffff', 1);

        if (Ln.wrap && rep > 0) {
          r.text(rep + ' / ' + G.loopCount, bx + bw - 6, yy + 5,
            { size: 10, color: '#1a1a22', align: 'right', shadow: false });
        }
      }

      /* --- SPIKE 앱에서 찾는 법 (§8-5) --- */
      var fy = by + G.lines.length * (bh + gap) + 14;
      r.rect(x + 8, fy - 2, w - 16, 1, S.C.winEdge2);
      r.text(S.T('code.findTitle', ''), x + 10, fy + 4, { size: 10, color: S.C.textHi });

      var list = G.findIt();
      for (var j = 0; j < list.length; j++) {
        var F = list[j];
        var ry = fy + 20 + j * 16;
        r.rect(x + 10, ry + 2, 9, 9, '#000000');
        r.rect(x + 11, ry + 3, 7, 7, S.blockColor(F.cat));
        r.text(F.name, x + 23, ry + 1, { size: 10, color: S.C.text });
        r.text(F.text, x + w - 10, ry + 1, { size: 10, color: S.C.textDim, align: 'right' });
      }

      r.text(S.T('code.outro', ''), x + w / 2, fy + 26 + list.length * 16,
        { size: 10, color: S.C.textOk, align: 'center' });
    }
  };

  /* ------------------------------------------------------------
   *  패널
   * ---------------------------------------------------------- */

  var Panel = S.MissionPanel = {
    x0: S.W - PW,
    active: false,
    hover: '',
    _t: 0,          // 대기 화면 애니메이션용 (Mission.pageT 는 시작 전엔 안 돈다)

    enter: function () {
      this.x0 = S.W - PW;
      this.active = true;
      this._t = 0;
      if (S.Mission && !S.Mission.steps.length) S.Mission.reset();
    },

    exit: function () { this.active = false; },

    _btn: function (which) {
      var x0 = this.x0;
      if (which === 'prev') return [x0 + 8, FOOT_Y + 12, 54, 22];
      return [x0 + PW - 62, FOOT_Y + 12, 54, 22];
    },

    /* fd = 필드 씬. allowInput = 대화창이 안 떠 있을 때만 true */
    update: function (dt, allowInput, fd) {
      if (!this.active || !S.Mission) return;
      this._t += dt;
      // 아직 장인에게 말을 걸지 않았다 — 안내만 띄우고 조작도 재촉도 없다
      if (!S.Mission.started()) { this.hover = ''; return; }
      S.Mission.update(dt);
      S.Mission.checkLate(fd);
      if (!allowInput) { this.hover = ''; return; }

      var I = S.Input, p = this._btn('prev'), n = this._btn('next');
      this.hover = I.hover(p[0], p[1], p[2], p[3]) ? 'prev'
                 : I.hover(n[0], n[1], n[2], n[3]) ? 'next' : '';

      if (I.clicked(p[0], p[1], p[2], p[3])) { S.Mission.prev(); return; }
      if (I.clicked(n[0], n[1], n[2], n[3])) { S.Mission.next(fd); return; }
    },

    /* field 의 onKey 에서 호출 — Q 이전 / E 다음 */
    onKey: function (code, fd) {
      if (!this.active || !S.Mission || !S.Mission.started()) return false;
      if (code === 'KeyQ') { S.Mission.prev(); return true; }
      if (code === 'KeyE') { S.Mission.next(fd); return true; }
      return false;
    },

    /* ---------------- 그리기 ---------------- */

    draw: function (r, viewW) {
      if (!S.Mission) return;
      var x0 = this.x0 = (viewW == null ? S.W - PW : viewW);
      var C = S.C;
      var p = S.Mission.page();
      var t = S.Mission.pageT;

      r.window(x0, 0, PW, S.H, { alpha: 0.96 });
      r.rect(x0, 0, 1, S.H, C.winEdge2);

      if (!S.Mission.started()) { this._waiting(r, x0, C); return; }

      if (!p) {
        r.text('…', x0 + PW / 2, S.H / 2, { size: 11, color: C.textDim, align: 'center' });
        return;
      }

      this._header(r, x0, p, C);

      var dh = p.full ? (FOOT_Y - DIAG_Y - 4) : DIAG_H;
      var fn = DIAGRAMS[p.diagram];
      if (fn) {
        r.ctx.save();
        r.ctx.beginPath();
        r.ctx.rect(x0 + 2, DIAG_Y, PW - 4, dh);
        r.ctx.clip();
        fn(r, x0 + 4, DIAG_Y + 2, PW - 8, dh - 4, t, p);
        r.ctx.restore();
      }

      if (!p.full) this._body(r, x0, p, C);
      this._footer(r, x0, C);
      this._toast(r, x0, C);
    },

    /* ------------------------------------------------------------
     *  대기 화면 — 장인에게 말을 걸기 전.
     *  "누구에게 말을 걸어야 하는지"를 그림으로 바로 보여 준다.
     * ---------------------------------------------------------- */
    _waiting: function (r, x0, C) {
      r.rect(x0 + 2, 2, PW - 4, HEAD_H - 2, '#0a1436');
      r.text(S.T('guide.wait.title', ''), x0 + PW / 2, 6,
        { size: 11, color: C.textHi, align: 'center' });
      r.rect(x0 + 2, HEAD_H, PW - 4, 1, C.winEdge2);

      // 말을 걸 상대 (필드의 ! 표시와 같은 연출)
      var sp = S.Sprites.get('maker_down_0');
      if (sp) {
        var bob = Math.round(Math.sin(this._t * 3) * 2);
        var dx = x0 + (PW - sp.width * 2) / 2;
        r.ctx.drawImage(sp, 0, 0, sp.width, sp.height, dx, 74 + bob, sp.width * 2, sp.height * 2);
        r.sprite('o_excl', x0 + PW / 2 - 4, 54 + bob);
      }

      var body = S.TL('guide.wait.body');
      var y = 140;
      for (var i = 0; i < body.length; i++) {
        r.text(body[i], x0 + PW / 2, y, { size: 10, color: C.text, align: 'center' });
        y += 15;
      }

      if ((this._t % 1.2) < 0.75) {
        r.text(S.T('guide.wait.hint', ''), x0 + PW / 2, 206,
          { size: 10, color: C.textHi, align: 'center' });
      }

      // 분할 맵에서는 이 패널이 유일한 타이머 표시다 — 대기 중에도 보여 준다
      r.rect(x0 + 2, FOOT_Y, PW - 4, 1, C.winEdge2);
      var late = S.State.remaining() < 120;
      r.text(S.State.clock(), x0 + PW / 2, FOOT_Y + 8,
        { size: 11, align: 'center',
          color: S.State.paused ? C.textDim : (late ? C.textNg : C.text) });
    },

    _header: function (r, x0, p, C) {
      var i = S.Mission.index(), n = S.Mission.count();
      r.rect(x0 + 2, 2, PW - 4, HEAD_H - 2, '#0a1436');
      r.text((i + 1) + ' / ' + n, x0 + 8, 6, { size: 11, color: C.textHi });
      r.text(S.pageText.title(p), x0 + 40, 6, { size: 11, color: C.text });

      for (var k = 0; k < n; k++) {
        var dx = x0 + PW - 8 - (n - k) * 9;
        r.rect(dx, 11, 5, 5, k < i ? C.textOk : (k === i ? C.textHi : '#42507a'));
      }
      r.rect(x0 + 2, HEAD_H, PW - 4, 1, C.winEdge2);
    },

    /* 설명 2~3줄 + ⚠주의 1~2줄.
     * 폰트를 바꾸면 글자 폭·높이가 달라지므로 줄 수를 세어 배치한다.
     * 본문도 방어적으로 줄바꿈한다 — JSON 을 길게 고쳐도 잘리면 안 된다. */
    _body: function (r, x0, p, C) {
      r.rect(x0 + 2, BODY_Y - 2, PW - 4, 1, C.winEdge2);

      var warn = S.pageText.warn(p);
      var wLines = warn ? S.Font.wrap(warn, 10, PW - 42).slice(0, 2) : [];
      var warnH = wLines.length ? wLines.length * 12 + 8 : 0;
      var warnY = BODY_Y + BODY_H - warnH - 2;

      // 본문 — 남는 높이만큼만 그린다
      var body = [];
      var raw = S.pageText.body(p);
      for (var k = 0; k < raw.length; k++) {
        body = body.concat(S.Font.wrap(raw[k], 10, PW - 20));
      }
      var room = (warnH ? warnY : BODY_Y + BODY_H) - (BODY_Y + 6) - 2;
      var fit = Math.max(1, Math.floor(room / 15));
      var y = BODY_Y + 6;
      for (var i = 0; i < body.length && i < fit; i++) {
        r.text(body[i], x0 + 10, y, { size: 10, color: C.text });
        y += 15;
      }

      if (!wLines.length) return;
      r.rect(x0 + 8, warnY, PW - 16, warnH, '#00000055');
      r.text('⚠', x0 + 12, warnY + (warnH - 12) / 2, { size: 10, color: C.textHi });
      for (var j = 0; j < wLines.length; j++) {
        r.text(wLines[j], x0 + 26, warnY + 4 + j * 12, { size: 10, color: C.textHi });
      }
    },
    _footer: function (r, x0, C) {
      r.rect(x0 + 2, FOOT_Y, PW - 4, 1, C.winEdge2);

      var first = S.Mission.isFirst(), last = S.Mission.isLast();
      var done = S.State.flags.missionDone;

      this._button(r, this._btn('prev'), S.T('common.prev', ''), !first, this.hover === 'prev', C);

      var label = last ? (done ? S.T('common.doneAlready', '') : S.T('common.done', ''))
                       : S.T('common.next', '');
      this._button(r, this._btn('next'), label, !(last && done), this.hover === 'next', C);

      var late = S.State.remaining() < 120;
      var pg = S.Mission.page();
      var over = pg && S.Mission.pageT > pg.budget;
      r.text(S.State.clock(), x0 + PW / 2, FOOT_Y + 8,
        { size: 11, align: 'center',
          color: S.State.paused ? C.textDim : (late ? C.textNg : (over ? C.textHi : C.text)) });

      // 키보드 힌트 (마우스 고장 대비 — §7-4)
      r.text('Q', x0 + PW / 2 - 24, FOOT_Y + 26, { size: 9, color: C.textDim, align: 'center' });
      r.text('E', x0 + PW / 2 + 24, FOOT_Y + 26, { size: 9, color: C.textDim, align: 'center' });
    },

    _button: function (r, b, label, enabled, hovered, C) {
      var bg = enabled ? (hovered ? '#2f56b8' : '#1b2c60') : '#141a2e';
      var fg = enabled ? (hovered ? C.textHi : C.text) : '#4a5372';
      r.rect(b[0], b[1], b[2], b[3], '#000000');
      r.rect(b[0] + 1, b[1] + 1, b[2] - 2, b[3] - 2, bg);
      r.frame(b[0] + 1, b[1] + 1, b[2] - 2, b[3] - 2, enabled ? C.winEdge : '#2a3150', 1);
      r.text(label, b[0] + b[2] / 2, b[1] + 6, { size: 10, color: fg, align: 'center' });
    },

    _toast: function (r, x0, C) {
      if (!S.Mission.toast || S.Mission.toastT <= 0) return;
      var a = Math.min(1, S.Mission.toastT / 0.3);
      var w = Math.min(PW - 16, r.textWidth(S.Mission.toast, 11) + 24);
      var x = x0 + (PW - w) / 2, y = 120;
      r.ctx.globalAlpha = a;
      r.window(x, y, w, 26, { alpha: 0.95 });
      r.text(S.Mission.toast, x0 + PW / 2, y + 8, { size: 11, color: C.textOk, align: 'center' });
      r.ctx.globalAlpha = 1;
    }
  };

  Panel.DIAGRAMS = DIAGRAMS;
})(SPIKE);
