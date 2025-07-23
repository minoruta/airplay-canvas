const fs = require('fs');
import { Canvas } from 'canvas';

export function ScreenFactory(width: number, height: number, path?: string): Screen {
  const type = process.env.SCREEN_TYPE || 'fbuf'; // Default to 'fbuf' if not set
  if (type === 'fbuf') {
    if (!path) {
      throw new Error('Path is required for framebuffer screen');
    }
    return new FbufScreen(width, height, path);
  } else if (type === 'picture') {
    return new PictureScreen(width, height);
  } else {
    throw new Error(`Unknown screen type: ${type}`);
  }
}

export abstract class Screen {
  protected width: number;
  protected height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  open(): void {}
  close(): void {}
  abstract update(canvas: Canvas, artist?: string, title?: string): void;
}

class FbufScreen extends Screen {
  private fd: number | null = null;

  constructor(width: number, height: number, private path: string) {
    super(width, height);
  }

  override open(): void {
    this.fd = fs.openSync(this.path, 'w');
    if (this.fd === null) {
      throw new Error('Failed to open framebuffer device');
    }
  }

  override close(): void {
    if (this.fd !== null) {
      fs.closeSync(this.fd);
      this.fd = null;
    }
  }

  update(canvas: Canvas): void {
    if (this.fd === null) {
      throw new Error('Framebuffer device is not open');
    }
    const buf = this.convertImage(canvas);
    fs.writeSync(this.fd, buf, 0, buf.length, 0);
  }

  private convertImage(canvas: Canvas): Buffer {
    const srcBuf = canvas.toBuffer('raw');
    const dstBuf = Buffer.alloc(this.width * this.height * 4);
    for (let i = 0; i < this.width * this.height; i++) {
      const r = srcBuf[i * 4 + 0];
      const g = srcBuf[i * 4 + 1];
      const b = srcBuf[i * 4 + 2];
      // little-endian: byte0=B, byte1=G, byte2=R, byte3=0
      dstBuf[i * 4 + 0] = b;
      dstBuf[i * 4 + 1] = g;
      dstBuf[i * 4 + 2] = r;
      dstBuf[i * 4 + 3] = 0;
    }
    return dstBuf;
  }
}

class PictureScreen extends Screen {

  constructor(width: number, height: number) {
    super(width, height);
  }

  update(canvas: Canvas, artist?: string, title?: string): void {
    const buffer = canvas.toBuffer('image/png');
    const filename = `${artist || 'unknown'}-${title || 'unknown'}.png`;
    fs.writeFileSync(`${filename}.png`, buffer);
  }
}
