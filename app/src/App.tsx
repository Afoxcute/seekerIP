import { useEffect, useState } from "react";
import "./App.css";
import { useNotificationHelpers } from "./contexts/NotificationContext";
import { NotificationButton } from "./components/NotificationButton";
import { NotificationToasts } from "./components/NotificationCenter";
import { IPPortfolio } from "./components/IPPortfolio";
import ArbitrationDashboard from "./components/ArbitrationDashboard";
import KYCManagement from "./components/KYCManagement";
import KYCStatusIndicator from "./components/KYCStatusIndicator";
import EnhancedLicensingManagement from "./components/EnhancedLicensingManagement";
import "./components/IPPortfolio.css";
import "./components/KYCManagement.css";
import "./components/EnhancedLicensingManagement.css";

import {
  defineChain,
  getContract,
  prepareContractCall,
  readContract,
  sendTransaction,
  ThirdwebClient,
  waitForReceipt,
} from "thirdweb";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { parseEther, formatEther } from "viem";
import { hederaTestnet } from "viem/chains";
import CONTRACT_ADDRESS_JSON from "./deployed_addresses.json";
import IPAssetManagerV2ABI from "./abi/IPAssetManagerV2.json";

// Backend API configuration
const BACKEND_URL = "https://seekerip-production.up.railway.app";

// File validation and preview utilities
const MAX_FILE_SIZE_MB = 50; // Maximum file size in megabytes
const ALLOWED_FILE_TYPES = [
  'application/pdf',     // PDF
  'application/msword',  // DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'text/plain',          // TXT
  'image/jpeg',          // JPG/JPEG
  'image/png',           // PNG
  'image/gif',           // GIF
  'audio/mpeg',          // MP3
  'audio/wav',           // WAV
  'video/mp4'            // MP4
];

// File validation function
const validateFile = (file: File): { valid: boolean; error?: string } => {
  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    return {
      valid: false, 
      error: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit`
    };
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false, 
      error: 'Unsupported file type'
    };
  }

  return { valid: true };
};

// File preview generator
const generateFilePreview = (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    // Preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    } 
    // Preview for PDFs (basic)
    else if (file.type === 'application/pdf') {
      resolve('📄 PDF Document');
    }
    // Preview for text files
    else if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsText(file);
    }
    // Preview for other file types
    else {
      resolve(null);
    }
  });
};

/**
 * Uploads a file to IPFS via Pinata
 * @param file The file to upload
 * @returns Object with success status, CID and message
 */
const pinFileToIPFS = async (file: File): Promise<{
  success: boolean;
  cid?: string;
  message?: string;
}> => {
  try {
    // Validate JWT is present
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT is not configured. Please set VITE_PINATA_JWT in your environment.');
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Add metadata
    const metadata = {
      name: file.name,
      description: `Uploaded via SeekerIP frontend`,
      attributes: {
        uploadedBy: 'SeekerIP',
        timestamp: new Date().toISOString(),
        fileType: file.type,
        fileSize: file.size
      }
    };
    formData.append('pinataMetadata', JSON.stringify(metadata));

    // Make request to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinata API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Pinata upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Pinata upload successful:', result);

    return {
      success: true,
      cid: result.IpfsHash,
      message: 'File uploaded successfully to IPFS'
    };
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Converts an IPFS URL to a gateway URL for better compatibility
 * @param url IPFS URL (ipfs://, /ipfs/, or already a gateway URL)
 * @returns Gateway URL
 */
const getIPFSGatewayURL = (url: string): string => {
  if (!url) return '';

  // Use preferred gateway
  const gateway = 'https://gateway.pinata.cloud';

  // Handle ipfs:// protocol
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '');
    return `${gateway}/ipfs/${cid}`;
  }

  // Handle /ipfs/ path
  if (url.includes('/ipfs/')) {
    const parts = url.split('/ipfs/');
    if (parts.length > 1) {
      return `${gateway}/ipfs/${parts[1]}`;
    }
  }

  // If it's already a gateway URL or something else, return as is
  return url;
};

// Parse metadata to extract name and description
const parseMetadata = async (metadataUri: string) => {
  try {
    console.log('Parsing metadata from URI:', metadataUri);
    
    // If metadata is a direct JSON string, parse it
    if (metadataUri.startsWith('{')) {
      const metadata = JSON.parse(metadataUri);
      console.log('Parsed direct JSON metadata:', metadata);
      return metadata;
    }
    
    // If it's an IPFS URI, fetch it
    if (metadataUri.startsWith('ipfs://')) {
      const gatewayUrl = getIPFSGatewayURL(metadataUri);
      console.log('Fetching metadata from gateway:', gatewayUrl);
      
      const response = await fetch(gatewayUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }
      
      const metadata = await response.json();
      console.log('Fetched IPFS metadata:', metadata);
      return metadata;
    }
    
    // If it's already a gateway URL, fetch it
    if (metadataUri.includes('gateway.pinata.cloud')) {
      console.log('Fetching metadata from gateway URL:', metadataUri);
      const response = await fetch(metadataUri);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }
      
      const metadata = await response.json();
      console.log('Fetched gateway metadata:', metadata);
      return metadata;
    }
    
    // Try to fetch as a regular URL
    if (metadataUri.startsWith('http')) {
      console.log('Fetching metadata from URL:', metadataUri);
      const response = await fetch(metadataUri);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }
      
      const metadata = await response.json();
      console.log('Fetched URL metadata:', metadata);
      return metadata;
    }
    
    // Default fallback
    console.log('Using fallback metadata for URI:', metadataUri);
    return {
      name: "Unknown",
      description: "No description available",
      image: metadataUri // Use the URI as image if it's not JSON
    };
  } catch (error) {
    console.error('Error parsing metadata:', error);
    return {
      name: "Unknown",
      description: "No description available",
      image: metadataUri // Use the URI as image as fallback
    };
  }
}; 

// Pinata JWT for IPFS uploads
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI5MjJjNmZkOC04ZTZhLTQxMzUtODA4ZS05ZTkwZTMyMjViNTIiLCJlbWFpbCI6Imp3YXZvbGFiaWxvdmUwMDE2QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJkZDI1MzM4YmRmYTdjNzlmYjY4NyIsInNjb3BlZEtleVNlY3JldCI6ImFiYTJjMzcwNWExMzNlZmVjNzM3NzQwZGNjMGJjOTE4MGY2M2IzZjkxY2E5MzVlYWE3NzUxMDhjOGNkYjMyZDciLCJleHAiOjE3ODU3NDg3ODh9.I6RIrBphVycV-75XK_pippeZngj6QntUZZjFMnGtqFA"; 

const wallets = [
  inAppWallet({
    auth: {
      options: ["google", "email", "passkey", "phone"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("io.rabby"),
  createWallet("com.trustwallet.app"),
  createWallet("global.safe"),
  // createWallet("hashio.wallet"),
];

// Use the correct IPAssetManagerV2 ABI from the imported JSON file
const IP_ASSET_MANAGER_V2_ABI = IPAssetManagerV2ABI.abi as any; 

interface IPAsset {
  owner: string;
  ipHash: string;
  metadata: string;
  isEncrypted: boolean;
  isDisputed: boolean;
  registrationDate: bigint;
  totalRevenue: bigint;
  royaltyTokens: bigint;
}

interface License {
  licensee: string;
  tokenId: bigint;
  royaltyPercentage: bigint;
  duration: bigint;
  startDate: bigint;
  isActive: boolean;
  commercialUse: boolean;
  terms: string;
}

interface AppProps {
  thirdwebClient: ThirdwebClient;
}

// Enhanced Asset Preview Component
const EnhancedAssetPreview: React.FC<{
  assetId: number;
  asset: IPAsset;
  metadata: any;
  mediaUrl: string;
}> = ({ assetId, asset, metadata, mediaUrl }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImageFromMetadata = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('EnhancedAssetPreview - Asset ID:', assetId);
        console.log('EnhancedAssetPreview - Metadata:', metadata);
        console.log('EnhancedAssetPreview - Asset IP Hash:', asset.ipHash);
        
        // Priority 1: Check if metadata has image field
        if (metadata?.image) {
          let imageSource = metadata.image;
          console.log('Using metadata image:', imageSource);
          
          // Convert IPFS URLs to gateway URLs
          if (imageSource.startsWith('ipfs://')) {
            imageSource = `https://gateway.pinata.cloud/ipfs/${imageSource.replace('ipfs://', '')}`;
            console.log('Converted IPFS to gateway URL:', imageSource);
          }
          
          setImageUrl(imageSource);
        } 
        // Priority 2: Try the asset's ipHash directly (for original file)
        else if (asset.ipHash) {
          let gatewayUrl = asset.ipHash;
          if (gatewayUrl.startsWith('ipfs://')) {
            gatewayUrl = `https://gateway.pinata.cloud/ipfs/${gatewayUrl.replace('ipfs://', '')}`;
          }
          console.log('Using asset IP hash as image:', gatewayUrl);
          setImageUrl(gatewayUrl);
        }
        // Priority 3: Use mediaUrl as fallback
        else {
          console.log('Using mediaUrl as fallback:', mediaUrl);
          setImageUrl(mediaUrl);
        }
      } catch (error) {
        console.error('Error fetching image from metadata:', error);
        setError('Failed to load media');
        setImageUrl(mediaUrl);
      } finally {
        setLoading(false);
      }
    };

    fetchImageFromMetadata();
  }, [metadata, asset.ipHash, mediaUrl, assetId]);

  if (loading) {
    return (
      <div className="preview-skeleton">
        <div className="skeleton skeleton-image"></div>
        <div className="skeleton-text">Loading media...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="media-fallback">
        <div className="media-fallback-icon">⚠️</div>
        <p>{error}</p>
        <a href={imageUrl || mediaUrl} target="_blank" rel="noopener noreferrer" className="media-link">
          🔗 View Media
        </a>
      </div>
    );
  }

  return (
    <>
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={metadata?.name || `IP Asset ${assetId}`}
          className="media-image"
          onError={(e) => {
            console.log('Image failed to load:', imageUrl);
            const imgElement = e.target as HTMLImageElement;
            imgElement.style.display = 'none';
            const fallback = imgElement.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
      ) : null}
      <div className="media-fallback" style={{ display: imageUrl ? 'none' : 'flex' }}>
        <div className="media-fallback-icon">📄</div>
        <p>Media Preview</p>
        <a href={imageUrl || mediaUrl} target="_blank" rel="noopener noreferrer" className="media-link">
          🔗 View Media
        </a>
      </div>
    </>
  );
}; 

export default function App({ thirdwebClient }: AppProps) {
  const account = useActiveAccount();
  const { notifySuccess, notifyError, notifyWarning, notifyInfo } = useNotificationHelpers();

  const [loading, setLoading] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<boolean>(false);
  
  // IP Assets state
  const [ipAssets, setIpAssets] = useState<Map<number, IPAsset>>(new Map());
  
  // All IP Assets state (for revenue payment)
  const [allIpAssets, setAllIpAssets] = useState<Map<number, IPAsset>>(new Map());
  const [allParsedMetadata, setAllParsedMetadata] = useState<Map<number, any>>(new Map());
  
  // Licenses state
  const [licenses, setLicenses] = useState<Map<number, License>>(new Map());
  
  // Parsed metadata state
  const [parsedMetadata, setParsedMetadata] = useState<Map<number, any>>(new Map());
  
  // Form states
  const [ipFile, setIpFile] = useState<File | null>(null);
  const [ipHash, setIpHash] = useState<string>("");
  const [ipName, setIpName] = useState<string>("");
  const [ipDescription, setIpDescription] = useState<string>("");
  const [isEncrypted, setIsEncrypted] = useState<boolean>(false);
  
  const [selectedTokenId, setSelectedTokenId] = useState<number>(1);
  const [royaltyPercentage, setRoyaltyPercentage] = useState<number>(10);
  const [licenseDuration, setLicenseDuration] = useState<number>(86400);
  // License parameters
  const [commercialUse, setCommercialUse] = useState<boolean>(true);
  const [commercialAttribution, setCommercialAttribution] = useState<boolean>(true);
  const [commercializerChecker, setCommercializerChecker] = useState<string>("0x0000000000000000000000000000000000000000");
  const [commercializerCheckerData, setCommercializerCheckerData] = useState<string>("0000000000000000000000000000000000000000");
  const [commercialRevShare, setCommercialRevShare] = useState<number>(100000000);
  const [commercialRevCeiling, setCommercialRevCeiling] = useState<number>(0);
  const [derivativesAllowed, setDerivativesAllowed] = useState<boolean>(true);
  const [exclusive, setExclusive] = useState<boolean>(false);
  const [derivativesAttribution, setDerivativesAttribution] = useState<boolean>(true);
  const [derivativesApproval, setDerivativesApproval] = useState<boolean>(false);
  const [derivativesReciprocal, setDerivativesReciprocal] = useState<boolean>(true);
  const [derivativeRevCeiling, setDerivativeRevCeiling] = useState<number>(0);
  const [licenseCurrency, setLicenseCurrency] = useState<string>("0x15140000000000000000000000000000000000000");
  
  const [paymentAmount, setPaymentAmount] = useState<string>("0.001");
  const [paymentTokenId, setPaymentTokenId] = useState<number>(1);
  
  const [claimTokenId, setClaimTokenId] = useState<number>(1);

  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'register' | 'license' | 'revenue' | 'arbitration' | 'kyc'>('dashboard');

  // Check backend status
  const checkBackendStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/`);
      const wasConnected = backendStatus;
      const isConnected = response.ok;
      
      setBackendStatus(isConnected);
      
      if (!wasConnected && isConnected) {
        notifySuccess('Backend Connected', 'Successfully connected to the SeekerIP backend service');
      } else if (wasConnected && !isConnected) {
        notifyError('Backend Disconnected', 'Lost connection to the SeekerIP backend service');
      }
    } catch (error) {
      const wasConnected = backendStatus;
      setBackendStatus(false);
      
      if (wasConnected) {
        notifyError('Backend Error', 'Failed to connect to the SeekerIP backend service');
      }
    }
  };

  // Check backend status on component mount
  useEffect(() => {
    checkBackendStatus();
  }, []);

  // Handle file selection for IP asset
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFile(files[0]);
    }
  };

  // Process file (shared logic for both upload methods)
  const processFile = async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      notifyError('Invalid File', validation.error || 'Invalid file selected');
      return;
    }

    try {
      const preview = await generateFilePreview(file);
      setFilePreview(preview);
      setIpFile(file);
      notifyInfo('File Selected', `${file.name} selected for upload`);
    } catch (err) {
      console.error('File preview error:', err);
      setIpFile(file);
      notifyWarning('Preview Error', 'File selected but preview could not be generated');
    }
  };

  // Upload file to IPFS
  const uploadToIPFS = async () => {
    if (!ipFile) {
      notifyError("No File Selected", "Please select a file to upload");
      return null;
    }

    try {
      setLoading(true);
      notifyInfo('Uploading to IPFS', `Uploading ${ipFile.name} to IPFS...`);
      
      const uploadResult = await pinFileToIPFS(ipFile);
      
      if (uploadResult.success && uploadResult.cid) {
        // Clear any previous file preview
        setFilePreview(null);
        
        // Set the IPFS hash
        const ipfsUrl = `ipfs://${uploadResult.cid}`;
        setIpHash(ipfsUrl);
        
        // Get gateway URL for display
        const gatewayUrl = getIPFSGatewayURL(ipfsUrl);
        
        // Show success message
        notifySuccess('IPFS Upload Successful', 
          `File uploaded successfully!\nCID: ${uploadResult.cid}`, 
          {
            action: {
              label: 'View File',
              onClick: () => window.open(gatewayUrl, '_blank')
            }
          }
        );
        
        return uploadResult.cid;
    } else {
        // Handle specific upload errors
        const errorMessage = uploadResult.message || "Failed to upload file";
        notifyError('Upload Failed', errorMessage);
        
        // Reset file selection if upload fails
        setIpFile(null);
        setFilePreview(null);
        
        return null;
      }
    } catch (err: any) {
      console.error('Unexpected upload error:', err);
      notifyError('Upload Error', err.message || "Unexpected error during file upload");
      
      // Reset file selection
      setIpFile(null);
      setFilePreview(null);
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Load contract data
  const loadContractData = async () => {
    if (!account?.address) return;

    try {
      setLoading(true);
      const contract = getContract({
        abi: IP_ASSET_MANAGER_V2_ABI,
          client: thirdwebClient,
          chain: defineChain(hederaTestnet.id),
        address: CONTRACT_ADDRESS_JSON["IPAssetManagerV2"],
      });

      // Get user's IP assets using getUserAssets function
      const userAssetIds = await readContract({
        contract,
        method: "getUserAssets",
        params: [account.address],
      });

      console.log('User asset IDs:', userAssetIds);

      // Load IP assets for the current user only
      const newIpAssets = new Map<number, IPAsset>();
      for (const assetId of userAssetIds) {
        try {
          const ipAsset = await readContract({
            contract,
            method: "getIPAsset",
            params: [BigInt(assetId)],
          });
          newIpAssets.set(Number(assetId), {
            owner: ipAsset[1], // owner
            ipHash: ipAsset[12], // ipfsHash (mapped to ipHash for compatibility)
            metadata: ipAsset[4], // metadataURI
            isEncrypted: false, // Default value since contract doesn't have this field
            isDisputed: false, // IPAssetManagerV2 doesn't have isDisputed field
            registrationDate: ipAsset[5], // createdAt
            totalRevenue: ipAsset[9], // totalRevenue
            royaltyTokens: BigInt(0), // IPAssetManagerV2 doesn't have royaltyTokens field
          });
        } catch (error) {
          console.error(`Error loading IP asset ${assetId}:`, error);
        }
      }
      setIpAssets(newIpAssets);

      // Parse metadata for all IP assets
      const newParsedMetadata = new Map<number, any>();
      console.log('Starting metadata parsing for', newIpAssets.size, 'IP assets');
      
      for (const [id, asset] of newIpAssets.entries()) {
        try {
          console.log(`Parsing metadata for token ${id}:`, asset.metadata);
          const metadata = await parseMetadata(asset.metadata);
          console.log(`Successfully parsed metadata for token ${id}:`, metadata);
          newParsedMetadata.set(id, metadata);
        } catch (error) {
          console.error(`Error parsing metadata for token ${id}:`, error);
          newParsedMetadata.set(id, {
            name: "Unknown",
            description: "No description available",
            image: asset.ipHash // Use the IP hash as fallback image
          });
        }
      }
      
      console.log('Completed metadata parsing. Parsed metadata:', newParsedMetadata);
      setParsedMetadata(newParsedMetadata);

      // Get user's licenses using getUserLicenses function
      const userLicenseIds = await readContract({
        contract,
        method: "getUserLicenses",
        params: [account.address],
      });

      console.log('User license IDs:', userLicenseIds);

      // Load licenses for the current user only
      const newLicenses = new Map<number, License>();
      for (const licenseId of userLicenseIds) {
        try {
          const license = await readContract({
            contract,
            method: "getLicenseToken",
            params: [BigInt(licenseId)],
          });
          newLicenses.set(Number(licenseId), {
            licensee: license[3], // licensee
            tokenId: BigInt(license[1]), // assetId (mapped to tokenId for compatibility)
            royaltyPercentage: BigInt(license[7]), // revenueShare
            duration: BigInt(license[5]) - BigInt(license[4]), // expiresAt - issuedAt
            startDate: BigInt(license[4]), // issuedAt
            isActive: license[6], // isValid
            commercialUse: true, // Default value since contract doesn't have this field
            terms: "License terms", // Default value since contract doesn't have this field
          });
        } catch (error) {
          console.error(`Error loading license ${licenseId}:`, error);
        }
      }
      setLicenses(newLicenses);

    } catch (error) {
      console.error("Error loading contract data:", error);
      notifyError("Loading Failed", "Failed to load contract data");
    } finally {
      setLoading(false);
    }
  };

  // Load all IP assets for revenue payment (not just user-owned)
  const loadAllIPAssets = async () => {
    try {
      setLoading(true);
      const contract = getContract({
        abi: IP_ASSET_MANAGER_V2_ABI,
        client: thirdwebClient,
        chain: defineChain(hederaTestnet.id),
        address: CONTRACT_ADDRESS_JSON["IPAssetManagerV2"],
      });

      // Get total number of IP assets from the contract
      // We'll need to check if there's a totalAssets function or iterate through
      // For now, let's try to get a reasonable range (1-100) and filter out non-existent ones
      const allIpAssets = new Map<number, IPAsset>();
      const maxAssetsToCheck = 100; // Reasonable limit to avoid too many calls
      
      for (let assetId = 1; assetId <= maxAssetsToCheck; assetId++) {
        try {
          const ipAsset = await readContract({
            contract,
            method: "getIPAsset",
            params: [BigInt(assetId)],
          });
          
          // Check if asset exists (owner is not zero address)
          if (ipAsset[1] && ipAsset[1] !== "0x0000000000000000000000000000000000000000") {
            allIpAssets.set(assetId, {
              owner: ipAsset[1], // owner
              ipHash: ipAsset[12], // ipfsHash (mapped to ipHash for compatibility)
              metadata: ipAsset[4], // metadataURI
              isEncrypted: false, // Default value since contract doesn't have this field
              isDisputed: false, // IPAssetManagerV2 doesn't have isDisputed field
              registrationDate: ipAsset[5], // createdAt
              totalRevenue: ipAsset[9], // totalRevenue
              royaltyTokens: BigInt(0), // IPAssetManagerV2 doesn't have royaltyTokens field
            });
          }
        } catch (error) {
          // Asset doesn't exist or error loading, continue to next
          console.log(`Asset ${assetId} doesn't exist or error loading:`, error);
          break; // If we hit an error, likely no more assets exist
        }
      }
      
      setAllIpAssets(allIpAssets);

      // Parse metadata for all IP assets
      const newAllParsedMetadata = new Map<number, any>();
      console.log('Starting metadata parsing for', allIpAssets.size, 'all IP assets');
      
      for (const [id, asset] of allIpAssets.entries()) {
        try {
          console.log(`Parsing metadata for all asset ${id}:`, asset.metadata);
          const metadata = await parseMetadata(asset.metadata);
          console.log(`Successfully parsed metadata for all asset ${id}:`, metadata);
          newAllParsedMetadata.set(id, metadata);
        } catch (error) {
          console.error(`Error parsing metadata for all asset ${id}:`, error);
          newAllParsedMetadata.set(id, {
            name: "Unknown",
            description: "No description available",
            image: asset.ipHash // Use the IP hash as fallback image
          });
        }
      }
      
      console.log('Completed metadata parsing for all assets. Parsed metadata:', newAllParsedMetadata);
      setAllParsedMetadata(newAllParsedMetadata);
      
    } catch (error) {
      console.error("Error loading all IP assets:", error);
      notifyError("Loading Failed", "Failed to load all IP assets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContractData();
  }, [account?.address]);

  // Load all IP assets when component mounts (for revenue payment)
  useEffect(() => {
    loadAllIPAssets();
  }, []);

  // Debug function to test IPFS metadata fetching
  const testIPFSMetadata = async (ipfsUri: string) => {
    try {
      console.log('Testing IPFS metadata fetch for:', ipfsUri);
      const metadata = await parseMetadata(ipfsUri);
      console.log('Test result:', metadata);
      return metadata;
    } catch (error) {
      console.error('Test failed:', error);
      return null;
    }
  };

  // Expose test function globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).testIPFSMetadata = testIPFSMetadata;
  }

  // Create standardized NFT metadata
  const createNFTMetadata = async (ipHash: string, name: string, description: string, isEncrypted: boolean) => {
    // Generate minimal metadata object for HTS (must be < 100 bytes)
    const minimalMetadata = {
      name: name || `IP Asset #${Date.now()}`,
      description: description || "No description provided",
      image: ipHash,
      encrypted: isEncrypted
    };

    // Validate metadata size for HTS compliance
    const metadataString = JSON.stringify(minimalMetadata);
    if (metadataString.length > 100) {
      console.warn(`Metadata size (${metadataString.length} bytes) exceeds HTS limit of 100 bytes. Truncating...`);
      
      // Create ultra-minimal metadata if needed
      const ultraMinimalMetadata = {
        name: (name || `IP${Date.now()}`).substring(0, 20),
        desc: (description || "IP Asset").substring(0, 30),
        img: ipHash.substring(0, 20) + "...",
        enc: isEncrypted
      };
      
      const ultraMinimalString = JSON.stringify(ultraMinimalMetadata);
      if (ultraMinimalString.length <= 100) {
        console.log(`Using ultra-minimal metadata (${ultraMinimalString.length} bytes)`);
        minimalMetadata.name = ultraMinimalMetadata.name;
        minimalMetadata.description = ultraMinimalMetadata.desc;
        minimalMetadata.image = ultraMinimalMetadata.img;
      }
    }

    console.log(`Final metadata size: ${JSON.stringify(minimalMetadata).length} bytes`);

    // Upload minimal metadata to IPFS
    const metadataBlob = new Blob([JSON.stringify(minimalMetadata)], { type: 'application/json' });
    const metadataFile = new File([metadataBlob], 'metadata.json');
    
    const metadataUploadResult = await pinFileToIPFS(metadataFile);
    
    if (!metadataUploadResult.success || !metadataUploadResult.cid) {
      throw new Error('Failed to upload metadata to IPFS');
    }

    // Return IPFS URL for metadata
    return `ipfs://${metadataUploadResult.cid}`;
  };

  // Register IP using backend API
  const registerIP = async () => {
    if (!account?.address || !ipHash || !ipName.trim()) {
      notifyError("Missing Required Fields", "Please fill in all required fields (IP Hash and Name are required)");
      return;
    }

    try {
      setLoading(true);

      // Check if IPFS hash is already registered
      const { checkIPFSHashRegistered } = await import('./utils/ipfsUtils');
      const isAlreadyRegistered = await checkIPFSHashRegistered(ipHash, CONTRACT_ADDRESS_JSON["IPAssetManagerV2"]);
      
      if (isAlreadyRegistered) {
        notifyError(
          "Duplicate IPFS Hash", 
          `This IPFS hash has already been registered!\n\n` +
          `IPFS Hash: ${ipHash}\n\n` +
          `To register a new IP asset, please:\n` +
          `1. Upload a different file to get a new IPFS hash\n` +
          `2. Or use the existing registered asset if it belongs to you\n\n` +
          `The system prevents duplicate registrations to maintain uniqueness.`
        );
        return;
      }

      // Create and upload minimal metadata to IPFS for HTS contract
      const metadataUri = await createNFTMetadata(ipHash, ipName, ipDescription, isEncrypted);

      // Prepare comprehensive IP metadata for backend and infringement detection
      const comprehensiveMetadata = {
        name: ipName,
        description: ipDescription,
        image: metadataUri,
        creator: account.address,
        created_at: new Date().toISOString(),
        // Additional metadata for better infringement detection
        content_type: ipFile?.type || 'unknown',
        file_size: ipFile?.size || 0,
        mime_type: ipFile?.type || 'unknown',
        tags: [], // Could be enhanced with user input
        category: 'general', // Could be enhanced with user input
        license_type: 'all_rights_reserved',
        commercial_use: false,
        derivatives_allowed: false,
        creator_email: 'creator@seekerip.com', // Could be enhanced with user input
        // File-specific metadata
        file_name: ipFile?.name || 'unknown',
        file_extension: ipFile?.name?.split('.').pop() || 'unknown',
        upload_timestamp: new Date().toISOString(),
        // Blockchain metadata
        network: 'hedera',
        chain_id: '296',
        contract_address: CONTRACT_ADDRESS_JSON["IPAssetManagerV2"],
        // Infringement detection metadata
        monitoring_enabled: true,
        infringement_alerts: true,
        content_hash: ipHash,
        original_filename: ipFile?.name || 'unknown'
      };

      // Upload comprehensive metadata to IPFS separately
      const comprehensiveMetadataBlob = new Blob([JSON.stringify(comprehensiveMetadata)], { type: 'application/json' });
      const comprehensiveMetadataFile = new File([comprehensiveMetadataBlob], 'comprehensive-metadata.json');
      
      const comprehensiveUploadResult = await pinFileToIPFS(comprehensiveMetadataFile);
      
      if (!comprehensiveUploadResult.success || !comprehensiveUploadResult.cid) {
        throw new Error('Failed to upload comprehensive metadata to IPFS');
      }

      const comprehensiveMetadataUri = `ipfs://${comprehensiveUploadResult.cid}`;

      // Call backend API
      const response = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ipHash: ipHash,
          metadata: metadataUri, // Minimal metadata for HTS contract
          comprehensiveMetadata: comprehensiveMetadataUri, // Comprehensive metadata for backend
          isEncrypted: isEncrypted,
          ipAssetManagerV2Address: CONTRACT_ADDRESS_JSON["IPAssetManagerV2"]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register IP');
      }

      const result = await response.json();
      console.log('IP Registration successful:', result);

      // Show success notification
      notifySuccess('IP Asset Registered', 
        `Successfully registered IP asset!\nTransaction: ${result.data.hedera.txHash}\nIP Asset ID: ${result.data.hedera.ipAssetId}`,
        {
          action: {
            label: 'View Transaction',
            onClick: () => window.open(`https://testnet.hashio.io/api/tx/${result.data.hedera.txHash}`, '_blank')
          }
        }
      );

      // Reset form
      setIpFile(null);
      setIpHash("");
      setIpName("");
      setIpDescription("");
      setIsEncrypted(false);
      setFilePreview(null);

      // Reload data
      await loadContractData();

      } catch (error) {
      console.error("Error registering IP:", error);
      
      let errorMessage = "Failed to register IP asset";
      let errorTitle = "Registration Failed";
      
      if (error instanceof Error) {
        const errorStr = error.message.toLowerCase();
        
        if (errorStr.includes("ipfs hash already registered")) {
          errorTitle = "Duplicate IPFS Hash";
          errorMessage = `This IPFS hash has already been registered!\n\n` +
            `IPFS Hash: ${ipHash}\n\n` +
            `To register a new IP asset, please:\n` +
            `1. Upload a different file to get a new IPFS hash\n` +
            `2. Or use the existing registered asset if it belongs to you\n\n` +
            `The system prevents duplicate registrations to maintain uniqueness.`;
        } else if (errorStr.includes("metadata >100 bytes")) {
          errorTitle = "Metadata Too Large";
          errorMessage = `The metadata exceeds the 100-byte limit for HTS tokens.\n\n` +
            `Please use a shorter name or description.`;
        } else if (errorStr.includes("transaction execution reverted")) {
          errorTitle = "Transaction Failed";
          errorMessage = `The blockchain transaction failed.\n\n` +
            `This could be due to:\n` +
            `• Insufficient HBAR for gas fees\n` +
            `• Network congestion\n` +
            `• Contract validation errors\n\n` +
            `Please try again or check your wallet balance.`;
        } else {
          errorMessage = error.message;
        }
      }
      
      notifyError(errorTitle, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Mint License using backend API
  const mintLicense = async () => {
    if (!account?.address || !selectedTokenId) {
      notifyError("Missing Required Fields", "Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      // Prepare license terms for backend
      const licenseTerms = {
        tokenId: selectedTokenId,
        royaltyPercentage: royaltyPercentage,
        duration: licenseDuration,
        commercialUse: commercialUse,
        terms: JSON.stringify({
          transferable: true,
          commercialAttribution: commercialAttribution,
          commercializerChecker: commercializerChecker,
          commercializerCheckerData: commercializerCheckerData,
          commercialRevShare: commercialRevShare,
          commercialRevCeiling: commercialRevCeiling,
          derivativesAllowed: derivativesAllowed,
          derivativesAttribution: derivativesAttribution,
          derivativesApproval: derivativesApproval,
          derivativesReciprocal: derivativesReciprocal,
          derivativeRevCeiling: derivativeRevCeiling,
          currency: licenseCurrency
        })
      };

      // Call backend API
      const response = await fetch(`${BACKEND_URL}/api/license/mint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ipTokenId: selectedTokenId,
          commercialUse: commercialUse,
          derivativeWorks: derivativesAllowed,
          exclusive: exclusive,
          revenueShare: royaltyPercentage,
          duration: licenseDuration,
          terms: licenseTerms.terms,
          ipAssetManagerV2Address: CONTRACT_ADDRESS_JSON["IPAssetManagerV2"]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mint license');
      }

      const result = await response.json();
      console.log('License minting successful:', result);

      // Show success notification
      notifySuccess('License Minted', 
        `Successfully minted license!\nTransaction: ${result.data.txHash}`,
        {
          action: {
            label: 'View Transaction',
            onClick: () => window.open(`https://testnet.hashio.io/api/tx/${result.data.txHash}`, '_blank')
          }
        }
      );

      // Reset form
      setSelectedTokenId(1);
      setRoyaltyPercentage(10);
      setLicenseDuration(86400);
      setCommercialUse(true);
      setCommercialAttribution(true);
      setCommercializerChecker("0x0000000000000000000000000000000000000000");
      setCommercializerCheckerData("0000000000000000000000000000000000000000");
      setCommercialRevShare(100000000);
      setCommercialRevCeiling(0);
      setDerivativesAllowed(true);
      setExclusive(false);
      setDerivativesAttribution(true);
      setDerivativesApproval(false);
      setDerivativesReciprocal(true);
      setDerivativeRevCeiling(0);
      setLicenseCurrency("0x15140000000000000000000000000000000000000");

      // Reload data
      await loadContractData();

    } catch (error) {
      console.error("Error minting license:", error);
      notifyError('License Minting Failed', error instanceof Error ? error.message : "Failed to mint license");
    } finally {
      setLoading(false);
    }
  };

  // Pay Revenue
  const payRevenue = async () => {
    if (!account?.address || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      notifyError("Invalid Payment", "Please enter a valid payment amount");
      return;
    }

    try {
      setLoading(true);
      notifyInfo('Processing Payment', `Paying ${paymentAmount} HBAR in revenue...`);

        const contract = getContract({
        abi: IP_ASSET_MANAGER_V2_ABI,
            client: thirdwebClient,
          chain: defineChain(hederaTestnet.id),
        address: CONTRACT_ADDRESS_JSON["IPAssetManagerV2"],
        });

      const preparedCall = await prepareContractCall({
          contract,
        method: "payIPAsset",
        params: [BigInt(paymentTokenId), "Revenue payment"],
        value: parseEther(paymentAmount), // Convert to weibars (18 decimals) for JSON-RPC compatibility
        });

        const transaction = await sendTransaction({
        transaction: preparedCall,
        account: account,
        });

      await waitForReceipt({
          client: thirdwebClient,
          chain: defineChain(hederaTestnet.id),
          transactionHash: transaction.transactionHash,
        });

      // Show success notification
      notifySuccess('Payment Successful', `Successfully paid ${paymentAmount} HBAR in revenue!`);

      // Reset form
      setPaymentAmount("");
      setPaymentTokenId(1);

      // Reload data
      await loadContractData();
      await loadAllIPAssets();

      } catch (error) {
      console.error("Error paying revenue:", error);
      notifyError('Payment Failed', "Failed to pay revenue");
    } finally {
      setLoading(false);
    }
  };

  // Claim Royalties
  const claimRoyalties = async () => {
    if (!account?.address) {
      notifyError("Wallet Not Connected", "Please connect your wallet");
      return;
    }

    try {
      setLoading(true);
      notifyInfo('Claiming Royalties', 'Processing royalty claim...');

        const contract = getContract({
        abi: IP_ASSET_MANAGER_V2_ABI,
          client: thirdwebClient,
          chain: defineChain(hederaTestnet.id),
        address: CONTRACT_ADDRESS_JSON["IPAssetManagerV2"],
        });

      const preparedCall = await prepareContractCall({
          contract,
        method: "claimRoyalties",
        params: [BigInt(claimTokenId)],
        });

        const transaction = await sendTransaction({
        transaction: preparedCall,
        account: account,
        });

      await waitForReceipt({
          client: thirdwebClient,
        chain: defineChain(hederaTestnet.id),
          transactionHash: transaction.transactionHash,
        });

            // Show success notification
      notifySuccess('Royalties Claimed', 'Successfully claimed your royalties!');

      // Reload data
      await loadContractData();

      } catch (error) {
      console.error("Error claiming royalties:", error);
      notifyError('Claim Failed', "Failed to claim royalties");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      {/* Toast Notifications */}
      <NotificationToasts />
      
      {/* Modern Header */}
      <header className="header">
        <div className="header-container">
          <div className="header-logo">
            <img src="/seeker_logo.png" alt="SeekerIP" className="logo-image" />
            <h1>SeekerIP</h1>
          </div>
          <div className="header-actions">
            <div className={`status-indicator ${backendStatus ? 'connected' : 'disconnected'}`}>
              <span>{backendStatus ? '🟢' : '🔴'}</span>
              <span>Backend {backendStatus ? 'Connected' : 'Disconnected'}</span>
              <button onClick={checkBackendStatus} className="refresh-btn">🔄</button>
            </div>
            <KYCStatusIndicator thirdwebClient={thirdwebClient} />
            <NotificationButton />
            <ConnectButton
              client={thirdwebClient}
              wallets={wallets}
              chain={defineChain(hederaTestnet.id)}
            />
          </div>
        </div>
      </header>

      {loading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Processing your request...</p>
        </div>
      )}

      <div className="main-content">
        {/* Dashboard Navigation */}
        <div className="dashboard-nav">
          <button 
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`nav-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            📝 Register IP
          </button>
          <button 
            className={`nav-tab ${activeTab === 'license' ? 'active' : ''}`}
            onClick={() => setActiveTab('license')}
          >
            🎫 License Management
          </button>
          <button 
            className={`nav-tab ${activeTab === 'revenue' ? 'active' : ''}`}
            onClick={() => setActiveTab('revenue')}
          >
            💰 Revenue & Analytics
          </button>
          <button 
            className={`nav-tab ${activeTab === 'arbitration' ? 'active' : ''}`}
            onClick={() => setActiveTab('arbitration')}
          >
            🏛️ Arbitration
          </button>
          <button 
            className={`nav-tab ${activeTab === 'kyc' ? 'active' : ''}`}
            onClick={() => setActiveTab('kyc')}
          >
            🔐 KYC Management
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <IPPortfolio 
              assets={ipAssets}
              licenses={licenses}
              metadata={parsedMetadata}
              userAddress={account?.address}
            />
          )}

          {/* Register IP Tab */}
          {activeTab === 'register' && (
            <section className="section section-wide">
              <div className="section-header">
                <span className="section-icon">📝</span>
                <h2 className="section-title">Register IP Asset</h2>
              </div>
              
              <div className="form-grid">
                {/* File Upload */}
                <div 
                  className="file-upload-area"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="ip-file-upload"
                    className="file-upload-input"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4"
                  />
                  <div className="file-upload-content">
                    <div className="file-upload-icon">📎</div>
                    <div className="file-upload-text">
                      <strong>Click to upload</strong> or drag and drop
                    </div>
                    <div className="file-upload-hint">
                      PDF, DOC, TXT, JPG, PNG, GIF, MP3, WAV, MP4 (max 50MB)
                    </div>
                  </div>
                </div>

                {filePreview && (
                  <div className="file-preview animate-slide-up">
                    {filePreview.startsWith('data:image') ? (
                      <img 
                        src={filePreview} 
                        alt="File preview"
                        className="file-preview-image"
                      />
                    ) : (
                      <div className="file-preview-image">📄</div>
                    )}
                    <div className="file-preview-info">
                      <div className="file-preview-name">{ipFile?.name}</div>
                      <div className="file-preview-size">
                        {ipFile ? `${(ipFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  className="btn btn-secondary btn-full"
                  onClick={uploadToIPFS} 
                  disabled={!ipFile || loading}
                >
                  {loading ? '⏳ Uploading...' : '🚀 Upload to IPFS'}
                </button>

                {/* IP Details Form */}
                <div className="form-group">
                  <label className="form-label">🔗 IP Hash (IPFS)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={ipHash}
                    onChange={(e) => setIpHash(e.target.value)}
                    placeholder="IPFS hash will appear after upload"
                    readOnly
                  />
                </div>

                {ipHash && (
                  <div className="media-preview animate-scale-in">
                    <div className="media-container">
                      {ipFile && ipFile.type.startsWith('image/') ? (
                        <img 
                          src={getIPFSGatewayURL(ipHash)} 
                          alt="Uploaded media"
                          className="media-image"
                          onError={(e) => {
                            const imgElement = e.target as HTMLImageElement;
                            imgElement.style.display = 'none';
                            const fallback = imgElement.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="media-fallback" style={{ display: ipFile?.type.startsWith('image/') ? 'none' : 'flex' }}>
                        <div className="media-fallback-icon">📄</div>
                        <p>Media Preview</p>
                        <a href={getIPFSGatewayURL(ipHash)} target="_blank" rel="noopener noreferrer" className="media-link">
                          🔗 View Media
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group-row">
                  <div className="form-group">
                    <label className="form-label">📝 Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={ipName}
                      onChange={(e) => setIpName(e.target.value)}
                      placeholder="Enter a name for your IP asset"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">🔒 Security</label>
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={isEncrypted}
                        onChange={(e) => setIsEncrypted(e.target.checked)}
                      />
                      <label className="checkbox-label">Encrypted Content</label>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">📄 Description</label>
                  <textarea
                    className="form-input form-textarea"
                    value={ipDescription}
                    onChange={(e) => setIpDescription(e.target.value)}
                    placeholder="Describe your IP asset"
                    rows={3}
                  />
                </div>

                <button 
                  className="btn btn-primary btn-full"
                  onClick={registerIP} 
                  disabled={loading || !account?.address || !ipHash || !ipName.trim()}
                >
                  {loading ? '⏳ Registering...' : '🚀 Register IP Asset'}
                </button>
              </div>
            </section>
          )}

          {/* License Management Tab */}
          {activeTab === 'license' && (
            <>
            <section className="section">
              <div className="section-header">
                <span className="section-icon">🎫</span>
                <h2 className="section-title">Mint License</h2>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">🎯 Select IP Asset</label>
                  <select
                    className="form-select"
                    value={selectedTokenId}
                    onChange={(e) => setSelectedTokenId(Number(e.target.value))}
                  >
                    {Array.from(ipAssets.keys()).map((id) => {
                      const asset = ipAssets.get(id);
                      const metadata = parsedMetadata.get(id) || { name: "Unknown" };
    return (
                        <option key={id} value={id}>
                          #{id} - {metadata.name || asset?.ipHash.substring(0, 10) || 'Unknown'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label className="form-label">💰 Royalty (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={royaltyPercentage}
                      onChange={(e) => setRoyaltyPercentage(Number(e.target.value))}
                      min="1"
                      max="100"
                      placeholder="10"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">⏰ Duration (seconds)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={licenseDuration}
                      onChange={(e) => setLicenseDuration(Number(e.target.value))}
                      min="3600"
                      placeholder="86400"
                    />
                  </div>
                </div>

                {/* License Terms */}
                <div className="form-group">
                  <label className="form-label">⚙️ License Terms</label>
                  <div className="form-grid">
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={commercialUse}
                        onChange={(e) => setCommercialUse(e.target.checked)}
                      />
                      <label className="checkbox-label">Commercial Use Allowed</label>
                    </div>
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={commercialAttribution}
                        onChange={(e) => setCommercialAttribution(e.target.checked)}
                      />
                      <label className="checkbox-label">Commercial Attribution</label>
                    </div>

                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={derivativesAllowed}
                        onChange={(e) => setDerivativesAllowed(e.target.checked)}
                      />
                      <label className="checkbox-label">Derivatives Allowed</label>
                    </div>

                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={exclusive}
                        onChange={(e) => setExclusive(e.target.checked)}
                      />
                      <label className="checkbox-label">Exclusive License</label>
                    </div>

                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={derivativesAttribution}
                        onChange={(e) => setDerivativesAttribution(e.target.checked)}
                      />
                      <label className="checkbox-label">Derivatives Attribution</label>
                    </div>

                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={derivativesApproval}
                        onChange={(e) => setDerivativesApproval(e.target.checked)}
                      />
                      <label className="checkbox-label">Derivatives Approval Required</label>
                    </div>

                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={derivativesReciprocal}
                        onChange={(e) => setDerivativesReciprocal(e.target.checked)}
                      />
                      <label className="checkbox-label">Derivatives Reciprocal</label>
                    </div>
                  </div>
                </div>

                {/* Advanced Settings */}
                <details className="form-group">
                  <summary className="form-label" style={{ cursor: 'pointer', fontWeight: 600 }}>
                    🔧 Advanced Settings
                  </summary>
                  <div className="form-grid" style={{ marginTop: '1rem' }}>
                    <div className="form-group-row">
                      <div className="form-group">
                        <label className="form-label">💵 Commercial Rev Share (%)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={commercialRevShare / 1000000}
                          onChange={(e) => setCommercialRevShare(Number(e.target.value) * 1000000)}
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="100"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">🏛️ Commercial Rev Ceiling</label>
                        <input
                          type="number"
                          className="form-input"
                          value={commercialRevCeiling}
                          onChange={(e) => setCommercialRevCeiling(Number(e.target.value))}
                          min="0"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">🔍 Commercializer Checker</label>
                      <input
                        type="text"
                        className="form-input"
                        value={commercializerChecker}
                        onChange={(e) => setCommercializerChecker(e.target.value)}
                        placeholder="0x0000000000000000000000000000000000000000"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">📊 Derivative Rev Ceiling</label>
                      <input
                        type="number"
                        className="form-input"
                        value={derivativeRevCeiling}
                        onChange={(e) => setDerivativeRevCeiling(Number(e.target.value))}
                        min="0"
                        placeholder="0"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">💱 License Currency</label>
                      <input
                        type="text"
                        className="form-input"
                        value={licenseCurrency}
                        onChange={(e) => setLicenseCurrency(e.target.value)}
                        placeholder="0x15140000000000000000000000000000000000000"
                      />
                    </div>
                  </div>
                </details>

                <button 
                  className="btn btn-primary btn-full"
                  onClick={mintLicense} 
                  disabled={loading || !account?.address}
                >
                  {loading ? '⏳ Minting...' : '🎫 Mint License'}
                </button>
              </div>
            </section>

            {/* Enhanced Licensing Management Sub-section */}
            <EnhancedLicensingManagement 
              thirdwebClient={thirdwebClient}
              onSuccess={(message) => notifySuccess('Licensing Success', message)}
              onError={(message) => notifyError('Licensing Error', message)}
            />
            </>
          )}

          {/* Revenue & Analytics Tab */}
          {activeTab === 'revenue' && (
            <>
              {/* Pay Revenue */}
              <section className="section">
                <div className="section-header">
                  <span className="section-icon">💳</span>
                  <h2 className="section-title">Pay Revenue</h2>
                  <button 
                    className="btn btn-secondary"
                    onClick={loadAllIPAssets}
                    disabled={loading}
                    style={{ marginLeft: 'auto' }}
                  >
                    {loading ? '⏳ Loading...' : '🔄 Refresh All Assets'}
                  </button>
                </div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <div className="info-box" style={{ 
                      background: 'var(--color-bg-secondary)', 
                      padding: '1rem', 
                      borderRadius: '8px', 
                      marginBottom: '1rem',
                      border: '1px solid var(--color-border)'
                    }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                        💡 <strong>Any wallet can pay revenue!</strong> Select any IP asset from the list below to pay revenue to its owner. 
                        The owner's address is shown next to each asset for transparency.
                      </p>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">🎯 Select IP Asset</label>
            <select
                      className="form-select"
                      value={paymentTokenId}
                      onChange={(e) => setPaymentTokenId(Number(e.target.value))}
                    >
                      {Array.from(allIpAssets.keys()).map((id) => {
                        const asset = allIpAssets.get(id);
                        const metadata = allParsedMetadata.get(id) || { name: "Unknown" };
                        return (
                          <option key={id} value={id}>
                            #{id} - {metadata.name || asset?.ipHash.substring(0, 10) || 'Unknown'} (Owner: {asset?.owner.substring(0, 6)}...)
                          </option>
                        );
                      })}
            </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">💰 Amount (HBAR)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      min="0.001"
                      step="0.001"
                      placeholder="0.001"
                    />
                  </div>
                  
                  <button 
                    className="btn btn-primary btn-full"
                    onClick={payRevenue} 
                    disabled={loading || !account?.address}
                  >
                    {loading ? '⏳ Processing...' : '💳 Pay Revenue'}
                  </button>
                </div>
              </section>

              {/* Claim Royalties */}
              <section className="section">
                <div className="section-header">
                  <span className="section-icon">🏆</span>
                  <h2 className="section-title">Claim Royalties</h2>
                </div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">🎯 Select IP Asset</label>
                    <select
                      className="form-select"
                      value={claimTokenId}
                      onChange={(e) => setClaimTokenId(Number(e.target.value))}
                    >
                      {Array.from(ipAssets.keys()).map((id) => {
                        const asset = ipAssets.get(id);
                        const metadata = parsedMetadata.get(id) || { name: "Unknown" };
                        return (
                          <option key={id} value={id}>
                            #{id} - {metadata.name || asset?.ipHash.substring(0, 10) || 'Unknown'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  
                  <button 
                    className="btn btn-primary btn-full"
                    onClick={claimRoyalties} 
                    disabled={loading || !account?.address}
                  >
                    {loading ? '⏳ Claiming...' : '🏆 Claim Royalties'}
                  </button>
                </div>
              </section>
          </>
        )}

          {/* Arbitration Tab */}
          {activeTab === 'arbitration' && (
            <ArbitrationDashboard />
        )}

          {/* KYC Management Tab */}
          {activeTab === 'kyc' && (
            <KYCManagement 
              thirdwebClient={thirdwebClient}
              onSuccess={(message) => notifySuccess('KYC Success', message)}
              onError={(message) => notifyError('KYC Error', message)}
            />
          )}
        </div>

        {/* IP Assets Display */}
        <section className="section section-full">
          <div className="section-header">
            <span className="section-icon">🎨</span>
            <h2 className="section-title">Registered IP Assets</h2>
            <button 
              className="btn btn-secondary"
              onClick={loadContractData}
              disabled={loading}
              style={{ marginLeft: 'auto' }}
            >
              {loading ? '⏳ Loading...' : '🔄 Refresh'}
            </button>
          </div>
          
          <div className="grid grid-3">
            {Array.from(ipAssets.entries()).map(([id, asset]) => {
              const metadata = parsedMetadata.get(id) || { name: "Unknown", description: "No description available" };
              const mediaUrl = getIPFSGatewayURL(asset.ipHash);
              
              console.log(`Rendering IP Asset ${id}:`, {
                asset,
                metadata,
                mediaUrl
              });
              
              return (
                <div key={id} className="card hover-lift animate-fade-in">
                  <div className="card-header">
                    <div>
                      <h3 className="card-title">{metadata.name || `IP Asset #${id}`}</h3>
                      <p className="card-subtitle">Token #{id}</p>
                    </div>
                    <div className="flex gap-2">
                      {asset.isEncrypted && <span className="badge badge-warning">🔒 Encrypted</span>}
                      {asset.isDisputed && <span className="badge badge-error">⚠️ Disputed</span>}
                    </div>
                  </div>
                  
                  {/* Enhanced Media Preview */}
                  {asset.ipHash && (
                    <div className="media-preview">
                      <div className="media-container">
                        <EnhancedAssetPreview 
                          assetId={id}
                          asset={asset}
                          metadata={metadata}
                          mediaUrl={mediaUrl}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="card-body">
                    <div className="card-field">
                      <span className="card-field-label">Owner</span>
                      <span className="card-field-value address">{asset.owner.substring(0, 10)}...</span>
                    </div>
                    
                    <div className="card-field">
                      <span className="card-field-label">Description</span>
                      <span className="card-field-value">{metadata.description || "No description"}</span>
                    </div>
                    
                    <div className="card-field">
                      <span className="card-field-label">IP Hash</span>
                      <span className="card-field-value address">{asset.ipHash.substring(0, 20)}...</span>
                    </div>
                    
                    <div className="card-field">
                      <span className="card-field-label">Total Revenue</span>
                      <span className="card-field-value">💰 {formatEther(asset.totalRevenue)} HBAR</span>
                    </div>
                    
                    <div className="card-field">
                      <span className="card-field-label">Royalty Tokens</span>
                      <span className="card-field-value">🎯 {Number(asset.royaltyTokens) / 100}%</span>
                    </div>
                    
                    {/* Debug information - can be removed in production */}
                    {process.env.NODE_ENV === 'development' && (
                      <details className="card-field">
                        <summary className="card-field-label" style={{ cursor: 'pointer' }}>
                          🔧 Debug Info
                        </summary>
                        <div className="card-field-value" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                          <div><strong>Raw Metadata:</strong> {asset.metadata}</div>
                          <div><strong>IP Hash:</strong> {asset.ipHash}</div>
                          <div><strong>Parsed Metadata:</strong> {JSON.stringify(metadata, null, 2)}</div>
                      </div>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
            
            {ipAssets.size === 0 && (
              <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎨</div>
                <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>No IP Assets Yet</h3>
                <p style={{ color: 'var(--color-text-tertiary)' }}>Register your first IP asset to get started!</p>
              </div>
            )}
          </div>
        </section>

        {/* Licenses Display */}
        <section className="section section-full">
          <div className="section-header">
            <span className="section-icon">🎫</span>
            <h2 className="section-title">Active Licenses</h2>
          </div>
          
          <div className="grid grid-2">
            {Array.from(licenses.entries()).map(([id, license]) => (
              <div key={id} className="card hover-lift animate-fade-in">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">License #{id}</h3>
                    <p className="card-subtitle">IP Asset #{Number(license.tokenId)}</p>
                  </div>
                  <div className="flex gap-2">
                    {license.isActive ? (
                      <span className="badge badge-success">✅ Active</span>
                    ) : (
                      <span className="badge badge-error">❌ Inactive</span>
                    )}
                    {license.commercialUse && <span className="badge badge-info">💼 Commercial</span>}
                  </div>
        </div>

                <div className="card-body">
                  <div className="card-field">
                    <span className="card-field-label">Licensee</span>
                    <span className="card-field-value address">{license.licensee.substring(0, 10)}...</span>
        </div>
                  
                  <div className="card-field">
                    <span className="card-field-label">Royalty Rate</span>
                    <span className="card-field-value">💰 {Number(license.royaltyPercentage) / 100}%</span>
      </div>

                  <div className="card-field">
                    <span className="card-field-label">Duration</span>
                    <span className="card-field-value">⏰ {Number(license.duration)} seconds</span>
                  </div>
                  
                  <div className="card-field">
                    <span className="card-field-label">Start Date</span>
                    <span className="card-field-value">
                      📅 {new Date(Number(license.startDate) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="card-field">
                    <span className="card-field-label">Terms Preview</span>
                    <span className="card-field-value">{license.terms.substring(0, 30)}...</span>
                  </div>
                </div>
                
                <div className="card-actions">
                  <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}>
                    📄 View Terms
                  </button>
                  {license.isActive && (
                    <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}>
                      🔄 Renew
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {licenses.size === 0 && (
              <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
                <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>No Licenses Yet</h3>
                <p style={{ color: 'var(--color-text-tertiary)' }}>Mint your first license to start licensing IP assets!</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
} 
