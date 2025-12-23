import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

import { ObscuraPlay, ObscuraPlay__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("ObscuraPlay")) as ObscuraPlay__factory;
  const contract = (await factory.deploy()) as ObscuraPlay;
  const address = await contract.getAddress();
  return { contract, address };
}

describe("ObscuraPlay", function () {
  let signers: Signers;
  let contract: ObscuraPlay;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, address: contractAddress } = await deployFixture());
  });

  it("starts with zero players", async function () {
    const count = await contract.getPlayerCount();
    expect(count).to.eq(0n);
  });

  it("join() assigns a position on the 9x9 grid", async function () {
    const joinedBefore = await contract.hasJoined(signers.alice.address);
    expect(joinedBefore).to.eq(false);

    const tx = await contract.connect(signers.alice).join();
    await tx.wait();

    const joinedAfter = await contract.hasJoined(signers.alice.address);
    expect(joinedAfter).to.eq(true);

    const [xHandle, yHandle] = await contract.getPlayerPosition(signers.alice.address);
    expect(xHandle).to.not.eq(ethers.ZeroHash);
    expect(yHandle).to.not.eq(ethers.ZeroHash);

    const x = await fhevm.userDecryptEuint(FhevmType.euint8, xHandle, contractAddress, signers.alice);
    const y = await fhevm.userDecryptEuint(FhevmType.euint8, yHandle, contractAddress, signers.alice);

    expect(x).to.be.gte(1);
    expect(x).to.be.lte(9);
    expect(y).to.be.gte(1);
    expect(y).to.be.lte(9);

    const addrHandle = await contract.getPlayerEncryptedAddress(signers.alice.address);
    expect(addrHandle).to.not.eq(ethers.ZeroHash);
    const clearAddr = await fhevm.userDecryptEaddress(addrHandle, contractAddress, signers.alice);
    expect(clearAddr.toLowerCase()).to.eq(signers.alice.address.toLowerCase());
  });

  it("jump() canonicalizes coordinates into [1..9]", async function () {
    await (await contract.connect(signers.alice).join()).wait();

    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(0)
      .add8(10)
      .encrypt();

    await (
      await contract
        .connect(signers.alice)
        .jump(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof)
    ).wait();

    const [xHandle, yHandle] = await contract.getPlayerPosition(signers.alice.address);
    const x = await fhevm.userDecryptEuint(FhevmType.euint8, xHandle, contractAddress, signers.alice);
    const y = await fhevm.userDecryptEuint(FhevmType.euint8, yHandle, contractAddress, signers.alice);

    expect(x).to.eq(1);
    expect(y).to.eq(2);
  });
});
