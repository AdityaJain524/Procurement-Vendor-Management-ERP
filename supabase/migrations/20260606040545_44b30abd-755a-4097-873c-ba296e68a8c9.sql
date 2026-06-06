
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','procurement_officer','manager','vendor');
CREATE TYPE public.vendor_status AS ENUM ('active','inactive','blacklisted');
CREATE TYPE public.rfq_status AS ENUM ('draft','open','submitted','under_review','approved','rejected','completed');
CREATE TYPE public.quotation_status AS ENUM ('submitted','shortlisted','awarded','rejected');
CREATE TYPE public.approval_decision AS ENUM ('pending','approved','rejected','sent_back');
CREATE TYPE public.po_status AS ENUM ('draft','issued','accepted','in_progress','delivered','closed','cancelled');
CREATE TYPE public.invoice_status AS ENUM ('draft','sent','paid','overdue','cancelled');

-- ============ UPDATED_AT FN ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Role checker (SECURITY DEFINER, avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_role(_role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','procurement_officer','manager'));
$$;

-- Profile policies
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_staff(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins manage profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- user_roles policies
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- New user trigger -> profile + default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'procurement_officer');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ VENDORS ============
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  gst_number TEXT UNIQUE,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  status public.vendor_status NOT NULL DEFAULT 'active',
  risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Staff read vendors" ON public.vendors
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Staff write vendors" ON public.vendors
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update vendors" ON public.vendors
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins delete vendors" ON public.vendors
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Vendor updates own record" ON public.vendors
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ RFQs ============
CREATE TABLE public.rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number TEXT UNIQUE NOT NULL DEFAULT ('RFQ-'||to_char(now(),'YYYY')||'-'||lpad((floor(random()*99999))::text,5,'0')),
  title TEXT NOT NULL,
  description TEXT,
  product_details TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  budget NUMERIC(14,2),
  deadline TIMESTAMPTZ NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.rfq_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  awarded_quotation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfqs TO authenticated;
GRANT ALL ON public.rfqs TO service_role;
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_rfqs_updated BEFORE UPDATE ON public.rfqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ RFQ-Vendor invitations ============
CREATE TABLE public.rfq_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rfq_id, vendor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfq_vendors TO authenticated;
GRANT ALL ON public.rfq_vendors TO service_role;
ALTER TABLE public.rfq_vendors ENABLE ROW LEVEL SECURITY;

-- Helper: is vendor user invited to RFQ?
CREATE OR REPLACE FUNCTION public.is_invited_vendor(_rfq UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rfq_vendors rv
    JOIN public.vendors v ON v.id = rv.vendor_id
    WHERE rv.rfq_id = _rfq AND v.user_id = _user
  );
$$;

CREATE POLICY "Staff read all rfqs" ON public.rfqs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR public.is_invited_vendor(id, auth.uid()));
CREATE POLICY "Procurement creates rfqs" ON public.rfqs
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(),'procurement_officer') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Procurement updates rfqs" ON public.rfqs
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'procurement_officer') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "Admin deletes rfqs" ON public.rfqs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Staff and invited vendors read invites" ON public.rfq_vendors
  FOR SELECT TO authenticated USING (
    public.is_staff(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.vendors v WHERE v.id = rfq_vendors.vendor_id AND v.user_id = auth.uid()
    ));
CREATE POLICY "Procurement manage invites" ON public.rfq_vendors
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ QUOTATIONS ============
CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  price NUMERIC(14,2) NOT NULL,
  delivery_days INTEGER NOT NULL,
  warranty_months INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.quotation_status NOT NULL DEFAULT 'submitted',
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rfq_id, vendor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_quotations_updated BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Read quotations" ON public.quotations
  FOR SELECT TO authenticated USING (
    public.is_staff(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.vendors v WHERE v.id = quotations.vendor_id AND v.user_id = auth.uid()
    ));
CREATE POLICY "Vendor submit quotation" ON public.quotations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
    AND public.is_invited_vendor(rfq_id, auth.uid())
  );
CREATE POLICY "Vendor update own quotation" ON public.quotations
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = quotations.vendor_id AND v.user_id = auth.uid())
  );
CREATE POLICY "Staff update quotation status" ON public.quotations
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));

-- ============ APPROVALS ============
CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision public.approval_decision NOT NULL DEFAULT 'pending',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read approvals" ON public.approvals
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Procurement create approval" ON public.approvals
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Managers update approvals" ON public.approvals
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

-- ============ PURCHASE ORDERS ============
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL DEFAULT ('PO-'||to_char(now(),'YYYY')||'-'||lpad((floor(random()*99999))::text,5,'0')),
  rfq_id UUID REFERENCES public.rfqs(id) ON DELETE SET NULL,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  total_amount NUMERIC(14,2) NOT NULL,
  status public.po_status NOT NULL DEFAULT 'issued',
  expected_delivery DATE,
  terms TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Read POs" ON public.purchase_orders
  FOR SELECT TO authenticated USING (
    public.is_staff(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.vendors v WHERE v.id = purchase_orders.vendor_id AND v.user_id = auth.uid()
    ));
CREATE POLICY "Procurement manage POs" ON public.purchase_orders
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ INVOICES ============
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL DEFAULT ('INV-'||to_char(now(),'YYYY')||'-'||lpad((floor(random()*99999))::text,5,'0')),
  po_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  subtotal NUMERIC(14,2) NOT NULL,
  cgst NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  due_date DATE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Read invoices" ON public.invoices
  FOR SELECT TO authenticated USING (
    public.is_staff(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.vendors v WHERE v.id = invoices.vendor_id AND v.user_id = auth.uid()
    ));
CREATE POLICY "Procurement manage invoices" ON public.invoices
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff create notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) OR user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============ VENDOR RATINGS ============
CREATE TABLE public.vendor_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_ratings TO authenticated;
GRANT ALL ON public.vendor_ratings TO service_role;
ALTER TABLE public.vendor_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read ratings" ON public.vendor_ratings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff write ratings" ON public.vendor_ratings FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND rater_id = auth.uid());

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Auth write audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ============ ACTIVITY LOG ============
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read activity" ON public.activity_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Auth write activity" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE INDEX idx_quotations_rfq ON public.quotations(rfq_id);
CREATE INDEX idx_rfq_vendors_rfq ON public.rfq_vendors(rfq_id);
CREATE INDEX idx_rfq_vendors_vendor ON public.rfq_vendors(vendor_id);
CREATE INDEX idx_po_vendor ON public.purchase_orders(vendor_id);
CREATE INDEX idx_invoices_vendor ON public.invoices(vendor_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);
