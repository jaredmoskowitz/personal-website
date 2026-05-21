import { headers } from 'next/headers';
import { isLocalAdminContext } from '@/lib/is-local';
import AdminQueue from './AdminQueue';

export default async function AdminPage() {
  const h = await headers();
  const local = isLocalAdminContext({ headers: h });

  if (!local) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-mono max-w-xl">
        <h1 className="text-2xl font-bold mb-2">Reading Approval Queue</h1>
        <p className="text-zinc-400 text-sm leading-relaxed">
          This queue only runs on your machine. Start the dev server and open{' '}
          <a href="http://localhost:3000/admin" className="text-emerald-400 hover:underline">
            http://localhost:3000/admin
          </a>
          {' '}(or <code className="text-zinc-300">127.0.0.1:3000/admin</code>).
        </p>
      </main>
    );
  }

  return <AdminQueue />;
}
