/* ============================================================
 *  main — 부팅
 * ============================================================ */
(function (S) {
  'use strict';

  function boot() {
    var canvas = document.getElementById('game');
    S.Audio.init();
    S.Game.start(canvas, 'attract');

    // 첫 클릭/키 입력에서 오디오 잠금 해제
    var unlock = function () {
      S.Audio.resume();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    // 우클릭 메뉴 차단 (부스 환경)
    window.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    var loading = document.getElementById('loading');
    if (loading) loading.remove();
  }

  /* 텍스트 JSON 을 먼저 읽고 게임을 띄운다 (실패해도 fallback 으로 진행) */
  function start() {
    if (S.Text) S.Text.boot().then(boot, boot);
    else boot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(SPIKE);
