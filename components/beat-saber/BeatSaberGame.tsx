import * as THREE from 'three';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChiptuneEngine, createSoundtrack } from '../../game/chiptune';
import { createDemoChart } from '../../game/chart';
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

interface UISnapshot extends GameStats {
  status: 'idle' | 'playing' | 'finished';
  elapsedMs: number;
  durationMs: number;
  lastJudgement: Judgement | null;
  lastJudgementAt: number;
}

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
  // BGM 已经真正开始播放——用来区分"刚点 START 还在 await resume"
  // 与"BGM 自然结束、引擎转入 inactive"两种 isPlaying=false 场景。
  const hasStartedRef = useRef<boolean>(false);
  const statusRef = useRef<UISnapshot['status']>('idle');
  const lastFrameMsRef = useRef<number>(0);
  const chart = useMemo<BeatChart>(() => createDemoChart(), []);

  const [snapshot, setSnapshot] = useState<UISnapshot>(() =>
    buildInitialSnapshot(chart.durationMs),
  );

  // 用最新的 chart 初始化 notesRef（仅在 chart 变化时）。
  useEffect(() => {
    notesRef.current = chart.notes.map((note) => ({
      note,
      mesh: null,
      status: 'pending',
    }));
  }, [chart]);

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

    // 双手光剑——固定在视图底部，按方向键时高亮挥动。
    const leftSaber = createSaber('L');
    leftSaber.position.set(-0.55, 0.95, 3.4);
    leftSaber.rotation.set(-0.2, 0.05, 0.18);
    scene.add(leftSaber);

    const rightSaber = createSaber('R');
    rightSaber.position.set(0.55, 0.95, 3.4);
    rightSaber.rotation.set(-0.2, -0.05, -0.18);
    scene.add(rightSaber);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    sabersRef.current = { L: leftSaber, R: rightSaber };

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
        const lastNoteTime = chart.notes[chart.notes.length - 1]?.time ?? 0;
        const isFinished = hasStartedRef.current && elapsedMs > lastNoteTime + MISS_THRESHOLD_MS + 800;
        if (isFinished) {
          statusRef.current = 'finished';
          engine.stop();
          // 把仍在场景里的方块全部清掉，避免飞过判定线后还停在屏幕上。
          notesRef.current.forEach((entry) => {
            if (entry.mesh && sceneRef.current) {
              sceneRef.current.remove(entry.mesh);
              disposeMesh(entry.mesh);
              entry.mesh = null;
            }
          });
        }
        const last = lastJudgementRef.current;
        const stats = statsRef.current;
        setSnapshot({
          ...stats,
          status: statusRef.current,
          elapsedMs,
          durationMs: chart.durationMs,
          lastJudgement: last.kind,
          lastJudgementAt: last.at,
        });
      } else if (statusRef.current === 'finished') {
        const last = lastJudgementRef.current;
        const stats = statsRef.current;
        setSnapshot((prev) => ({
          ...prev,
          ...stats,
          status: 'finished',
          elapsedMs: chart.durationMs,
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
        const visibleStart = entry.note.time - chart.approachMs;
        if (entry.status === 'pending' && elapsedMs >= visibleStart) {
          const mesh = createNoteMesh(entry.note.hand, entry.note.cut);
          mesh.position.set(LANE_X[entry.note.lane], NOTE_Y, 0);
          scene.add(mesh);
          entry.mesh = mesh;
          entry.status = 'active';
        }

        if (entry.status === 'active' && entry.mesh) {
          const z = computeNoteZ(entry.note.time, elapsedMs, chart.approachMs);
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
          const z = computeNoteZ(entry.note.time, elapsedMs, chart.approachMs);
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
     * 几何上：剑身沿 -Z 方向延伸，pivot 落在剑柄前侧。挥砍方向必须围绕
     * 与剑身垂直的轴旋转，剑尖才会真正划过空间：
     *   - 上下挥（swingY） → 绕 X 轴
     *   - 左右挥（swingX） → 绕 Y 轴
     * 绕 Z 轴只是"剑身打转"，剑尖基本不动，所以这里只用作静态保留倾角。
     *
     * phase 走三角形脉冲：前 30% 蓄力上升至顶点，后 70% 回拉。顶点处
     * 角度可达 1.6 rad，配合沿挥砍方向的位移与缩放，形成明显的剑尖轨迹。
     */
    const updateSabers = (dt: number) => {
      const sabers = sabersRef.current;
      if (!sabers) {
        return;
      }
      (['L', 'R'] as Hand[]).forEach((hand) => {
        const group = sabers[hand];
        const flash = saberFlashRef.current[hand];
        const baseX = hand === 'L' ? -0.55 : 0.55;
        const baseY = 0.95;
        const baseZ = 3.4;
        // 静态保留倾角：仅用于"持剑姿态"，不参与挥砍。
        const baseRotZ = hand === 'L' ? 0.18 : -0.18;
        const baseRotX = -0.18;
        const baseRotY = hand === 'L' ? 0.05 : -0.05;
        const baseScale = 1;

        if (flash.remainingMs > 0) {
          flash.remainingMs -= dt;
          const remaining = Math.max(flash.remainingMs, 0) / SWING_DURATION_MS;
          const progress = 1 - remaining;
          const phase = progress < 0.3
            ? progress / 0.3
            : Math.max(0, 1 - (progress - 0.3) / 0.7);

          const arc = 1.6 * phase;
          // 上下挥 → 绕 X 轴：swingY 正表示向上挥，剑尖应抬升 → rotation.x 取正。
          group.rotation.x = baseRotX + flash.swingY * arc;
          // 左右挥 → 绕 Y 轴：swingX 正表示向右挥，剑尖应朝 +X → rotation.y 取负。
          group.rotation.y = baseRotY - flash.swingX * arc;
          group.rotation.z = baseRotZ;
          // 沿挥砍方向位移，强化剑尖轨迹的位移感。
          group.position.x = baseX + flash.swingX * 0.55 * phase;
          group.position.y = baseY + flash.swingY * 0.5 * phase;
          group.position.z = baseZ - 0.35 * phase;
          const pulse = 1 + 0.35 * phase;
          group.scale.set(pulse, pulse, pulse);
        } else {
          group.rotation.x += (baseRotX - group.rotation.x) * 0.2;
          group.rotation.y += (baseRotY - group.rotation.y) * 0.2;
          group.rotation.z += (baseRotZ - group.rotation.z) * 0.2;
          group.position.x += (baseX - group.position.x) * 0.2;
          group.position.y += (baseY - group.position.y) * 0.2;
          group.position.z += (baseZ - group.position.z) * 0.2;
          const s = group.scale.x + (baseScale - group.scale.x) * 0.22;
          group.scale.set(s, s, s);
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
  }, [chart]);

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

    notesRef.current = chart.notes.map((note) => ({
      note,
      mesh: null,
      status: 'pending',
    }));
    statsRef.current = createInitialStats();
    lastJudgementRef.current = { kind: null, at: 0 };
    hasStartedRef.current = false;
    statusRef.current = 'playing';
    setSnapshot({ ...buildInitialSnapshot(chart.durationMs), status: 'playing' });

    await engine.resume();
    engine.startTrack(createSoundtrack());
    startedAtRef.current = performance.now();
    hasStartedRef.current = true;
  };

  return (
    <div className="relative w-full overflow-hidden border border-neon-purple/55 bg-[#06031a] shadow-[0_0_36px_rgba(155,123,255,0.22)]">
      <div ref={containerRef} className="relative aspect-[16/10] w-full bg-[#06031a]">
        <div className="pointer-events-none absolute inset-0 z-10">
          <HudLayer snapshot={snapshot} chartTitle={chart.title} />
        </div>

        {snapshot.status === 'idle' && (
          <PreStartOverlay onStart={handleStart} chartTitle={chart.title} />
        )}

        {snapshot.status === 'finished' && (
          <ResultOverlay snapshot={snapshot} chartTitle={chart.title} onRetry={handleStart} />
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
  <div className="border border-white/10 bg-black/40 px-4 py-3">
    <div className="text-[10px] tracking-[0.28em] text-gray-400">{label}</div>
    <div className={`mt-1 font-cyber text-xl ${accent}`}>{value}</div>
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
 * ResultOverlay 是曲目结束后的「STAGE RESULT」结算画面：等级、分数、
 * 各档判定数与最大连击集中展示，并提供重新开始按钮。
 */
const ResultOverlay: React.FC<ResultOverlayProps> = ({ snapshot, chartTitle, onRetry }) => {
  const acc = accuracy(snapshot);
  const rank = rankFor(snapshot);
  const isFullCombo = snapshot.miss === 0 && snapshot.total > 0;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#06031a]/90 backdrop-blur-sm px-4">
      <div className="pixel-frame relative w-full max-w-xl bg-[#0a0524] border-2 border-neon-purple/70 shadow-[0_0_60px_rgba(155,123,255,0.45)]">
        <div className="absolute -top-px left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />
        <div className="absolute -bottom-px left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-neon-pink to-transparent" />

        <div className="px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex items-center justify-between text-[10px] tracking-[0.32em] text-neon-pink">
            <span>/// STAGE RESULT</span>
            <span className="text-neon-cyan animate-aha-flicker">AHA!</span>
          </div>

          <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="font-cyber text-3xl sm:text-4xl text-white tracking-[0.18em]">STAGE CLEARED</div>
              <div className="mt-1 font-mono text-[11px] text-gray-400 break-all">{chartTitle}</div>
            </div>
            {isFullCombo && (
              <div className="self-start sm:self-end border border-neon-yellow/70 bg-neon-yellow/10 px-3 py-1 text-[10px] tracking-[0.3em] text-neon-yellow shadow-[0_0_18px_rgba(248,255,114,0.35)]">
                FULL COMBO
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center gap-5">
            <RankBadge rank={rank} />
            <div className="flex-1 grid grid-cols-2 gap-3">
              <Stat label="SCORE" value={snapshot.score.toLocaleString()} accent="text-neon-yellow" />
              <Stat label="ACCURACY" value={`${(acc * 100).toFixed(1)}%`} accent="text-neon-cyan" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <Stat label="PERFECT" value={snapshot.perfect.toString()} accent="text-neon-yellow" />
            <Stat label="GOOD" value={snapshot.good.toString()} accent="text-neon-cyan" />
            <Stat label="MISS" value={snapshot.miss.toString()} accent="text-red-400" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat label="MAX COMBO" value={snapshot.maxCombo.toString()} accent="text-neon-pink" />
            <Stat label="TOTAL" value={snapshot.total.toString()} accent="text-white" />
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onRetry}
              className="border-2 border-neon-pink bg-neon-panel px-10 py-3 text-sm font-bold uppercase tracking-[0.32em] text-neon-pink shadow-[0_0_30px_rgba(255,79,216,0.45)] transition-colors hover:bg-neon-pink hover:text-[#06031a]"
            >
              重新开始 / RETRY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    <div className={`flex h-24 w-24 flex-col items-center justify-center border-2 bg-black/50 ${style.border} ${style.glow}`}>
      <div className="text-[9px] tracking-[0.3em] text-gray-400">RANK</div>
      <div className={`font-cyber text-5xl leading-none ${style.color}`}>{rank}</div>
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
