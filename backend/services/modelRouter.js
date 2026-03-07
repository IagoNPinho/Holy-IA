// Select model provider based on detected intent.

function selectModel(intent) {
  switch (intent) {
    case "price_question":
    case "procedure_question":
    case "appointment_request":
      return "openai";
    case "greeting":
    case "working_hours":
    case "general_conversation":
    default:
      return "groq";
  }
}

module.exports = {
  selectModel,
};
