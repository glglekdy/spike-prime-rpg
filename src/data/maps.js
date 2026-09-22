/* ============================================================
 *  SPIKE.MAPS — 맵 데이터 (24 x 18 타일 = 384 x 288, 정확히 한 화면)
 *
 *  ground 문자
 *    g 잔디  G 꽃잔디  p 흙길  w 나무바닥  s 돌바닥  d 어두운바닥  c 카펫
 *    T 나무(막힘)  W 벽(막힘)  V 벽윗면(막힘)  D 출구
 * ============================================================ */
(function (S) {
  'use strict';

  var TERRAIN = {
    g: 't_grass', G: 't_grass2', p: 't_path', w: 't_wood',
    s: 't_stone', d: 't_dark', c: 't_carpet',
    T: 't_grass', W: 't_wall', V: 't_walltop', D: 't_path'
  };
  var SOLID = 'TWV';

  S.TERRAIN = TERRAIN;
  S.SOLID_CHARS = SOLID;

  S.MAPS = {

    /* ============ MAP 1 : 허브 마을 ============ */
    village: {
      name: '허브 마을',
      bgm: 'village',
      start: { x: 11, y: 15, dir: 'up' },
      ground: [
        'TTTTTTTTTTTTTTTTTTTTTTTT',
        'TggggggggggggggggggggggT',
        'TgGgggggggggggggggggGggT',
        'TggggggggggggggggggggggT',
        'TggggggggggggggggggggggT',
        'TgppppppppppppppppppppgT',
        'TgpggggggggggggggggggpgT',
        'TgpggggggggggggggggggpgT',
        'TgpggggggggggggggggggpgT',
        'TgppppppppppppppppppppgT',
        'TggggggggggpggggggggggGT',
        'TgGgggggggGpgggggggggggT',
        'TggggggggggpggggggggggGT',
        'TggggggggggpggggggggggGT',
        'TggggggggggpggggggggggGT',
        'TggggggggggpggggggggggGT',
        'TggggggggggpggggggggggGT',
        'TTTTTTTTTTTDTTTTTTTTTTTT'
      ],
      objects: [
        { sprite: 'o_altar',     tx: 11, ty: 3,  solid: [[11,2],[12,2],[11,3],[12,3]], id: 'altar' },
        { sprite: 'o_shelf',     tx: 4,  ty: 6,  solid: [[4,6]], id: 'shelf' },
        { sprite: 'o_workbench', tx: 15, ty: 6,  solid: [[15,6],[16,6]], id: 'desk' },
        { sprite: 'o_sign',      tx: 9,  ty: 10, solid: [[9,10]], id: 'sign' },
        { sprite: 'o_tree',      tx: 3,  ty: 12, solid: [[3,12]], id: 'tree' },
        { sprite: 'o_tree',      tx: 19, ty: 12, solid: [[19,12]], id: 'tree' },
        { sprite: 'o_tree',      tx: 6,  ty: 3,  solid: [[6,3]], id: 'tree' },
        { sprite: 'o_tree',      tx: 17, ty: 3,  solid: [[17,3]], id: 'tree' },
        { sprite: 'o_bush',      tx: 8,  ty: 14, solid: [[8,14]], id: 'bush' },
        { sprite: 'o_bush',      tx: 14, ty: 14, solid: [[14,14]], id: 'bush' },
        { sprite: 'o_fence',     tx: 5,  ty: 16, solid: [[5,16]], id: 'fence' },
        { sprite: 'o_fence',     tx: 18, ty: 16, solid: [[18,16]], id: 'fence' }
      ],
      npcs: [
        { id: 'gran',  char: 'gran',  tx: 5,  ty: 7, dir: 'down',  name: '도감 할머니', mark: true },
        { id: 'smith', char: 'smith', tx: 15, ty: 7, dir: 'down',  name: '대장장이',   mark: true },
        /* 문 바로 앞칸. 예전엔 (11,12) 라 문(11,17)과 5칸이나 떨어져 있었고,
           플레이어 시작 지점(11,15)이 그 사이라 길을 막지 못했다.
           이기면 dialogue.js 의 onWin 이 (10,16) 으로 비켜 준다. */
        { id: 'guard', char: 'guard', tx: 11, ty: 16, dir: 'up',   name: '문지기',     mark: true }
      ],
      exits: [
        { tx: 11, ty: 17, to: 'workshop', need: 'gatePassed',
          denyKey: 'exits.gate' }
      ]
    },

    /* ============ MAP 2 : 조립 공방 ============ */
    workshop: {
      name: '조립 공방',
      bgm: 'workshop',
      split: true,                   // 우측 실습 패널이 붙는 맵
      start: { x: 5, y: 13, dir: 'up' },
      ground: [
        'VVVVVVVVVVVVVVVVVVVVVVVV',
        'WWWWWWDWWWWWWWWWWWWWWWWW',
        'WwwwwwwwwwwwWWWWWWWWWWWW',
        'WwwwwwwwwwwwWWWWWWWWWWWW',
        'WwwccccccwwwWWWWWWWWWWWW',
        'WwwccccccwwwWWWWWWWWWWWW',
        'WwwccccccwwwWWWWWWWWWWWW',
        'WwwwwwwwwwwwWWWWWWWWWWWW',
        'WwwwwwwwwwwwWWWWWWWWWWWW',
        'WwwwwwwwwwwwWWWWWWWWWWWW',
        'WwwwwwwwwwwwWWWWWWWWWWWW',
        'WwwwwwwwwwwwWWWWWWWWWWWW',
        'WwwwwwwwwwwwWWWWWWWWWWWW',
        'WwwwwwwwwwwwWWWWWWWWWWWW',
        'WwwwwwwwwwwwWWWWWWWWWWWW',
        'WwwwwwwwwwwwWWWWWWWWWWWW',
        'WwwwwDwwwwwwWWWWWWWWWWWW',
        'WWWWWWWWWWWWWWWWWWWWWWWW'
      ],
      objects: [
        { sprite: 'o_workbench', tx: 3, ty: 3,  solid: [[3,3],[4,3]], id: 'bench' },
        { sprite: 'o_shelf',     tx: 1, ty: 2,  solid: [[1,2]], id: 'shelf' },
        { sprite: 'o_crate',     tx: 9, ty: 2,  solid: [[9,2]], id: 'crate' },
        { sprite: 'o_crate',     tx: 10, ty: 3, solid: [[10,3]], id: 'crate' },
        { sprite: 'o_torch',     tx: 1, ty: 8,  solid: [[1,8]], id: 'torch' },
        { sprite: 'o_torch',     tx: 10, ty: 8, solid: [[10,8]], id: 'torch' }
      ],
      npcs: [
        { id: 'maker', char: 'maker', tx: 6, ty: 4, dir: 'down', name: '로봇 장인', mark: true }
      ],
      exits: [
        { tx: 5, ty: 16, to: 'village' },
        { tx: 6, ty: 1, to: 'hubroom', need: 'missionDone',
          denyKey: 'exits.mission' }
      ]
    },

    /* ============ MAP 3 : 해체의 방 ============ */
    hubroom: {
      name: '허브의 방',
      bgm: 'boss',
      start: { x: 11, y: 15, dir: 'up' },
      ground: [
        'VVVVVVVVVVVVVVVVVVVVVVVV',
        'WWWWWWWWWWWWWWWWWWWWWWWW',
        'WddddddddddddddddddddddW',
        'WddddddddddddddddddddddW',
        'WdddddddddccccddddddddoW',
        'WdddddddddccccddddddddoW',
        'WddddddddddddddddddddddW',
        'WdddWdddddddddddddWddddW',
        'WdddWdddddddddddddWddddW',
        'WddddddddddddddddddddddW',
        'WddddddddddddddddddddddW',
        'WdddWdddddddddddddWddddW',
        'WdddWdddddddddddddWddddW',
        'WddddddddddddddddddddddW',
        'WddddddddddddddddddddddW',
        'WddddddddddddddddddddddW',
        'WddddddDdddddddddddddddW',
        'WWWWWWWWWWWWWWWWWWWWWWWW'
      ],
      objects: [
        { sprite: 'o_altar', tx: 11, ty: 5, solid: [[11,4],[12,4],[11,5],[12,5]], id: 'altar' },
        /* 해체 보스 — 제단으로 가는 길 한가운데를 막고 있다 (64x56 = 4x3.5칸).
           부딪히거나(bump) 말을 걸면 보스전이 시작되고, 쓰러뜨리면 hidden 이 서서
           사라진다. 시작 지점 (11,15) 에서 위로 걸어오면 (11,11) 에서 막힌다. */
        { sprite: 'e_cable', tx: 10, ty: 10, id: 'boss', bump: true,
          solid: [[10,9],[11,9],[12,9],[13,9],[10,10],[11,10],[12,10],[13,10]] },
        { sprite: 'o_torch', tx: 3,  ty: 7,  solid: [[3,7]],   id: 'torch' },
        { sprite: 'o_torch', tx: 19, ty: 7,  solid: [[19,7]],  id: 'torch' },
        { sprite: 'o_torch', tx: 3,  ty: 11, solid: [[3,11]],  id: 'torch' },
        { sprite: 'o_torch', tx: 19, ty: 11, solid: [[19,11]], id: 'torch' }
      ],
      npcs: [],
      exits: [
        { tx: 7, ty: 16, to: 'workshop' }
      ]
    }
  };

  /* 'o'는 어두운 바닥의 오타 방지용 별칭 */
  TERRAIN.o = 't_dark';

  /* ------------------------------------------------------------
   *  맵은 플레이 중 변형된다 (NPC가 비켜서기, 오브젝트 숨기기 등).
   *  순환형이므로 다음 학생을 위해 원상복구할 수 있어야 한다.
   * ---------------------------------------------------------- */
  var SNAP = {};
  (function snapshot() {
    for (var id in S.MAPS) {
      var m = S.MAPS[id];
      SNAP[id] = {
        npcs: (m.npcs || []).map(function (n) {
          return { tx: n.tx, ty: n.ty, dir: n.dir, hidden: !!n.hidden };
        }),
        objects: (m.objects || []).map(function (o) { return { hidden: !!o.hidden }; })
      };
    }
  })();

  S.resetMaps = function () {
    for (var id in S.MAPS) {
      var m = S.MAPS[id], s = SNAP[id];
      if (!s) continue;
      for (var i = 0; i < (m.npcs || []).length; i++) {
        var n = m.npcs[i], sn = s.npcs[i];
        if (!sn) continue;
        n.tx = sn.tx; n.ty = sn.ty; n.dir = sn.dir; n.hidden = sn.hidden;
      }
      for (var j = 0; j < (m.objects || []).length; j++) {
        if (s.objects[j]) m.objects[j].hidden = s.objects[j].hidden;
      }
    }
  };

  S.npc = function (mapId, npcId) {
    var list = (S.MAPS[mapId] || {}).npcs || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === npcId) return list[i];
    return null;
  };

  S.obj = function (mapId, objId) {
    var list = (S.MAPS[mapId] || {}).objects || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === objId) return list[i];
    return null;
  };
})(SPIKE);
