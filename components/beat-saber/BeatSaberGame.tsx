import * as THREE from 'three';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChiptuneEngine } from '../../game/chiptune';
import { createDemoChart } from '../../game/chart';
import { findHitTarget } from '../../game/judge';
import { accuracy, applyJudgement, createInitialStats, type GameStats } from '../../game/scoring';
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

// 键盘 → 手 / 切击方向映射。
const KEY_MAP: Record<string, [Hand, CutDirection]> = {
  KeyW: ['L', 'U'],
  KeyA: ['L', 'L'],
  KeyS: ['L', 'D'],
  KeyD: ['L', 'R'],
  ArrowUp: ['R', 'U'],
  ArrowLeft: ['R', 'L'],
  ArrowDown: ['R', 'D'],
  ArrowRight: ['R', 'R'],
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
     * flashSaber 触发对应手光剑的高亮闪烁。
     */
    const flashSaber = (hand: Hand, direction: CutDirection) => {
      const flash = saberFlashRef.current[hand];
      const [vx, vy] = DIRECTION_VECTORS[direction] ?? [0, 0];
      flash.remainingMs = 140;
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

      const elapsedMs = engine.isPlaying() ? engine.elapsedMs() : 0;

      if (statusRef.current === 'playing') {
        updateNotes(elapsedMs);
      }
      updateSabers(dt);
      updateParticles(dt);

      renderer.render(scene, camera);

      if (statusRef.current === 'playing') {
        const lastNoteTime = chart.notes[chart.notes.length - 1]?.time ?? 0;
        const isFinished = elapsedMs > lastNoteTime + MISS_THRESHOLD_MS + 500;
        if (isFinished) {
          statusRef.current = 'finished';
          engine.stop();
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
          // 旋转一点，方便玩家看清正面。
          entry.mesh.rotation.x = -0.05;

          // 飞越判定线 + 容错时间后未被切：标记为 MISS。
          const overshoot = elapsedMs - entry.note.time;
          if (overshoot > MISS_THRESHOLD_MS + POST_JUDGE_GRACE_MS) {
            entry.status = 'missed';
            statsRef.current = applyJudgement(statsRef.current, 'MISS');
            lastJudgementRef.current = { kind: 'MISS', at: elapsedMs };
            missedThisFrame += 1;
          }

          // 离开视野彻底回收。
          if (z > PAST_Z) {
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
     * updateSabers 平滑光剑闪烁与摆动姿态，回到默认朝向。
     */
    const updateSabers = (dt: number) => {
      const sabers = sabersRef.current;
      if (!sabers) {
        return;
      }
      (['L', 'R'] as Hand[]).forEach((hand) => {
        const group = sabers[hand];
        const flash = saberFlashRef.current[hand];
        const baseRotZ = hand === 'L' ? 0.18 : -0.18;
        const baseRotX = -0.2;
        const baseScale = 1;

        if (flash.remainingMs > 0) {
          flash.remainingMs -= dt;
          const t = Math.max(flash.remainingMs / 140, 0);
          const swing = 0.45 * t;
          group.rotation.z = baseRotZ + flash.swingX * swing;
          group.rotation.x = baseRotX - flash.swingY * swing;
          const pulse = 1 + 0.32 * t;
          group.scale.set(pulse, pulse, pulse);
        } else {
          group.rotation.z += (baseRotZ - group.rotation.z) * 0.15;
          group.rotation.x += (baseRotX - group.rotation.x) * 0.15;
          const s = group.scale.x + (baseScale - group.scale.x) * 0.2;
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
   * handleStart 由用户按下 GAME START 按钮触发：解锁音频上下文并启动曲目。
   */
  const handleStart = async () => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    // 重置状态。
    notesRef.current = chart.notes.map((note) => ({
      note,
      mesh: null,
      status: 'pending',
    }));
    statsRef.current = createInitialStats();
    lastJudgementRef.current = { kind: null, at: 0 };
    statusRef.current = 'playing';
    setSnapshot(buildInitialSnapshot(chart.durationMs));
    setSnapshot((prev) => ({ ...prev, status: 'playing' }));

    await engine.resume();
    const { createSoundtrack } = await import('../../game/chiptune');
    engine.startTrack(createSoundtrack());
    startedAtRef.current = performance.now();
  };

  return (
    <div className="relative w-full overflow-hidden border border-neon-purple/55 bg-[#06031a] shadow-[0_0_36px_rgba(155,123,255,0.22)]">
      <div ref={containerRef} className="relative aspect-[16/10] w-full bg-[#06031a]">
        <div className="pointer-events-none absolute inset-0 z-10">
          <HudLayer snapshot={snapshot} chartTitle={chart.title} />
        </div>

        {snapshot.status !== 'playing' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[#06031a]/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-xs tracking-[0.4em] text-neon-pink animate-pulse">
                {snapshot.status === 'finished' ? '/// AHA TIME COMPLETE' : '/// AHA TIME // SILVER WOLF MIX'}
              </div>
              <div className="mt-2 font-cyber text-3xl text-white tracking-[0.16em]">
                {snapshot.status === 'finished' ? 'STAGE CLEARED' : 'RHYTHM_BLADE'}
              </div>
            </div>
            {snapshot.status === 'finished' && (
              <div className="grid grid-cols-3 gap-4 text-center text-xs text-gray-300 font-mono">
                <Stat label="SCORE" value={snapshot.score.toString()} accent="text-neon-yellow" />
                <Stat
                  label="ACCURACY"
                  value={`${(accuracy(snapshot) * 100).toFixed(1)}%`}
                  accent="text-neon-cyan"
                />
                <Stat label="MAX COMBO" value={snapshot.maxCombo.toString()} accent="text-neon-pink" />
              </div>
            )}
            <button
              type="button"
              onClick={handleStart}
              className="border-2 border-neon-pink bg-neon-panel px-8 py-3 text-sm font-bold uppercase tracking-[0.32em] text-neon-pink shadow-[0_0_30px_rgba(255,79,216,0.45)] transition-colors hover:bg-neon-pink hover:text-[#06031a]"
            >
              {snapshot.status === 'finished' ? 'RETRY' : 'AHA START'}
            </button>
            <div className="max-w-md text-center text-[11px] text-gray-400 font-mono leading-relaxed">
              <div>
                LEFT HAND <span className="text-neon-purple">[ W A S D ]</span>
                {' / '}
                RIGHT HAND <span className="text-neon-cyan">[ ↑ ← ↓ → ]</span>
              </div>
              <div className="mt-1 opacity-80">
                方向必须匹配方块上的箭头；红块只能左手，青块只能右手。
              </div>
            </div>
          </div>
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
        R_BLADE [↑ ← ↓ →] //
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
