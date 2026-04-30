import { classifyError } from '@/lib/errorClassifier';

interface AsyncActionOptions {
  setIsTyping?: (val: boolean) => void;
  setRefiningId?: (id: string | null) => void;
  addToast: (msg: string, type: 'error' | 'info' | 'success') => void;
  successMessage?: string;
  refiningId?: string;
}

/**
 * A standard wrapper for async actions in ScénarIA.
 * Handles typing states, refining IDs, error classification, and toasts.
 */
export async function runAsyncAction<T>(
  action: () => Promise<T>,
  options: AsyncActionOptions
): Promise<T | null> {
  const { setIsTyping, setRefiningId, addToast, successMessage, refiningId } = options;

  if (setIsTyping) setIsTyping(true);
  if (setRefiningId && refiningId) setRefiningId(refiningId);

  try {
    const result = await action();
    if (successMessage) {
      addToast(successMessage, 'success');
    }
    return result;
  } catch (error) {
    const classified = classifyError(error);
    addToast(classified.userMessage, 'error');
    return null;
  } finally {
    if (setIsTyping) setIsTyping(false);
    if (setRefiningId) setRefiningId(null);
  }
}
