import {mkdirSync, readFileSync, writeFileSync} from 'fs';

try {
  mkdirSync('/home/ci/.ssh');
} catch (ex) {
  if (ex.code !== 'EEXIST') throw ex;
}

export function read(unixUser: string = 'ci') {
  let authorizedKeys: AuthorizedKey[] = [];
  try {
    authorizedKeys = readFileSync(
      `/home/${unixUser}/.ssh/authorized_keys`,
      'utf8',
    )
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((str) => new AuthorizedKey(str));
  } catch (ex) {
    if (ex.code !== 'ENOENT') throw ex;
  }
  return Object.assign(authorizedKeys, {
    add(name: string, apps: string[], key: string) {
      if (authorizedKeys.some((key) => key.getName() === name)) {
        const err = new Error(`The user "${name}" already exists`);
        (err as any).code = 'DUPLICATE_USER_NAME';
        throw err;
      }
      authorizedKeys.push(
        new AuthorizedKey(
          `command="NAME=\\"${name}\\" APPS=\\"${apps.join(
            ',',
          )}\\" dokku-ci-user-run $SSH_ORIGINAL_COMMAND",no-agent-forwarding,no-user-rc,no-X11-forwarding,no-port-forwarding ${key}`,
        ),
      );
    },
    rename(oldName: string, newName: string) {
      const key = authorizedKeys.find((key) => key.getName() === oldName);
      const hasNewName = authorizedKeys.some(
        (key) => key.getName() === newName,
      );
      if (!key) {
        const err = new Error(`Could not find the user "${oldName}"`);
        (err as any).code = 'MISSING_USER_NAME';
        throw err;
      }
      if (hasNewName) {
        const err = new Error(`The user "${newName}" already exists`);
        (err as any).code = 'DUPLICATE_USER_NAME';
        throw err;
      }
      key.setName(newName);
    },
    get(name: string) {
      const key = authorizedKeys.find((key) => key.getName() === name);
      if (!key) {
        const err = new Error(`Could not find the user "${name}"`);
        (err as any).code = 'MISSING_USER_NAME';
        throw err;
      }
      return key;
    },
    remove(name: string) {
      const index = authorizedKeys.findIndex((key) => key.getName() === name);
      if (index !== -1) {
        authorizedKeys.splice(index, 1);
      } else {
        const err = new Error(`Could not find the user "${name}"`);
        (err as any).code = 'MISSING_USER_NAME';
        throw err;
      }
    },
  });
}

export function write(
  authorizedKeys: readonly AuthorizedKey[],
  unixUser: string = 'ci',
) {
  writeFileSync(
    `/home/${unixUser}/.ssh/authorized_keys`,
    authorizedKeys.map((k) => k.value).join('\n'),
  );
}

class AuthorizedKey {
  private _value: string;
  public get value() {
    return this._value;
  }

  constructor(value: string) {
    this._value = value;
  }

  public getName() {
    const match = /NAME\=\\\"([^\\]+)\\\"/.exec(this._value);
    return match![1];
  }
  public setName(name: string) {
    this._value = this._value.replace(
      /NAME\=\\\"([^\\]+)\\\"/,
      `NAME=\\"${name}\\"`,
    );
  }

  public getApps() {
    const match = /APPS\=\\\"([^\\]+)\\\"/.exec(this._value);
    return match![1].split(',');
  }
  public setApps(apps: readonly string[]) {
    this._value = this._value.replace(
      /APPS\=\\\"[^\\]+\\\"/,
      `APPS=\\"${apps
        .slice()
        .sort()
        .join(',')}\\"`,
    );
  }

  public addApp(app: string) {
    const apps = this.getApps();
    if (!apps.includes(app)) {
      this.setApps([...apps, app]);
    }
  }
  public removeApp(app: string) {
    const apps = this.getApps();
    this.setApps(apps.filter((a) => a !== app));
  }
}
