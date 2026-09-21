/* ============================================================
 *  SPIKE 타일 & 오브젝트 아트
 *  - defineNoise : 잔디/바닥 같은 질감 타일을 시드 난수로 생성
 *  - defineDraw  : 큰 오브젝트를 그리기 함수로 정의 후 1회 캐시
 * ============================================================ */
(function (S) {
  'use strict';
  var Sp = S.Sprites;

  /* 결정적 난수 (같은 시드 → 항상 같은 무늬) */
  function prng(seed) {
    var s = seed | 0;
    return function () { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 8) & 0xffff) / 0x10000; };
  }

  Sp.defineDraw = function (id, w, h, fn) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    fn(ctx, w, h);
    this.cache[id] = cv;
    return this;
  };

  Sp.defineNoise = function (id, base, spots, density, seed, size) {
    var n = size || 16;
    return this.defineDraw(id, n, n, function (ctx) {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, n, n);
      var r = prng(seed || 7);
      var count = Math.floor(n * n * (density || 0.12));
      for (var i = 0; i < count; i++) {
        var x = Math.floor(r() * n), y = Math.floor(r() * n);
        ctx.fillStyle = spots[Math.floor(r() * spots.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    });
  };

  /* ---------------- 바닥 타일 ---------------- */
  Sp.defineNoise('t_grass',  '#4a8b3a', ['#5c9e45', '#3d7530', '#6aad50'], 0.16, 11);
  Sp.defineNoise('t_grass2', '#4a8b3a', ['#5c9e45', '#e8d44a', '#f0f0f0'], 0.09, 29);  // 꽃
  Sp.defineNoise('t_path',   '#c2a06a', ['#d4b47e', '#ab8a58', '#b89a62'], 0.20, 37);
  Sp.defineNoise('t_dark',   '#3a3a48', ['#45455a', '#2e2e3a', '#4e4e64'], 0.16, 91);
  Sp.defineNoise('t_carpet', '#a03c4a', ['#b84a58', '#84303c'], 0.12, 103);

  /* 나무 바닥 — 판자 이음선 포함 */
  Sp.defineDraw('t_wood', 16, 16, function (ctx) {
    ctx.fillStyle = '#8a6a44'; ctx.fillRect(0, 0, 16, 16);
    var r = prng(53);
    for (var i = 0; i < 26; i++) {
      ctx.fillStyle = ['#9b7a52', '#75593a', '#a08558'][Math.floor(r() * 3)];
      ctx.fillRect(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1);
    }
    ctx.fillStyle = '#5f4830';
    ctx.fillRect(0, 5, 16, 1);
    ctx.fillRect(0, 12, 16, 1);
    ctx.fillRect(8, 0, 1, 5);
    ctx.fillRect(3, 13, 1, 3);
  });

  /* 돌바닥 이음선 */
  Sp.defineDraw('t_stone', 16, 16, function (ctx) {
    ctx.fillStyle = '#6f6f7e'; ctx.fillRect(0, 0, 16, 16);
    var r = prng(71);
    for (var i = 0; i < 40; i++) {
      ctx.fillStyle = ['#7f7f8e', '#5d5d6a', '#888897'][Math.floor(r() * 3)];
      ctx.fillRect(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1);
    }
    ctx.fillStyle = '#4c4c58';
    ctx.fillRect(0, 7, 16, 1);
    ctx.fillRect(7, 0, 1, 7);
    ctx.fillRect(11, 8, 1, 8);
  });

  /* ---------------- 벽 ---------------- */
  Sp.defineDraw('t_wall', 16, 16, function (ctx) {
    ctx.fillStyle = '#6a6272'; ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#7d7486'; ctx.fillRect(0, 0, 16, 2);
    ctx.fillStyle = '#4d4655';
    ctx.fillRect(0, 7, 16, 1); ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(5, 0, 1, 7); ctx.fillRect(11, 8, 1, 7);
    ctx.fillStyle = '#585064'; ctx.fillRect(1, 9, 3, 2);
  });

  Sp.defineDraw('t_walltop', 16, 16, function (ctx) {
    ctx.fillStyle = '#8d8498'; ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#a49bb0'; ctx.fillRect(0, 0, 16, 4);
    ctx.fillStyle = '#5d5568'; ctx.fillRect(0, 14, 16, 2);
  });

  /* ---------------- 오브젝트 ---------------- */

  // 나무 (16 x 28)
  Sp.defineDraw('o_tree', 16, 28, function (ctx) {
    ctx.fillStyle = '#5a3f26'; ctx.fillRect(6, 18, 4, 10);
    ctx.fillStyle = '#42301c'; ctx.fillRect(9, 18, 1, 10);
    var leaf = ['#2f6b28', '#3b8433', '#4d9c42'];
    var blobs = [[3,2,10,8],[1,6,14,8],[2,11,12,6],[4,15,8,4]];
    for (var i = 0; i < blobs.length; i++) {
      ctx.fillStyle = leaf[i % 3];
      var b = blobs[i]; ctx.fillRect(b[0], b[1], b[2], b[3]);
    }
    ctx.fillStyle = '#56ad48';
    ctx.fillRect(4, 3, 3, 2); ctx.fillRect(9, 7, 3, 2); ctx.fillRect(3, 12, 2, 2);
    ctx.fillStyle = '#25521f';
    ctx.fillRect(1, 13, 14, 1); ctx.fillRect(3, 18, 10, 1);
  });

  // 덤불 (16 x 12)
  Sp.defineDraw('o_bush', 16, 12, function (ctx) {
    ctx.fillStyle = '#31702a'; ctx.fillRect(1, 4, 14, 8);
    ctx.fillStyle = '#3f8a36'; ctx.fillRect(2, 2, 12, 7);
    ctx.fillStyle = '#4fa344'; ctx.fillRect(4, 1, 5, 3); ctx.fillRect(10, 3, 3, 2);
    ctx.fillStyle = '#25521f'; ctx.fillRect(1, 11, 14, 1);
  });

  // 표지판 (16 x 20)
  Sp.defineDraw('o_sign', 16, 20, function (ctx) {
    ctx.fillStyle = '#5a3f26'; ctx.fillRect(7, 12, 2, 8);
    ctx.fillStyle = '#c9a15e'; ctx.fillRect(1, 2, 14, 11);
    ctx.fillStyle = '#a8834a'; ctx.fillRect(1, 2, 14, 2);
    ctx.fillStyle = '#6b4a28'; ctx.strokeStyle = '#6b4a28';
    ctx.fillRect(1, 2, 14, 1); ctx.fillRect(1, 12, 14, 1);
    ctx.fillRect(1, 2, 1, 11); ctx.fillRect(14, 2, 1, 11);
    ctx.fillStyle = '#6b4a28';
    ctx.fillRect(3, 6, 10, 1); ctx.fillRect(3, 9, 7, 1);
  });

  // 울타리 (16 x 16)
  Sp.defineDraw('o_fence', 16, 16, function (ctx) {
    ctx.fillStyle = '#8a6a44';
    ctx.fillRect(2, 4, 3, 12); ctx.fillRect(11, 4, 3, 12);
    ctx.fillRect(0, 6, 16, 2); ctx.fillRect(0, 11, 16, 2);
    ctx.fillStyle = '#6b4f30';
    ctx.fillRect(2, 4, 3, 1); ctx.fillRect(11, 4, 3, 1); ctx.fillRect(0, 12, 16, 1);
  });

  // 작업대 (32 x 24) — 조립 공방
  Sp.defineDraw('o_workbench', 32, 24, function (ctx) {
    ctx.fillStyle = '#7a5a38'; ctx.fillRect(0, 6, 32, 7);
    ctx.fillStyle = '#9b7548'; ctx.fillRect(0, 6, 32, 3);
    ctx.fillStyle = '#5a4128'; ctx.fillRect(0, 12, 32, 1);
    ctx.fillRect(3, 13, 4, 11); ctx.fillRect(25, 13, 4, 11);
    ctx.fillStyle = '#6b4f30'; ctx.fillRect(3, 13, 4, 2); ctx.fillRect(25, 13, 4, 2);
    // 위에 놓인 부품들
    ctx.fillStyle = '#e8d44a'; ctx.fillRect(4, 2, 7, 4);        // 노란 브릭
    ctx.fillStyle = '#c8ccd6'; ctx.fillRect(13, 1, 8, 5);       // 회색 허브
    ctx.fillStyle = '#54c7ec'; ctx.fillRect(14, 2, 2, 2); ctx.fillRect(18, 2, 2, 2);
    ctx.fillStyle = '#d04a4a'; ctx.fillRect(23, 3, 6, 3);       // 빨간 축
  });

  // 책장 (16 x 28) — 도감
  Sp.defineDraw('o_shelf', 16, 28, function (ctx) {
    ctx.fillStyle = '#6b4f30'; ctx.fillRect(0, 0, 16, 28);
    ctx.fillStyle = '#4d381f'; ctx.fillRect(0, 0, 16, 2); ctx.fillRect(0, 26, 16, 2);
    var books = ['#c04a4a', '#4a8bc0', '#d0a03a', '#5cb85c', '#9b59b6'];
    for (var s = 0; s < 3; s++) {
      var y = 3 + s * 8;
      ctx.fillStyle = '#3d2c18'; ctx.fillRect(1, y + 6, 14, 2);
      for (var i = 0; i < 5; i++) {
        ctx.fillStyle = books[(s * 3 + i) % books.length];
        ctx.fillRect(2 + i * 3, y, 2, 6);
      }
    }
  });

  // 상자 (16 x 16)
  Sp.defineDraw('o_crate', 16, 16, function (ctx) {
    ctx.fillStyle = '#a07c4a'; ctx.fillRect(1, 2, 14, 13);
    ctx.fillStyle = '#c29a5e'; ctx.fillRect(1, 2, 14, 3);
    ctx.fillStyle = '#6b4f30';
    ctx.fillRect(1, 2, 14, 1); ctx.fillRect(1, 14, 14, 1);
    ctx.fillRect(1, 2, 1, 13); ctx.fillRect(14, 2, 1, 13);
    ctx.fillRect(1, 8, 14, 1); ctx.fillRect(7, 2, 1, 13);
  });

  // 문 (16 x 24)
  Sp.defineDraw('o_door', 16, 24, function (ctx) {
    ctx.fillStyle = '#4d3820'; ctx.fillRect(1, 0, 14, 24);
    ctx.fillStyle = '#6b4f30'; ctx.fillRect(2, 1, 12, 22);
    ctx.fillStyle = '#7d5e3a'; ctx.fillRect(3, 2, 10, 9); ctx.fillRect(3, 13, 10, 9);
    ctx.fillStyle = '#e8c34a'; ctx.fillRect(11, 12, 2, 2);
  });

  // 횃불 (12 x 20)
  Sp.defineDraw('o_torch', 12, 20, function (ctx) {
    ctx.fillStyle = '#5a4128'; ctx.fillRect(5, 8, 3, 12);
    ctx.fillStyle = '#ff7a2a'; ctx.fillRect(3, 3, 6, 6);
    ctx.fillStyle = '#ffc84a'; ctx.fillRect(4, 1, 4, 6);
    ctx.fillStyle = '#fff2a8'; ctx.fillRect(5, 2, 2, 3);
  });

  // 허브 제단 (32 x 36) — 마을 중앙 / 보스방
  Sp.defineDraw('o_altar', 32, 36, function (ctx) {
    // 받침
    ctx.fillStyle = '#5d5568'; ctx.fillRect(2, 26, 28, 10);
    ctx.fillStyle = '#7d7486'; ctx.fillRect(2, 26, 28, 3);
    ctx.fillStyle = '#464050'; ctx.fillRect(2, 34, 28, 2);
    ctx.fillStyle = '#6a6272'; ctx.fillRect(6, 20, 20, 7);
    // 허브 본체
    ctx.fillStyle = '#d8dce6'; ctx.fillRect(5, 2, 22, 19);
    ctx.fillStyle = '#f0f2f8'; ctx.fillRect(5, 2, 22, 3);
    ctx.fillStyle = '#9aa0b0'; ctx.fillRect(5, 19, 22, 2);
    // 5x5 매트릭스
    ctx.fillStyle = '#20242e'; ctx.fillRect(8, 5, 16, 12);
    for (var y = 0; y < 5; y++) for (var x = 0; x < 5; x++) {
      ctx.fillStyle = (x + y) % 3 === 0 ? '#ffd24a' : '#3a3f4e';
      ctx.fillRect(9 + x * 3, 6 + y * 2, 2, 1);
    }
  });

  // 힌트 아이콘 (!)
  Sp.defineDraw('o_excl', 8, 12, function (ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(2, 0, 4, 12);
    ctx.fillStyle = '#ffd24a';
    ctx.fillRect(3, 1, 2, 6); ctx.fillRect(3, 9, 2, 2);
  });
})(SPIKE);
