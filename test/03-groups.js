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

describe('Group Retrieval', function (done) {

  var groupId = null;
  
  it ('should return groups', function (done) {
    gitlab.groups.get().done(
      function (groups) {
        groups.should.be.an.Array;
        groups.length.should.be.greaterThan(0);
        groupId = groups[0].id;
        done();
      },
      done
    );
  });

  it ('should return a single group', function (done) {
    gitlab.groups.get(groupId).done(
      function (group) {
        group.should.be.an.Object;
        group.id.should.equal(groupId);
        done();
      },
      done
    );
  });
});


describe('Group Creation', function (done) {

  this.timeout(5000);

  it ('should create a group', function (done) {
    var n = Math.floor(Math.random() * 100000).toString();

    testName = 'test-' + '000000'.substr(0, 6 - n.length) + n;

    gitlab.groups.create({ name: testName, path: testName }).done(
      function (group) {
        group.should.be.an.Object;
        group.id.should.not.equal(0);
        group.name.should.equal(testName);
        group.path.should.equal(testName);
        testId = group.id;
        done();
      },
      done
    );
  });

  it ('should fail to create a group with an existing name', function (done) {
    if (testId) {
      gitlab.groups.create(testName).done(
        function (group) {
          done('Did not fail as expected');
        },
        function (err) {
          done();
        }
      );
    } else {
      console.warn('Skipping re-create group test because initial group creation failed');
      done();
    }
  });

  it ('should create a group with just a name', function (done) {
    nameName = testName + '-2';
    gitlab.groups.create(nameName).done(
      function (group) {
        group.should.be.an.Object;
        group.id.should.not.equal(0);
        group.name.should.equal(nameName);
        group.path.should.equal(nameName);
        nameId = group.id;
        done();
      },
      done
    );
  });

});

/* Older versions of the GitLab API do not support group search
describe('Group Search', function (done) {
  this.timeout(5000);

  it ('should find a group', function (done) {

    if (testId) {
      gitlab.groups.search(testName).done(
        function (groups) {
          groups.should.be.an.Array;
          // should 1-4 results for our group name
          groups.length.should.equal(1);
          groups[0].name.should.equal(testName);
          groups[0].id.should.equal(testId);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping search group test because initial group creation failed');
      done();
    }
  });

});
*/

describe('Group Membership', function (done) {

  var memberId = null;

  this.timeout(5000);

  it ('should add a group member', function (done) {

    if (testId) {
      gitlab.groups.addMember(testId, config.userId, 'developer').done(
        function (member) {
          member.should.be.an.Object;
          member.access_level.should.equal(30);
          memberId = member.id;
          done();
        },
        done
      );
    } else {
      console.warn('Skipping add group member test because initial group creation failed');
      done();
    }
  });

  it ('should return group members', function (done) {
    if (testId) {
      gitlab.groups.getMembers(testId).done(
        function (members) {
          members.should.be.an.Array;
          // group owner is now automatically a member
          // so need to find the new member
          members.length.should.be.greaterThan(0);
          members.filter(function (m) {
            if (m.id === config.userId) {
              m.access_level.should.equal(30);
              return true;
            }
            return false;
          }).length.should.equal(1);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping get group membership test because initial group creation failed');
      done();
    }      

  });


  it ('should delete a group member', function (done) {

    if (memberId) {
      gitlab.groups.deleteMember(testId, config.userId).done(
        function (membership) {
          membership.should.be.an.Object;
          membership.user_id.should.equal(config.userId);
          membership.source_id.should.equal(testId);
          membership.access_level.should.equal(30);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping delete group member test because initial group membership creation failed');
      done();
    }
  });

});


describe('Group Deletion', function (done) {

  this.timeout(5000);

  it ('should delete a group', function (done) {
    if (testId) {
      gitlab.groups.delete(testId).done(
        function (group) {
          group.should.be.an.Object;
          group.id.should.equal(testId);
          group.name.should.equal(testName);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping delete group test because initial group creation failed');
      done();
    }
  });

  it ('should delete a group with members', function (done) {
    if (nameId) {
      gitlab.groups.addMember(nameId, config.userId, 'developer').done(
        function () {
          gitlab.groups.delete(nameId).done(
            function (group) {
              group.should.be.an.Object;
              group.id.should.equal(nameId);
              group.name.should.equal(nameName);
              done();
            },
            done
          )
        },
        done
      );
    } else {
      console.warn('Skipping delete group with members test because initial group creation failed');
      done();
    }
  });
  
});



