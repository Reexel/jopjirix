const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const distDir = path.resolve(__dirname, '../dist');
const manifestPath = path.resolve(distDir, 'manifest.json');

if (!fs.existsSync(manifestPath)) {
  console.error('❌ manifest.json не найден в dist!');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version;
const id = manifest.id;

const jplName = `${id}-v${version}.jpl`;
const jplPath = path.resolve(__dirname, '..', jplName);

console.log(`📦 Собираю плагин: ${jplName}`);

const output = fs.createWriteStream(jplPath);
const archive = archiver('tar', { gzip: false });

output.on('close', function () {
  console.log(`✅ Плагин собран: ${jplName} (${archive.pointer()} байт)`);
});

archive.on('error', function (err) {
  throw err;
});

archive.pipe(output);
archive.directory(distDir, false);
archive.finalize();