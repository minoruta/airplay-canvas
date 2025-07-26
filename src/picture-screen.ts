import * as fs from 'fs';
import { Screen } from './screen';

/**
 * Picture screen implementation for displaying metadata.
 * This class saves the rendered image to a file.
 */
export class PictureScreen extends Screen {

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
