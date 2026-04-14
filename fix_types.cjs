const fs = require('fs');
const file = 'src/services/geminiService.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/return response\.text;/g, "return response.text || '';");
fs.writeFileSync(file, content);
console.log('Fixed geminiService.ts');
