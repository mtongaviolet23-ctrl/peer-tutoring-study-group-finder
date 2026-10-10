const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const node = process.env.NODE_BINARY || process.execPath;
const expoCli = path.resolve(process.cwd(), '../../node_modules/expo/bin/cli');
const logPath = path.resolve(process.cwd(), 'expo-export.log');
const result = spawnSync(node, [expoCli, 'export', '--platform', 'web', '--clear'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: process.env,
});
fs.writeFileSync(logPath, `status=${result.status}\nerror=${result.error?.message || ''}\nstdout:\n${result.stdout || ''}\nstderr:\n${result.stderr || ''}\n`);
console.log(`EXPO_EXPORT_STATUS=${result.status}`);
console.log(`EXPO_EXPORT_LOG=${logPath}`);
process.exit(result.status || 1);
