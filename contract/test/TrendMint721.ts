import { expect } from "chai";
import { ethers } from "hardhat";

describe("TrendMint721", function () {
  async function deployFixture() {
    const [admin, backendMinter, alice, bob] = await ethers.getSigners();

    const TrendMint721 = await ethers.getContractFactory("TrendMint721");
    const nft = await TrendMint721.deploy("TrendMint721", "TREND", admin.address);
    await nft.waitForDeployment();

    return { nft, admin, backendMinter, alice, bob };
  }

  describe("createSeries", function () {
    it("creates a series and stores info", async function () {
      const { nft } = await deployFixture();

      await expect(nft.createSeries(1n, 3n, "ipfs://seriesRoot/"))
        .to.emit(nft, "SeriesCreated")
        .withArgs(1n, 3n, "ipfs://seriesRoot/");

      const info = await nft.seriesInfo(1n);
      expect(info.maxSupply).to.equal(3n);
      expect(info.mintedCount).to.equal(0n);
      expect(info.metadataRoot).to.equal("ipfs://seriesRoot/");
    });

    it("reverts on duplicate series", async function () {
      const { nft } = await deployFixture();
      await nft.createSeries(1n, 1n, "ipfs://root/");

      await expect(nft.createSeries(1n, 2n, "ipfs://root2/"))
        .to.be.revertedWithCustomError(nft, "SeriesAlreadyExists")
        .withArgs(1n);
    });

    it("reverts when maxSupply is 0", async function () {
      const { nft } = await deployFixture();
      await expect(nft.createSeries(1n, 0n, "ipfs://root/")).to.be.revertedWithCustomError(nft, "InvalidMaxSupply");
    });
  });

  describe("mintFromSeries", function () {
    it("only MINTER_ROLE can mint", async function () {
      const { nft, admin, alice } = await deployFixture();
      await nft.createSeries(1n, 1n, "ipfs://root/");

      const MINTER_ROLE = await nft.MINTER_ROLE();
      await expect(nft.connect(alice).mintFromSeries(1n, alice.address, "ipfs://cid/1.json"))
        .to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount")
        .withArgs(alice.address, MINTER_ROLE);

      await nft.grantRole(MINTER_ROLE, admin.address);
      await expect(nft.mintFromSeries(1n, alice.address, "ipfs://cid/1.json")).to.emit(nft, "TokenMinted");
    });

    it("enforces series max supply", async function () {
      const { nft, admin, backendMinter, alice } = await deployFixture();
      await nft.createSeries(1n, 2n, "ipfs://root/");

      const MINTER_ROLE = await nft.MINTER_ROLE();
      await nft.grantRole(MINTER_ROLE, backendMinter.address);

      await expect(nft.connect(backendMinter).mintFromSeries(1n, alice.address, "ipfs://cid/1.json"))
        .to.emit(nft, "TokenMinted")
        .withArgs(1n, 1n, 1n, alice.address, "ipfs://cid/1.json");

      await expect(nft.connect(backendMinter).mintFromSeries(1n, alice.address, "ipfs://cid/2.json"))
        .to.emit(nft, "TokenMinted")
        .withArgs(2n, 1n, 2n, alice.address, "ipfs://cid/2.json");

      await expect(nft.connect(backendMinter).mintFromSeries(1n, alice.address, "ipfs://cid/3.json"))
        .to.be.revertedWithCustomError(nft, "SeriesMaxSupplyExceeded")
        .withArgs(1n);

      // Admin is not automatically a minter; keep roles separated.
      await expect(nft.connect(admin).mintFromSeries(1n, alice.address, "ipfs://cid/4.json"))
        .to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount");
    });

    it("tracks seriesId + editionNumber and sets tokenURI", async function () {
      const { nft, backendMinter, alice } = await deployFixture();
      await nft.createSeries(7n, 3n, "ipfs://seriesRoot/");

      const MINTER_ROLE = await nft.MINTER_ROLE();
      await nft.grantRole(MINTER_ROLE, backendMinter.address);

      await nft.connect(backendMinter).mintFromSeries(7n, alice.address, "ipfs://cid/metadata-1.json");
      await nft.connect(backendMinter).mintFromSeries(7n, alice.address, "ipfs://cid/metadata-2.json");

      expect(await nft.ownerOf(1n)).to.equal(alice.address);
      expect(await nft.tokenSeriesId(1n)).to.equal(7n);
      expect(await nft.tokenEditionNumber(1n)).to.equal(1n);
      expect(await nft.tokenURI(1n)).to.equal("ipfs://cid/metadata-1.json");

      expect(await nft.tokenSeriesId(2n)).to.equal(7n);
      expect(await nft.tokenEditionNumber(2n)).to.equal(2n);
      expect(await nft.tokenURI(2n)).to.equal("ipfs://cid/metadata-2.json");
    });

    it("reverts if series does not exist", async function () {
      const { nft, backendMinter, alice } = await deployFixture();
      const MINTER_ROLE = await nft.MINTER_ROLE();
      await nft.grantRole(MINTER_ROLE, backendMinter.address);

      await expect(nft.connect(backendMinter).mintFromSeries(123n, alice.address, "ipfs://cid/1.json"))
        .to.be.revertedWithCustomError(nft, "SeriesDoesNotExist")
        .withArgs(123n);
    });
  });

  describe("batchMintFromSeries", function () {
    it("reverts on length mismatch", async function () {
      const { nft, backendMinter, alice, bob } = await deployFixture();
      await nft.createSeries(1n, 10n, "ipfs://root/");

      const MINTER_ROLE = await nft.MINTER_ROLE();
      await nft.grantRole(MINTER_ROLE, backendMinter.address);

      await expect(
        nft
          .connect(backendMinter)
          .batchMintFromSeries(1n, [alice.address, bob.address], ["ipfs://cid/1.json"])
      )
        .to.be.revertedWithCustomError(nft, "ArrayLengthMismatch")
        .withArgs(2n, 1n);
    });

    it("reverts when exceeding series max supply", async function () {
      const { nft, backendMinter, alice, bob } = await deployFixture();
      await nft.createSeries(1n, 1n, "ipfs://root/");

      const MINTER_ROLE = await nft.MINTER_ROLE();
      await nft.grantRole(MINTER_ROLE, backendMinter.address);

      await expect(
        nft
          .connect(backendMinter)
          .batchMintFromSeries(1n, [alice.address, bob.address], ["ipfs://cid/1.json", "ipfs://cid/2.json"])
      )
        .to.be.revertedWithCustomError(nft, "SeriesMaxSupplyExceeded")
        .withArgs(1n);
    });

    it("mints multiple tokens and returns tokenIds", async function () {
      const { nft, backendMinter, alice, bob } = await deployFixture();
      await nft.createSeries(5n, 10n, "ipfs://root/");

      const MINTER_ROLE = await nft.MINTER_ROLE();
      await nft.grantRole(MINTER_ROLE, backendMinter.address);

      const tx = await nft
        .connect(backendMinter)
        .batchMintFromSeries(5n, [alice.address, bob.address], ["ipfs://cid/a.json", "ipfs://cid/b.json"]);
      const receipt = await tx.wait();
      expect(receipt).to.not.equal(null);

      expect(await nft.ownerOf(1n)).to.equal(alice.address);
      expect(await nft.ownerOf(2n)).to.equal(bob.address);
      expect(await nft.tokenEditionNumber(1n)).to.equal(1n);
      expect(await nft.tokenEditionNumber(2n)).to.equal(2n);
    });
  });

  describe("AccessControl", function () {
    it("admin can grant/revoke MINTER_ROLE", async function () {
      const { nft, admin, backendMinter } = await deployFixture();
      const MINTER_ROLE = await nft.MINTER_ROLE();

      expect(await nft.hasRole(MINTER_ROLE, backendMinter.address)).to.equal(false);
      await nft.connect(admin).grantRole(MINTER_ROLE, backendMinter.address);
      expect(await nft.hasRole(MINTER_ROLE, backendMinter.address)).to.equal(true);

      await nft.connect(admin).revokeRole(MINTER_ROLE, backendMinter.address);
      expect(await nft.hasRole(MINTER_ROLE, backendMinter.address)).to.equal(false);
    });
  });
});

