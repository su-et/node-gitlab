var should      = require('should'),
    shouldHttp  = require('should-http'),
    assert      = require('assert'),
    fs          = require('fs'),
    os          = require('os'),
    process     = require('process'),
    execSync    = require('child_process').execSync,
    config      = JSON.parse(fs.readFileSync('test/config.json', 'utf8')),
    gitlab      = require('../lib/gitlab.js')(config.url, config.token),
    gitlabSudo  = require('../lib/gitlab.js')(config.url, config.token, config.sudoUser),
    gitlabNew   = require('../lib/gitlab.js')(config.url, config.token, config.newUser.username),
    testName    = '',
    testId      = null,
    nameName    = '',
    nameId      = null;

describe('User Retrieval', function (done) {

  this.timeout(30000);

  var userId = null;
  
  it ('should return users', function (done) {
    gitlab.users.get()
    .then(function (users) {
      users.should.be.an.Array;
      users.length.should.be.greaterThan(0);
      userId = users[0].id;
      done();
    })
    .catch(done);
  });

  it ('should return a single user', function (done) {
    gitlab.users.get(userId)
    .then(function (user) {
      user.should.be.an.Object;
      user.id.should.equal(userId);
      done();
    })
    .catch(done);
  });

  it ('should return the current user', function (done) {
    gitlabSudo.users.getCurrentUser()
    .then(function (user) {
      user.should.be.an.Object;
      user.username.should.equal(config.sudoUser);
      done();
    })
    .catch(done);
  });

});


describe('User Creation', function (done) {

  this.timeout(5000);

  it ('should create a user', function (done) {
    gitlab.users.create(config.newUser)
    .then(function (user) {
      user.should.be.an.Object;
      user.id.should.not.equal(0);
      user.name.should.equal(config.newUser.name);
      user.username.should.equal(config.newUser.username);
      user.email.should.equal(config.newUser.email);
      testId = user.id;
      done();
    })
    .catch(done);
  });

  it ('should fail to create a user with an existing name', function (done) {
    if (testId) {
      gitlab.users.create(config.newUser)
      .then(function (user) {
        done('Did not fail as expected');
      })
      .catch(function (err) {
        done();
      });
    } else {
      console.warn('Skipping re-create user test because initial user creation failed');
      done();
    }
  });

});

describe('User Update', function (done) {

  this.timeout(5000);

  it ('should change user attributes', function (done) {

    if (testId) {
      gitlab.users.update({id: testId, extern_uid: config.newUser.email, provider: 'saml'})
      .then(function (user) {
        user.should.be.an.Object;
        user.email.should.equal(config.newUser.email);
        user.name.should.equal(config.newUser.name);
        user.username.should.equal(config.newUser.username);
        user.should.have.property('identities');
        user.identities.should.be.an.Array;
        user.identities.length.should.be.greaterThan(0);
        user.identities[0].should.be.an.Object;
        user.identities[0].should.have.property('provider');
        user.identities[0].provider.should.equal('saml');
        user.identities[0].should.have.property('extern_uid');
        user.identities[0].extern_uid.should.equal(config.newUser.email);
        user.id.should.equal(testId);
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping add user member test because initial user creation failed');
      done();
    }
  });
});

describe('User Key Management', function (done) {

  var keyId = null,
      keyFile = os.tmpdir() + '/ssh_' + process.pid,
      pubFile = keyFile + '.pub';

  this.timeout(5000);

  execSync('ssh-keygen -t rsa -b 2048 -N "" -C "" -q -f ' + keyFile);
  config.newSSHKey.key = fs.readFileSync(pubFile, 'utf-8').replace(/\s+$/,'');
  fs.unlinkSync(keyFile);
  fs.unlinkSync(pubFile);

  it ('should add an SSH key', function (done) {
    if (testId) {
      gitlab.users.addSSHKey(testId, config.newSSHKey.title, config.newSSHKey.key)
      .then(function (key) {
        key.should.be.an.Object;
        key.id.should.be.greaterThan(0);
        key.title.should.equal(config.newSSHKey.title);
        key.key.should.equal(config.newSSHKey.key);
        keyId = key.id;
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping add SSH key test because initial user creation failed');
      done();
    }
  });
  
  it ('should list SSH Keys for a user', function (done) {
    if (testId) {
      gitlab.users.getSSHKeys(testId)
      .then(function (keys) {
        keys.should.be.an.Array;
        keys.length.should.be.greaterThan(0);
        keys.some(function (k) {
          return k.title === config.newSSHKey.title
              && k.key   === config.newSSHKey.key
              && k.id    === keyId;
        }).should.be.true;
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping list SSH keys test because initial user creation failed');
      done();
    }
  });

  it ('should delete an SSH key', function (done) {
    if (testId && keyId) {
      gitlab.users.deleteSSHKey(testId, keyId)
      .then(function (resp) {
        should.not.exist(resp);
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping delete SSH key test because initial user creation or key add failed');
      done();
    }
  });


  it ('should add an SSH key to the current user', function (done) {
    if (testId) {
      gitlabNew.users.addSSHKey(config.newSSHKey.title, config.newSSHKey.key)
      .then(function (key) {
        key.should.be.an.Object;
        key.id.should.be.greaterThan(0);
        key.title.should.equal(config.newSSHKey.title);
        key.key.should.equal(config.newSSHKey.key);
        keyId = key.id;
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping add SSH key test because initial user creation failed');
      done();
    }
  });

  it ('should list SSH Keys for the current user', function (done) {
    if (testId) {
      gitlabNew.users.getSSHKeys()
      .then(function (keys) {
        keys.should.be.an.Array;
        keys.length.should.be.greaterThan(0);
        keys.some(function (k) {
          return k.title === config.newSSHKey.title
              && k.key   === config.newSSHKey.key
              && k.id    === keyId;
        }).should.be.true;
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping list SSH keys test because initial user creation failed');
      done();
    }
    
  });

  it ('should delete an SSH key from the current user', function (done) {

    if (testId && keyId) {
      gitlabNew.users.deleteSSHKey(keyId)
      .then(function (resp) {
        should.not.exist(resp);
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping delete SSH key test because initial user creation or key add failed');
      done();
    }
  });

});

describe('User Deletion', function (done) {

  this.timeout(5000);

  it ('should delete a user', function (done) {
    if (testId) {
      gitlab.users.delete(testId)
      .then(function (resp) {
        should.not.exist(resp);
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping delete user test because initial user creation failed');
      done();
    }
  });

});
