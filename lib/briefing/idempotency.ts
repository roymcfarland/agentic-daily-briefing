import { getIdempotencyEnv } from "@/lib/env";
import { getChicagoDateKey } from "@/lib/time";

const RECORD_VERSION = 1;
const KEY_PREFIX = "morning-brief";

interface PendingSendRecord {
  version: typeof RECORD_VERSION;
  status: "pending";
  idempotencyKey: string;
  dateKey: string;
  startedAt: string;
}

export interface SentBriefingRecord {
  version: typeof RECORD_VERSION;
  status: "sent";
  idempotencyKey: string;
  dateKey: string;
  sentAt: string;
  emailId: string | null;
  dateLabel: string;
  stories: number;
}

type BriefingSendRecord = PendingSendRecord | SentBriefingRecord;

interface BriefingSendCompleteInput {
  emailId: string | null;
  dateLabel: string;
  stories: number;
}

interface IdempotencyStore {
  get(key: string): Promise<BriefingSendRecord | null>;
  setIfAbsent(key: string, value: BriefingSendRecord, ttlSeconds: number): Promise<boolean>;
  set(key: string, value: BriefingSendRecord, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export type BriefingSendLock =
  | {
      status: "acquired";
      idempotencyKey: string;
      complete(input: BriefingSendCompleteInput): Promise<SentBriefingRecord>;
      release(): Promise<void>;
    }
  | {
      status: "already_sent";
      idempotencyKey: string;
      record: SentBriefingRecord;
    }
  | {
      status: "in_progress";
      idempotencyKey: string;
    };

interface RedisCommandResponse {
  result?: unknown;
  error?: string;
}

class RedisRestIdempotencyStore implements IdempotencyStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  async get(key: string): Promise<BriefingSendRecord | null> {
    const value = await this.command<string | null>(["GET", key]);
    return parseBriefingSendRecord(value);
  }

  async setIfAbsent(key: string, value: BriefingSendRecord, ttlSeconds: number): Promise<boolean> {
    const result = await this.command<string | null>([
      "SET",
      key,
      JSON.stringify(value),
      "NX",
      "EX",
      ttlSeconds,
    ]);

    return result === "OK";
  }

  async set(key: string, value: BriefingSendRecord, ttlSeconds: number): Promise<void> {
    await this.command(["SET", key, JSON.stringify(value), "EX", ttlSeconds]);
  }

  async delete(key: string): Promise<void> {
    await this.command(["DEL", key]);
  }

  private async command<T>(command: unknown[]): Promise<T> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Idempotency store command failed with ${response.status}`);
    }

    let payload: RedisCommandResponse;
    try {
      payload = (await response.json()) as RedisCommandResponse;
    } catch {
      throw new Error("Idempotency store returned malformed JSON");
    }

    if (payload.error) {
      throw new Error(`Idempotency store command failed: ${payload.error}`);
    }

    return payload.result as T;
  }
}

class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Map<string, { expiresAt: number; value: BriefingSendRecord }>();

  async get(key: string): Promise<BriefingSendRecord | null> {
    this.prune(key);
    return this.records.get(key)?.value ?? null;
  }

  async setIfAbsent(key: string, value: BriefingSendRecord, ttlSeconds: number): Promise<boolean> {
    this.prune(key);
    if (this.records.has(key)) {
      return false;
    }

    this.setRecord(key, value, ttlSeconds);
    return true;
  }

  async set(key: string, value: BriefingSendRecord, ttlSeconds: number): Promise<void> {
    this.setRecord(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    this.records.delete(key);
  }

  private setRecord(key: string, value: BriefingSendRecord, ttlSeconds: number) {
    this.records.set(key, {
      expiresAt: Date.now() + ttlSeconds * 1000,
      value,
    });
  }

  private prune(key: string) {
    const record = this.records.get(key);
    if (record && record.expiresAt <= Date.now()) {
      this.records.delete(key);
    }
  }
}

let memoryStore: MemoryIdempotencyStore | null = null;

export function getBriefingIdempotencyKey(now: Date): string {
  return `${KEY_PREFIX}:${getChicagoDateKey(now)}`;
}

function getIdempotencyStore(): {
  store: IdempotencyStore;
  sentTtlSeconds: number;
  lockTtlSeconds: number;
} {
  try {
    const env = getIdempotencyEnv();
    return {
      store: new RedisRestIdempotencyStore(env.redisRestUrl, env.redisRestToken),
      sentTtlSeconds: env.sentTtlSeconds,
      lockTtlSeconds: env.lockTtlSeconds,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    memoryStore ??= new MemoryIdempotencyStore();
    return {
      store: memoryStore,
      sentTtlSeconds: 60 * 60 * 36,
      lockTtlSeconds: 60 * 30,
    };
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBaseRecord(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) {
    return false;
  }

  return (
    value.version === RECORD_VERSION &&
    typeof value.idempotencyKey === "string" &&
    typeof value.dateKey === "string"
  );
}

function isSentRecord(value: unknown): value is SentBriefingRecord {
  return (
    isBaseRecord(value) &&
    value.status === "sent" &&
    typeof value.sentAt === "string" &&
    (typeof value.emailId === "string" || value.emailId === null) &&
    typeof value.dateLabel === "string" &&
    typeof value.stories === "number"
  );
}

function isPendingRecord(value: unknown): value is PendingSendRecord {
  return (
    isBaseRecord(value) &&
    value.status === "pending" &&
    typeof value.startedAt === "string"
  );
}

function parseBriefingSendRecord(value: unknown): BriefingSendRecord | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isObject(parsed)) {
      return null;
    }

    if (isSentRecord(parsed) || isPendingRecord(parsed)) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

function classifyExistingRecord(
  idempotencyKey: string,
  record: BriefingSendRecord | null,
): BriefingSendLock | null {
  if (!record) {
    return null;
  }

  if (record.status === "sent") {
    return {
      status: "already_sent",
      idempotencyKey,
      record,
    };
  }

  return {
    status: "in_progress",
    idempotencyKey,
  };
}

export async function beginBriefingSend(now: Date): Promise<BriefingSendLock> {
  const idempotencyKey = getBriefingIdempotencyKey(now);
  const dateKey = getChicagoDateKey(now);
  const { store, sentTtlSeconds, lockTtlSeconds } = getIdempotencyStore();

  const existing = classifyExistingRecord(idempotencyKey, await store.get(idempotencyKey));
  if (existing) {
    return existing;
  }

  const pending: PendingSendRecord = {
    version: RECORD_VERSION,
    status: "pending",
    idempotencyKey,
    dateKey,
    startedAt: new Date().toISOString(),
  };

  const acquired = await store.setIfAbsent(idempotencyKey, pending, lockTtlSeconds);
  if (!acquired) {
    return classifyExistingRecord(idempotencyKey, await store.get(idempotencyKey)) ?? {
      status: "in_progress",
      idempotencyKey,
    };
  }

  return {
    status: "acquired",
    idempotencyKey,
    complete: async (input) => {
      const record: SentBriefingRecord = {
        version: RECORD_VERSION,
        status: "sent",
        idempotencyKey,
        dateKey,
        sentAt: new Date().toISOString(),
        emailId: input.emailId,
        dateLabel: input.dateLabel,
        stories: input.stories,
      };

      await store.set(idempotencyKey, record, sentTtlSeconds);
      return record;
    },
    release: () => store.delete(idempotencyKey),
  };
}
