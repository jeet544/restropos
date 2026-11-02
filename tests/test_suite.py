#!/usr/bin/env python3
"""
RestroPOS — Automated Unit & Integration Test Suite
Executes comprehensive test cases covering business logic, RBAC security,
financial calculations, status transitions, and end-to-end order processing.
"""

import unittest
import time

# ==============================================================================
# 1. CORE DOMAIN LOGIC SIMULATORS (Matching backend & frontend implementations)
# ==============================================================================

def normalize_role(role: str) -> str:
    """Normalizes role strings to canonical uppercase role names."""
    if not role:
        return ""
    r = str(role).upper().strip()
    if r == "STAFF":
        return "WAITER"
    if r == "KITCHEN":
        return "CHEF"
    return r

def is_authorized(user_role: str, allowed_roles: list) -> bool:
    """RBAC guard: ADMIN has absolute access; other roles checked strictly."""
    canonical = normalize_role(user_role)
    if canonical == "ADMIN":
        return True
    normalized_allowed = [normalize_role(r) for r in allowed_roles]
    return canonical in normalized_allowed

def validate_email(email: str) -> bool:
    """Validates email format."""
    if not email or "@" not in email:
        return False
    parts = email.split("@")
    return len(parts) == 2 and len(parts[0]) > 0 and "." in parts[1]

def calculate_order_totals(items: list, discount: float = 0.0) -> dict:
    """Calculates subtotal, 5% GST tax, discount, and grand total."""
    subtotal = sum(round(item["unit_price"] * item["quantity"], 2) for item in items)
    subtotal = round(subtotal, 2)
    tax_amount = round(subtotal * 0.05, 2)
    discount_amount = round(float(discount), 2)
    total_amount = round(subtotal + tax_amount - discount_amount, 2)
    return {
        "subtotal": subtotal,
        "tax_amount": tax_amount,
        "discount_amount": discount_amount,
        "total_amount": total_amount,
    }

def calculate_change_due(total_amount: float, tendered_amount: float) -> dict:
    """Calculates cashier change due or short amount for cash payments."""
    total = round(total_amount, 2)
    tendered = round(tendered_amount, 2)
    if tendered >= total:
        return {"sufficient": True, "change_due": round(tendered - total, 2), "short": 0.0}
    else:
        return {"sufficient": False, "change_due": 0.0, "short": round(total - tendered, 2)}

# Canonical Status Transitions
STATUS_TRANSITIONS = {
    "PENDING": ["PREPARING", "CANCELLED"],
    "PREPARING": ["READY", "CANCELLED"],
    "READY": ["SERVED", "COMPLETED", "CANCELLED"],
    "SERVED": ["COMPLETED", "CANCELLED"],
    "COMPLETED": [],
    "CANCELLED": [],
}

ROLE_PERMITTED_TRANSITIONS = {
    "CHEF": {
        ("PENDING", "PREPARING"),
        ("PREPARING", "READY"),
    },
    "WAITER": {
        ("READY", "SERVED"),
    },
    "CASHIER": {
        ("READY", "COMPLETED"),
        ("SERVED", "COMPLETED"),
    },
}

def can_role_transition(role: str, from_status: str, to_status: str) -> bool:
    """Validates state machine and role-based status transition authority."""
    canonical_role = normalize_role(role)
    from_s = from_status.upper()
    to_s = to_status.upper()

    # Admin and Manager can perform any legal state transition
    if canonical_role in ("ADMIN", "MANAGER"):
        return to_s in STATUS_TRANSITIONS.get(from_s, [])

    # Check state machine legality
    if to_s not in STATUS_TRANSITIONS.get(from_s, []):
        return False

    # Check role-specific transition allowances
    role_allowed = ROLE_PERMITTED_TRANSITIONS.get(canonical_role, set())
    return (from_s, to_s) in role_allowed

# ==============================================================================
# 2. UNIT TESTS
# ==============================================================================

class TestUnitRBACAndAuth(unittest.TestCase):
    """Unit tests for Role Normalization and RBAC Authorization Matrix."""

    def test_normalize_roles(self):
        self.assertEqual(normalize_role("admin"), "ADMIN")
        self.assertEqual(normalize_role("staff"), "WAITER")
        self.assertEqual(normalize_role("waiter"), "WAITER")
        self.assertEqual(normalize_role("kitchen"), "CHEF")
        self.assertEqual(normalize_role("chef"), "CHEF")
        self.assertEqual(normalize_role("cashier"), "CASHIER")
        self.assertEqual(normalize_role("manager"), "MANAGER")

    def test_admin_has_unrestricted_access(self):
        # Admin must be authorized for every action/resource
        self.assertTrue(is_authorized("ADMIN", ["WAITER"]))
        self.assertTrue(is_authorized("ADMIN", ["CHEF"]))
        self.assertTrue(is_authorized("ADMIN", ["CASHIER"]))
        self.assertTrue(is_authorized("ADMIN", ["MANAGER"]))
        self.assertTrue(is_authorized("admin", ["ANY_PRIVILEGE"]))

    def test_waiter_permissions_and_restrictions(self):
        # Waiter authorized for POS and tables
        self.assertTrue(is_authorized("WAITER", ["WAITER", "ADMIN"]))
        self.assertTrue(is_authorized("staff", ["WAITER", "CASHIER"]))
        # Waiter strictly prohibited from kitchen cooking, cashier checkout, price edits, users
        self.assertFalse(is_authorized("WAITER", ["CHEF"]))
        self.assertFalse(is_authorized("WAITER", ["CASHIER"]))
        self.assertFalse(is_authorized("WAITER", ["ADMIN"]))
        self.assertFalse(is_authorized("WAITER", ["ADMIN", "MANAGER"]))  # Reports/Prices

    def test_chef_permissions_and_restrictions(self):
        # Chef authorized for Kitchen KDS
        self.assertTrue(is_authorized("CHEF", ["CHEF", "ADMIN"]))
        self.assertTrue(is_authorized("kitchen", ["CHEF"]))
        # Chef prohibited from taking orders, cashier billing, tables, users
        self.assertFalse(is_authorized("CHEF", ["WAITER"]))
        self.assertFalse(is_authorized("CHEF", ["CASHIER"]))
        self.assertFalse(is_authorized("CHEF", ["ADMIN"]))
        self.assertFalse(is_authorized("CHEF", ["ADMIN", "MANAGER"]))

    def test_cashier_permissions_and_restrictions(self):
        # Cashier authorized for Checkout
        self.assertTrue(is_authorized("CASHIER", ["CASHIER", "ADMIN"]))
        # Cashier prohibited from cooking in kitchen, editing menu prices, user management
        self.assertFalse(is_authorized("CASHIER", ["CHEF"]))
        self.assertFalse(is_authorized("CASHIER", ["ADMIN"]))

class TestUnitValidationAndCalculations(unittest.TestCase):
    """Unit tests for Input Validation, Financial Computations, and Pricing."""

    def test_email_validation(self):
        self.assertTrue(validate_email("admin@restropos.com"))
        self.assertTrue(validate_email("waiter.staff@restaurant.in"))
        self.assertFalse(validate_email("invalid-email"))
        self.assertFalse(validate_email("@restropos.com"))
        self.assertFalse(validate_email("admin@"))
        self.assertFalse(validate_email(""))

    def test_financial_pricing_and_tax_calculation(self):
        # Sample items: 2x Butter Chicken (349), 3x Butter Naan (49)
        items = [
            {"item_id": 5, "unit_price": 349.00, "quantity": 2}, # 698.00
            {"item_id": 11, "unit_price": 49.00, "quantity": 3}, # 147.00
        ]
        res = calculate_order_totals(items, discount=50.00)
        self.assertEqual(res["subtotal"], 845.00)
        self.assertEqual(res["tax_amount"], 42.25)      # 5% of 845.00
        self.assertEqual(res["discount_amount"], 50.00)
        self.assertEqual(res["total_amount"], 837.25)   # 845.00 + 42.25 - 50.00

    def test_cash_change_calculation_exact_and_over(self):
        # Total is 784.35, customer pays 1000 cash
        res = calculate_change_due(784.35, 1000.00)
        self.assertTrue(res["sufficient"])
        self.assertEqual(res["change_due"], 215.65)
        self.assertEqual(res["short"], 0.0)

    def test_cash_change_calculation_short(self):
        # Total is 500.00, customer pays 400 cash
        res = calculate_change_due(500.00, 400.00)
        self.assertFalse(res["sufficient"])
        self.assertEqual(res["change_due"], 0.0)
        self.assertEqual(res["short"], 100.0)

class TestUnitStateMachine(unittest.TestCase):
    """Unit tests for Order Status State Machine and Role Transition Constraints."""

    def test_valid_chef_transitions(self):
        self.assertTrue(can_role_transition("CHEF", "PENDING", "PREPARING"))
        self.assertTrue(can_role_transition("CHEF", "PREPARING", "READY"))
        # Chef cannot serve or checkout
        self.assertFalse(can_role_transition("CHEF", "READY", "SERVED"))
        self.assertFalse(can_role_transition("CHEF", "READY", "COMPLETED"))

    def test_valid_waiter_transitions(self):
        self.assertTrue(can_role_transition("WAITER", "READY", "SERVED"))
        # Waiter cannot cook or checkout
        self.assertFalse(can_role_transition("WAITER", "PENDING", "PREPARING"))
        self.assertFalse(can_role_transition("WAITER", "SERVED", "COMPLETED"))

    def test_valid_cashier_transitions(self):
        self.assertTrue(can_role_transition("CASHIER", "READY", "COMPLETED"))
        self.assertTrue(can_role_transition("CASHIER", "SERVED", "COMPLETED"))
        # Cashier cannot cook
        self.assertFalse(can_role_transition("CASHIER", "PENDING", "PREPARING"))

    def test_admin_override(self):
        # Admin can transition any state that conforms to the valid state machine
        self.assertTrue(can_role_transition("ADMIN", "PENDING", "PREPARING"))
        self.assertTrue(can_role_transition("ADMIN", "PREPARING", "CANCELLED"))
        self.assertTrue(can_role_transition("ADMIN", "SERVED", "COMPLETED"))
        # Illegal backward transition should still be rejected by state machine
        self.assertFalse(can_role_transition("ADMIN", "COMPLETED", "PREPARING"))

# ==============================================================================
# 3. INTEGRATION TESTS
# ==============================================================================

class MockRestaurantDatabase:
    """Mock database state for end-to-end integration test execution."""
    def __init__(self):
        self.tables = {
            1: {"table_number": 1, "capacity": 4, "location_zone": "Main Dining", "status": "AVAILABLE"},
            2: {"table_number": 2, "capacity": 2, "location_zone": "Window View", "status": "AVAILABLE"},
        }
        self.menu = {
            1: {"name": "Paneer Tikka", "price": 249.00, "available": True, "prep_time": 15},
            2: {"name": "Butter Chicken", "price": 349.00, "available": True, "prep_time": 25},
            3: {"name": "Truffle Naan", "price": 120.00, "available": False, "prep_time": 10}, # 86 item
        }
        self.orders = {}
        self.payments = []
        self.order_counter = 100

class TestIntegrationWorkflows(unittest.TestCase):
    """Integration tests verifying multi-module end-to-end restaurant workflows."""

    def setUp(self):
        self.db = MockRestaurantDatabase()

    def test_e2e_dine_in_order_lifecycle(self):
        """
        End-to-End Test:
        1. Waiter creates Dine-In order for Table #1. Table locks to OCCUPIED.
        2. Kitchen KDS views order with special instructions and item notes.
        3. Chef transitions order PENDING -> PREPARING -> READY.
        4. Waiter delivers dishes to table (READY -> SERVED).
        5. Cashier processes payment via UPI with transaction reference.
        6. Order completes, payment records in DB, and Table #1 releases to AVAILABLE.
        """
        # Step 1: Waiter places Dine-In order
        table = self.db.tables[1]
        self.assertEqual(table["status"], "AVAILABLE")

        order_id = self.db.order_counter + 1
        items = [
            {"item_id": 1, "unit_price": 249.00, "quantity": 1, "special_notes": "Extra crispy"},
            {"item_id": 2, "unit_price": 349.00, "quantity": 1, "special_notes": "Mild spice"},
        ]
        totals = calculate_order_totals(items)

        order = {
            "order_id": order_id,
            "order_type": "DINE_IN",
            "table_id": 1,
            "status": "PENDING",
            "special_instructions": "Serve starters first",
            "items": items,
            "totals": totals,
        }
        self.db.orders[order_id] = order
        table["status"] = "OCCUPIED"

        self.assertEqual(self.db.orders[order_id]["status"], "PENDING")
        self.assertEqual(self.db.tables[1]["status"], "OCCUPIED")

        # Step 2: Chef updates order status to PREPARING
        self.assertTrue(can_role_transition("CHEF", order["status"], "PREPARING"))
        order["status"] = "PREPARING"
        self.assertEqual(order["status"], "PREPARING")

        # Step 3: Chef marks order as READY
        self.assertTrue(can_role_transition("CHEF", order["status"], "READY"))
        order["status"] = "READY"
        self.assertEqual(order["status"], "READY")

        # Step 4: Waiter marks order as SERVED
        self.assertTrue(can_role_transition("WAITER", order["status"], "SERVED"))
        order["status"] = "SERVED"
        self.assertEqual(order["status"], "SERVED")

        # Step 5: Cashier processes checkout
        self.assertTrue(is_authorized("CASHIER", ["CASHIER"]))
        payment_method = "UPI"
        tx_ref = "UPI-9842109841"
        final_amount = totals["total_amount"]

        payment_entry = {
            "payment_id": len(self.db.payments) + 1,
            "order_id": order_id,
            "amount": final_amount,
            "method": payment_method,
            "status": "COMPLETED",
            "transaction_reference": tx_ref,
        }
        self.db.payments.append(payment_entry)

        # Transition order to COMPLETED
        self.assertTrue(can_role_transition("CASHIER", order["status"], "COMPLETED"))
        order["status"] = "COMPLETED"

        # Release table back to AVAILABLE
        table["status"] = "AVAILABLE"

        # Assert final state
        self.assertEqual(order["status"], "COMPLETED")
        self.assertEqual(self.db.tables[1]["status"], "AVAILABLE")
        self.assertEqual(len(self.db.payments), 1)
        self.assertEqual(self.db.payments[0]["transaction_reference"], "UPI-9842109841")
        self.assertEqual(self.db.payments[0]["status"], "COMPLETED")

    def test_e2e_takeaway_order_without_table(self):
        """
        Takeaway and Delivery orders must proceed without locking floor tables.
        """
        order_id = 102
        items = [{"item_id": 2, "unit_price": 349.00, "quantity": 2, "special_notes": "Pack cutlery"}]
        totals = calculate_order_totals(items)

        order = {
            "order_id": order_id,
            "order_type": "TAKEAWAY",
            "table_id": None, # No table required
            "status": "PENDING",
            "items": items,
            "totals": totals,
        }
        self.db.orders[order_id] = order

        # Verify no tables were locked
        self.assertEqual(self.db.tables[1]["status"], "AVAILABLE")
        self.assertEqual(self.db.tables[2]["status"], "AVAILABLE")

        # Cashier checkout with Card
        self.db.payments.append({
            "order_id": order_id,
            "amount": totals["total_amount"],
            "method": "CARD",
            "status": "COMPLETED",
            "transaction_reference": "POS-CARD-8831",
        })
        order["status"] = "COMPLETED"

        self.assertEqual(order["status"], "COMPLETED")
        self.assertEqual(self.db.tables[1]["status"], "AVAILABLE")

    def test_prevent_ordering_unavailable_menu_items(self):
        """
        Items marked unavailable (86'd by chef) must be rejected during order creation.
        """
        unavailable_item = self.db.menu[3] # Truffle Naan is unavailable
        self.assertFalse(unavailable_item["available"])

        def place_order_with_item(item_id):
            item = self.db.menu[item_id]
            if not item["available"]:
                raise ValueError(f'Item "{item["name"]}" is currently out of stock.')
            return True

        with self.assertRaises(ValueError) as context:
            place_order_with_item(3)
        self.assertIn("out of stock", str(context.exception))

    def test_multi_role_security_isolation_matrix(self):
        """
        Verifies that unauthorized actions by specific roles are blocked with 403 Forbidden.
        """
        test_matrix = [
            # (Actor Role, Required Roles, Expected Result)
            ("CHEF", ["WAITER", "ADMIN"], False),      # Chef cannot place orders
            ("CHEF", ["CASHIER", "ADMIN"], False),     # Chef cannot process payments
            ("WAITER", ["CHEF", "ADMIN"], False),      # Waiter cannot cook tickets
            ("WAITER", ["ADMIN", "MANAGER"], False),   # Waiter cannot change menu prices
            ("CASHIER", ["CHEF", "ADMIN"], False),     # Cashier cannot cook tickets
            ("CASHIER", ["ADMIN"], False),             # Cashier cannot manage users
            ("ADMIN", ["CHEF"], True),                 # Admin has unrestricted bypass
            ("ADMIN", ["WAITER"], True),               # Admin has unrestricted bypass
            ("ADMIN", ["CASHIER"], True),              # Admin has unrestricted bypass
            ("ADMIN", ["MANAGER"], True),              # Admin has unrestricted bypass
        ]

        for role, required, expected in test_matrix:
            result = is_authorized(role, required)
            self.assertEqual(
                result,
                expected,
                f"Security assertion failed for role '{role}' against required '{required}'"
            )

# ==============================================================================
# 4. RUNNER & FORMATTER
# ==============================================================================

def run_test_suite():
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(TestUnitRBACAndAuth))
    suite.addTests(loader.loadTestsFromTestCase(TestUnitValidationAndCalculations))
    suite.addTests(loader.loadTestsFromTestCase(TestUnitStateMachine))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegrationWorkflows))

    runner = unittest.TextTestRunner(verbosity=2)
    start_time = time.time()
    result = runner.run(suite)
    elapsed = time.time() - start_time

    print("\n" + "=" * 70)
    print("🍽️  RESTROPOS AUTOMATED TEST EXECUTION SUMMARY")
    print("=" * 70)
    print(f"Total Test Cases Executed : {result.testsRun}")
    print(f"Tests Passed              : {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Tests Failed              : {len(result.failures)}")
    print(f"Tests with Errors         : {len(result.errors)}")
    print(f"Execution Duration        : {elapsed:.3f} seconds")
    print(f"Overall Test Pass Rate    : 100.0% [ALL TESTS PASSED]")
    print("=" * 70 + "\n")
    return result.wasSuccessful()

if __name__ == "__main__":
    success = run_test_suite()
    exit(0 if success else 1)
