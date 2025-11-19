# Intellectual Property Arbitration System

## Contract Information

- **Contract Address**: `0x60f4a0ee098394951bb704709842C92dF25038b2`
- **Network**: Hedera Testnet (Chain ID: 296)
- **Explorer**: https://testnet.hashscan.io/address/0x60f4a0ee098394951bb704709842C92dF25038b2
- **Deployment Transaction**: 0xb79e3a71343c1a537399ac6b0f414387948f6cc4c04e9e8eb4840831a960d6d7

## Configuration

- **Dispute Bond**: 0.000000001 HBAR
- **Voting Period**: 604800 seconds (7 days)
- **Challenge Period**: 259200 seconds (3 days)
- **Min Stake to Vote**: 0.00000001 HBAR
- **Arbitrator Fee**: 0.000000005 HBAR
- **Arbitration Token**: 0x0000000000000000000000000000000000000000

## Features

### UMA-like Dispute Resolution
- **Optimistic Oracle Pattern**: Stake-based voting system
- **Hedera Consensus Service (HCS)**: Immutable dispute records
- **Arbitrator Escalation**: Human arbitrators for complex cases
- **Reputation System**: Arbitrator reputation tracking

### Dispute Lifecycle
1. **Asset Registration**: Register IP assets for arbitration
2. **Dispute Creation**: Challenge IP ownership with evidence
3. **Voting Period**: Community votes with staked tokens
4. **Resolution**: Automatic resolution or arbitrator escalation
5. **Ownership Transfer**: Automatic IP ownership transfer if challenger wins

### HCS Integration
- **Immutable Records**: All disputes recorded on HCS
- **Message Verification**: Cryptographic proof of dispute history
- **Topic Management**: Separate HCS topics per IP asset
- **Sequence Tracking**: Ordered dispute and vote records

## API Endpoints

The arbitration system provides REST API endpoints:

### Asset Management
- `POST /api/arbitration/register-asset` - Register IP asset
- `GET /api/arbitration/asset/:assetId` - Get asset data

### Dispute Management
- `POST /api/arbitration/raise-dispute` - Raise dispute
- `GET /api/arbitration/dispute/:disputeId` - Get dispute data
- `POST /api/arbitration/cast-vote` - Cast vote
- `POST /api/arbitration/resolve-dispute` - Resolve dispute
- `POST /api/arbitration/escalate-dispute` - Escalate to arbitrator
- `POST /api/arbitration/arbitrator-resolve` - Arbitrator resolution
- `POST /api/arbitration/cancel-dispute` - Cancel dispute

### Statistics & History
- `GET /api/arbitration/stats` - Get dispute statistics
- `GET /api/arbitration/history/:assetId` - Get dispute history
- `GET /api/arbitration/arbitrator/:address` - Get arbitrator data
- `GET /api/arbitration/verify/:topicId/:sequenceNumber` - Verify HCS message

## Usage Examples

### Register IP Asset
```bash
curl -X POST http://localhost:3001/api/arbitration/register-asset \
  -H "Content-Type: application/json" \
  -d '{
    "metadataURI": "ipfs://QmYourMetadataHash",
    "assetName": "My IP Asset"
  }'
```

### Raise Dispute
```bash
curl -X POST http://localhost:3001/api/arbitration/raise-dispute \
  -H "Content-Type: application/json" \
  -d '{
    "ipAssetId": "1",
    "evidence": "ipfs://QmYourEvidenceHash",
    "bondAmount": "1000"
  }'
```

### Cast Vote
```bash
curl -X POST http://localhost:3001/api/arbitration/cast-vote \
  -H "Content-Type: application/json" \
  -d '{
    "disputeId": "1",
    "voteFor": true,
    "stakeAmount": "100"
  }'
```

## Security Features

- **Bond Requirements**: Disputes require significant bond amounts
- **Stake-weighted Voting**: Higher stakes have more influence
- **Time Limits**: Voting and challenge periods prevent indefinite disputes
- **Arbitrator Oversight**: Human arbitrators for complex cases
- **HCS Immutability**: All records cryptographically verified

## Next Steps

1. **Set Environment Variables**: Configure Hedera operator credentials
2. **Add Arbitrators**: Register trusted arbitrators
3. **Test Integration**: Test with IP asset manager
4. **Monitor Disputes**: Use API endpoints to track disputes
5. **Scale System**: Add more arbitrators as needed

## Support

For questions or issues with the arbitration system, please refer to the API documentation or contact the development team.
