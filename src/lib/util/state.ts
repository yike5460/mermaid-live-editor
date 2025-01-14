import type { ErrorHash, MarkerData, State, ValidatedState } from '$lib/types';
import { debounce } from 'lodash-es';
import type { MermaidConfig } from 'mermaid';
import { derived, get, writable, type Readable } from 'svelte/store';
import {
  extractErrorLineText,
  findMostRelevantLineNumber,
  replaceLineNumberInErrorMessage
} from './errorHandling';
import { parse } from './mermaid';
import { localStorage, persist } from './persist';
import { deserializeState, serializeState } from './serde';
import { errorDebug, formatJSON } from './util';

export const defaultState: State = {
  pages: [{
    id: 'default',
    name: 'Main',
    code: `flowchart TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[fa:fa-car Car]
  `,
    mermaid: formatJSON({
      theme: 'default'
    })
  }],
  activePageId: 'default',
  autoSync: true,
  rough: false,
  updateDiagram: true
};

const urlParseFailedState = `flowchart TD
    A[Loading URL failed. We can try to figure out why.] -->|Decode JSON| B(Please check the console to see the JSON and error details.)
    B --> C{Is the JSON correct?}
    C -->|Yes| D(Please Click here to Raise an issue in github.<br/>Including the broken link in the issue <br/> will speed up the fix.)
    C -->|No| E{Did someone <br/>send you this link?}
    E -->|Yes| F[Ask them to send <br/>you the complete link]
    E -->|No| G{Did you copy <br/> the complete URL?}
    G --> |Yes| D
    G --> |"No :("| H(Try using the Timeline tab in History <br/>from same browser you used to create the diagram.)
    click D href "https://github.com/mermaid-js/mermaid-live-editor/issues/new?assignees=&labels=bug&template=bug_report.md&title=Broken%20link" "Raise issue"`;

// inputStateStore handles all updates and is shared externally when exporting via URL, History, etc.
export const inputStateStore = persist(writable(defaultState), localStorage(), 'codeStore');

export const currentState: ValidatedState = (() => {
  const state = get(inputStateStore);
  return {
    ...state,
    serialized: serializeState(state),
    errorMarkers: [],
    error: undefined,
    editorMode: state.editorMode ?? 'code'
  };
})();

const processState = async (state: State) => {
  const activePage = state.pages.find(p => p.id === state.activePageId);
  if (!activePage) {
    throw new Error('Active page not found');
  }

  const processed: ValidatedState = {
    ...state,
    serialized: '',
    errorMarkers: [],
    error: undefined,
    editorMode: state.editorMode ?? 'code'
  };

  try {
    processed.serialized = serializeState(state);
    await parse(activePage.code);
    JSON.parse(activePage.mermaid);
  } catch (error) {
    processed.error = error as Error;
    errorDebug();
    console.error(error);
    if ('hash' in error) {
      try {
        let errorString = processed.error.toString();
        const errorLineText = extractErrorLineText(errorString);
        const realLineNumber = findMostRelevantLineNumber(errorLineText, activePage.code);

        let first_line: number, last_line: number, first_column: number, last_column: number;
        try {
          ({ first_line, last_line, first_column, last_column } = (error.hash as ErrorHash).loc);
        } catch {
          const lineNo = findMostRelevantLineNumber(errorString, activePage.code);
          first_line = lineNo;
          last_line = lineNo + 1;
          first_column = 0;
          last_column = 0;
        }

        if (realLineNumber !== -1) {
          errorString = replaceLineNumberInErrorMessage(errorString, realLineNumber);
        }

        processed.error = new Error(errorString);
        const marker: MarkerData = {
          severity: 8,
          startLineNumber: realLineNumber,
          startColumn: first_column,
          endLineNumber: last_line + (realLineNumber - first_line),
          endColumn: last_column + (first_column === last_column ? 0 : 5),
          message: errorString || 'Syntax error'
        };
        processed.errorMarkers = [marker];
      } catch (error) {
        console.error('Error without line helper', error);
      }
    }
  }
  return processed;
};

// All internal reads should be done via stateStore, but it should not be persisted/shared externally.
export const stateStore: Readable<ValidatedState> = derived(
  [inputStateStore],
  ([state], set) => {
    void processState(state).then(set);
  },
  currentState
);

export const loadState = (data: string): void => {
  let state: State;
  console.log(`Loading '${data}'`);
  try {
    const loadedState = deserializeState(data);
    // Handle migration from old state format to new page-based format
    if ('code' in loadedState || 'mermaid' in loadedState) {
      state = {
        pages: [{
          id: 'default',
          name: 'Main',
          code: (loadedState as any).code || '',
          mermaid: (loadedState as any).mermaid || formatJSON({ theme: 'default' })
        }],
        activePageId: 'default',
        autoSync: loadedState.autoSync ?? true,
        rough: loadedState.rough ?? false,
        updateDiagram: loadedState.updateDiagram ?? true,
        editorMode: loadedState.editorMode,
        panZoom: loadedState.panZoom,
        pan: loadedState.pan,
        zoom: loadedState.zoom,
        loader: loadedState.loader
      };
    } else {
      state = loadedState;
    }
  } catch (error) {
    state = {
      ...defaultState,
      pages: [{
        id: 'default',
        name: 'Main',
        code: data ? urlParseFailedState : defaultState.pages[0].code,
        mermaid: defaultState.pages[0].mermaid
      }],
      activePageId: 'default'
    };
    if (data) {
      console.error('Init error', error);
    }
  }
  updateCodeStore(state);
};

export const updateCodeStore = (update: Partial<State>): void => {
  inputStateStore.update((state) => ({ ...state, ...update }));
};

export const updateCode = (code: string): void => {
  inputStateStore.update((state) => {
    const updatedPages = state.pages.map(page =>
      page.id === state.activePageId
        ? { ...page, code }
        : page
    );
    return { ...state, pages: updatedPages, updateDiagram: true };
  });
};

export const updateConfig = (config: string): void => {
  inputStateStore.update((state) => {
    const updatedPages = state.pages.map(page =>
      page.id === state.activePageId
        ? { ...page, mermaid: config }
        : page
    );
    return { ...state, pages: updatedPages };
  });
};

export const toggleDarkTheme = (dark: boolean): void => {
  inputStateStore.update((state) => {
    const activePage = state.pages.find(p => p.id === state.activePageId);
    if (!activePage) return state;

    const config = JSON.parse(activePage.mermaid) as MermaidConfig;
    if (!config.theme || ['dark', 'default'].includes(config.theme)) {
      config.theme = dark ? 'dark' : 'default';
    }

    const updatedPages = state.pages.map(page =>
      page.id === state.activePageId
        ? { ...page, mermaid: formatJSON(config) }
        : page
    );

    return { ...state, pages: updatedPages };
  });
};

export const initURLSubscription = (): void => {
  const updateHash = debounce((hash) => {
    history.replaceState(undefined, '', `#${hash}`);
  }, 250);

  stateStore.subscribe(({ serialized }) => {
    updateHash(serialized);
  });
};

export const getStateString = (): string => {
  return JSON.stringify(get(inputStateStore));
};
