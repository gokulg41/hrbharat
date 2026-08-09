--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

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

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'owner',
    'admin',
    'manager',
    'employee'
);


--
-- Name: employment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.employment_status AS ENUM (
    'active',
    'inactive',
    'suspended'
);


--
-- Name: leave_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.leave_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: payroll_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payroll_status AS ENUM (
    'pending',
    'processing',
    'paid'
);


--
-- Name: handle_invited_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_invited_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Teammate'),
    'employee',
    (NEW.raw_user_meta_data->>'company_id')::uuid
  );
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Team Member'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;


--
-- Name: process_monthly_leave_accrual(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_monthly_leave_accrual() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.leave_balances (employee_id, company_id, allocated_leaves, remaining_leaves)
  SELECT id, company_id, 1.25, 1.25
  FROM public.employees
  WHERE status = 'Active'
  ON CONFLICT DO NOTHING;

  UPDATE public.leave_balances
  SET
    allocated_leaves = allocated_leaves + 1.25,
    remaining_leaves = remaining_leaves + 1.25,
    updated_at = now()
  WHERE employee_id IN (SELECT id FROM public.employees WHERE status = 'Active');
END;
$$;


--
-- Name: provision_master_company_admin(text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.provision_master_company_admin(admin_email text, admin_password text, admin_name text, company_name text, branch_name text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'auth', 'public', 'extensions'
    AS $$
DECLARE
    new_user_id UUID;
    generated_company_uuid UUID;
    human_readable_code TEXT;
    date_today TEXT;
    real_instance_id UUID;
BEGIN
    new_user_id := gen_random_uuid();
    generated_company_uuid := gen_random_uuid();
    human_readable_code := 'COM-' || floor(random() * (900000) + 100000)::text;
    date_today := to_char(current_date, 'YYYY-MM-DD');

    SELECT instance_id INTO real_instance_id FROM auth.users LIMIT 1;

    IF real_instance_id IS NULL THEN
        real_instance_id := '00000000-0000-0000-0000-000000000000';
    END IF;

    INSERT INTO public.companies (
        id, owner_id, name, business_type, address, phone
    )
    VALUES (
        generated_company_uuid, new_user_id, company_name, 'SaaS',
        'Corporate Headquarters Setup', '0000000000'
    );

    INSERT INTO auth.users (
        instance_id, id, email, encrypted_password,
        email_confirmed_at, recovery_sent_at, last_sign_in_at,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token,
        email_change, email_change_token_new, recovery_token,
        aud, role
    )
    VALUES (
        real_instance_id, new_user_id, admin_email,
        extensions.crypt(admin_password, extensions.gen_salt('bf', 10)),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object(
            'full_name', admin_name, 'role', 'Admin',
            'company_name', company_name, 'company_id', generated_company_uuid
        ),
        now(), now(), '', '', '', '',
        'authenticated', 'authenticated'
    );

    INSERT INTO public.employees (
        id, company_id, employee_code, full_name, email, phone_number,
        designation, department, monthly_salary, joining_date
    )
    VALUES (
        new_user_id, generated_company_uuid, human_readable_code || '-ADMIN',
        admin_name, admin_email, '0000000000', 'Owner', 'Management',
        1.00, date_today::date
    );

    INSERT INTO public.profiles (id, full_name, role, company_id, updated_at)
    VALUES (new_user_id, admin_name, 'Admin', generated_company_uuid::text, now())
    ON CONFLICT (id) DO NOTHING;

    RETURN generated_company_uuid::text;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE public.advance_salary_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    requested_amount integer NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    employee_id uuid NOT NULL
);

CREATE TABLE public.advances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    amount_requested numeric(10,2) NOT NULL,
    reason text,
    status character varying(20) DEFAULT 'pending'::character varying,
    repayment_type character varying(20) DEFAULT 'full_next_month'::character varying,
    emi_months integer DEFAULT 1,
    balance_remaining numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT advances_repayment_type_check CHECK (((repayment_type)::text = ANY ((ARRAY['full_next_month'::character varying, 'emi'::character varying])::text[]))),
    CONSTRAINT advances_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);

CREATE TABLE public.attendance (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    employee_id uuid,
    date date DEFAULT CURRENT_DATE NOT NULL,
    check_in timestamp with time zone,
    check_out timestamp with time zone,
    latitude text,
    longitude text,
    selfie_url text,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    punch_in_latitude numeric(10,7),
    punch_in_longitude numeric(10,7),
    distance_from_office_meters numeric(10,2),
    shift_id uuid,
    is_late boolean DEFAULT false,
    minutes_late integer DEFAULT 0,
    branch_id uuid,
    employee_code character varying(255),
    employee_name character varying(255),
    location_coords character varying(255),
    punch_in_time character varying(255),
    CONSTRAINT attendance_status_check CHECK ((status = ANY (ARRAY['Present'::text, 'Absent'::text, 'Late'::text, 'Half Day'::text, 'On Leave'::text])))
);

CREATE TABLE public.attendance_regularizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    employee_code text NOT NULL,
    employee_name text NOT NULL,
    target_date date NOT NULL,
    requested_punch_in time without time zone NOT NULL,
    requested_punch_out time without time zone NOT NULL,
    justification text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    actor_id uuid,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text,
    metadata jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    branch_name text NOT NULL,
    address text,
    latitude numeric(10,7) NOT NULL,
    longitude numeric(10,7) NOT NULL,
    allowed_radius_meters integer DEFAULT 100,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.companies (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    business_type text,
    gst_number text,
    address text,
    phone text,
    logo_url text,
    working_days integer DEFAULT 26 NOT NULL,
    default_check_in time without time zone DEFAULT '09:30:00'::time without time zone NOT NULL,
    default_check_out time without time zone DEFAULT '18:30:00'::time without time zone NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    office_latitude numeric(10,7) DEFAULT 28.6139,
    office_longitude numeric(10,7) DEFAULT 77.2090,
    allowed_radius_meters integer DEFAULT 100,
    plan text,
    subscription_status text,
    trial_ends_at timestamp with time zone
);

CREATE TABLE public.company_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    latitude numeric(10,7) DEFAULT 28.6139391 NOT NULL,
    longitude numeric(10,7) DEFAULT 77.2090212 NOT NULL,
    radius_meters integer DEFAULT 100 NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    allowed_ip text
);

CREATE TABLE public.company_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    shift_name text NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    grace_period_minutes integer DEFAULT 15 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.daily_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    employee_code text NOT NULL,
    employee_name text NOT NULL,
    task_priorities text[] DEFAULT '{}'::text[] NOT NULL,
    eod_submission text,
    submitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.demo_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    company text NOT NULL,
    work_email text NOT NULL,
    phone text NOT NULL,
    company_size text NOT NULL,
    country text NOT NULL,
    message text,
    status text DEFAULT 'new'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT demo_requests_company_check CHECK ((char_length(TRIM(BOTH FROM company)) >= 2)),
    CONSTRAINT demo_requests_company_size_check CHECK ((company_size = ANY (ARRAY['1-10'::text, '11-50'::text, '51-200'::text, '200+'::text]))),
    CONSTRAINT demo_requests_country_check CHECK ((country = ANY (ARRAY['India'::text, 'UAE'::text, 'Other'::text]))),
    CONSTRAINT demo_requests_name_check CHECK ((char_length(TRIM(BOTH FROM name)) >= 2)),
    CONSTRAINT demo_requests_phone_check CHECK ((char_length(TRIM(BOTH FROM phone)) >= 6)),
    CONSTRAINT demo_requests_status_check CHECK ((status = ANY (ARRAY['new'::text, 'contacted'::text, 'scheduled'::text, 'converted'::text, 'dropped'::text]))),
    CONSTRAINT demo_requests_work_email_check CHECK ((work_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text))
);

CREATE TABLE public.employees (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    employee_code text,
    full_name text NOT NULL,
    phone_number text NOT NULL,
    email text,
    designation text NOT NULL,
    department text NOT NULL,
    monthly_salary numeric(12,2) NOT NULL,
    joining_date date NOT NULL,
    employment_type text DEFAULT 'Full-Time'::text NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    bank_name text,
    account_number text,
    ifsc_code text,
    upi_id text,
    emergency_contact text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    base_salary numeric(10,2) DEFAULT 0.00,
    phone text,
    role text DEFAULT 'Staff'::text,
    shift_id uuid,
    branch_id uuid,
    mobile_number character varying(15),
    emp_code character varying(50),
    date_of_joining date DEFAULT CURRENT_DATE,
    branch_name character varying(100),
    name character varying(255),
    auth_user_id uuid,
    bank_account_number text,
    assigned_shift_id uuid,
    sick_leave_balance integer DEFAULT 12 NOT NULL,
    casual_leave_balance integer DEFAULT 12 NOT NULL,
    paid_leave_balance integer DEFAULT 18 NOT NULL,
    manager_id uuid
);

CREATE TABLE public.expense_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    employee_code text NOT NULL,
    employee_name text NOT NULL,
    amount integer NOT NULL,
    category text NOT NULL,
    justification text,
    receipt_mock_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.leave_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid,
    company_id uuid,
    allocated_leaves numeric(4,1) DEFAULT 15.0,
    used_leaves numeric(4,1) DEFAULT 0.0,
    remaining_leaves numeric(4,1) DEFAULT 15.0,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.leave_requests (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    leave_type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'Pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT leave_requests_leave_type_check CHECK ((leave_type = ANY (ARRAY['Casual Leave'::text, 'Sick Leave'::text, 'Unpaid Leave'::text]))),
    CONSTRAINT leave_requests_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Rejected'::text])))
);

CREATE TABLE public.payroll (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    month text NOT NULL,
    present_days numeric(4,1) NOT NULL,
    per_day_salary numeric(12,2) NOT NULL,
    gross_salary numeric(12,2) NOT NULL,
    overtime numeric(12,2) DEFAULT 0.00 NOT NULL,
    bonus numeric(12,2) DEFAULT 0.00 NOT NULL,
    advance_deduction numeric(12,2) DEFAULT 0.00 NOT NULL,
    leave_deduction numeric(12,2) DEFAULT 0.00 NOT NULL,
    net_salary numeric(12,2) NOT NULL,
    payment_status text DEFAULT 'Pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT payroll_payment_status_check CHECK ((payment_status = ANY (ARRAY['Pending'::text, 'Paid'::text, 'Failed'::text])))
);

CREATE TABLE public.reimbursements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    employee_id uuid,
    title text NOT NULL,
    amount numeric(10,2) NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'Pending'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reimbursements_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Rejected'::text])))
);

CREATE TABLE public.salary_advances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid,
    company_id uuid,
    advance_amount numeric(10,2) NOT NULL,
    repayment_monthly_deduction numeric(10,2) NOT NULL,
    remaining_balance numeric(10,2) NOT NULL,
    status text DEFAULT 'Active'::text,
    issued_date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT salary_advances_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Settled'::text])))
);

CREATE VIEW public.payroll_calculations AS
 SELECT e.id AS employee_id,
    e.company_id,
    e.full_name,
    e.employee_code,
    e.department,
    e.monthly_salary,
    COALESCE(att.absent_days, (0)::bigint) AS absent_days,
    round(((COALESCE(att.absent_days, (0)::bigint))::numeric * (e.monthly_salary / 30.0)), 2) AS penalty_deductions,
    COALESCE(clm.approved_claims, (0)::numeric) AS reimbursement_additions,
    COALESCE(adv.monthly_deduction, (0)::numeric) AS advance_salary_deductions,
    round(GREATEST((0)::numeric, (((e.monthly_salary - ((COALESCE(att.absent_days, (0)::bigint))::numeric * (e.monthly_salary / 30.0))) + COALESCE(clm.approved_claims, (0)::numeric)) - COALESCE(adv.monthly_deduction, (0)::numeric))), 2) AS net_final_payout
   FROM (((public.employees e
     LEFT JOIN ( SELECT attendance.employee_id,
            count(*) AS absent_days
           FROM public.attendance
          WHERE ((attendance.status = 'Absent'::text) AND (to_char((attendance.date)::timestamp with time zone, 'YYYY-MM'::text) = to_char((CURRENT_DATE)::timestamp with time zone, 'YYYY-MM'::text)))
          GROUP BY attendance.employee_id) att ON ((e.id = att.employee_id)))
     LEFT JOIN ( SELECT reimbursements.employee_id,
            sum(reimbursements.amount) AS approved_claims
           FROM public.reimbursements
          WHERE (reimbursements.status = 'Approved'::text)
          GROUP BY reimbursements.employee_id) clm ON ((e.id = clm.employee_id)))
     LEFT JOIN ( SELECT salary_advances.employee_id,
            sum(salary_advances.repayment_monthly_deduction) AS monthly_deduction
           FROM public.salary_advances
          WHERE (salary_advances.status = 'Active'::text)
          GROUP BY salary_advances.employee_id) adv ON ((e.id = adv.employee_id)))
  WHERE (e.status = 'Active'::text);

CREATE TABLE public.payroll_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    employee_code text NOT NULL,
    employee_name text NOT NULL,
    designation text,
    department text,
    month_year text NOT NULL,
    gross_salary numeric NOT NULL,
    epf_deduction numeric NOT NULL,
    esic_deduction numeric NOT NULL,
    prof_tax_deduction numeric NOT NULL,
    net_take_home numeric NOT NULL,
    status text DEFAULT 'processed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.payroll_processed (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    employee_id uuid,
    billing_month text NOT NULL,
    base_salary numeric(10,2) NOT NULL,
    total_reimbursements numeric(10,2) DEFAULT 0.00,
    unexcused_absences integer DEFAULT 0,
    deductions numeric(10,2) DEFAULT 0.00,
    net_payout numeric(10,2) NOT NULL,
    payout_status text DEFAULT 'Unpaid'::text,
    processed_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payroll_processed_payout_status_check CHECK ((payout_status = ANY (ARRAY['Unpaid'::text, 'Processing'::text, 'Paid'::text])))
);

CREATE TABLE public.payslips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payroll_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    company_id uuid NOT NULL,
    base_salary numeric(12,2) NOT NULL,
    allowances numeric(12,2) DEFAULT 0.00,
    deductions numeric(12,2) DEFAULT 0.00,
    net_paid numeric(12,2) NOT NULL,
    pdf_url text,
    status public.payroll_status DEFAULT 'pending'::public.payroll_status NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    updated_at timestamp with time zone,
    full_name text,
    avatar_url text,
    role text DEFAULT 'Employee'::text,
    company_id text,
    email text,
    created_at timestamp with time zone DEFAULT now(),
    must_reset_password boolean DEFAULT true
);

CREATE TABLE public.shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    name text NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    grace_period_minutes integer DEFAULT 15,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    user_id uuid,
    plan_id text NOT NULL,
    amount integer,
    status text DEFAULT 'pending'::text NOT NULL,
    cashfree_order_id text,
    cashfree_mode text,
    trial_ends_at timestamp with time zone,
    current_period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    cashfree_payment_id text,
    activated_at timestamp with time zone,
    CONSTRAINT subscriptions_cashfree_mode_check CHECK ((cashfree_mode = ANY (ARRAY['sandbox'::text, 'production'::text]))),
    CONSTRAINT subscriptions_plan_id_check CHECK ((plan_id = ANY (ARRAY['starter'::text, 'growth'::text, 'business'::text]))),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'trialing'::text, 'active'::text, 'cancelled'::text, 'failed'::text])))
);

CREATE TABLE public.system_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    actor_name text NOT NULL,
    event_type text NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE ONLY public.advance_salary_requests ADD CONSTRAINT advance_salary_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.advances ADD CONSTRAINT advances_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.attendance ADD CONSTRAINT attendance_employee_id_date_key UNIQUE (employee_id, date);
ALTER TABLE ONLY public.attendance ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.attendance_regularizations ADD CONSTRAINT attendance_regularizations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.branches ADD CONSTRAINT branches_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.companies ADD CONSTRAINT companies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.company_settings ADD CONSTRAINT company_settings_company_id_key UNIQUE (company_id);
ALTER TABLE ONLY public.company_settings ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.company_shifts ADD CONSTRAINT company_shifts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.daily_tasks ADD CONSTRAINT daily_tasks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.demo_requests ADD CONSTRAINT demo_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.employees ADD CONSTRAINT employees_auth_user_id_key UNIQUE (auth_user_id);
ALTER TABLE ONLY public.employees ADD CONSTRAINT employees_company_id_employee_code_key UNIQUE (company_id, employee_code);
ALTER TABLE ONLY public.employees ADD CONSTRAINT employees_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.expense_claims ADD CONSTRAINT expense_claims_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.leave_balances ADD CONSTRAINT leave_balances_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.leave_requests ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payroll ADD CONSTRAINT payroll_employee_id_month_key UNIQUE (employee_id, month);
ALTER TABLE ONLY public.payroll_ledger ADD CONSTRAINT payroll_ledger_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payroll ADD CONSTRAINT payroll_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payroll_processed ADD CONSTRAINT payroll_processed_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payslips ADD CONSTRAINT payslips_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.reimbursements ADD CONSTRAINT reimbursements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.salary_advances ADD CONSTRAINT salary_advances_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.shifts ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.subscriptions ADD CONSTRAINT subscriptions_cashfree_order_id_unique UNIQUE (cashfree_order_id);
ALTER TABLE ONLY public.subscriptions ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.system_audit_logs ADD CONSTRAINT system_audit_logs_pkey PRIMARY KEY (id);

CREATE INDEX demo_requests_created_at_idx ON public.demo_requests USING btree (created_at DESC);
CREATE INDEX demo_requests_status_idx ON public.demo_requests USING btree (status);
CREATE INDEX idx_attendance_date ON public.attendance USING btree (company_id, date);
CREATE INDEX idx_attendance_employee ON public.attendance USING btree (employee_id);
CREATE INDEX idx_companies_owner ON public.companies USING btree (owner_id);
CREATE INDEX idx_employees_company ON public.employees USING btree (company_id);
CREATE INDEX idx_leave_company ON public.leave_requests USING btree (company_id);
CREATE INDEX idx_payroll_month ON public.payroll USING btree (company_id, month);
CREATE INDEX idx_subscriptions_company_id ON public.subscriptions USING btree (company_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);

ALTER TABLE ONLY public.advance_salary_requests ADD CONSTRAINT advance_salary_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.advance_salary_requests ADD CONSTRAINT advance_salary_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.advances ADD CONSTRAINT advances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.attendance ADD CONSTRAINT attendance_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.attendance ADD CONSTRAINT attendance_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.attendance ADD CONSTRAINT attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.attendance_regularizations ADD CONSTRAINT attendance_regularizations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.attendance ADD CONSTRAINT attendance_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.audit_logs ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.audit_logs ADD CONSTRAINT audit_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.branches ADD CONSTRAINT branches_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.company_settings ADD CONSTRAINT company_settings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.company_shifts ADD CONSTRAINT company_shifts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.daily_tasks ADD CONSTRAINT daily_tasks_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.employees ADD CONSTRAINT employees_assigned_shift_id_fkey FOREIGN KEY (assigned_shift_id) REFERENCES public.company_shifts(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.employees ADD CONSTRAINT employees_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.employees ADD CONSTRAINT employees_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.employees ADD CONSTRAINT employees_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.profiles(id);
ALTER TABLE ONLY public.employees ADD CONSTRAINT employees_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.expense_claims ADD CONSTRAINT expense_claims_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.employees ADD CONSTRAINT fk_employees_auth FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.leave_balances ADD CONSTRAINT leave_balances_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.leave_balances ADD CONSTRAINT leave_balances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.leave_requests ADD CONSTRAINT leave_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.leave_requests ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payroll ADD CONSTRAINT payroll_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payroll ADD CONSTRAINT payroll_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payroll_ledger ADD CONSTRAINT payroll_ledger_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payroll_processed ADD CONSTRAINT payroll_processed_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payroll_processed ADD CONSTRAINT payroll_processed_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payslips ADD CONSTRAINT payslips_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payslips ADD CONSTRAINT payslips_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payslips ADD CONSTRAINT payslips_payroll_id_fkey FOREIGN KEY (payroll_id) REFERENCES public.payroll(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reimbursements ADD CONSTRAINT reimbursements_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.salary_advances ADD CONSTRAINT salary_advances_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.salary_advances ADD CONSTRAINT salary_advances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.shifts ADD CONSTRAINT shifts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.subscriptions ADD CONSTRAINT subscriptions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.subscriptions ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.system_audit_logs ADD CONSTRAINT system_audit_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE POLICY "Admins can read company advance requests" ON public.advance_salary_requests FOR SELECT USING ((company_id = (( SELECT profiles.company_id FROM public.profiles WHERE (profiles.id = auth.uid())))::uuid));
CREATE POLICY "Admins can update advance requests" ON public.advance_salary_requests FOR UPDATE USING ((company_id = (( SELECT profiles.company_id FROM public.profiles WHERE (profiles.id = auth.uid())))::uuid));
CREATE POLICY "Allow all access to authenticated users" ON public.attendance_regularizations TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to authenticated users" ON public.company_settings TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to authenticated users" ON public.company_shifts TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to authenticated users" ON public.daily_tasks TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to authenticated users" ON public.expense_claims TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to authenticated users" ON public.payroll_ledger TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to authenticated users" ON public.system_audit_logs TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users access" ON public.advances TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public to register a company" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Employees can insert claims" ON public.reimbursements FOR INSERT WITH CHECK ((auth.uid() = employee_id));
CREATE POLICY "Employees can insert own advance requests" ON public.advance_salary_requests FOR INSERT WITH CHECK ((employee_id = ( SELECT employees.id FROM public.employees WHERE (employees.email = auth.email()))));
CREATE POLICY "Employees can read own advance requests" ON public.advance_salary_requests FOR SELECT USING ((employee_id = ( SELECT employees.id FROM public.employees WHERE (employees.email = auth.email()))));
CREATE POLICY "Employees can read their own profile" ON public.employees FOR SELECT USING ((auth.uid() = id));
CREATE POLICY "Employees can see their own base contract profile" ON public.employees FOR SELECT USING ((auth.uid() = auth_user_id));
CREATE POLICY "Employees can view their own profile row" ON public.employees FOR SELECT USING ((auth.uid() = id));
CREATE POLICY "Owners can fully manage their own companies" ON public.companies USING ((auth.uid() = owner_id));
CREATE POLICY "Owners can manage attendance data for their company" ON public.attendance USING ((company_id IN ( SELECT companies.id FROM public.companies WHERE (companies.owner_id = auth.uid()))));
CREATE POLICY "Owners can manage employees belonging to their active company" ON public.employees USING ((company_id IN ( SELECT companies.id FROM public.companies WHERE (companies.owner_id = auth.uid()))));
CREATE POLICY "Owners can manage leave requests data for their company" ON public.leave_requests USING ((company_id IN ( SELECT companies.id FROM public.companies WHERE (companies.owner_id = auth.uid()))));
CREATE POLICY "Owners can manage payroll engine operations for their company" ON public.payroll USING ((company_id IN ( SELECT companies.id FROM public.companies WHERE (companies.owner_id = auth.uid()))));
CREATE POLICY "Public profiles are viewable by authenticated users" ON public.profiles FOR SELECT USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Users can manage their own profile metadata" ON public.profiles USING ((auth.uid() = id));

ALTER TABLE public.advance_salary_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_regularizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_processed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;