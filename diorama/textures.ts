import * as THREE from 'three';
import { ctex, roundRect } from './materials';
import { rand, pick } from './primitives';
import { rolesLine, locationLine } from '../copy';
import type { Language } from '../data';

export const FONT_D = '"Dela Gothic One", "Noto Sans SC Variable", sans-serif';
export const FONT_R = '"M PLUS Rounded 1c", "Noto Sans SC Variable", sans-serif';

const SIGNAGE_TEXT = [
  'BB',
  '0xBB MART',
  'ヨルノミセ',
  '24H',
  '駐車場 3台',
  'OPEN 24H',
  'つめた〜い',
  '¥130',
  '¥150',
  '¥110',
  '¥160',
  'おでん',
  '全品70円引',
  '肉まん',
  'あります',
  '新発売',
  'いちごミルク',
  'HOT COFFEE',
  'ホット ¥110 ・ アイス ¥160',
  'COLD DRINKS',
  'おにぎり・お弁当',
  '回覧板',
  '迷い猫',
  '夏祭',
  '防犯パトロール実施中',
  '町内会のお知らせ',
  '止まれ',
  '夜野町三丁目',
  'いらっしゃいませ',
  '自動ドア',
  '喫茶ルナ',
  'STAFF ONLY',
].join('');

export const CANVAS_TEXT = SIGNAGE_TEXT + 'FUBUKI_BB' + rolesLine('zh') + rolesLine('en') + locationLine();

export const TEAL = '#16a39a';
export const ORANGE = '#ff8a2b';
export const NAVY = '#1d2340';

function vendTex(body: string, accent: string): THREE.CanvasTexture {
  return ctex(256, 512, (g, w) => {
    g.fillStyle = body;
    g.fillRect(0, 0, w, 512);
    g.fillStyle = '#eef6ff';
    roundRect(g, 14, 14, w - 28, 250, 10);
    g.fill();
    const cols = ['#e63946', '#ffbe0b', '#2ec4b6', '#4d96ff', '#ff5d8f', '#6bcb77', '#f4f1de', '#8338ec', '#fb8500'];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) {
        const x = 26 + c * 35;
        const y = 26 + r * 80;
        g.fillStyle = pick(cols);
        roundRect(g, x, y, 26, 54, 7);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,.55)';
        g.fillRect(x + 5, y + 10, 5, 30);
        g.fillStyle = '#1b1f2e';
        g.font = '800 11px sans-serif';
        g.textAlign = 'center';
        g.fillText(pick(['¥130', '¥150', '¥110', '¥160']), x + 13, y + 68);
      }
    }
    g.fillStyle = accent;
    g.fillRect(14, 276, w - 28, 44);
    g.fillStyle = '#fff';
    g.font = `800 26px ${FONT_R}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('つめた〜い', w / 2, 299);
    g.fillStyle = '#20242f';
    roundRect(g, 150, 340, 80, 90, 8);
    g.fill();
    g.fillStyle = '#ffd23f';
    g.fillRect(170, 360, 40, 8);
    g.fillStyle = '#39ff9a';
    g.fillRect(166, 390, 48, 14);
    g.fillStyle = '#1a1d27';
    roundRect(g, 26, 440, w - 52, 56, 8);
    g.fill();
  });
}

function posterTex(bg: string, title: string, sub: string, ink = '#fff', fontSize = 64): THREE.CanvasTexture {
  return ctex(256, 360, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.18)';
    g.beginPath();
    g.arc(w * 0.78, h * 0.25, 90, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `${fontSize}px ${FONT_D}`;
    g.fillText(title, w / 2, h * 0.42);
    g.font = `800 30px ${FONT_R}`;
    g.fillText(sub, w / 2, h * 0.7);
    g.strokeStyle = ink;
    g.lineWidth = 6;
    g.strokeRect(12, 12, w - 24, h - 24);
  });
}

export interface Textures {
  fascia: THREE.CanvasTexture;
  pylon: THREE.CanvasTexture;
  vend1: THREE.CanvasTexture;
  vend2: THREE.CanvasTexture;
  posterOden: THREE.CanvasTexture;
  posterNiku: THREE.CanvasTexture;
  posterIchigo: THREE.CanvasTexture;
  cigarette: THREE.CanvasTexture;
  menu: THREE.CanvasTexture;
  cooler: THREE.CanvasTexture;
  bento: THREE.CanvasTexture;
  notice: THREE.CanvasTexture;
  stopSign: THREE.CanvasTexture;
  roadStop: THREE.CanvasTexture;
  addressPlate: THREE.CanvasTexture;
  diamond: THREE.CanvasTexture;
  tile: THREE.CanvasTexture;
  floor: THREE.CanvasTexture;
  grate: THREE.CanvasTexture;
  mat: THREE.CanvasTexture;
  door: THREE.CanvasTexture;
  shutter: THREE.CanvasTexture;
  kissa: THREE.CanvasTexture;
  nobori: THREE.CanvasTexture;
  staffOnly: THREE.CanvasTexture;
}

export function createTextures(): Textures {
  const fascia = ctex(2048, 200, (g, w, h) => {
    g.fillStyle = '#f7f8f4';
    g.fillRect(0, 0, w, h);
    g.fillStyle = TEAL;
    g.fillRect(0, 0, w, 24);
    g.fillRect(0, h - 24, w, 24);
    g.fillStyle = ORANGE;
    g.fillRect(0, h - 42, w, 16);
    g.fillStyle = TEAL;
    g.beginPath();
    g.arc(150, 92, 60, 0, Math.PI * 2);
    g.fill();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.font = `60px ${FONT_D}`;
    g.fillText('BB', 150, 96);
    g.fillStyle = NAVY;
    g.textAlign = 'left';
    g.font = `98px ${FONT_D}`;
    g.fillText('0xBB MART', 250, 94);
    g.font = `800 44px ${FONT_R}`;
    g.fillStyle = '#5a6380';
    g.fillText('ヨルノミセ', 1010, 100);
    g.fillStyle = ORANGE;
    roundRect(g, w - 330, 42, 230, 96, 18);
    g.fill();
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.font = `66px ${FONT_D}`;
    g.fillText('24H', w - 215, 94);
  });

  const pylon = ctex(512, 620, (g, w) => {
    g.fillStyle = '#f7f8f4';
    g.fillRect(0, 0, w, 430);
    g.fillStyle = TEAL;
    g.fillRect(0, 0, w, 40);
    g.fillRect(0, 390, w, 40);
    g.fillStyle = ORANGE;
    g.fillRect(0, 372, w, 16);
    g.fillStyle = TEAL;
    g.beginPath();
    g.arc(w / 2, 150, 82, 0, Math.PI * 2);
    g.fill();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.font = `84px ${FONT_D}`;
    g.fillText('BB', w / 2, 156);
    g.fillStyle = NAVY;
    g.font = `64px ${FONT_D}`;
    g.fillText('0xBB MART', w / 2, 300);
    g.fillStyle = '#23306b';
    g.fillRect(0, 430, w, 190);
    g.fillStyle = '#fff';
    roundRect(g, 36, 462, 124, 124, 16);
    g.fill();
    g.fillStyle = '#23306b';
    g.font = `100px ${FONT_D}`;
    g.fillText('P', 98, 528);
    g.fillStyle = '#fff';
    g.font = `800 52px ${FONT_R}`;
    g.fillText('駐車場 3台', 330, 500);
    g.fillStyle = '#ffd23f';
    g.font = `44px ${FONT_D}`;
    g.fillText('OPEN 24H', 330, 568);
  });

  const vend1 = vendTex('#f2f4f7', '#2f6fdb');
  const vend2 = vendTex('#d7263d', '#1d2340');
  const posterOden = posterTex('#c8412f', 'おでん', '全品70円引');
  const posterNiku = posterTex('#fff4d6', '肉まん', 'あります', '#b3261e');
  const posterIchigo = posterTex('#ff8fb5', '新発売', 'いちごミルク', '#fff', 60);

  const cigarette = ctex(512, 180, (g, w, h) => {
    g.fillStyle = '#2a2d36';
    g.fillRect(0, 0, w, h);
    const cols = ['#f1f1f1', '#d62828', '#1d3557', '#e9c46a', '#2a9d8f', '#8d99ae', '#ffb703', '#6a4c93'];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 20; c++) {
        g.fillStyle = pick(cols);
        g.fillRect(6 + c * 25, 8 + r * 34, 20, 26);
        g.fillStyle = 'rgba(0,0,0,.25)';
        g.fillRect(6 + c * 25, 26 + r * 34, 20, 8);
      }
    }
  });

  const menu = ctex(512, 80, (g, w, h) => {
    g.fillStyle = '#1d2340';
    g.fillRect(0, 0, w, h);
    g.fillStyle = ORANGE;
    g.fillRect(0, h - 8, w, 8);
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.font = `34px ${FONT_D}`;
    g.fillText('HOT COFFEE', 18, 38);
    g.font = `800 28px ${FONT_R}`;
    g.fillStyle = '#ffd23f';
    g.fillText('ホット ¥110 ・ アイス ¥160', 238, 38);
  });

  const cooler = ctex(1024, 64, (g, w, h) => {
    g.fillStyle = '#1f6f8b';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff';
    g.textBaseline = 'middle';
    g.font = `40px ${FONT_D}`;
    g.fillText('COLD DRINKS', 24, 34);
    g.font = `800 36px ${FONT_R}`;
    g.fillText('つめた〜い', 380, 34);
    g.fillStyle = '#9ee7ff';
    for (let i = 0; i < 12; i++) g.fillRect(620 + i * 32, 22, 18, 18);
  });

  const bento = ctex(512, 96, (g, w, h) => {
    g.fillStyle = ORANGE;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `800 50px ${FONT_R}`;
    g.fillText('おにぎり・お弁当', w / 2, 50);
  });

  const notice = ctex(512, 340, (g) => {
    g.fillStyle = '#b98b5a';
    g.fillRect(0, 0, 512, 340);
    const items: [string, string, number, number, number, number][] = [
      ['#fff8e7', '回覧板', 20, 20, 150, 130],
      ['#ffe1e1', '迷い猫', 186, 30, 130, 150],
      ['#e3f1ff', '夏祭', 336, 18, 150, 120],
      ['#fffbe0', '防犯パトロール実施中', 30, 176, 300, 130],
      ['#e8ffe9', '町内会のお知らせ', 344, 160, 150, 160],
    ];
    for (const [c, t, x, y, iw, ih] of items) {
      g.save();
      g.translate(x + iw / 2, y + ih / 2);
      g.rotate(rand(-0.06, 0.06));
      g.fillStyle = c;
      g.fillRect(-iw / 2, -ih / 2, iw, ih);
      g.fillStyle = '#333';
      g.font = `800 ${t.length > 5 ? 20 : 30}px ${FONT_R}`;
      g.textAlign = 'center';
      g.fillText(t, 0, -ih / 2 + 38);
      g.fillStyle = 'rgba(0,0,0,.25)';
      for (let i = 0; i < 4; i++) g.fillRect(-iw / 2 + 14, -ih / 2 + 60 + i * 16, iw - 28, 5);
      g.fillStyle = '#e63946';
      g.beginPath();
      g.arc(0, -ih / 2 + 8, 6, 0, 7);
      g.fill();
      g.restore();
    }
  });

  const stopSign = ctex(256, 230, (g, w, h) => {
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(4, 4);
    g.lineTo(w - 4, 4);
    g.lineTo(w / 2, h - 4);
    g.closePath();
    g.fill();
    g.fillStyle = '#d0202e';
    g.beginPath();
    g.moveTo(22, 16);
    g.lineTo(w - 22, 16);
    g.lineTo(w / 2, h - 30);
    g.closePath();
    g.fill();
    g.fillStyle = '#fff';
    g.font = `800 50px ${FONT_R}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('止まれ', w / 2, 70);
  });

  const addressPlate = ctex(96, 360, (g, w, h) => {
    g.fillStyle = '#1f4fa8';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fff';
    g.lineWidth = 4;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#fff';
    g.font = `800 50px ${FONT_R}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    [...'夜野町三丁目'].forEach((c, i) => g.fillText(c, w / 2, 36 + i * 57));
  });

  const roadStop = ctex(256, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.save();
    g.scale(1, 2.4);
    g.font = `800 82px ${FONT_R}`;
    g.fillText('止まれ', w / 2, h / 4.8);
    g.restore();
  });

  const diamond = ctex(128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#fff';
    g.lineWidth = 12;
    g.beginPath();
    g.moveTo(w / 2, 8);
    g.lineTo(w - 8, h / 2);
    g.lineTo(w / 2, h - 8);
    g.lineTo(8, h / 2);
    g.closePath();
    g.stroke();
  });

  const tile = ctex(
    128,
    128,
    (g, w, h) => {
      g.fillStyle = '#5a6072';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#4a4f60';
      g.fillRect(0, 0, w, 3);
      g.fillRect(0, 64, w, 3);
      g.fillRect(0, 0, 3, h);
      g.fillRect(64, 0, 3, h);
      g.fillStyle = 'rgba(255,255,255,.04)';
      g.fillRect(8, 8, 50, 50);
      g.fillRect(72, 72, 50, 50);
    },
    [1, 1],
  );

  const floor = ctex(
    128,
    128,
    (g, w, h) => {
      g.fillStyle = '#f1ece1';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#ddd5c6';
      g.fillRect(0, 0, w, 2);
      g.fillRect(0, 0, 2, h);
    },
    [9.5, 6],
  );

  const grate = ctex(
    64,
    64,
    (g, w, h) => {
      g.fillStyle = '#23262f';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#0c0d12';
      for (let i = 0; i < 8; i++) g.fillRect(i * 8 + 2, 6, 4, h - 12);
    },
    [1, 1],
  );

  const mat = ctex(256, 128, (g, w, h) => {
    g.fillStyle = '#2b3242';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = TEAL;
    g.lineWidth = 6;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#cfd7e6';
    g.font = `800 30px ${FONT_R}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('いらっしゃいませ', w / 2, h / 2);
  });

  const door = ctex(256, 48, (g, w, h) => {
    g.fillStyle = TEAL;
    roundRect(g, 0, 0, w, h, 10);
    g.fill();
    g.fillStyle = '#fff';
    g.font = `800 30px ${FONT_R}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('自動ドア', w / 2, h / 2 + 1);
  });

  const shutter = ctex(256, 256, (g, w, h) => {
    g.fillStyle = '#8c929c';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 10) {
      g.fillStyle = '#6f7580';
      g.fillRect(0, y, w, 3);
    }
    g.fillStyle = 'rgba(40,40,60,.35)';
    g.fillRect(0, h - 30, w, 30);
  });

  const kissa = ctex(512, 128, (g, w, h) => {
    g.fillStyle = '#e9dcc0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#6b3b2a';
    g.font = `70px ${FONT_D}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('喫茶ルナ', w / 2, h / 2 + 4);
  });

  const nobori = ctex(96, 480, (g, w, h) => {
    g.fillStyle = '#d7263d';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff';
    g.fillRect(0, 0, 10, h);
    g.fillStyle = '#fff';
    g.font = `62px ${FONT_D}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    [...'おでん'].forEach((c, i) => g.fillText(c, w / 2 + 4, 90 + i * 110));
  });

  const staffOnly = ctex(256, 64, (g, w, h) => {
    g.fillStyle = '#ffd23f';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d2340';
    g.font = `40px ${FONT_D}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('STAFF ONLY', w / 2, h / 2 + 2);
  });

  return {
    fascia,
    pylon,
    vend1,
    vend2,
    posterOden,
    posterNiku,
    posterIchigo,
    cigarette,
    menu,
    cooler,
    bento,
    notice,
    stopSign,
    roadStop,
    addressPlate,
    diamond,
    tile,
    floor,
    grate,
    mat,
    door,
    shutter,
    kissa,
    nobori,
    staffOnly,
  };
}

export const PLAQUE_LAYOUT = {
  width: 2400,
  height: 390,
  lines: [
    { fontPx: 130, y: 100 },
    { fontPx: 60, y: 208 },
    { fontPx: 116, y: 300 },
  ],
} as const;

export function drawPlaque(ctx: CanvasRenderingContext2D, language: Language): void {
  const { width, height, lines } = PLAQUE_LAYOUT;
  const maxWidth = width - 160;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#e2bf66');
  gradient.addColorStop(0.5, '#b68b35');
  gradient.addColorStop(1, '#d6af55');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#6b4f1a';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, width - 24, height - 24);
  ctx.fillStyle = '#3a290b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${lines[0].fontPx}px ${FONT_D}`;
  ctx.fillText('FUBUKI_BB', width / 2, lines[0].y, maxWidth);
  ctx.font = `800 ${lines[1].fontPx}px ${FONT_R}`;
  ctx.fillText(rolesLine(language), width / 2, lines[1].y, maxWidth);
  ctx.font = `500 ${lines[2].fontPx}px ${FONT_R}`;
  ctx.fillText(locationLine(), width / 2, lines[2].y, maxWidth);
}
