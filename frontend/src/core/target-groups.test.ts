import { describe, expect, it } from "vitest";
import {
  addTargetGroup,
  deleteTargetGroup,
  loadTargetGroups,
  makeTargetGroupID,
  saveTargetGroups,
  targetGroupStorageKey,
} from "./target-groups";

describe("target-groups", () => {
  it("returns an empty list when storage is empty", () => {
    expect(loadTargetGroups(storageWith(null))).toEqual([]);
  });

  it("loads saved groups from storage", () => {
    const storage = storageWith(
      JSON.stringify([{ id: "lab-hosts", name: "Lab hosts", targets: "192.168.1.1\n192.168.1.2" }]),
    );

    const groups = loadTargetGroups(storage);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.name).toBe("Lab hosts");
    expect(groups[0]?.targets).toBe("192.168.1.1\n192.168.1.2");
  });

  it("ignores malformed JSON in storage", () => {
    expect(loadTargetGroups(storageWith("{bad json"))).toEqual([]);
  });

  it("ignores items that fail the type guard", () => {
    expect(
      loadTargetGroups(storageWith(JSON.stringify([{ id: 42, name: "oops", targets: "" }]))),
    ).toEqual([]);
    expect(
      loadTargetGroups(storageWith(JSON.stringify([{ id: "ok", name: null, targets: "" }]))),
    ).toEqual([]);
    expect(loadTargetGroups(storageWith(JSON.stringify([{ id: "ok", name: "ok" }])))).toEqual([]);
  });

  it("ignores a non-array stored value", () => {
    expect(loadTargetGroups(storageWith(JSON.stringify({ id: "lab" })))).toEqual([]);
  });

  it("saves groups to storage", () => {
    const storage = storageWith(null);
    const group = { id: "corp-web", name: "Corp web", targets: "10.0.0.1\n10.0.0.2" };
    saveTargetGroups(storage, [group]);
    expect(storage.getItem(targetGroupStorageKey)).toContain("Corp web");
  });

  it("adds a new group at the front", () => {
    const storage = storageWith(
      JSON.stringify([{ id: "lab-hosts", name: "Lab hosts", targets: "192.168.1.1" }]),
    );
    const existing = loadTargetGroups(storage);
    const next = addTargetGroup(storage, existing, {
      id: "corp-web",
      name: "Corp web",
      targets: "10.0.0.1",
    });

    expect(next).toHaveLength(2);
    expect(next[0]?.name).toBe("Corp web");
    expect(next[1]?.name).toBe("Lab hosts");
    expect(storage.getItem(targetGroupStorageKey)).toContain("Corp web");
  });

  it("replaces an existing group with the same id", () => {
    const existing = [{ id: "lab", name: "Lab", targets: "192.168.1.1" }];
    const storage = storageWith(JSON.stringify(existing));
    const next = addTargetGroup(storage, existing, {
      id: "lab",
      name: "Lab",
      targets: "192.168.1.100",
    });

    expect(next).toHaveLength(1);
    expect(next[0]?.targets).toBe("192.168.1.100");
  });

  it("replaces an existing group with the same name", () => {
    const existing = [{ id: "lab-v1", name: "Lab hosts", targets: "192.168.1.1" }];
    const storage = storageWith(JSON.stringify(existing));
    const next = addTargetGroup(storage, existing, {
      id: "lab-v2",
      name: "Lab hosts",
      targets: "10.0.0.1",
    });

    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe("lab-v2");
  });

  it("deletes a group by id", () => {
    const existing = [
      { id: "lab", name: "Lab", targets: "192.168.1.1" },
      { id: "corp", name: "Corp", targets: "10.0.0.1" },
    ];
    const storage = storageWith(JSON.stringify(existing));
    const next = deleteTargetGroup(storage, existing, "lab");

    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe("corp");
    expect(storage.getItem(targetGroupStorageKey)).not.toContain("Lab");
  });

  it("returns unchanged list when deleting a non-existent id", () => {
    const existing = [{ id: "lab", name: "Lab", targets: "192.168.1.1" }];
    const storage = storageWith(JSON.stringify(existing));
    const next = deleteTargetGroup(storage, existing, "does-not-exist");

    expect(next).toHaveLength(1);
  });

  it("builds stable ids from names", () => {
    expect(makeTargetGroupID(" Lab / Web Hosts ")).toBe("lab-web-hosts");
    expect(makeTargetGroupID("Corp (DMZ)")).toBe("corp-dmz");
    expect(makeTargetGroupID("  ")).toBe("");
  });
});

function storageWith(initial: string | null): Storage {
  let value = initial;
  return {
    get length() {
      return value === null ? 0 : 1;
    },
    clear: () => {
      value = null;
    },
    getItem: () => value,
    key: () => targetGroupStorageKey,
    removeItem: () => {
      value = null;
    },
    setItem: (_key: string, nextValue: string) => {
      value = nextValue;
    },
  };
}
