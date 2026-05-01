export interface Project {
  id: string;
  title: string;
  description: string;
  tech: string[];
  link?: string;
  repo?: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEVELOPMENT';
}

export interface Skill {
  name: string;
  level: number; // 技能等级，普通技能按百分比展示，特殊技能可使用 LV.999。
  category: 'Frontend' | 'Backend' | 'DevOps' | 'Tools';
}
