# dokku-ci-user

Manage users with very restricted permissions to push to a set of apps on a dokku server.

> **DISCLAIMER:** I am not an expert on unix security or docker. If you use this, you do so at your own risk. I recommend doing your own security audit on all of this. If you do find any security issues, please email forbes@lindesay.co.uk with the subject line "dokku-ci-user - security vulnerability" and I will attempt to respond promptly.

## Setting Up Dokku

Set up https://marketplace.digitalocean.com/apps/dokku and make sure you add the SSH key that's in `~/.ssh/id_rsa.pub`.

Add the following to `~/.ssh/config` (using the IP of your new digital ocean server):

```
Host dokku
  HostName IP_ADDRESS_OF_DOKKU_SERVER
  User root
```

Connect to the box by running `ssh dokku` and then:

1. Install node: `apt install nodejs`
1. Install npm: `apt install npm`
1. Install docker-over-ssh: `npm install -g docker-over-ssh dokku-ci-user` (you should also install `docker-over-ssh` locally)

Set-up CI user:

1. create CI user `adduser ci`
1. give it permission to run docker commands `usermod -aG docker ci`
1. give it permission to run dokku commands
   1. run `VISUAL=vim visudo`
   1. Add `ci ALL=(ALL:ALL) NOPASSWD:SETENV: /usr/bin/dokku` to the bottom of the file

## Managing Users

To create a user from a public key, with access to `app1` and `app2`, run:

```
cat key.pub | ssh dokku "dokku-ci-user add:user --name my_user_name --app app1 --app app2"`.
```

For all other user management, run `ssh dokku` and then run `dokku-ci-user --help` for a list of commands.

## Authenticating as the user

To run a command as the user, simply run `ssh -i key ci@dokku "COMMAND HERE IN QUOTES"` where `key` is the name of the private key you used to create the user.

## Command Whitelist

The whitelisted commands are

- `docker-over-ssh pull dokku/APP_NAME:VERSION` - where `APP_NAME` is one of the apps the user has permission for, and `VERSION` can be any alphanumeric string.
- `docker tag dokku/APP_NAME1:VERSION1 dokku/APP_NAME2:VERSION2` - where `APP_NAME1` & `APP_NAME2` are one of the apps the user has permission for, and `VERSION1` & `VERSION2` can be any alphanumeric string.
- `dokku tags:deploy APP_NAME VERSION` - where `APP_NAME` is one of the apps the user has permission for, and `VERSION` can be any alphanumeric string.
- `docker version`
- `dokku version`

This is enough to safely deploy docker containers, without granting the user permissions to see/interact with the other apps on your dokku system.
