'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface KPICardProps {
  icon: LucideIcon
  label: string
  value: string | number
  change?: {
    text: string
    isPositive: boolean
  }
  subtext?: string
  amount?: string
  delay?: number
}

export function KPICard({
  icon: Icon,
  label,
  value,
  change,
  subtext,
  amount,
  delay = 0,
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
      className="group relative overflow-hidden rounded-xl border border-white/8 bg-white/4 p-6 transition-all duration-200 hover:border-white/12 hover:bg-white/6 hover:shadow-xl"
      style={{
        boxShadow:
          'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Animated gradient glow effect on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(circle at center, rgba(255, 209, 102, 0.1), transparent 70%)',
        }}
      />

      <div className="relative z-10 space-y-4">
        {/* Icon and Label */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-white/60">{label}</p>
          </div>
          <Icon className="h-5 w-5 text-amber-400" />
        </div>

        {/* Value Section */}
        <div className="space-y-2">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.2 }}
            className="font-mono text-3xl font-bold text-white"
          >
            {value}
          </motion.div>

          {/* Change indicator or subtext */}
          {change && (
            <p
              className={`text-xs font-medium ${
                change.isPositive ? 'text-[#f0b429]' : 'text-red-400'
              }`}
            >
              {change.isPositive ? '↑' : '↓'} {change.text}
            </p>
          )}

          {subtext && <p className="text-xs text-white/60">{subtext}</p>}

          {amount && <p className="font-mono text-sm text-white/60">{amount}</p>}
        </div>
      </div>
    </motion.div>
  )
}
