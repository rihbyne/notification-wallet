var bunyan = require('bunyan'),
  bformat = require('bunyan-format'),
  formatOut = bformat({ color: 'true' }),
  defaults = {},
  logger

var bunyanOpts = {
  name: 'st-notify',
  src: true,
  streams: [
    {
      level: 'debug',
      stream: formatOut, // log INFO and above to stdout
    },
    {
      type: 'rotating-file',
      level: 'info',
      period: '1d',
      path: '../st-notify.json', // log ERROR and above to a file
      count: 30
    }
  ]
}

var createLogger = function createLogger () {
  if (logger) {
    return logger
  }

  logger = bunyan.createLogger(bunyanOpts)
  return logger
}

module.exports = createLogger
