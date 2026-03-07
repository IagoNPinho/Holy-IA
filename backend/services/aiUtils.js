function splitLongText(text, maxLen) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxLen, text.length);
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

function splitAiResponse(text, { ideal = 120, max = 220, maxMessages = 3 } = {}) {
  const cleaned = (text || "").trim().replace(/\s+/g, " ");
  if (!cleaned) return [];

  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  const messages = [];
  let current = "";

  const pushCurrent = () => {
    if (current) {
      messages.push(current.trim());
      current = "";
    }
  };

  for (const sentence of sentences) {
    if (!sentence) continue;
    const candidate = current ? `${current} ${sentence}` : sentence;

    if (candidate.length <= ideal) {
      current = candidate;
      continue;
    }

    if (current) pushCurrent();

    if (sentence.length <= max) {
      current = sentence;
      continue;
    }

    // Sentence too long; hard split by max.
    const parts = splitLongText(sentence, max);
    for (const part of parts) {
      messages.push(part.trim());
    }
  }

  pushCurrent();

  if (messages.length <= maxMessages) return messages;

  // Merge overflow into the last message, trimming to max.
  const trimmed = messages.slice(0, maxMessages - 1);
  const remainder = messages.slice(maxMessages - 1).join(" ");
  trimmed.push(remainder.slice(0, max));
  return trimmed;
}

module.exports = {
  splitAiResponse,
};
