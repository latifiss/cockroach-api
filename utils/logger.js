const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function compactValue(value) {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }
  if (value && typeof value === 'object') {
    const compact = Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !['stack', 'cause'].includes(key))
        .map(([key, item]) => [key, item instanceof Error ? `${item.name}: ${item.message}` : item])
    );
    return JSON.stringify(compact);
  }
  return String(value ?? '')
    .replace(/\\s+/g, ' ')
    .trim();
}

function installCompactConsole() {
  if (console.__compactLoggingInstalled) return;

  for (const [method, emoji] of [['error', '❌'], ['warn', '⚠️']]) {
    const original = console[method].bind(console);
    console[method] = (...args) => {
      const message = args.map(compactValue).filter(Boolean).join(' | ');
      const prefix = message.startsWith(emoji) ? '' : `${emoji} `;
      original(`${prefix}${message}`);
    };
  }

  Object.defineProperty(console, '__compactLoggingInstalled', {
    value: true,
    configurable: false,
  });
}

function serializeError(error) {
  if (!(error instanceof Error)) return error;
  return { name: error.name, message: error.message, code: error.code };
}

function createLogger(options = {}) {
  const requestedLevel = String(options.level || process.env.LOG_LEVEL || 'info').toLowerCase();
  const threshold = LEVELS[requestedLevel] ?? LEVELS.info;
  const sink = options.sink || console;
  const pretty = options.pretty !== false;

  function write(level, message, context = {}) {
    if (LEVELS[level] < threshold) return;
    if (pretty) {
      const details = Object.entries(context)
        .map(([key, value]) => `${key}: ${compactValue(value)}`)
        .join(' | ');
      const prefix = { debug: '🔎', info: 'ℹ️', warn: '⚠️', error: '❌' }[level];
      const method = level === 'debug' ? 'log' : level;
      (sink[method] || sink.log).call(sink, `${prefix} ${String(message).replace(/\\s+/g, ' ').trim()}${details ? ` — ${details}` : ''}`);
      return;
    }
    const record = {
      timestamp: new Date().toISOString(),
      level,
      message: String(message).replace(/\\s+/g, ' ').trim(),
      ...Object.fromEntries(Object.entries(context).map(([key, value]) => [key, serializeError(value)])),
    };
    const method = level === 'debug' ? 'log' : level;
    (sink[method] || sink.log).call(sink, JSON.stringify(record));
  }

  return Object.freeze({
    debug: (message, context) => write('debug', message, context),
    info: (message, context) => write('info', message, context),
    warn: (message, context) => write('warn', message, context),
    error: (message, context) => write('error', message, context),
  });
}

installCompactConsole();

module.exports = { createLogger, installCompactConsole };
