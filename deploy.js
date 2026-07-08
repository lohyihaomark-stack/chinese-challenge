const { execSync } = require('child_process');
const fs = require('fs');
try {
  const out = execSync('npx vercel --prod --yes', { cwd: 'C:\\Users\\yihao\\chinese-challenge', timeout: 120000, encoding: 'utf8' });
  fs.writeFileSync('C:\\Users\\yihao\\chinese-challenge\\deploy_result.txt', 'SUCCESS:\n' + out);
} catch(e) {
  fs.writeFileSync('C:\\Users\\yihao\\chinese-challenge\\deploy_result.txt', 'ERROR:\n' + (e.stdout || '') + '\n' + (e.stderr || '') + '\n' + e.message);
}
