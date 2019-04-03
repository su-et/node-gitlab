module.exports = function repofiles (apiReq) {

  var api = {};
  
  api.get = function repofilesGet (id, path, ref) {
    var qs = {
          ref: ref
        };

    return apiReq('/projects/' + id + '/repository/files/' + encodeURIComponent(path),
                  { method: 'GET', qs: qs });
  };

  function addOrUpdateFile (id, path, branch, message, content, encoding, method) {
    var body  = {
          file_path:      path,
          branch:    branch,
          commit_message: message
        };

    if (content) {
      body.content = content;
    }
    if (encoding) {
      body.encoding = encoding;
    }

    return apiReq('/projects/' + id + '/repository/files/' + encodeURIComponent(path),
                  { method: method || 'POST', body: body });
  }
  
  api.create = addOrUpdateFile;
  
  api.update = function (id, path, branch, message, content, encoding) {
    return addOrUpdateFile(id, path, branch, message, content, encoding, 'PUT');
  };

  api.delete = function repofilesDelete (id, path, branch, message) {
    var qs  = {
          branch:         branch,
          commit_message: message
        };

    return apiReq('/projects/' + id + '/repository/files/' + encodeURIComponent(path),
                  { method: 'DELETE', qs: qs });
  };
  
  return api;
};
