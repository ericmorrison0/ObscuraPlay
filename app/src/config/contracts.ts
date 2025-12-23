// NOTE: This address and ABI are synchronized from `deployments/sepolia/ObscuraPlay.json`.
// Update them after deploying to Sepolia.

export const CONTRACT_ADDRESS = '0xEC69ac0443eE44eD7EdEDF9977A3979EfBc5b4C4' as const;

export const CONTRACT_ABI = [
  {
    inputs: [],
    name: 'MAP_SIZE',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'hasJoined',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getPlayerCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'index', type: 'uint256' }],
    name: 'getEncryptedPlayerAddressByIndex',
    outputs: [{ internalType: 'eaddress', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getPlayerEncryptedAddress',
    outputs: [{ internalType: 'eaddress', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getPlayerPosition',
    outputs: [
      { internalType: 'euint8', name: 'x', type: 'bytes32' },
      { internalType: 'euint8', name: 'y', type: 'bytes32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  { inputs: [], name: 'join', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  {
    inputs: [
      { internalType: 'externalEuint8', name: 'xInput', type: 'bytes32' },
      { internalType: 'externalEuint8', name: 'yInput', type: 'bytes32' },
      { internalType: 'bytes', name: 'inputProof', type: 'bytes' },
    ],
    name: 'jump',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  { inputs: [], name: 'makeMyAddressPublic', outputs: [], stateMutability: 'nonpayable', type: 'function' },
] as const;

