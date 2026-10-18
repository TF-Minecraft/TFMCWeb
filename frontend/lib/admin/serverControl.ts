import { adminRequest } from "./api";
import type { ServerKey, ServerPolicy } from "./servers";

export type ReleaseChange = {
  repo: string;
  old_version: string;
  version: string;
  asset: string;
  /** Set when the installed file is a test build the release would replace. */
  test_build?: boolean;
  /** The test build's own version is higher than the release's. */
  newer_test?: boolean;
};
export type Activation = { name: string; loaded: string | null; version: string };
export type ServerPlan = {
  id: string;
  server: ServerKey;
  mode: "restart" | "latest";
  expires_at: number;
  changes: ReleaseChange[];
  activation: Activation[];
  skipped: { repo: string; reason: string }[];
  last_backup_at: number | null;
  /** The helper takes a fresh AMP backup during the countdown. */
  backup?: boolean;
};
export type ServerJob = {
  id: string;
  server: ServerKey;
  phase:
    | "countdown"
    | "installing"
    | "restarting"
    | "checking"
    | "reopening"
    | "complete"
    | "failed"
    | "cancelled"
    | "awaiting_review"
    | "resolved";
  deadline: number;
  /** Seconds of warnings this restart started with; older jobs leave it out. */
  countdown?: number;
  maintenance_started: boolean;
  emergency_override?: boolean;
  backup?: { title: string; state: "running" | "done" } | null;
  error: string | null;
  changes: ReleaseChange[];
  activation: Activation[];
};
export type ControlServer = { key: ServerKey; label: string; running: boolean; policy: ServerPolicy };
export type ControlStatus = {
  status: string;
  jobs: ServerJob[];
  allowed_servers?: ServerKey[];
  /** Every server the helper knows, with its rules; older helpers leave it out. */
  servers?: ControlServer[];
};

// Main's and Dev's rules, for a helper that doesn't report them.
const LEGACY: Record<string, ServerPolicy> = {
  main: { countdown: 300, backup: true, dev_verified: true, review: true, maintenance: true, releases_only: true },
  dev: { countdown: 0, backup: false, dev_verified: false, review: false, maintenance: true, releases_only: false },
};

/** A server's label and rules from the helper's status. */
export function describe(status: ControlStatus | null, key: ServerKey): { label: string; policy: ServerPolicy } {
  const found = status?.servers?.find((s) => s.key === key);
  if (found) return { label: found.label, policy: found.policy };
  return { label: key.charAt(0).toUpperCase() + key.slice(1), policy: LEGACY[key] ?? LEGACY.main };
}

export function getControl(): Promise<ControlStatus> {
  return adminRequest("/admin/servers/control");
}

export function planServer(server: ServerKey, mode: ServerPlan["mode"]): Promise<ServerPlan> {
  return adminRequest(`/admin/servers/${server}/plan`, { method: "POST", body: JSON.stringify({ mode }) });
}

export function serverAction(
  server: ServerKey,
  action: "start" | "cancel" | "reopen" | "resolve",
  id: string,
  reason: string,
  emergency_override = false,
  replace_test_builds: string[] = [],
): Promise<ServerJob> {
  return adminRequest(`/admin/servers/${server}/${action}`, {
    method: "POST",
    body: JSON.stringify({ id, reason, emergency_override, replace_test_builds }),
  });
}

export const CONTROL_MESSAGES: Record<string, string> = {
  control_not_configured: "Server controls need the host connection to be configured.",
  control_unavailable: "The server control connection is unavailable.",
  server_job_active: "A restart is already running or needs attention. Finish it before starting another.",
  plugins_changed: "The plugin files changed. Review a fresh plan before restarting.",
  plan_expired: "This plan expired. Review a fresh plan.",
  pending_plugin_update: "A plugin waits in the update folder. Resolve it before using these controls.",
  plugin_unreadable: "AMP couldn’t read a plugin jar. Check the plugins folder in the AMP panel.",
  plugin_inventory_conflict: "Duplicate or unreadable plugins need resolving before a restart.",
  server_not_ready: "The server must be running with maintenance off before starting a restart.",
  maintenance_changed: "Maintenance changed during the countdown. Check the server before continuing.",
  maintenance_unavailable: "Maintenance could not be confirmed. Check the server.",
  releases_unavailable: "GitHub releases could not be checked. Try again later.",
  release_checksum_failed: "A release failed its checksum check. Installation stopped.",
  release_identity_failed: "A release did not match the installed plugin. Installation stopped.",
  startup_check_failed: "Startup checks failed. Maintenance stays on until the server passes its checks.",
  helper_interrupted: "The control helper restarted. Check the server before continuing.",
  server_operation_failed: "The server operation failed. Check the server and its logs.",
  save_failed: "The server did not confirm saving. Installation stopped.",
  cannot_cancel: "The restart has passed the countdown and can no longer be cancelled.",
  reason_required: "Give a reason of at least 3 characters.",
  scheduled_restart_conflict:
    "This would come within 15 minutes of a task in the server’s AMP schedule. Try again after that task.",
  schedule_unavailable: "AMP’s schedule for this server couldn’t be read, so the restart wasn’t started.",
  server_files_unavailable: "AMP couldn’t reach this server’s files. Check the instance in the AMP panel.",
  bad_server: "AMP has no Minecraft server by that name.",
  amp_unavailable: "AMP did not answer. Check the server in the AMP panel.",
  amp_login_failed: "The control helper could not sign in to AMP.",
  amp_not_configured: "The control helper has no AMP login. The host administrator needs to install it.",
  amp_action_failed: "AMP refused the request. Check the server in the AMP panel.",
  amp_backup_failed: "AMP’s backup failed, so the restart was called off. Nothing was installed.",
  amp_backup_timeout: "AMP’s backup took over 20 minutes, so the restart was called off. Nothing was installed.",
  server_not_allowed: "This website can only control Dev.",
};
