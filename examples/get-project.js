#! /usr/bin/env node

var fs       = require('fs'),
    config   = JSON.parse(fs.readFileSync('../test/config.json', 'utf8')),
    gitlab   = require('../lib/gitlab.js')(config.url, 'ZZajpHnQerzfwRaHL1sb');
    projects = process.argv;

while (projects[0] !== 'node') {
  projects.shift();
}
projects.shift();
projects.shift();

gitlab.projects.getAll().done(
  function (allProjects) {
    var p = allProjects;
    console.log('Found ' + allProjects.length + ' projects');
    if (projects.length > 0) {
      console.log('Filtering projects for just [' + projects.join(', ') + ']');
      p = allProjects.filter(function (project) {
        return (projects.indexOf(project.name) >= 0);
      });
    }
    p.forEach(function (project) {
      console.log('#' + project.id + ' ' + project.namespace.path + '/' + project.name);
    });
  },
  function (err) {
    console.error(err);
  }
);

