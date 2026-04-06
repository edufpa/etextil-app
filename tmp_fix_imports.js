const fs = require('fs');
const path = require('path');

const files = [
  'src/app/admin/providers/page.tsx',
  'src/app/admin/providers/DeleteProviderButton.tsx',
  'src/app/admin/guides/[id]/page.tsx',
  'src/app/admin/guides/page.tsx',
  'src/app/admin/orders/page.tsx',
  'src/app/admin/orders/[id]/page.tsx',
  'src/app/admin/clients/page.tsx',
  'src/app/admin/clients/DeleteClientButton.tsx'
];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const nesting = f.split('/').length - 4; // 'src/app/admin/' is 4 parts: src, app, admin, folder
  const prefix = '../'.repeat(nesting);
  const newPath = prefix + 'services/services.module.css';
  const newContent = content.replace(/import styles from ['"].*?services\.module\.css['"];/, `import styles from "${newPath}";`);
  if (content !== newContent) {
    fs.writeFileSync(f, newContent);
    console.log('Updated ' + f + ' with ' + newPath);
  } else {
    console.log('No change in ' + f + ', nesting: ' + nesting);
  }
});
