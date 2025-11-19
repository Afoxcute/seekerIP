import { ethers } from 'ethers';
import { prisma } from '../lib/prisma';
import IPAssetManagerService from '../lib/ip-asset-manager';
import config from '../env.config';

// Contract addresses
const IP_ASSET_MANAGER_ENHANCED_ADDRESS = config.contracts.ipAssetManagerEnhanced;
const IP_ASSET_MANAGER_ADDRESS = config.contracts.ipAssetManager;

// Event signatures
const IP_ASSET_REGISTERED_EVENT = 'IPAssetRegistered(uint256,string,address,string)';
const LICENSE_ATTACHED_EVENT = 'LicenseAttached(uint256,uint256,string)';
const LICENSE_TOKEN_MINTED_EVENT = 'LicenseTokenMinted(uint256,address,uint256,uint256)';
const REVENUE_PAID_EVENT = 'RevenuePaid(uint256,address,uint256,string)';
const ROYALTY_CLAIMED_EVENT = 'RoyaltyClaimed(uint256,address,uint256)';
const IP_ASSET_TRANSFERRED_EVENT = 'IPAssetTransferred(uint256,address,address)';

export class IPAssetManagerIndexer {
  private provider: ethers.JsonRpcProvider;
  private enhancedContract: ethers.Contract;
  private basicContract: ethers.Contract;
  private service: IPAssetManagerService;
  private lastProcessedBlock: number = 0;

  constructor(rpcUrl: string = config.network.rpcUrl) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.enhancedContract = new ethers.Contract(
      IP_ASSET_MANAGER_ENHANCED_ADDRESS,
      ['event IPAssetRegistered(uint256 indexed ipAssetId, string name, address indexed owner, string ipfsHash)'],
      this.provider
    );
    this.basicContract = new ethers.Contract(
      IP_ASSET_MANAGER_ADDRESS,
      ['event IPAssetRegistered(uint256 indexed ipAssetId, string name, address indexed owner)'],
      this.provider
    );
    this.service = new IPAssetManagerService(rpcUrl);
  }

  async startIndexing() {
    console.log('🚀 Starting IP Asset Manager event indexing...');
    
    // Get last processed block from database or start from current block
    const lastBlock = await this.getLastProcessedBlock();
    this.lastProcessedBlock = lastBlock;

    // Start listening for new blocks
    this.provider.on('block', async (blockNumber: number) => {
      await this.processBlock(blockNumber);
    });

    // Process any missed blocks
    const currentBlock = await this.provider.getBlockNumber();
    for (let block = this.lastProcessedBlock + 1; block <= currentBlock; block++) {
      await this.processBlock(block);
    }
  }

  private async getLastProcessedBlock(): Promise<number> {
    try {
      // You could store this in a separate table or use a config table
      const config = await prisma.platformConfig.findFirst();
      return config ? parseInt(config.id) : 0;
    } catch (error) {
      console.error('Error getting last processed block:', error);
      return 0;
    }
  }

  private async updateLastProcessedBlock(blockNumber: number) {
    try {
      await prisma.platformConfig.upsert({
        where: { id: 'last_processed_block' },
        update: { id: blockNumber.toString() },
        create: { 
          id: 'last_processed_block',
          platformFeePercentage: 250,
          platformFeeCollector: '0x9404966338eB27aF420a952574d777598Bbb58c4'
        }
      });
    } catch (error) {
      console.error('Error updating last processed block:', error);
    }
  }

  private async processBlock(blockNumber: number) {
    try {
      console.log(`📦 Processing block ${blockNumber}...`);

      // Get block (transactions are hashes in v6)
      const block = await this.provider.getBlock(blockNumber);
      if (!block) return;

      // Process each transaction in the block
      for (const txHash of block.transactions) {
        const receipt = await this.provider.getTransactionReceipt(txHash);
        if (!receipt) continue;

        const to = receipt.to?.toLowerCase();
        if (
          to === IP_ASSET_MANAGER_ENHANCED_ADDRESS.toLowerCase() ||
          to === IP_ASSET_MANAGER_ADDRESS.toLowerCase()
        ) {
          await this.processReceipt(receipt);
        }
      }

      this.lastProcessedBlock = blockNumber;
      await this.updateLastProcessedBlock(blockNumber);

    } catch (error) {
      console.error(`Error processing block ${blockNumber}:`, error);
    }
  }

  private async processReceipt(receipt: ethers.TransactionReceipt) {
    try {
      console.log(`🔍 Processing transaction ${receipt.hash}...`);

      // Process logs
      for (const log of receipt.logs) {
        await this.processLog(log, receipt);
      }

    } catch (error) {
      console.error(`Error processing transaction ${receipt.hash}:`, error);
    }
  }

  private async processLog(log: ethers.Log, receipt: ethers.TransactionReceipt) {
    try {
      // Check if log is from our contracts
      if (log.address !== IP_ASSET_MANAGER_ENHANCED_ADDRESS && log.address !== IP_ASSET_MANAGER_ADDRESS) {
        return;
      }

      // Parse event based on topic
      const topic0 = log.topics[0];

      if (topic0 === ethers.id(IP_ASSET_REGISTERED_EVENT)) {
        await this.handleIPAssetRegistered(log, receipt);
      } else if (topic0 === ethers.id(LICENSE_ATTACHED_EVENT)) {
        await this.handleLicenseAttached(log, receipt);
      } else if (topic0 === ethers.id(LICENSE_TOKEN_MINTED_EVENT)) {
        await this.handleLicenseTokenMinted(log, receipt);
      } else if (topic0 === ethers.id(REVENUE_PAID_EVENT)) {
        await this.handleRevenuePaid(log, receipt);
      } else if (topic0 === ethers.id(ROYALTY_CLAIMED_EVENT)) {
        await this.handleRoyaltyClaimed(log, receipt);
      } else if (topic0 === ethers.id(IP_ASSET_TRANSFERRED_EVENT)) {
        await this.handleIPAssetTransferred(log, receipt);
      }

    } catch (error) {
      console.error('Error processing log:', error);
    }
  }

  private async handleIPAssetRegistered(log: ethers.Log, receipt: ethers.TransactionReceipt) {
    try {
      const iface = new ethers.Interface([
        'event IPAssetRegistered(uint256 indexed ipAssetId, string name, address indexed owner, string ipfsHash)',
        'event IPAssetRegistered(uint256 indexed ipAssetId, string name, address indexed owner)'
      ]);

      const parsedLog = iface.parseLog(log);
      if (!parsedLog) return;
      const ipAssetId = parsedLog.args[0];
      const name = parsedLog.args[1];
      const owner = parsedLog.args[2];
      const ipfsHash = parsedLog.args[3] || '';

      console.log(`📝 IP Asset Registered: ID ${ipAssetId}, Name: ${name}, Owner: ${owner}`);

      // Update IP Asset in database
      await prisma.iPAsset.updateMany({
        where: { 
          contractAddress: log.address,
          tokenId: BigInt(ipAssetId.toString())
        },
        data: {
          tokenId: BigInt(ipAssetId.toString()),
          name,
          owner,
          ipfsHash: ipfsHash || null
        }
      });

      // Record transaction
      await this.service.recordTransaction(
        '', // Will need to get IP Asset ID from database
        receipt.hash,
        receipt.from,
        owner,
        'register',
        null,
        { name, ipfsHash }
      );

    } catch (error) {
      console.error('Error handling IP Asset Registered event:', error);
    }
  }

  private async handleLicenseAttached(log: ethers.Log, receipt: ethers.TransactionReceipt) {
    try {
      const iface = new ethers.Interface([
        'event LicenseAttached(uint256 indexed ipAssetId, uint256 indexed licenseId, string licenseType)'
      ]);

      const parsedLog = iface.parseLog(log);
      if (!parsedLog) return;
      const ipAssetId = parsedLog.args[0];
      const licenseId = parsedLog.args[1];
      const licenseType = parsedLog.args[2];

      console.log(`📄 License Attached: IP Asset ${ipAssetId}, License ${licenseId}, Type: ${licenseType}`);

      // Update license in database
      await prisma.license.updateMany({
        where: { 
          contractAddress: log.address,
          tokenId: BigInt(licenseId.toString())
        },
        data: {
          tokenId: BigInt(licenseId.toString()),
          licenseType
        }
      });

    } catch (error) {
      console.error('Error handling License Attached event:', error);
    }
  }

  private async handleLicenseTokenMinted(log: ethers.Log, receipt: ethers.TransactionReceipt) {
    try {
      const iface = new ethers.Interface([
        'event LicenseTokenMinted(uint256 indexed licenseId, address indexed to, uint256 amount, uint256 price)'
      ]);

      const parsedLog = iface.parseLog(log);
      if (!parsedLog) return;
      const licenseId = parsedLog.args[0];
      const buyer = parsedLog.args[1];
      const amount = parsedLog.args[2];
      const price = parsedLog.args[3];

      console.log(`🎫 License Token Minted: License ${licenseId}, Buyer: ${buyer}, Amount: ${amount}, Price: ${price}`);

      // Find license in database
      const license = await prisma.license.findFirst({
        where: { 
          contractAddress: log.address,
          tokenId: BigInt(licenseId.toString())
        }
      });

      if (license) {
        await this.service.mintLicense(
          license.id,
          buyer,
          BigInt(amount.toString()),
          BigInt(price.toString()),
          receipt.hash
        );
      }

    } catch (error) {
      console.error('Error handling License Token Minted event:', error);
    }
  }

  private async handleRevenuePaid(log: ethers.Log, receipt: ethers.TransactionReceipt) {
    try {
      const iface = new ethers.Interface([
        'event RevenuePaid(uint256 indexed ipAssetId, address indexed payer, uint256 amount, string description)'
      ]);

      const parsedLog = iface.parseLog(log);
      if (!parsedLog) return;
      const ipAssetId = parsedLog.args[0];
      const payer = parsedLog.args[1];
      const amount = parsedLog.args[2];
      const description = parsedLog.args[3];

      console.log(`💰 Revenue Paid: IP Asset ${ipAssetId}, Payer: ${payer}, Amount: ${amount}`);

      // Find IP Asset in database
      const ipAsset = await prisma.iPAsset.findFirst({
        where: { 
          contractAddress: log.address,
          tokenId: BigInt(ipAssetId.toString())
        }
      });

      if (ipAsset) {
        await this.service.recordPayment(
          ipAsset.id,
          payer,
          BigInt(amount.toString()),
          description,
          receipt.hash
        );
      }

    } catch (error) {
      console.error('Error handling Revenue Paid event:', error);
    }
  }

  private async handleRoyaltyClaimed(log: ethers.Log, receipt: ethers.TransactionReceipt) {
    try {
      const iface = new ethers.Interface([
        'event RoyaltyClaimed(uint256 indexed ipAssetId, address indexed claimant, uint256 amount)'
      ]);

      const parsedLog = iface.parseLog(log);
      if (!parsedLog) return;
      const ipAssetId = parsedLog.args[0];
      const claimant = parsedLog.args[1];
      const amount = parsedLog.args[2];

      console.log(`💳 Royalty Claimed: IP Asset ${ipAssetId}, Claimant: ${claimant}, Amount: ${amount}`);

      // Find IP Asset and royalty in database
      const ipAsset = await prisma.iPAsset.findFirst({
        where: { 
          contractAddress: log.address,
          tokenId: BigInt(ipAssetId.toString())
        },
        include: { royalties: true }
      });

      if (ipAsset && ipAsset.royalties.length > 0) {
        await this.service.claimRoyalty(
          ipAsset.royalties[0].id,
          claimant,
          BigInt(amount.toString()),
          receipt.hash
        );
      }

    } catch (error) {
      console.error('Error handling Royalty Claimed event:', error);
    }
  }

  private async handleIPAssetTransferred(log: ethers.Log, receipt: ethers.TransactionReceipt) {
    try {
      const iface = new ethers.Interface([
        'event IPAssetTransferred(uint256 indexed ipAssetId, address indexed from, address indexed to)'
      ]);

      const parsedLog = iface.parseLog(log);
      if (!parsedLog) return;
      const ipAssetId = parsedLog.args[0];
      const from = parsedLog.args[1];
      const to = parsedLog.args[2];

      console.log(`🔄 IP Asset Transferred: ID ${ipAssetId}, From: ${from}, To: ${to}`);

      // Update IP Asset owner in database
      await prisma.iPAsset.updateMany({
        where: { 
          contractAddress: log.address,
          tokenId: BigInt(ipAssetId.toString())
        },
        data: {
          owner: to
        }
      });

      // Record transaction
      await this.service.recordTransaction(
        '', // Will need to get IP Asset ID from database
        receipt.hash,
        from,
        to,
        'transfer',
        null,
        { ipAssetId: ipAssetId.toString() }
      );

    } catch (error) {
      console.error('Error handling IP Asset Transferred event:', error);
    }
  }

  async stopIndexing() {
    console.log('🛑 Stopping IP Asset Manager event indexing...');
    this.provider.removeAllListeners();
  }
}

// Export singleton instance
export const ipAssetManagerIndexer = new IPAssetManagerIndexer();

// Start indexing if this file is run directly (ESM-safe)
// In ESM, `require` is undefined; use a typeof guard
// Also handle Windows paths when comparing import.meta.url
const isDirectRun = (() => {
  try {
    // Node ESM: compare file URLs
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      const current = import.meta.url.replace(/\\/g, '/');
      const entry = (process.argv[1] ? new URL('file://' + process.argv[1].replace(/\\/g, '/')).href : '');
      return current === entry;
    }
    // CJS fallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (require as any) !== 'undefined' && typeof (module as any) !== 'undefined' && (require as any).main === module;
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  ipAssetManagerIndexer.startIndexing().catch(console.error);
}