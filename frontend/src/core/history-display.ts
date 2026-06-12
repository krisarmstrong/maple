import type { ScanHistoryRecord } from "../services/history-service";

export function historyLabel(record: ScanHistoryRecord): string {
  const targetLabel = `${record.targetCount} ${record.targetCount === 1 ? "target" : "targets"}`;
  const exitLabel = `exit ${record.exitCode}`;
  const detailLabel = [targetLabel, targetList(record), elapsedLabel(record)].filter(Boolean);
  if (record.hostCount === 0) {
    return [...detailLabel, exitLabel].join(", ");
  }
  const portLabel = record.openPortCount === 0 ? "" : `${record.openPortCount} open ports`;
  return [...detailLabel, `${record.hostsUp}/${record.hostCount} hosts up`, portLabel, exitLabel]
    .filter(Boolean)
    .join(", ");
}

function targetList(record: ScanHistoryRecord): string {
  return record.targets.map((target) => target.value).join(", ");
}

function elapsedLabel(record: ScanHistoryRecord): string {
  return record.elapsedTime === undefined || record.elapsedTime === ""
    ? ""
    : `${record.elapsedTime}s`;
}
