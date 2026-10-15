import { useSyncExternalStore } from 'react';
import { useAuth } from '../state/AuthContext';
import { cloud } from '../services/cloudStorage';

export function useAppRole() {
  const { currentUser } = useAuth();
  return useSyncExternalStore(cloud.subscribe, () => cloud.role(currentUser));
}
