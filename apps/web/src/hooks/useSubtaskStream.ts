import { useEffect, useState } from 'react';

const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';

export interface StreamEvent {
  type: string;
  stream?: string;
  line?: string;
  status?: string;
  error?: string;
  prUrl?: string;
}

export function useSubtaskStream(subtaskId: string | null) {
  const [events, setEvents] = useState<StreamEvent[]>([]);

  useEffect(() => {
    if (!subtaskId) return;
    const es = new EventSource(`${BASE_URL}/api/subtasks/${subtaskId}/stream`);

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(e.data) as StreamEvent;
        setEvents((prev) => [...prev.slice(-500), parsed]);
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [subtaskId]);

  return events;
}
