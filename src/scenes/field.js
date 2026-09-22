/* ============================================================
 *  scenes/field — 탑다운 필드 (타일맵 + 그리드 이동 + 대화)
 * ============================================================ */
(function (S) {
  'use strict';

  var T = S.TILE;
  /* 한 칸 이동 시간(초).
     10분 안에 세 맵을 도는 체험이라 이동에 시간을 쓰면 안 된다.
     0.16 은 초당 6칸으로 굼떠서 0.12(초당 8칸)로 올렸다. */
  var STEP = 0.12;
  /* 이동 중에 들어온 방향키를 들고 있는 시간(초).
     한 칸이 0.12초라, 그 사이에 눌렀다 뗀 키는 예전엔 통째로 사라졌다.
     (도착 시점에 "지금 눌려 있는 키"만 봤다 — 톡 누르면 반응이 없었다) */
  var BUFFER = 0.18;
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

    _ground: {},      // mapId → 미리 구운 바닥 캔버스
    _groundCv: null,  // 지금 맵의 것
    _exits: null,     // ▼ 를 그릴 칸들 (글자라 굽지 않는다)
    _hudGoal: null,   // HUD 목표 문구 캐시
    _buf: null,       // 이동 중에 눌린 방향 (선입력)
    _bufT: 0,

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
      this._groundCv = this._bakeGround();
      this._hudGoal = null;
      this._buf = null;
      this._bufT = 0;

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
        if (o.hidden) continue;        // 사라진 오브젝트가 벽으로 남으면 안 된다
        for (var j = 0; j < (o.solid || []).length; j++) {
          var c = o.solid[j];
          if (grid[c[1]]) grid[c[1]][c[0]] = true;
        }
      }
      this.solid = grid;
    },

    /* ------------------------------------------------------------
     *  바닥을 캔버스 한 장에 미리 구워 둔다.
     *
     *  맵은 24x18 = 정확히 한 화면이고 지형은 애니메이션도 변화도 없다.
     *  그런데 예전에는 매 프레임 타일 433장을 drawImage 로 다시 붙이고 있었다.
     *  (60fps 면 초당 2만 7천 회 — 프레임 예산을 여기서 다 썼다)
     *  한 번 구워 두면 프레임당 drawImage 1회로 끝난다.
     *
     *  resetMaps 는 NPC·오브젝트만 되돌리고 ground 는 건드리지 않으므로
     *  맵별로 한 번만 굽고 계속 쓴다.
     *  ▼(출구 표시)는 글자라 폰트가 바뀌면 달라진다 — 굽지 않고 따로 그린다.
     * ---------------------------------------------------------- */
    _bakeGround: function () {
      var m = this.map;

      this._exits = [];
      for (var ey = 0; ey < this.gh; ey++) {
        for (var ex = 0; ex < this.gw; ex++) {
          if (m.ground[ey][ex] === 'D') this._exits.push([ex * T, ey * T]);
        }
      }

      var hit = this._ground[this.mapId];
      if (hit) return hit;

      var cv = document.createElement('canvas');
      cv.width = this.gw * T;
      cv.height = this.gh * T;
      var ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      for (var y = 0; y < this.gh; y++) {
        for (var x = 0; x < this.gw; x++) {
          var sp = S.Sprites.get(S.TERRAIN[m.ground[y][x]] || 't_grass');
          if (sp) ctx.drawImage(sp, x * T, y * T);
        }
      }
      this._ground[this.mapId] = cv;
      return cv;
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

      if (this.mw.active) { this.mw.update(dt); this._buf = null; this._bufT = 0; return; }
      if (this.busy) return;

      var pl = this.player, I = S.Input;

      /* 한 칸 가는 동안 눌린 방향은 버리지 않고 잠깐 들고 있는다.
         도착할 때 이걸 먼저 본다 — 톡 누른 입력이 사라지지 않게. */
      var np = this._pressedDir();
      if (np) { this._buf = np; this._bufT = BUFFER; }
      else if (this._bufT > 0) {
        this._bufT -= dt;
        if (this._bufT <= 0) { this._buf = null; this._bufT = 0; }
      }

      // 이동 보간
      if (pl.moving) {
        pl.t += dt / STEP;

        if (pl.t >= 1) {
          // 도착. 남은 시간은 버리지 않고 다음 칸으로 이월한다.
          // (예전에는 도착 프레임에 아무것도 안 해서 칸마다 한 프레임씩 멈췄다)
          var carry = (pl.t - 1) * STEP;
          pl.t = 0; pl.moving = false;
          pl.px = pl.tx * T; pl.py = pl.ty * T;
          this._onArrive();

          // 도착 처리가 대화나 맵 이동을 시작했으면 여기서 멈춘다
          var blocked = this.mw.active || this.busy || S.Game._pending;
          if (!blocked) {
            var nd = this._takeDir();
            if (nd && this._tryStep(nd)) {
              pl.t = Math.min(0.99, carry / STEP);
              this._lerp();
            }
          }
        } else {
          this._lerp();
        }
        pl.animT += dt;

      } else {
        var d = this._takeDir();
        if (d) {
          /* 출발하는 프레임도 이번 dt 만큼 나아가게 한다.
             예전엔 t=0 으로만 두고 보간을 안 해서 첫 프레임은 제자리였다 (17ms 손해).
             도착 후 이어 걷는 쪽은 원래부터 carry 로 이렇게 하고 있었다. */
          if (this._tryStep(d)) {
            pl.t = Math.min(0.99, dt / STEP);
            this._lerp();
            pl.animT += dt;
          } else {
            pl.frame = 0;
            this._bump();
          }
        } else {
          pl.frame = 0;
          pl.animT = 0;
        }
        if (I.pressed.ok) {
          // 정면에 말 걸 대상이 없으면 가이드 페이지를 넘긴다
          // (실습 시작 전에는 넘기지 않는다 — 장인에게 말을 걸어야 시작된다)
          if (!this._interact() && this.map.split &&
              S.Mission && S.Mission.started()) {
            S.Mission.next(this);
          }
        }
        if (I.pressed.cancel) S.Game.push('dex');
      }

      this._camera();
    },

    /* 지금 눌려 있는 방향 (없으면 null) */
    _heldDir: function () {
      var I = S.Input;
      if (I.down.up) return 'up';
      if (I.down.down) return 'down';
      if (I.down.left) return 'left';
      if (I.down.right) return 'right';
      return null;
    },

    /* 이번 프레임에 새로 눌린 방향 (없으면 null) */
    _pressedDir: function () {
      var P = S.Input.pressed;
      if (P.up) return 'up';
      if (P.down) return 'down';
      if (P.left) return 'left';
      if (P.right) return 'right';
      return null;
    },

    /* 지금 가야 할 방향. 이동 중에 눌러 둔 것이 있으면 그것을 먼저 쓴다.
       한 번 쓰면 비운다 — 안 그러면 다음 칸에서 또 먹는다. */
    _takeDir: function () {
      var d = this._buf || this._heldDir();
      this._buf = null;
      this._bufT = 0;
      return d;
    },

    /* 그 방향으로 한 칸 시작. 막혀 있으면 방향만 바꾸고 false */
    _tryStep: function (d) {
      var pl = this.player, v = DIRV[d];
      pl.dir = d;
      var nx = pl.tx + v[0], ny = pl.ty + v[1];
      if (!this.passable(nx, ny)) return false;
      pl.fx = pl.tx; pl.fy = pl.ty;
      pl.tx = nx; pl.ty = ny;
      pl.moving = true; pl.t = 0;
      pl.frame = pl.frame === 1 ? 2 : 1;
      return true;
    },

    /* 두 칸 사이 보간 */
    _lerp: function () {
      var pl = this.player;
      pl.px = (pl.fx + (pl.tx - pl.fx) * pl.t) * T;
      pl.py = (pl.fy + (pl.ty - pl.fy) * pl.t) * T;
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
            this.mw.show(e.denyKey ? S.T(e.denyKey, '') : S.T('exits.locked', ''));
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

    /* ------------------------------------------------------------
     *  막힌 칸에 부딪혔을 때 스스로 반응하는 오브젝트 (bump: true).
     *  보스처럼 "지나칠 수 없는" 대상용 — Z 를 안 눌러도 걸어가면 걸린다.
     *  말 걸기와 같은 대화 테이블을 탄다.
     * ---------------------------------------------------------- */
    _bump: function () {
      var pl = this.player, v = DIRV[pl.dir];
      var fx = pl.tx + v[0], fy = pl.ty + v[1];
      var o = this.map.objects || [];
      for (var i = 0; i < o.length; i++) {
        if (!o[i].id || !o[i].bump || o[i].hidden) continue;
        var cells = o[i].solid || [];
        for (var k = 0; k < cells.length; k++) {
          if (cells[k][0] === fx && cells[k][1] === fy) {
            S.Dialogue.talk(this.mapId, o[i].id, this);
            return true;
          }
        }
      }
      return false;
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
        if (!o[j].id || o[j].hidden) continue;   // 사라진 오브젝트에 말을 걸면 안 된다
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
      // ctx 는 이미 -cam 만큼 밀려 있다. 분할 맵은 draw() 의 clip 이 잘라 준다.
      if (this._groundCv) r.ctx.drawImage(this._groundCv, 0, 0);

      // 출구 표시 — 맵당 1~2칸뿐이라 매 프레임 그려도 부담이 없다
      var ex = this._exits;
      for (var i = 0; i < ex.length; i++) {
        r.rect(ex[i][0] + 2, ex[i][1] + 2, T - 4, T - 4, '#00000044');
        r.text('▼', ex[i][0] + T / 2, ex[i][1] + 3, { size: 10, color: '#ffe066', align: 'center' });
      }
    },

    /* ------------------------------------------------------------
     *  y 순으로 겹쳐 그리기.
     *
     *  예전에는 프레임마다 배열 하나와 엔티티 수만큼의 클로저를 새로 만들고
     *  비교 함수까지 넘겨 sort() 했다 (초당 800개 남짓 할당).
     *  목록 슬롯을 재사용하고, 20개 남짓이라 삽입 정렬로 바꿨다.
     *  두 방식 다 안정 정렬이라 y 가 같을 때 순서(오브젝트→NPC→주인공)는 그대로다.
     * ---------------------------------------------------------- */
    _drawEntities: function (r) {
      var list = this._ents || (this._ents = []);
      var m = this.map, n = 0, i;

      for (i = 0; i < (m.objects || []).length; i++) {
        var o = m.objects[i];
        if (o.hidden || !S.Sprites.get(o.sprite)) continue;
        n = this._put(list, n, (o.ty + 1) * T, 'obj', o);
      }

      for (i = 0; i < (m.npcs || []).length; i++) {
        var np = m.npcs[i];
        if (np.hidden) continue;
        n = this._put(list, n, (np.ty + 1) * T, 'npc', np);
      }

      n = this._put(list, n, this.player.py + T, 'hero', this.player);

      for (i = 1; i < n; i++) {
        var cur = list[i], j = i - 1;
        while (j >= 0 && list[j].y > cur.y) { list[j + 1] = list[j]; j--; }
        list[j + 1] = cur;
      }
      for (i = 0; i < n; i++) this._drawEnt(r, list[i]);
    },

    /* 슬롯을 덮어쓴다 — 새 객체를 만들지 않는다 */
    _put: function (list, n, y, kind, ref) {
      var e = list[n] || (list[n] = { y: 0, kind: '', ref: null });
      e.y = y; e.kind = kind; e.ref = ref;
      return n + 1;
    },

    _drawEnt: function (r, e) {
      if (e.kind === 'obj') {
        var o = e.ref, osp = S.Sprites.get(o.sprite);
        if (osp) r.ctx.drawImage(osp, o.tx * T, (o.ty + 1) * T - osp.height);
        return;
      }

      if (e.kind === 'npc') {
        var n = e.ref;
        var ns = S.Sprites.charSprite(n.char, n.dir || 'down', 0);
        var nsp = S.Sprites.get(ns.id);
        if (!nsp) return;
        var dx = n.tx * T + (T - 16) / 2;
        var dy = (n.ty + 1) * T - nsp.height + 4;
        r.sprite(ns.id, dx, dy, { flipX: ns.flip });
        // 아직 말 안 건 NPC 머리 위 !
        if (n.mark && !S.State.flags['talked_' + n.id]) {
          r.sprite('o_excl', dx + 4, dy - 12 + Math.sin(this.animT * 5) * 2);
        }
        return;
      }

      var pl = e.ref;
      var frame = pl.moving ? (Math.floor(pl.animT * 8) % 2 === 0 ? 1 : 2) : 0;
      var ps = S.Sprites.charSprite('hero', pl.dir, frame);
      var psp = S.Sprites.get(ps.id);
      if (!psp) return;
      var bob = (pl.moving && frame !== 0) ? -1 : 0;
      r.sprite(ps.id, Math.round(pl.px) + (T - 16) / 2,
        Math.round(pl.py) + T - psp.height + 4 + bob, { flipX: ps.flip });
    },

    _drawHUD: function (r) {
      var C = S.C;
      var obj = S.Quest.current();
      var maxW = this.viewW - 8;

      /* 좌측 목표 — 분할 맵에서는 폭이 좁으므로 넘치면 잘라낸다.
         목표 문구는 플래그가 바뀔 때만 달라지는데 자르기 루프가 글자마다
         폭을 재므로, 문구(또는 폰트 세대)가 그대로면 계산을 건너뛴다. */
      if (obj !== this._hudGoal || maxW !== this._hudMaxW || S.Font.gen !== this._hudGen) {
        this._hudGoal = obj;
        this._hudMaxW = maxW;
        this._hudGen = S.Font.gen;
        var label = '◆ ' + obj;
        if (r.textWidth(label, 10) + 18 > maxW) {
          while (label.length > 4 && r.textWidth(label + '…', 10) + 18 > maxW) {
            label = label.slice(0, -1);
          }
          label += '…';
        }
        this._hudLabel = label;
        this._hudW = Math.min(r.textWidth(label, 10) + 18, maxW);
      }

      r.window(4, 4, this._hudW, 20, { alpha: 0.85 });
      r.text(this._hudLabel, 11, 9, { size: 10, color: C.textHi });

      // 우측 타이머 (분할 맵에서는 패널이 담당)
      if (!this.map.split) {
        var t = S.State.clock();
        var late = S.State.remaining() < 120;
        var tw = 54;
        r.window(S.W - tw - 4, 4, tw, 20, { alpha: 0.85 });
        r.text(t, S.W - tw + 4, 9,
          { size: 10, color: S.State.paused ? C.textDim : (late ? C.textNg : C.text) });
      }
    }
  };

  S.Game.register('field', Field);
  S.Field = Field;
})(SPIKE);
