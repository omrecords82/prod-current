// Timeout wrapper system using AbortController

export interface TimeoutOptions {
  timeoutMs: number;
  operation: string;
}

export async function withAbort<T>(
  promise: Promise<T>,
  options: TimeoutOptions
): Promise<T> {
  const { timeoutMs, operation } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`Operation "${operation}" timed out after ${timeoutMs}ms`));
        });
      }),
    ]);
    
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Helper for synchronous operations that might hang
export function withSyncTimeout<T>(
  fn: () => T,
  options: TimeoutOptions
): T {
  const { timeoutMs, operation } = options;
  
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Operation "${operation}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      const result = fn();
      clearTimeout(timeoutId);
      resolve(result);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  }) as T; // Type assertion for sync compatibility
}

// Timeout decorator for class methods
export function timeout(timeoutMs: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withAbort(
        originalMethod.apply(this, args),
        { timeoutMs, operation: propertyKey }
      );
    };

    return descriptor;
  };
}
