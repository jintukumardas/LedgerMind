import { NextRequest, NextResponse } from 'next/server';

// In a real application, this would be stored in a database
// For demo purposes, we'll use a simple in-memory store
const registeredAgents: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const agentData = await request.json();

    if (!agentData.name || !agentData.description || !agentData.category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create agent record
    const newAgent = {
      address: `0x${Math.random().toString(16).slice(2, 42)}`, // Generate mock address
      name: agentData.name,
      description: agentData.description,
      capabilities: agentData.capabilities || [],
      pricePerUse: agentData.pricePerUse || 5,
      rating: 4.0 + Math.random(), // Random initial rating
      totalUses: 0,
      owner: agentData.ownerAddress,
      logoUri: agentData.logoUri,
      isActive: true,
      createdAt: new Date(),
      totalEarned: 0,
      monthlyUses: 0,
      category: agentData.category,
      aiModelEndpoint: agentData.aiModelEndpoint,
      supportEmail: agentData.supportEmail,
      websiteUrl: agentData.websiteUrl,
      githubUrl: agentData.githubUrl,
      documentationUrl: agentData.documentationUrl,
      tags: agentData.tags || [],
      isOpenSource: agentData.isOpenSource || false,
      testingInstructions: agentData.testingInstructions,
    };

    // Store the agent
    registeredAgents.push(newAgent);

    return NextResponse.json({
      success: true,
      agent: newAgent,
      message: 'Agent registered successfully'
    });

  } catch (error) {
    console.error('Agent registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register agent' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      agents: registeredAgents
    });
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}