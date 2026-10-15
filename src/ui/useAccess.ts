import { useSyncExternalStore } from 'react';
import { cloud } from '../services/cloudStorage';
import { useAuth } from '../state/AuthContext';
import type { AccessAction } from '../services/access';
import { roleAction } from '../../shared/app-roles.mjs';
import { useAppRole } from './useAppRole';
import { allowedAccess } from '../../shared/operations-validation.mjs';
export function useAccess(action: AccessAction) {
  const { currentUser } = useAuth();
  const role = useAppRole();
  const access = useSyncExternalStore(cloud.subscribe, cloud.access);
  return roleAction(role,action) && (['admin','manager'].includes(role || '') || allowedAccess(access, action, currentUser));
}
