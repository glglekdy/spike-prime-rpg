/* ============================================================
 *  SPIKE.Mission — MAP2 조립 가이드 진행 (DESIGN.md §7-7)
 *
 *  판정하지 않는다. 페이지 인덱스만 관리한다.
 *  텍스트는 전부 JSON 에서 온다 (S.pageText / S.T / S.D).
 *    · steps        dialogue.js 의 S.Quest 가 goal 을 읽어간다
 *    · reset()      state.js 가 부른다 (순환형 초기화)
 *    · talk(fd)     장인에게 말 걸었을 때
 *    · next()/prev() 페이지 이동
 * ============================================================ */
(function (S) {
  'use strict';

  function maker() { return S.D('names.maker', '로봇 장인'); }

  var Mission = S.Mission = {

    steps: [],       // dialogue.js 가 steps[missionStep] 로 접근한다

    pageT: 0,        // 현재 페이지 진입 후 경과 초 (조립도 애니메이션용)
    lateSaid: false, // 이 페이지에서 재촉 대사를 이미 했는가
    toast: '',
    toastT: 0,
    busy: false,     // 퀴즈 전환 중 — 입력 차단

    reset: function () {
      this.steps = S.GUIDE_PAGES || [];
      S.State.missionStep = 0;
      this.pageT = 0;
      this.lateSaid = false;
      this.toast = '';
      this.toastT = 0;
      this.busy = false;
    },

    page: function () {
      if (!this.steps.length) this.steps = S.GUIDE_PAGES || [];
      return this.steps[S.State.missionStep] || null;
    },

    /* ------------------------------------------------------------
     *  실습은 장인에게 말을 걸어야 시작된다.
     *  그 전까지 패널은 안내만 띄우고 페이지 넘김도 받지 않는다
     *  (예전에는 방에 들어서자마자 1페이지가 펼쳐져 있었다).
     * ---------------------------------------------------------- */
    started: function () { return !!S.State.flags.missionStarted; },

    start: function (fd) {
      if (this.started()) return false;
      S.State.flags.missionStarted = true;
      if (!this.steps.length) this.steps = S.GUIDE_PAGES || [];
      S.State.missionStep = 0;
      this.pageT = 0;
      this.lateSaid = false;
      S.Audio.se('page');
      this._learn();                      // 첫 페이지 부품을 도감에 올린다
      if (fd) {
        var who = maker();
        fd.say(S.DL('workshop.maker.start').map(function (t) {
          return { name: who, text: t };
        }));
      }
      return true;
    },

    /* 현재 페이지의 퀘스트 문구 (좌측 상단 HUD) */
    goal: function () {
      if (!this.started()) return S.T('quest.maker', '로봇 장인에게 말을 걸자');
      var p = this.page();
      return p ? S.pageText.goal(p) : S.T('quest.maker', '로봇 장인에게 말을 걸자');
    },

    index: function () { return S.State.missionStep; },
    count: function () { return this.steps.length || (S.GUIDE_PAGES || []).length; },
    isFirst: function () { return S.State.missionStep <= 0; },
    isLast: function () { return S.State.missionStep >= this.count() - 1; },
    isDone: function () { return !!S.State.flags.missionDone; },

    update: function (dt) {
      this.pageT += dt;
      if (this.toastT > 0) this.toastT -= dt;
    },

    /* ---------------- 페이지 이동 ---------------- */

    _go: function (i) {
      var n = this.count();
      i = Math.max(0, Math.min(n - 1, i));
      if (i === S.State.missionStep) return;
      S.State.missionStep = i;
      this.pageT = 0;
      this.lateSaid = false;
      S.Audio.se('page');
      this._learn();
    },

    /* 페이지를 지나갈 때 도감 자동 등록 */
    _learn: function () {
      var p = this.page();
      if (!p || !p.learn) return;
      for (var i = 0; i < p.learn.length; i++) S.State.learn(p.learn[i]);
    },

    prev: function () {
      if (this.busy || this.isFirst()) return false;
      this._go(S.State.missionStep - 1);
      return true;
    },

    /* 다음 페이지. fd = 필드 씬 (메시지 윈도우 주인) */
    next: function (fd) {
      if (this.busy) return false;
      var p = this.page();
      if (!p) return false;

      if (this.isLast()) return this._finish(fd);

      // 페이지를 떠날 때의 특수 처리
      if (p.onLeave === 'quiz:mission' && !S.State.flags.missionQuizDone) {
        this._quiz();
        return true;
      }

      this._advance();
      return true;
    },

    _advance: function () {
      var from = this.page();
      this._go(S.State.missionStep + 1);
      if (from && from.toast) this.showToast(S.T(from.toast, ''));
    },

    /* 케이블 페이지 → 확인 퀴즈 2문제 (기존 battle 씬 재사용, 추가 구현 0) */
    _quiz: function () {
      var self = this;
      this.busy = true;
      S.Game.transition('battle', {
        enemy: 'e_cable',
        enemyName: S.D('workshop.quizEnemyName', '꼬인 케이블'),
        bgm: 'battle',
        quizSet: 'mission',
        back: { map: 'workshop', at: { x: 6, y: 5, dir: 'up' } },
        onWin: function () {
          S.State.flags.missionQuizDone = true;
          self.busy = false;
          self._go(S.State.missionStep + 1);
        }
      });
    },

    /* 마지막 페이지에서 완료 */
    _finish: function (fd) {
      var who = maker();
      if (S.State.flags.missionDone) {
        if (fd) fd.say({ name: who, text: S.D('workshop.maker.afterDone', '') });
        return false;
      }
      S.State.flags.missionDone = true;
      S.State.chapter = 3;
      S.Audio.se('fanfare');
      this.showToast(S.T('guide.finishToast', ''));
      if (fd) {
        var lines = S.DL('workshop.maker.finish');
        fd.say(lines.map(function (line) { return { name: who, text: line }; }));
      }
      return true;
    },

    showToast: function (msg) {
      if (!msg) return;
      this.toast = msg;
      this.toastT = 1.2;
    },

    /* ---------------- 장인 대화 ---------------- */

    talk: function (fd) {
      var p = this.page(), who = maker();
      if (S.State.flags.missionDone) {
        fd.say({ name: who, text: S.D('workshop.maker.afterDone', '') });
        return;
      }
      if (!p) { fd.say({ name: who, text: '…' }); return; }
      fd.say({ name: who, text: S.pageText.maker(p) });
    },

    /* 예산 초과 시 재촉 (페이지당 1회) */
    checkLate: function (fd) {
      var p = this.page();
      if (!p || this.lateSaid) return;
      if (this.pageT < p.budget + 20) return;
      this.lateSaid = true;
      var line = S.pageText.late(p);
      if (line && fd && !fd.mw.active) fd.say({ name: maker(), text: line });
    }
  };

  Mission.steps = S.GUIDE_PAGES || [];
})(SPIKE);
