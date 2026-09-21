/* ============================================================
 *  SPIKE.CODE_GUIDE — 주문서(코드 가이드) 구조 (DESIGN.md §8)
 *
 *  보여주기 전용이다. 퍼즐도 판정도 없다.
 *  ⚠ 블록 문장과 「앱에서 찾는 법」 텍스트는 content/ui.ko.json 의 code.* 에 있다.
 *  여기에는 블록의 색 분류와 배치 구조만 둔다.
 * ============================================================ */
(function (S) {
  'use strict';

  S.CODE_GUIDE = {
    /* textKey 는 ui.json 의 code.blocks.* 를 가리킨다 */
    lines: [
      { cat: 'event', indent: 0, textKey: 'start' },
      { cat: 'ctrl',  indent: 0, textKey: 'repeat', wrap: true },
      { cat: 'motor', indent: 1, textKey: 'cw' },
      { cat: 'motor', indent: 1, textKey: 'ccw' }
    ],

    /* 실행 순서 애니메이션에서 반복으로 취급할 줄 (0-based) */
    loopFrom: 2,
    loopTo: 3,
    loopCount: 4,

    lineText: function (L) { return S.T('code.blocks.' + L.textKey, L.textKey); },

    /* 앱에서 찾는 법 — 항목 자체를 JSON 이 정한다 (개수도 자유) */
    findIt: function () {
      var v = S.T('code.findIt', null);
      return Array.isArray(v) ? v : [];
    }
  };

  /* 카테고리 색 조회 (const.js 의 BLOCK_CATS) */
  S.blockColor = function (cat) {
    for (var i = 0; i < S.BLOCK_CATS.length; i++) {
      if (S.BLOCK_CATS[i].id === cat) return S.BLOCK_CATS[i].color;
    }
    return '#888888';
  };
})(SPIKE);
