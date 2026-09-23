/* ============================================================
 *  SPIKE.Dialogue — NPC/오브젝트 대화 + 퀘스트 목표 문구
 *
 *  ⚠ 대사 문장은 여기 없다.  content/dialogue.ko.json 에 있다.
 *    이 파일은 "언제 무엇을 말하는가"(분기)만 담당한다.
 *    퀘스트 문구 같은 화면 텍스트는 content/ui.ko.json 의 quest.* 를 쓴다.
 * ============================================================ */
(function (S) {
  'use strict';

  var F = function () { return S.State.flags; };
  function N(id) { return S.D('names.' + id, id); }

  /* ---------------- 퀘스트 목표 ---------------- */
  S.Quest = {
    current: function () {
      var f = F();
      if (S.State.chapter >= 3) {
        return f.bossDone ? S.T('quest.bossDone', '') : S.T('quest.bossReady', '');
      }
      if (S.State.chapter === 2) {
        return S.Mission ? S.Mission.goal() : S.T('quest.maker', '');
      }
      if (!f.talked_gran) return S.T('quest.gran', '');
      if (!f.talked_smith) return S.T('quest.smith', '');
      if (!f.gatePassed) return S.T('quest.guard', '');
      return S.T('quest.toWorkshop', '');
    }
  };

  /* 배열 대사를 {name, text} 목록으로 */
  function lines(who, key) {
    return S.DL(key).map(function (t) { return { name: N(who), text: t }; });
  }

  /* ---------------- 대화 테이블 ---------------- */
  var TALK = {

    /* ===== 허브 마을 ===== */
    'village:gran': function (fd) {
      var f = F();
      if (f.talked_gran) {
        fd.say({ name: N('gran'), text: S.D('village.gran.repeat', '') });
        return;
      }
      /* 5분판이라 카드는 4장만 넘긴다 (10분판은 6장).
         오늘 실제로 쓰는 허브·중형 모터에, 후킹용 센서 2종까지.
         나머지는 대장장이 쪽과 같은 방식으로 도감에만 조용히 올린다 —
         X(도감)로 언제든 볼 수 있고 수집률 100% 도 그대로다. */
      fd.say(lines('gran', 'village.gran.intro'), function () {
        S.Game.push('cards', {
          title: S.D('village.gran.cardsTitle', ''),
          ids: ['hub', 'motorM', 'dist', 'color'],
          onDone: function () {
            ['motorL', 'force'].forEach(function (id) { S.State.learn(id); });
            f.talked_gran = true;
            fd.say(lines('gran', 'village.gran.afterCards'));
          }
        });
      });
    },

    'village:smith': function (fd) {
      var f = F();
      if (f.talked_smith) {
        fd.say({ name: N('smith'), text: S.D('village.smith.repeat', '') });
        return;
      }
      fd.say(lines('smith', 'village.smith.intro'), function () {
        S.Game.push('cards', {
          title: S.D('village.smith.cardsTitle', ''),
          ids: ['pinBlack', 'pinGray', 'beam'],
          onDone: function () {
            // 나머지 구조 부품도 "들은 이야기"로 도감에 등록
            ['connector', 'axle', 'bush', 'cable', 'separator', 'flag'].forEach(function (id) {
              S.State.learn(id);
            });
            f.talked_smith = true;
            fd.say(lines('smith', 'village.smith.afterCards'));
          }
        });
      });
    },

    'village:guard': function (fd) {
      var f = F();
      if (f.gatePassed) {
        fd.say({ name: N('guard'), text: S.D('village.guard.passed', '') });
        return;
      }
      if (!f.talked_gran || !f.talked_smith) {
        fd.say({ name: N('guard'), text: S.D('village.guard.notReady', '') });
        return;
      }
      fd.ask({ name: N('guard'), text: S.D('village.guard.challenge', '') },
        [S.T('common.yes', '도전한다'), S.T('common.no', '나중에')],
        function (idx) {
          if (idx !== 0) {
            fd.say({ name: N('guard'), text: S.D('village.guard.declined', '') });
            return;
          }
          S.Game.transition('battle', {
            enemy: 'e_pin',
            enemyName: S.D('village.guard.enemyName', '핀 도둑'),
            bgm: 'battle', quizSet: 'gate',
            back: { map: 'village', at: { x: 11, y: 11, dir: 'down' } },
            onWin: function () {
              F().gatePassed = true;
              F().talked_guard = true;
              var g = S.npc('village', 'guard');   // 길을 비켜준다
              if (g) { g.tx = 10; g.ty = 16; g.dir = 'right'; }
            }
          });
        });
    },

    'village:altar': function (fd) {
      S.State.learn('hub');
      var msgs = S.DL('village.altar').map(function (t, i) {
        return i === 0 ? { name: N('altar'), text: t, icon: 'p_hub' } : { text: t };
      });
      fd.say(msgs);
    },

    'village:sign': function (fd) {
      fd.say(S.DL('village.sign').map(function (t) { return { text: t }; }));
    },

    /* ===== 조립 공방 ===== */
    'workshop:maker': function (fd) {
      if (!S.Mission) { fd.say({ name: N('maker'), text: '…' }); return; }
      // 첫 대화가 곧 실습 시작이다
      if (!S.Mission.started()) { S.Mission.start(fd); return; }
      S.Mission.talk(fd);
    },

    'workshop:bench': function (fd) {
      fd.say({ text: S.D('workshop.bench', '') });
    },

    /* ===== 해체의 방 ===== */
    /* 해체 보스 (DESIGN.md §9).
       문제 4개 = 실물 해체 4단계라, 오답이면 다음으로 넘어가지 않는다 (strict). */
    'hubroom:boss': function (fd) {
      if (S.State.flags.bossDone) {
        fd.say({ text: S.D('hubroom.bossGone', '') });
        return;
      }
      fd.busy = true;                       // 대사 끝날 때까지 다시 부딪혀도 무시
      fd.say({ name: S.D('hubroom.bossName', ''), text: S.D('hubroom.bossIntro', ''), icon: 'p_cable' },
        function () {
          S.Game.transition('battle', {
            enemy: 'e_cable',
            enemyName: S.D('hubroom.bossName', ''),
            bgm: 'boss',
            quizSet: 'boss',
            strict: true,                   // 오답 = 같은 문제 재출제, 정답 = 해체 카드
            back: { map: 'hubroom', at: { x: 11, y: 11, dir: 'up' } },
            onWin: function () {
              S.State.flags.bossDone = true;
              var b = S.obj('hubroom', 'boss');
              if (b) b.hidden = true;       // 길이 열린다 (_buildSolid 가 다시 돈다)
            }
          });
        });
    },

    'hubroom:altar': function (fd) {
      if (S.State.flags.bossDone) {
        /* 각성 연출: 케이블이 풀리는 장면(무명) → 허브 왕의 대사 여러 장.
           다 읽은 뒤에 엔딩으로 간다. transition 을 say 밖에서 부르면
           페이드가 바로 시작되는데, 엔진이 페이드 중에는 씬 update 를 멈추므로
           대사창이 한 글자도 타이핑되지 못한 채 0.25초 만에 넘어가 버린다 (실측). */
        var msgs = [{ text: S.D('hubroom.altarUntangle', ''), icon: 'p_hub' }];
        S.DL('hubroom.altarAwake').forEach(function (t) {
          msgs.push({ name: N('hub'), text: t, icon: 'p_hub' });
        });
        fd.say(msgs, function () { S.Game.transition('ending'); });
      } else {
        fd.say({ text: S.D('hubroom.altarLocked', ''), icon: 'p_hub' });
      }
    }
  };

  /* ------------------------------------------------------------
   *  조사하면 한마디 하는 배경 오브젝트 (관찰 대사).
   *  이름표 없이 내레이션으로 띄운다 — 표지판·제단과 같은 형식.
   *
   *  대사는 dialogue.<언어>.json 의 <맵>.<id>. 배열로 쓰면 여러 장이 된다.
   *  키가 맵별이라 같은 id(예: torch) 라도 맵마다 다른 문구를 쓸 수 있다.
   *  ⚠ 공방은 분할 화면이라 대사창 글 폭이 164px 뿐이다 (다른 맵은 348px).
   *    거기 문구는 한 줄 13자 안쪽으로 끊어 둘 것.
   * ---------------------------------------------------------- */
  ['village:desk', 'village:shelf', 'village:tree', 'village:bush', 'village:fence',
   'workshop:shelf', 'workshop:crate', 'workshop:torch',
   'hubroom:torch'].forEach(function (key) {
    var dkey = key.replace(':', '.');
    TALK[key] = function (fd) {
      fd.say(S.DL(dkey).map(function (t) { return { text: t }; }));
    };
  });

  S.Dialogue = {
    talk: function (mapId, id, fd) {
      var key = mapId + ':' + id;
      var fn = TALK[key];
      if (fn) { fn(fd); S.State.flags['talked_' + id] = S.State.flags['talked_' + id] || false; }
      else fd.say(S.D('common.nothing', ''));
    },
    table: TALK
  };
})(SPIKE);
