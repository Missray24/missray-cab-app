
// Legacy Firebase exports for backward compatibility during migration
// TODO: Remove these once migration is complete

import { supabase } from './supabase'
import { signIn, signOut, signUp, onAuthStateChange, getCurrentUser } from './supabase-auth'

// Compatibility layer for Firebase Auth
export const auth = {
  signInWithEmailAndPassword: (email: string, password: string) => signIn(email, password),
  createUserWithEmailAndPassword: (email: string, password: string) => 
    signUp(email, password, { name: '', firstName: '', lastName: '', phone: '', role: 'client' }),
  signOut,
  onAuthStateChanged: onAuthStateChange,
  currentUser: null as any,
}

// Compatibility layer for Firestore
export const db = supabase

// Compatibility layer for Storage
export const storage = supabase.storage

// Legacy exports
export const app = null
