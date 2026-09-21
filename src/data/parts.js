/* ============================================================
 *  SPIKE.PARTS — 부품 도감 (게임 내장 매뉴얼)
 *
 *  ⚠ 글자는 여기 없다. content/parts.<언어>.json 의 items.<id> 에 있다.
 *    이 파일은 순서·아이콘·분류만 갖는다.
 *
 *  언어를 바꾸면 S.rebuildParts() 가 배열 내용을 갈아끼운다.
 *  배열 자체는 그대로 두고 안을 비웠다 채운다 — 다른 코드가
 *  S.PARTS 를 붙들고 있어도 끊기지 않게.
 * ============================================================ */
(function (S) {
  'use strict';

  /* 도감에 나오는 순서 그대로 */
  var ORDER = [
    { id: 'hub',       icon: 'p_hub',       group: 'core' },
    { id: 'motorL',    icon: 'p_motor_l',   group: 'core' },
    { id: 'motorM',    icon: 'p_motor_m',   group: 'core' },
    { id: 'color',     icon: 'p_color',     group: 'core' },
    { id: 'dist',      icon: 'p_dist',      group: 'core' },
    { id: 'force',     icon: 'p_force',     group: 'core' },
    { id: 'cable',     icon: 'p_cable',     group: 'tech' },
    { id: 'beam',      icon: 'p_beam',      group: 'tech' },
    { id: 'pinBlack',  icon: 'p_pin_black', group: 'tech' },
    { id: 'pinGray',   icon: 'p_pin_gray',  group: 'tech' },
    { id: 'connector', icon: 'p_connector', group: 'tech' },
    { id: 'axle',      icon: 'p_axle',      group: 'tech' },
    { id: 'bush',      icon: 'p_bush',      group: 'tech' },
    { id: 'separator', icon: 'p_separator', group: 'tech' },
    { id: 'flag',      icon: 'p_flag',      group: 'tech' }
  ];

  S.PART_ORDER = ORDER;
  S.PARTS = [];

  S.rebuildParts = function () {
    S.PARTS.length = 0;
    for (var i = 0; i < ORDER.length; i++) {
      var o = ORDER[i];
      var txt = S.Text ? S.Text.get('parts', 'items.' + o.id, null) : null;
      txt = txt || {};
      S.PARTS.push({
        id: o.id, icon: o.icon, group: o.group,
        title: txt.title || o.id,
        real:  txt.real  || '',
        one:   txt.one   || '',
        lines: Array.isArray(txt.lines) ? txt.lines : [],
        tip:   txt.tip   || ''
      });
    }
    return S.PARTS;
  };

  S.partById = function (id) {
    for (var i = 0; i < S.PARTS.length; i++) if (S.PARTS[i].id === id) return S.PARTS[i];
    return null;
  };

  S.rebuildParts();   // JSON 이 아직 없으면 빈 껍데기 — boot 후 다시 불린다
})(SPIKE);
