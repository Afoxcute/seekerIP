import { publicClient, walletClient, account, networkInfo, BLOCK_EXPLORER_URL } from '../utils/config';
import { uploadJSONToIPFS } from '../utils/functions/uploadToIpfs';
import { createHash } from 'crypto';
import { Address } from 'viem';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import IPAssetManagerV2ABI from '../abi/IPAssetManagerV2.json';

// IP Metadata interface for Hedera
export interface IpMetadata {
    name: string;
    description: string;
    image: string;
    external_url?: string;
    attributes?: Array<{
        trait_type: string;
        value: string | number;
    }>;
    license?: string;
    creator?: string;
    created_at?: string;
}

export const registerIpWithHedera = async (
    ipHash: string,
    metadata: string,
    name: string = "IP Asset",
    description: string = "IP Asset Description",
    ipAssetManagerV2Address: Address = CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2
) => {
    try {
        console.log('ipHash:', ipHash);
        console.log('metadata:', metadata);
        console.log('name:', name);
        console.log('description:', description);

        // Register IP on IPAssetManagerV2 contract
        const { request } = await publicClient.simulateContract({
            address: ipAssetManagerV2Address,
            abi: IPAssetManagerV2ABI.abi,
            functionName: 'registerIPAsset',
            args: [
                name, // name
                description, // description  
                metadata, // metadataURI
                ipHash // ipfsHash
            ],
            account: account.address,
        });

        const hash = await walletClient.writeContract({
            ...request,
            account: account,
  });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // Extract IP Asset ID from transaction logs
        let ipAssetId: number | undefined;
        if (receipt.logs && receipt.logs.length > 0) {
            // Look for the Transfer event which contains the token ID
            for (const log of receipt.logs) {
                if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                    // Transfer event signature
                    if (log.topics[3]) {
                        ipAssetId = parseInt(log.topics[3], 16);
                        break;
                    }
                }
            }
        }

  return {
            txHash: hash,
            ipAssetId: ipAssetId,
            blockNumber: receipt.blockNumber,
            explorerUrl: `${BLOCK_EXPLORER_URL}/tx/${hash}`,
        };
    } catch (error) {
        console.error('Error registering IP with Hedera:', error);
        throw error;
    }
};

export const mintLicenseOnHedera = async (
    ipTokenId: number,
    commercialUse: boolean,
    derivativeWorks: boolean,
    exclusive: boolean,
    revenueShare: number,
    duration: number,
    terms: string,
    ipAssetManagerV2Address: Address = CONTRACT_ADDRESSES.IP_ASSET_MANAGER_V2
) => {
    try {
        // First, attach license terms to create the license
        const attachTermsRequest = await publicClient.simulateContract({
            address: ipAssetManagerV2Address,
            abi: IPAssetManagerV2ABI.abi,
            functionName: 'attachLicenseTerms',
            args: [
                BigInt(ipTokenId), // assetId
                terms, // terms
                BigInt(0), // price (0 for free)
                BigInt(duration), // duration
                BigInt(1000), // maxLicenses (set to 1000)
                "0x0000000000000000000000000000000000000000000000000000000000000000", // encryptedTerms (empty)
                BigInt(revenueShare) // revenueShare
            ],
            account: account.address,
        });

        const attachHash = await walletClient.writeContract({
            ...attachTermsRequest.request,
            account: account,
        });

        // Wait for the transaction to be mined
        await publicClient.waitForTransactionReceipt({
            hash: attachHash,
        });

        // Now mint the license token (license ID will be 1 for the first license)
        const mintRequest = await publicClient.simulateContract({
            address: ipAssetManagerV2Address,
            abi: IPAssetManagerV2ABI.abi,
            functionName: 'mintLicenseToken',
            args: [
                BigInt(ipTokenId), // assetId
                BigInt(1) // licenseId (first license for this asset)
            ],
            account: account.address,
        });

        const hash = await walletClient.writeContract({
            ...mintRequest.request,
            account: account,
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        return {
            txHash: hash,
            attachTermsTxHash: attachHash,
            blockNumber: receipt.blockNumber,
            explorerUrl: `${BLOCK_EXPLORER_URL}/tx/${hash}`,
        };
    } catch (error) {
        console.error('Error minting license on Hedera:', error);
        throw error;
    }
};

