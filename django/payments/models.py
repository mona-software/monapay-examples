from django.db import models


class Order(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    amount = models.PositiveBigIntegerField()
    status = models.CharField(max_length=16, default="pending")
    payment_transaction_code = models.CharField(max_length=128, null=True, unique=True)
