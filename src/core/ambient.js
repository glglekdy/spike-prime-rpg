/* ============================================================
 *  SPIKE.Ambient — 캔버스 바깥 배경색을 게임 진행에 맞춰 바꾼다
 *
 *  유튜브 앰비언트 모드처럼, 지금 보고 있는 화면의 색이
 *  캔버스 밖으로 은은하게 번져 나가게 한다.
 *
 *  역할 분담
 *    style.css  그라데이션 모양과 느린 흐름 (transform 애니메이션)
 *    여기       CSS 변수 --amb1 / --amb2 두 개만 갈아끼운다
 *    @property  두 색 사이를 1.8초에 걸쳐 부드럽게 섞어 준다
 *
 *  색은 각 화면에서 실제로 쓰는 색에서 뽑았다 (아래 표의 주석 참고).
 *  0.5~0.6 투명도로 #05070f 위에 깔리므로 원색보다 살짝 진하게 잡는다.
 * ============================================================ */
(function (S) {
  'use strict';

  var FADE = 1.8;   // 초 — style.css 의 transition 과 맞춘다

  /* 씬(또는 field:맵) → [--amb1, --amb2] */
  var TONE = {
    attract:          ['#1b2a5e', '#16305f'],   // 타이틀 밤하늘
    opening:          ['#141a34', '#101a3a'],   // 잠든 왕국 — 가장 어둡다
    /* 잔디 #4a8b3a 계열. 녹색은 같은 값이라도 눈에 더 밝게 들어와서
       다른 화면과 균형을 맞추려고 한 단계 낮췄다 (체감 밝기 83 → 71). */
    'field:village':  ['#1f4629', '#26523c'],
    'field:workshop': ['#4d3820', '#5f4628'],   // 나무 바닥 #8a6a44
    'field:hubroom':  ['#2b2440', '#4a2a18'],   // 어두운 돌 + 횃불 불빛
    battle:           ['#3a2050', '#241640'],   // 전투 배경 보라
    'battle:boss':    ['#4a1c38', '#3a1424'],   // 보스전은 더 붉게
    gameover:         ['#4a1420', '#2a0e16'],   // 체력 소진 — 어두운 붉은색
    ending:           ['#2f1f52', '#4d3a1c'],   // 보라 + 팡파레 금색
    _default:         ['#1b2a5e', '#16305f']
  };

  var Ambient = S.Ambient = {
    TONE: TONE,
    enabled: true,
    key: '',

    /* 스타일을 만질 수 있는 환경인가 (헤드리스 테스트에서는 없다) */
    _root: function () {
      if (typeof document === 'undefined') return null;
      var el = document.documentElement;
      if (!el || !el.style || !el.style.setProperty) return null;
      return el;
    },

    /* 씬 이름 + 진입 파라미터 → 색 고르기 */
    keyFor: function (scene, params) {
      params = params || {};
      if (scene === 'field' && params.map) return 'field:' + params.map;
      if (scene === 'battle' && params.quizSet === 'boss') return 'battle:boss';
      return scene;
    },

    apply: function (scene, params) {
      this.set(this.keyFor(scene, params));
    },

    set: function (key) {
      if (!this.enabled) return false;
      var tone = TONE[key] || TONE._default;
      this.key = key;
      var root = this._root();
      if (!root) return false;
      root.style.setProperty('--amb1', tone[0]);
      root.style.setProperty('--amb2', tone[1]);
      return true;
    },

    /* 전환 시간(초)을 바꾼다 — 부스에서 취향대로 */
    setFade: function (sec) {
      var root = this._root();
      if (!root) return;
      root.style.setProperty('--amb-fade', sec + 's');
    }
  };

  Ambient.FADE = FADE;
})(SPIKE);
