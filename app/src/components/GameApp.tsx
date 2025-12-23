import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { Contract } from 'ethers';
import { sepolia } from 'wagmi/chains';

import { Header } from './Header';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import '../styles/GameApp.css';

type Hex32 = `0x${string}`;
type HexAddress = `0x${string}`;

type PlayerListEntry = {
  index: number;
  handle: Hex32;
  publicAddress?: string;
  status: 'hidden' | 'public' | 'error';
};

function toInt(value: unknown): number {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return Number(value);
}

function shorten(hex: string, prefix = 6, suffix = 4) {
  if (hex.length <= prefix + suffix + 2) return hex;
  return `${hex.slice(0, prefix + 2)}…${hex.slice(-suffix)}`;
}

function MapGrid({ x, y }: { x?: number; y?: number }) {
  const rows = useMemo(() => Array.from({ length: 9 }, (_, i) => i + 1), []);

  return (
    <div className="map">
      <div className="map-header">
        <div className="map-title">9×9 Map</div>
        <div className="map-subtitle">Coordinates are 1–9 on both axes.</div>
      </div>
      <div className="map-grid">
        {rows.map((rowY) =>
          rows.map((colX) => {
            const isMe = x === colX && y === rowY;
            return (
              <div key={`${colX}-${rowY}`} className={`tile ${isMe ? 'tile-me' : ''}`}>
                <div className="tile-coord">
                  {colX},{rowY}
                </div>
                {isMe && <div className="tile-me-label">You</div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function GameApp() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();
  const signerPromise = useEthersSigner({ chainId: sepolia.id });

  const [hasJoined, setHasJoined] = useState<boolean>(false);
  const [xHandle, setXHandle] = useState<Hex32 | null>(null);
  const [yHandle, setYHandle] = useState<Hex32 | null>(null);
  const [decryptedPos, setDecryptedPos] = useState<{ x: number; y: number } | null>(null);

  const [jumpX, setJumpX] = useState<number>(1);
  const [jumpY, setJumpY] = useState<number>(1);

  const [playerCount, setPlayerCount] = useState<number>(0);
  const [players, setPlayers] = useState<PlayerListEntry[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [isMakingPublic, setIsMakingPublic] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [isDecryptingPlayers, setIsDecryptingPlayers] = useState(false);

  const [contractAddressOverride, setContractAddressOverride] = useState('');

  const activeContractAddress = useMemo(() => {
    const trimmed = contractAddressOverride.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return trimmed as HexAddress;
     return CONTRACT_ADDRESS as HexAddress;
    return null;
  }, [contractAddressOverride]);

  const contractAddressReady = !!activeContractAddress;

  const refresh = useCallback(async () => {
    if (!publicClient || !contractAddressReady || !activeContractAddress) return;
    if (!address) return;

    setIsRefreshing(true);
    try {
      const joined = (await publicClient.readContract({
        address: activeContractAddress,
        abi: CONTRACT_ABI,
        functionName: 'hasJoined',
        args: [address],
      })) as boolean;
      setHasJoined(joined);

      const [xh, yh] = (await publicClient.readContract({
        address: activeContractAddress,
        abi: CONTRACT_ABI,
        functionName: 'getPlayerPosition',
        args: [address],
      })) as [Hex32, Hex32];

      setXHandle(xh);
      setYHandle(yh);

      const count = (await publicClient.readContract({
        address: activeContractAddress,
        abi: CONTRACT_ABI,
        functionName: 'getPlayerCount',
      })) as bigint;

      setPlayerCount(Number(count));
    } finally {
      setIsRefreshing(false);
    }
  }, [activeContractAddress, address, contractAddressReady, publicClient]);

  useEffect(() => {
    setHasJoined(false);
    setXHandle(null);
    setYHandle(null);
    setDecryptedPos(null);
    setPlayers([]);
    setPlayerCount(0);
    if (!isConnected || !address) return;
    void refresh();
  }, [address, isConnected, refresh]);

  const getEthersContract = useCallback(async () => {
    if (!contractAddressReady || !activeContractAddress) {
      throw new Error('Contract address is not configured');
    }
    const signer = await signerPromise;
    if (!signer) throw new Error('Signer not available');
    return new Contract(activeContractAddress, CONTRACT_ABI, signer);
  }, [activeContractAddress, contractAddressReady, signerPromise]);

  const joinGame = async () => {
    if (!address) return;
    setIsJoining(true);
    try {
      const contract = await getEthersContract();
      const tx = await contract.join();
      await tx.wait();
      await refresh();
      setDecryptedPos(null);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Join failed');
    } finally {
      setIsJoining(false);
    }
  };

  const makeAddressPublic = async () => {
    setIsMakingPublic(true);
    try {
      const contract = await getEthersContract();
      const tx = await contract.makeMyAddressPublic();
      await tx.wait();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setIsMakingPublic(false);
    }
  };

  const decryptMyPosition = async () => {
    if (!instance || !address || !xHandle || !yHandle || !signerPromise) {
      alert('Missing required components for decryption');
      return;
    }
    if (!activeContractAddress) {
      alert('Contract address is not configured');
      return;
    }
    setIsDecrypting(true);
    try {
      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        { handle: xHandle, contractAddress: activeContractAddress },
        { handle: yHandle, contractAddress: activeContractAddress },
      ];

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [activeContractAddress];

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const signer = await signerPromise;
      if (!signer) throw new Error('Signer not available');

      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays
      );

      const x = toInt(result[xHandle] ?? 0);
      const y = toInt(result[yHandle] ?? 0);
      setDecryptedPos({ x, y });
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Decryption failed');
    } finally {
      setIsDecrypting(false);
    }
  };

  const jump = async () => {
    if (!instance || !address) return;
    if (!activeContractAddress) {
      alert('Contract address is not configured');
      return;
    }
    if (jumpX < 1 || jumpX > 9 || jumpY < 1 || jumpY > 9) {
      alert('Coordinates must be between 1 and 9');
      return;
    }

    setIsJumping(true);
    try {
      const input = instance.createEncryptedInput(activeContractAddress, address);
      input.add8(BigInt(jumpX));
      input.add8(BigInt(jumpY));
      const encryptedInput = await input.encrypt();

      const contract = await getEthersContract();
      const tx = await contract.jump(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof);
      await tx.wait();
      await refresh();
      setDecryptedPos(null);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Jump failed');
    } finally {
      setIsJumping(false);
    }
  };

  const loadPlayers = async () => {
    if (!publicClient || !contractAddressReady || !activeContractAddress) return;
    setIsLoadingPlayers(true);
    try {
      const count = (await publicClient.readContract({
        address: activeContractAddress,
        abi: CONTRACT_ABI,
        functionName: 'getPlayerCount',
      })) as bigint;

      const total = Number(count);
      setPlayerCount(total);

      const next: PlayerListEntry[] = [];
      for (let i = 0; i < total; i++) {
        const handle = (await publicClient.readContract({
          address: activeContractAddress,
          abi: CONTRACT_ABI,
          functionName: 'getEncryptedPlayerAddressByIndex',
          args: [BigInt(i)],
        })) as Hex32;

        next.push({ index: i, handle, status: 'hidden' });
      }

      setPlayers(next);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Failed to load players');
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  const decryptPublicPlayerAddresses = async () => {
    if (!instance) return;
    setIsDecryptingPlayers(true);
    try {
      const next = await Promise.all(
        players.map(async (p) => {
          try {
            const res = await instance.publicDecrypt([p.handle]);
            const clear = (res?.clearValues?.[p.handle] ?? res?.[p.handle]) as unknown;
            if (typeof clear === 'string' && clear.startsWith('0x') && clear.length === 42) {
              return { ...p, publicAddress: clear, status: 'public' as const };
            }
            return { ...p, status: 'error' as const };
          } catch {
            return { ...p, status: 'hidden' as const };
          }
        })
      );
      setPlayers(next);
    } finally {
      setIsDecryptingPlayers(false);
    }
  };

  const wrongNetwork = isConnected && chainId !== sepolia.id;

  return (
    <div className="game-app">
      <Header />
      <main className="content">
        {!contractAddressReady && (
          <div className="card warning">
            <div className="card-title">Contract not configured</div>
            <div className="card-text">
              Update <code>app/src/config/contracts.ts</code> with the Sepolia deployment address and ABI.
            </div>
          </div>
        )}

        {wrongNetwork && (
          <div className="card warning">
            <div className="card-title">Wrong network</div>
            <div className="card-text">Switch your wallet network to Sepolia.</div>
          </div>
        )}

        {!!zamaError && (
          <div className="card warning">
            <div className="card-title">Zama Relayer error</div>
            <div className="card-text">{zamaError}</div>
          </div>
        )}

        <div className="layout">
          <section className="panel">
            <div className="card">
              <div className="card-title">Player</div>
              <div className="card-text">
                {isConnected ? (
                  <>
                    <div>
                      <span className="label">Address</span>
                      <span className="mono">{address ? shorten(address) : '-'}</span>
                    </div>
                    <div>
                      <span className="label">Joined</span>
                      <span>{hasJoined ? 'Yes' : 'No'}</span>
                    </div>
                    <div>
                      <span className="label">Players</span>
                      <span>{playerCount}</span>
                    </div>
                    <div className="contract-row">
                      <span className="label">Contract</span>
                      <input
                        className="input mono"
                        placeholder={contractAddressReady ? (activeContractAddress as string) : '0x...'}
                        value={contractAddressOverride}
                        onChange={(e) => setContractAddressOverride(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <div>Connect your wallet to play.</div>
                )}
              </div>

              <div className="actions">
                <button className="btn" onClick={() => void refresh()} disabled={!isConnected || isRefreshing || !contractAddressReady}>
                  {isRefreshing ? 'Refreshing…' : 'Refresh'}
                </button>
                <button
                  className="btn primary"
                  onClick={() => void joinGame()}
                  disabled={!isConnected || hasJoined || isJoining || !contractAddressReady || wrongNetwork}
                >
                  {isJoining ? 'Joining…' : 'Join (random position)'}
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-title">My Position</div>
              <div className="card-text">
                <div>
                  <span className="label">Encrypted x</span>
                  <span className="mono">{xHandle ? shorten(xHandle) : '-'}</span>
                </div>
                <div>
                  <span className="label">Encrypted y</span>
                  <span className="mono">{yHandle ? shorten(yHandle) : '-'}</span>
                </div>
                <div>
                  <span className="label">Decrypted</span>
                  <span>{decryptedPos ? `${decryptedPos.x},${decryptedPos.y}` : '—'}</span>
                </div>
              </div>
              <div className="actions">
                <button
                  className="btn"
                  onClick={() => void decryptMyPosition()}
                  disabled={!isConnected || !hasJoined || isDecrypting || zamaLoading || !contractAddressReady || wrongNetwork}
                >
                  {isDecrypting ? 'Decrypting…' : zamaLoading ? 'Initializing…' : 'Decrypt my position'}
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Jump</div>
              <div className="card-text">
                <div className="jump-row">
                  <label className="jump-label">
                    X (1–9)
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={9}
                      value={jumpX}
                      onChange={(e) => setJumpX(Number(e.target.value))}
                    />
                  </label>
                  <label className="jump-label">
                    Y (1–9)
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={9}
                      value={jumpY}
                      onChange={(e) => setJumpY(Number(e.target.value))}
                    />
                  </label>
                </div>
                <div className="hint">The destination is encrypted client-side and submitted to the contract.</div>
              </div>
              <div className="actions">
                <button
                  className="btn primary"
                  onClick={() => void jump()}
                  disabled={!isConnected || !hasJoined || isJumping || zamaLoading || !contractAddressReady || wrongNetwork}
                >
                  {isJumping ? 'Jumping…' : 'Jump'}
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Public Address</div>
              <div className="card-text">
                <div className="hint">
                  This makes your encrypted address publicly decryptable, so anyone can decode it using public decryption.
                </div>
              </div>
              <div className="actions">
                <button
                  className="btn"
                  onClick={() => void makeAddressPublic()}
                  disabled={!isConnected || !hasJoined || isMakingPublic || !contractAddressReady || wrongNetwork}
                >
                  {isMakingPublic ? 'Submitting…' : 'Make my address public'}
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Players</div>
              <div className="card-text">
                <div className="hint">Players are stored on-chain as encrypted addresses. Only addresses made public can be decrypted.</div>
              </div>
              <div className="actions">
                <button className="btn" onClick={() => void loadPlayers()} disabled={isLoadingPlayers || !contractAddressReady}>
                  {isLoadingPlayers ? 'Loading…' : 'Load list'}
                </button>
                <button
                  className="btn"
                  onClick={() => void decryptPublicPlayerAddresses()}
                  disabled={!instance || players.length === 0 || isDecryptingPlayers || zamaLoading}
                >
                  {isDecryptingPlayers ? 'Decrypting…' : 'Decrypt public addresses'}
                </button>
              </div>

              {players.length > 0 && (
                <div className="player-list">
                  {players.map((p) => (
                    <div key={p.index} className="player-row">
                      <div className="mono">#{p.index}</div>
                      <div className="mono">{shorten(p.handle)}</div>
                      <div className={`pill ${p.status}`}>
                        {p.status === 'public' && p.publicAddress ? shorten(p.publicAddress) : p.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="panel">
            <MapGrid x={decryptedPos?.x} y={decryptedPos?.y} />
          </section>
        </div>
      </main>
    </div>
  );
}
