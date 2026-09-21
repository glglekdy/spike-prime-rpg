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
      fd.say(lines('gran', 'village.gran.intro'), function () {
        S.Game.push('cards', {
          title: S.D('village.gran.cardsTitle', ''),
          ids: ['hub', 'motorL', 'motorM', 'color', 'dist', 'force'],
          onDone: function () {
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
              if (g) { g.tx = 9; g.ty = 12; g.dir = 'right'; }
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
      if (S.Mission) S.Mission.talk(fd);
      else fd.say({ name: N('maker'), text: '…' });
    },

    'workshop:bench': function (fd) {
      fd.say({ text: S.D('workshop.bench', '') });
    },

    /* ===== 해체의 방 ===== */
    'hubroom:altar': function (fd) {
      if (S.State.flags.bossDone) {
        fd.say({ name: N('hub'), text: S.D('hubroom.altarAwake', ''), icon: 'p_hub' });
        S.Game.transition('ending');
      } else {
        fd.say({ text: S.D('hubroom.altarLocked', ''), icon: 'p_hub' });
      }
    }
  };

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
