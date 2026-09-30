const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(__dirname, 'data');
const backupDir = path.join(dataDir, 'PRE_PRODUCTION_CLEANUP_BACKUP');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const files = ['persisted_orders.json', 'persisted_documents.json', 'financial_ledger.json'];
const manifest = {
  backupName: 'PRE_PRODUCTION_CLEANUP_BACKUP',
  timestamp: new Date().toISOString(),
  files: {}
};

files.forEach(f => {
  const src = path.join(dataDir, f);
  const dest = path.join(backupDir, f);
  if (fs.existsSync(src)) {
    const content = fs.readFileSync(src, 'utf8');
    fs.writeFileSync(dest, content, 'utf8');
    const parsed = JSON.parse(content);
    manifest.files[f] = {
      recordCount: parsed.length,
      sizeBytes: fs.statSync(dest).size
    };
    console.log(`Backed up ${f}: ${parsed.length} records (${manifest.files[f].sizeBytes} bytes)`);
  } else {
    console.log(`File not found to backup: ${f}`);
  }
});

fs.writeFileSync(path.join(backupDir, 'backup_manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log('PRE_PRODUCTION_CLEANUP_BACKUP created successfully at:', backupDir);
