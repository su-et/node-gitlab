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
    gitlab.projects.get()
    .then(function (projects) {
      projects.should.be.an.Array;
      projects.length.should.not.equal(0);
      done();
    })
    .catch(done);
  });

  it ('should return all owned projects', function (done) {
    gitlab.projects.getOwned()
    .then(function (projects) {
      projects.should.be.an.Array;
      done();
    })
    .catch(done);
  });

  it ('should return all projects (admin)', function (done) {
    gitlab.projects.getAll()
    .then(function (projects) {
      projects.should.be.an.Array;
      projects.length.should.not.equal(0);
      projects[0].should.have.property('id').be.not.null;
      projId = projects[0].id;
      done();
    })
    .catch(done);
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
    gitlab.projects.get(projId)
    .then(function (project) {
      project.should.be.an.Object;
      project.id.should.equal(projId);
      done();
    })
    .catch(done);
  });
});


describe('Project Creation', function (done) {

  this.timeout(7500);

  it ('should create a project with an import', function (done) {
    var n = Math.floor(Math.random() * 100000).toString();

    testName = 'test-' + '000000'.substr(0, 6 - n.length) + n;

    gitlab.projects.create({ name: testName, import_url: config.importUrl })
    .then(function (project) {
      project.should.be.an.Object;
      project.id.should.not.equal(0);
      testId = project.id;
      project.name.should.equal(testName);
      done();
    })
    .catch(done);
  });

  it ('should fail to create a project with an existing name', function (done) {
    if (testId) {
      gitlab.projects.create(testName)
      .then(function (project) {
        done('Did not fail as expected');
      })
      .catch(function (err) {
        done();
      });
    } else {
      console.warn('Skipping re-create project test because initial project creation failed');
      done();
    }
  });

  it ('should create a project with the same name using sudo', function (done) {
    if (testId) {
      gitlabSudo.projects.create({ "name": testName, "visibility_level": 10 })
      .then(function (project) {
        project.should.be.an.Object;
        project.id.should.not.equal(testId);
        sudoTestId = project.id;
        project.name.should.equal(testName);
        project.namespace.name.should.equal(config.sudoUser);
        project.namespace.path.should.equal(config.sudoUser);
        project.owner.username.should.equal(config.sudoUser);
        done();
      })
      .catch(function (err) {
        console.dir(err.detail);
        done(err);
      });
    } else {
      console.warn('Skipping create project with sudo because initial project creation failed');
      done();
    }
  });
  
  it ('should create a project for another user', function (done) {
    if (testId) {
      gitlab.projects.create({ "name": testName, "visibility_level": 10 }, config.userId)
      .then(function (project) {
        project.should.be.an.Object;
        project.id.should.not.equal(0);
        userTestId = project.id;
        project.name.should.equal(testName);
        project.namespace.owner_id.should.equal(config.userId);
        project.owner.id.should.equal(config.userId);
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping create project for user because initial project creation failed');
      done();
    }
  });

  it ('should create a project in a group namespace', function (done) {
    if (testId) {
      // use the namespace/group default visibility
      gitlab.projects.create({ "name": testName, "namespace_id": config.groupId })
      .then(function (project) {
        project.should.be.an.Object;
        project.id.should.not.equal(0);
        groupTestId = project.id;
        project.name.should.equal(testName);
        project.namespace.should.have.property('owner_id').be.null;
        project.namespace.id.should.equal(config.groupId);
        project.path_with_namespace.should.equal(project.namespace.path + '/' + testName);
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping create project in group namespace because initial project creation failed');
      done();
    }
  });

  
  
/* Forking via the API is not support in older versions of GitLab
  
  it ('should fork a project', function (done) {
    if (testId) {
      gitlabSudo.projects.fork(testId)
      .then(function (project) {
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
  this.timeout(7500);

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
          gitlab.branches.get(testId)
          .then(function (branches) {
            branches.should.be.an.Array;
            branches.length.should.be.greaterThan(0);
            branches.some(function (b) { return b.name === 'master'; }).should.be.true;
            interval.close();
            done();
          })
          .catch(function (err) {
            if (err.statusCode !== 500) {
              interval.close();
              done(err);
            }
          });
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
      gitlab.branches.protect(testId, 'master')
      .then(function (status) {
          done();
      })
      .catch(done);
    } else {
      console.warn('Skipping protect branch test because initial project creation failed');
      done();
    }
  });

  it ('should unprotect a branch', function (done) {
    if (testId) {
      gitlab.branches.unprotect(testId, 'master')
      .then(function (status) {
          done();
      })
      .catch(done);
    } else {
      console.warn('Skipping unprotect branch test because initial project creation failed');
      done();
    }
  });

  it ('should create a branch', function (done) {
    if (testId) {
      gitlab.branches.create(testId, 'test', 'master')
      .then(function (branch) {
        branch.should.be.an.Object;
        branch.name.should.equal('test');
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping create branch test because initial project creation failed');
      done();
    }
  });

  it ('should retrieve a specific branch', function (done) {
    if (testId) {
      gitlab.branches.get(testId, 'test')
      .then(function (branch) {
        branch.should.be.an.Object;
        branch.name.should.equal('test');
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping single branch retrieve test because initial project creation failed');
      done();
    }
  });

/* Older versions of the GitLab API do not support branch deletion
  it ('should delete a branch', function (done) {
    if (testId) {
      gitlab.branches.delete(testId, 'test')
      .then(function (branch) {
          branch.should.be.an.Object;
          branch.name.should.equal('test');
          console.dir(branch);
          done();
      })
      .catch(done);
    } else {
      console.warn('Skipping delete branch test because initial project creation failed');
      done();
    }
  });
*/

});

describe('Project Deploy Keys', function (done) {
  var keyId;
  this.timeout(7500);

  it ('should add a deploy key to a project', function (done) {
    if (testId) {
      gitlab.deploykeys.create(testId, config.newSSHKey.title, config.newSSHKey.key)
      .then(function (deploykey) {
        deploykey.should.be.an.Object;
        deploykey.id.should.be.greaterThan(0);
        keyId = deploykey.id;
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping add deploy key test because initial project creation failed');
      done();
    }
  });

  it ('should retrieve a single deploy key from a project', function (done) {
    if (testId && keyId) {
      gitlab.deploykeys.get(testId, keyId)
      .then(function (deploykey) {
        deploykey.should.be.an.Object;
        deploykey.id.should.equal(keyId);
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping get single deploy key test because initial project creation failed or key add failed');
      done();
    }
  });

  it ('should retrieve all deploy keys from a project', function (done) {
    if (testId && keyId) {
      gitlab.deploykeys.get(testId)
      .then(function (deploykeys) {
        deploykeys.should.be.an.Array;
        deploykeys.length.should.be.greaterThan(0);
        deploykeys.some(function (k) { return k.id === keyId; }).should.be.true;
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping get all deploy keys test because initial project creation failed or key add failed');
      done();
    }
  });

  it ('should delete a deploy key from a project', function (done) {
    if (testId && keyId) {
      gitlab.deploykeys.delete(testId, keyId)
      .then(function (deploykey) {
        deploykey.should.be.an.Object;
        deploykey.id.should.equal(keyId);
        done();
      })
      .catch(done);
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

  this.timeout(15000);

  it ('should add a hook with default event notifications to a project', function (done) {
    if (testId) {
      gitlab.projecthooks.create(testId, hookUrl)
      .then(function (hook) {
        hook.should.be.an.Object;
        hook.id.should.be.greaterThan(0);
        hook.url.should.equal(hookUrl);
        hook.push_events.should.be.true;
        hook.issues_events.should.be.false;
        hook.merge_requests_events.should.be.false;
        defaultHookId = hook.id;
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping add hook test because initial project creation failed');
      done();
    }
  });

  it ('should add a hook with custom event notifications to a project', function (done) {
    if (testId) {
      gitlab.projecthooks.create(testId, hookUrl, { push_events: false })
      .then(function (hook) {
        hook.should.be.an.Object;
        hook.id.should.be.greaterThan(0);
        hook.url.should.equal(hookUrl);
        hook.push_events.should.be.false;
        hook.issues_events.should.be.false;
        hook.merge_requests_events.should.be.false;
        specialHookId = hook.id;
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping add hook test because initial project creation failed');
      done();
    }
  });

  it ('should retrieve a single hook from a project', function (done) {
    if (testId && defaultHookId) {
      gitlab.projecthooks.get(testId, defaultHookId)
      .then(function (hook) {
        hook.should.be.an.Object;
        hook.id.should.equal(defaultHookId);
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping get single hook test because initial project creation failed or hook add failed');
      done();
    }
  });

  it ('should retrieve all hooks from a project', function (done) {
    if (testId && defaultHookId) {
      gitlab.projecthooks.get(testId)
      .then(function (hooks) {
        hooks.should.be.an.Array;
        hooks.length.should.be.greaterThan(0);
        hooks.some(function (h) { return h.id === defaultHookId; }).should.be.true;
        hooks.some(function (h) { return h.id === specialHookId; }).should.be.true;
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping get all hooks test because initial project creation failed or hook add failed');
      done();
    }
  });

  it ('should update a hook with a new URL', function (done) {
    if (testId) {
      gitlab.projecthooks.update(testId, defaultHookId, { url: hookUrl + '/test' })
      .then(function (hook) {
        hook.should.be.an.Object;
        hook.id.should.equal(defaultHookId);
        hook.url.should.equal(hookUrl + '/test');
        hook.push_events.should.be.true;
        hook.issues_events.should.be.false;
        hook.merge_requests_events.should.be.false;
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping update hook test because initial project creation failed');
      done();
    }
  });

  it ('should delete a hook with default event notifications from a project', function (done) {
    if (testId && defaultHookId) {
      gitlab.projecthooks.delete(testId, defaultHookId)
      .then(function (hooks) {
        hooks.should.be.an.Array;
        hooks.length.should.equal(1);
        hooks[0].should.be.an.Object;
        hooks[0].id.should.equal(defaultHookId);
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping delete hook test because initial project creation failed or hook add failed');
      done();
    }
  });

  it ('should delete a hook with custom event notifications from a project', function (done) {
    if (testId && specialHookId) {
      gitlab.projecthooks.delete(testId, specialHookId)
      .then(function (hooks) {
        hooks.should.be.an.Array;
        hooks.length.should.equal(1);
        hooks[0].should.be.an.Object;
        hooks[0].id.should.equal(specialHookId);
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping delete hook test because initial project creation failed or hook add failed');
      done();
    }
  });

});


describe('Specific Project Retrieval', function (done) {
  this.timeout(7500);

  it ('should find a project by ID', function (done) {

    if (testId) {
      gitlab.projects.get(testId)
      .then(function (project) {
        project.should.be.an.Object;
        // should 1-4 results for our project name
        project.should.have.property('id');
        project.id.should.equal(testId);
        project.should.have.property('name');
        project.name.should.equal(testName);
        done();
      })
      .catch(done);
    } else {
      console.warn('Skipping search project test because initial project creation failed');
      done();
    }
  });

  it ('should find a project by namespace and name', function (done) {

    if (userTestId) {
      gitlab.projects.get(config.userName + '%2F' + testName)
      .then(function (project) {
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
      })
      .catch(done);
    } else {
      console.warn('Skipping search project test because initial project creation failed');
      done();
    }
  });

  it ('should find a project via search', function (done) {

    if (testId) {
      gitlab.projects.search(testName)
      .then(function (projects) {
          var ids = [ testId, sudoTestId, userTestId, groupTestId, forkedId ].filter(
                function (e) { return e; }
              );
          projects.should.be.an.Array;
          // should 1-4 results for our project name
          projects.length.should.equal(ids.length);
          projects.every(function (p) { return p.name === testName; }).should.be.true;
          projects.every(function (p) { return ids.indexOf(p.id) >= 0; });
          done();
      })
      .catch(done);
    } else {
      console.warn('Skipping search project test because initial project creation failed');
      done();
    }
  });

});


/* Updating via the API is not support in older versions of GitLab

describe('Project Update', function (done) {
  this.timeout(7500);

  it ('should update a project', function (done) {
    var testDesc = 'this is project #' + Math.floor(Math.random() * 100000).toString();

    if (testId) {
      gitlab.projects.update({ "id": testId, "description": testDesc })
      .then(function (project) {
          project.should.be.an.Object;
          project.id.should.equal(testId);
          project.name.should.equal(testName);
          project.description.should.equal(testDesc);
          done();
      })
      .catch(done);
    } else {
      console.warn('Skipping project update test because initial project creation failed');
      done();
    }
  });

});
*/

describe('Project Deletion', function (done) {

  this.timeout(7500);

  it ('should delete a project', function (done) {
    if (testId) {
      gitlab.projects.delete(testId)
      .then(function (status) {
          done();
      })
      .catch(done);
    } else {
      console.warn('Skipping delete project test because initial project creation failed');
      done();
    }
  });

  it ('should delete a project created in a group namespace', function (done) {
    if (groupTestId) {
      gitlab.projects.delete(groupTestId)
      .then(function (status) {
          done();
      })
      .catch(done);
    } else {
      console.warn('Skipping delete project in group namespace test because initial project creation failed');
      done();
    }
  });

  it ('should delete a project created for a user by name', function (done) {
    if (userTestId) {
      gitlab.projects.delete(config.userName + '%2F' + testName)
      .then(function (status) {
          done();
      })
      .catch(done);
    } else {
      console.warn('Skipping delete user project test because initial project creation failed');
      done();
    }
  });

  it ('should delete a project created using sudo', function (done) {
    if (sudoTestId) {
      gitlab.projects.delete(sudoTestId)
      .then(function (status) {
          done();
      })
      .catch(done);
    } else {
      console.warn('Skipping delete user project test because initial project creation failed');
      done();
    }
  });
  
/* Forking via the API is not support in older versions of GitLab
  it ('should delete a forked project', function (done) {
    if (forkedId) {
      gitlab.projects.delete(forkedId)
      .then(function (project) {
          project.should.be.an.Object;
          project.id.should.equal(forkedId);
          project.name.should.equal(testName);
          done();
      })
      .catch(done);
    } else {
      console.warn('Skipping delete forked project test because forking project failed');
      done();
    }
  });
*/
});



