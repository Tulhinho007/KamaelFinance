const fs = require('fs');

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  console.log(`=== AUDIT ${filePath} ===`);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('.create(') || line.includes('.createMany(')) {
      if (/(prisma|db)\.(transaction|wallet|investment|variableAsset|cryptoAsset|bettingAccount|otherInvestment|subscription|invoicePayment)\.(create|createMany)/i.test(line)) {
        const snippet = lines.slice(i, i + 35).join('\n');
        const hasUserId = snippet.includes('userId');
        console.log(`CREATE Line ${i + 1}: hasUserId=${hasUserId} | ${line.trim()}`);
      }
    }
    if (line.includes('findMany(') || line.includes('findFirst(') || line.includes('findUnique(')) {
      if (/(prisma|db)\.(transaction|wallet|investment|variableAsset|cryptoAsset|bettingAccount|otherInvestment|subscription|invoicePayment)\.(findMany|findFirst)/i.test(line)) {
        const snippet = lines.slice(i, i + 25).join('\n');
        const hasUserId = snippet.includes('userId');
        if (!hasUserId) {
          console.log(`QUERY Line ${i + 1}: MISSING userId in query! | ${line.trim()}`);
        }
      }
    }
  }
}

auditFile('lib/actions.ts');

const path = require('path');
function checkDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) checkDir(full);
    else if (/\.(ts|tsx|js)$/.test(f.name)) {
      auditFile(full);
    }
  }
}
checkDir('app/api');

