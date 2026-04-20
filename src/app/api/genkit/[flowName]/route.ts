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

    // Check if the request explicitly asks for a stream
    const isStreamRequested = request.headers.get('accept') === 'text/event-stream' || body.stream === true;

    if (isStreamRequested) {
      const responseStream = await flow.stream(body);
      
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of responseStream.stream) {
              const text = typeof chunk === 'string' ? chunk : (chunk as any).text || JSON.stringify(chunk);
              if (text) controller.enqueue(encoder.encode(text));
            }
            
            // Send final structured result for agentic loops (Script Doctor)
            try {
              const finalResult = await responseStream.output();
              if (finalResult) {
                controller.enqueue(encoder.encode(`\n\n[DONE]${JSON.stringify(finalResult)}`));
              }
            } catch (e) {
              console.warn("[Genkit API] Could not get final output for stream:", e);
            }

            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // Standard non-streaming execution
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
