/*
  # Create simulation settings table

  1. New Tables
    - `simulation_settings`
      - `id` (uuid, primary key)
      - `name` (text, name of the saved settings)
      - `params` (jsonb, stores all simulation parameters)
      - `food_params` (jsonb, stores food parameters)
      - `created_at` (timestamp)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on `simulation_settings` table
    - Add policies for users to manage their own settings
*/

CREATE TABLE IF NOT EXISTS simulation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  params jsonb NOT NULL,
  food_params jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id)
);

ALTER TABLE simulation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own settings"
  ON simulation_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON simulation_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON simulation_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON simulation_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);