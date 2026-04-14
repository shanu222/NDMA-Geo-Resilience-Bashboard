import { useEffect, useRef, useState } from 'react';
import { apiUrl } from './config';

export function useRealtimePoll(onTick: () => void, ms = 30_000) {
  const ref = useRef(onTick);
  ref.current = onTick;
  useEffect(() => {
    const id = window.setInterval(() => ref.current(), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

export function useSocket(handler: (msg: { topic: string; payload: unknown }) => void) {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = import.meta.env.DEV ? `${window.location.hostname}:3001` : window.location.host;
    const url = `${proto}://${host}/ws`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      return;
    }
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string);
        handler(data);
      } catch {
        /* ignore */
      }
    };
    return () => ws.close();
  }, [handler]);
  return connected;
}

export function riskReportPdfHref() {
  return apiUrl('/api/v1/reports/pdf');
}
