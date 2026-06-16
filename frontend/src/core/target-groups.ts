export const targetGroupStorageKey = "maple.targetGroups.v1";

export interface TargetGroup {
  id: string;
  name: string;
  targets: string;
}

export function loadTargetGroups(storage: Storage): TargetGroup[] {
  const value = storage.getItem(targetGroupStorageKey);
  if (value === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isTargetGroup) : [];
  } catch {
    return [];
  }
}

export function saveTargetGroups(storage: Storage, groups: readonly TargetGroup[]): void {
  storage.setItem(targetGroupStorageKey, JSON.stringify(groups));
}

export function addTargetGroup(
  storage: Storage,
  groups: readonly TargetGroup[],
  group: TargetGroup,
): TargetGroup[] {
  const next = [
    group,
    ...groups.filter((candidate) => candidate.id !== group.id && candidate.name !== group.name),
  ];
  saveTargetGroups(storage, next);
  return next;
}

export function deleteTargetGroup(
  storage: Storage,
  groups: readonly TargetGroup[],
  id: string,
): TargetGroup[] {
  const next = groups.filter((candidate) => candidate.id !== id);
  saveTargetGroups(storage, next);
  return next;
}

export function makeTargetGroupID(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isTargetGroup(value: unknown): value is TargetGroup {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.targets === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
