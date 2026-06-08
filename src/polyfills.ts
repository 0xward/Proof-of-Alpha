/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Buffer is required for many web3 libraries.
// vite-plugin-node-polyfills provides it, but we assign it to window 
// for immediate availability in some dependency initialization paths.
import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  // Fix for environment injected fetch that has only a getter
  try {
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch') || Object.getOwnPropertyDescriptor(Window.prototype, 'fetch');
    if (desc && desc.get && !desc.set && desc.configurable) {
      let currentVal = desc.get.call(window);
      Object.defineProperty(window, 'fetch', {
        get: () => currentVal,
        set: (v) => { currentVal = v; },
        configurable: true,
        enumerable: desc.enumerable
      });
    }
  } catch (err) {}

  // Buffer is strictly required for Web3 encryption/decryption
  (window as any).Buffer = Buffer;
}
