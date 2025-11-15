from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import (
    Owner,
    Property,
    Unit,
    Tenant,
    TenantKey,
    Payment,
    PaymentTransaction,
)


class TenantPaymentChargeTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create owner and property
        self.owner_user = User.objects.create_user(
            username="owner@example.com",
            email="owner@example.com",
            password="password123",
            first_name="Owner",
            last_name="User",
        )
        self.owner = Owner.objects.create(
            user=self.owner_user,
            phone="9999999999",
            address="Owner Address",
            city="City",
            state="State",
            pincode="123456",
        )

        # Create tenant and unit
        self.tenant_user = User.objects.create_user(
            username="tenant@example.com",
            email="tenant@example.com",
            password="password123",
            first_name="Tenant",
            last_name="User",
        )
        self.tenant = Tenant.objects.create(user=self.tenant_user)

        self.property = Property.objects.create(
            owner=self.owner,
            name="Test Property",
            address="123 Test Street",
            city="City",
            state="State",
            pincode="123456",
            property_type="apartment",
        )

        self.unit = Unit.objects.create(
            property=self.property,
            unit_number="A-101",
            unit_type="2BHK",
            rent_amount=Decimal("15000.00"),
            rent_due_date=5,
        )

        TenantKey.objects.create(
            property=self.property,
            unit=self.unit,
            tenant=self.tenant,
            is_used=True,
            used_at=timezone.now(),
        )

        self.client.force_authenticate(user=self.tenant_user)

    def _mock_phonepe(self, success_payload):
        return patch(
            "core.services.phonepe_service.PhonePeService.initiate_tenant_rent_payment",
            return_value=success_payload,
        )

    def test_payment_charge_applied_for_amount_under_threshold(self):
        payload = {
            "success": True,
            "merchant_order_id": "TEST123",
            "order_id": "ORDER123",
            "redirect_url": "https://phonepe.test/pay",
            "expire_at": 123456,
            "state": "CREATED",
            "base_amount": 8000.0,
            "payment_charge": 160.0,
            "total_amount": 8160.0,
            "charge_rate_percent": 2.0,
        }

        with self._mock_phonepe(payload) as mock_phonepe:
            response = self.client.post(
                "/api/payments/initiate_rent_payment/",
                {"amount": "8000", "payment_type": "rent"},
                format="json",
            )

        self.assertEqual(response.status_code, 200)
        breakup = response.data["payment_breakup"]
        self.assertAlmostEqual(breakup["base_amount"], 8000.0)
        self.assertAlmostEqual(breakup["payment_charge"], 160.0)
        self.assertAlmostEqual(breakup["total_payable"], 8160.0)

        payment = Payment.objects.latest("id")
        self.assertEqual(payment.amount, Decimal("8000.00"))
        self.assertEqual(payment.payment_gateway_charge, Decimal("160.00"))
        self.assertEqual(payment.total_amount, Decimal("8160.00"))

        transaction = PaymentTransaction.objects.get(payment=payment)
        self.assertEqual(transaction.amount, Decimal("8160.00"))

        mock_phonepe.assert_called_once()
        called_args, called_kwargs = mock_phonepe.call_args
        self.assertEqual(called_args[0], self.tenant)
        self.assertEqual(called_args[1], self.unit)
        self.assertEqual(called_kwargs["payment_charge"], Decimal("160.00"))

    def test_payment_charge_applied_for_amount_above_threshold(self):
        payload = {
            "success": True,
            "merchant_order_id": "TEST124",
            "order_id": "ORDER124",
            "redirect_url": "https://phonepe.test/pay",
            "expire_at": 123456,
            "state": "CREATED",
            "base_amount": 12000.0,
            "payment_charge": 300.0,
            "total_amount": 12300.0,
            "charge_rate_percent": 2.5,
        }

        with self._mock_phonepe(payload) as mock_phonepe:
            response = self.client.post(
                "/api/payments/initiate_rent_payment/",
                {"amount": "12000", "payment_type": "rent"},
                format="json",
            )

        self.assertEqual(response.status_code, 200)
        breakup = response.data["payment_breakup"]
        self.assertAlmostEqual(breakup["base_amount"], 12000.0)
        self.assertAlmostEqual(breakup["payment_charge"], 300.0)
        self.assertAlmostEqual(breakup["total_payable"], 12300.0)

        payment = Payment.objects.latest("id")
        self.assertEqual(payment.amount, Decimal("12000.00"))
        self.assertEqual(payment.payment_gateway_charge, Decimal("300.00"))
        self.assertEqual(payment.total_amount, Decimal("12300.00"))

        transaction = PaymentTransaction.objects.get(payment=payment)
        self.assertEqual(transaction.amount, Decimal("12300.00"))

        mock_phonepe.assert_called_once()
        called_args, called_kwargs = mock_phonepe.call_args
        self.assertEqual(called_kwargs["payment_charge"], Decimal("300.00"))

