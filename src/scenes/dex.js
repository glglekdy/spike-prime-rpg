/* ============================================================
 *  scenes/dex — 부품 도감 (게임 내장 매뉴얼)
 *  X / Esc 로 열고 닫는다. 배운 부품만 상세가 보인다.
 * ============================================================ */
(function (S) {
  'use strict';

  var Dex = {
    idx: 0, scroll: 0, t: 0,

    enter: function () { this.t = 0; S.Audio.se('ok'); },
    exit: function () { S.Audio.se('cancel'); },

    update: function (dt) {
      this.t += dt;
      var I = S.Input, n = S.PARTS.length;

      if (I.pressed.up) { this.idx = (this.idx + n - 1) % n; S.Audio.se('cursor'); }
      if (I.pressed.down) { this.idx = (this.idx + 1) % n; S.Audio.se('cursor'); }
      if (I.pressed.left) { this.idx = Math.max(0, this.idx - 8); S.Audio.se('cursor'); }
      if (I.pressed.right) { this.idx = Math.min(n - 1, this.idx + 8); S.Audio.se('cursor'); }
      if (I.pressed.cancel || I.pressed.ok) { S.Game.pop(); return; }

      // 목록 스크롤 유지
      var rows = 9;
      if (this.idx < this.scroll) this.scroll = this.idx;
      if (this.idx >= this.scroll + rows) this.scroll = this.idx - rows + 1;

      // 마우스
      for (var i = 0; i < rows; i++) {
        var pi = this.scroll + i;
        if (pi >= n) break;
        if (I.hover(10, 44 + i * 18, 122, 18)) this.idx = pi;
      }
      if (I.clicked(S.W - 60, 6, 54, 18)) S.Game.pop();
    },

    draw: function (r) {
      var C = S.C;
      r.fade(0.8);

      // 헤더
      r.window(4, 4, S.W - 8, 26);
      r.text('부 품 도 감', 14, 10, { size: 14, color: C.textHi });
      r.text('수집 ' + S.State.dexCount() + ' / ' + S.PARTS.length, 150, 13, { size: 10, color: C.text });
      r.text('↑↓ 이동    X 닫기', S.W - 14, 13, { size: 10, color: C.textDim, align: 'right' });

      // 좌측 목록
      r.window(4, 34, 132, S.H - 40);
      var rows = 9;
      for (var i = 0; i < rows; i++) {
        var pi = this.scroll + i;
        if (pi >= S.PARTS.length) break;
        var p = S.PARTS[pi];
        var known = !!S.State.dex[p.id];
        var y = 44 + i * 18;
        var sel = pi === this.idx;
        if (sel) r.rect(8, y - 2, 124, 18, '#ffffff22');
        var sp = S.Sprites.get(p.icon);
        if (sp) {
          r.ctx.save();
          if (!known) r.ctx.globalAlpha = 0.25;
          r.ctx.drawImage(sp, 0, 0, 32, 32, 11, y - 1, 16, 16);
          r.ctx.restore();
        }
        r.text(known ? p.title : '？？？', 32, y + 1,
          { size: 11, color: sel ? C.textHi : (known ? C.text : C.textDim) });
      }
      if (S.PARTS.length > rows) {
        r.text('▼', 70, S.H - 18, { size: 9, color: C.textDim, align: 'center' });
      }

      // 우측 상세
      var p2 = S.PARTS[this.idx];
      var dx = 142, dw = S.W - 146;
      r.window(dx, 34, dw, S.H - 40);

      if (!S.State.dex[p2.id]) {
        r.text('아직 만나지 못한 부품', dx + dw / 2, 120, { size: 11, color: C.textDim, align: 'center' });
        return;
      }

      var sp2 = S.Sprites.get(p2.icon);
      if (sp2) {
        r.rect(dx + 10, 44, 68, 68, '#0a1230');
        r.frame(dx + 10, 44, 68, 68, C.winEdge2, 1);
        r.ctx.drawImage(sp2, dx + 12, 46, 64, 64);
      }
      r.text(p2.title, dx + 88, 46, { size: 13, color: C.textHi });
      r.text(p2.real, dx + 88, 64, { size: 9, color: C.textDim });
      r.text(p2.one, dx + 88, 82, { size: 10, color: C.white });
      r.text(p2.group === 'core' ? '전자 부품' : '구조 부품', dx + 88, 98,
        { size: 9, color: p2.group === 'core' ? C.blkSense : C.blkCtrl });

      r.rect(dx + 10, 118, dw - 20, 1, C.winEdge2);
      for (var k = 0; k < p2.lines.length; k++) {
        r.text(p2.lines[k], dx + 12, 126 + k * 14, { size: 10, color: C.text });
      }

      var ty = 126 + p2.lines.length * 14 + 6;
      r.rect(dx + 8, ty, dw - 16, 30, '#0a123099');
      r.text('TIP', dx + 14, ty + 4, { size: 9, color: C.textHi });
      var tip = S.Font.wrap(p2.tip, 9, dw - 56);
      for (var j = 0; j < tip.length && j < 2; j++) {
        r.text(tip[j], dx + 40, ty + 4 + j * 11, { size: 9, color: C.textDim });
      }
    }
  };

  S.Game.register('dex', Dex);
})(SPIKE);
