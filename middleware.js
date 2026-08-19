// Basic auth in front of the whole site. The password lives in the SITE_PASSWORD environment
// variable on Vercel, never in the bundle. With no variable set the site stays open, so a
// missing setting cannot take the prototype down during a review.
export const config = { matcher: '/((?!_next|favicon.ico).*)' }

export default function middleware(request) {
  const password = process.env.SITE_PASSWORD
  if (!password) return

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
