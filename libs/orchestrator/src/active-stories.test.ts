import { describe, expect, it } from 'vitest';
import { ActiveStories } from './active-stories';

describe('ActiveStories', () => {
  it('tryAcquire returns true for a free key and false when taken', () => {
    const active = new ActiveStories();
    expect(active.tryAcquire('/repo', 0)).toBe(true);
    expect(active.tryAcquire('/repo', 0)).toBe(false);
  });

  it('release frees the key so it can be re-acquired', () => {
    const active = new ActiveStories();
    expect(active.tryAcquire('/repo', 3)).toBe(true);
    active.release('/repo', 3);
    expect(active.tryAcquire('/repo', 3)).toBe(true);
  });

  it('keys are scoped per (folderPath, storyIndex) pair', () => {
    const active = new ActiveStories();
    expect(active.tryAcquire('/repo-a', 1)).toBe(true);
    // Different folder — independent lock.
    expect(active.tryAcquire('/repo-b', 1)).toBe(true);
    // Different index — independent lock.
    expect(active.tryAcquire('/repo-a', 2)).toBe(true);
    // Same pair — blocked.
    expect(active.tryAcquire('/repo-a', 1)).toBe(false);
  });

  it('isActive reflects current state without mutating', () => {
    const active = new ActiveStories();
    expect(active.isActive('/repo', 0)).toBe(false);
    active.tryAcquire('/repo', 0);
    expect(active.isActive('/repo', 0)).toBe(true);
    expect(active.isActive('/repo', 0)).toBe(true);
  });

  it('release is idempotent', () => {
    const active = new ActiveStories();
    active.release('/repo', 0);
    active.tryAcquire('/repo', 0);
    active.release('/repo', 0);
    active.release('/repo', 0);
    expect(active.isActive('/repo', 0)).toBe(false);
  });

  it('releaseAll drops every listed index for the given folder', () => {
    const active = new ActiveStories();
    active.tryAcquire('/repo', 0);
    active.tryAcquire('/repo', 1);
    active.tryAcquire('/repo', 2);
    active.tryAcquire('/other', 0);
    active.releaseAll('/repo', [0, 1, 2]);
    expect(active.isActive('/repo', 0)).toBe(false);
    expect(active.isActive('/repo', 1)).toBe(false);
    expect(active.isActive('/repo', 2)).toBe(false);
    expect(active.isActive('/other', 0)).toBe(true);
    expect(active.size()).toBe(1);
  });

  it('keys with separator-like chars in the folder path do not collide', () => {
    const active = new ActiveStories();
    // Two distinct (folder, index) pairs that would collide under naive
    // `${folder}:${index}` concatenation.
    expect(active.tryAcquire('/repo', 10)).toBe(true);
    expect(active.tryAcquire('/repo:1', 0)).toBe(true);
    expect(active.isActive('/repo', 10)).toBe(true);
    expect(active.isActive('/repo:1', 0)).toBe(true);
  });
});
