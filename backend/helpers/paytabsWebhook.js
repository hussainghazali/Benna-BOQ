// Standalone stub — no PayTabs webhook signature verification.
const preventReplayAttack = (req, res, next) => next();
module.exports = { preventReplayAttack };
