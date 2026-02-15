import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';

const KEY_ALIAS = 'vyry_realm_key_v1';

/**
 * Retrieves or generates a 64-byte encryption key for Realm.
 * stored securely in the device's Keychain/Keystore.
 */
export async function getRealmEncryptionKey(): Promise<ArrayBuffer> {
    try {
        // 1. Check if key exists
        const existingKeyBase64 = await SecureStore.getItemAsync(KEY_ALIAS);

        if (existingKeyBase64) {
            // Convert base64 string back to ArrayBuffer
            return base64ToArrayBuffer(existingKeyBase64);
        }

        // 2. Generate new key if not found
        console.log('[SecureKeys] Generating new Realm encryption key...');
        const key = new Uint8Array(64);
        crypto.getRandomValues(key);

        // 3. Store key
        const base64Key = arrayBufferToBase64(key);
        await SecureStore.setItemAsync(KEY_ALIAS, base64Key);

        return key.buffer;
    } catch (error) {
        console.error('[SecureKeys] Failed to manage Realm key:', error);
        throw new Error('Failed to load or generate secure database key');
    }
}

// -- Helpers --

function arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}
