import { useState, useEffect } from 'react';

interface Role {
  name: string;
  description: string;
  permissions: Permission[];
  user_count: number;
}

interface Permission {
  resource: string;
  action: string;
  description?: string;
}

interface User {
  id: string;
  name: string;
  email?: string;
  roles: string[];
  kb_scopes: string[];
  is_active: boolean;
  created_at: number;
  last_used_at?: number;
}

interface AccessControlData {
  roles: Role[];
  permissions: Permission[];
  users: User[];
  available_resources: string[];
  available_actions: string[];
}

export function AccessControl() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions'>('users');
  const [accessData, setAccessData] = useState<AccessControlData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalType, setModalType] = useState<'user' | 'role' | 'permission'>('user');

  // Form states
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadAccessControlData();
  }, []);

  const loadAccessControlData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/access-control');
      
      if (!response.ok) {
        throw new Error('Failed to load access control data');
      }

      const data = await response.json();
      setAccessData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load access control data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({});
        loadAccessControlData();
      }
    } catch (err) {
      console.error('Failed to create user:', err);
    }
  };

  const handleCreateRole = async () => {
    try {
      const response = await fetch('/api/auth/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({});
        loadAccessControlData();
      }
    } catch (err) {
      console.error('Failed to create role:', err);
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/auth/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !isActive })
      });

      if (response.ok) {
        loadAccessControlData();
      }
    } catch (err) {
      console.error('Failed to toggle user status:', err);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const openCreateModal = (type: 'user' | 'role' | 'permission') => {
    setModalType(type);
    setFormData({});
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading access control data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="text-red-400">⚠️</div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Access Control Data</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <button onClick={loadAccessControlData} className="mt-3 btn-secondary text-sm">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!accessData) {
    return <div>No access control data available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Access Control Management</h2>
          <p className="text-gray-600 mt-1">Manage users, roles, and permissions</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={loadAccessControlData} className="btn-secondary">
            Refresh
          </button>
          <button onClick={() => openCreateModal(activeTab as any)} className="btn-primary">
            Create {activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1)}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'users', label: 'Users', icon: '👥', count: accessData.users.length },
            { key: 'roles', label: 'Roles', icon: '🏷️', count: accessData.roles.length },
            { key: 'permissions', label: 'Permissions', icon: '🔐', count: accessData.permissions.length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-1 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    KB Access
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accessData.users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        {user.email && (
                          <div className="text-sm text-gray-500">{user.email}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <span key={role} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.kb_scopes.map((scope) => (
                          <span key={scope} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                            {scope === '*' ? 'All KBs' : scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_used_at ? formatTimestamp(user.last_used_at) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleUserStatus(user.id, user.is_active)}
                        className={`text-sm font-medium ${
                          user.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {accessData.users.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No users configured</p>
            </div>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          {accessData.roles.map((role) => (
            <div key={role.name} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{role.name}</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                      {role.user_count} {role.user_count === 1 ? 'user' : 'users'}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">{role.description}</p>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Permissions:</h4>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map((permission, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-sm">
                          {permission.resource}:{permission.action}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {accessData.roles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No roles configured</p>
            </div>
          )}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Granted To
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accessData.permissions.map((permission, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {permission.resource}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {permission.action}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {permission.description || 'No description'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {accessData.roles
                          .filter(role => role.permissions.some(p => 
                            p.resource === permission.resource && p.action === permission.action
                          ))
                          .map(role => (
                            <span key={role.name} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                              {role.name}
                            </span>
                          ))
                        }
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {accessData.permissions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No permissions configured</p>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create New {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
              </h3>

              {modalType === 'user' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input w-full"
                      placeholder="Enter user name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input w-full"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Roles</label>
                    <select
                      multiple
                      value={formData.roles || []}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        roles: Array.from(e.target.selectedOptions, option => option.value) 
                      })}
                      className="input w-full"
                    >
                      {accessData.roles.map(role => (
                        <option key={role.name} value={role.name}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {modalType === 'role' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input w-full"
                      placeholder="Enter role name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input w-full"
                      placeholder="Enter role description"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={modalType === 'user' ? handleCreateUser : handleCreateRole}
                  className="btn-primary"
                >
                  Create {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
