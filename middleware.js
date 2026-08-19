// A password gate in front of the whole deployment. Basic auth would force the browser to ask
// for a username too, so the gate is a page of our own with a single field. The password comes
// from SITE_PASSWORD on Vercel and falls back to the one below, which is readable in this public
// repository: set the variable to turn it into a real secret.
const PASSWORD = process.env.SITE_PASSWORD || 'telaviv'
const COOKIE = 'nc_gate'
const TOKEN = 'unlocked'

export const config = { matcher: '/((?!favicon.ico).*)' }

function gate(message) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>NewCore · Agentic Access</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #f5f5f5; color: rgba(0,0,0,0.88);
    font-family: "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .card {
    background: #fff; border: 1px solid #f0f0f0; border-radius: 12px;
    padding: 32px; width: 360px; box-shadow: 0 6px 24px rgba(0,0,0,0.06);
  }
  h1 { font-size: 20px; margin: 0 0 6px; }
  p { font-size: 14px; color: rgba(0,0,0,0.65); margin: 0 0 20px; }
  input {
    width: 100%; height: 36px; padding: 0 11px; font-size: 14px;
    border: 1px solid #d9d9d9; border-radius: 6px; outline: none;
    font-family: inherit; color: inherit;
  }
  input:focus { border-color: #1677ff; box-shadow: 0 0 0 2px rgba(22,119,255,0.1); }
  button {
    width: 100%; height: 36px; margin-top: 12px; border: none; border-radius: 6px;
    background: #1677ff; color: #fff; font-size: 14px; font-family: inherit; cursor: pointer;
  }
  button:hover { background: #4096ff; }
  .error { font-size: 13px; color: #cf1322; margin-top: 10px; }
</style>
</head>
<body>
  <form class="card" method="POST" action="/__unlock">
    <h1>NewCore · Agentic Access</h1>
    <p>This prototype is private. Enter the password to open it.</p>
    <input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password" />
    <button type="submit">Open</button>
    ${message ? `<div class="error">${message}</div>` : ''}
  </form>
</body>
</html>`
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

export default async function middleware(request) {
  const url = new URL(request.url)
  const cookie = request.headers.get('cookie') || ''
  if (cookie.includes(`${COOKIE}=${TOKEN}`)) return

  if (url.pathname === '/__unlock' && request.method === 'POST') {
    const form = await request.formData()
    if (form.get('password') === PASSWORD) {
      return new Response(null, {
        status: 303,
        headers: {
          location: '/',
          'set-cookie': `${COOKIE}=${TOKEN}; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax; Secure`,
        },
      })
    }
    return gate('That password does not match.')
  }

  return gate()
}
