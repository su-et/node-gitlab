module.exports = function projecthooks (apiReq) {

  var api           = {};
  
  api.get = function projecthooksGet (id, hookId, params) {
    var path = '/projects/' + id + '/hooks' + (hookId ? '/' + hookId : '');
    return apiReq(path, params);
  };

  api.create = function projecthooksCreate (id, hookUrl, eventOpts) {
    var path  = '/projects/' + id + '/hooks';
        req   = { method: 'POST', body: { url: hookUrl } };

    if (eventOpts) {
      Object.getOwnPropertyNames(eventOpts).forEach(function (k) {
        req.body[k] = eventOpts[k];
      });
    } else {
      req.body.push_events = true;
      req.body.issues_events = false;
      req.body.merge_requests_events = false;
    }

    return apiReq(path, req);
  };

  api.update = function projecthooksUpdate (id, hookId, hookOpts) {
    var path  = '/projects/' + id + '/hooks/' + hookId;
        req   = { method: 'PUT', body: hookOpts };

    return apiReq(path, req);
  };
  
  api.delete = function projecthooksDelete (id, hookId) {
    var path = '/projects/' + id + '/hooks/' + hookId;

    return apiReq(path, { method: 'DELETE' });
  };

  return api;
};
