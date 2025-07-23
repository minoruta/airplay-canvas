const fs = require('fs');
import { Canvas } from 'canvas';

/**
 * Factory function to create a Screen instance based on the type.
 * @param device - The path to the framebuffer device.
 * @returns An instance of Screen or its subclass.
 */
export function ScreenFactory(device: string): Screen {
  if (!device || device.trim() === '') {
    return new PictureScreen();
  } else {
    return new FbufScreen(device);
  }
}

/**
 * Abstract class representing a screen for displaying metadata.
 */
export abstract class Screen {
  open(): void {}
  close(): void {}
  abstract update(canvas: Canvas, artist?: string, title?: string): void;
}

class FbufScreen extends Screen {
  private fd: number | null = null;

  constructor(private path = '/dev/fb0') {
    super();
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
    const bufLength = srcBuf.length;
    const dstBuf = Buffer.alloc(bufLength);
    for (let i = 0; i < (bufLength / 4); i++) {
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

  constructor() {
    super();
  }

  update(canvas: Canvas, artist?: string, title?: string): void {
    const buffer = canvas.toBuffer('image/png');
    const filename = `${artist || 'unknown'}-${title || 'unknown'}`;
    fs.writeFileSync(`${filename}.png`, buffer);
  }
}
