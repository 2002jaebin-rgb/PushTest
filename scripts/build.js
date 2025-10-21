import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mkdir,
  rm,
  readdir,
  readFile,
  writeFile,
  copyFile
} from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const sourceDir = join(projectRoot, 'web');
const outputDir = join(projectRoot, 'dist');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const supabaseFunctionUrl = process.env.SUPABASE_FUNCTION_URL;

if (!vapidPublicKey) {
  throw new Error('Missing VAPID_PUBLIC_KEY environment variable.');
}

if (!supabaseFunctionUrl) {
  throw new Error('Missing SUPABASE_FUNCTION_URL environment variable.');
}

const textExtensions = new Set(['.html', '.js', '.json', '.css', '.txt']);

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

await copyDirectory(sourceDir, outputDir);

async function copyDirectory(from, to) {
  await mkdir(to, { recursive: true });
  const entries = await readdir(from, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = join(from, entry.name);
    const targetPath = join(to, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      await copyFileWithReplacements(sourcePath, targetPath);
    }
  }
}

async function copyFileWithReplacements(sourcePath, targetPath) {
  const extension = extname(sourcePath).toLowerCase();

  if (!textExtensions.has(extension)) {
    await copyFile(sourcePath, targetPath);
    return;
  }

  const content = await readFile(sourcePath, 'utf-8');
  const replaced = content
    .replace(/__VAPID_PUBLIC_KEY__/g, vapidPublicKey)
    .replace(/__SUPABASE_FUNCTION_URL__/g, supabaseFunctionUrl);

  await writeFile(targetPath, replaced, 'utf-8');
}
