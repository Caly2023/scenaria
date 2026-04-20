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

    // Check if the request explicitly asks for a stream
    const isStreamRequested = request.headers.get('accept') === 'text/event-stream' || body.stream === true;
    console.log(`[Genkit API][${requestId}] Stream Requested:`, isStreamRequested);

    if (isStreamRequested) {
      console.log(`[Genkit API][${requestId}] Starting flow stream...`);
      const responseStream = await flow.stream(body);
      
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            console.log(`[Genkit API][${requestId}] Stream connected, sending chunks...`);
            for await (const chunk of responseStream.stream) {
              const text = typeof chunk === 'string' ? chunk : (chunk as any).text || JSON.stringify(chunk);
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            }
            
            // Send final structured result for agentic loops (Script Doctor)
            try {
              console.log(`[Genkit API][${requestId}] Stream finished, awaiting final output...`);
              const finalResult = await responseStream.output;
              if (finalResult) {
                controller.enqueue(encoder.encode(`\n\n[DONE]${JSON.stringify(finalResult)}`));
              }
            } catch (e) {
              console.warn(`[Genkit API][${requestId}] Could not get final output for stream:`, e);
            }

            console.log(`[Genkit API][${requestId}] Closing stream.`);
            controller.close();
          } catch (err) {
            console.error(`[Genkit API][${requestId}] Stream Error:`, err);
            controller.error(err);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          // Disables buffering on some proxy layers for better chunk delivery.
          'X-Accel-Buffering': 'no',
        },
      });
    }

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
