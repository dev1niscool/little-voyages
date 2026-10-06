import { cp, access } from 'node:fs/promises';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (basename(source) !== 'source' || basename(dirname(source)) !== 'little-voyages') throw new Error('Run this only from little-voyages/source in the Pages repository.');
await access(resolve(source, 'dist/index.html'));
await cp(resolve(source, 'dist'), dirname(source), {recursive: true});
console.log('Build output copied into little-voyages/. Review and commit the updated site files.');
