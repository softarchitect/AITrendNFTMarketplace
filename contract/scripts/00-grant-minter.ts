import { ethers } from "hardhat";
import { loadDeploymentAddress, optionalEnv, requireEnv } from "./helpers";

async function main() {
  const [admin] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  const contractAddress =
    optionalEnv("CONTRACT_ADDRESS") ?? loadDeploymentAddress(network.name) ?? requireEnv("CONTRACT_ADDRESS");
  const minterAddress = requireEnv("MINTER_ADDRESS");

  const nft = await ethers.getContractAt("TrendMint721", contractAddress);
  const MINTER_ROLE = await nft.MINTER_ROLE();

  console.log(`Network: ${network.name}`);
  console.log(`Admin (caller): ${admin.address}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Granting MINTER_ROLE to: ${minterAddress}`);

  const tx = await nft.grantRole(MINTER_ROLE, minterAddress);
  const receipt = await tx.wait();

  console.log(`Tx hash: ${receipt?.hash ?? tx.hash}`);
  console.log(`Done.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

