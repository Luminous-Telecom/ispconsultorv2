declare module 'viewerjs' {
  export interface ViewerOptions {
    inline?: boolean;
    viewed?: () => void;
    ready?: () => void;
    error?: () => void;
    toolbar?: {
      zoomIn?: boolean;
      zoomOut?: boolean;
      oneToOne?: boolean;
      reset?: boolean;
      prev?: boolean;
      play?: boolean;
      next?: boolean;
      rotateLeft?: boolean;
      rotateRight?: boolean;
      flipHorizontal?: boolean;
      flipVertical?: boolean;
    };
    navbar?: boolean;
    title?: boolean;
    tooltip?: boolean;
    movable?: boolean;
    zoomable?: boolean;
    rotatable?: boolean;
    scalable?: boolean;
    transition?: boolean;
    fullscreen?: boolean;
    keyboard?: boolean;
  }

  export default class Viewer {
    constructor(element: HTMLElement, options?: ViewerOptions);
    destroy(): void;
    show(): void;
    hide(): void;
    view(index?: number): void;
    prev(): void;
    next(): void;
    move(x: number, y: number): void;
    rotate(degree: number): void;
    scale(scaleX: number, scaleY?: number): void;
    zoom(ratio: number): void;
    zoomTo(ratio: number): void;
    reset(): void;
    update(): void;
    full(): void;
    exit(): void;
    tooltip(): void;
    play(): void;
    stop(): void;
  }
}

