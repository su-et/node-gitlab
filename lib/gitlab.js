var Promise = require('promise'),
    parse   = require('parse-link-header');


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
    baseUrl: url.replace(/\/*$/, '/api/v3/'),
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
    var baseRequest = request.defaults(defaults).defaults((opts || {}));

    return new Promise ( function (fulfill, reject) {

      var requestPage = function requestPage (links, results) {

        return new Promise (function (fufill, reject) {
          var r = baseRequest.defaults({
                    qs: {
                      page: links.next.page,
                      per_page: 100
                    }
                  });

          r(path, function (err, resp, body) {
            if (err) {
              reject(err);
            } else if (resp.statusCode >= 400) {
              var e = new Error('HTTP Status Code: ' + resp.statusCode);
              e.statusCode = resp.statusCode;
              e.detail = body;
              reject(e);
            } else {
              if (!results) {
                results = body;
              } else if (results instanceof Array) {
                results = results.concat(body);
              } else {
                Object.keys(body).forEach(function (k) {
                  results[k] = body[k];
                })
              }

              links = parse(resp.headers.link);
              if (links && links.next) {
                requestPage(links, results).done(fulfill, reject);
              } else {
                fulfill(results);
              }
            }
          });
        });
      };

      requestPage({ next: { page: 1 } }).done(
        fulfill,
        reject
      );
    });
  };

  [ 'projects', 'groups', 'users', 'branches', 'deploykeys', 'projecthooks' ].forEach( function (subApi) {
    api[subApi] = require('./' + subApi)(apiReq);
  });


  return api;
};
