type Listener<T> = (value: T) => void;

class ServiceState<T> {
  private value: T;
  private listeners: Set<Listener<T>> = new Set();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  get(): T {
    return this.value;
  }

  set(newValue: T) {
    if (this.value !== newValue) {
      this.value = newValue;
      this.listeners.forEach(l => l(this.value));
    }
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    // Initial call
    listener(this.value);
    return () => this.listeners.delete(listener);
  }
}

/**
 * Global reactive states for services.
 * Using a simple observable pattern to avoid Redux overhead for these specific flags.
 */
export const aiQuotaState = new ServiceState<boolean>(false);
export const aiQuotaNoticeConsumed = new ServiceState<boolean>(false);
