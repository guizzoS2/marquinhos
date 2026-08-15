function parsePayload(raw) {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return { type: 'text', text: raw };
    }
  }
  return raw;
}

export function connectChatRoom(roomId, onMessage) {
  const wsBase = import.meta.env.VITE_CHAT_WS_URL;
  let socket = null;
  let channel = null;
  let closed = false;

  if (wsBase) {
    const url = new URL(wsBase);
    url.searchParams.set('room', roomId);
    socket = new WebSocket(url.toString());
    socket.addEventListener('message', (event) => {
      if (!closed) onMessage(parsePayload(event.data));
    });
  } else if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(`fnl-chat-${roomId}`);
    channel.onmessage = (event) => {
      if (!closed) onMessage(event.data);
    };
  }

  return {
    send(payload) {
      const envelope = { roomId, ...payload };
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(envelope));
        return;
      }
      if (channel) {
        channel.postMessage(envelope);
      }
    },
    close() {
      closed = true;
      if (socket) socket.close();
      if (channel) channel.close();
    },
  };
}
