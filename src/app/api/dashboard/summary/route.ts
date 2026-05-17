export const dynamic = 'force-dynamic'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const fmt = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id

    // Support 30 / 60 / 90 day windows — default 30
    const days = parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10)
    const validDays = [30, 60, 90].includes(days) ? days : 30
    const since = new Date()
    since.setDate(since.getDate() - validDays)

    // Fetch ALL transactions (no date filter) + contractors in parallel
    // KPIs show all-time data; chart filters by window client-side
    const [{ data: transactions }, { data: contractors }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false }),
      supabase
        .from('contractors')
        .select('id, name, risk_score, total_paid, last_update')
        .eq('user_id', userId),
    ])

    const txList = transactions ?? []
    const ctList = contractors ?? []

    // ── KPIs ─────────────────────────────────────────────────────────────────
    const totalSpend = txList.reduce((s, t) => s + (t.amount ?? 0), 0)

    const categoryTotals: Record<string, number> = {}
    txList.forEach((t) => {
      const c = t.category ?? 'Other'
      categoryTotals[c] = (categoryTotals[c] ?? 0) + (t.amount ?? 0)
    })
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]

    const activeContractors  = ctList.length
    const highRisk           = ctList.filter((c) => (c.risk_score ?? 0) > 65)
    const highRiskContractors = highRisk.length
    const paymentsAtRiskRaw  = highRisk.reduce((s, c) => s + (c.total_paid ?? 0), 0)
    const avgRiskScore       = ctList.length
      ? Math.round(ctList.reduce((s, c) => s + (c.risk_score ?? 0), 0) / ctList.length)
      : 0

    // ── Spend chart — group by week bucket inside the window ─────────────────
    // Builds N weekly buckets (4 for 30d, 8 for 60d, 12 for 90d)
    const buckets = Math.ceil(validDays / 7)
    const spendChart: { month: string; amount: number }[] = Array.from(
      { length: buckets },
      (_, i) => {
        const bucketStart = new Date(since)
        bucketStart.setDate(bucketStart.getDate() + i * 7)
        const bucketEnd = new Date(bucketStart)
        bucketEnd.setDate(bucketEnd.getDate() + 7)

        const bucketAmount = txList
          .filter((t) => {
            const d = new Date(t.transaction_date)
            return d >= bucketStart && d < bucketEnd
          })
          .reduce((s, t) => s + (t.amount ?? 0), 0)

        const label = bucketStart.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        })
        return { month: label, amount: Math.round(bucketAmount) }
      }
    )

    // ── Recent transactions (last 10) ─────────────────────────────────────────
    const recentTx = txList.slice(0, 10).map((t) => ({
      id: t.id,
      merchant: t.merchant ?? 'Unknown',
      category: t.category ?? 'Other',
      amount: t.amount ?? 0,
      date: t.transaction_date
        ? new Date(t.transaction_date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
          })
        : '—',
      gst_head: t.gst_head ?? null,
      gst_rate: t.gst_rate ?? null,
      itc_eligible: t.itc_eligible ?? false,
    }))

    return NextResponse.json({
      days: validDays,
      kpis: {
        activeContractors,
        highRiskContractors,
        paymentsAtRisk: fmt(paymentsAtRiskRaw),
        paymentsAtRiskRaw,
        avgRiskScore,
        totalSpend: fmt(totalSpend),
        transactions: txList.length,
        topCategory: topCategory?.[0] ?? 'None',
        topCategoryAmount: fmt(topCategory?.[1] ?? 0),
      },
      spendChart,
      transactions: recentTx,
    })
  } catch (err) {
    console.error('[dashboard/summary]', err)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
