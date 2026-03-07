// In-memory conversation state tracker (MVP).

const states = new Map();

function getState(conversationId) {
  return states.get(conversationId) || "new_lead";
}

function transitionState(conversationId, intent) {
  const current = getState(conversationId);
  let next = current;

  switch (intent) {
    case "price_question":
    case "procedure_question":
      next = "qualifying";
      break;
    case "appointment_request":
      next = "appointment_offer";
      break;
    default:
      next = current;
  }

  states.set(conversationId, next);
  return next;
}

function setState(conversationId, state) {
  states.set(conversationId, state);
  return state;
}

module.exports = {
  getState,
  transitionState,
  setState,
};
