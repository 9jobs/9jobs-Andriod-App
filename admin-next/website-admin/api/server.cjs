const next = require('next');

let nextAppPromise;

function getNextApp() {
  if (!nextAppPromise) {
    const app = next({ dev: false, dir: process.cwd() });
    nextAppPromise = app.prepare().then(() => app);
  }

  return nextAppPromise;
}

module.exports = async (req, res) => {
  const app = await getNextApp();
  return app.getRequestHandler()(req, res);
};
