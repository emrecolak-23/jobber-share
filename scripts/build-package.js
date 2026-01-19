const { readFileSync, writeFileSync } = require('fs');

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

// Build klasöründen publish edileceği için path'leri düzelt
packageJson.main = 'cjs/index.js';
packageJson.module = 'esm/index.js';
packageJson.types = 'src/index.d.ts';
packageJson.exports = {
  '.': {
    import: './esm/index.js',
    require: './cjs/index.js',
    types: './src/index.d.ts',
  },
};

// files alanını build klasörü için güncelle
packageJson.files = ['cjs', 'esm', 'src'];

writeFileSync('build/package.json', JSON.stringify(packageJson, null, 2));
