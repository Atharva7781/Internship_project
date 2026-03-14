import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {},
  {
    callbacks: {
      authorized: ({ token, req }) => {

        if (!token) return false

        if (req.nextUrl.pathname.startsWith("/admin")) {
          return token.role === "ADMIN"
        }

        if (req.nextUrl.pathname.startsWith("/teacher-dashboard")) {
          return token.role === "TEACHER" || token.role === "ADMIN"
        }

        return true
      }
    }
  }
)

export const config = {
  matcher: ["/admin/:path*", "/teacher-dashboard/:path*"]
}
