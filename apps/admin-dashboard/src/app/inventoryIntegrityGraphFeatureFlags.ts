// B77-47 hidden flag. Keep false until a later validation gate explicitly enables display.
// This flag only controls source option visibility; it does not enable fetch or live data.
export const ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false;

// B77-49 static admin guard. Keep false until a later admin-only validation phase.
// This guard only controls source option visibility; it does not implement auth or roles.
export const ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE = false;
