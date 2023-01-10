const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const TWITTER_ID = '928647522817417216'; // @originprotocol

describe("Stolen contract", function () {
  async function deployStolenFixture() {
    const Stolen = await ethers.getContractFactory("Stolen");
    const StolenV2 = await ethers.getContractFactory("Stolen");
    const [owner, addr1, addr2] = await ethers.getSigners();
    const instance = await upgrades.deployProxy(Stolen);
    const upgraded = await upgrades.upgradeProxy(instance.address, StolenV2);

    // set the required price increase to 100%
    await instance.setPriceChangeRate(10000);

    // set the required minimum purchase threshold to 0.01 ETH
    await instance.setPurchaseThreshold(ethers.utils.parseEther('0.01'));

    return { Stolen, instance, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { instance, owner } = await loadFixture(deployStolenFixture);

      expect(await instance.owner()).to.equal(owner.address);
    });
  });

  describe("Royalty configuration", function () {
    it("Should set the royalty amount and receiver", async function () {
      const { instance, owner } = await loadFixture(deployStolenFixture);

      // set the default royalty to 1% for the deployer
      await instance.setDefaultRoyalty(owner.address, 100);

      // mint an NFT
      await instance.safeMint(owner.address, TWITTER_ID);
      // confirm that the NFT's royalty info matches the default
      const [receiver, amount] = await instance.royaltyInfo(TWITTER_ID, ethers.utils.parseEther('1'));
      expect(receiver).to.equal(owner.address);
      expect(amount).to.equal(ethers.utils.parseEther('0.01'));
    })
  });

  describe("Price parameters configuration", function () {
    it("Should have a price change rate", async function () {
      const { instance } = await loadFixture(deployStolenFixture);

      expect(await instance.priceChangeRate()).to.equal(10000);
    });

    it("Should have a price threshold", async function () {
      const { instance } = await loadFixture(deployStolenFixture);

      expect(await instance.purchaseThreshold()).to.equal(ethers.utils.parseEther('0.01'));
    });
  });

  describe("Minting", function () {
    it("Should transfer an NFT to the desired address upon minting", async function () {
      const { instance, owner, addr1, addr2 } = await loadFixture(deployStolenFixture);

      await instance.safeMint(addr1.address, TWITTER_ID);
      expect(await instance.ownerOf(TWITTER_ID)).to.equal(addr1.address);
    });

    it("Should not allow a second NFT to be minted with the same Twitter ID", async function () {
      const { instance, owner, addr1, addr2 } = await loadFixture(deployStolenFixture);
      
      await instance.safeMint(addr1.address, TWITTER_ID);
      await expect(
        instance.safeMint(owner.address, TWITTER_ID)
      ).to.be.revertedWith("ERC721: token already minted");
    });

    it("Should not allow a second NFT to be minted and transferred to the same address", async function () {
      const { instance, owner, addr1, addr2 } = await loadFixture(deployStolenFixture);
      
      await instance.safeMint(addr1.address, 123456789);
      await expect(
        instance.safeMint(addr1.address, TWITTER_ID)
      ).to.be.revertedWith("Address cannot own more than one token at a time");
    });

    it("Should prevent an NFT to be transferred without a purchase", async function () {
      const { instance, owner, addr1, addr2 } = await loadFixture(deployStolenFixture);
      
      await instance.safeMint(addr1.address, TWITTER_ID);
      await instance.transferFrom(addr1.address, owner.address, TWITTER_ID);

      expect(await instance.ownerOf(TWITTER_ID)).to.equal(addr1.address);
    });
  });

  describe("Purchasing", function () {
    it("Should return a price of 0 for a newly minted NFT", async function () {
      const { instance, owner, addr1, addr2 } = await loadFixture(deployStolenFixture);
      
      await instance.safeMint(addr1.address, TWITTER_ID);
      expect(await instance.lastPrices(TWITTER_ID)).to.equal(0);
    });

    it("Should prevent a purchase with no payment", async function () {
      const { instance, owner, addr1, addr2 } = await loadFixture(deployStolenFixture);

      await instance.safeMint(addr1.address, TWITTER_ID);
      await expect(
        instance["purchase(uint256)"](TWITTER_ID)
      ).to.be.revertedWith("Price must be greater than minimum purchase threshold");
    });

    it("Should allow a purchase with a large payment", async function () {
      const { instance, owner, addr1, addr2 } = await loadFixture(deployStolenFixture);

      await instance.safeMint(addr1.address, TWITTER_ID);
      await instance["purchase(uint256)"](TWITTER_ID, { value: ethers.utils.parseEther("1") });
      expect(await instance.ownerOf(TWITTER_ID)).to.equal(owner.address);
    });

    it("Should prevent a second purchase with payment equal to the first purchase", async function () {
      const { instance, owner, addr1, addr2 } = await loadFixture(deployStolenFixture);

      await instance.safeMint(addr1.address, TWITTER_ID);
      await instance["purchase(uint256)"](TWITTER_ID, { value: ethers.utils.parseEther("1") });

      await expect(
        instance.connect(addr2)["purchase(uint256)"](TWITTER_ID, { value: ethers.utils.parseEther("1") })
      ).to.be.revertedWith("Price must be greater than minimum change");
    });

    it("Should report the correct minimum price after two purchases", async function () {
      const { instance, owner, addr1, addr2 } = await loadFixture(deployStolenFixture);

      await instance.safeMint(addr1.address, TWITTER_ID);
      await instance["purchase(uint256)"](TWITTER_ID, { value: ethers.utils.parseEther("1") });
      await instance.connect(addr2)["purchase(uint256)"](TWITTER_ID, { value: ethers.utils.parseEther("2") });

      expect(await instance.minPrice(TWITTER_ID)).to.equal(ethers.utils.parseEther("4"));
    });
  });
})