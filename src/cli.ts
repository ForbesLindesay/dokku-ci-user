#!/usr/bin/env node

import concat from 'concat-stream';
import * as Keys from '.';

const keys = Keys.read();

const cmd = process.argv[2];
const args = process.argv.slice(3);
let name: string | undefined;
let from: string | undefined;
let to: string | undefined;
const apps: string[] = [];
let help = false;
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '-n':
    case '--name':
      name = args[i + 1];
      i++;
      break;
    case '--from':
      from = args[i + 1];
      i++;
      break;
    case '--to':
      to = args[i + 1];
      i++;
      break;
    case '-a':
    case '--app':
      apps.push(args[i + 1]);
      i++;
      break;
    case '--help':
      help = true;
      break;
    default:
      showHelp();
      console.error(`Unsupported parameter ${args[i]}`);
      process.exit(1);
      break;
  }
}

switch (cmd) {
  case 'help':
  case '--help': {
    showHelp();
    break;
  }
  case 'list': {
    if (help) {
      console.info('List all users and the apps they have access to');
      console.info('');
      console.info('Usage:');
      console.info('');
      console.info('  dokku-ci-user list');
      console.info('');
      console.info('Output:');
      console.info('');
      console.info(' * user1 - app1, app2');
      console.info(' * user2 - app1, app2');
      break;
    }
    console.info('Listing users and the apps they have access to:');
    console.info('');
    for (const key of keys) {
      console.info(` * ${key.getName()} - ${key.getApps().join(', ')}`);
    }
    break;
  }
  case 'add:user': {
    if (help) {
      console.info('Add a new user (with a new SSH key)');
      console.info('');
      console.info('Usage:');
      console.info('');
      console.info(
        '  cat key.pub | dokku-ci-user add:user --name user1 --app app1 --app app2',
      );
      break;
    }
    process.stdin.pipe(
      concat((key) => {
        if (!name) {
          showHelp();
          console.error('You must specify a name for your new user');
          process.exit(1);
          return;
        }
        if (!apps.length) {
          showHelp();
          console.error('You must specify at least one app for your new user');
          process.exit(1);
          return;
        }
        keys.add(name, apps, key.toString('utf8'));
        Keys.write(keys);
      }),
    );
    break;
  }
  case 'rename:user': {
    if (help) {
      console.info('Rename a user (without changing their SSH key)');
      console.info('');
      console.info('Usage:');
      console.info('');
      console.info('  dokku-ci-user rename:user --from user1 --to user2');
      break;
    }
    if (!from) {
      showHelp();
      console.error('You must specify a name for the user to rename');
      throw process.exit(1);
    }
    if (!to) {
      showHelp();
      console.error('You must specify a name for the user after renaming');
      throw process.exit(1);
    }
    keys.rename(from, to);
    Keys.write(keys);
    break;
  }
  case 'remove:user': {
    if (help) {
      console.info('Remove a user (and their SSH key)');
      console.info('');
      console.info('Usage:');
      console.info('');
      console.info('  dokku-ci-user remove:user --name user1');
      break;
    }
    if (!name) {
      showHelp();
      console.error('You must specify a name for the user to remove');
      throw process.exit(1);
    }
    keys.remove(name);
    Keys.write(keys);
    break;
  }
  case 'add:user:app': {
    if (help) {
      console.info('Add an app to an existing user');
      console.info('');
      console.info('Usage:');
      console.info('');
      console.info('  dokku-ci-user add:user:app --name user1 --app app1');
      break;
    }
    if (!name) {
      showHelp();
      console.error('You must specify a name for your user');
      throw process.exit(1);
    }
    if (!apps.length) {
      showHelp();
      console.error('You must specify at least one app to add');
      throw process.exit(1);
    }
    const key = keys.get(name);
    for (const app of apps) {
      key.addApp(app);
    }
    Keys.write(keys);
    break;
  }
  case 'remove:user:app': {
    if (help) {
      console.info('Remove an app from a user');
      console.info('');
      console.info('Usage:');
      console.info('');
      console.info('  dokku-ci-user remove:user:app --name user1 --app app1');
      break;
    }
    if (!name) {
      showHelp();
      console.error('You must specify a name for your user');
      throw process.exit(1);
    }
    if (!apps.length) {
      showHelp();
      console.error('You must specify at least one app to remove');
      throw process.exit(1);
    }
    const key = keys.get(name);
    for (const app of apps) {
      key.removeApp(app);
    }
    Keys.write(keys);
    break;
  }
}

function showHelp() {
  console.info('For help on individual commands run:');
  console.info();
  for (const cmd of [
    'list',
    'add:user',
    'remove:user',
    'rename:user',
    'add:user:app',
    'remove:user:app',
  ]) {
    console.info(`  dokku-ci-user ${cmd} --help`);
  }
}

// try {
//   fs.mkdirSync('/home/ci/.ssh');
// } catch (ex) {
//   if (ex.code !== 'EEXIST') throw ex;
// }

// let authorized_keys = [];
// try {
//   authorized_keys = fs
//     .readFileSync('/home/ci/.ssh/authorized_keys', 'utf8')
//     .trim()
//     .split('\n')
//     .filter(Boolean);
// } catch (ex) {
//   if (ex.code !== 'ENOENT') throw ex;
// }

// const name = process.argv[2];

// if (authorized_keys.some((k) => /NAME\=\\\"([^\\]+)\\\"/.exec(k)[1] === name)) {
//   console.error(`There is already a key for ${name}`);
//   process.exit(1);
// }

// process.stdin.pipe(
//   concat((key) => {
//     authorized_keys.push(
//       `command="NAME=\\"${name}\\" APPS=\\"${process.argv
//         .slice(3)
//         .join(
//           ',',
//         )}\\" node run $SSH_ORIGINAL_COMMAND",no-agent-forwarding,no-user-rc,no-X11-forwarding,no-port-forwarding ${key.toString(
//         'utf8',
//       )}`,
//     );
//     fs.writeFileSync(
//       '/home/ci/.ssh/authorized_keys',
//       authorized_keys.join('\n'),
//     );
//   }),
// );
