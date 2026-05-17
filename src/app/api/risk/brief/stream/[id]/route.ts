import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const FASTAPI = process.env.FASTAPI_INTERNAL_URL!
const SECRET  = process.env.FASTAPI_SECRET_KEY!

type Params = { params: { id: string } }

export async function POST(_req: NextRequest, { params }: Params) {
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const upstream = await fetch(`${FASTAPI}/risk/brief/stream/${params.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': SECRET,
      'X-User-Id': session.user.id,
    },
  })

  if (!upstream.ok) {
    return NextResponse.json({ error: 'Stream failed' }, { status: upstream.status })
  }

  // Pass the ReadableStream straight through — browser gets tokens as they arrive
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no',
    },
  })
}
