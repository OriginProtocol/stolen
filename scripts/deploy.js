const path = require("path");
const { ethers, upgrades } = require("hardhat");

async function main() {
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which" +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
    );
  }

  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Stolen = await ethers.getContractFactory("Stolen");
  const instance = await upgrades.deployProxy(Stolen);
  await instance.deployed();

  console.log("Stolen implementation contract address:", instance.address);

  // set the owner collection limit to 3
  await instance.setMaxOwnerCollectionSize(3);
  // set the default royalty to 10%
  await instance.setDefaultRoyalty(deployer.address, 1000);
  // set the price change to 100%
  await instance.setPriceChangeRate(10000);
  // set the minimum purchase threshold to 0.01 ETH
  await instance.setPurchaseThreshold(ethers.utils.parseEther('0.01'));

  saveFrontendFiles(instance);
}

function saveFrontendFiles(instance) {
  const fs = require("fs");
  const contractsDir = path.join(__dirname, "..", "dapp", "client", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ Stolen: instance.address }, undefined, 2)
  );

  const StolenArtifact = artifacts.readArtifactSync("Stolen");

  fs.writeFileSync(
    path.join(contractsDir, "Stolen.json"),
    JSON.stringify(StolenArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
