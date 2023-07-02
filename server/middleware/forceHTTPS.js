const { FORCE_HTTPS } = require('../constants/index');

function forceHTTPS(req, res, next) {
  if (FORCE_HTTPS && !req.secure) {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
}

module.exports = {
  forceHTTPS,
};
