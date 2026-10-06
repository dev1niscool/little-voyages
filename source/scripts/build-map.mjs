/**
 * Rebuild the bundled coastline (Node, npm, and curl): node scripts/build-map.mjs
 *
 * Natural Earth 1:10m Admin 0 Countries (public domain):
 * https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/
 * The pinned source and checksum make this optional, networked build reproducible.
 * Normal development, builds, and the website use the checked-in world.json.
 */
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';

const SOURCE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_10m_admin_0_countries.geojson';
const SHA256 = '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255';
const directory = await mkdtemp(join(tmpdir(), 'little-voyages-map-'));

try {
  const inputPath = join(directory, 'countries.geojson');
  const outputPath = join(directory, 'world.json');
  // curl honors the standard HTTPS_PROXY and CA settings in hosted workspaces.
  const download = spawnSync('curl', [
    '--fail', '--location', '--silent', '--show-error', SOURCE, '--output', inputPath,
  ], { stdio: 'inherit' });
  if (download.error) throw download.error;
  if (download.status !== 0) throw new Error(`Natural Earth download exited with status ${download.status}.`);
  const input = await readFile(inputPath);
  if (createHash('sha256').update(input).digest('hex') !== SHA256) {
    throw new Error('Natural Earth source checksum does not match the pinned version.');
  }
  // Mapshaper works on shared arcs, so country borders stay coincident.
  // Exploding before keep-shapes also preserves tiny individual islands.
  // 750 m spherical Douglas–Peucker simplification keeps the coasts detailed
  // at port-level zoom. Quantization adds at most ~40 m coordinate rounding.
  const result = spawnSync('npm', [
    'exec', '--yes', '--package=mapshaper@0.7.78', '--', 'mapshaper', inputPath,
    '-filter', 'ADMIN!="Antarctica"',
    '-filter-fields', 'NAME',
    '-explode',
    '-simplify', 'dp', 'interval=750m', 'keep-shapes',
    '-dissolve', 'NAME',
    '-rename-layers', 'countries',
    '-o', outputPath, 'format=topojson', 'quantization=1000000',
  ], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Mapshaper exited with status ${result.status}.`);

  const topology = JSON.parse(await readFile(outputPath, 'utf8'));
  const countries = topology.objects?.countries?.geometries;
  if (topology.type !== 'Topology' || countries?.length !== 257) {
    throw new Error('Unexpected Natural Earth topology output.');
  }
  for (const country of countries) delete country.properties;
  const serialized = JSON.stringify(topology);
  const target = fileURLToPath(new URL('../public/data/world.json', import.meta.url));
  await writeFile(target, serialized);
  console.log(`Bundled ${countries.length} countries: ${Buffer.byteLength(serialized)} bytes (${gzipSync(serialized, { level: 9 }).length} bytes gzipped).`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
