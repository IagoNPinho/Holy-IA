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
  for (const client of clients) {
    client.write(message);
  }
}

module.exports = {
  addClient,
  sendEvent,
};
