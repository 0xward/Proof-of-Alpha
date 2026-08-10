/**
 * In-memory Firestore shim for local GoodAgent integration testing.
 * Enable with USE_MEMORY_DB=1 when Firebase credentials are not available.
 */

type DocData = Record<string, unknown>;

const store = new Map<string, DocData>();

function docPath(collection: string, id: string): string {
  return `${collection}/${id}`;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function applyFieldValue(data: DocData, patch: DocData): DocData {
  const next = { ...data };
  for (const [key, val] of Object.entries(patch)) {
    if (val && typeof val === "object" && "__op" in (val as object)) {
      const op = val as { __op: string; value?: unknown; values?: unknown[] };
      if (op.__op === "arrayUnion") {
        const cur = Array.isArray(next[key]) ? (next[key] as unknown[]) : [];
        const add = Array.isArray(op.values) ? op.values : [];
        next[key] = [...cur, ...add];
      } else if (op.__op === "increment") {
        const cur = Number(next[key] ?? 0);
        next[key] = cur + Number(op.value ?? 0);
      }
    } else {
      next[key] = val;
    }
  }
  return next;
}

export const MemoryTimestamp = {
  now(): { _seconds: number; _nanoseconds: number } {
    const ms = Date.now();
    return { _seconds: Math.floor(ms / 1000), _nanoseconds: 0 };
  },
};

export const MemoryFieldValue = {
  arrayUnion(...values: unknown[]): { __op: "arrayUnion"; values: unknown[] } {
    return { __op: "arrayUnion", values };
  },
  increment(n: number): { __op: "increment"; value: number } {
    return { __op: "increment", value: n };
  },
};

class MemoryDocRef {
  constructor(
    private collection: string,
    private id: string,
  ) {}

  async get(): Promise<{ exists: boolean; data: () => DocData | undefined; ref: MemoryDocRef }> {
    const data = store.get(docPath(this.collection, this.id));
    return {
      exists: data !== undefined,
      data: () => (data ? clone(data) : undefined),
      ref: this,
    };
  }

  async set(data: DocData, opts?: { merge?: boolean }): Promise<void> {
    const path = docPath(this.collection, this.id);
    const hasFieldOps = Object.values(data).some(
      (v) => v && typeof v === "object" && "__op" in (v as object),
    );
    if (opts?.merge || hasFieldOps) {
      const cur = store.has(path) ? store.get(path)! : {};
      store.set(path, applyFieldValue(cur, data));
    } else {
      store.set(path, clone(data));
    }
  }

  async update(data: DocData): Promise<void> {
    const path = docPath(this.collection, this.id);
    const cur = store.get(path) ?? {};
    store.set(path, applyFieldValue(cur, data));
  }

  collection(id: string): MemoryCollectionRef {
    return new MemoryCollectionRef(`${this.collection}/${this.id}/${id}`);
  }
}

class MemoryCollectionRef {
  constructor(private path: string) {}

  doc(id: string): MemoryDocRef {
    return new MemoryDocRef(this.path, id);
  }
}

class MemoryBatch {
  private ops: Array<() => void> = [];

  update(ref: MemoryDocRef, data: DocData): void {
    this.ops.push(() => void ref.update(data));
  }

  set(ref: MemoryDocRef, data: DocData, opts?: { merge?: boolean }): void {
    this.ops.push(() => void ref.set(data, opts));
  }

  async commit(): Promise<void> {
    for (const op of this.ops) op();
  }
}

export const memoryDb = {
  collection(name: string): MemoryCollectionRef {
    return new MemoryCollectionRef(name);
  },
  batch(): MemoryBatch {
    return new MemoryBatch();
  },
};
