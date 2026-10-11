// No-op mail stubs — standalone build has no mail provider.
module.exports = new Proxy(
  {},
  { get: () => async () => {} },
);
