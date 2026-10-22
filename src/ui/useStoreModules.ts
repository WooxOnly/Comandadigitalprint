import { useMemo, useSyncExternalStore } from 'react';
import { useOnlineOrders } from '../state/OnlineOrdersContext';
import { cloud } from '../services/cloudStorage';
export function useStoreModules() {
  const modules = useSyncExternalStore(cloud.subscribe, cloud.modules);
  const online = useOnlineOrders();
  return useMemo(() => ({ ...modules, online: online?.enabled === true }), [modules, online?.enabled]);
}
