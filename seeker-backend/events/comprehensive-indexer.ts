import { ethers } from 'ethers';
import { prisma } from '../lib/prisma';
import { CONTRACT_CONFIGS, CONTRACT_ADDRESSES } from '../lib/contract-config';

export class ComprehensiveEventIndexer {
  private provider: ethers.JsonRpcProvider;
  private contracts: Map<string, ethers.Contract> = new Map();
  private lastProcessedBlocks: Map<string, number> = new Map();
  private isRunning: boolean = false;

  constructor(rpcUrl: string = process.env.HEDERA_RPC_URL || 'https://testnet.hashio.io/api') {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.initializeContracts();
  }

  private initializeContracts() {
    for (const config of CONTRACT_CONFIGS) {
      const contract = new ethers.Contract(
        config.address,
        config.interface,
        this.provider
      );
      this.contracts.set(config.name, contract);
    }
  }

  async startIndexing() {
    if (this.isRunning) {
      console.log('⚠️ Indexer is already running');
      return;
    }

    console.log('🚀 Starting comprehensive event indexing...');
    this.isRunning = true;

    try {
      // Load last processed blocks for each contract
      await this.loadLastProcessedBlocks();

      // Start listening for new blocks
      this.provider.on('block', async (blockNumber: number) => {
        await this.processNewBlock(blockNumber);
      });

      // Process any missed blocks
      await this.catchUpMissedBlocks();

      console.log('✅ Comprehensive event indexing started');
    } catch (error) {
      console.error('❌ Error starting comprehensive indexing:', error);
      this.isRunning = false;
    }
  }

  async stopIndexing() {
    console.log('🛑 Stopping comprehensive event indexing...');
    this.isRunning = false;
    this.provider.removeAllListeners();
  }

  private async loadLastProcessedBlocks() {
    try {
      const contractStates = await prisma.contractState.findMany();
      
      for (const state of contractStates) {
        this.lastProcessedBlocks.set(
          state.contractName,
          Number(state.lastProcessedBlock)
        );
      }

      // Initialize with current block if no state exists
      if (contractStates.length === 0) {
        const currentBlock = await this.provider.getBlockNumber();
        for (const config of CONTRACT_CONFIGS) {
          this.lastProcessedBlocks.set(config.name, currentBlock);
        }
      }
    } catch (error) {
      console.error('Error loading last processed blocks:', error);
    }
  }

  private async catchUpMissedBlocks() {
    const currentBlock = await this.provider.getBlockNumber();
    
    for (const config of CONTRACT_CONFIGS) {
      const lastProcessed = this.lastProcessedBlocks.get(config.name) || 0;
      
      if (lastProcessed < currentBlock) {
        console.log(`📦 Catching up ${config.name} from block ${lastProcessed} to ${currentBlock}`);
        
        for (let block = lastProcessed + 1; block <= currentBlock; block++) {
          await this.processBlock(block, config);
        }
      }
    }
  }

  private async processNewBlock(blockNumber: number) {
    if (!this.isRunning) return;

    try {
      console.log(`📦 Processing new block ${blockNumber}...`);
      
      for (const config of CONTRACT_CONFIGS) {
        await this.processBlock(blockNumber, config);
      }
    } catch (error) {
      console.error(`Error processing new block ${blockNumber}:`, error);
    }
  }

  private async processBlock(blockNumber: number, config: typeof CONTRACT_CONFIGS[number]) {
    try {
      const lastProcessed = this.lastProcessedBlocks.get(config.name) || 0;
      
      if (blockNumber <= lastProcessed) {
        return; // Already processed
      }

      const block = await this.provider.getBlock(blockNumber, true);
      if (!block) return;

      // Process each transaction in the block
      for (const txHash of block.transactions) {
        const receipt = await this.provider.getTransactionReceipt(txHash);
        if (!receipt || receipt.to?.toLowerCase() !== config.address.toLowerCase()) {
          continue;
        }

        await this.processTransaction(receipt, config);
      }

      // Update last processed block
      this.lastProcessedBlocks.set(config.name, blockNumber);
      await this.updateLastProcessedBlock(config.name, blockNumber);

    } catch (error) {
      console.error(`Error processing block ${blockNumber} for ${config.name}:`, error);
    }
  }

  private async processTransaction(receipt: ethers.TransactionReceipt, config: typeof CONTRACT_CONFIGS[number]) {
    try {
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== config.address.toLowerCase()) {
          continue;
        }

        await this.processLog(log, receipt, config);
      }
    } catch (error) {
      console.error(`Error processing transaction ${receipt.hash}:`, error);
    }
  }

  private async processLog(log: ethers.Log, receipt: ethers.TransactionReceipt, config: typeof CONTRACT_CONFIGS[number]) {
    try {
      const topic0 = log.topics[0];
      const eventName = this.getEventNameFromTopic(topic0, config);

      if (!eventName) {
        return; // Unknown event
      }

      // Queue event for processing
      await this.queueEvent({
        contractAddress: config.address,
        eventName,
        transactionHash: receipt.hash,
        blockNumber: BigInt(receipt.blockNumber),
        logIndex: log.index,
        eventData: {
          topics: log.topics,
          data: log.data,
          address: log.address,
        }
      });

    } catch (error) {
      console.error('Error processing log:', error);
    }
  }

  private getEventNameFromTopic(topic0: string, config: typeof CONTRACT_CONFIGS[number]): string | null {
    const events = config.events;
    
    for (const [eventName, eventSignature] of Object.entries(events)) {
      if (topic0 === ethers.id(eventSignature)) {
        return eventName;
      }
    }
    
    return null;
  }

  private async queueEvent(eventData: {
    contractAddress: string;
    eventName: string;
    transactionHash: string;
    blockNumber: bigint;
    logIndex: number;
    eventData: any;
  }) {
    try {
      await prisma.eventQueue.upsert({
        where: {
          transactionHash_logIndex: {
            transactionHash: eventData.transactionHash,
            logIndex: eventData.logIndex
          }
        },
        update: {
          eventData: eventData.eventData,
          processed: false,
        },
        create: {
          contractAddress: eventData.contractAddress,
          eventName: eventData.eventName,
          transactionHash: eventData.transactionHash,
          blockNumber: eventData.blockNumber,
          logIndex: eventData.logIndex,
          eventData: eventData.eventData,
          processed: false,
        }
      });
    } catch (error) {
      console.error('Error queuing event:', error);
    }
  }

  private async updateLastProcessedBlock(contractName: string, blockNumber: number) {
    try {
      await prisma.contractState.upsert({
        where: { contractAddress: CONTRACT_ADDRESSES[contractName as keyof typeof CONTRACT_ADDRESSES] },
        update: {
          lastProcessedBlock: BigInt(blockNumber),
          updatedAt: new Date(),
        },
        create: {
          contractAddress: CONTRACT_ADDRESSES[contractName as keyof typeof CONTRACT_ADDRESSES],
          contractName,
          lastProcessedBlock: BigInt(blockNumber),
          isActive: true,
        }
      });
    } catch (error) {
      console.error(`Error updating last processed block for ${contractName}:`, error);
    }
  }

  // Process queued events
  async processQueuedEvents() {
    console.log('🔄 Processing queued events...');
    
    try {
      const queuedEvents = await prisma.eventQueue.findMany({
        where: { processed: false },
        orderBy: [{ blockNumber: 'asc' }, { logIndex: 'asc' }],
        take: 100, // Process in batches
      });

      for (const event of queuedEvents) {
        try {
          await this.processEvent(event);
          
          await prisma.eventQueue.update({
            where: { id: event.id },
            data: { 
              processed: true,
              processedAt: new Date(),
            }
          });
        } catch (error) {
          console.error(`Error processing event ${event.id}:`, error);
          
          // Increment retry count
          await prisma.eventQueue.update({
            where: { id: event.id },
            data: { 
              retryCount: event.retryCount + 1,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            }
          });
        }
      }

      console.log(`✅ Processed ${queuedEvents.length} queued events`);
    } catch (error) {
      console.error('Error processing queued events:', error);
    }
  }

  private async processEvent(event: any) {
    const { contractAddress, eventName, eventData } = event;
    
    // Find the contract config
    const config = CONTRACT_CONFIGS.find(c => c.address.toLowerCase() === contractAddress.toLowerCase());
    if (!config) {
      throw new Error(`Unknown contract: ${contractAddress}`);
    }

    // Parse the event data
    const iface = config.interface;
    const parsedLog = iface.parseLog({
      topics: eventData.topics,
      data: eventData.data,
      address: eventData.address,
    });

    if (!parsedLog) {
      throw new Error('Failed to parse event log');
    }

    // Route to appropriate handler
    switch (config.name) {
      case 'IPAssetManagerV2':
        await this.handleIPAssetManagerEvent(eventName, parsedLog, event);
        break;
      case 'IPAssetLocker':
        await this.handleIPAssetLockerEvent(eventName, parsedLog, event);
        break;
      case 'HBAREquivalentToken':
        await this.handleHBARTokenEvent(eventName, parsedLog, event);
        break;
      case 'IntellectualPropertyArbitration':
        await this.handleArbitrationEvent(eventName, parsedLog, event);
        break;
      case 'TokenizedAssetManager':
        await this.handleTokenizedAssetEvent(eventName, parsedLog, event);
        break;
      default:
        console.log(`Unknown contract: ${config.name}`);
    }
  }

  // Event handlers for each contract
  private async handleIPAssetManagerEvent(eventName: string, parsedLog: any, event: any) {
    switch (eventName) {
      case 'IPAssetRegistered':
        await this.handleIPAssetRegistered(parsedLog, event);
        break;
      case 'IPAssetTransferred':
        await this.handleIPAssetTransferred(parsedLog, event);
        break;
      case 'RevenuePaid':
        await this.handleRevenuePaid(parsedLog, event);
        break;
      // Add more handlers as needed
    }
  }

  private async handleIPAssetLockerEvent(eventName: string, parsedLog: any, event: any) {
    switch (eventName) {
      case 'IPAssetLocked':
        await this.handleIPAssetLocked(parsedLog, event);
        break;
      case 'IPAssetUnlocked':
        await this.handleIPAssetUnlocked(parsedLog, event);
        break;
      case 'HBARTokensMinted':
        await this.handleHBARTokensMinted(parsedLog, event);
        break;
    }
  }

  private async handleHBARTokenEvent(eventName: string, parsedLog: any, event: any) {
    switch (eventName) {
      case 'Transfer':
        await this.handleHBARTokenTransfer(parsedLog, event);
        break;
      case 'TokensMinted':
        await this.handleHBARTokensMinted(parsedLog, event);
        break;
    }
  }

  private async handleArbitrationEvent(eventName: string, parsedLog: any, event: any) {
    switch (eventName) {
      case 'DisputeCreated':
        await this.handleDisputeCreated(parsedLog, event);
        break;
      case 'VoteCast':
        await this.handleVoteCast(parsedLog, event);
        break;
    }
  }

  private async handleTokenizedAssetEvent(eventName: string, parsedLog: any, event: any) {
    switch (eventName) {
      case 'AssetCreated':
        await this.handleAssetCreated(parsedLog, event);
        break;
      case 'Transfer':
        await this.handleAssetTransfer(parsedLog, event);
        break;
    }
  }

  // Specific event handlers
  private async handleIPAssetRegistered(parsedLog: any, event: any) {
    const [ipAssetId, name, owner, ipfsHash] = parsedLog.args;
    
    await prisma.iPAsset.upsert({
      where: {
        contractAddress_tokenId: {
          contractAddress: event.contractAddress,
          tokenId: BigInt(ipAssetId.toString())
        }
      },
      update: {
        name: name.toString(),
        owner: owner.toString(),
        ipfsHash: ipfsHash.toString() || null,
        lastModified: new Date(),
      },
      create: {
        contractAddress: event.contractAddress,
        tokenId: BigInt(ipAssetId.toString()),
        name: name.toString(),
        description: '', // Will be filled from metadata
        metadataURI: '',
        ipfsHash: ipfsHash.toString() || null,
        owner: owner.toString(),
        royaltyPercentage: 0,
        isActive: true,
        totalRevenue: BigInt(0),
        licenseTokenId: BigInt(0),
        royaltyTokenId: BigInt(0),
      }
    });
  }

  private async handleIPAssetLocked(parsedLog: any, event: any) {
    const [owner, ipAssetId, hbarAmount, timestamp] = parsedLog.args;
    
    // Find the IP asset
    const ipAsset = await prisma.iPAsset.findFirst({
      where: { tokenId: BigInt(ipAssetId.toString()) }
    });

    if (ipAsset) {
      await prisma.iPAssetLock.upsert({
        where: { ipAssetId: ipAsset.id },
        update: {
          hbarAmount: BigInt(hbarAmount.toString()),
          status: 'locked',
          updatedAt: new Date(),
        },
        create: {
          ipAssetId: ipAsset.id,
          owner: owner.toString(),
          hbarAmount: BigInt(hbarAmount.toString()),
          status: 'locked',
          hbarTokenAmount: BigInt(hbarAmount.toString()),
        }
      });
    }
  }

  private async handleIPAssetUnlocked(parsedLog: any, event: any) {
    const [owner, ipAssetId, hbarAmount, timestamp] = parsedLog.args;
    
    const ipAsset = await prisma.iPAsset.findFirst({
      where: { tokenId: BigInt(ipAssetId.toString()) }
    });

    if (ipAsset) {
      const lock = await prisma.iPAssetLock.findUnique({
        where: { ipAssetId: ipAsset.id }
      });

      if (lock) {
        await prisma.iPAssetUnlockEvent.create({
          data: {
            lockId: lock.id,
            hbarAmount: BigInt(hbarAmount.toString()),
            transactionHash: event.transactionHash,
          }
        });

        // Update or remove lock
        if (BigInt(hbarAmount.toString()) >= lock.hbarAmount) {
          await prisma.iPAssetLock.delete({
            where: { id: lock.id }
          });
        } else {
          await prisma.iPAssetLock.update({
            where: { id: lock.id },
            data: {
              hbarAmount: lock.hbarAmount - BigInt(hbarAmount.toString()),
              updatedAt: new Date(),
            }
          });
        }
      }
    }
  }

  private async handleHBARTokensMinted(parsedLog: any, event: any) {
    const [to, amount, ipAssetId] = parsedLog.args;
    
    await prisma.hBARTokenBalance.upsert({
      where: { owner: to.toString() },
      update: {
        balance: { increment: BigInt(amount.toString()) },
        totalMinted: { increment: BigInt(amount.toString()) },
        lastUpdated: new Date(),
      },
      create: {
        owner: to.toString(),
        balance: BigInt(amount.toString()),
        totalMinted: BigInt(amount.toString()),
        totalBurned: BigInt(0),
      }
    });

    await prisma.hBARTokenTransaction.create({
      data: {
        owner: to.toString(),
        amount: BigInt(amount.toString()),
        type: 'mint',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
      }
    });
  }

  private async handleHBARTokenTransfer(parsedLog: any, event: any) {
    const [from, to, amount] = parsedLog.args;
    
    // Update sender balance
    if (from !== '0x0000000000000000000000000000000000000000') {
      await prisma.hBARTokenBalance.upsert({
        where: { owner: from.toString() },
        update: {
          balance: { decrement: BigInt(amount.toString()) },
          lastUpdated: new Date(),
        },
        create: {
          owner: from.toString(),
          balance: BigInt(0),
          totalMinted: BigInt(0),
          totalBurned: BigInt(0),
        }
      });
    }

    // Update receiver balance
    if (to !== '0x0000000000000000000000000000000000000000') {
      await prisma.hBARTokenBalance.upsert({
        where: { owner: to.toString() },
        update: {
          balance: { increment: BigInt(amount.toString()) },
          lastUpdated: new Date(),
        },
        create: {
          owner: to.toString(),
          balance: BigInt(amount.toString()),
          totalMinted: BigInt(0),
          totalBurned: BigInt(0),
        }
      });
    }

    await prisma.hBARTokenTransaction.create({
      data: {
        owner: to.toString(),
        amount: BigInt(amount.toString()),
        type: 'transfer',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
      }
    });
  }

  // Add more specific event handlers as needed...
  private async handleIPAssetTransferred(parsedLog: any, event: any) {
    // Implementation for IP asset transfers
  }

  private async handleRevenuePaid(parsedLog: any, event: any) {
    // Implementation for revenue payments
  }

  private async handleDisputeCreated(parsedLog: any, event: any) {
    // Implementation for dispute creation
  }

  private async handleVoteCast(parsedLog: any, event: any) {
    // Implementation for vote casting
  }

  private async handleAssetCreated(parsedLog: any, event: any) {
    // Implementation for asset creation
  }

  private async handleAssetTransfer(parsedLog: any, event: any) {
    // Implementation for asset transfers
  }
}

// Export singleton instance
export const comprehensiveIndexer = new ComprehensiveEventIndexer();
