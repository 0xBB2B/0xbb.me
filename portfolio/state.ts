import type { Language } from '../data';
import { NPC_REACTION_SECONDS, npcReactionFrame } from './npc-reaction';
import {
  GREETER_X, INTERACTION_DISTANCE, ROAD, nearbyBoardAt, nearbyNpcAt, sceneAt,
  ROOM_DOORS, DOOR_CLEARANCE, DOOR_OPEN_SECONDS,
  type BoardId, type DoorId, type NpcId, type SceneId,
} from './journey';

export type Direction = -1 | 0 | 1;
export type Reader = 'dialogue' | 'board' | 'overview' | null;
export const PLAYER_APPEARANCES = ['black', 'dress'] as const;
export type PlayerAppearance = typeof PLAYER_APPEARANCES[number];
export const APPEARANCE_CHANGE_SECONDS = .65;
const JUMP_SPEED = 5.6;
const JUMP_GRAVITY = 16;
export { GREETER_X, INTERACTION_DISTANCE, ROAD };

type Listener = () => void;

export function createSession() {
  return {
    x: ROAD.start,
    facing: 1 as -1 | 1,
    walking: false,
    stride: 0,
    sprintBlend: 0,
    jumpOffset: 0,
    jumpVelocity: 0,
    jumpPose: { lead: -1, stride: 0, sprintBlend: 0 },
    appearance: 'black' as PlayerAppearance,
    appearanceTransition: null as { target: PlayerAppearance; elapsed: number } | null,
    outfitComplimentSeen: false,
    npcReaction: null as { elapsed: number } | null,
    paused: false,
    language: 'en' as Language,
    reader: null as Reader,
    dialoguePage: 0,
    scene: sceneAt(ROAD.start).id as SceneId,
    nearbyNpc: null as NpcId | null,
    dialogueNpc: null as NpcId | null,
    nearbyBoard: null as BoardId | null,
    boardId: null as BoardId | null,
    atLighthouse: false,
    nearbyDoor: null as DoorId | null,
    openingDoor: null as DoorId | null,
    doors: { 'town-door': 0, 'sea-door': 0 } as Record<DoorId, number>,
    listeners: new Set<Listener>(),
  };
}
export type Session = ReturnType<typeof createSession>;

export function subscribeSession(session: Session, listener: Listener) {
  session.listeners.add(listener);
  return () => { session.listeners.delete(listener); };
}

function notify(session: Session) {
  session.listeners.forEach(listener => listener());
}

export function setLanguage(session: Session, language: Language) {
  if (session.language === language) return;
  session.language = language;
  notify(session);
}

export function jump(session: Session) {
  if (session.paused || session.reader || session.openingDoor || session.appearanceTransition || session.npcReaction
    || session.jumpOffset > 0 || session.jumpVelocity > 0) return false;
  const stride = session.walking ? Math.sin(session.stride) : 0;
  const lead = session.walking
    ? (Math.abs(stride) > 1e-6 ? Math.sign(stride) : Math.sign(Math.cos(session.stride)))
    : -1;
  session.jumpPose = { lead, stride, sprintBlend: session.sprintBlend };
  session.jumpVelocity = JUMP_SPEED;
  session.stride = 0;
  return true;
}

export function cycleAppearance(session: Session) {
  if (!session.atLighthouse || session.reader || session.openingDoor || session.appearanceTransition || session.npcReaction) return false;
  const target = PLAYER_APPEARANCES[(PLAYER_APPEARANCES.indexOf(session.appearance) + 1) % PLAYER_APPEARANCES.length];
  session.appearanceTransition = { target, elapsed: 0 };
  session.walking = false;
  session.stride = 0;
  session.sprintBlend = 0;
  notify(session);
  return true;
}

export function openOverview(session: Session) {
  if (session.reader || session.openingDoor || session.appearanceTransition || session.npcReaction) return false;
  session.reader = 'overview';
  session.paused = true;
  notify(session);
  return true;
}

export function openDialogue(session: Session) {
  if (session.reader || session.openingDoor || session.appearanceTransition || session.npcReaction || !session.nearbyNpc) return false;
  if (session.nearbyNpc === 'greeter' && session.appearance === 'dress' && !session.outfitComplimentSeen) {
    session.outfitComplimentSeen = true;
    session.npcReaction = { elapsed: 0 };
    session.paused = true;
    session.walking = false;
    session.stride = 0;
    session.sprintBlend = 0;
    notify(session);
    return true;
  }
  session.reader = 'dialogue';
  session.dialogueNpc = session.nearbyNpc;
  session.dialoguePage = 0;
  session.paused = true;
  notify(session);
  return true;
}

export function openBoard(session: Session) {
  if (session.reader || session.openingDoor || session.appearanceTransition || session.npcReaction || !session.nearbyBoard) return false;
  session.reader = 'board';
  session.boardId = session.nearbyBoard;
  session.paused = true;
  notify(session);
  return true;
}

export function openNearbyDoor(session: Session) {
  if (session.reader || session.openingDoor || session.appearanceTransition || session.npcReaction) return false;
  const door = ROOM_DOORS.find(door => session.doors[door.id] < 1 && Math.abs(session.x - door.x) <= INTERACTION_DISTANCE);
  if (!door) return false;
  session.openingDoor = door.id;
  session.walking = false;
  notify(session);
  return true;
}

export function cancelNpcReaction(session: Session) {
  if (!session.npcReaction) return;
  session.npcReaction = null;
  session.paused = !!session.reader;
  session.walking = false;
  notify(session);
}

export function cancelAppearanceChange(session: Session) {
  if (!session.appearanceTransition) return;
  session.appearanceTransition = null;
  notify(session);
}

export function cancelDoorOpening(session: Session) {
  if (!session.openingDoor) return;
  session.doors[session.openingDoor] = 0;
  session.openingDoor = null;
  notify(session);
}

export function setDialoguePage(session: Session, page: number) {
  if (session.reader !== 'dialogue') return;
  session.dialoguePage = Math.max(0, Math.min(2, page));
  notify(session);
}

export function closeReader(session: Session) {
  if (!session.reader) return;
  session.reader = null;
  session.dialogueNpc = null;
  session.boardId = null;
  session.dialoguePage = 0;
  session.paused = false;
  session.walking = false;
  notify(session);
}

export function updateProximity(session: Session) {
  const nearbyNpc = nearbyNpcAt(session.x);
  const nearbyBoard = nearbyBoardAt(session.x);
  const scene = sceneAt(session.x).id;
  const nearbyDoor = ROOM_DOORS.find(door => session.doors[door.id] < 1 && Math.abs(session.x - door.x) <= INTERACTION_DISTANCE)?.id ?? null;
  const atLighthouse = session.x >= ROAD.end - 1.2;
  if (nearbyNpc === session.nearbyNpc && nearbyBoard === session.nearbyBoard && scene === session.scene && nearbyDoor === session.nearbyDoor && atLighthouse === session.atLighthouse) return;
  session.nearbyNpc = nearbyNpc;
  session.nearbyBoard = nearbyBoard;
  session.scene = scene;
  session.nearbyDoor = nearbyDoor;
  session.atLighthouse = atLighthouse;
  notify(session);
}

export function advance(session: Session, direction: Direction, seconds: number, sprinting = false, elapsedSeconds = seconds) {
  const previous = session.x;
  const wasAirborne = session.jumpOffset > 0 || session.jumpVelocity > 0;
  if (!session.paused && !session.reader && !session.openingDoor && !session.appearanceTransition && !session.npcReaction
    && (session.jumpOffset > 0 || session.jumpVelocity > 0)) {
    session.jumpOffset = Math.max(0, session.jumpOffset + session.jumpVelocity * seconds - .5 * JUMP_GRAVITY * seconds * seconds);
    session.jumpVelocity = session.jumpOffset > 0 ? session.jumpVelocity - JUMP_GRAVITY * seconds : 0;
  }
  if (session.npcReaction) {
    const reaction = session.npcReaction;
    const frame = npcReactionFrame(reaction.elapsed);
    reaction.elapsed += elapsedSeconds;
    if (reaction.elapsed >= NPC_REACTION_SECONDS) cancelNpcReaction(session);
    else if (npcReactionFrame(reaction.elapsed) !== frame) notify(session);
  } else if (session.appearanceTransition) {
    const transition = session.appearanceTransition;
    transition.elapsed += seconds;
    if (transition.elapsed >= APPEARANCE_CHANGE_SECONDS / 2 && session.appearance !== transition.target) {
      session.appearance = transition.target;
      notify(session);
    }
    if (transition.elapsed >= APPEARANCE_CHANGE_SECONDS) {
      session.appearanceTransition = null;
      notify(session);
    }
  } else if (session.openingDoor) {
    const id = session.openingDoor;
    session.doors[id] = Math.min(1, session.doors[id] + seconds / DOOR_OPEN_SECONDS);
    if (session.doors[id] >= 1) {
      session.openingDoor = null;
      notify(session);
    }
  } else if (!session.paused && direction) {
    session.facing = direction;
    let next = Math.max(ROAD.start, Math.min(ROAD.end, previous + direction * (sprinting ? 5.6 : 3.2) * seconds));
    for (const door of ROOM_DOORS) {
      if (session.doors[door.id] >= 1) continue;
      if (direction > 0 && previous < door.x) next = Math.max(previous, Math.min(next, door.x - DOOR_CLEARANCE));
      if (direction < 0 && previous > door.x) next = Math.min(previous, Math.max(next, door.x + DOOR_CLEARANCE));
    }
    session.x = next;
  }
  session.walking = session.x !== previous;
  const running = session.walking && sprinting;
  session.sprintBlend += ((running ? 1 : 0) - session.sprintBlend) * (1 - Math.exp(-seconds * 14));
  session.stride = session.walking && !wasAirborne ? session.stride + Math.abs(session.x - previous) * (running ? 2.6 : 4.2) : 0;
  updateProximity(session);
}
