import type { GameEvent, PlayerId } from '@aow/shared';

const MUTE_KEY = 'aow-muted';
const MIN_INTERVAL_MS: Partial<Record<GameEvent['type'], number>> = {
  attack: 70,
  baseHit: 150,
  turretFire: 90,
  explosion: 60,
  death: 50,
};

type Wave = OscillatorType;

export class Sound {
  muted = localStorage.getItem(MUTE_KEY) === '1';
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private lastPlayed = new Map<string, number>();

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    return this.muted;
  }

  /** Must be called from a user gesture before the browser allows audio. */
  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  play(events: GameEvent[], myId: PlayerId): void {
    if (this.muted || !this.ctx) return;
    for (const e of events) {
      const minGap = MIN_INTERVAL_MS[e.type];
      if (minGap) {
        const now = performance.now();
        if (now - (this.lastPlayed.get(e.type) ?? 0) < minGap) continue;
        this.lastPlayed.set(e.type, now);
      }
      const mine = 'owner' in e && e.owner === myId;
      switch (e.type) {
        case 'spawn':
          if (mine) this.tone(520, 0.06, 'square', 0.4);
          break;
        case 'attack':
          if (e.ranged) this.tone(900, 0.03, 'triangle', 0.25);
          else this.noise(0.05, 0.3, 900);
          break;
        case 'turretFire':
          this.tone(300, 0.05, 'sawtooth', 0.2);
          break;
        case 'death':
          this.tone(mine ? 160 : 240, 0.15, 'sawtooth', 0.35, mine ? 80 : 120);
          break;
        case 'explosion':
          this.noise(0.3, 0.6, 400);
          break;
        case 'baseHit':
          if (mine) this.tone(110, 0.1, 'square', 0.3);
          break;
        case 'build':
          if (mine) this.tone(700, 0.08, 'triangle', 0.5, 1000);
          break;
        case 'evolve':
          [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.6, f, i * 0.11));
          break;
        case 'special':
          this.tone(800, 0.8, 'sawtooth', 0.35, 120);
          break;
        case 'gameOver': {
          const won = e.winner === myId;
          const notes = won ? [523, 659, 784, 1047] : [440, 370, 311, 262];
          notes.forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.7, f, i * 0.2));
          break;
        }
      }
    }
  }

  private tone(freq: number, dur: number, wave: Wave, vol: number, endFreq = freq, delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, cutoff: number): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(this.master!);
    src.start(t);
  }
}
