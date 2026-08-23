import { hash, verify } from "@node-rs/bcrypt";

/** Cost factor for bcrypt's hashing algorithm - higher is slower but more resistant to brute-forcing. */
const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password for storage. Never store `password` itself -
 * only ever persist the result of this function.
 *
 * Uses the native `@node-rs/bcrypt` binding (Rust/napi-rs) instead of a
 * pure-JS implementation: it runs off the main thread on libuv's threadpool
 * instead of blocking the event loop, and it's the standard bcrypt hash
 * format so existing stored hashes remain valid.
 *
 * @param password - The plaintext password to hash.
 * @returns The bcrypt hash, safe to store in `user.password_hash`.
 */
export async function hashPassword(password: string): Promise<string> {
    return hash(password, SALT_ROUNDS);
}

/**
 * Checks a plaintext password against a stored bcrypt hash.
 *
 * @param password - The plaintext password supplied by the caller (e.g. at signin).
 * @param hash - The bcrypt hash previously produced by {@link hashPassword}.
 * @returns `true` if the password matches the hash, `false` otherwise.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return verify(password, hash);
}
