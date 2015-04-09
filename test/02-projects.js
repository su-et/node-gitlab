var should      = require('should'),
    shouldHttp  = require('should-http'),
    assert      = require('assert'),
    fs          = require('fs'),
    config      = JSON.parse(fs.readFileSync('test/config.json', 'utf8')),
    gitlab      = require('../lib/gitlab.js')(config.url, config.token),
    gitlabSudo  = require('../lib/gitlab.js')(config.url, config.token, config.sudoUser),
    testName    = '',
    testId      = null,
    sudoTestId  = null,
    userTestId  = null,
    groupTestId = null,
    forkedId    = null;

describe('Project Retrieval', function (done) {

  var projId = null;
  
  it ('should return projects', function (done) {
    gitlab.projects.get().done(
      function (projects) {
        projects.should.be.an.Array;
        projects.length.should.not.equal(0);
        done();
      },
      done
    );
  });

  it ('should return all owned projects', function (done) {
    gitlab.projects.getOwned().done(
      function (projects) {
        projects.should.be.an.Array;
        done();
      },
      done
    );
  });

  it ('should return all projects (admin)', function (done) {
    gitlab.projects.getAll().done(
      function (projects) {
        projects.should.be.an.Array;
        projId = projects[0].id;
        done();
      },
      done
    );
  });

/* Older versions of the API do not support order_by, sort, archived, search parameters

  it ('should return an ordered list of all projects with order_by=id', function (done) {

    gitlab.projects.getAll({ "order_by": "id", "sort": "asc" }).done(
      function (projects) {
        projects.should.be.an.Array;
        projects.length.should.be.greaterThan(2);
        projects[0].id.should.be.lessThan(projects[1].id);
        done();
      },
      done
    );
  });
*/  
  it ('should return a single project', function (done) {
    gitlab.projects.get(projId).done(
      function (project) {
        project.should.be.an.Object;
        project.id.should.equal(projId);
        done();
      },
      done
    );
  });
});


describe('Project Creation', function (done) {

  this.timeout(5000);

  it ('should create a project with an import', function (done) {
    var n = Math.floor(Math.random() * 100000).toString();

    testName = 'test-' + '000000'.substr(0, 6 - n.length) + n;

    gitlab.projects.create({ name: testName, import_url: config.importUrl }).done(
      function (project) {
        project.should.be.an.Object;
        project.id.should.not.equal(0);
        testId = project.id;
        project.name.should.equal(testName);
        done();
      },
      done
    );
  });

  it ('should fail to create a project with an existing name', function (done) {
    if (testId) {
      gitlab.projects.create(testName).done(
        function (project) {
          done('Did not fail as expected');
        },
        function (err) {
          done();
        }
      );
    } else {
      console.warn('Skipping re-create project test because initial project creation failed');
      done();
    }
  });

  it ('should create a project with the same name using sudo', function (done) {
    if (testId) {
      gitlabSudo.projects.create({ "name": testName, "visibility_level": 10 }).done(
        function (project) {
          project.should.be.an.Object;
          project.id.should.not.equal(testId);
          sudoTestId = project.id;
          project.name.should.equal(testName);
          project.namespace.name.should.equal(config.sudoUser);
          project.namespace.path.should.equal(config.sudoUser);
          project.owner.username.should.equal(config.sudoUser);
          done();
        },
        function (err) {
          console.dir(err.detail);
          done(err);
        }
      );
    } else {
      console.warn('Skipping create project with sudo because initial project creation failed');
      done();
    }
  });
  
  it ('should create a project for another user', function (done) {
    if (testId) {
      gitlab.projects.create({ "name": testName, "public": true }, config.userId).done(
        function (project) {
          project.should.be.an.Object;
          project.id.should.not.equal(0);
          userTestId = project.id;
          project.name.should.equal(testName);
          project.namespace.owner_id.should.equal(config.userId);
          project.owner.id.should.equal(config.userId);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping create project for user because initial project creation failed');
      done();
    }
  });

  it ('should create a project in a group namespace', function (done) {
    if (testId) {
      gitlab.projects.create({ "name": testName, "public": true, "namespace_id": config.groupId }).done(
        function (project) {
          project.should.be.an.Object;
          project.id.should.not.equal(0);
          groupTestId = project.id;
          project.name.should.equal(testName);
          project.namespace.should.have.property('owner_id').be.null;
          project.namespace.id.should.equal(config.groupId);
          project.path_with_namespace.should.equal(project.namespace.path + '/' + testName);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping create project in group namespace because initial project creation failed');
      done();
    }
  });

  
  
/* Forking via the API is not support in older versions of GitLab
  
  it ('should fork a project', function (done) {
    if (testId) {
      gitlabSudo.projects.fork(testId).done(
        function (project) {
          project.should.be.an.Object;
          project.id.should.not.equal(testId);
          project.name.should.equal(testName);
          forkedId = project.id;
  //        console.dir(project);
          done();
        },
        function (err) {
          console.dir(err.detail);
          done(err);
        }
      );
    } else {
      console.warn('Skipping fork project test because initial project creation failed');
      done();
    }
  });
*/
});

describe('Branch Management', function (done) {
  this.timeout(10000);
  
  it ('should list branches', function (done) {
    function testBranches(branches) {
      branches.should.be.an.Array;
      branches.length.should.be.greaterThan(0);
      branches.some(function (b) { return b.name === 'master'; }).should.be.true;
      done();
    }

    if (testId) {
      gitlab.branches.get(testId).done(
        testBranches,
        function (err) {
          if (err.statusCode === 500) {
            // import not finished?
            console.warn('        first attempt to retrieve branch list failed');
            console.warn('        waiting another 5s for import to complete');
            setTimeout(function () {
              gitlab.branches.get(testId).done(
                testBranches,
                done
              );
            }, 5000);
          } else {
            done(err);
          }
        }
      );
    } else {
      console.warn('Skipping branch list test because initial project creation failed');
      done();
    }
  });

  it ('should protect a branch', function (done) {
    if (testId) {
      gitlab.branches.protect(testId, 'master').done(
        function (status) {
          done();
        },
        done
      );
    } else {
      console.warn('Skipping protect branch test because initial project creation failed');
      done();
    }
  });

  it ('should unprotect a branch', function (done) {
    if (testId) {
      gitlab.branches.unprotect(testId, 'master').done(
        function (status) {
          done();
        },
        done
      );
    } else {
      console.warn('Skipping unprotect branch test because initial project creation failed');
      done();
    }
  });

  it ('should create a branch', function (done) {
    if (testId) {
      gitlab.branches.create(testId, 'test', 'master').done(
        function (branch) {
          branch.should.be.an.Object;
          branch.name.should.equal('test');
          done();
        },
        done
      );
    } else {
      console.warn('Skipping create branch test because initial project creation failed');
      done();
    }
  });

  it ('should retrieve a specific branch', function (done) {
    if (testId) {
      gitlab.branches.get(testId, 'test').done(
        function (branch) {
          branch.should.be.an.Object;
          branch.name.should.equal('test');
          done();
        },
        done
      );
    } else {
      console.warn('Skipping single branch retrieve test because initial project creation failed');
      done();
    }
  });

/* Older versions of the GitLab API do not support branch deletion
  it ('should delete a branch', function (done) {
    if (testId) {
      gitlab.branches.delete(testId, 'test').done(
        function (branch) {
          branch.should.be.an.Object;
          branch.name.should.equal('test');
          console.dir(branch);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping delete branch test because initial project creation failed');
      done();
    }
  });
*/

});


describe('Project Search', function (done) {
  this.timeout(5000);

  it ('should find a project', function (done) {

    if (testId) {
      gitlab.projects.search(testName).done(
        function (projects) {
          var ids = [ testId, sudoTestId, userTestId, groupTestId, forkedId ].filter(
                function (e) { return e; }
              );
          projects.should.be.an.Array;
          // should 1-4 results for our project name
          projects.length.should.equal(ids.length);
          projects.every(function (p) { return p.name === testName; }).should.be.true;
          projects.every(function (p) { return ids.indexOf(p.id) >= 0; });
          done();
        },
        done
      );
    } else {
      console.warn('Skipping search project test because initial project creation failed');
      done();
    }
  });

});


/* Updating via the API is not support in older versions of GitLab

describe('Project Update', function (done) {
  this.timeout(5000);

  it ('should update a project', function (done) {
    var testDesc = 'this is project #' + Math.floor(Math.random() * 100000).toString();

    if (testId) {
      gitlab.projects.update({ "id": testId, "description": testDesc }).done(
        function (project) {
          project.should.be.an.Object;
          project.id.should.equal(testId);
          project.name.should.equal(testName);
          project.description.should.equal(testDesc);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping project update test because initial project creation failed');
      done();
    }
  });

});
*/

describe('Project Deletion', function (done) {

  this.timeout(5000);

  it ('should delete a project', function (done) {
    if (testId) {
      gitlab.projects.delete(testId).done(
        function (project) {
          project.should.be.an.Object;
          project.id.should.equal(testId);
          project.name.should.equal(testName);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping delete project test because initial project creation failed');
      done();
    }
  });

  it ('should delete a project created in a group namespace', function (done) {
    if (groupTestId) {
      gitlab.projects.delete(groupTestId).done(
        function (project) {
          project.should.be.an.Object;
          project.id.should.equal(groupTestId);
          project.name.should.equal(testName);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping delete project in group namespace test because initial project creation failed');
      done();
    }
  });

  it ('should delete a project created for a user', function (done) {
    if (userTestId) {
      gitlab.projects.delete(userTestId).done(
        function (project) {
          project.should.be.an.Object;
          project.id.should.equal(userTestId);
          project.name.should.equal(testName);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping delete user project test because initial project creation failed');
      done();
    }
  });

  it ('should delete a project created using sudo', function (done) {
    if (sudoTestId) {
      gitlab.projects.delete(sudoTestId).done(
        function (project) {
          project.should.be.an.Object;
          project.id.should.equal(sudoTestId);
          project.name.should.equal(testName);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping delete user project test because initial project creation failed');
      done();
    }
  });
  
/* Forking via the API is not support in older versions of GitLab
  it ('should delete a forked project', function (done) {
    if (forkedId) {
      gitlab.projects.delete(forkedId).done(
        function (project) {
          project.should.be.an.Object;
          project.id.should.equal(forkedId);
          project.name.should.equal(testName);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping delete forked project test because forking project failed');
      done();
    }
  });
*/
});



