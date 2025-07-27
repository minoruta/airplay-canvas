import { parseMetadata } from '@minoruta/parse-shairport';
import { ScreenFactory } from './screen-factory';
import { Screen } from './screen';

const FB_DEVICE = process.env.FB_DEVICE ?? '/dev/fb1'; // Default framebuffer device path

let screenInstance: Screen;

// ペア待ち合わせ用の状態管理
let currentArtist: string | undefined = undefined;
let currentTitle: string | undefined = undefined;
let timeoutHandle: NodeJS.Timeout | undefined = undefined;

// ペアが揃った、またはタイムアウトした時に呼び出される関数
function emitPair(artist: string | undefined, title: string | undefined) {
  console.log('Received metadata:', { artist, title });
  
  try {
    screenInstance.update(artist, title);
  } catch (error) {
    console.error('Screen update failed:', error);
  }
  
  // ペア出力後はクリア
  currentArtist = undefined;
  currentTitle = undefined;
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    timeoutHandle = undefined;
  }
}

// タイムアウト処理
function scheduleTimeout() {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
  }
  
  timeoutHandle = setTimeout(() => {
    console.log('Timeout reached, emitting partial data');
    if (currentArtist || currentTitle) {
      emitPair(currentArtist, currentTitle);
    }
  }, 3000);
}

function clearState() {
  currentArtist = undefined;
  currentTitle = undefined;
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    timeoutHandle = undefined;
  }
  if (screenInstance) {
    screenInstance.cleanup();
  }
}

async function main(): Promise<void> {
  console.log('Application started...');
  try {
    screenInstance = ScreenFactory(FB_DEVICE);
    screenInstance.open();
    console.log('Screen initialized successfully');

    parseMetadata()
      .subscribe({
        next: (metadata) => {
          switch (metadata.type) {
            case 'artist': {
              if (typeof metadata.payload !== 'string') {
                console.warn('Invalid metadata payload type:', typeof metadata.payload);
                return;
              }
              currentArtist = metadata.payload;
              console.log('Received artist:', metadata.payload);
              // アーティストが来た場合、タイトルが既にあるかチェック
              if (currentTitle) {
                emitPair(currentArtist, currentTitle);
              } else {
                scheduleTimeout();
              }
              break;
            }
            case 'title': {
              if (typeof metadata.payload !== 'string') {
                console.warn('Invalid metadata payload type:', typeof metadata.payload);
                return;
              }
              currentTitle = metadata.payload;
              console.log('Received title:', metadata.payload);
              // タイトルが来た場合、アーティストが既にあるかチェック
              if (currentArtist) {
                emitPair(currentArtist, currentTitle);
              } else {
                scheduleTimeout();
              }
              break;
            }
            case 'session-begin': {
              console.log('Session begin detected, resetting state');
              clearState();
              break;
            }
            case 'session-end': {
              console.log('Session end detected, cleaning up');
              clearState();
              break;
            }
            default:
              console.warn('Unknown metadata type:', metadata.type);
              break;
          }
        },
        error: (error) => {
          console.error('Metadata parsing error:', error);
          // エラー時も処理を継続
        },
        complete: () => {
          console.log('Metadata stream completed');
        }
      });
  } catch (error) {
    console.error('Application initialization failed:', error);
    process.exit(1);
  }
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('Received SIGINT, cleaning up...');
  clearState();
  if (screenInstance) {
    screenInstance.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, cleaning up...');
  clearState();
  if (screenInstance) {
    screenInstance.close();
  }
  process.exit(0);
});

main().catch(console.error);
