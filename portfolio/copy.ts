import type { Language } from '../data';
import type { NpcId, SceneId } from './journey';

export const UI_COPY = {
  en: {
    overview: 'Quick overview',
    left: 'Move left', right: 'Move right', walk: 'Hold to walk · Release to pause', keyboard: 'A / D  or  ← / → · Shift to run · Space to jump',
    changeCharacter: 'Switch outfit', changingCharacter: 'Changing outfit…',
    npcSurprised: 'The greeter is surprised', outfitCompliment: 'Your new outfit looks great!',
    appearanceBlack: 'Black outfit', appearanceDress: 'A · Black gown',
    closeOverview: 'Back to town', profile: 'The person behind the code', skills: 'Skills', projects: 'Projects',
    source: 'Source', visit: 'Visit', contacts: 'Find me elsewhere', talk: 'Talk', view: 'View',
    enterRoom: 'Open & enter', exitRoom: 'Open & exit', openingDoor: 'Opening door…',
    previous: 'Previous page', next: 'Next page', closeDialogue: 'Close introduction', closeBoard: 'Close details',
    graphicsUnavailable: 'Graphics unavailable. The complete profile remains available below.',
    overviewLabel: 'Profile overview', dialogueLabel: 'World lore', boardLabel: 'Details',
  },
  zh: {
    overview: '资料速览', left: '向左', right: '向右',
    walk: '按住行走 · 松开停下', keyboard: 'A / D  或  ← / → · Shift 快跑 · 空格跳跃', closeOverview: '返回城镇',
    changeCharacter: '切换服装', changingCharacter: '正在换装…',
    npcSurprised: '迎宾者感到惊讶', outfitCompliment: '新服装真好看',
    appearanceBlack: '黑装', appearanceDress: 'A · 黑色长裙',
    profile: '代码背后的我', skills: '技能', projects: '作品', source: '源码', visit: '访问', contacts: '联系入口',
    talk: '交谈', view: '查看', previous: '上一页', next: '下一页', closeDialogue: '关闭介绍', closeBoard: '关闭详情',
    enterRoom: '开门进入', exitRoom: '开门离开', openingDoor: '正在开门…',
    graphicsUnavailable: '图形不可用，完整个人资料仍可在下方阅读。',
    overviewLabel: '资料速览', dialogueLabel: '世界观', boardLabel: '内容详情',
  },
} satisfies Record<Language, Record<string, string>>;

export const SCENE_COPY: Record<SceneId, Record<Language, { chapter: string; title: string; welcome: string }>> = {
  town: {
    en: { chapter: '01 / A WALK AT GOLDEN HOUR', title: 'A little town.\nA wider world.', welcome: 'Take the quieter road through town. Meet a resident, listen to the stories of this world, then follow the lights beyond the door.' },
    zh: { chapter: '01 / 漫步于日落时分', title: '一座小镇，\n一个更大的世界。', welcome: '沿着黄昏里的石板路慢慢走，听原住民讲讲这个世界。再推开一扇门，循着微光继续前行。' },
  },
  workshop: {
    en: { chapter: '02 / INSIDE THE DATA FOUNDRY', title: 'Systems at work.\nIdeas online.', welcome: 'Behind the steady hum of the room are five ways of thinking about engineering. Read at your own pace; the far door leads back to open sky.' },
    zh: { chapter: '02 / 走进地下数据工厂', title: '系统运转，\n灵感在线。', welcome: '在机器低声运转的房间里，五台终端记录着五种工程思考。慢慢读，不必赶路；另一端的门，通向海风与星空。' },
  },
  gallery: {
    en: { chapter: '03 / TOWARD THE STARS AND SEA', title: 'A sea of stars.\nA world ahead.', welcome: 'Leave a story among the stars, and let the horizon call you onward. Read a project, follow the tide, and find the lighthouse waiting by the shore.' },
    zh: { chapter: '03 / 向着星辰大海', title: '奔赴心中的\n星辰大海。', welcome: '把故事留在星光里，把脚步交给远方。走近星辰，读一段旅程，再循着潮声去见那座灯塔。' },
  },
};

export const LIGHTHOUSE_COPY = {
  en: {
    chapter: 'A LIGHT TO COME BACK TO',
    title: 'Go where your heart leads.',
    welcome: 'There is a long road ahead, and so much life yet to live.\nGo after the life you long for.\n\nWhen you feel tired or lost, remember this lighthouse.\nYou are always welcome back.',
  },
  zh: {
    chapter: '留一盏灯，等你回来',
    title: '向着心中的远方。',
    welcome: '路还很长，人生还有很多可能。\n去追求你向往的生活吧。\n\n累了，迷茫了，就想起这座灯塔。\n这里永远欢迎你回来。',
  },
} satisfies Record<Language, { chapter: string; title: string; welcome: string }>;

export type NpcPage = { title: string; body: string };

export function npcSpeaker(_npc: NpcId, language: Language) {
  return language === 'en' ? 'NPC · GREETER' : 'NPC · 迎宾者';
}

export function npcPages(_npc: NpcId, language: Language): NpcPage[] {
  if (language === 'en') return [
    { title: 'The town and the long road', body: 'Welcome, traveler. I live here, where the last sunlight rests on the rooftops and the lamps come on before the evening turns cold. These stones have welcomed many footsteps; today, they are glad to welcome yours.\n\nPeople here say this road joins three kinds of light: the warmth of the town, the patient glow behind the factory walls, and the distant lights above the sea. No two travelers find quite the same story along it.\n\nYou do not need to arrive with a destination in mind. Stay a while, listen to the quiet, and leave when your feet are ready. In this town, a pause is part of the journey.' },
    { title: 'Beyond the factory door', body: 'Follow the road past the houses and you will find an old factory. Its windows keep a little light even after dusk. Stand by the door and open it when you are ready; the room does not reveal itself to someone who only passes by.\n\nInside, pipes cross overhead like underground rivers. The conveyor carries small pieces through the hush of machinery, and five terminals keep their pages lit. Around here, we think of that room as a place where scattered ideas learn to fit together.\n\nRead whichever screen catches your eye. Nothing asks you to hurry or finish a task. When you want fresh air again, the door at the far end leads toward the shore.' },
    { title: 'The stars and the way home', body: 'Beyond the factory, the land opens into a luminous sea. A blue light gathers in the waves, then softens as they reach the shore. Three bright stars hang above the horizon, each holding a story for anyone who walks close enough to listen.\n\nFollow the boardwalk and you will reach the lighthouse. Its beam turns slowly through the dark, never asking where you have been. I like to think it is not pointing out a single right direction—it is reminding us that a way back still exists.\n\nThat is the whole of our little world: a town to rest in, a room to discover, and a shore from which to look farther. Go and find what calls to you, traveler. We will keep a light here.' },
  ];
  return [
    { title: '小镇与长路', body: '欢迎你，旅人。我就住在这里——落日会在屋顶多停留一会儿，街灯总比晚风早一点亮起。脚下这些石板迎来送往，记得许多人的脚步；今天，也很高兴见到你。\n\n镇上的人说，这条路连接着三种光：小镇窗里的暖光、工厂深处耐心亮着的微光，还有海面上方遥远的星光。走过同一条路的人，带走的故事却各不相同。\n\n你不必带着一个确定的目的地来。想停就停，想听就多听一会儿，等脚步准备好了再出发。在我们这里，停留也是旅程的一部分。' },
    { title: '门后的工厂', body: '沿着路走过这些房屋，就会看到那座老工厂。天暗下来以后，窗里仍留着一点光。走到门前，准备好了就亲手打开它；只是匆匆路过的人，看不见房间里的模样。\n\n里面的管线像地下的河流，从头顶安静地穿过。流水线载着小小的零件，五台终端各自亮着一页文字。我们把那里看作一个让散落的想法慢慢找到彼此的位置的地方。\n\n哪一台屏幕吸引你，就去读一读。不用赶工，也没有必须完成的任务。等你想重新吹吹风，另一端的门会把你带向海岸。' },
    { title: '星海与归航', body: '走出工厂，眼前就是那片会发光的海。蓝色微光在浪里聚拢，靠近岸边又轻轻散开。海平线上方有三颗明亮的星星，每一颗都替走近的人收着一个故事。\n\n沿木板路一直走，就能到灯塔旁。它的光缓缓转过黑夜，从不追问你去了哪里。我总觉得，它不是在替人指定唯一正确的方向，而是在提醒我们：回来的路还在。\n\n这就是我们的小小世界——一座可以歇脚的镇子，一个值得推门探看的房间，一片让目光走得更远的海。去找令你向往的生活吧，旅人。我们会在这里留一盏灯。' },
  ];
}
