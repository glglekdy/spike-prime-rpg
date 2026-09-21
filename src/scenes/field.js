/* ============================================================
 *  scenes/field — 탑다운 필드 (타일맵 + 그리드 이동 + 대화)
 * ============================================================ */
(function (S) {
  'use strict';

  var T = S.TILE;
  var STEP = 0.16;           // 한 칸 이동 시간(초)
  var DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  var Field = {
    mapId: '', map: null,
    solid: null,
    player: null,
    cam: { x: 0, y: 0 },
    viewW: S.W, viewH: S.H,
    mw: null,
    animT: 0,
    busy: false,

    enter: function (p) {
      this.mapId = p.map || 'village';
      this.map = S.MAPS[this.mapId];
      this.mw = this.mw || new S.MessageWindow();
      this.mw.close();
      this.busy = false;

      this.viewW = this.map.split ? 192 : S.W;
      this.viewH = S.H;
      if (this.map.split) this.mw = new S.MessageWindow({ x: 4, w: this.viewW - 8, h: 66 });
      else this.mw = new S.MessageWindow();

      this._buildSolid();

      var st = (p.at) ? p.at : this.map.start;
      this.player = {
        tx: st.x, ty: st.y, px: st.x * T, py: st.y * T,
        dir: st.dir || 'down', moving: false, t: 0, frame: 0, animT: 0,
        fx: st.x, fy: st.y
      };
      this._camera();

      S.Audio.resume();
      if (this.map.bgm) S.Audio.playBGM(this.map.bgm);

      if (S.MissionPanel && this.map.split) S.MissionPanel.enter();
    },

    exit: function () {
      if (S.MissionPanel && this.map && this.map.split) S.MissionPanel.exit();
    },

    _buildSolid: function () {
      var m = this.map, h = m.ground.length, w = m.ground[0].length;
      this.gw = w; this.gh = h;
      var grid = [];
      for (var y = 0; y < h; y++) {
        grid[y] = [];
        for (var x = 0; x < w; x++) {
          grid[y][x] = S.SOLID_CHARS.indexOf(m.ground[y][x]) >= 0;
        }
      }
      for (var i = 0; i < (m.objects || []).length; i++) {
        var o = m.objects[i];
        for (var j = 0; j < (o.solid || []).length; j++) {
          var c = o.solid[j];
          if (grid[c[1]]) grid[c[1]][c[0]] = true;
        }
      }
      this.solid = grid;
    },

    passable: function (tx, ty) {
      if (tx < 0 || ty < 0 || ty >= this.gh || tx >= this.gw) return false;
      if (this.solid[ty][tx]) return false;
      var n = this.map.npcs || [];
      for (var i = 0; i < n.length; i++) {
        if (n[i].hidden) continue;
        if (n[i].tx === tx && n[i].ty === ty) return false;
      }
      return true;
    },

    /* ---------------- 갱신 ---------------- */

    update: function (dt) {
      this.animT += dt;

      // 가이드 패널: 애니메이션은 항상, 입력은 대화창이 없을 때만
      if (S.MissionPanel && this.map.split) {
        S.MissionPanel.update(dt, !this.mw.active && !this.busy, this);
      }

      if (this.mw.active) { this.mw.update(dt); return; }
      if (this.busy) return;

      var pl = this.player, I = S.Input;

      // 이동 보간
      if (pl.moving) {
        pl.t += dt / STEP;
        if (pl.t >= 1) {
          pl.t = 0; pl.moving = false;
          pl.px = pl.tx * T; pl.py = pl.ty * T;
          this._onArrive();
        } else {
          pl.px = (pl.fx + (pl.tx - pl.fx) * pl.t) * T;
          pl.py = (pl.fy + (pl.ty - pl.fy) * pl.t) * T;
        }
        pl.animT += dt;
      } else {
        var d = null;
        if (I.down.up) d = 'up';
        else if (I.down.down) d = 'down';
        else if (I.down.left) d = 'left';
        else if (I.down.right) d = 'right';

        if (d) {
          pl.dir = d;
          var v = DIRV[d];
          var nx = pl.tx + v[0], ny = pl.ty + v[1];
          if (this.passable(nx, ny)) {
            pl.fx = pl.tx; pl.fy = pl.ty;
            pl.tx = nx; pl.ty = ny;
            pl.moving = true; pl.t = 0;
            pl.frame = pl.frame === 1 ? 2 : 1;
          } else {
            pl.frame = 0;
          }
        } else {
          pl.frame = 0;
          pl.animT = 0;
        }

        if (I.pressed.ok) {
          // 정면에 말 걸 대상이 없으면 가이드 페이지를 넘긴다
          if (!this._interact() && this.map.split && S.Mission) S.Mission.next(this);
        }
        if (I.pressed.cancel) S.Game.push('dex');
      }

      this._camera();
    },

    _camera: function () {
      var mw = this.gw * T, mh = this.gh * T;
      var cx = this.player.px + T / 2 - this.viewW / 2;
      var cy = this.player.py + T / 2 - this.viewH / 2;
      this.cam.x = Math.max(0, Math.min(mw - this.viewW, Math.round(cx)));
      this.cam.y = Math.max(0, Math.min(mh - this.viewH, Math.round(cy)));
      if (mw <= this.viewW) this.cam.x = 0;
      if (mh <= this.viewH) this.cam.y = 0;
    },

    _onArrive: function () {
      var pl = this.player;
      var ex = this.map.exits || [];
      for (var i = 0; i < ex.length; i++) {
        var e = ex[i];
        if (e.tx === pl.tx && e.ty === pl.ty) {
          if (e.need && !S.State.flags[e.need]) {
            this.mw.show(e.deny || '아직 갈 수 없다.');
            // 되돌려 세운다
            var v = DIRV[pl.dir];
            pl.tx -= v[0]; pl.ty -= v[1];
            pl.px = pl.tx * T; pl.py = pl.ty * T;
            pl.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[pl.dir];
            return;
          }
          S.Audio.se('ok');
          S.Game.transition('field', { map: e.to, at: e.at });
          return;
        }
      }
    },

    /* 정면 칸의 대상과 상호작용. 말 건 대상이 있으면 true */
    _interact: function () {
      var pl = this.player, v = DIRV[pl.dir];
      var fx = pl.tx + v[0], fy = pl.ty + v[1];

      var n = this.map.npcs || [];
      for (var i = 0; i < n.length; i++) {
        if (n[i].hidden) continue;
        if (n[i].tx === fx && n[i].ty === fy) {
          n[i].dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[pl.dir];
          S.Dialogue.talk(this.mapId, n[i].id, this);
          return true;
        }
      }
      var o = this.map.objects || [];
      for (var j = 0; j < o.length; j++) {
        if (!o[j].id) continue;
        var cells = o[j].solid || [];
        for (var k = 0; k < cells.length; k++) {
          if (cells[k][0] === fx && cells[k][1] === fy) {
            S.Dialogue.talk(this.mapId, o[j].id, this);
            return true;
          }
        }
      }
      return false;
    },

    /* Q / E — 가이드 페이지 넘김 (마우스 고장 대비) */
    onKey: function (e) {
      if (this.map && this.map.split && !this.mw.active && !this.busy &&
          S.MissionPanel && S.MissionPanel.onKey(e.code, this)) {
        e.preventDefault();
      }
    },

    say: function (msgs, done) { this.mw.show(msgs, done); },
    ask: function (msg, choices, cb) { this.mw.ask(msg, choices, cb); },

    /* ---------------- 그리기 ---------------- */

    draw: function (r) {
      var ctx = r.ctx;
      ctx.save();
      if (this.map.split) {
        ctx.beginPath();
        ctx.rect(0, 0, this.viewW, this.viewH);
        ctx.clip();
      }
      ctx.translate(-this.cam.x, -this.cam.y);

      this._drawGround(r);
      this._drawEntities(r);

      ctx.restore();

      if (this.map.split && S.MissionPanel) S.MissionPanel.draw(r, this.viewW);

      this._drawHUD(r);
      this.mw.draw(r);
    },

    _drawGround: function (r) {
      var m = this.map;
      var x0 = Math.floor(this.cam.x / T), x1 = Math.ceil((this.cam.x + this.viewW) / T);
      var y0 = Math.floor(this.cam.y / T), y1 = Math.ceil((this.cam.y + this.viewH) / T);
      for (var y = y0; y < y1 && y < this.gh; y++) {
        for (var x = x0; x < x1 && x < this.gw; x++) {
          if (x < 0 || y < 0) continue;
          var ch = m.ground[y][x];
          var tile = S.TERRAIN[ch] || 't_grass';
          var sp = S.Sprites.get(tile);
          if (sp) r.ctx.drawImage(sp, x * T, y * T);
          if (ch === 'D') {
            // 출구 표시
            r.rect(x * T + 2, y * T + 2, T - 4, T - 4, '#00000044');
            r.text('▼', x * T + T / 2, y * T + 3, { size: 10, color: '#ffe066', align: 'center' });
          }
        }
      }
    },

    _drawEntities: function (r) {
      var list = [];
      var m = this.map, i;

      for (i = 0; i < (m.objects || []).length; i++) {
        var o = m.objects[i];
        if (o.hidden) continue;
        var sp = S.Sprites.get(o.sprite);
        if (!sp) continue;
        list.push({
          y: (o.ty + 1) * T,
          draw: function (o, sp) {
            return function () {
              r.ctx.drawImage(sp, o.tx * T, (o.ty + 1) * T - sp.height);
            };
          }(o, sp)
        });
      }

      for (i = 0; i < (m.npcs || []).length; i++) {
        var n = m.npcs[i];
        if (n.hidden) continue;
        list.push({ y: (n.ty + 1) * T, draw: this._npcDrawer(r, n) });
      }

      list.push({ y: this.player.py + T, draw: this._playerDrawer(r) });

      list.sort(function (a, b) { return a.y - b.y; });
      for (i = 0; i < list.length; i++) list[i].draw();
    },

    _npcDrawer: function (r, n) {
      var self = this;
      return function () {
        var s = S.Sprites.charSprite(n.char, n.dir || 'down', 0);
        var sp = S.Sprites.get(s.id);
        if (!sp) return;
        var dx = n.tx * T + (T - 16) / 2;
        var dy = (n.ty + 1) * T - sp.height + 4;
        r.sprite(s.id, dx, dy, { flipX: s.flip });
        // 아직 말 안 건 NPC 머리 위 !
        if (n.mark && !S.State.flags['talked_' + n.id]) {
          var bob = Math.sin(self.animT * 5) * 2;
          r.sprite('o_excl', dx + 4, dy - 12 + bob);
        }
      };
    },

    _playerDrawer: function (r) {
      var pl = this.player;
      return function () {
        var frame = pl.moving ? (Math.floor(pl.animT * 8) % 2 === 0 ? 1 : 2) : 0;
        var s = S.Sprites.charSprite('hero', pl.dir, frame);
        var bob = (pl.moving && frame !== 0) ? -1 : 0;
        var sp = S.Sprites.get(s.id);
        if (!sp) return;
        r.sprite(s.id, Math.round(pl.px) + (T - 16) / 2,
          Math.round(pl.py) + T - sp.height + 4 + bob, { flipX: s.flip });
      };
    },

    _drawHUD: function (r) {
      var C = S.C;
      var obj = S.Quest.current();

      // 좌측 목표
      var ow = r.textWidth(obj, 10) + 18;
      r.window(4, 4, Math.min(ow, this.viewW - 8), 20, { alpha: 0.85 });
      r.text('◆ ' + obj, 11, 9, { size: 10, color: C.textHi });

      // 우측 타이머 (분할 맵에서는 패널이 담당)
      if (!this.map.split) {
        var t = S.State.clock();
        var late = S.State.remaining() < 120;
        var tw = 54;
        r.window(S.W - tw - 4, 4, tw, 20, { alpha: 0.85 });
        r.text('⏱ ' + t, S.W - tw + 4, 9,
          { size: 10, color: S.State.paused ? C.textDim : (late ? C.textNg : C.text) });
      }
    }
  };

  S.Game.register('field', Field);
  S.Field = Field;
})(SPIKE);
