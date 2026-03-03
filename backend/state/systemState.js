// In-memory system state (MVP).
const state = {
  scheduledJobs: new Map(),
};

function addJob(id, job) {
  state.scheduledJobs.set(id, job);
}

function removeJob(id) {
  state.scheduledJobs.delete(id);
}

function listJobs() {
  return Array.from(state.scheduledJobs.keys());
}

module.exports = {
  addJob,
  removeJob,
  listJobs,
};
