/* ============================================================
 *  scenes/battle — 퀴즈 배틀 (정면 뷰 턴제)
 *   정답 = 큰 공격 / 오답 = 해설 후 작은 공격
 *   게임오버 없음. 모든 문제를 풀면 반드시 승리한다.
 * ============================================================ */
(function (S) {
  'use strict';

  var PH = { INTRO: 0, ASK: 1, JUDGE: 2, WHY: 3, WIN: 4 };

  var Battle = {
    enemy: '', enemyName: '', qs: [], qi: 0, sel: 0,
    phase: 0, t: 0, back: null, onWin: null,
    hpMax: 0, hp: 0, shake: 0, lastOk: false, dmgPop: null,
    mw: null, flash: 0, act: '',

    enter: function (p) {
      this.enemy = p.enemy || 'e_pin';
      this.enemyName = p.enemyName || '수상한 그림자';
      this.back = p.back || null;
      this.onWin = p.onWin || null;
      this.act = '';

      var set = S.QUIZ[p.quizSet] || S.QUIZ.gate;
      this.qs = set.map(S.shuffleQuiz);
      this.qi = 0; this.sel = 0;
      this.hpMax = this.qs.length; this.hp = this.qs.length;
      this.phase = PH.INTRO; this.t = 0; this.shake = 0; this.flash = 0;
      this.dmgPop = null;

      this.mw = new S.MessageWindow({ h: 54, y: S.H - 62 });
      var self = this;
      this.mw.show({ name: this.enemyName, text: this.enemyName + '이(가) 나타났다!\n문제를 맞혀서 물리쳐라!' },
        function () { self.phase = PH.ASK; });

      S.Audio.playBGM(p.bgm || 'battle');
    },

    update: function (dt) {
      this.t += dt;
      if (this.shake > 0) this.shake -= dt * 30;
      if (this.flash > 0) this.flash -= dt * 3;
      if (this.dmgPop) {
        this.dmgPop.t += dt;
        if (this.dmgPop.t > 1) this.dmgPop = null;
      }

      var I = S.Input;

      if (this.phase === PH.INTRO || this.phase === PH.WHY) {
        this.mw.update(dt);
        return;
      }

      if (this.phase === PH.ASK) {
        var q = this.qs[this.qi];
        var n = q.choices.length;
        if (I.pressed.up) { this.sel = (this.sel + n - 1) % n; S.Audio.se('cursor'); }
        if (I.pressed.down) { this.sel = (this.sel + 1) % n; S.Audio.se('cursor'); }
        for (var i = 0; i < n; i++) {
          var b = this._choiceRect(i);
          if (I.hover(b[0], b[1], b[2], b[3])) this.sel = i;
          if (I.clicked(b[0], b[1], b[2], b[3])) { this._answer(); return; }
        }
        if (I.pressed.ok) this._answer();
        return;
      }

      if (this.phase === PH.JUDGE) {
        if (this.t > 0.85) this._explain();
        return;
      }

      if (this.phase === PH.WIN) {
        this.mw.update(dt);
        return;
      }
    },

    _choiceRect: function (i) {
      var w = (S.W - 24) / 2 | 0;
      var x = 8 + (i % 2) * (w + 8);
      var y = 152 + Math.floor(i / 2) * 26;
      return [x, y, w, 22];
    },

    _answer: function () {
      var q = this.qs[this.qi];
      this.lastOk = (this.sel === q.ans);
      this.phase = PH.JUDGE;
      this.t = 0;

      if (this.lastOk) {
        S.State.quizOk++;
        S.Audio.se('correct');
        S.Game.quake(7);
        this.shake = 10;
        this.flash = 1;
        this.hp = Math.max(0, this.hp - 1);
        this.dmgPop = { t: 0, v: '정답!', col: S.C.textOk };
      } else {
        S.State.quizNg++;
        S.Audio.se('wrong');
        S.State.hp = Math.max(0, S.State.hp - 1);
        this.hp = Math.max(0, this.hp - 1);   // 진행은 반드시 된다
        this.dmgPop = { t: 0, v: '아쉽다…', col: S.C.textNg };
      }
    },

    _explain: function () {
      var q = this.qs[this.qi];
      var self = this;
      this.phase = PH.WHY;
      var msgs = [{
        name: this.lastOk ? '정답!' : '해설',
        color: this.lastOk ? S.C.textOk : S.C.textNg,
        text: (this.lastOk ? '' : '정답은 「' + q.choices[q.ans] + '」.\n') + q.why,
        icon: q.icon
      }];
      if (q.act) {
        this.act = q.act;
        msgs.push({ name: '실제 행동', color: S.C.textHi, text: '지금 실물에서 → ' + q.act });
      }
      this.mw.show(msgs, function () {
        self.qi++;
        self.sel = 0;
        if (self.qi >= self.qs.length) self._win();
        else self.phase = PH.ASK;
      });
    },

    _win: function () {
      this.phase = PH.WIN;
      S.Audio.stopBGM();
      S.Audio.se('fanfare');
      var self = this;
      var ok = S.State.quizOk, ng = S.State.quizNg;
      this.mw.show([
        { name: '승리!', color: S.C.textHi, text: this.enemyName + '을(를) 물리쳤다!' },
        { text: '정답 ' + ok + '개 / 오답 ' + ng + '개\n배운 것을 잊지 말자.' }
      ], function () {
        if (self.onWin) self.onWin();
        if (self.back) S.Game.transition('field', { map: self.back.map, at: self.back.at });
        else S.Game.transition('field', { map: 'village' });
      });
    },

    draw: function (r) {
      var C = S.C;

      // 배경
      r.vgradient(0, 0, S.W, S.H, '#1a1030', '#3a2050');
      for (var i = 0; i < 12; i++) {
        var y = 20 + i * 10;
        r.ctx.globalAlpha = 0.06;
        r.rect(0, y, S.W, 2, '#ffffff');
      }
      r.ctx.globalAlpha = 1;
      r.rect(0, 118, S.W, 4, '#241640');

      if (this.flash > 0) {
        r.ctx.globalAlpha = Math.min(0.5, this.flash * 0.5);
        r.rect(0, 0, S.W, S.H, '#ffffff');
        r.ctx.globalAlpha = 1;
      }

      // 적
      var sp = S.Sprites.get(this.enemy);
      if (sp) {
        var ex = (S.W - sp.width) / 2 + (this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0);
        var ey = 36 + Math.sin(this.t * 2) * 3;
        r.ctx.save();
        if (this.phase === PH.JUDGE && this.lastOk) r.ctx.globalAlpha = 0.6;
        r.ctx.drawImage(sp, Math.round(ex), Math.round(ey));
        r.ctx.restore();
      }

      // 적 이름 + HP 게이지
      r.text(this.enemyName, S.W / 2, 10, { size: 12, color: '#ffd7d7', align: 'center' });
      var gw = 140, gx = (S.W - gw) / 2;
      r.rect(gx - 1, 27, gw + 2, 7, '#000000');
      r.rect(gx, 28, gw, 5, '#40203a');
      r.rect(gx, 28, Math.round(gw * this.hp / this.hpMax), 5, '#e0405a');

      // 데미지 팝업
      if (this.dmgPop) {
        var a = 1 - this.dmgPop.t;
        r.ctx.globalAlpha = Math.max(0, a);
        r.text(this.dmgPop.v, S.W / 2, 62 - this.dmgPop.t * 20,
          { size: 16, color: this.dmgPop.col, align: 'center' });
        r.ctx.globalAlpha = 1;
      }

      // 진행 표시
      r.window(4, 4, 62, 20, { alpha: 0.85 });
      r.text('문제 ' + Math.min(this.qi + 1, this.qs.length) + '/' + this.qs.length, 11, 9,
        { size: 10, color: C.textHi });

      // 플레이어 하트
      r.window(S.W - 76, 4, 72, 20, { alpha: 0.85 });
      for (var h = 0; h < S.State.maxHp; h++) {
        var full = h < S.State.hp;
        var hx = S.W - 70 + h * 13, hy = 10;
        r.rect(hx, hy + 1, 3, 3, full ? '#ff5a6a' : '#5a3a44');
        r.rect(hx + 5, hy + 1, 3, 3, full ? '#ff5a6a' : '#5a3a44');
        r.rect(hx, hy + 3, 8, 3, full ? '#ff5a6a' : '#5a3a44');
        r.rect(hx + 1, hy + 6, 6, 2, full ? '#d03a4a' : '#4a2e36');
        r.rect(hx + 3, hy + 8, 2, 1, full ? '#d03a4a' : '#4a2e36');
      }

      // 질문 + 보기
      if (this.phase === PH.ASK || this.phase === PH.JUDGE) {
        var q = this.qs[this.qi];
        r.window(4, 108, S.W - 8, 40);
        if (q.icon && S.Sprites.has(q.icon)) {
          r.ctx.drawImage(S.Sprites.get(q.icon), 0, 0, 32, 32, 9, 112, 30, 30);
        }
        var qlines = S.Font.wrap(q.q, 11, S.W - 56);
        for (var L = 0; L < qlines.length && L < 2; L++) {
          r.text(qlines[L], 44, 115 + L * 14, { size: 11, color: C.white });
        }

        for (var c = 0; c < q.choices.length; c++) {
          var b = this._choiceRect(c);
          var sel = c === this.sel;
          var reveal = this.phase === PH.JUDGE;
          var col = C.text, bg = null;
          if (reveal) {
            if (c === q.ans) { bg = '#1e6b3a'; col = '#b6ffcb'; }
            else if (c === this.sel) { bg = '#6b1e28'; col = '#ffc0c8'; }
          } else if (sel) { bg = '#2a4a8a'; col = C.textHi; }

          r.rect(b[0], b[1], b[2], b[3], bg || '#141c38');
          r.frame(b[0], b[1], b[2], b[3], sel && !reveal ? C.winEdge : C.winEdge2, 1);
          if (sel && !reveal) r.text('▶', b[0] + 4, b[1] + 5, { size: 10, color: C.textHi });
          r.text(q.choices[c], b[0] + 16, b[1] + 5, { size: 10, color: col });
        }

        if (this.phase === PH.ASK && (this.t % 1.4) < 0.9) {
          r.text('↑↓ 또는 마우스로 고르고  Z/클릭', S.W / 2, S.H - 16,
            { size: 9, color: C.textDim, align: 'center' });
        }
      }

      if (this.phase === PH.INTRO || this.phase === PH.WHY || this.phase === PH.WIN) {
        this.mw.draw(r);
      }
    }
  };

  S.Game.register('battle', Battle);
})(SPIKE);
