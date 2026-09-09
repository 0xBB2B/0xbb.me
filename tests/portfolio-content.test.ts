import { expect, test } from 'bun:test';
import * as THREE from 'three';
import { APP_DATA } from '../data';
import { LIGHTHOUSE_COPY, npcPages } from '../portfolio/copy';
import { ROAD } from '../portfolio/journey';
import { advance, createSession, setLanguage, updateProximity } from '../portfolio/state';
import { createWorld } from '../portfolio/world';
import { disposeScene } from '../portfolio/geometry';

test('skills and projects have substantive bilingual multi-paragraph reading without inventing ratings', () => {
  for (const language of ['en', 'zh'] as const) {
    expect(APP_DATA.profile.bio[language].split('\n\n')).toHaveLength(2);
    for (const skill of APP_DATA.skills) {
      const conciseAgent = skill.id === 'ai-agent';
      expect(skill.detail[language].split('\n\n')).toHaveLength(conciseAgent ? 2 : 3);
      expect(skill.detail[language].length).toBeGreaterThan(conciseAgent ? (language === 'en' ? 250 : 100) : (language === 'en' ? 350 : 170));
      expect(skill.detail[language]).not.toMatch(/\b(?:level|rating|score)\b|等级|评级|评分|\d+\s*%/i);
      expect(skill).not.toHaveProperty('level');
    }
    for (const project of APP_DATA.projects) {
      expect(project.description[language].split('\n\n')).toHaveLength(3);
      expect(project.description[language].length).toBeGreaterThan(language === 'en' ? 350 : 170);
    }
    for (const page of npcPages('greeter', language)) expect(page.body.split('\n\n')).toHaveLength(3);
  }
});

test('skill reading describes the user-confirmed systems and practical outcomes instead of technology definitions', () => {
  const skills = Object.fromEntries(APP_DATA.skills.map(skill => [skill.id, skill]));
  expect(skills.golang.detail.zh).toContain('最拿手');
  expect(skills.golang.detail.zh).toMatch(/从零.*SDK 框架.*网页积分商城/s);
  expect(skills['docker-k8s'].detail.zh).toContain('所有开发和部署');
  expect(skills['game-publishing-sdk'].detail.zh).toMatch(/国内开发商.*各个国家的登录与支付.*开发成本/s);
  expect(skills['payment-platforms'].detail.zh).toMatch(/多个国家的支付渠道.*网页积分商城.*在线积分活动/s);
  for (const language of ['en', 'zh'] as const) {
    expect(skills['ai-agent'].detail[language]).toContain('bb-spec');
    expect(skills['ai-agent'].detail[language]).toContain('pi-subagent-cluster');
  }
});

test('the lighthouse note appears only at the end and preserves the selected language without locking the route', () => {
  const session = createSession();
  session.x = ROAD.end - 2; updateProximity(session); expect(session.atLighthouse).toBe(false);
  session.x = ROAD.end; updateProximity(session); expect(session.atLighthouse).toBe(true);
  setLanguage(session, 'zh'); expect(session.atLighthouse).toBe(true);
  expect(LIGHTHOUSE_COPY.zh.welcome).toContain('这里永远欢迎你回来');
  expect(LIGHTHOUSE_COPY.en.welcome).toContain('always welcome back');
  advance(session, -1, .5); expect(session.atLighthouse).toBe(false);
  expect(session.reader).toBeNull();
});

test('surf crests travel toward the shore instead of increasing their offshore distance', () => {
  const world = createWorld();
  try {
    const material = (world.scene.getObjectByName('Sea_surface') as THREE.Mesh).material as THREE.ShaderMaterial;
    expect(material.uniforms.uShorewardSpeed.value).toBeGreaterThan(0);
    expect(material.fragmentShader).toContain('shoreDistance+uTime*uShorewardSpeed');
    expect(material.fragmentShader).toContain('p.y*3.65-p.x*0.43-uTime*0.51');
    const distanceAtStart = 1;
    const distanceLater = distanceAtStart - material.uniforms.uShorewardSpeed.value * 2;
    expect(distanceLater).toBeLessThan(distanceAtStart);
  } finally { disposeScene(world.scene); }
});
