import { useAuth } from '../context/AuthContext';

export function usePermissions() {
  const { user } = useAuth() || {};
  const role = user?.role;
  const userId = user?.id;

  const canDelete = () => {
    return role === 'admin' || role === 'ceo';
  };

  const canEdit = (resourceOwnerId = null) => {
    if (role === 'admin' || role === 'ceo') return true;
    if (role === 'accounts') return true; 
    if (role === 'sales') {
      if (resourceOwnerId) return resourceOwnerId === userId;
      return true; 
    }
    return false;
  };

  return { canDelete, canEdit, role, userId };
}
