export class AsyncQueue<T> {
  private running = 0;
  private waiters: (() => void)[] = [];

  constructor(private readonly concurrency: number) {}

  async add<R>(task: () => Promise<R>): Promise<R> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.concurrency) {
      this.running++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waiters.push(() => {
        this.running++;
        resolve();
      });
    });
  }

  private release(): void {
    this.running--;
    const next = this.waiters.shift();
    if (next) next();
  }

  get activeCount(): number {
    return this.running;
  }

  get pendingCount(): number {
    return this.waiters.length;
  }
}
