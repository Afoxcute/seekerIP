import { comprehensiveIndexer } from '../events/comprehensive-indexer';
import { dataSyncService } from './data-sync-service';
import { thirdwebDataSyncService } from './thirdweb-data-sync-service';

export class BackgroundJobService {
  private syncInterval: NodeJS.Timeout | null = null;
  private eventProcessingInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private consecutiveEmptySyncs: number = 0;
  private maxEmptySyncs: number = 3; // Stop after 3 consecutive empty syncs
  private lastSyncDataCount: number = 0;
  private rateLimitRetries: number = 0;
  private maxRateLimitRetries: number = 5;

  constructor() {
    // Graceful shutdown handlers
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Background jobs are already running');
      return;
    }

    console.log('🚀 Starting background job service...');
    this.isRunning = true;

    try {
      // Start event indexing
      await comprehensiveIndexer.startIndexing();

      // Start periodic data sync (every 2 minutes initially)
      this.syncInterval = setInterval(async () => {
        try {
          console.log('🔄 Running periodic data sync...');
          const dataCount = await this.runSmartSync();
          
          if (dataCount === 0) {
            this.consecutiveEmptySyncs++;
            console.log(`📊 No new data found (${this.consecutiveEmptySyncs}/${this.maxEmptySyncs} consecutive empty syncs)`);
            
            if (this.consecutiveEmptySyncs >= this.maxEmptySyncs) {
              console.log('🛑 Stopping background jobs - no new data found in recent syncs');
              await this.stop();
              return;
            }
          } else {
            this.consecutiveEmptySyncs = 0;
            this.rateLimitRetries = 0;
            console.log(`✅ Synced ${dataCount} new data items`);
          }
        } catch (error) {
          console.error('Error during periodic sync:', error);
          
          // Handle rate limiting
          if (error.message && error.message.includes('rate limit')) {
            this.rateLimitRetries++;
            console.log(`⚠️ Rate limit hit (${this.rateLimitRetries}/${this.maxRateLimitRetries})`);
            
            if (this.rateLimitRetries >= this.maxRateLimitRetries) {
              console.log('🛑 Stopping background jobs due to persistent rate limiting');
              await this.stop();
              return;
            }
          }
        }
      }, 2 * 60 * 1000); // 2 minutes

      // Start event processing (every 30 seconds)
      this.eventProcessingInterval = setInterval(async () => {
        try {
          await comprehensiveIndexer.processQueuedEvents();
        } catch (error) {
          console.error('Error processing queued events:', error);
        }
      }, 30 * 1000); // 30 seconds

      console.log('✅ Background job service started');
    } catch (error) {
      console.error('❌ Error starting background job service:', error);
      this.isRunning = false;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping background job service...');
    this.isRunning = false;

    try {
      // Stop event indexing
      await comprehensiveIndexer.stopIndexing();

      // Clear intervals
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }

      if (this.eventProcessingInterval) {
        clearInterval(this.eventProcessingInterval);
        this.eventProcessingInterval = null;
      }

      console.log('✅ Background job service stopped');
    } catch (error) {
      console.error('❌ Error stopping background job service:', error);
    }
  }

  // Manual sync trigger
  async triggerSync(contract?: string) {
    try {
      if (contract) {
        switch (contract) {
          case 'IPAssetManagerV2':
            await thirdwebDataSyncService.syncIPAssetManagerV2();
            break;
          case 'IPAssetLocker':
            await thirdwebDataSyncService.syncIPAssetLocker();
            break;
          case 'HBAREquivalentToken':
            await thirdwebDataSyncService.syncHBAREquivalentToken();
            break;
          case 'IntellectualPropertyArbitration':
            await thirdwebDataSyncService.syncIntellectualPropertyArbitration();
            break;
          case 'TokenizedAssetManager':
            await dataSyncService.syncTokenizedAssetManager();
            break;
          default:
            throw new Error(`Unknown contract: ${contract}`);
        }
      } else {
        await thirdwebDataSyncService.syncAllContracts();
      }
    } catch (error) {
      console.error(`Error during manual sync for ${contract || 'all contracts'}:`, error);
      throw error;
    }
  }

  // Smart sync that tracks data changes
  private async runSmartSync(): Promise<number> {
    const { prisma } = await import('./prisma');
    
    // Get current data counts before sync
    const beforeCounts = {
      ipAssets: await prisma.iPAsset.count(),
      locks: await prisma.iPAssetLock.count(),
      hbarBalances: await prisma.hBARTokenBalance.count(),
      arbitrationCases: await prisma.arbitrationCase.count()
    };
    
    // Run the sync using Thirdweb (same as frontend)
    await thirdwebDataSyncService.syncAllContracts();
    
    // Get data counts after sync
    const afterCounts = {
      ipAssets: await prisma.iPAsset.count(),
      locks: await prisma.iPAssetLock.count(),
      hbarBalances: await prisma.hBARTokenBalance.count(),
      arbitrationCases: await prisma.arbitrationCase.count()
    };
    
    // Calculate total new data items
    const totalNewData = 
      (afterCounts.ipAssets - beforeCounts.ipAssets) +
      (afterCounts.locks - beforeCounts.locks) +
      (afterCounts.hbarBalances - beforeCounts.hbarBalances) +
      (afterCounts.arbitrationCases - beforeCounts.arbitrationCases);
    
    this.lastSyncDataCount = totalNewData;
    return totalNewData;
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasSyncInterval: this.syncInterval !== null,
      hasEventProcessingInterval: this.eventProcessingInterval !== null,
      consecutiveEmptySyncs: this.consecutiveEmptySyncs,
      lastSyncDataCount: this.lastSyncDataCount,
      rateLimitRetries: this.rateLimitRetries
    };
  }
}

// Export singleton instance
export const backgroundJobService = new BackgroundJobService();
