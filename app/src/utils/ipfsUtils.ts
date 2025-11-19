// Utility function to check if an IPFS hash is already registered
export const checkIPFSHashRegistered = async (ipfsHash: string, contractAddress: string) => {
  try {
    const { readContract } = await import('thirdweb');
    const { defineChain } = await import('thirdweb/chains');
    const { createThirdwebClient } = await import('thirdweb');
    
    const hederaTestnet = defineChain({
      id: 296,
      name: "Hedera Testnet",
      rpc: "https://testnet.hashio.io/api",
      nativeCurrency: {
        name: "HBAR",
        symbol: "HBAR",
        decimals: 8,
      },
    });

    const client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "your-client-id",
    });

    const { getContract } = await import('thirdweb');
    
    const contract = getContract({
      address: contractAddress as `0x${string}`,
      chain: hederaTestnet,
      client: client,
      abi: [
        {
          "inputs": [{"name": "ipfsHash", "type": "string"}],
          "name": "registeredIPFSHashes",
          "outputs": [{"name": "", "type": "bool"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
    });

    const isRegistered = await readContract({
      contract: contract,
      method: "registeredIPFSHashes",
      params: [ipfsHash],
    });

    return isRegistered;
  } catch (error) {
    console.error("Error checking IPFS hash registration:", error);
    return false; // Return false on error to allow attempt
  }
};
