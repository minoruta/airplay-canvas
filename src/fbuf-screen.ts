import * as fs from 'fs';
import { Screen } from './screen';

/**
 * Framebuffer screen implementation for displaying metadata.
 * This class writes directly to a framebuffer device.
 */
export class FbufScreen extends Screen {
  private fd: number | null = null;

  constructor(private path: string) {
    super();
    console.log(`Using framebuffer device: ${path}`);
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

  update(artist?: string, title?: string): void {
    if (this.fd === null) {
      throw new Error('Framebuffer device is not open');
    }
    const result = this.drawScreen(artist, title);
    if (!result) {
      return; // No update needed
    }
    const buf = this.convertImage();
    fs.writeSync(this.fd, buf, 0, buf.length, 0);
  }

  private convertImage(): Buffer {
    const srcBuf = this.canvas.toBuffer('raw');
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
