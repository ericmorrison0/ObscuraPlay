import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

import { ObscuraPlay } from "../types";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("ObscuraPlaySepolia", function () {
  let signers: Signers;
  let contract: ObscuraPlay;
  let contractAddress: string;

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const deployment = await deployments.get("ObscuraPlay");
      contractAddress = deployment.address;
      contract = await ethers.getContractAt("ObscuraPlay", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  it("join() assigns a decryptable position", async function () {
    this.timeout(4 * 40000);

    await (await contract.connect(signers.alice).join()).wait();

    const [xHandle, yHandle] = await contract.getPlayerPosition(signers.alice.address);
    expect(xHandle).to.not.eq(ethers.ZeroHash);
    expect(yHandle).to.not.eq(ethers.ZeroHash);

    const x = await fhevm.userDecryptEuint(FhevmType.euint8, xHandle, contractAddress, signers.alice);
    const y = await fhevm.userDecryptEuint(FhevmType.euint8, yHandle, contractAddress, signers.alice);

    expect(x).to.be.gte(1);
    expect(x).to.be.lte(9);
    expect(y).to.be.gte(1);
    expect(y).to.be.lte(9);
  });

  it("jump() works with encrypted inputs", async function () {
    this.timeout(4 * 40000);

    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(255)
      .add8(255)
      .encrypt();

    await (
      await contract.connect(signers.alice).jump(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof)
    ).wait();

    const [xHandle, yHandle] = await contract.getPlayerPosition(signers.alice.address);
    const x = await fhevm.userDecryptEuint(FhevmType.euint8, xHandle, contractAddress, signers.alice);
    const y = await fhevm.userDecryptEuint(FhevmType.euint8, yHandle, contractAddress, signers.alice);

    expect(x).to.be.gte(1);
    expect(x).to.be.lte(9);
    expect(y).to.be.gte(1);
    expect(y).to.be.lte(9);
  });
});

