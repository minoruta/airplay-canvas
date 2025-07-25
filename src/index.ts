import { createCanvas, Canvas, CanvasRenderingContext2D, registerFont } from 'canvas';
import { parseMetadata } from '@minoruta/parse-shairport';
import { filter, scan, distinctUntilChanged } from 'rxjs/operators';
import { ScreenFactory, Screen } from './screen';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const FB_DEVICE = process.env.FB_DEVICE ?? '/dev/fb0'; // Default framebuffer device path

const screen = {
  width: Number.parseInt(process.env.SCREEN_WIDTH ?? '320'),
  height: Number.parseInt(process.env.SCREEN_HEIGHT ?? '240'),
};

let canvas: Canvas;
let ctx: CanvasRenderingContext2D;
let screenInstance: Screen;

function checkFont(font1: string, font2: string): string {
  return fs.existsSync(font1) ? font1 : font2;
}

//
// Prepare the canvas and context
//
function prepareCanvas() {
  console.log('Creating test canvas...');
  
  // Create a canvas
  canvas = createCanvas(screen.width, screen.height);
  ctx = canvas.getContext('2d');
  
  // Draw background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, screen.width, screen.height);

  registerFont(
    checkFont(
      '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
      path.join(os.homedir(), 'Library/Fonts/NotoSansJP-Regular.ttf') // 試験用
    ),
    {
      family: 'MyFont',
      weight: 'normal',
      style: 'normal'
    });
  registerFont(
    checkFont(
      '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
      path.join(os.homedir(), 'Library/Fonts/NotoSansJP-Bold.ttf') // 試験用
    ),
    {
    family: 'MyFont',
    weight: 'bold',
    style: 'normal'
  });
}

function drawTitle(title: string): void {
  const cleanTitle = title.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  ctx.fillStyle = 'white';
  ctx.font = 'bold 40px "MyFont"';
  ctx.textAlign = 'center';
  ctx.fillText(cleanTitle, screen.width / 2, 40, screen.width);
}

function drawArtistName(name: string): void {
  const cleanName = name.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  ctx.fillStyle = 'white';
  ctx.font = 'bold 70px "MyFont"';
  ctx.textAlign = 'center';
  ctx.fillText(cleanName, screen.width / 2, 120, screen.width);
}

async function main(): Promise<void> {
  console.log('Application started...');
  try {
    prepareCanvas();
    screenInstance = ScreenFactory(FB_DEVICE);
    screenInstance.open();

    parseMetadata()
      .pipe(
        // artistまたはtitleのメタデータのみをフィルター
        filter(metadata => metadata.type === 'artist' || metadata.type === 'title'),
        // メタデータを蓄積して両方が揃うまで待つ
        scan((acc: {artist?: string, title?: string, lastUpdate: number}, current) => {
          const now = Date.now();
          if (current.type === 'artist') {
            return { ...acc, artist: current.payload, lastUpdate: now };
          } else if (current.type === 'title') {
            return { ...acc, title: current.payload, lastUpdate: now };
          }
          return acc;
        }, { lastUpdate: Date.now() }),
        // 両方が揃った時、または3秒経過した時に通す
        filter(acc => {
          const hasBoth = !!(acc.artist && acc.title);
          const timeoutExceeded = Date.now() - acc.lastUpdate > 3000;
          const hasSomeData = !!(acc.artist || acc.title);
          
          return hasBoth || (timeoutExceeded && hasSomeData);
        }),
        // 同じ内容の場合は重複を避ける
        distinctUntilChanged((prev, curr) => 
          prev.artist === curr.artist && prev.title === curr.title
        )
      )
      .subscribe(metadata => {
        // Draw background
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, screen.width, screen.height);
        if (metadata.artist) {
          drawArtistName(metadata.artist);
        }
        if (metadata.title) {
          drawTitle(metadata.title);
        }
        
        screenInstance.update(canvas, metadata.artist, metadata.title);
      });
  } catch (error) {
    console.error('Canvas test failed:', error);
  }
}

main().catch(console.error);
