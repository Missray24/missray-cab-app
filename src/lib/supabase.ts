import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types pour TypeScript
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          uid: string
          role: 'client' | 'driver' | 'admin'
          name: string
          first_name: string
          last_name: string
          email: string
          phone: string
          join_date: string
          status: 'Active' | 'Blocked' | 'Suspended' | 'Pending'
          driver_profile: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          uid: string
          role: 'client' | 'driver' | 'admin'
          name: string
          first_name: string
          last_name: string
          email: string
          phone: string
          join_date: string
          status?: 'Active' | 'Blocked' | 'Suspended' | 'Pending'
          driver_profile?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          uid?: string
          role?: 'client' | 'driver' | 'admin'
          name?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          join_date?: string
          status?: 'Active' | 'Blocked' | 'Suspended' | 'Pending'
          driver_profile?: any
          created_at?: string
          updated_at?: string
        }
      }
      reservations: {
        Row: {
          id: string
          client_name: string
          client_id: string
          driver_name: string
          driver_id: string
          date: string
          pickup: string
          dropoff: string
          stops: string[]
          status: string
          status_history: any[]
          amount: number
          vat_amount: number
          total_amount: number
          driver_payout: number
          payment_method: string
          service_tier_id: string
          stripe_payment_id: string | null
          passengers: number | null
          suitcases: number | null
          backpacks: number | null
          options: any[] | null
          distance: string | null
          duration: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_name: string
          client_id: string
          driver_name: string
          driver_id: string
          date: string
          pickup: string
          dropoff: string
          stops?: string[]
          status: string
          status_history?: any[]
          amount: number
          vat_amount?: number
          total_amount: number
          driver_payout: number
          payment_method: string
          service_tier_id: string
          stripe_payment_id?: string | null
          passengers?: number | null
          suitcases?: number | null
          backpacks?: number | null
          options?: any[] | null
          distance?: string | null
          duration?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_name?: string
          client_id?: string
          driver_name?: string
          driver_id?: string
          date?: string
          pickup?: string
          dropoff?: string
          stops?: string[]
          status?: string
          status_history?: any[]
          amount?: number
          vat_amount?: number
          total_amount?: number
          driver_payout?: number
          payment_method?: string
          service_tier_id?: string
          stripe_payment_id?: string | null
          passengers?: number | null
          suitcases?: number | null
          backpacks?: number | null
          options?: any[] | null
          distance?: string | null
          duration?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      service_tiers: {
        Row: {
          id: string
          name: string
          reference: string
          description: string
          photo_url: string
          base_fare: number
          per_km: number
          per_minute: number
          per_stop: number
          minimum_price: number
          available_zone_ids: string[]
          capacity: any
          registration_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          reference: string
          description: string
          photo_url: string
          base_fare: number
          per_km: number
          per_minute: number
          per_stop: number
          minimum_price: number
          available_zone_ids?: string[]
          capacity: any
          registration_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          reference?: string
          description?: string
          photo_url?: string
          base_fare?: number
          per_km?: number
          per_minute?: number
          per_stop?: number
          minimum_price?: number
          available_zone_ids?: string[]
          capacity?: any
          registration_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      zones: {
        Row: {
          id: string
          name: string
          region: string
          active_drivers: number
          payment_methods: string[]
          free_waiting_minutes: number
          minutes_before_no_show: number
          polygon: any[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          region: string
          active_drivers?: number
          payment_methods: string[]
          free_waiting_minutes: number
          minutes_before_no_show: number
          polygon?: any[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          region?: string
          active_drivers?: number
          payment_methods?: string[]
          free_waiting_minutes?: number
          minutes_before_no_show?: number
          polygon?: any[] | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}