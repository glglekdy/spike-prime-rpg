/* ============================================================
 *  SPIKE.QUIZ — 퀴즈 배틀 문제 풀
 *
 *  ⚠ 문제·보기·해설은 여기 없다. content/quiz.<언어>.json 에 있다.
 *    이 파일은 세트 구성과 문제별 아이콘만 갖는다.
 *
 *  JSON 의 choices 는 **첫 번째가 정답**이다.
 *  게임이 출제할 때 S.shuffleQuiz 로 보기를 섞으므로 순서는 티나지 않는다.
 *  이렇게 하면 번역할 때 정답 번호를 따로 맞출 일이 없다.
 * ============================================================ */
(function (S) {
  'use strict';

  /* 세트별 아이콘 (문제 순서대로) */
  var ICONS = {
    gate:    ['p_hub', 'p_pin_black', 'p_dist'],
    mission: ['p_cable', 'p_hub'],
    boss:    ['p_cable', 'p_cable', 'p_separator', 'p_beam']
  };

  S.QUIZ = {};

  S.rebuildQuiz = function () {
    for (var k in S.QUIZ) delete S.QUIZ[k];
    Object.keys(ICONS).forEach(function (set) {
      var rows = S.Text ? S.Text.get('quiz', 'sets.' + set, null) : null;
      S.QUIZ[set] = (Array.isArray(rows) ? rows : []).map(function (row, i) {
        return {
          q: row.q || '',
          icon: ICONS[set][i] || ICONS[set][0],
          choices: Array.isArray(row.choices) ? row.choices.slice() : [],
          ans: 0,                       // JSON 은 정답을 맨 앞에 둔다
          why: row.why || '',
          act: row.act
        };
      });
    });
    return S.QUIZ;
  };

  /* ------------------------------------------------------------
   *  세트별 출제 수 (5분판).
   *
   *  문제 풀(quiz.<언어>.json)은 9문제 그대로 두고, 몇 개를 낼지만 줄인다.
   *  10분판으로 되돌리려면 이 표를 3 / 2 / 4 로 올리고
   *  state.js 의 hp/maxHp 를 5 로 되돌리면 된다 (§10-1).
   *
   *  보스는 줄이지 않는다 — 4문제가 곧 실물 해체 4단계라, 하나라도 빠지면
   *  트레이 정리까지 가지 못한다 (DESIGN.md §9-1).
   * ---------------------------------------------------------- */
  S.ASK = { gate: 2, mission: 1, boss: 4 };

  /* 실제로 출제할 목록. 풀보다 적게 낼 때는 매번 다른 문제가 나온다
     (부스에서 같은 학생이 두 번 앉기도 한다). 보스만 순서를 지킨다. */
  S.pickQuiz = function (setName) {
    var pool = S.QUIZ[setName] || S.QUIZ.gate || [];
    var n = S.ASK[setName];
    if (!n || n >= pool.length) return pool.slice();
    if (setName === 'boss') return pool.slice(0, n);   // 해체 순서 고정

    var idx = pool.map(function (_, i) { return i; });
    for (var i = idx.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    return idx.slice(0, n)
      .sort(function (a, b) { return a - b; })       // 고른 뒤 원래 순서로
      .map(function (i) { return pool[i]; });
  };

  /* 보기 섞기 (정답 공유 방지). 정답 인덱스를 다시 계산해 돌려준다. */
  S.shuffleQuiz = function (q) {
    var pairs = q.choices.map(function (c, i) { return { c: c, ok: i === q.ans }; });
    for (var i = pairs.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pairs[i]; pairs[i] = pairs[j]; pairs[j] = t;
    }
    var ans = 0;
    for (var k = 0; k < pairs.length; k++) if (pairs[k].ok) ans = k;
    return {
      q: q.q, icon: q.icon, why: q.why, act: q.act,
      choices: pairs.map(function (p) { return p.c; }),
      ans: ans
    };
  };

  S.rebuildQuiz();
})(SPIKE);
