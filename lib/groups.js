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

/* Older versions of the GitLab API do not support group search
  api.search = function groupsSearch (name, params) {
    return apiReq('/groups/search/' + name, params);
  };
*/  

  api.getMembers = function groupsMembers (id, params) {
    return apiReq('/groups/' + encodeURIComponent(id) + '/members',
                  params);
  };

  function addOrUpdateMember(id, userId, access, method) {
    return apiReq('/groups/' + id + '/members', {
      method:         method || 'POST',
      body: {
        id:           id,
        user_id:      userId,
        access_level: accessLevels[access]
      }
    });
  };
  
  api.addMember = addOrUpdateMember;

  /* Older versions of the API do not support editing membership
  api.updateMember = function groupsUpdateMember (id, userId, access) {
    return addOrUpdateMember(id, userId, access, 'PUT');
  }
  */

  api.deleteMember = function groupsDeleteMember (id, userId) {
    return apiReq('/groups/' + encodeURIComponent(id) + '/members/' + encodeURIComponent(userId),
                  { method: 'DELETE' });
  };

  return api;
};
