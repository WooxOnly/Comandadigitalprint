import { useSyncExternalStore } from 'react';
import { cloud } from '../services/cloudStorage';
export function useStoreModules() {
  return useSyncExternalStore(cloud.subscribe, cloud.modules);
}
