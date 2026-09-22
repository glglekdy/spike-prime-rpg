/* ============================================================
 *  scenes/ending — 랭크 발표 (이름 입력 없음, 키보드 입력 0)
 * ============================================================ */
(function (S) {
  'use strict';

  /* 랭크별 색만 코드에 둔다.
     글자(word/sub)는 content/ui.<언어>.json 의 ending.ranks.* 에 있다 —
     예전엔 여기 한국어가 박혀 있어서 영어로 바꿔도 그대로 나왔다. */
  var RANK_COLOR = { S: '#ffe066', A: '#8fe3ff', B: '#b6ffcb', C: '#ffc0c8' };

  var Ending = {
    t: 0, rank: 'C', ready: false, parts: [],

    enter: function () {
      this.t = 0;
      this.rank = S.State.rank();
      this.ready = false;
      S.Audio.stopBGM();
      S.Audio.se('fanfare');
      setTimeout(function () { S.Audio.playBGM('ending'); }, 1200);

      // 축하 파티클
      this.parts = [];
      for (var i = 0; i < 40; i++) {
        this.parts.push({
          x: Math.random() * S.W, y: -Math.random() * 200,
          v: 20 + Math.random() * 40, w: Math.random() * 2 + 1,
          c: ['#ffe066', '#8fe3ff', '#ff8fb0', '#b6ffcb'][Math.floor(Math.random() * 4)],
          p: Math.random() * 6
        });
      }
    },

    update: function (dt) {
      this.t += dt;
      for (var i = 0; i < this.parts.length; i++) {
        var p = this.parts[i];
        p.y += p.v * dt;
        if (p.y > S.H + 4) { p.y = -4; p.x = Math.random() * S.W; }
      }
      if (this.t > 1.2) this.ready = true;
      if (this.ready && (S.Input.pressed.ok || S.Input.pressed.cancel || S.Input.mouse.pressed)) {
        S.Audio.stopBGM();
        S.Game.transition('attract');
      }
    },

    draw: function (r) {
      var C = S.C;
      var rankColor = RANK_COLOR[this.rank] || '#ffffff';
      var rankWord = S.T('ending.ranks.' + this.rank + '.word', '');
      var rankSub = S.T('ending.ranks.' + this.rank + '.sub', '');
      r.vgradient(0, 0, S.W, S.H, '#101a3a', '#2a1a4a');

      for (var i = 0; i < this.parts.length; i++) {
        var p = this.parts[i];
        r.rect(p.x + Math.sin(this.t * 2 + p.p) * 6, p.y, p.w + 1, p.w + 1, p.c);
      }

      r.text(S.T('ending.header', ''), S.W / 2, 18,
        { size: 13, color: '#ffffff', align: 'center' });
      r.rect(S.W / 2 - 120, 38, 240, 1, '#5a76b8');

      // 랭크
      var pop = Math.min(1, this.t * 3);
      var size = Math.round(40 * pop) + 8;
      r.text(this.rank, S.W / 2, 56, { size: size, color: rankColor, align: 'center' });
      r.text(S.T('ending.rank', ''), S.W / 2, 50, { size: 9, color: '#9fb4d8', align: 'center' });

      if (this.t > 0.6) {
        r.text(rankWord, S.W / 2, 112, { size: 15, color: rankColor, align: 'center' });
        r.text(rankSub, S.W / 2, 134, { size: 10, color: C.text, align: 'center' });
      }

      if (this.t > 0.9) {
        var bw = 260, bx = (S.W - bw) / 2;
        r.window(bx, 152, bw, 76);
        var total = S.State.quizOk + S.State.quizNg;
        var acc = total ? Math.round(S.State.quizOk / total * 100) : 0;
        var el = Math.round(S.State.elapsed());
        var mm = Math.floor(el / 60), ss = el % 60;
        var F = S.Text.fmt;
        var rows = [
          [S.T('ending.rowAccuracy', ''),
           F(S.T('ending.accFmt', ''), { ok: S.State.quizOk, total: total, pct: acc })],
          [S.T('ending.rowTime', ''),
           F(S.T('ending.timeFmt', ''), { m: mm, s: (ss < 10 ? '0' : '') + ss })],
          [S.T('ending.rowDex', ''),
           F(S.T('ending.dexFmt', ''), { n: S.State.dexCount(), total: S.PARTS.length })]
        ];
        for (var k = 0; k < rows.length; k++) {
          r.text(rows[k][0], bx + 18, 164 + k * 20, { size: 11, color: C.textHi });
          r.text(rows[k][1], bx + bw - 18, 164 + k * 20, { size: 11, color: C.text, align: 'right' });
        }
      }

      if (this.ready && (this.t % 1.2) < 0.7) {
        r.text(S.T('ending.press', ''), S.W / 2, S.H - 24,
          { size: 10, color: '#cfe0ff', align: 'center' });
      }
    }
  };

  S.Game.register('ending', Ending);
})(SPIKE);
