export const dynamic = 'force-dynamic'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/budgets — returns budget limits + current month spend per category
export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [{ data: budgets }, { data: transactions }] = await Promise.all([
    supabase.from('budgets').select('*').eq('user_id', userId),
    supabase
      .from('transactions')
      .select('category, amount')
      .eq('user_id', userId)
      .gte('transaction_date', monthStart.toISOString().split('T')[0]),
  ])

  // Compute spend per category this month
  const spendByCategory: Record<string, number> = {}
  ;(transactions ?? []).forEach((t) => {
    const c = t.category ?? 'Other'
    spendByCategory[c] = (spendByCategory[c] ?? 0) + (t.amount ?? 0)
  })

  // Attach current spend and alert flag to each budget
  const result = (budgets ?? []).map((b) => {
    const spent = spendByCategory[b.category] ?? 0
    return {
      ...b,
      spent,
      percent: Math.round((spent / b.monthly_limit) * 100),
      exceeded: spent > b.monthly_limit,
    }
  })

  return NextResponse.json(result)
}

// POST /api/budgets — upsert a budget limit
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { category, monthly_limit } = body

  if (!category || !monthly_limit || monthly_limit <= 0) {
    return NextResponse.json({ error: 'category and monthly_limit required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('budgets')
    .upsert(
      { user_id: session.user.id, category, monthly_limit },
      { onConflict: 'user_id,category' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/budgets?category=Food+%26+Dining
export async function DELETE(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const category = req.nextUrl.searchParams.get('category')
  if (!category) return NextResponse.json({ error: 'category required' }, { status: 400 })

  await supabase
    .from('budgets')
    .delete()
    .eq('user_id', session.user.id)
    .eq('category', category)

  return NextResponse.json({ ok: true })
}
