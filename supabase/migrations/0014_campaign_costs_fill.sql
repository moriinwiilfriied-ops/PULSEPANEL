BEGIN;

-- Fill cost fields deterministically (no billing here)
CREATE OR REPLACE FUNCTION public.fill_campaign_costs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_per int;
BEGIN
  v_per := public.compute_cost_per_response(COALESCE(NEW.reward_cents, 0));
  NEW.cost_per_response_cents := v_per;
  NEW.cost_total_cents := v_per * COALESCE(NEW.quota, 0);

  IF NEW.billing_status IS NULL THEN
    NEW.billing_status := 'unbilled';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_campaign_costs ON public.campaigns;

CREATE TRIGGER trg_fill_campaign_costs
BEFORE INSERT OR UPDATE OF reward_cents, quota ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.fill_campaign_costs();

COMMIT;
