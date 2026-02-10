import { ethers } from "hardhat";
import { loadDeploymentAddress, optionalEnv, requireEnv } from "./helpers";

async function main() {
  const [admin] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  const contractAddress =
    optionalEnv("CONTRACT_ADDRESS") ?? loadDeploymentAddress(network.name) ?? requireEnv("CONTRACT_ADDRESS");

  const seriesId = BigInt(optionalEnv("SERIES_ID", "1")!);
  const maxSupply = BigInt(optionalEnv("MAX_SUPPLY", "10")!);
  const metadataRoot = optionalEnv("SERIES_METADATA_ROOT", "ipfs://<CID>/")!;

  const nft = await ethers.getContractAt("TrendMint721", contractAddress);

  console.log(`Network: ${network.name}`);
  console.log(`Admin (caller): ${admin.address}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Creating seriesId=${seriesId}, maxSupply=${maxSupply}, metadataRoot="${metadataRoot}"`);

  const tx = await nft.createSeries(seriesId, maxSupply, metadataRoot);
  const receipt = await tx.wait();

  console.log(`Tx hash: ${receipt?.hash ?? tx.hash}`);
  console.log(`Done.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

