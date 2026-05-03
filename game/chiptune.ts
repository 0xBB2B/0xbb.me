/**
 * 游戏音频引擎：BGM 走外部音频文件 + SFX 用 Web Audio 实时合成。
 *
 * 设计：
 *   - BGM 通过 fetch + decodeAudioData 加载一段已经裁剪好的 ogg/mp3，
 *     播放时挂到 AudioBufferSourceNode 上，自带 fade-in/fade-out gain
 *     envelope，避免衔接生硬；
 *   - 切击 / MISS 提示音仍用 OscillatorNode + GainNode 即时合成，
 *     无需额外资源、延迟极低，适合实时反馈；
 *   - BGM 与 SFX 共用同一个 AudioContext 与 master gain，简化生命周期。
 *
 * 该模块只负责播放，音频文件本身的版权由调用方/资源提供方对外承担。
 */

const BGM_FADE_IN_SEC = 0.3;
const BGM_FADE_OUT_SEC = 0.5;
const BGM_PEAK_GAIN = 0.45;

/**
 * ChiptuneEngine 封装游戏内全部音频职责：
 *   - 异步加载并播放外部 BGM 片段（loadBgm + startBgm）；
 *   - 实时合成切击 / MISS 提示音（playCutSfx / playMissSfx）；
 *   - 通过 elapsedMs 暴露 BGM 启动至今的时间，供谱面拍点对齐。
 *
 * 用法：
 *   const engine = new ChiptuneEngine();
 *   await engine.loadBgm('/music.ogg');   // 可在挂载阶段提前预热
 *   await engine.resume();                // 用户点击后解锁 AudioContext
 *   engine.startBgm();                    // 开始播放 BGM
 *   ...
 *   engine.stop();
 *   engine.dispose();
 */
export class ChiptuneEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmBuffer: AudioBuffer | null = null;
  private bgmSource: AudioBufferSourceNode | null = null;
  private bgmFadeGain: GainNode | null = null;
  private bgmStartedAt = 0;
  private bgmActive = false;

  /**
   * ensureContext 确保 AudioContext 已创建（即使仍处于 suspended 状态）。
   * decodeAudioData 在 suspended 状态下也能工作，所以加载 BGM 不必等用户点击。
   */
  private ensureContext(): void {
    if (this.ctx) {
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.ctx.destination);
  }

  /**
   * resume 解除浏览器自动播放限制，必须由用户交互回调中调用。
   */
  async resume(): Promise<void> {
    this.ensureContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * loadBgm 异步加载并解码外部音频文件，返回后 startBgm 可立即播放。
   * 多次调用以最后一次为准——会覆盖前一段缓冲区。
   */
  async loadBgm(url: string): Promise<void> {
    this.ensureContext();
    if (!this.ctx) {
      return;
    }
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`failed to load BGM: ${res.status} ${res.statusText}`);
    }
    const arr = await res.arrayBuffer();
    this.bgmBuffer = await this.ctx.decodeAudioData(arr);
  }

  /**
   * startBgm 从头开始播放当前 BGM 缓冲区，叠加 fade-in/fade-out envelope。
   * 若未先 loadBgm 则直接 no-op，便于谱面在缺音频时降级。
   */
  startBgm(): void {
    if (!this.ctx || !this.master || !this.bgmBuffer) {
      return;
    }
    this.stop();

    const source = this.ctx.createBufferSource();
    source.buffer = this.bgmBuffer;

    const fade = this.ctx.createGain();
    const t = this.ctx.currentTime;
    const dur = this.bgmBuffer.duration;
    fade.gain.setValueAtTime(0.0001, t);
    fade.gain.exponentialRampToValueAtTime(BGM_PEAK_GAIN, t + BGM_FADE_IN_SEC);
    fade.gain.setValueAtTime(BGM_PEAK_GAIN, t + Math.max(BGM_FADE_IN_SEC, dur - BGM_FADE_OUT_SEC));
    fade.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    source.connect(fade).connect(this.master);
    source.onended = () => {
      this.bgmActive = false;
    };
    source.start(t);

    this.bgmSource = source;
    this.bgmFadeGain = fade;
    this.bgmStartedAt = t;
    this.bgmActive = true;
  }

  /**
   * stop 立即停止当前 BGM；已 schedule 的 SFX 仍会自然衰减完毕。
   */
  stop(): void {
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
      } catch {
        // 已经 stop 过则忽略 InvalidStateError
      }
      try {
        this.bgmSource.disconnect();
      } catch {
        // disconnect 失败同样忽略
      }
      this.bgmSource = null;
    }
    if (this.bgmFadeGain) {
      try {
        this.bgmFadeGain.disconnect();
      } catch {
        // ignore
      }
      this.bgmFadeGain = null;
    }
    this.bgmActive = false;
  }

  /**
   * dispose 关闭 AudioContext，释放硬件资源。
   */
  dispose(): void {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.bgmBuffer = null;
  }

  /**
   * elapsedMs 返回相对 startBgm 的播放时长，用于和谱面 Note.time 对齐。
   * BGM 自然结束后 ctx.currentTime 仍在推进，所以判定时间轴可以越过曲终。
   */
  elapsedMs(): number {
    if (!this.ctx) {
      return 0;
    }
    return (this.ctx.currentTime - this.bgmStartedAt) * 1000;
  }

  /**
   * isPlaying 表示当前 BGM source 是否仍在 schedule 内。
   * 自然结束（onended）或主动 stop 后转为 false。
   */
  isPlaying(): boolean {
    return this.bgmActive;
  }

  /**
   * hasBgm 表示 BGM 缓冲区是否已加载完毕，可立即 startBgm。
   */
  hasBgm(): boolean {
    return this.bgmBuffer !== null;
  }

  /**
   * getBgmBuffer 暴露已解码的 AudioBuffer，供节拍分析等下游消费者使用。
   * 未加载时返回 null，调用方需先 await loadBgm。
   */
  getBgmBuffer(): AudioBuffer | null {
    return this.bgmBuffer;
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
}
