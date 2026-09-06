-- ============================================================
-- SUPABASE MIGRATION SCRIPT FOR EXPENSE SHARING & SPLITTING
-- URL: https://supabase.com/dashboard/project/ukvbfcsfahvaczymudqu/sql
-- ============================================================

-- 1. EXTEND EXISTING Expenses TABLE (Non-destructive)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Expenses' AND column_name = 'payment_method') THEN
        ALTER TABLE "Expenses" ADD COLUMN payment_method text DEFAULT 'Cash';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Expenses' AND column_name = 'is_split') THEN
        ALTER TABLE "Expenses" ADD COLUMN is_split boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Expenses' AND column_name = 'group_id') THEN
        ALTER TABLE "Expenses" ADD COLUMN group_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Expenses' AND column_name = 'split_method') THEN
        ALTER TABLE "Expenses" ADD COLUMN split_method text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Expenses' AND column_name = 'paid_by_user_id') THEN
        ALTER TABLE "Expenses" ADD COLUMN paid_by_user_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Expenses' AND column_name = 'paid_by_contact_id') THEN
        ALTER TABLE "Expenses" ADD COLUMN paid_by_contact_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Expenses' AND column_name = 'paid_by_name') THEN
        ALTER TABLE "Expenses" ADD COLUMN paid_by_name text;
    END IF;
END $$;

-- 2. CONTACTS TABLE
CREATE TABLE IF NOT EXISTS public.contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    avatar_url text,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    category text DEFAULT 'Trip',
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.group_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    registered_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
    name text NOT NULL,
    email text,
    phone text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. EXPENSE SPLITS TABLE
DO $$
DECLARE
    exp_id_type text;
BEGIN
    SELECT data_type INTO exp_id_type 
    FROM information_schema.columns 
    WHERE table_name = 'Expenses' AND column_name = 'id';

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expense_splits') THEN
        IF exp_id_type = 'uuid' THEN
            EXECUTE 'CREATE TABLE public.expense_splits (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                expense_id uuid NOT NULL REFERENCES "Expenses"(id) ON DELETE CASCADE,
                user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
                contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
                participant_name text NOT NULL,
                share_amount numeric(12, 2) NOT NULL CHECK (share_amount >= 0),
                share_percentage numeric(6, 2),
                share_count numeric(6, 2),
                created_at timestamptz NOT NULL DEFAULT now()
            )';
        ELSE
            EXECUTE 'CREATE TABLE public.expense_splits (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                expense_id bigint NOT NULL REFERENCES "Expenses"(id) ON DELETE CASCADE,
                user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
                contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
                participant_name text NOT NULL,
                share_amount numeric(12, 2) NOT NULL CHECK (share_amount >= 0),
                share_percentage numeric(6, 2),
                share_count numeric(6, 2),
                created_at timestamptz NOT NULL DEFAULT now()
            )';
        END IF;
    END IF;
END $$;

-- 6. SETTLEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.settlements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
    payer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    payer_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
    payer_name text NOT NULL,
    payee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    payee_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
    payee_name text NOT NULL,
    amount numeric(12, 2) NOT NULL CHECK (amount > 0),
    payment_method text NOT NULL DEFAULT 'GPay',
    settled_at date NOT NULL DEFAULT current_date,
    notes text,
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON public.contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_registered_user_id ON public.group_members(registered_user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_contact_id ON public.group_members(contact_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON "Expenses"(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON "Expenses"(group_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON public.settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_settlements_created_by ON public.settlements(created_by);

-- ============================================================
-- 8. SECURITY DEFINER HELPER FUNCTIONS (Prevents RLS Recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_member_of_group(gid uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = gid AND registered_user_id = uid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_creator(gid uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = gid AND created_by = uid
  );
$$;

-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expenses" ENABLE ROW LEVEL SECURITY;

-- Contacts: owner-only
DROP POLICY IF EXISTS "Users can manage their own contacts" ON public.contacts;
CREATE POLICY "Users can manage their own contacts"
    ON public.contacts
    FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Groups: creator or member (Non-recursive via SECURITY DEFINER)
DROP POLICY IF EXISTS "Users can view and manage groups they created or belong to" ON public.groups;
DROP POLICY IF EXISTS "groups_access_policy" ON public.groups;
CREATE POLICY "groups_access_policy"
    ON public.groups
    FOR ALL
    USING (auth.uid() = created_by OR public.is_member_of_group(id, auth.uid()))
    WITH CHECK (auth.uid() = created_by);

-- Group Members: creator or member (Non-recursive)
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;
DROP POLICY IF EXISTS "group_members_access_policy" ON public.group_members;
CREATE POLICY "group_members_access_policy"
    ON public.group_members
    FOR ALL
    USING (
        registered_user_id = auth.uid() OR
        public.is_group_creator(group_id, auth.uid()) OR
        public.is_member_of_group(group_id, auth.uid())
    )
    WITH CHECK (
        public.is_group_creator(group_id, auth.uid())
    );

-- Expenses: user_id or group members (Non-recursive)
DROP POLICY IF EXISTS "Users can view and manage their expenses" ON "Expenses";
DROP POLICY IF EXISTS "expenses_access_policy" ON "Expenses";
CREATE POLICY "expenses_access_policy"
    ON "Expenses"
    FOR ALL
    USING (
        auth.uid() = user_id OR
        (group_id IS NOT NULL AND (public.is_group_creator(group_id, auth.uid()) OR public.is_member_of_group(group_id, auth.uid())))
    )
    WITH CHECK (
        auth.uid() = user_id OR
        (group_id IS NOT NULL AND public.is_group_creator(group_id, auth.uid()))
    );

-- Expense Splits: expense owner or group member (Non-recursive)
DROP POLICY IF EXISTS "Users can view and manage expense splits" ON public.expense_splits;
DROP POLICY IF EXISTS "expense_splits_access_policy" ON public.expense_splits;
CREATE POLICY "expense_splits_access_policy"
    ON public.expense_splits
    FOR ALL
    USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM "Expenses" e WHERE e.id = expense_splits.expense_id AND e.user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM "Expenses" e 
            WHERE e.id = expense_splits.expense_id 
            AND e.group_id IS NOT NULL 
            AND (public.is_group_creator(e.group_id, auth.uid()) OR public.is_member_of_group(e.group_id, auth.uid()))
        )
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM "Expenses" e WHERE e.id = expense_splits.expense_id AND e.user_id = auth.uid())
    );

-- Settlements: creator, payer, payee, or group member (Non-recursive)
DROP POLICY IF EXISTS "Users can view and manage settlements" ON public.settlements;
DROP POLICY IF EXISTS "settlements_access_policy" ON public.settlements;
CREATE POLICY "settlements_access_policy"
    ON public.settlements
    FOR ALL
    USING (
        auth.uid() = created_by OR
        auth.uid() = payer_user_id OR
        auth.uid() = payee_user_id OR
        (group_id IS NOT NULL AND (public.is_group_creator(group_id, auth.uid()) OR public.is_member_of_group(group_id, auth.uid())))
    )
    WITH CHECK (auth.uid() = created_by);
