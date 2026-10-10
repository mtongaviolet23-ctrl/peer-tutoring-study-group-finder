const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const npmCli = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js';
const root = 'C:\\Users\\Violet\\Desktop\\Peer_tutotring_study_group_finder';
const result = spawnSync(process.execPath, [npmCli, 'install', '--workspace', 'apps/mobile', '--loglevel', 'verbose'], {
  cwd: root,
  encoding: 'utf8',
  env: process.env,
});
fs.writeFileSync(path.resolve(root, 'apps/mobile/install-mobile-deps.log'), `status=${result.status}\nerror=${result.error?.message || ''}\nstdout:\n${result.stdout || ''}\nstderr:\n${result.stderr || ''}\n`);
console.log(`INSTALL_STATUS=${result.status}`);
process.exit(result.status || 1);
