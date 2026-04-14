const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src', (file) => {
  if (file.endsWith('.ts') || file.endsWith('.tsx')) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Replace catch (e) { with catch (_e) {
    const newContent = content.replace(/catch\s*\(e([:\s\w]*)\)\s*\{/g, (match, type) => {
      changed = true;
      return `catch (_e${type}) {`;
    });

    if (changed) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`Updated ${file}`);
    }
  }
});
console.log('Done renaming catch variables');
