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


// AI Flow Mode: 'production' | 'development'
// DevFlow (development) is ALWAYS the default across the entire application.
// This ensures the Gemini 3 suite (3.1 Flash Lite and 3 Flash) are prioritized across the application.
export const aiFlowMode = new ServiceState<'production' | 'development'>('development');
