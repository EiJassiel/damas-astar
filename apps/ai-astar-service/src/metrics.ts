let moveRequests = 0;
let moveErrors = 0;
const latencyBuckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500];

const latencyCounts = new Map<number, number>();
let latencySum = 0;
let latencyTotal = 0;

export function recordMoveRequest(durationMs: number, ok: boolean) {
  moveRequests += 1;
  if (!ok) moveErrors += 1;
  latencySum += durationMs;
  latencyTotal += 1;
  const bucket = latencyBuckets.find((limit) => durationMs <= limit) ?? latencyBuckets[latencyBuckets.length - 1];
  latencyCounts.set(bucket, (latencyCounts.get(bucket) ?? 0) + 1);
}

export function renderMetrics() {
  const lines = [
    '# HELP damas_ai_astar_move_requests_total Total A* AI move requests',
    '# TYPE damas_ai_astar_move_requests_total counter',
    `damas_ai_astar_move_requests_total ${moveRequests}`,
    '# HELP damas_ai_astar_move_errors_total Total A* AI move errors',
    '# TYPE damas_ai_astar_move_errors_total counter',
    `damas_ai_astar_move_errors_total ${moveErrors}`,
    '# HELP damas_ai_astar_move_duration_ms_sum Sum of A* AI move durations',
    '# TYPE damas_ai_astar_move_duration_ms_sum counter',
    `damas_ai_astar_move_duration_ms_sum ${latencySum}`,
    '# HELP damas_ai_astar_move_duration_ms_count Count of A* AI move durations',
    '# TYPE damas_ai_astar_move_duration_ms_count counter',
    `damas_ai_astar_move_duration_ms_count ${latencyTotal}`
  ];
  for (const bucket of latencyBuckets) {
    lines.push(`damas_ai_astar_move_duration_ms_bucket{le="${bucket}"} ${latencyCounts.get(bucket) ?? 0}`);
  }
  lines.push(`damas_ai_astar_move_duration_ms_bucket{le="+Inf"} ${latencyTotal}`);
  return `${lines.join('\n')}\n`;
}
