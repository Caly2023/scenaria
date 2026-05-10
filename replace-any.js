const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src'));

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content;
    
    newContent = newContent.replace(/:\s*any\[\]/g, ': unknown[]');
    newContent = newContent.replace(/:\s*any\b/g, ': unknown');
    newContent = newContent.replace(/\bas\s+any\[\]/g, 'as unknown[]');
    newContent = newContent.replace(/\bas\s+any\b/g, 'as unknown');
    newContent = newContent.replace(/<any>/g, '<unknown>');
    newContent = newContent.replace(/<any,/g, '<unknown,');
    newContent = newContent.replace(/,\s*any>/g, ', unknown>');
    newContent = newContent.replace(/Record<string,\s*any>/g, 'Record<string, unknown>');

    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        console.log('Updated', file);
    }
}
console.log('Done replacing any.');
