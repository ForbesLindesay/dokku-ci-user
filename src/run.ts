#!/usr/bin/env node

// This CMD acts as a very restricted shell that can only execute
// whitelisted commands against the whitelisted repositories

import {spawnSync} from 'child_process';

// console.warn(process.env);
// console.warn(process.argv);

const name = process.env.NAME!;
console.warn(`Running as ${name}`);
const apps = process.env.APPS!.split(',');
console.warn(`You have permission to manage these apps: ${apps.join(', ')}`);

let cmd = process.argv[2];
let args = process.argv.slice(3);

if (cmd === 'docker-over-ssh' && args.length === 2 && args[0] === 'pull') {
  validateTag(args[1]);
} else if (cmd === 'docker' && args.length === 3 && args[0] === 'tag') {
  validateTag(args[1]);
  validateTag(args[2]);
} else if (cmd === 'docker' && args.length === 1 && args[0] === 'version') {
  // no other validation/changes required
} else if (cmd === 'dokku' && args.length === 1 && args[0] === 'version') {
  cmd = 'sudo';
  args = ['dokku', ...args];
} else if (cmd === 'dokku' && args.length === 3 && args[0] === 'tags:deploy') {
  validateAppName(args[1]);
  cmd = 'sudo';
  args = ['dokku', ...args];
} else {
  console.error(`Unsupported command: ${cmd} ${args.join(' ')}`);
  process.exit(1);
}

console.warn(cmd, args);
const result = spawnSync(cmd, args, {stdio: 'inherit'});
if (result.error) throw result.error;
process.exit(result.status || 0);

function validateTag(tag: string) {
  const match = /^dokku\/([^\:]+)\:([\w.\-]+)$/.exec(tag);
  if (!match) {
    console.error(
      `Invalid tag format ${tag}, expected it to be of the form "dokku/APP_NAME:VERSION" where VERSION consists only of alphanumeric characters, "." and "-"`,
    );
    process.exit(1);
    return;
  }
  validateAppName(match[1]);
}
function validateAppName(appName: string) {
  if (!apps.includes(appName)) {
    console.error(
      `You do not have permission to run commands against ${appName}, you only have permission for the following apps: ${apps.join(
        ', ',
      )}`,
    );
    process.exit(1);
  }
}
