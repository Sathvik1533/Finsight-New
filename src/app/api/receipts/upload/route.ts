export const dynamic = 'force-dynamic'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const MAX_SIZE_BYTES = 10 * 1024 * 1024  // 10MB
const FREE_TIER_LIMIT = 25

export async function POST(request: NextRequest) {
  // ── 1. Session check ──────────────────────────────────────────
  const supabase = createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const userId = session.user.id  // ← ONLY source of user identity

  // ── 2. Free tier gate ─────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_receipts_uploaded, subscription_tier')
    .eq('id', userId)
    .single()

  if (profile?.subscription_tier === 'free' &&
      (profile?.total_receipts_uploaded || 0) >= FREE_TIER_LIMIT) {
    return NextResponse.json({ 
      error: 'LIMIT_REACHED',
      message: 'Free tier limit of 25 receipts reached. Upgrade to continue.'
    }, { status: 402 })
  }

  // ── 3. File validation ────────────────────────────────────────
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ 
      error: 'FILE_TOO_LARGE',
      message: 'File size must be less than 10MB'
    }, { status: 400 })
  }
  
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ 
      error: 'INVALID_FILE_TYPE',
      message: 'Only JPEG, PNG, WebP, and PDF files are allowed'
    }, { status: 400 })
  }

  // ── 4. Upload to Supabase Storage ────────────────────────────
  const receiptId = crypto.randomUUID()
  const ext = file.name.split('.').pop() || 'jpg'
  const storagePath = `${userId}/${receiptId}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: storageError } = await supabase.storage
    .from('receipts')
    .upload(storagePath, buffer, { contentType: file.type })

  if (storageError) {
    console.error('Storage upload failed:', storageError)
    return NextResponse.json({ 
      error: 'Storage upload failed',
      message: 'Failed to save receipt image'
    }, { status: 500 })
  }

  // ── 5. Create receipts row ────────────────────────────────────
  const { error: dbError } = await supabase.from('receipts').insert({
    id: receiptId,
    user_id: userId,
    storage_path: storagePath,
    status: 'pending'
  })

  if (dbError) {
    console.error('Database insert failed:', dbError)
    // Clean up storage if DB insert fails
    await supabase.storage.from('receipts').remove([storagePath])
    return NextResponse.json({ 
      error: 'Database error',
      message: 'Failed to create receipt record'
    }, { status: 500 })
  }

  // ── 6. Call FastAPI ───────────────────────────────────────────
  const imageBase64 = buffer.toString('base64')

  try {
    const fastapiResponse = await fetch(
      `${process.env.FASTAPI_INTERNAL_URL}/analyze/receipt`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': process.env.FASTAPI_SECRET_KEY!
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          media_type: file.type,
          user_id: userId,
          receipt_id: receiptId
        }),
        signal: AbortSignal.timeout(60000)  // 60s timeout
      }
    )

    if (!fastapiResponse.ok) {
      const errorData = await fastapiResponse.json().catch(() => ({}))
      return NextResponse.json(errorData, { status: fastapiResponse.status })
    }

    const result = await fastapiResponse.json()
    return NextResponse.json(result, { status: 200 })
    
  } catch (error: any) {
    console.error('FastAPI call failed:', error)
    
    // Mark receipt as failed in database
    await supabase.from('receipts').update({
      status: 'failed',
      processing_error: error.message || 'FastAPI timeout or network error'
    }).eq('id', receiptId)
    
    return NextResponse.json({ 
      error: 'Processing failed',
      message: 'Receipt processing timed out or failed. Please try again.'
    }, { status: 500 })
  }
}
