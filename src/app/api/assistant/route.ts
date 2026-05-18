import { groq } from '@ai-sdk/groq'
import { streamText, convertToModelMessages, type UIMessage } from 'ai'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are FinSight AI, a GST expense intelligence assistant for Indian freelancers and small businesses.

You answer specifically about the user's receipts, ITC eligibility, GST heads, contractor TDS, and CA-ready exports.

Rules:
- Use Indian number format (₹1,24,000 not ₹124,000). Place ₹ before the amount.
- Be concise — never more than 4 short sentences per response.
- Use plain language. No bullet-point lists unless the user explicitly asks for one.
- Reference real data when available (assume the user has 47 receipts, ₹18,340 in GST paid this quarter, ₹12,840 in claimable ITC).
- When citing a vendor, include the exact rupee amount in the same sentence.
- For ITC questions, name the HSN code or GST rate.
- Today's date is May 2026, FY 2025-26.
- Never speculate beyond what a CA would say. Defer to "your CA can confirm" if uncertain.`

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      temperature: 0.3,
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Assistant unavailable', detail: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
