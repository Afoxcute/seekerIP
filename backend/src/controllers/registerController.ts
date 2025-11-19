import { registerIpWithHedera } from '../services/storyService';
import { registerToYakoa } from '../services/yakoascanner';
import { convertBigIntsToStrings } from '../utils/bigIntSerializer';
import { Address } from 'viem';

interface RegisterRequest {
  ipHash: string;
  metadata: string; // Minimal metadata for HTS contract
  comprehensiveMetadata?: string; // Comprehensive metadata for backend
  isEncrypted: boolean;
  ipAssetManagerV2Address: Address;
}

export const registerIP = async (req: any, res: any) => {
  try {
    const { ipHash, metadata, comprehensiveMetadata, isEncrypted, ipAssetManagerV2Address, SeekerIPContractAddress } = req.body;
    
    // Handle backward compatibility - use the new parameter name if available, fallback to old one
    const contractAddress = ipAssetManagerV2Address || SeekerIPContractAddress;

    // Validate that we have a contract address
    if (!contractAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing contract address. Please provide either ipAssetManagerV2Address or SeekerIPContractAddress',
        message: 'Contract address is required for IP registration'
      });
    }

    console.log('Registering IP with hash:', ipHash);
    console.log('Minimal metadata (for HTS):', metadata);
    console.log('Comprehensive metadata (for backend):', comprehensiveMetadata);
    console.log('Is encrypted:', isEncrypted);
    console.log('Contract address:', contractAddress);

    // Parse metadata to extract name and description
    let name = "IP Asset";
    let description = "IP Asset Description";
    let comprehensiveMetadataObj = null;
    
    try {
      // Use comprehensive metadata if available, otherwise fallback to minimal metadata
      const metadataToParse = comprehensiveMetadata || metadata;
      const metadataObj = JSON.parse(metadataToParse);
      
      if (metadataObj.name) name = metadataObj.name;
      if (metadataObj.description) description = metadataObj.description;
      
      // Store comprehensive metadata object for later use
      if (comprehensiveMetadata) {
        comprehensiveMetadataObj = metadataObj;
      }
    } catch (e) {
      console.warn('Could not parse metadata for name/description, using defaults');
    }

    // 1. Register on Hedera using IPAssetManagerV2 contract
    const {
      txHash,
      ipAssetId,
      blockNumber,
      explorerUrl
    } = await registerIpWithHedera(ipHash, metadata, name, description, contractAddress as Address);
    console.log("✅ Hedera registration successful:", {
      txHash,
      ipAssetId,
      blockNumber,
      explorerUrl
    });

    // 2. Register with Yakoa for infringement monitoring
    let yakoaResult = null;
    let yakoaError = null;

    try {
      // Extract hash from IPFS URL if needed
      const extractHash = (ipfsUrl: string): string => {
        if (ipfsUrl.startsWith('ipfs://')) {
          return ipfsUrl.replace('ipfs://', '');
        }
        if (ipfsUrl.includes('/ipfs/')) {
          const parts = ipfsUrl.split('/ipfs/');
          return parts[1]?.split('?')[0] || ipfsUrl;
        }
        return ipfsUrl;
      };

      const extractedHash = extractHash(ipHash);
      
      // Parse metadata to get creator address
      let creatorAddress = '0x0000000000000000000000000000000000000000';
      try {
        // Use comprehensive metadata if available, otherwise fallback to minimal metadata
        const metadataToParse = comprehensiveMetadata || metadata;
        const metadataObj = JSON.parse(metadataToParse);
        if (metadataObj.creator) {
          creatorAddress = metadataObj.creator;
        }
      } catch (e) {
        console.warn('Could not parse metadata for creator address');
      }

      // Create Yakoa payload
      const yakoaPayload = {
        Id: `${contractAddress.toLowerCase()}:${ipAssetId}`,
        transactionHash: txHash as `0x${string}`,
        blockNumber,
        creatorId: creatorAddress.toLowerCase(),
        metadata: {
          ip_hash: extractedHash,
          blockchain: 'hedera',
          contract_address: contractAddress.toLowerCase(),
          token_id: ipAssetId?.toString() || '0'
        },
        media: [
          {
            media_id: `IP Asset ${ipAssetId}`,
            url: `https://ipfs.io/ipfs/${extractedHash}`
          }
        ]
      };

      yakoaResult = await registerToYakoa(yakoaPayload);
      console.log("✅ Yakoa registration successful:", yakoaResult);
    } catch (error) {
      yakoaError = error;
      console.error("❌ Yakoa registration failed:", error);
    }

    // 3. Prepare response
    const successMessage = yakoaResult 
      ? 'IP Asset successfully registered on Hedera and Yakoa'
      : 'IP Asset registered on Hedera, already exists in Yakoa';

    const response = {
      success: true,
      message: successMessage,
      data: {
        hedera: {
          txHash,
          ipAssetId,
          blockNumber,
          explorerUrl,
          network: 'Hedera Testnet'
        },
                 yakoa: yakoaResult ? {
           id: yakoaResult.id,
           status: 'registered'
         } : {
           status: 'already_exists',
           error: yakoaError instanceof Error ? yakoaError.message : 'Unknown error'
         }
      }
    };

    // Convert BigInt values to strings for JSON serialization
    const serializedResponse = convertBigIntsToStrings(response);
    
    res.status(200).json(serializedResponse);
  } catch (error) {
    console.error('Error in registerIP:', error);
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to register IP asset'
    };
    
    res.status(500).json(errorResponse);
  }
};
