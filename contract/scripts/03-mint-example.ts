import { ethers } from "hardhat";
import { loadDeploymentAddress, optionalEnv, requireEnv } from "./helpers";

async function main() {
  const [caller] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  const contractAddress =
    optionalEnv("CONTRACT_ADDRESS") ?? loadDeploymentAddress(network.name) ?? requireEnv("CONTRACT_ADDRESS");

  const seriesId = BigInt(optionalEnv("SERIES_ID", "1")!);
  const to = optionalEnv("TO_ADDRESS", caller.address)!;
  const tokenURI = optionalEnv("TOKEN_URI", "ipfs://<CID>/metadata.json")!;

  const nft = await ethers.getContractAt("TrendMint721", contractAddress);

  console.log(`Network: ${network.name}`);
  console.log(`Caller (must have MINTER_ROLE): ${caller.address}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Minting from seriesId=${seriesId} to=${to}`);
  console.log(`tokenURI=${tokenURI}`);

  const tx = await nft.mintFromSeries(seriesId, to, tokenURI);
  const receipt = await tx.wait();

  const event = receipt?.logs
    .map((l) => {
      try {
        return nft.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((p) => p?.name === "TokenMinted");

  const tokenId = event?.args?.tokenId?.toString?.() ?? "(unknown)";
  console.log(`Tx hash: ${receipt?.hash ?? tx.hash}`);
  console.log(`Minted tokenId: ${tokenId}`);
  console.log(`Done.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

