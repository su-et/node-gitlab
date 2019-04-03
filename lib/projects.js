module.exports = function projects (apiReq) {

  var api = {};
  
  function projectsGet (id, params) {
    if (!params && typeof(id) !== 'number') {
      params = id;
      id = undefined;
    }
    return apiReq('/projects' + (id ? '/' + id : ''), params);
  };

  api.get = projectsGet;

  api.getOwned = function projectsGetOwned (params) {
    return apiReq('/projects/?owned=yes', params);
  };

  api.getAll = function projectsGetAll (params) {
    return projectsGet(undefined, params);
  };

  api.create = function projectsCreate (proj, userId) {
    if (typeof proj === 'string') {
      proj = { 'name': proj };
    }
    return apiReq('/projects' + (userId ? '/user/' + userId : ''),
                  { method: 'POST', body: proj });
  };

/* Updating via the API is not support in older versions of GitLab
  api.update = function projectsUpdate (proj) {
    return apiReq('/projects/' + proj.id, { method: 'PUT', body: proj });
  };
*/  
/* Forking via the API is not support in older versions of GitLab
  api.fork = function projectsFork (projId) {
    return apiReq('/projects/fork/' + projId, { method: 'POST' });
  };
*/  
  api.delete = function projectsDelete (id) {
    return apiReq('/projects/' + id, { method: 'DELETE' });
  };

  api.search = function projectsSearch (name, params) {
    return apiReq('/projects/?search=' + name, params);
  };
  
  return api;
};
