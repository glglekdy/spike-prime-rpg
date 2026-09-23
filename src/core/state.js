/* ============================================================
 *  SPIKE.State — 1회 플레이 진행 상태
 *  순환형이므로 저장하지 않는다. reset()이 곧 "다음 학생".
 * ============================================================ */
(function (S) {
  'use strict';

  var State = S.State = {
    started: 0,        // performance.now()
    running: false,
    paused: false,
    pausedAt: 0,
    pausedTotal: 0,

    chapter: 1,        // 1=마을 2=공방 3=해체의방
    dex: {},           // 도감 등록된 부품 id
    flags: {},         // 진행 플래그
    quizOk: 0,
    quizNg: 0,
    /* 체력 = 보스전 이전 문제 수 (관문 2 + 확인 1). 그 셋을 전부 틀리면 게임오버.
       data/quiz.js 의 S.ASK 를 고치면 여기도 같이 고쳐야 한다. */
    hp: 3,
    maxHp: 3,
    missionStep: 0,    // MAP2 실습 스텝 인덱스
    missionChecks: {}, // 체크리스트 상태
    codeSolved: false,
    bossStep: 0,

    reset: function () {
      this.started = performance.now();
      this.running = true;
      this.paused = false;
      this.pausedAt = 0;
      this.pausedTotal = 0;
      this.chapter = 1;
      this.dex = {};
      this.flags = {};
      this.quizOk = 0;
      this.quizNg = 0;
      this.hp = 3;
      this.maxHp = 3;
      this.missionStep = 0;
      this.missionChecks = {};
      this.codeSolved = false;
      this.bossStep = 0;
      if (S.resetMaps) S.resetMaps();      // NPC 위치 등 맵 변형 원상복구
      if (S.Mission) S.Mission.reset();
    },

    /* 경과 초 (일시정지 제외) */
    elapsed: function () {
      if (!this.running) return 0;
      var now = this.paused ? this.pausedAt : performance.now();
      return (now - this.started - this.pausedTotal) / 1000;
    },

    remaining: function () {
      return Math.max(0, S.TOTAL_SECONDS - this.elapsed());
    },

    /* mm:ss */
    clock: function () {
      var r = Math.ceil(this.remaining());
      var m = Math.floor(r / 60), s = r % 60;
      return m + ':' + (s < 10 ? '0' : '') + s;
    },

    togglePause: function () {
      if (this.paused) {
        this.pausedTotal += performance.now() - this.pausedAt;
        this.paused = false;
      } else {
        this.pausedAt = performance.now();
        this.paused = true;
      }
      return this.paused;
    },

    learn: function (partId) {
      if (!this.dex[partId]) {
        this.dex[partId] = true;
        return true;   // 새로 등록됨
      }
      return false;
    },

    dexCount: function () { return Object.keys(this.dex).length; },

    /* 최종 랭크 */
    rank: function () {
      var total = this.quizOk + this.quizNg;
      var acc = total ? this.quizOk / total : 0;
      var t = this.elapsed();
      var onTime = t <= S.TOTAL_SECONDS;
      if (acc >= 0.9 && onTime) return 'S';
      if (acc >= 0.75) return 'A';
      if (acc >= 0.5) return 'B';
      return 'C';
    }
  };
})(SPIKE);
