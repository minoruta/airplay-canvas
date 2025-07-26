import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createCanvas, Canvas, CanvasRenderingContext2D, registerFont } from 'canvas';
import { FbufScreen } from './fbuf-screen';
import { PictureScreen } from './picture-screen';

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
 * This class provides methods for drawing text and managing the canvas.
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

  /**
   * Opens the screen for writing.
   */
  open(): void {}

  /**
   * Closes the screen.
   */
  close(): void {}

  /**
   * Updates the screen with the given artist and title.
   * @param artist - The name of the artist.
   * @param title - The title of the song.
   */
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
