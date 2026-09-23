/* ============================================================
 *  scenes/attract — 타이틀 & 어트랙트 (다음 학생 대기 화면)
 *  scenes/opening — 오프닝 내레이션 (X로 스킵). 5분판 예산 10초
 * ============================================================ */
(function (S) {
  'use strict';

  /* ================= 타이틀 ================= */
  var Attract = {
    t: 0, stars: null, demo: 0,

    enter: function () {
      this.t = 0; this.demo = 0;
      S.State.running = false;
      if (!this.stars) {
        this.stars = [];
        for (var i = 0; i < 46; i++) {
          this.stars.push({
            x: Math.random() * S.W, y: Math.random() * 150,
            s: Math.random() * 2 + 0.3, b: Math.random()
          });
        }
      }
      S.Audio.playBGM('title');
    },

    /* 언어 버튼 (우측 상단). 버튼이 없으면 null */
    langBtn: function () {
      if (!S.Text || S.Text.langs.length < 2) return null;
      var w = Math.max(46, S.Game.renderer
        ? S.Game.renderer.ctx && S.Font.measure(S.Text.langName(), 10) + 16 : 46);
      return [S.W - w - 6, 6, w, 18];
    },

    update: function (dt) {
      this.t += dt;
      this.demo += dt;
      var I = S.Input;

      // 언어 전환 — 게임 시작보다 먼저 본다 (클릭을 가로채야 한다)
      var b = this.langBtn();
      if (b && (I.clicked(b[0], b[1], b[2], b[3]) || I.rawKey === 'KeyL')) {
        I.rawKey = null;
        if (S.Text.cycleLang()) S.Audio.se('cursor');
        return;
      }

      if (I.pressed.ok || I.mouse.pressed) {
        S.Audio.resume();
        S.Audio.se('ok');
        S.State.reset();
        S.Game.transition('opening');
      }
    },

    draw: function (r) {
      var C = S.C;
      // 밤하늘
      r.vgradient(0, 0, S.W, S.H, '#0a0f2a', '#1b2a5e');
      for (var i = 0; i < this.stars.length; i++) {
        var st = this.stars[i];
        var a = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 1.5 + st.b * 9));
        r.ctx.globalAlpha = a;
        r.rect(st.x, st.y, st.s < 1 ? 1 : 2, st.s < 1 ? 1 : 2, '#ffffff');
      }
      r.ctx.globalAlpha = 1;

      // 지면 실루엣
      r.rect(0, 196, S.W, S.H - 196, '#0d1a2e');
      r.rect(0, 196, S.W, 2, '#22406a');

      // 떠 있는 허브
      var by = 96 + Math.sin(this.t * 1.4) * 4;
      var hub = S.Sprites.get('p_hub');
      if (hub) r.ctx.drawImage(hub, (S.W - 64) / 2, by - 30, 64, 64);

      // 타이틀
      r.text(S.T('title.name', ''), S.W / 2, 22, { size: 22, color: '#ffe066', align: 'center' });
      r.text(S.T('title.sub', ''), S.W / 2, 52, { size: 12, color: '#9fc4ff', align: 'center' });
      r.rect(S.W / 2 - 110, 72, 220, 1, '#4a6aa8');

      // 아래 안내
      if ((this.t % 1.2) < 0.75) {
        r.text(S.T('title.press', ''), S.W / 2, 186,
          { size: 13, color: '#ffffff', align: 'center' });
      }

      // 진열된 부품 아이콘 (데모 루프)
      var ids = ['p_hub', 'p_motor_m', 'p_dist', 'p_color', 'p_force', 'p_beam', 'p_pin_black', 'p_cable'];
      for (var k = 0; k < 8; k++) {
        var px = 24 + k * 44;
        var wob = Math.sin(this.t * 2 + k) * 2;
        var sp = S.Sprites.get(ids[k]);
        if (sp) {
          r.ctx.globalAlpha = 0.85;
          r.ctx.drawImage(sp, 0, 0, 32, 32, px, 218 + wob, 28, 28);
          r.ctx.globalAlpha = 1;
        }
      }

      // 언어 버튼
      var lb = this.langBtn();
      if (lb) {
        var hov = S.Input.hover(lb[0], lb[1], lb[2], lb[3]);
        r.window(lb[0], lb[1], lb[2], lb[3], { alpha: hov ? 0.95 : 0.75 });
        r.text(S.Text.langName(), lb[0] + lb[2] / 2, lb[1] + 4,
          { size: 10, color: hov ? S.C.textHi : S.C.text, align: 'center' });
        // 버튼이 화면 오른쪽 끝에 붙어 있어 가운데 정렬하면 힌트가 잘린다
        r.text(S.T('lang.hint', ''), S.W - 6, lb[1] + 20,
          { size: 9, color: S.C.textDim, align: 'right' });
      }

      r.window(4, S.H - 26, S.W - 8, 22, { alpha: 0.8 });
      r.text(S.T('title.footer', ''), S.W / 2, S.H - 20,
        { size: 9, color: '#bcd2f0', align: 'center' });
    }
  };

  /* ================= 오프닝 ================= */
  /* 내레이션은 content/dialogue.<언어>.json 의 opening 배열 */
  function pages() { return S.DL('opening'); }

  var Opening = {
    page: 0, t: 0, shown: 0, mw: null,

    enter: function () {
      this.page = 0; this.t = 0;
      this.mw = new S.MessageWindow({ y: S.H - 90, h: 74, speed: 64 });
      S.Audio.playBGM('title');
      this._show();
    },

    _show: function () {
      var self = this;
      this.mw.show({ text: pages()[this.page] }, function () {
        self.page++;
        if (self.page >= pages().length) {
          S.State.chapter = 1;
          S.Game.transition('field', { map: 'village' });
        } else {
          self._show();
        }
      });
    },

    update: function (dt) {
      this.t += dt;
      if (S.Input.pressed.cancel) {
        S.State.chapter = 1;
        S.Game.transition('field', { map: 'village' });
        return;
      }
      this.mw.update(dt);
    },

    draw: function (r) {
      r.vgradient(0, 0, S.W, S.H, '#05070f', '#141a34');

      // 잠든 허브
      var alt = S.Sprites.get('o_altar');
      if (alt) {
        r.ctx.globalAlpha = 0.35 + 0.1 * Math.sin(this.t);
        r.ctx.drawImage(alt, (S.W - 96) / 2, 40, 96, 108);
        r.ctx.globalAlpha = 1;
      }
      // 뒤엉킨 케이블
      var cab = S.Sprites.get('e_cable');
      if (cab) {
        r.ctx.globalAlpha = 0.5;
        r.ctx.drawImage(cab, (S.W - 128) / 2, 72, 128, 112);
        r.ctx.globalAlpha = 1;
      }

      this.mw.draw(r);
      r.text(S.T('battle.skip', ''), S.W - 10, 8, { size: 9, color: '#7e93c0', align: 'right' });
    }
  };

  S.Game.register('attract', Attract);
  S.Game.register('opening', Opening);
})(SPIKE);
