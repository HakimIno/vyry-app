import 'react-native-get-random-values';
import { Buffer } from 'buffer';

global.Buffer = Buffer;

// Manual UTF-16LE polyfill for Signal Protocol
// react-native-quick-crypto provides TextEncoder/TextDecoder but doesn't support UTF-16LE
// We need to add UTF-16LE support manually

const OriginalTextDecoder = global.TextDecoder;

// @ts-ignore
global.TextDecoder = class TextDecoder {
    encoding: string;

    constructor(encoding = 'utf-8') {
        this.encoding = encoding.toLowerCase().replace(/[_-]/g, '');
    }

    decode(input?: BufferSource): string {
        if (!input) return '';

        const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);

        // Handle UTF-16LE
        if (this.encoding === 'utf16le') {
            const uint16Array = new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
            return String.fromCharCode(...Array.from(uint16Array));
        }

        // Fallback to original TextDecoder for other encodings
        if (OriginalTextDecoder) {
            const decoder = new OriginalTextDecoder(this.encoding);
            return decoder.decode(bytes);
        }

        // UTF-8 fallback
        return Buffer.from(bytes).toString('utf8');
    }
};

console.log('[Polyfills] TextEncoder/TextDecoder with UTF-16LE support polyfilled successfully');

// WebCrypto for Signal Protocol using react-native-quick-crypto
import { install } from 'react-native-quick-crypto';
install();

console.log('[Polyfills] WebCrypto polyfilled successfully');
