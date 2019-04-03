module.exports = function branches (apiReq) {

  var api = {};
  
  api.get = function branchesGet (id, name, params) {
    var path  = '/projects/' + id + '/repository/branches' +
                (name ? '/' + name : '');
    return apiReq(path, params);
  };

  api.protect = function branchesProtect (id, name) {
    var path  = '/projects/' + id + '/repository/branches/' +
                name + '/protect';
    return apiReq(path, { method: 'PUT' });
  };

  api.unprotect = function branchesUnprotect (id, name) {
    var path  = '/projects/' + id + '/repository/branches/' +
                name + '/unprotect';
    return apiReq(path, { method: 'PUT' });
  };

  api.create = function branchesCreate (id, name, ref) {
    return apiReq('/projects/' + id + '/repository/branches/',
                  { method: 'POST', body: { branch: name, ref: ref } });
  };

/* Older versions of the GitLab API do not support branch deletion
  api.delete = function branchesDelete (id, name) {
    return apiReq('/projects/' + id + '/repository/branches/' + name,
                  { method: 'DELETE' });
  };
*/  
  return api;
};
