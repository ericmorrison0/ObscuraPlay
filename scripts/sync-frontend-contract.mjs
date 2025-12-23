import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const deploymentPath = path.join(root, "deployments", "sepolia", "ObscuraPlay.json");
const outPath = path.join(root, "app", "src", "config", "contracts.ts");

if (!fs.existsSync(deploymentPath)) {
  throw new Error(
    `Missing deployment file: ${deploymentPath}\nRun: npx hardhat deploy --network sepolia\nThen rerun this script.`,
  );
}

const raw = fs.readFileSync(deploymentPath, "utf8");
const deployment = JSON.parse(raw);

if (!deployment?.address || !deployment?.abi) {
  throw new Error(`Invalid deployment JSON at ${deploymentPath} (expected { address, abi })`);
}

const abiJson = JSON.stringify(deployment.abi, null, 2);
const content = `// Auto-generated from deployments/sepolia/ObscuraPlay.json
// Do not edit manually. Run: node scripts/sync-frontend-contract.mjs

export const CONTRACT_ADDRESS = '${deployment.address}' as const;

export const CONTRACT_ABI = ${abiJson} as const;
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, content, "utf8");

console.log(`Wrote ${outPath}`);

