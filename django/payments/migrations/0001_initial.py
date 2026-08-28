from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="Order",
            fields=[
                ("id", models.CharField(max_length=64, primary_key=True, serialize=False)),
                ("amount", models.PositiveBigIntegerField()),
                ("status", models.CharField(default="pending", max_length=16)),
                ("payment_transaction_code", models.CharField(max_length=128, null=True, unique=True)),
            ],
        )
    ]
