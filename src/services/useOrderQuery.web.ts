import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { cloud } from './cloudStorage';
// Results are scoped to this view. Stale filter responses may populate the
// record cache but cannot replace the current view or its pagination cursor.
export function useOrderQuery(range: { start: number; end: number } | null, id?: string, allPages = false) {
  const [result, setResult] = useState({ loading: false, error: false, orderIds: null as string[] | null, next: null as string | null });
  const generation = useRef(0), loading = useRef(false), cursor = useRef<string | null>(null);
  const start = range?.start, end = range?.end;
  const run = useCallback(async (more = false) => {
    if (start === undefined && !id) return;
    if (more && (loading.current || !cursor.current)) return;
    const turn = more ? generation.current : ++generation.current;
    loading.current = true;
    let after = more ? cursor.current : null;
    setResult(previous => ({ ...previous, loading: true, error: false, ...(more ? {} : { orderIds: null, next: null }) }));
    try {
      const ids: string[] = [];
      do {
        const page = await cloud.queryOrders(start === undefined ? undefined : { start, end: end! }, after || undefined, id);
        if (generation.current !== turn) return;
        ids.push(...page.orderIds);
        if (page.next && page.next === after) throw Error('STALLED_QUERY');
        after = page.next;
      } while (allPages && after);
      cursor.current = after;
      setResult(previous => ({ loading: false, error: false, orderIds: [...new Set([...(more ? previous.orderIds || [] : []), ...ids])], next: after }));
    } catch { if (generation.current === turn) setResult(previous => ({ ...previous, loading: false, error: true })); }
    finally { if (generation.current === turn) loading.current = false; }
  }, [start, end, id, allPages]);
  useFocusEffect(useCallback(() => { cursor.current = null; void run(); return () => { generation.current++; loading.current = false; }; }, [run]));
  return { ...result, loadMore: () => { void run(true); }, reload: () => { void run(); } };
}
