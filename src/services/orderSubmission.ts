export type SubmissionResult = 'busy' | 'saved';

// The synchronous lock also catches a second tap before React can render disabled=true.
export function createOrderSubmitter<T>() {
  let busy = false;
  return {
    get busy() { return busy; },
    async submit(order: T, history: T[], actions: {
      persist: (history: T[]) => Promise<void>;
      onSaved: (history: T[]) => void;
      print: (order: T) => Promise<void>;
      onBusy: (busy: boolean) => void;
    }): Promise<SubmissionResult> {
      if (busy) return 'busy';
      busy = true;
      actions.onBusy(true);
      try {
        const next = [order, ...history];
        await actions.persist(next);
        actions.onSaved(next);
        await actions.print(order);
        return 'saved';
      } finally {
        busy = false;
        actions.onBusy(false);
      }
    },
  };
}
