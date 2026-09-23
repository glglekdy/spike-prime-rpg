/* ============================================================
 *  scenes/battle — 퀴즈 배틀 (정면 뷰 턴제)
 *   정답 = 큰 공격 / 오답 = 해설 후 작은 공격
 *   게임오버 없음. 모든 문제를 풀면 반드시 승리한다.
 * ============================================================ */
(function (S) {
  'use strict';

  var PH = { INTRO: 0, ASK: 1, JUDGE: 2, WHY: 3, WIN: 4, ACT: 5 };

  /* 해체 카드를 못 넘기는 시간(초). 실물을 실제로 만질 틈을 준다 (DESIGN.md §9-1).
     5분판이라 1.5 → 1.0. 이 밑으로는 카드를 읽기도 전에 넘어간다. */
  var ACT_HOLD = 1.0;

  /* 보기 배치 열 수 — _choiceRect 와 _pick 이 같은 값을 봐야 한다 */
  var COLS = 2;

  var Battle = {
    enemy: '', enemyName: '', qs: [], qi: 0, sel: 0,
    phase: 0, t: 0, back: null, onWin: null,
    hpMax: 0, hp: 0, shake: 0, lastOk: false, dmgPop: null,
    mw: null, flash: 0, act: '',
    strict: false, src: null,

    enter: function (p) {
      this.enemy = p.enemy || 'e_pin';
      this.enemyName = p.enemyName || S.T('battle.unknownEnemy', '');
      this.back = p.back || null;
      this.onWin = p.onWin || null;
      this.act = '';

      /* strict = 보스전. 문제가 곧 실물 해체 절차라 순서를 건너뛸 수 없다.
         오답이면 같은 문제를 다시 내고, 정답이면 해체 지시 카드를 띄운다. */
      this.strict = !!p.strict;


      /* 풀 전체가 아니라 S.ASK 가 정한 수만큼만 낸다 (data/quiz.js) */
      var set = S.pickQuiz(p.quizSet);
      this.src = set;                       // 재출제할 때 원본에서 다시 섞는다
      this.qs = set.map(function (q) { return S.shuffleQuiz(q); });
      this.qi = 0; this.sel = 0;
      this.hpMax = this.qs.length; this.hp = this.qs.length;
      this.phase = PH.INTRO; this.t = 0; this.shake = 0; this.flash = 0;
      this.dmgPop = null;

      // 해설이 3줄까지 나온다 — 높이를 그만큼 준다 (maxLines 참조)
      this.mw = new S.MessageWindow({ h: 74, y: S.H - 82 });
      var self = this;
      this.mw.show({ name: this.enemyName,
        text: S.Text.fmt(S.T('battle.appear', ''), { name: this.enemyName }) },
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
        if (I.pressed.left) this._pick(-1, 0);
        if (I.pressed.right) this._pick(1, 0);
        if (I.pressed.up) this._pick(0, -1);
        if (I.pressed.down) this._pick(0, 1);
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

      /* 해체 지시 카드 — ACT_HOLD 동안은 넘기지 못한다 */
      if (this.phase === PH.ACT) {
        if (this.t < ACT_HOLD) return;
        if (I.pressed.ok || I.mouse.pressed) {
          S.Audio.se('ok');
          this._advance();
        }
        return;
      }

      if (this.phase === PH.WIN) {
        this.mw.update(dt);
        return;
      }
    },

    /* 다음 문제로. 다 풀었으면 승리 */
    _advance: function () {
      this.qi++;
      this.sel = 0;
      if (this.qi >= this.qs.length) this._win();
      else this.phase = PH.ASK;
    },

    _choiceRect: function (i) {
      var w = (S.W - 24) / 2 | 0;
      var x = 8 + (i % COLS) * (w + 8);
      var y = 152 + Math.floor(i / COLS) * 26;
      return [x, y, w, 22];
    },

    /* ------------------------------------------------------------
     *  보기 고르기 — 화면이 2열 격자이므로 방향키 네 개를 다 받는다.
     *    좌우 : 목록 순서대로 한 칸 (끝에서 돈다)
     *    위아래 : 같은 열에서 윗줄·아랫줄로 (빈 자리는 건너뛴다)
     *  예전에는 위아래만 받았고 그마저 목록 순서라, 위를 눌렀는데
     *  커서가 오른쪽 칸으로 가는 것처럼 보였다.
     * ---------------------------------------------------------- */
    _pick: function (dx, dy) {
      var n = this.qs[this.qi].choices.length;
      if (n < 2) return;
      var next = this.sel;

      if (dx) {
        next = (this.sel + dx + n) % n;
      } else {
        var rows = Math.ceil(n / COLS);
        var col = this.sel % COLS;
        var row = Math.floor(this.sel / COLS);
        for (var k = 0; k < rows; k++) {
          row = (row + dy + rows) % rows;
          var cand = row * COLS + col;
          if (cand < n) { next = cand; break; }
        }
      }

      if (next === this.sel) return;
      this.sel = next;
      S.Audio.se('cursor');
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
        this.dmgPop = { t: 0, v: S.T('battle.correct', ''), col: S.C.textOk };
      } else {
        S.State.quizNg++;
        S.Audio.se('wrong');
        S.State.hp = Math.max(0, S.State.hp - 1);
        this.dmgPop = { t: 0, v: S.T('battle.wrong', ''), col: S.C.textNg };

        /* 보스전에서는 보스 HP 를 줄이지 않는다 — 맞혀야만 한 단계가 해체된다.
           체력이 0 이 되면 해설을 보여 준 뒤 게임오버로 간다 (_explain 참조).
           ※ 예전에는 여기서 정령이 체력을 채워 줬다 (DESIGN.md §9-2).
             게임오버를 넣기로 하면서 그 구제책은 뺐다. */
        if (!this.strict) this.hp = Math.max(0, this.hp - 1);
      }
    },

    _explain: function () {
      var q = this.qs[this.qi];
      var self = this;
      this.phase = PH.WHY;
      var msgs = [{
        name: S.T(this.lastOk ? 'battle.correct' : 'battle.why', ''),
        color: this.lastOk ? S.C.textOk : S.C.textNg,
        text: (this.lastOk ? ''
              : S.Text.fmt(S.T('battle.answerIs', ''), { a: q.choices[q.ans] }) + '\n') + q.why,
        icon: q.icon
      }];
      if (q.act) this.act = q.act;

      /* 체력이 바닥났다 — 해설은 끝까지 보여 주고 그다음에 게임오버로 */
      var dead = S.State.hp <= 0;
      if (dead) {
        msgs.push({ name: this.enemyName, color: S.C.textNg, text: S.T('battle.downed', '') });
      }

      if (this.strict) {
        /* 보스전: 오답이면 순서가 어긋나므로 되돌린다. 정답이면 해체 카드로. */
        if (!this.lastOk && !dead) {
          msgs.push({ name: this.enemyName, color: S.C.textNg, text: S.T('battle.retry', '') });
        }
        this.mw.show(msgs, function () {
          if (dead) { S.Game.transition('gameover'); return; }
          self.sel = 0;
          if (self.lastOk) { self.phase = PH.ACT; self.t = 0; S.Audio.se('item'); return; }
          // 같은 문제를 보기만 다시 섞어 낸다
          self.qs[self.qi] = S.shuffleQuiz(self.src[self.qi]);
          self.phase = PH.ASK;
        });
        return;
      }

      if (q.act && !dead) {
        msgs.push({ name: S.T('battle.actLabel', ''), color: S.C.textHi,
          text: S.Text.fmt(S.T('battle.actNow', ''), { act: q.act }) });
      }
      this.mw.show(msgs, function () {
        if (dead) { S.Game.transition('gameover'); return; }
        self._advance();
      });
    },

    _win: function () {
      this.phase = PH.WIN;
      S.Audio.stopBGM();
      S.Audio.se('fanfare');
      var self = this;
      var ok = S.State.quizOk, ng = S.State.quizNg;
      this.mw.show([
        { name: S.T('battle.win', ''), color: S.C.textHi,
          text: S.Text.fmt(S.T('battle.defeated', ''), { name: this.enemyName }) },
        { text: S.Text.fmt(S.T('battle.score', ''), { ok: ok, ng: ng }) }
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
      r.text(S.Text.fmt(S.T('battle.question', ''),
        { n: Math.min(this.qi + 1, this.qs.length), total: this.qs.length }), 11, 9,
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
          if (sel && !reveal) r.text('→', b[0] + 4, b[1] + 5, { size: 10, color: C.textHi });
          r.text(q.choices[c], b[0] + 16, b[1] + 5, { size: 10, color: col });
        }

        if (this.phase === PH.ASK && (this.t % 1.4) < 0.9) {
          r.text(S.T('battle.hint', ''), S.W / 2, S.H - 16,
            { size: 9, color: C.textDim, align: 'center' });
        }
      }

      if (this.phase === PH.INTRO || this.phase === PH.WHY || this.phase === PH.WIN) {
        this.mw.draw(r);
      }

      if (this.phase === PH.ACT) this._drawAct(r);
    },

    /* ------------------------------------------------------------
     *  해체 지시 카드 (DESIGN.md §9-1)
     *  문제를 맞힐 때마다 "지금 실물에서 할 일"을 전체화면으로 크게 띄우고,
     *  ACT_HOLD 동안은 넘기지 못하게 막는다.
     * ---------------------------------------------------------- */
    _drawAct: function (r) {
      var C = S.C;
      r.fade(0.82);

      var bw = 300, bh = 152;
      var bx = Math.round((S.W - bw) / 2), by = Math.round((S.H - bh) / 2);
      r.window(bx, by, bw, bh);

      r.text(S.T('battle.actTitle', ''), bx + bw / 2, by + 10,
        { size: 11, color: C.textHi, align: 'center' });
      r.rect(bx + 16, by + 30, bw - 32, 1, C.winEdge2);

      var q = this.qs[this.qi];
      var sp = q && q.icon && S.Sprites.get(q.icon);
      if (sp) {
        r.rect(bx + 16, by + 42, 52, 52, '#0a1230');
        r.frame(bx + 16, by + 42, 52, 52, C.winEdge2, 1);
        r.ctx.drawImage(sp, 0, 0, 32, 32, bx + 18, by + 44, 48, 48);
      }

      var tx = bx + 80, tw = bw - 80 - 16;
      var lines = S.Font.wrap(this.act, 14, tw);
      var y = by + 46;
      for (var i = 0; i < lines.length && i < 3; i++) {
        r.text(lines[i], tx, y, { size: 14, color: C.white });
        y += 18;
      }

      if (this.t >= ACT_HOLD) {
        if ((this.t % 1.2) < 0.75) {
          r.text(S.T('battle.actNext', ''), bx + bw / 2, by + bh - 24,
            { size: 10, color: C.textOk, align: 'center' });
        }
      } else {
        // 남은 대기 시간 게이지 — 넘길 수 없다는 걸 보여 준다
        var gw = bw - 80;
        r.rect(bx + 40, by + bh - 22, gw, 4, '#0a1230');
        r.rect(bx + 40, by + bh - 22, Math.round(gw * (this.t / ACT_HOLD)), 4, C.textHi);
      }
    }
  };

  S.Game.register('battle', Battle);
})(SPIKE);
