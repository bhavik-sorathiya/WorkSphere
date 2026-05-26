const fs = require('fs');
const path = require('path');
const dir = './routes';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
files.forEach(f => {
  const fp = path.join(dir, f);
  let code = fs.readFileSync(fp, 'utf8');
  code = code.replace(/import \{ requireAuth \} from "@clerk\/clerk-sdk-node";/g, 'import { ClerkExpressRequireAuth as requireAuth } from "@clerk/clerk-sdk-node";');
  fs.writeFileSync(fp, code);
});
console.log('Fixed requireAuth in all route files.');
