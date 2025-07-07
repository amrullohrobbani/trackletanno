const fs = require('fs');
const path = require('path');

// Fix paths in the HTML file to make them relative for Electron
function fixPaths() {
  const htmlFile = path.join(__dirname, '../out/index.html');
  
  if (!fs.existsSync(htmlFile)) {
    console.log('HTML file not found, skipping path fix');
    return;
  }
  
  let html = fs.readFileSync(htmlFile, 'utf8');
  
  // Replace absolute paths with relative paths
  html = html.replace(/href="\/_next\//g, 'href="./_next/');
  html = html.replace(/src="\/_next\//g, 'src="./_next/');
  html = html.replace(/href="\/favicon.ico"/g, 'href="./favicon.ico"');
  
  // Also fix any paths in the inline scripts
  html = html.replace(/\"\/_next\//g, '"./_next/');
  html = html.replace(/\"\/favicon.ico/g, '"./favicon.ico');
  
  fs.writeFileSync(htmlFile, html);
  console.log('✅ Fixed paths in HTML file for Electron compatibility');
}

fixPaths();
