/* ============================================================
 *  SPIKE.Hotkeys — 강사 운영용 단축키 (순환형 부스 필수)
 *    Ctrl+R  다음 학생 (완전 초기화)
 *    F1      조작법
 *    F2      챕터 점프
 *    F3      타이머 일시정지
 *    M       음소거
 * ============================================================ */
(function (S) {
  'use strict';

  var Hotkeys = S.Hotkeys = {
    helpOpen: false,
    jumpOpen: false,
    toast: '',
    toastT: 0,

    say: function (msg) { this.toast = msg; this.toastT = 1.8; },

    handle: function (e) {
      // 챕터 점프 창이 열려 있으면 숫자 입력을 먹는다
      if (this.jumpOpen) {
        if (e.code === 'Digit1' || e.code === 'Numpad1') { this.jumpOpen = false; this._jump(1); return true; }
        if (e.code === 'Digit2' || e.code === 'Numpad2') { this.jumpOpen = false; this._jump(2); return true; }
        if (e.code === 'Digit3' || e.code === 'Numpad3') { this.jumpOpen = false; this._jump(3); return true; }
        if (e.code === 'Escape' || e.code === 'F2') { this.jumpOpen = false; return true; }
        return true;
      }

      if (e.ctrlKey && e.code === 'KeyR') {
        e.preventDefault();
        S.Audio.stopBGM();
        S.Game.transition('attract');
        this.say('초기화 — 다음 학생을 기다립니다');
        return true;
      }
      if (e.code === 'F1') { e.preventDefault(); this.helpOpen = !this.helpOpen; return true; }
      if (e.code === 'F2') { e.preventDefault(); this.jumpOpen = true; return true; }
      if (e.code === 'F3') {
        e.preventDefault();
        var p = S.State.togglePause();
        this.say(p ? '타이머 일시정지' : '타이머 재개');
        return true;
      }
      if (e.code === 'F4') {
        e.preventDefault();
        if (S.Text) { S.Text.pickFile(); this.say('텍스트 JSON 선택'); }
        return true;
      }
      if (e.code === 'KeyM') {
        var m = S.Audio.toggleMute();
        this.say(m ? '음소거 ON' : '음소거 OFF');
        return true;
      }
      if (this.helpOpen) { this.helpOpen = false; return true; }
      return false;
    },

    _jump: function (ch) {
      S.State.chapter = ch;
      if (!S.State.running) S.State.reset();
      if (ch === 1) S.Game.transition('field', { map: 'village' });
      else if (ch === 2) S.Game.transition('field', { map: 'workshop' });
      else S.Game.transition('field', { map: 'hubroom' });
      this.say('챕터 ' + ch + '로 이동');
    },

    draw: function (r) {
      var C = S.C;

      if (this.toastT > 0) {
        this.toastT -= 1 / 60;
        var w = r.textWidth(this.toast, 10) + 16;
        r.window(S.W - w - 6, 6, w, 20, { alpha: 0.9 });
        r.text(this.toast, S.W - w + 2, 11, { size: 10, color: C.textHi });
      }

      if (this.jumpOpen) {
        r.fade(0.55);
        var bw = 200, bh = 96, bx = (S.W - bw) / 2, by = (S.H - bh) / 2;
        r.window(bx, by, bw, bh);
        r.text('챕터 점프', bx + bw / 2, by + 10, { size: 12, color: C.textHi, align: 'center' });
        r.text('1 — 허브 마을', bx + 22, by + 32, { size: 12 });
        r.text('2 — 조립 공방', bx + 22, by + 50, { size: 12 });
        r.text('3 — 해체의 방', bx + 22, by + 68, { size: 12 });
        return;
      }

      if (this.helpOpen) {
        r.fade(0.6);
        var w2 = 300, h2 = 222, x2 = (S.W - w2) / 2, y2 = (S.H - h2) / 2;
        r.window(x2, y2, w2, h2);
        r.text('조 작 법', x2 + w2 / 2, y2 + 10, { size: 14, color: C.textHi, align: 'center' });
        var rows = [
          ['방향키 / WASD', '이동'],
          ['Z · Space · Enter', '말 걸기 / 확인'],
          ['X · Esc', '취소 / 메뉴'],
          ['마우스', '선택 · 버튼'],
          ['Q / E', '가이드 이전 / 다음'],
          ['', ''],
          ['Ctrl+R', '다음 학생 (초기화)'],
          ['F2', '챕터 점프'],
          ['F3', '타이머 일시정지'],
          ['F4', '텍스트 JSON 불러오기'],
          ['M', '음소거']
        ];
        for (var i = 0; i < rows.length; i++) {
          var yy = y2 + 34 + i * 16;
          r.text(rows[i][0], x2 + 20, yy, { size: 11, color: C.textHi });
          r.text(rows[i][1], x2 + 150, yy, { size: 11, color: C.text });
        }
        r.text('아무 키나 눌러 닫기', x2 + w2 / 2, y2 + h2 - 16,
          { size: 10, color: C.textDim, align: 'center' });
      }
    }
  };
})(SPIKE);
