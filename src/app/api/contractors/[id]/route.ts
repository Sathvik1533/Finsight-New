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

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(`${FASTAPI}/contractors/${params.id}`, {
    headers: fastapiHeaders(session.user.id),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const res = await fetch(`${FASTAPI}/contractors/${params.id}`, {
    method: 'PUT',
    headers: fastapiHeaders(session.user.id),
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
