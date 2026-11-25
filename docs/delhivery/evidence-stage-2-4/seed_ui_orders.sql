-- LOCAL scratch database only (fulfil_ui). Fake data for clicking through the admin fulfilment page.
INSERT INTO "Products" ("Id","Name","Slug","Price","TaxPercentage","StockQuantity","LowStockThreshold","PrescriptionRequired","IsFeatured","IsNewArrival","IsBestSeller","IsSpecialOffer","ViewCount","SoldCount","AverageRating","ReviewCount","CreatedAt","IsActive")
VALUES ('11111111-1111-1111-1111-111111111111','UI Test Tonic','ui-test-tonic',250,0,50,5,false,false,false,false,false,0,0,0,0,now(),true);

-- status ints: Pending=1; PaymentStatus Pending=?, Paid=?; method Razorpay=1, COD=2 (paid value looked up below)
INSERT INTO "Orders" ("Id","OrderNumber","Status","PaymentStatus","PaymentMethod","SubTotal","DiscountAmount","ShippingCharge","TaxAmount","TotalAmount","RefundStatus",
 "ShippingFullName","ShippingPhone","ShippingLine1","ShippingCity","ShippingState","ShippingPostalCode","ShippingCountry",
 "BillingFullName","BillingPhone","BillingLine1","BillingCity","BillingState","BillingPostalCode","BillingCountry","GuestName","GuestEmail","CreatedAt","IsActive")
SELECT o.id, o.num, 1, o.pay, o.method, 500,0,0,0,500, 0,
 'UI Buyer','9876543210','12 Test Lane','Delhi','Delhi', o.pin,'India',
 'UI Buyer','9876543210','12 Test Lane','Delhi','Delhi', o.pin,'India','UI Buyer','buyer@example.test', now(), true
FROM (VALUES
 ('aaaaaaaa-0000-0000-0000-000000000001'::uuid,'UI-COD-0001', 1, 2, '110001'),
 ('aaaaaaaa-0000-0000-0000-000000000002'::uuid,'UI-PAID-0002', 2, 1, '110001'),
 ('aaaaaaaa-0000-0000-0000-000000000003'::uuid,'UI-BADPIN-0003', 1, 2, '12'),
 ('aaaaaaaa-0000-0000-0000-000000000004'::uuid,'UI-COD-0004', 1, 2, '110001')
) AS o(id,num,pay,method,pin);

INSERT INTO "OrderItems" ("Id","OrderId","CouponDiscount","ProductId","ProductName","Quantity","UnitPrice","DiscountAmount","TaxPercentage","TaxAmount","TotalPrice","CreatedAt","IsActive")
SELECT gen_random_uuid(), "Id", 0,'11111111-1111-1111-1111-111111111111','UI Test Tonic',2,250,0,0,0,500,now(),true FROM "Orders";

-- the admin order page reads payments[0], so every order has one
INSERT INTO "Payments" ("Id","OrderId","Method","Status","Amount","Currency","RefundStatus","CreatedAt","IsActive")
SELECT gen_random_uuid(), "Id", "PaymentMethod", "PaymentStatus", "TotalAmount", 'INR', 0, now(), true FROM "Orders";
