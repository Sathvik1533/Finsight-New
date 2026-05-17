import http from 'http'

function checkServer(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => resolve((res.statusCode ?? 0) < 500))
    req.on('error', () => resolve(false))
    req.setTimeout(5000, () => { req.destroy(); resolve(false) })
  })
}

async function globalSetup() {
  const nextOk = await checkServer('http://localhost:3000')
  if (!nextOk) throw new Error('Next.js not responding at http://localhost:3000 — run: npm run dev')
  console.log('  ✓ Next.js is up')

  const fastapiOk = await checkServer('http://localhost:8000/health')
  if (!fastapiOk) throw new Error('FastAPI not responding at http://localhost:8000 — start it first')
  console.log('  ✓ FastAPI is up')
}

export default globalSetup
