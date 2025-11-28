import { APP_DATA } from './data';
import { Project, Skill } from './types';

export const PROJECTS: Project[] = APP_DATA.projects as unknown as Project[];
export const SKILLS: Skill[] = APP_DATA.skills as unknown as Skill[];
export const SOCIAL_LINKS = APP_DATA.socialLinks;
export const PROFILE = APP_DATA.profile;
export const TERMINAL_CONFIG = APP_DATA.terminal;
export const AI_CONFIG = APP_DATA.ai;