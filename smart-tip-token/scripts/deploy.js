const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const SmartTipToken = await hre.ethers.getContractFactory("SmartTipToken");
  const token = await SmartTipToken.deploy(deployer.address);
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  const initialSupply = await token.INITIAL_SUPPLY();
  const maxSupply = await token.MAX_SUPPLY();
  const totalSupply = await token.totalSupply();
  const minterRole = await token.MINTER_ROLE();
  const pauserRole = await token.PAUSER_ROLE();

  console.log("Token deployed to:", tokenAddress);
  console.log("Initial Supply:", hre.ethers.formatUnits(initialSupply, 18), "STT");
  console.log("Max Supply:", hre.ethers.formatUnits(maxSupply, 18), "STT");
  console.log("Current Total Supply:", hre.ethers.formatUnits(totalSupply, 18), "STT");
  console.log("MINTER_ROLE:", minterRole);
  console.log("PAUSER_ROLE:", pauserRole);

  console.log("\\nVerify command:");
  console.log(`npx hardhat verify --network sepolia ${tokenAddress} ${deployer.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
