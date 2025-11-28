import React from 'react';

export enum TerminalCommandType {
  HELP = 'HELP',
  ABOUT = 'ABOUT',
  PROJECTS = 'PROJECTS',
  SKILLS = 'SKILLS',
  CONTACT = 'CONTACT',
  CLEAR = 'CLEAR',
  AI = 'AI',
  UNKNOWN = 'UNKNOWN'
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error';
  content: string | React.ReactNode;
  timestamp: Date;
}

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
  level: number; // 0-100
  category: 'Frontend' | 'Backend' | 'DevOps' | 'Tools';
}
