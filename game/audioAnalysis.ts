/**
 * 音频节拍分析：从振幅包络中估算 BPM、首拍偏移与 onset 列表。
 *
 * 设计分为两层：
 *   - analyzeOnsets：纯函数，输入预先算好的振幅包络数组，输出节拍信息。
 *     不依赖任何 Web Audio API，便于在 bun:test 中用合成数据回归。
 *   - analyzeAudioBuffer：浏览器侧适配层，用 OfflineAudioContext +
 *     BiquadFilter（低通突出 kick drum）把 AudioBuffer 转为低通包络，
 *     再交给 analyzeOnsets。
 *
 * 算法核心：
 *   1. onset 强度 = max(0, env[i] − env[i−1])，标记振幅突增点；
 *   2. 候选峰 = onset 上的局部极大值（高于 75 分位阈值、最小间距 0.4 拍）；
 *   3. BPM 通过对 onset 序列做自相关在 60–220 BPM 区间扫描得出；
 *   4. 首拍偏移 = 候选峰列表中第一个的时间。
 */

/**
 * OnsetAnalysis 是 analyzeOnsets 的输出契约。
 *
 * - bpm: 自相关给出的最优 BPM（浮点 0.1 精度），全静音时回落到 DEFAULT_BPM；
 * - offsetMs: 首个被识别为强拍的 onset 在原音频中的时间（毫秒）；
 * - onsetTimesMs: 所有候选强拍的时间列表，按升序，可用于 onset-driven 谱面。
 */
export interface OnsetAnalysis {
  bpm: number;
  offsetMs: number;
  onsetTimesMs: number[];
}

const DEFAULT_BPM = 120;

/**
 * analyzeOnsets 从振幅包络中提取 BPM、首拍偏移与 onset 列表。
 *
 * @param envelope 时域振幅包络，每项一帧（典型来自 RMS 或低通后的整流幅度）
 * @param framesPerSecond envelope 的帧率，即每秒多少帧
 */
export function analyzeOnsets(
  envelope: Float32Array,
  framesPerSecond: number,
): OnsetAnalysis {
  if (envelope.length < 4 || framesPerSecond <= 0) {
    return { bpm: DEFAULT_BPM, offsetMs: 0, onsetTimesMs: [] };
  }

  // 步骤 1：计算 onset 强度（正向差分）。
  const onset = new Float32Array(envelope.length - 1);
  let onsetMax = 0;
  for (let i = 1; i < envelope.length; i += 1) {
    const v = envelope[i] - envelope[i - 1];
    const positive = v > 0 ? v : 0;
    onset[i - 1] = positive;
    if (positive > onsetMax) {
      onsetMax = positive;
    }
  }
  if (onsetMax === 0) {
    return { bpm: DEFAULT_BPM, offsetMs: 0, onsetTimesMs: [] };
  }

  // 步骤 2：自相关扫描 BPM。先估一个粗 BPM 用于决定峰值最小间距。
  const bpm = findBestBpm(onset, framesPerSecond);

  // 步骤 3：找局部峰，阈值 = max(75 分位, 30% × onset 峰值)，最小间距 = 0.4 拍。
  // 后半项保证在噪声底很低时不被无关小波动污染——只有显著突破整段 onset
  // 最大值一定比例的局部极大值才会被收录。
  const beatPeriodFrames = (framesPerSecond * 60) / bpm;
  const minGap = Math.max(2, Math.floor(beatPeriodFrames * 0.4));
  const threshold = Math.max(percentile(onset, 0.75), onsetMax * 0.3);
  const peaks = findPeaks(onset, threshold, minGap);

  const onsetTimesMs = peaks.map((idx) => ((idx + 1) / framesPerSecond) * 1000);
  const offsetMs = onsetTimesMs.length > 0 ? onsetTimesMs[0] : 0;

  return { bpm, offsetMs, onsetTimesMs };
}

/**
 * findBestBpm 在 60–220 BPM 区间用 0.1 BPM 步长扫描，返回自相关分数最高的值。
 *
 * 使用线性插值的浮点 lag 自相关，避免整数 lag 在相邻 BPM 上聚类。
 */
function findBestBpm(onset: Float32Array, framesPerSecond: number): number {
  let bestBpm = DEFAULT_BPM;
  let bestScore = -Infinity;
  for (let bpm10 = 600; bpm10 <= 2200; bpm10 += 1) {
    const bpm = bpm10 / 10;
    const lag = (framesPerSecond * 60) / bpm;
    const score = autocorrelation(onset, lag);
    if (score > bestScore) {
      bestScore = score;
      bestBpm = bpm;
    }
  }
  return bestBpm;
}

/**
 * autocorrelation 用浮点 lag + 线性插值计算 onset 序列的自相关分数。
 */
function autocorrelation(onset: Float32Array, lag: number): number {
  const lagLow = Math.floor(lag);
  const frac = lag - lagLow;
  const lagHigh = lagLow + 1;
  const n = onset.length - lagHigh;
  if (n <= 0) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const interp = onset[i + lagLow] * (1 - frac) + onset[i + lagHigh] * frac;
    sum += onset[i] * interp;
  }
  return sum / n;
}

/**
 * findPeaks 找出大于 threshold 的局部极大值，相邻峰的最小帧距由 minGap 限制。
 */
function findPeaks(onset: Float32Array, threshold: number, minGap: number): number[] {
  const peaks: number[] = [];
  for (let i = 1; i < onset.length - 1; i += 1) {
    const v = onset[i];
    if (v < threshold) {
      continue;
    }
    if (v < onset[i - 1] || v < onset[i + 1]) {
      continue;
    }
    if (peaks.length > 0 && i - peaks[peaks.length - 1] < minGap) {
      // 当前峰离上一个太近，仅当更强时替换。
      if (v > onset[peaks[peaks.length - 1]]) {
        peaks[peaks.length - 1] = i;
      }
      continue;
    }
    peaks.push(i);
  }
  return peaks;
}

/**
 * percentile 取数组的 q 分位（0..1），用于 onset 阈值估计。
 */
function percentile(arr: Float32Array, q: number): number {
  if (arr.length === 0) {
    return 0;
  }
  const sorted = Array.from(arr).sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * q));
  return sorted[idx];
}

/**
 * analyzeAudioBuffer 是浏览器侧的入口：用 OfflineAudioContext + BiquadFilter
 * 把 AudioBuffer 转为低通后的 RMS 包络，再交给 analyzeOnsets。
 *
 * 低通截止 200 Hz 用来突出 kick drum 主拍、抑制 hi-hat 等高频假阳性，
 * 让 onset 检测对应到节奏感最强的鼓点。
 */
export async function analyzeAudioBuffer(buffer: AudioBuffer): Promise<OnsetAnalysis> {
  const OfflineCtx = window.OfflineAudioContext
    ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!OfflineCtx) {
    throw new Error('OfflineAudioContext not available in this environment');
  }

  const offlineCtx = new OfflineCtx(1, buffer.length, buffer.sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  const lowpass = offlineCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 200;
  lowpass.Q.value = 0.7;

  source.connect(lowpass).connect(offlineCtx.destination);
  source.start();

  const filtered = await offlineCtx.startRendering();
  const channel = filtered.getChannelData(0);
  const sampleRate = filtered.sampleRate;

  // RMS 包络：每 1024 采样一帧（≈ 23ms @ 44.1 kHz、21ms @ 48 kHz），
  // 兼顾时间分辨率与计算量。
  const windowSize = 1024;
  const frameCount = Math.floor(channel.length / windowSize);
  const envelope = new Float32Array(frameCount);
  for (let f = 0; f < frameCount; f += 1) {
    let sumSq = 0;
    const base = f * windowSize;
    for (let k = 0; k < windowSize; k += 1) {
      const s = channel[base + k];
      sumSq += s * s;
    }
    envelope[f] = Math.sqrt(sumSq / windowSize);
  }

  const framesPerSecond = sampleRate / windowSize;
  return analyzeOnsets(envelope, framesPerSecond);
}
