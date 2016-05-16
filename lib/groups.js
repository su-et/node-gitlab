module.exports = function groups (apiReq) {

  var api           = {},
      accessLevels  = {
        'guest':      10,
        'reporter':   20,
        'developer':  30,
        'master':     40,
        'owner':      50,
      };
  
  api.get = function groupsGet (id, params) {
    return apiReq('/groups' + (id ? '/' + encodeURIComponent(id) : ''),
                  params);
  };

  api.create = function groupsCreate (group) {
    if (typeof group === 'string') {
      group = { name: group, path: group };
    }
    return apiReq('/groups',
                  { method: 'POST', body: group });
  };

  api.delete = function groupsDelete (id) {
    return apiReq('/groups/' + encodeURIComponent(id),
                  { method: 'DELETE' });
  };

  api.search = function groupsSearch (name, params) {
    return apiReq('/groups?search=' + encodeURIComponent(name),
                  params);
  };

  api.getMembers = function groupsMembers (id, params) {
    return apiReq('/groups/' + encodeURIComponent(id) + '/members',
                  params);
  };

  api.addMember = function groupsAddMember(id, userId, access) {
    return apiReq('/groups/' + encodeURIComponent(id) + '/members', {
      method:         'POST',
      body: {
        id:           id,
        user_id:      userId,
        access_level: accessLevels[access] || access
      }
    });
  };

  api.updateMember = function groupsUpdateMember(id, userId, access) {
    return apiReq('/groups/' + encodeURIComponent(id) + '/members/' + userId, {
      method:         'PUT',
      body: {
        id:           id,
        user_id:      userId,
        access_level: accessLevels[access] || access
      }
    });
  };

  api.deleteMember = function groupsDeleteMember (id, userId) {
    return apiReq('/groups/' + encodeURIComponent(id) + '/members/' + encodeURIComponent(userId),
                  { method: 'DELETE' });
  };

  return api;
};
