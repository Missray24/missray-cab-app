import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  role?: 'client' | 'driver' | 'admin'
  name?: string
  firstName?: string
  lastName?: string
  phone?: string
  status?: string
}

export async function signUp(email: string, password: string, userData: {
  name: string
  firstName: string
  lastName: string
  phone: string
  role: 'client' | 'driver'
  driverProfile?: any
}) {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) throw authError
  if (!authData.user) throw new Error('Failed to create user')

  // 2. Create user profile
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      uid: authData.user.id,
      role: userData.role,
      name: userData.name,
      first_name: userData.firstName,
      last_name: userData.lastName,
      email,
      phone: userData.phone,
      join_date: new Date().toLocaleDateString('fr-CA'),
      status: userData.role === 'driver' ? 'Pending' : 'Active',
      driver_profile: userData.driverProfile || null,
    })

  if (profileError) throw profileError

  return { user: authData.user, session: authData.session }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Get user profile from database
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('uid', user.id)
    .single()

  if (!profile) return null

  return {
    id: user.id,
    email: user.email!,
    role: profile.role,
    name: profile.name,
    firstName: profile.first_name,
    lastName: profile.last_name,
    phone: profile.phone,
    status: profile.status,
  }
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = await getCurrentUser()
      callback(user)
    } else {
      callback(null)
    }
  })
}