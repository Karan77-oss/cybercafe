import { Response } from 'express';

export type SSEClient = {
  id: string;
  userId: string;
  role: string;
  res: Response;
};

const clients = new Map<string, SSEClient>();

export function addClient(client: SSEClient): void {
  clients.set(client.id, client);
}

export function removeClient(clientId: string): void {
  clients.delete(clientId);
}

export function broadcastEvent(event: string, payload: any, filter?: (c: SSEClient) => boolean): void {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients.values()) {
    if (!filter || filter(client)) {
      try {
        client.res.write(message);
      } catch {
        removeClient(client.id);
      }
    }
  }
}

export function sendUserEvent(userId: string, event: string, payload: any): void {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients.values()) {
    if (client.userId === userId) {
      try {
        client.res.write(message);
      } catch {
        removeClient(client.id);
      }
    }
  }
}

export function getConnectedClientCount(): number {
  return clients.size;
}
