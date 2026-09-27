import { expect, test, describe } from 'bun:test';
import * as viewState from '../diorama/view-state';

type ViewState = { view: 'diorama' | 'entering' | 'story'; ready: boolean; failed: boolean };

function state(view: ViewState['view'], ready = false, failed = false): ViewState {
  return { view, ready, failed };
}

describe('diorama + clickPlaque', () => {
  test('3D 就绪时点铭牌进入 entering', () => {
    expect(viewState.transition(state('diorama', true), 'clickPlaque').view).toBe('entering');
  });

  test('3D 未就绪时点铭牌无效，仍停在 diorama', () => {
    const result = viewState.transition(state('diorama', false), 'clickPlaque');
    expect(result).toEqual(state('diorama', false));
  });
});

describe('entering', () => {
  test('进入完成后切到 story', () => {
    expect(viewState.transition(state('entering'), 'enterDone').view).toBe('story');
  });

  test('entering 期间点铭牌被忽略', () => {
    const result = viewState.transition(state('entering', true, false), 'clickPlaque');
    expect(result).toEqual(state('entering', true, false));
  });

  test('entering 期间滚到顶被忽略', () => {
    const result = viewState.transition(state('entering', true, false), 'reachTop');
    expect(result).toEqual(state('entering', true, false));
  });
});

describe('story + reachTop', () => {
  test('3D 就绪且未失败：滚到顶回到 diorama', () => {
    expect(viewState.transition(state('story', true, false), 'reachTop').view).toBe('diorama');
  });

  test('3D 未就绪：滚到顶仍停在 story', () => {
    expect(viewState.transition(state('story', false, false), 'reachTop').view).toBe('story');
  });

  test('3D 已失败：滚到顶仍停在 story', () => {
    expect(viewState.transition(state('story', true, true), 'reachTop').view).toBe('story');
  });
});

describe('任意状态 + 先看资料 → story', () => {
  for (const view of ['diorama', 'entering', 'story'] as const) {
    test(`${view} + readFirst → story`, () => {
      expect(viewState.transition(state(view), 'readFirst').view).toBe('story');
    });
  }
});

describe('任意状态 + 三维失败 → story 且标记失败', () => {
  for (const view of ['diorama', 'entering', 'story'] as const) {
    test(`${view} + sceneFailed → story 且 failed 为 true`, () => {
      const result = viewState.transition(state(view, true, false), 'sceneFailed');
      expect(result.view).toBe('story');
      expect(result.failed).toBe(true);
    });
  }
});

describe('sceneReady', () => {
  test('只把就绪标记置真，不改变视角', () => {
    expect(viewState.transition(state('diorama', false), 'sceneReady')).toEqual(state('diorama', true));
    expect(viewState.transition(state('entering', false), 'sceneReady').view).toBe('entering');
    expect(viewState.transition(state('story', false), 'sceneReady').view).toBe('story');
  });
});

describe('transition 不修改传入对象', () => {
  test('冻结的输入状态调用后原对象字段不变', () => {
    const frozen = Object.freeze(state('diorama', true));
    expect(() => viewState.transition(frozen, 'clickPlaque')).not.toThrow();
    expect(frozen).toEqual(state('diorama', true));
  });
});

describe('acceptsSceneInput', () => {
  test('仅 diorama 且 3D 就绪时为真', () => {
    expect(viewState.acceptsSceneInput(state('diorama', true))).toBe(true);
  });

  test('diorama 但 3D 未就绪时为假', () => {
    expect(viewState.acceptsSceneInput(state('diorama', false))).toBe(false);
  });

  test('entering 时为假', () => {
    expect(viewState.acceptsSceneInput(state('entering', true))).toBe(false);
  });

  test('story 时为假', () => {
    expect(viewState.acceptsSceneInput(state('story', true))).toBe(false);
  });
});

describe('不适用的事件保持原状态', () => {
  test.each([
    ['diorama', 'enterDone'],
    ['diorama', 'reachTop'],
    ['story', 'clickPlaque'],
    ['story', 'enterDone'],
  ] as const)('%s + %s 保持不变', (view, event) => {
    const before = state(view, true, false);
    expect(viewState.transition(before, event)).toEqual(before);
  });
});
