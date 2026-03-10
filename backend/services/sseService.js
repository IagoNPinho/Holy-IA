const clients = new Set();

function addClient(res) {
  clients.add(res);
  res.on("close", () => {
    clients.delete(res);
  });
}

function sendEvent(type, payload) {
  const data = JSON.stringify(payload || {});
  const message = `event: ${type}\ndata: ${data}\n\n`;
  let sent = 0;
  for (const client of clients) {
    try {
      client.write(message);
      sent += 1;
    } catch {
      // ignore write errors to keep SSE loop alive
    }
  }
  return { sent, clients: clients.size };
}

module.exports = {
  addClient,
  sendEvent,
};
