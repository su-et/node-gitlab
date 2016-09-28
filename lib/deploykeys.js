module.exports = function deploykeys (apiReq) {

  var api           = {};

  api.getAll = function deploykeysGetAll (params) {
    return apiReq('/deploy_keys/', params);
  };
  
  api.get = function deploykeysGet (id, keyId, params) {
    return apiReq('/projects/' + id + '/deploy_keys/' + (keyId ? keyId : ''), params);
  };

  api.create = function deploykeysCreate (id, title, key) {
    var path  = '/projects/' + id + '/deploy_keys/';
        req   = {
                  method: 'POST',
                  body: {
                    title: title,
                    key: key
                  }
                };

    return apiReq(path, req);
  };
  
  api.delete = function deploykeysDelete (id, keyId) {
    var path = '/projects/' + id + '/deploy_keys/' + keyId;

    return apiReq(path, { method: 'DELETE' });
  };

  api.enable = function deploykeysEnable (id, keyId) {
    var path = '/projects/' + id + '/deploy_keys/' + keyId + '/enable';

    return apiReq(path, { method: 'POST' });
  }

  api.disable = function deploykeysDisable (id, keyId) {
    var path = '/projects/' + id + '/deploy_keys/' + keyId + '/enable';

    return apiReq(path, { method: 'DELETE' });
  }

  return api;
};
