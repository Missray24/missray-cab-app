/*
  # Create service_tiers table

  1. New Tables
    - `service_tiers`
      - `id` (uuid, primary key)
      - `name` (text) - tier name
      - `reference` (text) - internal reference
      - `description` (text) - tier description
      - `photo_url` (text) - vehicle photo URL
      - `base_fare` (numeric) - base fare price
      - `per_km` (numeric) - price per kilometer
      - `per_minute` (numeric) - price per minute
      - `per_stop` (numeric) - price per stop
      - `minimum_price` (numeric) - minimum price
      - `available_zone_ids` (text[]) - available zones
      - `capacity` (jsonb) - passenger/luggage capacity
      - `registration_date` (text) - vehicle registration date
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `service_tiers` table
    - Add policy for public read access
    - Add policy for admins to manage tiers
*/

CREATE TABLE IF NOT EXISTS service_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  reference text NOT NULL,
  description text NOT NULL DEFAULT '',
  photo_url text NOT NULL,
  base_fare numeric NOT NULL DEFAULT 0,
  per_km numeric NOT NULL DEFAULT 0,
  per_minute numeric NOT NULL DEFAULT 0,
  per_stop numeric NOT NULL DEFAULT 0,
  minimum_price numeric NOT NULL DEFAULT 0,
  available_zone_ids text[] DEFAULT '{}',
  capacity jsonb NOT NULL DEFAULT '{"passengers": 4, "suitcases": 2, "backpacks": 2}',
  registration_date text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_tiers ENABLE ROW LEVEL SECURITY;

-- Public read access for service tiers
CREATE POLICY "Public read access for service tiers"
  ON service_tiers
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage service tiers
CREATE POLICY "Admins can manage service tiers"
  ON service_tiers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE uid = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_service_tiers_updated_at 
  BEFORE UPDATE ON service_tiers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();