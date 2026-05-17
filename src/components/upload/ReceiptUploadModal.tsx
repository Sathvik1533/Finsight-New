'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Check, AlertCircle, File, Loader2 } from 'lucide-react'

interface ExtractedData {
  merchant: string
  amount: string
  category: string
  date: string
}

interface ErrorState {
  type: 'file_size' | 'file_type' | 'upload' | 'unknown'
  message: string
}

type ModalState = 'empty' | 'preview' | 'uploading' | 'success' | 'error'

interface ReceiptUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onReceiptProcessed?: () => void
}

const LABEL_STYLE = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'rgba(255,255,255,0.35)',
}

const ROW_STYLE = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 0',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
}

export function ReceiptUploadModal({ isOpen, onClose, onReceiptProcessed }: ReceiptUploadModalProps) {
  const [modalState, setModalState] = useState<ModalState>('empty')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<ErrorState | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 10 * 1024 * 1024
  const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

  const validateFile = (f: File): ErrorState | null => {
    if (f.size > MAX_FILE_SIZE) return { type: 'file_size', message: 'File size must be less than 10MB' }
    if (!ACCEPTED_FORMATS.includes(f.type)) return { type: 'file_type', message: 'JPEG, PNG, WebP, or PDF only' }
    return null
  }

  const handleFileSelect = (f: File) => {
    const err = validateFile(f)
    if (err) { setError(err); setModalState('error'); return }
    setFile(f); setError(null); setModalState('preview')
  }

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0])
  }
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFileSelect(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!file) return
    setModalState('uploading')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/receipts/upload', { method: 'POST', body: formData })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Upload failed')
      }
      const result = await response.json()
      setExtractedData({
        merchant: result.extraction.merchant || 'Unknown',
        amount: `₹${result.extraction.amount?.toFixed(2) || '0.00'}`,
        category: result.categorization.category || 'Other',
        date: result.extraction.date || new Date().toISOString().split('T')[0],
      })
      setModalState('success')
      onReceiptProcessed?.()
    } catch (err: any) {
      setError({ type: 'upload', message: err.message || 'Failed to process receipt. Please try again.' })
      setModalState('error')
    }
  }

  const handleUploadAnother = () => {
    setFile(null); setError(null); setExtractedData(null); setModalState('empty')
  }

  const handleClose = () => {
    onClose()
    setTimeout(() => { setFile(null); setError(null); setExtractedData(null); setModalState('empty') }, 300)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
          }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              width: '100%', maxWidth: 520,
              background: 'var(--surface)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 8,
              padding: 28,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 16, fontWeight: 500,
                  letterSpacing: '-0.03em',
                  color: 'var(--t100)', margin: 0,
                }}>
                  Upload receipt
                </h2>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close"
                style={{
                  background: 'none', border: 'none',
                  color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer', padding: 4,
                }}
              >
                <X size={16} />
              </button>
            </div>

            <AnimatePresence mode="wait">

              {/* EMPTY — drop zone */}
              {modalState === 'empty' && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `1px dashed ${isDragging ? 'var(--signal)' : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: 6,
                      padding: '48px 24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: isDragging ? 'rgba(240,180,41,0.03)' : 'transparent',
                      transition: 'all 0.18s',
                    }}
                  >
                    <Upload size={28} color={isDragging ? 'var(--signal)' : 'rgba(255,255,255,0.25)'} style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontSize: 14, color: 'var(--t100)', marginBottom: 6 }}>
                      Drop a receipt here
                    </p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>
                      or click to browse
                    </p>
                    <p style={{ ...LABEL_STYLE, marginTop: 14 }}>
                      JPEG · PNG · WebP · PDF · max 10MB
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileInputChange}
                    accept={ACCEPTED_FORMATS.join(',')}
                    style={{ display: 'none' }}
                    aria-label="File input"
                  />
                </motion.div>
              )}

              {/* PREVIEW */}
              {modalState === 'preview' && file && (
                <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: 16, marginBottom: 20,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 6,
                  }}>
                    {file.type.startsWith('image/')
                      ? <img src={URL.createObjectURL(file)} alt="Preview" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} />
                      : <File size={32} color="rgba(255,255,255,0.4)" />
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: 'var(--t100)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </p>
                      <p style={{ ...LABEL_STYLE, marginTop: 4 }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => { setFile(null); setModalState('empty') }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                      aria-label="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <button
                    onClick={handleUpload}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid var(--signal)',
                      color: 'var(--signal)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 14, fontWeight: 500,
                      letterSpacing: '-0.01em',
                      padding: '12px',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Process receipt →
                  </button>
                </motion.div>
              )}

              {/* UPLOADING */}
              {modalState === 'uploading' && (
                <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ padding: '16px 0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
                    <Loader2 size={28} color="var(--signal)" style={{ marginBottom: 12, animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ fontSize: 14, color: 'var(--t100)', fontWeight: 500, marginBottom: 4 }}>
                      Reading receipt…
                    </p>
                    <p style={{ ...LABEL_STYLE }}>Extracting fields</p>
                  </div>
                  <div>
                    {[
                      { label: 'Merchant', delay: 0.3 },
                      { label: 'Amount',   delay: 0.7 },
                      { label: 'Date',     delay: 1.1 },
                      { label: 'Category', delay: 1.5 },
                    ].map(({ label, delay }) => (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay, duration: 0.3 }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <span style={{ ...LABEL_STYLE }}>{label}</span>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: 96 }}
                          transition={{ delay: delay + 0.2, duration: 0.5 }}
                          style={{
                            height: 2,
                            background: 'rgba(240,180,41,0.25)',
                            borderRadius: 1,
                            overflow: 'hidden',
                          }}
                        >
                          <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ delay: delay + 0.3, duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ height: '100%', width: '50%', background: 'var(--signal)', borderRadius: 1 }}
                          />
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* SUCCESS */}
              {modalState === 'success' && extractedData && (
                <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 16, stiffness: 300 }}
                      style={{
                        width: 44, height: 44,
                        borderRadius: 6,
                        background: 'rgba(240,180,41,0.06)',
                        border: '1px solid rgba(240,180,41,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 14px',
                      }}
                    >
                      <Check size={20} color="var(--signal)" />
                    </motion.div>
                    <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--t100)', marginBottom: 4 }}>
                      Receipt processed
                    </p>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    {[
                      { l: 'Merchant', v: extractedData.merchant },
                      { l: 'Amount',   v: extractedData.amount },
                      { l: 'Category', v: extractedData.category },
                      { l: 'Date',     v: extractedData.date },
                    ].map(({ l, v }) => (
                      <div key={l} style={ROW_STYLE}>
                        <span style={{ ...LABEL_STYLE }}>{l}</span>
                        <span style={{
                          fontFamily: l === 'Amount' ? 'var(--font-mono)' : 'var(--font-body)',
                          fontSize: 13,
                          color: l === 'Amount' ? 'var(--signal)' : 'var(--t100)',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => { handleClose(); window.location.href = '/dashboard' }}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: '1px solid var(--signal)',
                        color: 'var(--signal)',
                        fontFamily: 'var(--font-body)',
                        fontSize: 13, fontWeight: 500,
                        padding: '11px',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      View dashboard →
                    </button>
                    <button
                      onClick={handleUploadAnother}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.55)',
                        fontFamily: 'var(--font-body)',
                        fontSize: 13, fontWeight: 500,
                        padding: '11px',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      Upload another
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ERROR */}
              {modalState === 'error' && error && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    textAlign: 'center', padding: '24px 0',
                  }}>
                    <div style={{
                      width: 44, height: 44,
                      borderRadius: 6,
                      background: 'rgba(224,62,62,0.06)',
                      border: '1px solid rgba(224,62,62,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 14,
                    }}>
                      <AlertCircle size={20} color="var(--red)" />
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--t100)', marginBottom: 8 }}>Something went wrong</p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 24, lineHeight: 1.6 }}>
                      {error.message}
                    </p>
                    <button
                      onClick={() => { setError(null); setModalState(file ? 'preview' : 'empty') }}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.55)',
                        fontFamily: 'var(--font-body)',
                        fontSize: 13, padding: '9px 20px',
                        borderRadius: 6, cursor: 'pointer',
                      }}
                    >
                      Try again
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
