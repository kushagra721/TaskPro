/**
 * The workspace's default channel — the one every workspace is created with,
 * and where invited CLIENTs land.
 *
 * Mirrors `DEFAULT_GROUP_NAME` in the backend's `utils/defaultGroup.js`. There
 * is no shared package between the two projects, so this is hand-synced; keep
 * the two equal.
 *
 * It lives in its own module because TWO screens now resolve the channel by
 * name — `CreateTaskModal` (which files a client's task there) and
 * `TaskDetailPage` (which recognises an unclaimed client request). A second
 * private copy in each was one rename away from disagreeing.
 *
 * Every comparison against it is trimmed and case-insensitive, so a workspace
 * that renames the channel simply stops matching and falls back to ordinary
 * behaviour rather than breaking.
 */
export const DEFAULT_GROUP_NAME = 'Client';
