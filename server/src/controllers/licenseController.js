import crypto from 'node:crypto'

const PLANS = ['lifetime', '1year', '6months', '1month']

const todayISO = () => new Date().toISOString().split('T')[0]

// Format License Key: MACH-MACH-MACH-MACH-PLAN-YYYYMMDD-HMAC64
// Payload yang ditandatangani: `${machineId}|${plan}|${expiryISO}`
export const verifyLicenseHandler = (req, res) => {
  const secret = process.env.LICENSE_SECRET
  if (!secret) {
    return res.status(500).json({ error: 'LICENSE_SECRET belum dikonfigurasi di server' })
  }

  const licenseKey = (req.get('x-license-key') || '').trim().toUpperCase()
  const machineId = (req.body?.machineId || '').trim().toUpperCase()

  if (!licenseKey) {
    return res.status(400).json({ error: 'Header x-license-key wajib diisi' })
  }
  if (!machineId) {
    return res.status(400).json({ error: 'Body machineId wajib diisi' })
  }

  const parts = licenseKey.split('-')
  const malformed = parts.length !== 7 ||
    !PLANS.includes(parts[4].toLowerCase()) ||
    !/^\d{8}$/.test(parts[5]) ||
    !/^[0-9A-F]{64}$/.test(parts[6])
  if (malformed) {
    return res.json({ valid: false, expiresAt: null })
  }

  const keyMachineId = `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}`
  const plan = parts[4].toLowerCase()
  const expiryISO = `${parts[5].slice(0, 4)}-${parts[5].slice(4, 6)}-${parts[5].slice(6, 8)}`
  const providedSignature = Buffer.from(parts[6], 'hex')

  const payload = `${keyMachineId}|${plan}|${expiryISO}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .toUpperCase()

  const signatureOk = crypto.timingSafeEqual(providedSignature, Buffer.from(expectedSignature, 'hex'))
  const deviceOk = keyMachineId === machineId
  const notExpired = plan === 'lifetime' || expiryISO >= todayISO()

  res.json({
    valid: signatureOk && deviceOk && notExpired,
    expiresAt: plan === 'lifetime' ? null : expiryISO
  })
}
