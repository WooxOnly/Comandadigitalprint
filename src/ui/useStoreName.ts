import { useSyncExternalStore } from 'react';
import { getStoreId } from '../config/store';
import { cloud } from '../services/cloudStorage';

export function useStoreName() {
  return useSyncExternalStore(cloud.subscribe, () => cloud.storeName() || getStoreId());
}
