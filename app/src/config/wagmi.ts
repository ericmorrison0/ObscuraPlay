import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { sepolia } from 'wagmi/chains';

export const chains = [sepolia] as const;

export const config = createConfig({
  chains,
  connectors: [injected()],
  transports: {
    [sepolia.id]: http('https://eth-sepolia.public.blastapi.io'),
  },
});
