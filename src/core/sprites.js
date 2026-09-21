/* ============================================================
 *  SPIKE.Sprites — 문자열 픽셀맵 → 캔버스 스프라이트
 *
 *  define(id, palette, rows)
 *    palette: { '문자': '#rrggbb' | null }  ('.'은 항상 투명)
 *    rows   : 문자열 배열. 길이가 어긋나면 자동으로 맞춘다.
 * ============================================================ */
(function (S) {
  'use strict';

  var Sprites = S.Sprites = {
    defs: {},
    cache: {},

    init: function () { /* 지연 생성이므로 할 일 없음 */ },

    define: function (id, pal, rows) {
      this.defs[id] = { pal: pal, rows: rows };
      delete this.cache[id];
      return this;
    },

    has: function (id) { return !!(this.cache[id] || this.defs[id]); },

    get: function (id) {
      if (this.cache[id]) return this.cache[id];
      var d = this.defs[id];
      if (!d) return null;
      var cv = this._build(d.pal, d.rows);
      this.cache[id] = cv;
      return cv;
    },

    _build: function (pal, rows) {
      var h = rows.length;
      var w = 0, i;
      for (i = 0; i < h; i++) if (rows[i].length > w) w = rows[i].length;

      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      var ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      for (var y = 0; y < h; y++) {
        var row = rows[y];
        for (var x = 0; x < row.length; x++) {
          var ch = row[x];
          if (ch === '.' || ch === ' ') continue;
          var col = pal[ch];
          if (!col) continue;
          ctx.fillStyle = col;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      return cv;
    },

    /* 행 일부를 좌우로 민 복사본 (걷기 프레임 생성용) */
    shiftRows: function (rows, from, to, dx) {
      var out = rows.slice();
      for (var y = from; y <= to && y < rows.length; y++) {
        var r = rows[y];
        if (dx > 0) out[y] = '.'.repeat(dx) + r.slice(0, r.length - dx);
        else if (dx < 0) out[y] = r.slice(-dx) + '.'.repeat(-dx);
      }
      return out;
    }
  };

  /* ========================================================
   *  캐릭터 템플릿 (16 x 24)
   *  토큰: k외곽 h머리 H머리하이라이트 s피부 S피부그늘 e눈 m입
   *        c옷 C옷그늘 o포인트 b신발
   * ======================================================== */

  var BODY_DOWN = [
    '................',
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '...khhhhhhhhk...',
    '...khhhhhhhhk...',
    '...kssssssssk...',
    '...kssssssssk...',
    '...ksesssseskk..',
    '...kssssssssk...',
    '...ksssmmsssk...',
    '...kssssssssk...',
    '....kssssssk....',
    '.....kkkkkk.....',
    '..kkcccccccckk..',
    '..kcoccccccock..',
    '..kcoccccccock..',
    '..ksccccccccsk..',
    '..kscCCCCCCcsk..',
    '...kCCCCCCCCk...',
    '...kCCC..CCCk...',
    '...kbbk..kbbk...',
    '...kbbk..kbbk...',
    '...kbbk..kbbk...',
    '...kkkk..kkkk...'
  ];

  var BODY_UP = [
    '................',
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '...khhhhhhhhk...',
    '...khhhhhhhhk...',
    '...khhhhhhhhk...',
    '...khhhhhhhhk...',
    '...khhhhhhhhk...',
    '...khhhhhhhhk...',
    '...khhhhhhhhk...',
    '...khhhhhhhhk...',
    '....khhhhhhk....',
    '.....kkkkkk.....',
    '..kkcccccccckk..',
    '..kcccccccccck..',
    '..kcccccccccck..',
    '..ksccccccccsk..',
    '..kscCCCCCCcsk..',
    '...kCCCCCCCCk...',
    '...kCCC..CCCk...',
    '...kbbk..kbbk...',
    '...kbbk..kbbk...',
    '...kbbk..kbbk...',
    '...kkkk..kkkk...'
  ];

  var BODY_SIDE = [
    '................',
    '....kkkkkk......',
    '...khhhhhhk.....',
    '..khhhhhhhhk....',
    '..khhhhhhhhk....',
    '..khhhsssssk....',
    '..khsssssssk....',
    '..khssesssk.....',
    '..khsssssssk....',
    '..khsssmsssk....',
    '..khsssssssk....',
    '...khsssssk.....',
    '....kkkkkk......',
    '...kkcccckk.....',
    '..kcocccccck....',
    '..kcocccccsk....',
    '..kccccccck.....',
    '..kcCCCCCck.....',
    '...kCCCCCk......',
    '...kCCCCCk......',
    '...kbbkbbk......',
    '...kbbkbbk......',
    '...kbbkbbk......',
    '...kkkkkkk......'
  ];

  /* 머리 위 액세서리 (고글/모자 등). 본체 위에 덧그린다. */
  var ACC = {
    goggles_down: [
      '', '', '', '',
      '...kGGGGGGGGk...',
      '...kGggkkggGk...',
      '', '', '', '', '', '', ''
    ],
    goggles_side: [
      '', '', '', '',
      '..kGGGGGGGGk....',
      '..kGgggkkGk.....',
      '', '', '', '', '', '', ''
    ],
    hat_down: [
      '',
      '....kkkkkkkk....',
      '...kHHHHHHHHk...',
      '..kkkkkkkkkkkk..',
      '', '', '', '', '', '', '', '', ''
    ]
  };

  function merge(base, overlay) {
    if (!overlay) return base;
    var out = base.slice();
    for (var y = 0; y < overlay.length && y < out.length; y++) {
      var o = overlay[y];
      if (!o) continue;
      var b = out[y].split('');
      for (var x = 0; x < o.length && x < b.length; x++) {
        if (o[x] !== '.' && o[x] !== ' ') b[x] = o[x];
      }
      out[y] = b.join('');
    }
    return out;
  }

  /* 캐릭터 1명분(4방향 × 3프레임) 등록 */
  Sprites.defineChar = function (id, pal, accDown, accSide) {
    var LEG_TOP = 19, LEG_BOT = 23;
    var sets = {
      down: merge(BODY_DOWN, accDown ? ACC[accDown] : null),
      up:   BODY_UP,
      side: merge(BODY_SIDE, accSide ? ACC[accSide] : null)
    };
    for (var dir in sets) {
      var rows = sets[dir];
      this.define(id + '_' + dir + '_0', pal, rows);
      this.define(id + '_' + dir + '_1', pal, this.shiftRows(rows, LEG_TOP, LEG_BOT, 1));
      this.define(id + '_' + dir + '_2', pal, this.shiftRows(rows, LEG_TOP, LEG_BOT, -1));
    }
    return this;
  };

  /* 방향+프레임 → 스프라이트 id (좌향은 우향을 뒤집어 쓴다) */
  Sprites.charSprite = function (id, dir, frame) {
    var d = (dir === 'left' || dir === 'right') ? 'side' : dir;
    return { id: id + '_' + d + '_' + frame, flip: dir === 'left' };
  };

  /* ========================================================
   *  등장인물 팔레트
   * ======================================================== */
  var K = '#1a1a24';

  // 주인공 — 견습 메카닉 (파란 작업복 + 고글)
  Sprites.defineChar('hero', {
    k: K, h: '#7a4a28', H: '#9a6238', s: '#f2c79a', S: '#d6a274',
    e: '#20202c', m: '#b8705a',
    c: '#3f7cc4', C: '#2c5a92', o: '#ff9f43', b: '#4a3524',
    g: '#8fe3ff', G: '#c8ccd6'
  }, 'goggles_down', 'goggles_side');

  // 도감 할머니 — 부품 학자
  Sprites.defineChar('gran', {
    k: K, h: '#e8e8f0', H: '#ffffff', s: '#f0c79c', S: '#d4a478',
    e: '#20202c', m: '#b8705a',
    c: '#8e63c4', C: '#6a4795', o: '#ffd966', b: '#4a3a4a'
  });

  // 대장장이 — 테크닉 부품 장인
  Sprites.defineChar('smith', {
    k: K, h: '#3a2a1a', H: '#55402a', s: '#e0a878', S: '#c08a5c',
    e: '#20202c', m: '#a05a48',
    c: '#b03f3f', C: '#822c2c', o: '#7a5a3a', b: '#3a2a1a'
  });

  // 문지기 — 마을 입구 퀴즈
  Sprites.defineChar('guard', {
    k: K, h: '#4a4a58', H: '#6a6a78', s: '#eebf92', S: '#cc9f72',
    e: '#20202c', m: '#a05a48',
    c: '#8c98ac', C: '#67728a', o: '#ffd966', b: '#3a3a48'
  });

  // 로봇 장인 — 조립 공방 안내
  Sprites.defineChar('maker', {
    k: K, h: '#2a2a34', H: '#44444f', s: '#f0c79c', S: '#d4a478',
    e: '#20202c', m: '#b8705a',
    c: '#ff8c3a', C: '#cc6a22', o: '#3f7cc4', b: '#3a3a44',
    g: '#8fe3ff', G: '#c8ccd6'
  }, 'goggles_down', 'goggles_side');
})(SPIKE);
