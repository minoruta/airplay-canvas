import { parseMetadata } from '@minoruta/parse-shairport';
import { filter } from 'rxjs/operators';
import { ScreenFactory, Screen } from './screen';

const FB_DEVICE = process.env.FB_DEVICE ?? '/dev/fb0'; // Default framebuffer device path

let screenInstance: Screen;

// ペア待ち合わせ用の状態管理
let currentArtist: string | undefined = undefined;
let currentTitle: string | undefined = undefined;
let timeoutHandle: NodeJS.Timeout | undefined = undefined;

// ペアが揃った、またはタイムアウトした時に呼び出される関数
function emitPair(artist: string | undefined, title: string | undefined) {
  console.log('Received metadata:', artist, title);
  
  screenInstance.update(artist, title);
  
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


async function main(): Promise<void> {
  console.log('Application started...');
  try {
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
