CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user',
    'obchodnik',
    'tipar',
    'senior_obchodnik',
    'influencer_coordinator'
);


--
-- Name: consultation_booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.consultation_booking_status AS ENUM (
    'pending',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
);


--
-- Name: email_template_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.email_template_category AS ENUM (
    'system',
    'team',
    'customer'
);


--
-- Name: email_template_trigger; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.email_template_trigger AS ENUM (
    'password_reset',
    'email_confirmation',
    'welcome_email',
    'event_registration_customer',
    'event_registration_tipar',
    'event_registration_obchodnik',
    'event_reminder_customer',
    'event_cancelled',
    'lead_status_change',
    'lead_level_upgrade',
    'milestone_reached',
    'new_contact_message',
    'brochure_request',
    'catalog_download'
);


--
-- Name: lifecycle_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lifecycle_status AS ENUM (
    'visitor',
    'lead',
    'qualified',
    'client',
    'premium',
    'vip'
);


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_type AS ENUM (
    'lead_created',
    'lead_assigned',
    'lead_status_changed',
    'lead_converted',
    'commission_confirmed',
    'team_summary',
    'system_alert',
    'consultation_booked',
    'consultation_confirmed',
    'consultation_cancelled',
    'consultation_reminder'
);


--
-- Name: auto_assign_obchodnik(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_assign_obchodnik() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If no assigned_obchodnik_id set, try to get from referrer's profile
  IF NEW.assigned_obchodnik_id IS NULL AND NEW.referrer_id IS NOT NULL THEN
    SELECT assigned_obchodnik_id INTO NEW.assigned_obchodnik_id
    FROM public.profiles
    WHERE id = NEW.referrer_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: auto_assign_tipar_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_assign_tipar_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Pokud je role v profiles nastavena na 'tipar', přidej roli do user_roles
  IF NEW.role = 'tipar' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'tipar')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Také vygeneruj affiliate kód pokud chybí
    IF NEW.affiliate_code IS NULL THEN
      UPDATE public.profiles 
      SET affiliate_code = (SELECT public.generate_affiliate_code())
      WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: check_milestone_triggers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_milestone_triggers() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deals_in_90_days integer;
  is_obchodnik boolean;
  is_senior boolean;
BEGIN
  -- Check if user is obchodnik and has 10+ deals in 90 days -> promote to senior_obchodnik
  IF NEW.closed_deals_count >= 10 THEN
    -- Count deals in last 90 days (simplified - we use closed_deals_count which we'll need to track separately)
    SELECT EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = NEW.id AND role = 'obchodnik'
    ) INTO is_obchodnik;
    
    SELECT EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = NEW.id AND role = 'senior_obchodnik'
    ) INTO is_senior;
    
    -- If obchodnik but not yet senior, promote them
    IF is_obchodnik AND NOT is_senior THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'senior_obchodnik')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  
  -- Check if total_turnover_aed > 10,000,000 -> set status to VIP
  IF NEW.total_turnover_aed > 10000000 AND (OLD.lifecycle_status IS DISTINCT FROM 'vip') THEN
    NEW.lifecycle_status := 'vip';
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: cleanup_old_notification_reads(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_notification_reads() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.notification_reads
  WHERE read_at < now() - interval '30 days';
END;
$$;


--
-- Name: create_notification(uuid, public.notification_type, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_notification(p_user_id uuid, p_type public.notification_type, p_title text, p_message text, p_data jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;


--
-- Name: create_questionnaire_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_questionnaire_version() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_version integer;
  field_key text;
  old_val jsonb;
  new_val jsonb;
BEGIN
  -- If this is an update (not insert), create change records
  IF TG_OP = 'UPDATE' THEN
    -- Get the next version number
    SELECT COALESCE(MAX(version), 0) + 1 INTO new_version
    FROM public.investor_questionnaires
    WHERE lead_id = NEW.lead_id;
    
    -- Track individual field changes
    -- Experience level
    IF OLD.experience_level IS DISTINCT FROM NEW.experience_level THEN
      INSERT INTO public.questionnaire_changes (questionnaire_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'experience_level', to_jsonb(OLD.experience_level), to_jsonb(NEW.experience_level));
    END IF;
    
    -- Risk tolerance
    IF OLD.risk_tolerance IS DISTINCT FROM NEW.risk_tolerance THEN
      INSERT INTO public.questionnaire_changes (questionnaire_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'risk_tolerance', to_jsonb(OLD.risk_tolerance), to_jsonb(NEW.risk_tolerance));
    END IF;
    
    -- Investment horizon
    IF OLD.investment_horizon IS DISTINCT FROM NEW.investment_horizon THEN
      INSERT INTO public.questionnaire_changes (questionnaire_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'investment_horizon', to_jsonb(OLD.investment_horizon), to_jsonb(NEW.investment_horizon));
    END IF;
    
    -- Budget min
    IF OLD.budget_min IS DISTINCT FROM NEW.budget_min THEN
      INSERT INTO public.questionnaire_changes (questionnaire_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'budget_min', to_jsonb(OLD.budget_min), to_jsonb(NEW.budget_min));
    END IF;
    
    -- Budget max
    IF OLD.budget_max IS DISTINCT FROM NEW.budget_max THEN
      INSERT INTO public.questionnaire_changes (questionnaire_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'budget_max', to_jsonb(OLD.budget_max), to_jsonb(NEW.budget_max));
    END IF;
    
    -- Priority
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO public.questionnaire_changes (questionnaire_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'priority', to_jsonb(OLD.priority), to_jsonb(NEW.priority));
    END IF;
    
    -- Financing type
    IF OLD.financing_type IS DISTINCT FROM NEW.financing_type THEN
      INSERT INTO public.questionnaire_changes (questionnaire_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'financing_type', to_jsonb(OLD.financing_type), to_jsonb(NEW.financing_type));
    END IF;
    
    -- Responses (JSONB field)
    IF OLD.responses IS DISTINCT FROM NEW.responses THEN
      INSERT INTO public.questionnaire_changes (questionnaire_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'responses', OLD.responses, NEW.responses);
    END IF;
    
    -- Update version number
    NEW.version := new_version;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_affiliate_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_affiliate_code() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric code
    new_code := upper(substr(md5(random()::text), 1, 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE affiliate_code = new_code) INTO code_exists;
    
    -- If unique, return it
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END
$$;


--
-- Name: log_lead_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_lead_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  changed_cols text[];
  action_type text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Write to legacy lead_audit_log
    INSERT INTO public.lead_audit_log (lead_id, user_id, action, new_values)
    VALUES (NEW.id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'created', to_jsonb(NEW));
    
    -- Write to global audit_log
    PERFORM public.write_audit_log('lead', NEW.id, 'created', NULL, to_jsonb(NEW), NULL);
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    changed_cols := ARRAY[]::text[];
    
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      changed_cols := array_append(changed_cols, 'status');
      action_type := 'status_changed';
    END IF;
    
    IF OLD.assigned_obchodnik_id IS DISTINCT FROM NEW.assigned_obchodnik_id THEN
      changed_cols := array_append(changed_cols, 'assigned_obchodnik_id');
      action_type := COALESCE(action_type, 'assigned');
    END IF;
    
    IF OLD.client_id IS DISTINCT FROM NEW.client_id AND NEW.client_id IS NOT NULL THEN
      action_type := 'converted_to_client';
    END IF;
    
    IF OLD.lead_name IS DISTINCT FROM NEW.lead_name THEN changed_cols := array_append(changed_cols, 'lead_name'); END IF;
    IF OLD.email IS DISTINCT FROM NEW.email THEN changed_cols := array_append(changed_cols, 'email'); END IF;
    IF OLD.phone IS DISTINCT FROM NEW.phone THEN changed_cols := array_append(changed_cols, 'phone'); END IF;
    IF OLD.warmth_level IS DISTINCT FROM NEW.warmth_level THEN changed_cols := array_append(changed_cols, 'warmth_level'); END IF;
    IF OLD.budget IS DISTINCT FROM NEW.budget THEN changed_cols := array_append(changed_cols, 'budget'); END IF;
    IF OLD.property_value IS DISTINCT FROM NEW.property_value THEN changed_cols := array_append(changed_cols, 'property_value'); END IF;
    IF OLD.notes IS DISTINCT FROM NEW.notes THEN changed_cols := array_append(changed_cols, 'notes'); END IF;
    
    IF array_length(changed_cols, 1) > 0 THEN
      -- Write to legacy lead_audit_log
      INSERT INTO public.lead_audit_log (lead_id, user_id, action, old_values, new_values, changed_fields)
      VALUES (
        NEW.id, 
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 
        COALESCE(action_type, 'updated'), 
        to_jsonb(OLD), 
        to_jsonb(NEW), 
        changed_cols
      );
      
      -- Write to global audit_log
      PERFORM public.write_audit_log(
        'lead', NEW.id, COALESCE(action_type, 'updated'), to_jsonb(OLD), to_jsonb(NEW), changed_cols
      );
    END IF;
    
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: log_questionnaire_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_questionnaire_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  changed_cols text[];
  action_type text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'questionnaire', NEW.id, 'created', NULL, to_jsonb(NEW), NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    changed_cols := ARRAY[]::text[];
    
    IF OLD.experience_level IS DISTINCT FROM NEW.experience_level THEN 
      changed_cols := array_append(changed_cols, 'experience_level'); 
    END IF;
    IF OLD.risk_tolerance IS DISTINCT FROM NEW.risk_tolerance THEN 
      changed_cols := array_append(changed_cols, 'risk_tolerance'); 
    END IF;
    IF OLD.investment_horizon IS DISTINCT FROM NEW.investment_horizon THEN 
      changed_cols := array_append(changed_cols, 'investment_horizon'); 
    END IF;
    IF OLD.budget_min IS DISTINCT FROM NEW.budget_min THEN 
      changed_cols := array_append(changed_cols, 'budget_min'); 
    END IF;
    IF OLD.budget_max IS DISTINCT FROM NEW.budget_max THEN 
      changed_cols := array_append(changed_cols, 'budget_max'); 
    END IF;
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN 
      changed_cols := array_append(changed_cols, 'priority'); 
    END IF;
    IF OLD.financing_type IS DISTINCT FROM NEW.financing_type THEN 
      changed_cols := array_append(changed_cols, 'financing_type'); 
    END IF;
    IF OLD.responses IS DISTINCT FROM NEW.responses THEN 
      changed_cols := array_append(changed_cols, 'responses'); 
    END IF;
    
    IF array_length(changed_cols, 1) > 0 THEN
      PERFORM public.write_audit_log(
        'questionnaire', NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW), changed_cols
      );
    END IF;
    
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: merge_leads(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.merge_leads(p_source_lead_id uuid, p_target_lead_id uuid, p_merged_by uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Přesunout interakce
  UPDATE public.lead_interactions 
  SET lead_id = p_target_lead_id 
  WHERE lead_id = p_source_lead_id;
  
  -- Přesunout brožury
  UPDATE public.brochure_requests 
  SET lead_id = p_target_lead_id 
  WHERE lead_id = p_source_lead_id;
  
  -- Přesunout dotazníky
  UPDATE public.investor_questionnaires 
  SET lead_id = p_target_lead_id 
  WHERE lead_id = p_source_lead_id;
  
  -- Přesunout poznámky
  UPDATE public.lead_notes 
  SET lead_id = p_target_lead_id 
  WHERE lead_id = p_source_lead_id;
  
  -- Přesunout registrace na události
  UPDATE public.event_registrations 
  SET lead_id = p_target_lead_id 
  WHERE lead_id = p_source_lead_id;
  
  -- Přesunout chatbot konverzace
  UPDATE public.chatbot_conversations 
  SET lead_id = p_target_lead_id 
  WHERE lead_id = p_source_lead_id;
  
  -- Přesunout commission splits
  UPDATE public.lead_commission_splits 
  SET lead_id = p_target_lead_id 
  WHERE lead_id = p_source_lead_id;
  
  -- Označit zdrojový lead jako sloučený
  UPDATE public.leads 
  SET 
    merged_into_id = p_target_lead_id,
    merged_at = now(),
    merged_by = p_merged_by,
    status = 'merged'
  WHERE id = p_source_lead_id;
  
  -- Zapsat do audit logu
  PERFORM public.write_audit_log(
    'lead', 
    p_source_lead_id, 
    'merged',
    NULL,
    jsonb_build_object('merged_into', p_target_lead_id),
    ARRAY['merged_into_id', 'status']
  );
END;
$$;


--
-- Name: notify_lead_assigned(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_lead_assigned() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only trigger if assigned_obchodnik_id changed
  IF OLD.assigned_obchodnik_id IS DISTINCT FROM NEW.assigned_obchodnik_id THEN
    -- Notify new assignee
    IF NEW.assigned_obchodnik_id IS NOT NULL THEN
      PERFORM public.create_notification(
        NEW.assigned_obchodnik_id,
        'lead_assigned'::notification_type,
        'Lead vám byl přiřazen',
        format('Lead %s vám byl přiřazen ke zpracování.', NEW.lead_name),
        jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.lead_name, 'previous_owner', OLD.assigned_obchodnik_id)
      );
    END IF;
    
    -- Notify senior obchodníci about reassignment
    IF OLD.assigned_obchodnik_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      SELECT ur.user_id, 'team_summary'::notification_type, 'Lead přeřazen',
             format('Lead %s byl přeřazen jinému obchodníkovi.', NEW.lead_name),
             jsonb_build_object('lead_id', NEW.id, 'from', OLD.assigned_obchodnik_id, 'to', NEW.assigned_obchodnik_id)
      FROM public.user_roles ur
      WHERE ur.role = 'senior_obchodnik';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_lead_created(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_lead_created() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Notify referrer about their new lead
  IF NEW.referrer_id IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.referrer_id,
      'lead_created'::notification_type,
      'Nový lead vytvořen',
      CASE 
        WHEN NEW.lead_type IN ('campaign', 'influencer') THEN 'Nový zájemce byl přidán do vašeho portfolia.'
        ELSE format('Lead %s byl úspěšně vytvořen.', NEW.lead_name)
      END,
      jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.lead_name, 'lead_type', NEW.lead_type)
    );
  END IF;
  
  -- Notify assigned obchodník about new assignment
  IF NEW.assigned_obchodnik_id IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.assigned_obchodnik_id,
      'lead_assigned'::notification_type,
      'Nový lead přiřazen',
      format('Lead %s vám byl přiřazen.', NEW.lead_name),
      jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.lead_name)
    );
  END IF;
  
  -- Notify admins about new leads
  INSERT INTO public.notifications (user_id, type, title, message, data)
  SELECT ur.user_id, 'system_alert'::notification_type, 'Nový lead v systému',
         format('Lead %s byl vytvořen.', NEW.lead_name),
         jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.lead_name, 'source', NEW.lead_type)
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_lead_status_changed(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_lead_status_changed() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_status_label TEXT;
BEGIN
  -- Only trigger if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get human-readable status
    v_status_label := CASE NEW.status
      WHEN 'new' THEN 'Nový'
      WHEN 'contacted' THEN 'Kontaktován'
      WHEN 'qualified' THEN 'Kvalifikován'
      WHEN 'supertip' THEN 'Super-tip'
      WHEN 'closed_won' THEN 'Uzavřeno - Vyhráno'
      WHEN 'closed_lost' THEN 'Uzavřeno - Ztraceno'
      ELSE NEW.status
    END;
    
    -- Notify referrer about status change
    IF NEW.referrer_id IS NOT NULL THEN
      PERFORM public.create_notification(
        NEW.referrer_id,
        'lead_status_changed'::notification_type,
        'Status leadu změněn',
        CASE 
          WHEN NEW.lead_type IN ('campaign', 'influencer') THEN format('Váš lead změnil status na: %s', v_status_label)
          ELSE format('Lead %s změnil status na: %s', NEW.lead_name, v_status_label)
        END,
        jsonb_build_object('lead_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
      );
      
      -- Special notification for conversion (closed_won)
      IF NEW.status = 'closed_won' AND OLD.status != 'closed_won' THEN
        PERFORM public.create_notification(
          NEW.referrer_id,
          'lead_converted'::notification_type,
          '🎉 Gratulujeme! Lead konvertován',
          CASE 
            WHEN NEW.lead_type IN ('campaign', 'influencer') THEN 'Váš lead úspěšně zakoupil nemovitost!'
            ELSE format('Lead %s úspěšně zakoupil nemovitost!', NEW.lead_name)
          END,
          jsonb_build_object('lead_id', NEW.id, 'property_value', NEW.property_value)
        );
      END IF;
    END IF;
    
    -- Notify assigned obchodník
    IF NEW.assigned_obchodnik_id IS NOT NULL AND NEW.assigned_obchodnik_id != NEW.referrer_id THEN
      PERFORM public.create_notification(
        NEW.assigned_obchodnik_id,
        'lead_status_changed'::notification_type,
        'Status leadu aktualizován',
        format('Lead %s: %s → %s', NEW.lead_name, OLD.status, v_status_label),
        jsonb_build_object('lead_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_slot_booked_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_slot_booked_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment booked_count when new booking is created
    IF NEW.slot_id IS NOT NULL AND NEW.status NOT IN ('cancelled', 'no_show') THEN
      UPDATE public.consultation_slots 
      SET booked_count = booked_count + 1,
          is_available = CASE WHEN booked_count + 1 >= capacity THEN false ELSE is_available END
      WHERE id = NEW.slot_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.status NOT IN ('cancelled', 'no_show') AND NEW.status IN ('cancelled', 'no_show') THEN
      -- Booking was cancelled, decrement count
      IF NEW.slot_id IS NOT NULL THEN
        UPDATE public.consultation_slots 
        SET booked_count = GREATEST(0, booked_count - 1),
            is_available = true
        WHERE id = NEW.slot_id;
      END IF;
    ELSIF OLD.status IN ('cancelled', 'no_show') AND NEW.status NOT IN ('cancelled', 'no_show') THEN
      -- Booking was reactivated, increment count
      IF NEW.slot_id IS NOT NULL THEN
        UPDATE public.consultation_slots 
        SET booked_count = booked_count + 1,
            is_available = CASE WHEN booked_count + 1 >= capacity THEN false ELSE is_available END
        WHERE id = NEW.slot_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement booked_count when booking is deleted
    IF OLD.slot_id IS NOT NULL AND OLD.status NOT IN ('cancelled', 'no_show') THEN
      UPDATE public.consultation_slots 
      SET booked_count = GREATEST(0, booked_count - 1),
          is_available = true
      WHERE id = OLD.slot_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_slot_registered_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_slot_registered_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.event_slots 
    SET registered_count = registered_count + 1 
    WHERE id = NEW.slot_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.event_slots 
    SET registered_count = registered_count - 1 
    WHERE id = OLD.slot_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: write_audit_log(text, uuid, text, jsonb, jsonb, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.write_audit_log(p_entity_type text, p_entity_id uuid, p_action text, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_changed_fields text[] DEFAULT NULL::text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_role text;
BEGIN
  -- Get user's primary role (admin > senior_obchodnik > obchodnik > tipar)
  SELECT 
    CASE 
      WHEN EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN 'admin'
      WHEN EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'senior_obchodnik') THEN 'senior_obchodnik'
      WHEN EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'obchodnik') THEN 'obchodnik'
      WHEN EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'influencer_coordinator') THEN 'influencer_coordinator'
      WHEN EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'tipar') THEN 'tipar'
      ELSE 'unknown'
    END INTO v_user_role;

  INSERT INTO public.audit_log (
    entity_type, entity_id, action, old_values, new_values, changed_fields, user_id, user_role
  ) VALUES (
    p_entity_type, p_entity_id, p_action, p_old_values, p_new_values, p_changed_fields, 
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), v_user_role
  );
END;
$$;


SET default_table_access_method = heap;

--
-- Name: affiliate_clicks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affiliate_clicks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    affiliate_code text NOT NULL,
    referrer_id uuid,
    clicked_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text,
    page_url text,
    was_first_click boolean DEFAULT false
);


--
-- Name: areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.areas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    city text NOT NULL,
    country text DEFAULT 'UAE'::text NOT NULL,
    description text,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    hero_image_url text,
    hero_video_url text
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_fields text[],
    user_id uuid NOT NULL,
    user_role text,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: brochure_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brochure_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    selected_brochures jsonb DEFAULT '[]'::jsonb,
    investment_type text,
    budget text,
    timeline text,
    request_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    client_id uuid,
    assigned_obchodnik_id uuid,
    lead_id uuid,
    CONSTRAINT brochure_requests_request_type_check CHECK ((request_type = ANY (ARRAY['catalog'::text, 'hero'::text, 'homepage'::text, 'project'::text, 'brochure'::text, 'investice_brochure'::text, 'contact'::text, 'presentation'::text, 'presentation_download'::text, 'general'::text])))
);


--
-- Name: catalog_downloads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_downloads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brochure_request_id uuid NOT NULL,
    downloaded_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text,
    client_id uuid
);


--
-- Name: chatbot_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chatbot_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    user_id uuid,
    session_id text NOT NULL,
    messages jsonb DEFAULT '[]'::jsonb NOT NULL,
    investor_data jsonb,
    status text DEFAULT 'active'::text NOT NULL,
    handoff_to_human boolean DEFAULT false,
    completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch text
);


--
-- Name: chatbot_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chatbot_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value jsonb DEFAULT '{}'::jsonb NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    name text,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    lead_id uuid,
    investment_experience text,
    risk_tolerance text,
    investment_horizon text,
    preferred_property_types text[],
    target_markets text[],
    budget_min numeric,
    budget_max numeric,
    financing_preference text,
    notes text,
    source_lead_id uuid
);


--
-- Name: commission_payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'AED'::text,
    percentage numeric NOT NULL,
    status text DEFAULT 'pending'::text,
    approved_by uuid,
    approved_at timestamp with time zone,
    paid_at timestamp with time zone,
    payment_reference text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT commission_payouts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'paid'::text, 'cancelled'::text])))
);


--
-- Name: consultation_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultation_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slot_id uuid,
    lead_id uuid NOT NULL,
    referrer_id uuid,
    assigned_obchodnik_id uuid,
    status public.consultation_booking_status DEFAULT 'pending'::public.consultation_booking_status NOT NULL,
    requested_time timestamp with time zone,
    notes text,
    investor_notes text,
    ics_sent boolean DEFAULT false NOT NULL,
    confirmed_at timestamp with time zone,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: consultation_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultation_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    obchodnik_id uuid NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    capacity integer DEFAULT 1 NOT NULL,
    booked_count integer DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT valid_booking_count CHECK ((booked_count <= capacity)),
    CONSTRAINT valid_time_range CHECK ((end_time > start_time))
);


--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    affiliate_code text,
    first_name text,
    last_name text,
    assigned_obchodnik_id uuid
);


--
-- Name: coordinator_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coordinator_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coordinator_id uuid NOT NULL,
    tipar_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    property_id uuid,
    deal_value numeric NOT NULL,
    currency text DEFAULT 'AED'::text,
    commission_total numeric,
    closed_at timestamp with time zone DEFAULT now(),
    closed_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: developers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.developers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    logo_url text,
    website text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    trigger public.email_template_trigger NOT NULL,
    category public.email_template_category NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    html_content text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    description text,
    variables jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: event_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slot_id uuid NOT NULL,
    lead_id uuid NOT NULL,
    referrer_id uuid,
    attended boolean DEFAULT false,
    registered_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: event_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    start_time timestamp with time zone NOT NULL,
    capacity integer DEFAULT 20 NOT NULL,
    registered_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    location_name text,
    maps_url text,
    image_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    property_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: investor_questionnaires; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investor_questionnaires (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    experience_level text,
    target_markets text[],
    financing_type text,
    investment_horizon text,
    priority text,
    budget_min numeric,
    budget_max numeric,
    preferred_property_types text[],
    risk_tolerance text,
    additional_notes text,
    responses jsonb DEFAULT '{}'::jsonb,
    completed_by uuid,
    completed_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT investor_questionnaires_experience_level_check CHECK ((experience_level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text, 'professional'::text]))),
    CONSTRAINT investor_questionnaires_financing_type_check CHECK ((financing_type = ANY (ARRAY['cash'::text, 'mortgage'::text, 'mixed'::text, 'other'::text]))),
    CONSTRAINT investor_questionnaires_investment_horizon_check CHECK ((investment_horizon = ANY (ARRAY['short_term'::text, 'medium_term'::text, 'long_term'::text]))),
    CONSTRAINT investor_questionnaires_priority_check CHECK ((priority = ANY (ARRAY['capital_growth'::text, 'rental_income'::text, 'personal_use'::text, 'mixed'::text]))),
    CONSTRAINT investor_questionnaires_risk_tolerance_check CHECK ((risk_tolerance = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))
);


--
-- Name: lead_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_fields text[],
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lead_audit_log_action_check CHECK ((action = ANY (ARRAY['created'::text, 'updated'::text, 'status_changed'::text, 'assigned'::text, 'converted_to_client'::text])))
);


--
-- Name: lead_commission_splits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_commission_splits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    recipient_type text NOT NULL,
    percentage numeric NOT NULL,
    confirmed boolean DEFAULT false,
    confirmed_by uuid,
    confirmed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lead_commission_splits_percentage_check CHECK (((percentage > (0)::numeric) AND (percentage <= (100)::numeric))),
    CONSTRAINT lead_commission_splits_recipient_type_check CHECK ((recipient_type = ANY (ARRAY['tipar'::text, 'obchodnik'::text, 'coordinator'::text, 'senior_obchodnik'::text])))
);


--
-- Name: lead_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    interaction_type text NOT NULL,
    source_page text,
    message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lead_interactions_interaction_type_check CHECK ((interaction_type = ANY (ARRAY['contact_form'::text, 'chatbot'::text, 'seminar_booking'::text, 'supertip_form'::text, 'brochure_request'::text, 'catalog_download'::text])))
);


--
-- Name: lead_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    is_internal boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    author_role text DEFAULT 'obchodnik'::text NOT NULL,
    note_type text DEFAULT 'standard'::text NOT NULL,
    CONSTRAINT lead_notes_note_type_check CHECK ((note_type = ANY (ARRAY['standard'::text, 'managerial'::text, 'system'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role text DEFAULT 'standard'::text NOT NULL,
    affiliate_code text,
    full_name text,
    referrer_id uuid,
    warmth_level integer DEFAULT 50,
    assigned_obchodnik_id uuid,
    avatar_url text,
    bio text,
    phone text,
    website text,
    linkedin_url text,
    instagram_url text,
    facebook_url text,
    twitter_url text,
    lifecycle_status public.lifecycle_status DEFAULT 'visitor'::public.lifecycle_status,
    total_turnover_aed numeric DEFAULT 0,
    closed_deals_count integer DEFAULT 0,
    last_known_affiliate_code text,
    email_verified boolean DEFAULT false,
    phone_verified boolean DEFAULT false,
    verification_pending boolean DEFAULT false
);


--
-- Name: lead_notes_with_author; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lead_notes_with_author WITH (security_invoker='on') AS
 SELECT ln.id,
    ln.lead_id,
    ln.author_id,
    ln.content,
    ln.is_internal,
    ln.author_role,
    ln.note_type,
    ln.created_at,
    p.full_name AS author_name,
    p.email AS author_email
   FROM (public.lead_notes ln
     LEFT JOIN public.profiles p ON ((ln.author_id = p.id)));


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid,
    lead_name text NOT NULL,
    email text,
    phone text,
    status text DEFAULT 'influencer'::text NOT NULL,
    warmth_level integer DEFAULT 50 NOT NULL,
    budget text,
    preferred_contact_time text,
    preferred_communication_channel text,
    investment_goals text,
    investment_timeline text,
    property_value numeric,
    commission_rate numeric DEFAULT 0.01,
    notes text,
    webinar_registered boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    referred_by uuid,
    lead_level integer DEFAULT 1,
    seminar_accepted boolean DEFAULT false,
    questionnaire_completed_independently boolean DEFAULT false,
    affiliate_code text,
    current_event_id uuid,
    assigned_obchodnik_id uuid,
    client_id uuid,
    lead_type text DEFAULT 'referral'::text NOT NULL,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    source_form text,
    source_event_id uuid,
    click_history jsonb DEFAULT '[]'::jsonb,
    merged_into_id uuid,
    merged_at timestamp with time zone,
    merged_by uuid,
    lead_number integer NOT NULL,
    CONSTRAINT leads_lead_level_check CHECK ((lead_level = ANY (ARRAY[1, 2, 3]))),
    CONSTRAINT leads_lead_type_check CHECK ((lead_type = ANY (ARRAY['campaign'::text, 'referral'::text]))),
    CONSTRAINT leads_status_check CHECK ((status = ANY (ARRAY['influencer'::text, 'personal'::text, 'supertip'::text]))),
    CONSTRAINT leads_warmth_level_check CHECK ((warmth_level = ANY (ARRAY[50, 75, 100])))
);


--
-- Name: leads_lead_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leads_lead_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leads_lead_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leads_lead_number_seq OWNED BY public.leads.lead_number;


--
-- Name: milestone_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestone_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    milestone_type text NOT NULL,
    notified_at timestamp with time zone DEFAULT now()
);


--
-- Name: newsletter_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletter_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    name text,
    subscribed_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    source text DEFAULT 'blog'::text
);


--
-- Name: notification_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_reads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    source_table text NOT NULL,
    source_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type public.notification_type NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone
);

ALTER TABLE ONLY public.notifications REPLICA IDENTITY FULL;


--
-- Name: properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.properties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    developer_id uuid,
    area_id uuid,
    type text DEFAULT 'Apartment'::text NOT NULL,
    status text DEFAULT 'Off-plan'::text NOT NULL,
    price_from numeric(15,2),
    price_formatted text,
    bedrooms text,
    area_sqm text,
    description text,
    short_description text,
    completion_date text,
    hero_image_url text,
    hero_video_url text,
    amenities jsonb DEFAULT '[]'::jsonb,
    features jsonb DEFAULT '[]'::jsonb,
    is_featured boolean DEFAULT false,
    is_published boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    youtube_url text,
    brochure_url text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    dropbox_folder_url text,
    payment_plan text DEFAULT '60/40'::text
);


--
-- Name: property_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.property_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    image_url text NOT NULL,
    alt_text text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: property_unit_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.property_unit_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    unit_type text NOT NULL,
    price_from numeric,
    price_formatted text,
    area_sqm_from text,
    area_sqm_to text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: questionnaire_changes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaire_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    questionnaire_id uuid NOT NULL,
    changed_by uuid NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    field_name text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    change_reason text
);


--
-- Name: unit_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unit_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: leads lead_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads ALTER COLUMN lead_number SET DEFAULT nextval('public.leads_lead_number_seq'::regclass);


--
-- Name: affiliate_clicks affiliate_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_pkey PRIMARY KEY (id);


--
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: brochure_requests brochure_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brochure_requests
    ADD CONSTRAINT brochure_requests_pkey PRIMARY KEY (id);


--
-- Name: catalog_downloads catalog_downloads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_downloads
    ADD CONSTRAINT catalog_downloads_pkey PRIMARY KEY (id);


--
-- Name: chatbot_conversations chatbot_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatbot_conversations
    ADD CONSTRAINT chatbot_conversations_pkey PRIMARY KEY (id);


--
-- Name: chatbot_settings chatbot_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatbot_settings
    ADD CONSTRAINT chatbot_settings_pkey PRIMARY KEY (id);


--
-- Name: chatbot_settings chatbot_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatbot_settings
    ADD CONSTRAINT chatbot_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: clients clients_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_email_key UNIQUE (email);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: commission_payouts commission_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_payouts
    ADD CONSTRAINT commission_payouts_pkey PRIMARY KEY (id);


--
-- Name: consultation_bookings consultation_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_bookings
    ADD CONSTRAINT consultation_bookings_pkey PRIMARY KEY (id);


--
-- Name: consultation_slots consultation_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_slots
    ADD CONSTRAINT consultation_slots_pkey PRIMARY KEY (id);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: coordinator_assignments coordinator_assignments_coordinator_id_tipar_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coordinator_assignments
    ADD CONSTRAINT coordinator_assignments_coordinator_id_tipar_id_key UNIQUE (coordinator_id, tipar_id);


--
-- Name: coordinator_assignments coordinator_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coordinator_assignments
    ADD CONSTRAINT coordinator_assignments_pkey PRIMARY KEY (id);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: developers developers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.developers
    ADD CONSTRAINT developers_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: event_registrations event_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_pkey PRIMARY KEY (id);


--
-- Name: event_slots event_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_slots
    ADD CONSTRAINT event_slots_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_user_id_property_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_property_id_key UNIQUE (user_id, property_id);


--
-- Name: investor_questionnaires investor_questionnaires_lead_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investor_questionnaires
    ADD CONSTRAINT investor_questionnaires_lead_id_unique UNIQUE (lead_id);


--
-- Name: investor_questionnaires investor_questionnaires_lead_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investor_questionnaires
    ADD CONSTRAINT investor_questionnaires_lead_id_version_key UNIQUE (lead_id, version);


--
-- Name: investor_questionnaires investor_questionnaires_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investor_questionnaires
    ADD CONSTRAINT investor_questionnaires_pkey PRIMARY KEY (id);


--
-- Name: lead_audit_log lead_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_audit_log
    ADD CONSTRAINT lead_audit_log_pkey PRIMARY KEY (id);


--
-- Name: lead_commission_splits lead_commission_splits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_commission_splits
    ADD CONSTRAINT lead_commission_splits_pkey PRIMARY KEY (id);


--
-- Name: lead_interactions lead_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_interactions
    ADD CONSTRAINT lead_interactions_pkey PRIMARY KEY (id);


--
-- Name: lead_notes lead_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_notes
    ADD CONSTRAINT lead_notes_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: milestone_notifications milestone_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_notifications
    ADD CONSTRAINT milestone_notifications_pkey PRIMARY KEY (id);


--
-- Name: milestone_notifications milestone_notifications_user_id_milestone_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_notifications
    ADD CONSTRAINT milestone_notifications_user_id_milestone_type_key UNIQUE (user_id, milestone_type);


--
-- Name: newsletter_subscribers newsletter_subscribers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_email_key UNIQUE (email);


--
-- Name: newsletter_subscribers newsletter_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id);


--
-- Name: notification_reads notification_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_pkey PRIMARY KEY (id);


--
-- Name: notification_reads notification_reads_user_id_source_table_source_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_user_id_source_table_source_id_key UNIQUE (user_id, source_table, source_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_affiliate_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_affiliate_code_key UNIQUE (affiliate_code);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: properties properties_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_slug_key UNIQUE (slug);


--
-- Name: property_images property_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_images
    ADD CONSTRAINT property_images_pkey PRIMARY KEY (id);


--
-- Name: property_unit_prices property_unit_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_unit_prices
    ADD CONSTRAINT property_unit_prices_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_changes questionnaire_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_changes
    ADD CONSTRAINT questionnaire_changes_pkey PRIMARY KEY (id);


--
-- Name: unit_types unit_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_types
    ADD CONSTRAINT unit_types_name_key UNIQUE (name);


--
-- Name: unit_types unit_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_types
    ADD CONSTRAINT unit_types_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_affiliate_clicks_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_affiliate_clicks_code ON public.affiliate_clicks USING btree (affiliate_code);


--
-- Name: idx_affiliate_clicks_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_affiliate_clicks_referrer ON public.affiliate_clicks USING btree (referrer_id);


--
-- Name: idx_audit_log_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_action ON public.audit_log USING btree (action);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_entity ON public.audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_audit_log_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_user ON public.audit_log USING btree (user_id);


--
-- Name: idx_brochure_requests_assigned_obchodnik; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brochure_requests_assigned_obchodnik ON public.brochure_requests USING btree (assigned_obchodnik_id);


--
-- Name: idx_brochure_requests_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brochure_requests_client_id ON public.brochure_requests USING btree (client_id);


--
-- Name: idx_brochure_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brochure_requests_created_at ON public.brochure_requests USING btree (created_at DESC);


--
-- Name: idx_brochure_requests_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brochure_requests_email ON public.brochure_requests USING btree (email);


--
-- Name: idx_brochure_requests_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brochure_requests_lead_id ON public.brochure_requests USING btree (lead_id);


--
-- Name: idx_catalog_downloads_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_catalog_downloads_client_id ON public.catalog_downloads USING btree (client_id);


--
-- Name: idx_catalog_downloads_downloaded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_catalog_downloads_downloaded_at ON public.catalog_downloads USING btree (downloaded_at);


--
-- Name: idx_catalog_downloads_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_catalog_downloads_request_id ON public.catalog_downloads USING btree (brochure_request_id);


--
-- Name: idx_chatbot_conversations_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chatbot_conversations_created ON public.chatbot_conversations USING btree (created_at DESC);


--
-- Name: idx_chatbot_conversations_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chatbot_conversations_session ON public.chatbot_conversations USING btree (session_id);


--
-- Name: idx_chatbot_conversations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chatbot_conversations_status ON public.chatbot_conversations USING btree (status);


--
-- Name: idx_clients_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_email ON public.clients USING btree (email);


--
-- Name: idx_commission_splits_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_splits_lead ON public.lead_commission_splits USING btree (lead_id);


--
-- Name: idx_commission_splits_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_splits_recipient ON public.lead_commission_splits USING btree (recipient_id);


--
-- Name: idx_consultation_bookings_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultation_bookings_lead ON public.consultation_bookings USING btree (lead_id);


--
-- Name: idx_consultation_bookings_obchodnik; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultation_bookings_obchodnik ON public.consultation_bookings USING btree (assigned_obchodnik_id);


--
-- Name: idx_consultation_bookings_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultation_bookings_referrer ON public.consultation_bookings USING btree (referrer_id);


--
-- Name: idx_consultation_bookings_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultation_bookings_slot ON public.consultation_bookings USING btree (slot_id);


--
-- Name: idx_consultation_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultation_bookings_status ON public.consultation_bookings USING btree (status);


--
-- Name: idx_consultation_slots_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultation_slots_available ON public.consultation_slots USING btree (is_available, start_time) WHERE (is_available = true);


--
-- Name: idx_consultation_slots_obchodnik; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultation_slots_obchodnik ON public.consultation_slots USING btree (obchodnik_id);


--
-- Name: idx_consultation_slots_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultation_slots_start_time ON public.consultation_slots USING btree (start_time);


--
-- Name: idx_contact_messages_assigned_obchodnik; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_messages_assigned_obchodnik ON public.contact_messages USING btree (assigned_obchodnik_id);


--
-- Name: idx_deals_closed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_closed_at ON public.deals USING btree (closed_at);


--
-- Name: idx_deals_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_lead ON public.deals USING btree (lead_id);


--
-- Name: idx_event_registrations_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_registrations_lead_id ON public.event_registrations USING btree (lead_id);


--
-- Name: idx_event_registrations_referrer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_registrations_referrer_id ON public.event_registrations USING btree (referrer_id);


--
-- Name: idx_event_registrations_slot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_registrations_slot_id ON public.event_registrations USING btree (slot_id);


--
-- Name: idx_event_slots_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_slots_event_id ON public.event_slots USING btree (event_id);


--
-- Name: idx_favorites_property_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_property_id ON public.favorites USING btree (property_id);


--
-- Name: idx_favorites_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_user_id ON public.favorites USING btree (user_id);


--
-- Name: idx_investor_questionnaires_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_investor_questionnaires_lead_id ON public.investor_questionnaires USING btree (lead_id);


--
-- Name: idx_lead_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_audit_log_created_at ON public.lead_audit_log USING btree (created_at DESC);


--
-- Name: idx_lead_audit_log_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_audit_log_lead_id ON public.lead_audit_log USING btree (lead_id);


--
-- Name: idx_lead_audit_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_audit_log_user_id ON public.lead_audit_log USING btree (user_id);


--
-- Name: idx_lead_interactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_interactions_created_at ON public.lead_interactions USING btree (created_at DESC);


--
-- Name: idx_lead_interactions_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_interactions_lead_id ON public.lead_interactions USING btree (lead_id);


--
-- Name: idx_lead_notes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_notes_created_at ON public.lead_notes USING btree (lead_id, created_at DESC);


--
-- Name: idx_lead_notes_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_notes_lead_id ON public.lead_notes USING btree (lead_id);


--
-- Name: idx_leads_assigned_obchodnik; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_assigned_obchodnik ON public.leads USING btree (assigned_obchodnik_id);


--
-- Name: idx_leads_current_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_current_event_id ON public.leads USING btree (current_event_id);


--
-- Name: idx_leads_lead_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_leads_lead_number ON public.leads USING btree (lead_number);


--
-- Name: idx_leads_lead_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_lead_type ON public.leads USING btree (lead_type);


--
-- Name: idx_leads_merged; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_merged ON public.leads USING btree (merged_into_id) WHERE (merged_into_id IS NOT NULL);


--
-- Name: idx_leads_source_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_source_event ON public.leads USING btree (source_event_id);


--
-- Name: idx_notification_reads_user_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_reads_user_source ON public.notification_reads USING btree (user_id, source_table);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_payouts_deal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payouts_deal ON public.commission_payouts USING btree (deal_id);


--
-- Name: idx_payouts_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payouts_recipient ON public.commission_payouts USING btree (recipient_id);


--
-- Name: idx_payouts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payouts_status ON public.commission_payouts USING btree (status);


--
-- Name: idx_profiles_affiliate_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_affiliate_code ON public.profiles USING btree (affiliate_code);


--
-- Name: idx_profiles_assigned_obchodnik_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_assigned_obchodnik_id ON public.profiles USING btree (assigned_obchodnik_id);


--
-- Name: idx_profiles_referrer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_referrer_id ON public.profiles USING btree (referrer_id);


--
-- Name: idx_properties_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_properties_location ON public.properties USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_property_unit_prices_property_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_property_unit_prices_property_id ON public.property_unit_prices USING btree (property_id);


--
-- Name: idx_questionnaire_changes_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_changes_changed_at ON public.questionnaire_changes USING btree (changed_at DESC);


--
-- Name: idx_questionnaire_changes_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_changes_changed_by ON public.questionnaire_changes USING btree (changed_by);


--
-- Name: idx_questionnaire_changes_questionnaire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questionnaire_changes_questionnaire ON public.questionnaire_changes USING btree (questionnaire_id);


--
-- Name: investor_questionnaires audit_questionnaire_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_questionnaire_changes AFTER INSERT OR UPDATE ON public.investor_questionnaires FOR EACH ROW EXECUTE FUNCTION public.log_questionnaire_changes();


--
-- Name: profiles check_milestones_on_profile_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_milestones_on_profile_update BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.check_milestone_triggers();


--
-- Name: leads on_lead_status_changed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_lead_status_changed AFTER UPDATE ON public.leads FOR EACH ROW WHEN ((old.status IS DISTINCT FROM new.status)) EXECUTE FUNCTION public.notify_lead_status_changed();


--
-- Name: profiles on_profile_role_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_role_update AFTER UPDATE OF role ON public.profiles FOR EACH ROW WHEN (((new.role = 'tipar'::text) AND (old.role IS DISTINCT FROM new.role))) EXECUTE FUNCTION public.auto_assign_tipar_role();


--
-- Name: leads trigger_auto_assign_obchodnik; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_assign_obchodnik BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.auto_assign_obchodnik();


--
-- Name: leads trigger_log_lead_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_log_lead_changes AFTER INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.log_lead_changes();


--
-- Name: leads trigger_notify_lead_assigned; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_lead_assigned AFTER UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.notify_lead_assigned();


--
-- Name: leads trigger_notify_lead_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_lead_created AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.notify_lead_created();


--
-- Name: leads trigger_notify_lead_status_changed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_lead_status_changed AFTER UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.notify_lead_status_changed();


--
-- Name: investor_questionnaires trigger_questionnaire_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_questionnaire_version BEFORE UPDATE ON public.investor_questionnaires FOR EACH ROW EXECUTE FUNCTION public.create_questionnaire_version();


--
-- Name: areas update_areas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON public.areas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: brochure_requests update_brochure_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_brochure_requests_updated_at BEFORE UPDATE ON public.brochure_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chatbot_conversations update_chatbot_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chatbot_conversations_updated_at BEFORE UPDATE ON public.chatbot_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chatbot_settings update_chatbot_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chatbot_settings_updated_at BEFORE UPDATE ON public.chatbot_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clients update_clients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: commission_payouts update_commission_payouts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_commission_payouts_updated_at BEFORE UPDATE ON public.commission_payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: consultation_bookings update_consultation_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_consultation_bookings_updated_at BEFORE UPDATE ON public.consultation_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: consultation_bookings update_consultation_slot_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_consultation_slot_count AFTER INSERT OR DELETE OR UPDATE ON public.consultation_bookings FOR EACH ROW EXECUTE FUNCTION public.update_slot_booked_count();


--
-- Name: consultation_slots update_consultation_slots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_consultation_slots_updated_at BEFORE UPDATE ON public.consultation_slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: coordinator_assignments update_coordinator_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_coordinator_assignments_updated_at BEFORE UPDATE ON public.coordinator_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: deals update_deals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: developers update_developers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_developers_updated_at BEFORE UPDATE ON public.developers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: email_templates update_email_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_registrations update_event_registrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_event_registrations_updated_at BEFORE UPDATE ON public.event_registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_slots update_event_slots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_event_slots_updated_at BEFORE UPDATE ON public.event_slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lead_commission_splits update_lead_commission_splits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lead_commission_splits_updated_at BEFORE UPDATE ON public.lead_commission_splits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lead_notes update_lead_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lead_notes_updated_at BEFORE UPDATE ON public.lead_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leads update_leads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: properties update_properties_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: property_unit_prices update_property_unit_prices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_property_unit_prices_updated_at BEFORE UPDATE ON public.property_unit_prices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_registrations update_registered_count_on_registration; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_registered_count_on_registration AFTER INSERT OR DELETE ON public.event_registrations FOR EACH ROW EXECUTE FUNCTION public.update_slot_registered_count();


--
-- Name: unit_types update_unit_types_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_unit_types_updated_at BEFORE UPDATE ON public.unit_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: affiliate_clicks affiliate_clicks_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: brochure_requests brochure_requests_assigned_obchodnik_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brochure_requests
    ADD CONSTRAINT brochure_requests_assigned_obchodnik_id_fkey FOREIGN KEY (assigned_obchodnik_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: brochure_requests brochure_requests_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brochure_requests
    ADD CONSTRAINT brochure_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: brochure_requests brochure_requests_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brochure_requests
    ADD CONSTRAINT brochure_requests_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: catalog_downloads catalog_downloads_brochure_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_downloads
    ADD CONSTRAINT catalog_downloads_brochure_request_id_fkey FOREIGN KEY (brochure_request_id) REFERENCES public.brochure_requests(id) ON DELETE CASCADE;


--
-- Name: catalog_downloads catalog_downloads_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_downloads
    ADD CONSTRAINT catalog_downloads_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: chatbot_conversations chatbot_conversations_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatbot_conversations
    ADD CONSTRAINT chatbot_conversations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);


--
-- Name: clients clients_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);


--
-- Name: clients clients_source_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_source_lead_id_fkey FOREIGN KEY (source_lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: commission_payouts commission_payouts_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_payouts
    ADD CONSTRAINT commission_payouts_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: commission_payouts commission_payouts_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_payouts
    ADD CONSTRAINT commission_payouts_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;


--
-- Name: commission_payouts commission_payouts_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_payouts
    ADD CONSTRAINT commission_payouts_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id);


--
-- Name: consultation_bookings consultation_bookings_assigned_obchodnik_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_bookings
    ADD CONSTRAINT consultation_bookings_assigned_obchodnik_id_fkey FOREIGN KEY (assigned_obchodnik_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: consultation_bookings consultation_bookings_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_bookings
    ADD CONSTRAINT consultation_bookings_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: consultation_bookings consultation_bookings_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_bookings
    ADD CONSTRAINT consultation_bookings_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: consultation_bookings consultation_bookings_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_bookings
    ADD CONSTRAINT consultation_bookings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.consultation_slots(id) ON DELETE SET NULL;


--
-- Name: consultation_slots consultation_slots_obchodnik_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_slots
    ADD CONSTRAINT consultation_slots_obchodnik_id_fkey FOREIGN KEY (obchodnik_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: contact_messages contact_messages_assigned_obchodnik_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_assigned_obchodnik_id_fkey FOREIGN KEY (assigned_obchodnik_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: coordinator_assignments coordinator_assignments_coordinator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coordinator_assignments
    ADD CONSTRAINT coordinator_assignments_coordinator_id_fkey FOREIGN KEY (coordinator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: coordinator_assignments coordinator_assignments_tipar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coordinator_assignments
    ADD CONSTRAINT coordinator_assignments_tipar_id_fkey FOREIGN KEY (tipar_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: deals deals_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.profiles(id);


--
-- Name: deals deals_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);


--
-- Name: deals deals_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: email_templates email_templates_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_registrations event_registrations_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: event_registrations event_registrations_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: event_registrations event_registrations_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.event_slots(id) ON DELETE CASCADE;


--
-- Name: event_slots event_slots_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_slots
    ADD CONSTRAINT event_slots_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: investor_questionnaires investor_questionnaires_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investor_questionnaires
    ADD CONSTRAINT investor_questionnaires_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES auth.users(id);


--
-- Name: investor_questionnaires investor_questionnaires_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investor_questionnaires
    ADD CONSTRAINT investor_questionnaires_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_audit_log lead_audit_log_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_audit_log
    ADD CONSTRAINT lead_audit_log_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_commission_splits lead_commission_splits_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_commission_splits
    ADD CONSTRAINT lead_commission_splits_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.profiles(id);


--
-- Name: lead_commission_splits lead_commission_splits_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_commission_splits
    ADD CONSTRAINT lead_commission_splits_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_commission_splits lead_commission_splits_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_commission_splits
    ADD CONSTRAINT lead_commission_splits_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: lead_interactions lead_interactions_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_interactions
    ADD CONSTRAINT lead_interactions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_notes lead_notes_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_notes
    ADD CONSTRAINT lead_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: lead_notes lead_notes_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_notes
    ADD CONSTRAINT lead_notes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: leads leads_assigned_obchodnik_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_assigned_obchodnik_id_fkey FOREIGN KEY (assigned_obchodnik_id) REFERENCES public.profiles(id);


--
-- Name: leads leads_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: leads leads_current_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_current_event_id_fkey FOREIGN KEY (current_event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: leads leads_merged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_merged_by_fkey FOREIGN KEY (merged_by) REFERENCES public.profiles(id);


--
-- Name: leads leads_merged_into_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_merged_into_id_fkey FOREIGN KEY (merged_into_id) REFERENCES public.leads(id);


--
-- Name: leads leads_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: leads leads_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: leads leads_source_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_source_event_id_fkey FOREIGN KEY (source_event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: milestone_notifications milestone_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_notifications
    ADD CONSTRAINT milestone_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_assigned_obchodnik_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_assigned_obchodnik_id_fkey FOREIGN KEY (assigned_obchodnik_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: properties properties_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE SET NULL;


--
-- Name: properties properties_developer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_developer_id_fkey FOREIGN KEY (developer_id) REFERENCES public.developers(id) ON DELETE SET NULL;


--
-- Name: property_images property_images_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_images
    ADD CONSTRAINT property_images_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: property_unit_prices property_unit_prices_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_unit_prices
    ADD CONSTRAINT property_unit_prices_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: questionnaire_changes questionnaire_changes_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_changes
    ADD CONSTRAINT questionnaire_changes_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: questionnaire_changes questionnaire_changes_questionnaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_changes
    ADD CONSTRAINT questionnaire_changes_questionnaire_id_fkey FOREIGN KEY (questionnaire_id) REFERENCES public.investor_questionnaires(id) ON DELETE CASCADE;


--
-- Name: areas Admins can delete areas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete areas" ON public.areas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: brochure_requests Admins can delete brochure requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete brochure requests" ON public.brochure_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: affiliate_clicks Admins can delete clicks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete clicks" ON public.affiliate_clicks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: coordinator_assignments Admins can delete coordinator assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete coordinator assignments" ON public.coordinator_assignments FOR DELETE USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: developers Admins can delete developers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete developers" ON public.developers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_templates Admins can delete email templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete email templates" ON public.email_templates FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: event_slots Admins can delete event slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete event slots" ON public.event_slots FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: events Admins can delete events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete events" ON public.events FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: leads Admins can delete leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete leads" ON public.leads FOR DELETE USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: properties Admins can delete properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete properties" ON public.properties FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: property_images Admins can delete property images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete property images" ON public.property_images FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: property_unit_prices Admins can delete property unit prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete property unit prices" ON public.property_unit_prices FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: event_registrations Admins can delete registrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete registrations" ON public.event_registrations FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can delete user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete user roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: areas Admins can insert areas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert areas" ON public.areas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: coordinator_assignments Admins can insert coordinator assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert coordinator assignments" ON public.coordinator_assignments FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: developers Admins can insert developers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert developers" ON public.developers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_templates Admins can insert email templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert email templates" ON public.email_templates FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: event_slots Admins can insert event slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert event slots" ON public.event_slots FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: events Admins can insert events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert events" ON public.events FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: properties Admins can insert properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert properties" ON public.properties FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: property_images Admins can insert property images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert property images" ON public.property_images FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: property_unit_prices Admins can insert property unit prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert property unit prices" ON public.property_unit_prices FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert user roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lead_commission_splits Admins can manage all commission splits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all commission splits" ON public.lead_commission_splits USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: consultation_bookings Admins can manage all consultation bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all consultation bookings" ON public.consultation_bookings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: consultation_slots Admins can manage all consultation slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all consultation slots" ON public.consultation_slots USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: deals Admins can manage all deals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all deals" ON public.deals USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lead_interactions Admins can manage all interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all interactions" ON public.lead_interactions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lead_notes Admins can manage all notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all notes" ON public.lead_notes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: commission_payouts Admins can manage all payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all payouts" ON public.commission_payouts USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: questionnaire_changes Admins can manage all questionnaire changes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all questionnaire changes" ON public.questionnaire_changes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: investor_questionnaires Admins can manage all questionnaires; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all questionnaires" ON public.investor_questionnaires USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: chatbot_settings Admins can manage chatbot settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage chatbot settings" ON public.chatbot_settings USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: milestone_notifications Admins can manage milestone notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage milestone notifications" ON public.milestone_notifications USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: unit_types Admins can manage unit types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage unit types" ON public.unit_types USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: areas Admins can update areas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update areas" ON public.areas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: brochure_requests Admins can update brochure requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update brochure requests" ON public.brochure_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: coordinator_assignments Admins can update coordinator assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update coordinator assignments" ON public.coordinator_assignments FOR UPDATE USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: developers Admins can update developers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update developers" ON public.developers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_templates Admins can update email templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update email templates" ON public.email_templates FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: event_slots Admins can update event slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update event slots" ON public.event_slots FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: events Admins can update events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update events" ON public.events FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: properties Admins can update properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update properties" ON public.properties FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: property_images Admins can update property images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update property images" ON public.property_images FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: property_unit_prices Admins can update property unit prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update property unit prices" ON public.property_unit_prices FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: event_registrations Admins can update registrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update registrations" ON public.event_registrations FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can update user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update user roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_log Admins can view all audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all audit logs" ON public.audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lead_audit_log Admins can view all audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all audit logs" ON public.lead_audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: coordinator_assignments Admins can view all coordinator assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all coordinator assignments" ON public.coordinator_assignments FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: email_templates Admins can view all email templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all email templates" ON public.email_templates FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: events Admins can view all events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all events" ON public.events FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: leads Admins can view all leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all leads" ON public.leads FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: properties Admins can view all properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all properties" ON public.properties FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: event_registrations Admins can view all registrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all registrations" ON public.event_registrations FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all user roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: chatbot_settings Anyone can read chatbot settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read chatbot settings" ON public.chatbot_settings FOR SELECT USING (true);


--
-- Name: events Anyone can view active events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active events" ON public.events FOR SELECT USING ((is_active = true));


--
-- Name: unit_types Anyone can view active unit types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active unit types" ON public.unit_types FOR SELECT USING ((is_active = true));


--
-- Name: areas Anyone can view areas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view areas" ON public.areas FOR SELECT USING (true);


--
-- Name: developers Anyone can view developers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view developers" ON public.developers FOR SELECT USING (true);


--
-- Name: event_slots Anyone can view event slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view event slots" ON public.event_slots FOR SELECT USING (true);


--
-- Name: property_images Anyone can view property images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view property images" ON public.property_images FOR SELECT USING (true);


--
-- Name: property_unit_prices Anyone can view property unit prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view property unit prices" ON public.property_unit_prices FOR SELECT USING (true);


--
-- Name: properties Anyone can view published properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published properties" ON public.properties FOR SELECT USING ((is_published = true));


--
-- Name: chatbot_conversations Authenticated users can create chatbot conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create chatbot conversations" ON public.chatbot_conversations FOR INSERT WITH CHECK (((session_id IS NOT NULL) AND (length(TRIM(BOTH FROM session_id)) >= 10) AND ((auth.uid() IS NULL) OR (user_id = auth.uid()) OR (user_id IS NULL))));


--
-- Name: consultation_slots Authenticated users can view available slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view available slots" ON public.consultation_slots FOR SELECT USING (((auth.uid() IS NOT NULL) AND (is_available = true) AND (booked_count < capacity) AND (start_time > now())));


--
-- Name: audit_log Block anonymous access to audit_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous access to audit_log" ON public.audit_log FOR SELECT USING (((auth.uid() IS NOT NULL) AND false));


--
-- Name: consultation_bookings Block anonymous access to consultation_bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous access to consultation_bookings" ON public.consultation_bookings FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: investor_questionnaires Block anonymous access to investor_questionnaires; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous access to investor_questionnaires" ON public.investor_questionnaires FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: investor_questionnaires Block anonymous delete to investor_questionnaires; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous delete to investor_questionnaires" ON public.investor_questionnaires FOR DELETE TO anon USING (false);


--
-- Name: leads Block anonymous delete to leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous delete to leads" ON public.leads FOR DELETE TO anon USING (false);


--
-- Name: consultation_slots Block anonymous insert to consultation_slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous insert to consultation_slots" ON public.consultation_slots FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: investor_questionnaires Block anonymous insert to investor_questionnaires; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous insert to investor_questionnaires" ON public.investor_questionnaires FOR INSERT TO anon WITH CHECK (false);


--
-- Name: lead_interactions Block anonymous insert to lead_interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous insert to lead_interactions" ON public.lead_interactions FOR INSERT WITH CHECK (false);


--
-- Name: leads Block anonymous insert to leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous insert to leads" ON public.leads FOR INSERT TO anon WITH CHECK (false);


--
-- Name: brochure_requests Block anonymous inserts to brochure requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous inserts to brochure requests" ON public.brochure_requests FOR INSERT TO anon WITH CHECK (false);


--
-- Name: chatbot_conversations Block anonymous read of chatbot conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous read of chatbot conversations" ON public.chatbot_conversations FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: leads Block anonymous select on leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous select on leads" ON public.leads FOR SELECT TO anon USING (false);


--
-- Name: investor_questionnaires Block anonymous update to investor_questionnaires; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous update to investor_questionnaires" ON public.investor_questionnaires FOR UPDATE TO anon USING (false);


--
-- Name: leads Block anonymous update to leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anonymous update to leads" ON public.leads FOR UPDATE TO anon USING (false);


--
-- Name: affiliate_clicks Block direct inserts - use edge functions only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block direct inserts - use edge functions only" ON public.affiliate_clicks FOR INSERT WITH CHECK (false);


--
-- Name: contact_messages Block direct inserts - use edge functions only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block direct inserts - use edge functions only" ON public.contact_messages FOR INSERT WITH CHECK (false);


--
-- Name: newsletter_subscribers Block direct inserts - use edge functions only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block direct inserts - use edge functions only" ON public.newsletter_subscribers FOR INSERT WITH CHECK (false);


--
-- Name: audit_log Block direct inserts - use triggers only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block direct inserts - use triggers only" ON public.audit_log FOR INSERT WITH CHECK (false);


--
-- Name: user_roles Block self role assignment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block self role assignment" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Coordinators can view assigned tipar profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coordinators can view assigned tipar profiles" ON public.profiles FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'influencer_coordinator'::public.app_role) AND (id IN ( SELECT coordinator_assignments.tipar_id
   FROM public.coordinator_assignments
  WHERE (coordinator_assignments.coordinator_id = auth.uid())))));


--
-- Name: coordinator_assignments Coordinators can view their own assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coordinators can view their own assignments" ON public.coordinator_assignments FOR SELECT USING (((auth.uid() IS NOT NULL) AND (coordinator_id = auth.uid())));


--
-- Name: investor_questionnaires Obchodnici can insert questionnaires for their assigned leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodnici can insert questionnaires for their assigned leads" ON public.investor_questionnaires FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'obchodnik'::public.app_role) AND (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE (leads.assigned_obchodnik_id = auth.uid())))));


--
-- Name: consultation_slots Obchodnici can manage own slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodnici can manage own slots" ON public.consultation_slots USING (((auth.uid() IS NOT NULL) AND (obchodnik_id = auth.uid())));


--
-- Name: consultation_bookings Obchodnici can update assigned bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodnici can update assigned bookings" ON public.consultation_bookings FOR UPDATE USING (((auth.uid() IS NOT NULL) AND (assigned_obchodnik_id = auth.uid())));


--
-- Name: leads Obchodnici can update only their assigned leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodnici can update only their assigned leads" ON public.leads FOR UPDATE USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'obchodnik'::public.app_role) AND (assigned_obchodnik_id = auth.uid()) AND (status <> ALL (ARRAY['closed_won'::text, 'closed_lost'::text]))));


--
-- Name: investor_questionnaires Obchodnici can update questionnaires for their assigned active ; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodnici can update questionnaires for their assigned active " ON public.investor_questionnaires FOR UPDATE USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'obchodnik'::public.app_role) AND (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE ((leads.assigned_obchodnik_id = auth.uid()) AND (leads.status <> ALL (ARRAY['closed_won'::text, 'closed_lost'::text])))))));


--
-- Name: consultation_bookings Obchodnici can view assigned bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodnici can view assigned bookings" ON public.consultation_bookings FOR SELECT USING (((auth.uid() IS NOT NULL) AND (assigned_obchodnik_id = auth.uid())));


--
-- Name: brochure_requests Obchodnici can view assigned brochure requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodnici can view assigned brochure requests" ON public.brochure_requests FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'obchodnik'::public.app_role) AND (assigned_obchodnik_id = auth.uid())));


--
-- Name: leads Obchodnici can view assigned leads only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodnici can view assigned leads only" ON public.leads FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'obchodnik'::public.app_role) AND (assigned_obchodnik_id = auth.uid())));


--
-- Name: lead_interactions Obchodnici can view interactions for assigned leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodnici can view interactions for assigned leads" ON public.lead_interactions FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'obchodnik'::public.app_role) AND (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE (leads.assigned_obchodnik_id = auth.uid())))));


--
-- Name: user_roles Obchodnici can view obchodnik roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodnici can view obchodnik roles" ON public.user_roles FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'obchodnik'::public.app_role) AND (role = ANY (ARRAY['obchodnik'::public.app_role, 'senior_obchodnik'::public.app_role]))));


--
-- Name: investor_questionnaires Obchodnici can view questionnaires for their assigned leads onl; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodnici can view questionnaires for their assigned leads onl" ON public.investor_questionnaires FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'obchodnik'::public.app_role) AND (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE ((leads.assigned_obchodnik_id = auth.uid()) AND (leads.status <> ALL (ARRAY['closed_won'::text, 'closed_lost'::text])))))));


--
-- Name: profiles Obchodnici can view relevant profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodnici can view relevant profiles" ON public.profiles FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'obchodnik'::public.app_role) AND ((assigned_obchodnik_id = auth.uid()) OR (id IN ( SELECT leads.referrer_id
   FROM public.leads
  WHERE ((leads.assigned_obchodnik_id = auth.uid()) AND (leads.referrer_id IS NOT NULL)))) OR (id IN ( SELECT user_roles.user_id
   FROM public.user_roles
  WHERE (user_roles.role = ANY (ARRAY['obchodnik'::public.app_role, 'senior_obchodnik'::public.app_role])))))));


--
-- Name: deals Obchodnici can view their deals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodnici can view their deals" ON public.deals FOR SELECT USING (((auth.uid() IS NOT NULL) AND (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE (leads.assigned_obchodnik_id = auth.uid())))));


--
-- Name: lead_notes Obchodníci can insert notes for assigned leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodníci can insert notes for assigned leads" ON public.lead_notes FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'obchodnik'::public.app_role) AND (author_id = auth.uid()) AND (note_type = 'standard'::text) AND (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE (leads.assigned_obchodnik_id = auth.uid())))));


--
-- Name: lead_audit_log Obchodníci can view audit logs for assigned leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodníci can view audit logs for assigned leads" ON public.lead_audit_log FOR SELECT USING (((auth.uid() IS NOT NULL) AND (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE (leads.assigned_obchodnik_id = auth.uid())))));


--
-- Name: questionnaire_changes Obchodníci can view changes for assigned leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodníci can view changes for assigned leads" ON public.questionnaire_changes FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'obchodnik'::public.app_role) AND (questionnaire_id IN ( SELECT iq.id
   FROM (public.investor_questionnaires iq
     JOIN public.leads l ON ((iq.lead_id = l.id)))
  WHERE (l.assigned_obchodnik_id = auth.uid())))));


--
-- Name: lead_notes Obchodníci can view notes for assigned leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Obchodníci can view notes for assigned leads" ON public.lead_notes FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'obchodnik'::public.app_role) AND (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE (leads.assigned_obchodnik_id = auth.uid())))));


--
-- Name: catalog_downloads Only admins can delete catalog downloads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete catalog downloads" ON public.catalog_downloads FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: clients Only admins can delete clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete clients" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contact_messages Only admins can delete contact messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete contact messages" ON public.contact_messages FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Only admins can delete profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete profiles" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: newsletter_subscribers Only admins can delete subscribers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete subscribers" ON public.newsletter_subscribers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: catalog_downloads Only admins can insert catalog downloads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert catalog downloads" ON public.catalog_downloads FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: clients Only admins can insert clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: catalog_downloads Only admins can update catalog downloads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update catalog downloads" ON public.catalog_downloads FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: clients Only admins can update clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update clients" ON public.clients FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contact_messages Only admins can update contact messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update contact messages" ON public.contact_messages FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: newsletter_subscribers Only admins can update subscribers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update subscribers" ON public.newsletter_subscribers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: brochure_requests Only admins can view brochure requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view brochure requests" ON public.brochure_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: catalog_downloads Only admins can view catalog downloads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view catalog downloads" ON public.catalog_downloads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: clients Only admins can view clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view clients" ON public.clients FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contact_messages Only admins can view contact messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view contact messages" ON public.contact_messages FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: newsletter_subscribers Only admins can view subscribers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view subscribers" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Profiles created by auth trigger only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles created by auth trigger only" ON public.profiles FOR INSERT WITH CHECK (false);


--
-- Name: commission_payouts Recipients can view their own payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recipients can view their own payouts" ON public.commission_payouts FOR SELECT USING (((auth.uid() IS NOT NULL) AND (recipient_id = auth.uid())));


--
-- Name: lead_commission_splits Recipients can view their own splits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recipients can view their own splits" ON public.lead_commission_splits FOR SELECT USING (((auth.uid() IS NOT NULL) AND (recipient_id = auth.uid())));


--
-- Name: investor_questionnaires Referrers can insert questionnaires for their leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referrers can insert questionnaires for their leads" ON public.investor_questionnaires FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE (leads.referrer_id = auth.uid())))));


--
-- Name: event_registrations Referrers can register their own leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referrers can register their own leads" ON public.event_registrations FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (referrer_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.leads
  WHERE ((leads.id = event_registrations.lead_id) AND (leads.referrer_id = auth.uid()))))));


--
-- Name: profiles Referrers can view assigned obchodnik profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referrers can view assigned obchodnik profile" ON public.profiles FOR SELECT TO authenticated USING ((id = ( SELECT p.assigned_obchodnik_id
   FROM public.profiles p
  WHERE (p.id = auth.uid()))));


--
-- Name: deals Referrers can view deals from their leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referrers can view deals from their leads" ON public.deals FOR SELECT USING (((auth.uid() IS NOT NULL) AND (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE (leads.referrer_id = auth.uid())))));


--
-- Name: lead_interactions Referrers can view interactions for their leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referrers can view interactions for their leads" ON public.lead_interactions FOR SELECT USING (((auth.uid() IS NOT NULL) AND (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE (leads.referrer_id = auth.uid())))));


--
-- Name: consultation_bookings Referrers can view own lead bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referrers can view own lead bookings" ON public.consultation_bookings FOR SELECT USING (((auth.uid() IS NOT NULL) AND (referrer_id = auth.uid())));


--
-- Name: leads Referrers can view own leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referrers can view own leads" ON public.leads FOR SELECT USING (((auth.uid() IS NOT NULL) AND (referrer_id = auth.uid())));


--
-- Name: leads Referrers can view own leads limited info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referrers can view own leads limited info" ON public.leads FOR SELECT USING (((auth.uid() IS NOT NULL) AND (referrer_id = auth.uid()) AND (merged_into_id IS NULL)));


--
-- Name: investor_questionnaires Referrers can view questionnaires for their leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referrers can view questionnaires for their leads" ON public.investor_questionnaires FOR SELECT USING (((auth.uid() IS NOT NULL) AND (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE (leads.referrer_id = auth.uid())))));


--
-- Name: lead_commission_splits Referrers can view splits for their leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referrers can view splits for their leads" ON public.lead_commission_splits FOR SELECT USING (((auth.uid() IS NOT NULL) AND (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE (leads.referrer_id = auth.uid())))));


--
-- Name: event_registrations Referrers can view their lead registrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Referrers can view their lead registrations" ON public.event_registrations FOR SELECT USING (((auth.uid() IS NOT NULL) AND (referrer_id = auth.uid())));


--
-- Name: leads Require authentication for leads insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Require authentication for leads insert" ON public.leads FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: leads Require authentication for leads update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Require authentication for leads update" ON public.leads FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: consultation_bookings Senior obchodnici can insert bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodnici can insert bookings" ON public.consultation_bookings FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role)));


--
-- Name: consultation_bookings Senior obchodnici can update all bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodnici can update all bookings" ON public.consultation_bookings FOR UPDATE USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role)));


--
-- Name: leads Senior obchodnici can view active leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodnici can view active leads" ON public.leads FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role) AND (status <> ALL (ARRAY['closed_won'::text, 'closed_lost'::text]))));


--
-- Name: consultation_bookings Senior obchodnici can view all bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodnici can view all bookings" ON public.consultation_bookings FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role)));


--
-- Name: brochure_requests Senior obchodnici can view all brochure requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodnici can view all brochure requests" ON public.brochure_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role));


--
-- Name: profiles Senior obchodnici can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodnici can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role));


--
-- Name: consultation_slots Senior obchodnici can view all slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodnici can view all slots" ON public.consultation_slots FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role)));


--
-- Name: lead_commission_splits Senior obchodnici can view commission splits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodnici can view commission splits" ON public.lead_commission_splits FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role)));


--
-- Name: deals Senior obchodnici can view deals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodnici can view deals" ON public.deals FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role)));


--
-- Name: user_roles Senior obchodnici can view obchodnik roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodnici can view obchodnik roles" ON public.user_roles FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role) AND (role = ANY (ARRAY['obchodnik'::public.app_role, 'senior_obchodnik'::public.app_role]))));


--
-- Name: commission_payouts Senior obchodnici can view payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodnici can view payouts" ON public.commission_payouts FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role)));


--
-- Name: audit_log Senior obchodnici can view team audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodnici can view team audit logs" ON public.audit_log FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role) AND (entity_type = ANY (ARRAY['lead'::text, 'questionnaire'::text]))));


--
-- Name: lead_interactions Senior obchodnici can view team lead interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodnici can view team lead interactions" ON public.lead_interactions FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role)));


--
-- Name: leads Senior obchodnici can view team leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodnici can view team leads" ON public.leads FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role) AND ((assigned_obchodnik_id = auth.uid()) OR (referrer_id IN ( SELECT coordinator_assignments.tipar_id
   FROM public.coordinator_assignments
  WHERE (coordinator_assignments.coordinator_id = auth.uid()))) OR ((assigned_obchodnik_id IS NULL) AND (status = ANY (ARRAY['new'::text, 'contacted'::text]))))));


--
-- Name: investor_questionnaires Senior obchodnici view questionnaires for active leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodnici view questionnaires for active leads" ON public.investor_questionnaires FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role) AND (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE (((leads.assigned_obchodnik_id IS NOT NULL) AND (leads.status <> ALL (ARRAY['closed_won'::text, 'closed_lost'::text]))) OR ((leads.assigned_obchodnik_id IS NULL) AND (leads.status = ANY (ARRAY['new'::text, 'contacted'::text, 'qualified'::text, 'supertip'::text]))) OR (leads.created_at > (now() - '90 days'::interval)))))));


--
-- Name: lead_notes Senior obchodníci can insert managerial notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodníci can insert managerial notes" ON public.lead_notes FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role) AND (author_id = auth.uid()) AND (note_type = ANY (ARRAY['standard'::text, 'managerial'::text]))));


--
-- Name: questionnaire_changes Senior obchodníci can view all changes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodníci can view all changes" ON public.questionnaire_changes FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role)));


--
-- Name: lead_notes Senior obchodníci can view all notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodníci can view all notes" ON public.lead_notes FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role)));


--
-- Name: audit_log Senior obchodníci can view team audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senior obchodníci can view team audit logs" ON public.audit_log FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'senior_obchodnik'::public.app_role) AND ((entity_type = 'lead'::text) OR (entity_type = 'questionnaire'::text))));


--
-- Name: milestone_notifications Service role can insert milestone notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert milestone notifications" ON public.milestone_notifications FOR INSERT WITH CHECK (true);


--
-- Name: chatbot_conversations Staff can view chatbot conversations for business purposes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view chatbot conversations for business purposes" ON public.chatbot_conversations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'senior_obchodnik'::public.app_role, 'obchodnik'::public.app_role]))))));


--
-- Name: lead_audit_log System can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert audit logs" ON public.lead_audit_log FOR INSERT WITH CHECK (true);


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: consultation_bookings Tipari can insert bookings for own leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tipari can insert bookings for own leads" ON public.consultation_bookings FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (referrer_id = auth.uid()) AND (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE (leads.referrer_id = auth.uid())))));


--
-- Name: coordinator_assignments Tipars can view assignments where they are assigned; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tipars can view assignments where they are assigned" ON public.coordinator_assignments FOR SELECT USING (((auth.uid() IS NOT NULL) AND (tipar_id = auth.uid())));


--
-- Name: leads Tipaři can insert own leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tipaři can insert own leads" ON public.leads FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND ((referrer_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))));


--
-- Name: leads Tipaři can update own leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tipaři can update own leads" ON public.leads FOR UPDATE USING (((auth.uid() IS NOT NULL) AND (referrer_id = auth.uid()) AND (status <> ALL (ARRAY['closed_won'::text, 'closed_lost'::text]))));


--
-- Name: affiliate_clicks Tipaři can view own clicks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tipaři can view own clicks" ON public.affiliate_clicks FOR SELECT TO authenticated USING (((referrer_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: favorites Users can add their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add their own favorites" ON public.favorites FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notification_reads Users can delete own notification reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own notification reads" ON public.notification_reads FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: favorites Users can delete their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own favorites" ON public.favorites FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notification_reads Users can insert own notification reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own notification reads" ON public.notification_reads FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: chatbot_conversations Users can update own chatbot conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own chatbot conversations" ON public.chatbot_conversations FOR UPDATE USING (((auth.uid() IS NOT NULL) AND (user_id = auth.uid())));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (((auth.uid() IS NOT NULL) AND (id = auth.uid())));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: lead_audit_log Users can view audit logs for their leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view audit logs for their leads" ON public.lead_audit_log FOR SELECT USING (((auth.uid() IS NOT NULL) AND (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE (leads.referrer_id = auth.uid())))));


--
-- Name: chatbot_conversations Users can view own chatbot conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own chatbot conversations" ON public.chatbot_conversations FOR SELECT USING (((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (session_id IN ( SELECT chatbot_conversations_1.session_id
   FROM public.chatbot_conversations chatbot_conversations_1
  WHERE (chatbot_conversations_1.user_id = auth.uid()))))));


--
-- Name: notification_reads Users can view own notification reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notification reads" ON public.notification_reads FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: favorites Users can view their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: affiliate_clicks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

--
-- Name: areas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: brochure_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brochure_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: catalog_downloads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.catalog_downloads ENABLE ROW LEVEL SECURITY;

--
-- Name: chatbot_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: chatbot_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: commission_payouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;

--
-- Name: consultation_bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consultation_bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: consultation_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consultation_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: coordinator_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coordinator_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: deals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

--
-- Name: developers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.developers ENABLE ROW LEVEL SECURITY;

--
-- Name: email_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: event_registrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: event_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: investor_questionnaires; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.investor_questionnaires ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_commission_splits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_commission_splits ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_interactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: milestone_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.milestone_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: newsletter_subscribers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_reads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: properties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

--
-- Name: property_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

--
-- Name: property_unit_prices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.property_unit_prices ENABLE ROW LEVEL SECURITY;

--
-- Name: questionnaire_changes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.questionnaire_changes ENABLE ROW LEVEL SECURITY;

--
-- Name: unit_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.unit_types ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;