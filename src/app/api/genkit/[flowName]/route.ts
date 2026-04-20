import { NextRequest, NextResponse } from 'next/server';
import { flows, FlowName } from '@/services/ai/flows';

/**
 * GENKIT API ROUTE
 * Dynamically dispatches requests to the appropriate Genkit Flow.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { flowName: string } }
) {
  try {
    const { flowName } = await params;
    const body = await request.json();

    // Validate flow existence
    if (!(flowName in flows)) {
      return NextResponse.json(
        { error: `Flow "${flowName}" not found` },
        { status: 404 }
      );
    }

    const flow = flows[flowName as FlowName];

    // Execute the flow
    // Genkit flows are designed to be called with the input directly
    const result = await flow(body);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[Genkit API Error]:`, error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
