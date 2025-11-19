import express, { Router } from "express";
const { ipAssetLockerService } = require("../services/ip-asset-locker-service");

const router: Router = express.Router();

/**
 * @route POST /api/ip-asset-locker/lock
 * @desc Lock an IP asset and mint HBAR equivalent tokens
 * @access Public
 */
router.post("/lock", async (req, res) => {
  try {
    const { ipAssetId, hbarAmount, userAddress } = req.body;

    if (!ipAssetId || !hbarAmount || !userAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: ipAssetId, hbarAmount, userAddress"
      });
    }

    const result = await ipAssetLockerService.lockIPAsset(
      parseInt(ipAssetId),
      hbarAmount,
      userAddress
    );

    if (result.success) {
      res.json({
        success: true,
        transactionHash: result.transactionHash,
        message: "IP asset locked successfully"
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || "Failed to lock IP asset"
      });
    }
  } catch (error: any) {
    console.error("Error in lock IP asset route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

/**
 * @route POST /api/ip-asset-locker/unlock
 * @desc Unlock an IP asset and burn HBAR equivalent tokens
 * @access Public
 */
router.post("/unlock", async (req, res) => {
  try {
    const { ipAssetId, hbarAmount, userAddress } = req.body;

    if (!ipAssetId || !hbarAmount || !userAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: ipAssetId, hbarAmount, userAddress"
      });
    }

    const result = await ipAssetLockerService.unlockIPAsset(
      parseInt(ipAssetId),
      hbarAmount,
      userAddress
    );

    if (result.success) {
      res.json({
        success: true,
        transactionHash: result.transactionHash,
        message: "IP asset unlocked successfully"
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || "Failed to unlock IP asset"
      });
    }
  } catch (error: any) {
    console.error("Error in unlock IP asset route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

/**
 * @route GET /api/ip-asset-locker/status/:ipAssetId
 * @desc Get the lock status of an IP asset
 * @access Public
 */
router.get("/status/:ipAssetId", async (req, res) => {
  try {
    const { ipAssetId } = req.params;

    if (!ipAssetId) {
      return res.status(400).json({
        success: false,
        error: "Missing ipAssetId parameter"
      });
    }

    const [isLocked, lockedAmount, isEligible] = await Promise.all([
      ipAssetLockerService.isIPAssetLocked(parseInt(ipAssetId)),
      ipAssetLockerService.getLockedAmount(parseInt(ipAssetId)),
      ipAssetLockerService.isIPAssetEligibleForLocking(parseInt(ipAssetId))
    ]);

    res.json({
      success: true,
      data: {
        ipAssetId: parseInt(ipAssetId),
        isLocked,
        lockedAmount,
        isEligible
      }
    });
  } catch (error: any) {
    console.error("Error in get IP asset status route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

/**
 * @route GET /api/ip-asset-locker/user/:userAddress
 * @desc Get all locked IP assets for a user
 * @access Public
 */
router.get("/user/:userAddress", async (req, res) => {
  try {
    const { userAddress } = req.params;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing userAddress parameter"
      });
    }

    const [lockedAssets, hbarBalance] = await Promise.all([
      ipAssetLockerService.getUserLockedIPAssets(userAddress),
      ipAssetLockerService.getHBARTokenBalance(userAddress)
    ]);

    // Get details for each locked asset
    const assetDetails = await Promise.all(
      lockedAssets.map(async (assetId: number) => {
        const [isLocked, lockedAmount] = await Promise.all([
          ipAssetLockerService.isIPAssetLocked(assetId),
          ipAssetLockerService.getLockedAmount(assetId)
        ]);

        return {
          ipAssetId: assetId,
          isLocked,
          lockedAmount
        };
      })
    );

    res.json({
      success: true,
      data: {
        userAddress,
        lockedAssets: assetDetails,
        hbarTokenBalance: hbarBalance
      }
    });
  } catch (error: any) {
    console.error("Error in get user locked assets route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

/**
 * @route GET /api/ip-asset-locker/stats
 * @desc Get overall statistics for the IP asset locker system
 * @access Public
 */
router.get("/stats", async (req, res) => {
  try {
    const stats = await ipAssetLockerService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error("Error in get stats route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

/**
 * @route GET /api/ip-asset-locker/balance/:userAddress
 * @desc Get HBAR token balance for a user
 * @access Public
 */
router.get("/balance/:userAddress", async (req, res) => {
  try {
    const { userAddress } = req.params;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing userAddress parameter"
      });
    }

    const balance = await ipAssetLockerService.getHBARTokenBalance(userAddress);

    res.json({
      success: true,
      data: {
        userAddress,
        hbarTokenBalance: balance
      }
    });
  } catch (error: any) {
    console.error("Error in get balance route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

/**
 * @route GET /api/ip-asset-locker/eligibility/:ipAssetId
 * @desc Check if an IP asset is eligible for locking
 * @access Public
 */
router.get("/eligibility/:ipAssetId", async (req, res) => {
  try {
    const { ipAssetId } = req.params;

    if (!ipAssetId) {
      return res.status(400).json({
        success: false,
        error: "Missing ipAssetId parameter"
      });
    }

    const isEligible = await ipAssetLockerService.isIPAssetEligibleForLocking(parseInt(ipAssetId));

    res.json({
      success: true,
      data: {
        ipAssetId: parseInt(ipAssetId),
        isEligible
      }
    });
  } catch (error: any) {
    console.error("Error in check eligibility route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

/**
 * @route GET /api/ip-asset-locker/eligibility-details/:ipAssetId
 * @desc Get detailed eligibility information for an IP asset
 * @access Public
 */
router.get("/eligibility-details/:ipAssetId", async (req, res) => {
  try {
    const { ipAssetId } = req.params;

    if (!ipAssetId) {
      return res.status(400).json({
        success: false,
        error: "Missing ipAssetId parameter"
      });
    }

    const details = await ipAssetLockerService.getIPAssetEligibilityDetails(parseInt(ipAssetId));

    res.json({
      success: true,
      data: {
        ipAssetId: parseInt(ipAssetId),
        ...details
      }
    });
  } catch (error: any) {
    console.error("Error in get eligibility details route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

export default router;
