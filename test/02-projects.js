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

describe('Generic Project Retrieval', function (done) {
  this.timeout(10000);

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
        projects.length.should.not.equal(0);
        projects[0].should.have.property('id').be.not.null;
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
      gitlab.projects.create({ "name": testName, "visibility_level": 10 }, config.userId).done(
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
  this.timeout(5000);

  it ('should list branches', function (done) {
    this.timeout(55000);
    if (testId) {
      var attempts  = 0,
          interval  = null;

      console.warn('        waiting 5s for import to complete');
      interval = setInterval(function () {
        attempts++;
        if (attempts === 10) {
          interval.close();
          done('Failed after ' + attempts + ' attempts to retrieve branches list');
        } else {
          gitlab.branches.get(testId).done(
            function (branches) {
              branches.should.be.an.Array;
              branches.length.should.be.greaterThan(0);
              branches.some(function (b) { return b.name === 'master'; }).should.be.true;
              interval.close();
              done();
            },
            function (err) {
              if (err.statusCode !== 500) {
                interval.close();
                done(err);
              }
            }
          );
          console.warn('        waiting another 5s for import to complete');
        }
      }, 5000);

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

describe('Project Deploy Keys', function (done) {
  var keyId;
  this.timeout(5000);

  it ('should add a deploy key to a project', function (done) {
    if (testId) {
      gitlab.deploykeys.create(testId, config.newSSHKey.title, config.newSSHKey.key).done(
        function (deploykey) {
          deploykey.should.be.an.Object;
          deploykey.id.should.be.greaterThan(0);
          keyId = deploykey.id;
          done();
        },
        done
      );
    } else {
      console.warn('Skipping add deploy key test because initial project creation failed');
      done();
    }
  });

  it ('should retrieve a single deploy key from a project', function (done) {
    if (testId && keyId) {
      gitlab.deploykeys.get(testId, keyId).done(
        function (deploykey) {
          deploykey.should.be.an.Object;
          deploykey.id.should.equal(keyId);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping get single deploy key test because initial project creation failed or key add failed');
      done();
    }
  });

  it ('should retrieve all deploy keys from a project', function (done) {
    if (testId && keyId) {
      gitlab.deploykeys.get(testId).done(
        function (deploykeys) {
          deploykeys.should.be.an.Array;
          deploykeys.length.should.be.greaterThan(0);
          deploykeys.some(function (k) { return k.id === keyId; }).should.be.true;
          done();
        },
        done
      );
    } else {
      console.warn('Skipping get all deploy keys test because initial project creation failed or key add failed');
      done();
    }
  });

  it ('should delete a deploy key from a project', function (done) {
    if (testId && keyId) {
      gitlab.deploykeys.delete(testId, keyId).done(
        function (deploykey) {
          deploykey.should.be.an.Object;
          deploykey.id.should.equal(keyId);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping delete deploy key test because initial project creation failed or key add failed');
      done();
    }
  });
});

describe('Project Hooks', function (done) {
  var hookUrl = 'http://example.org/',
      defaultHookId = null,
      specialHookId = null;

  this.timeout(5000);

  it ('should add a hook with default event notifications to a project', function (done) {
    if (testId) {
      gitlab.projecthooks.create(testId, hookUrl).done(
        function (hook) {
          hook.should.be.an.Object;
          hook.id.should.be.greaterThan(0);
          hook.url.should.equal(hookUrl);
          hook.push_events.should.be.true;
          hook.issues_events.should.be.false;
          hook.merge_requests_events.should.be.false;
          defaultHookId = hook.id;
          done();
        },
        done
      );
    } else {
      console.warn('Skipping add hook test because initial project creation failed');
      done();
    }
  });

  it ('should add a hook with custom event notifications to a project', function (done) {
    if (testId) {
      gitlab.projecthooks.create(testId, hookUrl, { push_events: false }).done(
        function (hook) {
          hook.should.be.an.Object;
          hook.id.should.be.greaterThan(0);
          hook.url.should.equal(hookUrl);
          hook.push_events.should.be.false;
          hook.issues_events.should.be.false;
          hook.merge_requests_events.should.be.false;
          specialHookId = hook.id;
          done();
        },
        done
      );
    } else {
      console.warn('Skipping add hook test because initial project creation failed');
      done();
    }
  });

  it ('should retrieve a single hook from a project', function (done) {
    if (testId && defaultHookId) {
      gitlab.projecthooks.get(testId, defaultHookId).done(
        function (hook) {
          hook.should.be.an.Object;
          hook.id.should.equal(defaultHookId);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping get single hook test because initial project creation failed or hook add failed');
      done();
    }
  });

  it ('should retrieve all hooks from a project', function (done) {
    if (testId && defaultHookId) {
      gitlab.projecthooks.get(testId).done(
        function (hooks) {
          hooks.should.be.an.Array;
          hooks.length.should.be.greaterThan(0);
          hooks.some(function (h) { return h.id === defaultHookId; }).should.be.true;
          hooks.some(function (h) { return h.id === specialHookId; }).should.be.true;
          done();
        },
        done
      );
    } else {
      console.warn('Skipping get all hooks test because initial project creation failed or hook add failed');
      done();
    }
  });

  it ('should update a hook with a new URL', function (done) {
    if (testId) {
      gitlab.projecthooks.update(testId, defaultHookId, { url: hookUrl + '/test' }).done(
        function (hook) {
          hook.should.be.an.Object;
          hook.id.should.equal(defaultHookId);
          hook.url.should.equal(hookUrl + '/test');
          hook.push_events.should.be.true;
          hook.issues_events.should.be.false;
          hook.merge_requests_events.should.be.false;
          done();
        },
        done
      );
    } else {
      console.warn('Skipping update hook test because initial project creation failed');
      done();
    }
  });

  it ('should delete a hook with default event notifications from a project', function (done) {
    if (testId && defaultHookId) {
      gitlab.projecthooks.delete(testId, defaultHookId).done(
        function (hook) {
          hook.should.be.an.Object;
          hook.id.should.equal(defaultHookId);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping delete hook test because initial project creation failed or hook add failed');
      done();
    }
  });

  it ('should delete a hook with custom event notifications from a project', function (done) {
    if (testId && specialHookId) {
      gitlab.projecthooks.delete(testId, specialHookId).done(
        function (hook) {
          hook.should.be.an.Object;
          hook.id.should.equal(specialHookId);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping delete hook test because initial project creation failed or hook add failed');
      done();
    }
  });

});


describe('Specific Project Retrieval', function (done) {
  this.timeout(5000);

  it ('should find a project by ID', function (done) {

    if (testId) {
      gitlab.projects.get(testId).done(
        function (project) {
          project.should.be.an.Object;
          // should 1-4 results for our project name
          project.should.have.property('id');
          project.id.should.equal(testId);
          project.should.have.property('name');
          project.name.should.equal(testName);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping search project test because initial project creation failed');
      done();
    }
  });

  it ('should find a project by namespace and name', function (done) {

    if (userTestId) {
      gitlab.projects.get(config.userName + '%2F' + testName).done(
        function (project) {
          project.should.be.an.Object;
          // should 1-4 results for our project name
          project.should.have.property('id');
          project.id.should.equal(userTestId);
          project.should.have.property('namespace');
          project.namespace.should.be.an.Object;
          project.namespace.should.have.property('path');
          project.namespace.path.should.equal(config.userName);
          project.should.have.property('name');
          project.name.should.equal(testName);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping search project test because initial project creation failed');
      done();
    }
  });

  it ('should find a project via search', function (done) {

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
        function (status) {
          status.should.be.a.Boolean;
          status.should.equal(true);
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
        function (status) {
          status.should.be.a.Boolean;
          status.should.equal(true);
          done();
        },
        done
      );
    } else {
      console.warn('Skipping delete project in group namespace test because initial project creation failed');
      done();
    }
  });

  it ('should delete a project created for a user by name', function (done) {
    if (userTestId) {
      gitlab.projects.delete(config.userName + '%2F' + testName).done(
        function (status) {
          status.should.be.a.Boolean;
          status.should.equal(true);
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
        function (status) {
          status.should.be.a.Boolean;
          status.should.equal(true);
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



