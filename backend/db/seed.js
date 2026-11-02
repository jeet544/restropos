/**
 * RestroPOS Database Seed Script
 *
 * Usage: npm run seed
 *
 * Inserts all 5 RBAC roles (ADMIN, MANAGER, WAITER, CHEF, CASHIER)
 * and all Class Diagram attributes.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const SALT_ROUNDS = 10;

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    console.log('🔄 Creating database and tables...');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await connection.query(schemaSql);

    console.log('✅ Schema created successfully.');

    await connection.query('USE restropos');

    console.log('🔄 Clearing existing data...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE payments');
    await connection.query('TRUNCATE TABLE order_items');
    await connection.query('TRUNCATE TABLE orders');
    await connection.query('TRUNCATE TABLE restaurant_tables');
    await connection.query('TRUNCATE TABLE menu_items');
    await connection.query('TRUNCATE TABLE categories');
    await connection.query('TRUNCATE TABLE users');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('🔄 Hashing passwords...');
    const defaultHash = await bcrypt.hash('password123', SALT_ROUNDS);
    const adminHash = await bcrypt.hash('admin123', SALT_ROUNDS);

    console.log('🔄 Inserting users with strict RBAC roles...');
    await connection.query(
      `INSERT INTO users (name, email, password, role) VALUES
        ('Admin User', 'admin@restropos.com', ?, 'ADMIN'),
        ('General Manager', 'manager@restropos.com', ?, 'MANAGER'),
        ('Waiter Staff', 'waiter@restropos.com', ?, 'WAITER'),
        ('Head Chef', 'chef@restropos.com', ?, 'CHEF'),
        ('Cashier Desk', 'cashier@restropos.com', ?, 'CASHIER'),
        ('Staff User', 'staff@restropos.com', ?, 'WAITER'),
        ('Kitchen User', 'kitchen@restropos.com', ?, 'CHEF')`,
      [adminHash, defaultHash, defaultHash, defaultHash, defaultHash, defaultHash, defaultHash]
    );

    console.log('🔄 Inserting categories...');
    await connection.query(
      `INSERT INTO categories (name) VALUES
        ('Starters'),
        ('Main Course'),
        ('Breads'),
        ('Rice & Biryani'),
        ('Beverages'),
        ('Desserts')`
    );

    console.log('🔄 Inserting menu items with prep times and descriptions...');
    await connection.query(
      `INSERT INTO menu_items (category_id, name, description, price, available, prep_time_minutes) VALUES
        (1, 'Paneer Tikka', 'Marinated cottage cheese grilled in tandoor', 249.00, TRUE, 15),
        (1, 'Chicken Tikka', 'Succulent boneless chicken marinated in tandoori spices', 299.00, TRUE, 20),
        (1, 'Veg Spring Rolls', 'Crispy vegetable spring rolls with chili sauce', 179.00, TRUE, 12),
        (1, 'Fish Amritsari', 'Crispy carom-scented batter fried fish', 349.00, TRUE, 18),
        (2, 'Butter Chicken', 'Tender chicken in rich buttery tomato gravy', 349.00, TRUE, 25),
        (2, 'Paneer Butter Masala', 'Fresh cottage cheese cubes in aromatic cashew gravy', 279.00, TRUE, 20),
        (2, 'Dal Makhani', 'Slow-cooked black lentils with butter and cream', 229.00, TRUE, 15),
        (2, 'Chicken Biryani Boneless', 'Aromatic basmati rice layered with spiced chicken', 329.00, TRUE, 25),
        (2, 'Mutton Rogan Josh', 'Traditional Kashmiri slow-cooked lamb curry', 449.00, TRUE, 30),
        (2, 'Palak Paneer', 'Fresh cottage cheese in seasoned spinach gravy', 249.00, TRUE, 18),
        (3, 'Butter Naan', 'Tandoor baked soft leavened bread brushed with butter', 49.00, TRUE, 8),
        (3, 'Garlic Naan', 'Clay oven baked bread topped with minced roasted garlic', 69.00, TRUE, 8),
        (3, 'Tandoori Roti', 'Whole wheat tandoori flatbread', 35.00, TRUE, 6),
        (3, 'Lachha Paratha', 'Multi-layered crispy flaky whole wheat bread', 59.00, TRUE, 10),
        (4, 'Steamed Rice', 'Fluffy fragrant steamed basmati rice', 129.00, TRUE, 10),
        (4, 'Jeera Rice', 'Fragrant basmati tempered with cumin and ghee', 149.00, TRUE, 12),
        (4, 'Hyderabadi Veg Biryani', 'Layered fragrant rice with vegetables and saffron', 249.00, TRUE, 22),
        (4, 'Hyderabadi Chicken Biryani', 'Authentic dum cooked chicken biryani with raita', 299.00, TRUE, 25),
        (5, 'Masala Chai', 'Traditional Indian spiced tea', 49.00, TRUE, 5),
        (5, 'Fresh Lime Soda', 'Refreshing soda with freshly squeezed lime', 79.00, TRUE, 5),
        (5, 'Mango Lassi', 'Chilled sweet yogurt blended with mango pulp', 99.00, TRUE, 5),
        (5, 'Cold Coffee', 'Creamy iced espresso with milk and vanilla', 129.00, TRUE, 5),
        (6, 'Gulab Jamun', 'Warm milk dumplings soaked in rose saffron syrup', 99.00, TRUE, 5),
        (6, 'Rasmalai', 'Soft paneer patties in saffron pistachio milk', 129.00, TRUE, 5),
        (6, 'Kulfi', 'Traditional Indian condensed milk ice cream', 89.00, TRUE, 5)`
    );

    console.log('🔄 Inserting tables with capacity & location zones...');
    await connection.query(
      `INSERT INTO restaurant_tables (table_number, capacity, location_zone, status) VALUES
        (1, 4, 'Main Dining', 'AVAILABLE'),
        (2, 2, 'Main Dining', 'AVAILABLE'),
        (3, 6, 'Family Section', 'OCCUPIED'),
        (4, 4, 'Family Section', 'AVAILABLE'),
        (5, 2, 'Window View', 'AVAILABLE'),
        (6, 8, 'VIP Lounge', 'RESERVED'),
        (7, 4, 'Garden Patio', 'AVAILABLE'),
        (8, 4, 'Garden Patio', 'AVAILABLE'),
        (9, 6, 'Main Dining', 'CLEANING'),
        (10, 4, 'Window View', 'AVAILABLE')`
    );

    console.log('🔄 Inserting orders with special instructions and order items...');
    await connection.query(
      `INSERT INTO orders (order_type, status, subtotal, tax_amount, discount_amount, total_amount, special_instructions, user_id, table_id) VALUES
        ('DINE_IN', 'COMPLETED', 747.00, 37.35, 0.00, 784.35, 'Serve with extra green chutney', 3, 1),
        ('DINE_IN', 'PREPARING', 626.00, 31.30, 0.00, 657.30, 'Make starters less spicy for kids', 3, 3),
        ('TAKEAWAY', 'PENDING', 477.00, 23.85, 0.00, 500.85, 'Pack cutlery and extra napkins', 3, NULL)`
    );

    await connection.query(
      `INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal, special_notes) VALUES
        (1, 5, 2, 349.00, 698.00, 'Boneless gravy'),
        (1, 11, 1, 49.00, 49.00, 'Crispy butter'),
        (2, 1, 1, 249.00, 249.00, 'Extra mint chutney'),
        (2, 7, 1, 229.00, 229.00, 'Low spice'),
        (2, 12, 1, 69.00, 69.00, 'Cut into quarters'),
        (2, 20, 1, 79.00, 79.00, 'Sweet and salt mix'),
        (3, 18, 1, 299.00, 299.00, 'Extra salan & raita'),
        (3, 21, 1, 99.00, 99.00, 'Chilled'),
        (3, 20, 1, 79.00, 79.00, 'Less ice')`
    );

    await connection.query(
      `INSERT INTO payments (order_id, amount, method, status, transaction_reference) VALUES
        (1, 784.35, 'UPI', 'COMPLETED', 'UPI-9842109841')`
    );

    console.log('✅ Database seeded successfully with RBAC roles and diagram attributes!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
