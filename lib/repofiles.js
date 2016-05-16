module.exports = function repofiles (apiReq) {

  var api = {};
  
  api.get = function repofilesGet (id, path, ref) {
    var qs = {
          file_path: path,
          ref: ref
        };

    return apiReq('/projects/' + id + '/repository/files',
                  { method: 'GET', qs: qs });
  };

  function addOrUpdateFile (id, path, branch, message, content, encoding, method) {
    var body  = {
          file_path:      path,
          branch_name:    branch,
          content:        content || '',
          encoding:       encoding || 'text',
          commit_message: message
        };

    return apiReq('/projects/' + id + '/repository/files/',
                  { method: method || 'POST', body: body });
  }
  
  api.create = addOrUpdateFile;
  
  api.update = function (id, path, branch, message, content, encoding) {
    return addOrUpdateFile(id, path, branch, message, content, encoding, 'PUT');
  };

  api.delete = function repofilesDelete (id, path, branch, message) {
    var qs  = {
          file_path:      path,
          branch_name:    branch,
          commit_message: message
        };

    return apiReq('/projects/' + id + '/repository/files/',
                  { method: 'DELETE', qs: qs });
  };
  
  return api;
};
