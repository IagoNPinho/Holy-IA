// Stub for future ClínicaExperts integration.

async function fetchPatientByPhone(_phone) {
  // TODO: integrate with ClínicaExperts API.
  return null;
}

async function createAppointment(_payload) {
  // TODO: integrate with ClínicaExperts API.
  return { ok: false, message: "Integração não configurada." };
}

module.exports = {
  fetchPatientByPhone,
  createAppointment,
};
