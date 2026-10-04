import { getServerSession, NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

const authSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/login' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(c) {
        if (!c?.email || !c.password) return null;
        if (!authSecret) {
          console.error('AUTH_CONFIG_ERROR: NEXTAUTH_SECRET is missing');
          throw new Error('Authentication is not configured. Add NEXTAUTH_SECRET in Vercel.');
        }
        try {
          const email = String(c.email).trim().toLowerCase();
          const u = await prisma.user.findUnique({ where: { email } });
          if (!u || !u.isActive) return null;
          const valid = await bcrypt.compare(String(c.password), u.passwordHash);
          if (!valid) return null;
          return { id: u.id, name: u.name, email: u.email, role: u.role } as any;
        } catch (error) {
          console.error('AUTH_DATABASE_ERROR', error);
          throw new Error('Unable to access the Fuguaa database. Check DATABASE_URL in Vercel.');
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};

export async function currentSession() {
  return getServerSession(authOptions);
}
