/**
 * This script updates all Roboto font references to use LINE Seed Sans Thai fonts
 * Run with: npx ts-node scripts/update-fonts.ts
 */

const fs = require('fs');
const path = require('path');
const { FontMapping } = require('../constants/fonts');

// Get all TypeScript and JavaScript files in the app
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (
      file.endsWith('.ts') || 
      file.endsWith('.tsx') || 
      file.endsWith('.js') || 
      file.endsWith('.jsx')
    ) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const filesToUpdate = getAllFiles(path.join(__dirname, '../app'));
filesToUpdate.push(...getAllFiles(path.join(__dirname, '../components')));

// Update each file
filesToUpdate.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    // Replace each font reference
    Object.entries(FontMapping).forEach([oldFont, newFont]) => {
      const regex = new RegExp(`'${oldFont}'`, 'g');
      if (content.match(regex)) {
        content = content.replace(regex, `'${newFont}'`);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated fonts in: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
});

console.log('Font update complete!');