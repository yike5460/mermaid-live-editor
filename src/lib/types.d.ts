export interface MarkerData {
  severity: number;
  message: string;
  source?: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface TabEvents {
  select: Tab;
}

export interface Tab {
  id: string;
  title: string;
  icon: string;
}

export interface EditorPage {
  id: string;
  name: string;
  code: string;
  mermaid: string;
}

export interface State {
  pages: EditorPage[];
  activePageId: string;
  updateDiagram: boolean;
  autoSync: boolean;
  rough: boolean;
  editorMode?: EditorMode;
  panZoom?: boolean;
  pan?: { x: number; y: number };
  zoom?: number;
  loader?: LoaderConfig;
}

export interface ValidatedState extends State {
  editorMode: EditorMode;
  error?: Error;
  errorMarkers: MarkerData[];
  serialized: string;
}

export interface GistLoaderConfig {
  url: string;
}

export interface LoadingState {
  loading: boolean;
  message?: string;
}
export interface FileLoaderConfig {
  codeURL: string;
  configURL?: string;
}
export interface LoaderConfig {
  type: 'gist' | 'files';
  config: GistLoaderConfig | FileLoaderConfig;
}
export type HistoryType = 'auto' | 'manual' | 'loader';
export type HistoryEntry = { id: string; state: State; time: number; url?: string } & (
  | {
    type: 'loader';
    name: string;
  }
  | {
    type: HistoryType;
    name?: string;
  }
);

export type DocumentationConfig = Record<
  string,
  {
    code: string;
    config?: string;
  }
>;

export type EditorMode = 'code' | 'config' | 'ai';

export type Loader = (url: string) => Promise<State>;
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export interface ErrorHash {
  loc: {
    first_line: number;
    last_line: number;
    first_column: number;
    last_column: number;
  };
}
