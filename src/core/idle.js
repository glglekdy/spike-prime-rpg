/* ============================================================
 *  SPIKE.Idle — 무인 자동 복귀 (반복 순환형 부스 필수)
 *  90초 무입력 → 10초 카운트다운 → 완전 초기화
 * ============================================================ */
(function (S) {
  'use strict';

  var LIMIT = 90;    // 무입력 허용 초
  var WARN = 10;     // 경고 카운트다운 초

  S.Idle = {
    enabled: true,

    tick: function (dt, r) {
      if (!this.enabled) return;
      if (S.Game.sceneName === 'attract') return;

      var idle = S.Input.idleSeconds();
      if (idle < LIMIT) return;

      var left = Math.ceil(LIMIT + WARN - idle);
      if (left <= 0) {
        S.Audio.stopBGM();
        S.Input.poke();
        S.Game.transition('attract');
        return;
      }

      // 경고 오버레이
      r.fade(0.6);
      var bw = 260, bh = 78, bx = (S.W - bw) / 2, by = (S.H - bh) / 2;
      r.window(bx, by, bw, bh);
      r.text('자리를 비우셨나요?', bx + bw / 2, by + 12,
        { size: 13, color: S.C.textHi, align: 'center' });
      r.text(left + '초 후 처음 화면으로 돌아갑니다', bx + bw / 2, by + 34,
        { size: 10, color: S.C.text, align: 'center' });
      r.text('아무 키나 누르면 계속합니다', bx + bw / 2, by + 54,
        { size: 10, color: S.C.textDim, align: 'center' });
    }
  };
})(SPIKE);
