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

const FX_VOLUME_KEY = 'aow-fx-volume';
const MUSIC_VOLUME_KEY = 'aow-music-volume';
/** The old single slider, used once so existing players keep their setting. */
const LEGACY_VOLUME_KEY = 'aow-volume';
const DEFAULT_VOLUME = 0.7;
/** Effects loudness at a full FX slider. The slider scales this. */
const FX_LEVEL = 0.18;
const MUSIC_FADE_SECONDS = 0.8;
const MUSIC_DIR = `${import.meta.env.BASE_URL}music/`;

/**
 * Each mode is a playlist. One track loops; several tracks play in shuffled order, one after another.
 * `level` is how loud that playlist is at a full music slider. The lobby is louder than in-game music.
 */
const MUSIC_MODES = {
  lobby: { tracks: ['Lobby-song.ogg'], level: 0.55 },
  game: { tracks: ['sang1.ogg', 'sang2.ogg', 'sang3.ogg', 'sang4.ogg', 'sang5.ogg'], level: 0.3 },
} as const;
export type MusicMode = keyof typeof MUSIC_MODES;

interface PlayingMusic {
  mode: MusicMode;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

function loadVolume(key: string): number {
  const raw = localStorage.getItem(key) ?? localStorage.getItem(LEGACY_VOLUME_KEY);
  const stored = Number(raw);
  return raw !== null && Number.isFinite(stored) ? Math.min(1, Math.max(0, stored)) : DEFAULT_VOLUME;
}

/** Squared so the slider feels even: halfway is about a quarter of the power. */
const curve = (v: number) => v * v;

export class Sound {
  muted = localStorage.getItem(MUTE_KEY) === '1';
  fxVolume = loadVolume(FX_VOLUME_KEY);
  musicVolume = loadVolume(MUSIC_VOLUME_KEY);
  private ctx: AudioContext | null = null;
  /** Effects bus, scaled by the FX slider. */
  private fxBus: GainNode | null = null;
  /** Music bus, scaled by the music slider. Track fades happen before this. */
  private musicBus: GainNode | null = null;
  /** Mute sits after both buses. */
  private out: GainNode | null = null;
  private lastPlayed = new Map<string, number>();
  private wantedMusic: MusicMode | null = null;
  private playingMusic: PlayingMusic | null = null;
  /** Compressed files only; decoded audio is large, so it is decoded when needed and then released. */
  private downloads = new Map<string, Promise<ArrayBuffer | null>>();
  private brokenTracks = new Set<string>();
  /** Remaining tracks in the current shuffle, next one last. */
  private bag: string[] = [];
  private lastTrack = '';

  constructor() {
    // Start downloading early; decoding has to wait for the audio context.
    this.download(MUSIC_MODES.lobby.tracks[0]);
  }

  private download(file: string): Promise<ArrayBuffer | null> {
    let d = this.downloads.get(file);
    if (!d) {
      d = fetch(MUSIC_DIR + file)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null);
      this.downloads.set(file, d);
    }
    return d;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    this.applyVolume();
    return this.muted;
  }

  setFxVolume(value: number): void {
    this.fxVolume = Math.min(1, Math.max(0, value));
    localStorage.setItem(FX_VOLUME_KEY, String(this.fxVolume));
    this.applyVolume();
  }

  setMusicVolume(value: number): void {
    this.musicVolume = Math.min(1, Math.max(0, value));
    localStorage.setItem(MUSIC_VOLUME_KEY, String(this.musicVolume));
    this.applyVolume();
  }

  /** Must be called from a user gesture before the browser allows audio. */
  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.out = this.ctx.createGain();
      this.out.connect(this.ctx.destination);
      this.fxBus = this.ctx.createGain();
      this.fxBus.connect(this.out);
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.out);
      this.applyVolume(true);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    this.syncMusic();
  }

  /** Sets which music should be playing (or none). Starts after the first user gesture. */
  setMusic(mode: MusicMode | null): void {
    this.wantedMusic = mode;
    this.syncMusic();
  }

  private applyVolume(immediate = false): void {
    if (!this.ctx || !this.out || !this.fxBus || !this.musicBus) return;
    const now = this.ctx.currentTime;
    const set = (node: GainNode, value: number) => {
      if (immediate) node.gain.setValueAtTime(value, now);
      else node.gain.setTargetAtTime(value, now, 0.02);
    };
    set(this.out, this.muted ? 0 : 1);
    set(this.fxBus, FX_LEVEL * curve(this.fxVolume));
    set(this.musicBus, curve(this.musicVolume));
  }

  private async decodeMusic(file: string): Promise<AudioBuffer | null> {
    const raw = await this.download(file);
    if (!raw) return null;
    try {
      // decodeAudioData consumes its input, so give it a copy and keep the download for later reuse.
      return await this.ctx!.decodeAudioData(raw.slice(0));
    } catch (e) {
      console.warn(`Could not decode music "${file}" (unsupported format in this browser?)`, e);
      return null;
    }
  }

  /** Picks the next file for a mode: shuffled order, never the same track twice in a row. */
  private nextTrack(mode: MusicMode): string | null {
    const tracks: string[] = MUSIC_MODES[mode].tracks.filter((t) => !this.brokenTracks.has(t));
    if (tracks.length === 0) return null;
    if (tracks.length === 1) return tracks[0];
    this.bag = this.bag.filter((t) => tracks.includes(t));
    if (this.bag.length === 0) {
      this.bag = [...tracks];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
      // The next pick is the last element, so keep it from repeating the song that just played.
      if (this.bag[this.bag.length - 1] === this.lastTrack) this.bag.unshift(this.bag.pop()!);
    }
    return this.bag.pop()!;
  }

  private syncMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.out) return;
    const wanted = this.wantedMusic;
    const current = this.playingMusic;
    if (current && current.mode === wanted) return;

    if (current) {
      const now = ctx.currentTime;
      current.gain.gain.cancelScheduledValues(now);
      current.gain.gain.setValueAtTime(current.gain.gain.value, now);
      current.gain.gain.linearRampToValueAtTime(0, now + MUSIC_FADE_SECONDS);
      current.source.stop(now + MUSIC_FADE_SECONDS + 0.05);
      this.playingMusic = null;
    }
    this.bag = [];
    if (wanted) void this.playNext(wanted);
  }

  private async playNext(mode: MusicMode): Promise<void> {
    const ctx = this.ctx;
    const file = this.nextTrack(mode);
    if (!ctx || !this.musicBus || !file) return;

    const buffer = await this.decodeMusic(file);
    // The wanted mode may have changed (or another start won the race) while this was loading.
    if (this.wantedMusic !== mode || this.playingMusic) return;
    if (!buffer) {
      this.brokenTracks.add(file);
      return this.playNext(mode); // try another track; stops once none are left
    }

    const def = MUSIC_MODES[mode];
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = def.tracks.length === 1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(def.level, now + MUSIC_FADE_SECONDS);
    source.connect(gain).connect(this.musicBus);
    source.onended = () => {
      // Only a track that finished by itself moves on; faded-out tracks were already replaced.
      if (this.playingMusic?.source !== source) return;
      this.playingMusic = null;
      void this.playNext(mode);
    };
    source.start();
    this.playingMusic = { mode, source, gain };
    this.lastTrack = file;

    // Warm the cache so the next song starts without a pause.
    const upcoming = this.bag[this.bag.length - 1];
    if (upcoming) void this.download(upcoming);
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
    osc.connect(gain).connect(this.fxBus!);
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
    src.connect(filter).connect(gain).connect(this.fxBus!);
    src.start(t);
  }
}
