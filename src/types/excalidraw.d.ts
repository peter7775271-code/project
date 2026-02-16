declare module '@excalidraw/excalidraw' {
  import type { ComponentType } from 'react';

  export interface ExcalidrawProps {
    theme?: 'light' | 'dark';
    onChange?: (
      elements: readonly any[],
      appState: any,
      files: Record<string, any>
    ) => void;
    excalidrawAPI?: (api: any) => void;
     initialData?: {
       appState?: any;
       elements?: any[];
       scrollToContent?: boolean;
       libraryItems?: any[];
       files?: Record<string, any>;
     };
  }

  export const Excalidraw: ComponentType<ExcalidrawProps>;

  export type ExcalidrawElement = any;
  export type AppState = any;
  export type BinaryFiles = Record<string, any>;
  export type ExcalidrawImperativeAPI = any;

  export function exportToBlob(options: {
    elements: readonly ExcalidrawElement[];
    appState: AppState;
    files: BinaryFiles;
    mimeType?: string;
  }): Promise<Blob>;
}

