import { mock } from "bun:test";
import { EventEmitter } from "node:events";

/**
 * Global unit-test preload, wired up via `bunfig.toml`'s `[test].preload`.
 * Controllers pull in their whole service (via the barrel/direct imports),
 * and `CampaignService` in turn imports the BullMQ queue wiring
 * (`src/queues/CampaignDispatch.ts` -> `CampaignQueues.ts` -> `redis.ts`),
 * which constructs a real `ioredis` client at module-load time - unrelated
 * to anything a controller/service unit test actually exercises. Mocking
 * `ioredis` here keeps the whole suite from attempting a real TCP
 * connection to Redis just because it imported a module that happens to
 * reference it. Extends `EventEmitter` (not a bare stub) because BullMQ's
 * `RedisConnection` calls `emitter.getMaxListeners()`/`.setMaxListeners()`
 * on the connection during its own construction.
 */
mock.module("ioredis", () => {
    class FakeRedis extends EventEmitter {
        duplicate() { return new FakeRedis(); }
        quit() { return Promise.resolve(); }
        disconnect() { }
    }

    return { default: FakeRedis };
});
