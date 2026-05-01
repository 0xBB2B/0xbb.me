import React, { useEffect, useRef, useState } from 'react';

type Player = {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
};

type Bullet = {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
};

type Enemy = {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
};

type GameSnapshot = {
  score: number;
  lives: number;
  best: number;
  isStarted: boolean;
  isGameOver: boolean;
};

type GameState = {
  player: Player;
  bullets: Bullet[];
  enemies: Enemy[];
  keys: Set<string>;
  score: number;
  lives: number;
  best: number;
  lastShotAt: number;
  enemyTimer: number;
  isStarted: boolean;
  isGameOver: boolean;
};

const GAME_WIDTH = 520;
const GAME_HEIGHT = 520;
const PLAYER_WIDTH = 46;
const PLAYER_HEIGHT = 34;
const SHOT_COOLDOWN = 150;

/**
 * ArcadeShooter 渲染一个键盘控制的迷你打飞机游戏。
 */
export const ArcadeShooter: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const lastFrameAtRef = useRef<number>(0);
  const stateRef = useRef<GameState>(createInitialState());
  const [snapshot, setSnapshot] = useState<GameSnapshot>({
    score: 0,
    lives: 3,
    best: 0,
    isStarted: false,
    isGameOver: false,
  });

  /**
   * syncSnapshot 将游戏内部状态同步到 React HUD。
   */
  const syncSnapshot = () => {
    const state = stateRef.current;
    setSnapshot({
      score: state.score,
      lives: state.lives,
      best: state.best,
      isStarted: state.isStarted,
      isGameOver: state.isGameOver,
    });
  };

  /**
   * startGame 开始一局新游戏，并保留历史最高分。
   */
  const startGame = () => {
    const previousBest = stateRef.current.best;
    stateRef.current = createInitialState(previousBest, true);
    syncSnapshot();
    canvasRef.current?.focus();
  };

  useEffect(() => {
    /**
     * handleKeyDown 处理移动、射击和重开游戏的键盘输入。
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }

      const state = stateRef.current;
      if (state.isStarted && !state.isGameOver) {
        state.keys.add(event.code);
      }
    };

    /**
     * handleKeyUp 清理已经松开的按键状态。
     */
    const handleKeyUp = (event: KeyboardEvent) => {
      stateRef.current.keys.delete(event.code);
    };

    /**
     * tick 驱动游戏循环，按帧更新状态并重绘画布。
     */
    const tick = (time: number) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');

      if (!canvas || !context) {
        return;
      }

      const delta = Math.min(time - lastFrameAtRef.current, 32);
      lastFrameAtRef.current = time;

      updateGame(stateRef.current, delta);
      drawGame(context, stateRef.current);
      syncSnapshot();

      frameRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    frameRef.current = requestAnimationFrame((time) => {
      lastFrameAtRef.current = time;
      tick(time);
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <div className="relative aspect-square bg-neon-bg/95 border border-neon-cyan/35 overflow-hidden shadow-[0_0_32px_rgba(66,248,255,0.16)]">
      <div className="absolute left-0 right-0 top-0 z-10 flex flex-wrap items-center gap-3 border-b border-neon-purple/45 bg-neon-panel/90 px-4 py-3 backdrop-blur-sm">
        <div className="text-xs text-neon-cyan tracking-[0.24em]">STAR RAID</div>
        <div className="ml-auto flex gap-3 text-[10px] text-gray-400">
          <span>SCORE <b className="text-neon-yellow">{snapshot.score}</b></span>
          <span>LIFE <b className="text-neon-pink">{snapshot.lives}</b></span>
          <span>BEST <b className="text-neon-cyan">{snapshot.best}</b></span>
        </div>
      </div>

      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          tabIndex={0}
          onClick={() => canvasRef.current?.focus()}
          className="block h-full w-full bg-neon-bg outline-none"
          aria-label="左右方向键移动，空格发射子弹的打飞机游戏"
        />

        {(!snapshot.isStarted || snapshot.isGameOver) && (
          <div className="absolute inset-0 flex items-center justify-center bg-neon-bg/70 backdrop-blur-sm">
            <button
              type="button"
              onClick={startGame}
              className="border border-neon-pink bg-neon-panel px-6 py-3 text-sm font-bold uppercase tracking-[0.24em] text-neon-pink shadow-[0_0_22px_rgba(255,79,216,0.35)] hover:bg-neon-pink hover:text-neon-bg transition-colors"
            >
              GAME START
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * createInitialState 创建游戏初始状态。
 */
function createInitialState(best = 0, isStarted = false): GameState {
  return {
    player: {
      x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: GAME_HEIGHT - 62,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      speed: 0.42,
    },
    bullets: [],
    enemies: [],
    keys: new Set<string>(),
    score: 0,
    lives: 3,
    best,
    lastShotAt: 0,
    enemyTimer: 0,
    isStarted,
    isGameOver: false,
  };
}

/**
 * updateGame 更新玩家、子弹、敌机与碰撞状态。
 */
function updateGame(state: GameState, delta: number) {
  if (!state.isStarted || state.isGameOver) {
    return;
  }

  if (state.keys.has('ArrowLeft')) {
    state.player.x -= state.player.speed * delta;
  }
  if (state.keys.has('ArrowRight')) {
    state.player.x += state.player.speed * delta;
  }

  state.player.x = clamp(state.player.x, 12, GAME_WIDTH - state.player.width - 12);
  state.lastShotAt += delta;

  if (state.keys.has('Space') && state.lastShotAt >= SHOT_COOLDOWN) {
    state.bullets.push({
      x: state.player.x + state.player.width / 2 - 3,
      y: state.player.y - 12,
      width: 6,
      height: 18,
      speed: 0.68,
    });
    state.lastShotAt = 0;
  }

  state.enemyTimer += delta;
  if (state.enemyTimer >= Math.max(340, 900 - state.score * 10)) {
    state.enemies.push(createEnemy(state.score));
    state.enemyTimer = 0;
  }

  state.bullets = state.bullets
    .map((bullet) => ({ ...bullet, y: bullet.y - bullet.speed * delta }))
    .filter((bullet) => bullet.y + bullet.height > 0);

  state.enemies = state.enemies
    .map((enemy) => ({
      ...enemy,
      y: enemy.y + enemy.speed * delta,
      x: enemy.x + Math.sin((enemy.y + delta) * 0.035) * enemy.drift,
    }))
    .filter((enemy) => {
      if (enemy.y > GAME_HEIGHT + enemy.size) {
        state.lives -= 1;
        return false;
      }
      return true;
    });

  // 命中检测采用倒序遍历，删除数组元素时不会跳过后续目标。
  for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
    const enemy = state.enemies[enemyIndex];
    const hitBulletIndex = state.bullets.findIndex((bullet) => isHit(bullet, enemy));

    if (hitBulletIndex >= 0) {
      state.enemies.splice(enemyIndex, 1);
      state.bullets.splice(hitBulletIndex, 1);
      state.score += 1;
      state.best = Math.max(state.best, state.score);
    }
  }

  if (state.lives <= 0) {
    state.isGameOver = true;
    state.keys.clear();
  }
}

/**
 * createEnemy 根据分数生成逐步提速的敌机。
 */
function createEnemy(score: number): Enemy {
  const size = 32 + Math.random() * 14;

  return {
    x: 24 + Math.random() * (GAME_WIDTH - size - 48),
    y: -size,
    size,
    speed: 0.12 + Math.min(score * 0.006, 0.18),
    drift: 0.7 + Math.random() * 1.4,
  };
}

/**
 * drawGame 绘制游戏背景、玩家、子弹和敌机。
 */
function drawGame(context: CanvasRenderingContext2D, state: GameState) {
  context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const gradient = context.createLinearGradient(0, 0, GAME_WIDTH, GAME_HEIGHT);
  gradient.addColorStop(0, '#05040b');
  gradient.addColorStop(0.55, '#12092f');
  gradient.addColorStop(1, '#05040b');
  context.fillStyle = gradient;
  context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  drawGrid(context);
  drawPlayer(context, state.player);
  state.bullets.forEach((bullet) => drawBullet(context, bullet));
  state.enemies.forEach((enemy) => drawEnemy(context, enemy));
}

/**
 * drawGrid 绘制电玩风格背景网格。
 */
function drawGrid(context: CanvasRenderingContext2D) {
  context.strokeStyle = 'rgba(66, 248, 255, 0.12)';
  context.lineWidth = 1;

  for (let x = 0; x <= GAME_WIDTH; x += 36) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, GAME_HEIGHT);
    context.stroke();
  }

  for (let y = 0; y <= GAME_HEIGHT; y += 36) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(GAME_WIDTH, y);
    context.stroke();
  }
}

/**
 * drawPlayer 绘制玩家战机。
 */
function drawPlayer(context: CanvasRenderingContext2D, player: Player) {
  context.fillStyle = '#42f8ff';
  context.shadowColor = '#42f8ff';
  context.shadowBlur = 18;
  context.beginPath();
  context.moveTo(player.x + player.width / 2, player.y);
  context.lineTo(player.x + player.width, player.y + player.height);
  context.lineTo(player.x + player.width / 2, player.y + player.height - 8);
  context.lineTo(player.x, player.y + player.height);
  context.closePath();
  context.fill();
  context.shadowBlur = 0;

  context.fillStyle = '#ff4fd8';
  context.fillRect(player.x + 18, player.y + 22, 10, 18);
}

/**
 * drawBullet 绘制玩家发射的子弹。
 */
function drawBullet(context: CanvasRenderingContext2D, bullet: Bullet) {
  context.fillStyle = '#f8ff72';
  context.shadowColor = '#f8ff72';
  context.shadowBlur = 12;
  context.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  context.shadowBlur = 0;
}

/**
 * drawEnemy 绘制敌方目标。
 */
function drawEnemy(context: CanvasRenderingContext2D, enemy: Enemy) {
  context.font = `${enemy.size}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = '#ff4fd8';
  context.shadowBlur = 18;
  context.fillText('👾', enemy.x + enemy.size / 2, enemy.y + enemy.size / 2);
  context.shadowBlur = 0;
}

/**
 * isHit 判断子弹是否击中敌机。
 */
function isHit(bullet: Bullet, enemy: Enemy) {
  return (
    bullet.x < enemy.x + enemy.size &&
    bullet.x + bullet.width > enemy.x &&
    bullet.y < enemy.y + enemy.size &&
    bullet.y + bullet.height > enemy.y
  );
}

/**
 * clamp 将数值限制在指定范围内。
 */
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
