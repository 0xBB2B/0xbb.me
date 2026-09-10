import { APP_DATA, type LocalizedText } from '../data';

export type SceneId = 'town' | 'workshop' | 'gallery';
export type NpcId = 'greeter';
export type DoorId = 'town-door' | 'sea-door';
export type BoardId = typeof BOARD_IDS[number];
export type BoardKind = 'skill' | 'project';

export type JourneyBoard = {
  id: BoardId;
  kind: BoardKind;
  x: number;
  title: LocalizedText;
  summary: LocalizedText;
  detail: LocalizedText;
  link?: string;
  repo?: string;
  status?: string;
};

export type JourneyScene = {
  id: SceneId;
  order: 1 | 2 | 3;
  start: number;
  end: number;
  name: LocalizedText;
  npc: { id: NpcId; x: number } | null;
  boards: readonly JourneyBoard[];
};

export const INTERACTION_DISTANCE = 1.8;
export const BOARD_IDS = [
  'ai-agent', 'golang', 'docker-k8s', 'game-publishing-sdk', 'payment-platforms',
  '0xbb.me', 'bb-spec', 'pi-subagent-cluster',
] as const;

const skillPositions = [23, 27, 31, 35, 39];
const projectPositions = [49, 55, 61];
const skillBoards: JourneyBoard[] = APP_DATA.skills.map((skill, index) => ({
  id: skill.id as BoardId,
  kind: 'skill',
  x: skillPositions[index],
  title: skill.title,
  summary: skill.summary,
  detail: skill.detail,
}));
const projectBoards: JourneyBoard[] = APP_DATA.projects.map((project, index) => ({
  id: project.id as BoardId,
  kind: 'project',
  x: projectPositions[index],
  title: { en: project.title, zh: project.title },
  summary: project.description,
  detail: project.description,
  link: project.link,
  repo: project.repo,
  status: project.status,
}));

export const JOURNEY: readonly JourneyScene[] = [
  { id: 'town', order: 1, start: -8, end: 20, name: { en: 'Dusk town', zh: '黄昏小镇' }, npc: { id: 'greeter', x: 2 }, boards: [] },
  { id: 'workshop', order: 2, start: 20, end: 44, name: { en: 'Tech workshop', zh: '科技工坊' }, npc: null, boards: skillBoards },
  { id: 'gallery', order: 3, start: 44, end: projectPositions[projectPositions.length - 1] + 9.5, name: { en: 'Starlit shore', zh: '星夜海岸' }, npc: null, boards: projectBoards },
] as const;

export const ROAD = { start: JOURNEY[0].start, end: JOURNEY[JOURNEY.length - 1].end } as const;
export const BOARDWALK = { start: JOURNEY[2].start, end: ROAD.end + 1, width: 4.8 } as const;
export const ROOM_DOORS: readonly { id: DoorId; x: number }[] = [
  { id: 'town-door', x: JOURNEY[1].start },
  { id: 'sea-door', x: JOURNEY[1].end },
];
export const DOOR_CLEARANCE = .65;
export const DOOR_OPEN_SECONDS = .7;
export const GREETER_X = JOURNEY[0].npc!.x;
export const BOARDS = JOURNEY.flatMap(scene => scene.boards);

export function sceneAt(x: number): JourneyScene {
  return JOURNEY.find((scene, index) => index === JOURNEY.length - 1 || x < scene.end) ?? JOURNEY[JOURNEY.length - 1];
}

export function nearbyNpcAt(x: number): NpcId | null {
  return Math.abs(x - GREETER_X) <= INTERACTION_DISTANCE + Number.EPSILON * 8 ? 'greeter' : null;
}

export function nearbyBoardAt(x: number): BoardId | null {
  return BOARDS.find(board => Math.abs(x - board.x) <= INTERACTION_DISTANCE + Number.EPSILON * 8)?.id ?? null;
}

export function npcById(_id: NpcId) {
  return JOURNEY[0].npc!;
}

export function boardById(id: BoardId) {
  return BOARDS.find(board => board.id === id)!;
}
