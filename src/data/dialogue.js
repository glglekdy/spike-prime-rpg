/* ============================================================
 *  SPIKE.Dialogue — NPC/오브젝트 대화 + 퀘스트 목표 문구
 *  여기가 곧 "교육 대본"이다.
 * ============================================================ */
(function (S) {
  'use strict';

  var F = function () { return S.State.flags; };

  /* ---------------- 퀘스트 목표 ---------------- */
  S.Quest = {
    current: function () {
      var f = F();
      if (S.State.chapter >= 3) {
        return f.bossDone ? '허브 왕을 깨워라!' : '해체의 순서를 증명하라';
      }
      if (S.State.chapter === 2) {
        var st = S.Mission && S.Mission.steps[S.State.missionStep];
        return st ? st.goal : '로봇 장인에게 말을 걸자';
      }
      if (!f.talked_gran) return '도감 할머니에게 말을 걸자';
      if (!f.talked_smith) return '대장장이에게 연결의 법칙을 배우자';
      if (!f.gatePassed) return '문지기의 시험에 도전하자';
      return '남쪽 문으로 나가 조립 공방으로';
    }
  };

  /* ---------------- 대화 테이블 ---------------- */
  var TALK = {

    /* ===== 허브 마을 ===== */
    'village:gran': function (fd) {
      var f = F();
      if (!f.talked_gran) {
        fd.say([
          { name: '도감 할머니', text: '잘 왔구나, 견습 메카닉.\n허브 왕이 잠들어 마을의 로봇이 전부 멈췄단다.' },
          { name: '도감 할머니', text: '왕을 깨우려면 먼저 「6대 정령」을 알아야 해.\n눈에 똑똑히 새겨두렴.' }
        ], function () {
          S.Game.push('cards', {
            title: '6대 정령 — 전자 부품',
            ids: ['hub', 'motorL', 'motorM', 'color', 'dist', 'force'],
            onDone: function () {
              f.talked_gran = true;
              fd.say([
                { name: '도감 할머니', text: '이제 너도 정령들의 이름을 안다.\n도감은 X 키로 언제든 다시 볼 수 있어.' },
                { name: '도감 할머니', text: '다음은 대장장이다.\n뼈대와 못에 대해 배워 오렴.' }
              ]);
            }
          });
        });
      } else {
        fd.say({ name: '도감 할머니', text: '도감은 X 키.\n모르는 게 생기면 언제든 펼쳐 보렴.' });
      }
    },

    'village:smith': function (fd) {
      var f = F();
      if (!f.talked_smith) {
        fd.say([
          { name: '대장장이', text: '로봇의 뼈대는 「빔」,\n그 뼈대를 붙이는 못이 「핀」이다.' },
          { name: '대장장이', text: '핀은 색으로 구분해라.\n검정과 파랑은 거칠거칠 — 꽉 물려서 안 돈다. 고정용!' },
          { name: '대장장이', text: '연회색과 베이지는 매끈매끈 — 잘 돈다.\n바퀴나 관절처럼 돌아야 하는 곳에 쓴다.' }
        ], function () {
          S.Game.push('cards', {
            title: '연결의 법칙 — 구조 부품',
            ids: ['pinBlack', 'pinGray', 'beam'],
            onDone: function () {
              // 나머지 구조 부품도 "들은 이야기"로 도감에 등록
              ['connector', 'axle', 'bush', 'cable', 'separator', 'flag'].forEach(function (id) {
                S.State.learn(id);
              });
              f.talked_smith = true;
              fd.say([
                { name: '대장장이', text: '축은 길이를 색으로 외워라.\n홀수는 회색, 짝수는 검정, 2칸짜리만 빨강이다.' },
                { name: '대장장이', text: '그리고 절대 손톱으로 뜯지 마라.\n「분리 도구」를 써라. 그게 장인의 예의다.' },
                { name: '대장장이', text: '문지기가 너를 시험할 거다.\n가 봐라.' }
              ]);
            }
          });
        });
      } else {
        fd.say({ name: '대장장이', text: '검정·파랑은 고정.\n연회색·베이지는 회전. 잊지 마라.' });
      }
    },

    'village:guard': function (fd) {
      var f = F();
      if (f.gatePassed) {
        fd.say({ name: '문지기', text: '통과다. 남쪽 문으로 가라.\n조립 공방에서 장인이 기다린다.' });
        return;
      }
      if (!f.talked_gran || !f.talked_smith) {
        fd.say({ name: '문지기', text: '아직 배움이 부족하다.\n할머니와 대장장이를 먼저 만나고 오너라.' });
        return;
      }
      fd.ask({ name: '문지기', text: '이 문을 지나려면 시험을 봐야 한다.\n세 문제다. 준비됐나?' },
        ['도전한다', '조금만 더 준비'],
        function (idx) {
          if (idx === 0) {
            S.Game.transition('battle', {
              enemy: 'e_pin', enemyName: '핀 도둑',
              bgm: 'battle', quizSet: 'gate',
              back: { map: 'village', at: { x: 11, y: 11, dir: 'down' } },
              onWin: function () {
                F().gatePassed = true;
                F().talked_guard = true;
                var g = S.npc('village', 'guard');   // 길을 비켜준다
                if (g) { g.tx = 9; g.ty = 12; g.dir = 'right'; }
              }
            });
          } else {
            fd.say({ name: '문지기', text: '언제든 다시 오너라.' });
          }
        });
    },

    'village:altar': function (fd) {
      S.State.learn('hub');
      fd.say([
        { name: '허브 제단', text: '커다란 허브가 잠들어 있다.\n5×5 매트릭스가 모두 꺼져 있다.', icon: 'p_hub' },
        { text: '포트 A부터 F까지 여섯 개.\n하나도 연결되어 있지 않다…' }
      ]);
    },

    'village:sign': function (fd) {
      fd.say([
        { text: '『 허브 마을 』\n방향키 — 이동 / Z·Enter — 말 걸기 / X — 도감' },
        { text: '남쪽 문 → 조립 공방\n먼저 마을 사람들에게 배우자.' }
      ]);
    },

    /* ===== 조립 공방 ===== */
    'workshop:maker': function (fd) {
      if (S.Mission) S.Mission.talk(fd);
      else fd.say({ name: '로봇 장인', text: '준비 중이다…' });
    },

    'workshop:bench': function (fd) {
      fd.say({ text: '작업대다. 부품이 가지런히 놓여 있다.\n여기서 실제 로봇을 조립한다.' });
    },

    /* ===== 해체의 방 ===== */
    'hubroom:altar': function (fd) {
      if (S.State.flags.bossDone) {
        fd.say({ name: '허브 왕', text: '…고맙다, 견습 메카닉.\n브릭시티가 다시 움직인다!', icon: 'p_hub' });
        S.Game.transition('ending');
      } else {
        fd.say({ text: '허브 왕이 아직 잠들어 있다.\n뒤엉킨 케이블이 왕을 감고 있다…', icon: 'p_hub' });
      }
    }
  };

  S.Dialogue = {
    talk: function (mapId, id, fd) {
      var key = mapId + ':' + id;
      var fn = TALK[key];
      if (fn) { fn(fd); S.State.flags['talked_' + id] = S.State.flags['talked_' + id] || false; }
      else fd.say('아무 일도 일어나지 않았다.');
    },
    table: TALK
  };
})(SPIKE);
