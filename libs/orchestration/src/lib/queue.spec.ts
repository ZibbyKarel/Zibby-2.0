import { AsyncQueue } from './queue';

describe('AsyncQueue', () => {
  it('processes items up to concurrency limit in parallel', async () => {
    const queue = new AsyncQueue<number>(2);
    const running: number[] = [];
    const maxConcurrent: number[] = [];

    const process = async (n: number) => {
      running.push(n);
      maxConcurrent.push(running.length);
      await new Promise((r) => setTimeout(r, 10));
      running.splice(running.indexOf(n), 1);
    };

    await Promise.all([1, 2, 3, 4].map((n) => queue.add(() => process(n))));

    expect(Math.max(...maxConcurrent)).toBe(2);
  });

  it('resolves all items even if some throw', async () => {
    const queue = new AsyncQueue<void>(2);
    const results: ('ok' | 'err')[] = [];

    await Promise.allSettled([
      queue.add(async () => { results.push('ok'); }),
      queue.add(async () => { throw new Error('fail'); }).catch(() => { results.push('err'); }),
      queue.add(async () => { results.push('ok'); }),
    ]);

    expect(results.filter(r => r === 'ok').length).toBe(2);
    expect(results.filter(r => r === 'err').length).toBe(1);
  });

  it('exposes activeCount and pendingCount', async () => {
    const queue = new AsyncQueue<void>(1);
    let resolveFirst!: () => void;
    const firstDone = new Promise<void>((r) => { resolveFirst = r; });

    const first = queue.add(() => firstDone);
    // Second task is now queued
    const second = queue.add(async () => { /* noop */ });

    expect(queue.activeCount).toBe(1);
    expect(queue.pendingCount).toBe(1);

    resolveFirst();
    await Promise.all([first, second]);

    expect(queue.activeCount).toBe(0);
    expect(queue.pendingCount).toBe(0);
  });
});
