var Promise = require('promise'),
    parse   = require('parse-link-header');


module.exports = function gitlab (url, token, sudoUser) {
  var request = require('request'),
      defaults = {},
      apiReq = null,
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

  // create a customized request object
  // using our defaults
  request = require('request').defaults(defaults);

  // make an API call to GitLab and return a Promise
  apiRequest = function apiRequest (path, opts, results, links) {
    // if opts is null, make it an empty object
    opts = opts || {};

    // for GET requests we need to work with pagination
    if (!opts.method || opts.method.toUpperCase() === 'GET') {
      // ORDER IS IMPORTANT HERE

      // if opts has no qs property, make that an empty object too
      opts.qs = opts.qs || {};

      // then if links is null, make it an object with a next property
      // and pick up the starting page and items per page from opts.qs
      // or fallback to the defaults (page 1, 100 items per page)
      links = links || {
        next: {
          page:     opts.qs.page || 1,
          per_page: opts.qs.per_page || 100,
        }
      };

      // set opts.qs.page and opts.qs.per_page
      // if links was null but opts.qs contained page and per_page
      // then nothing will change, otherwise
      // page and per_page will either be the defaults (1 and 100)
      // or the 'next' rel returned in Link header of the last response
      opts.qs.page     = links.next.page;
      opts.qs.per_page = links.next.per_page;
    }

    // return a promise to return all the data
    return new Promise (function (fulfill, reject) {

      // Create a customized request object just for
      // this request, starting with our previously
      // customized request object.
      // This one is customized with pagination, and
      // any options passed from the API modules
      // (including non-GET methods)
      var r = request.defaults(opts);

      r(path, function (err, resp, body) {
        if (err) {
          // something went wrong in the request library,
          // or in our call to it
          reject(err);
        } else if (resp.statusCode >= 400) {
          // something went wrong with the HTTP request,
          // or on the server
          var e = new Error('HTTP Status Code: ' + resp.statusCode);
          e.statusCode = resp.statusCode;
          e.detail = body;
          reject(e);
        } else {
          // the call was successful
          if (!results) {
            // if there are no prior results,
            // just start with these results
            results = body;
          } else if (results instanceof Array) {
            // if the prior results were an array,
            // these should be too, so just use the
            // concatenation of the arrays
            results = results.concat(body);
          } else {
            // otherwise assume results is an object,
            // so add all the properties from this
            // response to results
            Object.keys(body).forEach(function (k) {
              results[k] = body[k];
            })
          }

          // parse the Link header
          links = parse(resp.headers.link);
          if (links && links.next) {
            // there was a Link header, and it had a next rel
            // so recurse until all the results are collected
            apiRequest(path, opts, results, links).done(fulfill, reject);
          } else {
            // there was no Link header, or it had no next rel
            // it's the end of the results, so just return them
            fulfill(results);
          }
        }
      });
    });
  };

  // all the actual APIs in modules, and are just
  // wrappers for apiRequest.  Import the module,
  // and pass it the apiRequest function.
  // if module 'foo' exports a function 'bar',
  // and 'gitlab' points to an instantiation of
  // this class, then the function will be
  // available as gitlab.foo.bar
  [
    'projects',
    'groups',
    'users',
    'branches',
    'deploykeys',
    'projecthooks'
  ].forEach( function (path) {
    that[path] = require('./' + path)(apiRequest);
  });

  return that;
};
