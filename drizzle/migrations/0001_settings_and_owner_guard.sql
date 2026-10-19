ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS date_format text NOT NULL DEFAULT 'd MMM yyyy';

CREATE OR REPLACE FUNCTION public.guard_last_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.role = 'owner' AND OLD.status = 'active' AND (TG_OP = 'DELETE' OR NEW.role <> 'owner' OR NEW.status <> 'active') THEN
    IF (SELECT count(*) FROM public.organization_members WHERE organization_id = OLD.organization_id AND role = 'owner' AND status = 'active' AND id <> OLD.id) = 0 THEN
      RAISE EXCEPTION 'An organization must keep at least one owner';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.role = 'owner' AND OLD.role <> 'owner' AND public.org_role_of(OLD.organization_id) <> 'owner' THEN
    RAISE EXCEPTION 'Only owners can grant the owner role';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_last_owner ON public.organization_members;
CREATE TRIGGER trg_guard_last_owner BEFORE UPDATE OR DELETE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.guard_last_owner();

CREATE OR REPLACE FUNCTION public.notify_invitation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(NEW.email);
  IF uid IS NOT NULL AND NEW.status = 'pending' THEN
    INSERT INTO public.notifications(organization_id, user_id, title, body, link)
    VALUES (NEW.organization_id, uid, 'You have been invited', 'Sign in again to join the workspace as ' || NEW.role, '/dashboard');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_invitation ON public.invitations;
CREATE TRIGGER trg_notify_invitation AFTER INSERT ON public.invitations FOR EACH ROW EXECUTE FUNCTION public.notify_invitation();