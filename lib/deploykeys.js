module.exports = function deploykeys (apiReq) {

  var api           = {};
  
  api.get = function deploykeysGet (id, keyId, params) {
    return apiReq('/projects/' + id + '/keys' + (keyId ? '/' + keyId : ''), params);
  };

  api.create = function deploykeysCreate (id, title, key) {
    var path  = '/projects/' + id + '/keys';
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
    var path = '/projects/' + id + '/keys/' + keyId;

    return apiReq(path, { method: 'DELETE' });
  };

  return api;
};
