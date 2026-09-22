/* ============================================================
 *  scenes/cards — 부품 카드 넘김 (도감 등록 연출)
 *  push('cards', { title, ids:[...], onDone })
 * ============================================================ */
(function (S) {
  'use strict';

  var Cards = {
    ids: [], i: 0, title: '', onDone: null,
    t: 0, slide: 0,

    /* 필드를 페이드로 덮는다 — 엔진이 뒤 배경을 정지 화면으로 재사용해도 된다 */
    freezeBase: true,

    enter: function (p) {
      this.ids = p.ids || [];
      this.title = p.title || S.T('dex.title', '');
      this.onDone = p.onDone || null;
      this.i = 0; this.t = 0; this.slide = 1;
      this._register();
    },

    _register: function () {
      var id = this.ids[this.i];
      if (id && S.State.learn(id)) S.Audio.se('item');
      else S.Audio.se('cursor');
    },

    update: function (dt) {
      this.t += dt;
      if (this.slide > 0) this.slide = Math.max(0, this.slide - dt * 6);

      var I = S.Input;
      var next = I.pressed.ok || I.mouse.pressed;
      if (next) {
        this.i++;
        if (this.i >= this.ids.length) {
          var cb = this.onDone;
          S.Game.pop();
          if (cb) cb();
          return;
        }
        this.slide = 1;
        this._register();
      }
      if (I.pressed.cancel) {
        // 건너뛰기 — 남은 카드도 도감에는 등록해 준다
        for (var k = this.i; k < this.ids.length; k++) S.State.learn(this.ids[k]);
        var cb2 = this.onDone;
        S.Game.pop();
        if (cb2) cb2();
      }
    },

    draw: function (r) {
      var C = S.C;
      r.fade(0.72);

      var part = S.partById(this.ids[this.i]);
      if (!part) return;

      /* 설명이 도감과 같은 예산(글칸 214px · 6줄)을 쓰도록 세로를 키웠다.
         예전 196 에서는 4줄만 들어가 hub·dist 설명이 문장 중간에서 잘렸다. */
      var bw = 344, bh = 216;
      var bx = Math.round((S.W - bw) / 2);
      var by = 36 + Math.round(this.slide * 10);

      r.window(bx, by, bw, bh);

      // 상단 타이틀 바
      r.rect(bx + 4, by + 4, bw - 8, 18, '#0a1230');
      r.text(this.title, bx + bw / 2, by + 8, { size: 11, color: C.textHi, align: 'center' });
      r.text((this.i + 1) + ' / ' + this.ids.length, bx + bw - 12, by + 8,
        { size: 10, color: C.textDim, align: 'right' });

      // 아이콘 (3배 확대) — 글칸을 넓히려고 왼쪽으로 붙였다
      var ix = bx + 10, iy = by + 34;
      r.rect(ix, iy, 100, 100, '#0a1230');
      r.frame(ix, iy, 100, 100, C.winEdge2, 1);
      var sp = S.Sprites.get(part.icon);
      if (sp) {
        var pulse = 1 + Math.sin(this.t * 4) * 0.02;
        r.ctx.drawImage(sp, ix + 2, iy + 2, 96, 96);
        if (pulse) { /* 정수 스케일 유지 */ }
      }
      r.text('NEW', ix + 50, iy + 104, { size: 9, color: C.textOk, align: 'center' });

      /* 텍스트
       *
       * 예전에는 part.lines 를 접지 않고 그대로 그렸다. JSON 이 조금만 길어도
       * 오른쪽 테두리를 뚫고 나갔고, 4줄 고정이라 5줄짜리는 문장 중간에서 끊겼다.
       * 도감(dex)과 같은 규칙으로 바꾼다 — 칸 폭에 맞춰 접고, 남은 높이만큼 그린다. */
      var tx = bx + 120;
      var tw = bw - 120 - 10;          // 214 — 도감 우측 패널과 같은 폭
      var bottom = by + bh - 38;       // TIP 박스 위

      r.text(part.title, tx, by + 34, { size: 14, color: C.textHi });
      r.text(part.real, tx, by + 53, { size: 10, color: C.textDim });
      r.rect(tx, by + 68, tw, 1, C.winEdge2);

      var y = by + 74;
      var head = S.Font.wrap(part.one, 11, tw);
      for (var h = 0; h < head.length && y + 13 <= bottom; h++) {
        r.text(head[h], tx, y, { size: 11, color: C.white });
        y += 16;
      }

      /* 설명은 산문이다. 작성자가 끊어 놓은 위치를 그대로 쓰면 언어나 폰트가
         바뀔 때 고아 단어가 생기므로, 이어 붙인 뒤 칸 폭에 맞춰 다시 끊는다. */
      y += 4;
      var desc = S.Font.wrap(part.lines.join(' '), 10, tw);
      for (var i = 0; i < desc.length && y + 12 <= bottom; i++) {
        r.text(desc[i], tx, y, { size: 10, color: C.text });
        y += 14;
      }

      // 팁
      r.rect(bx + 8, by + bh - 34, bw - 16, 26, '#0a123099');
      r.text('TIP', bx + 14, by + bh - 29, { size: 9, color: C.textHi });
      var tip = S.Font.wrap(part.tip, 9, bw - 52);
      for (var j = 0; j < tip.length && j < 2; j++) {
        r.text(tip[j], bx + 38, by + bh - 30 + j * 11, { size: 9, color: C.textDim });
      }

      // 진행 안내
      if ((this.t % 1) < 0.6) {
        r.text(S.T('cards.hint', ''), S.W / 2, by + bh + 8,
          { size: 10, color: C.white, align: 'center' });
      }
    }
  };

  S.Game.register('cards', Cards);
})(SPIKE);
