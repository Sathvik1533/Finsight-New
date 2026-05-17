export interface Contractor {
  id: string
  user_id: string
  name: string
  role?: string
  contact?: string
  status: 'active' | 'paused' | 'completed'
  risk_score: number
  risk_reason?: string
  risk_action: 'pay' | 'hold' | 'investigate'
  total_paid: number
  last_update: string
  notes?: string
  created_at: string
}

export interface RiskScore {
  score: number
  reason: string
  action: 'pay' | 'hold' | 'investigate'
}

export interface AuditBrief {
  brief: string
}

export interface RiskAlert {
  contractor_id: string
  contractor_name: string
  alert_text: string
  amount_at_risk: number
  days_inactive: number
}

export interface ContractorWithReceipts extends Contractor {
  receipts: Array<{
    id: string
    amount: number
    merchant: string
    transaction_date: string
    status: string
  }>
}
