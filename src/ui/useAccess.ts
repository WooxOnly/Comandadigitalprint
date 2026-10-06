import { useSyncExternalStore } from 'react';
import { cloud } from '../services/cloudStorage';
import { useAuth } from '../state/AuthContext';
import type { AccessAction } from '../services/access';
import { allowedAccess } from '../../shared/operations-validation.mjs';
export function useAccess(action: AccessAction) {
  const { currentUser } = useAuth();
  const access = useSyncExternalStore(cloud.subscribe, cloud.access);
  return allowedAccess(access, action, currentUser);
}
