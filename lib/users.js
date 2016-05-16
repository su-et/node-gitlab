var generatePassword = require("password-maker");

module.exports = function users (apiReq) {

  var api           = {};
  
  api.get = function usersGet (id, params) {
    return apiReq('/users' + (id ? '/' + id : ''), params);
  };

  function addOrUpdateUser (user, method) {
    if (!user.id && !user.password) {
      // new user with no password - generate a random one
      user.password = generatePassword({uppercase: true, numbers: true, symbols: false}, 32);
    }
    method = method || 'POST';
    return apiReq('/users' + (user.id ? '/' + user.id : ''),
                  { method: method, body: user });
  }

  api.create = addOrUpdateUser;

  api.update = function usersUpdate (user) {
    return addOrUpdateUser(user, 'PUT');
  };

  api.delete = function usersDelete (id) {
    return apiReq('/users/' + id, { method: 'DELETE' });
  };

/* Older versions of the GitLab API do not support group search
  api.search = function usersSearch (name, params) {
    return apiReq('/users/search/' + name, params);
  };
*/  
  api.getCurrentUser = function usersCurrentUser () {
    return apiReq('/user');
  };

  api.getSSHKeys = function usersGetSSHKeys (id) {
    var path = '/user' + (id ? 's/' + id : '' ) + '/keys';
    return apiReq(path);
  };
  
  api.addSSHKey = function usersAddSSHKey (id, title, key) {
    var path  = '/user' + (key ? 's/' + id : '' ) + '/keys';
        req   = {
                  method: 'POST',
                  body: {
                    title: key ? title : id,
                    key: key ? key : title
                  }
                };

    return apiReq(path, req);
  };
  
  api.deleteSSHKey = function usersDeleteSSHKey (id, keyId) {
    var path = '/user' + (keyId ? 's/' + id : '' ) + '/keys/' + (keyId ? keyId : id);

    return apiReq(path, { method: 'DELETE' });
  };

  return api;
};
