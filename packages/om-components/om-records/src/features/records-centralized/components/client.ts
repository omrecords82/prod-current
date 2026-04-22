/**
 * Field Mapper API Client
 * HTTP client with auth handling and error normalization
 */

interface ApiError {
  message: string;
  status: number;
  code?: string;
}

class FieldMapperApiError extends Error {
  constructor(public readonly apiError: ApiError) {
    super(apiError.message);
    this.name = 'FieldMapperApiError';
  }
}

export async function apiJson<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const authToken = localStorage.getItem("auth_token");
  
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorCode: string | undefined;

      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        if (errorData.code) {
          errorCode = errorData.code;
        }
      } catch {
        // Fallback to status text if response is not JSON
      }

      throw new FieldMapperApiError({
        message: errorMessage,
        status: response.status,
        code: errorCode,
      });
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    if (error instanceof FieldMapperApiError) {
      throw error;
    }

    // Network or other errors
    throw new FieldMapperApiError({
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      status: 0,
      code: 'NETWORK_ERROR',
    });
  }
}

export { FieldMapperApiError };
