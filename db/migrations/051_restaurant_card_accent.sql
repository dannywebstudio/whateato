CREATE TABLE IF NOT EXISTS public.whateato_restaurant_card_accents(
 restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
 accent_color text NOT NULL CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
 updated_by uuid NOT NULL REFERENCES public.whateato_review_accounts(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);