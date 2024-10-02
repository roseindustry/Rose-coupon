const fs = require('fs');
const path = require('path');
const packageJson = require('./package.json');

const version = packageJson.version;
const filePath = path.resolve(__dirname, './dist/index.html');

// Read the index.html file in dist
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    return console.error(err);
  }

  // Use regex to replace JavaScript and CSS files with versioned URLs
  const result = data
    .replace(/(\/assets\/\w+\.js)/g, `$1?v=${version}`) // Match generated JS files
    .replace(/(\/assets\/\w+\.css)/g, `$1?v=${version}`); // Match generated CSS files

  // Write the updated index.html back to the dist folder
  fs.writeFile(filePath, result, 'utf8', (err) => {
    if (err) return console.error(err);
    console.log(`Versioning applied: v${version}`);
  });
});