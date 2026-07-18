-- Function to decrement portfolio_order for all photos after a deleted photo
-- This ensures there are no gaps in the portfolio order sequence

CREATE OR REPLACE FUNCTION decrement_portfolio_order_after(deleted_order INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE photos
  SET portfolio_order = portfolio_order - 1
  WHERE portfolio_order > deleted_order;
END;
$$ LANGUAGE plpgsql;
