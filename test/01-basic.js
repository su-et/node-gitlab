var should  = require('should'),
    assert  = require('assert'),
    fs      = require('fs'),
    config  = JSON.parse(fs.readFileSync('test/config.json', 'utf8')),
    GitLab  = require('../lib/gitlab.js');

describe('Basic tests', function (done) {

  it ('should fail if no args are passed', function (done) {
    should.throws(
      function () {
        GitLab();
      },
      /url is required/
    );
    done();
  });

  it ('should fail if URL is passed but token is not', function (done) {
    should.throws(
      function () {
        GitLab('test://test');
      },
      /token is required/
    );
    done();
  });
  
  it ('should not fail if url and token are passed as parameters', function (done) {
    should.doesNotThrow(
      function () {
        var gitlab = GitLab("test://test", "TOKEN" );
        gitlab.should.be.Object;
      }
    );
    done();
  });

  it ('should fail with bad token', function (done) {
    var gitlab = GitLab(config.url, 'BADTOKEN');
    gitlab.projects.getAll()
    .then(function (data) {
      done('Did not fail as expected');
      console.dir(data);
    })
    .catch(function () { done(); });
  });

  it ('should fail with bad url', function (done) {
    var gitlab = GitLab('test://test', 'fake-token');
    gitlab.projects.getAll()
    .then(function (data) {
      done('Did not fail as expected');
      console.dir(data);
    })
    .catch(function () { done(); });
  });
  
});


