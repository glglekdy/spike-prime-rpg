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

  /* 텍스트 JSON → 폰트 순으로 준비한 뒤 게임을 띄운다.
     순서가 중요하다: JSON 이 폰트 사다리를 정하고, 그 사다리로 폰트를 로드한다.
     어느 쪽이 실패해도 부스가 멈추면 안 되므로 전부 fallback 으로 진행한다. */
  function start() {
    var p = S.Text ? S.Text.boot() : Promise.resolve();
    p.then(function () { return S.Font.preload(); }, function () { return S.Font.preload(); })
     .then(boot, boot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(SPIKE);
