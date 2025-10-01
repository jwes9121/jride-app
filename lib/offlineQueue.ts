
interface QueuedRequest {
  id: string;
  timestamp: number;
  type: 'booking' | 'landmark';
  data: any;
  retryCount: number;
}

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private isOnline: boolean = true;
  private maxRetries: number = 3;
  private retryDelay: number = 5000;
  private initialized: boolean = false;

  constructor() {
    // Delay initialization to avoid SSR issues
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.init();
      }, 100);
    }
  }

  private init(): void {
    if (this.initialized) return;
    this.initialized = true;
    
    this.loadQueue();
    this.setupOnlineListener();
  }

  private loadQueue(): void {
    try {
      const stored = localStorage.getItem('j-ride-offline-queue');
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
      this.queue = [];
    }
  }

  private saveQueue(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('j-ride-offline-queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  private setupOnlineListener(): void {
    if (typeof window === 'undefined') return;
    
    this.isOnline = navigator.onLine;
    
    const handleOnline = () => {
      this.isOnline = true;
      setTimeout(() => this.processQueue(), 1000);
    };

    const handleOffline = () => {
      this.isOnline = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clean up event listeners when needed
    if (typeof window !== 'undefined' && window.addEventListener) {
      const cleanup = () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
      
      // Store cleanup function for potential future use
      (window as any).__offlineQueueCleanup = cleanup;
    }
  }

  addToQueue(type: 'booking' | 'landmark', data: any): string {
    if (!this.initialized) {
      this.init();
    }

    const request: QueuedRequest = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type,
      data,
      retryCount: 0
    };

    this.queue.push(request);
    this.saveQueue();
    
    if (this.isOnline) {
      setTimeout(() => this.processQueue(), 500);
    }

    return request.id;
  }

  async processQueue(): Promise<void> {
    if (!this.initialized || !this.isOnline || this.queue.length === 0) return;

    const pendingRequests = [...this.queue];
    
    for (const request of pendingRequests) {
      try {
        await this.processRequest(request);
        this.removeFromQueue(request.id);
      } catch (error) {
        console.error('Error processing queued request:', error);
        request.retryCount++;
        
        if (request.retryCount >= this.maxRetries) {
          this.removeFromQueue(request.id);
          this.notifyFailure(request);
        } else {
          setTimeout(() => this.processQueue(), this.retryDelay);
        }
      }
    }
    
    this.saveQueue();
  }

  private async processRequest(request: QueuedRequest): Promise<void> {
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('j-ride-token');
    
    if (request.type === 'booking') {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/book-ride`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request.data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Request failed');
      }
      
      this.notifySuccess(request, result);
    } else if (request.type === 'landmark') {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/landmark-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request.data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Request failed');
      }
    }
  }

  private removeFromQueue(id: string): void {
    this.queue = this.queue.filter(request => request.id !== id);
  }

  private notifySuccess(request: QueuedRequest, result: any): void {
    if (typeof window === 'undefined') return;
    
    if (request.type === 'booking') {
      const event = new CustomEvent('offlineBookingSync', { 
        detail: { request, result } 
      });
      window.dispatchEvent(event);
    }
  }

  private notifyFailure(request: QueuedRequest): void {
    if (typeof window === 'undefined') return;
    
    const event = new CustomEvent('offlineRequestFailed', { 
      detail: { request } 
    });
    window.dispatchEvent(event);
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }

  isOnlineStatus(): boolean {
    return this.isOnline;
  }
}

// Create singleton instance
let offlineQueueInstance: OfflineQueue | null = null;

export const getOfflineQueue = (): OfflineQueue => {
  if (!offlineQueueInstance) {
    offlineQueueInstance = new OfflineQueue();
  }
  return offlineQueueInstance;
};

export const offlineQueue = getOfflineQueue();
export default offlineQueue;
