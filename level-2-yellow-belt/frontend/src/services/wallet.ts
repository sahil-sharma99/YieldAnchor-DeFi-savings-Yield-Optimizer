export type WalletError = 'WalletNotFound' | 'WalletConnectionRejected' | 'InsufficientBalance';

export function describeWalletError(error: WalletError) {
  return error;
}
