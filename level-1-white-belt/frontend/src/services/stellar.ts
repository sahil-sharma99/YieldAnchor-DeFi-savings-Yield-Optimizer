export const STELLAR_NETWORK = 'TESTNET';
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';

export async function fetchXlmBalance(publicKey: string) {
  // TODO: load account through Stellar SDK and return native balance.
  return { publicKey, balance: '0.0000000' };
}
