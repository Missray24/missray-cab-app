/*
  # Create reservations table

  1. New Tables
    - `reservations`
      - `id` (uuid, primary key)
      - `client_name` (text) - client name
      - `client_id` (uuid) - reference to users table
      - `driver_name` (text) - driver name
      - `driver_id` (uuid) - reference to users table
      - `date` (text) - reservation date
      - `pickup` (text) - pickup address
      - `dropoff` (text) - dropoff address
      - `stops` (text[]) - intermediate stops
      - `status` (text) - reservation status
      - `status_history` (jsonb) - status change history
      - `amount` (numeric) - subtotal amount
      - `vat_amount` (numeric) - VAT amount
      - `total_amount` (numeric) - total amount
      - `driver_payout` (numeric) - driver payout
      - `payment_method` (text) - payment method
      - `service_tier_id` (uuid) - reference to service_tiers
      - `stripe_payment_id` (text) - Stripe payment ID
      - `passengers` (integer) - number of passengers
      - `suitcases` (integer) - number of suitcases
      - `backpacks` (integer) - number of backpacks
      - `options` (jsonb) - selected options
      - `distance` (text) - trip distance
      - `duration` (text) - trip duration
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `reservations` table
    - Add policies for clients to see their own reservations
    - Add policies for drivers to see their assigned reservations
    - Add policies for admins to see all reservations
*/

CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_id uuid NOT NULL,
  driver_name text NOT NULL DEFAULT 'Non assigné',
  driver_id uuid,
  date text NOT NULL,
  pickup text NOT NULL,
  dropoff text NOT NULL,
  stops text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'Nouvelle demande',
  status_history jsonb DEFAULT '[]',
  amount numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  driver_payout numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Carte',
  service_tier_id uuid,
  stripe_payment_id text,
  passengers integer,
  suitcases integer,
  backpacks integer,
  options jsonb,
  distance text,
  duration text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Clients can read their own reservations
CREATE POLICY "Clients can read own reservations"
  ON reservations
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM users WHERE uid = auth.uid()::text
    )
  );

-- Drivers can read their assigned reservations
CREATE POLICY "Drivers can read assigned reservations"
  ON reservations
  FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM users WHERE uid = auth.uid()::text
    )
  );

-- Drivers can see new requests (for accepting rides)
CREATE POLICY "Drivers can see new requests"
  ON reservations
  FOR SELECT
  TO authenticated
  USING (
    status = 'Nouvelle demande' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE uid = auth.uid()::text 
      AND role = 'driver'
    )
  );

-- Admins can read all reservations
CREATE POLICY "Admins can read all reservations"
  ON reservations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE uid = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- Clients can create reservations
CREATE POLICY "Clients can create reservations"
  ON reservations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM users WHERE uid = auth.uid()::text AND role = 'client'
    )
  );

-- Clients can update their own reservations (for cancellation)
CREATE POLICY "Clients can update own reservations"
  ON reservations
  FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM users WHERE uid = auth.uid()::text
    )
  );

-- Drivers can update their assigned reservations
CREATE POLICY "Drivers can update assigned reservations"
  ON reservations
  FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM users WHERE uid = auth.uid()::text
    )
  );

-- Drivers can accept new requests
CREATE POLICY "Drivers can accept new requests"
  ON reservations
  FOR UPDATE
  TO authenticated
  USING (
    status = 'Nouvelle demande' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE uid = auth.uid()::text 
      AND role = 'driver'
    )
  );

-- Admins can update all reservations
CREATE POLICY "Admins can update all reservations"
  ON reservations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE uid = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_reservations_updated_at 
  BEFORE UPDATE ON reservations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();