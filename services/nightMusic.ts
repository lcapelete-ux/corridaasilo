// Trilha sonora da página inicial — synthwave noturno gerado em tempo real
// com Web Audio API. Sem arquivos externos e sem direitos autorais: o som é
// sintetizado no navegador (batida 4x4, baixo grave, arpejos e pad).

const BPM = 112;
const STEPS_PER_BAR = 16; // semicolcheias
const BARS = 4;
const TOTAL_STEPS = STEPS_PER_BAR * BARS;
const STEP_DUR = 60 / BPM / 4;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;

// Progressão: Am | F | C | G (uma por compasso), semitons relativos ao Lá
const CHORDS = [
  { bass: 0, tones: [0, 3, 7, 12] },   // Am
  { bass: -4, tones: [-4, 0, 3, 8] },  // F
  { bass: 3, tones: [3, 7, 10, 15] },  // C
  { bass: -2, tones: [-2, 2, 5, 10] }, // G
];

const BASS_ROOT_HZ = 55;  // A1
const ARP_ROOT_HZ = 220;  // A3
const semi = (base: number, s: number) => base * Math.pow(2, s / 12);

class NightMusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private out: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private arpBus: GainNode | null = null;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private playing = false;
  private gestureHandler: (() => void) | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctx();

      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.out = this.ctx.createDynamicsCompressor();
      this.master.connect(this.out);
      this.out.connect(this.ctx.destination);

      // Ruído branco compartilhado (bateria)
      const len = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      // Eco do arpejo (colcheia pontuada), pro clima "neon"
      this.arpBus = this.ctx.createGain();
      this.arpBus.gain.value = 1;
      const delay = this.ctx.createDelay(1);
      delay.delayTime.value = STEP_DUR * 6;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.3;
      const wet = this.ctx.createGain();
      wet.gain.value = 0.25;
      this.arpBus.connect(this.master);
      this.arpBus.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(wet);
      wet.connect(this.master);
    }
    return this.ctx;
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.11);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    osc.connect(g);
    g.connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  private clap(t: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    src.connect(bp); bp.connect(g); g.connect(this.master!);
    src.start(t);
    src.stop(t + 0.18);
  }

  private hat(t: number, accent: boolean) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(accent ? 0.14 : 0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    src.connect(hp); hp.connect(g); g.connect(this.master!);
    src.start(t);
    src.stop(t + 0.05);
  }

  private bass(t: number, freq: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(420, t);
    lp.frequency.exponentialRampToValueAtTime(140, t + STEP_DUR * 1.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.34, t);
    g.gain.exponentialRampToValueAtTime(0.02, t + STEP_DUR * 1.8);
    osc.connect(lp); lp.connect(g); g.connect(this.master!);
    osc.start(t);
    osc.stop(t + STEP_DUR * 2);
  }

  private arp(t: number, freq: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.085, t);
    g.gain.exponentialRampToValueAtTime(0.002, t + STEP_DUR * 0.9);
    osc.connect(lp); lp.connect(g); g.connect(this.arpBus!);
    osc.start(t);
    osc.stop(t + STEP_DUR);
  }

  private pad(t: number, rootFreq: number) {
    const ctx = this.ctx!;
    const barDur = STEP_DUR * STEPS_PER_BAR;
    [0.994, 1.006].forEach(detune => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = rootFreq * 2 * detune;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 750;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + barDur * 0.3);
      g.gain.linearRampToValueAtTime(0.0001, t + barDur);
      osc.connect(lp); lp.connect(g); g.connect(this.master!);
      osc.start(t);
      osc.stop(t + barDur + 0.05);
    });
  }

  private scheduleStep(step: number, t: number) {
    const bar = Math.floor(step / STEPS_PER_BAR);
    const s = step % STEPS_PER_BAR;
    const chord = CHORDS[bar];

    if (s % 4 === 0) this.kick(t);
    if (s === 4 || s === 12) this.clap(t);
    if (s % 2 === 0) this.hat(t, s % 4 === 2);
    if (s % 2 === 0) {
      // Pulso de colcheias no baixo, com oitava acima no fim do compasso
      const up = s === 14 ? 12 : 0;
      this.bass(t, semi(BASS_ROOT_HZ, chord.bass + up));
    }
    // Arpejo em semicolcheias: sobe e desce os tons do acorde
    const pattern = [0, 1, 2, 3, 2, 1];
    const tone = chord.tones[pattern[s % pattern.length]];
    this.arp(t, semi(ARP_ROOT_HZ, tone));

    if (s === 0) this.pad(t, semi(BASS_ROOT_HZ, chord.bass));
  }

  private tick = () => {
    const ctx = this.ctx!;
    while (this.nextTime < ctx.currentTime + SCHEDULE_AHEAD) {
      this.scheduleStep(this.step, this.nextTime);
      this.nextTime += STEP_DUR;
      this.step = (this.step + 1) % TOTAL_STEPS;
    }
  };

  /** Destrava o áudio (navegadores exigem um toque antes de tocar som).
   *  resume() sem gesto pode ficar pendente para sempre — corre contra um timeout. */
  async unlock(): Promise<boolean> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await Promise.race([
        ctx.resume().catch(() => {}),
        new Promise(res => setTimeout(res, 250)),
      ]);
    }
    return ctx.state === 'running';
  }

  /** Bipe da contagem regressiva: 3/2/1 curtos, largada longa e uma oitava acima. */
  countBeep(final = false) {
    const ctx = this.ensureContext();
    if (ctx.state !== 'running' || !this.out) return;
    const t = ctx.currentTime + 0.01;
    const dur = final ? 0.65 : 0.16;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = final ? 880 : 440;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(final ? 0.34 : 0.26, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(lp); lp.connect(g); g.connect(this.out);
    osc.start(t);
    osc.stop(t + dur + 0.02);

    if (final) {
      // Camada extra na largada: quinta acima, pra soar épico
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 1318.5;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.14, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc2.connect(g2);
      g2.connect(this.out);
      osc2.start(t);
      osc2.stop(t + dur + 0.02);
    }
  }

  /** Tenta tocar. Retorna false se o navegador bloqueou (precisa de um toque). */
  async start(): Promise<boolean> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await Promise.race([
        ctx.resume().catch(() => {}),
        new Promise(res => setTimeout(res, 250)),
      ]);
    }
    if (ctx.state !== 'running') return false;
    if (this.playing) return true;

    this.playing = true;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.06;
    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.master!.gain.exponentialRampToValueAtTime(0.62, ctx.currentTime + 0.12);
    this.timer = window.setInterval(this.tick, LOOKAHEAD_MS);
    return true;
  }

  /** Toca agora; se o navegador bloquear, começa sozinho no primeiro toque. */
  requestStart() {
    this.start().then(ok => {
      if (ok || this.gestureHandler) return;
      const handler = () => {
        this.start().then(started => {
          if (started) this.cancelPendingStart();
        });
      };
      this.gestureHandler = handler;
      window.addEventListener('pointerdown', handler);
      window.addEventListener('keydown', handler);
      window.addEventListener('touchend', handler);
    });
  }

  cancelPendingStart() {
    if (this.gestureHandler) {
      window.removeEventListener('pointerdown', this.gestureHandler);
      window.removeEventListener('keydown', this.gestureHandler);
      window.removeEventListener('touchend', this.gestureHandler);
      this.gestureHandler = null;
    }
  }

  stop() {
    this.cancelPendingStart();
    if (!this.playing) return;
    this.playing = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ctx && this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(Math.max(this.master.gain.value, 0.0001), t);
      this.master.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    }
  }

  isPlaying() {
    return this.playing;
  }
}

// Singleton: uma única instância para toda a aplicação
export const nightMusic = new NightMusicEngine();
