-- Mission 14.2 — Fix FK org_ledger_entries.campaign_id
-- En BEFORE INSERT, la ligne campaigns n'existe pas encore => violation FK.
-- On passe le billing en AFTER INSERT/UPDATE pour que campaign_id pointe vers une ligne existante.

BEGIN;

-- Supprimer l'ancien trigger BEFORE (nom dans 0011/0012)
DROP TRIGGER IF EXISTS trg_bill_campaign_on_activate ON public.campaigns;
DROP TRIGGER IF EXISTS bill_campaign_on_activate ON public.campaigns;

-- Fonction de billing: doit tourner en AFTER (la campaign existe déjà => FK OK)
CREATE OR REPLACE FUNCTION public.bill_campaign_on_activate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost int;
  v_available int;
BEGIN
  -- On ne facture que si la campagne est active et pas déjà facturée
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  IF NEW.billing_status = 'billed' THEN
    RETURN NEW;
  END IF;

  -- Defensive: si cost_total_cents n'est pas set, on recalcule
  v_cost := COALESCE(
    NEW.cost_total_cents,
    public.compute_cost_per_response(COALESCE(NEW.reward_cents, 0)) * COALESCE(NEW.quota, 0)
  );

  -- Lock du solde org
  SELECT available_cents
    INTO v_available
  FROM public.org_balances
  WHERE org_id = NEW.org_id
  FOR UPDATE;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'org_balance_missing';
  END IF;

  IF v_available < v_cost THEN
    RAISE EXCEPTION 'insufficient_org_credit';
  END IF;

  -- Débit org
  UPDATE public.org_balances
  SET available_cents = available_cents - v_cost,
      spent_cents = spent_cents + v_cost,
      updated_at = NOW()
  WHERE org_id = NEW.org_id;

  -- Ledger org (FK campaign_id OK car AFTER)
  INSERT INTO public.org_ledger_entries(org_id, amount_cents, reason, campaign_id, created_at)
  VALUES (NEW.org_id, -v_cost, 'campaign_activation', NEW.id, NOW());

  -- Marque billed (évite double facturation; le WHEN du trigger ignorera billed)
  UPDATE public.campaigns
  SET billing_status = 'billed'
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Trigger AFTER pour que campaign_id référence une ligne existante
CREATE TRIGGER bill_campaign_on_activate
AFTER INSERT OR UPDATE OF status, billing_status ON public.campaigns
FOR EACH ROW
WHEN (NEW.status = 'active' AND NEW.billing_status <> 'billed')
EXECUTE FUNCTION public.bill_campaign_on_activate();

COMMIT;
