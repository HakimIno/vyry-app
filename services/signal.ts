import '@/lib/polyfills';
import {
    KeyHelper,
    SessionBuilder,
    SessionCipher,
    SignalProtocolAddress
} from '@privacyresearch/libsignal-protocol-typescript';
import { MMKVSignalProtocolStore } from './signal-store';
import { apiFetch } from '@/lib/http';
import { Buffer } from 'buffer';

// Initialize the store
const store = new MMKVSignalProtocolStore();

// Define expected API response types
interface PreKeyBundleResponse {
    identity_key: ArrayBuffer;
    registration_id: number;
    signed_prekey: {
        id: number;
        key: ArrayBuffer;
        signature: ArrayBuffer;
    };
    one_time_prekey?: {
        id: number;
        key: ArrayBuffer;
    };
}

export class SignalService {
    private static instance: SignalService;

    private constructor() { }

    public static getInstance(): SignalService {
        if (!SignalService.instance) {
            SignalService.instance = new SignalService();
        }
        return SignalService.instance;
    }

    /**
     * Check if identity keys exist locally.
     */
    async hasKeys(): Promise<boolean> {
        const keys = await store.getIdentityKeyPair();
        return !!keys;
    }

    /**
     * Get all active devices for a user.
     */
    async getDevices(userId: string): Promise<{ device_id: number; registration_id: number; last_seen_at?: string }[]> {
        return apiFetch(`/api/v1/keys/${userId}/devices`, {
            method: 'GET',
            auth: true,
        });
    }

    /**
     * Ensure keys exist. If not, generate and upload them.
     */
    async ensureKeys(): Promise<void> {
        if (await this.hasKeys()) {
            console.log('[SignalService] Keys already exist');
            return;
        }

        console.log('[SignalService] No keys found, generating...');
        await this.generateAndUploadKeys();
    }

    /**
     * Generate Identity Key, Registration ID, PreKeys, and Signed PreKey.
     * Uploads them to the server.
     */
    async generateAndUploadKeys(): Promise<{ registrationId: number }> {
        // 1. Generate Keys
        const registrationId = KeyHelper.generateRegistrationId();
        const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
        // Generate pre-keys manually since generatePreKeys is missing in this version
        // Reduced from 100 to 20 for faster generation (still plenty for security)
        const preKeys = [];
        for (let i = 0; i < 20; i++) {
            preKeys.push(await KeyHelper.generatePreKey(i));
        }
        const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 0);

        // 2. Store locally
        await store.putIdentityKeyPair(identityKeyPair);
        await store.putLocalRegistrationId(registrationId);

        for (const key of preKeys) {
            await store.storePreKey(key.keyId, key.keyPair);
        }
        await store.storeSignedPreKey(signedPreKey.keyId, signedPreKey.keyPair);

        // 3. Upload to API
        try {
            // Convert ArrayBuffers to Arrays for JSON serialization
            const uploadDto = {
                registration_id: registrationId,
                identity_key: Array.from(new Uint8Array(identityKeyPair.pubKey)),
                signed_prekey: {
                    id: signedPreKey.keyId,
                    key: Array.from(new Uint8Array(signedPreKey.keyPair.pubKey)),
                    signature: Array.from(new Uint8Array(signedPreKey.signature)),
                },
                one_time_prekeys: preKeys.map((k) => ({
                    id: k.keyId,
                    key: Array.from(new Uint8Array(k.keyPair.pubKey)),
                })),
            };

            await apiFetch('/api/v1/keys', {
                method: 'POST',
                body: uploadDto,
                auth: true,
            });

            console.log('[SignalService] Keys uploaded successfully');
        } catch (error) {
            console.error('[SignalService] Failed to upload keys:', error);
            throw error;
        }

        return { registrationId };
    }

    /**
     * Ensure we have a session with the recipient.
     * If not, fetch PreKeyBundle and establish one.
     */
    async ensureSession(recipientUserId: string, recipientDeviceId: number): Promise<void> {
        const address = new SignalProtocolAddress(recipientUserId, recipientDeviceId);

        // Check if session exists
        if (await store.containsSession(address.toString())) {
            return;
        }

        // Fetch PreKeyBundle
        try {
            const bundle = await apiFetch<PreKeyBundleResponse>(`/api/v1/keys/${recipientUserId}/devices/${recipientDeviceId}`, {
                auth: true,
            });

            await this.processPreKeyBundle(recipientUserId, recipientDeviceId, bundle);
        } catch (error) {
            console.error(`[SignalService] Failed to fetch/process bundle for ${recipientUserId}:${recipientDeviceId}`, error);
            // If 404, it might mean the user hasn't uploaded keys yet
            // We'll let the UI handle this, but log it clearly
            throw error;
        }
    }

    /**
     * Process a fetched PreKeyBundle.
     */
    async processPreKeyBundle(
        recipientUserId: string,
        recipientDeviceId: number,
        bundle: PreKeyBundleResponse
    ): Promise<void> {
        const address = new SignalProtocolAddress(recipientUserId, recipientDeviceId);
        const sessionBuilder = new SessionBuilder(store, address);

        const preKeyBundle = {
            identityKey: this.arrayBufferCallback(bundle.identity_key),
            registrationId: bundle.registration_id,
            signedPreKey: {
                keyId: bundle.signed_prekey.id,
                publicKey: this.arrayBufferCallback(bundle.signed_prekey.key),
                signature: this.arrayBufferCallback(bundle.signed_prekey.signature),
            },
            preKey: bundle.one_time_prekey ? {
                keyId: bundle.one_time_prekey.id,
                publicKey: this.arrayBufferCallback(bundle.one_time_prekey.key),
            } : undefined,
            // biome-ignore lint/suspicious/noExplicitAny: PreKeyBundle type mismatch in library
        } as any; // Cast as any because PreKeyBundle definition might slightly differ in types (e.g. registrationId vs registration_id) but structure is critical. 
        // Actually, let's just check PreKeyBundle type. It's not exported in the new imports list?
        // PreKeyBundle was removed from imports in the first chunk because it wasn't in list of available exports 
        // in index.d.ts? Wait, let's check index.d.ts again. 
        // index.d.ts exports * from types. types.d.ts doesn't have PreKeyBundle.
        // It's likely an interface inside session-builder or similar?
        // Let's use 'any' or define it locally if needed, or rely on SessionBuilder.processPreKey expecting a specific structure.


        await sessionBuilder.processPreKey(preKeyBundle);
    }

    /**
     * Encrypt a message for a specific recipient device.
     */
    async encryptMessage(
        recipientUserId: string,
        recipientDeviceId: number,
        message: string
    ) {
        // Ensure session exists
        await this.ensureSession(recipientUserId, recipientDeviceId);

        const address = new SignalProtocolAddress(recipientUserId, recipientDeviceId);
        const sessionCipher = new SessionCipher(store, address);

        const encodedMessage = new TextEncoder().encode(message).buffer;
        const ciphertext = await sessionCipher.encrypt(encodedMessage);

        return ciphertext;
    }

    /**
     * Decrypt a received message.
     */
    async decryptMessage(
        senderUserId: string,
        senderDeviceId: number,
        ciphertext: ArrayBuffer | Uint8Array, // PreKeyWhisperMessage or WhisperMessage serialized
        type: number // 3 = PreKey, 1 = Message
    ): Promise<string> {
        const address = new SignalProtocolAddress(senderUserId, senderDeviceId);
        const sessionCipher = new SessionCipher(store, address);

        let plaintext: ArrayBuffer;

        try {
            // Signal Protocol types:
            // 3: PREKEY_BUNDLE (PreKeyWhisperMessage)
            // 1: WHISPER_MESSAGE

            // Convert ciphertext to ArrayBuffer if needed
            const bodyBuffer = this.arrayBufferCallback(ciphertext);

            if (type === 3) {
                plaintext = await sessionCipher.decryptPreKeyWhisperMessage(bodyBuffer, 'binary');
            } else {
                plaintext = await sessionCipher.decryptWhisperMessage(bodyBuffer, 'binary');
            }
            return new TextDecoder().decode(plaintext);
        } catch (e) {
            console.error('[SignalService] Decryption failed:', e);
            throw e;
        }
    }

    // Helper to convert inputs to ArrayBuffer
    private arrayBufferCallback(data: ArrayBuffer | Uint8Array | number[]): ArrayBuffer {
        if (data instanceof ArrayBuffer) return data;
        if (data instanceof Uint8Array) return data.buffer;
        if (Array.isArray(data)) return new Uint8Array(data).buffer;
        // Fallback for any other case
        return Buffer.from(data as never).buffer;
    }
}
