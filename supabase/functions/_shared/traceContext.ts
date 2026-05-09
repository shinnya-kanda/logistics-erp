export type TraceContext = {
  requestId: string;
  traceId: string;
  parentTraceId: string | null;
};

export function createTraceContext(): TraceContext {
  const requestId = crypto.randomUUID();

  return {
    requestId,
    traceId: requestId,
    parentTraceId: null,
  };
}
