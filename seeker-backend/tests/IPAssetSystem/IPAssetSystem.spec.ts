import { expect } from "chai";
import { ethers } from "ethers";
import { IPAssetSystemDeployer } from "../../contracts/deploy-ip-system.sol";
import { IPAssetManagerV2 } from "../../contracts/IPAssetManagerV2.sol";
import { IPAssetNFT } from "../../contracts/IPAssetNFT.sol";

describe("IP Asset Management System", function () {
    let deployer: any;
    let ipAssetOwner: any;
    let licensee1: any;
    let licensee2: any;
    let revenuePayer: any;
    let deployerContract: any;
    let ipAssetManager: any;
    let ipAssetNFT: any;
    
    const IP_ASSET_NAME = "My Creative Book";
    const IP_ASSET_DESCRIPTION = "A revolutionary book about blockchain technology";
    const METADATA_URI = "ipfs://QmExampleMetadataHash";
    const IPFS_HASH = "QmExampleIPFSHash";
    const LICENSE_TERMS = "Commercial use allowed with attribution";
    const LICENSE_PRICE = ethers.parseEther("100"); // 100 KES
    const LICENSE_DURATION = 365 * 24 * 60 * 60; // 1 year
    const MAX_LICENSES = 10;
    const REVENUE_SHARE = 2000; // 20% (2000 basis points)
    const ENCRYPTED_TERMS = ethers.keccak256(ethers.toUtf8Bytes("encrypted_terms"));
    
    beforeEach(async function () {
        [deployer, ipAssetOwner, licensee1, licensee2, revenuePayer] = await ethers.getSigners();
        
        // Deploy the system
        const IPAssetSystemDeployerFactory = await ethers.getContractFactory("IPAssetSystemDeployer");
        deployerContract = await IPAssetSystemDeployerFactory.deploy();
        await deployerContract.waitForDeployment();
        
        // Get deployed contract addresses
        const [nftAddress, managerAddress] = await deployerContract.getDeployedAddresses();
        
        // Get contract instances
        ipAssetNFT = await ethers.getContractAt("IPAssetNFT", nftAddress);
        ipAssetManager = await ethers.getContractAt("IPAssetManagerV2", managerAddress);
        
        // Transfer ownership to deployer for testing
        await deployerContract.transferManagerOwnership(deployer.address);
    });
    
    describe("Deployment", function () {
        it("Should deploy all contracts correctly", async function () {
            expect(await ipAssetNFT.name()).to.equal("IP Asset NFT");
            expect(await ipAssetNFT.symbol()).to.equal("IPNFT");
            expect(await ipAssetManager.owner()).to.equal(deployer.address);
        });
        
        it("Should link NFT contract to manager", async function () {
            expect(await ipAssetNFT.ipAssetManager()).to.equal(await ipAssetManager.getAddress());
        });
    });
    
    describe("IP Asset Registration", function () {
        it("Should register a new IP asset and mint NFT", async function () {
            const tx = await ipAssetManager.connect(ipAssetOwner).registerIPAsset(
                IP_ASSET_NAME,
                IP_ASSET_DESCRIPTION,
                METADATA_URI,
                IPFS_HASH
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find((log: any) => 
                log.fragment?.name === "IPAssetRegistered"
            );
            
            expect(event).to.not.be.undefined;
            expect(event.args.assetId).to.equal(1);
            expect(event.args.owner).to.equal(ipAssetOwner.address);
            expect(event.args.name).to.equal(IP_ASSET_NAME);
            expect(event.args.nftTokenId).to.equal(1);
            
            // Check NFT ownership
            expect(await ipAssetNFT.ownerOf(1)).to.equal(ipAssetOwner.address);
            expect(await ipAssetNFT.tokenURI(1)).to.equal(METADATA_URI);
            
            // Check IP asset details
            const asset = await ipAssetManager.getIPAsset(1);
            expect(asset.name).to.equal(IP_ASSET_NAME);
            expect(asset.owner).to.equal(ipAssetOwner.address);
            expect(asset.nftTokenId).to.equal(1);
            expect(asset.ipfsHash).to.equal(IPFS_HASH);
        });
        
        it("Should prevent duplicate IPFS hash registration", async function () {
            await ipAssetManager.connect(ipAssetOwner).registerIPAsset(
                IP_ASSET_NAME,
                IP_ASSET_DESCRIPTION,
                METADATA_URI,
                IPFS_HASH
            );
            
            await expect(
                ipAssetManager.connect(licensee1).registerIPAsset(
                    "Another Asset",
                    "Another description",
                    "ipfs://another",
                    IPFS_HASH
                )
            ).to.be.revertedWith("IPFS hash already registered");
        });
        
        it("Should prevent empty name or metadata", async function () {
            await expect(
                ipAssetManager.connect(ipAssetOwner).registerIPAsset(
                    "",
                    IP_ASSET_DESCRIPTION,
                    METADATA_URI,
                    IPFS_HASH
                )
            ).to.be.revertedWith("Name cannot be empty");
            
            await expect(
                ipAssetManager.connect(ipAssetOwner).registerIPAsset(
                    IP_ASSET_NAME,
                    IP_ASSET_DESCRIPTION,
                    "",
                    IPFS_HASH
                )
            ).to.be.revertedWith("Metadata URI cannot be empty");
        });
    });
    
    describe("License Management", function () {
        let assetId: number;
        
        beforeEach(async function () {
            // Register an IP asset first
            const tx = await ipAssetManager.connect(ipAssetOwner).registerIPAsset(
                IP_ASSET_NAME,
                IP_ASSET_DESCRIPTION,
                METADATA_URI,
                IPFS_HASH
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find((log: any) => 
                log.fragment?.name === "IPAssetRegistered"
            );
            assetId = event.args.assetId;
        });
        
        it("Should attach license terms to IP asset", async function () {
            const tx = await ipAssetManager.connect(ipAssetOwner).attachLicenseTerms(
                assetId,
                LICENSE_TERMS,
                LICENSE_PRICE,
                LICENSE_DURATION,
                MAX_LICENSES,
                ENCRYPTED_TERMS,
                REVENUE_SHARE
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find((log: any) => 
                log.fragment?.name === "LicenseTermsAttached"
            );
            
            expect(event).to.not.be.undefined;
            expect(event.args.assetId).to.equal(assetId);
            expect(event.args.licenseId).to.equal(1);
            expect(event.args.terms).to.equal(LICENSE_TERMS);
            expect(event.args.price).to.equal(LICENSE_PRICE);
            expect(event.args.revenueShare).to.equal(REVENUE_SHARE);
            
            // Check license terms
            const license = await ipAssetManager.getLicenseTerms(1);
            expect(license.terms).to.equal(LICENSE_TERMS);
            expect(license.price).to.equal(LICENSE_PRICE);
            expect(license.revenueShare).to.equal(REVENUE_SHARE);
        });
        
        it("Should prevent non-owner from attaching license terms", async function () {
            await expect(
                ipAssetManager.connect(licensee1).attachLicenseTerms(
                    assetId,
                    LICENSE_TERMS,
                    LICENSE_PRICE,
                    LICENSE_DURATION,
                    MAX_LICENSES,
                    ENCRYPTED_TERMS,
                    REVENUE_SHARE
                )
            ).to.be.revertedWith("Not asset owner");
        });
        
        it("Should prevent invalid revenue share", async function () {
            await expect(
                ipAssetManager.connect(ipAssetOwner).attachLicenseTerms(
                    assetId,
                    LICENSE_TERMS,
                    LICENSE_PRICE,
                    LICENSE_DURATION,
                    MAX_LICENSES,
                    ENCRYPTED_TERMS,
                    10001 // More than 100%
                )
            ).to.be.revertedWith("Revenue share cannot exceed 100%");
        });
    });
    
    describe("License Token Minting", function () {
        let assetId: number;
        let licenseId: number;
        
        beforeEach(async function () {
            // Register IP asset and attach license terms
            const assetTx = await ipAssetManager.connect(ipAssetOwner).registerIPAsset(
                IP_ASSET_NAME,
                IP_ASSET_DESCRIPTION,
                METADATA_URI,
                IPFS_HASH
            );
            const assetReceipt = await assetTx.wait();
            const assetEvent = assetReceipt.logs.find((log: any) => 
                log.fragment?.name === "IPAssetRegistered"
            );
            assetId = assetEvent.args.assetId;
            
            const licenseTx = await ipAssetManager.connect(ipAssetOwner).attachLicenseTerms(
                assetId,
                LICENSE_TERMS,
                LICENSE_PRICE,
                LICENSE_DURATION,
                MAX_LICENSES,
                ENCRYPTED_TERMS,
                REVENUE_SHARE
            );
            const licenseReceipt = await licenseTx.wait();
            const licenseEvent = licenseReceipt.logs.find((log: any) => 
                log.fragment?.name === "LicenseTermsAttached"
            );
            licenseId = licenseEvent.args.licenseId;
        });
        
        it("Should mint license token with correct payment", async function () {
            const tx = await ipAssetManager.connect(licensee1).mintLicenseToken(
                assetId,
                licenseId,
                { value: LICENSE_PRICE }
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find((log: any) => 
                log.fragment?.name === "LicenseTokenMinted"
            );
            
            expect(event).to.not.be.undefined;
            expect(event.args.assetId).to.equal(assetId);
            expect(event.args.licenseId).to.equal(licenseId);
            expect(event.args.licensee).to.equal(licensee1.address);
            expect(event.args.revenueShare).to.equal(REVENUE_SHARE);
            
            // Check license token details
            const licenseToken = await ipAssetManager.getLicenseToken(1);
            expect(licenseToken.assetId).to.equal(assetId);
            expect(licenseToken.licensee).to.equal(licensee1.address);
            expect(licenseToken.isValid).to.be.true;
            expect(licenseToken.revenueShare).to.equal(REVENUE_SHARE);
            
            // Check payment transfer
            const initialBalance = await ethers.provider.getBalance(ipAssetOwner.address);
            expect(initialBalance).to.be.gt(0);
        });
        
        it("Should prevent minting with insufficient payment", async function () {
            const insufficientPrice = LICENSE_PRICE - ethers.parseEther("1");
            
            await expect(
                ipAssetManager.connect(licensee1).mintLicenseToken(
                    assetId,
                    licenseId,
                    { value: insufficientPrice }
                )
            ).to.be.revertedWith("Insufficient payment");
        });
        
        it("Should prevent duplicate license minting for same asset", async function () {
            // Mint first license
            await ipAssetManager.connect(licensee1).mintLicenseToken(
                assetId,
                licenseId,
                { value: LICENSE_PRICE }
            );
            
            // Try to mint another license for same asset
            await expect(
                ipAssetManager.connect(licensee1).mintLicenseToken(
                    assetId,
                    licenseId,
                    { value: LICENSE_PRICE }
                )
            ).to.be.revertedWith("User already has valid license for this asset");
        });
        
        it("Should prevent minting from non-existent asset", async function () {
            await expect(
                ipAssetManager.connect(licensee1).mintLicenseToken(
                    999, // Non-existent asset
                    licenseId,
                    { value: LICENSE_PRICE }
                )
            ).to.be.revertedWith("Asset does not exist");
        });
    });
    
    describe("Revenue and Royalty Management", function () {
        let assetId: number;
        let licenseId: number;
        
        beforeEach(async function () {
            // Setup: Register asset, attach license, mint license token
            const assetTx = await ipAssetManager.connect(ipAssetOwner).registerIPAsset(
                IP_ASSET_NAME,
                IP_ASSET_DESCRIPTION,
                METADATA_URI,
                IPFS_HASH
            );
            const assetReceipt = await assetTx.wait();
            const assetEvent = assetReceipt.logs.find((log: any) => 
                log.fragment?.name === "IPAssetRegistered"
            );
            assetId = assetEvent.args.assetId;
            
            const licenseTx = await ipAssetManager.connect(ipAssetOwner).attachLicenseTerms(
                assetId,
                LICENSE_TERMS,
                LICENSE_PRICE,
                LICENSE_DURATION,
                MAX_LICENSES,
                ENCRYPTED_TERMS,
                REVENUE_SHARE
            );
            const licenseReceipt = await licenseTx.wait();
            const licenseEvent = licenseReceipt.logs.find((log: any) => 
                log.fragment?.name === "LicenseTermsAttached"
            );
            licenseId = licenseEvent.args.licenseId;
            
            await ipAssetManager.connect(licensee1).mintLicenseToken(
                assetId,
                licenseId,
                { value: LICENSE_PRICE }
            );
        });
        
        it("Should receive and distribute revenue correctly", async function () {
            const revenueAmount = ethers.parseEther("1000"); // 1000 KES
            
            const tx = await ipAssetManager.connect(revenuePayer).payIPAsset(
                assetId,
                "Book sales revenue",
                { value: revenueAmount }
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find((log: any) => 
                log.fragment?.name === "RevenueReceived"
            );
            
            expect(event).to.not.be.undefined;
            expect(event.args.assetId).to.equal(assetId);
            expect(event.args.amount).to.equal(revenueAmount);
            expect(event.args.reason).to.equal("Book sales revenue");
            
            // Check asset revenue
            const asset = await ipAssetManager.getIPAsset(assetId);
            expect(asset.totalRevenue).to.equal(revenueAmount);
            
            // Check royalty distributions
            const ownerRoyalty = await ipAssetManager.getRoyaltyBalance(assetId, ipAssetOwner.address);
            const licenseeRoyalty = await ipAssetManager.getRoyaltyBalance(assetId, licensee1.address);
            
            // Owner should get 80% (100% - 20% licensee share)
            expect(ownerRoyalty).to.equal(ethers.parseEther("800"));
            // Licensee should get 20%
            expect(licenseeRoyalty).to.equal(ethers.parseEther("200"));
        });
        
        it("Should allow users to claim royalties", async function () {
            const revenueAmount = ethers.parseEther("1000");
            
            // Pay revenue first
            await ipAssetManager.connect(revenuePayer).payIPAsset(
                assetId,
                "Book sales revenue",
                { value: revenueAmount }
            );
            
            // Check initial balances
            const initialOwnerBalance = await ethers.provider.getBalance(ipAssetOwner.address);
            const initialLicenseeBalance = await ethers.provider.getBalance(licensee1.address);
            
            // Claim royalties
            await ipAssetManager.connect(ipAssetOwner).claimRoyalties(assetId);
            await ipAssetManager.connect(licensee1).claimRoyalties(assetId);
            
            // Check final balances
            const finalOwnerBalance = await ethers.provider.getBalance(ipAssetOwner.address);
            const finalLicenseeBalance = await ethers.provider.getBalance(licensee1.address);
            
            expect(finalOwnerBalance).to.be.gt(initialOwnerBalance);
            expect(finalLicenseeBalance).to.be.gt(initialLicenseeBalance);
            
            // Check that royalties are marked as claimed
            const ownerRoyalty = await ipAssetManager.getRoyaltyBalance(assetId, ipAssetOwner.address);
            const licenseeRoyalty = await ipAssetManager.getRoyaltyBalance(assetId, licensee1.address);
            
            expect(ownerRoyalty).to.equal(0); // Already claimed
            expect(licenseeRoyalty).to.equal(0); // Already claimed
        });
        
        it("Should prevent claiming when no royalties available", async function () {
            await expect(
                ipAssetManager.connect(ipAssetOwner).claimRoyalties(assetId)
            ).to.be.revertedWith("No royalties to claim");
        });
    });
    
    describe("Asset Transfer", function () {
        let assetId: number;
        
        beforeEach(async function () {
            // Register an IP asset
            const assetTx = await ipAssetManager.connect(ipAssetOwner).registerIPAsset(
                IP_ASSET_NAME,
                IP_ASSET_DESCRIPTION,
                METADATA_URI,
                IPFS_HASH
            );
            const assetReceipt = await assetTx.wait();
            const assetEvent = assetReceipt.logs.find((log: any) => 
                log.fragment?.name === "IPAssetRegistered"
            );
            assetId = assetEvent.args.assetId;
        });
        
        it("Should transfer IP asset ownership and NFT", async function () {
            const tx = await ipAssetManager.connect(ipAssetOwner).transferIPAsset(
                assetId,
                licensee1.address
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find((log: any) => 
                log.fragment?.name === "IPAssetTransferred"
            );
            
            expect(event).to.not.be.undefined;
            expect(event.args.assetId).to.equal(assetId);
            expect(event.args.from).to.equal(ipAssetOwner.address);
            expect(event.args.to).to.equal(licensee1.address);
            
            // Check new ownership
            const asset = await ipAssetManager.getIPAsset(assetId);
            expect(asset.owner).to.equal(licensee1.address);
            
            // Check NFT ownership
            const nftTokenId = asset.nftTokenId;
            expect(await ipAssetNFT.ownerOf(nftTokenId)).to.equal(licensee1.address);
            
            // Check user assets arrays
            const oldOwnerAssets = await ipAssetManager.getUserAssets(ipAssetOwner.address);
            const newOwnerAssets = await ipAssetManager.getUserAssets(licensee1.address);
            
            expect(oldOwnerAssets).to.not.include(assetId);
            expect(newOwnerAssets).to.include(assetId);
        });
        
        it("Should prevent transfer to invalid address", async function () {
            await expect(
                ipAssetManager.connect(ipAssetOwner).transferIPAsset(
                    assetId,
                    ethers.ZeroAddress
                )
            ).to.be.revertedWith("Invalid new owner");
        });
        
        it("Should prevent transfer to self", async function () {
            await expect(
                ipAssetManager.connect(ipAssetOwner).transferIPAsset(
                    assetId,
                    ipAssetOwner.address
                )
            ).to.be.revertedWith("Cannot transfer to self");
        });
    });
    
    describe("License Revocation", function () {
        let assetId: number;
        let licenseId: number;
        let licenseTokenId: number;
        
        beforeEach(async function () {
            // Setup: Register asset, attach license, mint license token
            const assetTx = await ipAssetManager.connect(ipAssetOwner).registerIPAsset(
                IP_ASSET_NAME,
                IP_ASSET_DESCRIPTION,
                METADATA_URI,
                IPFS_HASH
            );
            const assetReceipt = await assetTx.wait();
            const assetEvent = assetReceipt.logs.find((log: any) => 
                log.fragment?.name === "IPAssetRegistered"
            );
            assetId = assetEvent.args.assetId;
            
            const licenseTx = await ipAssetManager.connect(ipAssetOwner).attachLicenseTerms(
                assetId,
                LICENSE_TERMS,
                LICENSE_PRICE,
                LICENSE_DURATION,
                MAX_LICENSES,
                ENCRYPTED_TERMS,
                REVENUE_SHARE
            );
            const licenseReceipt = await licenseTx.wait();
            const licenseEvent = licenseReceipt.logs.find((log: any) => 
                log.fragment?.name === "LicenseTermsAttached"
            );
            licenseId = licenseEvent.args.licenseId;
            
            const mintTx = await ipAssetManager.connect(licensee1).mintLicenseToken(
                assetId,
                licenseId,
                { value: LICENSE_PRICE }
            );
            const mintReceipt = await mintTx.wait();
            const mintEvent = mintReceipt.logs.find((log: any) => 
                log.fragment?.name === "LicenseTokenMinted"
            );
            licenseTokenId = mintEvent.args.tokenId;
        });
        
        it("Should revoke license token by asset owner", async function () {
            const tx = await ipAssetManager.connect(ipAssetOwner).revokeLicenseToken(licenseTokenId);
            
            const receipt = await tx.wait();
            const event = receipt.logs.find((log: any) => 
                log.fragment?.name === "LicenseTokenRevoked"
            );
            
            expect(event).to.not.be.undefined;
            expect(event.args.tokenId).to.equal(licenseTokenId);
            expect(event.args.assetId).to.equal(assetId);
            expect(event.args.licensee).to.equal(licensee1.address);
            
            // Check license token is invalid
            const licenseToken = await ipAssetManager.getLicenseToken(licenseTokenId);
            expect(licenseToken.isValid).to.be.false;
        });
        
        it("Should prevent non-owner from revoking license", async function () {
            await expect(
                ipAssetManager.connect(licensee1).revokeLicenseToken(licenseTokenId)
            ).to.be.revertedWith("Only asset owner can revoke licenses");
        });
        
        it("Should prevent revoking already revoked license", async function () {
            // Revoke first time
            await ipAssetManager.connect(ipAssetOwner).revokeLicenseToken(licenseTokenId);
            
            // Try to revoke again
            await expect(
                ipAssetManager.connect(ipAssetOwner).revokeLicenseToken(licenseTokenId)
            ).to.be.revertedWith("License already revoked");
        });
    });
    
    describe("Query Functions", function () {
        let assetId: number;
        let licenseId: number;
        
        beforeEach(async function () {
            // Setup: Register asset and attach license
            const assetTx = await ipAssetManager.connect(ipAssetOwner).registerIPAsset(
                IP_ASSET_NAME,
                IP_ASSET_DESCRIPTION,
                METADATA_URI,
                IPFS_HASH
            );
            const assetReceipt = await assetTx.wait();
            const assetEvent = assetReceipt.logs.find((log: any) => 
                log.fragment?.name === "IPAssetRegistered"
            );
            assetId = assetEvent.args.assetId;
            
            const licenseTx = await ipAssetManager.connect(ipAssetOwner).attachLicenseTerms(
                assetId,
                LICENSE_TERMS,
                LICENSE_PRICE,
                LICENSE_DURATION,
                MAX_LICENSES,
                ENCRYPTED_TERMS,
                REVENUE_SHARE
            );
            const licenseReceipt = await licenseTx.wait();
            const licenseEvent = licenseReceipt.logs.find((log: any) => 
                log.fragment?.name === "LicenseTermsAttached"
            );
            licenseId = licenseEvent.args.licenseId;
        });
        
        it("Should return correct user assets", async function () {
            const userAssets = await ipAssetManager.getUserAssets(ipAssetOwner.address);
            expect(userAssets).to.include(assetId);
            expect(userAssets.length).to.equal(1);
        });
        
        it("Should return correct user licenses", async function () {
            // Mint a license first
            await ipAssetManager.connect(licensee1).mintLicenseToken(
                assetId,
                licenseId,
                { value: LICENSE_PRICE }
            );
            
            const userLicenses = await ipAssetManager.getUserLicenses(licensee1.address);
            expect(userLicenses.length).to.equal(1);
            expect(userLicenses[0]).to.equal(1); // First license token ID
        });
        
        it("Should check license validity correctly", async function () {
            // No license yet
            expect(await ipAssetManager.hasValidLicense(assetId, licensee1.address)).to.be.false;
            
            // Mint license
            await ipAssetManager.connect(licensee1).mintLicenseToken(
                assetId,
                licenseId,
                { value: LICENSE_PRICE }
            );
            
            // Should have valid license now
            expect(await ipAssetManager.hasValidLicense(assetId, licensee1.address)).to.be.true;
        });
        
        it("Should return correct royalty balance", async function () {
            // Pay some revenue
            const revenueAmount = ethers.parseEther("1000");
            await ipAssetManager.connect(revenuePayer).payIPAsset(
                assetId,
                "Test revenue",
                { value: revenueAmount }
            );
            
            const ownerRoyalty = await ipAssetManager.getRoyaltyBalance(assetId, ipAssetOwner.address);
            expect(ownerRoyalty).to.be.gt(0);
        });
    });
    
    describe("Emergency Functions", function () {
        it("Should allow owner to withdraw stuck funds", async function () {
            // Send some ETH to contract
            await deployer.sendTransaction({
                to: await ipAssetManager.getAddress(),
                value: ethers.parseEther("1")
            });
            
            const initialBalance = await ethers.provider.getBalance(deployer.address);
            
            await ipAssetManager.emergencyWithdraw();
            
            const finalBalance = await ethers.provider.getBalance(deployer.address);
            expect(finalBalance).to.be.gt(initialBalance);
        });
        
        it("Should prevent non-owner from emergency withdrawal", async function () {
            await expect(
                ipAssetManager.connect(licensee1).emergencyWithdraw()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
}); 