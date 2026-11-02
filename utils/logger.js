const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function serializeError(error) {
  if (!(error instanceof Error)) return error;
  return { name: error.name, message: error.message, stack: error.stack };
}

function createLogger(options = {}) {
  const threshold = LEVELS[options.level || process.env.LOG_LEVEL || 'info'] ?? LEVELS.info;
  const sink = options.sink || console;

  function write(level, message, context = {}) {
    if (LEVELS[level] < threshold) return;
    const record = {
      timestamp: new Date().toISOString(),
      level,
      message: String(message),
      ...Object.fromEntries(Object.entries(context).map(([key, value]) => [key, serializeError(value)])),
    };
    const output = JSON.stringify(record);
    const method = level === 'debug' ? 'log' : level;
    (sink[method] || sink.log).call(sink, output);
  }

  return Object.freeze({
    debug: (message, context) => write('debug', message, context),
    info: (message, context) => write('info', message, context),
    warn: (message, context) => write('warn', message, context),
    error: (message, context) => write('error', message, context),
  });
}

module.exports = { createLogger };
