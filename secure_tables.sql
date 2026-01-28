-- 1. Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;

-- 2. Create "Allow All" policies for authenticated users
-- (This allows any logged-in user to do everything. In production, refine this.)

-- Helper macro-like approach not supported in generic SQL, so repeating policies

-- Products
CREATE POLICY "Enable access for authenticated users" ON products
FOR ALL USING (auth.role() = 'authenticated');

-- Purchases
CREATE POLICY "Enable access for authenticated users" ON purchases
FOR ALL USING (auth.role() = 'authenticated');

-- Customers
CREATE POLICY "Enable access for authenticated users" ON customers
FOR ALL USING (auth.role() = 'authenticated');

-- Sales
CREATE POLICY "Enable access for authenticated users" ON sales
FOR ALL USING (auth.role() = 'authenticated');

-- Payments
CREATE POLICY "Enable access for authenticated users" ON payments
FOR ALL USING (auth.role() = 'authenticated');

-- Expenses
CREATE POLICY "Enable access for authenticated users" ON expenses
FOR ALL USING (auth.role() = 'authenticated');

-- Waste
CREATE POLICY "Enable access for authenticated users" ON waste
FOR ALL USING (auth.role() = 'authenticated');

-- Stock Logs
CREATE POLICY "Enable access for authenticated users" ON stock_logs
FOR ALL USING (auth.role() = 'authenticated');
