/* ============================================================
 *  scenes/gameover — 체력 소진
 *
 *  ⚠ DESIGN.md §0 은 원래 "게임오버 없음"이 확정 사항이었다.
 *    운영 요청으로 뒤집었다. 같은 이유로 보스전의 정령 부활(§9-2)도 뺐다.
 *    부스에서 학생이 여기서 멈추면 강사가 Ctrl+R 로 바로 다음으로 넘긴다.
 *
 *  체력은 퀴즈 오답으로만 줄어든다 (battle.js). 5칸.
 * ============================================================ */
(function (S) {
  'use strict';

  var GameOver = {
    t: 0, ready: false, shards: [],

    enter: function () {
      this.t = 0;
      this.ready = false;
      S.Audio.stopBGM();
      S.Audio.se('wrong');

      /* 꺼진 허브에서 떨어져 나온 조각 — 아래로 가라앉는다 */
      this.shards = [];
      for (var i = 0; i < 24; i++) {
        this.shards.push({
          x: Math.random() * S.W,
          y: Math.random() * S.H,
          v: 6 + Math.random() * 14,
          w: Math.random() < 0.5 ? 1 : 2,
          p: Math.random() * 6
        });
      }
    },

    update: function (dt) {
      this.t += dt;
      for (var i = 0; i < this.shards.length; i++) {
        var s = this.shards[i];
        s.y += s.v * dt;
        if (s.y > S.H + 4) { s.y = -4; s.x = Math.random() * S.W; }
      }
      if (this.t > 1.0) this.ready = true;
      if (this.ready && (S.Input.pressed.ok || S.Input.pressed.cancel || S.Input.mouse.pressed)) {
        S.Game.transition('attract');
      }
    },

    draw: function (r) {
      var C = S.C;
      r.vgradient(0, 0, S.W, S.H, '#2a0d12', '#0b0407');

      for (var i = 0; i < this.shards.length; i++) {
        var s = this.shards[i];
        r.ctx.globalAlpha = 0.35;
        r.rect(s.x + Math.sin(this.t + s.p) * 3, s.y, s.w, s.w, '#7a3a44');
        r.ctx.globalAlpha = 1;
      }

      // 꺼진 허브
      var hub = S.Sprites.get('p_hub');
      if (hub) {
        r.ctx.globalAlpha = 0.22;
        r.ctx.drawImage(hub, 0, 0, 32, 32, (S.W - 72) / 2, 40, 72, 72);
        r.ctx.globalAlpha = 1;
      }

      var pop = Math.min(1, this.t * 2.5);
      r.text(S.T('gameover.title', ''), S.W / 2, 126,
        { size: Math.round(6 * pop) + 12, color: '#ff8a96', align: 'center' });
      r.rect(S.W / 2 - 90, 152, 180, 1, '#6a2a34');

      if (this.t > 0.5) {
        r.text(S.T('gameover.sub', ''), S.W / 2, 164,
          { size: 11, color: C.text, align: 'center' });
      }

      if (this.t > 0.9) {
        var total = S.State.quizOk + S.State.quizNg;
        r.text(S.Text.fmt(S.T('gameover.score', ''),
          { ok: S.State.quizOk, total: total }), S.W / 2, 194,
          { size: 10, color: C.textDim, align: 'center' });
        r.text(S.T('gameover.hint', ''), S.W / 2, 216,
          { size: 10, color: C.textHi, align: 'center' });
      }

      if (this.ready && (this.t % 1.2) < 0.7) {
        r.text(S.T('gameover.press', ''), S.W / 2, S.H - 26,
          { size: 10, color: '#e0b8c0', align: 'center' });
      }
    }
  };

  S.Game.register('gameover', GameOver);
})(SPIKE);
