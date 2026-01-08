export type ChangeItem = {
  update: Uint8Array;
  userId: string;
};

type ChangeQueueOptions = {
  onDrain: (items: ChangeItem[]) => void;
  maxBatch?: number;
};

export class ChangeQueue {
  private readonly queue: ChangeItem[] = [];
  private readonly onDrain: (items: ChangeItem[]) => void;
  private readonly maxBatch: number;
  private draining = false;

  constructor(options: ChangeQueueOptions) {
    this.onDrain = options.onDrain;
    this.maxBatch = options.maxBatch ?? 1000;
  }

  enqueue(item: ChangeItem): void {
    this.queue.push(item);
    if (!this.draining) {
      this.draining = true;
      queueMicrotask(() => this.drain());
    }
  }

  private drain(): void {
    if (this.queue.length === 0) {
      this.draining = false;
      return;
    }

    const items = this.queue.splice(0, this.maxBatch);
    this.onDrain(items);

    if (this.queue.length > 0) {
      setImmediate(() => this.drain());
      return;
    }

    this.draining = false;
  }
}
