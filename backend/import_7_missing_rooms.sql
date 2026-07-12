-- Migration Script: Insert Missing Physical Rooms
BEGIN;

INSERT INTO rooms (
        id, room_number, name, type, capacity, base_price_ngn, status, 
        bed_type, max_occupancy, min_stay_days, max_stay_days,
        allowed_check_in_days, allowed_check_out_days, pricing_model, base_guests
    ) VALUES (
        'f6944664-40bb-49d4-b3bb-9ed2fa94ed70', 'RM-012', '003 – Guest Room (First Floor)', 'Apartment', 2, 25000, 'available',
        'King', 2, 1, 30,
        '{0,1,2,3,4,5,6}', '{0,1,2,3,4,5,6}', 'per_night', 2
    );
INSERT INTO rooms (
        id, room_number, name, type, capacity, base_price_ngn, status, 
        bed_type, max_occupancy, min_stay_days, max_stay_days,
        allowed_check_in_days, allowed_check_out_days, pricing_model, base_guests
    ) VALUES (
        'b9545683-db26-48db-b141-9e5672032084', 'RM-013', '004 – Guest Room (First Floor)', 'Apartment', 2, 25000, 'available',
        'King', 2, 1, 30,
        '{0,1,2,3,4,5,6}', '{0,1,2,3,4,5,6}', 'per_night', 2
    );
INSERT INTO rooms (
        id, room_number, name, type, capacity, base_price_ngn, status, 
        bed_type, max_occupancy, min_stay_days, max_stay_days,
        allowed_check_in_days, allowed_check_out_days, pricing_model, base_guests
    ) VALUES (
        'e5390eb2-d3bf-4a88-a68c-2b2e44d6cc50', 'RM-014', '005 – Guest Room (Second Floor)', 'Apartment', 2, 25000, 'available',
        'King', 2, 1, 30,
        '{0,1,2,3,4,5,6}', '{0,1,2,3,4,5,6}', 'per_night', 2
    );
INSERT INTO rooms (
        id, room_number, name, type, capacity, base_price_ngn, status, 
        bed_type, max_occupancy, min_stay_days, max_stay_days,
        allowed_check_in_days, allowed_check_out_days, pricing_model, base_guests
    ) VALUES (
        '2f345428-7f87-4732-9b9e-83d40aa2b8d1', 'RM-015', '006 – Guest Room (Second Floor)', 'Apartment', 2, 25000, 'available',
        'King', 2, 1, 30,
        '{0,1,2,3,4,5,6}', '{0,1,2,3,4,5,6}', 'per_night', 2
    );
INSERT INTO rooms (
        id, room_number, name, type, capacity, base_price_ngn, status, 
        bed_type, max_occupancy, min_stay_days, max_stay_days,
        allowed_check_in_days, allowed_check_out_days, pricing_model, base_guests
    ) VALUES (
        'ef2aa1ea-9b62-44a6-a304-d199fa75c984', 'RM-016', 'Sample Apartment 1', 'Apartment', 2, 0, 'available',
        'King', 2, 1, 30,
        '{0,1,2,3,4,5,6}', '{0,1,2,3,4,5,6}', 'per_night', 2
    );
INSERT INTO rooms (
        id, room_number, name, type, capacity, base_price_ngn, status, 
        bed_type, max_occupancy, min_stay_days, max_stay_days,
        allowed_check_in_days, allowed_check_out_days, pricing_model, base_guests
    ) VALUES (
        'addce125-dcb6-4dad-9d55-1ca523cca040', 'RM-017', 'Lounge 1', 'Apartment', 2, 50000, 'available',
        'King', 2, 1, 30,
        '{0,1,2,3,4,5,6}', '{0,1,2,3,4,5,6}', 'per_night', 2
    );

COMMIT;
