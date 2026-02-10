import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log(`Network: ${network.name} (chainId=${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);

  const TrendMint721 = await ethers.getContractFactory("TrendMint721");
  const nft = await TrendMint721.deploy("TrendMint721", "TREND", deployer.address);
  await nft.waitForDeployment();

  const address = await nft.getAddress();
  const txHash = nft.deploymentTransaction()?.hash ?? "";

  console.log(`TrendMint721 deployed at: ${address}`);
  if (txHash) console.log(`Deployment tx: ${txHash}`);

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const out = {
    network: network.name,
    chainId: network.chainId.toString(),
    TrendMint721: {
      address,
      deployer: deployer.address,
      txHash,
      constructorArgs: ["TrendMint721", "TREND", deployer.address]
    }
  };

  const file = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`Saved deployment file: ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

