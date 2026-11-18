import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('.',import.meta.url)));
let html=await readFile('index.html','utf8');
const css=await readFile('styles.css','utf8');
const explainCSS=await readFile('explain.css','utf8');
const explainJS=await readFile('src/explain.js','utf8');
const algorithms=(await readFile('src/algorithms.js','utf8')).replace(/\bexport\s+/g,'');
const app=(await readFile('src/app.js','utf8')).replace(/^import .*?;\n/,'');
html=html.replace('<link rel="stylesheet" href="styles.css?v=20261118-wd4">',()=>`<style>${css}</style>`).replace('<script type="module" src="src/app.js?v=20261118-wd4"></script>',()=>`<script defer>\n(()=>{\n${algorithms}\n${app}\n})();\n</script>`);
html=html.replace('<link rel="stylesheet" href="explain.css?v=20261118-wd4">',()=>`<style>${explainCSS}</style>`).replace('<script defer src="src/explain.js?v=20261118-wd4"></script>','');

const script=html.match(/<script defer>[\s\S]*?<\/script>/)[0];html=html.replace(script,'').replace('</body>',()=>script+`<script>${explainJS}</script></body>`);
await writeFile('Лабораторная-4.html',html);
console.log('Готово: Лабораторная-4.html');
