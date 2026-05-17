'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Coffee, ShoppingBag, Zap, Utensils, Pill, MapPin } from 'lucide-react'

export interface Transaction {
  id: string
  merchant: string
  category: string
  amount: number
  date: string
}

function getIconForCategory(category: string) {
  switch (category) {
    case 'Food & Dining':
      return <Utensils className="h-5 w-5 text-amber-400" />
    case 'Groceries':
      return <ShoppingBag className="h-5 w-5 text-blue-400" />
    case 'Transportation':
      return <MapPin className="h-5 w-5 text-green-400" />
    case 'Shopping & Retail':
      return <ShoppingBag className="h-5 w-5 text-indigo-400" />
    case 'Entertainment & Leisure':
      return <Zap className="h-5 w-5 text-yellow-400" />
    case 'Health & Medical':
      return <Pill className="h-5 w-5 text-red-400" />
    case 'Travel & Accommodation':
      return <MapPin className="h-5 w-5 text-teal-400" />
    case 'Utilities & Bills':
      return <Zap className="h-5 w-5 text-orange-400" />
    case 'Software & Subscriptions':
      return <Coffee className="h-5 w-5 text-cyan-400" />
    case 'Business & Professional':
      return <Zap className="h-5 w-5 text-amber-400" />
    case 'Education':
      return <Coffee className="h-5 w-5 text-purple-400" />
    default:
      return <Zap className="h-5 w-5 text-white/60" />
  }
}

export function TransactionFeed({ transactions }: { transactions: Transaction[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="w-full overflow-hidden rounded-xl border border-white/8 bg-white/4 p-8 transition-all duration-200 hover:border-white/12 hover:bg-white/6"
      style={{
        boxShadow:
          'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-white">Recent Transactions</h3>
          <p className="text-sm text-white/60">Last 30 days</p>
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/2 p-6 text-center text-white/60">
              No processed receipts yet. Upload a receipt to see your transactions here.
            </div>
          ) : (
            transactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
              whileHover={{ x: 4 }}
              className="flex items-center justify-between rounded-lg border border-white/4 bg-white/2 p-4 transition-all duration-200 hover:border-white/8 hover:bg-white/4"
            >
              {/* Left Side: Icon, Merchant, Category */}
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/8">
                  {getIconForCategory(transaction.category)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">
                    {transaction.merchant}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="inline-block rounded bg-amber-400/20 px-2 py-0.5 text-xs font-medium text-amber-200">
                      {transaction.category}
                    </span>
                    <span className="text-xs text-white/40">{transaction.date}</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Amount */}
              <div className="text-right">
                <p className="font-mono text-sm font-semibold text-white">
                  −₹{transaction.amount.toLocaleString()}
                </p>
              </div>
            </motion.div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4">
          <button className="w-full rounded-lg border border-amber-400/30 bg-amber-400/10 py-2 text-center text-sm font-medium text-amber-200 transition-all duration-200 hover:border-amber-400/50 hover:bg-amber-400/20">
            View All Transactions
          </button>
        </div>
      </div>
    </motion.div>
  )
}
