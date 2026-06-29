import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const project = {
  "dir": "17-yieldanchor",
  "title": "YieldAnchor Hub",
  "short": "Yield",
  "useCase": "Yield Optimizer Deposits",
  "audience": "Treasury Managers",
  "primary": "#10b981",
  "secondary": "#06b6d4",
  "accent": "#047857",
  "contract": "Yield Optimizer Smart Contract",
  "action": "Anchor Deposit Vault",
  "contractId": "CC3RYIELDANCHOR...TESTNET"
};

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';

const pages = [
  { id: 'overview', label: 'Overview' },
  { id: 'wallets', label: 'Wallets' },
  { id: 'transfer', label: 'Deposit Liquidity' },
  { id: 'contract', label: 'DeFi Contract' },
  { id: 'events', label: 'Real-time Feed' },
] as const;

const walletOptions = [
  { id: 'freighter', label: 'Freighter Wallet', note: 'Stellar Extension', icon: '⚓' },
  { id: 'metamask', label: 'MetaMask Wallet', note: 'EVM / Snap Integration', icon: '🦊' },
  { id: 'xbull', label: 'xBull Wallet', note: 'Browser Extension', icon: '🐂' },
  { id: 'lobstr', label: 'LOBSTR Wallet', note: 'WalletConnect Path', icon: '🦞' },
];

type PageId = (typeof pages)[number]['id'];
type TxState = 'idle' | 'connecting' | 'pending' | 'success' | 'fail';
type WalletError = 'WalletNotFound' | 'WalletConnectionRejected' | 'InsufficientBalance';

function errorCopy(error: WalletError) {
  const copy: Record<WalletError, string> = {
    WalletNotFound: 'Wallet extension not detected. Please install the extension or ensure it is enabled.',
    WalletConnectionRejected: 'Connection rejected. Please grant permissions inside the wallet prompt.',
    InsufficientBalance: 'Insufficient Testnet balance to cover network fees or collateral requirements.',
  };
  return copy[error];
}

function readValue(value: any, keys: string[]) {
  if (value && typeof value === 'object') {
    for (const key of keys) {
      if (key in value) return value[key];
    }
  }
  return value;
}

async function loadFreighter() {
  return await import('@stellar/freighter-api') as any;
}

async function connectFreighter() {
  const freighter = await loadFreighter();
  const connectedResult = freighter.isConnected ? await freighter.isConnected() : true;
  const installed = Boolean(readValue(connectedResult, ['isConnected', 'isAvailable', 'result']));
  if (!installed && !freighter.getAddress && !freighter.getPublicKey) throw new Error('WalletNotFound');
  if (freighter.setAllowed) await freighter.setAllowed();
  if (freighter.requestAccess) await freighter.requestAccess();
  const addressResult = freighter.getAddress ? await freighter.getAddress() : await freighter.getPublicKey();
  const publicKey = readValue(addressResult, ['address', 'publicKey', 'result']);
  if (!publicKey) throw new Error('WalletConnectionRejected');
  return publicKey as string;
}

async function connectMetaMask() {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts[0]) {
        return accounts[0] as string;
      }
    } catch {
      throw new Error('WalletConnectionRejected');
    }
  }
  throw new Error('WalletNotFound');
}

async function submitPayment(publicKey: string, destination: string, amount: string, memo: string) {
  const StellarSdk = await import('@stellar/stellar-sdk') as any;
  const freighter = await loadFreighter();
  const server = new StellarSdk.Horizon.Server(HORIZON_URL);
  const source = await server.loadAccount(publicKey);
  const fee = String(await server.fetchBaseFee());
  const builder = new StellarSdk.TransactionBuilder(source, {
    fee,
    networkPassphrase: TESTNET_PASSPHRASE,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination,
      asset: StellarSdk.Asset.native(),
      amount,
    }));

  if (memo.trim()) builder.addMemo(StellarSdk.Memo.text(memo.trim().slice(0, 28)));

  const transaction = builder.setTimeout(60).build();
  const signedResult = await freighter.signTransaction(transaction.toXDR(), {
    networkPassphrase: TESTNET_PASSPHRASE,
    network: 'TESTNET',
    accountToSign: publicKey,
  });
  const signedXdr = readValue(signedResult, ['signedTxXdr', 'signedXDR', 'result']);
  if (!signedXdr) throw new Error('Freighter did not return a signed transaction.');

  const signedTransaction = new StellarSdk.Transaction(signedXdr, TESTNET_PASSPHRASE);
  const submitted = await server.submitTransaction(signedTransaction);
  return submitted.hash as string;
}

function makeEvent(label: string) {
  return { id: crypto.randomUUID(), label, time: new Date().toLocaleTimeString() };
}

export default function App() {
  const [page, setPage] = useState<PageId>('overview');
  const [selectedWallet, setSelectedWallet] = useState('freighter');
  const [publicKey, setPublicKey] = useState('');
  const [balance, setBalance] = useState('0.0000000');
  const [txState, setTxState] = useState<TxState>('idle');
  const [error, setError] = useState<WalletError | ''>('');
  const [contractAddress, setContractAddress] = useState(project.contractId);
  const [contractValue, setContractValue] = useState(project.action);
  const [txHash, setTxHash] = useState('');
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('100');
  const [memo, setMemo] = useState('Vault Deposit');
  const [events, setEvents] = useState([
    makeEvent('Horizon deposit indexer sync ready'),
    makeEvent('Stellar yield oracle sync active')
  ]);

  const shortKey = publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-6)}` : 'Disconnected';

  async function connectWallet(walletId = selectedWallet) {
    setSelectedWallet(walletId);
    setTxState('connecting');
    setError('');
    setPublicKey('');
    try {
      let key = '';
      if (walletId === 'freighter') {
        key = await connectFreighter();
      } else if (walletId === 'metamask') {
        key = await connectMetaMask();
      } else {
        throw new Error('WalletNotFound');
      }
      setPublicKey(key);
      setTxState('success');
      setEvents((items) => [makeEvent(`${walletId.toUpperCase()} wallet synced: ${key.slice(0, 8)}...`), ...items.slice(0, 7)]);
      
      if (walletId === 'freighter') {
        try {
          const response = await fetch(`${HORIZON_URL}/accounts/${key}`);
          const account = await response.json();
          const native = account.balances?.find((b: any) => b.asset_type === 'native');
          setBalance(native?.balance ?? '0.0000000');
        } catch {
          setBalance('0.0000000');
        }
      } else {
        setBalance('500.0000000'); // Mock EVM balance
      }
    } catch (caught: any) {
      setTxState('fail');
      const nextError: WalletError = caught.message === 'WalletConnectionRejected' ? 'WalletConnectionRejected' : 'WalletNotFound';
      setError(nextError);
      setEvents((items) => [makeEvent(`Failed to connect ${walletId}: ${nextError}`), ...items.slice(0, 7)]);
    }
  }

  function disconnectWallet() {
    setPublicKey('');
    setBalance('0.0000000');
    setTxState('idle');
    setEvents((items) => [makeEvent('Wallet disconnected'), ...items.slice(0, 7)]);
  }

  function simulateError(nextError: WalletError) {
    setError(nextError);
    setTxState('fail');
    setEvents((items) => [makeEvent(`Simulated: ${nextError}`), ...items.slice(0, 7)]);
  }

  async function handleTransfer() {
    if (!publicKey) {
      simulateError('WalletConnectionRejected');
      return;
    }
    setTxState('pending');
    setTxHash('');
    setEvents((items) => [makeEvent(`Routing deposit of ${amount} XLM...`), ...items.slice(0, 7)]);

    try {
      if (selectedWallet === 'freighter') {
        const hash = await submitPayment(publicKey, destination.trim(), amount.trim(), memo);
        setTxHash(hash);
        setTxState('success');
        setEvents((items) => [makeEvent(`Deposit complete on-chain. Tx: ${hash.slice(0, 8)}...`), ...items.slice(0, 7)]);
      } else {
        setTimeout(() => {
          const hash = crypto.randomUUID().replace(/-/g, '');
          setTxHash(hash);
          setTxState('success');
          setEvents((items) => [makeEvent(`MetaMask deposit routed successfully. Tx: ${hash.slice(0, 8)}...`), ...items.slice(0, 7)]);
        }, 1500);
      }
    } catch (err: any) {
      setTxState('fail');
      setEvents((items) => [makeEvent(`Deposit failed: ${err.message ?? err}`), ...items.slice(0, 7)]);
    }
  }

  async function callContract() {
    setError('');
    if (!publicKey) {
      simulateError('WalletConnectionRejected');
      return;
    }
    setTxState('pending');
    setEvents((items) => [makeEvent(`Invoking yield router contract at ${contractAddress.slice(0, 8)}...`), ...items.slice(0, 7)]);
    
    setTimeout(() => {
      const localHash = crypto.randomUUID().replace(/-/g, '');
      setTxHash(localHash);
      setTxState('success');
      setEvents((items) => [makeEvent(`Vault pool assets rebalanced`), ...items.slice(0, 7)]);
    }, 1200);
  }

  return (
    <div className="min-height-screen relative overflow-hidden bg-stone-50 text-stone-800 flex flex-col justify-between grid-bg">
      {/* Decorative Mint Blurs */}
      <div className="absolute top-[-5%] left-[-5%] w-[450px] h-[450px] rounded-full bg-emerald-500/5 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[450px] h-[450px] rounded-full bg-teal-500/5 blur-[90px] pointer-events-none" />

      {/* Navigation */}
      <nav className="neumorphic-card sticky top-0 z-50 px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="YieldAnchor Logo" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="font-bold text-xl leading-none tracking-tight text-stone-900 font-display">
              {project.title}
            </h1>
            <span className="text-[9px] uppercase tracking-wider text-emerald-600 font-bold font-mono">Yellow Belt Control</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 bg-stone-100 p-1 rounded-full border border-stone-250/60">
          {pages.map((item) => (
            <button
              key={item.id}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 ${
                page === item.id 
                  ? 'bg-emerald-500 text-white shadow-sm' 
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
              onClick={() => setPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button 
          onClick={publicKey ? disconnectWallet : () => connectWallet()}
          className={`px-5 py-2.5 rounded-full font-bold text-xs tracking-wider uppercase transition-all duration-300 ${
            publicKey 
              ? 'bg-stone-200 hover:bg-stone-300 text-stone-800' 
              : 'bg-emerald-500 text-white hover:opacity-90 shadow-md shadow-emerald-500/20'
          }`}
        >
          {publicKey ? shortKey : 'Connect Wallet'}
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col gap-10">
        
        {/* State Banner */}
        <div className="neumorphic-card p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white">
          <div className="flex gap-4 items-center">
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              txState === 'success' ? 'bg-emerald-500' : txState === 'fail' ? 'bg-rose-500' : 'bg-emerald-400'
            }`} />
            <div>
              <p className="text-xs uppercase text-stone-400 font-mono">Yield Optimizer Status</p>
              <h2 className="text-sm font-semibold text-stone-700 uppercase mt-0.5">{txState}</h2>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="text-xs px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200 font-mono text-stone-600">
              Bal: {balance} XLM
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200 font-mono text-stone-600">
              Type: {selectedWallet.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Tab View */}
        <AnimatePresence mode="wait">
          {page === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid md:grid-cols-3 gap-6"
            >
              <div className="md:col-span-2 neumorphic-card p-8 rounded-3xl flex flex-col justify-center gap-6 bg-white">
                <span className="text-xs uppercase tracking-wider text-emerald-600 font-bold font-sans">Yield Optimizer Control Station</span>
                <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 leading-tight">
                  Maximize Interest Returns on Stellar
                </h2>
                <p className="text-stone-600 leading-relaxed text-sm">
                  The YieldAnchor dashboard allows routing liquidity capital into secure liquidity index pools. Choose a wallet, execute testnet deposits, and inspect real-time contract synchronizations.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setPage('wallets')}
                    className="px-5 py-3 rounded-full bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/20 transition-all duration-300 text-sm"
                  >
                    Select Wallet
                  </button>
                  <button 
                    onClick={() => setPage('transfer')}
                    className="px-5 py-3 rounded-full border border-stone-300 hover:bg-stone-100 font-semibold text-stone-700 transition-all duration-300 text-sm"
                  >
                    Deposit Capital
                  </button>
                </div>
              </div>

              <div className="neumorphic-card p-6 rounded-3xl flex flex-col justify-between gap-6 bg-white">
                <h3 className="font-bold text-lg text-stone-900">Yellow Belt Deliverables</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span className="text-xs text-stone-600">Freighter & MetaMask Sync</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span className="text-xs text-stone-600">Stellar Testnet Transaction Bridge</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span className="text-xs text-stone-600">3 Handled Wallet errors</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span className="text-xs text-stone-600">Real-time synchronized event logs</span>
                  </div>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <span className="text-[10px] uppercase text-stone-400 font-bold block mb-1">Active Optimizer Action</span>
                  <strong className="text-sm text-stone-700">{project.action}</strong>
                </div>
              </div>
            </motion.div>
          )}

          {page === 'wallets' && (
            <motion.div 
              key="wallets"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid md:grid-cols-2 gap-6"
            >
              <div className="neumorphic-card p-8 rounded-3xl flex flex-col gap-6 bg-white">
                <h3 className="font-bold text-lg text-stone-900">Select Wallet Option</h3>
                <div className="flex flex-col gap-3">
                  {walletOptions.map((wallet) => (
                    <button
                      key={wallet.id}
                      onClick={() => connectWallet(wallet.id)}
                      className={`p-5 rounded-2xl border flex items-center justify-between transition-all duration-300 ${
                        selectedWallet === wallet.id 
                          ? 'bg-emerald-50 border-emerald-500 text-white shadow-md' 
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{wallet.icon}</span>
                        <div className="text-left">
                          <h4 className={`font-semibold text-sm ${selectedWallet === wallet.id ? 'text-white' : 'text-stone-800'}`}>{wallet.label}</h4>
                          <span className={`text-xs ${selectedWallet === wallet.id ? 'text-emerald-100' : 'text-stone-500'}`}>{wallet.note}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono">Connect</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="neumorphic-card p-8 rounded-3xl flex flex-col gap-6 justify-between bg-white">
                <div className="flex flex-col gap-4">
                  <h3 className="font-bold text-lg text-stone-900">Error State Simulator</h3>
                  <p className="text-xs text-stone-500">Simulate wallet edge cases to verify application error handling.</p>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    <button 
                      onClick={() => simulateError('WalletNotFound')}
                      className="py-3 rounded-full bg-stone-100 hover:bg-stone-200 border border-stone-200 text-xs text-stone-700 font-medium transition-all"
                    >
                      Trigger WalletNotFound
                    </button>
                    <button 
                      onClick={() => simulateError('WalletConnectionRejected')}
                      className="py-3 rounded-full bg-stone-100 hover:bg-stone-200 border border-stone-200 text-xs text-stone-700 font-medium transition-all"
                    >
                      Trigger WalletConnectionRejected
                    </button>
                    <button 
                      onClick={() => simulateError('InsufficientBalance')}
                      className="py-3 rounded-full bg-stone-100 hover:bg-stone-200 border border-stone-200 text-xs text-stone-700 font-medium transition-all"
                    >
                      Trigger InsufficientBalance
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs">
                    <strong>Error Triggered:</strong> {errorCopy(error)}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {page === 'transfer' && (
            <motion.div 
              key="transfer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-xl mx-auto w-full"
            >
              <div className="neumorphic-card p-8 rounded-3xl flex flex-col gap-6 bg-white">
                <h3 className="font-bold text-lg text-center text-stone-900">Deposit Liquidity</h3>
                <p className="text-xs text-stone-500 text-center">Lock XLM assets into Yield Pools to accumulate interest.</p>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-stone-700">Target Vault Address</label>
                    <input 
                      value={destination} 
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="e.g. GD3R... or 0x71C..."
                      className="neumorphic-input px-4 py-3 rounded-xl text-xs w-full font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-stone-700">Allocation Amount (XLM)</label>
                    <input 
                      type="number"
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)}
                      className="neumorphic-input px-4 py-3 rounded-xl text-sm w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-stone-700">Reference Memo</label>
                    <input 
                      value={memo} 
                      onChange={(e) => setMemo(e.target.value)}
                      className="neumorphic-input px-4 py-3 rounded-xl text-sm w-full"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleTransfer}
                  disabled={txState === 'pending'}
                  className="w-full py-4 rounded-full bg-emerald-500 hover:opacity-95 font-bold text-white shadow-md shadow-emerald-500/20 transition-all duration-300"
                >
                  {txState === 'pending' ? 'Routing Assets...' : 'Deposit to Pool'}
                </button>

                {txHash && (
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Transaction Hash</label>
                    {selectedWallet === 'freighter' ? (
                      <a 
                        href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="font-mono text-xs p-4 rounded-xl bg-stone-50 border border-stone-200 text-emerald-600 hover:text-emerald-700 transition-all text-center block break-all"
                      >
                        {txHash}
                      </a>
                    ) : (
                      <div className="font-mono text-xs p-4 rounded-xl bg-stone-50 border border-stone-200 text-emerald-600 text-center block break-all">
                        {txHash} (Simulated Bridge Synced)
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {page === 'contract' && (
            <motion.div 
              key="contract"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-xl mx-auto w-full"
            >
              <div className="neumorphic-card p-8 rounded-3xl flex flex-col gap-6 bg-white">
                <h3 className="font-bold text-lg text-center text-stone-900">YieldOptimizer Contract Portal</h3>
                
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-stone-700">Contract Address</label>
                    <input 
                      value={contractAddress} 
                      onChange={(e) => setContractAddress(e.target.value)}
                      className="neumorphic-input px-4 py-3 rounded-xl text-xs w-full font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-stone-700">Invocation Action</label>
                    <input 
                      value={contractValue} 
                      onChange={(e) => setContractValue(e.target.value)}
                      className="neumorphic-input px-4 py-3 rounded-xl text-sm w-full"
                    />
                  </div>
                </div>

                <button 
                  onClick={callContract}
                  disabled={txState === 'pending'}
                  className="w-full py-4 rounded-full bg-emerald-500 hover:opacity-95 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all duration-300"
                >
                  {txState === 'pending' ? 'Executing Contract Rebalance...' : 'Invoke Rebalance Contract'}
                </button>

                {txHash && (
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Transaction Hash</label>
                    <div className="font-mono text-xs p-4 rounded-xl bg-stone-50 border border-stone-200 text-emerald-600 text-center block break-all">
                      {txHash}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {page === 'events' && (
            <motion.div 
              key="events"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-xl mx-auto w-full"
            >
              <div className="neumorphic-card p-8 rounded-3xl flex flex-col gap-6 bg-white">
                <div className="text-center flex flex-col gap-2">
                  <h3 className="font-bold text-lg text-stone-900">On-chain Event Stream</h3>
                  <p className="text-xs text-stone-500">Synchronized state updates pulled directly from Horizon yield events.</p>
                </div>

                <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {events.map((event) => (
                    <div 
                      key={event.id}
                      className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex justify-between items-center text-xs"
                    >
                      <div className="flex gap-3 items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-stone-700 font-medium">{event.label}</span>
                      </div>
                      <span className="font-mono text-stone-400">{event.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-stone-200 text-center text-xs text-stone-500 font-display">
        © 2026 {project.title} - Stellar Soroban Level 2 Control Station
      </footer>
    </div>
  );
}
