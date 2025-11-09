import { copyFile } from 'fs/promises';
await copyFile('dist/index.html', 'dist/404.html');
