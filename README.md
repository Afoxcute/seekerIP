# Hedgehog

Hedgehog is a decentralized finance (DeFi) platform that enables users to collateralize their real-world assets and borrow against them. The frontend is built with Next.js and modern web technologies, it provides a secure and efficient way to unlock the value of tokenized equities.

## Features

- **Asset Collateralization**: Use your tokenized equities as collateral
- **Borrowing Platform**: Access loans against your collateralized assets
- **Market Overview**: Real-time market data and asset performance tracking
- **Portfolio Management**: Track and manage your assets and positions
- **Secure Transactions**: Built with industry-standard security practices
- **Modern UI/UX**: Clean, intuitive interface for seamless interaction

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Web3 Integration**: wagmi, viem, RainbowKit
- **Database**: LibSQL
- **State Management**: TanStack Query
- **UI Components**: Radix UI
- **Form Handling**: React Hook Form
- **Data Visualization**: Recharts

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/hedgehog-project/hedgehog-frontend.git
cd hedgehog
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up your environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

- `/src/app` - Next.js app router pages and layouts
- `/src/components` - Reusable React components
- `/src/lib` - Utility functions and shared logic
- `/src/hooks` - Custom React hooks
- `/src/styles` - Global styles and Tailwind configuration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
