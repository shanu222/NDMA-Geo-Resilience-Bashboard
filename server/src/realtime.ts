import type { WebSocketServer } from 'ws';

let wss: WebSocketServer | null = null;

export function setWss(server: WebSocketServer) {
  wss = server;
}

export function broadcast(topic: string, payload: unknown) {
  if (!wss) return;
  const msg = JSON.stringify({ topic, payload, ts: new Date().toISOString() });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}
