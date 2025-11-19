#!/usr/bin/env node

const { ethers } = require('ethers');

async function testBigInt() {
  console.log('🔍 Testing BigInt conversion...');

  try {
    const provider = new ethers.JsonRpcProvider('https://testnet.hashio.io/api');
    const contract = new ethers.Contract(
      '0x9f4FC76E91e483b02DA42A0a10592e603F670dc9',
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );

    const balance = await contract.balanceOf('0x9404966338eB27aF420a952574d777598Bbb58c4');
    
    console.log('Raw balance:', balance);
    console.log('Type:', typeof balance);
    console.log('String:', balance.toString());
    console.log('BigInt from string:', BigInt(balance.toString()));
    console.log('Number:', Number(balance));
    
    // Test different conversion methods
    const testValue = BigInt(balance.toString());
    console.log('Test BigInt value:', testValue);
    console.log('Test BigInt type:', typeof testValue);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testBigInt().catch(console.error);
