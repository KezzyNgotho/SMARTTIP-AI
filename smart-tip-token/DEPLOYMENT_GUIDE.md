# SmartTip Token - Hardhat Deployment Guide

## Prerequisites

1. Node.js 18+
2. Sepolia ETH in deployer wallet
3. Deployer private key (testnet wallet only)

## 1) Install

npm install

## 2) Configure Environment

copy .env.example .env

Set values in .env:

PRIVATE_KEY=your_private_key_without_0x
SEPOLIA_RPC_URL=https://rpc.sepolia.org
ETHERSCAN_API_KEY=optional_for_verify

## 3) Compile

npm run compile

## 4) Deploy to Sepolia

npm run deploy:sepolia

The deploy script prints:
- token address
- INITIAL_SUPPLY
- MAX_SUPPLY
- current totalSupply
- MINTER_ROLE hash
- PAUSER_ROLE hash

## 5) Optional Verify

npx hardhat verify --network sepolia <TOKEN_ADDRESS> <DEPLOYER_ADDRESS>

## Post-Deploy Checklist

1. Save token address
2. Add token to wallet UI (optional)
3. Configure SmartTip to use this token address on Sepolia
4. Enable real tipping mode in SmartTip backend
