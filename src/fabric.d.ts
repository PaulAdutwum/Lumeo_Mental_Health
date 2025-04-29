declare namespace fabric {
  interface Canvas {
    add(object: Object): Canvas;
    remove(object: Object): Canvas;
    renderAll(): Canvas;
    discardActiveObject(): Canvas;
    setActiveObject(object: Object): Canvas;
    getActiveObject(): Object | null;
    getObjects(): Object[];
    forEachObject(callback: (obj: Object) => void): Canvas;
    getPointer(e: Event | any): { x: number; y: number };
    isDrawingMode?: boolean;
    freeDrawingBrush?: PencilBrush;
    backgroundColor?: string;
    width?: number;
    height?: number;
    toDataURL(options?: any): string;
    toJSON(): any;
  }

  class Canvas {
    constructor(element: HTMLCanvasElement | string, options?: any);
  }

  interface Object {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    selectable?: boolean;
    evented?: boolean;
    set(options: any): Object;
    setCoords(): void;
  }
  
  class Object {}

  interface Rect extends Object {
    width: number;
    height: number;
  }
  
  class Rect {
    constructor(options?: any);
  }

  interface Circle extends Object {
    radius: number;
  }
  
  class Circle {
    constructor(options?: any);
  }

  interface Line extends Object {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
  
  class Line {
    constructor(points?: number[], options?: any);
  }

  interface Text extends Object {
    text: string;
    fontSize?: number;
  }
  
  class Text {
    constructor(text: string, options?: any);
  }

  interface Image extends Object {
    width?: number;
    height?: number;
  }
  
  class Image {
    static fromURL(url: string, callback: (img: Image) => void, options?: any): void;
    constructor(element: HTMLImageElement, options?: any);
  }

  interface PencilBrush {
    color: string;
    width: number;
  }
  
  class PencilBrush {
    constructor(canvas: Canvas);
  }

  type TEvent<T> = {
    e: T;
    pointer: {
      x: number;
      y: number;
    };
  };
} 