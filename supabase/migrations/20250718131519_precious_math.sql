/*
  # Create zones table

  1. New Tables
    - `zones`
      - `id` (uuid, primary key)
      - `name` (text) - zone name
      - `region` (text) - region/city
      - `active_drivers` (integer) - number of active drivers
      - `payment_methods` (text[]) - accepted payment methods
      - `free_waiting_minutes` (integer) - free waiting time
      - `minutes_before_no_show` (integer) - no-show timeout
      - `polygon` (jsonb) - zone polygon coordinates
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `zones` table
    - Add policy for public read access
    - Add policy for admins to manage zones
*/

CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text NOT NULL,
  active_drivers integer NOT NULL DEFAULT 0,
  payment_methods text[] DEFAULT '{}',
  free_waiting_minutes integer NOT NULL DEFAULT 5,
  minutes_before_no_show integer NOT NULL DEFAULT 10,
  polygon jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- Public read access for zones
CREATE POLICY "Public read access for zones"
  ON zones
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage zones
CREATE POLICY "Admins can manage zones"
  ON zones
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
CREATE TRIGGER update_zones_updated_at 
  BEFORE UPDATE ON zones 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();