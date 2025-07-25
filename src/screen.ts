import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createCanvas, Canvas, CanvasRenderingContext2D, registerFont } from 'canvas';

const SCREEN_DIMENSIONS = {
  width: Number.parseInt(process.env.SCREEN_WIDTH ?? '320'),
  height: Number.parseInt(process.env.SCREEN_HEIGHT ?? '240'),
};

function checkFont(font1: string, font2: string): string {
  return fs.existsSync(font1) ? font1 : font2;
}

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
  protected canvas: Canvas;
  protected ctx: CanvasRenderingContext2D;
  protected previousArtist?: string;
  protected previousTitle?: string;

  constructor() {
    this.canvas = createCanvas(SCREEN_DIMENSIONS.width, SCREEN_DIMENSIONS.height);
    this.ctx = this.canvas.getContext('2d');
    registerFont(
      checkFont(
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
        path.join(os.homedir(), 'Library/Fonts/NotoSansJP-Regular.ttf') // for testing
      ),
      {
        family: 'MyFont',
        weight: 'normal',
        style: 'normal'
      });
    registerFont(
      checkFont(
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
        path.join(os.homedir(), 'Library/Fonts/NotoSansJP-Bold.ttf') // for testing
      ),
      {
      family: 'MyFont',
      weight: 'bold',
      style: 'normal'
    });
    this.clearCanvas();
  }

  open(): void {}
  close(): void {}

  abstract update(artist?: string, title?: string): void;

  protected hasContentChanged(artist?: string, title?: string): boolean {
    return !(artist === this.previousArtist && title === this.previousTitle);
  }

  protected clearCanvas() {
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, SCREEN_DIMENSIONS.width, SCREEN_DIMENSIONS.height);
  }

  protected cleanText(text: string): string {
    return text.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  }

  protected drawTitle(title: string): void {
    const cleanTitle = this.cleanText(title);
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 40px "MyFont"';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(cleanTitle, SCREEN_DIMENSIONS.width / 2, 40, SCREEN_DIMENSIONS.width);
  }

  protected drawArtist(name: string): void {
    const cleanName = this.cleanText(name);
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 70px "MyFont"';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(cleanName, SCREEN_DIMENSIONS.width / 2, 120, SCREEN_DIMENSIONS.width);
  }

  protected drawScreen(artist?: string, title?: string): boolean {
    if (!this.hasContentChanged(artist, title)) {
      return false;
    }
    this.clearCanvas();
    if (artist) {
      this.drawArtist(artist);
      this.previousArtist = artist;
    }
    if (title) {
      this.drawTitle(title);
      this.previousTitle = title;
    }
    return true;
  }
}

class FbufScreen extends Screen {
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

class PictureScreen extends Screen {

  constructor() {
    super();
  }

  update(artist?: string, title?: string): void {
    if (!this.drawScreen(artist, title)) {
      return; // No update needed
    }
    const buffer = this.canvas.toBuffer('image/png');
    const filename = `${artist || 'unknown'}-${title || 'unknown'}`;
    fs.writeFileSync(`${filename}.png`, buffer);
  }
}
