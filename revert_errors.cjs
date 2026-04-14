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

    // Replace catch (_e...) { with catch (e...) {
    const newContent = content.replace(/catch\s*\(_e([:\s\w]*)\)\s*\{/g, (match, type) => {
      changed = true;
      return `catch (e${type}) {`;
    });

    if (changed) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`Reverted ${file}`);
    }
  }
});
console.log('Done reverting catch variables');
