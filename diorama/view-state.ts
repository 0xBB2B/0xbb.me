export type View = 'diorama' | 'entering' | 'story';

export interface ViewState {
  view: View;
  ready: boolean;
  failed: boolean;
}

export type ViewEvent = 'clickPlaque' | 'enterDone' | 'reachTop' | 'readFirst' | 'sceneReady' | 'sceneFailed';

export function transition(state: ViewState, event: ViewEvent): ViewState {
  if (event === 'readFirst') return { view: 'story', ready: state.ready, failed: state.failed };
  if (event === 'sceneFailed') return { view: 'story', ready: state.ready, failed: true };
  if (event === 'sceneReady') return { view: state.view, ready: true, failed: state.failed };

  if (state.view === 'diorama' && event === 'clickPlaque') {
    return state.ready ? { view: 'entering', ready: state.ready, failed: state.failed } : { ...state };
  }
  if (state.view === 'entering' && event === 'enterDone') {
    return { view: 'story', ready: state.ready, failed: state.failed };
  }
  if (state.view === 'story' && event === 'reachTop') {
    return state.ready && !state.failed ? { view: 'diorama', ready: state.ready, failed: state.failed } : { ...state };
  }

  return { ...state };
}

export function acceptsSceneInput(state: ViewState): boolean {
  return state.view === 'diorama' && state.ready;
}
