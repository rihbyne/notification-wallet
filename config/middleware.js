var helpers = require('../helpers/util');
var log = require('./logging')()

var checkPubSignKey = function(req, res, next) {
  var pubKey = req.query.publicKey || req.body.publicKey;
  log.info('public key middleware check '+ pubKey);

  var signature = req.query.signature || req.body.signature;
  log.info('signature middleware check '+ signature);

  if(!helpers.validateParameter(pubKey, 'Public Key')) {
    log.warn('public key error '+ pubKey);
    helpers.sendJsonResponse(res, 403, 1, {failed:"Mandatory field not found"});
    return;
  } else if (!helpers.validateParameter(signature, 'Signature')) {
    log.warn('signature absent '+ signature);
    helpers.sendJsonResponse(res, 403, 1, {failed:"Mandatory field not found"});
    return;
  } else {
    next();
  }
}

module.exports = {
  checkPubSignKey: checkPubSignKey,
};
