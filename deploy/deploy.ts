import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  if (!deployer) {
    throw new Error(
      "Missing deployer account. Set process.env.PRIVATE_KEY in .env to a funded Sepolia private key (0x...).",
    );
  }
  const { deploy } = hre.deployments;

  const deployedObscuraPlay = await deploy("ObscuraPlay", {
    from: deployer,
    log: true,
  });

  console.log(`ObscuraPlay contract: `, deployedObscuraPlay.address);
};
export default func;
func.id = "deploy_obscuraPlay"; // id required to prevent reexecution
func.tags = ["ObscuraPlay"];
