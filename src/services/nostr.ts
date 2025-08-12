import {
  SimplePool,
  verifyEvent,
  type Event,
  type Filter,
  type UnsignedEvent,
  type EventTemplate,
} from 'nostr-tools';
import pLimit from 'p-limit';
import debounce from 'lodash.debounce';

/** Minimal signer interface implemented by both NIP-07 and NIP-46 signers. */
interface SignerLike {
  getPublicKey(): Promise<string>;
  signEvent(event: EventTemplate): Promise<Event>;
}

export type Nip07Signer = SignerLike;
export type Nip46Signer = SignerLike;

/** Handlers used when subscribing to relays. */
export interface SubscriptionHandlers {
  onEvent: (event: Event) => void;
  onEose?: () => void;
  onClose?: (reasons: string[]) => void;
}

/**
 * NostrService centralises relay connections and signing logic.
 * It follows a singleton pattern so feature hooks can share a single pool.
 */
class NostrService {
  private static instance: NostrService;

  private pool: SimplePool;
  private relays: Set<string> = new Set();
  private signer?: Nip07Signer | Nip46Signer;

  // Track active queries to avoid duplicate relay calls
  private activeQueries = new Map<string, Promise<Event[]>>();

  // Limit concurrent operations per relay
  private maxConcurrentPerRelay = 2;
  private relayLimiters = new Map<string, ReturnType<typeof pLimit>>();

  private constructor() {
    this.pool = new SimplePool();
  }

  /** Return the singleton instance. */
  static getInstance(): NostrService {
    if (!NostrService.instance) {
      NostrService.instance = new NostrService();
    }
    return NostrService.instance;
  }

  /**
   * Connect to a set of relay URLs. Previous connections not in the new list are closed.
   */
  async connect(relayUrls: string[]): Promise<void> {
    const next = new Set(relayUrls);
    // Close dropped relays
    const toClose = [...this.relays].filter((r) => !next.has(r));
    if (toClose.length > 0) {
      this.pool.close(toClose);
      toClose.forEach((r) => this.relays.delete(r));
    }
    // Ensure new connections
    await Promise.all(
      [...next].map(async (url) => {
        if (!this.relays.has(url)) {
          await this.pool.ensureRelay(url);
          this.relays.add(url);
        }
      })
    );
  }

  /** Set or clear the active signer. */
  setSigner(signer?: Nip07Signer | Nip46Signer): void {
    this.signer = signer;
  }

  /** Expose the underlying SimplePool so other modules can reuse network connections. */
  getPool(): SimplePool {
    return this.pool;
  }

  /** Sign and publish an event to all connected relays. */
  async publish(event: UnsignedEvent): Promise<Event> {
    if (!this.signer) {
      throw new Error('no signer configured');
    }
    const { pubkey: _pubkey, ...template } = event;
    const signed = await this.signer.signEvent(template as EventTemplate);
    await this.runWithRelayLimit([...this.relays], (url) =>
      this.pool.publish([url], signed)[0]
    );
    return signed;
  }

  /**
   * Subscribe to a set of filters across all connected relays.
   * Optionally debounce events for components tolerant to delayed updates.
   */
  async subscribe(
    filters: Filter[],
    handlers: SubscriptionHandlers,
    debounceMs = 0
  ): Promise<() => void> {
    const relayList = [...this.relays];
    const closers: Array<() => void> = [];

    const onevent = this.createDebouncedHandler(handlers.onEvent, debounceMs);

    await this.runWithRelayLimit(relayList, async (url) => {
      const sub = this.pool.subscribeMany([url], filters, {
        onevent,
        oneose: handlers.onEose,
        onclose: handlers.onClose,
      });
      closers.push(() => sub.close());
    });

    return () => closers.forEach((close) => close());
  }

  /**
   * Query events with given filters.
   * Identical concurrent queries reuse the same in-flight Promise.
   */
  async query(filters: Filter[]): Promise<Event[]> {
    const key = JSON.stringify(filters);
    const existing = this.activeQueries.get(key);
    if (existing) return existing;

    const promise = (async () => {
      const results = await Promise.all(
        filters.map((f) => this.pool.querySync([...this.relays], f))
      );
      return results.flat();
    })();

    this.activeQueries.set(key, promise);
    try {
      return await promise;
    } finally {
      this.activeQueries.delete(key);
    }
  }

  /** Verify the signature of an event. */
  verify(event: Event): boolean {
    return verifyEvent(event);
  }

  private getLimiter(url: string) {
    let limiter = this.relayLimiters.get(url);
    if (!limiter) {
      limiter = pLimit(this.maxConcurrentPerRelay);
      this.relayLimiters.set(url, limiter);
    }
    return limiter;
  }

  private runWithRelayLimit<T>(
    urls: string[],
    task: (url: string) => Promise<T>
  ): Promise<T[]> {
    return Promise.all(
      urls.map((url) => this.getLimiter(url)(() => task(url)))
    );
  }

  private createDebouncedHandler(
    handler: (event: Event) => void,
    ms: number
  ): (event: Event) => void {
    if (ms <= 0) return handler;
    const buffer: Event[] = [];
    const flush = debounce(() => {
      buffer.splice(0).forEach((e) => handler(e));
    }, ms);
    return (event: Event) => {
      buffer.push(event);
      flush();
    };
  }
}

export default NostrService.getInstance();
