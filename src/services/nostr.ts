import { SimplePool, verifyEvent, type Event, type Filter, type UnsignedEvent, type EventTemplate } from 'nostr-tools';

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

  /** Set the active signer, either a Nip07 or Nip46 implementation. */
  setSigner(signer: Nip07Signer | Nip46Signer): void {
    this.signer = signer;
  }

  /** Sign and publish an event to all connected relays. */
  async publish(event: UnsignedEvent): Promise<Event> {
    if (!this.signer) {
      throw new Error('no signer configured');
    }
    const { pubkey: _pubkey, ...template } = event;
    const signed = await this.signer.signEvent(template as EventTemplate);
    await Promise.all(this.pool.publish([...this.relays], signed));
    return signed;
  }

  /** Subscribe to a set of filters across all connected relays. */
  subscribe(filters: Filter[], handlers: SubscriptionHandlers): () => void {
    const sub = this.pool.subscribeMany([...this.relays], filters, {
      onevent: handlers.onEvent,
      oneose: handlers.onEose,
      onclose: handlers.onClose,
    });
    return () => sub.close();
  }

  /** Verify the signature of an event. */
  verify(event: Event): boolean {
    return verifyEvent(event);
  }
}

export default NostrService.getInstance();
