-- RestroPOS Seed Data
-- Enriched with 5 RBAC roles and new Class Diagram attributes

USE restropos;

-- Users (passwords are bcrypt hashes of 'password123' / 'admin123')
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@restropos.com', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkVZ0XGPf5GhVdKw5VHNGdX.r3ki6', 'ADMIN'),
('Restaurant Manager', 'manager@restropos.com', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkVZ0XGPf5GhVdKw5VHNGdX.r3ki6', 'MANAGER'),
('Waiter Staff', 'waiter@restropos.com', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkVZ0XGPf5GhVdKw5VHNGdX.r3ki6', 'WAITER'),
('Head Chef', 'chef@restropos.com', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkVZ0XGPf5GhVdKw5VHNGdX.r3ki6', 'CHEF'),
('Front Cashier', 'cashier@restropos.com', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkVZ0XGPf5GhVdKw5VHNGdX.r3ki6', 'CASHIER'),
-- Also keep legacy email aliases for seamless login compatibility:
('Legacy Staff', 'staff@restropos.com', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkVZ0XGPf5GhVdKw5VHNGdX.r3ki6', 'WAITER'),
('Legacy Kitchen', 'kitchen@restropos.com', '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkVZ0XGPf5GhVdKw5VHNGdX.r3ki6', 'CHEF');

-- Categories
INSERT INTO categories (name) VALUES
('Starters'),
('Main Course'),
('Breads'),
('Rice & Biryani'),
('Beverages'),
('Desserts');

-- Menu Items with description & prep_time_minutes
INSERT INTO menu_items (category_id, name, description, price, available, prep_time_minutes) VALUES
-- Starters (category_id = 1)
(1, 'Paneer Tikka', 'Marinated cottage cheese grilled to perfection in tandoor', 249.00, TRUE, 15),
(1, 'Chicken Tikka', 'Succulent boneless chicken marinated in tandoori spices', 299.00, TRUE, 20),
(1, 'Veg Spring Rolls', 'Crispy vegetable spring rolls served with sweet chili sauce', 179.00, TRUE, 12),
(1, 'Fish Amritsari', 'Crispy carom-scented batter fried fish with mint chutney', 349.00, TRUE, 18),
-- Main Course (category_id = 2)
(2, 'Butter Chicken', 'Tender chicken simmered in rich buttery tomato gravy', 349.00, TRUE, 25),
(2, 'Paneer Butter Masala', 'Fresh cottage cheese cubes in aromatic cream and cashew gravy', 279.00, TRUE, 20),
(2, 'Dal Makhani', 'Slow-cooked black lentils overnight with butter and cream', 229.00, TRUE, 15),
(2, 'Chicken Biryani Boneless', 'Aromatic basmati rice layered with spiced boneless chicken', 329.00, TRUE, 25),
(2, 'Mutton Rogan Josh', 'Traditional Kashmiri style slow cooked lamb curry', 449.00, TRUE, 30),
(2, 'Palak Paneer', 'Fresh cottage cheese simmered in seasoned spinach gravy', 249.00, TRUE, 18),
-- Breads (category_id = 3)
(3, 'Butter Naan', 'Tandoor baked soft leavened bread brushed with butter', 49.00, TRUE, 8),
(3, 'Garlic Naan', 'Clay oven baked bread topped with minced roasted garlic', 69.00, TRUE, 8),
(3, 'Tandoori Roti', 'Whole wheat tandoori flatbread', 35.00, TRUE, 6),
(3, 'Lachha Paratha', 'Multi-layered crispy flaky whole wheat bread', 59.00, TRUE, 10),
-- Rice & Biryani (category_id = 4)
(4, 'Steamed Rice', 'Fluffy fragrant steamed basmati rice', 129.00, TRUE, 10),
(4, 'Jeera Rice', 'Fragrant basmati tempered with toasted cumin and ghee', 149.00, TRUE, 12),
(4, 'Hyderabadi Veg Biryani', 'Layered fragrant rice with fresh vegetables and saffron', 249.00, TRUE, 22),
(4, 'Hyderabadi Chicken Biryani', 'Authentic dum cooked chicken biryani with raita', 299.00, TRUE, 25),
-- Beverages (category_id = 5)
(5, 'Masala Chai', 'Traditional Indian spiced tea brewed with ginger and cardamom', 49.00, TRUE, 5),
(5, 'Fresh Lime Soda', 'Refreshing club soda with freshly squeezed lime', 79.00, TRUE, 5),
(5, 'Mango Lassi', 'Chilled sweet yogurt blended with alphonso mango pulp', 99.00, TRUE, 5),
(5, 'Cold Coffee', 'Creamy iced espresso with milk and vanilla', 129.00, TRUE, 5),
-- Desserts (category_id = 6)
(6, 'Gulab Jamun', 'Warm milk-solid dumplings soaked in rose saffron syrup', 99.00, TRUE, 5),
(6, 'Rasmalai', 'Soft paneer patties steeped in saffron pistachios milk', 129.00, TRUE, 5),
(6, 'Kulfi', 'Traditional slow-cooked Indian condensed milk ice cream', 89.00, TRUE, 5);

-- Restaurant Tables with capacity & location_zone
INSERT INTO restaurant_tables (table_number, capacity, location_zone, status) VALUES
(1, 4, 'Main Dining', 'AVAILABLE'),
(2, 2, 'Main Dining', 'AVAILABLE'),
(3, 6, 'Family Section', 'OCCUPIED'),
(4, 4, 'Family Section', 'AVAILABLE'),
(5, 2, 'Window View', 'AVAILABLE'),
(6, 8, 'VIP Lounge', 'RESERVED'),
(7, 4, 'Garden Patio', 'AVAILABLE'),
(8, 4, 'Garden Patio', 'AVAILABLE'),
(9, 6, 'Main Dining', 'CLEANING'),
(10, 4, 'Window View', 'AVAILABLE');

-- Sample Orders with subtotal, tax_amount, special_instructions
INSERT INTO orders (order_type, status, subtotal, tax_amount, discount_amount, total_amount, special_instructions, user_id, table_id) VALUES
('DINE_IN', 'COMPLETED', 747.00, 37.35, 0.00, 784.35, 'Serve with extra green chutney', 3, 1),
('DINE_IN', 'PREPARING', 626.00, 31.30, 0.00, 657.30, 'Make starters less spicy for kids', 3, 3),
('TAKEAWAY', 'PENDING', 477.00, 23.85, 0.00, 500.85, 'Pack cutlery and extra napkins', 3, NULL);

-- Order Items with special_notes
INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal, special_notes) VALUES
(1, 5, 2, 349.00, 698.00, 'Boneless gravy'),
(1, 11, 1, 49.00, 49.00, 'Crispy butter'),
(2, 1, 1, 249.00, 249.00, 'Extra mint chutney'),
(2, 7, 1, 229.00, 229.00, 'Low spice'),
(2, 12, 1, 69.00, 69.00, 'Cut into quarters'),
(2, 20, 1, 79.00, 79.00, 'Sweet and salt mix'),
(3, 18, 1, 299.00, 299.00, 'Extra salan & raita'),
(3, 21, 1, 99.00, 99.00, 'Chilled'),
(3, 20, 1, 79.00, 79.00, 'Less ice');

-- Payment with transaction_reference and method
INSERT INTO payments (order_id, amount, method, status, transaction_reference) VALUES
(1, 784.35, 'UPI', 'COMPLETED', 'UPI-9842109841');
