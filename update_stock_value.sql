-- Run this SQL in your Supabase SQL Editor to update the stock value calculation

DROP VIEW IF EXISTS inventory CASCADE;

CREATE OR REPLACE VIEW inventory AS
SELECT
  p.id,
  p.name,
  p.category,
  p.unit,
  p.cost_price,
  p.selling_price,
  p.min_stock,
  p.track_expiry,
  COALESCE(sales_tot.total_sold, 0) AS total_sold,
  COALESCE(purch_tot.total_purchased, 0) AS total_purchased,
  COALESCE(waste_tot.total_wasted, 0) AS total_wasted,
  (COALESCE(purch_tot.total_purchased, 0) - COALESCE(sales_tot.total_sold, 0) - COALESCE(waste_tot.total_wasted, 0)) AS current_stock,
  -- Updated to use cost_price for correct inventory valuation
  (COALESCE(purch_tot.total_purchased, 0) - COALESCE(sales_tot.total_sold, 0) - COALESCE(waste_tot.total_wasted, 0)) * p.cost_price AS stock_value,
  CASE WHEN (COALESCE(purch_tot.total_purchased, 0) - COALESCE(sales_tot.total_sold, 0) - COALESCE(waste_tot.total_wasted, 0)) < p.min_stock THEN true ELSE false END AS is_low_stock
FROM products p
LEFT JOIN (
  SELECT product_id, SUM(quantity) AS total_purchased FROM purchases GROUP BY product_id
) purch_tot ON purch_tot.product_id = p.id
LEFT JOIN (
  SELECT product_id, SUM(quantity) AS total_sold FROM sales GROUP BY product_id
) sales_tot ON sales_tot.product_id = p.id
LEFT JOIN (
  SELECT product_id, SUM(quantity) AS total_wasted FROM waste GROUP BY product_id
) waste_tot ON waste_tot.product_id = p.id;

-- Re-create dependent views if they were dropped by CASCADE (low_stock_items depends on inventory)
CREATE OR REPLACE VIEW low_stock_items AS
SELECT
  i.id,
  i.name,
  i.category,
  i.current_stock,
  i.min_stock,
  i.unit
FROM inventory i
WHERE i.is_low_stock = true
ORDER BY i.current_stock;
