import { createCanvas, Canvas, CanvasRenderingContext2D, registerFont } from 'canvas';
import { parseMetadata } from '@minoruta/parse-shairport';
import { filter } from 'rxjs/operators';
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

// ペア待ち合わせ用の状態管理
let currentArtist: string | undefined = undefined;
let currentTitle: string | undefined = undefined;
let timeoutHandle: NodeJS.Timeout | undefined = undefined;

function checkFont(font1: string, font2: string): string {
  return fs.existsSync(font1) ? font1 : font2;
}

// ペアが揃った、またはタイムアウトした時に呼び出される関数
function emitPair(artist: string | undefined, title: string | undefined) {
  console.log('Received metadata:', artist, title);
  
  // Draw background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, screen.width, screen.height);
  
  if (artist) {
    drawArtistName(artist);
  }
  if (title) {
    drawTitle(title);
  }
  
  screenInstance.update(canvas, artist, title);
  
  // ペア出力後はクリア
  currentArtist = undefined;
  currentTitle = undefined;
}

// タイムアウト処理
function scheduleTimeout() {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
  }
  
  timeoutHandle = setTimeout(() => {
    if (currentArtist || currentTitle) {
      emitPair(currentArtist, currentTitle);
    }
  }, 3000);
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
        filter(metadata => metadata.type === 'artist' || metadata.type === 'title')
      )
      .subscribe(metadata => {
        if (metadata.type === 'artist') {
          currentArtist = metadata.payload;
          
          // アーティストが来た場合、タイトルが既にあるかチェック
          if (currentTitle) {
            emitPair(currentArtist, currentTitle);
          } else {
            scheduleTimeout();
          }
        } else if (metadata.type === 'title') {
          currentTitle = metadata.payload;
          
          // タイトルが来た場合、アーティストが既にあるかチェック
          if (currentArtist) {
            emitPair(currentArtist, currentTitle);
          } else {
            scheduleTimeout();
          }
        }
      });
  } catch (error) {
    console.error('Canvas test failed:', error);
  }
}

main().catch(console.error);
