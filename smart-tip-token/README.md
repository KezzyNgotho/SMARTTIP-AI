# SmartTip Token (Hardhat + Sepolia)

This folder is a deployable Hardhat project for SmartTip's test token on Ethereum Sepolia.

## Contract Details

- Name: SmartTip Token
- Symbol: STT
- Decimals: 18
- Initial supply: 1,000,000 STT
- Max supply cap: 10,000,000 STT

## Roles (AccessControl)

- DEFAULT_ADMIN_ROLE: grant and revoke roles
- MINTER_ROLE: mint additional STT (subject to MAX_SUPPLY)
- PAUSER_ROLE: pause and unpause transfers

## Files

- contracts/SmartTipToken.sol: main contract (recommended source)
- SmartTipToken.sol: duplicate copy for quick reference
- hardhat.config.js: Hardhat + Sepolia config
- scripts/deploy.js: deployment script
- .env.example: environment template

## Quick Start

1. Install dependencies:

	npm install

2. Create your env file:

	copy .env.example .env

3. Set deployer key and RPC:

	PRIVATE_KEY=your_key_without_0x
	SEPOLIA_RPC_URL=https://rpc.sepolia.org

4. Compile:

	npm run compile

5. Deploy:

	npm run deploy:sepolia

6. Save deployed token address and wire it into SmartTip app config.

## Security Notes

- Never commit .env
- Use a testnet-only deployer wallet
- Keep minimal Sepolia ETH in that deployer wallet
