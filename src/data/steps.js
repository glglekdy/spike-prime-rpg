/* ============================================================
 *  SPIKE.GUIDE_PAGES — MAP2 조립 가이드 6페이지 구조 (DESIGN.md §7)
 *
 *  ⚠ 텍스트는 여기 없다.  content/ui.ko.json 의 guide.*  (제목·본문·주의)
 *                        content/dialogue.ko.json 의 workshop.maker / workshop.late (대사)
 *  이 파일은 "순서·예산·조립도·도감등록" 같은 구조만 갖는다.
 *
 *  텍스트는 그릴 때마다 조회하므로, JSON 을 런타임에 교체하면 즉시 반영된다.
 * ============================================================ */
(function (S) {
  'use strict';

  S.GUIDE_PAGES = [
    { id: 'find',  budget: 40,  diagram: 'd_parts',
      learn: ['hub', 'motorM', 'cable', 'beam', 'connector', 'pinBlack', 'flag'] },

    { id: 'motor', budget: 50,  diagram: 'd_motor',
      learn: ['connector', 'motorM'] },

    { id: 'beam',  budget: 60,  diagram: 'd_beam',
      learn: ['beam', 'pinBlack'] },

    { id: 'flag',  budget: 40,  diagram: 'd_flag',
      learn: ['flag'], toast: 'guide.flag.toast' },

    { id: 'cable', budget: 40,  diagram: 'd_cable',
      learn: ['cable', 'hub'], onLeave: 'quiz:mission' },

    { id: 'code',  budget: 100, diagram: 'd_code',
      learn: [], full: true, last: true }
  ];

  /* ------------------------------------------------------------
   *  페이지 텍스트 조회 — 전부 JSON 을 본다.
   *  p.id 가 곧 JSON 의 키다 (guide.find.title 등).
   * ---------------------------------------------------------- */
  S.pageText = {
    title: function (p) { return S.T('guide.' + p.id + '.title', p.id); },
    goal:  function (p) { return S.T('guide.' + p.id + '.goal', ''); },
    body:  function (p) { return S.TL('guide.' + p.id + '.body'); },
    warn:  function (p) { return S.T('guide.' + p.id + '.warn', ''); },
    /* 장인 대사와 재촉은 대사 JSON 쪽 */
    maker: function (p) { return S.D('workshop.maker.' + p.id, ''); },
    late:  function (p) { return S.D('workshop.late.' + p.id, ''); },
    /* 조립도 안의 라벨 */
    label: function (p, k, fb) { return S.T('guide.' + p.id + '.' + k, fb); }
  };
})(SPIKE);
