import { supabase } from './supabase'
import type { Database } from './supabase'

type Tables = Database['public']['Tables']
type User = Tables['users']['Row']
type Reservation = Tables['reservations']['Row']
type ServiceTier = Tables['service_tiers']['Row']
type Zone = Tables['zones']['Row']

// Users queries
export async function getUsers(role?: 'client' | 'driver' | 'admin') {
  let query = supabase.from('users').select('*')
  
  if (role) {
    query = query.eq('role', role)
  }
  
  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function getUserByUid(uid: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('uid', uid)
    .single()
  
  if (error) throw error
  return data
}

export async function updateUser(id: string, updates: Partial<User>) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteUser(id: string) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Reservations queries
export async function getReservations(filters?: {
  clientId?: string
  driverId?: string
  status?: string
  limit?: number
}) {
  let query = supabase.from('reservations').select('*')
  
  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId)
  }
  
  if (filters?.driverId) {
    query = query.eq('driver_id', filters.driverId)
  }
  
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }
  
  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getReservationById(id: string) {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function createReservation(reservation: Tables['reservations']['Insert']) {
  const { data, error } = await supabase
    .from('reservations')
    .insert(reservation)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateReservation(id: string, updates: Partial<Reservation>) {
  const { data, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Service Tiers queries
export async function getServiceTiers() {
  const { data, error } = await supabase
    .from('service_tiers')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getServiceTierById(id: string) {
  const { data, error } = await supabase
    .from('service_tiers')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function createServiceTier(tier: Tables['service_tiers']['Insert']) {
  const { data, error } = await supabase
    .from('service_tiers')
    .insert(tier)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateServiceTier(id: string, updates: Partial<ServiceTier>) {
  const { data, error } = await supabase
    .from('service_tiers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Zones queries
export async function getZones() {
  const { data, error } = await supabase
    .from('zones')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getZoneById(id: string) {
  const { data, error } = await supabase
    .from('zones')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function createZone(zone: Tables['zones']['Insert']) {
  const { data, error } = await supabase
    .from('zones')
    .insert(zone)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateZone(id: string, updates: Partial<Zone>) {
  const { data, error } = await supabase
    .from('zones')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Real-time subscriptions
export function subscribeToReservations(
  callback: (payload: any) => void,
  filters?: { status?: string }
) {
  let channel = supabase
    .channel('reservations-changes')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'reservations',
        filter: filters?.status ? `status=eq.${filters.status}` : undefined
      }, 
      callback
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToUsers(callback: (payload: any) => void) {
  let channel = supabase
    .channel('users-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'users' }, 
      callback
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}