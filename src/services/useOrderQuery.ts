// Native retains its complete offline history and existing screen behavior.
export function useOrderQuery(_range: { start: number; end: number } | null, _id?: string, _allPages = false) {
  return { loading: false, error: false, orderIds: null as string[] | null, next: null as string | null, loadMore: () => {}, reload: () => {} };
}
