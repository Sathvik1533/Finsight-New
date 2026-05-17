'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface IntelligenceMeterProps {
  level?: number // 0-100
}

export function IntelligenceMeter({ level = 45 }: IntelligenceMeterProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="w-full overflow-hidden rounded-xl border border-white/8 bg-white/4 p-8 transition-all duration-200 hover:border-white/12 hover:bg-white/6"
      style={{
        boxShadow:
          'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-white">Intelligence Level</h3>
          <p className="text-sm text-white/60">
            Upload more receipts to unlock insights
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/60">Progress</span>
            <span className="font-mono text-sm font-semibold text-amber-400">
              {level}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 overflow-hidden rounded-full bg-white/8">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${level}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300"
              style={{
                boxShadow: '0 0 20px rgba(255, 209, 102, 0.4)',
              }}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="space-y-1">
            <p className="text-xs text-white/60">Next Milestone</p>
            <p className="font-mono text-sm font-semibold text-white">
              {100 - level} more
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-white/60">Current Tier</p>
            <p className="font-mono text-sm font-semibold text-white">
              {level < 25
                ? 'Novice'
                : level < 50
                ? 'Intermediate'
                : level < 75
                ? 'Advanced'
                : 'Expert'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-white/60">Achievements</p>
            <p className="font-mono text-sm font-semibold text-white">
              {Math.floor(level / 25) + 1}/4
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3">
          <p className="text-xs font-medium text-amber-100">
            💡 Tip: Upload receipts to improve your financial insights and unlock
            smarter recommendations.
          </p>
        </div>
      </div>
    </motion.div>
  )
}
