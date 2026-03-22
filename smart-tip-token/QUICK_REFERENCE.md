# SmartTip Token - Quick Reference

## Contract Constants

- INITIAL_SUPPLY = 1,000,000 * 10^18
- MAX_SUPPLY = 10,000,000 * 10^18

## Roles

- DEFAULT_ADMIN_ROLE
- MINTER_ROLE
- PAUSER_ROLE

## Core Commands

- npm install
- npm run compile
- npm run deploy:sepolia

## Environment

In .env:

PRIVATE_KEY=your_key_without_0x
SEPOLIA_RPC_URL=https://rpc.sepolia.org
ETHERSCAN_API_KEY=optional

## Deploy Output You Need

- deployed token address
- total supply numbers
- role hashes

## Private Key Location

- Put deployer key only in smart-tip-token/.env
- Never place private keys in extension app source files
