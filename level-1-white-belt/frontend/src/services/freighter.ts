export type WalletState = 'idle' | 'connecting' | 'connected' | 'rejected' | 'not_found';

export async function connectFreighter() {
  // TODO: wire @stellar/freighter-api for Testnet account access.
  return { publicKey: '', state: 'idle' as WalletState };
}
