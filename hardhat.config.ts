import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";

import * as dotenv from "dotenv";

import "./tasks/accounts";
import "./tasks/ObscuraPlay";

dotenv.config();

const INFURA_API_KEY: string = process.env.INFURA_API_KEY ?? "";
const PRIVATE_KEY: string = process.env.PRIVATE_KEY ?? "";

const LOCAL_ACCOUNTS = [
  {
    privateKey: "0x59c6995e998f97a5a0044966f094538b8f3b8bb2d5c6b4d17f0f67b2a4f7f0a3",
    balance: "10000000000000000000000",
  },
  {
    privateKey: "0x8b3a350cf5c34c9194ca3a545d6d3b1f7b990c2ec6fbb8a6f2d5b6c4d7e3b7a2",
    balance: "10000000000000000000000",
  },
  {
    privateKey: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f5f0b4e1b8fbc28b2f11c",
    balance: "10000000000000000000000",
  },
  {
    privateKey: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bcf81b2f5b6f5e2c5b6a2b9e16",
    balance: "10000000000000000000000",
  },
  {
    privateKey: "0x90f79bf6eb2c4f870365e785982e1f101e93b906f5cbb5c9e7b69f1b4ad0c1a6",
    balance: "10000000000000000000000",
  },
  {
    privateKey: "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65b5b0d4f7f0e2a4b1c3d5e7f8",
    balance: "10000000000000000000000",
  },
  {
    privateKey: "0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc3afc8da9e5f9c9d0a9d6f5c2",
    balance: "10000000000000000000000",
  },
  {
    privateKey: "0x976ea74026e726554db657fa54763abd0c3a0aa9f9b0b3cc5b7c8d9e0f1a2b3c",
    balance: "10000000000000000000000",
  },
  {
    privateKey: "0x14dc79964da2c08b23698b3d3cc7ca32193d9955d7a5e2d7f2c8a9b0c1d2e3f4",
    balance: "10000000000000000000000",
  },
  {
    privateKey: "0x23618e81e3f5cdf7f54c3d65d5d4c1e8b3f2d1c0b0a9f8e7d6c5b4a392817161",
    balance: "10000000000000000000000",
  },
] as const;
const LOCAL_PRIVATE_KEYS = LOCAL_ACCOUNTS.map((a) => a.privateKey);

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY ?? "",
    },
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
  },
  networks: {
    hardhat: {
      chainId: 31337,
      accounts: [...LOCAL_ACCOUNTS],
    },
    localhost: {
      chainId: 31337,
      url: "http://127.0.0.1:8545",
      accounts: [...LOCAL_PRIVATE_KEYS],
    },
    sepolia: {
      chainId: 11155111,
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.27",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;
