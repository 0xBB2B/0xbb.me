import * as THREE from 'three';
import React, { useEffect, useRef, useState } from 'react';
import { ChiptuneEngine } from '../../game/chiptune';
import { BGM_URL, createDemoChart, createOnsetChart } from '../../game/chart';
import { analyzeAudioBuffer } from '../../game/audioAnalysis';

/**
 * BgmAnalysis 是 BeatSaberGame 内部缓存的 BGM 分析结果。
 *
 * - 当 onsetTimesMs.length 足够多时，谱面走 createOnsetChart：方块严格
 *   贴每个检测到的鼓点，不假设音乐严格匀速；
 * - 不够多 / 分析失败时，走 createDemoChart 用 bpm/offsetMs 兜底。
 */
interface BgmAnalysis {
  bpm: number;
  offsetMs: number;
  durationMs: number;
  onsetTimesMs: number[];
}

const ONSET_DRIVEN_MIN_COUNT = 16;
import { findHitTarget } from '../../game/judge';
import {
  accuracy,
  applyJudgement,
  createInitialStats,
  rankFor,
  type GameStats,
  type Rank,
} from '../../game/scoring';
import type { BeatChart, CutDirection, Hand, Judgement, Note } from '../../game/types';
import {
  HAND_COLOR,
  LANE_X,
  NOTE_Y,
  PAST_Z,
  computeNoteZ,
  createEnvironment,
  createNoteMesh,
  createSaber,
} from './sceneAssets';

// 键盘 → 手 / 切击方向映射：左手 WASD（紫剑），右手 IJKL（青剑）。
const KEY_MAP: Record<string, [Hand, CutDirection]> = {
  KeyW: ['L', 'U'],
  KeyA: ['L', 'L'],
  KeyS: ['L', 'D'],
  KeyD: ['L', 'R'],
  KeyI: ['R', 'U'],
  KeyJ: ['R', 'L'],
  KeyK: ['R', 'D'],
  KeyL: ['R', 'R'],
};

// 单次切击尝试时，找方块允许的"已经过判定线但还没飞远"的容错。
const POST_JUDGE_GRACE_MS = 0;

// 方块未被击中、超过这段时间后视为 MISS（与 judge.goodMs 同步）。
const MISS_THRESHOLD_MS = 130;

interface NoteEntry {
  note: Note;
  mesh: THREE.Mesh | null;
  status: 'pending' | 'active' | 'cleared' | 'missed';
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  ttl: number;
}

// 单次挥剑动画的总时长（毫秒）。
const SWING_DURATION_MS = 280;

interface SaberFlash {
  // 闪烁剩余时间（毫秒）；>0 时光剑放大并提亮。
  remainingMs: number;
  // 摆动方向：屏幕空间归一化向量，用于轻微旋转。
  swingX: number;
  swingY: number;
}

// 状态机：'lv999' 是仅在全连（FULL COMBO）时插入的特效阶段，
// 持续 LV999_DURATION_MS 后会自动转入 'finished' 显示结算。
type GameStatus = 'idle' | 'playing' | 'lv999' | 'finished';

interface UISnapshot extends GameStats {
  status: GameStatus;
  elapsedMs: number;
  durationMs: number;
  lastJudgement: Judgement | null;
  lastJudgementAt: number;
}

// LV.999 全连特效持续时长（毫秒）。
const LV999_DURATION_MS = 2600;

const DIRECTION_VECTORS: Record<CutDirection, [number, number]> = {
  U: [0, 1],
  D: [0, -1],
  L: [-1, 0],
  R: [1, 0],
  UL: [-1, 1],
  UR: [1, 1],
  DL: [-1, -1],
  DR: [1, -1],
  A: [0, 0],
};

function buildInitialSnapshot(durationMs: number): UISnapshot {
  return {
    ...createInitialStats(),
    status: 'idle',
    elapsedMs: 0,
    durationMs,
    lastJudgement: null,
    lastJudgementAt: 0,
  };
}

/**
 * BeatSaberGame 渲染 3D 双手节奏光剑游戏。
 *
 * 与 ChiptuneEngine 强耦合：BGM 起拍、谱面拍点、判定时间轴共用同一时钟。
 * 双手输入通过键盘映射为左手 WASD（紫剑红块）+ 右手方向键（青剑蓝块）。
 */
export const BeatSaberGame: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sabersRef = useRef<{ L: THREE.Group; R: THREE.Group } | null>(null);
  const saberFlashRef = useRef<{ L: SaberFlash; R: SaberFlash }>({
    L: { remainingMs: 0, swingX: 0, swingY: 0 },
    R: { remainingMs: 0, swingX: 0, swingY: 0 },
  });
  const particlesRef = useRef<Particle[]>([]);
  const notesRef = useRef<NoteEntry[]>([]);
  const statsRef = useRef<GameStats>(createInitialStats());
  const lastJudgementRef = useRef<{ kind: Judgement | null; at: number }>({
    kind: null,
    at: 0,
  });
  const frameRef = useRef<number | null>(null);
  const engineRef = useRef<ChiptuneEngine | null>(null);
  const startedAtRef = useRef<number>(0);
  // hasStartedRef = true 当且仅当 BGM source 已经 source.start() 过。
  // 用于区分两种 engine.isPlaying() === false 场景：START 前还在 await
  // resume / loadBgm（要把 elapsedMs 钳为 0），与 BGM 自然结束（要让
  // 时间继续推进以触发 finished 判定）。
  const hasStartedRef = useRef<boolean>(false);
  const statusRef = useRef<UISnapshot['status']>('idle');
  const lastFrameMsRef = useRef<number>(0);
  // LV.999 全连特效起始时刻（rAF 时间），用来判断是否到达切换结算的窗口。
  const lv999StartedAtRef = useRef<number>(0);
  // 浏览器侧 onset 分析结果，挂载阶段加载 BGM 后自动填充。
  // null 表示尚未分析（START 前还在加载，或音频解码 / 分析失败）；
  // 非空时 START 优先走 onset-driven 谱面，方块严格对齐实际鼓点；
  // onset 不足 ONSET_DRIVEN_MIN_COUNT 时退化到 BPM 均匀谱面。
  const analysisRef = useRef<BgmAnalysis | null>(null);
  // 谱面放在 ref 里，每次 START 会调 createDemoChart() 重抽方向，
  // 让玩家每局看到的方向序列都不一样。曲目时长 / 标题保持稳定。
  const chartRef = useRef<BeatChart>(createDemoChart());
  // 把初始谱面同步到 notesRef，避免组件第一帧没有任何方块状态。
  if (notesRef.current.length === 0) {
    notesRef.current = chartRef.current.notes.map((note) => ({
      note,
      mesh: null,
      status: 'pending',
    }));
  }

  const [snapshot, setSnapshot] = useState<UISnapshot>(() =>
    buildInitialSnapshot(chartRef.current.durationMs),
  );

  // three.js 场景挂载与卸载。
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 360;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06031a);
    scene.fog = new THREE.Fog(0x06031a, 6, 26);
    scene.add(createEnvironment());

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 80);
    camera.position.set(0, 1.6, 4.6);
    camera.lookAt(0, 1.2, -8);

    // 双手光剑——挂在隐形的"肩膀 pivot"下。挥砍时旋转的是 pivot，
    // 不是剑本身：剑柄会以肩膀为圆心公转，模拟人体从肩膀甩动手臂的运动学，
    // 而不是绕剑柄原地拧动。saber 在 pivot 局部坐标里偏移到原剑柄世界
    // 位置，默认静止姿态与改动前完全一致。
    const leftShoulder = new THREE.Group();
    leftShoulder.position.set(-0.3, 1.45, 4.2);
    const leftSaber = createSaber('L');
    leftSaber.position.set(-0.25, -0.5, -0.8);
    leftSaber.rotation.set(-0.18, 0.05, 0.18);
    leftShoulder.add(leftSaber);
    scene.add(leftShoulder);

    const rightShoulder = new THREE.Group();
    rightShoulder.position.set(0.3, 1.45, 4.2);
    const rightSaber = createSaber('R');
    rightSaber.position.set(0.25, -0.5, -0.8);
    rightSaber.rotation.set(-0.18, -0.05, -0.18);
    rightShoulder.add(rightSaber);
    scene.add(rightShoulder);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    sabersRef.current = { L: leftShoulder, R: rightShoulder };

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) {
        return;
      }
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      sabersRef.current = null;
    };
  }, []);

  // 主循环 + 输入。
  useEffect(() => {
    const engine = new ChiptuneEngine();
    engineRef.current = engine;
    // 提前 fetch / decode BGM 并跑 onset 分析：
    //   - decodeAudioData 在 AudioContext suspended 状态下也能工作；
    //   - 分析在 OfflineAudioContext 里跑，与播放上下文独立；
    //   - 分析完成前 timingRef = null，createDemoChart 走 BGM_* 常量兜底，
    //     游戏仍可在分析失败 / 慢网下退化为静态 timing。
    void (async () => {
      try {
        await engine.loadBgm(BGM_URL);
        const buffer = engine.getBgmBuffer();
        if (!buffer) {
          return;
        }
        const analysis = await analyzeAudioBuffer(buffer);
        analysisRef.current = {
          bpm: analysis.bpm,
          offsetMs: analysis.offsetMs,
          durationMs: buffer.duration * 1000,
          onsetTimesMs: analysis.onsetTimesMs,
        };
        // eslint-disable-next-line no-console
        console.info(
          `[BGM] BPM=${analysis.bpm.toFixed(1)} offset=${analysis.offsetMs.toFixed(0)}ms `
            + `duration=${(buffer.duration).toFixed(2)}s onsets=${analysis.onsetTimesMs.length}`,
        );
      } catch (err) {
        console.error('failed to preload / analyze BGM', err);
      }
    })();

    const handleKeyDown = (event: KeyboardEvent) => {
      const mapping = KEY_MAP[event.code];
      if (!mapping) {
        return;
      }
      event.preventDefault();
      if (statusRef.current !== 'playing') {
        return;
      }

      const [hand, direction] = mapping;
      handleSwing(hand, direction);
    };

    /**
     * handleSwing 处理一次玩家挥剑：找出最匹配的方块判定，更新 stats。
     */
    const handleSwing = (hand: Hand, direction: CutDirection) => {
      const engineNow = engine.elapsedMs();
      flashSaber(hand, direction);

      const activeNotes = notesRef.current
        .filter((entry) => entry.status === 'active')
        .map((entry) => entry.note);
      const targetIndex = findHitTarget(activeNotes, {
        hand,
        direction,
        hitAt: engineNow,
      });

      if (targetIndex < 0) {
        // 挥空——不扣分但播放 miss SFX，提示玩家。
        engine.playMissSfx();
        return;
      }

      const targetNote = activeNotes[targetIndex];
      const entry = notesRef.current.find((e) => e.note === targetNote);
      if (!entry || entry.status !== 'active') {
        return;
      }

      const delta = Math.abs(engineNow - targetNote.time);
      const judgement: Judgement = delta <= 60 ? 'PERFECT' : 'GOOD';

      statsRef.current = applyJudgement(statsRef.current, judgement);
      lastJudgementRef.current = { kind: judgement, at: engineNow };
      entry.status = 'cleared';
      if (entry.mesh) {
        spawnExplosion(entry.mesh.position, hand);
        sceneRef.current?.remove(entry.mesh);
        disposeMesh(entry.mesh);
        entry.mesh = null;
      }
      engine.playCutSfx();
    };

    /**
     * flashSaber 触发对应手光剑的高亮闪烁与挥砍弧线。
     */
    const flashSaber = (hand: Hand, direction: CutDirection) => {
      const flash = saberFlashRef.current[hand];
      const [vx, vy] = DIRECTION_VECTORS[direction] ?? [0, 0];
      flash.remainingMs = SWING_DURATION_MS;
      flash.swingX = vx;
      flash.swingY = vy;
    };

    /**
     * spawnExplosion 在指定位置喷射一组紫粉粒子。
     */
    const spawnExplosion = (origin: THREE.Vector3, hand: Hand) => {
      const scene = sceneRef.current;
      if (!scene) {
        return;
      }
      const color = HAND_COLOR[hand];
      const accent = hand === 'L' ? 0xff4fd8 : 0x66e0ff;
      const count = 14;
      for (let i = 0; i < count; i += 1) {
        const size = 0.08 + Math.random() * 0.12;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(size, size, size),
          new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? color : accent,
            transparent: true,
            opacity: 1,
          }),
        );
        mesh.position.copy(origin);
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        const upward = 1 + Math.random() * 3;
        const velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          upward,
          (Math.random() - 0.5) * 2,
        );
        scene.add(mesh);
        particlesRef.current.push({
          mesh,
          velocity,
          life: 600,
          ttl: 600,
        });
      }
    };

    /**
     * tick 是逐帧驱动的主循环。
     */
    const tick = (frameTime: number) => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (!renderer || !scene || !camera) {
        return;
      }

      const dt = Math.min(frameTime - lastFrameMsRef.current, 64);
      lastFrameMsRef.current = frameTime;

      // engine.elapsedMs() 用 AudioContext.currentTime - startedAt，BGM 自然
      // 结束后 ctx.currentTime 仍在前进，依然能给出有意义的时间。所以只用
      // hasStartedRef 区分"是否已点过 START"即可，不要再用 isPlaying 卡。
      const elapsedMs = hasStartedRef.current ? engine.elapsedMs() : 0;

      // BGM 实际开播前不要让方块"先出生"，否则 GAME START 一按下方块会
      // 直接出现在飞行半路上，伴随时间轴对齐错乱。
      if (statusRef.current === 'playing' && hasStartedRef.current) {
        updateNotes(elapsedMs);
      }
      updateSabers(dt);
      updateParticles(dt);

      renderer.render(scene, camera);

      if (statusRef.current === 'playing') {
        const lastNoteTime = chartRef.current.notes[chartRef.current.notes.length - 1]?.time ?? 0;
        const isFinished = hasStartedRef.current && elapsedMs > lastNoteTime + MISS_THRESHOLD_MS + 800;
        if (isFinished) {
          engine.stop();
          // 把仍在场景里的方块全部清掉，避免飞过判定线后还停在屏幕上。
          notesRef.current.forEach((entry) => {
            if (entry.mesh && sceneRef.current) {
              sceneRef.current.remove(entry.mesh);
              disposeMesh(entry.mesh);
              entry.mesh = null;
            }
          });

          // 全连判定：miss=0 且至少切过一块。命中则先进入 LV.999 特效阶段，
          // 否则直接进入结算。
          const finalStats = statsRef.current;
          const fullCombo = finalStats.miss === 0 && finalStats.total > 0;
          if (fullCombo) {
            statusRef.current = 'lv999';
            lv999StartedAtRef.current = frameTime;
            // 三连切击 SFX 当作"达成"提示，让特效不至于完全静音。
            engine.playCutSfx();
            window.setTimeout(() => engine.playCutSfx(), 120);
            window.setTimeout(() => engine.playCutSfx(), 280);
          } else {
            statusRef.current = 'finished';
          }
        }
        const last = lastJudgementRef.current;
        const stats = statsRef.current;
        setSnapshot({
          ...stats,
          status: statusRef.current,
          elapsedMs,
          durationMs: chartRef.current.durationMs,
          lastJudgement: last.kind,
          lastJudgementAt: last.at,
        });
      } else if (statusRef.current === 'lv999') {
        if (frameTime - lv999StartedAtRef.current > LV999_DURATION_MS) {
          statusRef.current = 'finished';
        }
        const last = lastJudgementRef.current;
        const stats = statsRef.current;
        setSnapshot((prev) => ({
          ...prev,
          ...stats,
          status: statusRef.current,
          elapsedMs: chartRef.current.durationMs,
          lastJudgement: last.kind,
          lastJudgementAt: last.at,
        }));
      } else if (statusRef.current === 'finished') {
        const last = lastJudgementRef.current;
        const stats = statsRef.current;
        setSnapshot((prev) => ({
          ...prev,
          ...stats,
          status: 'finished',
          elapsedMs: chartRef.current.durationMs,
          lastJudgement: last.kind,
          lastJudgementAt: last.at,
        }));
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    /**
     * updateNotes 推进每个方块的状态机：spawn → active → missed/cleared。
     *
     * MISS 后方块不会立刻消失：它会在原 X/Y 上轻微下坠并染红渐隐，
     * 同时继续沿 Z 飞过相机后被回收，避免出现"卡在屏幕中央"的死方块。
     */
    const updateNotes = (elapsedMs: number) => {
      const scene = sceneRef.current;
      if (!scene) {
        return;
      }
      let missedThisFrame = 0;

      notesRef.current.forEach((entry) => {
        const visibleStart = entry.note.time - chartRef.current.approachMs;
        if (entry.status === 'pending' && elapsedMs >= visibleStart) {
          const mesh = createNoteMesh(entry.note.hand, entry.note.cut);
          mesh.position.set(LANE_X[entry.note.lane], NOTE_Y, 0);
          scene.add(mesh);
          entry.mesh = mesh;
          entry.status = 'active';
        }

        if (entry.status === 'active' && entry.mesh) {
          const z = computeNoteZ(entry.note.time, elapsedMs, chartRef.current.approachMs);
          entry.mesh.position.z = z;
          entry.mesh.rotation.x = -0.05;

          // 飞越判定线 + 容错时间后未被切：标记为 MISS 并启动退场动画。
          const overshoot = elapsedMs - entry.note.time;
          if (overshoot > MISS_THRESHOLD_MS + POST_JUDGE_GRACE_MS) {
            entry.status = 'missed';
            statsRef.current = applyJudgement(statsRef.current, 'MISS');
            lastJudgementRef.current = { kind: 'MISS', at: elapsedMs };
            missedThisFrame += 1;
            paintMissed(entry.mesh);
          }
        }

        if (entry.status === 'missed' && entry.mesh) {
          // MISS 退场：继续沿 Z 飞、同时下坠 + 渐隐。
          const z = computeNoteZ(entry.note.time, elapsedMs, chartRef.current.approachMs);
          entry.mesh.position.z = z;
          const overshoot = Math.max(elapsedMs - entry.note.time - MISS_THRESHOLD_MS, 0);
          const dropSeconds = overshoot / 1000;
          entry.mesh.position.y = NOTE_Y - 1.2 * dropSeconds * dropSeconds * 6;
          entry.mesh.rotation.x += 0.12;
          entry.mesh.rotation.z += 0.08;
          fadeMissed(entry.mesh, overshoot);

          // 离场或彻底透明后回收。
          if (z > PAST_Z || overshoot > 700 || entry.mesh.position.y < -2) {
            scene.remove(entry.mesh);
            disposeMesh(entry.mesh);
            entry.mesh = null;
          }
        }
      });

      if (missedThisFrame > 0) {
        engine.playMissSfx();
      }
    };

    /**
     * updateSabers 平滑光剑挥砍弧线、回弹到默认姿态。
     *
     * sabersRef 存放的是"肩膀 pivot"，光剑作为子节点偏挂在剑柄位置。
     * 挥砍时旋转 pivot，剑柄+剑尖整体绕肩膀公转：
     *   - 上下挥（swingY） → 绕 pivot X 轴：手臂从下抬到上 / 从上劈到下。
     *   - 左右挥（swingX） → 绕 pivot Y 轴：手臂从内甩到外 / 从外收到内。
     * 这模拟人挥剑时以肩膀为圆心带动整条手臂，而不是仅在腕部转动剑柄。
     *
     * phase 走三角形脉冲：前 30% 蓄力上升至顶点，后 70% 回拉。顶点处
     * 角度可达 1.6 rad（约 92°），配合 pivot 沿 -Z 方向的轻微前送
     * 与等比放大，形成"出剑—收手"的冲刺感剑光轨迹。
     */
    const updateSabers = (dt: number) => {
      const sabers = sabersRef.current;
      if (!sabers) {
        return;
      }
      (['L', 'R'] as Hand[]).forEach((hand) => {
        const pivot = sabers[hand];
        const flash = saberFlashRef.current[hand];
        // 肩膀 pivot 默认锚点：左右肩对称，比剑柄略高、略向相机靠拢。
        const baseX = hand === 'L' ? -0.3 : 0.3;
        const baseY = 1.45;
        const baseZ = 4.2;
        const baseScale = 1;

        if (flash.remainingMs > 0) {
          flash.remainingMs -= dt;
          const remaining = Math.max(flash.remainingMs, 0) / SWING_DURATION_MS;
          const progress = 1 - remaining;
          const phase = progress < 0.3
            ? progress / 0.3
            : Math.max(0, 1 - (progress - 0.3) / 0.7);

          const arc = 1.6 * phase;
          // 上挥（swingY=+1）→ pivot 绕 X 轴正向转：剑柄连同剑尖向上划弧。
          pivot.rotation.x = flash.swingY * arc;
          // 右挥（swingX=+1）→ pivot 绕 Y 轴负向转：剑柄连同剑尖向 +X 划弧。
          pivot.rotation.y = -flash.swingX * arc;
          pivot.rotation.z = 0;
          // 肩膀整体略向前送，强化"冲刺"动量；不再叠加 X/Y 位移，
          // 因为绕肩旋转已自动让剑柄沿挥砍方向画弧。
          pivot.position.x = baseX;
          pivot.position.y = baseY;
          pivot.position.z = baseZ - 0.35 * phase;
          const pulse = 1 + 0.18 * phase;
          pivot.scale.set(pulse, pulse, pulse);
        } else {
          pivot.rotation.x += (0 - pivot.rotation.x) * 0.2;
          pivot.rotation.y += (0 - pivot.rotation.y) * 0.2;
          pivot.rotation.z += (0 - pivot.rotation.z) * 0.2;
          pivot.position.x += (baseX - pivot.position.x) * 0.2;
          pivot.position.y += (baseY - pivot.position.y) * 0.2;
          pivot.position.z += (baseZ - pivot.position.z) * 0.2;
          const s = pivot.scale.x + (baseScale - pivot.scale.x) * 0.22;
          pivot.scale.set(s, s, s);
        }
      });
    };

    /**
     * updateParticles 更新爆裂粒子的位置、透明度并回收已死粒子。
     */
    const updateParticles = (dt: number) => {
      const scene = sceneRef.current;
      if (!scene) {
        return;
      }
      const dts = dt / 1000;
      const next: Particle[] = [];
      particlesRef.current.forEach((p) => {
        p.life -= dt;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          disposeMesh(p.mesh);
          return;
        }
        // 简单重力。
        p.velocity.y -= 8 * dts;
        p.mesh.position.x += p.velocity.x * dts;
        p.mesh.position.y += p.velocity.y * dts;
        p.mesh.position.z += p.velocity.z * dts;
        const alpha = Math.max(p.life / p.ttl, 0);
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = alpha;
        next.push(p);
      });
      particlesRef.current = next;
    };

    window.addEventListener('keydown', handleKeyDown);
    frameRef.current = requestAnimationFrame((time) => {
      lastFrameMsRef.current = time;
      tick(time);
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      engine.dispose();
      engineRef.current = null;
      // 清理还在场景里的方块。
      const scene = sceneRef.current;
      if (scene) {
        notesRef.current.forEach((entry) => {
          if (entry.mesh) {
            scene.remove(entry.mesh);
            disposeMesh(entry.mesh);
            entry.mesh = null;
          }
        });
        particlesRef.current.forEach((p) => {
          scene.remove(p.mesh);
          disposeMesh(p.mesh);
        });
        particlesRef.current = [];
      }
    };
    // 谱面与场景生命周期解耦：组件挂载一次即建立循环 / 输入监听，
    // 谱面后续在 chartRef 中替换，不再触发 effect 重建。
  }, []);

  /**
   * handleStart 由用户按下 GAME START / RETRY 按钮触发：
   * 解锁音频上下文、彻底重置场景与状态、启动曲目。
   */
  const handleStart = async () => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    // 清掉上一轮可能还挂在场景里的方块，避免重玩时残留。
    const scene = sceneRef.current;
    if (scene) {
      notesRef.current.forEach((entry) => {
        if (entry.mesh) {
          scene.remove(entry.mesh);
          disposeMesh(entry.mesh);
          entry.mesh = null;
        }
      });
      particlesRef.current.forEach((p) => {
        scene.remove(p.mesh);
        disposeMesh(p.mesh);
      });
      particlesRef.current = [];
    }

    await engine.resume();
    // 兜底：如果挂载阶段的预加载尚未完成（极端慢网），这里再 await 一次。
    if (!engine.hasBgm()) {
      try {
        await engine.loadBgm(BGM_URL);
      } catch (err) {
        console.error('failed to load BGM at start', err);
      }
    }
    // 若 BGM 已就绪但 onset 分析仍未完成（用户点 START 比分析快），同步补跑。
    if (!analysisRef.current) {
      const buffer = engine.getBgmBuffer();
      if (buffer) {
        try {
          const analysis = await analyzeAudioBuffer(buffer);
          analysisRef.current = {
            bpm: analysis.bpm,
            offsetMs: analysis.offsetMs,
            durationMs: buffer.duration * 1000,
            onsetTimesMs: analysis.onsetTimesMs,
          };
        } catch (err) {
          console.error('failed to analyze BGM at start', err);
        }
      }
    }

    // 优先 onset-driven：方块严格贴每个检测到的鼓点，避开均匀 BPM 假设
    // 在曲目中后段累积的相位漂移。onset 数量过少时退化到 BPM 均匀。
    const analysis = analysisRef.current;
    if (analysis && analysis.onsetTimesMs.length >= ONSET_DRIVEN_MIN_COUNT) {
      chartRef.current = createOnsetChart(analysis.onsetTimesMs, analysis.durationMs);
    } else {
      chartRef.current = createDemoChart(
        undefined,
        analysis
          ? { bpm: analysis.bpm, offsetMs: analysis.offsetMs, durationMs: analysis.durationMs }
          : undefined,
      );
    }
    notesRef.current = chartRef.current.notes.map((note) => ({
      note,
      mesh: null,
      status: 'pending',
    }));
    statsRef.current = createInitialStats();
    lastJudgementRef.current = { kind: null, at: 0 };
    hasStartedRef.current = false;
    statusRef.current = 'playing';
    setSnapshot({ ...buildInitialSnapshot(chartRef.current.durationMs), status: 'playing' });

    engine.startBgm();
    startedAtRef.current = performance.now();
    hasStartedRef.current = true;
  };

  return (
    <div className="relative w-full overflow-hidden bg-[#06031a]">
      <div ref={containerRef} className="relative aspect-[16/10] w-full bg-[#06031a]">
        <div className="pointer-events-none absolute inset-0 z-10">
          <HudLayer snapshot={snapshot} chartTitle={chartRef.current.title} />
        </div>

        {snapshot.status === 'idle' && (
          <PreStartOverlay onStart={handleStart} chartTitle={chartRef.current.title} />
        )}

        {snapshot.status === 'lv999' && <Lv999Overlay snapshot={snapshot} />}

        {snapshot.status === 'finished' && (
          <ResultOverlay snapshot={snapshot} chartTitle={chartRef.current.title} onRetry={handleStart} />
        )}
      </div>
    </div>
  );
};

interface HudLayerProps {
  snapshot: UISnapshot;
  chartTitle: string;
}

const HudLayer: React.FC<HudLayerProps> = ({ snapshot, chartTitle }) => {
  const progress = Math.min(snapshot.elapsedMs / snapshot.durationMs, 1);
  const flashing = snapshot.lastJudgement && snapshot.elapsedMs - snapshot.lastJudgementAt < 280;

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-0 right-0 top-0 flex items-start justify-between gap-4 px-4 py-3">
        <div>
          <div className="text-[10px] tracking-[0.32em] text-neon-pink">/// NOW PLAYING</div>
          <div className="font-cyber text-sm text-white tracking-widest">{chartTitle}</div>
          <div className="mt-2 h-[3px] w-44 max-w-[40vw] bg-[#1c1340]">
            <div
              className="h-full bg-gradient-to-r from-neon-purple via-neon-pink to-neon-cyan shadow-[0_0_10px_#ff4fd8]"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <div className="text-right font-mono">
          <div className="text-[10px] tracking-[0.3em] text-neon-cyan">SCORE</div>
          <div className="font-cyber text-2xl text-neon-yellow">{snapshot.score.toString().padStart(5, '0')}</div>
          <div className="mt-1 flex justify-end gap-3 text-[10px] text-gray-300">
            <span>
              COMBO <b className="text-neon-pink">{snapshot.combo}</b>
            </span>
            <span>
              ACC <b className="text-neon-cyan">{(accuracy(snapshot) * 100).toFixed(0)}%</b>
            </span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center">
        {flashing && snapshot.lastJudgement && (
          <div
            className={`font-cyber text-2xl tracking-[0.2em] ${judgementColor(snapshot.lastJudgement)}`}
          >
            {snapshot.lastJudgement === 'PERFECT' ? 'PERFECT!' : snapshot.lastJudgement === 'GOOD' ? 'GOOD' : 'MISS'}
          </div>
        )}
      </div>

      <div className="absolute bottom-3 left-3 text-[10px] tracking-[0.28em] text-neon-purple">
        // L_BLADE [W A S D]
      </div>
      <div className="absolute bottom-3 right-3 text-[10px] tracking-[0.28em] text-neon-cyan">
        R_BLADE [I J K L] //
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; accent: string }> = ({ label, value, accent }) => (
  <div className="border border-white/10 bg-black/40 px-2 py-1.5">
    <div className="text-[9px] tracking-[0.24em] text-gray-400 leading-none">{label}</div>
    <div className={`mt-0.5 font-cyber text-base leading-tight ${accent}`}>{value}</div>
  </div>
);

interface PreStartOverlayProps {
  onStart: () => void;
  chartTitle: string;
}

/**
 * PreStartOverlay 是首次进入游戏 / 尚未开始时的标题与说明遮罩。
 */
const PreStartOverlay: React.FC<PreStartOverlayProps> = ({ onStart, chartTitle }) => (
  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[#06031a]/85 backdrop-blur-sm">
    <div className="text-center">
      <div className="text-xs tracking-[0.4em] text-neon-pink animate-pulse">/// {chartTitle}</div>
      <div className="mt-2 font-cyber text-4xl text-white tracking-[0.16em]">RHYTHM_BLADE</div>
    </div>
    <button
      type="button"
      onClick={onStart}
      className="border-2 border-neon-pink bg-neon-panel px-8 py-3 text-sm font-bold uppercase tracking-[0.32em] text-neon-pink shadow-[0_0_30px_rgba(255,79,216,0.45)] transition-colors hover:bg-neon-pink hover:text-[#06031a]"
    >
      AHA START
    </button>
    <div className="max-w-md text-center text-[11px] text-gray-400 font-mono leading-relaxed">
      <div>
        LEFT HAND <span className="text-neon-purple">[ W A S D ]</span>
        {' / '}
        RIGHT HAND <span className="text-neon-cyan">[ I J K L ]</span>
      </div>
      <div className="mt-1 opacity-80">
        方向必须匹配方块上的箭头；紫块只能左手，青块只能右手。
      </div>
    </div>
  </div>
);

interface ResultOverlayProps {
  snapshot: UISnapshot;
  chartTitle: string;
  onRetry: () => void;
}

/**
 * ResultOverlay 是曲目结束后的「STAGE RESULT」结算画面。
 *
 * 布局严格压缩到能塞进 16:10 游戏画布内（高度约 60vw × 0.625）；
 * 容器还设了 max-h-full + overflow-y-auto 作为兜底，极端比例下也不会
 * 被上下截断。
 */
const ResultOverlay: React.FC<ResultOverlayProps> = ({ snapshot, chartTitle, onRetry }) => {
  const acc = accuracy(snapshot);
  const rank = rankFor(snapshot);
  const isFullCombo = snapshot.miss === 0 && snapshot.total > 0;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#06031a]/90 backdrop-blur-sm p-2 sm:p-3">
      <div className="pixel-frame relative w-full max-w-md max-h-full overflow-y-auto bg-[#0a0524] border-2 border-neon-purple/70 shadow-[0_0_50px_rgba(155,123,255,0.4)]">
        <div className="absolute -top-px left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />
        <div className="absolute -bottom-px left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-neon-pink to-transparent" />

        <div className="px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center justify-between text-[9px] tracking-[0.28em] text-neon-pink">
            <span>/// STAGE RESULT</span>
            <span className="text-neon-cyan animate-aha-flicker">AHA!</span>
          </div>

          <div className="mt-1 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="font-cyber text-xl sm:text-2xl text-white tracking-[0.14em] leading-tight">
                STAGE CLEARED
              </div>
              <div className="font-mono text-[10px] text-gray-500 truncate">{chartTitle}</div>
            </div>
            {isFullCombo && (
              <div className="shrink-0 border border-neon-yellow/70 bg-neon-yellow/10 px-2 py-0.5 text-[9px] tracking-[0.24em] text-neon-yellow shadow-[0_0_14px_rgba(248,255,114,0.3)]">
                FULL COMBO
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <RankBadge rank={rank} />
            <div className="flex-1 grid grid-cols-2 gap-2">
              <Stat label="SCORE" value={snapshot.score.toLocaleString()} accent="text-neon-yellow" />
              <Stat label="ACC" value={`${(acc * 100).toFixed(1)}%`} accent="text-neon-cyan" />
              <Stat label="COMBO" value={snapshot.maxCombo.toString()} accent="text-neon-pink" />
              <Stat label="TOTAL" value={snapshot.total.toString()} accent="text-white" />
            </div>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            <Stat label="PERFECT" value={snapshot.perfect.toString()} accent="text-neon-yellow" />
            <Stat label="GOOD" value={snapshot.good.toString()} accent="text-neon-cyan" />
            <Stat label="MISS" value={snapshot.miss.toString()} accent="text-red-400" />
          </div>

          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={onRetry}
              className="border-2 border-neon-pink bg-neon-panel px-6 py-2 text-xs font-bold uppercase tracking-[0.28em] text-neon-pink shadow-[0_0_24px_rgba(255,79,216,0.4)] transition-colors hover:bg-neon-pink hover:text-[#06031a]"
            >
              重新开始 / RETRY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Lv999Overlay 是全连达成后、结算画面之前的 2.6 秒高光动画。
 *
 * 视觉构成：
 *   - 半透明黑背景 + 轻微背景模糊，把 3D 场景压暗作为底色；
 *   - 三圈同心向外扩张的发光边环（紫罗兰 / 像素青 / 品红粉），用
 *     animate-ping + 错峰延迟模拟"能量震波"；
 *   - 一道纵向横线 0.18s 频率横扫整个区域，像 CRT 扫描；
 *   - 大字 LV.999：白色实体 + 像素青/品红粉两层错位描边持续抖动，
 *     整体配 lv999-pop 关键帧从 0.35 倍快速爆出后回弹落定；
 *   - 副标题 "AHA! HACK COMPLETE" 与 "FULL COMBO ATTAINED"，
 *     底部一行展示当前总分作为奖励数据。
 */
const Lv999Overlay: React.FC<{ snapshot: UISnapshot }> = ({ snapshot }) => (
  <div className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden bg-[#06031a]/85 backdrop-blur-[2px]">
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="absolute h-24 w-24 rounded-full border-2 border-neon-pink/70 animate-ping" />
      <span
        className="absolute h-48 w-48 rounded-full border-2 border-neon-cyan/55 animate-ping"
        style={{ animationDelay: '180ms' }}
      />
      <span
        className="absolute h-72 w-72 rounded-full border border-neon-purple/45 animate-ping"
        style={{ animationDelay: '360ms' }}
      />
      <span
        className="absolute h-[26rem] w-[26rem] max-h-full max-w-full rounded-full border border-neon-yellow/30 animate-ping"
        style={{ animationDelay: '540ms' }}
      />
    </div>

    <div className="pointer-events-none absolute inset-x-0 h-12 animate-lv999-sweep bg-[linear-gradient(180deg,transparent_0%,rgba(102,224,255,0.18)_45%,rgba(255,79,216,0.22)_55%,transparent_100%)]" />

    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(155,123,255,0.06)_2px,transparent_2px)] bg-[size:100%_4px] opacity-70" />

    <div className="relative animate-lv999-pop text-center">
      <div className="text-[10px] sm:text-xs tracking-[0.5em] text-neon-cyan animate-aha-flicker">
        AHA! HACK COMPLETE
      </div>
      <div className="relative mt-2 inline-block">
        <span className="absolute inset-0 font-cyber text-6xl sm:text-8xl tracking-[0.12em] text-neon-cyan opacity-80 animate-lv999-glitch">
          LV.999
        </span>
        <span
          className="absolute inset-0 font-cyber text-6xl sm:text-8xl tracking-[0.12em] text-neon-pink opacity-80 animate-lv999-glitch"
          style={{ animationDelay: '0.06s' }}
        >
          LV.999
        </span>
        <span className="relative font-cyber text-6xl sm:text-8xl tracking-[0.12em] text-white text-level">
          LV.999
        </span>
      </div>
      <div className="mt-3 text-[10px] sm:text-xs tracking-[0.45em] text-neon-pink animate-pulse">
        /// FULL_COMBO_ATTAINED
      </div>
      <div className="mt-1 font-cyber text-sm sm:text-base tracking-[0.3em] text-neon-yellow">
        {snapshot.score.toLocaleString()} PT · MAX COMBO {snapshot.maxCombo}
      </div>
    </div>
  </div>
);

const RANK_STYLE: Record<Rank, { color: string; glow: string; border: string }> = {
  S: { color: 'text-neon-yellow', glow: 'shadow-[0_0_28px_rgba(248,255,114,0.5)]', border: 'border-neon-yellow' },
  A: { color: 'text-neon-cyan', glow: 'shadow-[0_0_24px_rgba(102,224,255,0.45)]', border: 'border-neon-cyan' },
  B: { color: 'text-neon-purple', glow: 'shadow-[0_0_22px_rgba(155,123,255,0.4)]', border: 'border-neon-purple' },
  C: { color: 'text-neon-pink', glow: 'shadow-[0_0_20px_rgba(255,79,216,0.35)]', border: 'border-neon-pink' },
  D: { color: 'text-gray-400', glow: 'shadow-none', border: 'border-gray-500' },
};

const RankBadge: React.FC<{ rank: Rank }> = ({ rank }) => {
  const style = RANK_STYLE[rank];
  return (
    <div
      className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center border-2 bg-black/50 ${style.border} ${style.glow}`}
    >
      <div className="text-[8px] tracking-[0.28em] text-gray-400">RANK</div>
      <div className={`font-cyber text-3xl leading-none ${style.color}`}>{rank}</div>
    </div>
  );
};

function judgementColor(j: Judgement): string {
  switch (j) {
    case 'PERFECT':
      return 'text-neon-yellow';
    case 'GOOD':
      return 'text-neon-cyan';
    case 'MISS':
      return 'text-red-400';
  }
}

/**
 * paintMissed 在 MISS 触发瞬间，把方块六面贴图替换为红色基底材质，
 * 并打开 transparent，方便随后调用 fadeMissed 渐隐。
 */
function paintMissed(mesh: THREE.Mesh) {
  const tint = new THREE.Color(0xff3050);
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((m) => {
    const mat = m as THREE.MeshBasicMaterial;
    mat.color = tint;
    mat.map = null;
    mat.transparent = true;
    mat.needsUpdate = true;
  });
}

/**
 * fadeMissed 根据已 MISS 持续时长，让方块持续变透明。
 */
function fadeMissed(mesh: THREE.Mesh, overshootMs: number) {
  const opacity = Math.max(1 - overshootMs / 600, 0);
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((m) => {
    (m as THREE.MeshBasicMaterial).opacity = opacity;
  });
}

/**
 * disposeMesh 释放方块/粒子的几何与材质，避免 WebGL 资源泄漏。
 */
function disposeMesh(mesh: THREE.Mesh) {
  mesh.geometry.dispose();
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => m.dispose());
  } else {
    mesh.material.dispose();
  }
}

export default BeatSaberGame;
