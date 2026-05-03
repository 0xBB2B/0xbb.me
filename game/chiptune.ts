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
 * 风格：致敬《みくみくにしてあげる♪》（ika 作曲）的 8-bit 副歌改编版本。
 * A 大调、BPM 145、18 小节单次播放（loops=1），总时长约 29.8 秒。
 *
 * 仍延续"纯 Web Audio 实时合成、零外部音频资产"的策略——只重新编排音符，
 * 不嵌入任何原曲采样，避免版权风险。
 *
 * 18 小节布局：
 *   bar 1-4:  副歌段 1，主题陈述（4 句歌词，每句 1 小节）
 *   bar 5-8:  副歌段 2，重复段 1 加深印象
 *   bar 9-12: 副歌段 3，每拍中插 16 分颤音装饰，作为高潮变奏
 *   bar 13-16: 副歌段 4，回归段 1 准备收尾
 *   bar 17-18: 尾奏，hook 短暂再现并落到主音 A
 *
 * 副歌每小节对应一句歌词（"Ageru" 等收尾合并为单音），8 个 8 分音符占满 16 步：
 *   bar 1: ミ-ク ミ-ク に シ-テ Ageru
 *   bar 2: 歌-を 歌-わ せ-て Ageru（上行强化）
 *   bar 3: ミ-ク ミ-ク に シ-テ Yanyo（推到 F#6 高点）
 *   bar 4: 戸-ま-ど-う く-ら-い-に（下行收束）
 *
 * 和弦进行（每小节一个根音）：A - E - F#m - D，循环 4 段，尾奏落 A。
 */
export function createSoundtrack(): SoundTrack {
  // 音名转 MIDI，再转频率。
  const n = (midi: number) => midiToFreq(midi);

  // 副歌段 1：4 小节主题。每个音节占 2 步（8 分音符），共 8 音/小节。
  // bar 1 (A): "Mi-Ku Mi-Ku ni Shi-Te Ageru"——A5/A5 重复 → C#6/C#6 抬升 → 高点 E6 后下行 D6-C#6-B5
  const phrase1A: StepEvent[] = [
    n(81), null, n(81), null, n(85), null, n(85), null, n(88), null, n(86), null, n(85), null, n(83), null,
  ];
  // bar 2 (E): "U-Ta wo U-Ta-Wa Se-Te Ageru"——逐级上行 A5→B5→C#6→D6 推到 E6 后回落 A5
  const phrase1B: StepEvent[] = [
    n(81), null, n(83), null, n(85), null, n(86), null, n(88), null, n(86), null, n(85), null, n(81), null,
  ];
  // bar 3 (F#m): "Mi-Ku Mi-Ku ni Shi-Te Yanyo"——hook 推到 F#6 后阶梯下行 E6-D6-C#6
  const phrase1C: StepEvent[] = [
    n(81), null, n(81), null, n(85), null, n(85), null, n(90), null, n(88), null, n(86), null, n(85), null,
  ];
  // bar 4 (D): "To-Ma-Do-U Ku-Ra-I Ni"——大段下行 B5-A5-G#5-F#5-E5 经 F#5 解决到 A5
  const phrase1D: StepEvent[] = [
    n(83), null, n(81), null, n(80), null, n(78), null, n(76), null, n(78), null, n(81), null, null, null,
  ];

  // 副歌段 3 装饰版：在主音之间插入小 2 度颤音，制造萝莉跳跃的 16 分音色密度。
  // bar 9 (A): hook 加颤音 A5↔B5、C#6↔D6
  const phrase3A: StepEvent[] = [
    n(81), n(83), n(81), n(83), n(85), n(86), n(85), n(86), n(88), null, n(86), null, n(85), null, n(83), null,
  ];
  // bar 10 (E): 同样在前半段加颤音密度
  const phrase3B: StepEvent[] = [
    n(81), n(83), n(85), n(83), n(85), n(86), n(85), n(86), n(88), null, n(86), null, n(85), null, n(81), null,
  ];
  // bar 11 (F#m): 高潮，推到 F#6 后用颤音回落
  const phrase3C: StepEvent[] = [
    n(81), n(83), n(81), n(83), n(85), n(86), n(85), n(86), n(90), n(88), n(88), null, n(86), null, n(85), null,
  ];
  // bar 12 (D): 与 phrase1D 相同的下行收束
  const phrase3D: StepEvent[] = [
    n(83), null, n(81), null, n(80), null, n(78), null, n(76), null, n(78), null, n(81), null, null, null,
  ];

  // 尾奏 2 小节：hook 一闪 → 长 A 主音收尾
  // bar 17: A5-A5 短促打点 + C#6 装饰，模拟"miku miku" 余韵
  const outroA: StepEvent[] = [
    n(81), null, null, null, n(81), null, null, null, n(85), null, null, null, n(85), null, null, null,
  ];
  // bar 18: A5 长音落底，留出 BGM 自然淡出空隙
  const outroB: StepEvent[] = [
    n(81), null, null, null, n(76), null, null, null, n(81), null, null, null, null, null, null, null,
  ];

  const lead: StepEvent[] = [
    // 段 1: 主题陈述
    ...phrase1A, ...phrase1B, ...phrase1C, ...phrase1D,
    // 段 2: 主题加深（与段 1 完全相同）
    ...phrase1A, ...phrase1B, ...phrase1C, ...phrase1D,
    // 段 3: 装饰高潮
    ...phrase3A, ...phrase3B, ...phrase3C, ...phrase3D,
    // 段 4: 主题回归（与段 1 完全相同）
    ...phrase1A, ...phrase1B, ...phrase1C, ...phrase1D,
    // 尾奏
    ...outroA, ...outroB,
  ];

  // 低音——每小节按"根-五-根-五"打四拍，跟随和弦行走。
  // 4 段副歌共用同一组和弦：A - E - F#m - D。
  const bassA: StepEvent[] = [ // A: A2-E3-A2-E3
    n(45), null, null, null, n(52), null, null, null, n(45), null, null, null, n(52), null, null, null,
  ];
  const bassE: StepEvent[] = [ // E: E2-B2-E2-B2
    n(40), null, null, null, n(47), null, null, null, n(40), null, null, null, n(47), null, null, null,
  ];
  const bassFsm: StepEvent[] = [ // F#m: F#2-C#3-F#2-C#3
    n(42), null, null, null, n(49), null, null, null, n(42), null, null, null, n(49), null, null, null,
  ];
  const bassD: StepEvent[] = [ // D: D2-A2-D2-A2
    n(38), null, null, null, n(45), null, null, null, n(38), null, null, null, n(45), null, null, null,
  ];
  // 尾奏 bass：bar 17 走 A，bar 18 落 A 长音
  const bassOutroA: StepEvent[] = [
    n(45), null, null, null, n(52), null, null, null, n(45), null, null, null, n(45), null, null, null,
  ];
  const bassOutroB: StepEvent[] = [
    n(45), null, null, null, null, null, null, null, n(45), null, null, null, null, null, null, null,
  ];

  const bass: StepEvent[] = [
    // 段 1
    ...bassA, ...bassE, ...bassFsm, ...bassD,
    // 段 2
    ...bassA, ...bassE, ...bassFsm, ...bassD,
    // 段 3
    ...bassA, ...bassE, ...bassFsm, ...bassD,
    // 段 4
    ...bassA, ...bassE, ...bassFsm, ...bassD,
    // 尾奏
    ...bassOutroA, ...bassOutroB,
  ];

  // 踩镲——每个 8 分音符敲一次（用一个高频方波模拟），覆盖全部 18 小节。
  const hatStep: StepEvent[] = [];
  for (let i = 0; i < 16; i += 1) {
    // 偶数步打主拍稍重，奇数步休止。
    hatStep.push(i % 2 === 0 ? n(96) : null);
  }
  const hat: StepEvent[] = [];
  for (let i = 0; i < 18; i += 1) {
    hat.push(...hatStep);
  }

  return {
    bpm: 145,
    stepsPerBar: 16,
    tracks: { lead, bass, hat },
    // 单次播放，不循环——18 小节 × 145 BPM ≈ 29.8 秒。
    loops: 1,
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
