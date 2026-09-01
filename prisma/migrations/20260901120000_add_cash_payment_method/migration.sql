-- In-person cash deposit at SiamEZ Bangkok office
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'cash';
ALTER TYPE "InvoicePaymentMethod" ADD VALUE IF NOT EXISTS 'cash';
