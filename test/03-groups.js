var should      = require('should'),
    shouldHttp  = require('should-http'),
    assert      = require('assert'),
    fs          = require('fs'),
    config      = JSON.parse(fs.readFileSync('test/config.json', 'utf8')),
    gitlab      = require('../lib/gitlab.js')(config.url, config.token),
    gitlabSudo  = require('../lib/gitlab.js')(config.url, config.token, config.sudoUser),
    testName    = '',
    testId      = null,
    nameName    = '',
    nameId      = null;


describe('Group Creation', function (done) {

  this.timeout(15000);

  it ('should create a group', function (done) {
    var n = Math.floor(Math.random() * 100000).toString();

    testName = 'test-' + '000000'.substr(0, 6 - n.length) + n;

    gitlab.groups.create({ name: testName, path: testName })
    .then(function (group) {
      group.should.be.an.Object;
      group.id.should.not.equal(0);
      group.name.should.equal(testName);
      group.path.should.equal(testName);
      testId = group.id;
      done();
    })
    .catch(done);
  });

  it ('should fail to create a group with an existing name', function (done) {
    if (testId) {
      gitlab.groups.create(testName)
      .then(function (group) {
        done('Did not fail as expected');
      })
      .catch(function (err) {
        done();
      });
    } else {
      console.warn('Skipping re-create group test because initial group creation failed');
      done();
    }
  });

  it ('should create a group with just a name', function (done) {
    nameName = testName + '-2';
    gitlab.groups.create(nameName)
    .then(function (group) {
      group.should.be.an.Object;
      group.id.should.not.equal(0);
      group.name.should.equal(nameName);
      group.path.should.equal(nameName);
      nameId = group.id;
      done();
    })
    .catch(done);
  });

});

describe('Group Retrieval', function (done) {
  this.timeout(15000);

  it ('should return groups', function (done) {
    gitlab.groups.get()
    .then(function (groups) {
      groups.should.be.an.Array;
      groups.length.should.be.greaterThan(0);
      groupId = groups[groups.length - 1].id;
      groupPath = groups[groups.length - 1].path;
      done();
    })
    .catch(done);
  });

  it ('should return a single group by Id', function (done) {
    gitlab.groups.get(testId)
    .then(function (group) {
      group.should.be.an.Object;
      group.id.should.equal(testId);
      done();
    })
    .catch(done);
  });

  it ('should return a single group by path', function (done) {
    gitlab.groups.get(testName)
    .then(function (group) {
      group.should.be.an.Object;
      group.id.should.equal(testId);
      done();
    })
    .catch(done);
  });

});

describe('Group Search', function (done) {
  this.timeout(15000);

  it ('should find a group', function (done) {

    if (testId) {
      gitlab.groups.search(testName)
      .then(function (groups) {
        var exactGroups, group;

        groups.should.be.an.Array;
        groups.length.should.be.greaterThan(0);
        exactGroups = groups.filter(function (g) { return g.path === testName; });
        exactGroups.should.be.an.Array;
        exactGroups.length.should.equal(1);
        group = exactGroups[0];
        group.should.be.an.Object;
        group.id.should.equal(testId);
        group.path.should.equal(testName);
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping search group test because initial group creation failed');
      done();
    }
  });

});


describe('Group Membership', function (done) {

  var memberId = null;

  this.timeout(15000);

  it ('should add a group member', function (done) {

    if (testId) {
      gitlab.groups.addMember(testId, config.userId, 'reporter')
      .then(function (member) {
        member.should.be.an.Object;
        member.access_level.should.equal(20);
        memberId = member.id;
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping add group member test because initial group creation failed');
      done();
    }
  });

  it ('should return group members', function (done) {
    if (testId) {
      gitlab.groups.getMembers(testId)
      .then(function (members) {
        members.should.be.an.Array;
        // group owner is now automatically a member
        // so need to find the new member
        members.length.should.be.greaterThan(0);
        members.filter(function (m) {
          if (m.id === config.userId) {
            m.access_level.should.equal(20);
            return true;
          }
          return false;
        }).length.should.equal(1);
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping get group membership test because initial group creation failed');
      done();
    }      
  });

  it ('should change role of a group member', function (done) {

    if (memberId) {
      gitlab.groups.updateMember(testId, config.userId, 'developer')
      .then(function (user) {
        user.should.be.an.Object;
        user.id.should.equal(config.userId);
        user.access_level.should.equal(30);
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping change member role test because initial group membership creation failed');
      done();
    }
  });


  it ('should delete a group member', function (done) {

    if (memberId) {
      gitlab.groups.deleteMember(testId, config.userId)
      .then(function (resp) {
        should.not.exist(resp);
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping delete group member test because initial group membership creation failed');
      done();
    }
  });

});


describe('Group Deletion', function (done) {

  this.timeout(15000);

  it ('should delete a group', function (done) {
    if (testId) {
      gitlab.groups.delete(testId)
      .then(function (resp) {
        should.exist(resp);
        resp.should.be.an.Object;
        resp.should.have.property('message');
        resp.message.should.be.a.String;
        resp.message.should.startWith('202 ');
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping delete group test because initial group creation failed');
      done();
    }
  });

  it ('should delete a group with members', function (done) {
    if (nameId) {
      gitlab.groups.addMember(nameId, config.userId, 'developer')
      .then(function () {
        gitlab.groups.delete(nameId)
        .then(function (resp) {
          should.exist(resp);
          resp.should.be.an.Object;
          resp.should.have.property('message');
          resp.message.should.be.a.String;
          resp.message.should.startWith('202 ');
          done();
        })
        .catch(done);
      })
      .catch(done);
    } else {
      console.warn('Skipping delete group with members test because initial group creation failed');
      done();
    }
  });
  
});
