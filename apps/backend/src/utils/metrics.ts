let httpRequests = 0;
let httpErrors = 0;
let activeGames = 0;
let movesProcessed = 0;
let aiCalls = 0;
let aiLatencySum = 0;

export function recordHttpRequest(ok: boolean) {
  httpRequests += 1;
  if (!ok) httpErrors += 1;
}

export function setActiveGames(count: number) {
  activeGames = count;
}

export function recordMoveProcessed() {
  movesProcessed += 1;
}

export function recordAiCall(durationMs: number) {
  aiCalls += 1;
  aiLatencySum += durationMs;
}

export function renderMetrics() {
  const aiAvg = aiCalls > 0 ? aiLatencySum / aiCalls : 0;
  return [
    '# HELP damas_http_requests_total Total HTTP requests',
    '# TYPE damas_http_requests_total counter',
    `damas_http_requests_total ${httpRequests}`,
    '# HELP damas_http_errors_total Total HTTP errors',
    '# TYPE damas_http_errors_total counter',
    `damas_http_errors_total ${httpErrors}`,
    '# HELP damas_active_games Current active games',
    '# TYPE damas_active_games gauge',
    `damas_active_games ${activeGames}`,
    '# HELP damas_moves_processed_total Total moves processed',
    '# TYPE damas_moves_processed_total counter',
    `damas_moves_processed_total ${movesProcessed}`,
    '# HELP damas_ai_calls_total Total AI service calls',
    '# TYPE damas_ai_calls_total counter',
    `damas_ai_calls_total ${aiCalls}`,
    '# HELP damas_ai_latency_ms_avg Average AI latency',
    '# TYPE damas_ai_latency_ms_avg gauge',
    `damas_ai_latency_ms_avg ${aiAvg.toFixed(2)}`,
    ''
  ].join('\n');
}
