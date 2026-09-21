/* ============================================================
 *  SPIKE.Input — 키보드 + 마우스 (논리 좌표)
 * ============================================================ */
(function (S) {
  'use strict';

  var MAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'ok', Enter: 'ok', Space: 'ok', NumpadEnter: 'ok',
    KeyX: 'cancel', Escape: 'cancel', Backspace: 'cancel',
    ShiftLeft: 'dash', ShiftRight: 'dash'
  };

  var Input = S.Input = {
    down: {},        // 눌린 상태
    pressed: {},     // 이번 프레임에 새로 눌림
    released: {},
    mouse: { x: 0, y: 0, down: false, pressed: false, released: false },
    lastActivity: 0,
    renderer: null,

    init: function (renderer) {
      this.renderer = renderer;
      this.lastActivity = performance.now();
      var self = this;

      window.addEventListener('keydown', function (e) {
        // 브라우저 기본 스크롤/검색 차단
        if (MAP[e.code] || /^F\d+$/.test(e.code)) e.preventDefault();
        self.lastActivity = performance.now();

        // 강사 단축키는 씬보다 먼저 가로챈다
        if (S.Hotkeys && S.Hotkeys.handle(e)) return;

        var a = MAP[e.code];
        if (a && !self.down[a]) self.pressed[a] = true;
        if (a) self.down[a] = true;
        self.rawKey = e.code;
        if (S.Game && S.Game.scene && S.Game.scene.onKey) S.Game.scene.onKey(e);
      });

      window.addEventListener('keyup', function (e) {
        var a = MAP[e.code];
        if (a) { self.down[a] = false; self.released[a] = true; }
      });

      var cv = renderer.canvas;
      cv.addEventListener('mousemove', function (e) {
        var p = renderer.toLogical(e.clientX, e.clientY);
        self.mouse.x = p.x; self.mouse.y = p.y;
        self.lastActivity = performance.now();
      });
      cv.addEventListener('mousedown', function (e) {
        var p = renderer.toLogical(e.clientX, e.clientY);
        self.mouse.x = p.x; self.mouse.y = p.y;
        self.mouse.down = true; self.mouse.pressed = true;
        self.lastActivity = performance.now();
        e.preventDefault();
      });
      window.addEventListener('mouseup', function () {
        self.mouse.down = false; self.mouse.released = true;
        self.lastActivity = performance.now();
      });
      window.addEventListener('blur', function () {
        self.down = {};
        self.mouse.down = false;
      });
    },

    /* 매 프레임 끝에서 호출 */
    endFrame: function () {
      this.pressed = {};
      this.released = {};
      this.mouse.pressed = false;
      this.mouse.released = false;
    },

    idleSeconds: function () {
      return (performance.now() - this.lastActivity) / 1000;
    },

    poke: function () { this.lastActivity = performance.now(); },

    /* 마우스가 사각형 안에 있는가 */
    hover: function (x, y, w, h) {
      var m = this.mouse;
      return m.x >= x && m.x < x + w && m.y >= y && m.y < y + h;
    },
    clicked: function (x, y, w, h) {
      return this.mouse.pressed && this.hover(x, y, w, h);
    }
  };
})(SPIKE);
