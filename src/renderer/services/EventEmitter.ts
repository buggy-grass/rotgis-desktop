type EventListener<T = any> = (data: T) => void;

class EventEmitter {
  private events: Record<string, EventListener[]>;

  constructor() {
    this.events = {};
  }

  on<T = any>(eventName: string, listener: EventListener<T>): void {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(listener);
  }

  emit<T = any>(eventName: string, data: T): void {
    if (this.events[eventName]) {
      this.events[eventName].forEach((listener) => listener(data));
    }
  }

  off<T = any>(eventName: string, listener: EventListener<T>): void {
    if (this.events[eventName]) {
      this.events[eventName] = this.events[eventName].filter((l) => l !== listener);
    }
  }
}

declare global {
  interface Window {
    eventBus: EventEmitter;
  }
}

window.eventBus = new EventEmitter();

export default window.eventBus;
