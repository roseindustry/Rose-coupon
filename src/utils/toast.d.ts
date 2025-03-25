declare module '@/utils/toast' {
  export function toast(message: string, type?: 'success' | 'error' | 'info' | 'warning', options?: object): void;
  export function showToast(message: string, type?: 'success' | 'error' | 'info' | 'warning', options?: object): void;
} 