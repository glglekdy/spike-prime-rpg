/* ============================================================
 *  SPIKE.Game — 게임 루프 + 씬 매니저
 *  씬 인터페이스: { enter(p), exit(), update(dt), draw(r), onKey(e) }
 * ============================================================ */
(function (S) {
  'use strict';

  var Game = S.Game = {
    renderer: null,
    scenes: {},
    scene: null,
    sceneName: '',
    stack: [],          // push/pop 용 (메뉴, 도감 등 오버레이 씬)
    _last: 0,
    _fade: 0,           // 0 = 없음, 양수 = 페이드 진행
    _fadeDir: 0,        // -1 어두워짐, +1 밝아짐
    _pending: null,
    shake: 0,
    _snap: null,        // 오버레이 뒤에 깔 정지 화면
    _snapCtx: null,
    _snapValid: false,

    register: function (name, scene) { this.scenes[name] = scene; return this; },

    /* 즉시 전환 */
    change: function (name, params) {
      if (this.scene && this.scene.exit) this.scene.exit();
      this.stack.length = 0;
      this._snapValid = false;
      this.scene = this.scenes[name];
      this.sceneName = name;
      if (!this.scene) { console.error('없는 씬:', name); return; }
      // 캔버스 바깥 배경색도 이 화면에 맞춰 천천히 넘어간다 (오버레이 push 는 제외)
      if (S.Ambient) S.Ambient.apply(name, params || {});
      if (this.scene.enter) this.scene.enter(params || {});
    },

    /* 페이드 아웃 → 전환 → 페이드 인 */
    transition: function (name, params) {
      if (this._pending) return;
      this._pending = { name: name, params: params };
      this._fade = 0;
      this._fadeDir = -1;
    },

    /* 오버레이 씬 (필드 위에 메뉴 등) */
    push: function (name, params) {
      var sc = this.scenes[name];
      if (!sc) return;
      this.stack.push(sc);
      this._snapValid = false;
      if (sc.enter) sc.enter(params || {});
    },
    pop: function () {
      var sc = this.stack.pop();
      this._snapValid = false;
      if (sc && sc.exit) sc.exit();
    },

    /* ------------------------------------------------------------
     *  오버레이 뒤 배경을 정지 화면으로 떠 둔다 (freezeBase 씬 전용)
     *
     *  도감·카드는 반투명 페이드로 필드를 거의 다 가린다. 그런데도 매 프레임
     *  필드를 통째로 다시 그리고 있었다 — 안 보이는 타일 433장을 포함해서.
     *  오버레이가 뜬 뒤 첫 프레임만 제대로 그리고, 그 결과를 떠서 재사용한다.
     *
     *  캔버스에서 픽셀을 읽는 것이라 ctx 변환(흔들림)과 무관하게 안전하다.
     * ---------------------------------------------------------- */
    _capture: function () {
      if (!this._snap) {
        this._snap = document.createElement('canvas');
        this._snap.width = S.W;
        this._snap.height = S.H;
        this._snapCtx = this._snap.getContext('2d');
        this._snapCtx.imageSmoothingEnabled = false;
      }
      this._snapCtx.clearRect(0, 0, S.W, S.H);
      this._snapCtx.drawImage(this.renderer.canvas, 0, 0);
      this._snapValid = true;
    },
    top: function () {
      return this.stack.length ? this.stack[this.stack.length - 1] : this.scene;
    },

    start: function (canvas, firstScene) {
      this.renderer = new S.Renderer(canvas);
      S.Input.init(this.renderer);
      S.Sprites.init();
      this.change(firstScene);
      this._last = performance.now();
      var self = this;
      requestAnimationFrame(function step(t) { self._loop(t); requestAnimationFrame(step); });
    },

    _loop: function (t) {
      var dt = Math.min(0.05, (t - this._last) / 1000);
      this._last = t;

      // --- 페이드 처리 ---
      if (this._fadeDir < 0) {
        this._fade += dt * 4;
        if (this._fade >= 1) {
          this._fade = 1;
          var p = this._pending;
          this._pending = null;
          this._fadeDir = 1;
          if (p) this.change(p.name, p.params);
        }
      } else if (this._fadeDir > 0) {
        this._fade -= dt * 3;
        if (this._fade <= 0) { this._fade = 0; this._fadeDir = 0; }
      }

      // --- 갱신 ---
      var active = this.top();
      if (active && active.update && this._fadeDir >= 0) active.update(dt);

      // 오버레이가 떠 있어도 바닥 씬의 애니메이션은 돌린다
      if (this.stack.length && this.scene && this.scene.updateBackground) {
        this.scene.updateBackground(dt);
      }

      // --- 그리기 ---
      var r = this.renderer;
      // 맨 위 오버레이가 화면을 덮는다고 선언했으면 바닥 씬은 한 번만 그린다
      var top = this.stack.length ? this.stack[this.stack.length - 1] : null;
      var freeze = !!(top && top.freezeBase);

      r.ctx.save();
      if (this.shake > 0) {
        this.shake -= dt * 40;
        var s = Math.max(0, this.shake);
        r.ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      }
      if (freeze && this._snapValid) {
        r.ctx.drawImage(this._snap, 0, 0);
      } else {
        if (this.scene && this.scene.draw) this.scene.draw(r);
        if (freeze) this._capture();     // 오버레이를 얹기 전에 떠야 한다
      }
      for (var i = 0; i < this.stack.length; i++) {
        if (this.stack[i].draw) this.stack[i].draw(r);
      }
      r.ctx.restore();

      if (this._fade > 0) r.fade(this._fade);

      if (S.Idle) S.Idle.tick(dt, r);
      if (S.Hotkeys) S.Hotkeys.draw(r);
      if (S.Text) { S.Text.tick(dt); S.Text.draw(r); }   // JSON 교체 알림

      S.Input.endFrame();
    },

    quake: function (power) { this.shake = power || 8; }
  };
})(SPIKE);
