# SeekerIP - Intellectual Property Asset Management Platform

SeekerIP is a comprehensive decentralized platform for managing intellectual property assets on the Hedera network. Built with React, TypeScript, and Solidity, it provides secure IP asset registration, compliance management, licensing, and KYC enforcement using Hedera Token Service (HTS).

---

## Project Details (Hackathon)


SeekerIP is a decentralized IP management platform on Hedera that lets creators register intellectual property on-chain, mint and manage licenses with programmable royalties, and collect revenue automatically. It combines IPFS-backed asset storage, Hedera Token Service (HTS) for NFT and KYC, multi-level compliance (Basic, Enhanced, Institutional), and enhanced licensing with geographic and exclusivity controls. A community arbitration layer allows staking, dispute raising, and voting. The stack includes React/TypeScript frontend with Thirdweb, Node/Express backend, Solidity smart contracts, Pinata for IPFS, and Prisma for persistence—enabling end-to-end IP registration, licensing, royalties, and dispute resolution on Hedera.

### Selected Hackathon Track

**Legacy Builders**

### Tech Stack

- **Frontend:** React, TypeScript, Thirdweb SDK, Vite, CSS
- **Backend:** Node.js, Express, Prisma, SQLite
- **Smart contracts:** Solidity, Hardhat, Hedera (HTS, system contracts)
- **Infrastructure & services:** Hedera Testnet, IPFS (Pinata), Viem
- **Wallet & auth:** Thirdweb Connect (MetaMask, Coinbase, Rabby, Trust, Safe, in-app email/social/passkey)
- **Compliance & licensing:** Hedera KYC, custom compliance and enhanced licensing managers

---

## Project Demo Video

**Demo video (required for submission):** [https://youtu.be/aLNdsHEtMv0](https://youtu.be/aLNdsHEtMv0)

*A submission without a demo video link will not be scored.*

## Project Demo Link

**Live working environment:** [https://darling-axolotl-d3416e.netlify.app/](https://darling-axolotl-d3416e.netlify.app/)

This is the URL to the live working environment of the solution the team has developed.

## Pitch Deck

**Pitch deck:** [SeekerIP Pitch Deck (Google Drive)](https://drive.google.com/file/d/1XGEewc9ZyzES5zIn-hoOb4PEmQqy-tpf/view?usp=sharing)

### Improvements

A key improvement made to the project is **improving the frontend**—enhancing the user interface, landing experience, and overall usability of the SeekerIP application.

---

## 🎯 Features

### **Core IP Asset Management**
- **IP Asset Registration**: Register and tokenize intellectual property assets as NFTs
- **Asset Ownership**: Transfer and manage IP asset ownership
- **Metadata Management**: Store comprehensive IP asset metadata on IPFS
- **NFT Minting**: Automatic NFT creation for registered IP assets using Hedera HTS

### **Compliance & Regulatory Management**
- **Multi-level Compliance**: Basic, Enhanced, and Institutional compliance levels
- **Entity Verification**: Verify individuals, corporations, partnerships, LLCs, trusts, and more
- **Jurisdiction Tracking**: Geographic compliance requirements and restrictions
- **Permission Management**: Control who can hold, trade, and transfer IP assets
- **Comprehensive Audit Trail**: Immutable blockchain-based audit logs for all compliance actions
- **Violation Reporting**: Community-driven compliance monitoring and reporting

### **KYC Management**
- **Hedera KYC Integration**: Full integration with Hedera Token Service KYC
- **Account Association**: Automatic account association with HTS tokens
- **KYC Grant/Revoke**: Manage KYC status for IP asset holders
- **Compliance-Based KYC**: KYC granting with compliance validation
- **Access Control**: Prevent unauthorized distribution of IP rights

### **Enhanced Licensing Management**
- **License Types**: Exclusive, Non-Exclusive, and Sole licensing
- **Geographic Restrictions**: Enforce country, region, or global restrictions
- **Compliance Integration**: License holders must meet compliance requirements
- **License Terms Management**: Create and manage comprehensive license terms
- **Revenue Sharing**: Configure revenue sharing for license holders
- **License Validation**: Multi-level validation before granting licenses

### **Access Control**
- **Compliance-Based Access**: Only verified entities can hold IP assets
- **Transfer Validation**: Recipients must be compliance verified
- **License Validation**: Licensees must meet compliance requirements
- **Unauthorized Prevention**: Smart contract-level protection against unauthorized distribution

## 🏗️ System Architecture

### **Smart Contracts**

#### **IPAssetManagerV2**
- Core IP asset management contract
- Handles registration, transfer, and licensing
- Integrates with compliance and KYC systems
- **Address**: `0xcBE19598bC8443616A55c0BeD139f9048cb50B06`

#### **IPAssetHTSKYC**
- Hedera Token Service NFT collection with KYC
- Manages HTS token creation and KYC operations
- **Address**: `0x4430248F3b2304F946f08c43A06C3451657FD658`
- **HTS Token**: `0x00000000000000000000000000000000006c4167`

#### **IPAssetComplianceManager**
- Compliance verification and management
- Multi-level compliance (Basic, Enhanced, Institutional)
- Permission management (hold, trade, transfer)
- Comprehensive audit trail
- **Address**: `0x60A1d2CEf7fcdcf97d897ffd7c7908539978880c`

#### **EnhancedLicensingManager**
- Enhanced licensing with geographic restrictions
- Exclusive/non-exclusive license management
- Compliance-based license validation
- **Address**: `0x84441AC3855C5a301044C1825375D5813adffA96`

### **Frontend Architecture**

- **Framework**: React with TypeScript
- **Web3 Integration**: Thirdweb SDK
- **State Management**: React Context API
- **Styling**: CSS Modules
- **IPFS Integration**: Pinata for metadata storage

### **Backend Architecture**

- **Framework**: Node.js with Express
- **Web3**: Viem for contract interactions
- **Database**: Prisma with SQLite
- **IPFS**: Pinata integration for content storage

## 🚀 Getting Started

### **Prerequisites**

- Node.js 18+ and npm/yarn/pnpm
- Hedera Testnet account with HBAR
- MetaMask or compatible wallet
- Git

### **Installation**

1. **Clone the repository:**
```bash
git clone <repository-url>
cd seeker
```

2. **Install dependencies:**
```bash
# Frontend
cd app
yarn install

# Backend
cd ../backend
yarn install

# Smart Contracts
cd ../seeker-backend
yarn install
```

3. **Set up environment variables:**

**Frontend (`app/.env`):**
```env
VITE_THIRDWEB_CLIENT_ID=your_thirdweb_client_id
VITE_PINATA_JWT=your_pinata_jwt
```

**Backend (`backend/.env`):**
```env
PRIVATE_KEY=your_hedera_private_key
HEDERA_ACCOUNT_ID=your_hedera_account_id
HEDERA_NETWORK=testnet
PINATA_JWT=your_pinata_jwt
```

4. **Run the development servers:**

**Frontend:**
```bash
cd app
yarn dev
```

**Backend:**
```bash
cd backend
yarn dev
```

Open [http://localhost:5173](http://localhost:5173) to access the application.

## 📁 Project Structure

```
seeker/
├── app/                          # Frontend React application
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── KYCManagement.tsx
│   │   │   ├── ComplianceManagement.tsx
│   │   │   ├── EnhancedLicensingManagement.tsx
│   │   │   └── ...
│   │   ├── services/            # Frontend services
│   │   │   ├── kycService.ts
│   │   │   ├── complianceService.ts
│   │   │   ├── enhancedLicensingService.ts
│   │   │   └── ...
│   │   ├── abi/                 # Contract ABIs
│   │   └── deployed_addresses.json
│   └── package.json
│
├── backend/                      # Backend API server
│   ├── src/
│   │   ├── controllers/         # API controllers
│   │   ├── services/            # Business logic
│   │   ├── config/              # Configuration
│   │   └── utils/               # Utilities
│   └── package.json
│
├── seeker-backend/              # Smart contracts
│   ├── contracts/               # Solidity contracts
│   │   ├── IPAssetManagerV2.sol
│   │   ├── IPAssetHTSKYC.sol
│   │   ├── IPAssetComplianceManager.sol
│   │   ├── EnhancedLicensingManager.sol
│   │   └── ...
│   ├── scripts/                 # Deployment scripts
│   └── hardhat.config.cjs
│
└── README.md
```

## 🔐 Compliance System

### **Compliance Levels**

- **Basic**: Identity verification, basic KYC (Individuals, small businesses)
- **Enhanced**: Business registration, enhanced due diligence (Corporations, partnerships, LLCs)
- **Institutional**: Full regulatory compliance (Trusts, large institutions)

### **Entity Types Supported**

- Individual
- Corporation
- Partnership
- LLC
- Trust
- Government
- Non-Profit

### **Permission Types**

- **Hold IP Assets**: Permission to own IP assets
- **Trade IP Assets**: Permission to trade/license IP assets
- **Transfer IP Assets**: Permission to transfer IP assets

## 📄 Enhanced Licensing

### **License Types**

- **Exclusive**: Only one licensee allowed
- **Non-Exclusive**: Multiple licensees allowed
- **Sole**: Owner + one licensee allowed

### **Geographic Restrictions**

- **None**: No geographic restrictions
- **Country**: Country-level restrictions
- **Region**: Regional restrictions (e.g., EU, US)
- **Global**: Global restrictions

### **License Features**

- Compliance-based validation
- Jurisdiction enforcement
- Revenue sharing configuration
- Expiration management
- Revocation with reason tracking

## 🛡️ Security Features

- **Smart Contract Access Control**: All operations validated at contract level
- **Compliance Validation**: Multi-level compliance checking
- **KYC Enforcement**: Hedera HTS KYC integration
- **Audit Trail**: Immutable blockchain logging
- **Violation Reporting**: Community-driven compliance monitoring

## 📊 Usage Guide

### **1. Register an IP Asset**

1. Navigate to "📝 Register IP" tab
2. Upload your IP asset file
3. Fill in asset details (name, description, tags)
4. Set license type and commercial use permissions
5. Click "Register IP Asset"
6. Wait for transaction confirmation

### **2. Manage KYC**

1. Navigate to "🔐 KYC Management" tab
2. Check KYC status for accounts
3. Grant KYC (requires compliance verification)
4. Revoke KYC if needed
5. View account association status

### **3. Compliance Management**

1. Navigate to "🔐 KYC Management" → "🏛️ Compliance & Regulatory Management"
2. **Verify Compliance**: Verify entity compliance status
3. **Manage Officers**: Add/remove compliance officers
4. **View Audit Trail**: Review compliance history
5. **Report Violations**: Report compliance violations

### **4. Enhanced Licensing**

1. Navigate to "🎫 License Management" tab
2. **Create License Terms**: Set up license terms with restrictions
3. **Grant License**: Grant licenses to compliant entities
4. **Manage Licenses**: Revoke or manage existing licenses
5. **View Licenses**: View all license terms and holders

## 🔧 Deployment

### **Deploy Smart Contracts**

```bash
cd seeker-backend

# Deploy compliance system
npx hardhat run scripts/deployComplianceSystemSimple.cjs --network hedera_testnet

# Deploy enhanced licensing manager
npx hardhat run scripts/deployEnhancedLicensingManager.cjs --network hedera_testnet
```

### **Update Contract Addresses**

After deployment, update contract addresses in:
- `app/src/deployed_addresses.json`
- `backend/src/config/contracts.ts`

## 📚 Documentation

- [IP Asset Compliance System](./IP-ASSET-COMPLIANCE-SYSTEM.md)
- [Enhanced Licensing Management](./ENHANCED-LICENSING-MANAGEMENT-IMPLEMENTATION-COMPLETE.md)
- [IP Asset Access Control](./IP-ASSET-ACCESS-CONTROL-IMPLEMENTATION-COMPLETE.md)
- [Compliance Integration](./COMPLIANCE-UNDER-KYC-INTEGRATION-COMPLETE.md)

## 🧪 Testing

### **Test IP Asset Registration**
1. Ensure you have compliance verification
2. Register a test IP asset
3. Verify NFT minting
4. Check metadata on IPFS

### **Test Compliance System**
1. Verify entity compliance
2. Test permission checks
3. Review audit trail
4. Test violation reporting

### **Test Enhanced Licensing**
1. Create license terms
2. Grant license to compliant entity
3. Test geographic restrictions
4. Verify exclusivity controls

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- **Hedera Testnet Explorer**: [HashScan](https://testnet.hashscan.io)
- **Hedera Documentation**: [docs.hedera.com](https://docs.hedera.com)
- **Thirdweb Documentation**: [portal.thirdweb.com](https://portal.thirdweb.com)

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with ❤️ for the Hedera ecosystem**
