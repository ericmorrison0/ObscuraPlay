import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Local workflow (--network localhost)
 * 1) npx hardhat node
 * 2) npx hardhat --network localhost deploy
 * 3) npx hardhat --network localhost obscura:join
 * 4) npx hardhat --network localhost obscura:decrypt-position
 * 5) npx hardhat --network localhost obscura:jump --x 9 --y 1
 * 6) npx hardhat --network localhost obscura:make-public
 * 7) npx hardhat --network localhost obscura:list-players
 *
 * Sepolia workflow (--network sepolia)
 * 1) npx hardhat --network sepolia deploy
 * 2) npx hardhat --network sepolia obscura:join
 * 3) npx hardhat --network sepolia obscura:decrypt-position
 */

task("obscura:address", "Prints the ObscuraPlay contract address").setAction(async function (
  _taskArguments: TaskArguments,
  hre,
) {
  const { deployments } = hre;
  const deployment = await deployments.get("ObscuraPlay");
  console.log("ObscuraPlay address is " + deployment.address);
});

task("obscura:join", "Calls join() on ObscuraPlay")
  .addOptionalParam("address", "Optionally specify the ObscuraPlay contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("ObscuraPlay");
    console.log(`ObscuraPlay: ${deployment.address}`);

    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("ObscuraPlay", deployment.address);

    const tx = await contract.connect(signer).join();
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("obscura:decrypt-position", "Decrypts (x,y) for a player address")
  .addOptionalParam("address", "Optionally specify the ObscuraPlay contract address")
  .addOptionalParam("player", "Optionally specify the player address (defaults to signer[0])")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("ObscuraPlay");
    console.log(`ObscuraPlay: ${deployment.address}`);

    const [signer] = await ethers.getSigners();
    const player = (taskArguments.player as string | undefined) ?? signer.address;

    const contract = await ethers.getContractAt("ObscuraPlay", deployment.address);
    const [xHandle, yHandle] = await contract.getPlayerPosition(player);

    if (xHandle === ethers.ZeroHash || yHandle === ethers.ZeroHash) {
      console.log(`Player ${player} has no position (not joined)`);
      return;
    }

    const x = await fhevm.userDecryptEuint(FhevmType.euint8, xHandle, deployment.address, signer);
    const y = await fhevm.userDecryptEuint(FhevmType.euint8, yHandle, deployment.address, signer);

    console.log(`Encrypted x: ${xHandle}`);
    console.log(`Encrypted y: ${yHandle}`);
    console.log(`Clear x    : ${x}`);
    console.log(`Clear y    : ${y}`);
  });

task("obscura:jump", "Calls jump(x,y) on ObscuraPlay with encrypted inputs")
  .addOptionalParam("address", "Optionally specify the ObscuraPlay contract address")
  .addParam("x", "Target x coordinate (number)")
  .addParam("y", "Target y coordinate (number)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const x = parseInt(taskArguments.x);
    const y = parseInt(taskArguments.y);
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new Error(`Arguments --x and --y must be integers`);
    }

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("ObscuraPlay");
    console.log(`ObscuraPlay: ${deployment.address}`);

    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("ObscuraPlay", deployment.address);

    const encryptedInput = await fhevm
      .createEncryptedInput(deployment.address, signer.address)
      .add8(x)
      .add8(y)
      .encrypt();

    const tx = await contract.connect(signer).jump(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("obscura:make-public", "Calls makeMyAddressPublic() on ObscuraPlay")
  .addOptionalParam("address", "Optionally specify the ObscuraPlay contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("ObscuraPlay");
    console.log(`ObscuraPlay: ${deployment.address}`);

    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("ObscuraPlay", deployment.address);

    const tx = await contract.connect(signer).makeMyAddressPublic();
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("obscura:list-players", "Prints encrypted player address handles")
  .addOptionalParam("address", "Optionally specify the ObscuraPlay contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("ObscuraPlay");
    console.log(`ObscuraPlay: ${deployment.address}`);

    const contract = await ethers.getContractAt("ObscuraPlay", deployment.address);
    const count: bigint = await contract.getPlayerCount();

    console.log(`Players: ${count.toString()}`);
    for (let i = 0n; i < count; i++) {
      const handle = await contract.getEncryptedPlayerAddressByIndex(i);
      console.log(`${i.toString()}: ${handle}`);
    }
  });

