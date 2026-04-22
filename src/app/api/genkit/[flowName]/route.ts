import { NextRequest, NextResponse } from 'next/server';
import { flows, FlowName } from '@/services/ai/flows';

// Vercel/Genkit streaming requires Node runtime and a longer max duration.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GENKIT API ROUTE
 * Dynamically dispatches requests to the appropriate Genkit Flow.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ flowName: string }> }
) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[Genkit API][${requestId}] POST request received`);

  try {
    const { flowName } = await params;
    console.log(`[Genkit API][${requestId}] Flow Name:`, flowName);

    const body = await request.json();
    console.log(`[Genkit API][${requestId}] Request Body:`, JSON.stringify(body).substring(0, 200) + "...");

    // Validate flow existence
    if (!(flowName in flows)) {
      console.error(`[Genkit API][${requestId}] Error: Flow "${flowName}" not found`);
      return NextResponse.json(
        { error: `Flow "${flowName}" not found` },
        { status: 404 }
      );
    }

    const flow = flows[flowName as FlowName];

    // Standard non-streaming execution
    console.log(`[Genkit API][${requestId}] Executing flow "${flowName}" (non-stream)...`);
    const result = await flow(body);
    console.log(`[Genkit API][${requestId}] Flow "${flowName}" execution complete.`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[Genkit API][${requestId}] Fatal Error in flow:`, error);
    
    // Return a structured error that the client can parse
    return NextResponse.json(
      { 
        error: error.message || 'Internal Server Error',
        requestId,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
