// Basic auth in front of the whole site. The password comes from the SITE_PASSWORD environment
// variable on Vercel and falls back to the one below, so protection works without any setup.
// The fallback is readable in this public repository: set SITE_PASSWORD on Vercel to make the
// password a real secret.
export const config = { matcher: '/((?!_next|favicon.ico).*)' }

export default function middleware(request) {
  const password = process.env.SITE_PASSWORD || 'telaviv'

  const header = request.headers.get('authorization') || ''
  if (header.startsWith('Basic ')) {
    const decoded = atob(header.slice(6))
    const given = decoded.slice(decoded.indexOf(':') + 1)
    if (given === password) return
  }

  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="NewCore prototype"' },
  })
}
