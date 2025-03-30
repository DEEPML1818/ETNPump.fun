const { ethers } = require("hardhat");

async function main() {
  // Retrieve the deployer's account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy FeeVault
  console.log("Deploying FeeVault...");
  const FeeVaultFactory = await ethers.getContractFactory("FeeVault");
  const feeVault = await FeeVaultFactory.deploy();
  await feeVault.waitForDeployment();
  const feeVaultAddress = await feeVault.getAddress();
  console.log("FeeVault deployed to:", feeVaultAddress);

  // 2. Deploy PumpFunFactory using FeeVault's address as the treasury parameter
  console.log("Deploying PumpFunFactory...");
  const PumpFunFactoryFactory = await ethers.getContractFactory("PumpFunFactory");
  const pumpFunFactory = await PumpFunFactoryFactory.deploy(feeVaultAddress);
  await pumpFunFactory.waitForDeployment();
  const pumpFunFactoryAddress = await pumpFunFactory.getAddress();
  console.log("PumpFunFactory deployed to:", pumpFunFactoryAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment error:", error);
    process.exit(1);
  });
