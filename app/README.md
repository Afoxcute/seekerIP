# SeekerIP Frontend

A modern React application for IP (Intellectual Property) management on the Hedera blockchain.

## Features

- **IP Asset Registration**: Upload and register IP assets on Hedera
- **License Management**: Create and manage licenses for IP assets
- **Revenue Distribution**: Pay revenue and distribute royalties
- **Modern UI**: Beautiful, responsive design with glassmorphism effects
- **Real-time Notifications**: Toast notifications for user feedback
- **IPFS Integration**: Decentralized storage for IP content

## Getting Started

### Prerequisites

- Node.js 18+ 
- Yarn or npm
- Hedera testnet account

### Installation

```bash
cd app
yarn install
```

### Development

```bash
yarn dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
yarn build
```

## Usage

### Registering IP Assets

1. Connect your wallet (Hedera testnet)
2. Upload your IP file (images, documents, audio, video)
3. Set the IP name and description
4. Configure license parameters
5. Click "Register IP" to mint the asset on Hedera

### Minting Licenses

1. Select an existing IP asset
2. Set royalty percentage and duration
3. Configure commercial use permissions
4. Click "Mint License" to create the license

### Paying Revenue

1. Select the target IP Asset
2. Enter the payment amount in HBAR
3. Click "Pay Revenue" and confirm the transaction
4. Royalties will be automatically distributed to license holders

### Claiming Royalties

1. Select the IP Asset you have licenses for
2. Click "Claim Royalties"
3. Confirm the transaction to receive your accumulated royalties

## Technical Details

- **Blockchain**: Hedera Testnet (Chain ID: 296)
- **Smart Contract**: SeekerIP.sol
- **Wallet Integration**: Thirdweb SDK
- **IPFS**: Used for storing IP content, metadata, and license terms
- **ERC-6551**: Token-bound accounts for IP management

## Contract Addresses

- **SeekerIP**: `0x0734d90FA1857C073c4bf1e57f4F4151BE2e9f82`
- **ERC6551Registry**: `0xec79fC54BCb5D41Db79552c1c463FFC33479Be03`
- **ERC6551Account**: `0x7296c77Edd04092F6a8117c7f797E0680d97fa1`

## Security Features

- Reentrancy protection
- Access control for admin functions
- Dispute resolution system
- Encrypted content support
- On-chain royalty tracking

## Support

For issues or questions, please refer to the main project documentation or create an issue in the repository.
