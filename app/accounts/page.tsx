import { createClient } from '../../lib/supabase-server'
import { redirect } from 'next/navigation'
import AccountsClient from './AccountsClient'
import { Account } from '../../lib/types'

export default async function AccountsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { redirect('/login') }

  // Busca inicial no servidor
  const { data: accountsData } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('order_index', { ascending: true })
    .order('name', { ascending: true })

  const accounts = (accountsData as Account[]) || []

  return (
    <div className="min-h-screen p-8 pb-32">
      <div className="mx-auto max-w-4xl">
        <AccountsClient initialAccounts={accounts} />
      </div>
    </div>
  )
}