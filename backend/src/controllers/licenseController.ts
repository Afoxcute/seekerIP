import { Request, Response } from 'express';
import { mintLicense, LicenseRequest } from '../services/licenseService';
import { convertBigIntsToStrings } from '../utils/bigIntSerializer';

const handleLicenseMinting = async (req: Request, res: Response) => {
    console.log("🔥 Entered handleLicenseMinting");
    try {
        const { ipTokenId, commercialUse, derivativeWorks, exclusive, revenueShare, duration, terms, ipAssetManagerV2Address, SeekerIPContractAddress } = req.body;
        
        // Handle backward compatibility - use the new parameter name if available, fallback to old one
        const contractAddress = ipAssetManagerV2Address || SeekerIPContractAddress;
        console.log("📦 Received license request:", req.body);

        // Validate required parameters
        if (!ipTokenId || commercialUse === undefined || derivativeWorks === undefined || exclusive === undefined || !revenueShare || !duration || !terms || !contractAddress) {
            return res.status(400).json({
                error: 'Missing required parameters: ipTokenId, commercialUse, derivativeWorks, exclusive, revenueShare, duration, terms, and either ipAssetManagerV2Address or SeekerIPContractAddress'
            });
        }

        const licenseRequest: LicenseRequest = {
            ipTokenId,
            commercialUse,
            derivativeWorks,
            exclusive,
            revenueShare,
            duration,
            terms,
            ipAssetManagerV2Address: contractAddress
        };

        const result = await mintLicense(licenseRequest);

        if (result.success) {
            const responseData = {
                message: result.message,
                data: {
                    txHash: result.txHash,
                    blockNumber: result.blockNumber,
                    explorerUrl: result.explorerUrl
                }
            };
            return res.status(200).json(convertBigIntsToStrings(responseData));
        } else {
            return res.status(500).json({
                error: result.message,
                details: 'License minting failed on Hedera'
            });
        }
    } catch (err) {
        console.error('❌ License minting error:', err);
        return res.status(500).json({
            error: 'License minting failed',
            details: err instanceof Error ? err.message : err,
        });
    }
};

export default handleLicenseMinting; 