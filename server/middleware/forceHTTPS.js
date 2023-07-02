function forceHTTPS(req, res, next) {

    if (process.env.FORCE_HTTPS === 'true' && !req.secure) {
       return res.redirect("https://" + req.headers.host + req.url);
    }

    next();
}

module.exports = {
    forceHTTPS
}