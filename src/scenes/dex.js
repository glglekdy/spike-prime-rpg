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
      r.text(S.T('dex.title', ''), 14, 10, { size: 14, color: C.textHi });
      r.text(S.Text.fmt(S.T('dex.collected', ''), { n: S.State.dexCount(), total: S.PARTS.length }), 150, 13, { size: 10, color: C.text });
      r.text(S.T('dex.move', ''), S.W - 14, 13, { size: 10, color: C.textDim, align: 'right' });

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
        r.text(known ? p.title : '???', 32, y + 1,
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
        r.text(S.T('dex.unknown', ''), dx + dw / 2, 120, { size: 11, color: C.textDim, align: 'center' });
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
      r.text(S.T(p2.group === 'core' ? 'dex.core' : 'dex.tech', ''), dx + 88, 98,
        { size: 9, color: p2.group === 'core' ? C.blkSense : C.blkCtrl });

      r.rect(dx + 10, 118, dw - 20, 1, C.winEdge2);

      /* 설명과 TIP.
       * 줄을 그대로 그리면 폰트를 바꿨을 때 오른쪽으로 삐져나간다.
       * 항상 칸 폭에 맞춰 줄바꿈하고, TIP 은 창 바닥에 붙여
       * 설명이 길어져도 아래로 밀려 나가지 않게 한다. */
      var panelBottom = 34 + (S.H - 40);
      var tipLines = S.Font.wrap(p2.tip, 9, dw - 56).slice(0, 3);
      var tipH = tipLines.length * 12 + 10;
      var tipY = panelBottom - 8 - tipH;

      /* 설명은 산문이다. 작성자가 끊어 놓은 위치를 그대로 쓰면
         언어나 폰트가 바뀔 때 "time" 같은 고아 단어가 생긴다.
         이어 붙인 뒤 칸 폭에 맞춰 다시 끊는다. */
      var desc = S.Font.wrap(p2.lines.join(' '), 10, dw - 24);
      var fit = Math.max(1, Math.floor((tipY - 126 - 6) / 14));
      for (var m = 0; m < desc.length && m < fit; m++) {
        r.text(desc[m], dx + 12, 126 + m * 14, { size: 10, color: C.text });
      }

      r.rect(dx + 8, tipY, dw - 16, tipH, '#0a123099');
      r.text(S.T('dex.tip', 'TIP'), dx + 14, tipY + 5, { size: 9, color: C.textHi });
      for (var j = 0; j < tipLines.length; j++) {
        r.text(tipLines[j], dx + 40, tipY + 5 + j * 12, { size: 9, color: C.textDim });
      }
    }
  };

  S.Game.register('dex', Dex);
})(SPIKE);
