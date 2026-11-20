-- task_rotations
CREATE TABLE public.task_rotations (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id              uuid        NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  name                 text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  rotation_day         smallint    NOT NULL CHECK (rotation_day BETWEEN 0 AND 6),
  current_member_index int         NOT NULL DEFAULT 0,
  last_rotated_at      timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- task_rotation_members
CREATE TABLE public.task_rotation_members (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_id  uuid    NOT NULL REFERENCES public.task_rotations(id) ON DELETE CASCADE,
  profile_id   uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sort_order   int     NOT NULL DEFAULT 0,
  UNIQUE (rotation_id, profile_id)
);

-- link task to rotation
ALTER TABLE public.tasks
  ADD COLUMN rotation_id uuid REFERENCES public.task_rotations(id) ON DELETE SET NULL;

-- RLS: task_rotations
ALTER TABLE public.task_rotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home members read rotations"
  ON public.task_rotations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.home_members hm
    WHERE hm.home_id = task_rotations.home_id AND hm.user_id = auth.uid()
  ));
CREATE POLICY "task managers write rotations"
  ON public.task_rotations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.home_members hm
    LEFT JOIN public.home_member_permissions hmp
      ON hmp.home_id = hm.home_id AND hmp.user_id = hm.user_id
    WHERE hm.home_id = task_rotations.home_id
      AND hm.user_id = auth.uid()
      AND hm.role IN ('owner','admin')
       OR (hm.home_id = task_rotations.home_id AND hm.user_id = auth.uid()
           AND COALESCE(hmp.can_manage_tasks, true) = true)
  ));

-- RLS: task_rotation_members
ALTER TABLE public.task_rotation_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home members read rotation members"
  ON public.task_rotation_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.task_rotations tr
    JOIN public.home_members hm ON hm.home_id = tr.home_id
    WHERE tr.id = task_rotation_members.rotation_id AND hm.user_id = auth.uid()
  ));
CREATE POLICY "task managers write rotation members"
  ON public.task_rotation_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.task_rotations tr
    JOIN public.home_members hm ON hm.home_id = tr.home_id
    LEFT JOIN public.home_member_permissions hmp
      ON hmp.home_id = hm.home_id AND hmp.user_id = hm.user_id
    WHERE tr.id = task_rotation_members.rotation_id
      AND hm.user_id = auth.uid()
      AND (hm.role IN ('owner','admin')
           OR COALESCE(hmp.can_manage_tasks, true) = true)
  ));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.task_rotations, public.task_rotation_members TO authenticated;
