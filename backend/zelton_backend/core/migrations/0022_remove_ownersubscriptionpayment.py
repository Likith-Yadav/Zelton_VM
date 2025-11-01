# Generated manually to remove OwnerSubscriptionPayment model

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0021_ownerpayout"),
    ]

    operations = [
        migrations.DeleteModel(
            name="OwnerSubscriptionPayment",
        ),
    ]

