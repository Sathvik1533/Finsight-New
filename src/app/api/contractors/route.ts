export const dynamic = 'force-dynamic'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const FASTAPI = process.env.FASTAPI_INTERNAL_URL!
const SECRET  = process.env.FASTAPI_SECRET_KEY!

function fastapiHeaders(userId: string) {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Secret': SECRET,
    'X-User-Id': userId,
  }
}

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(`${FASTAPI}/contractors`, {
    headers: fastapiHeaders(session.user.id),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const res = await fetch(`${FASTAPI}/contractors`, {
    method: 'POST',
    headers: fastapiHeaders(session.user.id),
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
