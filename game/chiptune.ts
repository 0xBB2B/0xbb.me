/**
 * 8-bit 风格 BGM/SFX 实时合成器。
 *
 * 不引入任何外部音频资产，全部使用 Web Audio API 的 OscillatorNode + GainNode
 * 即时合成，避免版权风险。
 *
 * 核心思路：
 *   - lead/bass 用方波或三角波承载主旋律与低音；
 *   - hat 用短促白噪声模拟踩镲；
 *   - 通过一个 lookahead 调度循环（默认 25ms）把未来 100ms 内的音符
 *     提前 schedule 到 audioContext，避免音准抖动；
 *   - 每个 voice 对应一段 step 序列，循环若干小节直到曲目结束。
 */

// 序列单步——null 表示该步休止。
export type StepEvent = number | null;

// voice 配置：决定波形与音量。
export interface VoiceDescriptor {
  type: OscillatorType;
  gain: number;
  // 单个音符相对小节内的衰减比例，范围 0..1。
  decay: number;
}

// 当前实现支持的三个轨道。
export type TrackName = 'lead' | 'bass' | 'hat';

// 频率或 null 序列。
export type Track = StepEvent[];

// 完整曲目描述。
export interface SoundTrack {
  bpm: number;
  // 每个小节的步数（建议 16 = 16 分音符）。
  stepsPerBar: number;
  // 各 voice 的序列，长度需为 stepsPerBar 的整数倍。
  tracks: Record<TrackName, Track>;
  // 整首循环多少次（决定总时长）。
  loops: number;
}

// 钢琴键转频率：MIDI 中央 A4=440Hz, midiNumber=69。
function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

const VOICES: Record<TrackName, VoiceDescriptor> = {
  lead: { type: 'square', gain: 0.18, decay: 0.65 },
  bass: { type: 'triangle', gain: 0.32, decay: 0.85 },
  hat: { type: 'square', gain: 0.06, decay: 0.18 },
};

/**
 * createSoundtrack 返回内置 demo BGM。
 *
 * 风格：紫粉电子游戏机感的 8-bit lo-fi，BPM 132，4 拍 × 8 小节循环 4 次，
 * 总时长约 58 秒。
 */
export function createSoundtrack(): SoundTrack {
  // 音名转 MIDI，再转频率。
  const n = (midi: number) => midiToFreq(midi);

  // 一小节 16 步（16 分音符），共 8 小节循环。
  // 主旋律——D 小调感的电子游戏机骨架。
  const lead: StepEvent[] = [
    // bar 1: D5 - F5 - A5 - F5 / D5 - F5 - A5 - C6
    n(74), null, n(77), null, n(81), null, n(77), null, n(74), null, n(77), null, n(81), null, n(84), null,
    // bar 2: A5 - F5 - D5 - F5 / E5 - C5 ...
    n(81), null, n(77), null, n(74), null, n(77), null, n(76), null, n(72), null, n(74), null, null, null,
    // bar 3: D5 - A5 - C6 - A5 / B5 - G5 - A5 - F5
    n(74), null, n(81), null, n(84), null, n(81), null, n(83), null, n(79), null, n(81), null, n(77), null,
    // bar 4: D5 long - F5 - A5
    n(74), null, null, null, null, null, n(77), null, n(81), null, null, null, null, null, null, null,
    // bar 5: F5 - A5 - D6 - A5
    n(77), null, n(81), null, n(86), null, n(81), null, n(77), null, n(81), null, n(86), null, n(89), null,
    // bar 6: A5 - F5 - D5 ramp
    n(81), null, n(77), null, n(74), null, n(72), null, n(74), null, n(77), null, n(81), null, null, null,
    // bar 7: build up
    n(83), null, n(81), null, n(79), null, n(77), null, n(76), null, n(74), null, n(72), null, n(74), null,
    // bar 8: resolve
    n(74), null, null, null, n(77), null, null, null, n(81), null, null, null, n(74), null, null, null,
  ];

  // 低音——四分音符根音。
  const bass: StepEvent[] = [
    n(38), null, null, null, n(38), null, null, null, n(38), null, null, null, n(45), null, null, null,
    n(43), null, null, null, n(43), null, null, null, n(40), null, null, null, n(40), null, null, null,
    n(38), null, null, null, n(38), null, null, null, n(45), null, null, null, n(43), null, null, null,
    n(38), null, null, null, n(38), null, null, null, n(38), null, null, null, n(38), null, null, null,
    n(41), null, null, null, n(41), null, null, null, n(38), null, null, null, n(45), null, null, null,
    n(43), null, null, null, n(43), null, null, null, n(40), null, null, null, n(38), null, null, null,
    n(40), null, null, null, n(40), null, null, null, n(38), null, null, null, n(36), null, null, null,
    n(38), null, null, null, n(38), null, null, null, n(38), null, null, null, n(38), null, null, null,
  ];

  // 踩镲——每个 8 分音符敲一次（用一个高频方波模拟）。
  const hatStep: StepEvent[] = [];
  for (let i = 0; i < 16; i += 1) {
    // 偶数步打主拍稍重，奇数步休止。
    hatStep.push(i % 2 === 0 ? n(96) : null);
  }
  const hat: StepEvent[] = [];
  for (let i = 0; i < 8; i += 1) {
    hat.push(...hatStep);
  }

  return {
    bpm: 132,
    stepsPerBar: 16,
    tracks: { lead, bass, hat },
    loops: 4,
  };
}

/**
 * stepDurationMs 计算单步（最小音符）的时长。
 */
export function stepDurationMs(track: SoundTrack): number {
  // 每拍 = 60_000 / bpm；4 步 = 1 拍（按 16 分音符），所以单步 = 拍 / 4。
  const beatMs = 60_000 / track.bpm;
  const stepsPerBeat = track.stepsPerBar / 4;
  return beatMs / stepsPerBeat;
}

/**
 * trackDurationMs 计算曲目总时长。
 */
export function trackDurationMs(track: SoundTrack): number {
  const totalSteps = track.tracks.lead.length * track.loops;
  return totalSteps * stepDurationMs(track);
}

/**
 * ChiptuneEngine 封装 Web Audio 实时合成。
 *
 * 用法：
 *   const engine = new ChiptuneEngine();
 *   await engine.resume();
 *   engine.startTrack(createSoundtrack());
 *   ...
 *   engine.stop();
 */
export class ChiptuneEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private startedAt = 0;
  private schedulerId: number | null = null;
  private nextStep = 0;
  private active: SoundTrack | null = null;

  /**
   * resume 创建 AudioContext 并解除浏览器自动播放限制。
   */
  async resume(): Promise<void> {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.45;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * startTrack 从头开始播放给定曲目。
   */
  startTrack(track: SoundTrack): void {
    if (!this.ctx) {
      return;
    }
    this.stop();
    this.active = track;
    this.startedAt = this.ctx.currentTime;
    this.nextStep = 0;
    this.tick();
  }

  /**
   * stop 立即停止当前调度循环，已 schedule 的音符仍会自然衰减完毕。
   */
  stop(): void {
    if (this.schedulerId !== null) {
      window.clearTimeout(this.schedulerId);
      this.schedulerId = null;
    }
    this.active = null;
  }

  /**
   * dispose 关闭 AudioContext，释放硬件资源。
   */
  dispose(): void {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }

  /**
   * elapsedMs 返回相对 startTrack 的播放时长，用于和谱面 Note.time 对齐。
   */
  elapsedMs(): number {
    if (!this.ctx) {
      return 0;
    }
    return (this.ctx.currentTime - this.startedAt) * 1000;
  }

  /**
   * isPlaying 表示当前是否有曲目在播放。
   */
  isPlaying(): boolean {
    return this.active !== null;
  }

  /**
   * playCutSfx 在当前时间播放一段切击音效。
   */
  playCutSfx(): void {
    if (!this.ctx || !this.master) {
      return;
    }
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * playMissSfx 在当前时间播放一段失误提示音。
   */
  playMissSfx(): void {
    if (!this.ctx || !this.master) {
      return;
    }
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(70, t + 0.18);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  // 调度循环：每 25ms 检查未来 120ms 内的音符并提前提交到 audioContext。
  private tick(): void {
    if (!this.ctx || !this.master || !this.active) {
      return;
    }
    const lookaheadMs = 120;
    const stepMs = stepDurationMs(this.active);
    const stepSec = stepMs / 1000;
    const nowSec = this.ctx.currentTime;
    const totalSteps = this.active.tracks.lead.length * this.active.loops;

    while (this.nextStep < totalSteps) {
      const stepTimeSec = this.startedAt + this.nextStep * stepSec;
      if ((stepTimeSec - nowSec) * 1000 > lookaheadMs) {
        break;
      }
      this.scheduleStep(this.nextStep, stepTimeSec, stepSec);
      this.nextStep += 1;
    }

    if (this.nextStep >= totalSteps) {
      this.active = null;
      return;
    }

    this.schedulerId = window.setTimeout(() => this.tick(), 25);
  }

  private scheduleStep(stepIndex: number, atSec: number, stepSec: number): void {
    if (!this.ctx || !this.master || !this.active) {
      return;
    }
    const barLen = this.active.tracks.lead.length;
    const localIndex = stepIndex % barLen;
    (Object.keys(this.active.tracks) as TrackName[]).forEach((name) => {
      const value = this.active!.tracks[name][localIndex];
      if (value === null || value === undefined) {
        return;
      }
      this.scheduleNote(name, value, atSec, stepSec);
    });
  }

  private scheduleNote(
    track: TrackName,
    freq: number,
    atSec: number,
    stepSec: number,
  ): void {
    if (!this.ctx || !this.master) {
      return;
    }
    const voice = VOICES[track];
    const osc = this.ctx.createOscillator();
    osc.type = voice.type;
    osc.frequency.setValueAtTime(freq, atSec);

    const gain = this.ctx.createGain();
    const peak = voice.gain;
    const sustain = stepSec * voice.decay;
    gain.gain.setValueAtTime(0.0001, atSec);
    gain.gain.exponentialRampToValueAtTime(peak, atSec + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, atSec + sustain);

    osc.connect(gain).connect(this.master);
    osc.start(atSec);
    osc.stop(atSec + sustain + 0.02);
  }
}
