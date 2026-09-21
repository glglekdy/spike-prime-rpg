/* ============================================================
 *  SPIKE.Audio — WebAudio 8bit 합성 (외부 파일 0)
 *  BGM: 간단한 스텝 시퀀서 (리드 + 베이스)
 *  SE : 원샷 톤 / 노이즈
 * ============================================================ */
(function (S) {
  'use strict';

  var NOTE = { 'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11 };

  function freq(name) {
    if (!name || name === '-') return 0;
    var m = /^([A-G]#?)(\d)$/.exec(name);
    if (!m) return 0;
    var n = NOTE[m[1]] + (parseInt(m[2], 10) + 1) * 12;
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  var Audio = S.Audio = {
    ctx: null,
    master: null,
    muted: false,
    _bgm: null,
    _timer: null,
    _step: 0,

    init: function () {
      if (this.ctx) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    },

    /* 브라우저 자동재생 정책: 첫 사용자 입력에서 호출 */
    resume: function () {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    toggleMute: function () {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
      return this.muted;
    },

    /* ---------- 단발음 ---------- */
    tone: function (f, dur, type, vol, slideTo) {
      if (!this.ctx || this.muted || !f) return;
      var t = this.ctx.currentTime;
      var o = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(f, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol == null ? 0.25 : vol, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    },

    noise: function (dur, vol, hp) {
      if (!this.ctx || this.muted) return;
      var t = this.ctx.currentTime;
      var len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = this.ctx.createBufferSource();
      src.buffer = buf;
      var g = this.ctx.createGain();
      g.gain.value = vol == null ? 0.2 : vol;
      var f = this.ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = hp || 800;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t);
    },

    /* ---------- 효과음 프리셋 ---------- */
    se: function (name) {
      switch (name) {
        case 'cursor':  this.tone(880, 0.05, 'square', 0.14); break;
        case 'ok':      this.tone(660, 0.06, 'square', 0.18);
                        setTimeout(function(){ Audio.tone(990, 0.09, 'square', 0.18); }, 55); break;
        case 'cancel':  this.tone(330, 0.09, 'square', 0.16); break;
        case 'text':    this.tone(1400, 0.015, 'square', 0.045); break;
        case 'correct': [784, 988, 1319].forEach(function (f, i) {
                          setTimeout(function () { Audio.tone(f, 0.12, 'square', 0.2); }, i * 70);
                        }); break;
        case 'wrong':   this.tone(200, 0.28, 'sawtooth', 0.18, 90); break;
        case 'hit':     this.noise(0.14, 0.26, 500); this.tone(160, 0.12, 'square', 0.18, 70); break;
        case 'damage':  this.tone(140, 0.2, 'sawtooth', 0.2, 60); break;
        case 'step':    this.tone(1046, 0.1, 'triangle', 0.13); break;
        case 'item':    [1046, 1318, 1568, 2093].forEach(function (f, i) {
                          setTimeout(function () { Audio.tone(f, 0.1, 'triangle', 0.18); }, i * 60);
                        }); break;
        case 'snap':    this.tone(1200, 0.04, 'square', 0.16);
                        setTimeout(function(){ Audio.tone(1600, 0.05, 'square', 0.14); }, 40); break;
        case 'page':    this.noise(0.05, 0.10, 2200);
                        this.tone(760, 0.035, 'triangle', 0.10); break;
        case 'fanfare': [523,659,784,1046,784,1046,1318].forEach(function (f, i) {
                          setTimeout(function () { Audio.tone(f, 0.22, 'square', 0.2); }, i * 130);
                        }); break;
      }
    },

    /* ---------- BGM ---------- */
    playBGM: function (track) {
      if (!this.ctx) this.init();
      if (this._bgm === track) return;
      this.stopBGM();
      var t = S.BGM && S.BGM[track];
      if (!t) return;
      this._bgm = track;
      this._step = 0;
      var self = this;
      this._timer = setInterval(function () { self._tick(t); }, t.tempo);
    },

    stopBGM: function () {
      if (this._timer) clearInterval(this._timer);
      this._timer = null;
      this._bgm = null;
    },

    _tick: function (t) {
      if (this.muted || !this.ctx) { this._step++; return; }
      var i = this._step % t.lead.length;
      var lead = t.lead[i];
      if (lead && lead !== '-') this.tone(freq(lead), t.tempo / 1000 * 0.85, 'square', 0.085);
      if (t.bass) {
        var b = t.bass[this._step % t.bass.length];
        if (b && b !== '-') this.tone(freq(b), t.tempo / 1000 * 1.6, 'triangle', 0.11);
      }
      if (t.drum) {
        var d = t.drum[this._step % t.drum.length];
        if (d === 'x') this.noise(0.05, 0.07, 3000);
        else if (d === 'o') this.tone(90, 0.1, 'sine', 0.16, 45);
      }
      this._step++;
    }
  };
})(SPIKE);
