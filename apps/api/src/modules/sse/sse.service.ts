import { Injectable, MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface SseMessage {
  topic: string;       // e.g. "subtask:clxyz123", "job:clxyz456"
  data: unknown;
  event?: string;
}

@Injectable()
export class SseService {
  private readonly stream$ = new Subject<SseMessage>();

  emit(topic: string, data: unknown, event?: string): void {
    this.stream$.next({ topic, data, event });
  }

  subscribe(topic: string): Observable<MessageEvent> {
    return this.stream$.pipe(
      filter((msg) => msg.topic === topic),
      map((msg) => ({
        data: JSON.stringify(msg.data),
        type: msg.event ?? 'message',
      })),
    );
  }
}
