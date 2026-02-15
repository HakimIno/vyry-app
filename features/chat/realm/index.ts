import Realm from 'realm';
import { getRealmEncryptionKey } from '@/features/storage/secure-keys';
import { Message, Conversation } from './schema';

let realmInstance: Realm | null = null;
let initPromise: Promise<Realm> | null = null;

export const RealmManager = {
    /**
     * Initialize the Realm database with encryption.
     * Should be called at app startup.
     */
    init: async (): Promise<Realm> => {
        if (realmInstance) return realmInstance;
        if (initPromise) return initPromise;

        initPromise = (async () => {
            try {
                const encryptionKey = await getRealmEncryptionKey();

                console.log('[Realm] Opening encrypted database...');
                realmInstance = await Realm.open({
                    path: 'vyry_chat.realm',
                    schema: [Message, Conversation],
                    schemaVersion: 1,
                    encryptionKey: encryptionKey,
                    // Migration logic would go here
                });

                console.log('[Realm] Database opened successfully');
                return realmInstance;
            } catch (error) {
                console.error('[Realm] Failed to open database:', error);
                throw error;
            }
        })();

        return initPromise;
    },

    /**
     * Get the open Realm instance.
     * Throws if not initialized.
     */
    get: (): Realm => {
        if (!realmInstance) {
            throw new Error('Realm not initialized. Call init() first.');
        }
        return realmInstance;
    },

    /**
     * Close the Realm instance.
     */
    close: () => {
        if (realmInstance) {
            realmInstance.close();
            realmInstance = null;
            initPromise = null;
        }
    }
};
