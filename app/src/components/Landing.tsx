import React from "react";
import { ConnectButton } from "thirdweb/react";
import type { ThirdwebClient } from "thirdweb";
import type { Wallet } from "thirdweb/wallets";
import type { Chain } from "thirdweb";
import "./Landing.css";

export interface LandingProps {
  thirdwebClient: ThirdwebClient;
  wallets: Wallet[];
  chain: Chain;
}

const features = [
  {
    icon: "📝",
    title: "Register IP Assets",
    description: "Upload creations to IPFS and register them on-chain with proof of ownership and metadata.",
  },
  {
    icon: "🎫",
    title: "License Management",
    description: "Mint and manage licenses with configurable royalty rates, terms, and commercial use.",
  },
  {
    icon: "💰",
    title: "Revenue & Royalties",
    description: "Collect royalty payments automatically and track revenue across your IP portfolio.",
  },
  {
    icon: "🏛️",
    title: "Arbitration",
    description: "Stake, vote on disputes, and resolve IP conflicts through a transparent governance layer.",
  },
  {
    icon: "🔐",
    title: "KYC & Compliance",
    description: "Verify identity and meet compliance requirements for licensing and revenue flows.",
  },
];

export const Landing: React.FC<LandingProps> = ({ thirdwebClient, wallets, chain }) => {
  return (
    <div className="landing">
      <div className="landing-bg">
        <div className="landing-bg-gradient" />
        <div className="landing-bg-grid" aria-hidden />
      </div>

      <section className="landing-hero">
        <div className="landing-hero-badge">On Hedera • IP on-chain</div>
        <h1 className="landing-hero-title">
          Own, license & monetize
          <span className="landing-hero-title-accent"> your IP</span>
        </h1>
        <p className="landing-hero-subtitle">
          Register intellectual property on-chain, issue licenses with programmable royalties,
          and resolve disputes through community arbitration. All in one place.
        </p>
        <div className="landing-hero-cta">
          <ConnectButton
            client={thirdwebClient}
            wallets={wallets}
            chain={chain}
            theme="dark"
            connectButton={{
              label: "Connect wallet to get started",
              style: {
                padding: "1rem 2rem",
                fontSize: "1.0625rem",
                fontWeight: 600,
                borderRadius: "var(--radius-xl)",
                background: "var(--gradient-primary)",
                color: "white",
                border: "none",
                boxShadow: "0 4px 20px rgba(6, 182, 212, 0.35)",
              },
            }}
          />
        </div>
        <p className="landing-hero-hint">
          No wallet? Use email or social login to create one in seconds.
        </p>
      </section>

      <section className="landing-features">
        <h2 className="landing-features-heading">What you can do with SeekerIP</h2>
        <div className="landing-features-grid">
          {features.map((feature, i) => (
            <article
              key={feature.title}
              className="landing-feature-card"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <span className="landing-feature-icon" aria-hidden>
                {feature.icon}
              </span>
              <h3 className="landing-feature-title">{feature.title}</h3>
              <p className="landing-feature-desc">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta-block">
        <div className="landing-cta-block-inner">
          <h2 className="landing-cta-block-title">Ready to protect your ideas?</h2>
          <p className="landing-cta-block-text">
            Connect your wallet and register your first IP asset in minutes.
          </p>
          <ConnectButton
            client={thirdwebClient}
            wallets={wallets}
            chain={chain}
            theme="dark"
            connectButton={{
              label: "Connect wallet",
              style: {
                padding: "0.875rem 1.75rem",
                fontSize: "1rem",
                fontWeight: 600,
                borderRadius: "var(--radius-lg)",
                background: "rgba(255,255,255,0.12)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-secondary)",
              },
            }}
          />
        </div>
      </section>

      <footer className="landing-footer">
        <p>SeekerIP — IP registration, licensing & arbitration on Hedera</p>
      </footer>
    </div>
  );
};
