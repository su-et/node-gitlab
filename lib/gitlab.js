var Promise = require('promise');

module.exports = function gitlab (url, token, sudoUser) {
  var request = require('request'),
      defaults = {},
      apiReq = null,
      api = {},
      that = {};
  
  if (!url || typeof url !== 'string') {
    throw new Error('url is required and must be a string');
  }

  if (!token || typeof token !== 'string') {
    throw new Error('token is required and must be a string');
  }
  
  defaults = {
    baseUrl: url.replace(/\/+$/, '') + '/api/v3/',
    headers: {
      'User-Agent':     'node-gitlab',
      'PRIVATE-TOKEN':  token
    },
    json: true
  };

  if (sudoUser) {
    defaults.headers.SUDO = sudoUser;
  }

  apiReq = function apiReq (path, opts) {
    var r;

    if (opts) {
/* Older versions of the API do not support order_by, sort, archived, search parameters
   so opts should only contain method and/or body

      if (!opts.method && !opts.body) {
        // just params
        opts = { qs: opts };
      }
*/
    } else {
      opts = {};
    }

    r = request.defaults(defaults).defaults(opts);

    return new Promise ( function (fulfill, reject) {
      r(path, function (err, resp, body) {
        if (err) {
          reject(err);
        } else if (resp.statusCode >= 400) {
          var e = new Error('HTTP Status Code: ' + resp.statusCode);
          e.statusCode = resp.statusCode;
          e.detail = body;
          reject(e);
        } else {
          fulfill(body);
        }
      });
    });
  };

  [ 'projects', 'groups', 'users', 'branches', 'deploykeys', 'projecthooks' ].forEach( function (subApi) {
    api[subApi] = require('./' + subApi)(apiReq);
  });


  return api;
};
