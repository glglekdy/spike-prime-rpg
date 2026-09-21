/* ============================================================
 *  scenes/cards — 부품 카드 넘김 (도감 등록 연출)
 *  push('cards', { title, ids:[...], onDone })
 * ============================================================ */
(function (S) {
  'use strict';

  var Cards = {
    ids: [], i: 0, title: '', onDone: null,
    t: 0, slide: 0,

    enter: function (p) {
      this.ids = p.ids || [];
      this.title = p.title || '부품 도감';
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

      var bw = 344, bh = 196;
      var bx = Math.round((S.W - bw) / 2);
      var by = 44 + Math.round(this.slide * 10);

      r.window(bx, by, bw, bh);

      // 상단 타이틀 바
      r.rect(bx + 4, by + 4, bw - 8, 18, '#0a1230');
      r.text(this.title, bx + bw / 2, by + 8, { size: 11, color: C.textHi, align: 'center' });
      r.text((this.i + 1) + ' / ' + this.ids.length, bx + bw - 12, by + 8,
        { size: 10, color: C.textDim, align: 'right' });

      // 아이콘 (3배 확대)
      var ix = bx + 18, iy = by + 34;
      r.rect(ix, iy, 100, 100, '#0a1230');
      r.frame(ix, iy, 100, 100, C.winEdge2, 1);
      var sp = S.Sprites.get(part.icon);
      if (sp) {
        var pulse = 1 + Math.sin(this.t * 4) * 0.02;
        r.ctx.drawImage(sp, ix + 2, iy + 2, 96, 96);
        if (pulse) { /* 정수 스케일 유지 */ }
      }
      r.text('NEW', ix + 50, iy + 104, { size: 9, color: C.textOk, align: 'center' });

      // 텍스트
      var tx = bx + 132;
      r.text(part.title, tx, by + 34, { size: 14, color: C.textHi });
      r.text(part.real, tx, by + 53, { size: 10, color: C.textDim });
      r.rect(tx, by + 68, bw - 150, 1, C.winEdge2);
      r.text(part.one, tx, by + 74, { size: 11, color: C.white });

      var maxLines = 4;
      for (var i = 0; i < part.lines.length && i < maxLines; i++) {
        r.text(part.lines[i], tx, by + 94 + i * 14, { size: 10, color: C.text });
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
