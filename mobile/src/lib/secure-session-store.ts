// Security audit finding: the Supabase client used plain AsyncStorage
// for session persistence (auth.storage below, before this change).
// AsyncStorage is NOT encrypted on either platform — on Android it's
// a plain SQLite database under the app's data directory, on iOS a
// set of plain files — so the session it held (a long-lived refresh
// token plus the current access token) was recoverable in cleartext
// by anyone with a rooted/jailbroken device, an unencrypted device
// backup, or a security bug in another part of the app with file
// access. Whoever reads that refresh token can mint new access
// tokens indefinitely and act as the user — this is the single
// highest-value thing to protect on the device, not an incidental
// detail.
//
// expo-secure-store (iOS Keychain / Android Keystore, hardware-backed
// where the device supports it) is the right place for it — but
// SecureStore enforces a hard ~2048-byte per-value limit on Android,
// and a Supabase session (access token + refresh token + the full
// user object, metadata and all) routinely exceeds that. This is
// Supabase's own officially documented pattern for React Native +
// SecureStore (see "Caching the session" in the supabase-js React
// Native guide): generate a random AES-256 key, keep ONLY that small
// key in SecureStore, and store the actual (arbitrarily large)
// session ciphertext in AsyncStorage. AsyncStorage never again holds
// anything useful on its own — without the key, which never leaves
// SecureStore, the ciphertext is just noise.
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import aesjs from "aes-js";

// SecureStore keys are also namespaced with a prefix so a per-session
// encryption key never collides with anything else the app later
// stores there.
const KEY_PREFIX = "sanatix-session-key-";

function toUint8(bytes: Uint8Array): number[] {
  return Array.from(bytes);
}

export class LargeSecureStore {
  private async getOrCreateEncryptionKey(storageKey: string): Promise<Uint8Array> {
    const secureStoreKey = KEY_PREFIX + storageKey;
    const existing = await SecureStore.getItemAsync(secureStoreKey);
    if (existing) {
      return Uint8Array.from(JSON.parse(existing) as number[]);
    }

    const newKey = await Crypto.getRandomBytesAsync(32); // AES-256
    await SecureStore.setItemAsync(secureStoreKey, JSON.stringify(toUint8(newKey)));
    return newKey;
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;

    // One-time migration guard: anyone upgrading from before this fix
    // has a plain-JSON (unencrypted) session sitting under this exact
    // key from the old AsyncStorage-only setup — our own ciphertext is
    // always a hex string, so plain JSON (starts with "{") can never
    // be mistaken for it. Rather than feed old plaintext through AES
    // decryption with a freshly generated key (garbage out, and
    // aes-js can throw on the resulting invalid UTF-8), drop it and
    // report "no session" — the normal, expected effect of this fix
    // is that an already-installed user is signed out once and signs
    // back in, after which everything is encrypted correctly.
    if (!/^[0-9a-f]+$/i.test(encrypted)) {
      await this.removeItem(key);
      return null;
    }

    const encryptionKey = await this.getOrCreateEncryptionKey(key);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(encrypted));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async setItem(key: string, value: string): Promise<void> {
    const encryptionKey = await this.getOrCreateEncryptionKey(key);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await AsyncStorage.setItem(key, aesjs.utils.hex.fromBytes(encryptedBytes));
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(KEY_PREFIX + key);
  }
}
