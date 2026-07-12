

-- Update room numbers to reflect the actual physical unit numbers from their names
UPDATE rooms SET room_number = '001', name = 'Sylvester (2 Bedrooms)' WHERE name = '001 - Sylvester (2 Bedrooms)';
UPDATE rooms SET room_number = '002', name = 'Agnes (3 Bedrooms)' WHERE name = '002 - Agnes (3 Bedrooms)';
UPDATE rooms SET room_number = '003', name = 'Peter (3 Bedrooms)' WHERE name = '003 - Peter (3 Bedrooms)';
UPDATE rooms SET room_number = '004', name = 'Florence (3 Bedrooms)' WHERE name = '004 - Florence (3 Bedrooms)';
UPDATE rooms SET room_number = '005', name = 'Patrick (3 Bedrooms)' WHERE name = '005 - Patrick  (3 Bedrooms)';
UPDATE rooms SET room_number = '006', name = 'Josephine (3 Bedrooms)' WHERE name = '006 - Josephine (3 Bedrooms)';

-- Handle special or duplicate number rooms safely
UPDATE rooms SET room_number = 'GR-001', name = 'Guest Room (Ground Floor)' WHERE name = '001 - Guest Room (Ground Floor)';
UPDATE rooms SET room_number = 'ENTIRE' WHERE name = 'Entire Apartment';
UPDATE rooms SET room_number = 'GUEST' WHERE name = 'Guest Rooms';
UPDATE rooms SET room_number = 'EVENT' WHERE name = 'Events Area';

-- Handle the generic Patrick room
UPDATE rooms SET room_number = 'PATRICK-GEN' WHERE name = 'Patrick (3 Bedrooms)';


