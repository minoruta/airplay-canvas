import { Screen } from './screen';
import { FbufScreen } from './fbuf-screen';
import { PictureScreen } from './picture-screen';

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
