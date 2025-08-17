import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const SEI_RPC_URL = "https://evm-rpc-testnet.sei-apis.com";
const USDC_ADDRESS = "0x4fCF1784B31630811181f670Aea7A7bEF803eaED";

export async function POST(request: NextRequest) {
  try {
    const { userAddress } = await request.json();

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(SEI_RPC_URL);

    // Get SEI balance
    const seiBalance = await provider.getBalance(userAddress);

    // Get USDC balance
    const usdcContract = new ethers.Contract(
      USDC_ADDRESS,
      ["function balanceOf(address) view returns (uint256)"],
      provider
    );
    const usdcBalance = await usdcContract.balanceOf(userAddress);

    const balances = {
      SEI: parseFloat(ethers.formatEther(seiBalance)).toFixed(4),
      USDC: parseFloat(ethers.formatUnits(usdcBalance, 6)).toFixed(2),
      address: userAddress
    };

    return NextResponse.json({
      success: true,
      balances
    });

  } catch (error) {
    console.error('Balance check error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balances' },
      { status: 500 }
    );
  }
}