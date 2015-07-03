#! /usr/bin/env node

var fs          = require('fs'),
    config      = JSON.parse(fs.readFileSync('test/config.json', 'utf8')),
    gitlab      = require('../lib/gitlab.js')(config.url, config.token),
    user        = {
      "email":    "lelandjr@itlab.stanford.edu",
      "username": "lelandjr",
      "name":     "Leland Stanford, Jr",
      "provider": "saml",
      "extern_uid": "lelandjr@itlab.stanford.edu"
    };

gitlab.users.create(user).done(
  function (newUser) {
    user.id = newUser.id;
    console.dir(newUser);
  },
  function (err) {
    console.error(err);
  }
);

gitlab.users.addSSHKey(
  user.id, 'lelandjr',
  'ssh-rsa AAAAB...'
 ).done(
  function (key) {
    console.dir(key);
  },
  function (err) {
    console.error(err);
  }
);

