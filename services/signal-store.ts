import { StorageType, SessionRecordType, KeyPairType, Direction } from '@privacyresearch/libsignal-protocol-typescript';
import { createMMKV } from 'react-native-mmkv';
import { Buffer } from 'buffer';

const storage = createMMKV({ id: 'signal-store' });

// Helper to convert ArrayBuffer/Buffer to base64 string for storage
function arrayBufferToBase64(buffer: ArrayBuffer | Buffer): string {
    return Buffer.from(buffer).toString('base64');
}

// Helper to convert base64 string back to Buffer (which is compatible with ArrayBuffer view in libsignal)
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    return Buffer.from(base64, 'base64').buffer;
}

export class MMKVSignalProtocolStore implements StorageType {
    async getIdentityKeyPair(): Promise<KeyPairType | undefined> {
        const keyPairStr = storage.getString('identityKeyPair');
        if (!keyPairStr) return undefined;

        try {
            const parsed = JSON.parse(keyPairStr);
            return {
                pubKey: base64ToArrayBuffer(parsed.pubKey),
                privKey: base64ToArrayBuffer(parsed.privKey)
            };
        } catch (e) {
            console.error('Failed to parse identity key pair', e);
            return undefined;
        }
    }

    async getLocalRegistrationId(): Promise<number | undefined> {
        const id = storage.getNumber('registrationId');
        return id === 0 ? undefined : id;
    }

    // In the library definition: saveIdentity: (encodedAddress: string, publicKey: ArrayBuffer, nonblockingApproval?: boolean) => Promise<boolean>;
    async saveIdentity(identifier: string, identityKey: ArrayBuffer): Promise<boolean> {
        const encodedKey = arrayBufferToBase64(identityKey);
        const existing = storage.getString(`identity_${identifier}`);

        if (existing && existing !== encodedKey) {
            console.warn(`Replacing identity key for ${identifier}`);
            storage.set(`identity_${identifier}`, encodedKey);
            return true;
        }

        storage.set(`identity_${identifier}`, encodedKey);
        return false;
    }

    async isTrustedIdentity(identifier: string, identityKey: ArrayBuffer, _direction: Direction): Promise<boolean> {
        const existing = storage.getString(`identity_${identifier}`);
        if (!existing) {
            return true; // TOFU: Trust On First Use
        }
        return existing === arrayBufferToBase64(identityKey);
    }

    async loadPreKey(keyId: number | string): Promise<KeyPairType | undefined> {
        const key = storage.getString(`preKey_${keyId}`);
        if (!key) return undefined;
        try {
            const parsed = JSON.parse(key);
            return {
                pubKey: base64ToArrayBuffer(parsed.pubKey),
                privKey: base64ToArrayBuffer(parsed.privKey)
            };
        } catch (e) {
            console.error('Failed to parse preKey', e);
            return undefined;
        }
    }

    async storePreKey(keyId: number | string, keyPair: KeyPairType): Promise<void> {
        const serialized = {
            pubKey: arrayBufferToBase64(keyPair.pubKey),
            privKey: arrayBufferToBase64(keyPair.privKey)
        };
        storage.set(`preKey_${keyId}`, JSON.stringify(serialized));
    }

    async removePreKey(keyId: number | string): Promise<void> {
        storage.remove(`preKey_${keyId}`);
    }

    async loadSession(identifier: string): Promise<SessionRecordType | undefined> {
        return storage.getString(`session_${identifier}`);
    }

    async storeSession(identifier: string, record: SessionRecordType): Promise<void> {
        storage.set(`session_${identifier}`, record);
    }

    async loadSignedPreKey(keyId: number | string): Promise<KeyPairType | undefined> {
        const key = storage.getString(`signedPreKey_${keyId}`);
        if (!key) return undefined;
        try {
            const parsed = JSON.parse(key);
            // SignedPreKeyRecord/KeyPairType usually has signature too?
            // The library interface for loadSignedPreKey returns KeyPairType, which is just pubKey/privKey.
            // Wait, SignedPublicPreKeyType has signature. But KeyPairType is just keys.
            // Let's store what we get.
            // If the library expects just KeyPairType, we return that.
            return {
                pubKey: base64ToArrayBuffer(parsed.pubKey),
                privKey: base64ToArrayBuffer(parsed.privKey)
            };
        } catch (e) {
            console.error('Failed to parse signedPreKey', e);
            return undefined;
        }
    }

    async storeSignedPreKey(keyId: number | string, keyPair: KeyPairType): Promise<void> {
        const serialized = {
            pubKey: arrayBufferToBase64(keyPair.pubKey),
            privKey: arrayBufferToBase64(keyPair.privKey)
        };
        storage.set(`signedPreKey_${keyId}`, JSON.stringify(serialized));
    }

    async removeSignedPreKey(keyId: number | string): Promise<void> {
        storage.remove(`signedPreKey_${keyId}`);
    }

    // These are NOT part of the StorageType interface, but might be used by the app logic helper?
    // The previous implementation had them. The library's `SessionBuilder` etc don't call them directly via the interface.
    // We'll keep them but they are not required by the interface.

    async containsSession(identifier: string): Promise<boolean> {
        return storage.contains(`session_${identifier}`);
    }

    async deleteSession(identifier: string): Promise<void> {
        storage.remove(`session_${identifier}`);
    }

    async deleteAllSessions(identifier: string): Promise<void> {
        const keys = storage.getAllKeys();
        keys.forEach(key => {
            if (key.startsWith(`session_${identifier}`)) {
                storage.remove(key);
            }
        });
    }

    // Missing methods from StorageType?
    // putIdentityKeyPair (not in StorageType interface shown in types.d.ts? Wait.)
    // types.d.ts:
    // getIdentityKeyPair
    // getLocalRegistrationId
    // isTrustedIdentity
    // saveIdentity
    // loadPreKey
    // storePreKey
    // removePreKey
    // storeSession
    // loadSession
    // loadSignedPreKey
    // storeSignedPreKey
    // removeSignedPreKey

    // So `putIdentityKeyPair` and `putLocalRegistrationId` are NOT in the interface.
    // They are used by `signal.ts` during setup. So we MUST keep them as public methods of the class.

    async putIdentityKeyPair(identityKeyPair: KeyPairType): Promise<void> {
        const serialized = {
            pubKey: arrayBufferToBase64(identityKeyPair.pubKey),
            privKey: arrayBufferToBase64(identityKeyPair.privKey)
        };
        storage.set('identityKeyPair', JSON.stringify(serialized));
    }

    async putLocalRegistrationId(registrationId: number): Promise<void> {
        storage.set('registrationId', registrationId);
    }

    async clearStore(): Promise<void> {
        storage.clearAll();
    }
}

