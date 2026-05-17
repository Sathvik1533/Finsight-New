export const dynamic = 'force-dynamic'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const FASTAPI = process.env.FASTAPI_INTERNAL_URL!
const SECRET  = process.env.FASTAPI_SECRET_KEY!

type Params = { params: { id: string } }

export async function POST(_req: NextRequest, { params }: Params) {
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(`${FASTAPI}/risk/score/${params.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': SECRET,
      'X-User-Id': session.user.id,
    },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
